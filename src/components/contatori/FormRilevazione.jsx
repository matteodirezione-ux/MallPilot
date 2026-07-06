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

export default function FormRilevazione({ open, onClose, onSave, contatori, mode = 'consumi', directConsumo = false }) {
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
    if (!c || c[m] == null) { setValore(''); return; }
    if (mode === 'costi') {
      const idx = MESI.findIndex(x => x.key === m);
      let cons;
      if (directConsumo) {
        cons = c[m];
      } else {
        const prev = idx === 0 ? c.lettura_iniziale : c[MESI[idx - 1].key];
        if (prev == null) { setValore(''); return; }
        cons = c[m] - prev;
      }
      const costo = c.costo_unitario || 0;
      const cost = costo ? cons * costo : cons;
      setValore(String(Number(cost.toFixed(2))));
    } else {
      setValore(String(c[m]));
    }
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

  const isCosti = mode === 'costi';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuova Rilevazione{isCosti ? ' · Costo' : ''}</DialogTitle>
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
            <label className="text-sm font-medium text-slate-700 mb-1 block">{isCosti ? 'Costo (€)' : 'Valore lettura'}</label>
            <Input type="number" step="any" value={valore} onChange={e => setValore(e.target.value)} placeholder={isCosti ? 'es. 150' : 'es. 3908'} />
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