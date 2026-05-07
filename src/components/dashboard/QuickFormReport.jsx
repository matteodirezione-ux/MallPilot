import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { compressImages } from '@/lib/compressImage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Camera, X, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const today = () => format(new Date(), 'yyyy-MM-dd');

export default function QuickFormReport({ open, onClose, onSaved, centroSelezionato, user }) {
  const [form, setForm] = useState({ data: today(), operatore: '', contenuto: '', furto: false, foto_urls: [] });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const camRef = useRef();

  const reset = () => setForm({ data: today(), operatore: '', contenuto: '', furto: false, foto_urls: [] });

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    const compressed = await compressImages(Array.from(files));
    const urls = await Promise.all(compressed.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
    setForm(f => ({ ...f, foto_urls: [...f.foto_urls, ...urls] }));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.operatore.trim() || !form.data) return;
    setSaving(true);
    await base44.entities.Report.create({
      ...form,
      centro_id: centroSelezionato?.id !== 'tutti' ? centroSelezionato?.id : '',
      creato_da_email: user?.email,
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
          <DialogTitle>Nuovo Report</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div>
            <label className="text-sm font-medium text-slate-700">Data *</label>
            <Input className="mt-1" type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Operatore *</label>
            <Input className="mt-1" value={form.operatore} onChange={e => setForm(f => ({ ...f, operatore: e.target.value }))} placeholder="Es. Mario Rossi" />
          </div>
          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <input type="checkbox" id="furto-quick" checked={form.furto} onChange={e => setForm(f => ({ ...f, furto: e.target.checked }))} className="w-4 h-4 accent-red-600 cursor-pointer" />
            <label htmlFor="furto-quick" className="text-sm font-medium text-red-700 cursor-pointer flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Furto verificato durante il turno
            </label>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Contenuto</label>
            <Textarea className="mt-1 min-h-[100px]" value={form.contenuto} onChange={e => setForm(f => ({ ...f, contenuto: e.target.value }))} placeholder="Descrivi l'attività svolta, anomalie, note..." />
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
            <Button onClick={handleSave} disabled={saving || !form.operatore.trim()} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Salva
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}