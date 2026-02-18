import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { isWithinInterval } from 'date-fns';

export default function FormPrenotazione({ prenotazione, spazi, clienti, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    spazi_ids: [],
    cliente_id: '',
    data_inizio: '',
    data_fine: '',
    prezzo_totale: '',
    prezzo_mensile: '',
    materiale_dimostrativo: '',
    stato: 'confermata',
    note: ''
  });
  const [conflittiDisponibilita, setConflittiDisponibilita] = useState({});
  const [allPrenotazioni, setAllPrenotazioni] = useState([]);

  useEffect(() => {
    loadPrenotazioni();
    if (prenotazione) {
      // Supporta sia il vecchio campo spazio_id che il nuovo spazi_ids
      let spaziIds = prenotazione.spazi_ids || [];
      if (spaziIds.length === 0 && prenotazione.spazio_id) {
        spaziIds = [prenotazione.spazio_id];
      }
      setFormData({
        spazi_ids: spaziIds,
        cliente_id: prenotazione.cliente_id,
        data_inizio: prenotazione.data_inizio,
        data_fine: prenotazione.data_fine,
        prezzo_totale: prenotazione.prezzo_totale,
        prezzo_mensile: prenotazione.prezzo_mensile || '',
        materiale_dimostrativo: prenotazione.materiale_dimostrativo || '',
        stato: prenotazione.stato,
        note: prenotazione.note || ''
      });
    }
  }, [prenotazione]);

  const loadPrenotazioni = async () => {
    const prenotazioni = await base44.entities.Prenotazione.list();
    setAllPrenotazioni(prenotazioni);
  };

  useEffect(() => {
    if (formData.data_inizio && formData.data_fine && formData.spazi_ids.length > 0) {
      verificaDisponibilita();
    }
  }, [formData.data_inizio, formData.data_fine, formData.spazi_ids]);

  const verificaDisponibilita = () => {
    const dataInizio = new Date(formData.data_inizio);
    const dataFine = new Date(formData.data_fine);
    const nuoviConflitti = {};

    formData.spazi_ids.forEach(spazioId => {
      const conflittiSpazio = allPrenotazioni.filter(p => {
        if (prenotazione && p.id === prenotazione.id) return false; // escludi prenotazione in modifica
        if (p.stato === 'cancellata') return false;
        
        const pInizio = new Date(p.data_inizio);
        const pFine = new Date(p.data_fine);
        
        const spazioConflitto = p.spazi_ids?.includes(spazioId) || p.spazio_id === spazioId;
        const dateConflitto = isWithinInterval(dataInizio, { start: pInizio, end: pFine }) ||
                             isWithinInterval(dataFine, { start: pInizio, end: pFine }) ||
                             isWithinInterval(pInizio, { start: dataInizio, end: dataFine });
        
        return spazioConflitto && dateConflitto;
      });

      if (conflittiSpazio.length > 0) {
        nuoviConflitti[spazioId] = conflittiSpazio;
      }
    });

    setConflittiDisponibilita(nuoviConflitti);
  };

  const handleAddSpazio = (spazioId) => {
    if (!spazioId || formData.spazi_ids.includes(spazioId)) return;
    setFormData({ ...formData, spazi_ids: [...formData.spazi_ids, spazioId] });
  };

  const handleRemoveSpazio = (spazioId) => {
    setFormData({ ...formData, spazi_ids: formData.spazi_ids.filter(id => id !== spazioId) });
  };

  const spaziDisponibili = spazi.filter(s => !formData.spazi_ids.includes(s.id));

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.spazi_ids.length === 0) {
      toast.error('Seleziona almeno uno spazio');
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
    if (!formData.materiale_dimostrativo) {
      toast.error('Inserisci il materiale dimostrativo');
      return;
    }

    const dataToSave = {
      ...formData,
      spazio_id: formData.spazi_ids[0], // manteniamo compatibilità col campo principale
      prezzo_totale: parseFloat(formData.prezzo_totale),
      prezzo_mensile: formData.prezzo_mensile ? parseFloat(formData.prezzo_mensile) : null
    };

    onSave(dataToSave);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {Object.keys(conflittiDisponibilita).length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 ml-2">
            <div className="font-medium mb-2">Postazioni non disponibili nei giorni selezionati:</div>
            {Object.entries(conflittiDisponibilita).map(([spazioId, conflitti]) => {
              const spazio = spazi.find(s => s.id === spazioId);
              const dateRange = conflitti[0] 
                ? `${new Date(conflitti[0].data_inizio).toLocaleDateString('it-IT')} - ${new Date(conflitti[0].data_fine).toLocaleDateString('it-IT')}`
                : '';
              return (
                <div key={spazioId} className="text-sm">
                  Spazio {spazio?.numero_spazio}: occupato dal {dateRange}
                </div>
              );
            })}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-4">

        {/* Spazi multipli */}
        <div className="col-span-2">
          <Label>Spazi * <span className="text-slate-400 font-normal text-xs">(puoi selezionare più spazi)</span></Label>
          
          {/* Spazi già selezionati */}
          {formData.spazi_ids.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 mt-1">
              {formData.spazi_ids.map(id => {
                const spazio = spazi.find(s => s.id === id);
                return spazio ? (
                  <Badge key={id} variant="secondary" className="flex items-center gap-1 px-2 py-1">
                    <span>N.{spazio.numero_spazio}{spazio.superficie_mq ? ` (${spazio.superficie_mq} mq)` : ''}</span>
                    <button type="button" onClick={() => handleRemoveSpazio(id)} className="ml-1 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ) : null;
              })}
            </div>
          )}

          {/* Dropdown per aggiungere spazio */}
          {spaziDisponibili.length > 0 && (
            <Select onValueChange={handleAddSpazio} value="">
              <SelectTrigger>
                <SelectValue placeholder={formData.spazi_ids.length === 0 ? "Seleziona uno spazio" : "Aggiungi un altro spazio..."} />
              </SelectTrigger>
              <SelectContent>
                {spaziDisponibili.map((spazio) => (
                  <SelectItem key={spazio.id} value={spazio.id}>
                    Spazio {spazio.numero_spazio} {spazio.nome ? `- ${spazio.nome}` : ''}{spazio.superficie_mq ? ` (${spazio.superficie_mq} mq)` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="col-span-2">
          <Label htmlFor="cliente_id">Cliente *</Label>
          <Select value={formData.cliente_id} onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}>
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
          />
        </div>

        <div>
          <Label htmlFor="data_fine">Data Fine *</Label>
          <Input
            id="data_fine"
            type="date"
            value={formData.data_fine}
            onChange={(e) => setFormData({ ...formData, data_fine: e.target.value })}
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
          <Label htmlFor="materiale_dimostrativo">Materiale Dimostrativo *</Label>
          <Textarea
            id="materiale_dimostrativo"
            value={formData.materiale_dimostrativo}
            onChange={(e) => setFormData({ ...formData, materiale_dimostrativo: e.target.value })}
            placeholder="Descrizione del materiale dimostrativo/pubblicitario da esporre"
            rows={2}
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