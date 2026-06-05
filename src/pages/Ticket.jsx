import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Ticket as TicketIcon, AlertCircle, CheckCircle2, Clock, XCircle, ChevronLeft, ChevronRight, Wrench, Eye, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import ImageLightbox from '@/components/ui/ImageLightbox';
import SafeImage from '@/components/ui/SafeImage';
import FormTicket from '@/components/tickets/FormTicket';
import TicketList, { STATI_CONFIG, TIPOLOGIA_CONFIG } from '@/components/tickets/TicketList';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';

const formatData = (d) => {
  if (!d) return '-';
  try { return format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy'); } catch { return d; }
};

// Dialog dettaglio completo (read-only view)
function DettaglioTicketDialog({ ticket, onClose, onEdit, userRole }) {
  const [lightbox, setLightbox] = useState(null);
  if (!ticket) return null;
  const stConf = STATI_CONFIG[ticket.stato] || {};
  const tipConf = TIPOLOGIA_CONFIG[ticket.tipologia] || {};
  const isDirettore = userRole === 'direttore' || userRole === 'proprieta';

  const Row = ({ label, value }) => value ? (
    <div className="flex flex-col sm:flex-row sm:gap-3 py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide sm:w-40 shrink-0">{label}</span>
      <span className="text-sm text-slate-800 mt-0.5 sm:mt-0">{value}</span>
    </div>
  ) : null;

  const allUrls = [...(ticket.foto_urls || []), ...(ticket.allegati_manutentore || [])];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle>Ticket #{ticket.numero_ticket}</DialogTitle>
            {onEdit && (
              <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                Modifica
              </button>
            )}
          </div>
          <div className="flex gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${tipConf.color}`}>{tipConf.label}</span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${stConf.color}`}>{stConf.label}</span>
          </div>
        </DialogHeader>
        <div className="divide-y divide-slate-100">
          <Row label="Operatore" value={ticket.operatore} />
          <Row label="Data apertura" value={formatData(ticket.data_apertura)} />
          <Row label="Scadenza" value={formatData(ticket.scadenza)} />
          {ticket.numero_sollecito > 0 && <Row label="Sollecito" value={`Sollecito ${ticket.numero_sollecito}`} />}
          <Row label="Descrizione" value={ticket.descrizione} />
          {ticket.note_manutentore && <Row label="Note manutentore" value={ticket.note_manutentore} />}
          {ticket.costo_stimato && userRole !== 'vigilanza' && <Row label="Preventivo" value={`€ ${Number(ticket.costo_stimato).toLocaleString('it-IT')}`} />}
          {ticket.motivo_rifiuto && <Row label="Motivo rifiuto" value={ticket.motivo_rifiuto} />}
        </div>
        {allUrls.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Foto / Allegati</p>
            <div className="flex gap-2 flex-wrap">
              {allUrls.map((url, i) => (
                <SafeImage key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-80" onClick={() => setLightbox(i)} />
              ))}
            </div>
          </div>
        )}
        {lightbox !== null && <ImageLightbox urls={allUrls} startIndex={lightbox} onClose={() => setLightbox(null)} />}
      </DialogContent>
    </Dialog>
  );
}

