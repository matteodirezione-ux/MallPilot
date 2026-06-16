import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const payload = await req.json().catch(() => ({}));
        const ticket = payload?.data;
        const ticketId = payload?.event?.entity_id;

        if (!ticket || !ticketId) {
            return Response.json({ success: false, reason: 'no ticket data' });
        }

        // Solo ticket in attesa approvazione
        if (ticket.stato !== 'in_attesa_approvazione') {
            return Response.json({ success: false, reason: 'stato non rilevante' });
        }

        // Trova i direttori assegnati al centro del ticket
        const [assegnazioni, direttori, centri] = await Promise.all([
            base44.asServiceRole.entities.Assegnazione.filter({ centro_id: ticket.centro_id }),
            base44.asServiceRole.entities.Direttore.list(),
            base44.asServiceRole.entities.CentroCommerciale.list(),
        ]);

        const emailDirettori = new Set(assegnazioni.map(a => a.user_email));
        const centro = centri.find(c => c.id === ticket.centro_id);
        const nomeCentro = centro?.nome || 'il centro';

        const direttoriDestinatari = direttori.filter(d => emailDirettori.has(d.email));

        // Includi anche gli admin (proprieta) senza assegnazione specifica
        const tuttiDirettori = await base44.asServiceRole.entities.Direttore.list();
        // Unione email: assegnati + tutti i direttori del centro
        const emailDestinatari = [...new Set(direttoriDestinatari.map(d => d.email))];

        if (emailDestinatari.length === 0) {
            return Response.json({ success: true, reason: 'nessun direttore trovato', emails_sent: 0 });
        }

        const oggettoMail = `Nuovo ticket in attesa: n. ${ticket.numero_ticket || ticketId.slice(-6)}`;
        const corpo = `
<p>Ciao,</p>
<p>È stato aperto un nuovo ticket di manutenzione che richiede la tua approvazione.</p>
<ul>
  <li><strong>N° Ticket:</strong> ${ticket.numero_ticket || '-'}</li>
  <li><strong>Centro:</strong> ${nomeCentro}</li>
  <li><strong>Operatore:</strong> ${ticket.operatore || '-'}</li>
  <li><strong>Tipologia:</strong> ${ticket.tipologia === 'urgente' ? '🔴 Urgente' : 'Ordinario'}</li>
  <li><strong>Data apertura:</strong> ${ticket.data_apertura || '-'}</li>
  ${ticket.descrizione ? `<li><strong>Descrizione:</strong> ${ticket.descrizione}</li>` : ''}
</ul>
<p>Accedi all'app per approvare o rifiutare il ticket.</p>
        `.trim();

        let emailInviate = 0;
        for (const email of emailDestinatari) {
            await base44.asServiceRole.integrations.Core.SendEmail({
                to: email,
                subject: oggettoMail,
                body: corpo,
            });
            emailInviate++;
        }

        return Response.json({ success: true, emails_sent: emailInviate });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});