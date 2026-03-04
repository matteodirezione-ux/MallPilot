import React, { useState, useEffect } from 'react';

import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Wrench, Calendar, ListTodo, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import CalendarioManutenzioniMensile from '../components/calendario/CalendarioManutenzioniMensile';
import ListaManutenzioni from '../components/calendario/ListaManutenzioni';

export default function CalendarioManutenzioni({ centroSelezionato, user }) {
  const [manutenzioni, setManutenzioni] = useState([]);
  const [centri, setCentri] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manutenzioneSelezionata, setManutenzioneSelezionata] = useState(null);
  const [formData, setFormData] = useState({
    titolo: '',
    descrizione: '',
    data_scadenza: format(new Date(), 'yyyy-MM-dd'),
    centro_id: '',
    stato: 'da_fare',
    ricorrente: false,
    ricorrenza_tipo: 'settimanale',
    ricorrenza_ogni: 1,
    ricorrenza_unita: 'settimane',
    ricorrenza_fine: ''
  });

  useEffect(() => {
    if (user?.tipo_account && user?.email && centroSelezionato?.id) {
      loadData();
    }
  }, [user?.tipo_account, user?.email, centroSelezionato?.id]);

  // Sottoscrizione real-time
  useEffect(() => {
    if (!user?.tipo_account) return;
    const unsubscribe = base44.entities.Manutenzione.subscribe((event) => {
      if (event.type === 'create') {
        setManutenzioni(prev => {
          if (prev.find(m => m.id === event.id)) return prev;
          return [...prev, event.data].sort((a, b) => new Date(a.data_scadenza) - new Date(b.data_scadenza));
        });
      } else if (event.type === 'update') {
        setManutenzioni(prev => prev.map(m => m.id === event.id ? { ...m, ...event.data } : m));
      } else if (event.type === 'delete') {
        setManutenzioni(prev => prev.filter(m => m.id !== event.id));
      }
    });
    return () => unsubscribe();
  }, [user?.tipo_account]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allCentri = await base44.entities.CentroCommerciale.list();
      setCentri(allCentri);

      let allManutenzioni = await base44.entities.Manutenzione.list();

      if (centroSelezionato?.id && centroSelezionato.id !== 'tutti') {
        allManutenzioni = allManutenzioni.filter(m => m.centro_id === centroSelezionato.id || !m.centro_id);
      }

      setManutenzioni(allManutenzioni.sort((a, b) => new Date(a.data_scadenza) - new Date(b.data_scadenza)));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleNewManutenzione = (giorno) => {
    setManutenzioneSelezionata(null);
    setFormData({
      titolo: '',
      descrizione: '',
      data_scadenza: format(giorno, 'yyyy-MM-dd'),
      centro_id: centroSelezionato?.id !== 'tutti' ? centroSelezionato?.id : '',
      stato: 'da_fare',
      ricorrente: false,
      ricorrenza_tipo: 'settimanale',
      ricorrenza_ogni: 1,
      ricorrenza_unita: 'settimane',
      ricorrenza_fine: ''
    });
    setDialogOpen(true);
  };

  const handleManutenzioneClick = (manutenzione) => {
    setManutenzioneSelezionata(manutenzione);
    setFormData({
      titolo: manutenzione.titolo,
      descrizione: manutenzione.descrizione,
      data_scadenza: manutenzione.data_scadenza,
      centro_id: manutenzione.centro_id,
      stato: manutenzione.stato,
      ricorrente: manutenzione.ricorrente || false,
      ricorrenza_tipo: manutenzione.ricorrenza_tipo || 'settimanale',
      ricorrenza_ogni: manutenzione.ricorrenza_ogni || 1,
      ricorrenza_unita: manutenzione.ricorrenza_unita || 'settimane',
      ricorrenza_fine: manutenzione.ricorrenza_fine || ''
    });
    setDialogOpen(true);
  };

  const handleToggleStatus = async (manutenzione) => {
    const nuovoStato = manutenzione.stato === 'completato' ? 'da_fare' : 'completato';
    setManutenzioni(prev => prev.map(m => m.id === manutenzione.id ? { ...m, stato: nuovoStato } : m));
    await base44.entities.Manutenzione.update(manutenzione.id, { stato: nuovoStato });
  };

  const generateRecurrence = (startDateStr, config) => {
    // Parse date string as local date to avoid timezone issues
    const [y, m, d] = startDateStr.split('-').map(Number);
    let currentDate = new Date(y, m - 1, d);
    
    const endDateStr = config.ricorrenza_fine;
    const [ey, em, ed] = endDateStr.split('-').map(Number);
    const endDate = new Date(ey, em - 1, ed);

    const dates = [];
    const n = config.ricorrenza_ogni || 1;

    // Avanza alla prima occorrenza successiva alla data iniziale
    const advance = (date) => {
      if (config.ricorrenza_tipo === 'giornaliero') return addDays(date, n);
      if (config.ricorrenza_tipo === 'settimanale') return addWeeks(date, n);
      if (config.ricorrenza_tipo === 'mensile') return addMonths(date, n);
      if (config.ricorrenza_tipo === 'annuale') return addMonths(date, 12 * n);
      if (config.ricorrenza_tipo === 'personalizzato') {
        if (config.ricorrenza_unita === 'giorni') return addDays(date, n);
        if (config.ricorrenza_unita === 'settimane') return addWeeks(date, n);
        if (config.ricorrenza_unita === 'mesi') return addMonths(date, n);
      }
      return addWeeks(date, n);
    };

    currentDate = advance(currentDate);
    while (currentDate <= endDate) {
      dates.push(format(currentDate, 'yyyy-MM-dd'));
      currentDate = advance(currentDate);
    }

    return dates;
  };

  const handleSave = async () => {
    if (!formData.titolo.trim()) {
      alert('Titolo obbligatorio');
      return;
    }

    if (formData.ricorrente && !formData.ricorrenza_fine) {
      alert('Specificare una data di fine per la ricorrenza');
      return;
    }

    try {
      if (manutenzioneSelezionata?.id) {
        // Se è una manutenzione padre, aggiorna anche tutte le figlie
        if (manutenzioneSelezionata.ricorrente) {
          await base44.entities.Manutenzione.update(manutenzioneSelezionata.id, formData);
          const allManutenzioni = await base44.entities.Manutenzione.list();
          const manutenzioniCollegate = allManutenzioni.filter(m => m.manutenzione_padre_id === manutenzioneSelezionata.id);

          // Aggiorna le manutenzioni collegate con i nuovi dati (escludendo campi specifici)
          for (const m of manutenzioniCollegate) {
            await base44.entities.Manutenzione.update(m.id, {
              titolo: formData.titolo,
              descrizione: formData.descrizione,
              stato: formData.stato
            });
          }
        } else {
          await base44.entities.Manutenzione.update(manutenzioneSelezionata.id, formData);
        }
      } else {
        const manutenzioneData = {
          ...formData,
          assegnato_da_email: user.email,
          assegnato_da_nome: user.full_name
        };

        if (formData.ricorrente) {
          const mainManutenzione = await base44.entities.Manutenzione.create(manutenzioneData);

          const futureDates = generateRecurrence(formData.data_scadenza, formData);
          if (futureDates.length > 0) {
            const manutenzioniRicorrenti = futureDates.map(dateStr => ({
              ...manutenzioneData,
              data_scadenza: dateStr,
              manutenzione_padre_id: mainManutenzione.id,
              ricorrente: false
            }));
            await base44.entities.Manutenzione.bulkCreate(manutenzioniRicorrenti);
          }
        } else {
          await base44.entities.Manutenzione.create(manutenzioneData);
        }
      }
      setDialogOpen(false);
      setManutenzioneSelezionata(null);
    } catch (err) {
      console.error(err);
      alert('Errore nel salvataggio');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Eliminare questa manutenzione?')) {
      // Se è una manutenzione padre ricorrente, elimina anche tutte le figlie
      if (manutenzioneSelezionata.ricorrente) {
        const allManutenzioni = await base44.entities.Manutenzione.list();
        const manutenzioniCollegate = allManutenzioni.filter(m => m.manutenzione_padre_id === manutenzioneSelezionata.id);

        for (const m of manutenzioniCollegate) {
          await base44.entities.Manutenzione.delete(m.id);
        }
      }

      await base44.entities.Manutenzione.delete(manutenzioneSelezionata.id);
      setManutenzioni(prev => prev.filter(m => m.id !== manutenzioneSelezionata.id && m.manutenzione_padre_id !== manutenzioneSelezionata.id));
      setDialogOpen(false);
      setManutenzioneSelezionata(null);
    }
  };

  const annoCorrente = new Date().getFullYear();
  const [annoSelezionato, setAnnoSelezionato] = useState(annoCorrente);

  const anniDisponibili = [...new Set(manutenzioni.map(m => m.data_scadenza ? parseInt(m.data_scadenza.substring(0, 4)) : null).filter(Boolean))].sort();
  const idx = anniDisponibili.indexOf(annoSelezionato);

  if (!user) return null;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-blue-600" />
            Calendario Manutenzioni
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {centroSelezionato?.nome && centroSelezionato.id !== 'tutti' ? centroSelezionato.nome : 'Tutti i centri'}
          </p>
        </div>
        <Button onClick={() => { setManutenzioneSelezionata(null); setFormData({ titolo: '', descrizione: '', data_scadenza: format(new Date(), 'yyyy-MM-dd'), centro_id: centroSelezionato?.id !== 'tutti' ? centroSelezionato?.id : '', stato: 'da_fare' }); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nuova Manutenzione
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Caricamento...</div>
      ) : (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Cerca per titolo o descrizione..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>
        <Tabs defaultValue="calendario">
          <TabsList className="mb-4">
            <TabsTrigger value="calendario" className="gap-2">
              <Calendar className="w-4 h-4" /> Calendario
            </TabsTrigger>
            <TabsTrigger value="lista" className="gap-2">
              <ListTodo className="w-4 h-4" /> Lista
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendario">
            <CalendarioManutenzioniMensile
              tasks={manutenzioni.filter(m => {
                if (!searchText.trim()) return true;
                const search = searchText.toLowerCase();
                return m.titolo?.toLowerCase().includes(search) || m.descrizione?.toLowerCase().includes(search);
              })}
              onTaskClick={handleManutenzioneClick}
              onToggleStatus={handleToggleStatus}
              onNewTask={handleNewManutenzione}
            />
          </TabsContent>

          <TabsContent value="lista">
            <ListaManutenzioni
              manutenzioni={manutenzioni.filter(m => {
                if (!searchText.trim()) return true;
                const search = searchText.toLowerCase();
                return m.titolo?.toLowerCase().includes(search) || m.descrizione?.toLowerCase().includes(search);
              })}
              onEdit={handleManutenzioneClick}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
            />
          </TabsContent>
        </Tabs>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{manutenzioneSelezionata?.id ? 'Modifica Manutenzione' : 'Nuova Manutenzione'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Titolo *</label>
              <Input
                value={formData.titolo}
                onChange={(e) => setFormData({ ...formData, titolo: e.target.value })}
                placeholder="Titolo manutenzione"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Descrizione</label>
              <Textarea
                value={formData.descrizione}
                onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                placeholder="Descrizione dettagliata"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Data *</label>
                <Input
                  type="date"
                  value={formData.data_scadenza}
                  onChange={(e) => setFormData({ ...formData, data_scadenza: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Centro</label>
                <Select value={formData.centro_id} onValueChange={(value) => setFormData({ ...formData, centro_id: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleziona centro" />
                  </SelectTrigger>
                  <SelectContent>
                    {centri.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={formData.ricorrente}
                  onChange={(e) => setFormData({ ...formData, ricorrente: e.target.checked })}
                  className="rounded"
                  id="ricorrente"
                />
                <label htmlFor="ricorrente" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Manutenzione ricorrente
                </label>
              </div>

              {formData.ricorrente && (
                <div className="space-y-3 bg-slate-50 p-3 rounded-lg">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700">Ogni</label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.ricorrenza_ogni}
                        onChange={(e) => setFormData({ ...formData, ricorrenza_ogni: parseInt(e.target.value) || 1 })}
                        className="mt-1 h-8"
                      />
                    </div>

                    {formData.ricorrenza_tipo === 'personalizzato' ? (
                      <div>
                        <label className="text-xs font-medium text-slate-700">Unità</label>
                        <Select value={formData.ricorrenza_unita} onValueChange={(value) => setFormData({ ...formData, ricorrenza_unita: value })}>
                          <SelectTrigger className="mt-1 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="giorni">Giorni</SelectItem>
                            <SelectItem value="settimane">Settimane</SelectItem>
                            <SelectItem value="mesi">Mesi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div>
                        <label className="text-xs font-medium text-slate-700">Tipo</label>
                        <Select value={formData.ricorrenza_tipo} onValueChange={(value) => setFormData({ ...formData, ricorrenza_tipo: value })}>
                          <SelectTrigger className="mt-1 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="giornaliero">Giornaliero</SelectItem>
                            <SelectItem value="settimanale">Settimanale</SelectItem>
                            <SelectItem value="mensile">Mensile</SelectItem>
                            <SelectItem value="annuale">Annuale</SelectItem>
                            <SelectItem value="personalizzato">Personalizzato</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-medium text-slate-700">Fino al</label>
                      <Input
                        type="date"
                        value={formData.ricorrenza_fine}
                        onChange={(e) => setFormData({ ...formData, ricorrenza_fine: e.target.value })}
                        className="mt-1 h-8"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              {manutenzioneSelezionata?.id && (
                <Button variant="destructive" onClick={handleDelete}>
                  Elimina
                </Button>
              )}
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                Salva
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}