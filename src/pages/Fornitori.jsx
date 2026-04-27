import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, Search, Mail, Phone, Users, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import FormFornitore from '@/components/fornitori/FormFornitore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

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
        const result = await base44.entities.Fornitore.filter({
          centro_id: centroSelezionato?.id
        });
        setFornitori(result);
      }
    } catch (error) {
      toast.error('Errore caricamento fornitori');
      console.error(error);
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
      console.error(error);
    }
  };

  const filteredFornitori = fornitori.filter(f =>
    f.nome_ditta?.toLowerCase().includes(search.toLowerCase()) ||
    f.referente_nome?.toLowerCase().includes(search.toLowerCase())
  );

  if (!centroSelezionato) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            Seleziona un centro per visualizzare i fornitori
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Fornitori</h1>
          <p className="text-slate-600 text-sm mt-1">{centroSelezionato?.nome}</p>
        </div>
        <Button onClick={() => {
          setEditingFornitore(null);
          setShowForm(true);
        }} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Nuovo Fornitore
        </Button>
      </div>

      {/* Ricerca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Cerca per nome ditta o referente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : filteredFornitori.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            {search ? 'Nessun risultato trovato' : 'Nessun fornitore inserito'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredFornitori.sort((a, b) => a.nome_ditta.localeCompare(b.nome_ditta, 'it')).map((fornitore) => {
            const espanso = espansi[fornitore.id];
            const hasDuvri = fornitore.duvri_urls?.length > 0;
            return (
            <div key={fornitore.id} className={`rounded-xl border overflow-hidden ${!hasDuvri ? 'border-2 border-red-400 bg-red-50' : 'bg-white border-slate-200'}`}>
              {/* Header cliccabile */}
              <div
                className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${!hasDuvri ? 'hover:bg-red-100' : 'hover:bg-slate-50'}`}
                onClick={() => toggleEspanso(fornitore.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {!hasDuvri && <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full shrink-0">⚠️ DUVRI MANCANTE</span>}
                  <h3 className="text-sm font-bold text-slate-800 truncate">{fornitore.nome_ditta}</h3>
                  {fornitore.referente_nome && <span className="text-sm text-slate-500 hidden md:inline">· {fornitore.referente_nome}</span>}
                  {fornitore.lavoratori?.length > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold hidden md:inline-flex items-center gap-1">
                      <Users className="w-3 h-3" />{fornitore.lavoratori.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="icon" className="w-7 h-7"
                    onClick={(e) => { e.stopPropagation(); setEditingFornitore(fornitore); setShowForm(true); }}>
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" className="w-7 h-7 text-red-600 hover:text-red-700"
                    onClick={(e) => { e.stopPropagation(); setDeleteDialog(fornitore); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  {espanso ? <ChevronDown className="w-4 h-4 text-slate-400 rotate-180 transition-transform" /> : <ChevronDown className="w-4 h-4 text-slate-400 transition-transform" />}
                </div>
              </div>

              {/* Contenuto espandibile */}
              {espanso && (
                <div className="px-4 pb-4 border-t border-slate-100 space-y-4 pt-4">
                  {/* Contatti */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {fornitore.referente_nome && (
                      <span className="text-slate-700"><strong>{fornitore.referente_nome}</strong></span>
                    )}
                    {fornitore.referente_email && (
                      <a href={`mailto:${fornitore.referente_email}`} className="flex items-center gap-1 text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
                        <Mail className="w-4 h-4 text-slate-400" />{fornitore.referente_email}
                      </a>
                    )}
                    {fornitore.referente_telefono && (
                      <a href={`tel:${fornitore.referente_telefono}`} className="flex items-center gap-1 text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
                        <Phone className="w-4 h-4 text-slate-400" />{fornitore.referente_telefono}
                      </a>
                    )}
                  </div>

                  {/* DUVRI */}
                  {hasDuvri && (
                    <div className="flex flex-wrap gap-2">
                      {fornitore.duvri_urls.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer"
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold hover:bg-green-200 transition-colors inline-flex items-center gap-1"
                          onClick={e => e.stopPropagation()}>
                          📄 DUVRI {idx + 1} ({new Date(fornitore.updated_date).toLocaleDateString('it-IT')})
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Lavoratori e DPI */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {fornitore.lavoratori?.length > 0 && (
                      <div>
                        <p className="font-medium text-slate-700 mb-2">Lavoratori:</p>
                        <ul className="space-y-1">
                          {fornitore.lavoratori.map((lav, idx) => (
                            <li key={idx} className="text-slate-600">• {lav.nome}{lav.mansione && <span className="text-slate-500"> ({lav.mansione})</span>}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {fornitore.dpi?.length > 0 && (
                      <div>
                        <p className="font-medium text-slate-700 mb-2">DPI:</p>
                        <div className="flex flex-wrap gap-2">
                          {fornitore.dpi.map((dpi, idx) => (
                            <span key={idx} className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">{dpi}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Subornitori */}
                  {fornitore.subornitori?.length > 0 && (
                    <div className="pt-3 border-t border-slate-200">
                      <p className="font-medium text-slate-700 mb-2">Subornitori:</p>
                      <div className="space-y-2">
                        {fornitore.subornitori.map((sub, idx) => (
                          <div key={idx} className={`p-3 rounded border ${!sub.duvri_urls?.length ? 'border-2 border-red-400 bg-red-50' : 'bg-amber-50 border-amber-200'}`}>
                            {!sub.duvri_urls?.length && <div className="bg-red-500 text-white px-3 py-1 font-bold text-xs mb-2 rounded">⚠️ DUVRI MANCANTE</div>}
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                              <p className="font-medium">{sub.nome_ditta}</p>
                              {sub.referente_nome && <span>{sub.referente_nome}</span>}
                              {sub.referente_email && <a href={`mailto:${sub.referente_email}`} className="text-blue-600 hover:underline">{sub.referente_email}</a>}
                              {sub.referente_telefono && <a href={`tel:${sub.referente_telefono}`} className="text-blue-600 hover:underline">{sub.referente_telefono}</a>}
                              {sub.lavoratori?.length > 0 && <span>Lavoratori: {sub.lavoratori.map(l => `${l.nome}${l.mansione ? ` (${l.mansione})` : ''}`).join(', ')}</span>}
                              {sub.duvri_urls?.length > 0 && (
                                <span className="flex gap-2">
                                  {sub.duvri_urls.map((url, dIdx) => (
                                    <a key={dIdx} href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">📄 DUVRI {dIdx + 1}</a>
                                  ))}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Note */}
                  {fornitore.note && (
                    <div className="pt-3 border-t border-slate-200">
                      <p className="text-sm text-slate-600"><strong>Note:</strong> {fornitore.note}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <FormFornitore
          fornitore={editingFornitore}
          centroId={centroSelezionato.id}
          onSubmit={loadFornitori}
          onClose={() => {
            setShowForm(false);
            setEditingFornitore(null);
          }}
        />
      )}

      {/* Delete Dialog */}
      {deleteDialog && (
        <Dialog open onOpenChange={() => setDeleteDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Elimina Fornitore</DialogTitle>
            </DialogHeader>
            <p className="text-slate-600">
              Sei sicuro di voler eliminare <strong>{deleteDialog.nome_ditta}</strong>?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialog(null)}>Annulla</Button>
              <Button
                onClick={handleDeleteFornitore}
                className="bg-red-600 hover:bg-red-700"
              >
                Elimina
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}