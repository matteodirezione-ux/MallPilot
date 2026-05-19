import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { compressImages } from '@/lib/compressImage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Camera, ImagePlus, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const DEFAULT = { titolo: '', data: format(new Date(), 'yyyy-MM-dd'), descrizione: '', foto_urls: [] };

export default function FormPulizia({ open, onClose, pulizia, centroId, user, onSave }) {
  const [form, setForm] = useState(DEFAULT);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef();
  const cameraInputRef = useRef();

  useEffect(() => {
    if (open) {
      setForm(pulizia ? { titolo: pulizia.titolo || '', data: pulizia.data || format(new Date(), 'yyyy-MM-dd'), descrizione: pulizia.descrizione || '', foto_urls: pulizia.foto_urls || [] } : { ...DEFAULT, data: format(new Date(), 'yyyy-MM-dd') });
    }
  }, [open, pulizia]);

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    const compressed = await compressImages(Array.from(files));
    const urls = [];
    for (const file of compressed) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setForm(f => ({ ...f, foto_urls: [...f.foto_urls, ...urls] }));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.titolo.trim() || !form.data) return;
    setSaving(true);
    const payload = { ...form, centro_id: centroId, creato_da_email: user?.email, creato_da_nome: user?.full_name };
    if (pulizia?.id) { await base44.entities.Pulizia.update(pulizia.id, payload); }
    else { await base44.entities.Pulizia.create(payload); }
    setSaving(false);
    onSave();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{pulizia?.id ? 'Modifica Segnalazione' : 'Nuova Segnalazione Pulizie'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><label className="text-sm font-medium">Titolo *</label><Input value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))} placeholder="Es. Pavimento ingresso sporco" className="mt-1" /></div>
          <div><label className="text-sm font-medium">Data *</label><Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="mt-1" /></div>
          <div><label className="text-sm font-medium">Descrizione</label><Textarea value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} rows={3} className="mt-1" placeholder="Descrizione della segnalazione..." /></div>
          <div>
            <label className="text-sm font-medium">Foto</label>
            <div className="flex gap-2 mt-1">
              <label className="flex items-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50 text-sm text-slate-600 flex-1">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />} Galleria
                <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={e => handleFiles(e.target.files)} />
              </label>
              <label className="flex items-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50 text-sm text-slate-600 flex-1">
                <Camera className="w-4 h-4" /> Fotocamera
                <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={e => handleFiles(e.target.files)} />
              </label>
            </div>
            {form.foto_urls.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.foto_urls.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt="" className="w-16 h-16 rounded object-cover" />
                    <button onClick={() => setForm(f => ({ ...f, foto_urls: f.foto_urls.filter((_, idx) => idx !== i) }))} className="absolute -top-1 -right-1 bg-white rounded-full shadow p-0.5"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Annulla</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700">{saving ? 'Salvataggio...' : 'Salva'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}