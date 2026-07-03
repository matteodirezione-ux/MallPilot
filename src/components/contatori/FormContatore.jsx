import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const MESI = [
  { key: 'gen', label: 'Gennaio' }, { key: 'feb', label: 'Febbraio' }, { key: 'mar', label: 'Marzo' },
  { key: 'apr', label: 'Aprile' }, { key: 'mag', label: 'Maggio' }, { key: 'giu', label: 'Giugno' },
  { key: 'lug', label: 'Luglio' }, { key: 'ago', label: 'Agosto' }, { key: 'set', label: 'Settembre' },
  { key: 'ott', label: 'Ottobre' }, { key: 'nov', label: 'Novembre' }, { key: 'dic', label: 'Dicembre' },
];

const empty = { nome: '', lettura_iniziale: '', costo_unitario: '', gen: '', feb: '', mar: '', apr: '', mag: '', giu: '', lug: '', ago: '', set: '', ott: '', nov: '', dic: '' };

export default function FormContatore({ open, onClose, onSave, contatore, tipo, anno, isSub, padreNome }) {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (contatore) {
      setForm({
        nome: contatore.nome || '', lettura_iniziale: contatore.lettura_iniziale ?? '',
        costo_unitario: contatore.costo_unitario ?? '',
        gen: contatore.gen ?? '', feb: contatore.feb ?? '', mar: contatore.mar ?? '',
        apr: contatore.apr ?? '', mag: contatore.mag ?? '', giu: contatore.giu ?? '',
        lug: contatore.lug ?? '', ago: contatore.ago ?? '', set: contatore.set ?? '',
        ott: contatore.ott ?? '', nov: contatore.nov ?? '', dic: contatore.dic ?? ''
      });
    } else {
      setForm(empty);
    }
  }, [contatore, open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.nome.trim()) return;
    const data = {
      nome: form.nome.trim(),
      tipo, anno,
      lettura_iniziale: form.lettura_iniziale === '' ? null : Number(form.lettura_iniziale),
      costo_unitario: form.costo_unitario === '' ? null : Number(form.costo_unitario),
    };
    MESI.forEach(m => { data[m.key] = form[m.key] === '' ? null : Number(form[m.key]); });
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contatore ? 'Modifica Contatore' : isSub ? `Nuovo Sottocontatore${padreNome ? ' · ' + padreNome : ''}` : 'Nuovo Contatore'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Nome contatore</label>
            <Input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="es. Contatore generale, Negozio 12..." />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Tipo</label>
              <Input value={tipo} disabled className="bg-slate-50 capitalize" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Anno</label>
              <Input value={anno} disabled className="bg-slate-50" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Costo unitario (€)</label>
              <Input type="number" step="0.01" value={form.costo_unitario} onChange={e => set('costo_unitario', e.target.value)} placeholder="es. 2.50" />
            </div>
          </div>
          {tipo !== 'energia' && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Lettura iniziale (31/12 anno prec.)</label>
              <Input type="number" value={form.lettura_iniziale} onChange={e => set('lettura_iniziale', e.target.value)} placeholder="es. 3881" />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">{tipo === 'energia' ? 'Consumi mensili diretti' : 'Rilevazioni mensili (letture cumulative)'}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {MESI.map(m => (
                <div key={m.key}>
                  <label className="text-xs text-slate-500 mb-1 block">{m.label}</label>
                  <Input type="number" value={form[m.key]} onChange={e => set(m.key, e.target.value)} placeholder="—" />
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