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
  const [expandedFornitore, setExpandedFornitore] = useState(null);

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
        <div className="grid gap-4">
          {filteredFornitori.sort((a, b) => a.nome_ditta.localeCompare(b.nome_ditta, 'it')).map((fornitore) => (
            <Card key={fornitore.id} className={`hover:shadow-md transition-shadow ${!fornitore.duvri_url ? 'border-2 border-red-400 bg-red-50' : ''}`}>
              {!fornitore.duvri_url && (
                <div className="bg-red-500 text-white px-4 py-2 font-bold text-sm">
                  ⚠️ DUVRI MANCANTE
                </div>
              )}
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Intestazione */}
                   <div className="flex items-start justify-between">
                     <div className="flex-1">
                       <h3 className="text-lg font-bold text-slate-800">{fornitore.nome_ditta}</h3>
                     </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setEditingFornitore(fornitore);
                          setShowForm(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDeleteDialog(fornitore)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-3 border-y border-slate-200">
                    {/* Referente */}
                    {fornitore.referente_nome && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">
                          <strong>{fornitore.referente_nome}</strong>
                        </span>
                      </div>
                    )}
                    {/* Email */}
                    {fornitore.referente_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-500" />
                        <a
                          href={`mailto:${fornitore.referente_email}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {fornitore.referente_email}
                        </a>
                      </div>
                    )}
                    {/* Telefono */}
                    {fornitore.referente_telefono && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-500" />
                        <a
                          href={`tel:${fornitore.referente_telefono}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {fornitore.referente_telefono}
                        </a>
                      </div>
                    )}
                    {/* Lavoratori + DUVRI */}
                    {(fornitore.lavoratori?.length > 0 || fornitore.duvri_url) && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {fornitore.lavoratori?.length > 0 && (
                          <button
                            onClick={() => setExpandedFornitore(expandedFornitore === fornitore.id ? null : fornitore.id)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold hover:bg-blue-200 transition-colors flex items-center gap-1"
                          >
                            <Users className="w-3 h-3" />
                            {fornitore.lavoratori.length} lavoratore{fornitore.lavoratori.length > 1 ? 'i' : ''}
                          </button>
                        )}
                        {fornitore.duvri_url && (
                          <a
                            href={fornitore.duvri_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold hover:bg-green-200 transition-colors inline-flex items-center gap-1"
                          >
                            📄 DUVRI {fornitore.updated_date && `(${new Date(fornitore.updated_date).toLocaleDateString('it-IT')})`}
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dettagli */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {/* Lavoratori Lista */}
                    {fornitore.lavoratori?.length > 0 && (
                      <div>
                        <button
                          onClick={() => setExpandedFornitore(expandedFornitore === fornitore.id ? null : fornitore.id)}
                          className="flex items-center gap-2 font-medium text-slate-700 mb-2 hover:text-slate-900 cursor-pointer"
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${expandedFornitore === fornitore.id ? 'rotate-180' : ''}`}
                          />
                          Lavoratori:
                        </button>
                        {expandedFornitore === fornitore.id && (
                          <ul className="space-y-1">
                            {fornitore.lavoratori.map((lav, idx) => (
                              <li key={idx} className="text-slate-600">
                                • {lav.nome}
                                {lav.mansione && <span className="text-slate-500"> ({lav.mansione})</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* DPI */}
                    {fornitore.dpi?.length > 0 && (
                      <div>
                        <p className="font-medium text-slate-700 mb-2">DPI:</p>
                        <div className="flex flex-wrap gap-2">
                          {fornitore.dpi.map((dpi, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs"
                            >
                              {dpi}
                            </span>
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
                          <div key={idx} className="p-2 bg-amber-50 rounded border border-amber-200">
                            <p className="font-medium text-amber-900 text-sm">{sub.nome_ditta}</p>
                            {sub.referente_nome && (
                              <p className="text-xs text-amber-700">{sub.referente_nome}</p>
                            )}
                            {sub.duvri_url && (
                              <a
                                href={sub.duvri_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 hover:underline block mt-1"
                              >
                                📄 DUVRI
                              </a>
                            )}
                            {sub.lavoratori?.length > 0 && (
                              <p className="text-xs text-amber-700 mt-1">
                                {sub.lavoratori.length} lavoratore{sub.lavoratori.length > 1 ? 'i' : ''}
                              </p>
                            )}
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
              </CardContent>
            </Card>
          ))}
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