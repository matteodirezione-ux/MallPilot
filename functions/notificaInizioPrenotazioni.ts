import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Carica dati in parallelo
        const [prenotazioniDomani, prenotazioniOggi, vigilanze, assegnazioni, spazi, clienti, notificheEsistenti] = await Promise.all([
            base44.asServiceRole.entities.Prenotazione.filter({ data_inizio: tomorrowStr }),
            base44.asServiceRole.entities.Prenotazione.filter({ data_inizio: todayStr }),
            base44.asServiceRole.entities.Vigilanza.list(),
            base44.asServiceRole.entities.Assegnazione.list(),
            base44.asServiceRole.entities.SpazioExpo.list(),
            base44.asServiceRole.entities.Cliente.list(),
            base44.asServiceRole.entities.Notifica.filter({ letta: false }),
        ]);

        const vigilanzeEmails = new Set(vigilanze.map(v => v.email));

        // Set notifiche già esistenti
        const notificheSet = new Set(
            notificheEsistenti
                .filter(n => n.tipo === 'prenotazione')
                .map(n => `${n.destinatario_email}_${n.entity_id}_${n.titolo}`)
        );

        const notificheDaCreare = [];

        const getSpaziNomi = (prenotazione) => {
            const spaziIds = prenotazione.spazi_ids?.length > 0
                ? prenotazione.spazi_ids
                : (prenotazione.spazio_id ? [prenotazione.spazio_id] : []);
            return spaziIds.map(id => {
                const spazio = spazi.find(s => s.id === id);
                return spazio ? `Spazio ${spazio.numero_spazio}${spazio.nome ? ` - ${spazio.nome}` : ''}` : '';
            }).filter(Boolean).join(', ') || 'postazione';
        };

        const getVigilanzePerCentro = (centroId) => {
            return assegnazioni.filter(
                a => a.centro_id === centroId && vigilanzeEmails.has(a.user_email)
            );
        };

        // --- Prenotazioni di DOMANI: avviso anticipato ---
        for (const prenotazione of prenotazioniDomani.filter(p => p.stato !== 'cancellata')) {
            const spaziNomi = getSpaziNomi(prenotazione);
            const elettricita = prenotazione.necessita_elettricita;
            const isEvento = prenotazione.is_event;
            const nomeCliente = isEvento
                ? (prenotazione.nome_evento || 'Evento')
                : (clienti.find(c => c.id === prenotazione.cliente_id)?.ragione_sociale || 'Cliente');

            const titolo = 'Prenotazione in arrivo domani';
            let messaggio = `Domani inizia una prenotazione per ${nomeCliente} presso ${spaziNomi}.`;
            if (elettricita) {
                messaggio += ' ⚡ Questa postazione necessita di collegamento elettrico: assicurarsi che sia disponibile.';
            }

            for (const assegnazione of getVigilanzePerCentro(prenotazione.centro_id)) {
                const key = `${assegnazione.user_email}_${prenotazione.id}_${titolo}`;
                if (!notificheSet.has(key)) {
                    notificheDaCreare.push({
                        destinatario_email: assegnazione.user_email,
                        tipo: 'prenotazione',
                        titolo,
                        messaggio,
                        centro_id: prenotazione.centro_id,
                        entity_id: prenotazione.id,
                        letta: false,
                    });
                }
            }
        }

        // --- Prenotazioni di OGGI: verifica presenza cliente ---
        for (const prenotazione of prenotazioniOggi.filter(p => p.stato !== 'cancellata')) {
            const spaziNomi = getSpaziNomi(prenotazione);
            const isEvento = prenotazione.is_event;
            const nomeCliente = isEvento
                ? (prenotazione.nome_evento || 'Evento')
                : (clienti.find(c => c.id === prenotazione.cliente_id)?.ragione_sociale || 'Cliente');

            const titolo = 'Verifica presenza cliente';
            const messaggio = `Oggi inizia la prenotazione di ${nomeCliente} presso ${spaziNomi}. Verificare che il cliente sia presente e che la postazione sia pronta.`;

            for (const assegnazione of getVigilanzePerCentro(prenotazione.centro_id)) {
                const key = `${assegnazione.user_email}_${prenotazione.id}_${titolo}`;
                if (!notificheSet.has(key)) {
                    notificheDaCreare.push({
                        destinatario_email: assegnazione.user_email,
                        tipo: 'prenotazione',
                        titolo,
                        messaggio,
                        centro_id: prenotazione.centro_id,
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
            message: `Create ${notificheDaCreare.length} notifiche`,
            count: notificheDaCreare.length
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});