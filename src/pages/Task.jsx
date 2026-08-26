import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionInfoButton from '@/components/onboarding/SectionInfoButton';
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
  const [vistaApertiChiusi, setVistaApertiChiusi] = useState('aperti');
  const [cerca, setCerca] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId && tasks.length > 0) {
      const task = tasks.find(t => t.id === editId);
      if (task) { setTaskSelezionato(task); setDialogOpen(true); window.history.replaceState({}, '', window.location.pathname); }
    }
  }, [tasks]);

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
        if (centriIds.length > 0) {
          const assegnazioniCentri = await Promise.all(centriIds.map(id => base44.entities.Assegnazione.filter({ centro_id: id })));
          const emails = [...new Set(assegnazioniCentri.flat().map(a => a.user_email))];
          const [allDirettori, allVigilanze] = await Promise.all([base44.entities.Direttore.list(), base44.entities.Vigilanza.list()]);
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
        const assegnazioniCentri = await Promise.all(centriIds.map(id => base44.entities.Assegnazione.filter({ centro_id: id })));
        const emailsVigilanza = [...new Set(assegnazioniCentri.flat().map(a => a.user_email).filter(e => e !== user.email))];
        const allVigilanze = await base44.entities.Vigilanza.list();
        setVigilanze(allVigilanze.filter(v => emailsVigilanza.includes(v.email)));
        const direttoreRecord = await base44.entities.Direttore.filter({ email: user.email });
        const nomeDirettore = direttoreRecord.length > 0 ? direttoreRecord[0].full_name : user.full_name;
        setDirettori([{ email: user.email, full_name: nomeDirettore }]);
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
        const unici = Array.from(new Map([...assegnati, ...creati, ...taskCentri, ...taskVigilanze.flat()].map(t => [t.id, t])).values());
        setTasks(unici.sort((a, b) => { if (!a.data_scadenza) return 1; if (!b.data_scadenza) return -1; return new Date(a.data_scadenza) - new Date(b.data_scadenza); }));
        setLoading(false);
        return;
      } else if (user?.tipo_account === 'proprieta') {
        const [allCentri, allDirettori, allVigilanze] = await Promise.all([base44.entities.CentroCommerciale.list(), base44.entities.Direttore.list(), base44.entities.Vigilanza.list()]);
        setCentri(allCentri); setDirettori(allDirettori); setVigilanze(allVigilanze);
      }
      const allTask = await base44.entities.Task.list();
      let filtrati = allTask;
      if (centroSelezionato?.id && centroSelezionato.id !== 'tutti') {
        filtrati = allTask.filter(t => t.centro_id === centroSelezionato.id || !t.centro_id);
      }
      setTasks(filtrati.sort((a, b) => new Date(a.data_scadenza) - new Date(b.data_scadenza)));
    } catch (err) { console.error(err); }
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
        default: { const n = task.ricorrenza_ogni || 1; if (task.ricorrenza_unita === 'giorni') prossima = addDays(data, n); else if (task.ricorrenza_unita === 'settimane') prossima = addWeeks(data, n); else prossima = addMonths(data, n); }
      }
      if (prossima > fineRicorrenza) break;
      data = prossima; count++;
      occorrenze.push({ ...task, data_scadenza: format(data, 'yyyy-MM-dd'), stato: 'da_fare', ricorrente: false, task_padre_id: savedId, id: undefined, created_date: undefined, updated_date: undefined });
    }
    if (occorrenze.length > 0) await base44.entities.Task.bulkCreate(occorrenze);
  };

  useEffect(() => {
    if (!user?.tipo_account) return;
    const unsubscribe = base44.entities.Task.subscribe((event) => {
      if (event.type === 'create') { setTasks(prev => { if (prev.find(t => t.id === event.id)) return prev; return [...prev, event.data].sort((a, b) => { if (!a.data_scadenza) return 1; if (!b.data_scadenza) return -1; return new Date(a.data_scadenza) - new Date(b.data_scadenza); }); }); }
      else if (event.type === 'update') { setTasks(prev => prev.map(t => t.id === event.id ? { ...t, ...event.data } : t)); }
      else if (event.type === 'delete') { setTasks(prev => prev.filter(t => t.id !== event.id)); }
    });
    return () => unsubscribe();
  }, [user?.tipo_account]);

  const handleSave = async (data) => {
    if (taskSelezionato?.id) {
      await base44.entities.Task.update(taskSelezionato.id, data);
      setTasks(prev => prev.map(t => t.id === taskSelezionato.id ? { ...t, ...data } : t));
    } else if (Array.isArray(data)) {
      const gruppoId = `gruppo_${Date.now()}`;
      const taskConGruppo = data.map(t => ({ ...t, gruppo_id: gruppoId }));
      const saved = await Promise.all(taskConGruppo.map(t => base44.entities.Task.create(t)));
      await Promise.all(saved.map((s, i) => data[i].ricorrente ? generaTaskRicorrenti(data[i], s.id) : Promise.resolve()));
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
    if (user?.tipo_account === 'vigilanza') return task.assegnato_da_email === user?.email;
    if (user?.tipo_account === 'proprieta') return true;
    return true;
  };
  const canDelete = (task) => {
    if (user?.tipo_account === 'vigilanza') return task.assegnato_da_email === user?.email;
    return true;
  };

  const taskFiltrati = tasks.filter(t => {
    const matchStato = filtroStato === 'tutti' || t.stato === filtroStato;
    const matchPriorita = filtroPriorita === 'tutti' || t.priorita === filtroPriorita;
    const matchCerca = !cerca || t.titolo?.toLowerCase().includes(cerca.toLowerCase()) || t.descrizione?.toLowerCase().includes(cerca.toLowerCase());
    const matchVista = vistaApertiChiusi === 'tutti' || (vistaApertiChiusi === 'aperti' ? (t.stato !== 'completato' && t.stato !== 'annullato') : (t.stato === 'completato' || t.stato === 'annullato'));
    return matchStato && matchPriorita && matchCerca && matchVista;
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ListTodo className="w-6 h-6" /> Task <SectionInfoButton section="Task" /></h1>
          <p className="text-slate-500 text-sm mt-1">Gestione attività e scadenze</p>
        </div>
        <Button onClick={() => { setTaskSelezionato(null); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-4 h-4" /> Nuovo Task
        </Button>
      </div>

      <Tabs defaultValue="lista">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="lista" className="gap-1"><ListTodo className="w-4 h-4" /> Lista</TabsTrigger>
            <TabsTrigger value="calendario" className="gap-1"><CalendarDays className="w-4 h-4" /> Calendario</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2 flex-1">
            <div className="relative flex-1 min-w-40">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Cerca task..." value={cerca} onChange={e => setCerca(e.target.value)} className="pl-10 h-9" />
            </div>
            <div className="flex gap-2">
              {['aperti','chiusi','tutti'].map(v => (
                <button key={v} onClick={() => setVistaApertiChiusi(v)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${vistaApertiChiusi === v ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {v === 'aperti' ? 'Aperti' : v === 'chiusi' ? 'Completati' : 'Tutti'}
                </button>
              ))}
            </div>
            <Select value={filtroPriorita} onValueChange={setFiltroPriorita}>
              <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Priorità" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutte</SelectItem>
                <SelectItem value="bassa">Bassa</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="lista">
          {loading ? <div className="text-center py-8 text-slate-400">Caricamento...</div> : (
            <ListaTask tasks={taskFiltrati} onEdit={handleEdit} onDelete={handleDelete} onToggleStato={handleToggleStato} canEdit={canEdit} canDelete={canDelete} vistaApertiChiusi={vistaApertiChiusi} />
          )}
        </TabsContent>

        <TabsContent value="calendario">
          <CalendarioTask tasks={tasks} onTaskClick={handleEdit} onDayClick={(giorno) => { setTaskSelezionato(null); setDialogOpen(true); }} />
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
        centroDefault={centroSelezionato?.id !== 'tutti' ? centroSelezionato?.id : null}
      />
    </div>
  );
}