import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Building2, MapPin, Pencil, Trash2, Map, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SpaziExpo({ centroSelezionato, user }) {
  const [spazi, setSpazi] = useState([]);
  const [centri, setCentri] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSpazio, setEditingSpazio] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [mappaOpen, setMappaOpen] = useState(false);
  const [uploadingMappa, setUploadingMappa] = useState(false);
  const [mappaUrl, setMappaUrl] = useState(null);
  const isDirettore = user?.tipo_account === 'direttore';

  const [formData, setFormData] = useState({
    centro_id: '', numero_spazio: '', nome: '', descrizione: '',
    superficie_mq: '', colore: '#3b82f6', foto_urls: [], piantina_url: '', solo_eventi: false, attivo: true
  });

  useEffect(() => {
    if (centroSelezionato && centroSelezionato.id) { loadSpazi(); setMappaUrl(centroSelezionato?.piantina_url || null); }
  }, [centroSelezionato]);

  useEffect(() => { loadCentri(); }, [user]);

  const loadCentri = async () => {
    try {
      if (user?.tipo_account === 'proprieta') {
        const allCentri = await base44.entities.CentroCommerciale.list();
        setCentri(allCentri || []);
      } else if (user?.tipo_account === 'direttore') {
        const assegnazioni = await base44.entities.Assegnazione.filter({ user_email: user.email });
        const centriIds = [...new Set(assegnazioni.map(a => a.centro_id))];
        if (centriIds.length > 0) {
          const centriAssegnati = await Promise.all(centriIds.map(id => base44.entities.CentroCommerciale.filter({ id })));
          setCentri(centriAssegnati.flat().filter(c => c));
        } else { setCentri([]); }
      }
    } catch (error) { setCentri([]); }
  };

  const loadSpazi = async () => {
    try {
      setLoading(true);
      if (!centroSelezionato || !centroSelezionato.id) { setLoading(false); return; }
      const data = centroSelezionato?.id === 'tutti'
        ? await base44.entities.SpazioExpo.list()
        : await base44.entities.SpazioExpo.filter({ centro_id: centroSelezionato.id });
      const sorted = (data || []).sort((a, b) => (a.numero_spazio || '').localeCompare(b.numero_spazio || '', 'it', { numeric: true }));
      setSpazi(sorted);
    } catch (error) { toast.error('Errore nel caricamento degli spazi'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSave = { ...formData, superficie_mq: formData.superficie_mq ? parseFloat(formData.superficie_mq) : null };
      if (editingSpazio) {
        await base44.entities.SpazioExpo.update(editingSpazio.id, dataToSave);
        toast.success('Spazio aggiornato');
      } else {
        await base44.entities.SpazioExpo.create(dataToSave);
        toast.success('Spazio creato');
      }
      setDialogOpen(false);
      resetForm();
      loadSpazi();
    } catch (error) { toast.error('Errore nel salvataggio dello spazio'); }
  };

  const handleEdit = (spazio) => {
    setEditingSpazio(spazio);
    setFormData({ centro_id: spazio.centro_id, numero_spazio: spazio.numero_spazio, nome: spazio.nome || '', descrizione: spazio.descrizione || '', superficie_mq: spazio.superficie_mq || '', colore: spazio.colore || '#3b82f6', foto_urls: spazio.foto_urls || [], piantina_url: spazio.piantina_url || '', solo_eventi: spazio.solo_eventi || false, attivo: spazio.attivo });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo spazio?')) return;
    try { await base44.entities.SpazioExpo.delete(id); toast.success('Spazio eliminato'); loadSpazi(); }
    catch (error) { toast.error("Errore nell'eliminazione"); }
  };

  const handleFileUpload = async (e, type) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';
    try {
      setUploading(true);
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        if (type === 'foto') { setFormData(prev => ({ ...prev, foto_urls: [...prev.foto_urls, file_url] })); }
        else if (type === 'piantina') { setFormData(prev => ({ ...prev, piantina_url: file_url })); }
      }
      toast.success('File caricato');
    } catch (error) { toast.error('Errore nel caricamento'); }
    finally { setUploading(false); }
  };

  const handleUploadMappa = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMappa(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.CentroCommerciale.update(centroSelezionato.id, { piantina_url: file_url });
      setMappaUrl(file_url);
      toast.success('Mappa caricata');
    } catch { toast.error('Errore caricamento mappa'); }
    finally { setUploadingMappa(false); }
  };

  const resetForm = () => {
    const defaultCentroId = centroSelezionato?.id === 'tutti' ? (centri.length > 0 ? centri[0].id : '') : (centroSelezionato?.id || '');
    setFormData({ centro_id: defaultCentroId, numero_spazio: '', nome: '', descrizione: '', superficie_mq: '', colore: '#3b82f6', foto_urls: [], piantina_url: '', solo_eventi: false, attivo: true });
    setEditingSpazio(null);
  };

  if (!centroSelezionato || !centroSelezionato.id) return <div className="p-8 text-center text-slate-500">Nessun centro commerciale assegnato</div>;
  if (loading) return <div className="p-8 text-center text-slate-400">Caricamento...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Spazi Expo</h1>
          <p className="text-slate-500 text-sm">Spazi disponibili in galleria - {centroSelezionato?.nome}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setMappaOpen(true)} className="bg-orange-500 hover:bg-orange-600 gap-2"><Map className="w-4 h-4" /> Mappa</Button>
          {user?.tipo_account !== 'vigilanza' && (
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700 gap-2"><Plus className="w-4 h-4" /> Nuovo Spazio</Button>
          )}
        </div>
      </div>

      {spazi.length === 0 ? (
        <div className="text-center py-8 text-slate-400">Nessuno spazio configurato</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {spazi.map(spazio => (
            <div
              key={spazio.id}
              className={`rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm transition-all duration-300 cursor-default
                shadow-[0_4px_20px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.05)]
                hover:shadow-[0_12px_40px_rgba(0,0,0,0.14),0_4px_12px_rgba(0,0,0,0.08)]
                hover:-translate-y-1
                ${!spazio.attivo ? 'opacity-50' : ''}`}
            >
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: spazio.colore || '#3b82f6' }} />
                    <span className="font-bold text-base text-slate-800 flex-shrink-0">{spazio.numero_spazio}</span>
                    {spazio.nome && <span className="font-semibold text-sm text-slate-700 truncate">{spazio.nome}</span>}
                    {spazio.superficie_mq && <span className="text-xs text-slate-400 flex-shrink-0">{spazio.superficie_mq} m²</span>}
                  </div>
                  {user?.tipo_account !== 'vigilanza' && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => handleEdit(spazio)} className="p-1 rounded-lg hover:bg-slate-100 transition-colors"><Pencil className="w-3.5 h-3.5 text-slate-400" /></button>
                      <button onClick={() => handleDelete(spazio.id)} className="p-1 rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  )}
                </div>
              </div>
              <div className="relative">
                {spazio.foto_urls?.length > 0 ? (
                  <div className="w-full" style={{ aspectRatio: '4/3' }}>
                    <img src={spazio.foto_urls[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full bg-slate-100 flex items-center justify-center" style={{ aspectRatio: '4/3' }}>
                    <Building2 className="w-6 h-6 text-slate-300" />
                  </div>
                )}
                {spazio.solo_eventi && (
                  <span className="absolute top-1.5 left-1.5 text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded-full shadow">Solo eventi</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog Modifica/Nuovo Spazio */}
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingSpazio ? 'Modifica Spazio' : 'Nuovo Spazio'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label className="text-sm">Centro *</Label>
              <select value={formData.centro_id} onChange={e => setFormData({ ...formData, centro_id: e.target.value })} className="mt-1 w-full h-8 px-3 text-sm border border-slate-300 rounded-lg" required>
                <option value="">Seleziona centro</option>
                {centri.map(centro => <option key={centro.id} value={centro.id}>{centro.nome}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1"><Label className="text-sm">Numero *</Label><Input value={formData.numero_spazio} onChange={e => setFormData({ ...formData, numero_spazio: e.target.value })} placeholder="es. A12" required className="mt-1 h-8 text-sm" /></div>
              <div className="w-24"><Label className="text-sm">m²</Label><Input type="number" value={formData.superficie_mq} onChange={e => setFormData({ ...formData, superficie_mq: e.target.value })} placeholder="m²" className="mt-1 h-8 text-sm" /></div>
            </div>
            <div><Label className="text-sm">Nome</Label><Input value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} placeholder="es. Ingresso principale" className="mt-1 h-8 text-sm" /></div>
            <div className="flex items-center gap-3">
              <div><Label className="text-sm">Colore</Label><input type="color" value={formData.colore} onChange={e => setFormData({ ...formData, colore: e.target.value })} className="mt-1 w-14 h-8 p-1 border border-slate-300 rounded" /></div>
              <div className="flex-1"><Label className="text-sm">Descrizione</Label><Input value={formData.descrizione} onChange={e => setFormData({ ...formData, descrizione: e.target.value })} className="mt-1 h-8 text-sm" /></div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={formData.solo_eventi} onChange={e => setFormData({ ...formData, solo_eventi: e.target.checked })} className="rounded" /> Solo eventi
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={formData.attivo} onChange={e => setFormData({ ...formData, attivo: e.target.checked })} className="rounded" /> Attivo
              </label>
            </div>
            <div>
              <Label className="text-sm">Foto</Label>
              <label className="mt-1 flex items-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50 text-sm text-slate-600">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />} Carica foto
                <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'foto')} />
              </label>
              {formData.foto_urls.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.foto_urls.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt="" className="w-14 h-14 rounded object-cover" />
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, foto_urls: prev.foto_urls.filter((_, idx) => idx !== i) }))} className="absolute -top-1 -right-1 bg-white rounded-full shadow p-0.5 text-xs">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Annulla</Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">Salva</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Mappa */}
      <Dialog open={mappaOpen} onOpenChange={setMappaOpen}>
        <DialogContent className="w-[95vw] max-w-5xl">
          <DialogHeader><DialogTitle>Mappa centro - {centroSelezionato?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {mappaUrl ? (
              <img src={mappaUrl} alt="Mappa centro" className="w-full rounded-lg object-contain max-h-[75vh]" />
            ) : (
              <div className="flex items-center justify-center h-40 bg-slate-100 rounded-lg text-slate-400 text-sm">Nessuna mappa caricata</div>
            )}
            {user?.tipo_account !== 'vigilanza' && (
              <label className="flex items-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-lg px-4 py-3 hover:bg-slate-50 text-sm text-slate-600">
                {uploadingMappa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Map className="w-4 h-4" />}
                {uploadingMappa ? 'Caricamento...' : 'Carica nuova mappa'}
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadMappa} />
              </label>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}