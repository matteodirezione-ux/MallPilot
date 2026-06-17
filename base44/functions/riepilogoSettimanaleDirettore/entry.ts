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
        const giornoSettimana = oggi.getDay();
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

        // Calcola la settimana prossima (lunedì – domenica)
        const lunediProssimo = new Date(lunediScorso);
        lunediProssimo.setDate(lunediScorso.getDate() + 7);
        const domenicaProssima = new Date(domenicaScorsa);
        domenicaProssima.setDate(domenicaScorsa.getDate() + 7);
        const prossimoInizio = lunediProssimo.toISOString().split('T')[0];
        const prossimaFine = domenicaProssima.toISOString().split('T')[0];
        const prossimoInizioFormattato = formatDate(prossimoInizio);
        const prossimaFineFormattato = formatDate(prossimaFine);

        const [direttori, reports, manutenzioni, tickets, capexList, puliziePeriodiche, centri, assegnazioni, tasks, prenotazioni, clienti] = await Promise.all([
            base44.asServiceRole.entities.Direttore.list(),
            base44.asServiceRole.entities.Report.list(),
            base44.asServiceRole.entities.Manutenzione.list(),
            base44.asServiceRole.entities.Ticket.list(),
            base44.asServiceRole.entities.Capex.list(),
            base44.asServiceRole.entities.PuliziaPeriodica.list(),
            base44.asServiceRole.entities.CentroCommerciale.list(),
            base44.asServiceRole.entities.Assegnazione.list(),
            base44.asServiceRole.entities.Task.list(),
            base44.asServiceRole.entities.Prenotazione.list(),
            base44.asServiceRole.entities.Cliente.list(),
        ]);

        const clienteMap = {};
        clienti.forEach(c => { clienteMap[c.id] = c; });

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
            if (centriSet.size === 0) continue;

            const filtraPerCentri = (items) =>
                items.filter(item => centriSet.has(item.centro_id));

            // Raccogli i dati grezzi con dettagli
            const reportsSettimana = filtraPerCentri(reports).filter(r => r.data >= inizio && r.data <= fine);
            const manutenzioniSettimana = filtraPerCentri(manutenzioni).filter(m =>
                (m.data_scadenza >= inizio && m.data_scadenza <= fine) ||
                (m.stato === 'completato' && m.updated_date && m.updated_date >= inizio)
            );
            const ticketsAperti = filtraPerCentri(tickets).filter(t => t.stato !== 'chiuso' && t.stato !== 'rifiutato');
            const ticketsChiusiSettimana = filtraPerCentri(tickets).filter(t =>
                t.stato === 'chiuso' && t.updated_date && t.updated_date >= inizio && t.updated_date <= fine + 'T23:59:59'
            );
            const capexFiltrati = filtraPerCentri(capexList).filter(cx =>
                !cx.stato || cx.stato !== 'completato'
            );
            const pulizieSettimana = filtraPerCentri(puliziePeriodiche).filter(p =>
                (p.prossima_scadenza >= inizio && p.prossima_scadenza <= fine) ||
                (p.stato === 'completato' && p.updated_date && p.updated_date >= inizio)
            );
            const tasksSettimana = filtraPerCentri(tasks).filter(t =>
                (t.data_scadenza >= inizio && t.data_scadenza <= fine) ||
                (t.stato === 'completato' && t.updated_date && t.updated_date >= inizio)
            );

            // Prenotazioni: eventi in corso nella settimana (date range si sovrappone) + nuovi affitti creati/che iniziano nella settimana
            const eventiSettimana = filtraPerCentri(prenotazioni).filter(p =>
                p.is_event && p.data_inizio <= fine && p.data_fine >= inizio
            );
            const affittiSettimana = filtraPerCentri(prenotazioni).filter(p =>
                !p.is_event && (
                    (p.data_inizio >= inizio && p.data_inizio <= fine) ||
                    (p.created_date && p.created_date >= inizio && p.created_date <= fine + 'T23:59:59')
                )
            );

            // PREVISIONALE – Settimana prossima
            const controlliProssima = filtraPerCentri(manutenzioni).filter(m =>
                m.data_scadenza >= prossimoInizio && m.data_scadenza <= prossimaFine &&
                m.stato !== 'completato' && m.stato !== 'annullato'
            );
            const pulizieProssima = filtraPerCentri(puliziePeriodiche).filter(p =>
                p.prossima_scadenza >= prossimoInizio && p.prossima_scadenza <= prossimaFine &&
                p.stato !== 'completato'
            );
            const tasksProssima = filtraPerCentri(tasks).filter(t =>
                t.data_scadenza >= prossimoInizio && t.data_scadenza <= prossimaFine &&
                t.stato !== 'completato' && t.stato !== 'annullato'
            );
            const ticketsProssima = filtraPerCentri(tickets).filter(t =>
                t.scadenza >= prossimoInizio && t.scadenza <= prossimaFine &&
                t.stato !== 'chiuso' && t.stato !== 'rifiutato'
            );
            const capexProssima = filtraPerCentri(capexList).filter(cx =>
                cx.data_inizio && cx.data_inizio >= prossimoInizio && cx.data_inizio <= prossimaFine &&
                (!cx.stato || cx.stato !== 'completato')
            );
            const eventiProssima = filtraPerCentri(prenotazioni).filter(p =>
                p.is_event && p.data_inizio <= prossimaFine && p.data_fine >= prossimoInizio
            );
            const affittiProssima = filtraPerCentri(prenotazioni).filter(p =>
                !p.is_event && p.data_inizio >= prossimoInizio && p.data_inizio <= prossimaFine
            );

            // Costruisci un riepilogo strutturato per centro
            const datiPerCentro = [];
            const centriConDati = new Set();
            reportsSettimana.forEach(r => centriConDati.add(r.centro_id));
            manutenzioniSettimana.forEach(m => centriConDati.add(m.centro_id));
            ticketsAperti.forEach(t => centriConDati.add(t.centro_id));
            ticketsChiusiSettimana.forEach(t => centriConDati.add(t.centro_id));
            capexFiltrati.forEach(c => centriConDati.add(c.centro_id));
            pulizieSettimana.forEach(p => centriConDati.add(p.centro_id));
            tasksSettimana.forEach(t => centriConDati.add(t.centro_id));
            eventiSettimana.forEach(e => centriConDati.add(e.centro_id));
            affittiSettimana.forEach(a => centriConDati.add(a.centro_id));
            controlliProssima.forEach(m => centriConDati.add(m.centro_id));
            pulizieProssima.forEach(p => centriConDati.add(p.centro_id));
            tasksProssima.forEach(t => centriConDati.add(t.centro_id));
            ticketsProssima.forEach(t => centriConDati.add(t.centro_id));
            capexProssima.forEach(c => centriConDati.add(c.centro_id));
            eventiProssima.forEach(e => centriConDati.add(e.centro_id));
            affittiProssima.forEach(a => centriConDati.add(a.centro_id));

            for (const cid of centriConDati) {
                const nome = centroMap[cid]?.nome || cid;

                const riepilogo = {
                    centro: nome,
                    report: reportsSettimana.filter(x => x.centro_id === cid).map(r => ({
                        data: formatDate(r.data),
                        operatore: r.operatore || 'N/D',
                        furto: r.furto || false,
                        contenuto: (r.contenuto || '').substring(0, 300),
                    })),
                    controlli: manutenzioniSettimana.filter(x => x.centro_id === cid).map(m => ({
                        titolo: m.titolo,
                        descrizione: (m.descrizione || '').substring(0, 200),
                        scadenza: formatDate(m.data_scadenza),
                        stato: m.stato,
                        note: (m.note || '').substring(0, 200),
                    })),
                    ticketAperti: ticketsAperti.filter(x => x.centro_id === cid).map(t => ({
                        numero: t.numero_ticket || '-',
                        operatore: t.operatore || 'N/D',
                        descrizione: (t.descrizione || '').substring(0, 200),
                        tipologia: t.tipologia,
                        stato: t.stato,
                        scadenza: formatDate(t.scadenza),
                        costo_stimato: t.costo_stimato || null,
                    })),
                    ticketChiusi: ticketsChiusiSettimana.filter(x => x.centro_id === cid).map(t => ({
                        numero: t.numero_ticket || '-',
                        operatore: t.operatore || 'N/D',
                        descrizione: (t.descrizione || '').substring(0, 200),
                        costo_stimato: t.costo_stimato || null,
                    })),
                    capex: capexFiltrati.filter(x => x.centro_id === cid).map(c => ({
                        titolo: c.titolo,
                        descrizione: (c.descrizione || '').substring(0, 200),
                        stato: c.stato,
                        costo_previsto: c.costo_previsto || null,
                        costo_effettivo: c.costo_effettivo || null,
                        categoria: c.categoria,
                        data_inizio: c.data_inizio ? formatDate(c.data_inizio) : null,
                    })),
                    pulizie: pulizieSettimana.filter(x => x.centro_id === cid).map(p => ({
                        titolo: p.titolo,
                        stato: p.stato,
                        frequenza: p.frequenza,
                        prossima_scadenza: formatDate(p.prossima_scadenza),
                        fornitore: p.fornitore || 'N/D',
                    })),
                    task: tasksSettimana.filter(x => x.centro_id === cid).map(t => ({
                        titolo: t.titolo,
                        descrizione: (t.descrizione || '').substring(0, 200),
                        stato: t.stato,
                        scadenza: formatDate(t.data_scadenza),
                        priorita: t.priorita,
                        assegnato_a: t.assegnato_a_nome || 'N/D',
                    })),
                    eventi: eventiSettimana.filter(x => x.centro_id === cid).map(e => ({
                        nome_evento: e.nome_evento || 'Senza nome',
                        cliente: clienteMap[e.cliente_id]?.ragione_sociale || 'N/D',
                        data_inizio: formatDate(e.data_inizio),
                        data_fine: formatDate(e.data_fine),
                        prezzo_totale: e.prezzo_totale || null,
                        note: (e.note || '').substring(0, 150),
                    })),
                    affitti: affittiSettimana.filter(x => x.centro_id === cid).map(a => ({
                        cliente: clienteMap[a.cliente_id]?.ragione_sociale || 'N/D',
                        data_inizio: formatDate(a.data_inizio),
                        data_fine: formatDate(a.data_fine),
                        prezzo_totale: a.prezzo_totale || null,
                        materiale_dimostrativo: (a.materiale_dimostrativo || '').substring(0, 150),
                        stato: a.stato,
                        note: (a.note || '').substring(0, 150),
                    })),
                    prossimaSettimana: {
                        controlli: controlliProssima.filter(x => x.centro_id === cid).map(m => ({
                            titolo: m.titolo,
                            scadenza: formatDate(m.data_scadenza),
                            stato: m.stato,
                        })),
                        pulizie: pulizieProssima.filter(x => x.centro_id === cid).map(p => ({
                            titolo: p.titolo,
                            prossima_scadenza: formatDate(p.prossima_scadenza),
                            frequenza: p.frequenza,
                        })),
                        task: tasksProssima.filter(x => x.centro_id === cid).map(t => ({
                            titolo: t.titolo,
                            scadenza: formatDate(t.data_scadenza),
                            priorita: t.priorita,
                        })),
                        ticket: ticketsProssima.filter(x => x.centro_id === cid).map(t => ({
                            numero: t.numero_ticket || '-',
                            descrizione: (t.descrizione || '').substring(0, 150),
                            tipologia: t.tipologia,
                            stato: t.stato,
                            scadenza: formatDate(t.scadenza),
                        })),
                        capex: capexProssima.filter(x => x.centro_id === cid).map(c => ({
                            titolo: c.titolo,
                            data_inizio: formatDate(c.data_inizio),
                            categoria: c.categoria,
                        })),
                        eventi: eventiProssima.filter(x => x.centro_id === cid).map(e => ({
                            nome_evento: e.nome_evento || 'Senza nome',
                            cliente: clienteMap[e.cliente_id]?.ragione_sociale || 'N/D',
                            data_inizio: formatDate(e.data_inizio),
                            data_fine: formatDate(e.data_fine),
                        })),
                        affitti: affittiProssima.filter(x => x.centro_id === cid).map(a => ({
                            cliente: clienteMap[a.cliente_id]?.ragione_sociale || 'N/D',
                            data_inizio: formatDate(a.data_inizio),
                            data_fine: formatDate(a.data_fine),
                            prezzo_totale: a.prezzo_totale || null,
                        })),
                    },
                };
                datiPerCentro.push(riepilogo);
            }

            // Nessun dato, salta
            if (datiPerCentro.length === 0) continue;

            const datiJson = JSON.stringify(datiPerCentro, null, 2);

            const prompt = `Sei un assistente che prepara il briefing del lunedì mattina per una riunione tra la direzione e i direttori di centri commerciali. 
Il briefing ha DUE parti: un CONSUNTIVO della settimana passata e un PREVISIONALE della settimana entrante.

I dati sono in formato JSON. Ogni centro ha i campi per il consuntivo (report, controlli, ticketAperti, ticketChiusi, capex, pulizie, task, eventi, affitti) e un oggetto "prossimaSettimana" con le previsioni (controlli, pulizie, task, ticket, capex, eventi, affitti).

PARTE 1 – CONSUNTIVO (${inizioFormattato} – ${fineFormattato}):
1. 📋 REPORT DELLA SICUREZZA: riassumi il contenuto dei report, evidenzia eventuali furti o situazioni anomale.
2. 🔧 CONTROLLI E MANUTENZIONI: quali controlli erano in scadenza, quali completati, quali ancora da fare.
3. 🎫 TICKET: quanti aperti, quali urgenti, in attesa, chiusi nella settimana (con costi).
4. 📈 CAPEX: stato progetti capex attivi, costi previsti vs effettivi.
5. 🧹 PULIZIE: stato pulizie periodiche, cosa fatto, cosa in scadenza.
6. ✅ TASK: task completati e in scadenza, con priorità.
7. 🎪 EVENTI: eventi in corso nella settimana. Per ciascuno: nome, cliente, date, prezzo.
8. 🏬 NUOVI AFFITTI: nuovi contratti di affitto spazi expo creati o iniziati. Cliente, date, prezzo, materiale.

PARTE 2 – PREVISIONALE (${prossimoInizioFormattato} – ${prossimaFineFormattato}):
Analizza "prossimaSettimana" per ogni centro e sintetizza cosa è previsto:
A. 🔧 Controlli/manutenzioni in scadenza
B. 🧹 Pulizie periodiche in scadenza
C. ✅ Task in scadenza (con priorità)
D. 🎫 Ticket in scadenza
E. 📈 Capex con inizio lavori previsto
F. 🎪 Eventi in corso
G. 🏬 Affitti in partenza

REGOLE:
- NON elencare ogni singolo elemento. Fai una sintesi narrativa, da leggere ad alta voce in riunione.
- Se una sezione non ha dati, scrivi "Nessuna attività da segnalare."
- Evidenzia URGENZE con ⚠️.
- Sii concreto: menziona numeri, costi, date rilevanti.
- Organizza per centro commerciale, con titoli chiari (usa <h2> per centro, <h3> per "Consuntivo" / "Previsionale").
- Massimo 3000 caratteri in totale.

DATI:
${datiJson}

Produci SOLO il corpo in HTML (usa <h2>, <h3>, <p>, <ul>, <li>, <strong>), senza tag <html> o <body>.`;

            const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt,
                model: 'gpt_5_mini',
            });

            const corpoHtml = `
<div style="font-family:Arial,sans-serif;max-width:700px;color:#1f2937;">
  <div style="background:#1e3a5f;color:white;padding:20px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;font-size:22px;">📊 Briefing settimanale</h1>
    <p style="margin:4px 0 0;opacity:0.85;font-size:14px;">${inizioFormattato} → ${fineFormattato}</p>
  </div>
  <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
    ${llmResponse}
  </div>
  <p style="color:#9ca3af;font-size:11px;margin-top:12px;text-align:center;">Mall Pilot – Briefing automatico del lunedì</p>
</div>`.trim();

            await base44.asServiceRole.integrations.Core.SendEmail({
                to: direttore.email,
                subject: `Briefing settimanale ${inizioFormattato} – ${fineFormattato}`,
                body: corpoHtml,
            });
            emailInviate++;
        }

        return Response.json({ success: true, emails_sent: emailInviate, periodo: `${inizio} → ${fine}` });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});