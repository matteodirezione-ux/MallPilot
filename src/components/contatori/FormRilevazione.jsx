import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const MESI = [
  { key: 'gen', label: 'Gennaio' }, { key: 'feb', label: 'Febbraio' }, { key: 'mar', label: 'Marzo' },
  { key: 'apr', label: 'Aprile' }, { key: 'mag', label: 'Maggio' }, { key: 'giu', label: 'Giugno' },
  { key: 'lug', label: 'Luglio' }, { key: 'ago', label: 'Agosto' }, { key: 'set', label: 'Settembre' },
  { key: 'ott', label: 'Ottobre' }, { key: 'nov', label: 'Novembre' }, { key: 'dic', label: 'Dicembre' },
];

export default function FormRilevazione({ open, onClose, onSave, contatori }) {
  const [mese, setMese] = useState(MESI[new Date().getMonth()].key);
  const [contatoreId, setContatoreId] = useState('');
  const [valore, setValore] = useState('');

  useEffect(() => {
    if (open) {
      setMese(MESI[new Date().getMonth()].key);
      setContatoreId('');
      setValore('');
    }
  }, [open]);

  const prefill = (id, m) => {
    const c = contatori.find(x => x.id === id);
    setValore(c && c[m] != null ? String(c[m]) : '');
  };

  const handleContatoreChange = (id) => { setContatoreId(id); prefill(id, mese); };
  const handleMeseChange = (m) => { setMese(m); prefill(contatoreId, m); };

  const handleSave = () => {
    if (!contatoreId || valore === '') return;
    onSave({ id: contatoreId, mese, valore: Number(valore) });
  };

  const options = [];
  contatori.filter(c => !c.contatore_padre_id).forEach(c => {
    options.push({ id: c.id, label: c.nome });
    contatori.filter(s => s.contatore_padre_id === c.id).forEach(s => {
      options.push({ id: s.id, label: `↳ ${s.nome}` });
    });
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuova Rilevazione</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Mese</label>
            <Select value={mese} onValueChange={handleMeseChange}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MESI.map(m => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Contatore</label>
            <Select value={contatoreId} onValueChange={handleContatoreChange}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Seleziona contatore..." /></SelectTrigger>
              <SelectContent>
                {options.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Valore lettura</label>
            <Input type="number" value={valore} onChange={e => setValore(e.target.value)} placeholder="es. 3908" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Annulla</Button>
            <Button onClick={handleSave} disabled={!contatoreId || valore === ''}>Salva</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}