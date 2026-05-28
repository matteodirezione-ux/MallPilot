import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DatePicker from '@/components/ui/DatePicker';
import { Textarea } from '@/components/ui/textarea';
import { Image as ImageIcon, X as XIcon, Loader2, Camera, Trash2 } from 'lucide-react';
import SafeImage from '@/components/ui/SafeImage';
import ImageLightbox from '@/components/ui/ImageLightbox';
import { base44 } from '@/api/base44Client';
import { compressImages } from '@/lib/compressImage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, addDays } from 'date-fns';
import { STATI_CONFIG, TIPOLOGIA_CONFIG } from './TicketList';

const today = () => format(new Date(), 'yyyy-MM-dd');

// Per ordinario: lun-mer → giovedì successivo; gio-dom → lunedì successivo
// Per urgente: giorno successivo
const defaultScadenza = (tipologia) => {
  if (tipologia === 'urgente') return format(new Date(), 'yyyy-MM-dd');
  const dow = new Date().getDay(); // 0=dom, 1=lun, 2=mar, 3=mer, 4=gio, 5=ven, 6=sab
  // lun(1), mar(2), mer(3) → giovedì successivo
  if (dow >= 1 && dow <= 3) {
    const daysToThursday = 4 - dow;
    return format(addDays(new Date(), daysToThursday), 'yyyy-MM-dd');
  }
  // gio(4), ven(5), sab(6), dom(0) → lunedì successivo
  const daysToMonday = dow === 0 ? 1 : 8 - dow;
  return format(addDays(new Date(), daysToMonday), 'yyyy-MM-dd');
};

const defaultForm = {
  numero_ticket: '',
  data_apertura: today(),
  operatore: '',
  tipologia: 'ordinario',
  descrizione: '',
  scadenza: '',
  stato: 'in_attesa_approvazione',
  numero_sollecito: 0,
  foto_urls: [],
  note_manutentore: '',
  allegati_manutentore: [],
  costo_stimato: '',
  motivo_rifiuto: '',
};

