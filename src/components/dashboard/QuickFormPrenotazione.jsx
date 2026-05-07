import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import FormPrenotazione from '@/components/calendario/FormPrenotazione';

export default function QuickFormPrenotazione({ open, onClose, centroSelezionato, user }) {
  const [spazi, setSpazi] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (open && !loaded && centroSelezionato?.id) {
      loadData();
    }
  }, [open, centroSelezionato?.id]);

  const loadData = async () => {
    const centroId = centroSelezionato?.id !== 'tutti' ? centroSelezionato?.id : null;
    const [allSpazi, allClienti] = await Promise.all([
      centroId
        ? base44.entities.SpazioExpo.filter({ centro_id: centroId, attivo: true })
        : base44.entities.SpazioExpo.filter({ attivo: true }),
      centroId
        ? base44.entities.Cliente.filter({ centro_id: centroId })
        : base44.entities.Cliente.list(),
    ]);
    setSpazi(allSpazi);
    setClienti(allClienti);
    setLoaded(true);
  };

  const handleSave = async (data) => {
    await base44.entities.Prenotazione.create({
      ...data,
      centro_id: centroSelezionato?.id !== 'tutti' ? centroSelezionato?.id : '',
    });
    onClose();
  };

  const handleClienteCreated = (nuovoCliente) => {
    setClienti(prev => [...prev, nuovoCliente]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuova Prenotazione</DialogTitle>
        </DialogHeader>
        <FormPrenotazione
          prenotazione={null}
          spazi={spazi}
          clienti={clienti}
          onSave={handleSave}
          onCancel={onClose}
          isVigilanza={user?.tipo_account === 'vigilanza'}
          centroSelezionato={centroSelezionato}
          onClienteCreated={handleClienteCreated}
        />
      </DialogContent>
    </Dialog>
  );
}