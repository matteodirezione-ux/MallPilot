import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Ticket as TicketIcon, AlertCircle, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
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

export default function Ticket({ centroSelezionato, user }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [ticketSelezionato, setTicketSelezionato] = useState(null);
  const [search, setSearch] = useState('');
  const [filtroStato, setFiltroStato] = useState('aperto');
  const [meseFiltrato, setMeseFiltrato] = useState(new Date());

  useEffect(() => {
    if (centroSelezionato) loadTickets();
  }, [centroSelezionato]);

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
    setTicketSelezionato(ticket);
    setFormOpen(true);
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

  const handleFieldChange = async (ticket, field, value) => {
    await base44.entities.Ticket.update(ticket.id, { [field]: value });
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, [field]: value } : t));
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
    const matchMese = !dataApertura || (dataApertura >= inizio && dataApertura <= fine);
    return matchSearch && matchStato && matchMese;
  });

  const counts = {
    aperto: tickets.filter(t => t.stato === 'aperto').length,
    sollecitati: tickets.filter(t => t.numero_sollecito > 0 && t.stato !== 'chiuso').length,
    chiuso: tickets.filter(t => t.stato === 'chiuso').length,
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ticket</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestione ticket manutenzione</p>
        </div>
        <Button onClick={handleNuovo} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-4 h-4" /> Nuovo Ticket
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <TicketIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{counts.aperto}</p>
            <p className="text-xs text-slate-500">Aperti</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{counts.sollecitati}</p>
            <p className="text-xs text-slate-500">Sollecitati</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{counts.chiuso}</p>
            <p className="text-xs text-slate-500">Chiusi</p>
          </div>
        </div>
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
              <div key={ticket.id} className={`rounded-xl border p-4 flex gap-4 items-start transition-shadow hover:shadow-sm ${isScaduto ? 'bg-red-50 border-red-300' : isUrgente ? 'bg-white border-red-200' : 'bg-white border-slate-200'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-800 text-sm">#{ticket.numero_ticket}</span>
                    <Badge className={tipologiaConfig[ticket.tipologia]?.color}>{tipologiaConfig[ticket.tipologia]?.label}</Badge>
                    <Select value={ticket.stato} onValueChange={v => handleStatoChange(ticket, v)}>
                      <SelectTrigger className={`h-6 text-xs px-2 py-0 border-0 rounded-full font-medium w-auto gap-1 ${statoConfig[ticket.stato]?.color}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aperto">Aperto</SelectItem>
                        <SelectItem value="chiuso">Chiuso</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={String(ticket.numero_sollecito ?? 0)} onValueChange={v => handleFieldChange(ticket, 'numero_sollecito', Number(v))}>
                      <SelectTrigger className={`h-6 text-xs px-2 py-0 rounded-full font-medium w-auto gap-1 ${(ticket.numero_sollecito > 0) ? 'border-0 bg-orange-100 text-orange-700' : 'border border-slate-200 text-slate-400 bg-white'}`}>
                        <SelectValue>{ticket.numero_sollecito > 0 ? `Sollecito ${ticket.numero_sollecito}` : '+ Sollecito'}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Nessun sollecito</SelectItem>
                        {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>Sollecito {n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {isScaduto && <Badge className="bg-red-100 text-red-700 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Scaduto</Badge>}
                  </div>
                  {ticket.descrizione && <p className="text-sm text-slate-600 mb-2 line-clamp-2">{ticket.descrizione}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 items-center">
                    <span>Operatore: <strong className="text-slate-700">{ticket.operatore}</strong></span>
                    <span>Apertura: <strong className="text-slate-700">{formatData(ticket.data_apertura)}</strong></span>
                    <span className={`flex items-center gap-1 ${isScaduto ? 'text-red-600 font-medium' : ''}`}>
                      Scadenza:
                      <input
                        type="date"
                        value={ticket.scadenza || ''}
                        onChange={e => handleFieldChange(ticket, 'scadenza', e.target.value)}
                        className="ml-1 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 bg-white cursor-pointer hover:border-blue-400 focus:outline-none focus:border-blue-500"
                      />
                    </span>
                  </div>
                  {ticket.foto_urls?.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {ticket.foto_urls.slice(0, 4).map((url, i) => (
                        <img key={i} src={url} alt="" className="w-10 h-10 rounded-md object-cover border border-slate-200" />
                      ))}
                      {ticket.foto_urls.length > 4 && <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center text-xs text-slate-500">+{ticket.foto_urls.length - 4}</div>}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => handleEdit(ticket)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(ticket)} className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
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