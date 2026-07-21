import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const body = await req.json();
        const prenotazione = body.data;

        if (!prenotazione || prenotazione.stato === 'cancellata') {
            return Response.json({ message: 'Nessuna azione richiesta' });
        }

        const centroId = prenotazione.centro_id;
        const dataInizio = prenotazione.data_inizio; // YYYY-MM-DD
        const dataFine = prenotazione.data_fine;     // YYYY-MM-DD

        if (!centroId || !dataInizio || !dataFine) {
            return Response.json({ message: 'Dati insufficienti' });
        }

        // Carica spazi e vigilanza del centro in parallelo
        const [spazi, assegnazioni, vigilanze] = await Promise.all([
            base44.asServiceRole.entities.SpazioExpo.list(),
            base44.asServiceRole.entities.Assegnazione.filter({ centro_id: centroId }),
            base44.asServiceRole.entities.Vigilanza.list(),
        ]);

        // Nomi spazi
        const spaziIds = prenotazione.spazi_ids?.length > 0
            ? prenotazione.spazi_ids
            : (prenotazione.spazio_id ? [prenotazione.spazio_id] : []);
        
        const spaziNomi = spaziIds.map(id => {
            const s = spazi.find(sp => sp.id === id);
            return s ? `postazione ${s.numero_spazio}${s.nome ? ` (${s.nome})` : ''}` : 'postazione';
        }).join(', ') || 'postazione';

        // Nome cliente/evento
        const isEvento = prenotazione.is_event;
        let nomeCliente = 'Cliente';
        if (isEvento) {
            nomeCliente = prenotazione.nome_evento || 'Evento';
        } else if (prenotazione.cliente_id) {
            const clienti = await base44.asServiceRole.entities.Cliente.filter({ id: prenotazione.cliente_id });
            nomeCliente = clienti[0]?.ragione_sociale || 'Cliente';
        }

        // Data fine + 1 giorno per controllo liberazione
        const dataFineObj = new Date(dataFine + 'T00:00:00');
        dataFineObj.setDate(dataFineObj.getDate() + 1);
        const giornoDopo = dataFineObj.toISOString().split('T')[0];

        const controlloDaCreare = [];

        // Controllo 1: giorno di inizio — verificare arrivo
        controlloDaCreare.push({
            titolo: `Controllare "${nomeCliente}" alla ${spaziNomi}`,
            descrizione: `Verificare che "${nomeCliente}" sia presente e che la ${spaziNomi} sia pronta all'inizio della prenotazione.`,
            centro_id: centroId,
            data_scadenza: dataInizio,
            stato: 'da_fare',
        });

        // Controllo 2: giorno dopo la fine — verificare liberazione
        controlloDaCreare.push({
            titolo: `Controllare "${nomeCliente}" abbia lasciato la ${spaziNomi}`,
            descrizione: `Verificare che "${nomeCliente}" abbia liberato la ${spaziNomi} al termine della prenotazione (fine: ${dataFine}).`,
            centro_id: centroId,
            data_scadenza: giornoDopo,
            stato: 'da_fare',
        });

        await base44.asServiceRole.entities.Manutenzione.bulkCreate(controlloDaCreare);

        const taskDaCreare = [];

        // Task elettricità: 7 giorni prima dell'inizio, assegnato alla vigilanza del centro
        if (prenotazione.necessita_elettricita) {
            const dataInizioObj = new Date(dataInizio + 'T00:00:00');
            dataInizioObj.setDate(dataInizioObj.getDate() - 7);
            const dataTaskStr = dataInizioObj.toISOString().split('T')[0];

            // Prima vigilanza assegnata al centro
            const vigilanzeEmails = new Set(vigilanze.map(v => v.email));
            const assegnVig = assegnazioni.find(a => vigilanzeEmails.has(a.user_email));
            
            let assegnatoAEmail = null;
            let assegnatoANome = null;
            if (assegnVig) {
                const vig = vigilanze.find(v => v.email === assegnVig.user_email);
                assegnatoAEmail = vig?.email || null;
                assegnatoANome = vig?.full_name || null;
            }

            taskDaCreare.push({
                titolo: `Aprire ticket per richiesta di elettricità ${spaziNomi} per la prenotazione del ${dataInizio}`,
                descrizione: `La prenotazione di "${nomeCliente}" del ${dataInizio} richiede collegamento elettrico alla ${spaziNomi}. Aprire ticket di manutenzione per tempo.`,
                centro_id: centroId,
                data_scadenza: dataTaskStr,
                stato: 'da_fare',
                priorita: 'alta',
                assegnato_a_email: assegnatoAEmail,
                assegnato_a_nome: assegnatoANome,
            });

            await base44.asServiceRole.entities.Task.bulkCreate(taskDaCreare);
        }

        return Response.json({
            message: 'Controlli e task creati',
            controlli: controlloDaCreare.length,
            task: taskDaCreare.length,
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});