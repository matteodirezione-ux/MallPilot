import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function FormCorrispettivi({ open, onClose, tenant, user, meseIniziale, corrispettivoDaModificare }) {
  const [loading, setLoading] = useState(false);
  
  const oggi = new Date();
  const giornoOggi = oggi.getDate();
  
  // Calcola il mese precedente
  const mesePrecedente = new Date(oggi.getFullYear(), oggi.getMonth() - 1, 1);
  const mesePrecedenteStr = format(mesePrecedente, 'yyyy-MM');
  
  // Il mese è fisso (quello selezionato dalla tabella o quello del corrispettivo da modificare)
  const meseFisso = corrispettivoDaModificare 
    ? format(new Date(corrispettivoDaModificare.mese), 'yyyy-MM')
    : meseIniziale || format(new Date(), 'yyyy-MM');

  // Verifica se il tenant può modificare (solo dal 1 al 10 del mese per il mese precedente)
  const puoModificare = user?.tipo_account === 'proprieta' || user?.tipo_account === 'direttore' ||
    (user?.tipo_account === 'tenant' && giornoOggi <= 10 && meseFisso === mesePrecedenteStr);

  const [formData, setFormData] = useState(
    corrispettivoDaModificare ? {
      corrispettivi_ivati: corrispettivoDaModificare.corrispettivi_ivati.toString(),
      corrispettivi_netti: corrispettivoDaModificare.corrispettivi_netti.toString(),
      numero_scontrini: corrispettivoDaModificare.numero_scontrini.toString()
    } : {
      corrispettivi_ivati: '',
      corrispettivi_netti: '',
      numero_scontrini: ''
    }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Verifica permessi tenant
    if (user?.tipo_account === 'tenant' && !puoModificare) {
      toast.error('Puoi inserire i corrispettivi solo dal 1° al 10° giorno del mese per il mese precedente');
      return;
    }
    
    setLoading(true);

    try {
      if (corrispettivoDaModificare) {
        // Modifica esistente
        await base44.entities.Corrispettivo.update(corrispettivoDaModificare.id, {
          corrispettivi_ivati: parseFloat(formData.corrispettivi_ivati),
          corrispettivi_netti: parseFloat(formData.corrispettivi_netti),
          numero_scontrini: parseInt(formData.numero_scontrini)
        });
        toast.success('Corrispettivi modificati con successo');
      } else {
        // Nuovo inserimento per il mese fisso
        await base44.entities.Corrispettivo.create({
          tenant_id: tenant.id,
          centro_id: tenant.centro_id,
          numero_negozio: tenant.numero_negozio,
          mese: meseFisso + '-01',
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
          <DialogTitle>
            {corrispettivoDaModificare ? 'Modifica Corrispettivi' : 'Nuovo Inserimento Corrispettivi'}
          </DialogTitle>
          {user?.tipo_account === 'tenant' && !puoModificare && (
            <p className="text-sm text-red-500 mt-2">
              Puoi inserire i corrispettivi solo dal 1° al 10° giorno del mese per il mese precedente
            </p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Mese di riferimento</Label>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-medium text-slate-700">
              {format(new Date(meseFisso + '-01'), 'MMMM yyyy', { locale: it }).charAt(0).toUpperCase() + format(new Date(meseFisso + '-01'), 'MMMM yyyy', { locale: it }).slice(1)}
            </div>
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
              disabled={!puoModificare && user?.tipo_account === 'tenant'}
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
              disabled={!puoModificare && user?.tipo_account === 'tenant'}
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
              disabled={!puoModificare && user?.tipo_account === 'tenant'}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button 
              type="submit" 
              disabled={loading || (!puoModificare && user?.tipo_account === 'tenant')}
            >
              {loading ? 'Inserimento...' : 'Inserisci'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}