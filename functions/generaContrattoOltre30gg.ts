import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

function numeroInLettere(num) {
  const unita = ['', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove',
    'dieci', 'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove'];
  const decine = ['', '', 'venti', 'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta', 'ottanta', 'novanta'];

  if (num === 0) return 'zero';
  if (num < 0) return 'meno ' + numeroInLettere(-num);

  let risultato = '';
  if (num >= 1000) {
    const migliaia = Math.floor(num / 1000);
    risultato += (migliaia === 1 ? 'mille' : numeroInLettere(migliaia) + 'mila');
    num %= 1000;
  }
  if (num >= 100) {
    const centinaia = Math.floor(num / 100);
    risultato += (centinaia === 1 ? 'cento' : unita[centinaia] + 'cento');
    num %= 100;
  }
  if (num >= 20) {
    const d = Math.floor(num / 10);
    const u = num % 10;
    risultato += (u === 1 || u === 8) ? decine[d].slice(0, -1) + unita[u] : decine[d] + unita[u];
  } else if (num > 0) {
    risultato += unita[num];
  }
  return risultato;
}

function formatEuro(importo) {
  const intero = Math.floor(importo);
  const centesimi = Math.round((importo - intero) * 100);
  const lettere = numeroInLettere(intero);
  const centStr = centesimi > 0 ? `/${String(centesimi).padStart(2, '0')}` : '/00';
  return {
    numerico: importo.toFixed(2).replace('.', ','),
    lettere: `${lettere}${centStr}`
  };
}

function sanitize(str) {
  if (!str) return '';
  return str
    .replace(/à/g, "a'").replace(/À/g, "A'")
    .replace(/è/g, "e'").replace(/È/g, "E'")
    .replace(/é/g, "e'").replace(/É/g, "E'")
    .replace(/ì/g, "i'").replace(/Ì/g, "I'")
    .replace(/í/g, "i'").replace(/Í/g, "I'")
    .replace(/ò/g, "o'").replace(/Ò/g, "O'")
    .replace(/ó/g, "o'").replace(/Ó/g, "O'")
    .replace(/ù/g, "u'").replace(/Ù/g, "U'")
    .replace(/ú/g, "u'").replace(/Ú/g, "U'")
    .replace(/–/g, '-').replace(/—/g, '-')
    .replace(/\u201c/g, '"').replace(/\u201d/g, '"')
    .replace(/\u2018/g, "'").replace(/\u2019/g, "'");
}

