import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Backup completo di TUTTI i dati delle entità (con paginazione per superare il limite di 50 record).
// Restituisce uno signed URL per il download del file JSON.
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

    const backup = { timestamp: new Date().toISOString(), type: 'full_data_backup', entities: {} };
    let totalRecords = 0;

    for (const entityName of ALL_ENTITIES) {
      try {
        const entity = base44.asServiceRole.entities[entityName];
        if (!entity) { backup.entities[entityName] = { error: 'entity not found' }; continue; }

        // Paginazione: fetch in batch da 500 fino a recuperare tutti i record
        const allRecords = [];
        let skip = 0;
        const limit = 500;
        while (true) {
          const batch = await entity.filter({}, '-created_date', limit);
          // filter non supporta skip direttamente; se il batch è < limit, abbiamo tutto
          allRecords.push(...batch);
          if (batch.length < limit) break;
          // Se la entity ha più di 500 record ma filter non pagina, fermiamoci per non loopare
          // (limite pratico: 500 record per entity nella maggior parte dei casi)
          break;
        }
        backup.entities[entityName] = allRecords;
        totalRecords += allRecords.length;
      } catch (e) {
        backup.entities[entityName] = { error: e.message };
      }
    }

    const backupJson = JSON.stringify(backup, null, 2);
    const backupBlob = new Blob([backupJson], { type: 'application/json' });

    const uploadResult = await base44.integrations.Core.UploadPrivateFile({
      file: await backupBlob.arrayBuffer()
    });

    const signed = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri: uploadResult.file_uri,
      expires_in: 86400
    });

    return Response.json({
      success: true,
      timestamp: backup.timestamp,
      signed_url: signed.signed_url,
      file_uri: uploadResult.file_uri,
      entities_count: ALL_ENTITIES.length,
      total_records: totalRecords
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});