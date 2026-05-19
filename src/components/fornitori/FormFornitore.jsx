import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X, Plus, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function FormFornitore({ fornitore, onSubmit, onClose, onSave, centroId }) {
  const [form, setForm] = useState({
    nome_ditta: '', referente_nome: '', referente_email: '', referente_telefono: '',
    lavoratori: [], lavoratori_note: '', duvri_urls: [], dpi: [], subornitori: [], note: ''
  });
  const [newDpi, setNewDpi] = useState('');
  const [uploading, setUploading] = useState(false);
  const [newSubfornitore, setNewSubfornitore] = useState({ nome_ditta: '', referente_nome: '', referente_email: '', referente_telefono: '', lavoratori_note: '', duvri_urls: [] });
  const [editingSubindex, setEditingSubindex] = useState(null);

  useEffect(() => {
    if (fornitore) {
      setForm({
        ...fornitore,
        duvri_urls: fornitore.duvri_urls || [],
        lavoratori_note: Array.isArray(fornitore.lavoratori) && fornitore.lavoratori.length > 0
          ? fornitore.lavoratori.map(l => l.nome + (l.mansione ? ` (${l.mansione})` : '')).join('\n')
          : (fornitore.lavoratori_note || ''),
        subornitori: (fornitore.subornitori || []).map(sub => ({
          ...sub,
          duvri_urls: sub.duvri_urls || [],
          lavoratori_note: Array.isArray(sub.lavoratori) && sub.lavoratori.length > 0
            ? sub.lavoratori.map(l => l.nome + (l.mansione ? ` (${l.mansione})` : '')).join('\n')
            : (sub.lavoratori_note || '')
        }))
      });
    }
  }, [fornitore]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const uploadDuvri = async (e, isSubfornitore = false) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const newUrls = [];
      for (let i = 0; i < files.length; i++) {
        const result = await base44.integrations.Core.UploadFile({ file: files[i] });
        newUrls.push(result.file_url);
      }
      if (isSubfornitore) {
        setNewSubfornitore(prev => ({ ...prev, duvri_urls: [...(prev.duvri_urls || []), ...newUrls] }));
      } else {
        setForm(prev => ({ ...prev, duvri_urls: [...(prev.duvri_urls || []), ...newUrls] }));
      }
      toast.success(`${files.length} DUVRI caricato${files.length > 1 ? 'i' : ''}`);
    } catch {
      toast.error('Errore upload DUVRI');
    } finally {
      setUploading(false);
    }
  };

  const addSubfornitore = () => {
    if (!newSubfornitore.nome_ditta.trim()) { toast.error('Inserisci il nome della ditta subfornitrice'); return; }
    if (editingSubindex !== null) {
      setForm(prev => ({ ...prev, subornitori: prev.subornitori.map((s, i) => i === editingSubindex ? newSubfornitore : s) }));
      setEditingSubindex(null);
    } else {
      setForm(prev => ({ ...prev, subornitori: [...(prev.subornitori || []), newSubfornitore] }));
    }
    setNewSubfornitore({ nome_ditta: '', referente_nome: '', referente_email: '', referente_telefono: '', lavoratori_note: '', duvri_urls: [] });
  };

  const handleSubmit = async () => {
    if (!form.nome_ditta.trim() || !form.referente_nome.trim()) { toast.error('Completa i campi obbligatori'); return; }
    try {
      const lavoratori = form.lavoratori_note
        ? form.lavoratori_note.split('\n').filter(r => r.trim()).map(r => ({ nome: r.trim() }))
        : [];
      const subornitori = (form.subornitori || []).map(sub => ({
        ...sub,
        lavoratori: sub.lavoratori_note
          ? sub.lavoratori_note.split('\n').filter(r => r.trim()).map(r => ({ nome: r.trim() }))
          : (sub.lavoratori || [])
      }));
      const data = { ...form, lavoratori, subornitori, centro_id: centroId };

      if (fornitore?.id) {
        await base44.entities.Fornitore.update(fornitore.id, data);
        toast.success('Fornitore aggiornato');
      } else {
        await base44.entities.Fornitore.create(data);
        toast.success('Fornitore creato');
      }
      if (onSave) onSave();
      if (onSubmit) onSubmit();
      onClose();
    } catch (error) {
      toast.error('Errore salvataggio');
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{fornitore ? 'Modifica Fornitore' : 'Nuovo Fornitore'}</DialogTitle></DialogHeader>
        <div className="space-y-5">
          <div>
            <h3 className="font-semibold text-slate-700 mb-3">Informazioni Ditta</h3>
            <div className="space-y-3">
              <div><Label>Nome Ditta *</Label><Input value={form.nome_ditta} onChange={e => handleChange('nome_ditta', e.target.value)} placeholder="Es. Acme Cleaning" className="mt-1" /></div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-3">Referente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Nome Referente *</Label><Input value={form.referente_nome} onChange={e => handleChange('referente_nome', e.target.value)} className="mt-1" /></div>
              <div><Label>Email</Label><Input value={form.referente_email} onChange={e => handleChange('referente_email', e.target.value)} className="mt-1" /></div>
              <div><Label>Cellulare</Label><Input value={form.referente_telefono} onChange={e => handleChange('referente_telefono', e.target.value)} className="mt-1" /></div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-2">Lavoratori</h3>
            <p className="text-xs text-slate-500 mb-1">Un lavoratore per riga (Nome o Nome (Mansione))</p>
            <Textarea value={form.lavoratori_note} onChange={e => handleChange('lavoratori_note', e.target.value)} rows={3} placeholder="Mario Rossi&#10;Luigi Bianchi (Elettricista)" />
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-2">DPI</h3>
            <div className="flex gap-2 mb-2">
              <Input value={newDpi} onChange={e => setNewDpi(e.target.value)} placeholder="Es. Guanti da lavoro" className="flex-1" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), form.dpi?.length < 20 && newDpi.trim() && (setForm(prev => ({ ...prev, dpi: [...prev.dpi, newDpi] })), setNewDpi('')))} />
              <Button variant="outline" onClick={() => { if (newDpi.trim()) { setForm(prev => ({ ...prev, dpi: [...(prev.dpi || []), newDpi] })); setNewDpi(''); } }}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {(form.dpi || []).map((dpi, idx) => (
                <span key={idx} className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs">
                  {dpi}
                  <button onClick={() => setForm(prev => ({ ...prev, dpi: prev.dpi.filter((_, i) => i !== idx) }))}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-2">DUVRI</h3>
            <label className="flex items-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-lg px-4 py-3 hover:bg-slate-50">
              <Upload className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">{uploading ? 'Caricamento...' : 'Carica DUVRI (PDF)'}</span>
              <input type="file" multiple accept=".pdf,.doc,.docx" className="hidden" onChange={e => uploadDuvri(e)} />
            </label>
            {(form.duvri_urls || []).map((url, idx) => (
              <div key={idx} className="flex items-center gap-2 mt-1">
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline flex-1 truncate">📄 DUVRI {idx + 1}</a>
                <button onClick={() => setForm(prev => ({ ...prev, duvri_urls: prev.duvri_urls.filter((_, i) => i !== idx) }))}><X className="w-3 h-3 text-slate-400" /></button>
              </div>
            ))}
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-3">Subornitori</h3>
            {(form.subornitori || []).map((sub, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-1 p-2 bg-slate-50 rounded-lg border border-slate-200">
                <span className="flex-1 text-sm text-slate-700">{sub.nome_ditta}</span>
                <button onClick={() => { setNewSubfornitore(sub); setEditingSubindex(idx); }} className="text-blue-600 text-xs hover:underline">Modifica</button>
                <button onClick={() => setForm(prev => ({ ...prev, subornitori: prev.subornitori.filter((_, i) => i !== idx) }))}><X className="w-3 h-3 text-slate-400" /></button>
              </div>
            ))}
            <div className="border border-slate-200 rounded-lg p-3 space-y-2 mt-2">
              <p className="text-xs font-medium text-slate-600">{editingSubindex !== null ? 'Modifica subfornitore' : 'Aggiungi subfornitore'}</p>
              <Input value={newSubfornitore.nome_ditta} onChange={e => setNewSubfornitore(p => ({ ...p, nome_ditta: e.target.value }))} placeholder="Nome ditta *" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={newSubfornitore.referente_nome} onChange={e => setNewSubfornitore(p => ({ ...p, referente_nome: e.target.value }))} placeholder="Referente" />
                <Input value={newSubfornitore.referente_email} onChange={e => setNewSubfornitore(p => ({ ...p, referente_email: e.target.value }))} placeholder="Email" />
              </div>
              <Textarea value={newSubfornitore.lavoratori_note} onChange={e => setNewSubfornitore(p => ({ ...p, lavoratori_note: e.target.value }))} rows={2} placeholder="Lavoratori (uno per riga)" />
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 border border-dashed border-slate-300 rounded px-3 py-2 hover:bg-slate-50">
                <Upload className="w-3 h-3" /> Carica DUVRI
                <input type="file" multiple accept=".pdf,.doc,.docx" className="hidden" onChange={e => uploadDuvri(e, true)} />
              </label>
              {(newSubfornitore.duvri_urls || []).map((url, idx) => (
                <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline block">📄 DUVRI {idx + 1}</a>
              ))}
              <Button variant="outline" onClick={addSubfornitore} className="w-full"><Plus className="w-3 h-3 mr-1" />{editingSubindex !== null ? 'Aggiorna' : 'Aggiungi'}</Button>
            </div>
          </div>

          <div>
            <Label>Note</Label>
            <Textarea value={form.note} onChange={e => handleChange('note', e.target.value)} rows={2} className="mt-1" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Annulla</Button>
            <Button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700">Salva</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}