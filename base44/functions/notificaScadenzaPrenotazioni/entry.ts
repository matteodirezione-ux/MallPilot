import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);

        // Data target: oggi + 30 giorni
        const target = new Date(oggi);
        target.setDate(target.getDate() + 30);
        const targetStr = target.toISOString().split('T')[0];

        // Carica tutte le prenotazioni attive
        const prenotazioni = await base44.asServiceRole.entities.Prenotazione.filter({
            stato: { $in: ['confermata', 'in_corso'] }
        });

        // Filtra: prenotazioni che scadono esattamente tra 30 giorni E durano più di un mese
        const prenotazioniInScadenza = prenotazioni.filter(p => {
            if (!p.data_inizio || !p.data_fine) return false;
            if (p.data_fine !== targetStr) return false;

            const inizio = new Date(p.data_inizio);
            const fine = new Date(p.data_fine);
            const durataGiorni = (fine - inizio) / (1000 * 60 * 60 * 24);
            return durataGiorni > 30;
        });

        if (prenotazioniInScadenza.length === 0) {
            return Response.json({ success: true, email_inviate: 0 });
        }

        // Carica spazi, clienti e centri per arricchire le info
        const [spazi, clienti, centri] = await Promise.all([
            base44.asServiceRole.entities.SpazioExpo.list(),
            base44.asServiceRole.entities.Cliente.list(),
            base44.asServiceRole.entities.CentroCommerciale.list(),
        ]);

        const spaziMap = Object.fromEntries(spazi.map(s => [s.id, s]));
        const clientiMap = Object.fromEntries(clienti.map(c => [c.id, c]));
        const centriMap = Object.fromEntries(centri.map(c => [c.id, c]));

        // Carica i direttori per inviare le mail
        const direttori = await base44.asServiceRole.entities.Direttore.list();
        const destinatari = [...new Set(direttori.map(d => d.email))];

        if (destinatari.length === 0) {
            return Response.json({ success: true, email_inviate: 0, note: 'Nessun destinatario trovato' });
        }

        // Costruisce il corpo email
        let righe = prenotazioniInScadenza.map(p => {
            const spaziNomi = (p.spazi_ids || (p.spazio_id ? [p.spazio_id] : []))
                .map(id => spaziMap[id]?.numero_spazio || id)
                .join(', ') || 'N/D';
            const cliente = p.cliente_id ? (clientiMap[p.cliente_id]?.ragione_sociale || clientiMap[p.cliente_id]?.nome || 'N/D') : (p.nome_evento || 'N/D');
            const centro = centriMap[p.centro_id]?.nome || p.centro_id || 'N/D';
            const durataGiorni = Math.round((new Date(p.data_fine) - new Date(p.data_inizio)) / (1000 * 60 * 60 * 24));
            return `• ${cliente} — Spazio ${spaziNomi} (${centro})\n  Dal ${p.data_inizio} al ${p.data_fine} (${durataGiorni} giorni)\n  Prezzo: €${p.prezzo_totale?.toLocaleString('it-IT') || 'N/D'}`;
        }).join('\n\n');

        const soggetto = `⚠️ ${prenotazioniInScadenza.length} prenotazion${prenotazioniInScadenza.length === 1 ? 'e in scadenza' : 'i in scadenza'} tra 30 giorni`;
        const corpo = `Buongiorno,\n\nle seguenti prenotazioni a lungo termine scadranno tra 30 giorni (il ${targetStr}):\n\n${righe}\n\nSi consiglia di verificare se i clienti intendono rinnovare.\n\nMall Pilot`;

        // Invia mail a tutti i destinatari
        let inviate = 0;
        for (const email of destinatari) {
            await base44.asServiceRole.integrations.Core.SendEmail({
                to: email,
                subject: soggetto,
                body: corpo,
            });
            inviate++;
        }

        return Response.json({ success: true, email_inviate: inviate, prenotazioni: prenotazioniInScadenza.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});