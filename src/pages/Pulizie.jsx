import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, ChevronLeft, ChevronRight, Pencil, Trash2, X, Sparkles, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import FormPulizia from '@/components/pulizie/FormPulizia';
import ListaPuliziePeriodiche from '@/components/pulizie/ListaPuliziePeriodiche';
import FormPuliziaPeriodica from '@/components/pulizie/FormPuliziaPeriodica';

const parseLocalDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

export default function PuliziePage({ centroSelezionato, user }) {
  const [tab, setTab] = useState('segnalazioni');

  // Segnalazioni
  const [lista, setLista] = useState([]);
  const [loadingSeg, setLoadingSeg] = useState(true);
  const [search, setSearch] = useState('');
  const [annoSelezionato, setAnnoSelezionato] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [dettaglio, setDettaglio] = useState(null);
  const [fullImg, setFullImg] = useState(null);

  // Periodiche
  const [listaPeriodiche, setListaPeriodiche] = useState([]);
  const [loadingPer, setLoadingPer] = useState(true);
  const [annoPeriodiche, setAnnoPeriodiche] = useState(new Date().getFullYear());
  const [showFormPeriodica, setShowFormPeriodica] = useState(false);

  useEffect(() => {
    if (centroSelezionato?.id) {
      loadSegnalazioni();
      loadPeriodiche();
    }
  }, [centroSelezionato]);

  const loadSegnalazioni = async () => {
    setLoadingSeg(true);
    const data = centroSelezionato.id === 'tutti'
      ? await base44.entities.Pulizia.list()
      : await base44.entities.Pulizia.filter({ centro_id: centroSelezionato.id });
    setLista(data.sort((a, b) => new Date(b.data) - new Date(a.data)));
    setLoadingSeg(false);
  };

  const loadPeriodiche = async () => {
    setLoadingPer(true);
    const data = centroSelezionato.id === 'tutti'
      ? await base44.entities.PuliziaPeriodica.list()
      : await base44.entities.PuliziaPeriodica.filter({ centro_id: centroSelezionato.id });
    setListaPeriodiche(data);
    setLoadingPer(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questa segnalazione?')) return;
    await base44.entities.Pulizia.delete(id);
    setDettaglio(null);
    loadSegnalazioni();
  };

  const handleSave = () => {
    setShowForm(false);
    setEditing(null);
    loadSegnalazioni();
  };

  const isDirettore = user?.tipo_account === 'direttore';

  const isLetta = (p) => {
    if (!isDirettore) return true;
    return (p.letto_da || []).includes(user.email);
  };

  const handleClickSegnalazione = async (p) => {
    setDettaglio(p);
    if (isDirettore && !isLetta(p)) {
      const nuoviLetti = [...(p.letto_da || []), user.email];
      await base44.entities.Pulizia.update(p.id, { letto_da: nuoviLetti });
      setLista(prev => prev.map(item => item.id === p.id ? { ...item, letto_da: nuoviLetti } : item));
    }
  };

  const filtrati = lista.filter(p => {
    const annoOk = p.data && parseInt(p.data.substring(0, 4)) === annoSelezionato;
    const searchOk = !search || p.titolo?.toLowerCase().includes(search.toLowerCase()) || p.descrizione?.toLowerCase().includes(search.toLowerCase());
    return annoOk && searchOk;
  });

  const perMese = {};
  filtrati.forEach(p => {
    const mese = parseInt(p.data.substring(5, 7)) - 1;
    if (!perMese[mese]) perMese[mese] = [];
    perMese[mese].push(p);
  });
  const mesiConDati = Object.keys(perMese).map(Number).sort((a, b) => b - a);

  if (!centroSelezionato?.id) {
    return <div className="p-8 text-center text-slate-500">Seleziona un centro commerciale</div>;
  }

  return (
    <div className="p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-500" />
            Pulizie
          </h1>
          <p className="text-slate-500 text-sm">{centroSelezionato?.nome}</p>
        </div>
        {/* Anno navigator + bottone nuovo */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {tab === 'segnalazioni' && (
            <>
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAnnoSelezionato(a => a - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-bold text-slate-800 min-w-[44px] text-center">{annoSelezionato}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAnnoSelezionato(a => a + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
                <Plus className="w-4 h-4 mr-1" /> Nuova Segnalazione
              </Button>
            </>
          )}
          {tab === 'periodiche' && (
            <>
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAnnoPeriodiche(a => a - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-bold text-slate-800 min-w-[44px] text-center">{annoPeriodiche}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAnnoPeriodiche(a => a + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button size="sm" onClick={() => setShowFormPeriodica(true)}>
                <Plus className="w-4 h-4 mr-1" /> Nuova pulizia periodica
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tab switch */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-6">
        <button
          onClick={() => setTab('segnalazioni')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'segnalazioni' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Segnalazioni
        </button>
        <button
          onClick={() => setTab('periodiche')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'periodiche' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
          Periodiche
        </button>
      </div>

      {/* SEGNALAZIONI */}
      {tab === 'segnalazioni' && (
        <>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className="pl-8" placeholder="Cerca..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {loadingSeg ? (
            <div className="text-center py-12 text-slate-400">Caricamento...</div>
          ) : mesiConDati.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nessuna segnalazione per il {annoSelezionato}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {mesiConDati.map(mese => (
                <div key={mese}>
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-400 rounded-full inline-block"></span>
                    {MESI[mese]} {annoSelezionato}
                    <span className="text-xs font-normal text-slate-400">({perMese[mese].length})</span>
                  </h2>
                  <div className="space-y-2">
                    {perMese[mese].map(p => (
                      <div
                        key={p.id}
                        className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setDettaglio(p)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-semibold text-slate-800 text-sm">{p.titolo}</h3>
                              <span className="text-xs text-slate-400">{format(parseLocalDate(p.data), 'dd MMM yyyy', { locale: it })}</span>
                            </div>
                            {p.descrizione && <p className="text-xs text-slate-500 truncate">{p.descrizione}</p>}
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
                            {p.creato_da_nome && <p className="text-[11px] text-slate-400 mt-1">Creato da {p.creato_da_nome}</p>}
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
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dialog Dettaglio segnalazione */}
          {dettaglio && (
            <Dialog open={!!dettaglio} onOpenChange={() => setDettaglio(null)}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{dettaglio.titolo}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-slate-400">{format(parseLocalDate(dettaglio.data), 'dd MMMM yyyy', { locale: it })}</p>
                  {dettaglio.descrizione && <p className="text-sm text-slate-600 bg-slate-50 rounded p-3">{dettaglio.descrizione}</p>}
                  {dettaglio.creato_da_nome && <p className="text-xs text-slate-400">Creato da {dettaglio.creato_da_nome}</p>}
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

          <FormPulizia
            open={showForm}
            onClose={() => { setShowForm(false); setEditing(null); }}
            pulizia={editing}
            centroId={centroSelezionato?.id}
            user={user}
            onSave={handleSave}
          />
        </>
      )}

      {/* PERIODICHE */}
      {tab === 'periodiche' && (
        <>
          <ListaPuliziePeriodiche
            lista={listaPeriodiche}
            loading={loadingPer}
            centroId={centroSelezionato?.id}
            onReload={loadPeriodiche}
            anno={annoPeriodiche}
          />
          <FormPuliziaPeriodica
            open={showFormPeriodica}
            onClose={() => setShowFormPeriodica(false)}
            pulizia={null}
            centroId={centroSelezionato?.id}
            onSave={() => { setShowFormPeriodica(false); loadPeriodiche(); }}
          />
        </>
      )}

      {/* Fullscreen image */}
      {fullImg && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setFullImg(null)}>
          <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2"><X className="w-5 h-5" /></button>
          <img src={fullImg} className="max-w-full max-h-full object-contain rounded" />
        </div>
      )}
    </div>
  );
}