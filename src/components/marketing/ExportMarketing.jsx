import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText } from 'lucide-react';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';

const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const MESI_LABEL = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];

const sum = (rows, mese) => rows.reduce((acc, r) => acc + (r[mese] || 0), 0);
const totaleBudget = (rows) => rows.reduce((acc, r) => acc + (r.budget_totale || 0), 0);
const fmtN = (v) => v ? v.toLocaleString('it-IT') : '';

const SEZIONI = [
  { key: 'iniziativa',            label: 'INIZIATIVE',             hex: '3B82F6', rgb: [59,130,246] },
  { key: 'comunicazione_online',  label: 'COMUNICAZIONE ONLINE',   hex: '10B981', rgb: [16,185,129] },
  { key: 'comunicazione_offline', label: 'COMUNICAZIONE OFFLINE',  hex: 'D97706', rgb: [217,119,6] },
  { key: 'costo_fisso',           label: 'COSTI FISSI',            hex: 'E11D48', rgb: [225,29,72] },
];

// Carica immagine come ArrayBuffer
async function fetchImageBuffer(url) {
  const resp = await fetch(url);
  const ab = await resp.arrayBuffer();
  // Determina estensione
  const ct = resp.headers.get('content-type') || '';
  let ext = 'png';
  if (ct.includes('jpeg') || ct.includes('jpg')) ext = 'jpeg';
  else if (ct.includes('gif')) ext = 'gif';
  return { buffer: ab, ext };
}

// Carica immagine come base64 data URL
async function fetchImageBase64(url) {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new Promise(res => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.readAsDataURL(blob);
  });
}

