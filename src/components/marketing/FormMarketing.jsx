import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const MESI_LABEL = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

const SEZIONE_LABEL = {
  iniziativa: 'Iniziativa',
  comunicazione_online: 'Comunicazione Online',
  comunicazione_offline: 'Comunicazione Offline',
  costo_fisso: 'Costo Fisso',
};

const defaultForm = (sezione) => ({
  sezione: sezione || 'iniziativa',
  nome: '',
  tipologia: '',
  budget_totale: '',
  gen: '', feb: '', mar: '', apr: '', mag: '', giu: '',
  lug: '', ago: '', set: '', ott: '', nov: '', dic: '',
  nome_iniziativa_gen: '', nome_iniziativa_feb: '', nome_iniziativa_mar: '',
  nome_iniziativa_apr: '', nome_iniziativa_mag: '', nome_iniziativa_giu: '',
  nome_iniziativa_lug: '', nome_iniziativa_ago: '', nome_iniziativa_set: '',
  nome_iniziativa_ott: '', nome_iniziativa_nov: '', nome_iniziativa_dic: '',
});

export default function FormMarketing({ row, onSave, onCancel }) {
  const [form, setForm] = useState(defaultForm(row?.sezione));

  useEffect(() => {
    if (row && row.id) {
      const f = { ...defaultForm(row.sezione) };
      Object.keys(f).forEach(k => { if (row[k] !== undefined) f[k] = row[k] ?? ''; });
      setForm(f);
    } else if (row?.sezione) {
      setForm(defaultForm(row.sezione));
    }
  }, [row]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    // Converti numeri
    ['budget_totale', ...MESI].forEach(k => {
      data[k] = data[k] !== '' && data[k] !== null && data[k] !== undefined
        ? parseFloat(String(data[k]).replace(',', '.')) || 0
        : null;
    });
    // Ricalcola budget_totale se non inserito
    if (!data.budget_totale) {
      data.budget_totale = MESI.reduce((acc, m) => acc + (data[m] || 0), 0);
    }
    onSave(data);
  };

  const isInizativa = form.sezione === 'iniziativa';

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row?.id ? 'Modifica' : 'Nuova'} {SEZIONE_LABEL[form.sezione]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Sezione */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Sezione</Label>
              <Select value={form.sezione} onValueChange={v => set('sezione', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SEZIONE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Nome voce *</Label>
              <Input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="es. Social Ads" required />
            </div>
          </div>

          {isInizativa && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipologia</Label>
                <Select value={form.tipologia} onValueChange={v => set('tipologia', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                  <SelectContent>
                    {['COMMERCIAL','ENTERTAINMENT','COMMUNITY','CULTURAL','altro'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Budget totale (€)</Label>
                <Input type="number" value={form.budget_totale} onChange={e => set('budget_totale', e.target.value)} placeholder="Lascia vuoto = somma mesi" />
              </div>
            </div>
          )}

          {!isInizativa && (
            <div className="space-y-1">
              <Label>Budget totale (€)</Label>
              <Input type="number" value={form.budget_totale} onChange={e => set('budget_totale', e.target.value)} placeholder="Lascia vuoto = somma mesi" />
            </div>
          )}

          {/* Importi mensili */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Importi mensili (€)</Label>
              <button
                type="button"
                onClick={() => {
                  const tot = parseFloat(String(form.budget_totale).replace(',', '.'));
                  if (!tot || tot <= 0) return;
                  const perMese = Math.round((tot / 12) * 100) / 100;
                  const update = {};
                  MESI.forEach(m => { update[m] = perMese; });
                  setForm(prev => ({ ...prev, ...update }));
                }}
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Spalma su tutti i mesi
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {MESI.map((m, i) => (
                <div key={m} className="space-y-1">
                  <label className="text-xs text-slate-500">{MESI_LABEL[i]}</label>
                  <Input
                    type="number"
                    value={form[m]}
                    onChange={e => set(m, e.target.value)}
                    placeholder="0"
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Nomi iniziativa per mese (solo iniziative) */}
          {isInizativa && (
            <div>
              <Label className="mb-2 block">Nome iniziativa per mese</Label>
              <div className="grid grid-cols-4 gap-2">
                {MESI.map((m, i) => (
                  <div key={m} className="space-y-1">
                    <label className="text-xs text-slate-500">{MESI_LABEL[i]}</label>
                    <Input
                      value={form[`nome_iniziativa_${m}`]}
                      onChange={e => set(`nome_iniziativa_${m}`, e.target.value)}
                      placeholder="es. SALDI"
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>Annulla</Button>
            <Button type="submit" size="sm">Salva</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}