import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText } from 'lucide-react';
import XLSXStyle from 'xlsx-js-style';
import { jsPDF } from 'jspdf';

const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const MESI_LABEL = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];

const sum = (rows, mese) => rows.reduce((acc, r) => acc + (r[mese] || 0), 0);
const totaleBudget = (rows) => rows.reduce((acc, r) => acc + (r.budget_totale || 0), 0);
const fmtN = (v) => v ? v.toLocaleString('it-IT') : '';
const euro = (v) => v ? `€ ${v.toLocaleString('it-IT', { minimumFractionDigits: 0 })}` : '–';

const SEZIONI = [
  { key: 'iniziativa',            label: 'INIZIATIVE',             hex: '3B82F6', rgb: [59,130,246] },
  { key: 'comunicazione_online',  label: 'COMUNICAZIONE ONLINE',   hex: '10B981', rgb: [16,185,129] },
  { key: 'comunicazione_offline', label: 'COMUNICAZIONE OFFLINE',  hex: 'D97706', rgb: [217,119,6] },
  { key: 'costo_fisso',           label: 'COSTI FISSI',            hex: 'E11D48', rgb: [225,29,72] },
];

// ─── helpers stile xlsx-js-style ───────────────────────────────────────────
const border = {
  top:    { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left:   { style: 'thin', color: { rgb: 'CBD5E1' } },
  right:  { style: 'thin', color: { rgb: 'CBD5E1' } },
};
const borderBold = {
  top:    { style: 'medium', color: { rgb: '94A3B8' } },
  bottom: { style: 'medium', color: { rgb: '94A3B8' } },
  left:   { style: 'medium', color: { rgb: '94A3B8' } },
  right:  { style: 'medium', color: { rgb: '94A3B8' } },
};

const cell = (v, style = {}) => ({ v, s: style });
const numCell = (v, style = {}) => ({ v: v || 0, t: 'n', s: { ...style, numFmt: '#,##0' } });

const titleStyle = {
  font: { bold: true, sz: 16, color: { rgb: '1E3A5F' } },
  fill: { fgColor: { rgb: 'FFFFFF' } },
};
const subStyle = {
  font: { sz: 10, color: { rgb: '64748B' } },
};
const headerStyle = {
  font: { bold: true, sz: 9, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '1E3A5F' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border,
};
const headerFirstStyle = {
  ...headerStyle,
  alignment: { horizontal: 'left', vertical: 'center' },
};

const sectionStyle = (hex) => ({
  font: { bold: true, sz: 9, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: hex } },
  alignment: { horizontal: 'left', vertical: 'center' },
  border,
});
const sectionNumStyle = (hex) => ({
  font: { bold: true, sz: 9, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: hex } },
  alignment: { horizontal: 'right', vertical: 'center' },
  border,
});

const dataStyle = {
  font: { sz: 9, color: { rgb: '334155' } },
  fill: { fgColor: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'left', vertical: 'center' },
  border,
};
const dataNumStyle = {
  font: { sz: 9, color: { rgb: '334155' } },
  fill: { fgColor: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'right', vertical: 'center' },
  border,
  numFmt: '#,##0',
};
const dataNumAltStyle = {
  ...dataNumStyle,
  fill: { fgColor: { rgb: 'F8FAFC' } },
};
const dataAltStyle = {
  ...dataStyle,
  fill: { fgColor: { rgb: 'F8FAFC' } },
};

const totaleStyle = {
  font: { bold: true, sz: 9, color: { rgb: '1E293B' } },
  fill: { fgColor: { rgb: 'E2E8F0' } },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: borderBold,
};
const totaleNumStyle = {
  font: { bold: true, sz: 9, color: { rgb: '1E293B' } },
  fill: { fgColor: { rgb: 'E2E8F0' } },
  alignment: { horizontal: 'right', vertical: 'center' },
  border: borderBold,
  numFmt: '#,##0',
};
const grandTotaleStyle = {
  font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '1E3A5F' } },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: borderBold,
};
const grandTotaleNumStyle = {
  font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '1E3A5F' } },
  alignment: { horizontal: 'right', vertical: 'center' },
  border: borderBold,
  numFmt: '#,##0',
};
const kpiLabelStyle = {
  font: { bold: true, sz: 10, color: { rgb: '64748B' } },
  fill: { fgColor: { rgb: 'F1F5F9' } },
  alignment: { horizontal: 'left', vertical: 'center' },
  border,
};
const kpiValStyle = {
  font: { bold: true, sz: 11, color: { rgb: '1E3A5F' } },
  fill: { fgColor: { rgb: 'EFF6FF' } },
  alignment: { horizontal: 'right', vertical: 'center' },
  border,
  numFmt: '€ #,##0',
};
const kpiDiffPosStyle = {
  ...kpiValStyle,
  font: { bold: true, sz: 11, color: { rgb: '16A34A' } },
  fill: { fgColor: { rgb: 'F0FDF4' } },
};
const kpiDiffNegStyle = {
  ...kpiValStyle,
  font: { bold: true, sz: 11, color: { rgb: 'DC2626' } },
  fill: { fgColor: { rgb: 'FEF2F2' } },
};