// Dialog per azioni con input opzionale (rifiuto, ecc.)
function AzioneDialog({ open, onClose, title, placeholder, onConfirm, confirmLabel = 'Conferma', confirmClass = 'bg-blue-600 hover:bg-blue-700' }) {
  const [testo, setTesto] = useState('');
  useEffect(() => { if (open) setTesto(''); }, [open]);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {placeholder && (
          <Textarea value={testo} onChange={e => setTesto(e.target.value)} placeholder={placeholder} rows={3} className="text-sm" />
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Annulla</Button>
          <Button size="sm" className={confirmClass} onClick={() => onConfirm(testo)}>{confirmLabel}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Ticket({ centroSelezionato, user }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [ticketSelezionato, setTicketSelezionato] = useState(null);
  const [dettaglioTicket, setDettaglioTicket] = useState(null);
  const [search, setSearch] = useState('');
  const [filtroStato, setFiltroStato] = useState('attivi');
  const [meseFiltrato, setMeseFiltrato] = useState(new Date());
  const [azioneDialog, setAzioneDialog] = useState(null); // { ticket, tipo }
  const [mapCentri, setMapCentri] = useState({}); // { id: nome }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId && tickets.length > 0) {
      const t = tickets.find(t => t.id === editId);
      if (t) { setTicketSelezionato(t); setFormOpen(true); window.history.replaceState({}, '', window.location.pathname); }
    }
  }, [tickets]);

  useEffect(() => {
    base44.entities.CentroCommerciale.list().then(centri => {
      const map = {};
      centri.forEach(c => { map[c.id] = c.nome; });
      setMapCentri(map);
    });
  }, []);

  useEffect(() => {
    if (centroSelezionato || user?.tipo_account === 'manutentore') loadTickets();
  }, [centroSelezionato, user]);

  const loadTickets = async () => {
    setLoading(true);
    let query = {};
    if (centroSelezionato?.id && centroSelezionato.id !== 'tutti') query.centro_id = centroSelezionato.id;
    const data = await base44.entities.Ticket.filter(query, '-created_date');
    setTickets(data);
    setLoading(false);
  };

  const handleSave = async (formData) => {
    const data = { ...formData, centro_id: centroSelezionato?.id !== 'tutti' ? centroSelezionato?.id : '' };
    if (ticketSelezionato) {
      await base44.entities.Ticket.update(ticketSelezionato.id, data);
    } else {
      await base44.entities.Ticket.create(data);
    }
    setFormOpen(false);
    setTicketSelezionato(null);
    loadTickets();
  };

  const handleEdit = (ticket) => {
    setDettaglioTicket(null);
    setTicketSelezionato(ticket);
    setFormOpen(true);
  };

  const handleDelete = async (ticket) => {
    if (!confirm('Eliminare questo ticket?')) return;
    await base44.entities.Ticket.delete(ticket.id);
    loadTickets();
  };

  const handleAzione = (ticket, tipo) => {
    if (tipo === 'rifiuta' || tipo === 'rifiuta_preventivo') {
      setAzioneDialog({ ticket, tipo });
    } else {
      eseguiAzione(ticket, tipo, '');
    }
  };

  const eseguiAzione = async (ticket, tipo, testo) => {
    let update = {};
    if (tipo === 'rifiuta') update = { stato: 'rifiutato', motivo_rifiuto: testo };
    else if (tipo.startsWith('set_stato:')) update = { stato: tipo.split(':')[1] };
    else if (tipo.startsWith('sollecito:')) update = { numero_sollecito: Number(tipo.split(':')[1]) };

    if (!Object.keys(update).length) return;
    await base44.entities.Ticket.update(ticket.id, update);
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, ...update } : t));

    // Crea automaticamente un controllo quando il ticket viene messo "da_controllare"
    if (update.stato === 'da_controllare') {
      const oggi = new Date().toISOString().split('T')[0];
      await base44.entities.Manutenzione.create({
        titolo: `Controllare ticket n. ${ticket.numero_ticket}`,
        descrizione: ticket.descrizione || '',
        centro_id: ticket.centro_id || '',
        data_scadenza: oggi,
        stato: 'da_fare',
      });
    }

    // Notifica ai manutentori per approvazione o richiesta preventivo
    if (update.stato === 'approvato' || update.stato === 'approvato_con_preventivo') {
      const isPreventivo = update.stato === 'approvato_con_preventivo';
      const titolo = isPreventivo
        ? `Richiesta preventivo: ticket n. ${ticket.numero_ticket}`
        : `Ticket approvato: n. ${ticket.numero_ticket}`;
      const messaggio = isPreventivo
        ? `È richiesto un preventivo per il ticket n. ${ticket.numero_ticket}: ${ticket.descrizione || ''}`
        : `Il ticket n. ${ticket.numero_ticket} è stato approvato ed è pronto per l'intervento: ${ticket.descrizione || ''}`;

      const manutentori = await base44.entities.Manutentore.list();
      const notifiche = manutentori.map(m => ({
        destinatario_email: m.email,
        tipo: 'ticket',
        titolo,
        messaggio,
        centro_id: ticket.centro_id || '',
        entity_id: ticket.id,
        letta: false,
      }));
      if (notifiche.length > 0) await base44.entities.Notifica.bulkCreate(notifiche);
    }

    setAzioneDialog(null);
  };

  const esportaExcel = () => {
    // Filtra solo chiusi del mese selezionato, ordinati per data apertura crescente
    const chiusi = tickets
      .filter(t => {
        if (t.stato !== 'chiuso') return false;
        const d = t.data_apertura ? new Date(t.data_apertura + 'T00:00:00') : null;
        return d && d >= inizio && d <= fine;
      })
      .sort((a, b) => {
        const da = a.data_apertura ? new Date(a.data_apertura) : 0;
        const db = b.data_apertura ? new Date(b.data_apertura) : 0;
        return da - db;
      });

    const headers = ['Numero Ticket', 'Giorno Apertura', 'Giorno Chiusura', 'Descrizione', 'Importo (€)'];
    const colLetters = ['A', 'B', 'C', 'D', 'E'];

    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
      fill: { fgColor: { rgb: '1E3A5F' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: 'AAAAAA' } },
        bottom: { style: 'thin', color: { rgb: 'AAAAAA' } },
        left: { style: 'thin', color: { rgb: 'AAAAAA' } },
        right: { style: 'thin', color: { rgb: 'AAAAAA' } },
      }
    };

    const cellStyle = (isEven) => ({
      font: { sz: 10 },
      fill: { fgColor: { rgb: isEven ? 'EBF3FB' : 'FFFFFF' } },
      alignment: { vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: 'DDDDDD' } },
        bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
        left: { style: 'thin', color: { rgb: 'DDDDDD' } },
        right: { style: 'thin', color: { rgb: 'DDDDDD' } },
      }
    });

    const totalStyle = {
      font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E3A5F' } },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: {
        top: { style: 'medium', color: { rgb: '1E3A5F' } },
        bottom: { style: 'medium', color: { rgb: '1E3A5F' } },
        left: { style: 'thin', color: { rgb: '1E3A5F' } },
        right: { style: 'thin', color: { rgb: '1E3A5F' } },
      }
    };

    const ws = {};

    // Riga 1: Nome centro
    const centroDalTicket = chiusi[0]?.centro_id ? mapCentri[chiusi[0].centro_id] : null;
    const nomeCentro = (centroSelezionato?.id && centroSelezionato.id !== 'tutti')
      ? (centroSelezionato.nome || centroDalTicket || 'Centro Commerciale')
      : (centroDalTicket || 'Centro Commerciale');
    const titoloCentroStyle = {
      font: { bold: true, sz: 13, color: { rgb: '1E3A5F' } },
      alignment: { horizontal: 'left', vertical: 'center' },
    };
    ws['A1'] = { v: nomeCentro, s: titoloCentroStyle };
    ws['B1'] = { v: '', s: {} };
    ws['C1'] = { v: '', s: {} };
    ws['D1'] = { v: '', s: {} };
    ws['E1'] = { v: '', s: {} };

    // Riga 2: Data scaricamento e periodo
    const dataOggi = format(new Date(), 'dd/MM/yyyy', { locale: it });
    const periodoMese = format(meseFiltrato, 'MMMM yyyy', { locale: it });
    const subtitoloStyle = {
      font: { sz: 10, color: { rgb: '666666' }, italic: true },
      alignment: { horizontal: 'left', vertical: 'center' },
    };
    ws['A2'] = { v: `Periodo: ${periodoMese}  |  Scaricato il: ${dataOggi}`, s: subtitoloStyle };
    ws['B2'] = { v: '', s: {} };
    ws['C2'] = { v: '', s: {} };
    ws['D2'] = { v: '', s: {} };
    ws['E2'] = { v: '', s: {} };

    // Riga 3: vuota
    ws['A3'] = { v: '', s: {} };

    // Intestazioni riga 4
    headers.forEach((h, i) => {
      ws[`${colLetters[i]}4`] = { v: h, s: headerStyle };
    });

    // Dati dalla riga 5
    chiusi.forEach((t, idx) => {
      const row = idx + 5;
      const isEven = idx % 2 === 1;
      const s = cellStyle(isEven);
      const importo = t.costo_stimato ? Number(t.costo_stimato) : 0;
      ws[`A${row}`] = { v: t.numero_ticket || '', s };
      ws[`B${row}`] = { v: formatData(t.data_apertura), s: { ...s, alignment: { ...s.alignment, horizontal: 'center' } } };
      ws[`C${row}`] = { v: formatData(t.updated_date ? t.updated_date.split('T')[0] : t.scadenza), s: { ...s, alignment: { ...s.alignment, horizontal: 'center' } } };
      ws[`D${row}`] = { v: t.descrizione || '', s };
      ws[`E${row}`] = { v: importo, s: { ...s, alignment: { ...s.alignment, horizontal: 'right' }, numFmt: '€ #,##0.00' } };
    });

    // Riga totale (dati iniziano alla riga 5, quindi: 5 + chiusi.length)
    const totaleRow = chiusi.length + 5;
    const totale = chiusi.reduce((acc, t) => acc + (t.costo_stimato ? Number(t.costo_stimato) : 0), 0);
    ['A', 'B', 'C'].forEach(col => { ws[`${col}${totaleRow}`] = { v: '', s: totalStyle }; });
    ws[`D${totaleRow}`] = { v: 'TOTALE', s: { ...totalStyle, alignment: { horizontal: 'right', vertical: 'center' } } };
    ws[`E${totaleRow}`] = { v: totale, s: { ...totalStyle, numFmt: '€ #,##0.00' } };

    ws['!ref'] = `A1:E${totaleRow}`;
    ws['!cols'] = [
      { wch: 16 },  // Numero Ticket
      { wch: 20 },  // Giorno Apertura
      { wch: 20 },  // Giorno Chiusura
      { wch: 65 },  // Descrizione
      { wch: 16 },  // Importo
    ];
    ws['!rows'] = [
      { hpt: 24 }, // nome centro
      { hpt: 18 }, // data scaricamento
      { hpt: 10 }, // vuota
      { hpt: 28 }, // header
      ...chiusi.map(() => ({ hpt: 36 })),
      { hpt: 28 }  // totale
    ];
    // Unisci celle per il titolo e sottotitolo
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // riga 1
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // riga 2
    ];

    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, 'Ticket Chiusi');
    XLSXStyle.writeFile(wb, `ticket_chiusi_${format(meseFiltrato, 'yyyy-MM')}.xlsx`);
  };

  const userRole = user?.tipo_account;
  const isManutentore = userRole === 'manutentore';
  const isDirettore = userRole === 'direttore' || userRole === 'proprieta';
  const canCreate = isDirettore || userRole === 'vigilanza';

  const oggi = new Date(); oggi.setHours(0, 0, 0, 0);
  const inizio = startOfMonth(meseFiltrato);
  const fine = endOfMonth(meseFiltrato);

  // Filtro visibilità per manutentore
  const ticketsVisibili = isManutentore
    ? tickets.filter(t => ['approvato', 'approvato_con_preventivo', 'preventivo_inserito', 'da_controllare', 'chiuso', 'rifiutato'].includes(t.stato))
    : tickets;

  const filtered = ticketsVisibili.filter(t => {
    const matchSearch = !search ||
      t.numero_ticket?.toLowerCase().includes(search.toLowerCase()) ||
      t.operatore?.toLowerCase().includes(search.toLowerCase()) ||
      t.descrizione?.toLowerCase().includes(search.toLowerCase());

    const dataFiltro = t.scadenza ? new Date(t.scadenza + 'T00:00:00') : (t.data_apertura ? new Date(t.data_apertura + 'T00:00:00') : null);
    const matchMese = dataFiltro && dataFiltro >= inizio && dataFiltro <= fine;

    let matchStato = true;
    if (filtroStato === 'attivi') matchStato = !['chiuso', 'rifiutato'].includes(t.stato);
    else if (filtroStato === 'chiuso') matchStato = t.stato === 'chiuso';
    else if (filtroStato === 'rifiutato') matchStato = t.stato === 'rifiutato';
    else if (filtroStato !== 'tutti') matchStato = t.stato === filtroStato;

    return matchSearch && matchMese && matchStato;
  });

  // KPI sul totale del mese
  const ticketsMese = ticketsVisibili.filter(t => {
    const d = t.scadenza ? new Date(t.scadenza + 'T00:00:00') : (t.data_apertura ? new Date(t.data_apertura + 'T00:00:00') : null);
    return d && d >= inizio && d <= fine;
  });
  const counts = {
    attesa: ticketsMese.filter(t => ['in_attesa_approvazione', 'preventivo_inserito'].includes(t.stato)).length,
    approvati: ticketsMese.filter(t => ['approvato', 'approvato_con_preventivo', 'preventivo_inserito'].includes(t.stato)).length,
    daControllare: ticketsMese.filter(t => t.stato === 'da_controllare').length,
    chiusi: ticketsMese.filter(t => t.stato === 'chiuso').length,
    urgenti: ticketsMese.filter(t => t.tipologia === 'urgente' && t.stato !== 'chiuso').length,
  };

  const filtriStato = [
    { key: 'attivi', label: 'Attivi', activeClass: 'bg-blue-600 text-white', inactiveClass: 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50' },
    { key: 'chiuso', label: 'Chiusi', activeClass: 'bg-green-600 text-white', inactiveClass: 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50' },
    { key: 'rifiutato', label: 'Rifiutati', activeClass: 'bg-red-600 text-white', inactiveClass: 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50' },
  ];

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ticket Manutenzione</h1>
          <p className="text-sm text-slate-500 mt-0.5">{isManutentore ? 'I tuoi ticket assegnati' : 'Gestione ticket manutenzione'}</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative md:hidden">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca..." className="pl-9 h-9 text-sm w-36" />
          </div>
          {(userRole === 'proprieta' || userRole === 'direttore' || userRole === 'manutentore') && (
            <Button variant="outline" onClick={esportaExcel} className="gap-2">
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Esporta Chiusi</span>
            </Button>
          )}
          {canCreate && (
            <Button onClick={() => { setTicketSelezionato(null); setFormOpen(true); }} className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="w-4 h-4" /> Nuovo Ticket
            </Button>
          )}
        </div>
      </div>

      {/* KPI */}
      {!isManutentore && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-1">
          {[
            { icon: Clock, color: 'bg-slate-100', iconColor: 'text-slate-600', value: counts.attesa, label: 'In attesa' },
            { icon: CheckCircle2, color: 'bg-blue-100', iconColor: 'text-blue-600', value: counts.approvati, label: 'Approvati' },
            { icon: Eye, color: 'bg-orange-100', iconColor: 'text-orange-600', value: counts.daControllare, label: 'Da controllare' },
            { icon: CheckCircle2, color: 'bg-green-100', iconColor: 'text-green-600', value: counts.chiusi, label: 'Chiusi' },
            { icon: AlertCircle, color: 'bg-red-100', iconColor: 'text-red-600', value: counts.urgenti, label: 'Urgenti aperti' },
          ].map(({ icon: Icon, color, iconColor, value, label }) => (
            <div key={label} className="bg-white/80 backdrop-blur-sm rounded-xl border border-white p-4 flex items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
              <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtri */}
      <div className="flex flex-wrap gap-2 mb-2">
        <div className="relative flex-1 min-w-48 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca ticket..." className="pl-9 h-9 text-sm" />
        </div>

        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 flex-shrink-0">
            <button onClick={() => setMeseFiltrato(d => new Date(d.getFullYear(), d.getMonth() - 1))} className="p-1.5 hover:bg-slate-100 rounded transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-sm font-medium text-slate-700 min-w-max">
              {format(meseFiltrato, 'MMMM yyyy', { locale: it })}
            </span>
            <button onClick={() => setMeseFiltrato(d => new Date(d.getFullYear(), d.getMonth() + 1))} className="p-1.5 hover:bg-slate-100 rounded transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
          {/* Tendina su mobile */}
          <select
            value={filtroStato}
            onChange={e => setFiltroStato(e.target.value)}
            className="md:hidden h-9 text-sm border border-slate-200 rounded-lg px-2 bg-white text-slate-700 flex-shrink-0 cursor-pointer"
          >
            {filtriStato.map(f => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
          {/* Bottoni su desktop */}
          <div className="hidden md:flex gap-1">
            {filtriStato.map(f => (
              <button
                key={f.key}
                onClick={() => setFiltroStato(f.key)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filtroStato === f.key ? f.activeClass : f.inactiveClass}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <TicketIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nessun ticket trovato</p>
        </div>
      ) : (
        <TicketList
          filtered={filtered}
          oggi={oggi}
          userRole={userRole}
          onCardClick={setDettaglioTicket}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAzione={handleAzione}
        />
      )}

      {/* Dialog dettaglio */}
      {dettaglioTicket && (
        <DettaglioTicketDialog
          ticket={dettaglioTicket}
          onClose={() => setDettaglioTicket(null)}
          onEdit={canCreate ? () => handleEdit(dettaglioTicket) : null}
          userRole={userRole}
        />
      )}

      {/* Dialog azione (rifiuto) */}
      {azioneDialog && (
        <AzioneDialog
          open
          onClose={() => setAzioneDialog(null)}
          title={azioneDialog.tipo === 'rifiuta' ? 'Rifiuta ticket' : 'Rifiuta preventivo'}
          placeholder="Motivo del rifiuto (opzionale)..."
          confirmLabel="Rifiuta"
          confirmClass="bg-red-600 hover:bg-red-700 text-white"
          onConfirm={(testo) => eseguiAzione(azioneDialog.ticket, azioneDialog.tipo, testo)}
        />
      )}

      <FormTicket
        open={formOpen}
        onClose={() => { setFormOpen(false); setTicketSelezionato(null); }}
        onSave={handleSave}
        ticket={ticketSelezionato}
        user={user}
      />
    </div>
  );
}