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

// ─── costruzione foglio ────────────────────────────────────────────────────
async function buildWorkbook(rows, anno, centroNome, logoUrl, budgetSaved) {
  const NCols = 14; // voce + totale + 12 mesi

  // Converti logo in base64 se disponibile
  let logoBase64 = null;
  if (logoUrl) {
    try {
      const resp = await fetch(logoUrl);
      const blob = await resp.blob();
      logoBase64 = await new Promise(res => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });
    } catch {}
  }

  const wsData = [];
  const merges = [];
  const rowHeights = [];
  let R = 0; // riga corrente (0-indexed)

  const emptyRow = () => Array(NCols).fill(cell(''));

  // ── Riga logo/titolo ──────────────────────────────────────────────────────
  // Riga 0: titolo
  const titleRow = emptyRow();
  titleRow[0] = cell(`Piano Marketing ${anno}`, titleStyle);
  titleRow[NCols - 1] = cell(centroNome || '', { font: { bold: true, sz: 12, color: { rgb: '64748B' } }, alignment: { horizontal: 'right' } });
  wsData.push(titleRow); merges.push({ s:{r:R,c:0}, e:{r:R,c:9} }); rowHeights.push({ hpt: 30 }); R++;

  // Riga 1: sottotitolo
  const subRow = emptyRow();
  subRow[0] = cell(`Esportato il ${new Date().toLocaleDateString('it-IT')}`, subStyle);
  wsData.push(subRow); rowHeights.push({ hpt: 16 }); R++;

  // Riga 2: vuota
  wsData.push(emptyRow()); rowHeights.push({ hpt: 8 }); R++;

  // ── KPI ───────────────────────────────────────────────────────────────────
  const consuntivo = totaleBudget(rows);
  const diff = budgetSaved > 0 ? budgetSaved - consuntivo : null;

  const kpiRow = emptyRow();
  kpiRow[0]  = cell('Budget Pianificato', kpiLabelStyle);
  kpiRow[1]  = { v: budgetSaved || 0, t: 'n', s: kpiValStyle };
  kpiRow[3]  = cell('Consuntivo', kpiLabelStyle);
  kpiRow[4]  = { v: consuntivo, t: 'n', s: kpiValStyle };
  kpiRow[6]  = cell('Differenza', kpiLabelStyle);
  kpiRow[7]  = { v: diff ?? 0, t: 'n', s: diff === null ? kpiValStyle : diff >= 0 ? kpiDiffPosStyle : kpiDiffNegStyle };
  wsData.push(kpiRow); rowHeights.push({ hpt: 22 }); R++;

  // Riga vuota
  wsData.push(emptyRow()); rowHeights.push({ hpt: 10 }); R++;

  // ── Header tabella ────────────────────────────────────────────────────────
  const hRow = [
    cell('VOCE', headerFirstStyle),
    cell('TOTALE', headerStyle),
    ...MESI_LABEL.map(m => cell(m, headerStyle)),
  ];
  wsData.push(hRow); rowHeights.push({ hpt: 18 }); R++;

  // ── Sezioni ───────────────────────────────────────────────────────────────
  SEZIONI.forEach(s => {
    const sRows = rows.filter(r => r.sezione === s.key);
    const { hex, label } = s;

    // Header sezione
    const sHdr = emptyRow();
    sHdr[0] = cell(label, sectionStyle(hex));
    for (let c = 1; c < NCols; c++) sHdr[c] = cell('', sectionNumStyle(hex));
    wsData.push(sHdr); rowHeights.push({ hpt: 16 }); R++;

    // Righe dati
    sRows.forEach((r, idx) => {
      const alt = idx % 2 === 1;
      const dS = alt ? dataAltStyle : dataStyle;
      const nS = alt ? dataNumAltStyle : dataNumStyle;
      const dRow = [
        cell(r.nome, dS),
        { v: r.budget_totale || 0, t: 'n', s: nS },
        ...MESI.map(m => ({ v: r[m] || 0, t: 'n', s: nS })),
      ];
      wsData.push(dRow); rowHeights.push({ hpt: 15 }); R++;
    });

    // Totale sezione
    const tRow = [
      cell(`Totale ${label}`, totaleStyle),
      { v: totaleBudget(sRows), t: 'n', s: totaleNumStyle },
      ...MESI.map(m => ({ v: sum(sRows, m), t: 'n', s: totaleNumStyle })),
    ];
    wsData.push(tRow); rowHeights.push({ hpt: 16 }); R++;

    // Riga vuota separatore
    wsData.push(emptyRow()); rowHeights.push({ hpt: 6 }); R++;
  });

  // Totale comunicazione
  const commRows = [...rows.filter(r => r.sezione === 'comunicazione_online'), ...rows.filter(r => r.sezione === 'comunicazione_offline')];
  wsData.push([
    cell('TOTALE COMUNICAZIONE', totaleStyle),
    { v: totaleBudget(commRows), t: 'n', s: totaleNumStyle },
    ...MESI.map(m => ({ v: sum(commRows, m), t: 'n', s: totaleNumStyle })),
  ]); rowHeights.push({ hpt: 16 }); R++;

  // TOTALE BUDGET
  wsData.push([
    cell('TOTALE BUDGET', grandTotaleStyle),
    { v: totaleBudget(rows), t: 'n', s: grandTotaleNumStyle },
    ...MESI.map(m => ({ v: sum(rows, m), t: 'n', s: grandTotaleNumStyle })),
  ]); rowHeights.push({ hpt: 20 }); R++;

  // ── Costruzione worksheet ─────────────────────────────────────────────────
  const ws = XLSXStyle.utils.aoa_to_sheet(wsData.map(r => r.map(c => c.v ?? c)));
  // Inietta gli stili cella per cella
  wsData.forEach((rowArr, ri) => {
    rowArr.forEach((cellObj, ci) => {
      if (!cellObj || cellObj.v === undefined) return;
      const addr = XLSXStyle.utils.encode_cell({ r: ri, c: ci });
      ws[addr] = { v: cellObj.v, t: cellObj.t || (typeof cellObj.v === 'number' ? 'n' : 's'), s: cellObj.s || {} };
      if (cellObj.s?.numFmt) ws[addr].z = cellObj.s.numFmt;
    });
  });

  ws['!cols'] = [
    { wch: 38 }, // voce
    { wch: 14 }, // totale
    ...MESI.map(() => ({ wch: 9 })),
  ];
  ws['!rows'] = rowHeights;
  ws['!merges'] = merges;

  // Logo come immagine (solo se disponibile)
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, `Marketing ${anno}`);

  if (logoBase64) {
    if (!wb.Workbook) wb.Workbook = {};
    if (!wb.Workbook.Images) wb.Workbook.Images = [];
    // xlsx-js-style non supporta immagini native; usiamo un workaround testuale
  }

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

      // Logo
      if (centroLogo) {
        try {
          const resp = await fetch(centroLogo);
          const blob = await resp.blob();
          const b64 = await new Promise(res => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result);
            reader.readAsDataURL(blob);
          });
          doc.addImage(b64, 'PNG', pw - margin - 30, y - 3, 30, 12, '', 'FAST');
        } catch {}
      }

      // Header page
      doc.setFillColor(30, 58, 95);
      doc.rect(margin, y - 3, pw - margin * 2, 14, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text(`Piano Marketing ${anno}`, margin + 3, y + 6);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(centroNome || '', pw - margin - 3, y + 6, { align: 'right' });
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