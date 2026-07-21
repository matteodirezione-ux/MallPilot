import React, { useState, useMemo } from 'react';
import { differenceInDays, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Pencil, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx-js-style';
import { jsPDF } from 'jspdf';

function SortIcon({ col, sortConfig }) {
  if (sortConfig.key !== col) return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300" />;
  return sortConfig.direction === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
    : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />;
}

export default function TabellaPrenotazioni({ prenotazioni, clienti, spazi, onEdit, onDelete, isVigilanza, centroSelezionato }) {
  const [sortConfig, setSortConfig] = useState({ key: 'data_inizio', direction: 'asc' });
  const annoCorrente = new Date().getFullYear();
  const [annoFiltro, setAnnoFiltro] = useState(annoCorrente);

  const clientiMap = useMemo(() => Object.fromEntries(clienti.map(c => [c.id, c])), [clienti]);
  const spaziMap = useMemo(() => Object.fromEntries(spazi.map(s => [s.id, s])), [spazi]);

  const getNome = (p) => {
    if (p.is_event && p.nome_evento) return p.nome_evento;
    const cliente = clientiMap[p.cliente_id];
    return cliente?.ragione_sociale || cliente?.insegna || '—';
  };

  const getSpazio = (p) => {
    const ids = p.spazi_ids?.length ? p.spazi_ids : [p.spazio_id].filter(Boolean);
    return ids.map(id => spaziMap[id]?.numero_spazio || id).join(', ') || '—';
  };

  const getDurata = (p) => {
    if (!p.data_inizio || !p.data_fine) return 0;
    return differenceInDays(new Date(p.data_fine), new Date(p.data_inizio)) + 1;
  };

  const toggleSort = (key) => {
    setSortConfig(prev =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  };

  // Anni disponibili dai dati
  const anniDisponibili = useMemo(() => {
    const anni = new Set(prenotazioni.map(p => p.data_inizio ? new Date(p.data_inizio).getFullYear() : null).filter(Boolean));
    return [...anni].sort((a, b) => b - a);
  }, [prenotazioni]);

  const filtrate = useMemo(() =>
    prenotazioni.filter(p => {
      if (!p.data_inizio) return false;
      return new Date(p.data_inizio).getFullYear() === annoFiltro;
    }),
  [prenotazioni, annoFiltro]);

  const sorted = useMemo(() => {
    return [...filtrate].sort((a, b) => {
      let va, vb;
      switch (sortConfig.key) {
        case 'nome':      va = getNome(a).toLowerCase(); vb = getNome(b).toLowerCase(); break;
        case 'costo':     va = a.prezzo_totale ?? 0;     vb = b.prezzo_totale ?? 0;     break;
        case 'durata':    va = getDurata(a);              vb = getDurata(b);              break;
        case 'data_inizio': va = a.data_inizio ?? '';    vb = b.data_inizio ?? '';       break;
        case 'stato':     va = a.stato ?? '';             vb = b.stato ?? '';             break;
        default: return 0;
      }
      if (va < vb) return sortConfig.direction === 'asc' ? -1 : 1;
      if (va > vb) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtrate, sortConfig, clientiMap, spaziMap]);

  const statoColor = {
    confermata: 'bg-blue-100 text-blue-700',
    in_corso:   'bg-green-100 text-green-700',
    completata: 'bg-slate-100 text-slate-600',
    cancellata: 'bg-red-100 text-red-600',
  };

  const statoLabel = {
    confermata: 'Confermata',
    in_corso:   'In corso',
    completata: 'Completata',
    cancellata: 'Cancellata',
  };

  const fmtEur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n || 0);

  const getTipo = (p) => p.is_gratuito ? 'Gratuito' : p.is_event ? 'Evento' : 'Affitto';

  const SEZIONI = [
    { tipo: 'Affitto',  label: 'AFFITTI',        bg: 'DBEAFE', headerBg: '1E40AF', headerText: 'FFFFFF' },
    { tipo: 'Evento',   label: 'EVENTI',          bg: 'EDE9FE', headerBg: '6D28D9', headerText: 'FFFFFF' },
    { tipo: 'Gratuito', label: 'SPAZI GRATUITI',  bg: 'D1FAE5', headerBg: '065F46', headerText: 'FFFFFF' },
  ];

  const sortByDate = (arr) => [...arr].sort((a, b) => (a.data_inizio ?? '') < (b.data_inizio ?? '') ? -1 : 1);

  const handleExportExcel = () => {
    const nomeCentro = centroSelezionato?.nome?.toUpperCase() || 'CENTRO';
    const nomeFile = `${nomeCentro}_PRENOTAZIONI_${annoFiltro}`;
    const titolo = `${nomeCentro} - PRENOTAZIONI ${annoFiltro}`;
    const border = { top: { style: 'thin', color: { rgb: '94A3B8' } }, bottom: { style: 'thin', color: { rgb: '94A3B8' } }, left: { style: 'thin', color: { rgb: '94A3B8' } }, right: { style: 'thin', color: { rgb: '94A3B8' } } };
    const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
    const ws = { '!ref': '', '!cols': [{ wch: 38 }, { wch: 14 }, { wch: 14 }, { wch: 9 }, { wch: 16 }, { wch: 20 }] };
    ws['A1'] = { v: titolo, t: 's', s: { font: { bold: true, sz: 14 } } };
    const headers = ['Nome / Cliente', 'Data Inizio', 'Data Fine', 'Durata', 'Costo', 'Spazio'];
    let row = 3;
    let totaleGenerale = 0;

    SEZIONI.forEach(({ tipo, label, bg, headerBg, headerText }) => {
      const items = sortByDate(filtrate.filter(p => getTipo(p) === tipo));
      if (items.length === 0) return;

      // Intestazione sezione
      cols.forEach((col, i) => {
        ws[`${col}${row}`] = {
          v: i === 0 ? label : '',
          t: 's',
          s: { font: { bold: true, sz: 10, color: { rgb: headerText } }, fill: { fgColor: { rgb: headerBg } }, alignment: { horizontal: i === 0 ? 'left' : 'center' }, border },
        };
      });
      row++;

      // Header colonne
      cols.forEach((col, i) => {
        ws[`${col}${row}`] = {
          v: headers[i], t: 's',
          s: { font: { bold: true, sz: 9 }, fill: { fgColor: { rgb: 'E2E8F0' } }, alignment: { horizontal: 'center' }, border },
        };
      });
      row++;

      // Righe dati
      let totaleSez = 0;
      items.forEach(p => {
        totaleSez += p.prezzo_totale || 0;
        const rowStyle = { border, fill: { fgColor: { rgb: bg } } };
        const rowData = [
          { v: getNome(p), t: 's' },
          { v: p.data_inizio ? format(new Date(p.data_inizio), 'dd/MM/yyyy') : '—', t: 's' },
          { v: p.data_fine ? format(new Date(p.data_fine), 'dd/MM/yyyy') : '—', t: 's' },
          { v: getDurata(p) + ' gg', t: 's' },
          p.prezzo_totale != null ? { v: p.prezzo_totale, t: 'n', z: '€ #,##0.00' } : { v: '—', t: 's' },
          { v: getSpazio(p), t: 's' },
        ];
        cols.forEach((col, ci) => { ws[`${col}${row}`] = { ...rowData[ci], s: rowStyle }; });
        row++;
      });

      // Totale sezione
      const sezStyle = { font: { bold: true, sz: 9 }, fill: { fgColor: { rgb: 'E2E8F0' } }, border };
      ws[`A${row}`] = { v: `Totale ${label.toLowerCase()}`, t: 's', s: { ...sezStyle, alignment: { horizontal: 'left' } } };
      ['B', 'C', 'D', 'F'].forEach(c => { ws[`${c}${row}`] = { v: '', t: 's', s: sezStyle }; });
      ws[`E${row}`] = { v: totaleSez, t: 'n', z: '€ #,##0.00', s: { ...sezStyle, font: { ...sezStyle.font, color: { rgb: '1E3A5F' } }, alignment: { horizontal: 'right' } } };
      totaleGenerale += totaleSez;
      row += 2; // riga vuota tra sezioni
    });

    ws['!ref'] = `A1:F${row - 2}`;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Prenotazioni');
    XLSX.writeFile(wb, `${nomeFile}.xlsx`);
  };

  const handleExportPDF = async () => {
    const nomeCentro = centroSelezionato?.nome || 'Centro';
    const nomeFile = `${nomeCentro.toUpperCase()}_PRENOTAZIONI_${annoFiltro}`;
    const logoUrl = centroSelezionato?.logo_url;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    if (logoUrl) {
      await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const maxH = 14; const ratio = img.width / img.height;
          const imgW = Math.min(maxH * ratio, 48);
          doc.addImage(img, 'PNG', pageW - imgW - 10, 7, imgW, maxH);
          resolve();
        };
        img.onerror = resolve;
        img.src = logoUrl;
      });
    }

    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text(`${nomeCentro.toUpperCase()} — PRENOTAZIONI ${annoFiltro}`, 14, 15);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text(`Generato il ${format(new Date(), 'dd/MM/yyyy')}`, 14, 21);
    doc.setTextColor(0, 0, 0);

    // colonne: Nome, Data Inizio, Data Fine, Durata, Costo, Spazio
    const colWidths = [74, 24, 24, 18, 30, 60];
    const colHeaders = ['Nome / Cliente', 'Data Inizio', 'Data Fine', 'Durata', 'Costo', 'Spazio'];
    const totalW = colWidths.reduce((a, b) => a + b, 0);
    const startX = 14;
    const rowH = 7;

    // Palette PDF per sezioni
    const sezPDF = {
      Affitto:  { bg: [219, 234, 254], header: [30, 64, 175], label: 'AFFITTI' },
      Evento:   { bg: [237, 233, 254], header: [109, 40, 217], label: 'EVENTI' },
      Gratuito: { bg: [209, 250, 229], header: [6, 95, 70],  label: 'SPAZI GRATUITI' },
    };

    const checkPage = (y) => {
      if (y + rowH > pageH - 10) { doc.addPage(); return 14; }
      return y;
    };

    const drawCell = (doc, text, cx, y, w, bg, textColor, align = 'left', bold = false) => {
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(cx, y, w, rowH, 'F');
      doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.2);
      doc.rect(cx, y, w, rowH, 'S');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      const padding = 2;
      const textX = align === 'right' ? cx + w - padding : align === 'center' ? cx + w / 2 : cx + padding;
      const truncated = doc.splitTextToSize(String(text ?? ''), w - padding * 2)[0] || '';
      doc.text(truncated, textX, y + rowH * 0.65, { align });
    };

    let y = 27;
    let totaleGenerale = 0;

    for (const { tipo, label, bg, headerBg } of [
      { tipo: 'Affitto',  label: 'AFFITTI',       bg: sezPDF.Affitto.bg,  headerBg: sezPDF.Affitto.header },
      { tipo: 'Evento',   label: 'EVENTI',         bg: sezPDF.Evento.bg,   headerBg: sezPDF.Evento.header },
      { tipo: 'Gratuito', label: 'SPAZI GRATUITI', bg: sezPDF.Gratuito.bg, headerBg: sezPDF.Gratuito.header },
    ]) {
      const items = sortByDate(filtrate.filter(p => getTipo(p) === tipo));
      if (items.length === 0) continue;

      // Riga intestazione sezione
      y = checkPage(y);
      let cx = startX;
      colWidths.forEach((w, i) => {
        drawCell(doc, i === 0 ? label : '', cx, y, w, headerBg, [255, 255, 255], i === 0 ? 'left' : 'center', true);
        cx += w;
      });
      y += rowH;

      // Header colonne
      y = checkPage(y);
      cx = startX;
      colHeaders.forEach((h, i) => {
        drawCell(doc, h, cx, y, colWidths[i], [226, 232, 240], [30, 58, 95], 'center', true);
        cx += colWidths[i];
      });
      y += rowH;

      // Righe dati
      let totaleSez = 0;
      items.forEach((p) => {
        y = checkPage(y);
        totaleSez += p.prezzo_totale || 0;
        const cells = [
          getNome(p),
          p.data_inizio ? format(new Date(p.data_inizio), 'dd/MM/yyyy') : '—',
          p.data_fine   ? format(new Date(p.data_fine),   'dd/MM/yyyy') : '—',
          getDurata(p) + ' gg',
          p.prezzo_totale != null ? fmtEur(p.prezzo_totale) : '—',
          getSpazio(p),
        ];
        cx = startX;
        cells.forEach((text, i) => {
          const isNum = i === 4;
          const isCenter = i === 3;
          drawCell(doc, text, cx, y, colWidths[i], bg, [40, 40, 40], isNum ? 'right' : isCenter ? 'center' : 'left');
          cx += colWidths[i];
        });
        y += rowH;
      });

      // Totale sezione
      y = checkPage(y);
      cx = startX;
      colWidths.forEach((w, i) => {
        if (i === 0) drawCell(doc, `Totale ${label.toLowerCase()}`, cx, y, w, [226, 232, 240], [30, 58, 95], 'left', true);
        else if (i === 4) drawCell(doc, fmtEur(totaleSez), cx, y, w, [226, 232, 240], [30, 58, 95], 'right', true);
        else drawCell(doc, '', cx, y, w, [226, 232, 240], [30, 58, 95]);
        cx += w;
      });
      totaleGenerale += totaleSez;
      y += rowH + 4; // spazio tra sezioni
    }

    doc.save(`${nomeFile}.pdf`);
  };

  const Th = ({ col, label }) => (
    <th
      className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 cursor-pointer select-none whitespace-nowrap hover:text-slate-700"
      onClick={() => toggleSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        <SortIcon col={col} sortConfig={sortConfig} />
      </span>
    </th>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm font-semibold text-slate-700">{sorted.length} prenotazioni</p>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button size="sm" variant="outline" onClick={handleExportExcel} className="border-slate-300 h-8 text-xs">
            <Download className="w-3.5 h-3.5 mr-1" /> Excel
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportPDF} className="border-slate-300 h-8 text-xs">
            <Download className="w-3.5 h-3.5 mr-1" /> PDF
          </Button>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAnnoFiltro(a => a - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-bold text-slate-800 min-w-[44px] text-center">{annoFiltro}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAnnoFiltro(a => a + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 whitespace-nowrap">Tipo</th>
              <Th col="nome"       label="Nome / Cliente" />
              <Th col="data_inizio" label="Data inizio" />
              <Th col="durata"     label="Durata" />
              <Th col="costo"      label="Costo" />
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 whitespace-nowrap">Spazio</th>
              <Th col="stato"      label="Stato" />
              {!isVigilanza && <th className="py-2.5 px-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={isVigilanza ? 7 : 8} className="py-10 text-center text-slate-400 text-sm">
                  Nessuna prenotazione trovata
                </td>
              </tr>
            ) : sorted.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-2.5 px-3 whitespace-nowrap">
                  {p.is_gratuito ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold uppercase">Gratuito</span>
                  ) : p.is_event ? (
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold uppercase">Evento</span>
                  ) : (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold uppercase">Affitto</span>
                  )}
                </td>
                <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[220px]">
                  <span className="truncate block">{getNome(p)}</span>
                </td>
                <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                  {p.data_inizio ? format(new Date(p.data_inizio), 'd MMM yyyy', { locale: it }) : '—'}
                </td>
                <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                  {getDurata(p)} gg
                </td>
                <td className="py-2.5 px-3 text-slate-700 font-semibold whitespace-nowrap">
                  {p.prezzo_totale != null
                    ? '€ ' + p.prezzo_totale.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '—'}
                </td>
                <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{getSpazio(p)}</td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statoColor[p.stato] || 'bg-slate-100 text-slate-600'}`}>
                    {statoLabel[p.stato] || p.stato}
                  </span>
                </td>
                {!isVigilanza && (
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => onEdit(p)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => onDelete(p.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}