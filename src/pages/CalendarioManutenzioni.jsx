import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Wrench, Calendar, ListTodo } from 'lucide-react';
import { format } from 'date-fns';
import CalendarioManutenzioniMensile from '../components/calendario/CalendarioManutenzioniMensile';
import ListaManutenzioni from '../components/calendario/ListaManutenzioni';

export default function CalendarioManutenzioni({ centroSelezionato, user }) {
  const [manutenzioni, setManutenzioni] = useState([]);
  const [centri, setCentri] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manutenzioneSelezionata, setManutenzioneSelezionata] = useState(null);
  const [formData, setFormData] = useState({
    titolo: '',
    descrizione: '',
    data_scadenza: format(new Date(), 'yyyy-MM-dd'),
    centro_id: '',
    stato: 'da_fare'
  });

  useEffect(() => {
    if (user?.tipo_account && user?.email && centroSelezionato?.id) {
      loadData();
    }
  }, [user?.tipo_account, user?.email, centroSelezionato?.id]);

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
      stato: 'da_fare'
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
      stato: manutenzione.stato
    });
    setDialogOpen(true);
  };

  const handleToggleStatus = async (manutenzione) => {
    const nuovoStato = manutenzione.stato === 'completato' ? 'da_fare' : 'completato';
    await base44.entities.Manutenzione.update(manutenzione.id, { stato: nuovoStato });
    loadData();
  };

  const handleSave = async () => {
    if (!formData.titolo.trim()) {
      alert('Titolo obbligatorio');
      return;
    }

    try {
      if (manutenzioneSelezionata?.id) {
        await base44.entities.Manutenzione.update(manutenzioneSelezionata.id, formData);
      } else {
        await base44.entities.Manutenzione.create({
          ...formData,
          assegnato_da_email: user.email,
          assegnato_da_nome: user.full_name
        });
      }
      setDialogOpen(false);
      setManutenzioneSelezionata(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Errore nel salvataggio');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Eliminare questa manutenzione?')) {
      await base44.entities.Manutenzione.delete(manutenzioneSelezionata.id);
      setDialogOpen(false);
      setManutenzioneSelezionata(null);
      loadData();
    }
  };

  if (!user) return null;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Wrench className="w-6 h-6 text-blue-600" />
          Calendario Manutenzioni
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {centroSelezionato?.nome && centroSelezionato.id !== 'tutti' ? centroSelezionato.nome : 'Tutti i centri'}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Caricamento...</div>
      ) : (
        <CalendarioManutenzioniMensile
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onToggleStatus={handleToggleStatus}
          onNewTask={handleNewTask}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{taskSelezionato?.id ? 'Modifica Task' : 'Nuovo Task'}</DialogTitle>
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
                <label className="text-sm font-medium text-slate-700">Data</label>
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

            <div className="flex gap-2 justify-end pt-4 border-t">
              {taskSelezionato?.id && (
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