import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ListTodo, CalendarDays, Search } from 'lucide-react';
import { addDays, addWeeks, addMonths, addYears, parseISO, format } from 'date-fns';
import FormTask from '../components/tasks/FormTask';
import ListaTask from '../components/tasks/ListaTask';
import CalendarioTask from '../components/tasks/CalendarioTask';

export default function TaskPage({ centroSelezionato, user }) {
  const [tasks, setTasks] = useState([]);
  const [direttori, setDirettori] = useState([]);
  const [vigilanze, setVigilanze] = useState([]);
  const [centri, setCentri] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [taskSelezionato, setTaskSelezionato] = useState(null);
  const [filtroStato, setFiltroStato] = useState('tutti');
  const [filtroPriorita, setFiltroPriorita] = useState('tutti');
  const [cerca, setCerca] = useState('');

  useEffect(() => {
    if (user) loadData();
  }, [user, centroSelezionato]);

  const loadData = async () => {
    setLoading(true);
    try {
      let taskFilter = {};

      if (user?.tipo_account === 'vigilanza') {
        taskFilter = { assegnato_a_email: user.email };
      } else if (user?.tipo_account === 'direttore') {
        // Direttore vede i task assegnati a lui e quelli che ha creato
        const [assegnati, creati] = await Promise.all([
          base44.entities.Task.filter({ assegnato_a_email: user.email }),
          base44.entities.Task.filter({ assegnato_da_email: user.email }),
        ]);
        const tutti = [...assegnati, ...creati];
        const unici = Array.from(new Map(tutti.map(t => [t.id, t])).values());
        setTasks(unici.sort((a, b) => new Date(a.data_scadenza) - new Date(b.data_scadenza)));

        // Carica vigilanze assegnate ai centri del direttore
        const assegnazioni = await base44.entities.Assegnazione.filter({ user_email: user.email });
        const centriIds = [...new Set(assegnazioni.map(a => a.centro_id))];
        const allCentri = await base44.entities.CentroCommerciale.list();
        const centriDirettore = allCentri.filter(c => centriIds.includes(c.id));
        setCentri(centriDirettore);

        // Carica vigilanze dei centri del direttore
        const assegnazioniCentri = await Promise.all(
          centriIds.map(id => base44.entities.Assegnazione.filter({ centro_id: id }))
        );
        const emails = [...new Set(assegnazioniCentri.flat().map(a => a.user_email).filter(e => e !== user.email))];
        const allVigilanze = await base44.entities.Vigilanza.list();
        setVigilanze(allVigilanze.filter(v => emails.includes(v.email)));
        setLoading(false);
        return;
      } else if (user?.tipo_account === 'proprieta') {
        // Proprietà vede tutti i task
        const allCentri = await base44.entities.CentroCommerciale.list();
        setCentri(allCentri);
        const allDirettori = await base44.entities.Direttore.list();
        const allVigilanze = await base44.entities.Vigilanza.list();
        setDirettori(allDirettori);
        setVigilanze(allVigilanze);
      }

      // Filtra per centro se selezionato
      if (centroSelezionato?.id && centroSelezionato.id !== 'tutti') {
        taskFilter.centro_id = centroSelezionato.id;
        const allTask = await base44.entities.Task.list();
        const filtrati = allTask.filter(t =>
          t.centro_id === centroSelezionato.id ||
          (!t.centro_id && user?.tipo_account === 'proprieta')
        );
        setTasks(filtrati.sort((a, b) => new Date(a.data_scadenza) - new Date(b.data_scadenza)));
      } else {
        const allTask = await base44.entities.Task.list();
        setTasks(allTask.sort((a, b) => new Date(a.data_scadenza) - new Date(b.data_scadenza)));
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const generaTaskRicorrenti = async (task, savedId) => {
    if (!task.ricorrente || !task.data_scadenza) return;

    const occorrenze = [];
    let data = parseISO(task.data_scadenza);
    const fineRicorrenza = task.ricorrenza_fine ? parseISO(task.ricorrenza_fine) : addYears(data, 1);
    let count = 0;
    const maxOccorrenze = 52;

    while (count < maxOccorrenze) {
      let prossima;
      switch (task.ricorrenza_tipo) {
        case 'giornaliero': prossima = addDays(data, 1); break;
        case 'settimanale': prossima = addWeeks(data, 1); break;
        case 'mensile': prossima = addMonths(data, 1); break;
        case 'annuale': prossima = addYears(data, 1); break;
        case 'personalizzato': {
          const n = task.ricorrenza_ogni || 1;
          if (task.ricorrenza_unita === 'giorni') prossima = addDays(data, n);
          else if (task.ricorrenza_unita === 'settimane') prossima = addWeeks(data, n);
          else prossima = addMonths(data, n);
          break;
        }
        default: prossima = addWeeks(data, 1);
      }

      if (prossima > fineRicorrenza) break;
      data = prossima;
      count++;

      occorrenze.push({
        ...task,
        data_scadenza: format(data, 'yyyy-MM-dd'),
        stato: 'da_fare',
        ricorrente: false,
        task_padre_id: savedId,
        id: undefined,
        created_date: undefined,
        updated_date: undefined,
      });
    }

    if (occorrenze.length > 0) {
      await base44.entities.Task.bulkCreate(occorrenze);
    }
  };

  const handleSave = async (data) => {
    if (taskSelezionato) {
      await base44.entities.Task.update(taskSelezionato.id, data);
    } else {
      const saved = await base44.entities.Task.create(data);
      if (data.ricorrente) {
        await generaTaskRicorrenti(data, saved.id);
      }
    }
    setDialogOpen(false);
    setTaskSelezionato(null);
    loadData();
  };

  const handleEdit = (task) => {
    setTaskSelezionato(task);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Eliminare questo task?')) {
      await base44.entities.Task.delete(id);
      loadData();
    }
  };

  const handleToggleStato = async (task) => {
    const nuovoStato = task.stato === 'completato' ? 'da_fare' : 'completato';
    await base44.entities.Task.update(task.id, { stato: nuovoStato });
    loadData();
  };

  const canEdit = (task) => {
    if (user?.tipo_account === 'vigilanza') return false;
    if (user?.tipo_account === 'proprieta') return true;
    // Direttore può modificare solo i task che ha creato
    return task.assegnato_da_email === user?.email;
  };

  const taskFiltrati = tasks.filter(t => {
    if (filtroStato !== 'tutti' && t.stato !== filtroStato) return false;
    if (filtroPriorita !== 'tutti' && t.priorita !== filtroPriorita) return false;
    if (cerca && !t.titolo.toLowerCase().includes(cerca.toLowerCase())) return false;
    return true;
  });

  const canCreate = user?.tipo_account !== 'vigilanza';

  if (!user) return null;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-blue-600" />
            Task
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {centroSelezionato?.nome && centroSelezionato.id !== 'tutti' ? centroSelezionato.nome : 'Tutti i centri'}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => { setTaskSelezionato(null); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Task
          </Button>
        )}
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Cerca task..." className="pl-9" value={cerca} onChange={e => setCerca(e.target.value)} />
        </div>
        <Select value={filtroStato} onValueChange={setFiltroStato}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti gli stati</SelectItem>
            <SelectItem value="da_fare">Da fare</SelectItem>
            <SelectItem value="in_corso">In corso</SelectItem>
            <SelectItem value="completato">Completato</SelectItem>
            <SelectItem value="annullato">Annullato</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroPriorita} onValueChange={setFiltroPriorita}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutte le priorità</SelectItem>
            <SelectItem value="bassa">Bassa</SelectItem>
            <SelectItem value="media">Media</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vista lista / calendario */}
      <Tabs defaultValue="lista">
        <TabsList className="mb-4">
          <TabsTrigger value="lista" className="gap-2">
            <ListTodo className="w-4 h-4" /> Lista
          </TabsTrigger>
          <TabsTrigger value="calendario" className="gap-2">
            <CalendarDays className="w-4 h-4" /> Calendario
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Caricamento...</div>
          ) : (
            <ListaTask
              tasks={taskFiltrati}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStato={handleToggleStato}
              canEdit={(task) => canEdit(task)}
            />
          )}
        </TabsContent>

        <TabsContent value="calendario">
          <CalendarioTask
            tasks={taskFiltrati}
            onTaskClick={handleEdit}
            onDayClick={(giorno) => {
              setTaskSelezionato({ data_scadenza: format(giorno, 'yyyy-MM-dd') });
              setDialogOpen(true);
            }}
          />
        </TabsContent>
      </Tabs>

      <FormTask
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setTaskSelezionato(null); }}
        onSave={handleSave}
        task={taskSelezionato}
        user={user}
        centri={centri}
        direttori={direttori}
        vigilanze={vigilanze}
      />
    </div>
  );
}