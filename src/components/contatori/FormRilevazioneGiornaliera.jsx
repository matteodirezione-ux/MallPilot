import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const MESI_NOMI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

export default function FormRilevazioneGiornaliera({ open, onClose, onSave, contatori, mese, anno, giorni }) {
  const [contatoreId, setContatoreId] = useState('');
  const [giorno, setGiorno] = useState('');
  const [valore, setValore] = useState('');

  useEffect(() => {
    if (open) {
      const now = new Date();
      const todayGiorno = (now.getMonth() + 1 === mese && now.getFullYear() === anno) ? now.getDate() : '';
      setGiorno(todayGiorno ? String(todayGiorno) : '');
      setContatoreId('');
      setValore('');
    }
  }, [open]);

  const prefill = (id, g) => {
    const c = contatori.find(x => x.id === id);
    setValore(c && c[`d${g}`] != null ? String(c[`d${g}`]) : '');
  };

  const handleContatoreChange = (id) => { setContatoreId(id); prefill(id, giorno); };
  const handleGiornoChange = (g) => { setGiorno(g); prefill(contatoreId, g); };

  const handleSave = () => {
    if (!contatoreId || !giorno || valore === '') return;
    onSave({ id: contatoreId, giorno: Number(giorno), valore: Number(valore) });
  };

  const giorniArr = Array.from({ length: giorni }, (_, i) => i + 1);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuova Rilevazione · {MESI_NOMI[mese - 1]} {anno}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Giorno</label>
            <Select value={giorno} onValueChange={handleGiornoChange}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Seleziona giorno..." /></SelectTrigger>
              <SelectContent>
                {giorniArr.map(g => <SelectItem key={g} value={String(g)}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Contatore</label>
            <Select value={contatoreId} onValueChange={handleContatoreChange}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Seleziona contatore..." /></SelectTrigger>
              <SelectContent>
                {contatori.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Valore lettura (m³)</label>
            <Input type="number" value={valore} onChange={e => setValore(e.target.value)} placeholder="es. 128" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Annulla</Button>
            <Button onClick={handleSave} disabled={!contatoreId || !giorno || valore === ''}>Salva</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}