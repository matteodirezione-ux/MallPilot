import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, Search, ChevronLeft, ChevronRight, Pencil, Trash2, List, Calendar, X, Download, FileText
} from 'lucide-react';
import ImageLightbox from '@/components/ui/ImageLightbox';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isWithinInterval, addDays, subDays } from 'date-fns';
import { it } from 'date-fns/locale';
import FormCapex from '@/components/capex/FormCapex';

const STATO_CONFIG = {
  da_proporre:    { label: 'Da proporre',   color: 'bg-white text-slate-600 border-slate-300' },
  da_pianificare: { label: 'Da pianificare', color: 'bg-red-100 text-red-700 border-red-200' },
  pianificato:    { label: 'Pianificato',    color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  completato:     { label: 'Completato',     color: 'bg-green-100 text-green-700 border-green-200' },
};

const CATEGORIA_CONFIG = {
  strutturale: { label: 'Strutturale', color: 'bg-orange-100 text-orange-700' },
  impiantistico: { label: 'Impiantistico', color: 'bg-cyan-100 text-cyan-700' },
  tecnologico: { label: 'Tecnologico', color: 'bg-purple-100 text-purple-700' },
  estetico: { label: 'Estetico', color: 'bg-pink-100 text-pink-700' },
  sicurezza: { label: 'Sicurezza', color: 'bg-red-100 text-red-700' },
  altro: { label: 'Altro', color: 'bg-slate-100 text-slate-700' },
};

const fmt = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n || 0);

const parseLocalDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

