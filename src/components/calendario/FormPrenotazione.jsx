import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, AlertTriangle, Zap, Sparkles, Building2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { isWithinInterval } from 'date-fns';

export default function FormPrenotazione({ prenotazione, spazi, clienti, onSave, onCancel, isVigilanza, centroSelezionato }) {
  // Determina la tab iniziale in base alla prenotazione in modifica
  const [activeTab, setActiveTab] = useState(prenotazione?.is_event ? 'evento' : 'affitto');
  const [showNewClienteDialog, setShowNewClienteDialog] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [nuoClienteData, setNuoClienteData] = useState({
    ragione_sociale: '',
    partita_iva: '',
    codice_fiscale: '',
    email: '',
    pec: '',
    telefono: '',
    indirizzo: '',
    citta: '',
    provincia: '',
    cap: '',
    referente_nome: '',
    referente_telefono: '',
    referente_email: '',
    note: ''
  });

  const [formData, setFormData] = useState({
    spazi_ids: [],
    cliente_id: '',
    nome_evento: '',
    data_inizio: '',
    data_fine: '',
    prezzo_totale: '',
    prezzo_mensile: '',
    materiale_dimostrativo: '',
    necessita_elettricita: false,
    is_event: false,
    stato: 'confermata',
    note: ''
  });
  const [conflittiDisponibilita, setConflittiDisponibilita] = useState({});
  const [allPrenotazioni, setAllPrenotazioni] = useState([]);

  useEffect(() => {
    loadPrenotazioni();
    if (prenotazione) {
      let spaziIds = prenotazione.spazi_ids || [];
      if (spaziIds.length === 0 && prenotazione.spazio_id) {
        spaziIds = [prenotazione.spazio_id];
      }
      setFormData({
        spazi_ids: spaziIds,
        cliente_id: prenotazione.cliente_id || '',
        nome_evento: prenotazione.nome_evento || '',
        data_inizio: prenotazione.data_inizio,
        data_fine: prenotazione.data_fine,
        prezzo_totale: prenotazione.prezzo_totale,
        prezzo_mensile: prenotazione.prezzo_mensile || '',
        materiale_dimostrativo: prenotazione.materiale_dimostrativo || '',
        necessita_elettricita: prenotazione.necessita_elettricita || false,
        is_event: prenotazione.is_event || false,
        stato: prenotazione.stato,
        note: prenotazione.note || ''
      });
      setActiveTab(prenotazione.is_event ? 'evento' : 'affitto');
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
        if (prenotazione && p.id === prenotazione.id) return false;
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

  const handleCreateNewCliente = async () => {
    try {
      const newCliente = await base44.entities.Cliente.create({
        centro_id: centroSelezionato?.id || '',
        ...nuoClienteData
      });
      setFormData({ ...formData, cliente_id: newCliente.id });
      setShowNewClienteDialog(false);
      setWizardStep(0);
      setNuoClienteData({
        ragione_sociale: '',
        partita_iva: '',
        codice_fiscale: '',
        email: '',
        pec: '',
        telefono: '',
        indirizzo: '',
        citta: '',
        provincia: '',
        cap: '',
        referente_nome: '',
        referente_telefono: '',
        referente_email: '',
        note: ''
      });
      toast.success('Cliente creato con successo');
    } catch (error) {
      toast.error('Errore nella creazione del cliente');
    }
  };

  const resetNewClienteForm = () => {
    setNuoClienteData({
      ragione_sociale: '',
      partita_iva: '',
      codice_fiscale: '',
      email: '',
      pec: '',
      telefono: '',
      indirizzo: '',
      citta: '',
      provincia: '',
      cap: '',
      referente_nome: '',
      referente_telefono: '',
      referente_email: '',
      note: ''
    });
    setWizardStep(0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const isEvent = activeTab === 'evento';

    if (formData.spazi_ids.length === 0) {
      toast.error('Seleziona almeno uno spazio');
      return;
    }
    if (!isEvent && !formData.cliente_id) {
      toast.error('Seleziona un cliente');
      return;
    }
    if (isEvent && !formData.nome_evento) {
      toast.error('Inserisci il nome dell\'evento');
      return;
    }
    if (!formData.data_inizio || !formData.data_fine) {
      toast.error('Inserisci le date di inizio e fine');
      return;
    }
    if (!isEvent && (formData.prezzo_totale === '' || isNaN(parseFloat(formData.prezzo_totale)))) {
      toast.error('Inserisci un prezzo totale valido');
      return;
    }
    if (!isEvent && !formData.materiale_dimostrativo) {
      toast.error('Inserisci il materiale dimostrativo');
      return;
    }

    const dataToSave = {
      ...formData,
      is_event: isEvent,
      spazio_id: formData.spazi_ids[0],
      prezzo_totale: formData.prezzo_totale ? parseFloat(formData.prezzo_totale) : 0,
      prezzo_mensile: formData.prezzo_mensile ? parseFloat(formData.prezzo_mensile) : null
    };

    onSave(dataToSave);
  };

  const rowClass = "flex items-start gap-2";
  const labelClass = "w-28 flex-shrink-0 text-sm font-medium text-slate-700 pt-2";
  const fieldClass = "flex-1 min-w-0";

  // Spazio selector condiviso
  const SpazioSelector = () => (
    <div className={rowClass}>
      <span className={labelClass}>Spazi *<span className="block text-xs text-slate-400 font-normal">(più spazi)</span></span>
      <div className={fieldClass}>
        {formData.spazi_ids.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {formData.spazi_ids.map(id => {
              const spazio = spazi.find(s => s.id === id);
              return spazio ? (
                <Badge key={id} variant="secondary" className="flex items-center gap-1 px-2 py-0.5 text-xs">
                  <span>N.{spazio.numero_spazio}{spazio.superficie_mq ? ` (${spazio.superficie_mq} mq)` : ''}</span>
                  <button type="button" onClick={() => handleRemoveSpazio(id)} className="ml-1 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ) : null;
            })}
          </div>
        )}
        {spaziDisponibili.length > 0 && (
          <Select onValueChange={handleAddSpazio} value="">
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={formData.spazi_ids.length === 0 ? "Seleziona spazio" : "Aggiungi spazio..."} />
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
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Tab switcher */}
      <div className="flex rounded-lg overflow-hidden border border-slate-200 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('affitto')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'affitto'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Affitto
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('evento')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'evento'
              ? 'bg-purple-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Evento
        </button>
      </div>

      {Object.keys(conflittiDisponibilita).length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 ml-2">
            <div className="font-medium mb-1">Postazioni non disponibili:</div>
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

      {activeTab === 'affitto' && (
        <>
          <SpazioSelector />

          {/* Cliente */}
          <div className={rowClass}>
            <label className={labelClass}>Cliente *</label>
            <div className={`${fieldClass} flex gap-2`}>
              <Select value={formData.cliente_id} onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}>
                <SelectTrigger className="h-8 text-sm flex-1">
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
              <Button 
                type="button" 
                size="sm" 
                variant="outline"
                className="h-8 px-2 flex items-center gap-1"
                onClick={() => setShowNewClienteDialog(true)}
                title="Crea nuovo cliente"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Nuovo</span>
              </Button>
            </div>
          </div>

          {/* Periodo */}
          <div className={rowClass}>
            <label className={labelClass}>Inizio *</label>
            <div className={fieldClass}>
              <Input type="date" value={formData.data_inizio} onChange={(e) => setFormData({ ...formData, data_inizio: e.target.value })} className="h-8 text-sm" />
            </div>
          </div>
          <div className={rowClass}>
            <label className={labelClass}>Fine *</label>
            <div className={fieldClass}>
              <Input type="date" value={formData.data_fine} onChange={(e) => setFormData({ ...formData, data_fine: e.target.value })} className="h-8 text-sm" />
            </div>
          </div>

          {/* Prezzi */}
          {!isVigilanza && (
            <>
              <div className={rowClass}>
                <label className={labelClass}>Prezzo totale *</label>
                <div className={fieldClass}>
                  <Input type="number" step="0.01" value={formData.prezzo_totale} onChange={(e) => setFormData({ ...formData, prezzo_totale: e.target.value })} placeholder="€" className="h-8 text-sm" />
                </div>
              </div>
              <div className={rowClass}>
                <label className={labelClass}>Prezzo mensile</label>
                <div className={fieldClass}>
                  <Input type="number" step="0.01" value={formData.prezzo_mensile} onChange={(e) => setFormData({ ...formData, prezzo_mensile: e.target.value })} placeholder="€" className="h-8 text-sm" />
                </div>
              </div>
            </>
          )}

          {/* Materiale */}
          {!isVigilanza && (
            <div className={rowClass}>
              <label className={labelClass}>Materiale *</label>
              <div className={fieldClass}>
                <Textarea value={formData.materiale_dimostrativo} onChange={(e) => setFormData({ ...formData, materiale_dimostrativo: e.target.value })} placeholder="Materiale dimostrativo/pubblicitario" rows={2} className="text-sm" />
              </div>
            </div>
          )}

          {/* Elettricità */}
          <div className={rowClass}>
            <span className={labelClass}>Elettricità</span>
            <div className={`${fieldClass} flex items-center pt-1.5`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.necessita_elettricita} onChange={(e) => setFormData({ ...formData, necessita_elettricita: e.target.checked })} className="w-4 h-4 accent-yellow-500" />
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-slate-700">Necessita di elettricità</span>
              </label>
            </div>
          </div>

          {/* Note */}
          <div className={rowClass}>
            <label className={labelClass}>Note</label>
            <div className={fieldClass}>
              <Textarea value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} rows={2} className="text-sm" />
            </div>
          </div>
        </>
      )}

      {activeTab === 'evento' && (
        <>
          <SpazioSelector />

          {/* Nome Evento */}
          <div className={rowClass}>
            <label className={labelClass}>Nome Evento *</label>
            <div className={fieldClass}>
              <Input value={formData.nome_evento} onChange={(e) => setFormData({ ...formData, nome_evento: e.target.value })} placeholder="Nome dell'evento" className="h-8 text-sm" />
            </div>
          </div>

          {/* Periodo evento */}
          <div className={rowClass}>
            <label className={labelClass}>Inizio *</label>
            <div className={fieldClass}>
              <Input type="date" value={formData.data_inizio} onChange={(e) => setFormData({ ...formData, data_inizio: e.target.value, data_fine: formData.data_fine || e.target.value })} className="h-8 text-sm" />
            </div>
          </div>
          <div className={rowClass}>
            <label className={labelClass}>Fine *</label>
            <div className={fieldClass}>
              <Input type="date" value={formData.data_fine} onChange={(e) => setFormData({ ...formData, data_fine: e.target.value })} className="h-8 text-sm" />
            </div>
          </div>

          {/* Costo Evento */}
          {!isVigilanza && (
            <div className={rowClass}>
              <label className={labelClass}>Costo Evento</label>
              <div className={fieldClass}>
                <Input type="number" step="0.01" value={formData.prezzo_totale} onChange={(e) => setFormData({ ...formData, prezzo_totale: e.target.value })} placeholder="Costo (€)" className="h-8 text-sm" />
              </div>
            </div>
          )}

          {/* Elettricità */}
          <div className={rowClass}>
            <span className={labelClass}>Elettricità</span>
            <div className={`${fieldClass} flex items-center pt-1.5`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.necessita_elettricita} onChange={(e) => setFormData({ ...formData, necessita_elettricita: e.target.checked })} className="w-4 h-4 accent-yellow-500" />
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-slate-700">Necessita di elettricità</span>
              </label>
            </div>
          </div>

          {/* Note */}
          <div className={rowClass}>
            <label className={labelClass}>Note</label>
            <div className={fieldClass}>
              <Textarea value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} rows={2} className="text-sm" />
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Annulla
        </Button>
        <Button type="submit" size="sm" className={activeTab === 'evento' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}>
          {prenotazione ? 'Aggiorna' : 'Crea'}
        </Button>
      </div>

      {/* Dialog Nuovo Cliente - Same as Clienti page */}
      <Dialog open={showNewClienteDialog} onOpenChange={(open) => {
        setShowNewClienteDialog(open);
        if (!open) resetNewClienteForm();
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuovo Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            if (wizardStep === 2) {
              handleCreateNewCliente();
            } else {
              setWizardStep(wizardStep + 1);
            }
          }}>
            {/* Progress Indicator */}
            <div className="mb-6 flex gap-2">
              {['Dati Azienda', 'Indirizzo', 'Referente'].map((label, idx) => (
                <div key={idx} className="flex-1">
                  <div className={`h-1 rounded-full transition-colors ${idx <= wizardStep ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                  <p className={`text-xs mt-1 font-medium ${idx <= wizardStep ? 'text-blue-600' : 'text-slate-500'}`}>{label}</p>
                </div>
              ))}
            </div>

            {/* Step 0: Dati Azienda */}
            {wizardStep === 0 && (
              <div className="space-y-3">
                {[
                  { label: 'Ragione Sociale *', key: 'ragione_sociale', required: true },
                  { label: 'Partita IVA *', key: 'partita_iva', required: true },
                  { label: 'Codice Fiscale', key: 'codice_fiscale' },
                  { label: 'Email *', key: 'email', type: 'email', required: true },
                  { label: 'PEC', key: 'pec' },
                  { label: 'Telefono', key: 'telefono' },
                ].map(({ label, key, type = 'text', required }) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className="w-36 flex-shrink-0 text-sm font-medium text-slate-700">{label}</label>
                    <div className="flex-1 min-w-0">
                      <Input
                        type={type}
                        value={nuoClienteData[key] || ''}
                        onChange={(e) => setNuoClienteData({ ...nuoClienteData, [key]: e.target.value })}
                        required={required}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 1: Indirizzo */}
            {wizardStep === 1 && (
              <div className="space-y-3">
                {[
                  { label: 'Indirizzo *', key: 'indirizzo', required: true },
                  { label: 'Città *', key: 'citta', required: true },
                  { label: 'Provincia *', key: 'provincia', required: true },
                  { label: 'CAP *', key: 'cap', required: true },
                ].map(({ label, key, required }) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className="w-36 flex-shrink-0 text-sm font-medium text-slate-700">{label}</label>
                    <div className="flex-1 min-w-0">
                      <Input
                        value={nuoClienteData[key] || ''}
                        onChange={(e) => setNuoClienteData({ ...nuoClienteData, [key]: e.target.value })}
                        required={required}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 2: Referente */}
            {wizardStep === 2 && (
              <div className="space-y-3">
                {[
                  { label: 'Nome Referente *', key: 'referente_nome', required: true },
                  { label: 'Telefono', key: 'referente_telefono' },
                  { label: 'Email Referente *', key: 'referente_email', type: 'email', required: true },
                ].map(({ label, key, type = 'text', required }) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className="w-36 flex-shrink-0 text-sm font-medium text-slate-700">{label}</label>
                    <div className="flex-1 min-w-0">
                      <Input
                        type={type}
                        value={nuoClienteData[key] || ''}
                        onChange={(e) => setNuoClienteData({ ...nuoClienteData, [key]: e.target.value })}
                        required={required}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-3 pt-1">
                  <label className="w-36 flex-shrink-0 text-sm font-medium text-slate-700 pt-2">Note</label>
                  <div className="flex-1 min-w-0">
                    <Textarea
                      value={nuoClienteData.note || ''}
                      onChange={(e) => setNuoClienteData({ ...nuoClienteData, note: e.target.value })}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between gap-3 pt-4 mt-4 border-t">
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => { setShowNewClienteDialog(false); resetNewClienteForm(); }}>
                  Annulla
                </Button>
                {wizardStep > 0 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setWizardStep(wizardStep - 1)}>
                    Indietro
                  </Button>
                )}
              </div>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700">
                {wizardStep === 2 ? 'Crea' : 'Avanti'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </form>
  );
}