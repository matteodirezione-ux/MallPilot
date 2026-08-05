import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Esporta la "struttura" dell'app: schemi delle entità (campi inferiti da record di esempio)
// + registro di tutte le funzioni backend. Questo è il blueprint strutturale dell'app.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const ALL_ENTITIES = [
      'CentroCommerciale', 'SpazioExpo', 'Cliente', 'Prenotazione', 'Documento',
      'Task', 'Manutenzione', 'Ticket', 'Report', 'Capex', 'Pulizia', 'PuliziaPeriodica',
      'Notifica', 'Assegnazione', 'Budget', 'Direttore', 'Vigilanza', 'Manutentore',
      'Tenant', 'Corrispettivo', 'LetturaContatore', 'LetturaContatoreGiornaliero',
      'Fornitore', 'Marketing', 'MeteoGiornaliero', 'ConsegnaVigilanza'
    ];

    const ALL_FUNCTIONS = [
      { name: 'analyzeStorageUsage', desc: 'Analizza lo spazio occupato da immagini e file nelle entità' },
      { name: 'archiviaMeteo', desc: 'Archivia i dati meteo giornalieri dall\'API Open-Meteo (backfill + aggiornamento giornaliero)' },
      { name: 'backupDatabase', desc: 'Backup completo di tutti i dati delle entità in formato JSON' },
      { name: 'backupAppStruttura', desc: 'Esporta il blueprint strutturale dell\'app (schemi entità + registro funzioni)' },
      { name: 'backupDocumentazione', desc: 'Genera la documentazione di funzionamento dell\'app in formato markdown' },
      { name: 'compressExistingImages', desc: 'Comprime le immagini esistenti per ridurre lo spazio di archiviazione' },
      { name: 'creaControlliPrenotazione', desc: 'Crea automaticamente controlli/manutenzioni collegate a una prenotazione' },
      { name: 'creaNotificheVigilanza', desc: 'Crea notifiche per il personale di vigilanza' },
      { name: 'generaContratto30gg', desc: 'Genera il contratto PDF per prenotazioni con durata <= 30 giorni' },
      { name: 'generaContrattoOltre30gg', desc: 'Genera il contratto PDF per prenotazioni con durata > 30 giorni' },
      { name: 'importTenantData', desc: 'Importa dati dei tenant da file esterno' },
      { name: 'notificaCapex', desc: 'Invia notifiche relative a interventi Capex in scadenza' },
      { name: 'notificaFinePrenotazioni', desc: 'Notifica la fine di una prenotazione ai direttori assegnati' },
      { name: 'notificaInizioPrenotazioni', desc: 'Notifica l\'inizio di una prenotazione ai direttori assegnati' },
      { name: 'notificaManutentoreTicketApprovato', desc: 'Notifica al manutentore quando un ticket viene approvato' },
      { name: 'notificaManutenzioneCompletata', desc: 'Notifica il completamento di una manutenzione' },
      { name: 'notificaScadenzaPrenotazioni', desc: 'Notifica i direttori di prenotazioni >30gg in scadenza a 30 giorni' },
      { name: 'notificaScadenze', desc: 'Notifica generica per scadenze (task, manutenzioni, contratti)' },
      { name: 'notificaTaskCompletato', desc: 'Notifica il completamento di un task' },
      { name: 'notificaTicketInAttesa', desc: 'Notifica i ticket in attesa di approvazione' },
      { name: 'reminderBackupManuale', desc: 'Promemoria periodico per eseguire il backup manuale' },
      { name: 'riepilogoSettimanaleDirettore', desc: 'Invia un riepilogo settimanale ai direttori con attività e scadenze' }
    ];

    const entitiesSchema = {};

    for (const entityName of ALL_ENTITIES) {
      try {
        const entity = base44.asServiceRole.entities[entityName];
        if (!entity) { entitiesSchema[entityName] = { error: 'not found' }; continue; }

        // Inferisci i campi da un record di esempio
        const sample = await entity.filter({}, '-created_date', 1);
        const sampleRecord = sample[0] || {};
        const fields = {};
        for (const [key, value] of Object.entries(sampleRecord)) {
          let type = typeof value;
          if (Array.isArray(value)) type = 'array';
          if (value === null) type = 'null';
          fields[key] = { type, sample_value: value };
        }

        // Conta i record totali
        const count = await entity.filter({}, '-created_date', 10000);

        entitiesSchema[entityName] = {
          fields,
          record_count: count.length,
          sample_id: sampleRecord.id || null
        };
      } catch (e) {
        entitiesSchema[entityName] = { error: e.message };
      }
    }

    const blueprint = {
      timestamp: new Date().toISOString(),
      type: 'app_structure_backup',
      app_name: 'Mall Pilot',
      entities: entitiesSchema,
      backend_functions: ALL_FUNCTIONS,
      restoration_notes: [
        '1. Ricreare le entità in Base44 usando i campi elencati sopra',
        '2. Ricreare le funzioni backend elencate sopra con la logica descritta',
        '3. Configurare le automazioni (scheduled/entity) che triggersiano le funzioni',
        '4. Importare i dati dal backup_dati JSON',
        '5. Verificare i permessi RLS e i ruoli utenti (admin, direttore, vigilanza, manutentore, tenant)'
      ]
    };

    const json = JSON.stringify(blueprint, null, 2);
    const blob = new Blob([json], { type: 'application/json' });

    const uploadResult = await base44.integrations.Core.UploadPrivateFile({
      file: await blob.arrayBuffer()
    });

    const signed = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri: uploadResult.file_uri,
      expires_in: 86400
    });

    return Response.json({
      success: true,
      timestamp: blueprint.timestamp,
      signed_url: signed.signed_url,
      file_uri: uploadResult.file_uri,
      entities_count: ALL_ENTITIES.length,
      functions_count: ALL_FUNCTIONS.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});