export default function CapexPage({ centroSelezionato, user }) {
  const [capexList, setCapexList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('lista');
  const [search, setSearch] = useState('');
  const [filterStato, setFilterStato] = useState('tutti');
  const [filterCategoria, setFilterCategoria] = useState('tutti');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [dettaglio, setDettaglio] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [annoSelezionato, setAnnoSelezionato] = useState(new Date().getFullYear());
  const [lightbox, setLightbox] = useState(null);

  const isVigilanza = user?.tipo_account === 'vigilanza';
  const canEdit = !isVigilanza;

  const handleExportPDF = async () => {
    const nomeCentro = centroSelezionato?.nome || 'Centro';
    const nomeFile = `${nomeCentro.toUpperCase()}_CAPEX_${annoSelezionato}`;
    const logoUrl = centroSelezionato?.logo_url;
    const fmtEur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth(); // 297mm

    // --- Logo in alto a destra ---
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

    // --- Titolo ---
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`${nomeCentro.toUpperCase()} — CAPEX ${annoSelezionato}`, 14, 15);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text(`Generato il ${format(new Date(), 'dd/MM/yyyy')}`, 14, 21);
    doc.setTextColor(0, 0, 0);

    // --- Tabella ---
    const colWidths = [90, 28, 24, 24, 28, 28, 28]; // totale ~250mm su 270 usabili
    const headers  = ['Descrizione', 'Stato', 'Data Inizio', 'Data Fine', 'Budget', 'Effettivo', 'Scostamento'];
    const rowH = 7;
    const startX = 14;
    let y = 27;

    const statoColors = {
      da_proporre:    { r: 255, g: 255, b: 255 },
      da_pianificare: { r: 254, g: 226, b: 226 },
      pianificato:    { r: 254, g: 249, b: 195 },
      completato:     { r: 220, g: 252, b: 231 },
    };

    // Funzione helper per disegnare una riga
    const drawRow = (cells, rowY, bg, textColor) => {
      let x = startX;
      cells.forEach((text, i) => {
        const w = colWidths[i];
        // Sfondo cella
        doc.setFillColor(bg.r, bg.g, bg.b);
        doc.rect(x, rowY, w, rowH, 'F');
        // Bordo
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.2);
        doc.rect(x, rowY, w, rowH, 'S');
        // Testo
        if (textColor) doc.setTextColor(textColor.r, textColor.g, textColor.b);
        doc.setFontSize(7.5);
        // Allineamento: numeri a destra per colonne 4-6
        const isNum = i >= 4;
        const isCenter = i === 1 || i === 2 || i === 3;
        const padding = 2;
        const textX = isNum ? x + w - padding : isCenter ? x + w / 2 : x + padding;
        const align = isNum ? 'right' : isCenter ? 'center' : 'left';
        const truncated = doc.splitTextToSize(String(text ?? ''), w - padding * 2)[0] || '';
        doc.text(truncated, textX, rowY + rowH * 0.65, { align });
        if (textColor) doc.setTextColor(0, 0, 0);
        x += w;
      });
    };

    // Header row
    doc.setFont('helvetica', 'bold');
    let hx = startX;
    headers.forEach((h, i) => {
      const w = colWidths[i];
      doc.setFillColor(30, 58, 95);
      doc.rect(hx, y, w, rowH, 'F');
      doc.setDrawColor(20, 40, 70);
      doc.setLineWidth(0.2);
      doc.rect(hx, y, w, rowH, 'S');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.text(h, hx + w / 2, y + rowH * 0.65, { align: 'center' });
      hx += w;
    });
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    y += rowH;

    // Data rows
    capexAnno.forEach((c) => {
      const bg = statoColors[c.stato] || { r: 255, g: 255, b: 255 };
      const scost = (c.costo_effettivo || 0) - (c.costo_previsto || 0);
      const scostColor = scost > 0 ? { r: 185, g: 28, b: 28 } : scost < 0 ? { r: 21, g: 128, b: 61 } : null;

      const cells = [
        c.titolo || '',
        STATO_CONFIG[c.stato]?.label || c.stato || '',
        c.data_inizio ? format(parseLocalDate(c.data_inizio), 'dd/MM/yyyy') : '—',
        c.data_fine   ? format(parseLocalDate(c.data_fine),   'dd/MM/yyyy') : '—',
        c.costo_previsto  != null ? fmtEur(c.costo_previsto)  : '—',
        c.costo_effettivo != null ? fmtEur(c.costo_effettivo) : '—',
        (c.costo_effettivo != null || c.costo_previsto != null) ? fmtEur(scost) : '—',
      ];

      // Nuova pagina se necessario
      if (y + rowH > doc.internal.pageSize.getHeight() - 10) {
        doc.addPage();
        y = 14;
      }

      // Disegna le prime 6 celle normalmente, la 7a con colore testo scostamento
      let cx = startX;
      cells.forEach((text, i) => {
        const w = colWidths[i];
        doc.setFillColor(bg.r, bg.g, bg.b);
        doc.rect(cx, y, w, rowH, 'F');
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.2);
        doc.rect(cx, y, w, rowH, 'S');
        const color = (i === 6 && scostColor) ? scostColor : { r: 40, g: 40, b: 40 };
        doc.setTextColor(color.r, color.g, color.b);
        doc.setFontSize(7.5);
        const isNum = i >= 4;
        const isCenter = i === 1 || i === 2 || i === 3;
        const padding = 2;
        const textX = isNum ? cx + w - padding : isCenter ? cx + w / 2 : cx + padding;
        const align = isNum ? 'right' : isCenter ? 'center' : 'left';
        const truncated = doc.splitTextToSize(String(text ?? ''), w - padding * 2)[0] || '';
        doc.text(truncated, textX, y + rowH * 0.65, { align });
        cx += w;
      });
      doc.setTextColor(0, 0, 0);
      y += rowH;
    });

    doc.save(`${nomeFile}.pdf`);
  };

  const handleExport = () => {
    const nomeCentro = centroSelezionato?.nome?.toUpperCase() || 'CENTRO';
    const nomeFile = `${nomeCentro}_CAPEX_${annoSelezionato}`;
    const titolo = `${nomeCentro} - CAPEX ${annoSelezionato}`;

    const borderStyle = {
      top:    { style: 'thin', color: { rgb: '94A3B8' } },
      bottom: { style: 'thin', color: { rgb: '94A3B8' } },
      left:   { style: 'thin', color: { rgb: '94A3B8' } },
      right:  { style: 'thin', color: { rgb: '94A3B8' } },
    };

    const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

    // Costruisci dati come array di celle con stile
    const ws = {
      '!ref': '',
      '!cols': [
        { wch: 60 }, // Descrizione
        { wch: 15 }, // Stato
        { wch: 10 }, // Data Inizio
        { wch: 10 }, // Data Fine
        { wch: 10 }, // Budget
        { wch: 10 }, // Effettivo
        { wch: 10 }, // Scostamento
      ],
    };

    // Riga 1: titolo
    ws['A1'] = { v: titolo, t: 's', s: { font: { bold: true, sz: 14 } } };

    // Riga 2: vuota (skip)

    // Riga 3: intestazioni
    const headers = ['Descrizione', 'Stato', 'Data Inizio', 'Data Fine', 'Budget', 'Effettivo', 'Scostamento'];
    cols.forEach((col, i) => {
      ws[`${col}3`] = {
        v: headers[i],
        t: 's',
        s: {
          font: { bold: true },
          fill: { fgColor: { rgb: 'E2E8F0' } },
          alignment: { horizontal: 'center' },
          border: borderStyle,
        },
      };
    });

    // Colori di sfondo per stato (hex senza #)
    const statoBgColor = {
      da_proporre:    'FFFFFF', // bianco
      da_pianificare: 'FEE2E2', // rosso chiaro
      pianificato:    'FEF9C3', // giallo chiaro
      completato:     'DCFCE7', // verde chiaro
    };

    // Righe dati (da riga 4)
    capexAnno.forEach((c, idx) => {
      const row = idx + 4;
      const bgColor = statoBgColor[c.stato] || 'FFFFFF';
      const rowStyle = { border: borderStyle, fill: { fgColor: { rgb: bgColor } } };

      const rowData = [
        { v: c.titolo || '', t: 's' },
        { v: STATO_CONFIG[c.stato]?.label || c.stato || '', t: 's' },
        { v: c.data_inizio ? format(parseLocalDate(c.data_inizio), 'dd/MM/yyyy') : '—', t: 's' },
        { v: c.data_fine ? format(parseLocalDate(c.data_fine), 'dd/MM/yyyy') : '—', t: 's' },
        c.costo_previsto != null
          ? { v: c.costo_previsto, t: 'n', z: '€ #,##0' }
          : { v: '', t: 's' },
        c.costo_effettivo != null
          ? { v: c.costo_effettivo, t: 'n', z: '€ #,##0' }
          : { v: '', t: 's' },
        (c.costo_effettivo != null || c.costo_previsto != null)
          ? { v: (c.costo_effettivo || 0) - (c.costo_previsto || 0), t: 'n', z: '€ #,##0' }
          : { v: '', t: 's' },
      ];
      cols.forEach((col, ci) => {
        ws[`${col}${row}`] = { ...rowData[ci], s: rowStyle };
      });
    });

    const lastRow = capexAnno.length + 3;
    ws['!ref'] = `A1:G${lastRow}`;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CAPEX');
    XLSX.writeFile(wb, `${nomeFile}.xlsx`);
  };

  useEffect(() => {
    if (centroSelezionato?.id) loadCapex();
  }, [centroSelezionato]);

  const loadCapex = async () => {
    setLoading(true);
    const data = centroSelezionato.id === 'tutti'
      ? await base44.entities.Capex.list()
      : await base44.entities.Capex.filter({ centro_id: centroSelezionato.id });
    setCapexList(data);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questo Capex?')) return;
    await base44.entities.Capex.delete(id);
    loadCapex();
  };

  const handleSave = () => {
    setShowForm(false);
    setEditing(null);
    loadCapex();
  };

  const annoCorrente = new Date().getFullYear();

  // Capex dell'anno selezionato — la lista usa anno_capex (con fallback a data_inizio per retrocompatibilità)
  const capexAnno = capexList.filter(c => {
    const anno = c.anno_capex || (c.data_inizio ? parseInt(c.data_inizio.substring(0, 4)) : null);
    return anno === annoSelezionato;
  });

  const STATO_ORDER = { da_proporre: 3, da_pianificare: 2, pianificato: 1, completato: 0 };

  const filtered = capexAnno.filter(c => {
    const matchSearch = !search || c.titolo?.toLowerCase().includes(search.toLowerCase()) || c.descrizione?.toLowerCase().includes(search.toLowerCase());
    const matchStato = filterStato === 'tutti' || c.stato === filterStato;
    const matchCat = filterCategoria === 'tutti' || c.categoria === filterCategoria;
    return matchSearch && matchStato && matchCat;
  }).sort((a, b) => {
    const orderDiff = (STATO_ORDER[a.stato] ?? 3) - (STATO_ORDER[b.stato] ?? 3);
    if (orderDiff !== 0) return orderDiff;
    if (a.data_inizio && b.data_inizio) return new Date(a.data_inizio) - new Date(b.data_inizio);
    if (a.data_inizio) return -1;
    if (b.data_inizio) return 1;
    return 0;
  });

  // Riepilogo costi (solo per non-vigilanza) - solo anno selezionato
  const totalePrevisto = capexAnno.reduce((s, c) => s + (c.costo_previsto || 0), 0);
  const totaleEffettivo = capexAnno.reduce((s, c) => s + (c.costo_effettivo || 0), 0);

  // Calendario mensile - usa tutti i capex con date programmate (non solo quell'anno)
  const giorni = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const capexProgrammati = capexList.filter(c => c.stato !== 'da_pianificare' && c.data_inizio);
  const capexPerGiorno = (giorno) => capexProgrammati.filter(c => {
    const inizio = parseLocalDate(c.data_inizio);
    const fine = c.data_fine ? parseLocalDate(c.data_fine) : inizio;
    return isWithinInterval(giorno, { start: inizio, end: fine });
  });

  if (!centroSelezionato?.id) {
    return <div className="p-8 text-center text-slate-500">Seleziona un centro commerciale</div>;
  }

  return (
    <div className="p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Capex</h1>
          <p className="text-slate-500 text-sm">{centroSelezionato?.nome}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
           {/* Navigatore Anno */}
           <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
             <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAnnoSelezionato(a => a - 1)}>
               <ChevronLeft className="w-4 h-4" />
             </Button>
             <span className="text-sm font-bold text-slate-800 min-w-[44px] text-center">{annoSelezionato}</span>
             <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAnnoSelezionato(a => a + 1)} disabled={false}>
               <ChevronRight className="w-4 h-4" />
             </Button>
           </div>
           <Button size="sm" variant="outline" onClick={handleExport} className="border-slate-300">
             <Download className="w-4 h-4 mr-1" /> Excel
           </Button>
           <Button size="sm" variant="outline" onClick={handleExportPDF} className="border-slate-300">
             <Download className="w-4 h-4 mr-1" /> PDF
           </Button>
           {canEdit && (
             <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700">
               <Plus className="w-4 h-4 mr-1" /> Nuovo Capex
             </Button>
           )}
         </div>
      </div>

      {/* KPI Cards - solo per non vigilanza */}
      {!isVigilanza && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Totale Capex', value: capexAnno.length, cls: 'text-slate-800' },
            { label: 'Costo Previsto', value: fmt(totalePrevisto), cls: 'text-blue-700' },
            { label: 'Costo Effettivo', value: fmt(totaleEffettivo), cls: 'text-green-700' },
            { label: 'Scostamento', value: fmt(totaleEffettivo - totalePrevisto), cls: totaleEffettivo > totalePrevisto ? 'text-red-600' : 'text-green-600' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="bg-white/80 backdrop-blur-sm rounded-xl border border-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]">
              <p className="text-xs text-slate-500 uppercase font-medium mb-1">{label}</p>
              <p className={`text-xl font-bold ${cls}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtri */}
       <div className="flex flex-wrap gap-2 mb-4">
         <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
           <button
             onClick={() => setView('lista')}
             className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
               view === 'lista' 
                 ? 'bg-background text-foreground shadow' 
                 : 'text-muted-foreground'
             }`}
           >
             <List className="w-4 h-4" />
             <span className="hidden sm:inline">Lista</span>
           </button>
           <button
             onClick={() => setView('calendario')}
             className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
               view === 'calendario' 
                 ? 'bg-background text-foreground shadow' 
                 : 'text-muted-foreground'
             }`}
           >
             <Calendar className="w-4 h-4" />
             <span className="hidden sm:inline">Calendario</span>
           </button>
         </div>
         <div className="relative flex-1 min-w-[160px]">
           <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
           <Input className="pl-8" placeholder="Cerca..." value={search} onChange={e => setSearch(e.target.value)} />
         </div>
         <Select value={filterStato} onValueChange={setFilterStato}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Stato" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti gli stati</SelectItem>
            <SelectItem value="da_proporre">Da proporre</SelectItem>
            <SelectItem value="da_pianificare">Da pianificare</SelectItem>
            <SelectItem value="pianificato">Pianificato</SelectItem>
            <SelectItem value="completato">Completato</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutte le categorie</SelectItem>
            <SelectItem value="strutturale">Strutturale</SelectItem>
            <SelectItem value="impiantistico">Impiantistico</SelectItem>
            <SelectItem value="tecnologico">Tecnologico</SelectItem>
            <SelectItem value="estetico">Estetico</SelectItem>
            <SelectItem value="sicurezza">Sicurezza</SelectItem>
            <SelectItem value="altro">Altro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vista Lista */}
      {view === 'lista' && (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Caricamento...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">Nessun Capex trovato</div>
          ) : filtered.map(c => {
            const cardBg = c.stato === 'completato' ? 'bg-green-50 border-green-50' : c.stato === 'pianificato' ? 'bg-yellow-50 border-yellow-50' : c.stato === 'da_proporre' ? 'bg-white border-slate-200' : 'bg-red-50 border-red-50';
            const missingDuvri = c.stato === 'pianificato' && (!c.duvri_urls || c.duvri_urls.length === 0) && !c.cse;
            return (
            <div key={c.id} className={`rounded-xl border p-4 cursor-pointer transition-all duration-200
              shadow-[0_4px_20px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.08)]
              hover:shadow-[0_12px_36px_rgba(0,0,0,0.18),0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5
              ${cardBg}`} onClick={() => setDettaglio(c)}>
              {missingDuvri && (
                <div className="bg-red-500 text-white px-3 py-1 font-bold text-xs mb-2 rounded">
                  ⚠️ DUVRI MANCANTE
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-800 text-sm sm:text-base">{c.titolo}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATO_CONFIG[c.stato]?.color}`}>
                      {STATO_CONFIG[c.stato]?.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORIA_CONFIG[c.categoria]?.color}`}>
                      {CATEGORIA_CONFIG[c.categoria]?.label}
                    </span>
                  </div>
                  {c.descrizione && <p className="text-xs text-slate-500 truncate mb-2">{c.descrizione}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>📅 Anno: <strong>{c.anno_capex || (c.data_inizio ? c.data_inizio.substring(0,4) : '—')}</strong></span>
                    {c.stato !== 'da_pianificare' && c.data_inizio && (
                      <span>🔧 Intervento: {format(parseLocalDate(c.data_inizio), 'dd MMM yyyy', { locale: it })}{c.data_fine ? ` → ${format(parseLocalDate(c.data_fine), 'dd MMM yyyy', { locale: it })}` : ''}</span>
                    )}
                    {c.fornitore && <span>🏢 {c.fornitore}</span>}
                    {!isVigilanza && c.costo_previsto && <span>💰 Prev: <strong>{fmt(c.costo_previsto)}</strong></span>}
                    {!isVigilanza && c.costo_effettivo && <span>✅ Eff: <strong>{fmt(c.costo_effettivo)}</strong></span>}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(c); setShowForm(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Vista Calendario */}
      {view === 'calendario' && (
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-slate-800">
                {format(currentMonth, 'MMMM yyyy', { locale: it })}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Oggi</Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(g => (
                <div key={g} className="text-center text-xs font-semibold text-slate-500 py-2">{g}</div>
              ))}
              {/* Padding giorni precedenti */}
              {Array.from({ length: (giorni[0]?.getDay() + 6) % 7 }).map((_, i, arr) => (
                <div key={`pre-${i}`} className="min-h-20 bg-slate-50 rounded-lg border border-slate-100 opacity-40 p-1">
                  <div className="text-xs text-slate-300">{format(subDays(giorni[0], arr.length - i), 'd')}</div>
                </div>
              ))}
              {giorni.map(giorno => {
                const items = capexPerGiorno(giorno);
                const isToday = isSameDay(giorno, new Date());
                return (
                  <div key={format(giorno, 'yyyy-MM-dd')} className={`min-h-20 p-1.5 rounded-lg border ${isToday ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200'}`}>
                    <div className={`text-xs font-bold mb-1 ${isToday ? 'text-red-600' : 'text-slate-700'}`}>{format(giorno, 'd')}</div>
                    <div className="space-y-0.5">
                      {items.map(c => (
                        <div
                          key={c.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 font-medium ${STATO_CONFIG[c.stato]?.color || 'bg-blue-100 text-blue-700'}`}
                          onClick={() => setDettaglio(c)}
                        >
                          {c.titolo}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {/* Padding giorni successivi */}
              {(() => {
                const ultimo = giorni[giorni.length - 1];
                const pad = (7 - (ultimo?.getDay() + 6) % 7 - 1) % 7;
                return Array.from({ length: pad }).map((_, i) => (
                  <div key={`post-${i}`} className="min-h-20 bg-slate-50 rounded-lg border border-slate-100 opacity-40 p-1">
                    <div className="text-xs text-slate-300">{format(addDays(ultimo, i + 1), 'd')}</div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog Dettaglio */}
      {dettaglio && (
        <Dialog open={!!dettaglio} onOpenChange={() => setDettaglio(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{dettaglio.titolo}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATO_CONFIG[dettaglio.stato]?.color}`}>
                  {STATO_CONFIG[dettaglio.stato]?.label}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORIA_CONFIG[dettaglio.categoria]?.color}`}>
                  {CATEGORIA_CONFIG[dettaglio.categoria]?.label}
                </span>
              </div>
              {dettaglio.descrizione && <p className="text-sm text-slate-600">{dettaglio.descrizione}</p>}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-400 font-medium">Anno Capex</p><p className="font-medium">{dettaglio.anno_capex || (dettaglio.data_inizio ? dettaglio.data_inizio.substring(0,4) : '—')}</p></div>
                {dettaglio.stato !== 'da_pianificare' && dettaglio.data_inizio && <div><p className="text-xs text-slate-400 font-medium">Data inizio intervento</p><p className="font-medium">{format(parseLocalDate(dettaglio.data_inizio), 'dd MMM yyyy', { locale: it })}</p></div>}
                {dettaglio.stato !== 'da_pianificare' && dettaglio.data_fine && <div><p className="text-xs text-slate-400 font-medium">Data fine intervento</p><p className="font-medium">{format(parseLocalDate(dettaglio.data_fine), 'dd MMM yyyy', { locale: it })}</p></div>}
                {dettaglio.fornitore && <div><p className="text-xs text-slate-400 font-medium">Fornitore</p><p className="font-medium">{dettaglio.fornitore}</p></div>}
                {!isVigilanza && dettaglio.costo_previsto && <div><p className="text-xs text-slate-400 font-medium">Costo previsto</p><p className="font-medium text-blue-700">{fmt(dettaglio.costo_previsto)}</p></div>}
                {!isVigilanza && dettaglio.costo_effettivo && <div><p className="text-xs text-slate-400 font-medium">Costo effettivo</p><p className="font-medium text-green-700">{fmt(dettaglio.costo_effettivo)}</p></div>}
              </div>
              {dettaglio.note && <div><p className="text-xs text-slate-400 font-medium mb-1">Note</p><p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">{dettaglio.note}</p></div>}

              {(dettaglio.duvri_urls?.length > 0 || dettaglio.cse) && (
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-2">DUVRI</p>
                  <div className="flex flex-wrap gap-2">
                    {dettaglio.cse && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-semibold">✓ CSE presente</span>
                    )}
                    {dettaglio.duvri_urls?.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded hover:underline">📄 DUVRI {i + 1}</a>
                    ))}
                  </div>
                </div>
              )}

              {dettaglio.lavoratori?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-2">Lavoratori</p>
                  <div className="space-y-1">
                    {dettaglio.lavoratori.map((lav, i) => (
                      <p key={i} className="text-sm text-slate-600">{lav.nome} {lav.mansione && `(${lav.mansione})`}</p>
                    ))}
                  </div>
                </div>
              )}

              {dettaglio.dpi?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-2">DPI</p>
                  <div className="flex flex-wrap gap-2">
                    {dettaglio.dpi.map((dpi, i) => (
                      <span key={i} className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded">✓ {dpi}</span>
                    ))}
                  </div>
                </div>
              )}

              {dettaglio.allegati_urls?.length > 0 && (() => {
                const imgs = dettaglio.allegati_urls.filter(u => u.match(/\.(jpg|jpeg|png|gif|webp)$/i));
                const docs = dettaglio.allegati_urls.filter(u => !u.match(/\.(jpg|jpeg|png|gif|webp)$/i));
                return (
                  <div className="space-y-3">
                    {imgs.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 font-medium mb-2">Foto</p>
                        <div className="flex flex-wrap gap-2">
                          {imgs.map((url, i) => (
                            <img key={i} src={url} className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setLightbox({ urls: imgs, index: i })} />
                          ))}
                        </div>
                      </div>
                    )}
                    {docs.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 font-medium mb-2">Documenti</p>
                        <div className="flex flex-wrap gap-2">
                          {docs.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded hover:underline">📎 Allegato {i + 1}</a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              {canEdit && (
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => { setDettaglio(null); setEditing(dettaglio); setShowForm(true); }}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Modifica
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => { handleDelete(dettaglio.id); setDettaglio(null); }}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Elimina
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Lightbox */}
      {lightbox && <ImageLightbox urls={lightbox.urls} startIndex={lightbox.index} onClose={() => setLightbox(null)} />}

      {/* Form Capex */}
      <FormCapex
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        capex={editing}
        centroId={centroSelezionato?.id}
        onSave={handleSave}
      />
    </div>
  );
}