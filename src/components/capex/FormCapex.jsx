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
import { Upload, X, Loader2, Plus } from 'lucide-react';

const defaultCapex = (centroId) => ({
  centro_id: centroId || '',
  titolo: '',
  anno_capex: new Date().getFullYear(),
  descrizione: '',
  data_inizio: '',
  data_fine: '',
  costo_previsto: '',
  costo_effettivo: '',
  stato: 'da_pianificare',
  categoria: 'altro',
  fornitore: '',
  note: '',
  allegati_urls: [],
  duvri_urls: [],
  lavoratori_note: '',
  dpi: []
});

export default function FormCapex({ open, onClose, capex, centroId, onSave }) {
  const [form, setForm] = useState(defaultCapex(centroId));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newDpi, setNewDpi] = useState('');

  useEffect(() => {
    if (capex) {
      const lavoratori_note = Array.isArray(capex.lavoratori) && capex.lavoratori.length > 0
        ? capex.lavoratori.map(l => l.nome + (l.mansione ? ` (${l.mansione})` : '')).join('\n')
        : (capex.lavoratori_note || '');
      setForm({ ...defaultCapex(centroId), ...capex, lavoratori_note });
    } else {
      setForm(defaultCapex(centroId));
    }
  }, [capex, centroId, open]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    // Comprimi solo le immagini, i file non-immagine restano normali
    const compressed = await Promise.all(files.map(async (file) => {
      if (file.type.startsWith('image/')) {
        return await compressImages([file]).then(arr => arr[0]);
      }
      return file;
    }));
    const urls = [];
    for (const file of compressed) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setForm(prev => ({ ...prev, allegati_urls: [...(prev.allegati_urls || []), ...urls] }));
    setUploading(false);
  };

  const removeAllegato = (idx) => {
    setForm(prev => ({ ...prev, allegati_urls: prev.allegati_urls.filter((_, i) => i !== idx) }));
  };

  const uploadDuvri = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setForm(prev => ({ ...prev, duvri_urls: [...(prev.duvri_urls || []), ...urls] }));
    setUploading(false);
  };

  const removeDuvri = (idx) => {
    setForm(prev => ({ ...prev, duvri_urls: prev.duvri_urls.filter((_, i) => i !== idx) }));
  };

  const addDpi = () => {
    if (!newDpi.trim()) return;
    setForm(prev => ({
      ...prev,
      dpi: [...(prev.dpi || []), newDpi]
    }));
    setNewDpi('');
  };

  const removeDpi = (idx) => {
    setForm(prev => ({
      ...prev,
      dpi: prev.dpi.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const lavoratori = form.lavoratori_note
      ? form.lavoratori_note.split('\n').filter(r => r.trim()).map(r => ({ nome: r.trim() }))
      : [];
    const data = {
      ...form,
      lavoratori,
      costo_previsto: form.costo_previsto !== '' ? parseFloat(form.costo_previsto) : null,
      costo_effettivo: form.costo_effettivo !== '' ? parseFloat(form.costo_effettivo) : null,
    };
    if (capex?.id) {
      await base44.entities.Capex.update(capex.id, data);
    } else {
      await base44.entities.Capex.create(data);
    }
    setSaving(false);
    onSave();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{capex ? 'Modifica Capex' : 'Nuovo Capex'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Titolo *</Label>
              <Input value={form.titolo} onChange={e => set('titolo', e.target.value)} required />
            </div>
            <div>
              <Label>Anno Capex *</Label>
              <Select value={String(form.anno_capex)} onValueChange={v => set('anno_capex', parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={v => set('categoria', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="strutturale">Strutturale</SelectItem>
                  <SelectItem value="impiantistico">Impiantistico</SelectItem>
                  <SelectItem value="tecnologico">Tecnologico</SelectItem>
                  <SelectItem value="estetico">Estetico</SelectItem>
                  <SelectItem value="sicurezza">Sicurezza</SelectItem>
                  <SelectItem value="altro">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stato</Label>
              <Select value={form.stato} onValueChange={v => {
                if (v === 'da_pianificare' || v === 'da_proporre') {
                  setForm(prev => ({ ...prev, stato: v, data_inizio: '', data_fine: '' }));
                } else {
                  set('stato', v);
                }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                 <SelectItem value="da_proporre">Da proporre</SelectItem>
                 <SelectItem value="da_pianificare">Da pianificare</SelectItem>
                 <SelectItem value="pianificato">Pianificato</SelectItem>
                 <SelectItem value="completato">Completato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Descrizione</Label>
            <Textarea value={form.descrizione} onChange={e => set('descrizione', e.target.value)} rows={3} />
          </div>

          {/* Date intervento: visibili solo se pianificato o completato */}
          {(form.stato === 'pianificato' || form.stato === 'completato') && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <Label>Data inizio intervento</Label>
                <DatePicker value={form.data_inizio} onChange={v => set('data_inizio', v)} placeholder="Seleziona data inizio" />
              </div>
              <div>
                <Label>Data fine intervento</Label>
                <DatePicker value={form.data_fine} onChange={v => set('data_fine', v)} placeholder="Seleziona data fine" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Costo previsto (€)</Label>
              <Input type="number" min="0" step="0.01" value={form.costo_previsto} onChange={e => set('costo_previsto', e.target.value)} />
            </div>
            <div>
              <Label>Costo effettivo (€)</Label>
              <Input type="number" min="0" step="0.01" value={form.costo_effettivo} onChange={e => set('costo_effettivo', e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Fornitore / Appaltatore</Label>
            <Input value={form.fornitore} onChange={e => set('fornitore', e.target.value)} />
          </div>

          {/* Lavoratori */}
          <div>
            <Label>Lavoratori</Label>
            <Textarea
              value={form.lavoratori_note}
              onChange={e => set('lavoratori_note', e.target.value)}
              placeholder="Inserisci i lavoratori (uno per riga, es. Mario Rossi - Elettricista)"
              rows={3}
            />
          </div>

          <div>
            <Label>Note</Label>
            <Textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2} />
          </div>

          {/* DUVRI */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>DUVRI</Label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!form.cse}
                  onChange={e => set('cse', e.target.checked)}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
                <span className="text-sm font-medium text-blue-700">CSE</span>
                <span className="text-xs text-slate-500">(sostituisce il DUVRI)</span>
              </label>
            </div>
            <div className="mt-1">
              <label className="flex items-center gap-2 cursor-pointer w-fit px-3 py-2 border border-dashed border-slate-300 rounded-lg hover:border-blue-400 text-sm text-slate-600">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Caricamento...' : 'Carica DUVRI'}
                <input type="file" multiple className="hidden" onChange={uploadDuvri} accept=".pdf,.doc,.docx" />
              </label>
            </div>
            {form.duvri_urls?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.duvri_urls.map((url, i) => (
                  <div key={i} className="relative group">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded text-xs text-blue-600 hover:underline">
                      📄 DUVRI {i + 1}
                    </a>
                    <button type="button" onClick={() => removeDuvri(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DPI */}
          <div>
            <Label>Dispositivi di Protezione Individuale</Label>
            {form.dpi?.length > 0 && (
              <div className="space-y-2 mb-2">
                {form.dpi.map((dpi, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded border text-sm">
                    <span>✓ {dpi}</span>
                    <button type="button" onClick={() => removeDpi(idx)} className="text-red-600 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={newDpi}
                onChange={(e) => setNewDpi(e.target.value)}
                placeholder="Es. Casco, Guanti..."
                onKeyDown={(e) => e.key === 'Enter' && addDpi()}
                size="sm"
              />
              <Button type="button" onClick={addDpi} variant="outline" size="sm">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Allegati */}
          <div>
            <Label>Allegati / Foto</Label>
            <div className="mt-1">
              <label className="flex items-center gap-2 cursor-pointer w-fit px-3 py-2 border border-dashed border-slate-300 rounded-lg hover:border-blue-400 text-sm text-slate-600">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Caricamento...' : 'Carica file'}
                <input type="file" multiple className="hidden" onChange={handleUpload} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
              </label>
            </div>
            {form.allegati_urls?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.allegati_urls.map((url, i) => (
                  <div key={i} className="relative group">
                    {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img src={url} className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                    ) : (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-xs text-blue-600 hover:underline">
                        📎 Allegato {i + 1}
                      </a>
                    )}
                    <button type="button" onClick={() => removeAllegato(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
              {capex ? 'Salva modifiche' : 'Crea Capex'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}