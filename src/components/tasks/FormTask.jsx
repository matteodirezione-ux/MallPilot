import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DatePicker from '@/components/ui/DatePicker';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Image as ImageIcon, X as XIcon, Loader2, Camera } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { compressImages } from '@/lib/compressImage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const defaultForm = {
  titolo: '', descrizione: '', priorita: 'media', stato: 'da_fare', data_scadenza: '',
  ricorrente: false, ricorrenza_tipo: 'settimanale', ricorrenza_ogni: 1, ricorrenza_unita: 'settimane', ricorrenza_fine: '', foto_urls: [], note: '',
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
      const oggi = new Date().toISOString().split('T')[0];
      setForm({ ...defaultForm, data_scadenza: oggi });
      setCentriSelezionati(centroDefault ? [centroDefault] : []);
      // Pre-seleziona l'utente corrente come assegnatario
      if (user) {
        setAssegnatiSelezionati([{ email: user.email, nome: user.full_name }]);
      } else {
        setAssegnatiSelezionati([]);
      }
      setModalitaAssegnazione('singola');
    }
  }, [task, open]);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleFotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingFoto(true);
    const compressed = await compressImages(files);
    const nuoveUrls = [];
    for (const file of compressed) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      nuoveUrls.push(file_url);
    }
    set('foto_urls', [...(form.foto_urls || []), ...nuoveUrls]);
    setUploadingFoto(false);
    e.target.value = '';
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

  const toggleCentro = (id) => setCentriSelezionati(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAssegnato = (persona) => setAssegnatiSelezionati(prev => prev.find(a => a.email === persona.email) ? prev.filter(a => a.email !== persona.email) : [...prev, persona]);
  const isMultipla = isProprieta && modalitaAssegnazione === 'multipla' && !task;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (assegnatari.length > 0 && assegnatiSelezionati.length === 0) { alert('Seleziona a chi assegnare il task'); return; }
    const base = { ...form, assegnato_da_email: task?.assegnato_da_email || user?.email, assegnato_da_nome: task?.assegnato_da_nome || user?.full_name };
    if (!base.ricorrente) { delete base.ricorrenza_tipo; delete base.ricorrenza_ogni; delete base.ricorrenza_unita; delete base.ricorrenza_fine; }
    if (isProprieta && modalitaAssegnazione === 'multipla' && !task) {
      const centriDaSalvare = centriSelezionati.length > 0 ? centriSelezionati : [''];
      const assegnatiDaSalvare = assegnatiSelezionati.length > 0 ? assegnatiSelezionati : [null];
      const combinazioni = [];
      for (const centroId of centriDaSalvare) {
        for (const persona of assegnatiDaSalvare) {
          combinazioni.push({ ...base, centro_id: centroId || '', assegnato_a_email: persona?.email || '', assegnato_a_nome: persona?.nome || '' });
        }
      }
      onSave(combinazioni);
      return;
    }
    const singolo = { ...base, centro_id: centriSelezionati[0] || form.centro_id || '' };
    if (assegnatiSelezionati.length > 0) { singolo.assegnato_a_email = assegnatiSelezionati[0].email; singolo.assegnato_a_nome = assegnatiSelezionati[0].nome; }
    onSave(singolo);
  };

  const rowClass = "flex items-start gap-3";
  const labelClass = "w-32 flex-shrink-0 text-sm font-medium text-slate-700 pt-2";
  const fieldClass = "flex-1 min-w-0";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{task ? 'Modifica Task' : 'Nuovo Task'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">

          <div className={rowClass}>
            <label className={labelClass}>Titolo *</label>
            <div className={fieldClass}><Input value={form.titolo} onChange={e => set('titolo', e.target.value)} required className="h-8 text-sm" /></div>
          </div>

          <div className={rowClass}>
            <label className={labelClass}>Descrizione</label>
            <div className={fieldClass}><Textarea value={form.descrizione} onChange={e => set('descrizione', e.target.value)} rows={2} className="text-sm" /></div>
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
            <label className={labelClass}>Stato</label>
            <div className={fieldClass}>
              <Select value={form.stato} onValueChange={v => set('stato', v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="da_fare">Da fare</SelectItem>
                  <SelectItem value="in_corso">In corso</SelectItem>
                  <SelectItem value="completato">Completato</SelectItem>
                  <SelectItem value="annullato">Annullato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className={rowClass}>
            <label className={labelClass}>Data scadenza</label>
            <div className={fieldClass}><DatePicker value={form.data_scadenza} onChange={v => set('data_scadenza', v)} placeholder="Seleziona data" /></div>
          </div>

          {centri && centri.length > 0 && (
            <div className={rowClass}>
              <label className={labelClass}>Centro</label>
              <div className={fieldClass}>
                {isMultipla ? (
                  <div className="space-y-1 max-h-32 overflow-y-auto border rounded-lg p-2">
                    {centri.map(c => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm hover:bg-slate-50 px-1 py-0.5 rounded">
                        <input type="checkbox" checked={centriSelezionati.includes(c.id)} onChange={() => toggleCentro(c.id)} className="rounded" />{c.nome}
                      </label>
                    ))}
                  </div>
                ) : (
                  <select value={centriSelezionati[0] || ''} onChange={e => setCentriSelezionati([e.target.value])} className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm h-8">
                    <option value="">Seleziona centro</option>
                    {centri.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                )}
              </div>
            </div>
          )}

          {assegnatari.length > 0 && (
            <div className={rowClass}>
              <label className={labelClass}>Assegna a</label>
              <div className={fieldClass}>
                {isMultipla ? (
                  <div className="space-y-1 max-h-32 overflow-y-auto border rounded-lg p-2">
                    {assegnatari.map(p => (
                      <label key={p.email} className="flex items-center gap-2 cursor-pointer text-sm hover:bg-slate-50 px-1 py-0.5 rounded">
                        <input type="checkbox" checked={!!assegnatiSelezionati.find(a => a.email === p.email)} onChange={() => toggleAssegnato(p)} className="rounded" />
                        {p.nome} <span className="text-xs text-slate-400">({p.ruolo})</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <select value={assegnatiSelezionati[0]?.email || ''} onChange={e => { const p = assegnatari.find(a => a.email === e.target.value); setAssegnatiSelezionati(p ? [p] : []); }} className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm h-8">
                    <option value="">Seleziona persona</option>
                    {assegnatari.map(p => <option key={p.email} value={p.email}>{p.nome} ({p.ruolo})</option>)}
                  </select>
                )}
              </div>
            </div>
          )}

          {isProprieta && !task && (
            <div className={rowClass}>
              <label className={labelClass}></label>
              <div className={`${fieldClass} flex items-center gap-2`}>
                <Switch checked={modalitaAssegnazione === 'multipla'} onCheckedChange={v => setModalitaAssegnazione(v ? 'multipla' : 'singola')} />
                <span className="text-sm text-slate-600">Assegnazione multipla</span>
              </div>
            </div>
          )}

          <div className={rowClass}>
            <label className={labelClass}>Ricorrente</label>
            <div className={`${fieldClass} flex items-center pt-2`}>
              <Switch checked={form.ricorrente} onCheckedChange={v => set('ricorrente', v)} />
            </div>
          </div>

          {form.ricorrente && (
            <div className="ml-[140px] border-l-2 border-slate-200 pl-3 space-y-2">
              <Select value={form.ricorrenza_tipo} onValueChange={v => set('ricorrenza_tipo', v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['giornaliero','settimanale','mensile','annuale','personalizzato'].map(v => <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.ricorrenza_tipo === 'personalizzato' && (
                <div className="flex gap-2">
                  <Input type="number" value={form.ricorrenza_ogni} onChange={e => set('ricorrenza_ogni', parseInt(e.target.value))} className="w-20 h-8" min={1} />
                  <Select value={form.ricorrenza_unita} onValueChange={v => set('ricorrenza_unita', v)}>
                    <SelectTrigger className="flex-1 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="giorni">Giorni</SelectItem>
                      <SelectItem value="settimane">Settimane</SelectItem>
                      <SelectItem value="mesi">Mesi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DatePicker value={form.ricorrenza_fine} onChange={v => set('ricorrenza_fine', v)} placeholder="Data fine ricorrenza" />
            </div>
          )}

          <div className={rowClass}>
            <label className={labelClass}>Note</label>
            <div className={fieldClass}><Textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2} className="text-sm" /></div>
          </div>

          <div className={rowClass}>
            <label className={labelClass}>Foto</label>
            <div className={fieldClass}>
              <div className="flex gap-2 flex-wrap mb-2">
                {uploadingFoto ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" />Caricamento...</div>
                ) : (
                  <>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg cursor-pointer transition-colors">
                      <ImageIcon className="w-4 h-4" />Galleria
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleFotoUpload} />
                    </label>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-sm rounded-lg cursor-pointer transition-colors">
                      <Camera className="w-4 h-4" />Fotocamera
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFotoUpload} />
                    </label>
                  </>
                )}
              </div>
              {(form.foto_urls || []).length > 0 && (
                <div className="grid grid-cols-4 gap-1">
                  {form.foto_urls.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt="" className="w-full h-16 object-cover rounded" />
                      <button type="button" onClick={() => set('foto_urls', form.foto_urls.filter((_, idx) => idx !== i))} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <XIcon className="w-2.5 h-2.5" />
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