export default function FormTicket({ open, onClose, onSave, ticket, user }) {
  const [form, setForm] = useState(defaultForm);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [uploadingAllegati, setUploadingAllegati] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const userRole = user?.tipo_account;
  const isManutentore = userRole === 'manutentore';
  const isDirettore = userRole === 'direttore' || userRole === 'proprieta';
  const isCreatore = isDirettore || userRole === 'vigilanza';
  const isNuovo = !ticket;

  useEffect(() => {
    if (ticket) {
      setForm({ ...defaultForm, ...ticket, costo_stimato: ticket.costo_stimato ?? '' });
    } else {
      setForm({ ...defaultForm, data_apertura: today(), scadenza: defaultScadenza('ordinario'), operatore: '' });
    }
  }, [ticket, open]);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleTipologiaChange = (value) => {
    setForm(f => ({ ...f, tipologia: value, scadenza: defaultScadenza(value) }));
  };

  const uploadFotos = async (e, field) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (field === 'foto_urls') setUploadingFoto(true);
    else setUploadingAllegati(true);
    const compressed = await compressImages(files);
    const nuoveUrls = [];
    for (const file of compressed) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      nuoveUrls.push(file_url);
    }
    set(field, [...(form[field] || []), ...nuoveUrls]);
    if (field === 'foto_urls') setUploadingFoto(false);
    else setUploadingAllegati(false);
    e.target.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    // Stato automatico in creazione
    if (isNuovo) {
      data.stato = form.tipologia === 'urgente' ? 'approvato' : 'in_attesa_approvazione';
    }
    // Manutentore: se inserisce un preventivo, passa automaticamente a preventivo_inserito
    if (isManutentore && data.costo_stimato !== '' && data.costo_stimato !== null && data.costo_stimato !== undefined) {
      if (['approvato', 'approvato_con_preventivo'].includes(ticket?.stato)) {
        data.stato = 'preventivo_inserito';
      }
    }
    if (data.costo_stimato !== '' && data.costo_stimato !== null) {
      data.costo_stimato = Number(data.costo_stimato);
    } else {
      delete data.costo_stimato;
    }
    onSave(data);
  };

  const rowClass = "flex items-start gap-3";
  const labelClass = "w-36 flex-shrink-0 text-sm font-medium text-slate-700 pt-2";
  const fieldClass = "flex-1 min-w-0";

  // Vista read-only per manutentore (solo campi che può vedere/modificare)
  if (isManutentore && ticket) {
    const stConf = STATI_CONFIG[ticket.stato];
    const tipConf = TIPOLOGIA_CONFIG[ticket.tipologia];
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ticket #{ticket.numero_ticket}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${tipConf?.color}`}>{tipConf?.label}</span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${stConf?.color}`}>{stConf?.label}</span>
            </div>
            {[
              { label: 'Operatore', value: ticket.operatore },
              { label: 'Data apertura', value: ticket.data_apertura },
              { label: 'Scadenza', value: ticket.scadenza || '-' },
            ].map(({ label, value }) => (
              <div key={label} className={rowClass}>
                <span className={labelClass}>{label}</span>
                <span className="flex-1 text-sm text-slate-800 pt-2">{value}</span>
              </div>
            ))}
            {ticket.descrizione && (
              <div className={rowClass}>
                <span className={labelClass}>Descrizione</span>
                <span className="flex-1 text-sm text-slate-800 pt-2 whitespace-pre-wrap">{ticket.descrizione}</span>
              </div>
            )}
            {(ticket.foto_urls || []).length > 0 && (
              <div className={rowClass}>
                <span className={labelClass}>Foto</span>
                <div className="flex-1 grid grid-cols-4 gap-1 pt-1">
                  {(ticket.foto_urls || []).map((url, i) => (
                    <SafeImage key={i} src={url} alt="" className="w-full h-16 object-cover rounded cursor-pointer hover:opacity-80" onClick={() => setLightbox(i)} />
                  ))}
                </div>
              </div>
            )}

            {/* Sezione manutentore modificabile */}
            <hr />
            <p className="text-sm font-semibold text-slate-700">Il tuo intervento</p>

            <div className={rowClass}>
              <label className={labelClass}>Note</label>
              <div className={fieldClass}>
                <Textarea value={form.note_manutentore} onChange={e => set('note_manutentore', e.target.value)} rows={3} className="text-sm" placeholder="Note sull'intervento..." />
              </div>
            </div>

            {['approvato', 'approvato_con_preventivo'].includes(ticket.stato) && (
              <div className={rowClass}>
                <label className={labelClass}>Preventivo (€)</label>
                <div className={fieldClass}>
                  <Input type="number" value={form.costo_stimato} onChange={e => set('costo_stimato', e.target.value)} className="h-8 text-sm" placeholder="es. 250 — inserendo il costo lo stato diventa Preventivo inserito" />
                  <p className="text-xs text-slate-400 mt-1">Inserendo un importo lo stato passerà automaticamente a <strong>Preventivo inserito</strong></p>
                </div>
              </div>
            )}

            <div className={rowClass}>
              <label className={labelClass}>Allegati</label>
              <div className={fieldClass}>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {(form.allegati_manutentore || []).map((url, i) => (
                    <div key={i} className="relative group">
                      <SafeImage src={url} alt="" className="w-16 h-16 object-cover rounded border border-slate-200" />
                      <button type="button" onClick={() => set('allegati_manutentore', form.allegati_manutentore.filter((_, idx) => idx !== i))}
                        className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
                {uploadingAllegati ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" />Caricamento...</div>
                ) : (
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg cursor-pointer">
                      <ImageIcon className="w-4 h-4" /> Galleria
                      <input type="file" accept="image/*" multiple className="hidden" onChange={e => uploadFotos(e, 'allegati_manutentore')} />
                    </label>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-sm rounded-lg cursor-pointer">
                      <Camera className="w-4 h-4" /> Camera
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => uploadFotos(e, 'allegati_manutentore')} />
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>Annulla</Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleSubmit}>Salva</Button>
            </div>
          </div>
        </DialogContent>
        {lightbox !== null && <ImageLightbox urls={ticket.foto_urls} startIndex={lightbox} onClose={() => setLightbox(null)} />}
      </Dialog>
    );
  }

  // Vista completa per direttore / vigilanza
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
              <DatePicker value={form.data_apertura} onChange={v => set('data_apertura', v)} placeholder="Data apertura" />
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
              <Select value={form.tipologia} onValueChange={handleTipologiaChange} disabled={!isNuovo}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ordinario">Ordinario</SelectItem>
                  <SelectItem value="urgente">🔴 Urgente</SelectItem>
                </SelectContent>
              </Select>
              {isNuovo && (
                <p className="text-xs text-slate-400 mt-1">
                  {form.tipologia === 'urgente' ? '⚡ Verrà creato come Approvato e visibile ai manutentori' : '⏳ Verrà creato In attesa di approvazione'}
                </p>
              )}
            </div>
          </div>

          <div className={rowClass}>
            <label className={labelClass}>Scadenza</label>
            <div className={fieldClass}>
              <DatePicker value={form.scadenza} onChange={v => set('scadenza', v)} placeholder="Data scadenza" />
            </div>
          </div>

          <div className={rowClass}>
            <label className={labelClass}>Descrizione</label>
            <div className={fieldClass}>
              <Textarea value={form.descrizione} onChange={e => set('descrizione', e.target.value)} rows={3} className="text-sm" placeholder="Descrivi il problema..." />
            </div>
          </div>

          {!isNuovo && isDirettore && (
            <div className={rowClass}>
              <label className={labelClass}>N° Sollecito</label>
              <div className={fieldClass}>
                <Select value={String(form.numero_sollecito ?? 0)} onValueChange={v => set('numero_sollecito', Number(v))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Nessun sollecito</SelectItem>
                    {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>Sollecito {n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Foto */}
          <div className={rowClass}>
            <label className={labelClass}>Foto</label>
            <div className={fieldClass}>
              {uploadingFoto ? (
                <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" />Caricamento...</div>
              ) : (
                <div className="flex gap-2 mb-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg cursor-pointer">
                    <ImageIcon className="w-4 h-4" /> Galleria
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => uploadFotos(e, 'foto_urls')} />
                  </label>
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-sm rounded-lg cursor-pointer">
                    <Camera className="w-4 h-4" /> Camera
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => uploadFotos(e, 'foto_urls')} />
                  </label>
                </div>
              )}
              {(form.foto_urls || []).length > 0 && (
                <div className="grid grid-cols-4 gap-1">
                  {(form.foto_urls || []).map((url, i) => (
                    <div key={i} className="relative group">
                      <SafeImage src={url} alt="" className="w-full h-16 object-cover rounded" />
                      <button type="button" onClick={() => set('foto_urls', form.foto_urls.filter(u => u !== url))}
                        className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100">
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
      {lightbox !== null && <ImageLightbox urls={form.foto_urls} startIndex={lightbox} onClose={() => setLightbox(null)} />}
    </Dialog>
  );
}