import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Camera, ImagePlus, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const DEFAULT = {
  titolo: '',
  data: format(new Date(), 'yyyy-MM-dd'),
  descrizione: '',
  foto_urls: [],
};

export default function FormPulizia({ open, onClose, pulizia, centroId, user, onSave }) {
  const [form, setForm] = useState(DEFAULT);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef();
  const cameraInputRef = useRef();

  useEffect(() => {
    if (open) {
      setForm(pulizia ? {
        titolo: pulizia.titolo || '',
        data: pulizia.data || format(new Date(), 'yyyy-MM-dd'),
        descrizione: pulizia.descrizione || '',
        foto_urls: pulizia.foto_urls || [],
      } : { ...DEFAULT, data: format(new Date(), 'yyyy-MM-dd') });
    }
  }, [open, pulizia]);

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    const urls = [];
    for (const file of Array.from(files)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setForm(f => ({ ...f, foto_urls: [...f.foto_urls, ...urls] }));
    setUploading(false);
  };

  const removePhoto = (idx) => {
    setForm(f => ({ ...f, foto_urls: f.foto_urls.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    if (!form.titolo.trim() || !form.data) return;
    setSaving(true);
    const payload = {
      ...form,
      centro_id: centroId,
      creato_da_email: user?.email,
      creato_da_nome: user?.full_name,
    };
    if (pulizia?.id) {
      await base44.entities.Pulizia.update(pulizia.id, payload);
    } else {
      await base44.entities.Pulizia.create(payload);
    }
    setSaving(false);
    onSave();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pulizia?.id ? 'Modifica Segnalazione' : 'Nuova Segnalazione Pulizie'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div>
            <label className="text-sm font-medium text-slate-700">Titolo *</label>
            <Input className="mt-1" value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))} placeholder="Es. Pavimento ingresso sporco" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Data *</label>
            <Input className="mt-1" type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Descrizione</label>
            <Textarea className="mt-1" value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} placeholder="Descrizione dettagliata..." rows={3} />
          </div>

          {/* Foto */}
          <div>
            <label className="text-sm font-medium text-slate-700">Foto</label>
            <div className="mt-2 flex gap-2 flex-wrap">
              {form.foto_urls.map((url, i) => (
                <div key={i} className="relative w-20 h-20">
                  <img src={url} className="w-20 h-20 object-cover rounded-lg border" />
                  <button onClick={() => removePhoto(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {uploading && (
                <div className="w-20 h-20 bg-slate-100 rounded-lg border flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                </div>
              )}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-slate-100 text-slate-500"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[10px]">Fotocamera</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-slate-100 text-slate-500"
              >
                <ImagePlus className="w-5 h-5" />
                <span className="text-[10px]">Galleria</span>
              </button>
            </div>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFiles(e.target.files)} />
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>Annulla</Button>
            <Button onClick={handleSave} disabled={saving || !form.titolo.trim()} className="bg-blue-600 hover:bg-blue-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Salva
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}