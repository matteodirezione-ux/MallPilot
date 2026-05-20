import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { compressImages } from '@/lib/compressImage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DatePicker from '@/components/ui/DatePicker';
import { Camera, X, Loader2 } from 'lucide-react';
import { format, addDays, addWeeks, addMonths } from 'date-fns';

export default function QuickFormControllo({ open, onClose, onSaved, centroSelezionato, user }) {
  const [form, setForm] = useState({
    titolo: '',
    descrizione: '',
    data_scadenza: format(new Date(), 'yyyy-MM-dd'),
    stato: 'da_fare',
    foto_urls: [],
    ricorrente: false,
    ricorrenza_tipo: 'settimanale',
    ricorrenza_ogni: 1,
    ricorrenza_unita: 'settimane',
    ricorrenza_fine: '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const camRef = useRef();

  const reset = () => setForm({
    titolo: '', descrizione: '', data_scadenza: format(new Date(), 'yyyy-MM-dd'),
    stato: 'da_fare', foto_urls: [], ricorrente: false,
    ricorrenza_tipo: 'settimanale', ricorrenza_ogni: 1, ricorrenza_unita: 'settimane', ricorrenza_fine: ''
  });

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    const compressed = await compressImages(Array.from(files));
    const urls = await Promise.all(compressed.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
    setForm(f => ({ ...f, foto_urls: [...f.foto_urls, ...urls] }));
    setUploading(false);
  };

  const generateRecurrence = (startDateStr, config) => {
    const [y, m, d] = startDateStr.split('-').map(Number);
    let currentDate = new Date(y, m - 1, d);
    const [ey, em, ed] = config.ricorrenza_fine.split('-').map(Number);
    const endDate = new Date(ey, em - 1, ed);
    const dates = [];
    const n = config.ricorrenza_ogni || 1;
    const advance = (date) => {
      if (config.ricorrenza_tipo === 'giornaliero') return addDays(date, n);
      if (config.ricorrenza_tipo === 'settimanale') return addWeeks(date, n);
      if (config.ricorrenza_tipo === 'mensile') return addMonths(date, n);
      if (config.ricorrenza_tipo === 'annuale') return addMonths(date, 12 * n);
      if (config.ricorrenza_tipo === 'personalizzato') {
        if (config.ricorrenza_unita === 'giorni') return addDays(date, n);
        if (config.ricorrenza_unita === 'settimane') return addWeeks(date, n);
        if (config.ricorrenza_unita === 'mesi') return addMonths(date, n);
      }
      return addWeeks(date, n);
    };
    currentDate = advance(currentDate);
    while (currentDate <= endDate) { dates.push(format(currentDate, 'yyyy-MM-dd')); currentDate = advance(currentDate); }
    return dates;
  };

  const handleSave = async () => {
    if (!form.titolo.trim() || !form.data_scadenza) return;
    if (form.ricorrente && !form.ricorrenza_fine) { alert('Specificare una data di fine per la ricorrenza'); return; }
    setSaving(true);
    const data = {
      ...form,
      centro_id: centroSelezionato?.id !== 'tutti' ? centroSelezionato?.id : '',
      assegnato_da_email: user?.email,
      assegnato_da_nome: user?.full_name,
    };
    if (form.ricorrente) {
      const main = await base44.entities.Manutenzione.create(data);
      const futureDates = generateRecurrence(form.data_scadenza, form);
      if (futureDates.length > 0) {
        await base44.entities.Manutenzione.bulkCreate(futureDates.map(dateStr => ({ ...data, data_scadenza: dateStr, manutenzione_padre_id: main.id, ricorrente: false })));
      }
    } else {
      await base44.entities.Manutenzione.create(data);
    }
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
            <label className="text-sm font-medium text-slate-700">Stato</label>
            <Select value={form.stato} onValueChange={v => setForm(f => ({ ...f, stato: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="da_fare">Da Fare</SelectItem>
                <SelectItem value="in_corso">In Corso</SelectItem>
                <SelectItem value="completato">Completato</SelectItem>
                <SelectItem value="annullato">Annullato</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Descrizione</label>
            <Textarea className="mt-1" value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} placeholder="Descrizione..." rows={3} />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={form.ricorrente} onChange={e => setForm(f => ({ ...f, ricorrente: e.target.checked }))} className="rounded" /> Ricorrente
            </label>
            {form.ricorrente && (
              <div className="mt-3 space-y-2 pl-4 border-l-2 border-slate-200">
                <Select value={form.ricorrenza_tipo} onValueChange={v => setForm(f => ({ ...f, ricorrenza_tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['giornaliero','settimanale','mensile','annuale','personalizzato'].map(v => (
                      <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.ricorrenza_tipo === 'personalizzato' && (
                  <div className="flex gap-2">
                    <Input type="number" value={form.ricorrenza_ogni} onChange={e => setForm(f => ({ ...f, ricorrenza_ogni: parseInt(e.target.value) }))} className="w-20 h-8" min={1} />
                    <Select value={form.ricorrenza_unita} onValueChange={v => setForm(f => ({ ...f, ricorrenza_unita: v }))}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="giorni">Giorni</SelectItem>
                        <SelectItem value="settimane">Settimane</SelectItem>
                        <SelectItem value="mesi">Mesi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <label className="text-xs text-slate-500">Fine ricorrenza</label>
                  <div className="mt-1"><DatePicker value={form.ricorrenza_fine} onChange={v => setForm(f => ({ ...f, ricorrenza_fine: v }))} placeholder="Seleziona data fine" /></div>
                </div>
              </div>
            )}
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
              <button onClick={() => fileRef.current?.click()} className="w-16 h-16 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-slate-100 text-slate-500">
                <span className="text-[10px]">Galleria</span>
              </button>
              <button onClick={() => camRef.current?.click()} className="w-16 h-16 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-slate-100 text-slate-500">
                <Camera className="w-4 h-4" /><span className="text-[10px]">Camera</span>
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
            <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFiles(e.target.files)} />
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