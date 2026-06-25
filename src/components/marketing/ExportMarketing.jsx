import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const MESI_LABEL = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];

const sum = (rows, mese) => rows.reduce((acc, r) => acc + (r[mese] || 0), 0);
const totaleBudget = (rows) => rows.reduce((acc, r) => acc + (r.budget_totale || 0), 0);
const fmtN = (v) => v ? v.toLocaleString('it-IT') : '';

const SEZIONI = [
  { key: 'iniziativa', label: 'INIZIATIVE' },
  { key: 'comunicazione_online', label: 'COMUNICAZIONE ONLINE' },
  { key: 'comunicazione_offline', label: 'COMUNICAZIONE OFFLINE' },
  { key: 'costo_fisso', label: 'COSTI FISSI' },
];

function buildTableData(rows, anno, centroNome, budgetSaved) {
  const sections = SEZIONI.map(s => ({
    ...s,
    rows: rows.filter(r => r.sezione === s.key)
  }));

  const data = [];
  // Intestazione
  data.push([`Piano Marketing ${anno} - ${centroNome}`, '', ...MESI_LABEL.map(() => '')]);
  data.push(['']);
  data.push(['VOCE', 'TOTALE', ...MESI_LABEL]);

  sections.forEach(s => {
    data.push([s.label, '', ...MESI.map(() => '')]);
    s.rows.forEach(r => {
      data.push([r.nome, r.budget_totale || 0, ...MESI.map(m => r[m] || 0)]);
    });
    // Totale sezione
    data.push([`Totale ${s.label}`, totaleBudget(s.rows), ...MESI.map(m => sum(s.rows, m))]);
    data.push(['']);
  });

  // Totale comunicazione
  const commRows = [...rows.filter(r => r.sezione === 'comunicazione_online'), ...rows.filter(r => r.sezione === 'comunicazione_offline')];
  data.push(['TOTALE COMUNICAZIONE', totaleBudget(commRows), ...MESI.map(m => sum(commRows, m))]);
  data.push(['TOTALE BUDGET', totaleBudget(rows), ...MESI.map(m => sum(rows, m))]);
  if (budgetSaved > 0) {
    data.push(['Budget Pianificato', budgetSaved, ...MESI.map(() => '')]);
    data.push(['Differenza', budgetSaved - totaleBudget(rows), ...MESI.map(() => '')]);
  }

  return data;
}

export default function ExportMarketing({ rows, anno, centroNome, budgetSaved }) {
  const [exporting, setExporting] = useState(false);

  const handleExcelExport = () => {
    setExporting(true);
    try {
      const data = buildTableData(rows, anno, centroNome, budgetSaved);
      const ws = XLSX.utils.aoa_to_sheet(data);

      // Larghezze colonne
      ws['!cols'] = [{ wch: 36 }, { wch: 14 }, ...MESI.map(() => ({ wch: 10 }))];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Marketing ${anno}`);
      XLSX.writeFile(wb, `marketing_${anno}_${centroNome?.replace(/\s+/g, '_') || 'export'}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const handlePdfExport = () => {
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 10;
      let y = margin;

      // Titolo
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Piano Marketing ${anno} - ${centroNome || ''}`, margin, y);
      y += 8;

      // KPI
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const consuntivo = totaleBudget(rows);
      doc.text(`Consuntivo: € ${consuntivo.toLocaleString('it-IT')}`, margin, y);
      if (budgetSaved > 0) {
        doc.text(`Budget: € ${budgetSaved.toLocaleString('it-IT')}   Differenza: € ${(budgetSaved - consuntivo).toLocaleString('it-IT')}`, margin + 60, y);
      }
      y += 8;

      const colW = [50, 18, ...MESI.map(() => 14)];
      const rowH = 5;
      const headers = ['VOCE', 'TOTALE', ...MESI_LABEL];

      const drawRow = (cells, bg, textColor, bold) => {
        if (y + rowH > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
        let x = margin;
        if (bg) {
          doc.setFillColor(...bg);
          doc.rect(x, y - rowH + 1, colW.reduce((a, b) => a + b, 0), rowH, 'F');
        }
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...(textColor || [30, 30, 30]));
        cells.forEach((cell, i) => {
          const txt = cell !== null && cell !== undefined ? String(cell) : '';
          const align = i === 0 ? 'left' : 'right';
          if (align === 'right') {
            doc.text(txt, x + colW[i] - 1, y, { align: 'right' });
          } else {
            doc.text(txt, x + 1, y);
          }
          x += colW[i];
        });
        y += rowH;
      };

      const sectionColors = {
        iniziativa: [59, 130, 246],
        comunicazione_online: [16, 185, 129],
        comunicazione_offline: [217, 119, 6],
        costo_fisso: [225, 29, 72],
      };

      // Header tabella
      drawRow(headers, [71, 85, 105], [255, 255, 255], true);

      SEZIONI.forEach(s => {
        const sRows = rows.filter(r => r.sezione === s.key);
        const bg = sectionColors[s.key];
        drawRow([s.label, '', ...MESI.map(() => '')], bg, [255, 255, 255], true);
        sRows.forEach(r => {
          drawRow([r.nome, fmtN(r.budget_totale), ...MESI.map(m => fmtN(r[m]))], null, null, false);
        });
        drawRow([`Totale ${s.label}`, fmtN(totaleBudget(sRows)), ...MESI.map(m => fmtN(sum(sRows, m)))], [241, 245, 249], null, true);
      });

      const commRows = [...rows.filter(r => r.sezione === 'comunicazione_online'), ...rows.filter(r => r.sezione === 'comunicazione_offline')];
      drawRow(['TOTALE COMUNICAZIONE', fmtN(totaleBudget(commRows)), ...MESI.map(m => fmtN(sum(commRows, m)))], [226, 232, 240], null, true);
      drawRow(['TOTALE BUDGET', fmtN(totaleBudget(rows)), ...MESI.map(m => fmtN(sum(rows, m)))], [203, 213, 225], null, true);

      doc.save(`marketing_${anno}_${centroNome?.replace(/\s+/g, '_') || 'export'}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleExcelExport} disabled={exporting} className="flex items-center gap-1.5">
        <FileSpreadsheet className="w-4 h-4 text-green-600" />
        <span className="hidden sm:inline">Excel</span>
      </Button>
      <Button variant="outline" size="sm" onClick={handlePdfExport} disabled={exporting} className="flex items-center gap-1.5">
        <FileText className="w-4 h-4 text-red-600" />
        <span className="hidden sm:inline">PDF</span>
      </Button>
    </div>
  );
}