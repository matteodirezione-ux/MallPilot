import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import CalendarioMensile from '../components/calendario/CalendarioMensile';
import CalendarioSettimanale from '../components/calendario/CalendarioSettimanale';
import CalendarioGiornaliero from '../components/calendario/CalendarioGiornaliero';
import ListaPrenotazioni from '../components/calendario/ListaPrenotazioni';
import FormPrenotazione from '../components/calendario/FormPrenotazione';
import { Plus, Calendar as CalendarIcon, CalendarDays, List, LayoutGrid, ExternalLink, Search, Map, Upload, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import DisponibilitaSpazi from '../components/calendario/DisponibilitaSpazi';
import OccupazioneSpazi from '../components/calendario/OccupazioneSpazi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function Calendario({ centroSelezionato, user }) {
  const [prenotazioni, setPrenotazioni] = useState([]);
  const [spazi, setSpazi] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrenotazione, setEditingPrenotazione] = useState(null);
  const [mappaOpen, setMappaOpen] = useState(false);
  const [uploadingMappa, setUploadingMappa] = useState(false);
  const [mappaUrl, setMappaUrl] = useState(null);
  const isDirettore = user?.tipo_account === 'direttore';
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [nascondiPermanenti, setNascondiPermanenti] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [tabDefault] = useState(isMobile ? 'giornaliero' : 'settimanale');
  const [soloEventi, setSoloEventi] = useState(false);
  const [mostraDisponibili, setMostraDisponibili] = useState(false);
  const [searchText, setSearchText] = useState('');
  const isVigilanza = user?.tipo_account === 'vigilanza';

  // Spazi occupati oggi (per il filtro disponibilità)
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const spaziOccupatiOggi = new Set(
    prenotazioni
      .filter(p => p.stato !== 'cancellata' && new Date(p.data_inizio) <= oggi && new Date(p.data_fine) >= oggi)
      .flatMap(p => p.spazi_ids?.length ? p.spazi_ids : [p.spazio_id].filter(Boolean))
  );
  const spaziFiltrati = mostraDisponibili ? spazi.filter(s => !spaziOccupatiOggi.has(s.id)) : spazi;

  // Considera "permanente" una prenotazione con durata >= 300 giorni
  const prenotazioniFiltrate = prenotazioni.filter(p => {
    if (nascondiPermanenti) {
      const giorni = differenceInDays(new Date(p.data_fine), new Date(p.data_inizio));
      if (giorni >= 300) return false;
    }
    if (soloEventi && !p.is_event) return false;
    
    // Filtro ricerca
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      const cliente = clienti.find(c => c.id === p.cliente_id);
      const spazio = spazi.find(s => s.id === p.spazio_id);
      const matchCliente = cliente?.ragione_sociale?.toLowerCase().includes(search);
      const matchEvento = p.nome_evento?.toLowerCase().includes(search);
      const matchSpazio = spazio?.numero_spazio?.toLowerCase().includes(search);
      if (!matchCliente && !matchEvento && !matchSpazio) return false;
    }
    
    return true;
  });

  useEffect(() => {
    if (centroSelezionato && centroSelezionato.id) {
      loadData();
      setMappaUrl(centroSelezionato?.piantina_url || null);
    }
  }, [centroSelezionato]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (!centroSelezionato || !centroSelezionato.id || !centroSelezionato.nome) {
        setLoading(false);
        return;
      }
      const isTutti = centroSelezionato?.id === 'tutti';
      const [prenotazioniData, spaziData, clientiData] = await Promise.all([
        isTutti
          ? base44.entities.Prenotazione.list()
          : base44.entities.Prenotazione.filter({ centro_id: centroSelezionato.id }),
        isTutti
          ? base44.entities.SpazioExpo.filter({ attivo: true })
          : base44.entities.SpazioExpo.filter({ centro_id: centroSelezionato.id }),
        isTutti
          ? base44.entities.Cliente.list()
          : base44.entities.Cliente.filter({ centro_id: centroSelezionato.id })
      ]);
      setPrenotazioni(prenotazioniData || []);
      setSpazi(spaziData || []);
      setClienti(clientiData || []);
    } catch (error) {
      console.error('Errore caricamento dati:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrenotazione = async (data) => {
    try {
      const sovrapposizioni = prenotazioni.filter(p => {
        if (editingPrenotazione && p.id === editingPrenotazione.id) return false;
        if (p.spazio_id !== data.spazio_id) return false;
        if (p.stato === 'cancellata') return false;
        const dataInizio = new Date(data.data_inizio);
        const dataFine = new Date(data.data_fine);
        const pInizio = new Date(p.data_inizio);
        const pFine = new Date(p.data_fine);
        return (dataInizio <= pFine && dataFine >= pInizio);
      });

      if (sovrapposizioni.length > 0) {
        toast.error('Lo spazio è già prenotato in questo periodo');
        return;
      }

      let centro_id;
      if (centroSelezionato?.id === 'tutti') {
        const spazio = spazi.find(s => s.id === data.spazio_id);
        centro_id = spazio?.centro_id;
      } else {
        centro_id = centroSelezionato.id;
      }

      const prenotazioneData = { ...data, centro_id };

      if (editingPrenotazione) {
        await base44.entities.Prenotazione.update(editingPrenotazione.id, prenotazioneData);
        toast.success('Prenotazione aggiornata');
      } else {
        await base44.entities.Prenotazione.create(prenotazioneData);
        toast.success('Prenotazione creata');
      }

      setDialogOpen(false);
      setEditingPrenotazione(null);
      loadData();
    } catch (error) {
      console.error('Errore salvataggio prenotazione:', error);
      toast.error('Errore nel salvataggio della prenotazione');
    }
  };

  const handleEdit = (prenotazione) => {
    setEditingPrenotazione(prenotazione);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Sei sicuro di voler eliminare questa prenotazione?')) return;
    try {
      await base44.entities.Prenotazione.delete(id);
      toast.success('Prenotazione eliminata');
      loadData();
    } catch (error) {
      toast.error('Errore nell\'eliminazione della prenotazione');
    }
  };

  if (!centroSelezionato || !centroSelezionato.id) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <CalendarIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Nessun centro commerciale assegnato</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-96 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-8">
        <div>
          <h1 className="text-lg md:text-3xl font-bold text-slate-800 mb-0.5 md:mb-2">Calendario Expo</h1>
          <p className="text-xs md:text-base text-slate-600">Occupazione spazi in galleria per affitti o eventi</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Pulsante Mappa */}
          <Button
            onClick={() => setMappaOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white"
            size="sm"
          >
            <Map className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Mappa</span>
          </Button>

          {/* Pulsante Nuova Prenotazione */}
          {!isVigilanza && (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setEditingPrenotazione(null);
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">Nuova Prenotazione</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingPrenotazione ? 'Modifica Prenotazione' : 'Nuova Prenotazione'}
                  </DialogTitle>
                </DialogHeader>
                <FormPrenotazione
                   prenotazione={editingPrenotazione}
                   spazi={spazi}
                   clienti={clienti}
                   onSave={handleSavePrenotazione}
                   onCancel={() => {
                     setDialogOpen(false);
                     setEditingPrenotazione(null);
                   }}
                   isVigilanza={isVigilanza}
                   centroSelezionato={centroSelezionato}
                   onClienteCreated={(nuovoCliente) => {
                     setClienti([...clienti, nuovoCliente]);
                   }}
                 />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Dialog Mappa */}
      <Dialog open={mappaOpen} onOpenChange={setMappaOpen}>
        <DialogContent className="max-w-3xl md:max-w-5xl w-full">
          <DialogHeader>
            <DialogTitle>Mappa del Centro - {centroSelezionato?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {mappaUrl ? (
              <img
                src={mappaUrl}
                alt="Mappa del centro"
                className="w-full rounded-lg border border-slate-200 object-contain max-h-[60vh]"
              />
            ) : (
              <div className="flex items-center justify-center h-48 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-slate-400">
                Nessuna mappa caricata
              </div>
            )}
            {isDirettore && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {mappaUrl ? 'Sostituisci mappa' : 'Carica mappa'}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingMappa}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setUploadingMappa(true);
                    const { file_url } = await base44.integrations.Core.UploadFile({ file });
                    await base44.entities.CentroCommerciale.update(centroSelezionato.id, { piantina_url: file_url });
                    setMappaUrl(file_url);
                    setUploadingMappa(false);
                    toast.success('Mappa caricata');
                  }}
                  className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
                />
                {uploadingMappa && <p className="text-xs text-slate-500 mt-1">Caricamento in corso...</p>}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs defaultValue={tabDefault} className="w-full">
        <div className="mb-3 md:mb-4 flex flex-col gap-2 md:gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList className="h-8">
              <TabsTrigger value="mensile" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mensile</span>
              </TabsTrigger>
              <TabsTrigger value="settimanale" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Settimanale</span>
              </TabsTrigger>
              <TabsTrigger value="giornaliero" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Giornaliero</span>
              </TabsTrigger>
              {!isVigilanza && (
                <>
                  <TabsTrigger value="disponibilita" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Disponibilità</span>
                  </TabsTrigger>
                  <TabsTrigger value="occupazione" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Occupazione</span>
                  </TabsTrigger>
                </>
              )}
            </TabsList>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cerca..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                 id="mostra-disponibili"
                 checked={mostraDisponibili}
                 onCheckedChange={(val) => setMostraDisponibili(val === true)}
                />
                <Label htmlFor="mostra-disponibili" className="text-xs text-slate-600 cursor-pointer">
                  Mostra disponibili
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="nascondi-permanenti"
                  checked={nascondiPermanenti}
                  onCheckedChange={setNascondiPermanenti}
                />
                <Label htmlFor="nascondi-permanenti" className="text-xs text-slate-600 cursor-pointer">
                  Nascondi permanenti
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="solo-eventi"
                  checked={soloEventi}
                  onCheckedChange={setSoloEventi}
                />
                <Label htmlFor="solo-eventi" className="text-xs text-slate-600 cursor-pointer">
                  Solo eventi
                </Label>
              </div>
            </div>
          </div>
        </div>

        <TabsContent value="mensile">
          <CalendarioMensile
            prenotazioni={prenotazioniFiltrate}
            spazi={spazi}
            clienti={clienti}
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            onEdit={isVigilanza ? null : handleEdit}
            onDelete={isVigilanza ? null : handleDelete}
            isVigilanza={isVigilanza}
            mostraDisponibili={mostraDisponibili}
          />
        </TabsContent>

        <TabsContent value="settimanale">
          <CalendarioSettimanale
            prenotazioni={prenotazioniFiltrate}
            spazi={spazi}
            clienti={clienti}
            currentWeek={currentWeek}
            setCurrentWeek={setCurrentWeek}
            onEdit={isVigilanza ? null : handleEdit}
            onDelete={isVigilanza ? null : handleDelete}
            isVigilanza={isVigilanza}
            mostraDisponibili={mostraDisponibili}
          />
        </TabsContent>

        <TabsContent value="giornaliero">
          <CalendarioGiornaliero
            prenotazioni={prenotazioniFiltrate}
            spazi={spazi}
            clienti={clienti}
            onEdit={isVigilanza ? null : handleEdit}
            onDelete={isVigilanza ? null : handleDelete}
            isVigilanza={isVigilanza}
          />
        </TabsContent>

        {!isVigilanza && (
          <>
            <TabsContent value="disponibilita">
              <DisponibilitaSpazi
                prenotazioni={prenotazioniFiltrate}
                spazi={spazi}
              />
            </TabsContent>
            <TabsContent value="occupazione">
              <OccupazioneSpazi
                prenotazioni={prenotazioniFiltrate}
                spazi={spazi}
                clienti={clienti}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}