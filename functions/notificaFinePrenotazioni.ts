import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Data di ieri
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // Carica dati in parallelo
        const [prenotazioni, vigilanze, assegnazioni, spazi, notificheEsistenti] = await Promise.all([
            base44.asServiceRole.entities.Prenotazione.filter({ data_fine: yesterdayStr }),
            base44.asServiceRole.entities.Vigilanza.list(),
            base44.asServiceRole.entities.Assegnazione.list(),
            base44.asServiceRole.entities.SpazioExpo.list(),
            base44.asServiceRole.entities.Notifica.filter({ letta: false }),
        ]);

        // Solo prenotazioni non cancellate
        const prenotazioniAttive = prenotazioni.filter(p => p.stato !== 'cancellata');

        if (prenotazioniAttive.length === 0) {
            return Response.json({ message: 'Nessuna prenotazione terminata ieri', count: 0 });
        }

        const vigilanzeEmails = new Set(vigilanze.map(v => v.email));

        // Mappa notifiche già esistenti per evitare duplicati
        const notificheEsistentiSet = new Set(
            notificheEsistenti
                .filter(n => n.tipo === 'prenotazione' && n.titolo === 'Verifica liberazione postazione')
                .map(n => `${n.destinatario_email}_${n.entity_id}`)
        );

        const notificheDaCreare = [];

        for (const prenotazione of prenotazioniAttive) {
            const centroId = prenotazione.centro_id;

            // Vigilanza assegnata a questo centro
            const vigilanzeAssegnate = assegnazioni.filter(
                a => a.centro_id === centroId && vigilanzeEmails.has(a.user_email)
            );

            // Nomi degli spazi
            const spaziIds = prenotazione.spazi_ids?.length > 0
                ? prenotazione.spazi_ids
                : (prenotazione.spazio_id ? [prenotazione.spazio_id] : []);
            
            const spaziNomi = spaziIds.map(id => {
                const spazio = spazi.find(s => s.id === id);
                return spazio ? `Spazio ${spazio.numero_spazio}${spazio.nome ? ` - ${spazio.nome}` : ''}` : '';
            }).filter(Boolean).join(', ') || 'postazione';

            const dataFormattata = new Date(yesterdayStr).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

            for (const assegnazione of vigilanzeAssegnate) {
                const key = `${assegnazione.user_email}_${prenotazione.id}`;
                if (!notificheEsistentiSet.has(key)) {
                    notificheDaCreare.push({
                        destinatario_email: assegnazione.user_email,
                        tipo: 'prenotazione',
                        titolo: 'Verifica liberazione postazione',
                        messaggio: `La prenotazione è terminata il ${dataFormattata}. Verificare che ${spaziNomi} sia stata liberata e sgomberata.`,
                        centro_id: centroId,
                        entity_id: prenotazione.id,
                        letta: false,
                    });
                }
            }
        }

        if (notificheDaCreare.length > 0) {
            await base44.asServiceRole.entities.Notifica.bulkCreate(notificheDaCreare);
        }

        return Response.json({
            message: `Create ${notificheDaCreare.length} notifiche per fine prenotazioni`,
            count: notificheDaCreare.length
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});