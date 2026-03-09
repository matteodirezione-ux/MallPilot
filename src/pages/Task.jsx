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
    if (user?.tipo_account && user?.email) loadData();
  }, [user?.tipo_account, user?.email, centroSelezionato?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (user?.tipo_account === 'vigilanza') {
        const assegnazioni = await base44.entities.Assegnazione.filter({ user_email: user.email });
        const centriIds = [...new Set(assegnazioni.map(a => a.centro_id))];
        const allCentri = await base44.entities.CentroCommerciale.list();
        setCentri(allCentri.filter(c => centriIds.includes(c.id)));

        // Carica direttori e vigilanze degli stessi centri per poter assegnare task
        if (centriIds.length > 0) {
          const assegnazioniCentri = await Promise.all(centriIds.map(id => base44.entities.Assegnazione.filter({ centro_id: id })));
          const emails = [...new Set(assegnazioniCentri.flat().map(a => a.user_email))];
          const [allDirettori, allVigilanze] = await Promise.all([
            base44.entities.Direttore.list(),
            base44.entities.Vigilanza.list(),
          ]);
          setDirettori(allDirettori.filter(d => emails.includes(d.email)));
          setVigilanze(allVigilanze.filter(v => emails.includes(v.email)));
        }

        const [assegnati, creati] = await Promise.all([
          base44.entities.Task.filter({ assegnato_a_email: user.email }),
          base44.entities.Task.filter({ assegnato_da_email: user.email }),
        ]);
        const unici = Array.from(new Map([...assegnati, ...creati].map(t => [t.id, t])).values());
        setTasks(unici.sort((a, b) => new Date(a.data_scadenza) - new Date(b.data_scadenza)));
        setLoading(false);
        return;

      } else if (user?.tipo_account === 'direttore') {
        const assegnazioni = await base44.entities.Assegnazione.filter({ user_email: user.email });
        const centriIds = [...new Set(assegnazioni.map(a => a.centro_id))];
        const allCentri = await base44.entities.CentroCommerciale.list();
        setCentri(allCentri.filter(c => centriIds.includes(c.id)));

        // Carica solo le vigilanze assegnate agli stessi centri del direttore
        const assegnazioniCentri = await Promise.all(centriIds.map(id => base44.entities.Assegnazione.filter({ centro_id: id })));
        const emailsVigilanza = [...new Set(assegnazioniCentri.flat().map(a => a.user_email).filter(e => e !== user.email))];
        const allVigilanze = await base44.entities.Vigilanza.list();
        setVigilanze(allVigilanze.filter(v => emailsVigilanza.includes(v.email)));

        // Il direttore vede solo se stesso - carica il nome corretto dall'entità Direttore
        const direttoreRecord = await base44.entities.Direttore.filter({ email: user.email });
        const nomeDirettore = direttoreRecord.length > 0 ? direttoreRecord[0].full_name : user.full_name;
        setDirettori([{ email: user.email, full_name: nomeDirettore }]);

        // Carica tutti i task dei centri assegnati + quelli assegnati/creati dal direttore + quelli delle vigilanze
        const emailsVigilanzaList = allVigilanze.filter(v => emailsVigilanza.includes(v.email)).map(v => v.email);
        const [assegnati, creati, ...taskVigilanze] = await Promise.all([
          base44.entities.Task.filter({ assegnato_a_email: user.email }),
          base44.entities.Task.filter({ assegnato_da_email: user.email }),
          ...emailsVigilanzaList.map(email => base44.entities.Task.filter({ assegnato_a_email: email })),
        ]);
        let taskCentri = [];
        if (centriIds.length > 0) {
          const taskPerCentro = await Promise.all(centriIds.map(id => base44.entities.Task.filter({ centro_id: id })));
          taskCentri = taskPerCentro.flat();
        }
        // Includi tutti senza filtrare per stato
        const unici = Array.from(new Map([...assegnati, ...creati, ...taskCentri, ...taskVigilanze.flat()].map(t => [t.id, t])).values());
        console.log('Task totali direttore:', unici.length, 'di cui completati:', unici.filter(t => t.stato === 'completato').length);
        setTasks(unici.sort((a, b) => {
          if (!a.data_scadenza) return 1;
          if (!b.data_scadenza) return -1;
          return new Date(a.data_scadenza) - new Date(b.data_scadenza);
        }));

        setLoading(false);
        return;

      } else if (user?.tipo_account === 'proprieta') {
        const [allCentri, allDirettori, allVigilanze] = await Promise.all([
          base44.entities.CentroCommerciale.list(),
          base44.entities.Direttore.list(),
          base44.entities.Vigilanza.list(),
        ]);
        setCentri(allCentri);
        setDirettori(allDirettori);
        setVigilanze(allVigilanze);
      }

      const allTask = await base44.entities.Task.list();
      let filtrati = allTask;
      if (centroSelezionato?.id && centroSelezionato.id !== 'tutti') {
        filtrati = allTask.filter(t => t.centro_id === centroSelezionato.id || !t.centro_id);
      }
      setTasks(filtrati.sort((a, b) => new Date(a.data_scadenza) - new Date(b.data_scadenza)));

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
    while (count < 52) {
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
      occorrenze.push({ ...task, data_scadenza: format(data, 'yyyy-MM-dd'), stato: 'da_fare', ricorrente: false, task_padre_id: savedId, id: undefined, created_date: undefined, updated_date: undefined });
    }
    if (occorrenze.length > 0) await base44.entities.Task.bulkCreate(occorrenze);
  };

  // Sottoscrizione real-time
  useEffect(() => {
    if (!user?.tipo_account) return;
    const unsubscribe = base44.entities.Task.subscribe((event) => {
      if (event.type === 'create') {
        setTasks(prev => {
          if (prev.find(t => t.id === event.id)) return prev;
          return [...prev, event.data].sort((a, b) => {
            if (!a.data_scadenza) return 1;
            if (!b.data_scadenza) return -1;
            return new Date(a.data_scadenza) - new Date(b.data_scadenza);
          });
        });
      } else if (event.type === 'update') {
        setTasks(prev => prev.map(t => t.id === event.id ? { ...t, ...event.data } : t));
      } else if (event.type === 'delete') {
        setTasks(prev => prev.filter(t => t.id !== event.id));
      }
    });
    return () => unsubscribe();
  }, [user?.tipo_account]);

  const handleSave = async (data) => {
    if (taskSelezionato?.id) {
      const updated = await base44.entities.Task.update(taskSelezionato.id, data);
      setTasks(prev => prev.map(t => t.id === taskSelezionato.id ? { ...t, ...data } : t));
    } else if (Array.isArray(data)) {
      const gruppoId = `gruppo_${Date.now()}`;
      const taskConGruppo = data.map(t => ({ ...t, gruppo_id: gruppoId }));
      const saved = await Promise.all(taskConGruppo.map(t => base44.entities.Task.create(t)));
      await Promise.all(saved.map((s, i) => data[i].ricorrente ? generaTaskRicorrenti(data[i], s.id) : Promise.resolve()));
      // I task ricorrenti figli verranno aggiunti via subscribe
    } else {
      const saved = await base44.entities.Task.create(data);
      if (data.ricorrente) await generaTaskRicorrenti(data, saved.id);
    }
    setDialogOpen(false);
    setTaskSelezionato(null);
  };

  const handleEdit = (task) => { setTaskSelezionato(task); setDialogOpen(true); };
  const handleDelete = async (id) => {
    if (window.confirm('Eliminare questo task?')) {
      await base44.entities.Task.delete(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  };
  const handleToggleStato = async (task) => {
    const nuovoStato = task.stato === 'completato' ? 'da_fare' : 'completato';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, stato: nuovoStato } : t));
    await base44.entities.Task.update(task.id, { stato: nuovoStato });
  };

  const canEdit = (task) => {
   if (user?.tipo_account === 'vigilanza') return false;
   if (user?.tipo_account === 'proprieta') return true;
   return task.assegnato_da_email === user?.email;
  };

  const canDelete = (task) => {
   return user?.tipo_account !== 'vigilanza';
  };

  // Per la proprietà: accorpa i task con stesso gruppo_id in un unico task virtuale
  const taskPerVista = React.useMemo(() => {
    if (user?.tipo_account !== 'proprieta') return tasks;

    const gruppi = {};
    const singoli = [];

    for (const t of tasks) {
      if (t.gruppo_id) {
        if (!gruppi[t.gruppo_id]) gruppi[t.gruppo_id] = [];
        gruppi[t.gruppo_id].push(t);
      } else {
        singoli.push(t);
      }
    }

    const accorpati = Object.entries(gruppi).map(([gruppoId, lista]) => {
      const tutti_completati = lista.every(t => t.stato === 'completato');
      const qualcuno_completato = lista.some(t => t.stato === 'completato');
      const statoAccorpato = tutti_completati ? 'completato' : (qualcuno_completato ? 'in_corso' : lista[0].stato);
      return {
        ...lista[0],
        id: `gruppo_${gruppoId}`,
        _gruppo_id: gruppoId,
        _task_figli: lista,
        _count: lista.length,
        _completati: lista.filter(t => t.stato === 'completato').length,
        stato: statoAccorpato,
        assegnato_a_nome: `${lista.length} persone/centri`,
        _is_gruppo: true,
      };
    });

    return [...singoli, ...accorpati].sort((a, b) => new Date(a.data_scadenza) - new Date(b.data_scadenza));
  }, [tasks, user]);

  const taskFiltrati = taskPerVista.filter(t => {
    if (filtroStato !== 'tutti' && t.stato !== filtroStato) return false;
    if (filtroPriorita !== 'tutti' && t.priorita !== filtroPriorita) return false;
    if (cerca && !t.titolo?.toLowerCase().includes(cerca.toLowerCase())) return false;
    return true;
  });

  const canCreate = user?.tipo_account !== 'vigilanza';
  if (!user) return null;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
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
              canDelete={(task) => canDelete(task)}
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
        task={taskSelezionato?._is_gruppo ? null : taskSelezionato}
        user={user}
        centri={centri}
        direttori={direttori}
        vigilanze={vigilanze}
      />
    </div>
  );
}