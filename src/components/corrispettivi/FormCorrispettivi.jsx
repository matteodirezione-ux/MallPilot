import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { startOfMonth, format } from 'date-fns';

export default function FormCorrispettivi({ open, onClose, tenant, user, meseIniziale, corrispettivoDaModificare }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(
    corrispettivoDaModificare ? {
      mese: format(new Date(corrispettivoDaModificare.mese), 'yyyy-MM'),
      corrispettivi_ivati: corrispettivoDaModificare.corrispettivi_ivati.toString(),
      corrispettivi_netti: corrispettivoDaModificare.corrispettivi_netti.toString(),
      numero_scontrini: corrispettivoDaModificare.numero_scontrini.toString()
    } : {
      mese: meseIniziale || format(startOfMonth(new Date()), 'yyyy-MM'),
      corrispettivi_ivati: '',
      corrispettivi_netti: '',
      numero_scontrini: ''
    }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (corrispettivoDaModificare) {
        // Modifica esistente (solo proprietà/direttore)
        await base44.entities.Corrispettivo.update(corrispettivoDaModificare.id, {
          corrispettivi_ivati: parseFloat(formData.corrispettivi_ivati),
          corrispettivi_netti: parseFloat(formData.corrispettivi_netti),
          numero_scontrini: parseInt(formData.numero_scontrini)
        });
        toast.success('Corrispettivi modificati con successo');
      } else {
        // Nuovo inserimento
        // Verifica se esiste già un corrispettivo per quel mese
        const esistenti = await base44.entities.Corrispettivo.filter({
          tenant_id: tenant.id,
          mese: formData.mese + '-01'
        });

        if (esistenti.length > 0) {
          toast.error('Esiste già un inserimento per questo mese');
          setLoading(false);
          return;
        }

        await base44.entities.Corrispettivo.create({
          tenant_id: tenant.id,
          centro_id: tenant.centro_id,
          numero_negozio: tenant.numero_negozio,
          mese: formData.mese + '-01',
          corrispettivi_ivati: parseFloat(formData.corrispettivi_ivati),
          corrispettivi_netti: parseFloat(formData.corrispettivi_netti),
          numero_scontrini: parseInt(formData.numero_scontrini),
          inserito_da_email: user.email,
          data_inserimento: new Date().toISOString()
        });

        toast.success('Corrispettivi inseriti con successo');
      }
      onClose();
      setFormData({
        mese: format(startOfMonth(new Date()), 'yyyy-MM'),
        corrispettivi_ivati: '',
        corrispettivi_netti: '',
        numero_scontrini: ''
      });
    } catch (error) {
      console.error('Errore inserimento:', error);
      toast.error('Errore durante l\'inserimento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{corrispettivoDaModificare ? 'Modifica Corrispettivi' : 'Nuovo Inserimento Corrispettivi'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Mese di riferimento</Label>
            <Input
              type="month"
              value={formData.mese}
              onChange={(e) => setFormData({ ...formData, mese: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Corrispettivi Ivati (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.corrispettivi_ivati}
              onChange={(e) => setFormData({ ...formData, corrispettivi_ivati: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label>Corrispettivi Netti (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.corrispettivi_netti}
              onChange={(e) => setFormData({ ...formData, corrispettivi_netti: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label>Numero Scontrini</Label>
            <Input
              type="number"
              value={formData.numero_scontrini}
              onChange={(e) => setFormData({ ...formData, numero_scontrini: e.target.value })}
              placeholder="0"
              required
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Inserimento...' : 'Inserisci'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}