// ─── EXCEL ────────────────────────────────────────────────────────────────
async function exportExcel(rows, anno, centroNome, logoUrl, budgetSaved) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Mall Pilot';
  const ws = wb.addWorksheet(`Marketing ${anno}`);

  const NCols = 14; // voce + totale + 12 mesi

  // Larghezze colonne
  ws.getColumn(1).width = 40;
  ws.getColumn(2).width = 14;
  for (let i = 3; i <= NCols; i++) ws.getColumn(i).width = 9;

  const navy = '1E3A5F';
  const lightGray = 'E2E8F0';
  const white = 'FFFFFF';
  const slate100 = 'F1F5F9';
  const slate50 = 'F8FAFC';

  const numFmt = '#,##0';
  const euroFmt = '€ #,##0';

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };
  const medBorder = {
    top: { style: 'medium', color: { argb: 'FF94A3B8' } },
    bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
    left: { style: 'medium', color: { argb: 'FF94A3B8' } },
    right: { style: 'medium', color: { argb: 'FF94A3B8' } },
  };

  let R = 1; // riga corrente 1-indexed

  // ── Riga logo/titolo ───────────────────────────────────────────────────
  ws.getRow(R).height = 36;
  const titleCell = ws.getCell(R, 1);
  titleCell.value = `Piano Marketing ${anno}`;
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF1E3A5F' } };
  titleCell.alignment = { vertical: 'middle' };
  ws.mergeCells(R, 1, R, 10);

  // Logo nelle ultime 2 colonne (13-14), occupando 2 righe
  // Verrà aggiunto dopo come immagine
  R++;

  // Riga 2 sottotitolo
  ws.getRow(R).height = 16;
  const subCell = ws.getCell(R, 1);
  subCell.value = `Esportato il ${new Date().toLocaleDateString('it-IT')}`;
  subCell.font = { size: 9, color: { argb: 'FF64748B' } };
  R++;

  // Riga vuota
  ws.getRow(R).height = 8; R++;

  // ── KPI ───────────────────────────────────────────────────────────────
  const consuntivo = totaleBudget(rows);
  const diff = budgetSaved > 0 ? budgetSaved - consuntivo : null;

  ws.getRow(R).height = 24;
  const kpiDefs = [
    { col: 1, label: 'Budget Pianificato', val: budgetSaved || 0, color: '1E3A5F' },
    { col: 4, label: 'Consuntivo',         val: consuntivo,        color: '1E3A5F' },
    { col: 7, label: 'Differenza',         val: diff ?? 0,         color: diff === null ? '1E3A5F' : diff >= 0 ? '16A34A' : 'DC2626' },
  ];
  kpiDefs.forEach(({ col, label, val, color }) => {
    const lc = ws.getCell(R, col);
    lc.value = label;
    lc.font = { bold: true, size: 9, color: { argb: 'FF64748B' } };
    lc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    lc.alignment = { horizontal: 'left', vertical: 'middle' };
    lc.border = thinBorder;
    ws.mergeCells(R, col, R, col + 1);

    const vc = ws.getCell(R, col + 2);
    vc.value = val;
    vc.numFmt = euroFmt;
    vc.font = { bold: true, size: 11, color: { argb: `FF${color}` } };
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
    vc.alignment = { horizontal: 'right', vertical: 'middle' };
    vc.border = thinBorder;
  });
  R++;

  // Riga vuota
  ws.getRow(R).height = 10; R++;

  // ── Header tabella ────────────────────────────────────────────────────
  ws.getRow(R).height = 18;
  const headers = ['VOCE', 'TOTALE', ...MESI_LABEL];
  headers.forEach((h, i) => {
    const c = ws.getCell(R, i + 1);
    c.value = h;
    c.font = { bold: true, size: 9, color: { argb: `FF${white}` } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${navy}` } };
    c.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
    c.border = thinBorder;
  });
  R++;

  // Tieni traccia delle righe dati per le formule
  const sectionTotaleRows = {};

  // ── Sezioni ───────────────────────────────────────────────────────────
  SEZIONI.forEach(s => {
    const sRows = rows.filter(r => r.sezione === s.key);
    const { hex, label } = s;

    // Header sezione
    ws.getRow(R).height = 16;
    for (let c = 1; c <= NCols; c++) {
      const cell = ws.getCell(R, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${hex}` } };
      cell.border = thinBorder;
      if (c === 1) {
        cell.value = label;
        cell.font = { bold: true, size: 9, color: { argb: `FF${white}` } };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    }
    R++;

    const dataFirstRow = R;
    sRows.forEach((r, idx) => {
      ws.getRow(R).height = 15;
      const alt = idx % 2 === 1;
      const bg = alt ? slate50 : white;

      const nameCell = ws.getCell(R, 1);
      nameCell.value = r.nome;
      nameCell.font = { size: 9, color: { argb: 'FF334155' } };
      nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bg}` } };
      nameCell.alignment = { horizontal: 'left', vertical: 'middle' };
      nameCell.border = thinBorder;

      // Totale riga = SUM(C:N)
      const totCell = ws.getCell(R, 2);
      totCell.value = { formula: `SUM(C${R}:N${R})`, result: r.budget_totale || 0 };
      totCell.numFmt = numFmt;
      totCell.font = { size: 9, color: { argb: 'FF334155' } };
      totCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bg}` } };
      totCell.alignment = { horizontal: 'right', vertical: 'middle' };
      totCell.border = thinBorder;

      MESI.forEach((m, mi) => {
        const mc = ws.getCell(R, 3 + mi);
        mc.value = r[m] || 0;
        mc.numFmt = numFmt;
        mc.font = { size: 9, color: { argb: 'FF334155' } };
        mc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bg}` } };
        mc.alignment = { horizontal: 'right', vertical: 'middle' };
        mc.border = thinBorder;
      });
      R++;
    });
    const dataLastRow = R - 1;

    // Totale sezione
    ws.getRow(R).height = 16;
    const tLabel = ws.getCell(R, 1);
    tLabel.value = `Totale ${label}`;
    tLabel.font = { bold: true, size: 9, color: { argb: 'FF1E293B' } };
    tLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${lightGray}` } };
    tLabel.alignment = { horizontal: 'left', vertical: 'middle' };
    tLabel.border = medBorder;

    if (sRows.length > 0) {
      const totB = ws.getCell(R, 2);
      totB.value = { formula: `SUM(B${dataFirstRow}:B${dataLastRow})`, result: totaleBudget(sRows) };
      totB.numFmt = numFmt; totB.font = { bold: true, size: 9, color: { argb: 'FF1E293B' } };
      totB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${lightGray}` } };
      totB.alignment = { horizontal: 'right', vertical: 'middle' }; totB.border = medBorder;

      MESI.forEach((m, mi) => {
        const colLetter = String.fromCharCode(67 + mi); // C=67
        const mc = ws.getCell(R, 3 + mi);
        mc.value = { formula: `SUM(${colLetter}${dataFirstRow}:${colLetter}${dataLastRow})`, result: sum(sRows, m) };
        mc.numFmt = numFmt; mc.font = { bold: true, size: 9, color: { argb: 'FF1E293B' } };
        mc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${lightGray}` } };
        mc.alignment = { horizontal: 'right', vertical: 'middle' }; mc.border = medBorder;
      });
    } else {
      for (let c = 2; c <= NCols; c++) {
        const mc = ws.getCell(R, c);
        mc.value = 0; mc.numFmt = numFmt;
        mc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${lightGray}` } };
        mc.border = medBorder;
      }
    }

    sectionTotaleRows[s.key] = R;
    R++;

    // Separatore
    ws.getRow(R).height = 6; R++;
  });

  // ── Totale Comunicazione ───────────────────────────────────────────────
  ws.getRow(R).height = 16;
  const rOn  = sectionTotaleRows['comunicazione_online'];
  const rOff = sectionTotaleRows['comunicazione_offline'];
  ws.getCell(R, 1).value = 'TOTALE COMUNICAZIONE';
  ws.getCell(R, 1).font = { bold: true, size: 9, color: { argb: 'FF1E293B' } };
  ws.getCell(R, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${lightGray}` } };
  ws.getCell(R, 1).alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getCell(R, 1).border = medBorder;

  ws.getCell(R, 2).value = { formula: `B${rOn}+B${rOff}`, result: totaleBudget([...rows.filter(r=>r.sezione==='comunicazione_online'),...rows.filter(r=>r.sezione==='comunicazione_offline')]) };
  ws.getCell(R, 2).numFmt = numFmt; ws.getCell(R, 2).font = { bold: true, size: 9, color: { argb: 'FF1E293B' } };
  ws.getCell(R, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${lightGray}` } };
  ws.getCell(R, 2).alignment = { horizontal: 'right', vertical: 'middle' }; ws.getCell(R, 2).border = medBorder;

  MESI.forEach((m, mi) => {
    const cl = String.fromCharCode(67 + mi);
    const commRows = [...rows.filter(r=>r.sezione==='comunicazione_online'),...rows.filter(r=>r.sezione==='comunicazione_offline')];
    ws.getCell(R, 3 + mi).value = { formula: `${cl}${rOn}+${cl}${rOff}`, result: sum(commRows, m) };
    ws.getCell(R, 3 + mi).numFmt = numFmt; ws.getCell(R, 3 + mi).font = { bold: true, size: 9, color: { argb: 'FF1E293B' } };
    ws.getCell(R, 3 + mi).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${lightGray}` } };
    ws.getCell(R, 3 + mi).alignment = { horizontal: 'right', vertical: 'middle' }; ws.getCell(R, 3 + mi).border = medBorder;
  });
  R++;

  // ── TOTALE BUDGET ──────────────────────────────────────────────────────
  ws.getRow(R).height = 22;
  const totRows = SEZIONI.map(s => sectionTotaleRows[s.key]);
  ws.getCell(R, 1).value = 'TOTALE BUDGET';
  ws.getCell(R, 1).font = { bold: true, size: 10, color: { argb: `FF${white}` } };
  ws.getCell(R, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${navy}` } };
  ws.getCell(R, 1).alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getCell(R, 1).border = medBorder;

  ws.getCell(R, 2).value = { formula: totRows.map(r=>`B${r}`).join('+'), result: totaleBudget(rows) };
  ws.getCell(R, 2).numFmt = numFmt; ws.getCell(R, 2).font = { bold: true, size: 10, color: { argb: `FF${white}` } };
  ws.getCell(R, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${navy}` } };
  ws.getCell(R, 2).alignment = { horizontal: 'right', vertical: 'middle' }; ws.getCell(R, 2).border = medBorder;

  MESI.forEach((m, mi) => {
    const cl = String.fromCharCode(67 + mi);
    ws.getCell(R, 3 + mi).value = { formula: totRows.map(r=>`${cl}${r}`).join('+'), result: sum(rows, m) };
    ws.getCell(R, 3 + mi).numFmt = numFmt; ws.getCell(R, 3 + mi).font = { bold: true, size: 10, color: { argb: `FF${white}` } };
    ws.getCell(R, 3 + mi).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${navy}` } };
    ws.getCell(R, 3 + mi).alignment = { horizontal: 'right', vertical: 'middle' }; ws.getCell(R, 3 + mi).border = medBorder;
  });

  // ── Logo nell'header (colonne 13-14, righe 1-2) ────────────────────────
  if (logoUrl) {
    try {
      const { buffer, ext } = await fetchImageBuffer(logoUrl);
      const imgId = wb.addImage({ buffer, extension: ext });
      ws.addImage(imgId, {
        tl: { col: 12, row: 0 },   // colonna 13 (0-indexed=12), riga 1 (0-indexed=0)
        br: { col: 14, row: 2 },   // 2 colonne, 2 righe
        editAs: 'oneCell',
      });
    } catch {}
  }

  // Download
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `marketing_${anno}_${centroNome?.replace(/\s+/g, '_') || 'export'}.xlsx`;
  a.click(); URL.revokeObjectURL(url);
}

// ─── COMPONENTE ────────────────────────────────────────────────────────────
export default function ExportMarketing({ rows, anno, centroNome, centroLogo, budgetSaved }) {
  const [exporting, setExporting] = useState(null);

  const handleExcelExport = async () => {
    setExporting('excel');
    try {
      await exportExcel(rows, anno, centroNome, centroLogo, budgetSaved);
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
        try { logob64 = await fetchImageBase64(centroLogo); } catch {}
      }

      // Header
      doc.setFillColor(30, 58, 95);
      doc.rect(margin, y - 3, pw - margin * 2, 16, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text(`Piano Marketing ${anno}`, margin + 3, y + 7);

      if (logob64) {
        // Logo su 2 "slot" di larghezza, proporzionato
        doc.addImage(logob64, 'PNG', pw - margin - 40, y - 2, 40, 14, '', 'FAST');
      } else {
        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        doc.text(centroNome || '', pw - margin - 3, y + 7, { align: 'right' });
      }
      y += 22;

      // KPI bar
      const consuntivo = totaleBudget(rows);
      const diff = budgetSaved > 0 ? budgetSaved - consuntivo : null;
      const kpiW = (pw - margin * 2) / 3 - 2;
      const drawKpi = (label, val, color, x) => {
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(x, y, kpiW, 12, 2, 2, 'F');
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
        doc.text(label, x + 3, y + 4.5);
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...color);
        doc.text(`€ ${val?.toLocaleString('it-IT') || '–'}`, x + kpiW - 3, y + 9.5, { align: 'right' });
      };
      drawKpi('Budget Pianificato', budgetSaved || 0, [30, 58, 95], margin);
      drawKpi('Consuntivo', consuntivo, [30, 58, 95], margin + kpiW + 2);
      if (diff !== null) drawKpi('Differenza', diff, diff >= 0 ? [22, 163, 74] : [220, 38, 38], margin + (kpiW + 2) * 2);
      y += 18;

      // Tabella
      const col0W = 48, col1W = 16, ROW_H = 5;
      const mesiW = (pw - margin * 2 - col0W - col1W) / 12;

      const drawRow = (cells, bgRgb, fgRgb, bold, fontSize = 7) => {
        if (y + ROW_H > ph - margin) { doc.addPage(); y = margin; }
        const totalW = col0W + col1W + mesiW * 12;
        if (bgRgb) { doc.setFillColor(...bgRgb); doc.rect(margin, y, totalW, ROW_H, 'F'); }
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(fontSize);
        doc.setTextColor(...(fgRgb || [51, 65, 85]));
        cells.forEach((txt, i) => {
          let x, w;
          if (i === 0) { x = margin; w = col0W; }
          else if (i === 1) { x = margin + col0W; w = col1W; }
          else { x = margin + col0W + col1W + (i - 2) * mesiW; w = mesiW; }
          const s = txt !== null && txt !== undefined ? String(txt) : '';
          doc.text(s, i === 0 ? x + 1.5 : x + w - 1, y + ROW_H - 1.2, { align: i === 0 ? 'left' : 'right' });
        });
        doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.1);
        doc.line(margin, y + ROW_H, margin + col0W + col1W + mesiW * 12, y + ROW_H);
        y += ROW_H;
      };

      drawRow(['VOCE', 'TOTALE', ...MESI_LABEL], [30, 58, 95], [255, 255, 255], true);
      SEZIONI.forEach(s => {
        const sRows = rows.filter(r => r.sezione === s.key);
        drawRow([s.label, '', ...MESI.map(() => '')], s.rgb, [255, 255, 255], true);
        sRows.forEach((r, idx) => drawRow([r.nome, fmtN(r.budget_totale), ...MESI.map(m => fmtN(r[m]))], idx % 2 === 1 ? [248, 250, 252] : null, null, false));
        drawRow([`Totale ${s.label}`, fmtN(totaleBudget(sRows)), ...MESI.map(m => fmtN(sum(sRows, m)))], [226, 232, 240], [30, 41, 59], true);
        y += 1.5;
      });
      const commRows = [...rows.filter(r=>r.sezione==='comunicazione_online'),...rows.filter(r=>r.sezione==='comunicazione_offline')];
      drawRow(['TOTALE COMUNICAZIONE', fmtN(totaleBudget(commRows)), ...MESI.map(m => fmtN(sum(commRows, m)))], [226, 232, 240], [30, 41, 59], true);
      drawRow(['TOTALE BUDGET', fmtN(totaleBudget(rows)), ...MESI.map(m => fmtN(sum(rows, m)))], [30, 58, 95], [255, 255, 255], true, 8);

      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
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