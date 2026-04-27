import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X, Plus, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function FormFornitore({ fornitore, onSubmit, onClose, centroId }) {
  const [form, setForm] = useState({
    nome_ditta: '',
    referente_nome: '',
    referente_email: '',
    referente_telefono: '',
    lavoratori: [],
    duvri_urls: [],
    dpi: [],
    note: ''
  });
  const [newDpi, setNewDpi] = useState('');
  const [uploading, setUploading] = useState(false);
  const [newSubfornitore, setNewSubfornitore] = useState({
    nome_ditta: '',
    referente_nome: '',
    referente_email: '',
    referente_telefono: '',
    lavoratori: [],
    duvri_url: ''
  });
  const [editingSubindex, setEditingSubindex] = useState(null);
  const [newSubLavoratoreNote, setNewSubLavoratoreNote] = useState('');

  useEffect(() => {
    if (fornitore) {
      const formData = {
        ...fornitore,
        duvri_urls: fornitore.duvri_urls || (fornitore.duvri_url ? [fornitore.duvri_url] : []),
        lavoratori_note: Array.isArray(fornitore.lavoratori) && fornitore.lavoratori.length > 0
          ? fornitore.lavoratori.map(l => l.nome + (l.mansione ? ` (${l.mansione})` : '')).join('\n')
          : (fornitore.lavoratori_note || '')
      };
      if (formData.subornitori) {
        formData.subornitori = formData.subornitori.map(sub => ({
          ...sub,
          duvri_urls: sub.duvri_urls || (sub.duvri_url ? [sub.duvri_url] : []),
          lavoratori_note: Array.isArray(sub.lavoratori) && sub.lavoratori.length > 0
            ? sub.lavoratori.map(l => l.nome + (l.mansione ? ` (${l.mansione})` : '')).join('\n')
            : (sub.lavoratori_note || '')
        }));
      }
      setForm(formData);
    }
  }, [fornitore]);

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const addDpi = () => {
    if (!newDpi.trim()) {
      toast.error('Inserisci un DPI');
      return;
    }
    setForm(prev => ({
      ...prev,
      dpi: [...prev.dpi, newDpi]
    }));
    setNewDpi('');
  };

  const removeDpi = (idx) => {
    setForm(prev => ({
      ...prev,
      dpi: prev.dpi.filter((_, i) => i !== idx)
    }));
  };



  const uploadSubDuvri = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    try {
      const newUrls = [];
      for (let i = 0; i < files.length; i++) {
        const result = await base44.integrations.Core.UploadFile({ file: files[i] });
        newUrls.push(result.file_url);
      }
      setNewSubfornitore(prev => ({
        ...prev,
        duvri_urls: [...(prev.duvri_urls || []), ...newUrls]
      }));
      toast.success(`${files.length} DUVRI caricato${files.length > 1 ? 'i' : ''}`);
    } catch (error) {
      toast.error('Errore upload DUVRI');
    } finally {
      setUploading(false);
    }
  };

  const addSubfornitore = () => {
    if (!newSubfornitore.nome_ditta.trim()) {
      toast.error('Inserisci il nome della ditta subfornitrice');
      return;
    }
    const subEntry = { ...newSubfornitore, lavoratori_note: newSubLavoratoreNote };
    if (editingSubindex !== null) {
      setForm(prev => ({
        ...prev,
        subornitori: prev.subornitori.map((s, i) =>
          i === editingSubindex ? subEntry : s
        )
      }));
      setEditingSubindex(null);
    } else {
      setForm(prev => ({
        ...prev,
        subornitori: [...(prev.subornitori || []), subEntry]
      }));
    }
    
    setNewSubfornitore({
      nome_ditta: '',
      referente_nome: '',
      referente_email: '',
      referente_telefono: '',
      lavoratori: [],
      lavoratori_note: '',
      duvri_urls: []
    });
    setNewSubLavoratoreNote('');
  };

  const editSubfornitore = (idx) => {
    const sub = form.subornitori[idx];
    setNewSubfornitore(sub);
    setNewSubLavoratoreNote(sub.lavoratori_note || '');
    setEditingSubindex(idx);
  };

  const removeSubfornitore = (idx) => {
    setForm(prev => ({
      ...prev,
      subornitori: prev.subornitori.filter((_, i) => i !== idx)
    }));
  };

  const uploadDuvri = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newUrls = [];
      for (let i = 0; i < files.length; i++) {
        const result = await base44.integrations.Core.UploadFile({ file: files[i] });
        newUrls.push(result.file_url);
      }
      setForm(prev => ({
        ...prev,
        duvri_urls: [...(prev.duvri_urls || []), ...newUrls]
      }));
      toast.success(`${files.length} DUVRI caricato${files.length > 1 ? 'i' : ''}`);
    } catch (error) {
      toast.error('Errore upload DUVRI');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.nome_ditta.trim() || !form.referente_nome.trim()) {
      toast.error('Completa i campi obbligatori');
      return;
    }

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
      const data = {
        ...form,
        lavoratori,
        subornitori,
        centro_id: centroId
      };

      if (fornitore?.id) {
        await base44.entities.Fornitore.update(fornitore.id, data);
        toast.success('Fornitore aggiornato');
      } else {
        await base44.entities.Fornitore.create(data);
        toast.success('Fornitore creato');
      }
      onSubmit();
      onClose();
    } catch (error) {
      toast.error('Errore salvataggio');
      console.error(error);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{fornitore ? 'Modifica Fornitore' : 'Nuovo Fornitore'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dati Ditta */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">Informazioni Ditta</h3>
            <div>
              <Label>Nome Ditta *</Label>
              <Input
                value={form.nome_ditta}
                onChange={(e) => handleInputChange('nome_ditta', e.target.value)}
                placeholder="Es. Acme Cleaning"
              />
            </div>
          </div>

          {/* Referente */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">Referente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome Referente *</Label>
                <Input
                  value={form.referente_nome}
                  onChange={(e) => handleInputChange('referente_nome', e.target.value)}
                  placeholder="Nome referente"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.referente_email}
                  onChange={(e) => handleInputChange('referente_email', e.target.value)}
                  placeholder="email@esempio.it"
                />
              </div>
              <div className="col-span-2">
                <Label>Cellulare</Label>
                <Input
                  value={form.referente_telefono}
                  onChange={(e) => handleInputChange('referente_telefono', e.target.value)}
                  placeholder="+39 XXX XXXX XXX"
                />
              </div>
            </div>
          </div>

          {/* Lavoratori */}
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-800">Lavoratori</h3>
            <Textarea
              value={form.lavoratori_note || ''}
              onChange={(e) => handleInputChange('lavoratori_note', e.target.value)}
              placeholder="Inserisci i lavoratori (uno per riga, es. Mario Rossi - Elettricista)"
              rows={3}
            />
          </div>

          {/* DUVRI */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">DUVRI</h3>
            {form.duvri_urls?.length > 0 && (
              <div className="space-y-2">
                {form.duvri_urls.map((url, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 text-sm hover:underline flex-1"
                    >
                      📄 DUVRI {idx + 1}
                    </a>
                    <button
                      onClick={() => setForm(prev => ({
                        ...prev,
                        duvri_urls: prev.duvri_urls.filter((_, i) => i !== idx)
                      }))}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-slate-50">
              <Upload className="w-4 h-4 text-slate-600" />
              <span className="text-sm text-slate-600">
                {uploading ? 'Caricamento...' : 'Carica DUVRI'}
              </span>
              <input
                type="file"
                onChange={uploadDuvri}
                disabled={uploading}
                className="hidden"
                accept=".pdf,.doc,.docx"
                multiple
              />
            </label>
          </div>

          {/* DPI */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">Dispositivi di Protezione Individuale</h3>
            <div className="space-y-2">
              {form.dpi.map((dpi, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
                  <span className="text-sm text-slate-800">✓ {dpi}</span>
                  <button
                    onClick={() => removeDpi(idx)}
                    className="ml-auto p-1 hover:bg-red-100 rounded text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newDpi}
                onChange={(e) => setNewDpi(e.target.value)}
                placeholder="Es. Casco, Guanti, Giubbetto riflettente"
                onKeyDown={(e) => e.key === 'Enter' && addDpi()}
              />
              <Button onClick={addDpi} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Subornitori */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">Subornitori</h3>
            
            {/* Lista Subornitori */}
            <div className="space-y-2">
              {form.subornitori?.map((sub, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{sub.nome_ditta}</p>
                    {sub.referente_nome && (
                      <p className="text-sm text-slate-500">{sub.referente_nome}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editSubfornitore(idx)}
                      className="p-1 hover:bg-blue-100 rounded text-blue-600 text-sm"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => removeSubfornitore(idx)}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Form Nuovo Subfornitore */}
            <div className="p-4 bg-slate-50 rounded-lg space-y-4 border-2 border-dashed border-slate-300">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome Ditta *</Label>
                  <Input
                    value={newSubfornitore.nome_ditta}
                    onChange={(e) => setNewSubfornitore(prev => ({ ...prev, nome_ditta: e.target.value }))}
                    placeholder="Nome subfornitore"
                  />
                </div>
                <div>
                  <Label>Referente</Label>
                  <Input
                    value={newSubfornitore.referente_nome}
                    onChange={(e) => setNewSubfornitore(prev => ({ ...prev, referente_nome: e.target.value }))}
                    placeholder="Nome referente"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newSubfornitore.referente_email}
                    onChange={(e) => setNewSubfornitore(prev => ({ ...prev, referente_email: e.target.value }))}
                    placeholder="email@esempio.it"
                  />
                </div>
                <div>
                  <Label>Cellulare</Label>
                  <Input
                    value={newSubfornitore.referente_telefono}
                    onChange={(e) => setNewSubfornitore(prev => ({ ...prev, referente_telefono: e.target.value }))}
                    placeholder="Numero cellulare"
                  />
                </div>
              </div>

              {/* Lavoratori Subfornitore */}
              <div>
                <Label className="block mb-2">Lavoratori</Label>
                <Textarea
                  value={newSubLavoratoreNote}
                  onChange={(e) => setNewSubLavoratoreNote(e.target.value)}
                  placeholder="Inserisci i lavoratori (uno per riga, es. Mario Rossi - Idraulico)"
                  rows={3}
                />
              </div>

              {/* DUVRI Subfornitore */}
              <div>
                <Label className="block mb-2">DUVRI Subfornitore</Label>
                {newSubfornitore.duvri_urls?.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {newSubfornitore.duvri_urls.map((url, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline flex-1"
                        >
                          📄 DUVRI {idx + 1}
                        </a>
                        <button
                          onClick={() => setNewSubfornitore(prev => ({
                            ...prev,
                            duvri_urls: prev.duvri_urls.filter((_, i) => i !== idx)
                          }))}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed rounded cursor-pointer hover:bg-white">
                  <Upload className="w-4 h-4 text-slate-600" />
                  <span className="text-sm text-slate-600">
                    {uploading ? 'Caricamento...' : 'Carica DUVRI'}
                  </span>
                  <input
                    type="file"
                    onChange={uploadSubDuvri}
                    disabled={uploading}
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    multiple
                  />
                </label>
              </div>

              <Button onClick={addSubfornitore} className="w-full gap-2 bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4" />
                {editingSubindex !== null ? 'Aggiorna Subfornitore' : 'Aggiungi Subfornitore'}
              </Button>
            </div>
          </div>

          {/* Note */}
          <div>
            <Label>Note</Label>
            <Textarea
              value={form.note}
              onChange={(e) => handleInputChange('note', e.target.value)}
              placeholder="Note aggiuntive"
              rows={3}
            />
          </div>

          {/* Bottoni */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Annulla</Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
              Salva Fornitore
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}