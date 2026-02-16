import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function FormPrenotazione({ prenotazione, spazi, clienti, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    spazio_id: '',
    cliente_id: '',
    data_inizio: '',
    data_fine: '',
    prezzo_totale: '',
    prezzo_mensile: '',
    stato: 'confermata',
    note: ''
  });

  useEffect(() => {
    if (prenotazione) {
      setFormData({
        spazio_id: prenotazione.spazio_id,
        cliente_id: prenotazione.cliente_id,
        data_inizio: prenotazione.data_inizio,
        data_fine: prenotazione.data_fine,
        prezzo_totale: prenotazione.prezzo_totale,
        prezzo_mensile: prenotazione.prezzo_mensile || '',
        stato: prenotazione.stato,
        note: prenotazione.note || ''
      });
    }
  }, [prenotazione]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log('Form data:', formData);
    
    // Validazione campi obbligatori
    if (!formData.spazio_id) {
      toast.error('Seleziona uno spazio');
      return;
    }
    
    if (!formData.cliente_id) {
      toast.error('Seleziona un cliente');
      return;
    }
    
    if (!formData.data_inizio || !formData.data_fine) {
      toast.error('Inserisci le date di inizio e fine');
      return;
    }
    
    if (!formData.prezzo_totale || parseFloat(formData.prezzo_totale) <= 0) {
      toast.error('Inserisci un prezzo totale valido');
      return;
    }
    
    onSave({
      ...formData,
      prezzo_totale: parseFloat(formData.prezzo_totale),
      prezzo_mensile: formData.prezzo_mensile ? parseFloat(formData.prezzo_mensile) : null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="spazio_id">Spazio *</Label>
          <Select value={formData.spazio_id} onValueChange={(value) => setFormData({ ...formData, spazio_id: value })} required>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona uno spazio" />
            </SelectTrigger>
            <SelectContent>
              {spazi.map((spazio) => (
                <SelectItem key={spazio.id} value={spazio.id}>
                  Spazio {spazio.numero_spazio} {spazio.nome ? `- ${spazio.nome}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <Label htmlFor="cliente_id">Cliente *</Label>
          <Select value={formData.cliente_id} onValueChange={(value) => setFormData({ ...formData, cliente_id: value })} required>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona un cliente" />
            </SelectTrigger>
            <SelectContent>
              {clienti.map((cliente) => (
                <SelectItem key={cliente.id} value={cliente.id}>
                  {cliente.ragione_sociale}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="data_inizio">Data Inizio *</Label>
          <Input
            id="data_inizio"
            type="date"
            value={formData.data_inizio}
            onChange={(e) => setFormData({ ...formData, data_inizio: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="data_fine">Data Fine *</Label>
          <Input
            id="data_fine"
            type="date"
            value={formData.data_fine}
            onChange={(e) => setFormData({ ...formData, data_fine: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="prezzo_totale">Prezzo Totale (€) *</Label>
          <Input
            id="prezzo_totale"
            type="number"
            step="0.01"
            value={formData.prezzo_totale}
            onChange={(e) => setFormData({ ...formData, prezzo_totale: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="prezzo_mensile">Prezzo Mensile (€)</Label>
          <Input
            id="prezzo_mensile"
            type="number"
            step="0.01"
            value={formData.prezzo_mensile}
            onChange={(e) => setFormData({ ...formData, prezzo_mensile: e.target.value })}
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="stato">Stato</Label>
          <Select value={formData.stato} onValueChange={(value) => setFormData({ ...formData, stato: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confermata">Confermata</SelectItem>
              <SelectItem value="in_corso">In Corso</SelectItem>
              <SelectItem value="completata">Completata</SelectItem>
              <SelectItem value="cancellata">Cancellata</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <Label htmlFor="note">Note</Label>
          <Textarea
            id="note"
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annulla
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          {prenotazione ? 'Aggiorna' : 'Crea'}
        </Button>
      </div>
    </form>
  );
}