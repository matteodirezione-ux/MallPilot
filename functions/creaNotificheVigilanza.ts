import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    const entityType = event?.entity_name;
    const entityData = data;

    if (!entityData) {
      return Response.json({ ok: true, message: 'No data' });
    }

    const centro_id = entityData.centro_id;
    if (!centro_id) {
      return Response.json({ ok: true, message: 'No centro_id' });
    }

    // Trova assegnazioni per questo centro
    const assegnazioni = await base44.asServiceRole.entities.Assegnazione.filter({ centro_id });
    if (!assegnazioni.length) {
      return Response.json({ ok: true, message: 'No assegnazioni' });
    }

    // Trova vigilanze registrate
    const vigilanze = await base44.asServiceRole.entities.Vigilanza.list();
    const vigilanzaEmails = new Set(vigilanze.map(v => v.email));

    const destinatariDaAssegnazione = assegnazioni
      .map(a => a.user_email)
      .filter(email => vigilanzaEmails.has(email));

    // Includi anche il destinatario diretto se è una vigilanza
    const destinatariSet = new Set(destinatariDaAssegnazione);
    if (entityData.assegnato_a_email && vigilanzaEmails.has(entityData.assegnato_a_email)) {
      destinatariSet.add(entityData.assegnato_a_email);
    }

    const destinatari = [...destinatariSet];

    if (!destinatari.length) {
      return Response.json({ ok: true, message: 'No vigilanza destinatari' });
    }

    // Costruisci titolo e messaggio in base al tipo
    let tipo, titolo, messaggio;

    if (entityType === 'Task') {
      tipo = 'task';
      titolo = `Nuovo task: ${entityData.titolo || 'Senza titolo'}`;
      messaggio = entityData.descrizione || '';
    } else if (entityType === 'Prenotazione') {
      tipo = 'prenotazione';
      titolo = entityData.is_event
        ? `Nuovo evento: ${entityData.nome_evento || 'Evento'}`
        : 'Nuova prenotazione';
      messaggio = `Dal ${entityData.data_inizio} al ${entityData.data_fine}`;
    } else if (entityType === 'Manutenzione') {
      tipo = 'manutenzione';
      titolo = `Nuova attività: ${entityData.titolo || 'Senza titolo'}`;
      messaggio = entityData.descrizione || '';
    } else {
      return Response.json({ ok: true, message: 'Unknown entity type' });
    }

    // Crea notifica per ogni vigilanza del centro
    await Promise.all(destinatari.map(email =>
      base44.asServiceRole.entities.Notifica.create({
        destinatario_email: email,
        tipo,
        titolo,
        messaggio,
        centro_id,
        entity_id: event.entity_id,
        letta: false,
      })
    ));

    return Response.json({ ok: true, created: destinatari.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});