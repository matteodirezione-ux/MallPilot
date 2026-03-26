import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon, X as XIcon, Loader2, Camera, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format, addDays } from 'date-fns';

const today = () => format(new Date(), 'yyyy-MM-dd');
const defaultScadenza = (tipologia) => format(addDays(new Date(), tipologia === 'urgente' ? 1 : 2), 'yyyy-MM-dd');

const defaultForm = {
  numero_ticket: '',
  data_apertura: today(),
  operatore: '',
  tipologia: 'ordinario',
  descrizione: '',
  scadenza: defaultScadenza('ordinario'),
  stato: 'aperto',
  numero_sollecito: 0,
  foto_urls: [],
};

export default function FormTicket({ open, onClose, onSave, ticket, user }) {
  const [form, setForm] = useState(defaultForm);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  useEffect(() => {
    if (ticket) {
      setForm({ ...defaultForm, ...ticket });
    } else {
      setForm({ ...defaultForm, data_apertura: today(), scadenza: defaultScadenza('ordinario'), operatore: '' });
    }
  }, [ticket, open, user]);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleTipologiaChange = (value) => {
    setForm(f => ({
      ...f,
      tipologia: value,
      scadenza: defaultScadenza(value),
    }));
  };

  const handleFotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingFoto(true);
    const nuoveUrls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      nuoveUrls.push(file_url);
    }
    set('foto_urls', [...(form.foto_urls || []), ...nuoveUrls]);
    setUploadingFoto(false);
    e.target.value = '';
  };

  const handleRemoveFoto = (url) => {
    set('foto_urls', (form.foto_urls || []).filter(u => u !== url));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const rowClass = "flex items-start gap-3";
  const labelClass = "w-36 flex-shrink-0 text-sm font-medium text-slate-700 pt-2";
  const fieldClass = "flex-1 min-w-0";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ticket ? 'Modifica Ticket' : 'Nuovo Ticket'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">

          <div className={rowClass}>
            <label className={labelClass}>N° Ticket *</label>
            <div className={fieldClass}>
              <Input value={form.numero_ticket} onChange={e => set('numero_ticket', e.target.value)} required className="h-8 text-sm" placeholder="es. TK-001" />
            </div>
          </div>

          <div className={rowClass}>
            <label className={labelClass}>Data apertura *</label>
            <div className={fieldClass}>
              <Input type="date" value={form.data_apertura} onChange={e => set('data_apertura', e.target.value)} required className="h-8 text-sm w-full" />
            </div>
          </div>

          <div className={rowClass}>
            <label className={labelClass}>Operatore *</label>
            <div className={fieldClass}>
              <Input value={form.operatore} onChange={e => set('operatore', e.target.value)} required className="h-8 text-sm" placeholder="es. Rossi" />
            </div>
          </div>

          <div className={rowClass}>
            <label className={labelClass}>Tipologia *</label>
            <div className={fieldClass}>
              <Select value={form.tipologia} onValueChange={handleTipologiaChange}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ordinario">Ordinario</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className={rowClass}>
            <label className={labelClass}>Scadenza</label>
            <div className={fieldClass}>
              <Input type="date" value={form.scadenza} onChange={e => set('scadenza', e.target.value)} className="h-8 text-sm w-full" />
            </div>
          </div>

          <div className={rowClass}>
            <label className={labelClass}>Descrizione</label>
            <div className={fieldClass}>
              <Textarea value={form.descrizione} onChange={e => set('descrizione', e.target.value)} rows={3} className="text-sm" placeholder="Descrivi il problema..." />
            </div>
          </div>

          <div className={rowClass}>
            <label className={labelClass}>N° Sollecito</label>
            <div className={fieldClass}>
              <Select value={String(form.numero_sollecito ?? 0)} onValueChange={v => set('numero_sollecito', Number(v))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Nessun sollecito</SelectItem>
                  <SelectItem value="1">Sollecito 1</SelectItem>
                  <SelectItem value="2">Sollecito 2</SelectItem>
                  <SelectItem value="3">Sollecito 3</SelectItem>
                  <SelectItem value="4">Sollecito 4</SelectItem>
                  <SelectItem value="5">Sollecito 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className={rowClass}>
            <label className={labelClass}>Stato</label>
            <div className={fieldClass}>
              <Select value={form.stato} onValueChange={v => set('stato', v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aperto">Aperto</SelectItem>
                  <SelectItem value="chiuso">Chiuso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Foto */}
          <div className={rowClass}>
            <label className={labelClass}>Foto</label>
            <div className={fieldClass}>
              <div className="flex gap-2 flex-wrap mb-2">
                {uploadingFoto ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Caricamento...
                  </div>
                ) : (
                  <>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg cursor-pointer transition-colors">
                      <ImageIcon className="w-4 h-4" />
                      Galleria
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleFotoUpload} />
                    </label>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-sm rounded-lg cursor-pointer transition-colors">
                      <Camera className="w-4 h-4" />
                      Fotocamera
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFotoUpload} />
                    </label>
                  </>
                )}
              </div>
              {(form.foto_urls || []).length > 0 && (
                <div className="grid grid-cols-4 gap-1">
                  {(form.foto_urls || []).map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt="" className="w-full h-16 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => handleRemoveFoto(url)}
                        className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Annulla</Button>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700">Salva</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}