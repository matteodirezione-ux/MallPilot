import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

// Backup dei dati filtrato per i centri assegnati al direttore (o ai centri selezionati).
// L'admin può scaricare tutto (se nessun centro selezionato) o un sottoinsieme.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedCentriIds = Array.isArray(body.centri_ids) ? body.centri_ids : [];
    const isAdmin = user.role === 'admin';

    // Centri assegnati all'utente corrente
    let allowedCentriIds = [];
    if (!isAdmin) {
      const assegnazioni = await base44.asServiceRole.entities.Assegnazione.filter({ user_email: user.email });
      allowedCentriIds = [...new Set(assegnazioni.map(a => a.centro_id))];
    }

    // Filtra i centri richiesti rispetto a quelli autorizzati
    const centriIds = isAdmin
      ? (requestedCentriIds.length > 0 ? requestedCentriIds : null) // admin senza selezione = tutti
      : requestedCentriIds.filter(id => allowedCentriIds.includes(id));

    if (!isAdmin && (!centriIds || centriIds.length === 0)) {
      return Response.json({ error: 'Nessun centro selezionato o non autorizzato' }, { status: 403 });
    }

    const ENTITIES_WITH_CENTRO = [
      'SpazioExpo', 'Cliente', 'Prenotazione', 'Documento',
      'Task', 'Manutenzione', 'Ticket', 'Report', 'Capex', 'Pulizia', 'PuliziaPeriodica',
      'Notifica', 'Budget', 'Tenant', 'Corrispettivo', 'LetturaContatore', 'LetturaContatoreGiornaliero',
      'Fornitore', 'Marketing', 'MeteoGiornaliero', 'ConsegnaVigilanza'
    ];

    const backup = { timestamp: new Date().toISOString(), type: 'filtered_data_backup', entities: {} };

    // CentroCommerciale: filtra per id
    try {
      const allCentri = await base44.asServiceRole.entities.CentroCommerciale.filter({});
      backup.entities.CentroCommerciale = (centriIds === null)
        ? allCentri
        : allCentri.filter(c => centriIds.includes(c.id));
    } catch (e) {
      backup.entities.CentroCommerciale = { error: e.message };
    }

    // Assegnazioni: solo quelle dei centri selezionati
    try {
      const allAss = await base44.asServiceRole.entities.Assegnazione.filter({});
      backup.entities.Assegnazione = (centriIds === null)
        ? allAss
        : allAss.filter(a => centriIds.includes(a.centro_id));
    } catch (e) {
      backup.entities.Assegnazione = { error: e.message };
    }

    for (const entityName of ENTITIES_WITH_CENTRO) {
      try {
        const entity = base44.asServiceRole.entities[entityName];
        if (!entity) { backup.entities[entityName] = { error: 'entity not found' }; continue; }
        const all = await entity.filter({}, '-created_date', 10000);
        backup.entities[entityName] = (centriIds === null)
          ? all
          : all.filter(r => r.centro_id && centriIds.includes(r.centro_id));
      } catch (e) {
        backup.entities[entityName] = { error: e.message };
      }
    }

    return Response.json(backup);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});