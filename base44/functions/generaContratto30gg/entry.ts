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
    .replace(/à/g, 'a\'').replace(/À/g, 'A\'')
    .replace(/è/g, 'e\'').replace(/È/g, 'E\'')
    .replace(/é/g, 'e\'').replace(/É/g, 'E\'')
    .replace(/ì/g, 'i\'').replace(/Ì/g, 'I\'')
    .replace(/í/g, 'i\'').replace(/Í/g, 'I\'')
    .replace(/ò/g, 'o\'').replace(/Ò/g, 'O\'')
    .replace(/ó/g, 'o\'').replace(/Ó/g, 'O\'')
    .replace(/ù/g, 'u\'').replace(/Ù/g, 'U\'')
    .replace(/ú/g, 'u\'').replace(/Ú/g, 'U\'')
    .replace(/–/g, '-').replace(/—/g, '-')
    .replace(/"/g, '"').replace(/"/g, '"')
    .replace(/'/g, '\'').replace(/'/g, '\'')
    .replace(/[^\x00-\x7F]/g, '');
}

function formatData(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { prenotazione_id } = await req.json();
    if (!prenotazione_id) return Response.json({ error: 'prenotazione_id richiesto' }, { status: 400 });

    // Carica dati
    const prenotazioni = await base44.entities.Prenotazione.filter({ id: prenotazione_id });
    const prenotazione = prenotazioni[0];
    if (!prenotazione) return Response.json({ error: 'Prenotazione non trovata' }, { status: 404 });

    // Determina gli ID degli spazi (supporta spazi_ids multipli o il vecchio spazio_id)
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
    // Filtra solo gli spazi della prenotazione, nell'ordine corretto
    const spaziPrenotati = spaziIds.map(id => tuttiSpaziArr.find(s => s.id === id)).filter(Boolean);
    const spazio = spaziPrenotati[0]; // spazio principale (per compatibilità)

    if (!cliente || spaziPrenotati.length === 0 || !centro) {
      return Response.json({ error: 'Dati mancanti' }, { status: 400 });
    }

    // Stringa descrittiva degli spazi: "N.2 di 25 mq + N.1 di 25 mq"
    const spaziStr = spaziPrenotati
      .map(s => `N.${s.numero_spazio}${s.superficie_mq ? ' di ' + s.superficie_mq + ' mq' : ''}`)
      .join(' + ');

    // Calcoli economici
    const prezzoNetto = prenotazione.prezzo_totale;
    const iva = Math.round(prezzoNetto * 22) / 100;
    const prezzoTotale = prezzoNetto + iva;

    const prezzoNettoFmt = formatEuro(prezzoNetto);
    const ivaFmt = formatEuro(iva);
    const prezzoTotaleFmt = formatEuro(prezzoTotale);

    const dataOggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const cittaOggi = centro.citta?.toUpperCase() || '';

    // === GENERA PDF ===
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    const lm = 20; // left margin
    const rm = 190; // right margin
    const pw = rm - lm; // page width
    let y = 20;

    const addLine = (h = 6) => { y += h; };

    const checkPage = (needed = 10) => {
      if (y + needed > 275) {
        doc.addPage();
        y = 20;
      }
    };

    const text = (str, x, yy, opts = {}) => {
      doc.text(sanitize(str || ''), x, yy, opts);
    };

    // Stampa una riga mista con segmenti [{text, bold}], restituisce la larghezza totale usata
    // Usata per evidenziare i valori variabili in grassetto inline
    const textMixed = (segments, x, yy, fontSize = 10.5) => {
      doc.setFontSize(fontSize);
      let cx = x;
      for (const seg of segments) {
        doc.setFont('helvetica', seg.bold ? 'bold' : 'normal');
        const str = sanitize(seg.text || '');
        doc.text(str, cx, yy);
        cx += doc.getTextWidth(str);
      }
      doc.setFont('helvetica', 'normal');
    };

    // Stampa paragrafo con segmenti bold inline, con word-wrap
    const textMixedWrapped = (segments, x, yy, maxW, lineH = 5.5) => {
      // Costruisce una lista di token {word, bold, space}
      const tokens = [];
      for (const seg of segments) {
        const words = sanitize(seg.text || '').split(' ');
        for (let i = 0; i < words.length; i++) {
          tokens.push({ word: words[i], bold: !!seg.bold, space: i < words.length - 1 });
        }
      }
      doc.setFontSize(10.5);
      let lineTokens = [];
      let lineW = 0;
      const spaceW = doc.setFont('helvetica', 'normal') && doc.getTextWidth(' ');

      const flushLine = (toks, ly) => {
        let cx = x;
        for (let i = 0; i < toks.length; i++) {
          const t = toks[i];
          doc.setFont('helvetica', t.bold ? 'bold' : 'normal');
          doc.text(t.word, cx, ly);
          cx += doc.getTextWidth(t.word);
          if (i < toks.length - 1) cx += doc.setFont('helvetica', 'normal') && doc.getTextWidth(' ');
        }
      };

      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        doc.setFont('helvetica', t.bold ? 'bold' : 'normal');
        const ww = doc.getTextWidth(t.word);
        const needSpace = lineTokens.length > 0 ? doc.setFont('helvetica','normal') && doc.getTextWidth(' ') : 0;
        if (lineTokens.length > 0 && lineW + needSpace + ww > maxW) {
          flushLine(lineTokens, yy);
          yy += lineH;
          lineTokens = [t];
          lineW = ww;
        } else {
          if (lineTokens.length > 0) lineW += doc.setFont('helvetica','normal') && doc.getTextWidth(' ');
          lineTokens.push(t);
          lineW += ww;
        }
      }
      if (lineTokens.length > 0) flushLine(lineTokens, yy);
      // conta le righe usate
      doc.setFont('helvetica', 'normal');
      return yy;
    };

    // Font
    doc.setFont('helvetica');

    // --- INTESTAZIONE CLIENTE (mittente) ---
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    text(cliente.ragione_sociale, lm, y);
    doc.setFont('helvetica', 'normal');
    addLine(6);
    text(cliente.indirizzo || '', lm, y);
    addLine(6);
    text(`${cliente.cap || ''} ${cliente.citta || ''}${cliente.provincia ? ' (' + cliente.provincia + ')' : ''}`, lm, y);
    addLine(6);
    if (cliente.partita_iva) { text(`P.IVA ${cliente.partita_iva}`, lm, y); addLine(6); }
    if (cliente.pec) { text(`PEC: ${cliente.pec}`, lm, y); addLine(6); }

    addLine(8);

    // --- DATA E DESTINATARIO (a destra) ---
    doc.setFontSize(11);
    text(`${cittaOggi}, lì ${dataOggi}`, rm, y, { align: 'right' });
    addLine(8);
    doc.setFont('helvetica', 'bold');
    text('Spettabile', rm - 60, y);
    addLine(6);
    text('GESTIONE COMPLESSI COMMERCIALI', rm - 60, y);
    doc.setFont('helvetica', 'normal');
    addLine(6);
    text('VIA DEI MERCANTI 3', rm - 60, y);
    addLine(6);
    text("47122 FORLI' (FC)", rm - 60, y);
    addLine(10);

    // --- OGGETTO ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    text('Oggetto: richiesta di autorizzazione all\'utilizzo promiscuo di una porzione', lm, y);
    addLine(6);
    text('              di parti comuni e dei relativi servizi accessori', lm, y);
    addLine(6);
    text('              Proposta contrattuale', lm, y);
    doc.setFont('helvetica', 'normal');
    addLine(10);

    // --- TESTO INTRODUTTIVO ---
    doc.setFontSize(10.5);
    const introLines = doc.splitTextToSize(
      sanitize(`Facendo seguito ai colloqui intercorsi e premesso che avete la disponibilita' e la gestione di spazi e servizi comuni siti all'interno della "galleria" del Centro Commerciale ${centro.nome.toUpperCase()} posto in ${centro.citta?.toUpperCase() || ''} ${centro.indirizzo ? centro.indirizzo : ''}, siamo con la presente a chiederVi l'autorizzazione ad esporre il seguente materiale pubblicitario e dimostrativo nella galleria del Centro Commerciale nella posizione ${spaziStr}, indicati nella planimetria in allegato sub A, alle seguenti`),
      pw
    );
    doc.text(introLines, lm, y);
    y += introLines.length * 5.5;
    addLine(4);
    doc.setFont('helvetica', 'bold');
    text('condizioni', lm, y);
    doc.setFont('helvetica', 'normal');
    addLine(10);

    // Helper: stampa paragrafo con segmenti {text, bold}, con word-wrap manuale
    const printMixedParagraph = (segments, lineH = 5.5) => {
      doc.setFontSize(10.5);
      // Tokenizza in parole mantenendo il flag bold
      const tokens = [];
      for (const seg of segments) {
        const words = sanitize(seg.text || '').split(' ').filter(w => w !== '');
        for (const word of words) {
          tokens.push({ word, bold: !!seg.bold });
        }
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
          if (i < toks.length - 1) { doc.setFont('helvetica','normal'); cx += spaceW; }
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

    // Helper: stampa testo semplice (normale) con wrap
    const printParagraph = (str) => {
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(sanitize(str.replace(/\n/g, ' ')), pw);
      checkPage(lines.length * 5.5 + 3);
      doc.text(lines, lm, y);
      y += lines.length * 5.5;
    };

    // Struttura articoli: array di {titolo, paragrafi}
    // Ogni paragrafo è: string (testo normale) oppure array di segmenti [{text, bold}] (misto)
    const materiale = prenotazione.materiale_dimostrativo || '';
    const articoli = [
      {
        titolo: '1) Oggetto.',
        paragrafi: [
          [
            { text: "GESTIONE COMPLESSI COMMERCIALI autorizza l'utilizzatore ad esporre il seguente materiale pubblicitario e dimostrativo nella galleria del Centro Commerciale nella posizione " },
            { text: spaziStr, bold: true },
            { text: ", indicati nella planimetria in allegato sub A" },
            ...(materiale ? [{ text: ': ' }, { text: materiale, bold: true }] : []),
            { text: "." }
          ],
          "In conseguenza fattuale di tale autorizzazione, l'utilizzatore potra' usufruire dei servizi di allacciamento all'impianto di corrente elettrica, riscaldamento/condizionamento, illuminazione, vigilanza esterna, pulizia.",
          "GESTIONE COMPLESSI COMMERCIALI si rende disponibile a fornire (a semplice richiesta dell'utilizzatore e senza alcun incremento del corrispettivo di cui all'art. 4, poiche' in esso il relativo costo e' gia' ricompreso) ulteriori servizi quali: consulenza per il miglior allestimento dell'area espositiva onde fare in modo che lo stesso sia conforme e coerente con l'immagine del Centro, informazioni in ordine all'attivita' promo-pubblicitaria del Centro stesso, alle relative iniziative, agli orari ed ai giorni di maggiore affluenza di persone all'interno del Centro."
        ]
      },
      {
        titolo: '2) Uso.',
        paragrafi: [
          "L'oggetto del contratto non contempla per l'utilizzatore alcuna possibilita' di utilizzo in via esclusiva della porzione di parti comuni temporaneamente assegnata, che potra' inoltre essere alternata - a discrezione della Concedente - con altra porzione di parti comuni.",
          "L'oggetto del contratto consente all'utilizzatore solo lo svolgimento di attivita' promozionale volta ad incrementare le vendite dei propri prodotti, con espressa esclusione della vendita diretta alla clientela.",
          "La violazione dei suddetti divieti costituira' grave inadempimento e motivo di risoluzione ex art. 1456 c.c. del rapporto."
        ]
      },
      {
        titolo: '3) Durata.',
        paragrafi: [
          [
            { text: "Il presente contratto avra' durata dal " },
            { text: formatData(prenotazione.data_inizio), bold: true },
            { text: " al " },
            { text: formatData(prenotazione.data_fine), bold: true },
            { text: "." }
          ],
          "Entro e non oltre la scadenza suindicata, il materiale espositivo dovra' essere completamente rimosso ed asportato a cure e spese dell'utilizzatore. Per ogni giorno di ritardo nella liberazione rispetto al termine suindicato, l'utilizzatore si obbliga a pagare una penale consensualmente convenuta nella misura di Euro 100,00 (euro cento/00) per ciascun giorno di ritardo."
        ]
      },
      {
        titolo: '4) Corrispettivo.',
        paragrafi: [
          [
            { text: "Il corrispettivo per le prestazioni di cui al precedente articolo 1) e per l'intera durata, viene stabilito in Euro " },
            { text: `${prezzoNettoFmt.numerico} (Euro ${prezzoNettoFmt.lettere})`, bold: true },
            { text: " piu' IVA (Euro " },
            { text: ivaFmt.numerico, bold: true },
            { text: ") per un importo totale pari ad Euro " },
            { text: `${prezzoTotaleFmt.numerico} (Euro ${prezzoTotaleFmt.lettere})`, bold: true },
            { text: " e dovra' essere corrisposto anticipatamente, con rimessa diretta al momento della sottoscrizione del presente atto, sul conto corrente bancario con IBAN " },
            { text: centro.iban || '________________________', bold: true },
            { text: "." }
          ]
        ]
      },
      {
        titolo: '5) Allestimento.',
        paragrafi: [
          "L'utilizzatore si obbliga a presentare almeno una settimana prima dell'inizio dell'esposizione al Direttore del Centro Commerciale il progetto di allestimento delle attrezzature e del materiale espositivo.",
          "L'allestimento non dovra' superare gli ingombri previsti in planimetria e non dovra' superare l'altezza massima di mt.",
          "Nel rispetto della buona immagine del Centro Commerciale, l'utilizzatore si obbliga a predisporre l'allestimento utilizzando moquettes o pedane, a non diffondere comunicazioni scritte a mano e volantinaggio, a non esporre insegne luminose o scritte pubblicitarie diverse da quelle concordate con il Direttore del Centro Commerciale, ad effettuare i pagamenti delle imposte pubblicitarie sui cartelli esposti qualora dovute.",
          "E' fatto divieto all'utilizzatore di apportare modifiche, innovazioni e trasformazioni al progetto di allestimento presentato ed approvato, senza il consenso scritto della parte concedente espresso per il tramite della persona del Direttore del Centro Commerciale.",
          "Se l'allestimento non corrisponders' a quanto autorizzato dal Direttore del Centro Commerciale, la parte concedente avra' il diritto di risolvere ex art. 1456 c.c. il presente contratto ed il corrispettivo pattuito sara' trattenuto a titolo di penale.",
          "L'utilizzatore si impegna irrevocabilmente a sospendere temporaneamente il proprio rapporto di locazione dietro semplice richiesta della Direzione effettuata con un preavviso di sette giorni, qualora questa si trovi nella necessita' di disporre diversamente dell'area in questione. In tal caso l'utilizzatore avra' diritto di recuperare i giorni di sospensione, prorogando per uguale periodo la durata del rapporto."
        ]
      },
      {
        titolo: '6) Spese.',
        paragrafi: [
          "Ad esclusione dei servizi accessori previsti all'articolo 1, tutte le spese inerenti e conseguenti all'esposizione saranno ad esclusivo carico dell'utilizzatore, ivi comprese quelle dell'eventuale personale impiegato, che l'utilizzatore dichiara di aver regolarmente assunto, amministrato e retribuito.",
          "Tutti gli oneri ed autorizzazioni richieste dalle normative vigenti relativamente all'esposizione (quali ad es. assicurazioni, tasse per la pubblicita', affissioni, ecc.) sono ad esclusivo carico dell'utilizzatore, il quale dichiara di esonerare e si obbliga a manlevare la parte concedente da qualsiasi responsabilita' al riguardo."
        ]
      },
      {
        titolo: '7) Esonero - Assicurazione.',
        paragrafi: [
          "L'utilizzatore dichiara di esonerare GESTIONE COMPLESSI COMMERCIALI da qualsiasi responsabilita' per danni di qualsivoglia genere arrecati alla merce/attrezzature esposte e/o per impossibilita' dell'utilizzatore di utilizzare i servizi accessori di cui all'articolo 1.",
          "Tuttavia, se dovessero sussistere gravi responsabilita' della concedente, l'eventuale risarcimento sara' ricompreso in una cifra contenuta entro il corrispettivo fissato all'articolo 4, dedotta la parte di corrispettivo per i giorni di esposizione e godimento dei servizi accessori trascorsi regolarmente prima e dopo il verificarsi dell'evento dannoso.",
          "E' impegno e onere dell'utilizzatore sottoscrivere e mantenere attiva per la durata del presente contratto, con primaria compagnia, una polizza assicurativa RCT/RCO con massimale unico minimo di Euro 2.500.000,00 (duemilionicinquecentomila/00), con estensione ai danni a cose di terzi a seguito di incendio, esplosione o scoppio di cose dell'assicurato o da lui detenute e polizza incendio pari al valore a nuovo o di rimpiazzo, a garanzia delle attrezzature, dell'arredo e della merce di proprieta' della concedente.",
          "Durante il periodo di allestimento l'utilizzatore si obbliga ad essere munito di estintore.",
          "La polizza conterra' inoltre espressamente la rinuncia dell'assicuratore alla rivalsa verso la concedente, la Proprieta' ed i singoli Operatori del Centro."
        ]
      },
      {
        titolo: '8) Regolamento Interno.',
        paragrafi: [
          "L'utilizzatore si obbliga a rispettare puntualmente gli orari di apertura e di chiusura del Centro, cosi' come determinati nel Regolamento Interno del Centro, ed ogni altra prescrizione contenuta nel Regolamento stesso, che dichiara di avere ricevuto in copia, di avere attentamente letto ed accettato in ogni sua parte per quanto di sua competenza."
        ]
      },
      {
        titolo: "9) Misure di contenimento e distanziamento sociale a carico dell'utilizzatore",
        paragrafi: [
          "a) Ogni operatore deve gestire autonomamente la distribuzione dei DPI al proprio personale;",
          "b) Eventuali file presso l'area espositiva devono essere gestite autonomamente;",
          "c) Ogni operatore deve gestire la propria comunicazione di servizio e di cortesia da apporre all'ingresso dell'area espositiva;",
          "d) Ogni operatore dovra' prevedere un doppio turno di pulizie ed igienizzazione della propria area espositiva."
        ]
      },
      {
        titolo: '10) Clausola risolutiva espressa.',
        paragrafi: [
          "Viene espressamente convenuto che il verificarsi anche di uno solo dei comportamenti e/o delle circostanze di seguito descritte costituira' grave inadempimento e motivo di risoluzione del rapporto ai sensi e per gli effetti di cui all'art. 1456 c.c.:",
          "violazione del disposto di cui all'art. 2 (esclusiva e destinazione d'uso)",
          "modifiche al progetto di allestimento autorizzato, non consentite per iscritto (art. 5).",
          "Nel caso in cui si verifichi una delle situazioni previste nel presente atto come inadempimento sanzionato con la clausola risolutiva espressa, e, comunque, alla cessazione del pattuito termine di cui all'art. 3, l'utilizzatore dovra' rimuovere tutto il materiale espositivo, dimostrativo e/o di arredo collocato nella porzione indicata nell'allegata planimetria sub A), entro e non oltre due giorni dal ricevimento della raccomandata contenente la dichiarazione della parte concedente di avvalersi della clausola risolutiva espressa.",
          "Trascorso il termine di due giorni dal ricevimento della raccomandata o trascorso il termine di durata indicato all'art. 3, senza che l'utilizzatore abbia provveduto a rimuovere il materiale espositivo, quest'ultimo presta sin d'ora il proprio consenso ed autorizzazione alla parte concedente (alla quale da' mandato irrevocabile ex art. 1723, II comma, c.c. al riguardo) a provvedervi direttamente mediante suoi incaricati, autorizzandola a rimuovere quanto ancora dovesse occupare gli spazi comuni ed a collocarlo in locali adibiti a deposito, il tutto a spese dell'utilizzatore. Decorsi ulteriori trenta giorni dalla rimozione senza che il materiale venga ritirato dall'utilizzatore, GESTIONE COMPLESSI COMMERCIALI e' sin d'ora autorizzata a smaltirlo presso una pubblica discarica."
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
    checkPage(15);
    doc.setFont('helvetica', 'bold');
    text('Allegato A: planimetria', lm, y);
    doc.setFont('helvetica', 'normal');
    addLine(10);

    // --- CLAUSOLA SPECIFICA ---
    checkPage(20);
    const clausolaLines = doc.splitTextToSize(
      sanitize('Ai sensi e per gli effetti degli artt.1341 e 1342 del Cod.Civile (se ed in quanto applicabili alla presente fattispecie), dichiariamo di accettare specificatamente gli articoli: art. 2 (Uso), art. 3 (Durata e penale), art. 5 (Allestimento), art. 7 (Esonero-Assicurazione), art. 10 (Clausola risolutiva espressa).'),
      pw
    );
    doc.text(clausolaLines, lm, y);
    y += clausolaLines.length * 5.5;
    addLine(8);

    // --- TESTO FINALE ---
    checkPage(30);
    const finaleLines = doc.splitTextToSize(
      sanitize("La sua stessa proposta rimarra' ferma ed irrevocabile per il termine di quindici giorni dal ricevimento della presente da parte Vostra; decorso tale termine senza che ci pervenga la Vostra formale accettazione, la stessa sara' ritenuta automaticamente revocata.\n\nCostituira' accettazione della presente proposta anche il ritiro dell'assegno da parte di persona autorizzata o comunque l'incasso del corrispettivo di cui alla clausola 4, salvo che, qualora il pagamento sia effettuato con disposizione di bonifico bancario, la somma accreditata ci venga restituita nel termine di 8 (otto) giorni dall'accredito stesso."),
      pw
    );
    doc.text(finaleLines, lm, y);
    y += finaleLines.length * 5.5;
    addLine(15);

    // --- FIRMA ---
    checkPage(25);
    text('_________________________', lm, y);
    addLine(6);
    text('(Timbro e firma)', lm, y);

    // --- PAGINA PLANIMETRIA ---
    if (centro.piantina_url) {
      try {
        const imgResp = await fetch(centro.piantina_url, { redirect: 'follow' });
        const imgBuffer = await imgResp.arrayBuffer();
        const finalUrl = imgResp.url || centro.piantina_url;
        const fmt = finalUrl.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
        const mimeType = fmt === 'PNG' ? 'image/png' : 'image/jpeg';

        const base64str = Buffer.from(imgBuffer).toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64str}`;

        doc.addPage();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('PLANIMETRIA', 105, 20, { align: 'center' });
        doc.addImage(dataUrl, fmt, 20, 30, 170, 230);
      } catch (e) {
        doc.addPage();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('PLANIMETRIA', 105, 20, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.text('(Planimetria non disponibile)', 105, 140, { align: 'center' });
      }
    }

    // Output
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Contratto_${cliente.ragione_sociale?.replace(/\s+/g, '_')}_${spazio.numero_spazio}_${prenotazione.data_inizio}.pdf"`
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});