// helpers per formule Excel
const col = (c) => String.fromCharCode(65 + c); // 0→A, 1→B, ...
const ref = (r, c) => `${col(c)}${r + 1}`; // 0-indexed → A1

// ─── costruzione foglio ────────────────────────────────────────────────────
async function buildWorkbook(rows, anno, centroNome, logoUrl, budgetSaved) {
  const NCols = 14; // voce + totale + 12 mesi

  const ws = {};
  const merges = [];
  const rowHeights = [];
  let R = 0;

  // Helper per scrivere una cella nel worksheet direttamente
  const wc = (r, c, obj) => {
    const addr = `${col(c)}${r + 1}`;
    ws[addr] = obj;
    if (!ws['!ref']) ws['!ref'] = `A1:${col(NCols - 1)}1`;
  };
  const emptyStyled = (r, c, s) => wc(r, c, { v: '', t: 's', s });

  // ── Titolo ────────────────────────────────────────────────────────────────
  wc(R, 0, { v: `Piano Marketing ${anno}`, t: 's', s: titleStyle });
  // Nell'Excel il logo non è embeddabile nativamente: mostriamo solo il nome
  wc(R, NCols - 1, { v: centroNome || '', t: 's', s: { font: { sz: 10, color: { rgb: '94A3B8' } }, alignment: { horizontal: 'right' } } });
  merges.push({ s:{r:R,c:0}, e:{r:R,c:9} }); rowHeights.push({ hpt: 30 }); R++;

  wc(R, 0, { v: `Esportato il ${new Date().toLocaleDateString('it-IT')}`, t: 's', s: subStyle });
  rowHeights.push({ hpt: 16 }); R++;
  rowHeights.push({ hpt: 8 }); R++; // riga vuota

  // ── KPI ───────────────────────────────────────────────────────────────────
  const consuntivo = totaleBudget(rows);
  const diff = budgetSaved > 0 ? budgetSaved - consuntivo : null;
  wc(R, 0, { v: 'Budget Pianificato', t: 's', s: kpiLabelStyle });
  wc(R, 1, { v: budgetSaved || 0, t: 'n', s: kpiValStyle, z: '€ #,##0' });
  wc(R, 3, { v: 'Consuntivo', t: 's', s: kpiLabelStyle });
  wc(R, 4, { v: consuntivo, t: 'n', s: kpiValStyle, z: '€ #,##0' });
  wc(R, 6, { v: 'Differenza', t: 's', s: kpiLabelStyle });
  wc(R, 7, { v: diff ?? 0, t: 'n', s: diff === null ? kpiValStyle : diff >= 0 ? kpiDiffPosStyle : kpiDiffNegStyle, z: '€ #,##0' });
  rowHeights.push({ hpt: 22 }); R++;
  rowHeights.push({ hpt: 10 }); R++; // riga vuota

  // ── Header tabella ────────────────────────────────────────────────────────
  wc(R, 0, { v: 'VOCE', t: 's', s: headerFirstStyle });
  wc(R, 1, { v: 'TOTALE', t: 's', s: headerStyle });
  MESI_LABEL.forEach((m, i) => wc(R, 2 + i, { v: m, t: 's', s: headerStyle }));
  rowHeights.push({ hpt: 18 }); R++;

  // Teniamo traccia delle righe dati per costruire le formule SUM
  const sectionDataRows = {}; // key → [firstRow, lastRow] (1-indexed)
  const sectionTotaleRows = {}; // key → row index (1-indexed) della riga totale sezione

  // ── Sezioni ───────────────────────────────────────────────────────────────
  SEZIONI.forEach(s => {
    const sRows = rows.filter(r => r.sezione === s.key);
    const { hex, label } = s;

    // Header sezione
    wc(R, 0, { v: label, t: 's', s: sectionStyle(hex) });
    for (let c = 1; c < NCols; c++) wc(R, c, { v: '', t: 's', s: sectionNumStyle(hex) });
    rowHeights.push({ hpt: 16 }); R++;

    const dataFirstRow = R + 1; // 1-indexed
    sRows.forEach((r, idx) => {
      const alt = idx % 2 === 1;
      const dS = alt ? dataAltStyle : dataStyle;
      const nS = alt ? dataNumAltStyle : dataNumStyle;
      wc(R, 0, { v: r.nome, t: 's', s: dS });
      // colonna TOTALE: somma dei 12 mesi della riga stessa
      const rowNum = R + 1;
      wc(R, 1, { f: `SUM(C${rowNum}:N${rowNum})`, t: 'n', s: nS, z: '#,##0' });
      MESI.forEach((m, mi) => wc(R, 2 + mi, { v: r[m] || 0, t: 'n', s: nS, z: '#,##0' }));
      rowHeights.push({ hpt: 15 }); R++;
    });
    const dataLastRow = R; // 1-indexed (esclusivo dell'header)

    sectionDataRows[s.key] = { first: dataFirstRow, last: dataLastRow };

    // Totale sezione con formule SUM sulle righe dati
    wc(R, 0, { v: `Totale ${label}`, t: 's', s: totaleStyle });
    if (sRows.length > 0) {
      wc(R, 1, { f: `SUM(B${dataFirstRow}:B${dataLastRow})`, t: 'n', s: totaleNumStyle, z: '#,##0' });
      for (let mi = 0; mi < 12; mi++) {
        const colLetter = col(2 + mi);
        wc(R, 2 + mi, { f: `SUM(${colLetter}${dataFirstRow}:${colLetter}${dataLastRow})`, t: 'n', s: totaleNumStyle, z: '#,##0' });
      }
    } else {
      wc(R, 1, { v: 0, t: 'n', s: totaleNumStyle, z: '#,##0' });
      for (let mi = 0; mi < 12; mi++) wc(R, 2 + mi, { v: 0, t: 'n', s: totaleNumStyle, z: '#,##0' });
    }
    sectionTotaleRows[s.key] = R + 1; // 1-indexed
    rowHeights.push({ hpt: 16 }); R++;

    rowHeights.push({ hpt: 6 }); R++; // separatore
  });

  // ── Totale Comunicazione (somma righe totale online + offline) ───────────
  const rOnline  = sectionTotaleRows['comunicazione_online'];
  const rOffline = sectionTotaleRows['comunicazione_offline'];
  wc(R, 0, { v: 'TOTALE COMUNICAZIONE', t: 's', s: totaleStyle });
  wc(R, 1, { f: `B${rOnline}+B${rOffline}`, t: 'n', s: totaleNumStyle, z: '#,##0' });
  for (let mi = 0; mi < 12; mi++) {
    const cl = col(2 + mi);
    wc(R, 2 + mi, { f: `${cl}${rOnline}+${cl}${rOffline}`, t: 'n', s: totaleNumStyle, z: '#,##0' });
  }
  rowHeights.push({ hpt: 16 }); R++;

  // ── TOTALE BUDGET (somma di tutti i totali sezione) ───────────────────────
  const totRows = SEZIONI.map(s => sectionTotaleRows[s.key]);
  const sumRef = (c) => totRows.map(r => `${c}${r}`).join('+');
  wc(R, 0, { v: 'TOTALE BUDGET', t: 's', s: grandTotaleStyle });
  wc(R, 1, { f: sumRef('B'), t: 'n', s: grandTotaleNumStyle, z: '#,##0' });
  for (let mi = 0; mi < 12; mi++) {
    const cl = col(2 + mi);
    wc(R, 2 + mi, { f: sumRef(cl), t: 'n', s: grandTotaleNumStyle, z: '#,##0' });
  }
  rowHeights.push({ hpt: 20 }); R++;

  // ── Dimensioni foglio ─────────────────────────────────────────────────────
  ws['!ref'] = `A1:${col(NCols - 1)}${R}`;
  ws['!cols'] = [{ wch: 38 }, { wch: 14 }, ...MESI.map(() => ({ wch: 9 }))];
  ws['!rows'] = rowHeights;
  ws['!merges'] = merges;

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, `Marketing ${anno}`);
  return { wb, consuntivo };
}

