import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const MESI_NOMI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

export default function FormValoreCella({ open, contatore, day, mese, anno, onClose, onSave }) {
  const [val, setVal] = useState('');

  useEffect(() => {
    if (open && contatore) {
      const current = contatore[`d${day}`];
      setVal(current != null ? String(current) : '');
    }
  }, [open, contatore, day]);

  const submit = () => {
    const trimmed = val.trim();
    const num = trimmed === '' ? null : Number(trimmed);
    if (trimmed !== '' && (num == null || isNaN(num))) return;
    onSave(num);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {contatore?.nome} — {day} {MESI_NOMI[(mese || 1) - 1].toLowerCase()} {anno}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Input
            type="number"
            step="any"
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder="Lettura"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Annulla</Button>
          <Button size="sm" onClick={submit}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}