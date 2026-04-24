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
    duvri_url: '',
    dpi: [],
    note: ''
  });
  const [newLavoratore, setNewLavoratore] = useState({ nome: '', mansione: '' });
  const [newDpi, setNewDpi] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (fornitore) {
      setForm(fornitore);
    }
  }, [fornitore]);

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const addLavoratore = () => {
    if (!newLavoratore.nome.trim()) {
      toast.error('Inserisci il nome del lavoratore');
      return;
    }
    setForm(prev => ({
      ...prev,
      lavoratori: [...prev.lavoratori, newLavoratore]
    }));
    setNewLavoratore({ nome: '', mansione: '' });
  };

  const removeLavoratore = (idx) => {
    setForm(prev => ({
      ...prev,
      lavoratori: prev.lavoratori.filter((_, i) => i !== idx)
    }));
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

  const uploadDuvri = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, duvri_url: result.file_url }));
      toast.success('DUVRI caricato');
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
      const data = {
        ...form,
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
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">Lavoratori</h3>
            <div className="space-y-3">
              {form.lavoratori.map((lav, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{lav.nome}</p>
                    {lav.mansione && <p className="text-sm text-slate-500">{lav.mansione}</p>}
                  </div>
                  <button
                    onClick={() => removeLavoratore(idx)}
                    className="p-1 hover:bg-red-100 rounded text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
              <Input
                value={newLavoratore.nome}
                onChange={(e) => setNewLavoratore(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome lavoratore"
              />
              <Input
                value={newLavoratore.mansione}
                onChange={(e) => setNewLavoratore(prev => ({ ...prev, mansione: e.target.value }))}
                placeholder="Mansione (opzionale)"
              />
              <Button onClick={addLavoratore} variant="outline" className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Aggiungi Lavoratore
              </Button>
            </div>
          </div>

          {/* DUVRI */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">DUVRI</h3>
            {form.duvri_url && (
              <a
                href={form.duvri_url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 text-sm hover:underline block"
              >
                📄 Visualizza DUVRI caricato
              </a>
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