// ─── COMPONENTE ────────────────────────────────────────────────────────────
export default function ExportMarketing({ rows, anno, centroNome, centroLogo, budgetSaved }) {
  const [exporting, setExporting] = useState(null);

  const handleExcelExport = async () => {
    setExporting('excel');
    try {
      const { wb } = await buildWorkbook(rows, anno, centroNome, centroLogo, budgetSaved);
      XLSXStyle.writeFile(wb, `marketing_${anno}_${centroNome?.replace(/\s+/g, '_') || 'export'}.xlsx`);
    } finally {
      setExporting(null);
    }
  };

  const handlePdfExport = async () => {
    setExporting('pdf');
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const margin = 12;
      let y = margin;

      // Carica logo
      let logob64 = null;
      if (centroLogo) {
        try {
          const resp = await fetch(centroLogo);
          const blob = await resp.blob();
          logob64 = await new Promise(res => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch {}
      }

      // Header page
      doc.setFillColor(30, 58, 95);
      doc.rect(margin, y - 3, pw - margin * 2, 14, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text(`Piano Marketing ${anno}`, margin + 3, y + 6);

      // Logo al posto del nome testuale
      if (logob64) {
        doc.addImage(logob64, 'PNG', pw - margin - 32, y - 2, 32, 11, '', 'FAST');
      } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(centroNome || '', pw - margin - 3, y + 6, { align: 'right' });
      }
      y += 18;

      // KPI bar
      const consuntivo = totaleBudget(rows);
      const diff = budgetSaved > 0 ? budgetSaved - consuntivo : null;
      const kpiW = (pw - margin * 2) / 3 - 2;

      const drawKpi = (label, val, color, x) => {
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(x, y, kpiW, 12, 2, 2, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(label, x + 3, y + 4.5);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...color);
        doc.text(`€ ${val?.toLocaleString('it-IT') || '–'}`, x + kpiW - 3, y + 9.5, { align: 'right' });
      };

      drawKpi('Budget Pianificato', budgetSaved || 0, [30, 58, 95], margin);
      drawKpi('Consuntivo', consuntivo, [30, 58, 95], margin + kpiW + 2);
      if (diff !== null) {
        drawKpi('Differenza', diff, diff >= 0 ? [22, 163, 74] : [220, 38, 38], margin + (kpiW + 2) * 2);
      }
      y += 18;

      // Tabella
      const totalW = pw - margin * 2;
      const col0W = 48;
      const col1W = 16;
      const mesiW = (totalW - col0W - col1W) / 12;
      const ROW_H = 5;

      const drawTableRow = (cells, bgRgb, fgRgb, bold, fontSize = 7) => {
        if (y + ROW_H > ph - margin) { doc.addPage(); y = margin; }
        const totalRowW = col0W + col1W + mesiW * 12;
        if (bgRgb) {
          doc.setFillColor(...bgRgb);
          doc.rect(margin, y, totalRowW, ROW_H, 'F');
        }
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(fontSize);
        doc.setTextColor(...(fgRgb || [51, 65, 85]));

        cells.forEach((txt, i) => {
          let x, w;
          if (i === 0) { x = margin; w = col0W; }
          else if (i === 1) { x = margin + col0W; w = col1W; }
          else { x = margin + col0W + col1W + (i - 2) * mesiW; w = mesiW; }
          const s = txt !== null && txt !== undefined ? String(txt) : '';
          if (i === 0) {
            doc.text(s, x + 1.5, y + ROW_H - 1.2);
          } else {
            doc.text(s, x + w - 1, y + ROW_H - 1.2, { align: 'right' });
          }
        });

        // bordo inferiore leggero
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.1);
        doc.line(margin, y + ROW_H, margin + totalRowW, y + ROW_H);
        y += ROW_H;
      };

      // Header
      drawTableRow(['VOCE', 'TOTALE', ...MESI_LABEL], [30, 58, 95], [255, 255, 255], true, 7);

      SEZIONI.forEach(s => {
        const sRows = rows.filter(r => r.sezione === s.key);
        drawTableRow([s.label, '', ...MESI.map(() => '')], s.rgb, [255, 255, 255], true, 7);
        sRows.forEach((r, idx) => {
          const alt = idx % 2 === 1;
          drawTableRow([r.nome, fmtN(r.budget_totale), ...MESI.map(m => fmtN(r[m]))], alt ? [248, 250, 252] : null, null, false);
        });
        drawTableRow([`Totale ${s.label}`, fmtN(totaleBudget(sRows)), ...MESI.map(m => fmtN(sum(sRows, m)))], [226, 232, 240], [30, 41, 59], true);
        y += 1.5;
      });

      const commRows = [...rows.filter(r => r.sezione === 'comunicazione_online'), ...rows.filter(r => r.sezione === 'comunicazione_offline')];
      drawTableRow(['TOTALE COMUNICAZIONE', fmtN(totaleBudget(commRows)), ...MESI.map(m => fmtN(sum(commRows, m)))], [226, 232, 240], [30, 41, 59], true);
      drawTableRow(['TOTALE BUDGET', fmtN(totaleBudget(rows)), ...MESI.map(m => fmtN(sum(rows, m)))], [30, 58, 95], [255, 255, 255], true, 8);

      // Footer
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, margin, ph - 5);

      doc.save(`marketing_${anno}_${centroNome?.replace(/\s+/g, '_') || 'export'}.pdf`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleExcelExport} disabled={!!exporting} className="flex items-center gap-1.5">
        <FileSpreadsheet className="w-4 h-4 text-green-600" />
        <span className="hidden sm:inline">{exporting === 'excel' ? 'Esportando...' : 'Excel'}</span>
      </Button>
      <Button variant="outline" size="sm" onClick={handlePdfExport} disabled={!!exporting} className="flex items-center gap-1.5">
        <FileText className="w-4 h-4 text-red-600" />
        <span className="hidden sm:inline">{exporting === 'pdf' ? 'Esportando...' : 'PDF'}</span>
      </Button>
    </div>
  );
}