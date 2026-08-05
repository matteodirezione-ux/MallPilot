import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

// Genera un documento markdown di documentazione completo.
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

    const ENTITY_DESC = {
      CentroCommerciale: 'Centri commerciali gestiti (anagrafica, IBAN, piantina, logo)',
      SpazioExpo: 'Spazi espositivi disponibili nei centri',
      Cliente: 'Clienti/espositori (anagrafica, P.IVA, codice SDI, referenti)',
      Prenotazione: 'Prenotazioni di spazi expo (affitti, eventi, gratuiti)',
      Documento: 'Documenti collegati a prenotazioni/clienti (contratti, fatture)',
      Task: 'Task operativi assegnati a utenti o centri',
      Manutenzione: 'Manutenzioni programmate o straordinarie',
      Ticket: 'Ticket di manutenzione con workflow di approvazione',
      Report: 'Report giornalieri di vigilanza (furti, note, foto)',
      Capex: 'Interventi di investimento (capex) con DUVRI e lavoratori',
      Pulizia: 'Pulizie singole (controllo qualita)',
      PuliziaPeriodica: 'Pulizie periodiche ricorrenti (frequenza, fornitore)',
      Notifica: 'Notifiche in-app per utenti (task, prenotazioni, manutenzioni)',
      Assegnazione: 'Assegnazione direttori/manutentori/vigilanza ai centri',
      Budget: 'Budget annuali per centro commerciale',
      Direttore: 'Anagrafica direttori (email, centro preferito, invito)',
      Vigilanza: 'Anagrafica personale vigilanza',
      Manutentore: 'Anagrafica manutentori esterni',
      Tenant: 'Inquilini/negozi (contratti, canoni, contatti tecnici)',
      Corrispettivo: 'Corrispettivi mensili (incassi, scontrini) per tenant',
      LetturaContatore: 'Letture contatori mensili (acqua, energia, gas, fotovoltaico)',
      LetturaContatoreGiornaliero: 'Letture contatori giornaliere',
      Fornitore: 'Fornitori/appaltatori (DUVRI, DPI, lavoratori, subfornitori)',
      Marketing: 'Piano marketing annuale per centro (iniziative, costi, comunicazione)',
      MeteoGiornaliero: 'Dati meteo giornalieri archiviati da Open-Meteo',
      ConsegnaVigilanza: 'Passaggio consegne tra turni di vigilanza'
    };

    const ALL_FUNCTIONS = [
      { name: 'analyzeStorageUsage', desc: 'Analizza lo spazio occupato da immagini e file', trigger: 'Manuale' },
      { name: 'archiviaMeteo', desc: 'Archivia dati meteo da Open-Meteo Archive', trigger: 'Scheduled giornaliero 03:00 + Manuale' },
      { name: 'backupDatabase', desc: 'Backup completo dati entita in JSON', trigger: 'Manuale' },
      { name: 'backupAppStruttura', desc: 'Export blueprint strutturale (schemi + funzioni)', trigger: 'Manuale' },
      { name: 'backupDocumentazione', desc: 'Genera questo documento di documentazione', trigger: 'Manuale' },
      { name: 'compressExistingImages', desc: 'Comprime immagini esistenti', trigger: 'Manuale' },
      { name: 'creaControlliPrenotazione', desc: 'Crea controlli/manutenzioni da prenotazione', trigger: 'Entity (Prenotazione create)' },
      { name: 'creaNotificheVigilanza', desc: 'Crea notifiche per vigilanza', trigger: 'Entity/Manuale' },
      { name: 'generaContratto30gg', desc: 'Genera contratto PDF per prenotazioni <=30gg', trigger: 'Manuale' },
      { name: 'generaContrattoOltre30gg', desc: 'Genera contratto PDF per prenotazioni >30gg', trigger: 'Manuale' },
      { name: 'importTenantData', desc: 'Importa dati tenant da file', trigger: 'Manuale' },
      { name: 'notificaCapex', desc: 'Notifica scadenze Capex', trigger: 'Scheduled' },
      { name: 'notificaFinePrenotazioni', desc: 'Notifica fine prenotazione', trigger: 'Scheduled' },
      { name: 'notificaInizioPrenotazioni', desc: 'Notifica inizio prenotazione', trigger: 'Scheduled' },
      { name: 'notificaManutentoreTicketApprovato', desc: 'Notifica manutentore ticket approvato', trigger: 'Entity (Ticket update)' },
      { name: 'notificaManutenzioneCompletata', desc: 'Notifica completamento manutenzione', trigger: 'Entity (Manutenzione update)' },
      { name: 'notificaScadenzaPrenotazioni', desc: 'Notifica prenotazioni >30gg in scadenza', trigger: 'Scheduled' },
      { name: 'notificaScadenze', desc: 'Notifica scadenze generiche', trigger: 'Scheduled' },
      { name: 'notificaTaskCompletato', desc: 'Notifica completamento task', trigger: 'Entity (Task update)' },
      { name: 'notificaTicketInAttesa', desc: 'Notifica ticket in attesa', trigger: 'Scheduled' },
      { name: 'reminderBackupManuale', desc: 'Promemoria backup manuale', trigger: 'Scheduled' },
      { name: 'riepilogoSettimanaleDirettore', desc: 'Riepilogo settimanale direttori', trigger: 'Scheduled settimanale' }
    ];

    const ROLES = [
      { name: 'proprieta', desc: 'Admin di piattaforma, accesso completo a tutti i centri', pages: 'Tutte le pagine' },
      { name: 'direttore', desc: 'Direttore di centro, vede i centri assegnati via Assegnazione', pages: 'Dashboard, Task, Ticket, Calendario, Report, Meteo, Clienti, Spazi, Marketing, Fornitori, Pulizie, Capex, Documenti, Tenant, Corrispettivi, Contatori, Utenze, Gestione' },
      { name: 'vigilanza', desc: 'Personale vigilanza, vede centri assegnati', pages: 'Dashboard, Task, Ticket, Controlli, Calendario, Report, Meteo, Consegne, Spazi, Fornitori, Pulizie, Capex, Tenant, Contatori' },
      { name: 'manutentore', desc: 'Manutentore esterno, gestisce ticket assegnati', pages: 'Ticket' },
      { name: 'tenant', desc: 'Inquilino/negozio, inserisce corrispettivi', pages: 'Corrispettivi' }
    ];

    let md = `# Mall Pilot - Documentazione di Funzionamento\n\n`;
    md += `**Data generazione:** ${new Date().toLocaleString('it-IT')}\n\n`;
    md += `**Generato da:** ${user.email}\n\n---\n\n`;

    md += `## 1. Panoramica\n\n`;
    md += `Mall Pilot e una piattaforma di gestione per centri commerciali che copre:\n`;
    md += `- Prenotazioni spazi espositivi e generazione contratti\n`;
    md += `- Gestione tenant e corrispettivi\n`;
    md += `- Task, manutenzioni e ticket con workflow di approvazione\n`;
    md += `- Report di vigilanza e passaggio consegne\n`;
    md += `- Capex, pulizie periodiche, fornitori con DUVRI\n`;
    md += `- Lettura contatori (acqua, energia, gas, fotovoltaico)\n`;
    md += `- Piano marketing annuale\n`;
    md += `- Dati meteo giornalieri archiviati\n`;
    md += `- Notifiche in-app e via email\n\n`;

    md += `## 2. Ruoli Utente\n\n`;
    md += `| Ruolo | Descrizione | Pagine accessibili |\n|---|---|---|\n`;
    for (const r of ROLES) { md += `| ${r.name} | ${r.desc} | ${r.pages} |\n`; }
    md += `\n`;

    md += `## 3. Entita (Data Model)\n\n`;
    for (const entityName of ALL_ENTITIES) {
      try {
        const entity = base44.asServiceRole.entities[entityName];
        if (!entity) { md += `### ${entityName}\n_(non trovata)_\n\n`; continue; }
        const sample = await entity.filter({}, '-created_date', 1);
        const count = await entity.filter({}, '-created_date', 10000);
        const sampleRecord = sample[0] || {};
        const fields = Object.keys(sampleRecord);
        md += `### ${entityName}\n`;
        md += `**Descrizione:** ${ENTITY_DESC[entityName] || '—'}\n`;
        md += `**Record totali:** ${count.length}\n\n`;
        if (fields.length > 0) {
          md += `| Campo | Tipo |\n|---|---|\n`;
          for (const f of fields) {
            const val = sampleRecord[f];
            let t = typeof val;
            if (Array.isArray(val)) t = 'array';
            if (val === null) t = 'null';
            md += `| ${f} | ${t} |\n`;
          }
        } else { md += `_(nessun record presente)_\n`; }
        md += `\n`;
      } catch (e) { md += `### ${entityName}\n**Errore:** ${e.message}\n\n`; }
    }

    md += `## 4. Funzioni Backend\n\n`;
    md += `| Funzione | Descrizione | Trigger |\n|---|---|---|\n`;
    for (const f of ALL_FUNCTIONS) { md += `| ${f.name} | ${f.desc} | ${f.trigger} |\n`; }
    md += `\n`;

    md += `## 5. Istruzioni di Ripristino\n\n`;
    md += `1. Usare il file backup_app_struttura per ricreare le entita con i campi corretti\n`;
    md += `2. Ricreare le funzioni backend elencate sopra\n`;
    md += `3. Usare il file backup_dati (JSON) per reimportare tutti i record\n`;
    md += `4. Ricreare le automazioni scheduled ed entity\n`;
    md += `5. Invitare direttori, vigilanza e manutentori via email\n`;
    md += `6. Verificare i permessi RLS su ogni entita\n\n`;
    md += `---\n\n*Documento generato automaticamente dal sistema Mall Pilot.*\n`;

    return new Response(md, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="backup_documentazione_${new Date().toISOString().slice(0, 10)}.md"`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});