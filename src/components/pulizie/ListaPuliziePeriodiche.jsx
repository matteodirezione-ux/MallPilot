import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Pencil, Trash2, X, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import FormPuliziaPeriodica from './FormPuliziaPeriodica';

const parseLocalDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

const FREQUENZA_LABEL = {
  giornaliera: 'Giornaliera', settimanale: 'Settimanale', quindicinale: 'Quindicinale',
  mensile: 'Mensile', trimestrale: 'Trimestrale', semestrale: 'Semestrale', annuale: 'Annuale',
};

const STATO_CONFIG = {
  da_programmare: { label: 'Da programmare', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  programmato: { label: 'Programmato', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  completato: { label: 'Completato', color: 'bg-green-100 text-green-700 border-green-200' },
};

export default function ListaPuliziePeriodiche({ lista, loading, centroId, onReload, anno }) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [dettaglio, setDettaglio] = useState(null);
  const [fullImg, setFullImg] = useState(null);

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questa pulizia periodica?')) return;
    // Elimina anche il controllo collegato se esiste
    const esistenti = await base44.entities.Manutenzione.filter({ pulizia_periodica_id: id });
    for (const m of esistenti) await base44.entities.Manutenzione.delete(m.id);
    await base44.entities.PuliziaPeriodica.delete(id);
    setDettaglio(null);
    onReload();
  };

  const handleSave = () => {
    setShowForm(false);
    setEditing(null);
    onReload();
  };

  // Raggruppa per mese usando prossima_scadenza o ultima_esecuzione o created_date
  const filtrati = lista.filter(p => {
    const dataRef = p.prossima_scadenza || p.ultima_esecuzione || p.created_date;
    if (!dataRef) return false;
    const annoRef = parseInt(dataRef.substring(0, 4));
    const searchOk = !search || p.titolo?.toLowerCase().includes(search.toLowerCase());
    return annoRef === anno && searchOk;
  });

  const perMese = {};
  filtrati.forEach(p => {
    const dataRef = p.prossima_scadenza || p.ultima_esecuzione || p.created_date;
    const mese = parseInt(dataRef.substring(5, 7)) - 1;
    if (!perMese[mese]) perMese[mese] = [];
    perMese[mese].push(p);
  });
  const mesiConDati = Object.keys(perMese).map(Number).sort((a, b) => b - a);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative min-w-[160px] flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-8" placeholder="Cerca..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Lista raggruppata per mese */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Caricamento...</div>
      ) : mesiConDati.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nessuna pulizia periodica per il {anno}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {mesiConDati.map(mese => (
            <div key={mese}>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full inline-block"></span>
                {MESI[mese]} {anno}
                <span className="text-xs font-normal text-slate-400">({perMese[mese].length})</span>
              </h2>
              <div className="space-y-2">
                {perMese[mese].map(p => {
                   const cfg = STATO_CONFIG[p.stato || 'da_programmare'];
                   const stato = p.stato || 'da_programmare';
                   const cardBg = stato === 'completato' ? 'bg-green-50 border-green-200' : stato === 'programmato' ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200';
                   return (
                     <div
                       key={p.id}
                       className={`rounded-xl border p-4 hover:shadow-md transition-shadow cursor-pointer ${cardBg}`}
                       onClick={() => setDettaglio(p)}
                     >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-slate-800 text-sm">{p.titolo}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>{cfg.label}</span>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{FREQUENZA_LABEL[p.frequenza]}</span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                            {p.ultima_esecuzione && <span>✅ Da: {format(parseLocalDate(p.ultima_esecuzione), 'dd MMM yyyy', { locale: it })}</span>}
                            {p.prossima_scadenza && <span>📅 A: {format(parseLocalDate(p.prossima_scadenza), 'dd MMM yyyy', { locale: it })}</span>}
                          </div>
                          {p.foto_urls?.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {p.foto_urls.slice(0, 4).map((url, i) => (
                                <img key={i} src={url} className="w-10 h-10 object-cover rounded border" />
                              ))}
                              {p.foto_urls.length > 4 && (
                                <div className="w-10 h-10 bg-slate-100 rounded border flex items-center justify-center text-xs text-slate-500">+{p.foto_urls.length - 4}</div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(p); setShowForm(true); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(p.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
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
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATO_CONFIG[dettaglio.stato || 'da_programmare'].color}`}>
                  {STATO_CONFIG[dettaglio.stato || 'da_programmare'].label}
                </span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{FREQUENZA_LABEL[dettaglio.frequenza]}</span>
              </div>
              {dettaglio.descrizione && <p className="text-sm text-slate-600 bg-slate-50 rounded p-3">{dettaglio.descrizione}</p>}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {dettaglio.ultima_esecuzione && (
                  <div><p className="text-xs text-slate-400 font-medium">Da</p><p className="font-medium">{format(parseLocalDate(dettaglio.ultima_esecuzione), 'dd MMM yyyy', { locale: it })}</p></div>
                )}
                {dettaglio.prossima_scadenza && (
                  <div><p className="text-xs text-slate-400 font-medium">A</p><p className="font-medium">{format(parseLocalDate(dettaglio.prossima_scadenza), 'dd MMM yyyy', { locale: it })}</p></div>
                )}
              </div>
              {dettaglio.note && <div><p className="text-xs text-slate-400 font-medium mb-1">Note</p><p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">{dettaglio.note}</p></div>}
              {dettaglio.foto_urls?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">Foto ({dettaglio.foto_urls.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {dettaglio.foto_urls.map((url, i) => (
                      <img key={i} src={url} className="w-full aspect-square object-cover rounded-lg border cursor-pointer hover:opacity-90" onClick={() => setFullImg(url)} />
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => { setDettaglio(null); setEditing(dettaglio); setShowForm(true); }}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Modifica
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(dettaglio.id)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Elimina
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Fullscreen image */}
      {fullImg && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setFullImg(null)}>
          <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2"><X className="w-5 h-5" /></button>
          <img src={fullImg} className="max-w-full max-h-full object-contain rounded" />
        </div>
      )}

      <FormPuliziaPeriodica
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        pulizia={editing}
        centroId={centroId}
        onSave={handleSave}
      />
    </div>
  );
}