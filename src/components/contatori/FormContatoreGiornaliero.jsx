import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const MESI_NOMI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const daysInMonth = (y, m) => new Date(y, m, 0).getDate();

const empty = () => {
  const o = { nome: '', costo_unitario: '' };
  for (let i = 1; i <= 31; i++) o[`d${i}`] = '';
  return o;
};

export default function FormContatoreGiornaliero({ open, onClose, onSave, contatore, anno, mese }) {
  const [form, setForm] = useState(empty);
  const N = daysInMonth(anno, mese);

  useEffect(() => {
    if (contatore) {
      const o = { nome: contatore.nome || '', costo_unitario: contatore.costo_unitario ?? '' };
      for (let i = 1; i <= 31; i++) o[`d${i}`] = contatore[`d${i}`] ?? '';
      setForm(o);
    } else {
      setForm(empty());
    }
  }, [contatore, open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.nome.trim()) return;
    const data = { nome: form.nome.trim(), anno, mese, costo_unitario: form.costo_unitario === '' ? null : Number(form.costo_unitario) };
    for (let i = 1; i <= 31; i++) {
      data[`d${i}`] = form[`d${i}`] === '' ? null : Number(form[`d${i}`]);
    }
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contatore ? 'Modifica Contatore Giornaliero' : 'Nuovo Contatore Giornaliero'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Nome contatore</label>
            <Input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="es. Contatore generale..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Mese</label>
              <Input value={`${MESI_NOMI[mese - 1]} ${anno}`} disabled className="bg-slate-50" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Costo unitario (€/m³)</label>
              <Input type="number" step="0.01" value={form.costo_unitario} onChange={e => set('costo_unitario', e.target.value)} placeholder="es. 2.50" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Letture giornaliere (cumulative)</label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {Array.from({ length: N }, (_, i) => i + 1).map(d => (
                <div key={d}>
                  <label className="text-xs text-slate-500 mb-1 block">{d}</label>
                  <Input type="number" value={form[`d${d}`]} onChange={e => set(`d${d}`, e.target.value)} placeholder="—" className="h-8 text-xs" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Annulla</Button>
            <Button onClick={handleSave} disabled={!form.nome.trim()}>Salva</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}