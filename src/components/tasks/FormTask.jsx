import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  centro_id: '',
  assegnato_a_email: '',
  assegnato_a_nome: '',
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

  useEffect(() => {
    if (task) {
      setForm({ ...defaultForm, ...task });
    } else {
      setForm(defaultForm);
    }
  }, [task, open]);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  // Calcola assegnatari disponibili in base al ruolo
  const assegnatari = React.useMemo(() => {
    const list = [];
    if (user?.tipo_account === 'proprieta') {
      // Proprietà può assegnare a direttori e vigilanze
      direttori?.forEach(d => list.push({ email: d.email, nome: d.full_name, ruolo: 'Direttore' }));
      vigilanze?.forEach(v => list.push({ email: v.email, nome: v.full_name, ruolo: 'Vigilanza' }));
    } else if (user?.tipo_account === 'direttore') {
      // Direttore può assegnare a se stesso e alla vigilanza
      list.push({ email: user.email, nome: user.full_name, ruolo: 'Direttore (tu)' });
      vigilanze?.forEach(v => list.push({ email: v.email, nome: v.full_name, ruolo: 'Vigilanza' }));
    }
    return list;
  }, [user, direttori, vigilanze]);

  const handleAssegnatoChange = (email) => {
    const trovato = assegnatari.find(a => a.email === email);
    set('assegnato_a_email', email);
    set('assegnato_a_nome', trovato?.nome || '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      assegnato_da_email: user?.email,
      assegnato_da_nome: user?.full_name,
    };
    if (!data.ricorrente) {
      delete data.ricorrenza_tipo;
      delete data.ricorrenza_ogni;
      delete data.ricorrenza_unita;
      delete data.ricorrenza_fine;
    }
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Modifica Task' : 'Nuovo Task'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Titolo *</Label>
            <Input value={form.titolo} onChange={e => set('titolo', e.target.value)} required />
          </div>

          <div>
            <Label>Descrizione</Label>
            <Textarea value={form.descrizione} onChange={e => set('descrizione', e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priorità</Label>
              <Select value={form.priorita} onValueChange={v => set('priorita', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bassa">Bassa</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stato</Label>
              <Select value={form.stato} onValueChange={v => set('stato', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="da_fare">Da fare</SelectItem>
                  <SelectItem value="in_corso">In corso</SelectItem>
                  <SelectItem value="completato">Completato</SelectItem>
                  <SelectItem value="annullato">Annullato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Data scadenza *</Label>
            <Input type="date" value={form.data_scadenza} onChange={e => set('data_scadenza', e.target.value)} required />
          </div>

          {assegnatari.length > 0 && (
            <div>
              <Label>Assegna a</Label>
              <Select value={form.assegnato_a_email} onValueChange={handleAssegnatoChange}>
                <SelectTrigger><SelectValue placeholder="Seleziona persona..." /></SelectTrigger>
                <SelectContent>
                  {assegnatari.map(a => (
                    <SelectItem key={a.email} value={a.email}>
                      {a.nome} <span className="text-slate-400 text-xs">({a.ruolo})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {centri?.length > 1 && (
            <div>
              <Label>Centro commerciale</Label>
              <Select value={form.centro_id} onValueChange={v => set('centro_id', v)}>
                <SelectTrigger><SelectValue placeholder="Tutti i centri" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Tutti i centri</SelectItem>
                  {centri.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Ricorrenza */}
          <div className="flex items-center gap-3 pt-1">
            <Switch checked={form.ricorrente} onCheckedChange={v => set('ricorrente', v)} id="ricorrente" />
            <Label htmlFor="ricorrente">Task ricorrente</Label>
          </div>

          {form.ricorrente && (
            <div className="bg-slate-50 rounded-lg p-3 space-y-3">
              <div>
                <Label>Tipo ricorrenza</Label>
                <Select value={form.ricorrenza_tipo} onValueChange={v => set('ricorrenza_tipo', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <div className="flex items-center gap-2">
                  <Label className="whitespace-nowrap">Ogni</Label>
                  <Input
                    type="number"
                    min="1"
                    className="w-20"
                    value={form.ricorrenza_ogni}
                    onChange={e => set('ricorrenza_ogni', parseInt(e.target.value) || 1)}
                  />
                  <Select value={form.ricorrenza_unita} onValueChange={v => set('ricorrenza_unita', v)}>
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
                <Label>Fine ricorrenza (opzionale)</Label>
                <Input type="date" value={form.ricorrenza_fine} onChange={e => set('ricorrenza_fine', e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <Label>Note</Label>
            <Textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Salva</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}