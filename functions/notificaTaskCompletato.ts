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

        const task = data;
        const centroId = task.centro_id;

        let destinatari = [];

        const vigilanze = await base44.asServiceRole.entities.Vigilanza.list();
        const emailsVigilanza = new Set(vigilanze.map(v => v.email));

        if (centroId) {
            // Trova i direttori assegnati a questo centro
            const assegnazioni = await base44.asServiceRole.entities.Assegnazione.filter({ centro_id: centroId });
            const tutteLeEmail = [...new Set(assegnazioni.map(a => a.user_email))];
            destinatari = tutteLeEmail.filter(email => !emailsVigilanza.has(email));
        }

        // Se non ci sono destinatari dal centro (o non c'è centro_id),
        // notifica chi ha assegnato il task (se non è vigilanza)
        if (!destinatari.length && task.assegnato_da_email && !emailsVigilanza.has(task.assegnato_da_email)) {
            destinatari = [task.assegnato_da_email];
        }

        if (!destinatari.length) {
            return Response.json({ message: 'No recipients found for notification' });
        }

        const completatoDA = task.assegnato_a_nome || task.assegnato_a_email || 'Utente';
        const formatData = (d) => d ? d.split('-').reverse().join('/') : null;

        const notifiche = destinatari.map(email => ({
            destinatario_email: email,
            tipo: 'task',
            titolo: `Task completato: ${task.titolo}`,
            messaggio: `Il task "${task.titolo}" è stato completato da ${completatoDA}${task.data_scadenza ? ` (scadenza: ${task.data_scadenza})` : ''}.`,
            centro_id: centroId,
            entity_id: task.id,
            letta: false
        }));

        await base44.asServiceRole.entities.Notifica.bulkCreate(notifiche);

        return Response.json({ success: true, notifiche_create: notifiche.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});