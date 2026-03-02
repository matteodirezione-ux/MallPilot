import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import CalendarioMensile from '../components/calendario/CalendarioMensile';
import CalendarioSettimanale from '../components/calendario/CalendarioSettimanale';
import ListaPrenotazioni from '../components/calendario/ListaPrenotazioni';
import FormPrenotazione from '../components/calendario/FormPrenotazione';
import { Plus, Calendar as CalendarIcon, CalendarDays, List, LayoutGrid, ExternalLink } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import DisponibilitaSpazi from '../components/calendario/DisponibilitaSpazi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function Calendario({ centroSelezionato, user }) {
  const [prenotazioni, setPrenotazioni] = useState([]);
  const [spazi, setSpazi] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrenotazione, setEditingPrenotazione] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [nascondiPermanenti, setNascondiPermanenti] = useState(false);
  const [soloEventi, setSoloEventi] = useState(false);
  const isVigilanza = user?.tipo_account === 'vigilanza';

  // Considera "permanente" una prenotazione con durata >= 300 giorni
  const prenotazioniFiltrate = prenotazioni.filter(p => {
    if (nascondiPermanenti) {
      const giorni = differenceInDays(new Date(p.data_fine), new Date(p.data_inizio));
      if (giorni >= 300) return false;
    }
    if (soloEventi && !p.is_event) return false;
    return true;
  });

  useEffect(() => {
    if (centroSelezionato && centroSelezionato.id) {
      loadData();
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
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
         <div>
           <h1 className="text-3xl font-bold text-slate-800 mb-2">Calendario Expo</h1>
           <p className="text-slate-600">{centroSelezionato?.nome}</p>
         </div>
         {!isVigilanza && (
           <Dialog open={dialogOpen} onOpenChange={(open) => {
             setDialogOpen(open);
             if (!open) setEditingPrenotazione(null);
           }}>
             <DialogTrigger asChild>
               <Button className="bg-blue-600 hover:bg-blue-700">
                 <Plus className="w-4 h-4 mr-2" />
                 Nuova Prenotazione
               </Button>
             </DialogTrigger>
             <DialogContent className="max-w-2xl">
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
               />
             </DialogContent>
           </Dialog>
         )}
       </div>

      <Tabs defaultValue="mensile" className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="mensile" className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Mensile
            </TabsTrigger>
            <TabsTrigger value="settimanale" className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Settimanale
            </TabsTrigger>
            <TabsTrigger value="lista" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="disponibilita" className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Disponibilità
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="nascondi-permanenti"
                checked={nascondiPermanenti}
                onCheckedChange={setNascondiPermanenti}
              />
              <Label htmlFor="nascondi-permanenti" className="text-sm text-slate-600 cursor-pointer">
                Nascondi prenotazioni permanenti (≥ 300 giorni)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="solo-eventi"
                checked={soloEventi}
                onCheckedChange={setSoloEventi}
              />
              <Label htmlFor="solo-eventi" className="text-sm text-slate-600 cursor-pointer">
                Mostra solo eventi
              </Label>
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
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="settimanale">
          <CalendarioSettimanale
            prenotazioni={prenotazioniFiltrate}
            spazi={spazi}
            clienti={clienti}
            currentWeek={currentWeek}
            setCurrentWeek={setCurrentWeek}
            onEdit={handleEdit}
          />
        </TabsContent>

        <TabsContent value="lista">
          <ListaPrenotazioni
            prenotazioni={prenotazioniFiltrate}
            spazi={spazi}
            clienti={clienti}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="disponibilita">
          <DisponibilitaSpazi
            prenotazioni={prenotazioniFiltrate}
            spazi={spazi}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}