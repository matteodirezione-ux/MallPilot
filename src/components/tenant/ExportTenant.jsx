import React from 'react';
import * as XLSX from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { format } from 'date-fns';

const parseLocalDate = (s) => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

function buildColumns(canViewContractDetails) {
  const base = [
    { key: 'numero_negozio', label: 'N. Negozio', wch: 10, pdfW: 16 },
    { key: 'insegna', label: 'Insegna', wch: 22, pdfW: 38 },
    { key: 'ragione_sociale', label: 'Ragione Sociale', wch: 36, pdfW: 60 },
    { key: 'telefono', label: 'Telefono', wch: 14, pdfW: 22 },
    { key: 'reperibile', label: 'Reperibile', wch: 24, pdfW: 36 },
    { key: 'capoarea_resp_commerciale', label: 'Capoarea/Resp. Comm.', wch: 24, pdfW: 36 },
    { key: 'mail_urgenze_pv_chiuso', label: 'Mail Urgenze P.V. Chiuso', wch: 26, pdfW: 38 },
    { key: 'referente_tecnico', label: 'Referente Tecnico', wch: 24, pdfW: 36 },
    { key: 'indirizzo_ufficio_marketing', label: 'Indirizzo Uff. Marketing', wch: 24, pdfW: 36 },
    { key: 'pec', label: 'PEC', wch: 24, pdfW: 36 },
    { key: 'macchina_condizionamento_esterna', label: 'Macchina Esterna', wch: 22, pdfW: 32 },
    { key: 'macchina_condizionamento_interna', label: 'Macchina Interna', wch: 22, pdfW: 32 },
    { key: 'note', label: 'Note', wch: 24, pdfW: 36 },
  ];
  if (canViewContractDetails) {
    base.push(
      { key: 'data_inizio_contratto', label: 'Inizio Contratto', wch: 13, pdfW: 20, isDate: true },
      { key: 'data_scadenza_contratto', label: 'Scadenza Contratto', wch: 13, pdfW: 20, isDate: true },
      { key: 'canone', label: 'Canone Fisso', wch: 12, pdfW: 18, isEur: true },
      { key: 'canone_variabile', label: 'Canone Variabile', wch: 12, pdfW: 18, isEur: true },
      { key: 'note_contratto', label: 'Note Contratto', wch: 24, pdfW: 36 },
    );
  }
  return base;
}

const fmtEur = (n) => (n != null && !isNaN(n)) ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n) : '';
const fmtDate = (s) => { const d = parseLocalDate(s); return d ? format(d, 'dd/MM/yyyy') : ''; };

export default function ExportTenant({ tenants, centroSelezionato, canViewContractDetails }) {
  if (!tenants || tenants.length === 0) return null;

  const nomeCentro = centroSelezionato?.nome?.toUpperCase() || 'CENTRO';
  const logoUrl = centroSelezionato?.logo_url;
  const columns = buildColumns(canViewContractDetails);

  const handleExportExcel = () => {
    const nomeFile = `${nomeCentro}_TENANT`;
    const titolo = `${nomeCentro} - ANAGRAFICA TENANT`;
    const borderStyle = {
      top: { style: 'thin', color: { rgb: '94A3B8' } },
      bottom: { style: 'thin', color: { rgb: '94A3B8' } },
      left: { style: 'thin', color: { rgb: '94A3B8' } },
      right: { style: 'thin', color: { rgb: '94A3B8' } },
    };

    const ws = { '!ref': '', '!cols': columns.map(c => ({ wch: c.wch })) };
    ws['A1'] = { v: titolo, t: 's', s: { font: { bold: true, sz: 14 } } };

    // Intestazioni (riga 3)
    columns.forEach((col, i) => {
      const cellRef = XLSX.utils.encode_cell({ r: 2, c: i });
      ws[cellRef] = {
        v: col.label,
        t: 's',
        s: { font: { bold: true }, fill: { fgColor: { rgb: 'E2E8F0' } }, alignment: { horizontal: 'center' }, border: borderStyle },
      };
    });

    // Righe dati
    tenants.forEach((t, idx) => {
      const row = idx + 3;
      columns.forEach((col, ci) => {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: ci });
        let val = t[col.key] ?? '';
        if (col.isDate) val = fmtDate(t[col.key]);
        if (col.isEur) val = (t[col.key] != null && !isNaN(t[col.key])) ? t[col.key] : '';
        ws[cellRef] = {
          v: val,
          t: col.isEur ? 'n' : 's',
          ...(col.isEur ? { z: '€ #,##0.00' } : {}),
          s: { border: borderStyle },
        };
      });
    });

    ws['!ref'] = `A1:${XLSX.utils.encode_cell({ r: tenants.length + 2, c: columns.length - 1 })}`;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TENANT');
    XLSX.writeFile(wb, `${nomeFile}.xlsx`);
  };

  const handleExportPDF = async () => {
    const nomeFile = `${nomeCentro}_TENANT`;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Logo
    if (logoUrl) {
      await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const maxH = 14;
          const ratio = img.width / img.height;
          const imgW = Math.min(maxH * ratio, 48);
          doc.addImage(img, 'PNG', pageW - imgW - 10, 7, imgW, maxH);
          resolve();
        };
        img.onerror = resolve;
        img.src = logoUrl;
      });
    }

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`${nomeCentro} — ANAGRAFICA TENANT`, 14, 15);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text(`Generato il ${format(new Date(), 'dd/MM/yyyy')} — ${tenants.length} tenant`, 14, 21);
    doc.setTextColor(0, 0, 0);

    const colWidths = columns.map(c => c.pdfW);
    const totalW = colWidths.reduce((a, b) => a + b, 0);
    const startX = Math.max(10, (pageW - totalW) / 2);
    const rowH = 6;
    let y = 27;

    // Header
    doc.setFont('helvetica', 'bold');
    let hx = startX;
    columns.forEach((col, i) => {
      const w = colWidths[i];
      doc.setFillColor(30, 58, 95);
      doc.rect(hx, y, w, rowH, 'F');
      doc.setDrawColor(20, 40, 70);
      doc.setLineWidth(0.2);
      doc.rect(hx, y, w, rowH, 'S');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6.5);
      const truncated = doc.splitTextToSize(col.label, w - 2)[0] || '';
      doc.text(truncated, hx + w / 2, y + rowH * 0.65, { align: 'center' });
      hx += w;
    });
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    y += rowH;

    // Data rows
    tenants.forEach((t) => {
      if (y + rowH > pageH - 10) {
        doc.addPage();
        y = 14;
      }
      let cx = startX;
      columns.forEach((col, i) => {
        const w = colWidths[i];
        doc.setFillColor(255, 255, 255);
        doc.rect(cx, y, w, rowH, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.15);
        doc.rect(cx, y, w, rowH, 'S');
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(6);
        let val = t[col.key] ?? '';
        if (col.isDate) val = fmtDate(t[col.key]);
        if (col.isEur) val = fmtEur(t[col.key]);
        const truncated = doc.splitTextToSize(String(val ?? ''), w - 2)[0] || '';
        doc.text(truncated, cx + 1.5, y + rowH * 0.65, { align: 'left' });
        cx += w;
      });
      y += rowH;
    });

    doc.save(`${nomeFile}.pdf`);
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={handleExportExcel} className="border-slate-300">
        <Download className="w-4 h-4 mr-1" /> Excel
      </Button>
      <Button size="sm" variant="outline" onClick={handleExportPDF} className="border-slate-300">
        <Download className="w-4 h-4 mr-1" /> PDF
      </Button>
    </>
  );
}