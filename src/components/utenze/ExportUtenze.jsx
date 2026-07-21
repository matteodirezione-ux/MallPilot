import { format } from 'date-fns';
import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const MESI_LABEL = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

const TIPI = [
  { key: 'acqua',        label: 'Acqua',        unit: 'm³',  direct: false, color: '3b82f6', headerBg: '1D4ED8' },
  { key: 'energia',      label: 'Energia',      unit: 'kWh', direct: true,  color: '9333ea', headerBg: '6D28D9' },
  { key: 'gas',          label: 'Gas',          unit: 'm³',  direct: false,  color: 'ea580c', headerBg: 'C2410C' },
  { key: 'fotovoltaico', label: 'Fotovoltaico', unit: 'kWh', direct: true,  color: 'eab308', headerBg: 'A16207' },
];

const principali = (list) => list.filter(c => !c.contatore_padre_id);

const consMese = (contatori, idx, direct) => {
  let tot = 0, has = false;
  principali(contatori).forEach(c => {
    let v = null;
    if (direct) { v = c[MESI[idx]]; }
    else {
      const val = c[MESI[idx]], prev = idx === 0 ? c.lettura_iniziale : c[MESI[idx - 1]];
      if (val != null && prev != null) v = val - prev;
    }
    if (v != null) { tot += v; has = true; }
  });
  return has ? tot : null;
};

const costoMese = (contatori, idx) => {
  let tot = 0, has = false;
  principali(contatori).forEach(c => {
    const v = c['costo_' + MESI[idx]];
    if (v != null) { tot += v; has = true; }
  });
  return has ? tot : null;
};

const unitCostMese = (contatori, idx, direct) => {
  let sum = 0, count = 0;
  principali(contatori).forEach(c => {
    const costo = c['costo_' + MESI[idx]], cons = consMese([c], idx, direct);
    if (costo != null && cons != null && cons !== 0) { sum += costo / cons; count++; }
  });
  return count > 0 ? sum / count : null;
};

const pct = (c, p) => (c == null || p == null || p === 0) ? null : ((c - p) / p) * 100;

