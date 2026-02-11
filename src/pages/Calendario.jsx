import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import CalendarioMensile from '../components/calendario/CalendarioMensile';
import ListaPrenotazioni from '../components/calendario/ListaPrenotazioni';
import FormPrenotazione from '../components/calendario/FormPrenotazione';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function Calendario({ centroSelezionato }) {
  const [prenotazioni, setPrenotazioni] = useState([]);
  const [spazi, setSpazi] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrenotazione, setEditingPrenotazione] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (centroSelezionato) {
      loadData();
    }
  }, [centroSelezionato]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prenotazioniData, spaziData, clientiData] = await Promise.all([
        base44.entities.Prenotazione.filter({ centro_id: centroSelezionato.id }),
        base44.entities.SpazioExpo.filter({ centro_id: centroSelezionato.id, attivo: true }),
        base44.entities.Cliente.list()
      ]);
      setPrenotazioni(prenotazioniData);
      setSpazi(spaziData);
      setClienti(clientiData);
    } catch (error) {
      console.error('Errore caricamento dati:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrenotazione = async (data) => {
    try {
      // Verifica sovrapposizioni
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

      const prenotazioneData = {
        ...data,
        centro_id: centroSelezionato.id
      };

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
      console.error('Errore eliminazione prenotazione:', error);
      toast.error('Errore nell\'eliminazione della prenotazione');
    }
  };

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
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Calendario Prenotazioni</h1>
          <p className="text-slate-600">{centroSelezionato?.nome}</p>
        </div>
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
      </div>

      <Tabs defaultValue="calendario" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="calendario" className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Calendario Mensile
          </TabsTrigger>
          <TabsTrigger value="lista">
            Lista Prenotazioni
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendario">
          <CalendarioMensile
            prenotazioni={prenotazioni}
            spazi={spazi}
            clienti={clienti}
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="lista">
          <ListaPrenotazioni
            prenotazioni={prenotazioni}
            spazi={spazi}
            clienti={clienti}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}