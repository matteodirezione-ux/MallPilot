import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Solo admin possono eseguire il backup
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Lista di tutte le entità da backuppare
    const entities = [
      'CentroCommerciale',
      'SpazioExpo',
      'Cliente',
      'Prenotazione',
      'Documento',
      'Task',
      'Manutenzione',
      'Ticket',
      'Report',
      'Capex',
      'Pulizia',
      'PuliziaPeriodica',
      'Notifica',
      'Assegnazione',
      'Budget',
      'Direttore',
      'Vigilanza',
      'Manutentore'
    ];

    const backup = {
      timestamp: new Date().toISOString(),
      data: {}
    };

    // Esporta tutti i dati
    for (const entityName of entities) {
      const entity = base44.asServiceRole.entities[entityName];
      if (entity) {
        const allData = await entity.list();
        backup.data[entityName] = allData;
      }
    }

    // Salva il backup nello storage privato
    const backupJson = JSON.stringify(backup, null, 2);
    const backupBlob = new Blob([backupJson], { type: 'application/json' });
    
    const fileName = `backup_${new Date().toISOString().split('T')[0]}.json`;
    const uploadResult = await base44.integrations.Core.UploadPrivateFile({
      file: await backupBlob.arrayBuffer()
    });

    // Invia email di notifica
    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: `📦 Backup completato - ${new Date().toLocaleDateString('it-IT')}`,
      body: `Il backup dei dati è stato completato con successo.\n\nData: ${new Date().toLocaleString('it-IT')}\n\nEntità esportate: ${entities.length}\nFile: ${fileName}`
    });

    return Response.json({
      success: true,
      timestamp: backup.timestamp,
      file_uri: uploadResult.file_uri,
      entities_count: entities.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});