export default function ExportUtenze({ centroSelezionato, anno, contatoriAnno, contatoriPrev, mode, tempsCurr, tempsPrev }) {
  const nomeCentro = centroSelezionato?.nome?.toUpperCase() || 'CENTRO';
  const modeLabel = mode === 'consumi' ? 'CONSUMI' : mode === 'costi' ? 'COSTI' : 'COSTO UNITARIO';

  const getRow = (tipo, i) => {
    const curr = contatoriAnno.filter(c => c.tipo === tipo.key);
    const prev = contatoriPrev.filter(c => c.tipo === tipo.key);
    let c, p;
    if (mode === 'consumi') { c = consMese(curr, i, tipo.direct); p = consMese(prev, i, tipo.direct); }
    else if (mode === 'costi') { c = costoMese(curr, i); p = costoMese(prev, i); }
    else { c = unitCostMese(curr, i, tipo.direct); p = unitCostMese(prev, i, tipo.direct); }
    const delta = pct(c, p);
    const tc = tempsCurr?.[i], tp = tempsPrev?.[i];
    return { c, p, delta, tc, tp, deltaTemp: tc != null && tp != null ? tc - tp : null };
  };

  const fmtVal = (v, tipo) => {
    if (v == null) return '—';
    if (mode === 'consumi') return v.toLocaleString('it-IT', { maximumFractionDigits: 0 }) + ' ' + tipo.unit;
    if (mode === 'costi') return '€ ' + v.toLocaleString('it-IT', { maximumFractionDigits: 2 });
    return '€ ' + v.toLocaleString('it-IT', { minimumFractionDigits: 3, maximumFractionDigits: 4 }) + '/' + tipo.unit;
  };

  // ── EXCEL ────────────────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    const nomeFile = `${nomeCentro}_UTENZE_${modeLabel}_${anno}`;
    const border = { top: { style: 'thin', color: { rgb: '94A3B8' } }, bottom: { style: 'thin', color: { rgb: '94A3B8' } }, left: { style: 'thin', color: { rgb: '94A3B8' } }, right: { style: 'thin', color: { rgb: '94A3B8' } } };
    const ws = {
      '!ref': '',
      '!cols': [{ wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }],
    };
    const cols = ['A','B','C','D','E','F','G'];
    ws['A1'] = { v: `${nomeCentro} — UTENZE ${modeLabel} ${anno} vs ${anno-1}`, t: 's', s: { font: { bold: true, sz: 13 } } };
    ws['A2'] = { v: `Generato il ${format(new Date(), 'dd/MM/yyyy')}`, t: 's', s: { font: { sz: 8, color: { rgb: '94A3B8' } } } };

    let row = 4;

    TIPI.forEach(tipo => {
      const curr = contatoriAnno.filter(c => c.tipo === tipo.key);
      const prev = contatoriPrev.filter(c => c.tipo === tipo.key);
      const hasData = MESI.some((_, i) => {
        const { c, p } = getRow(tipo, i);
        return c != null || p != null;
      });
      if (!hasData) return;

      // Intestazione tipo
      cols.forEach((col, i) => {
        ws[`${col}${row}`] = {
          v: i === 0 ? tipo.label.toUpperCase() : '',
          t: 's',
          s: { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: tipo.headerBg } }, alignment: { horizontal: i === 0 ? 'left' : 'center' }, border },
        };
      });
      row++;

      // Header colonne
      const headers = ['Mese', `${anno-1}`, `${anno}`, 'Variazione', `°C ${anno-1}`, `°C ${anno}`, 'Δ°C'];
      cols.forEach((col, i) => {
        ws[`${col}${row}`] = {
          v: headers[i], t: 's',
          s: { font: { bold: true, sz: 9 }, fill: { fgColor: { rgb: 'E2E8F0' } }, alignment: { horizontal: 'center' }, border },
        };
      });
      row++;

      // Righe dati
      let totC = 0, totP = 0;
      MESI_LABEL.forEach((m, i) => {
        const { c, p, delta, tc, tp, deltaTemp } = getRow(tipo, i);
        if (c == null && p == null) return;
        if (c != null) totC += c;
        if (p != null) totP += p;
        const bg = 'F8FAFC';
        const rowStyle = { border, fill: { fgColor: { rgb: bg } } };
        const varTxt = delta != null ? `${c - p > 0 ? '+' : ''}${fmtVal(c - p, tipo)} (${delta > 0 ? '+' : ''}${delta.toFixed(1)}%)` : '—';
        const dtTxt = deltaTemp != null ? `${deltaTemp > 0 ? '+' : ''}${deltaTemp.toFixed(1)}°` : '—';
        const rowData = [
          { v: m, t: 's' },
          { v: fmtVal(p, tipo), t: 's' },
          { v: fmtVal(c, tipo), t: 's' },
          { v: varTxt, t: 's' },
          { v: tp != null ? tp.toFixed(1) + '°' : '—', t: 's' },
          { v: tc != null ? tc.toFixed(1) + '°' : '—', t: 's' },
          { v: dtTxt, t: 's' },
        ];
        cols.forEach((col, ci) => { ws[`${col}${row}`] = { ...rowData[ci], s: rowStyle }; });
        row++;
      });

      // Totale tipo
      const totStyle = { font: { bold: true, sz: 9 }, fill: { fgColor: { rgb: 'E2E8F0' } }, border };
      const totDelta = pct(totC, totP);
      ws[`A${row}`] = { v: `Totale ${tipo.label}`, t: 's', s: { ...totStyle, alignment: { horizontal: 'left' } } };
      ws[`B${row}`] = { v: fmtVal(totP, tipo), t: 's', s: { ...totStyle, alignment: { horizontal: 'center' } } };
      ws[`C${row}`] = { v: fmtVal(totC, tipo), t: 's', s: { ...totStyle, alignment: { horizontal: 'center' } } };
      ws[`D${row}`] = { v: totDelta != null ? `${totDelta > 0 ? '+' : ''}${totDelta.toFixed(1)}%` : '—', t: 's', s: { ...totStyle, alignment: { horizontal: 'center' } } };
      ['E','F','G'].forEach(c => { ws[`${c}${row}`] = { v: '', t: 's', s: totStyle }; });
      row += 2;
    });

    ws['!ref'] = `A1:G${row}`;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Utenze');
    XLSX.writeFile(wb, `${nomeFile}.xlsx`);
  };

  // ── PDF ──────────────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    const nomeFile = `${nomeCentro}_UTENZE_${modeLabel}_${anno}`;
    const logoUrl = centroSelezionato?.logo_url;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    if (logoUrl) {
      await new Promise((resolve) => {
        const img = new Image(); img.crossOrigin = 'anonymous';
        img.onload = () => {
          const maxH = 14, ratio = img.width / img.height;
          const imgW = Math.min(maxH * ratio, 48);
          doc.addImage(img, 'PNG', pageW - imgW - 10, 7, imgW, maxH); resolve();
        };
        img.onerror = resolve; img.src = logoUrl;
      });
    }

    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text(`${nomeCentro} — UTENZE ${modeLabel} ${anno} vs ${anno-1}`, 14, 15);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text(`Generato il ${format(new Date(), 'dd/MM/yyyy')}`, 14, 21);
    doc.setTextColor(0, 0, 0);

    const colWidths = [18, 38, 38, 42, 20, 20, 22];
    const colHeaders = ['Mese', `${anno-1}`, `${anno}`, 'Variazione', `°C ${anno-1}`, `°C ${anno}`, 'Δ°C'];
    const startX = 14, rowH = 7;

    const checkPage = (y) => { if (y + rowH > pageH - 10) { doc.addPage(); return 14; } return y; };

    const drawCell = (text, cx, y, w, bg, textColor, align = 'center', bold = false) => {
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(cx, y, w, rowH, 'F');
      doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.2);
      doc.rect(cx, y, w, rowH, 'S');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(7); doc.setFont('helvetica', bold ? 'bold' : 'normal');
      const pad = 1.5;
      const tx = align === 'right' ? cx + w - pad : align === 'center' ? cx + w / 2 : cx + pad;
      const truncated = doc.splitTextToSize(String(text ?? ''), w - pad * 2)[0] || '';
      doc.text(truncated, tx, y + rowH * 0.65, { align });
    };

    const hexToRgb = (hex) => {
      const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
      return [r, g, b];
    };

    let y = 27;

    TIPI.forEach(tipo => {
      const hasData = MESI.some((_, i) => { const { c, p } = getRow(tipo, i); return c != null || p != null; });
      if (!hasData) return;

      const headerRgb = hexToRgb(tipo.headerBg);

      // Intestazione tipo
      y = checkPage(y);
      let cx = startX;
      colWidths.forEach((w, i) => {
        drawCell(i === 0 ? tipo.label.toUpperCase() : '', cx, y, w, headerRgb, [255,255,255], i === 0 ? 'left' : 'center', true);
        cx += w;
      });
      y += rowH;

      // Header colonne
      y = checkPage(y);
      cx = startX;
      colHeaders.forEach((h, i) => {
        drawCell(h, cx, y, colWidths[i], [226,232,240], [30,58,95], 'center', true);
        cx += colWidths[i];
      });
      y += rowH;

      let totC = 0, totP = 0;
      MESI_LABEL.forEach((m, i) => {
        const { c, p, delta, tc, tp, deltaTemp } = getRow(tipo, i);
        if (c == null && p == null) return;
        if (c != null) totC += c;
        if (p != null) totP += p;
        y = checkPage(y);
        const varTxt = delta != null ? `${c - p > 0 ? '+' : ''}${fmtVal(c - p, tipo)} (${delta > 0 ? '+' : ''}${delta.toFixed(1)}%)` : '—';
        const dtTxt = deltaTemp != null ? `${deltaTemp > 0 ? '+' : ''}${deltaTemp.toFixed(1)}°` : '—';
        const cells = [m, fmtVal(p, tipo), fmtVal(c, tipo), varTxt, tp != null ? tp.toFixed(1)+'°' : '—', tc != null ? tc.toFixed(1)+'°' : '—', dtTxt];
        cx = startX;
        cells.forEach((text, ci) => {
          drawCell(text, cx, y, colWidths[ci], [248,250,252], [40,40,40], ci === 0 ? 'left' : 'center');
          cx += colWidths[ci];
        });
        y += rowH;
      });

      // Totale tipo
      y = checkPage(y);
      const totDelta = pct(totC, totP);
      const totCells = [`Totale ${tipo.label}`, fmtVal(totP, tipo), fmtVal(totC, tipo), totDelta != null ? `${totDelta > 0 ? '+' : ''}${totDelta.toFixed(1)}%` : '—', '', '', ''];
      cx = startX;
      totCells.forEach((text, ci) => {
        drawCell(text, cx, y, colWidths[ci], [226,232,240], [30,58,95], ci === 0 ? 'left' : 'center', true);
        cx += colWidths[ci];
      });
      y += rowH + 4;
    });

    doc.save(`${nomeFile}.pdf`);
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={handleExportExcel} className="border-slate-300 h-8 text-xs">
        <Download className="w-3.5 h-3.5 mr-1" /> Excel
      </Button>
      <Button size="sm" variant="outline" onClick={handleExportPDF} className="border-slate-300 h-8 text-xs">
        <Download className="w-3.5 h-3.5 mr-1" /> PDF
      </Button>
    </div>
  );
}