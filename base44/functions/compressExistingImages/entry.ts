import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Jimp from 'npm:jimp@0.22.12';

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
      { name: 'SpazioExpo', field: 'foto_urls' }
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

            const buffer = await response.arrayBuffer();
            
            // Comprimi con Jimp
            const image = await Jimp.read(Buffer.from(buffer));
            const compressed = image
              .resize({ w: 600, h: 600, fit: 'contain' })
              .quality(50);

            const compressedBuffer = await compressed.toBuffer({ format: 'image/jpeg' });

            // Carica l'immagine compressa
            const result = await base44.integrations.Core.UploadFile({
              file: compressedBuffer
            });

            newUrls.push(result.file_url);
            totalCompressed++;
          } catch (err) {
            console.error(`Errore compressione ${url}:`, err.message);
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
      message: `Compresso ${totalCompressed} immagini su ${totalProcessed} record`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});