import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, Search, ChevronLeft, ChevronRight, Pencil, Trash2, List, Calendar, X
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isWithinInterval, addDays, subDays } from 'date-fns';
import { it } from 'date-fns/locale';
import FormCapex from '@/components/capex/FormCapex';

const STATO_CONFIG = {
  da_pianificare: { label: 'Da pianificare', color: 'bg-red-100 text-red-700 border-red-200' },
  pianificato: { label: 'Pianificato', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  completato: { label: 'Completato', color: 'bg-green-100 text-green-700 border-green-200' },
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

  const isVigilanza = user?.tipo_account === 'vigilanza';
  const canEdit = !isVigilanza;

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

  const STATO_ORDER = { da_pianificare: 2, pianificato: 1, completato: 0 };

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
           {canEdit && (
             <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
               <Plus className="w-4 h-4 mr-1" /> Nuovo Capex
             </Button>
           )}
         </div>
      </div>

      {/* KPI Cards - solo per non vigilanza */}
      {!isVigilanza && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase font-medium mb-1">Totale Capex</p>
            <p className="text-xl font-bold text-slate-800">{capexAnno.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase font-medium mb-1">Costo Previsto</p>
            <p className="text-xl font-bold text-blue-700">{fmt(totalePrevisto)}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase font-medium mb-1">Costo Effettivo</p>
            <p className="text-xl font-bold text-green-700">{fmt(totaleEffettivo)}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase font-medium mb-1">Scostamento</p>
            <p className={`text-xl font-bold ${totaleEffettivo > totalePrevisto ? 'text-red-600' : 'text-green-600'}`}>
              {fmt(totaleEffettivo - totalePrevisto)}
            </p>
          </div>
        </div>
      )}

      {/* Filtri */}
       <div className="flex flex-wrap gap-2 mb-4">
         <div className="flex gap-2">
           <Button variant={view === 'lista' ? 'default' : 'outline'} size="sm" onClick={() => setView('lista')}>
             <List className="w-4 h-4 mr-1" /> Lista
           </Button>
           <Button variant={view === 'calendario' ? 'default' : 'outline'} size="sm" onClick={() => setView('calendario')}>
             <Calendar className="w-4 h-4 mr-1" /> Calendario
           </Button>
         </div>
         <div className="relative flex-1 min-w-[160px]">
           <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
           <Input className="pl-8" placeholder="Cerca..." value={search} onChange={e => setSearch(e.target.value)} />
         </div>
         <Select value={filterStato} onValueChange={setFilterStato}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Stato" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti gli stati</SelectItem>
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
            const cardBg = c.stato === 'completato' ? 'bg-green-50 border-green-200' : c.stato === 'pianificato' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
            return (
            <div key={c.id} className={`rounded-xl border p-4 hover:shadow-md transition-shadow cursor-pointer ${cardBg}`} onClick={() => setDettaglio(c)}>
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
              {dettaglio.allegati_urls?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-2">Allegati</p>
                  <div className="flex flex-wrap gap-2">
                    {dettaglio.allegati_urls.map((url, i) => (
                      url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                        ? <img key={i} src={url} className="w-20 h-20 object-cover rounded-lg border cursor-pointer" onClick={() => window.open(url, '_blank')} />
                        : <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded hover:underline">📎 Allegato {i + 1}</a>
                    ))}
                  </div>
                </div>
              )}
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