import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Pencil, Trash2, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import FormPulizia from '@/components/pulizie/FormPulizia';
import ListaPuliziePeriodiche from '@/components/pulizie/ListaPuliziePeriodiche';
import FormPuliziaPeriodica from '@/components/pulizie/FormPuliziaPeriodica';
import ImageLightbox from '@/components/ui/ImageLightbox';
import SafeImage from '@/components/ui/SafeImage';

const parseLocalDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

export default function PuliziePage({ centroSelezionato, user }) {
  const [tab, setTab] = useState('segnalazioni');
  const [lista, setLista] = useState([]);
  const [loadingSeg, setLoadingSeg] = useState(true);
  const [search, setSearch] = useState('');
  const [annoSelezionato, setAnnoSelezionato] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [dettaglio, setDettaglio] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [listaPeriodiche, setListaPeriodiche] = useState([]);
  const [loadingPer, setLoadingPer] = useState(true);
  const [annoPeriodiche, setAnnoPeriodiche] = useState(new Date().getFullYear());
  const [showFormPeriodica, setShowFormPeriodica] = useState(false);
  const [editingPeriodica, setEditingPeriodica] = useState(null);

  useEffect(() => {
    if (centroSelezionato?.id) { loadSegnalazioni(); loadPeriodiche(); }
  }, [centroSelezionato]);

  // Apri il form pulizia periodica se arriva ?edit_periodica=id dalla dashboard
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit_periodica');
    if (editId && listaPeriodiche.length > 0) {
      const item = listaPeriodiche.find(p => p.id === editId);
      if (item) {
        setTab('periodiche');
        setEditingPeriodica(item);
        setShowFormPeriodica(true);
        // Rimuove il parametro URL per evitare che il form si riapra al prossimo reload
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [listaPeriodiche]);

  const loadSegnalazioni = async () => {
    setLoadingSeg(true);
    const data = centroSelezionato.id === 'tutti' ? await base44.entities.Pulizia.list() : await base44.entities.Pulizia.filter({ centro_id: centroSelezionato.id });
    setLista(data.sort((a, b) => new Date(b.data) - new Date(a.data)));
    setLoadingSeg(false);
  };

  const loadPeriodiche = async () => {
    setLoadingPer(true);
    const data = centroSelezionato.id === 'tutti' ? await base44.entities.PuliziaPeriodica.list() : await base44.entities.PuliziaPeriodica.filter({ centro_id: centroSelezionato.id });
    setListaPeriodiche(data);
    setLoadingPer(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questa segnalazione?')) return;
    await base44.entities.Pulizia.delete(id);
    setDettaglio(null);
    loadSegnalazioni();
  };

  const isDirettore = user?.tipo_account === 'direttore';
  const isLetta = (p) => !isDirettore || (p.letto_da || []).length > 0;

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

  if (!centroSelezionato?.id) return <div className="p-8 text-center text-slate-500">Seleziona un centro commerciale</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Sparkles className="w-6 h-6" /> Pulizie</h1>
          <p className="text-slate-500 text-sm">{centroSelezionato?.nome}</p>
        </div>
        <div className="flex items-center gap-3">
          {tab === 'segnalazioni' && (
            <>
              <div className="flex items-center gap-1">
                <button onClick={() => setAnnoSelezionato(a => a - 1)} className="text-slate-400 hover:text-slate-700 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-semibold px-2 text-sm text-slate-700">{annoSelezionato}</span>
                <button onClick={() => setAnnoSelezionato(a => a + 1)} className="text-slate-400 hover:text-slate-700 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 gap-2">
                <Plus className="w-4 h-4" /> Nuova Segnalazione
              </Button>
            </>
          )}
          {tab === 'periodiche' && (
            <>
              <div className="flex items-center gap-1">
                <button onClick={() => setAnnoPeriodiche(a => a - 1)} className="text-slate-400 hover:text-slate-700 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-semibold px-2 text-sm text-slate-700">{annoPeriodiche}</span>
                <button onClick={() => setAnnoPeriodiche(a => a + 1)} className="text-slate-400 hover:text-slate-700 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <Button onClick={() => setShowFormPeriodica(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
                <Plus className="w-4 h-4" /> Nuova pulizia periodica
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button onClick={() => setTab('segnalazioni')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'segnalazioni' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Segnalazioni</button>
        <button onClick={() => setTab('periodiche')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'periodiche' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Sparkles className="w-3 h-3 inline mr-1" />Periodiche</button>
      </div>

      {tab === 'segnalazioni' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Cerca segnalazione..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
      )}

      {tab === 'segnalazioni' && (
        <>
          {loadingSeg ? (
            <div className="text-center py-8 text-slate-400">Caricamento...</div>
          ) : mesiConDati.length === 0 ? (
            <div className="text-center py-8 text-slate-400">Nessuna segnalazione per il {annoSelezionato}</div>
          ) : (
            <div className="space-y-6">
              {mesiConDati.map(mese => (
                <div key={mese}>
                  <h2 className="font-semibold text-slate-600 mb-2 flex items-center gap-2">{MESI[mese]} {annoSelezionato} <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">({perMese[mese].length})</span></h2>
                  <div className="space-y-2">
                    {perMese[mese].map(p => {
                      const nonLetta = !isLetta(p);
                      return (
                        <div key={p.id} className={`rounded-xl border p-4 cursor-pointer transition-all duration-200
                          shadow-[0_4px_20px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.08)]
                          hover:shadow-[0_12px_36px_rgba(0,0,0,0.18),0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5
                          ${nonLetta ? 'bg-blue-50 border-blue-50' : 'bg-white/80 backdrop-blur-sm border-white'}`} onClick={() => handleClickSegnalazione(p)}>
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-slate-800">{p.titolo}</p>
                                {nonLetta && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">{format(parseLocalDate(p.data), 'dd MMM yyyy', { locale: it })}</p>
                              {p.descrizione && <p className="text-sm text-slate-600 mt-1 line-clamp-2">{p.descrizione}</p>}
                              {p.foto_urls?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                              {p.foto_urls.map((url, i) => <SafeImage key={i} src={url} alt="" className="w-10 h-10 rounded object-cover" />)}
                              </div>
                              )}
                              {p.creato_da_nome && <p className="text-xs text-slate-400 mt-1">Creato da {p.creato_da_nome}</p>}
                            </div>
                            <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                              <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-slate-100"><Pencil className="w-4 h-4 text-slate-400" /></button>
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
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{dettaglio.titolo}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">{format(parseLocalDate(dettaglio.data), 'dd MMMM yyyy', { locale: it })}</p>
                  {dettaglio.descrizione && <p className="text-sm text-slate-600">{dettaglio.descrizione}</p>}
                  {dettaglio.creato_da_nome && <p className="text-xs text-slate-400">Creato da {dettaglio.creato_da_nome}</p>}
                  {dettaglio.foto_urls?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Foto ({dettaglio.foto_urls.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {dettaglio.foto_urls.map((url, i) => (
                          <SafeImage 
                            key={i} 
                            src={url} 
                            alt="" 
                            className="w-20 h-20 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                            onClick={(e) => { e.stopPropagation(); setLightbox(i); }} 
                          />
                        ))}
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
        </>
      )}

      {tab === 'periodiche' && (
        <>
          <FormPuliziaPeriodica open={showFormPeriodica} onClose={() => { setShowFormPeriodica(false); setEditingPeriodica(null); }} pulizia={editingPeriodica} centroId={centroSelezionato?.id} onSave={() => { setShowFormPeriodica(false); setEditingPeriodica(null); loadPeriodiche(); }} />
          <ListaPuliziePeriodiche lista={listaPeriodiche} loading={loadingPer} centroId={centroSelezionato?.id} onReload={loadPeriodiche} anno={annoPeriodiche} />
        </>
      )}

      {lightbox !== null && dettaglio?.foto_urls?.length > 0 && <ImageLightbox urls={dettaglio.foto_urls} startIndex={lightbox} onClose={() => setLightbox(null)} />}

      <FormPulizia open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} pulizia={editing} centroId={centroSelezionato?.id} user={user} onSave={() => { setShowForm(false); setEditing(null); loadSegnalazioni(); }} />
    </div>
  );
}