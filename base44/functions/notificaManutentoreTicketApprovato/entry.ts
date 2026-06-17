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

        if (ticket.stato !== 'approvato') {
            return Response.json({ success: false, reason: 'stato non rilevante' });
        }

        const [manutentori, centri] = await Promise.all([
            base44.asServiceRole.entities.Manutentore.list(),
            base44.asServiceRole.entities.CentroCommerciale.list(),
        ]);

        const centro = centri.find(c => c.id === ticket.centro_id);
        const nomeCentro = centro?.nome || 'il centro';

        if (manutentori.length === 0) {
            return Response.json({ success: true, reason: 'nessun manutentore registrato', emails_sent: 0 });
        }

        const oggettoMail = `Nuovo ticket approvato: n. ${ticket.numero_ticket || ticketId.slice(-6)}`;
        const corpo = `
<p>Ciao,</p>
<p>È stato approvato un nuovo ticket di manutenzione che richiede il tuo intervento.</p>
<ul>
  <li><strong>N° Ticket:</strong> ${ticket.numero_ticket || '-'}</li>
  <li><strong>Centro:</strong> ${nomeCentro}</li>
  <li><strong>Operatore:</strong> ${ticket.operatore || '-'}</li>
  <li><strong>Tipologia:</strong> ${ticket.tipologia === 'urgente' ? 'Urgente' : 'Ordinario'}</li>
  <li><strong>Data apertura:</strong> ${ticket.data_apertura || '-'}</li>
  <li><strong>Scadenza:</strong> ${ticket.scadenza || '-'}</li>
  ${ticket.descrizione ? `<li><strong>Descrizione:</strong> ${ticket.descrizione}</li>` : ''}
</ul>
<p>Accedi all'app per inserire il preventivo o le note d'intervento.</p>
        `.trim();

        let emailInviate = 0;
        for (const manutentore of manutentori) {
            await base44.asServiceRole.integrations.Core.SendEmail({
                to: manutentore.email,
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