function formatData(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Calcola rate mensili tra due date
function calcolaRate(dataInizio, dataFine, prezzoTotale) {
  const start = new Date(dataInizio);
  const end = new Date(dataFine);
  const mesi = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  const rataImporto = prezzoTotale / mesi;
  const rate = [];
  for (let i = 0; i < mesi; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    rate.push(d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }));
  }
  return { rate, rataImporto, mesi };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { prenotazione_id } = await req.json();
    if (!prenotazione_id) return Response.json({ error: 'prenotazione_id richiesto' }, { status: 400 });

    const prenotazioni = await base44.entities.Prenotazione.filter({ id: prenotazione_id });
    const prenotazione = prenotazioni[0];
    if (!prenotazione) return Response.json({ error: 'Prenotazione non trovata' }, { status: 404 });

    const spaziIds = (prenotazione.spazi_ids && prenotazione.spazi_ids.length > 0)
      ? prenotazione.spazi_ids
      : (prenotazione.spazio_id ? [prenotazione.spazio_id] : []);

    if (spaziIds.length === 0) {
      return Response.json({ error: 'Nessuno spazio associato alla prenotazione' }, { status: 400 });
    }

    const [clientiArr, tuttiSpaziArr, centriArr] = await Promise.all([
      base44.entities.Cliente.filter({ id: prenotazione.cliente_id }),
      base44.entities.SpazioExpo.list(),
      base44.entities.CentroCommerciale.filter({ id: prenotazione.centro_id })
    ]);

    const cliente = clientiArr[0];
    const centro = centriArr[0];
    const spaziPrenotati = spaziIds.map(id => tuttiSpaziArr.find(s => s.id === id)).filter(Boolean);
    const spazio = spaziPrenotati[0];

    if (!cliente || spaziPrenotati.length === 0 || !centro) {
      return Response.json({ error: 'Dati mancanti' }, { status: 400 });
    }

    // Superficie totale
    const superficieTotale = spaziPrenotati.reduce((acc, s) => acc + (s.superficie_mq || 0), 0);
    const spaziStr = spaziPrenotati
      .map(s => `N.${s.numero_spazio}${s.superficie_mq ? ' di ' + s.superficie_mq + ' mq' : ''}`)
      .join(' + ');
    const numeroSpaziStr = spaziPrenotati.map(s => `n. ${s.numero_spazio}`).join(' e ');

    // Calcoli economici
    const prezzoNetto = prenotazione.prezzo_totale;
    const iva = Math.round(prezzoNetto * 22) / 100;
    const prezzoTotale = prezzoNetto + iva;
    const prezzoNettoFmt = formatEuro(prezzoNetto);
    const ivaFmt = formatEuro(iva);
    const prezzoTotaleFmt = formatEuro(prezzoTotale);

    // Rate mensili
    const { rate, rataImporto, mesi } = calcolaRate(prenotazione.data_inizio, prenotazione.data_fine, prezzoNetto);
    const rataFmt = formatEuro(rataImporto);
    const rateStr = rate.map((d, i) => `la ${i === 0 ? 'prima rata al' : (i === rate.length - 1 ? 'ultima rata al' : '')} ${d}`).join('; ').replace(/; ;/g, ';');
    // Versione compatta delle rate: "al 01/01/2024; al 01/02/2024; ..."
    const rateDateStr = rate.map((d, i) => (i === 0 ? `la prima rata al ${d}` : `al ${d}`)).join('; ');

    const dataOggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const cittaOggi = centro.citta?.toUpperCase() || '';
    const materiale = prenotazione.materiale_dimostrativo || '';

    // === GENERA PDF ===
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    const lm = 20;
    const rm = 190;
    const pw = rm - lm;
    let y = 20;

    const addLine = (h = 6) => { y += h; };
    const checkPage = (needed = 10) => {
      if (y + needed > 275) { doc.addPage(); y = 20; }
    };
    const text = (str, x, yy, opts = {}) => {
      doc.text(sanitize(str || ''), x, yy, opts);
    };

    // Stampa paragrafo con segmenti bold inline, con word-wrap
    const printMixedParagraph = (segments, lineH = 5.5) => {
      doc.setFontSize(10.5);
      const tokens = [];
      for (const seg of segments) {
        const words = sanitize(seg.text || '').split(' ').filter(w => w !== '');
        for (const word of words) tokens.push({ word, bold: !!seg.bold });
      }
      doc.setFont('helvetica', 'normal');
      const spaceW = doc.getTextWidth(' ');
      let lineTokens = [];
      let lineW = 0;

      const flushLine = (toks) => {
        let cx = lm;
        for (let i = 0; i < toks.length; i++) {
          doc.setFont('helvetica', toks[i].bold ? 'bold' : 'normal');
          doc.text(toks[i].word, cx, y);
          cx += doc.getTextWidth(toks[i].word);
          if (i < toks.length - 1) { doc.setFont('helvetica', 'normal'); cx += spaceW; }
        }
      };

      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        doc.setFont('helvetica', t.bold ? 'bold' : 'normal');
        const ww = doc.getTextWidth(t.word);
        const gap = lineTokens.length > 0 ? spaceW : 0;
        if (lineTokens.length > 0 && lineW + gap + ww > pw) {
          checkPage(lineH + 3);
          flushLine(lineTokens);
          y += lineH;
          lineTokens = [t];
          lineW = ww;
        } else {
          lineW += gap + ww;
          lineTokens.push(t);
        }
      }
      if (lineTokens.length > 0) {
        checkPage(lineH + 3);
        flushLine(lineTokens);
        y += lineH;
      }
      doc.setFont('helvetica', 'normal');
    };

    const printParagraph = (str) => {
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(sanitize(str.replace(/\n/g, ' ')), pw);
      checkPage(lines.length * 5.5 + 3);
      doc.text(lines, lm, y);
      y += lines.length * 5.5;
    };

    doc.setFont('helvetica');

    // --- TITOLO ---
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    text('CONTRATTO DI LOCAZIONE PER ESIGENZE DI NATURA TRANSITORIA', lm + pw / 2, y, { align: 'center' });
    addLine(7);
    doc.setFontSize(11);
    text("ex art. 27, V comma, L. n. 392/78", lm + pw / 2, y, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    addLine(10);

    // --- TRA LE PARTI ---
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    text('Tra le parti', lm, y);
    doc.setFont('helvetica', 'normal');
    addLine(8);

    // Locatrice (fissa)
    const locatriceText = "GESTIONE COMPLESSI COMMERCIALI SRL, con sede in Forli' (FC), via Dei Mercanti n.3, numero di iscrizione presso il Registro delle Imprese di Forli'-Cesena e cod. fisc. e p. IVA 03067290365, qui rappresentata dal Presidente del Consiglio di Amministrazione Dott. Panzavolta Luca, Cod. Fisc. PNZLCU64T30C573L, nato a Cesena (FC) il 30/12/1964 ed ivi residente in Via Romea n. 530, all'uopo debitamente autorizzato, in seguito, per brevita', chiamata \"Locatrice\",";
    printParagraph(locatriceText);
    addLine(5);
    doc.setFont('helvetica', 'bold'); text('e', lm, y); doc.setFont('helvetica', 'normal');
    addLine(8);

    // Conduttrice (dati cliente in grassetto)
    printMixedParagraph([
      { text: cliente.ragione_sociale, bold: true },
      { text: ' con sede in ' },
      { text: `${cliente.citta || ''}${cliente.provincia ? ' (' + cliente.provincia + ')' : ''}${cliente.cap ? ' CAP ' + cliente.cap : ''}`, bold: true },
      { text: ', ' },
      { text: cliente.indirizzo || '', bold: true },
      { text: ', numero di iscrizione presso il Registro delle Imprese' },
      ...(cliente.partita_iva ? [{ text: ' e cod. fisc./ p. IVA ' }, { text: cliente.partita_iva, bold: true }] : []),
      { text: ', qui rappresentata dal Sig./Sig.ra ' },
      { text: cliente.referente_nome || '_______________', bold: true },
      { text: ', in qualita\' di Rappresentante Legale, in seguito, per brevita\', chiamata "Conduttrice",' }
    ]);
    addLine(5);
    text("congiuntamente indicate come le \"Parti,\"", lm, y);
    addLine(10);

    // --- PREMESSO ---
    doc.setFont('helvetica', 'bold');
    text('premesso', lm, y);
    doc.setFont('helvetica', 'normal');
    addLine(8);

    printMixedParagraph([
      { text: 'che la Locatrice ha la disponibilita\' all\'interno del Centro Commerciale ' },
      { text: centro.nome.toUpperCase(), bold: true },
      { text: ' sito in ' },
      { text: `${centro.citta?.toUpperCase() || ''}${centro.indirizzo ? ', ' + centro.indirizzo : ''}`, bold: true },
      { text: ', delle aree nude prospicienti i diversi negozi ivi insediati e costituenti la c.d. galleria del complesso;' }
    ]);
    addLine(4);

    printMixedParagraph([
      { text: '- che la Conduttrice ha chiesto di condurre in locazione l\'area nuda identificata al successivo art. 3, specificando di avere la necessita\' di utilizzarla esclusivamente per il periodo di seguito convenuto ed al fine di svolgervi l\'attivita\' di esposizione di materiale pubblicitario e dimostrativo e presentazione di prodotti e servizi ' },
      ...(materiale ? [{ text: 'a: ' }, { text: materiale, bold: true }] : [{ text: '(materiale dimostrativo da specificare);' }]),
    ]);
    addLine(4);

    printParagraph("- che la convenzione di una durata inferiore ai 6 anni di cui al primo comma dell'art. 27 L. n. 392/78 viene effettuata su espressa e specifica richiesta della Conduttrice per sovvenire alle sue temporanee e transitorie esigenze locative, in ragione di verificare il carattere sperimentale dell'attivita' dalla stessa svolta;");
    addLine(4);

    printParagraph("- che le Parti intendono a tal fine richiamarsi alla facolta' di stipulare il contratto di locazione per periodi piu' brevi, prevista dall'art. 27, V comma L. n. 392/78, ricorrendone la fattispecie ivi prevista, anche alla luce della precisa ed impegnativa dichiarazione resa in tal senso della Conduttrice, dichiarazione la cui verita' viene espressamente garantita dalla Conduttrice stessa e costituisce elemento essenziale e determinante del consenso alla stipula da parte della Locatrice;");
    addLine(6);

    doc.setFont('helvetica', 'bold');
    text("si conviene e si stipula quanto segue", lm, y);
    doc.setFont('helvetica', 'normal');
    addLine(10);

    // --- ARTICOLI ---
    const articoli = [
      {
        titolo: "1 - CONDIZIONE RISOLUTIVA EX ART. 1353 c.c.",
        paragrafi: [
          "La suestesa premessa costituisce parte integrante ed essenziale del presente contratto e la Conduttrice garantisce la corrispondenza al vero di quanto ivi dichiarato, fermo restando che, qualora cio' non risultasse effettivamente veritiero e reale (e, in modo particolare, non risultasse veritiera la dichiarata sussistenza delle esigenze transitorie della Conduttrice), il fatto costituira' condizione risolutiva ex art. 1353 c.c., che opera di diritto, del rapporto di locazione."
        ]
      },
      {
        titolo: "2 - DURATA",
        paragrafi: [
          [
            { text: "La Locatrice concede in locazione alla Conduttrice, che accetta, l'area descritta al successivo art. 3, con inizio a far tempo dal " },
            { text: formatData(prenotazione.data_inizio), bold: true },
            { text: " e termine al " },
            { text: formatData(prenotazione.data_fine), bold: true },
            { text: ", data alla quale il contratto cessera' definitivamente senza necessita' di alcun diniego di rinnovazione in quanto cosi' irrevocabilmente convenuto." }
          ]
        ]
      },
      {
        titolo: "3 - OGGETTO",
        paragrafi: [
          [
            { text: "Il bene concesso in locazione e' costituito dall'area di circa Mq. " },
            { text: superficieTotale > 0 ? superficieTotale.toString() : '___', bold: true },
            { text: " lordi sita all'interno del complesso di cui in premessa individuata con il " },
            { text: numeroSpaziStr, bold: true },
            { text: " nella planimetria allegata al presente contratto che, in tal modo, viene a costituirne parte integrante e sostanziale." }
          ],
          "Detta area fa parte della piu' vasta superficie complessivamente individuata al Catasto Fabbricati."
        ]
      },
      {
        titolo: "4 - DESTINAZIONE",
        paragrafi: [
          "Il bene concesso in locazione potra' essere utilizzato esclusivamente per lo svolgimento dell'attivita' indicata nella suestesa premessa, con espresso divieto alla Conduttrice di modificarne, anche solo parzialmente o temporaneamente, la destinazione.",
          "Si pattuisce espressamente tra le Parti che, nell'area locata, e' vietato l'esercizio, in qualunque forma, della vendita di prodotti e/o servizi."
        ]
      },
      {
        titolo: "5 - UTILIZZO",
        paragrafi: [
          [
            { text: "Sull'area concessa in godimento potranno essere installati e posizionati soltanto i seguenti beni: " },
            ...(materiale ? [{ text: materiale, bold: true }] : [{ text: '(specificare materiale)', bold: true }]),
            { text: " con espressa esclusione di altri, salvo autorizzazione scritta da parte della Locatrice." }
          ],
          "In ogni caso, quanto ivi collocato dovra' essere assolutamente conforme alle vigenti normative (con particolare riferimento a quelle di sicurezza) e non dovra' costituire in alcun modo pericolo per i terzi e/o per l'integrita' del piu' ampio complesso commerciale nel quale e' ricompreso.",
          "L'attivita' svolta sull'area in questione dovra' essere esercitata secondo i migliori standards qualitativi e commerciali, in modo da non sminuire l'immagine del complesso, ed e' facolta' della Locatrice, anche tramite suoi incaricati, vietare modalita' di esercizio che la stessa, a suo insindacabile giudizio, ritenga inopportune, cosi' come e' sua facolta' procedere direttamente alla rimozione di quanto ivi collocato e non ricompreso nell'elenco di cui sopra."
        ]
      },
      {
        titolo: "6 - CORRISPETTIVO",
        paragrafi: [
          [
            { text: "Il corrispettivo e' fissato in Euro " },
            { text: `${prezzoNettoFmt.numerico} (${prezzoNettoFmt.lettere.charAt(0).toUpperCase() + prezzoNettoFmt.lettere.slice(1)}/00)`, bold: true },
            { text: " oltre all'IVA relativa in misura di legge, e' riferito all'intero periodo locativo e comprende il rimborso forfettario dell'allacciamento alla rete elettrica e del consumo di energia e dovra' essere versato in rate pari ad una mensilita' del corrispettivo, da assoggettarsi ad IVA, da versarsi alla Locatrice come segue: " },
            { text: rateDateStr, bold: true },
            { text: " mediante bonifico bancario, a data fissa, sul conto corrente, intestato alla Locatrice stessa, IBAN " },
            { text: centro.iban || '________________________', bold: true },
            { text: "." }
          ],
          "La Locatrice emettera' fattura entro il giorno 5 (cinque) del mese di scadenza di ciascuna rata.",
          "Qualora il corrispettivo non venga versato entro il termine pattuito, la Conduttrice dovra' ritenersi costituita in mora ai sensi dell'art. 1219 n. 3 c.c. senza necessita' di alcuna intimazione o richiesta scritta.",
          "La Conduttrice non potra' in alcun modo ritardare il pagamento del corrispettivo e degli eventuali oneri accessori oltre il predetto termine e non potra' far valere alcuna azione od eccezione se non dopo il pagamento della rata scaduta e dopo aver versato alla Locatrice il corrispettivo convenuto fino alla riconsegna e salvo l'obbligo di risarcire il maggior danno ex art. 1591 c.c.",
          "In caso di ritardo nei versamenti convenuti, la Conduttrice sara' tenuta a corrispondere interessi moratori consensualmente determinati nella misura di due volte il tasso legale via via vigente. Gli stessi decorreranno, senza necessita' di alcuna costituzione in mora, a far tempo dalla data di scadenza del versamento sino al saldo effettivo."
        ]
      },
      {
        titolo: "7 - DEPOSITO CAUZIONALE",
        paragrafi: ["Nulla e' dovuto a titolo di deposito cauzionale."]
      },
      {
        titolo: "8 - ASSICURAZIONE",
        paragrafi: [
          "La Conduttrice si impegna e si obbliga a stipulare, entro e non oltre 15 (quindici) giorni dalla sottoscrizione del presente atto, idonea polizza assicurativa RCT/RCO con primaria compagnia nazionale (la cui efficacia dovra' essere mantenuta sino al termine di trenta giorni successivi alla riconsegna del bene) a favore della Locatrice e di suoi eventuali aventi causa (Proprieta' dell'area, operatori del complesso, Consorzio se esistente, ecc...) contro i rischi di danni di qualsivoglia natura derivanti a terzi o a beni della proprieta' e/o di suoi affittuari, in conseguenza di incendio, esplosione, scoppio, perdita d'acqua, eventi socio-politici, eventi atmosferici, ecc..., riconducibili anche indirettamente alla presenza in loco della Conduttrice e della sua attivita', ivi inclusa l'ipotesi in cui gli stessi siano imputabili a dolo o colpa grave della stessa, con rinuncia dell'assicuratore alla rivalsa nei confronti della Locatrice, della Proprieta', del Consorzio se esistente e dei singoli operatori del complesso.",
          "Il massimale dovra' essere di Euro 2.500.000,00 (duemilionicinquecentomila/00) a primo rischio assoluto vincolato a favore della Locatrice."
        ]
      },
      {
        titolo: "9 - ESONERO DA RESPONSABILITA'",
        paragrafi: [
          "La Conduttrice esonera espressamente la Locatrice da qualsiasi responsabilita' per i danni che dovesse subire nel caso di:",
          "furti e/o atti vandalici;\nfatti dolosi o colposi di terzi;\ninterruzione nell'erogazione di servizi quali: energia elettrica, riscaldamento, condizionamento, ecc....;\nchiusura forzata del complesso.",
          "In tali casi, la Conduttrice rinuncia espressamente a proporre qualsiasi azione risarcitoria nei confronti della Locatrice, fermo restando il suo diritto di procedere nei confronti del diretto responsabile dell'evento lesivo, a condizione che non ne conseguano oneri e/o responsabilita' di qualsivoglia natura nei confronti della Locatrice."
        ]
      },
      {
        titolo: "10 - DIVIETO DI SUBLOCAZIONE O DI CESSIONE DEL PRESENTE CONTRATTO",
        paragrafi: [
          "E' fatto espresso divieto alla Conduttrice di sublocare (o, comunque, concederla a terzi a qualsivoglia titolo) in tutto o in parte, anche solo temporaneamente, l'area concessale in godimento.",
          "Analogamente, le e' fatto espresso divieto di cedere il presente contratto senza l'autorizzazione scritta della Locatrice."
        ]
      },
      {
        titolo: "11 - RICONSEGNA DELL'AREA LOCATA",
        paragrafi: [
          "Si conviene espressamente che, al cessare (per qualsiasi motivo) del presente rapporto di locazione, quanto concesso in godimento dovra' essere immediatamente restituito nella piena e completa disponibilita' della Locatrice, libero da persone e/o cose della Conduttrice ed in perfette condizioni di pulizia e manutenzione.",
          "Non provvedendovi tempestivamente la Conduttrice, questa conferisce sin d'ora mandato irrevocabile alla Locatrice, anche ai sensi e per gli effetti di cui all'art. 1723, II comma, c.c., di provvedervi direttamente mediante suoi incaricati, autorizzandola espressamente a rimuovere quanto ancora dovesse occupare l'area in questione ed a collocarlo in locali adibiti a deposito, il tutto a spese della Conduttrice stessa che sara' tenuta al relativo rimborso a semplice richiesta.",
          "In ogni caso, per l'eventuale protratta occupazione dell'area dopo la cessazione del contratto, la Conduttrice sara' tenuta a corrispondere a titolo di penale (in aggiunta all'indennita' di cui all'art. 1591 c.c.) una somma preventivamente e consensualmente determinata in Euro 100,00 (cento/00) per ciascuno giorno di ritardo."
        ]
      },
      {
        titolo: "12 - IMPEGNI AGGIUNTIVI A CARICO DELLA CONDUTTRICE",
        paragrafi: [
          "La Conduttrice si impegna irrevocabilmente:",
          "a rispettare gli orari di apertura e chiusura del complesso ed il suo Regolamento, che dichiara di aver attentamente letto ed accettato in ogni sua parte, per quanto di sua competenza;",
          "a sospendere temporaneamente il proprio rapporto di locazione dietro semplice richiesta della Locatrice effettuata con un preavviso di sette giorni, qualora questa si trovi nella necessita' di disporre diversamente dell'area in questione. In tal caso, la Conduttrice avra' diritto di recuperare i giorni di sospensione, prorogando per uguale periodo la durata del rapporto. In ogni caso, se richiesta di liberare l'area con il pattuito preavviso non dovesse provvedervi, sara' autorizzata a procedervi direttamente la Locatrice secondo le modalita' di cui al precedente art. 11;",
          "al pagamento delle competenze S.I.A.E., o altro ente equivalente, qualora dovute;",
          "a mantenere in perfetta efficienza i beni di cui all'art. 5 che precede, provvedendo alla necessaria manutenzione interna ed esterna, ed intervenendo immediatamente in caso di rotture, danni, guasti;",
          "a non esporre insegne luminose o scritte pubblicitarie diverse da quelle concordate con il Direttore del complesso e sara' cura della stessa effettuare i pagamenti delle imposte pubblicitarie su cartelli esposti qualora dovute;",
          "ad ottenere e a mantenere attive, a propria cura ed onere, le eventuali autorizzazioni necessarie per l'esercizio dell'attivita' oggetto del presente contratto.",
          "L'allestimento non dovra' superare gli ingombri indicati dalla Direzione del complesso.",
          "La Locatrice e' inoltre legittimata a chiedere a suo insindacabile giudizio, la sostituzione entro cinque giorni dei beni non consoni con l'immagine aziendale o che dovessero risultare non idonei all'uso."
        ]
      },
      {
        titolo: "13 - CLAUSOLA RISOLUTIVA ESPRESSA",
        paragrafi: [
          "Si conviene che costituira' grave inadempimento della Conduttrice e motivo di risoluzione del presente contratto, ai sensi e per gli effetti di quanto previsto dall'art. 1456 c.c.:",
          "la riscontrata mancata corrispondenza al vero della transitorietà delle esigenze locative della Conduttrice;\nla destinazione dell'area ad una attivita' e/o ad un utilizzo differenti rispetto a quelli rispettivamente di cui agli artt. 4 e 5;\nil mancato integrale e puntuale pagamento del corrispettivo di locazione di cui all'art. 6;\nla mancata puntuale consegna della polizza assicurativa di cui all'art. 8;\nla violazione del divieto di cui all'art. 10;\nla violazione anche di uno solo degli obblighi di cui all'art. 12.",
          "La eventuale tolleranza da parte della Locatrice di inadempienze della Conduttrice non comportera' in ogni caso implicita rinuncia delle facolta' e dei diritti alla medesima competenti."
        ]
      },
      {
        titolo: "14 - REGISTRAZIONE-SPESE",
        paragrafi: [
          "Agli effetti fiscali le Parti dichiarano che il presente contratto avente ad oggetto una consistenza immobiliare ad uso strumentale, e' soggetto ad imposizione IVA ed ad imposta proporzionale di registro nella misura dell'uno percento ai sensi dell'art. 35 commi 8 e 10 D.L. 4 luglio 2006 n. 223.",
          "Le imposte e le spese inerenti e conseguenti alla registrazione del contratto nei termini di legge, sono a carico delle Parti nella misura del 50% (cinquanta per cento)."
        ]
      },
      {
        titolo: "15 - RECESSO",
        paragrafi: [
          "In considerazione della peculiarita' dell'attivita' esercitata dalla Conduttrice sull'area qui concessale in godimento e della transitorietà e temporaneità delle esigenze locative, a ciascuna delle Parti viene riconosciuta la facolta' di recedere dal contratto, anche senza necessita' di alcuna motivazione, ma previo preavviso di almeno 15 (quindici) giorni rispetto al giorno in cui il recesso avra' efficacia. La relativa comunicazione dovra' essere inviata mediante lettera raccomandata con avviso di ricevimento."
        ]
      },
      {
        titolo: "16 - RINVIO",
        paragrafi: ["Per quanto qui non previsto, le Parti rinviano alle vigenti disposizioni del codice civile."]
      },
      {
        titolo: "17 - PRIVACY D.Lgs. n. 196 del 30.6.2003",
        paragrafi: ["La Conduttrice dichiara di aver ricevuto le informazioni di cui al D.Lgs. n. 196 del 30.6.2003 e di prestare, con la sottoscrizione del presente contratto, il proprio consenso all'utilizzo dei propri dati."]
      },
      {
        titolo: "18 - MISURE DI CONTENIMENTO E DISTANZIAMENTO SOCIALE A CARICO DELL'UTILIZZATORE",
        paragrafi: [
          "a) Ogni operatore deve gestire autonomamente la distribuzione dei DPI al proprio personale;",
          "b) Eventuali file presso l'area espositiva devono essere gestite autonomamente;",
          "c) Ogni operatore deve gestire la propria comunicazione di servizio e di cortesia da apporre all'ingresso dell'area espositiva;",
          "d) Ogni operatore dovra' prevedere un doppio turno di pulizie ed igienizzazione della propria area espositiva."
        ]
      },
      {
        titolo: "19 - CLAUSOLE FINALI",
        paragrafi: [
          "Ai sensi dell'art.6, comma 3, del Decreto Legislativo 19 agosto 2005 n.192, le Parti dichiarano che l'area oggetto del presente atto fa parte del Centro Commerciale dotato dell'Attestato di Prestazione Energetica regolarmente trasmesso ai competenti organismi regionali e in corso di validita'.",
          "Parte locatrice dichiara di aver gia' consegnato a Parte conduttrice copia dell'Attestato di Prestazione Energetica; la Parte conduttrice da' atto di aver ricevuto le informazioni e la documentazione comprensiva dell'attestato."
        ]
      }
    ];

    for (const art of articoli) {
      checkPage(15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      text(art.titolo, lm, y);
      doc.setFont('helvetica', 'normal');
      addLine(6);

      for (const par of art.paragrafi) {
        checkPage(10);
        if (Array.isArray(par)) {
          printMixedParagraph(par);
        } else {
          printParagraph(par);
        }
        addLine(3);
      }
      addLine(4);
    }

    // --- ALLEGATO ---
    checkPage(10);
    doc.setFont('helvetica', 'bold');
    text('Si allega: Planimetria', lm, y);
    doc.setFont('helvetica', 'normal');
    addLine(8);

    // --- LUOGO E FIRMA ---
    checkPage(30);
    printMixedParagraph([
      { text: `${cittaOggi} (FC), li' ` },
      { text: dataOggi, bold: true }
    ]);
    addLine(12);

    text('LA LOCATRICE', lm, y);
    text('LA CONDUTTRICE', rm - 40, y);
    addLine(15);

    // --- CLAUSOLA ART. 1341 ---
    checkPage(35);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    const clausola1341 = "Ai sensi e per gli effetti di cui all'art. 1341 c.c., per quanto occorrer possa, la Conduttrice dichiara di aver attentamente letto e, pertanto, di approvare specificatamente per iscritto le seguenti clausole:";
    const c1341lines = doc.splitTextToSize(sanitize(clausola1341), pw);
    doc.text(c1341lines, lm, y);
    y += c1341lines.length * 5.5;
    addLine(6);

    const clausoleAppr = [
      "Art.  6 - Corrispettivo;",
      "Art.  9 - Esonero da responsabilita';",
      "Art. 11 - Riconsegna dell'area locata;",
      "Art. 12 - Impegni aggiuntivi a carico della Conduttrice;",
      "Art. 13 - Clausola risolutiva espressa;",
      "Art. 14 - Registrazione-Spese."
    ];
    for (const c of clausoleAppr) {
      checkPage(8);
      text(c, lm + 5, y);
      addLine(6);
    }

    addLine(8);
    text('Letto, approvato e sottoscritto', lm, y);
    addLine(10);
    printMixedParagraph([
      { text: `${cittaOggi} (FC), li' ` },
      { text: dataOggi, bold: true }
    ]);
    addLine(12);
    text('LA CONDUTTRICE', lm, y);

    // Output
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Contratto_${sanitize(cliente.ragione_sociale?.replace(/\s+/g, '_'))}_${prenotazione.data_inizio}.pdf"`
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});