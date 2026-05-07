import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { compressImages } from '@/lib/compressImage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import DatePicker from '@/components/ui/DatePicker';
import { Camera, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function QuickFormControllo({ open, onClose, onSaved, centroSelezionato, user }) {
  const [form, setForm] = useState({
    titolo: '',
    descrizione: '',
    data_scadenza: format(new Date(), 'yyyy-MM-dd'),
    foto_urls: [],
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const camRef = useRef();

  const reset = () => setForm({ titolo: '', descrizione: '', data_scadenza: format(new Date(), 'yyyy-MM-dd'), foto_urls: [] });

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    const compressed = await compressImages(Array.from(files));
    const urls = await Promise.all(compressed.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
    setForm(f => ({ ...f, foto_urls: [...f.foto_urls, ...urls] }));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.titolo.trim() || !form.data_scadenza) return;
    setSaving(true);
    await base44.entities.Manutenzione.create({
      ...form,
      centro_id: centroSelezionato?.id !== 'tutti' ? centroSelezionato?.id : '',
      stato: 'da_fare',
      assegnato_da_email: user?.email,
      assegnato_da_nome: user?.full_name,
    });
    setSaving(false);
    reset();
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuovo Controllo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div>
            <label className="text-sm font-medium text-slate-700">Titolo *</label>
            <Input className="mt-1" value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))} placeholder="Es. Controllo estintori" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Data scadenza *</label>
            <div className="mt-1">
              <DatePicker value={form.data_scadenza} onChange={v => setForm(f => ({ ...f, data_scadenza: v }))} placeholder="Seleziona data" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Descrizione</label>
            <Textarea className="mt-1" value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} placeholder="Descrizione..." rows={3} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Foto</label>
            <div className="mt-2 flex gap-2 flex-wrap">
              {form.foto_urls.map((url, i) => (
                <div key={i} className="relative w-16 h-16">
                  <img src={url} className="w-16 h-16 object-cover rounded-lg border" />
                  <button onClick={() => setForm(f => ({ ...f, foto_urls: f.foto_urls.filter((_, j) => j !== i) }))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {uploading && <div className="w-16 h-16 bg-slate-100 rounded-lg border flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>}
              <button onClick={() => camRef.current?.click()} className="w-16 h-16 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-slate-100 text-slate-500">
                <Camera className="w-4 h-4" /><span className="text-[10px]">Camera</span>
              </button>
            </div>
            <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFiles(e.target.files)} />
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => { reset(); onClose(); }}>Annulla</Button>
            <Button onClick={handleSave} disabled={saving || !form.titolo.trim()} className="bg-indigo-600 hover:bg-indigo-700">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Salva
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}