import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { compressImages } from '@/lib/compressImage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DatePicker from '@/components/ui/DatePicker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Loader2 } from 'lucide-react';
import { addDays, addWeeks, addMonths } from 'date-fns';

const today = () => new Date().toISOString().split('T')[0];

const defaultForm = (centroId) => ({
  centro_id: centroId || '', titolo: '', descrizione: '', frequenza: 'mensile',
  ultima_esecuzione: today(), prossima_scadenza: today(), stato: 'da_programmare',
  fornitore: '', note: '', foto_urls: []
});

export default function FormPuliziaPeriodica({ open, onClose, pulizia, centroId, onSave }) {
  const [form, setForm] = useState(defaultForm(centroId));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pulizia) { setForm({ ...defaultForm(centroId), ...pulizia }); }
    else { setForm(defaultForm(centroId)); }
  }, [pulizia, centroId, open]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const compressed = await compressImages(files);
    const urls = [];
    for (const file of compressed) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setForm(prev => ({ ...prev, foto_urls: [...(prev.foto_urls || []), ...urls] }));
    setUploading(false);
  };

  const creaManutenzione = async (puliziaId, f) => {
    await base44.entities.Manutenzione.create({
      titolo: f.titolo, descrizione: f.descrizione || '', centro_id: f.centro_id,
      data_scadenza: f.prossima_scadenza || f.ultima_esecuzione, stato: 'da_fare', pulizia_periodica_id: puliziaId
    });
  };

  const aggiornaManutenzione = async (puliziaId, f) => {
    const esistenti = await base44.entities.Manutenzione.filter({ pulizia_periodica_id: puliziaId });
    if (esistenti.length > 0) {
      await base44.entities.Manutenzione.update(esistenti[0].id, { titolo: f.titolo, data_scadenza: f.prossima_scadenza || f.ultima_esecuzione, descrizione: f.descrizione || '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (pulizia?.id) {
        const statoOriginale = pulizia.stato || 'da_programmare';
        await base44.entities.PuliziaPeriodica.update(pulizia.id, form);
        if (form.stato === 'programmato' && statoOriginale !== 'programmato') {
          await creaManutenzione(pulizia.id, form);
        } else if (form.stato === 'programmato' && statoOriginale === 'programmato') {
          await aggiornaManutenzione(pulizia.id, form);
        } else if (form.stato !== 'programmato' && statoOriginale === 'programmato') {
          const esistenti = await base44.entities.Manutenzione.filter({ pulizia_periodica_id: pulizia.id });
          for (const m of esistenti) await base44.entities.Manutenzione.delete(m.id);
        }
      } else {
        const nuova = await base44.entities.PuliziaPeriodica.create(form);
        if (form.stato === 'programmato') await creaManutenzione(nuova.id, form);
      }
    } finally {
      setSaving(false);
      onSave();
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{pulizia ? 'Modifica Pulizia Periodica' : 'Nuova Pulizia Periodica'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Titolo *</Label><Input value={form.titolo} onChange={e => set('titolo', e.target.value)} required className="mt-1" /></div>

          <div>
            <Label>Frequenza</Label>
            <Select value={form.frequenza} onValueChange={v => set('frequenza', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['giornaliera','settimanale','quindicinale','mensile','trimestrale','semestrale','annuale'].map(f => <SelectItem key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Stato</Label>
            <Select value={form.stato} onValueChange={v => set('stato', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="da_programmare">Da programmare</SelectItem>
                <SelectItem value="programmato">Programmato</SelectItem>
                <SelectItem value="completato">Completato</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Da</Label><div className="mt-1"><DatePicker value={form.ultima_esecuzione} onChange={v => setForm(prev => ({ ...prev, ultima_esecuzione: v, prossima_scadenza: v }))} /></div></div>
            <div><Label>A</Label><div className="mt-1"><DatePicker value={form.prossima_scadenza} onChange={v => set('prossima_scadenza', v)} placeholder="Seleziona data fine" /></div></div>
          </div>

          <div><Label>Descrizione</Label><Textarea value={form.descrizione} onChange={e => set('descrizione', e.target.value)} rows={2} className="mt-1" /></div>
          <div><Label>Fornitore</Label><Input value={form.fornitore} onChange={e => set('fornitore', e.target.value)} className="mt-1" /></div>
          <div><Label>Note</Label><Textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2} className="mt-1" /></div>

          <div>
            <Label>Foto</Label>
            <label className="mt-1 flex items-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-lg px-4 py-3 hover:bg-slate-50">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-slate-400" />}
              <span className="text-sm text-slate-600">{uploading ? 'Caricamento...' : 'Carica foto'}</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
            {(form.foto_urls || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.foto_urls.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt="" className="w-16 h-16 rounded object-cover" />
                    <button type="button" onClick={() => setForm(prev => ({ ...prev, foto_urls: prev.foto_urls.filter((_, idx) => idx !== i) }))} className="absolute -top-1 -right-1 bg-white rounded-full shadow p-0.5"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annulla</Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700">{saving ? 'Salvataggio...' : 'Salva'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}