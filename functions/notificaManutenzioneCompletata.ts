import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();

        const { event, data, old_data } = payload;

        // Solo per update e solo se lo stato è passato a "completato"
        if (event?.type !== 'update') {
            return Response.json({ message: 'Ignored: not an update event' });
        }
        if (data?.stato !== 'completato' || old_data?.stato === 'completato') {
            return Response.json({ message: 'Ignored: stato not changed to completato' });
        }

        const manutenzione = data;
        const centroId = manutenzione.centro_id;

        if (!centroId) {
            return Response.json({ message: 'No centro_id on manutenzione' });
        }

        // Trova i direttori assegnati a questo centro
        const assegnazioni = await base44.asServiceRole.entities.Assegnazione.filter({ centro_id: centroId });
        if (!assegnazioni.length) {
            return Response.json({ message: 'No directors assigned to this centro' });
        }

        const tutteLeEmail = [...new Set(assegnazioni.map(a => a.user_email))];

        // Escludi le vigilanze, tieni solo i direttori
        const vigilanze = await base44.asServiceRole.entities.Vigilanza.list();
        const emailsVigilanza = vigilanze.map(v => v.email);

        const destinatari = tutteLeEmail.filter(email => !emailsVigilanza.includes(email));

        if (!destinatari.length) {
            return Response.json({ message: 'No direttori found for this centro' });
        }

        const completatoDa = manutenzione.assegnato_a_nome || manutenzione.assegnato_a_email || 'Utente';
        const formatData = (d) => d ? d.split('-').reverse().join('/') : null;

        const notifiche = destinatari.map(email => ({
            destinatario_email: email,
            tipo: 'manutenzione',
            titolo: `Attività completata: ${manutenzione.titolo}`,
            messaggio: `L'attività "${manutenzione.titolo}" è stata completata da ${completatoDa}.`,
            centro_id: centroId,
            entity_id: manutenzione.id,
            letta: false
        }));

        await base44.asServiceRole.entities.Notifica.bulkCreate(notifiche);

        return Response.json({ success: true, notifiche_create: notifiche.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});