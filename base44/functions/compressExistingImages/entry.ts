import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const entitiesWithImages = [
      { name: 'Task', field: 'foto_urls' },
      { name: 'Manutenzione', field: 'foto_urls' },
      { name: 'Ticket', field: 'foto_urls' },
      { name: 'Report', field: 'foto_urls' },
      { name: 'Pulizia', field: 'foto_urls' },
      { name: 'PuliziaPeriodica', field: 'foto_urls' },
      { name: 'Capex', field: 'allegati_urls' },
      { name: 'Documento', field: 'file_url' },
      { name: 'SpazioExpo', field: 'foto_urls' },
      { name: 'CentroCommerciale', field: 'logo_url' }
    ];

    let totalProcessed = 0;
    let totalCompressed = 0;

    for (const { name, field } of entitiesWithImages) {
      const entity = base44.asServiceRole.entities[name];
      if (!entity) continue;

      const records = await entity.list();
      
      for (const record of records) {
        const urls = Array.isArray(record[field]) ? record[field] : 
                     record[field] && typeof record[field] === 'string' ? [record[field]] : [];
        
        if (!urls.length) continue;

        const newUrls = [];
        for (const url of urls) {
          try {
            // Scarica l'immagine
            const response = await fetch(url);
            if (!response.ok) {
              newUrls.push(url);
              continue;
            }

            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();

            // Carica il file compresso
            const result = await base44.integrations.Core.UploadFile({
              file: arrayBuffer
            });

            newUrls.push(result.file_url);
            totalCompressed++;
          } catch (err) {
            // Se fallisce, mantieni l'URL originale
            newUrls.push(url);
          }
        }

        // Aggiorna l'entità
        if (Array.isArray(record[field])) {
          await entity.update(record.id, { [field]: newUrls });
        } else if (newUrls.length > 0) {
          await entity.update(record.id, { [field]: newUrls[0] });
        }

        totalProcessed++;
      }
    }

    return Response.json({
      success: true,
      total_records: totalProcessed,
      total_compressed: totalCompressed,
      message: `Compresso ${totalCompressed} immagini da ${totalProcessed} record`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});