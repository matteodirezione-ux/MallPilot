import { jsPDF } from 'npm:jspdf@4.0.0';

export function numeroInLettere(num) {
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

export function formatEuro(importo) {
  const intero = Math.floor(importo);
  const centesimi = Math.round((importo - intero) * 100);
  const lettere = numeroInLettere(intero);
  const centStr = centesimi > 0 ? `/${String(centesimi).padStart(2, '0')}` : '/00';
  return { numerico: importo.toFixed(2).replace('.', ','), lettere: `${lettere}${centStr}` };
}

export function sanitize(str) {
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
    .replace(/\u2018/g, "'").replace(/\u2019/g, "'")
    .replace(/[^\x00-\x7F]/g, '');
}

export function formatData(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function calcolaRate(dataInizio, dataFine, prezzoTotale) {
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

// === PDF RENDERER ===
export function renderPDF(blocchi, filename) {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const lm = 20, rm = 190, pw = rm - lm;
  let y = 20;

  const checkPage = (needed = 10) => {
    if (y + needed > 275) { doc.addPage(); y = 20; }
  };

  const printParagraph = (str, indent = 0) => {
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(sanitize(str.replace(/\n/g, ' ')), pw - indent);
    checkPage(lines.length * 5.5 + 3);
    doc.text(lines, lm + indent, y);
    y += lines.length * 5.5;
  };

  const printMixedParagraph = (segments, indent = 0) => {
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
    const maxX = pw - indent;

    const flushLine = (toks) => {
      let cx = lm + indent;
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
      if (lineTokens.length > 0 && lineW + gap + ww > maxX) {
        checkPage(8);
        flushLine(lineTokens);
        y += 5.5;
        lineTokens = [t];
        lineW = ww;
      } else {
        lineW += gap + ww;
        lineTokens.push(t);
      }
    }
    if (lineTokens.length > 0) {
      checkPage(8);
      flushLine(lineTokens);
      y += 5.5;
    }
    doc.setFont('helvetica', 'normal');
  };

  for (const block of blocchi) {
    switch (block.type) {
      case 'paragraph': {
        checkPage(10);
        const size = block.size || 10.5;
        const indent = block.indent || 0;
        doc.setFontSize(size);
        doc.setFont('helvetica', block.bold ? 'bold' : 'normal');
        if (block.align === 'right') {
          const lines = doc.splitTextToSize(sanitize(block.text), pw);
          checkPage(lines.length * 5.5 + 3);
          doc.text(lines, rm, y, { align: 'right' });
          y += lines.length * 5.5;
        } else if (block.align === 'center') {
          const lines = doc.splitTextToSize(sanitize(block.text), pw);
          checkPage(lines.length * 5.5 + 3);
          doc.text(lines, lm + pw / 2, y, { align: 'center' });
          y += lines.length * 5.5;
        } else {
          printParagraph(block.text, indent);
        }
        break;
      }
      case 'mixed': {
        checkPage(10);
        printMixedParagraph(block.segments, block.indent || 0);
        break;
      }
      case 'article': {
        checkPage(15);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text(sanitize(block.titolo), lm, y);
        doc.setFont('helvetica', 'normal');
        y += 6;
        for (const par of block.paragrafi) {
          checkPage(10);
          if (Array.isArray(par)) {
            printMixedParagraph(par);
          } else {
            printParagraph(par);
          }
          y += 3;
        }
        y += 4;
        break;
      }
      case 'spacer':
        y += block.h || 6;
        break;
      case 'pagebreak':
        doc.addPage();
        y = 20;
        break;
      case 'list':
        for (const item of block.items) {
          checkPage(8);
          printParagraph(item, block.indent || 5);
        }
        break;
      case 'twoCol':
        checkPage(10);
        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'normal');
        doc.text(sanitize(block.left), lm, y);
        doc.text(sanitize(block.right), rm, y, { align: 'right' });
        y += 6;
        break;
    }
  }

  const pdfBytes = doc.output('arraybuffer');
  return new Response(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${sanitize(filename)}.pdf"`
    }
  });
}

// === WORD (HTML) RENDERER ===
export function renderWord(blocchi, filename) {
  const esc = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const segToHtml = (segs) => segs.map(s => s.bold ? `<b>${esc(s.text)}</b>` : esc(s.text)).join('');

  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><style>
body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; margin: 2cm 2.5cm; }
p { margin: 0 0 4pt 0; }
.r { text-align: right; }
.c { text-align: center; }
table { width: 100%; border-collapse: collapse; }
td { vertical-align: top; padding: 0; }
</style></head><body>`;

  for (const block of blocchi) {
    switch (block.type) {
      case 'paragraph': {
        const cls = block.align === 'right' ? ' class="r"' : block.align === 'center' ? ' class="c"' : '';
        const style = block.indent ? ` style="margin-left: ${Math.round(block.indent * 2.83)}pt"` : '';
        const bold = block.bold ? '<b>' : '';
        const boldEnd = block.bold ? '</b>' : '';
        html += `<p${cls}${style}>${bold}${esc(block.text)}${boldEnd}</p>`;
        break;
      }
      case 'mixed': {
        const cls = block.align === 'right' ? ' class="r"' : block.align === 'center' ? ' class="c"' : '';
        const style = block.indent ? ` style="margin-left: ${Math.round(block.indent * 2.83)}pt"` : '';
        html += `<p${cls}${style}>${segToHtml(block.segments)}</p>`;
        break;
      }
      case 'article': {
        html += `<p><b>${esc(block.titolo)}</b></p>`;
        for (const par of block.paragrafi) {
          if (Array.isArray(par)) {
            html += `<p>${segToHtml(par)}</p>`;
          } else {
            html += `<p>${esc(par)}</p>`;
          }
        }
        html += `<p>&nbsp;</p>`;
        break;
      }
      case 'spacer':
        html += `<p style="margin-bottom: ${block.h || 6}pt">&nbsp;</p>`;
        break;
      case 'pagebreak':
        html += `<br clear="all" style="page-break-before:always">`;
        break;
      case 'list':
        for (const item of block.items) {
          html += `<p style="margin-left: ${Math.round((block.indent || 5) * 2.83)}pt">${esc(item)}</p>`;
        }
        break;
      case 'twoCol':
        html += `<table><tr><td>${esc(block.left)}</td><td style="text-align: right">${esc(block.right)}</td></tr></table>`;
        break;
    }
  }

  html += `</body></html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'application/msword',
      'Content-Disposition': `attachment; filename="${filename}.doc"`
    }
  });
}