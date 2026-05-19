import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Pencil, Trash2 } from 'lucide-react';
import ImageLightbox from '@/components/ui/ImageLightbox';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import FormPuliziaPeriodica from './FormPuliziaPeriodica';

const parseLocalDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const FREQUENZA_LABEL = { giornaliera: 'Giornaliera', settimanale: 'Settimanale', quindicinale: 'Quindicinale', mensile: 'Mensile', trimestrale: 'Trimestrale', semestrale: 'Semestrale', annuale: 'Annuale' };
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
  const [lightbox, setLightbox] = useState(null);

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questa pulizia periodica?')) return;
    const esistenti = await base44.entities.Manutenzione.filter({ pulizia_periodica_id: id });
    for (const m of esistenti) await base44.entities.Manutenzione.delete(m.id);
    await base44.entities.PuliziaPeriodica.delete(id);
    setDettaglio(null);
    onReload();
  };

  const handleSave = () => { setShowForm(false); setEditing(null); onReload(); };

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
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Cerca pulizia periodica..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-400">Caricamento...</div>
      ) : mesiConDati.length === 0 ? (
        <div className="text-center py-8 text-slate-400">Nessuna pulizia periodica per il {anno}</div>
      ) : (
        <div className="space-y-6">
          {mesiConDati.map(mese => (
            <div key={mese}>
              <h2 className="font-semibold text-slate-600 mb-2 flex items-center gap-2">
                {MESI[mese]} {anno} <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">({perMese[mese].length})</span>
              </h2>
              <div className="space-y-2">
                {perMese[mese].sort((a, b) => {
                  const dA = a.prossima_scadenza || a.ultima_esecuzione || a.created_date;
                  const dB = b.prossima_scadenza || b.ultima_esecuzione || b.created_date;
                  return parseLocalDate(dA) - parseLocalDate(dB);
                }).map(p => {
                  const cfg = STATO_CONFIG[p.stato || 'da_programmare'];
                  const stato = p.stato || 'da_programmare';
                  const cardBg = stato === 'completato' ? 'bg-green-50 border-green-200' : stato === 'programmato' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
                  return (
                    <div key={p.id} className={`rounded-xl border p-4 cursor-pointer hover:shadow-sm transition-shadow ${cardBg}`} onClick={() => setDettaglio(p)}>
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800">{p.titolo}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.color}`}>{cfg.label}</span>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{FREQUENZA_LABEL[p.frequenza]}</span>
                          </div>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                            {p.ultima_esecuzione && <span>✅ Da: {format(parseLocalDate(p.ultima_esecuzione), 'dd MMM yyyy', { locale: it })}</span>}
                            {p.prossima_scadenza && <span>📅 A: {format(parseLocalDate(p.prossima_scadenza), 'dd MMM yyyy', { locale: it })}</span>}
                          </div>
                          {p.foto_urls?.length > 0 && (
                            <div className="flex gap-1 mt-2" onClick={e => e.stopPropagation()}>
                              {p.foto_urls.slice(0, 4).map((url, i) => (
                                <img key={i} src={url} alt="" className="w-12 h-12 rounded object-cover cursor-pointer hover:opacity-80" onClick={() => setLightbox({ urls: p.foto_urls, index: i })} />
                              ))}
                              {p.foto_urls.length > 4 && <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center text-xs text-slate-500 cursor-pointer" onClick={() => setLightbox({ urls: p.foto_urls, index: 4 })}>+{p.foto_urls.length - 4}</div>}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-white/50"><Pencil className="w-4 h-4 text-slate-400" /></button>
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
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

      {dettaglio && (
        <Dialog open onOpenChange={() => setDettaglio(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{dettaglio.titolo}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATO_CONFIG[dettaglio.stato || 'da_programmare'].color}`}>{STATO_CONFIG[dettaglio.stato || 'da_programmare'].label}</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{FREQUENZA_LABEL[dettaglio.frequenza]}</span>
              </div>
              {dettaglio.descrizione && <p className="text-sm text-slate-600">{dettaglio.descrizione}</p>}
              <div className="grid grid-cols-2 gap-3">
                {dettaglio.ultima_esecuzione && <div><p className="text-xs text-slate-500">Da</p><p className="font-medium">{format(parseLocalDate(dettaglio.ultima_esecuzione), 'dd MMM yyyy', { locale: it })}</p></div>}
                {dettaglio.prossima_scadenza && <div><p className="text-xs text-slate-500">A</p><p className="font-medium">{format(parseLocalDate(dettaglio.prossima_scadenza), 'dd MMM yyyy', { locale: it })}</p></div>}
              </div>
              {dettaglio.note && <p className="text-sm text-slate-600"><strong>Note:</strong> {dettaglio.note}</p>}
              {dettaglio.foto_urls?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Foto ({dettaglio.foto_urls.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {dettaglio.foto_urls.map((url, i) => <img key={i} src={url} alt="" className="w-16 h-16 rounded object-cover cursor-pointer hover:opacity-80" onClick={() => setLightbox({ urls: dettaglio.foto_urls, index: i })} />)}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => { setDettaglio(null); setEditing(dettaglio); setShowForm(true); }} className="flex-1">Modifica</Button>
                <Button onClick={() => handleDelete(dettaglio.id)} className="flex-1 bg-red-600 hover:bg-red-700">Elimina</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {lightbox && <ImageLightbox urls={lightbox.urls} startIndex={lightbox.index} onClose={() => setLightbox(null)} />}

      <FormPuliziaPeriodica open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} pulizia={editing} centroId={centroId} onSave={handleSave} />
    </div>
  );
}