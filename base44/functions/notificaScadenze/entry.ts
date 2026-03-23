import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const oggi = new Date().toISOString().split('T')[0];

        // Carica vigilanze, task e manutenzioni in parallelo
        const [vigilanze, tasks, manutenzioni] = await Promise.all([
            base44.asServiceRole.entities.Vigilanza.list(),
            base44.asServiceRole.entities.Task.list(),
            base44.asServiceRole.entities.Manutenzione.list(),
        ]);

        const vigilanzaEmails = new Set(vigilanze.map(v => v.email));

        // Filtra task scaduti assegnati a vigilanza
        const taskScaduti = tasks.filter(t =>
            t.data_scadenza &&
            t.data_scadenza < oggi &&
            t.stato !== 'completato' &&
            t.stato !== 'annullato' &&
            t.assegnato_a_email &&
            vigilanzaEmails.has(t.assegnato_a_email)
        );

        // Filtra manutenzioni scadute assegnate a vigilanza
        const manutenzioniScadute = manutenzioni.filter(m =>
            m.data_scadenza &&
            m.data_scadenza < oggi &&
            m.stato !== 'completato' &&
            m.stato !== 'annullato' &&
            m.assegnato_a_email &&
            vigilanzaEmails.has(m.assegnato_a_email)
        );

        // Carica notifiche già esistenti non lette per evitare duplicati
        const notificheEsistenti = await base44.asServiceRole.entities.Notifica.filter({ letta: false });
        const notificheEntityIds = new Set(notificheEsistenti.map(n => n.entity_id).filter(Boolean));

        const nuoveNotifiche = [];

        for (const task of taskScaduti) {
            if (notificheEntityIds.has(task.id)) continue;
            nuoveNotifiche.push({
                destinatario_email: task.assegnato_a_email,
                tipo: 'task',
                titolo: `Task scaduto: ${task.titolo}`,
                messaggio: `Il task "${task.titolo}" era in scadenza il ${task.data_scadenza} ed è ancora aperto.`,
                centro_id: task.centro_id || '',
                entity_id: task.id,
                letta: false,
            });
        }

        for (const man of manutenzioniScadute) {
            if (notificheEntityIds.has(man.id)) continue;
            nuoveNotifiche.push({
                destinatario_email: man.assegnato_a_email,
                tipo: 'manutenzione',
                titolo: `Attività scaduta: ${man.titolo}`,
                messaggio: `L'attività "${man.titolo}" era in scadenza il ${man.data_scadenza} ed è ancora aperta.`,
                centro_id: man.centro_id || '',
                entity_id: man.id,
                letta: false,
            });
        }

        if (nuoveNotifiche.length > 0) {
            await base44.asServiceRole.entities.Notifica.bulkCreate(nuoveNotifiche);
        }

        return Response.json({ 
            success: true, 
            notifiche_create: nuoveNotifiche.length 
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});