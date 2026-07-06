import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function FormValoreMese({ open, contatore, field, meseLabel, placeholder = 'Lettura', mode, onClose, onSave }) {
  const [val, setVal] = useState('');

  useEffect(() => {
    if (open && contatore && field) {
      const current = contatore[field];
      setVal(current != null ? String(current) : '');
    }
  }, [open, contatore, field]);

  const submit = () => {
    const trimmed = val.trim();
    const num = trimmed === '' ? null : Number(trimmed);
    if (trimmed !== '' && (num == null || isNaN(num))) return;
    onSave(num);
  };

  const title = contatore?.nome ? `${contatore.nome} — ${meseLabel || field}` : (meseLabel || field);
  const isCosti = mode === 'costi';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-sm">{title}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Input
            type="number"
            step="any"
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder={isCosti ? 'Costo (€)' : placeholder}
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