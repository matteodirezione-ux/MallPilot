import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Verifica admin o scheduled
  const user = await base44.auth.me().catch(() => null);
  if (user && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  const domani = new Date(oggi);
  domani.setDate(oggi.getDate() + 1);

  const fmtDate = (d) => d.toISOString().split('T')[0];

  // Carica tutti i capex che iniziano oggi o domani
  const [capexOggi, capexDomani] = await Promise.all([
    base44.asServiceRole.entities.Capex.filter({ data_inizio: fmtDate(oggi) }),
    base44.asServiceRole.entities.Capex.filter({ data_inizio: fmtDate(domani) }),
  ]);

  const capexDaNotificare = [
    ...capexOggi.map(c => ({ ...c, tipo: 'oggi' })),
    ...capexDomani.map(c => ({ ...c, tipo: 'domani' })),
  ].filter(c => c.stato !== 'annullato');

  if (capexDaNotificare.length === 0) {
    return Response.json({ message: 'Nessun capex da notificare', count: 0 });
  }

  // Carica direttori e vigilanze con le loro assegnazioni
  const [direttori, vigilanze, assegnazioni] = await Promise.all([
    base44.asServiceRole.entities.Direttore.list(),
    base44.asServiceRole.entities.Vigilanza.list(),
    base44.asServiceRole.entities.Assegnazione.list(),
  ]);

  let notificheCreate = 0;

  for (const capex of capexDaNotificare) {
    const quandoLabel = capex.tipo === 'oggi' ? 'oggi' : 'domani';
    const titolo = `Capex "${capex.titolo}" inizia ${quandoLabel}`;
    const messaggio = `L'intervento Capex "${capex.titolo}" inizia ${quandoLabel} (${capex.data_inizio})${capex.data_fine ? ` - fine: ${capex.data_fine}` : ''}.${capex.descrizione ? ' ' + capex.descrizione : ''}`;

    // Trova gli utenti assegnati al centro del capex
    const emailsAssegnate = assegnazioni
      .filter(a => a.centro_id === capex.centro_id)
      .map(a => a.user_email);

    const destinatari = new Set();

    // Direttori assegnati al centro
    direttori
      .filter(d => emailsAssegnate.includes(d.email))
      .forEach(d => destinatari.add(d.email));

    // Vigilanze assegnate al centro
    vigilanze
      .filter(v => emailsAssegnate.includes(v.email))
      .forEach(v => destinatari.add(v.email));

    for (const email of destinatari) {
      // Evita duplicati: non creare notifica se già esiste per oggi
      const esistenti = await base44.asServiceRole.entities.Notifica.filter({
        destinatario_email: email,
        entity_id: capex.id,
        titolo: titolo,
      });

      if (esistenti.length === 0) {
        await base44.asServiceRole.entities.Notifica.create({
          destinatario_email: email,
          tipo: 'task',
          titolo,
          messaggio,
          centro_id: capex.centro_id,
          entity_id: capex.id,
          letta: false,
        });
        notificheCreate++;
      }
    }
  }

  return Response.json({ message: 'Notifiche Capex inviate', count: notificheCreate });
});