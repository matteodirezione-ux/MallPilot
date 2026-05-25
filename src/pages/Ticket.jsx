import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Ticket as TicketIcon, AlertCircle, CheckCircle2, Pencil, Trash2, X, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ImageLightbox from '@/components/ui/ImageLightbox';
import FormTicket from '@/components/tickets/FormTicket';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';

const statoConfig = {
  aperto: { label: 'Aperto', color: 'bg-blue-100 text-blue-700' },
  chiuso: { label: 'Chiuso', color: 'bg-green-100 text-green-700' },
};

const tipologiaConfig = {
  ordinario: { label: 'Ordinario', color: 'bg-slate-100 text-slate-600' },
  urgente: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
};

const formatData = (d) => {
  if (!d) return '-';
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: it }); } catch { return d; }
};

function DettaglioTicketDialog({ ticket, onClose, onEdit, canConfirm }) {
  const [lightbox, setLightbox] = useState(null);
  const tipConf = tipologiaConfig[ticket.tipologia] || tipologiaConfig.ordinario;
  const stConf = statoConfig[ticket.stato] || statoConfig.aperto;

  const Row = ({ label, value }) => value ? (
    <div className="flex flex-col sm:flex-row sm:gap-3 py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide sm:w-36 shrink-0">{label}</span>
      <span className="text-sm text-slate-800 mt-0.5 sm:mt-0">{value}</span>
    </div>
  ) : null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle>Ticket #{ticket.numero_ticket}</DialogTitle>
            {onEdit && (
              <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Modifica
              </button>
            )}
          </div>
        </DialogHeader>
        <div className="divide-y divide-slate-100">
          <Row label="Operatore" value={ticket.operatore} />
          <Row label="Tipologia" value={<Badge className={tipConf.color}>{tipConf.label}</Badge>} />
          <Row label="Stato" value={<Badge className={stConf.color}>{stConf.label}</Badge>} />
          {canConfirm && (
            <Row label="Conferma Direttore" value={
              ticket.confermato
                ? <span className="inline-flex items-center gap-1 text-green-700 font-medium"><ShieldCheck className="w-4 h-4" /> Confermato</span>
                : <span className="inline-flex items-center gap-1 text-amber-700 font-medium"><ShieldAlert className="w-4 h-4" /> Da confermare</span>
            } />
          )}
          <Row label="Data apertura" value={formatData(ticket.data_apertura)} />
          <Row label="Scadenza" value={formatData(ticket.scadenza)} />
          {ticket.numero_sollecito > 0 && <Row label="Sollecito" value={`Sollecito ${ticket.numero_sollecito}`} />}
          <Row label="Descrizione" value={ticket.descrizione} />
        </div>
        {ticket.foto_urls?.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Foto</p>
            <div className="flex gap-2 flex-wrap">
              {ticket.foto_urls.map((url, i) => (
                <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity cursor-pointer" onClick={() => setLightbox(i)} />
              ))}
            </div>
          </div>
        )}
        {lightbox !== null && (
          <ImageLightbox urls={ticket.foto_urls} startIndex={lightbox} onClose={() => setLightbox(null)} />
        )}
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

  // Apertura automatica da URL param ?edit=<id>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId && tickets.length > 0) {
      const ticket = tickets.find(t => t.id === editId);
      if (ticket) {
        setTicketSelezionato(ticket);
        setFormOpen(true);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [tickets]);
  const [search, setSearch] = useState('');
  const [filtroStato, setFiltroStato] = useState('aperto');
  const [meseFiltrato, setMeseFiltrato] = useState(new Date());

  useEffect(() => {
    if (centroSelezionato || user?.tipo_account === 'manutentore') loadTickets();
  }, [centroSelezionato, user]);

  const loadTickets = async () => {
    setLoading(true);
    let query = {};
    if (centroSelezionato?.id && centroSelezionato.id !== 'tutti') {
      query.centro_id = centroSelezionato.id;
    }
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

  const handleCardClick = (ticket) => {
    setDettaglioTicket(ticket);
  };

  const handleDelete = async (ticket) => {
    if (!confirm('Eliminare questo ticket?')) return;
    await base44.entities.Ticket.delete(ticket.id);
    loadTickets();
  };

  const handleStatoChange = async (ticket, nuovoStato) => {
    await base44.entities.Ticket.update(ticket.id, { stato: nuovoStato });
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, stato: nuovoStato } : t));
  };

  const fieldChangeTimers = useRef({});
  const handleFieldChange = (ticket, field, value) => {
    // Aggiorna subito lo stato locale per reattività UI
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, [field]: value } : t));
    // Debounce la chiamata API per evitare rate limit
    const key = `${ticket.id}_${field}`;
    clearTimeout(fieldChangeTimers.current[key]);
    fieldChangeTimers.current[key] = setTimeout(async () => {
      await base44.entities.Ticket.update(ticket.id, { [field]: value });
    }, 600);
  };

  const handleNuovo = () => {
    setTicketSelezionato(null);
    setFormOpen(true);
  };

  const filtered = tickets.filter(t => {
    const matchSearch = !search || t.numero_ticket?.toLowerCase().includes(search.toLowerCase()) || t.operatore?.toLowerCase().includes(search.toLowerCase()) || t.descrizione?.toLowerCase().includes(search.toLowerCase());
    const matchStato = filtroStato === 'tutti' || t.stato === filtroStato;
    const dataApertura = t.data_apertura ? new Date(t.data_apertura) : null;
    const inizio = startOfMonth(meseFiltrato);
    const fine = endOfMonth(meseFiltrato);
    return matchSearch && matchStato;
  });

  const oggi = new Date(); oggi.setHours(0,0,0,0);
  const counts = {
    aperto: tickets.filter(t => t.stato === 'aperto').length,
    sollecitati: tickets.filter(t => t.numero_sollecito > 0 && t.stato !== 'chiuso').length,
    scaduti: tickets.filter(t => t.scadenza && new Date(t.scadenza) < oggi && t.stato !== 'chiuso').length,
    chiuso: tickets.filter(t => t.stato === 'chiuso').length,
    daConfermare: tickets.filter(t => !t.confermato && t.stato !== 'chiuso').length,
  };

  const isReadOnly = user?.tipo_account === 'manutentore';
  const canConfirm = user?.tipo_account === 'direttore' || user?.tipo_account === 'proprieta';

  const handleConferma = async (ticket, e) => {
    e.stopPropagation();
    const nuovoValore = !ticket.confermato;
    await base44.entities.Ticket.update(ticket.id, { confermato: nuovoValore });
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, confermato: nuovoValore } : t));
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ticket</h1>
          <p className="text-sm text-slate-500 mt-0.5">{isReadOnly ? 'Visualizzazione ticket manutenzione' : 'Gestione ticket manutenzione'}</p>
        </div>
        {!isReadOnly && (
          <Button onClick={handleNuovo} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus className="w-4 h-4" /> Nuovo Ticket
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className={`grid gap-3 mb-5 ${canConfirm ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {[
          { icon: TicketIcon, color: 'bg-blue-100', iconColor: 'text-blue-600', value: counts.aperto, label: 'Aperti' },
          { icon: AlertCircle, color: 'bg-red-100', iconColor: 'text-red-600', value: counts.scaduti, label: 'Scaduti' },
          { icon: AlertCircle, color: 'bg-orange-100', iconColor: 'text-orange-600', value: counts.sollecitati, label: 'Sollecitati' },
          { icon: CheckCircle2, color: 'bg-green-100', iconColor: 'text-green-600', value: counts.chiuso, label: 'Chiusi' },
          ...(canConfirm ? [{ icon: ShieldAlert, color: 'bg-amber-100', iconColor: 'text-amber-600', value: counts.daConfermare, label: 'Da confermare' }] : []),
        ].map(({ icon: Icon, color, iconColor, value, label }) => (
          <div key={label} className="bg-white/80 backdrop-blur-sm rounded-xl border border-white p-4 flex items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.08)]">
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

      {/* Filtri */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca ticket..." className="pl-9 h-9 text-sm" />
        </div>

        <div className="flex gap-1">
          {['tutti', 'aperto', 'chiuso'].map(s => (
            <button
              key={s}
              onClick={() => setFiltroStato(s)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filtroStato === s ? (s === 'aperto' ? 'bg-red-600 text-white' : s === 'chiuso' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white') : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {s === 'tutti' ? 'Tutti' : statoConfig[s]?.label}
            </button>
          ))}
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
        (() => {
          const oggi = new Date(); oggi.setHours(0,0,0,0);
          const scaduti = filtered.filter(t => t.scadenza && new Date(t.scadenza) < oggi && t.stato !== 'chiuso')
            .sort((a, b) => new Date(a.scadenza) - new Date(b.scadenza));
          const inCorso = filtered.filter(t => !t.scadenza || new Date(t.scadenza) >= oggi || t.stato === 'chiuso')
            .sort((a, b) => {
              if (!a.scadenza && !b.scadenza) return 0;
              if (!a.scadenza) return 1;
              if (!b.scadenza) return -1;
              return new Date(a.scadenza) - new Date(b.scadenza);
            });

          const TicketCard = ({ ticket }) => {
            const isUrgente = ticket.tipologia === 'urgente';
            const isScaduto = ticket.scadenza && new Date(ticket.scadenza) < oggi && ticket.stato !== 'chiuso';
            return (
              <div key={ticket.id} onClick={() => handleCardClick(ticket)} className={`rounded-xl border p-4 flex gap-4 items-start transition-all duration-200 cursor-pointer
                shadow-[0_4px_20px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.08)]
                                 hover:shadow-[0_12px_36px_rgba(0,0,0,0.18),0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5
                ${isScaduto ? 'bg-red-50 border-red-50' : isUrgente ? 'bg-white/80 backdrop-blur-sm border-white' : 'bg-white/80 backdrop-blur-sm border-white'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                   <span className="font-semibold text-slate-800 text-sm">#{ticket.numero_ticket}</span>
                   <Badge className={tipologiaConfig[ticket.tipologia]?.color}>{tipologiaConfig[ticket.tipologia]?.label}</Badge>
                   {isReadOnly ? (
                     <span className={`h-6 text-xs px-2 py-1 rounded-full font-medium ${statoConfig[ticket.stato]?.color}`}>{statoConfig[ticket.stato]?.label}</span>
                   ) : (
                     <Select value={ticket.stato} onValueChange={v => handleStatoChange(ticket, v)}>
                       <SelectTrigger className={`h-6 text-xs px-2 py-0 border-0 rounded-full font-medium w-auto gap-1 ${statoConfig[ticket.stato]?.color}`}>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="aperto">Aperto</SelectItem>
                         <SelectItem value="chiuso">Chiuso</SelectItem>
                       </SelectContent>
                     </Select>
                   )}
                   {!isReadOnly && (
                     <Select value={String(ticket.numero_sollecito ?? 0)} onValueChange={v => handleFieldChange(ticket, 'numero_sollecito', Number(v))}>
                       <SelectTrigger className={`h-6 text-xs px-2 py-0 rounded-full font-medium w-auto gap-1 ${(ticket.numero_sollecito > 0) ? 'border-0 bg-orange-100 text-orange-700' : 'border border-slate-200 text-slate-400 bg-white'}`}>
                         <SelectValue>{ticket.numero_sollecito > 0 ? `Sollecito ${ticket.numero_sollecito}` : '+ Sollecito'}</SelectValue>
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="0">Nessun sollecito</SelectItem>
                         {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>Sollecito {n}</SelectItem>)}
                       </SelectContent>
                     </Select>
                   )}
                   {ticket.numero_sollecito > 0 && isReadOnly && (
                     <span className="h-6 text-xs px-2 py-1 rounded-full font-medium bg-orange-100 text-orange-700">Sollecito {ticket.numero_sollecito}</span>
                   )}
                   {isScaduto && <Badge className="bg-red-100 text-red-700 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Scaduto</Badge>}
                   {canConfirm && (
                     <button
                       onClick={(e) => handleConferma(ticket, e)}
                       className={`flex items-center gap-1 h-6 text-xs px-2 py-1 rounded-full font-medium transition-colors ${ticket.confermato ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                     >
                       {ticket.confermato ? <><ShieldCheck className="w-3 h-3" /> Confermato</> : <><ShieldAlert className="w-3 h-3" /> Da confermare</>}
                     </button>
                   )}
                   </div>
                  {ticket.descrizione && <p className="text-sm text-slate-600 mb-2 line-clamp-2">{ticket.descrizione}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 items-center">
                   <span>Operatore: <strong className="text-slate-700">{ticket.operatore}</strong></span>
                   <span>Apertura: <strong className="text-slate-700">{formatData(ticket.data_apertura)}</strong></span>
                   <span className={`flex items-center gap-1 ${isScaduto ? 'text-red-600 font-medium' : ''}`}>
                     Scadenza:
                     {isReadOnly ? (
                       <strong className="text-slate-700 ml-1">{formatData(ticket.scadenza)}</strong>
                     ) : (
                       <input
                         type="date"
                         value={ticket.scadenza || ''}
                         onChange={e => handleFieldChange(ticket, 'scadenza', e.target.value)}
                         className="ml-1 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 bg-white cursor-pointer hover:border-blue-400 focus:outline-none focus:border-blue-500"
                       />
                     )}
                   </span>
                  </div>
                  {ticket.foto_urls?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {ticket.foto_urls.map((url, i) => (
                        <img key={i} src={url} alt="" className="w-10 h-10 rounded-md object-cover border border-slate-200" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {!isReadOnly && (
                    <>
                      <button onClick={() => handleEdit(ticket)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(ticket)} className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          };

          return (
            <div className="space-y-6">
              {scaduti.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-600 mb-2">⚠️ Scaduti ({scaduti.length})</h3>
                  <div className="space-y-2">{scaduti.map(t => <TicketCard key={t.id} ticket={t} />)}</div>
                </div>
              )}
              {inCorso.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">🔧 In corso ({inCorso.length})</h3>
                  <div className="space-y-2">{inCorso.map(t => <TicketCard key={t.id} ticket={t} />)}</div>
                </div>
              )}
            </div>
          );
        })()
      )}

      {/* Dialog riepilogo */}
      {dettaglioTicket && (
        <DettaglioTicketDialog
          ticket={dettaglioTicket}
          onClose={() => setDettaglioTicket(null)}
          onEdit={!isReadOnly ? () => { handleEdit(dettaglioTicket); } : null}
          canConfirm={canConfirm}
        />
      )}

      <FormTicket
        open={formOpen}
        onClose={() => { setFormOpen(false); setTicketSelezionato(null); }}
        onSave={handleSave}
        ticket={ticketSelezionato}
        user={user}
        readOnly={isReadOnly}
      />
    </div>
  );
}