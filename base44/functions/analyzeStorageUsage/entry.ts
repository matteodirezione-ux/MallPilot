import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Entità che contengono immagini
    const entities = ['Report', 'Task', 'Ticket', 'Capex', 'Pulizia', 'PuliziaPeriodica', 'SpazioExpo', 'Documento', 'Manutenzione'];
    
    let totalImages = 0;
    const breakdown = {};

    for (const entityName of entities) {
      const records = await base44.asServiceRole.entities[entityName].list();
      let imageCount = 0;

      for (const record of records) {
        // Campi comuni che contengono immagini
        const imageFields = ['foto_urls', 'allegati_urls', 'piantina_url', 'logo_url', 'contratto_firmato_url', 'file_url'];
        
        for (const field of imageFields) {
          if (record[field]) {
            if (Array.isArray(record[field])) {
              imageCount += record[field].filter(url => typeof url === 'string' && url.length > 0).length;
            } else if (typeof record[field] === 'string' && record[field].length > 0) {
              imageCount += 1;
            }
          }
        }
      }

      totalImages += imageCount;
      breakdown[entityName] = imageCount;
    }

    // Stima ingombro: media di ~2.5MB per immagine (considerando che sono compresse dai servizi cloud)
    const avgSizePerImage = 2.5; // MB
    const estimatedTotalMB = (totalImages * avgSizePerImage).toFixed(2);
    const estimatedTotalGB = (estimatedTotalMB / 1024).toFixed(3);

    // Con compressione al 60% ridurremmo a ~1MB per immagine
    const compressedEstimateMB = (totalImages * 1).toFixed(2);
    const compressedEstimateGB = (compressedEstimateMB / 1024).toFixed(3);
    const potentialSavingsMB = (estimatedTotalMB - compressedEstimateMB).toFixed(2);

    return Response.json({
      timestamp: new Date().toISOString(),
      totalImages,
      breakdown,
      estimatedUsage: {
        mb: parseFloat(estimatedTotalMB),
        gb: parseFloat(estimatedTotalGB)
      },
      compressedEstimate: {
        mb: parseFloat(compressedEstimateMB),
        gb: parseFloat(compressedEstimateGB)
      },
      potentialSavings: {
        mb: parseFloat(potentialSavingsMB),
        percentage: ((potentialSavingsMB / estimatedTotalMB) * 100).toFixed(1)
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});