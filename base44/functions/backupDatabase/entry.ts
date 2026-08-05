import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

// Backup completo di TUTTI i dati delle entità. Ritorna il JSON direttamente come Response.
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

    for (const entityName of ALL_ENTITIES) {
      try {
        const entity = base44.asServiceRole.entities[entityName];
        if (!entity) { backup.entities[entityName] = { error: 'entity not found' }; continue; }
        const records = await entity.filter({}, '-created_date', 10000);
        backup.entities[entityName] = records;
      } catch (e) {
        backup.entities[entityName] = { error: e.message };
      }
    }

    const json = JSON.stringify(backup, null, 2);
    return new Response(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="backup_dati_${new Date().toISOString().slice(0, 10)}.json"`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});