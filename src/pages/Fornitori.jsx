import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, Search, Mail, Phone, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import FormFornitore from '@/components/fornitori/FormFornitore';

export default function Fornitori({ centroSelezionato, user }) {
  const [fornitori, setFornitori] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingFornitore, setEditingFornitore] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [espansi, setEspansi] = useState({});

  const toggleEspanso = (id) => setEspansi(prev => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    loadFornitori();
  }, [centroSelezionato]);

  const loadFornitori = async () => {
    setLoading(true);
    try {
      if (centroSelezionato?.id === 'tutti') {
        const all = await base44.entities.Fornitore.list();
        setFornitori(all);
      } else {
        const result = await base44.entities.Fornitore.filter({ centro_id: centroSelezionato?.id });
        setFornitori(result);
      }
    } catch (error) {
      toast.error('Errore caricamento fornitori');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFornitore = async () => {
    try {
      await base44.entities.Fornitore.delete(deleteDialog.id);
      toast.success('Fornitore eliminato');
      setDeleteDialog(null);
      loadFornitori();
    } catch (error) {
      toast.error('Errore eliminazione');
    }
  };

  const filteredFornitori = fornitori.filter(f =>
    f.nome_ditta?.toLowerCase().includes(search.toLowerCase()) ||
    f.referente_nome?.toLowerCase().includes(search.toLowerCase())
  );

  if (!centroSelezionato) {
    return <div className="p-8 text-center text-slate-500">Seleziona un centro per visualizzare i fornitori</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fornitori</h1>
          <p className="text-slate-500 text-sm">{centroSelezionato?.nome}</p>
        </div>
        <Button onClick={() => { setEditingFornitore(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-4 h-4" /> Nuovo Fornitore
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Cerca fornitore..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-400">Caricamento...</div>
      ) : filteredFornitori.length === 0 ? (
        <div className="text-center py-8 text-slate-400">{search ? 'Nessun risultato trovato' : 'Nessun fornitore inserito'}</div>
      ) : (
        <div className="space-y-3">
          {filteredFornitori.sort((a, b) => a.nome_ditta.localeCompare(b.nome_ditta, 'it')).map((fornitore) => {
            const espanso = espansi[fornitore.id];
            const hasDuvri = fornitore.duvri_urls?.length > 0;
            return (
              <div key={fornitore.id} className={`rounded-xl border overflow-hidden transition-all duration-200
                shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]
                hover:shadow-[0_8px_28px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.06)] hover:-translate-y-0.5
                ${!hasDuvri ? 'border-orange-300 bg-orange-50' : 'bg-white/80 backdrop-blur-sm border-slate-200'}`}>
                  <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleEspanso(fornitore.id)}>
                    <div className="flex-1 min-w-0">
                      {!hasDuvri && (
                        <div className="bg-red-500 text-white px-3 py-1 font-bold text-xs mb-2 rounded">
                          ⚠️ DUVRI MANCANTE
                        </div>
                      )}
                      <p className="font-semibold text-slate-800">{fornitore.nome_ditta}</p>
                      <div className="flex flex-wrap gap-3 mt-1 text-sm text-slate-500">
                        {fornitore.referente_nome && <span>· {fornitore.referente_nome}</span>}
                        {fornitore.referente_email && <a href={`mailto:${fornitore.referente_email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-blue-600 hover:underline"><Mail className="w-3 h-3" />{fornitore.referente_email}</a>}
                        {fornitore.referente_telefono && <a href={`tel:${fornitore.referente_telefono}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-blue-600 hover:underline"><Phone className="w-3 h-3" />{fornitore.referente_telefono}</a>}
                        {hasDuvri && fornitore.duvri_urls.map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-green-600 hover:underline">📄 DUVRI {idx + 1}</a>
                        ))}
                        {fornitore.lavoratori?.length > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{fornitore.lavoratori.length}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button onClick={e => { e.stopPropagation(); setEditingFornitore(fornitore); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-slate-100"><Edit className="w-4 h-4 text-slate-400" /></button>
                      <button onClick={e => { e.stopPropagation(); setDeleteDialog(fornitore); }} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
                      {espanso ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {espanso && (
                    <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50">
                      <div className="flex flex-wrap gap-6">
                        {fornitore.lavoratori?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">Lavoratori:</p>
                            <ul className="space-y-0.5 text-sm text-slate-600">
                              {fornitore.lavoratori.map((lav, idx) => <li key={idx}>• {lav.nome}{lav.mansione && ` (${lav.mansione})`}</li>)}
                            </ul>
                          </div>
                        )}
                        {fornitore.dpi?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">DPI:</p>
                            <div className="flex flex-wrap gap-1">
                              {fornitore.dpi.map((dpi, idx) => <span key={idx} className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs">{dpi}</span>)}
                            </div>
                          </div>
                        )}
                      </div>

                      {fornitore.subornitori?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-2">Subornitori:</p>
                          <div className="space-y-2">
                            {fornitore.subornitori.map((sub, idx) => (
                              <div key={idx} className={`p-3 rounded-lg border text-sm ${!sub.duvri_urls?.length ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
                                {!sub.duvri_urls?.length && (
                                  <div className="bg-red-500 text-white px-3 py-1 font-bold text-xs mb-2 rounded">
                                    ⚠️ DUVRI MANCANTE
                                  </div>
                                )}
                                <p className="font-medium text-slate-800">{sub.nome_ditta}</p>
                                {sub.referente_nome && <p className="text-slate-500 text-xs">{sub.referente_nome}</p>}
                                {sub.referente_email && <a href={`mailto:${sub.referente_email}`} className="text-blue-600 text-xs hover:underline block">{sub.referente_email}</a>}
                                {sub.referente_telefono && <a href={`tel:${sub.referente_telefono}`} className="text-blue-600 text-xs hover:underline block">{sub.referente_telefono}</a>}
                                {sub.lavoratori?.length > 0 && <p className="text-xs text-slate-500 mt-1">Lavoratori: {sub.lavoratori.map(l => `${l.nome}${l.mansione ? ` (${l.mansione})` : ''}`).join(', ')}</p>}
                                {sub.duvri_urls?.length > 0 && (
                                  <div className="flex gap-2 mt-1">
                                    {sub.duvri_urls.map((url, dIdx) => <a key={dIdx} href={url} target="_blank" rel="noopener noreferrer" className="text-green-600 text-xs hover:underline">📄 DUVRI {dIdx + 1}</a>)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {fornitore.note && <p className="text-sm text-slate-600"><strong>Note:</strong> {fornitore.note}</p>}
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <FormFornitore
          fornitore={editingFornitore}
          centroId={centroSelezionato?.id}
          onClose={() => { setShowForm(false); setEditingFornitore(null); }}
          onSave={() => { setShowForm(false); setEditingFornitore(null); loadFornitori(); }}
        />
      )}

      {deleteDialog && (
        <Dialog open onOpenChange={() => setDeleteDialog(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Elimina Fornitore</DialogTitle></DialogHeader>
            <p className="text-sm text-slate-600">Sei sicuro di voler eliminare <strong>{deleteDialog.nome_ditta}</strong>?</p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteDialog(null)}>Annulla</Button>
              <Button onClick={handleDeleteFornitore} className="bg-red-600 hover:bg-red-700">Elimina</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}