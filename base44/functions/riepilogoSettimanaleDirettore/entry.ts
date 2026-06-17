import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function formatDate(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Calcola la settimana scorsa (lunedì 00:00 – domenica 23:59:59)
        const oggi = new Date();
        const giornoSettimana = oggi.getDay(); // 0=domenica, 1=lunedì...
        const giorniDalLunediScorso = giornoSettimana === 0 ? 13 : giornoSettimana + 6;
        const lunediScorso = new Date(oggi);
        lunediScorso.setDate(oggi.getDate() - giorniDalLunediScorso);
        lunediScorso.setHours(0, 0, 0, 0);

        const domenicaScorsa = new Date(lunediScorso);
        domenicaScorsa.setDate(lunediScorso.getDate() + 6);
        domenicaScorsa.setHours(23, 59, 59, 999);

        const inizio = lunediScorso.toISOString().split('T')[0];
        const fine = domenicaScorsa.toISOString().split('T')[0];
        const inizioFormattato = formatDate(inizio);
        const fineFormattato = formatDate(fine);

        // Carica tutti i dati in parallelo
        const [direttori, reports, manutenzioni, tickets, capexList, puliziePeriodiche, centri, assegnazioni] = await Promise.all([
            base44.asServiceRole.entities.Direttore.list(),
            base44.asServiceRole.entities.Report.list(),
            base44.asServiceRole.entities.Manutenzione.list(),
            base44.asServiceRole.entities.Ticket.list(),
            base44.asServiceRole.entities.Capex.list(),
            base44.asServiceRole.entities.PuliziaPeriodica.list(),
            base44.asServiceRole.entities.CentroCommerciale.list(),
            base44.asServiceRole.entities.Assegnazione.list(),
        ]);

        // Mappa centri e assegnazioni
        const centroMap = {};
        centri.forEach(c => { centroMap[c.id] = c; });
        const assegnazioniPerUtente = {};
        assegnazioni.forEach(a => {
            if (!assegnazioniPerUtente[a.user_email]) assegnazioniPerUtente[a.user_email] = new Set();
            assegnazioniPerUtente[a.user_email].add(a.centro_id);
        });

        let emailInviate = 0;

        for (const direttore of direttori) {
            const centriSet = assegnazioniPerUtente[direttore.email] || new Set();

            // Filtra dati per i centri del direttore
            const filtraPerCentri = (items) => {
                if (centriSet.size === 0) return [];
                return items.filter(item => centriSet.has(item.centro_id));
            };

            // Report della settimana scorsa
            const reportsSettimana = filtraPerCentri(reports).filter(r => r.data >= inizio && r.data <= fine);

            // Manutenzioni con scadenza nella settimana scorsa
            const manutenzioniSettimana = filtraPerCentri(manutenzioni).filter(m => m.data_scadenza >= inizio && m.data_scadenza <= fine);

            // Ticket aperti (non chiusi/rifiutati)
            const ticketsAperti = filtraPerCentri(tickets).filter(t => t.stato !== 'chiuso' && t.stato !== 'rifiutato');

            // Capex
            const capexFiltrati = filtraPerCentri(capexList);

            // Pulizie periodiche con scadenza nella settimana scorsa
            const pulizieSettimana = filtraPerCentri(puliziePeriodiche).filter(p => p.prossima_scadenza >= inizio && p.prossima_scadenza <= fine);

            // Raggruppa per centro
            const centriConDati = new Set();
            reportsSettimana.forEach(r => centriConDati.add(r.centro_id));
            manutenzioniSettimana.forEach(m => centriConDati.add(m.centro_id));
            ticketsAperti.forEach(t => centriConDati.add(t.centro_id));
            capexFiltrati.forEach(c => centriConDati.add(c.centro_id));
            pulizieSettimana.forEach(p => centriConDati.add(p.centro_id));

            // Costruisci il corpo dell'email per centro
            const sezioni = [];

            for (const cid of centriConDati) {
                const nomeCentro = centroMap[cid]?.nome || cid;
                const r = reportsSettimana.filter(x => x.centro_id === cid);
                const m = manutenzioniSettimana.filter(x => x.centro_id === cid);
                const t = ticketsAperti.filter(x => x.centro_id === cid);
                const ca = capexFiltrati.filter(x => x.centro_id === cid);
                const p = pulizieSettimana.filter(x => x.centro_id === cid);

                let html = `<h2 style="color:#1e3a5f;margin-top:20px;">📌 ${nomeCentro}</h2>`;

                // Report
                html += `<h3 style="margin-bottom:4px;">📋 Report (${r.length})</h3>`;
                if (r.length === 0) {
                    html += `<p style="color:#6b7280;">Nessun report nella settimana.</p>`;
                } else {
                    html += `<ul>`;
                    for (const rep of r) {
                        html += `<li><strong>${formatDate(rep.data)}</strong> – Operatore: ${rep.operatore || '-'} ${rep.furto ? '🔴 Furto segnalato' : ''}</li>`;
                    }
                    html += `</ul>`;
                }

                // Controlli (manutenzioni)
                html += `<h3 style="margin-bottom:4px;">🔧 Controlli / Manutenzioni (${m.length})</h3>`;
                if (m.length === 0) {
                    html += `<p style="color:#6b7280;">Nessun controllo in scadenza nella settimana.</p>`;
                } else {
                    html += `<ul>`;
                    for (const man of m) {
                        html += `<li><strong>${man.titolo}</strong> – Scadenza: ${formatDate(man.data_scadenza)} – Stato: ${man.stato}</li>`;
                    }
                    html += `</ul>`;
                }

                // Ticket aperti
                html += `<h3 style="margin-bottom:4px;">🎫 Ticket aperti (${t.length})</h3>`;
                if (t.length === 0) {
                    html += `<p style="color:#6b7280;">Nessun ticket aperto.</p>`;
                } else {
                    html += `<ul>`;
                    for (const tk of t) {
                        const urgenza = tk.tipologia === 'urgente' ? '🔴' : '';
                        html += `<li>${urgenza} <strong>${tk.numero_ticket || '-'}</strong> – ${tk.operatore || 'N/D'} – Stato: ${tk.stato}</li>`;
                    }
                    html += `</ul>`;
                }

                // Capex
                html += `<h3 style="margin-bottom:4px;">📈 Capex (${ca.length})</h3>`;
                if (ca.length === 0) {
                    html += `<p style="color:#6b7280;">Nessun Capex registrato.</p>`;
                } else {
                    html += `<ul>`;
                    for (const cx of ca) {
                        html += `<li><strong>${cx.titolo}</strong> – Stato: ${cx.stato} – Costo previsto: ${cx.costo_previsto ? '€' + cx.costo_previsto.toLocaleString('it-IT') : 'N/D'}</li>`;
                    }
                    html += `</ul>`;
                }

                // Pulizie periodiche
                html += `<h3 style="margin-bottom:4px;">🧹 Pulizie periodiche (${p.length})</h3>`;
                if (p.length === 0) {
                    html += `<p style="color:#6b7280;">Nessuna pulizia in scadenza nella settimana.</p>`;
                } else {
                    html += `<ul>`;
                    for (const pu of p) {
                        html += `<li><strong>${pu.titolo}</strong> – Scadenza: ${formatDate(pu.prossima_scadenza)} – Frequenza: ${pu.frequenza} – Stato: ${pu.stato}</li>`;
                    }
                    html += `</ul>`;
                }

                sezioni.push(html);
            }

            const corpo = `
<div style="font-family:Arial,sans-serif;max-width:700px;">
  <h1 style="color:#1e3a5f;">📊 Riepilogo settimanale</h1>
  <p>Ecco il riassunto della settimana <strong>${inizioFormattato} → ${fineFormattato}</strong> per i tuoi centri.</p>
  ${sezioni.join('')}
  <hr style="margin-top:24px;border:none;border-top:1px solid #e5e7eb;">
  <p style="color:#9ca3af;font-size:12px;">Mall Pilot – Riepilogo automatico del lunedì</p>
</div>`.trim();

            await base44.asServiceRole.integrations.Core.SendEmail({
                to: direttore.email,
                subject: `Riepilogo settimanale ${inizioFormattato} – ${fineFormattato}`,
                body: corpo,
            });
            emailInviate++;
        }

        return Response.json({ success: true, emails_sent: emailInviate, periodo: `${inizio} → ${fine}` });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});