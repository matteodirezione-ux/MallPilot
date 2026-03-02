import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Building2, MapPin, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function SpaziExpo({ centroSelezionato, user }) {
  const [spazi, setSpazi] = useState([]);
  const [centri, setCentri] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSpazio, setEditingSpazio] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    centro_id: '',
    numero_spazio: '',
    nome: '',
    descrizione: '',
    superficie_mq: '',
    colore: '#3b82f6',
    foto_urls: [],
    piantina_url: '',
    solo_eventi: false,
    attivo: true
  });

  useEffect(() => {
    if (centroSelezionato && centroSelezionato.id) {
      loadSpazi();
    }
  }, [centroSelezionato]);

  useEffect(() => {
    loadCentri();
  }, [user]);

  const loadCentri = async () => {
    try {
      if (user?.tipo_account === 'proprieta') {
        const allCentri = await base44.entities.CentroCommerciale.list();
        setCentri(allCentri || []);
      } else if (user?.tipo_account === 'direttore') {
        const assegnazioni = await base44.entities.Assegnazione.filter({ user_email: user.email });
        const centriIds = [...new Set(assegnazioni.map(a => a.centro_id))];
        if (centriIds.length > 0) {
          const centriAssegnati = await Promise.all(
            centriIds.map(id => base44.entities.CentroCommerciale.filter({ id }))
          );
          setCentri(centriAssegnati.flat().filter(c => c));
        } else {
          setCentri([]);
        }
      }
    } catch (error) {
      console.error('Errore caricamento centri:', error);
      setCentri([]);
    }
  };

  const loadSpazi = async () => {
    try {
      setLoading(true);
      
      if (!centroSelezionato || !centroSelezionato.id || !centroSelezionato.nome) {
        setLoading(false);
        return;
      }
      
      const data = centroSelezionato?.id === 'tutti'
        ? await base44.entities.SpazioExpo.list()
        : await base44.entities.SpazioExpo.filter({ 
            centro_id: centroSelezionato.id 
          });
      const sorted = (data || []).sort((a, b) => (a.numero_spazio || '').localeCompare(b.numero_spazio || '', 'it', { numeric: true }));
      setSpazi(sorted);
      
      // Carica tutti i centri per avere i nomi quando mostriamo "tutti"
      if (centroSelezionato?.id === 'tutti') {
        await loadCentri();
      }
    } catch (error) {
      console.error('Errore caricamento spazi:', error);
      toast.error('Errore nel caricamento degli spazi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...formData,
        superficie_mq: formData.superficie_mq ? parseFloat(formData.superficie_mq) : null
      };

      if (editingSpazio) {
        await base44.entities.SpazioExpo.update(editingSpazio.id, dataToSave);
        toast.success('Spazio aggiornato con successo');
      } else {
        await base44.entities.SpazioExpo.create(dataToSave);
        toast.success('Spazio creato con successo');
      }

      setDialogOpen(false);
      resetForm();
      loadSpazi();
    } catch (error) {
      console.error('Errore salvataggio spazio:', error);
      toast.error('Errore nel salvataggio dello spazio');
    }
  };

  const handleEdit = (spazio) => {
    setEditingSpazio(spazio);
    setFormData({
      centro_id: spazio.centro_id,
      numero_spazio: spazio.numero_spazio,
      nome: spazio.nome || '',
      descrizione: spazio.descrizione || '',
      superficie_mq: spazio.superficie_mq || '',
      colore: spazio.colore || '#3b82f6',
      foto_urls: spazio.foto_urls || [],
      piantina_url: spazio.piantina_url || '',
      solo_eventi: spazio.solo_eventi || false,
      attivo: spazio.attivo
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Sei sicuro di voler eliminare questo spazio?')) return;
    try {
      await base44.entities.SpazioExpo.delete(id);
      toast.success('Spazio eliminato');
      loadSpazi();
    } catch (error) {
      console.error('Errore eliminazione spazio:', error);
      toast.error('Errore nell\'eliminazione dello spazio');
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      if (type === 'foto') {
        setFormData(prev => ({
          ...prev,
          foto_urls: [...prev.foto_urls, file_url]
        }));
      } else if (type === 'piantina') {
        setFormData(prev => ({ ...prev, piantina_url: file_url }));
      }
      
      toast.success('File caricato con successo');
    } catch (error) {
      console.error('Errore upload file:', error);
      toast.error('Errore nel caricamento del file');
    } finally {
      setUploading(false);
    }
  };

  const removeFoto = (index) => {
    setFormData(prev => ({
      ...prev,
      foto_urls: prev.foto_urls.filter((_, i) => i !== index)
    }));
  };

  const resetForm = () => {
    // Imposta automaticamente il centro selezionato, tranne se è "tutti"
    const defaultCentroId = centroSelezionato?.id === 'tutti' 
      ? (centri.length > 0 ? centri[0].id : '')
      : (centroSelezionato?.id || '');
    
    setFormData({
      centro_id: defaultCentroId,
      numero_spazio: '',
      nome: '',
      descrizione: '',
      superficie_mq: '',
      colore: '#3b82f6',
      foto_urls: [],
      piantina_url: '',
      solo_eventi: false,
      attivo: true
    });
    setEditingSpazio(null);
  };

  if (!centroSelezionato || !centroSelezionato.id) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nessun centro commerciale assegnato</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Spazi Expo</h1>
          <p className="text-slate-600">{centroSelezionato?.nome}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          {user?.tipo_account !== 'vigilanza' && (
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Spazio
            </Button>
          </DialogTrigger>
          )}
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSpazio ? 'Modifica Spazio' : 'Nuovo Spazio'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              {(() => {
                const row = "flex items-start gap-3";
                const lbl = "w-36 flex-shrink-0 text-sm font-medium text-slate-700 pt-2";
                const fld = "flex-1 min-w-0";
                return (
                  <>
                    <div className={row}>
                      <label htmlFor="centro_id" className={lbl}>Centro *</label>
                      <div className={fld}>
                        <select
                          id="centro_id"
                          value={formData.centro_id}
                          onChange={(e) => setFormData({ ...formData, centro_id: e.target.value })}
                          className="w-full h-8 px-3 text-sm border border-slate-300 rounded-lg"
                          required
                        >
                          <option value="">Seleziona centro</option>
                          {centri.map(centro => (
                            <option key={centro.id} value={centro.id}>{centro.nome}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className={row}>
                      <label className={lbl}>Numero / m²</label>
                      <div className={`${fld} flex gap-2`}>
                        <Input
                          value={formData.numero_spazio}
                          onChange={(e) => setFormData({ ...formData, numero_spazio: e.target.value })}
                          placeholder="es. A12"
                          required
                          className="h-8 text-sm"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.superficie_mq}
                          onChange={(e) => setFormData({ ...formData, superficie_mq: e.target.value })}
                          placeholder="m²"
                          className="h-8 text-sm w-24"
                        />
                      </div>
                    </div>

                    <div className={row}>
                      <label htmlFor="nome" className={lbl}>Nome</label>
                      <div className={fld}>
                        <Input
                          id="nome"
                          value={formData.nome}
                          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                          placeholder="es. Ingresso principale"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    <div className={row}>
                      <label htmlFor="colore" className={lbl}>Colore</label>
                      <div className={`${fld} flex items-center gap-2`}>
                        <Input
                          id="colore"
                          type="color"
                          value={formData.colore}
                          onChange={(e) => setFormData({ ...formData, colore: e.target.value })}
                          className="w-14 h-8 p-1"
                        />
                        <span className="text-xs text-slate-500">Colore nel calendario</span>
                      </div>
                    </div>

                    <div className={row}>
                      <label htmlFor="descrizione" className={lbl}>Descrizione</label>
                      <div className={fld}>
                        <Textarea
                          id="descrizione"
                          value={formData.descrizione}
                          onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                          placeholder="Descrizione dello spazio..."
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    </div>

                    <div className={row}>
                      <label className={lbl}>Foto</label>
                      <div className={fld}>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'foto')}
                          disabled={uploading}
                          className="h-8 text-sm"
                        />
                        {formData.foto_urls.length > 0 && (
                          <div className="grid grid-cols-4 gap-1 mt-1">
                            {formData.foto_urls.map((url, index) => (
                              <div key={index} className="relative group">
                                <img src={url} alt={`Foto ${index + 1}`} className="w-full h-16 object-cover rounded" />
                                <button type="button" onClick={() => removeFoto(index)}
                                  className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={row}>
                      <label className={lbl}>Piantina</label>
                      <div className={fld}>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'piantina')}
                          disabled={uploading}
                          className="h-8 text-sm"
                        />
                        {formData.piantina_url && (
                          <div className="relative mt-1">
                            <img src={formData.piantina_url} alt="Piantina" className="w-full h-24 object-cover rounded" />
                            <button type="button" onClick={() => setFormData({ ...formData, piantina_url: '' })}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={row}>
                      <span className={lbl}>Opzioni</span>
                      <div className={`${fld} flex flex-col gap-2 pt-1.5`}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.solo_eventi}
                            onChange={(e) => setFormData({ ...formData, solo_eventi: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm text-slate-700">Spazio dedicato solo agli eventi</span>
                        </label>
                        {formData.solo_eventi && (
                          <p className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                            Questo spazio non verrà conteggiato nelle statistiche di affitto
                          </p>
                        )}
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.attivo}
                            onChange={(e) => setFormData({ ...formData, attivo: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm text-slate-700">Spazio attivo</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => { setDialogOpen(false); resetForm(); }}>
                        Annulla
                      </Button>
                      <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700">
                        {editingSpazio ? 'Aggiorna' : 'Crea'}
                      </Button>
                    </div>
                  </>
                );
              })()}
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {spazi.length === 0 ? (
        <Card className="bg-white border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-16 h-16 text-slate-300 mb-4" />
            <p className="text-slate-500 text-center mb-4">
              Nessuno spazio creato per questo centro
            </p>
            {user?.tipo_account !== 'vigilanza' && (
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crea il primo spazio
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {centroSelezionato?.id === 'tutti' ? (
            // Raggruppa per centro quando "Tutti i centri" è selezionato
            centri.map(centro => {
              const spaziCentro = spazi.filter(s => s.centro_id === centro.id);
              if (spaziCentro.length === 0) return null;
              
              return (
                <div key={centro.id}>
                  <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-blue-600" />
                    {centro.nome}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {spaziCentro.map((spazio) => (
                      <SpazioCard
                        key={spazio.id}
                        spazio={spazio}
                        onEdit={user?.tipo_account !== 'vigilanza' ? handleEdit : null}
                        onDelete={user?.tipo_account !== 'vigilanza' ? handleDelete : null}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            // Mostra direttamente gli spazi quando un singolo centro è selezionato
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {spazi.map((spazio) => (
                <SpazioCard
                  key={spazio.id}
                  spazio={spazio}
                  onEdit={user?.tipo_account !== 'vigilanza' ? handleEdit : null}
                  onDelete={user?.tipo_account !== 'vigilanza' ? handleDelete : null}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Componente separato per la card dello spazio
function SpazioCard({ spazio, onEdit, onDelete }) {
  return (
    <Card
      className="bg-white border-slate-200 hover:shadow-lg transition-shadow overflow-hidden"
      style={{ borderTopWidth: '4px', borderTopColor: spazio.colore || '#3b82f6' }}
    >
      {spazio.foto_urls && spazio.foto_urls.length > 0 ? (
        <div className="h-48 bg-slate-100 relative">
          <img
            src={spazio.foto_urls[0]}
            alt={spazio.numero_spazio}
            className="w-full h-full object-cover"
          />
          <div 
            className="absolute top-2 left-2 px-2 py-1 rounded-full text-white text-xs font-medium"
            style={{ backgroundColor: spazio.colore || '#3b82f6' }}
          >
            {spazio.numero_spazio}
          </div>
          {spazio.foto_urls.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              +{spazio.foto_urls.length - 1}
            </div>
          )}
        </div>
      ) : (
        <div className="h-48 relative flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${spazio.colore || '#3b82f6'}15 0%, ${spazio.colore || '#3b82f6'}30 100%)` }}>
          <Building2 className="w-16 h-16" style={{ color: spazio.colore || '#3b82f6', opacity: 0.4 }} />
          <div 
            className="absolute top-2 left-2 px-2 py-1 rounded-full text-white text-xs font-medium"
            style={{ backgroundColor: spazio.colore || '#3b82f6' }}
          >
            {spazio.numero_spazio}
          </div>
        </div>
      )}
      
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Spazio {spazio.numero_spazio}
            </h3>
            {spazio.nome && (
              <p className="text-sm text-slate-600">{spazio.nome}</p>
            )}
          </div>
          {(onEdit || onDelete) && (
            <div className="flex gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(spazio)}
                  className="h-8 w-8 text-blue-600"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(spazio.id)}
                  className="h-8 w-8 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {spazio.descrizione && (
          <p className="text-sm text-slate-600 mb-3 line-clamp-2">
            {spazio.descrizione}
          </p>
        )}

        <div className="space-y-2">
          {spazio.superficie_mq && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Building2 className="w-4 h-4" />
              <span>{spazio.superficie_mq} m²</span>
            </div>
          )}
          {spazio.piantina_url && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <MapPin className="w-4 h-4" />
              <span>Piantina disponibile</span>
            </div>
          )}
        </div>

        {!spazio.attivo && (
          <div className="mt-3 px-2 py-1 bg-red-50 text-red-700 text-xs rounded-lg text-center">
            Non attivo
          </div>
        )}
      </CardContent>
    </Card>
  );
}