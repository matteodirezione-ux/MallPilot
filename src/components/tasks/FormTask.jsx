import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
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
  note: '',
};

export default function FormTask({ open, onClose, onSave, task, user, centri, direttori, vigilanze }) {
  const [form, setForm] = useState(defaultForm);
  // Selezione multipla per proprietà
  const [centriSelezionati, setCentriSelezionati] = useState([]); // [] = tutti
  const [assegnatiSelezionati, setAssegnatiSelezionati] = useState([]); // [] = nessuno specifico
  const [modalitaAssegnazione, setModalitaAssegnazione] = useState('singola'); // 'singola' | 'multipla'

  const isProprieta = user?.tipo_account === 'proprieta';

  useEffect(() => {
    if (task) {
      setForm({ ...defaultForm, ...task });
      setCentriSelezionati(task.centro_id ? [task.centro_id] : []);
      setAssegnatiSelezionati(task.assegnato_a_email ? [{ email: task.assegnato_a_email, nome: task.assegnato_a_nome }] : []);
      setModalitaAssegnazione('singola');
    } else {
      setForm(defaultForm);
      setCentriSelezionati([]);
      setAssegnatiSelezionati([]);
      setModalitaAssegnazione('singola');
    }
  }, [task, open]);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  // Lista assegnatari disponibili
  const assegnatari = React.useMemo(() => {
    const list = [];
    if (isProprieta) {
      direttori?.forEach(d => list.push({ email: d.email, nome: d.full_name, ruolo: 'Direttore' }));
    } else if (user?.tipo_account === 'direttore') {
      // Direttore può assegnare a se stesso e alla vigilanza
      // Usa il nome dal record Direttore se disponibile, altrimenti full_name dell'utente
      const nomeDirettore = direttori?.find(d => d.email === user.email)?.full_name || user.full_name;
      list.push({ email: user.email, nome: nomeDirettore, ruolo: 'Direttore (tu)' });
      vigilanze?.forEach(v => list.push({ email: v.email, nome: v.full_name, ruolo: 'Vigilanza' }));
    } else if (user?.tipo_account === 'vigilanza') {
      // Vigilanza può assegnare solo a se stessa
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
    const base = {
      ...form,
      assegnato_da_email: user?.email,
      assegnato_da_nome: user?.full_name,
    };
    if (!base.ricorrente) {
      delete base.ricorrenza_tipo;
      delete base.ricorrenza_ogni;
      delete base.ricorrenza_unita;
      delete base.ricorrenza_fine;
    }

    // Modalità multipla: genera combinazioni centro x assegnato
    if (isProprieta && modalitaAssegnazione === 'multipla' && !task) {
      const centriDaSalvare = centriSelezionati.length > 0 ? centriSelezionati : [''];
      const assegnatiDaSalvare = assegnatiSelezionati.length > 0 ? assegnatiSelezionati : [null];

      // Ogni combinazione centro/assegnato → task separato con stesso gruppo_id
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
      onSave(combinazioni); // array di task
      return;
    }

    // Singola assegnazione (direttore o proprietà singola)
    const singolo = {
      ...base,
      centro_id: centriSelezionati[0] || form.centro_id || '',
    };
    if (assegnatiSelezionati.length > 0) {
      singolo.assegnato_a_email = assegnatiSelezionati[0].email;
      singolo.assegnato_a_nome = assegnatiSelezionati[0].nome;
    }
    onSave(singolo); // oggetto singolo
  };

  const isMultipla = isProprieta && modalitaAssegnazione === 'multipla' && !task;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Modifica Task' : 'Nuovo Task'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="flex items-center gap-3">
            <Label className="w-28 shrink-0 text-right text-xs">Titolo *</Label>
            <Input value={form.titolo} onChange={e => set('titolo', e.target.value)} required className="h-8 text-sm" />
          </div>

          <div className="flex items-start gap-3">
            <Label className="w-28 shrink-0 text-right text-xs mt-1.5">Descrizione</Label>
            <Textarea value={form.descrizione} onChange={e => set('descrizione', e.target.value)} rows={2} className="text-sm" />
          </div>

          <div className="flex items-center gap-3">
            <Label className="w-28 shrink-0 text-right text-xs">Priorità</Label>
            <Select value={form.priorita} onValueChange={v => set('priorita', v)}>
              <SelectTrigger className="h-8 text-sm flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bassa">Bassa</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Label className="w-28 shrink-0 text-right text-xs">Stato</Label>
            <Select value={form.stato} onValueChange={v => set('stato', v)}>
              <SelectTrigger className="h-8 text-sm flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="da_fare">Da fare</SelectItem>
                <SelectItem value="in_corso">In corso</SelectItem>
                <SelectItem value="completato">Completato</SelectItem>
                <SelectItem value="annullato">Annullato</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Label className="w-28 shrink-0 text-right text-xs">Data scadenza *</Label>
            <Input type="date" value={form.data_scadenza} onChange={e => set('data_scadenza', e.target.value)} required className="h-8 text-sm flex-1" />
          </div>

          {/* Modalità assegnazione (solo proprietà, solo nuovo task) */}
          {isProprieta && !task && (
            <div className="flex items-center gap-3">
              <Label className="w-28 shrink-0 text-right text-xs">Multi-assegnazione</Label>
              <Switch
                checked={modalitaAssegnazione === 'multipla'}
                onCheckedChange={v => setModalitaAssegnazione(v ? 'multipla' : 'singola')}
                id="multi"
              />
              <Label htmlFor="multi" className="text-xs text-slate-500">Più centri / persone</Label>
            </div>
          )}

          {/* Selezione centri */}
          {isProprieta && centri?.length > 0 && (
            <div className="flex items-start gap-3">
              <Label className="w-28 shrink-0 text-right text-xs mt-1">{isMultipla ? 'Centri' : 'Centro'}</Label>
              <div className="flex-1">
              {isMultipla ? (
                <div className="flex flex-wrap gap-2 mt-1">
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
                  <SelectTrigger><SelectValue placeholder="Tutti i centri" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Tutti i centri</SelectItem>
                    {centri.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Selezione assegnatari */}
          {assegnatari.length > 0 && (
            <div className="flex items-start gap-3">
              <Label className="w-28 shrink-0 text-right text-xs mt-1">Assegna a</Label>
              <div className="flex-1">
              {isMultipla ? (
                <div className="flex flex-wrap gap-2">
                  {assegnatari.map(a => (
                    <button
                      key={a.email}
                      type="button"
                      onClick={() => toggleAssegnato(a)}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${assegnatiSelezionati.find(x => x.email === a.email) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                    >
                      {a.nome} <span className="opacity-70">({a.ruolo})</span>
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

          {/* Riepilogo task che verranno creati */}
          {isMultipla && (
            <div className="bg-blue-50 rounded-lg p-2.5 text-xs text-blue-800 ml-31">
              Verranno creati <strong>
                {Math.max(centriSelezionati.length, 1) * Math.max(assegnatiSelezionati.length, 1)}
              </strong> task separati per ogni combinazione centro/persona.
            </div>
          )}

          {/* Ricorrenza */}
          <div className="flex items-center gap-3">
            <Label className="w-28 shrink-0 text-right text-xs">Ricorrente</Label>
            <Switch checked={form.ricorrente} onCheckedChange={v => set('ricorrente', v)} id="ricorrente" />
          </div>

          {form.ricorrente && (
            <div className="bg-slate-50 rounded-lg p-3 space-y-2.5 ml-1">
              <div className="flex items-center gap-3">
                <Label className="w-28 shrink-0 text-right text-xs">Tipo</Label>
                <Select value={form.ricorrenza_tipo} onValueChange={v => set('ricorrenza_tipo', v)}>
                  <SelectTrigger className="h-8 text-sm flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="giornaliero">Giornaliero</SelectItem>
                    <SelectItem value="settimanale">Settimanale</SelectItem>
                    <SelectItem value="mensile">Mensile</SelectItem>
                    <SelectItem value="annuale">Annuale</SelectItem>
                    <SelectItem value="personalizzato">Personalizzato</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.ricorrenza_tipo === 'personalizzato' && (
                <div className="flex items-center gap-3">
                  <Label className="w-28 shrink-0 text-right text-xs">Ogni</Label>
                  <Input
                    type="number" min="1" className="h-8 text-sm w-16"
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
              )}

              <div className="flex items-center gap-3">
                <Label className="w-28 shrink-0 text-right text-xs">Fine ricorrenza</Label>
                <Input type="date" value={form.ricorrenza_fine} onChange={e => set('ricorrenza_fine', e.target.value)} className="h-8 text-sm flex-1" />
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Label className="w-28 shrink-0 text-right text-xs mt-1.5">Note</Label>
            <Textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2} className="text-sm" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Annulla</Button>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700">Salva</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}