import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Loader2, Camera } from 'lucide-react';
import { addDays, addWeeks, addMonths } from 'date-fns';

const FREQUENZA_GIORNI = {
  giornaliera: () => addDays(new Date(), 1),
  settimanale: () => addWeeks(new Date(), 1),
  quindicinale: () => addDays(new Date(), 15),
  mensile: () => addMonths(new Date(), 1),
  trimestrale: () => addMonths(new Date(), 3),
  semestrale: () => addMonths(new Date(), 6),
  annuale: () => addMonths(new Date(), 12),
};

const today = () => new Date().toISOString().split('T')[0];

const defaultForm = (centroId) => ({
  centro_id: centroId || '',
  titolo: '',
  descrizione: '',
  frequenza: 'mensile',
  ultima_esecuzione: today(),
  prossima_scadenza: today(),
  stato: 'da_programmare',
  fornitore: '',
  note: '',
  foto_urls: []
});

export default function FormPuliziaPeriodica({ open, onClose, pulizia, centroId, onSave }) {
  const [form, setForm] = useState({ ...defaultForm(centroId), stato: 'da_programmare' });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pulizia) {
      setForm({ ...defaultForm(centroId), ...pulizia });
    } else {
      setForm(defaultForm(centroId));
    }
  }, [pulizia, centroId, open]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleFrequenzaChange = (val) => {
    setForm(prev => {
      const nextDate = FREQUENZA_GIORNI[val]?.();
      const prossima = nextDate ? nextDate.toISOString().split('T')[0] : prev.prossima_scadenza;
      return { ...prev, frequenza: val, prossima_scadenza: prossima };
    });
  };

  const handleUltimaEsecuzioneChange = (val) => {
    setForm(prev => {
      if (!val) return { ...prev, ultima_esecuzione: val };
      return { ...prev, ultima_esecuzione: val, prossima_scadenza: val };
    });
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setForm(prev => ({ ...prev, foto_urls: [...(prev.foto_urls || []), ...urls] }));
    setUploading(false);
  };

  const removeFoto = (idx) => {
    setForm(prev => ({ ...prev, foto_urls: prev.foto_urls.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (pulizia?.id) {
      await base44.entities.PuliziaPeriodica.update(pulizia.id, form);
    } else {
      await base44.entities.PuliziaPeriodica.create(form);
    }
    setSaving(false);
    onSave();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pulizia ? 'Modifica Pulizia Periodica' : 'Nuova Pulizia Periodica'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label>Titolo *</Label>
            <Input value={form.titolo} onChange={e => set('titolo', e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Frequenza</Label>
              <Select value={form.frequenza} onValueChange={handleFrequenzaChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="giornaliera">Giornaliera</SelectItem>
                  <SelectItem value="settimanale">Settimanale</SelectItem>
                  <SelectItem value="quindicinale">Quindicinale</SelectItem>
                  <SelectItem value="mensile">Mensile</SelectItem>
                  <SelectItem value="trimestrale">Trimestrale</SelectItem>
                  <SelectItem value="semestrale">Semestrale</SelectItem>
                  <SelectItem value="annuale">Annuale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stato</Label>
              <Select value={form.stato} onValueChange={v => set('stato', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="da_programmare">Da programmare</SelectItem>
                  <SelectItem value="programmato">Programmato</SelectItem>
                  <SelectItem value="completato">Completato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Da</Label>
              <Input type="date" value={form.ultima_esecuzione} onChange={e => handleUltimaEsecuzioneChange(e.target.value)} />
            </div>
            <div>
              <Label>A</Label>
              <Input type="date" value={form.prossima_scadenza} onChange={e => set('prossima_scadenza', e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Descrizione</Label>
            <Textarea value={form.descrizione} onChange={e => set('descrizione', e.target.value)} rows={2} />
          </div>

          <div>
            <Label>Note</Label>
            <Textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2} />
          </div>

          <div>
            <Label>Foto ultima esecuzione</Label>
            <div className="mt-1 flex gap-2 flex-wrap">
               <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-dashed border-slate-300 rounded-lg hover:border-blue-400 text-sm text-slate-600">
                 {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                 {uploading ? 'Caricamento...' : 'Galleria'}
                 <input type="file" multiple className="hidden" onChange={handleUpload} accept="image/*" />
               </label>
               <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-dashed border-blue-300 rounded-lg hover:border-blue-500 text-sm text-blue-600 bg-blue-50">
                 <Camera className="w-4 h-4" />
                 Fotocamera
                 <input type="file" className="hidden" onChange={handleUpload} accept="image/*" capture="environment" />
               </label>
            </div>
            {form.foto_urls?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.foto_urls.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                    <button type="button" onClick={() => removeFoto(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {pulizia ? 'Salva modifiche' : 'Crea'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}