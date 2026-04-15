import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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

const defaultForm = {
  titolo: '',
  descrizione: '',
  priorita: 'media',
  stato: 'da_fare',
  data_scadenza: '',
  ricorrente: false,
  ricorrenza_tipo: 'settimanale',
  ricorrenza_ogni: 1,
  ricorrenza_unita: 'settimane',
  ricorrenza_fine: '',
  foto_urls: [],
  note: '',
};

export default function FormTask({ open, onClose, onSave, task, user, centri, direttori, vigilanze, centroDefault }) {
  const [form, setForm] = useState(defaultForm);
  const [centriSelezionati, setCentriSelezionati] = useState([]);
  const [assegnatiSelezionati, setAssegnatiSelezionati] = useState([]);
  const [modalitaAssegnazione, setModalitaAssegnazione] = useState('singola');
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const isProprieta = user?.tipo_account === 'proprieta';

  useEffect(() => {
    if (task) {
      setForm({ ...defaultForm, ...task });
      setCentriSelezionati(task.centro_id ? [task.centro_id] : []);
      setAssegnatiSelezionati(task.assegnato_a_email ? [{ email: task.assegnato_a_email, nome: task.assegnato_a_nome }] : []);
      setModalitaAssegnazione('singola');
    } else {
      setForm(defaultForm);
      setCentriSelezionati(centroDefault ? [centroDefault] : []);
      setAssegnatiSelezionati([]);
      setModalitaAssegnazione('singola');
    }
  }, [task, open]);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

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

  const assegnatari = React.useMemo(() => {
    const list = [];
    if (isProprieta) {
      direttori?.forEach(d => list.push({ email: d.email, nome: d.full_name, ruolo: 'Direttore' }));
    } else if (user?.tipo_account === 'direttore') {
      const nomeDirettore = direttori?.find(d => d.email === user.email)?.full_name || user.full_name;
      list.push({ email: user.email, nome: nomeDirettore, ruolo: 'Direttore (tu)' });
      vigilanze?.forEach(v => list.push({ email: v.email, nome: v.full_name, ruolo: 'Vigilanza' }));
    } else if (user?.tipo_account === 'vigilanza') {
      list.push({ email: user.email, nome: user.full_name, ruolo: 'Vigilanza (tu)' });
    }
    return list;
  }, [user, direttori, vigilanze]);

  const toggleCentro = (centroId) => {
    setCentriSelezionati(prev =>
      prev.includes(centroId) ? prev.filter(id => id !== centroId) : [...prev, centroId]
    );
  };

  const toggleAssegnato = (persona) => {
    setAssegnatiSelezionati(prev =>
      prev.find(a => a.email === persona.email)
        ? prev.filter(a => a.email !== persona.email)
        : [...prev, persona]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validazione obbligatoria: Centro
    if ((isProprieta || user?.tipo_account === 'direttore') && centri?.length > 0) {
      if (!isMultipla && centriSelezionati.length === 0) {
        alert('Seleziona un centro commerciale');
        return;
      }
    }

    // Validazione obbligatoria: Assegna a
    if (assegnatari.length > 0 && assegnatiSelezionati.length === 0) {
      alert('Seleziona a chi assegnare il task');
      return;
    }

    // Se stiamo modificando un task esistente, non sovrascrivere chi l'ha assegnato
    const base = {
      ...form,
      assegnato_da_email: task?.assegnato_da_email || user?.email,
      assegnato_da_nome: task?.assegnato_da_nome || user?.full_name,
    };
    if (!base.ricorrente) {
      delete base.ricorrenza_tipo;
      delete base.ricorrenza_ogni;
      delete base.ricorrenza_unita;
      delete base.ricorrenza_fine;
    }

    if (isProprieta && modalitaAssegnazione === 'multipla' && !task) {
      const centriDaSalvare = centriSelezionati.length > 0 ? centriSelezionati : [''];
      const assegnatiDaSalvare = assegnatiSelezionati.length > 0 ? assegnatiSelezionati : [null];
      const combinazioni = [];
      for (const centroId of centriDaSalvare) {
        for (const persona of assegnatiDaSalvare) {
          const centroNome = centri?.find(c => c.id === centroId)?.nome || '';
          combinazioni.push({
            ...base,
            centro_id: centroId || '',
            centro_nome: centroNome,
            assegnato_a_email: persona?.email || '',
            assegnato_a_nome: persona?.nome || '',
          });
        }
      }
      onSave(combinazioni);
      return;
    }

    const singolo = {
      ...base,
      centro_id: centriSelezionati[0] || form.centro_id || '',
    };
    if (assegnatiSelezionati.length > 0) {
      singolo.assegnato_a_email = assegnatiSelezionati[0].email;
      singolo.assegnato_a_nome = assegnatiSelezionati[0].nome;
    }
    onSave(singolo);
  };

  const isMultipla = isProprieta && modalitaAssegnazione === 'multipla' && !task;

  const rowClass = "flex items-start gap-3";
  const labelClass = "w-36 flex-shrink-0 text-sm font-medium text-slate-700 pt-2";
  const fieldClass = "flex-1 min-w-0";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Modifica Task' : 'Nuovo Task'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">

          <div className={rowClass}>
            <label className={labelClass}>Titolo *</label>
            <div className={fieldClass}>
              <Input value={form.titolo} onChange={e => set('titolo', e.target.value)} required className="h-8 text-sm" />
            </div>
          </div>

          <div className={rowClass}>
            <label className={labelClass}>Descrizione</label>
            <div className={fieldClass}>
              <Textarea value={form.descrizione} onChange={e => set('descrizione', e.target.value)} rows={2} className="text-sm" />
            </div>
          </div>

          <div className={rowClass}>
            <label className={labelClass}>Priorità</label>
            <div className={fieldClass}>
              <Select value={form.priorita} onValueChange={v => set('priorita', v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bassa">Bassa</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className={rowClass}>
            <label className={labelClass}>Data scadenza *</label>
            <div className={fieldClass}>
              <Input type="date" value={form.data_scadenza} onChange={e => set('data_scadenza', e.target.value)} required className="h-8 text-sm w-full" />
            </div>
          </div>

          {isProprieta && !task && (
            <div className={rowClass}>
              <span className={labelClass}>Multi-assegnazione</span>
              <div className={`${fieldClass} flex items-center pt-1.5 gap-2`}>
                <Switch
                  checked={modalitaAssegnazione === 'multipla'}
                  onCheckedChange={v => setModalitaAssegnazione(v ? 'multipla' : 'singola')}
                  id="multi"
                />
                <Label htmlFor="multi" className="text-sm text-slate-500">Più centri / persone</Label>
              </div>
            </div>
          )}

          {(isProprieta || user?.tipo_account === 'direttore') && centri?.length > 0 && (
            <div className={rowClass}>
              <label className={labelClass}>{isMultipla ? 'Centri' : 'Centro *'}</label>
              <div className={fieldClass}>
                {isMultipla ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCentriSelezionati([])}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${centriSelezionati.length === 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                    >
                      Tutti
                    </button>
                    {centri.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCentro(c.id)}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${centriSelezionati.includes(c.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                      >
                        {c.nome}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Select value={centriSelezionati[0] || ''} onValueChange={v => setCentriSelezionati(v ? [v] : [])}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Tutti i centri" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Tutti i centri</SelectItem>
                      {centri.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          {assegnatari.length > 0 && (
            <div className={rowClass}>
              <label className={labelClass}>Assegna a *</label>
              <div className={fieldClass}>
                {isMultipla ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {assegnatari.map(a => (
                      <button
                        key={a.email}
                        type="button"
                        onClick={() => toggleAssegnato(a)}
                        className={`px-2.5 py-1 rounded-full text-sm border transition-colors ${assegnatiSelezionati.find(x => x.email === a.email) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                      >
                        {a.nome} <span className="opacity-70 text-xs">({a.ruolo})</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <Select
                    value={assegnatiSelezionati[0]?.email || ''}
                    onValueChange={v => {
                      const trovato = assegnatari.find(a => a.email === v);
                      setAssegnatiSelezionati(trovato ? [trovato] : []);
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleziona persona..." /></SelectTrigger>
                    <SelectContent>
                      {assegnatari.map(a => (
                        <SelectItem key={a.email} value={a.email}>
                          {a.nome} <span className="text-slate-400 text-xs">({a.ruolo})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          {isMultipla && (
            <div className="bg-blue-50 rounded-lg p-2.5 text-sm text-blue-800 ml-[144px]">
              Verranno creati <strong>
                {Math.max(centriSelezionati.length, 1) * Math.max(assegnatiSelezionati.length, 1)}
              </strong> task separati per ogni combinazione centro/persona.
            </div>
          )}

          <div className={rowClass}>
            <span className={labelClass}>Ricorrente</span>
            <div className={`${fieldClass} flex items-center pt-1.5`}>
              <Switch checked={form.ricorrente} onCheckedChange={v => set('ricorrente', v)} id="ricorrente" />
            </div>
          </div>

          {form.ricorrente && (
            <div className="bg-slate-50 rounded-lg p-3 space-y-3 ml-[144px]">
              <div className={rowClass}>
                <label className="w-24 flex-shrink-0 text-sm font-medium text-slate-700 pt-2">Tipo</label>
                <div className="flex-1">
                  <Select value={form.ricorrenza_tipo} onValueChange={v => set('ricorrenza_tipo', v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="giornaliero">Giornaliero</SelectItem>
                      <SelectItem value="settimanale">Settimanale</SelectItem>
                      <SelectItem value="mensile">Mensile</SelectItem>
                      <SelectItem value="annuale">Annuale</SelectItem>
                      <SelectItem value="personalizzato">Personalizzato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.ricorrenza_tipo === 'personalizzato' && (
                <div className={rowClass}>
                  <label className="w-24 flex-shrink-0 text-sm font-medium text-slate-700 pt-2">Ogni</label>
                  <div className="flex-1 flex gap-2">
                    <Input
                      type="number" min="1" className="h-8 text-sm w-20"
                      value={form.ricorrenza_ogni}
                      onChange={e => set('ricorrenza_ogni', parseInt(e.target.value) || 1)}
                    />
                    <Select value={form.ricorrenza_unita} onValueChange={v => set('ricorrenza_unita', v)}>
                      <SelectTrigger className="h-8 text-sm flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="giorni">Giorni</SelectItem>
                        <SelectItem value="settimane">Settimane</SelectItem>
                        <SelectItem value="mesi">Mesi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className={rowClass}>
                <label className="w-24 flex-shrink-0 text-sm font-medium text-slate-700 pt-2">Fine</label>
                <div className="flex-1">
                  <Input type="date" value={form.ricorrenza_fine} onChange={e => set('ricorrenza_fine', e.target.value)} className="h-8 text-sm w-full" />
                </div>
              </div>
            </div>
          )}

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

          <div className={rowClass}>
            <label className={labelClass}>Note</label>
            <div className={fieldClass}>
              <Textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2} className="text-sm" />
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