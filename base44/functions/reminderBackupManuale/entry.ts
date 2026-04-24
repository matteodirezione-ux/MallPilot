import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Genera il backup
    const entities = [
      'CentroCommerciale', 'SpazioExpo', 'Cliente', 'Prenotazione', 'Documento',
      'Task', 'Manutenzione', 'Ticket', 'Report', 'Capex', 'Pulizia', 'PuliziaPeriodica',
      'Notifica', 'Assegnazione', 'Budget', 'Direttore', 'Vigilanza', 'Manutentore'
    ];

    const backup = { timestamp: new Date().toISOString(), data: {} };
    for (const entityName of entities) {
      const entity = base44.asServiceRole.entities[entityName];
      if (entity) {
        const allData = await entity.list();
        backup.data[entityName] = allData;
      }
    }

    const backupJson = JSON.stringify(backup, null, 2);
    const backupBlob = new Blob([backupJson], { type: 'application/json' });
    const uploadResult = await base44.integrations.Core.UploadPrivateFile({
      file: await backupBlob.arrayBuffer()
    });

    // Genera URL firmato per il download
    const signedUrl = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri: uploadResult.file_uri,
      expires_in: 2592000 // 30 giorni
    });

    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: '📋 Promemoria: Backup manuale del database',
      body: `Ciao,\n\nnon dimenticare di fare un backup manuale dei tuoi dati questo mese.\n\nRicorda: stai già ricevendo backup automatici ogni notte, ma un backup manuale aggiuntivo è sempre una buona pratica.\n\n📥 Scarica il backup: ${signedUrl.signed_url}\n\nA presto!`
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});