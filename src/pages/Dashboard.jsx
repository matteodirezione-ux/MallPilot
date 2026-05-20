import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import FormTask from '@/components/tasks/FormTask';
import FormTicket from '@/components/tickets/FormTicket';
import FormPulizia from '@/components/pulizie/FormPulizia';
import QuickFormControllo from '@/components/dashboard/QuickFormControllo';
import QuickFormReport from '@/components/dashboard/QuickFormReport';
import QuickFormPrenotazione from '@/components/dashboard/QuickFormPrenotazione';
import { 
  TrendingUp, 
  Calendar, 
  Building2, 
  DollarSign, 
  Users,
  Target,
  BarChart2,
  Percent,
  ListTodo,
  Clock,
  AlertCircle,
  CheckCircle,
  Sparkles,
  ClipboardList,
  Ticket,
  HardHat,
  RefreshCw,
  BookOpen,
  Plus
} from 'lucide-react';
import { format, addMonths, isWithinInterval, startOfMonth, endOfMonth, startOfYear, endOfYear, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import TasksDashboard from '@/components/dashboard/TasksDashboard';
import AgendaCards from '@/components/dashboard/AgendaCards';
import WeatherWidget from '@/components/dashboard/WeatherWidget';
import DashboardDetailModal from '@/components/dashboard/DashboardDetailModal';
import { useNavigate } from 'react-router-dom';

export default function Dashboard({ centroSelezionato, user }) {
  const [stats, setStats] = useState({
  reportDaLeggere: 0,
  pulizieDaLeggere: 0,
  fornitoriAlertCount: 0,
  capexAlertCount: 0,
  prossimiAffitti: [],
  affittiCorrenti: [],
  gratuitiList: [],
  spaziOccupati: 0,
  spaziTotali: 0,
  incassiMese: 0,
  incassiAnno: 0,
  budgetAnno: 0,
  clientiTotali: 0,
  affittoMedioGiornaliero: 0,
  tassoOccupazioneAnnuale: 0,
  taskStats: {
    urgenti: 0,
    inCorso: 0,
    completati: 0,
    totali: 0
  },
  eventStats: {
    giorniEvento: 0,
    eventiCorrenti: 0,
    prossimiEventi: []
  },
  tasksList: [],
  controlliList: [],
  ticketsList: [],
  capexList: [],
  puliziePeriodiche: [],
  reportList: []
  });
  const [loading, setLoading] = useState(true);
  const [completingIds, setCompletingIds] = useState(new Set());
  const [detailModal, setDetailModal] = useState({ open: false, type: null, item: null });
  const navigate = useNavigate();

  // Quick form state
  const [quickForm, setQuickForm] = useState(null); // 'task' | 'ticket' | 'controllo' | 'report' | 'pulizia'
  const [quickDirettori, setQuickDirettori] = useState([]);
  const [quickVigilanze, setQuickVigilanze] = useState([]);
  const [quickCentri, setQuickCentri] = useState([]);

  const openQuickForm = async (tipo) => {
    // Carica dati solo se non già caricati
    if (quickCentri.length === 0) {
      const assegnazioni = await base44.entities.Assegnazione.filter({ user_email: user?.email });
      const centriIds = [...new Set(assegnazioni.map(a => a.centro_id))];
      const allCentri = await base44.entities.CentroCommerciale.list();
      const centriAssegnati = allCentri.filter(c => centriIds.includes(c.id));
      setQuickCentri(centriAssegnati);

      if (user?.tipo_account === 'direttore') {
        const assegnazioniCentri = await Promise.all(centriIds.map(id => base44.entities.Assegnazione.filter({ centro_id: id })));
        const emails = [...new Set(assegnazioniCentri.flat().map(a => a.user_email).filter(e => e !== user.email))];
        const allVigilanze = await base44.entities.Vigilanza.list();
        setQuickVigilanze(allVigilanze.filter(v => emails.includes(v.email)));
        const direttoreRecord = await base44.entities.Direttore.filter({ email: user.email });
        const nomeDirettore = direttoreRecord[0]?.full_name || user.full_name;
        setQuickDirettori([{ email: user.email, full_name: nomeDirettore }]);
      } else if (user?.tipo_account === 'vigilanza') {
        const assegnazioniCentri = await Promise.all(centriIds.map(id => base44.entities.Assegnazione.filter({ centro_id: id })));
        const emails = [...new Set(assegnazioniCentri.flat().map(a => a.user_email))];
        const [allDirettori, allVigilanze] = await Promise.all([
          base44.entities.Direttore.list(),
          base44.entities.Vigilanza.list(),
        ]);
        setQuickDirettori(allDirettori.filter(d => emails.includes(d.email)));
        setQuickVigilanze(allVigilanze.filter(v => emails.includes(v.email)));
      }
    }
    setQuickForm(tipo);
  };

  const handleQuickTaskSave = async (data) => {
    if (Array.isArray(data)) {
      await Promise.all(data.map(t => base44.entities.Task.create(t)));
    } else {
      await base44.entities.Task.create(data);
    }
    setQuickForm(null);
  };

  const handleQuickTicketSave = async (data) => {
    await base44.entities.Ticket.create({ ...data, centro_id: centroSelezionato?.id !== 'tutti' ? centroSelezionato?.id : '' });
    setQuickForm(null);
  };

  const openDetail = (type, item) => setDetailModal({ open: true, type, item });
  const closeDetail = () => setDetailModal({ open: false, type: null, item: null });

  const handleCompleteTask = async (taskId) => {
    setCompletingIds(prev => new Set(prev).add(taskId));
    await base44.entities.Task.update(taskId, { stato: 'completato' });
    setStats(prev => ({
      ...prev,
      tasksList: prev.tasksList.map(t => t.id === taskId ? { ...t, stato: 'completato' } : t)
    }));
    setCompletingIds(prev => { const s = new Set(prev); s.delete(taskId); return s; });
  };

  const handleCompleteControllo = async (controlloId) => {
    setCompletingIds(prev => new Set(prev).add(controlloId));
    await base44.entities.Manutenzione.update(controlloId, { stato: 'completato' });
    setStats(prev => ({
      ...prev,
      controlliList: prev.controlliList.map(c => c.id === controlloId ? { ...c, stato: 'completato' } : c)
    }));
    setCompletingIds(prev => { const s = new Set(prev); s.delete(controlloId); return s; });
  };

  const lastLoadKey = React.useRef(null);

  useEffect(() => {
    const key = `${centroSelezionato?.id}_${user?.email}`;
    if (centroSelezionato && centroSelezionato.id && user && key !== lastLoadKey.current) {
      lastLoadKey.current = key;
      loadStats();
    }
  }, [centroSelezionato?.id, user?.email]);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      if (!centroSelezionato || !centroSelezionato.id || !centroSelezionato.nome) {
        setLoading(false);
        return;
      }
      
      const now = new Date();
      const unMeseDopo = addMonths(now, 1);
      const inizioMese = startOfMonth(now);
      const fineMese = endOfMonth(now);
      const inizioAnno = startOfYear(now);
      const anno = now.getFullYear();
      const oggi2 = new Date(); oggi2.setHours(0, 0, 0, 0);
      const annoCorrente = now.getFullYear();
      const isAll = centroSelezionato?.id === 'tutti';

      // === CARICA TUTTO IN PARALLELO ===
      const [
        prenotazioni,
        spazi,
        budgets,
        clienti,
        controlliList,
        ticketsList,
        allCapex,
        allPulizie,
        allReport,
        allPulizieSegnalazioni,
        allFornitori,
      ] = await Promise.all([
        isAll ? base44.entities.Prenotazione.list() : base44.entities.Prenotazione.filter({ centro_id: centroSelezionato.id }),
        isAll ? base44.entities.SpazioExpo.filter({ attivo: true }) : base44.entities.SpazioExpo.filter({ centro_id: centroSelezionato.id, attivo: true }),
        isAll ? base44.entities.Budget.filter({ anno }) : base44.entities.Budget.filter({ centro_id: centroSelezionato.id, anno }),
        base44.entities.Cliente.filter(isAll ? {} : { centro_id: centroSelezionato.id }),
        isAll ? base44.entities.Manutenzione.list() : base44.entities.Manutenzione.filter({ centro_id: centroSelezionato.id }),
        isAll ? base44.entities.Ticket.list() : base44.entities.Ticket.filter({ centro_id: centroSelezionato.id }),
        isAll ? base44.entities.Capex.list() : base44.entities.Capex.filter({ centro_id: centroSelezionato.id }),
        isAll ? base44.entities.PuliziaPeriodica.list() : base44.entities.PuliziaPeriodica.filter({ centro_id: centroSelezionato.id }),
        isAll ? base44.entities.Report.list('-data') : base44.entities.Report.filter({ centro_id: centroSelezionato.id }, '-data'),
        isAll ? base44.entities.Pulizia.list() : base44.entities.Pulizia.filter({ centro_id: centroSelezionato.id }),
        isAll ? base44.entities.Fornitore.list() : base44.entities.Fornitore.filter({ centro_id: centroSelezionato.id }),
      ]);

      // === TASK (dipende dal ruolo, caricata separatamente ma dopo) ===
      let tasksList;
      if (user?.tipo_account === 'vigilanza') {
        tasksList = await base44.entities.Task.filter({ assegnato_a_email: user.email });
      } else if (user?.tipo_account === 'direttore') {
        if (isAll) {
          tasksList = await base44.entities.Task.list();
        } else {
          const [assegnazioniCentro, allTasks] = await Promise.all([
            base44.entities.Assegnazione.filter({ centro_id: centroSelezionato.id }),
            base44.entities.Task.list()
          ]);
          const emailsAssegnati = assegnazioniCentro.map(a => a.user_email);
          const allIds = new Set();
          tasksList = allTasks.filter(t => {
            if (allIds.has(t.id)) return false;
            if (t.centro_id === centroSelezionato.id) { allIds.add(t.id); return true; }
            if (t.assegnato_a_email && emailsAssegnati.includes(t.assegnato_a_email)) { allIds.add(t.id); return true; }
            if (t.assegnato_da_email && emailsAssegnati.includes(t.assegnato_da_email)) { allIds.add(t.id); return true; }
            return false;
          });
        }
      } else {
        tasksList = isAll ? await base44.entities.Task.list() : await base44.entities.Task.filter({ centro_id: centroSelezionato.id });
      }

      // === CALCOLI (no più API calls) ===

      // Prenotazioni affitti e eventi
      const affittiCorrentiList = prenotazioni.filter(p => {
        const dataInizio = new Date(p.data_inizio);
        const dataFine = new Date(p.data_fine);
        return !p.is_event && !p.is_gratuito && isWithinInterval(now, { start: dataInizio, end: dataFine }) && p.stato !== 'cancellata';
      });
      const prossimiAffittiList = prenotazioni.filter(p => {
        const dataInizio = new Date(p.data_inizio);
        return !p.is_event && !p.is_gratuito && dataInizio > now &&
               isWithinInterval(dataInizio, { start: now, end: unMeseDopo }) && p.stato !== 'cancellata';
      });

      // Carica clienti e spazi in batch usando le liste già caricate (no API calls aggiuntive)
      const clientiMap = Object.fromEntries(clienti.map(c => [c.id, c]));
      const spaziMap = Object.fromEntries(spazi.map(s => [s.id, s]));

      const enrichPrenotazione = (p) => ({
        ...p,
        cliente: clientiMap[p.cliente_id] || null,
        spazio: spaziMap[p.spazio_id] || null,
      });

      const prossimiConDettagli = prossimiAffittiList.map(enrichPrenotazione);
      const affittiCorrentiConDettagli = affittiCorrentiList.map(enrichPrenotazione);

      // Spazi gratuiti attivi o futuri (prossimo mese)
      const gratuitiList = prenotazioni
        .filter(p => p.is_gratuito && p.stato !== 'cancellata' && p.data_fine && new Date(p.data_fine) >= oggi2)
        .map(enrichPrenotazione);

      // Statistiche spazi e incassi
      const spaziOccupatiOggi = affittiCorrentiList.length;

      const incassiMese = prenotazioni
        .filter(p => {
          const dataInizio = new Date(p.data_inizio);
          return !p.is_event && isWithinInterval(dataInizio, { start: inizioMese, end: fineMese }) && p.stato !== 'cancellata';
        })
        .reduce((sum, p) => sum + (p.prezzo_totale || 0), 0);

      const incassiAnno = prenotazioni
        .filter(p => {
          const dataInizio = new Date(p.data_inizio);
          return !p.is_event && dataInizio >= inizioAnno && p.stato !== 'cancellata';
        })
        .reduce((sum, p) => sum + (p.prezzo_totale || 0), 0);

      const budgetAnno = isAll
        ? budgets.reduce((sum, b) => sum + (b.importo_budget || 0), 0)
        : budgets[0]?.importo_budget || 0;

      // Task stats
      const taskStats = {
        urgenti: tasksList.filter(t => t.priorita === 'urgente' && t.stato !== 'completato' && t.stato !== 'annullato').length,
        inCorso: tasksList.filter(t => t.stato === 'in_corso').length,
        completati: tasksList.filter(t => t.stato === 'completato').length,
        totali: tasksList.length
      };

      // Event stats (riuso prenotazioni già caricate)
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      const eventiCorrentiList = prenotazioni.filter(p => p.is_event && p.stato !== 'cancellata' && new Date(p.data_inizio) <= hoje && new Date(p.data_fine) >= hoje);
      const prossimiEventi = prenotazioni.filter(p => p.is_event && p.stato !== 'cancellata' && new Date(p.data_inizio) > hoje).sort((a, b) => new Date(a.data_inizio) - new Date(b.data_inizio)).slice(0, 3);

      let giorniEvento = 0;
      let costoEventiAnno = 0;
      prenotazioni.forEach(p => {
        if (p.is_event && p.stato !== 'cancellata') {
          const inizio = new Date(p.data_inizio);
          const fine = new Date(p.data_fine);
          if (p.stato === 'confermata' || p.stato === 'in_corso') {
            giorniEvento += Math.ceil((fine - inizio) / (1000 * 60 * 60 * 24)) + 1;
          }
          if (inizio.getFullYear() === annoCorrente) {
            costoEventiAnno += p.prezzo_totale || 0;
          }
        }
      });
      const costoMedioGiornoEvento = giorniEvento > 0 ? costoEventiAnno / giorniEvento : 0;
      const numeroEventiAnno = prenotazioni.filter(p => p.is_event && p.stato !== 'cancellata' && new Date(p.data_inizio).getFullYear() === annoCorrente).length;

      const eventStats = { giorniEvento, eventiCorrenti: eventiCorrentiList.length, eventiCorrentiList, prossimiEventi, costoEventiAnno, costoMedioGiornoEvento, numeroEventiAnno };

      // Affitto medio e tasso occupazione
      const prenotazioniValide = prenotazioni.filter(p => !p.is_event && p.stato !== 'cancellata' && p.prezzo_totale > 0);
      let affittoMedioGiornaliero = 0;
      if (prenotazioniValide.length > 0) {
        const totaleGiorni = prenotazioniValide.reduce((sum, p) => sum + Math.max(differenceInDays(new Date(p.data_fine), new Date(p.data_inizio)) + 1, 1), 0);
        const totalePrezzi = prenotazioniValide.reduce((sum, p) => sum + (p.prezzo_totale || 0), 0);
        affittoMedioGiornaliero = totalePrezzi / totaleGiorni;
      }

      const inizioAnnoDate = startOfYear(now);
      const fineAnnoDate = endOfYear(now);
      const giorniAnno = differenceInDays(fineAnnoDate, inizioAnnoDate) + 1;
      const totaleGiorniDisponibili = spazi.length * giorniAnno;
      let tassoOccupazioneAnnuale = 0;
      if (totaleGiorniDisponibili > 0) {
        const giorniOccupati = prenotazioni.filter(p => p.stato !== 'cancellata').reduce((sum, p) => {
          const inizio = new Date(Math.max(new Date(p.data_inizio), inizioAnnoDate));
          const fine = new Date(Math.min(new Date(p.data_fine), fineAnnoDate));
          return sum + Math.max(differenceInDays(fine, inizio) + 1, 0);
        }, 0);
        tassoOccupazioneAnnuale = (giorniOccupati / totaleGiorniDisponibili) * 100;
      }

      // Capex, pulizie, alert
      const capexList = allCapex.filter(c => c.stato !== 'completato' && c.data_inizio && (c.data_fine ? new Date(c.data_fine) >= oggi2 : new Date(c.data_inizio) >= oggi2)).sort((a, b) => new Date(a.data_inizio) - new Date(b.data_inizio)).slice(0, 10);
      const puliziePeriodiche = allPulizie.filter(p => p.stato !== 'completato').sort((a, b) => new Date(a.prossima_scadenza || a.ultima_esecuzione || 0) - new Date(b.prossima_scadenza || b.ultima_esecuzione || 0)).slice(0, 5);

      const fornitoriAlertCount = allFornitori.reduce((count, f) => {
        if (!f.duvri_urls || f.duvri_urls.length === 0) return count + 1;
        return count + (f.subornitori || []).filter(s => !s.duvri_urls || s.duvri_urls.length === 0).length;
      }, 0);
      const capexAlertCount = allCapex.filter(c => c.stato === 'pianificato' && (!c.duvri_urls || c.duvri_urls.length === 0) && !c.cse).length;

      setStats({
        prossimiAffitti: prossimiConDettagli.sort((a, b) => new Date(a.data_inizio) - new Date(b.data_inizio)),
        affittiCorrenti: affittiCorrentiConDettagli.sort((a, b) => new Date(a.data_fine) - new Date(b.data_fine)),
        gratuitiList: gratuitiList.sort((a, b) => new Date(a.data_inizio) - new Date(b.data_inizio)),
        spaziOccupati: spaziOccupatiOggi,
        spaziTotali: spazi.length,
        incassiMese,
        incassiAnno,
        budgetAnno,
        clientiTotali: clienti.length,
        affittoMedioGiornaliero,
        tassoOccupazioneAnnuale,
        taskStats,
        eventStats,
        tasksList,
        controlliList: controlliList || [],
        ticketsList: ticketsList || [],
        capexList: capexList || [],
        puliziePeriodiche: puliziePeriodiche || [],
        reportList: allReport?.slice(0, 5) || [],
        reportDaLeggere: user ? allReport.filter(r => !(r.letto_da || []).includes(user.email)).length : 0,
        pulizieDaLeggere: user ? allPulizieSegnalazioni.filter(p => !(p.letto_da || []).includes(user.email)).length : 0,
        fornitoriAlertCount,
        capexAlertCount
      });
    } catch (error) {
      console.error('Errore caricamento statistiche:', error);
    } finally {
      setLoading(false);
    }
  };

  const giorniMancanti = (dataStr) => {
    const oggi = new Date(); oggi.setHours(0,0,0,0);
    const data = new Date(dataStr); data.setHours(0,0,0,0);
    const diff = Math.round((data - oggi) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'oggi';
    if (diff === 1) return 'domani';
    return `tra ${diff}gg`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };

  const percentualeBudget = stats.budgetAnno > 0 
    ? ((stats.incassiAnno / stats.budgetAnno) * 100).toFixed(1)
    : 0;

  const percentualeOccupazione = stats.spaziTotali > 0
    ? ((stats.spaziOccupati / stats.spaziTotali) * 100).toFixed(0)
    : 0;

  if (!centroSelezionato || !centroSelezionato.id) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nessun centro commerciale assegnato</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="mb-4 sm:mb-6">
        {/* Desktop: titolo + pulsanti a sinistra, meteo + data a destra */}
        <div className="hidden sm:flex items-center gap-4">
          <div className="shrink-0 flex items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">Dashboard</h1>
              <p className="text-slate-600 text-xs sm:text-sm mt-0.5">{centroSelezionato?.nome}</p>
            </div>
            {user?.tipo_account === 'direttore' && (
              <div className="flex flex-col gap-1.5">
                {[
                  { label: 'Task', tipo: 'task', color: 'bg-blue-600 hover:bg-blue-700' },
                  { label: 'Controllo', tipo: 'controllo', color: 'bg-indigo-600 hover:bg-indigo-700' },
                  { label: 'Prenotazione', tipo: 'prenotazione', color: 'bg-green-600 hover:bg-green-700' },
                ].map(({ label, tipo, color }) => (
                  <button
                    key={label}
                    onClick={() => openQuickForm(tipo)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-xs font-medium transition-colors ${color}`}
                  >
                    <Plus className="w-3 h-3" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <WeatherWidget citta={centroSelezionato?.citta} provincia={centroSelezionato?.provincia} indirizzo={centroSelezionato?.indirizzo} inline />
          </div>
          <div className="shrink-0 hidden sm:flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl px-5 py-2.5 shadow-md min-w-[110px]">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              {new Date().toLocaleDateString('it-IT', { weekday: 'long' })}
            </p>
            <p className="text-3xl font-bold text-white leading-tight">
              {new Date().toLocaleDateString('it-IT', { day: 'numeric' })}
            </p>
            <p className="text-sm font-medium text-slate-300 capitalize">
              {new Date().toLocaleDateString('it-IT', { month: 'long' })}
            </p>
            <p className="text-xs text-slate-500">{new Date().getFullYear()}</p>
          </div>
        </div>
        {/* Mobile: titolo + data in alto, meteo sotto, pulsanti sotto al titolo */}
        <div className="sm:hidden space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
              <p className="text-slate-600 text-xs mt-0.5">{centroSelezionato?.nome}</p>
            </div>
            <div className="shrink-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl px-3 py-1.5 shadow-md min-w-[80px]">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                {new Date().toLocaleDateString('it-IT', { weekday: 'short' })}
              </p>
              <p className="text-xl font-bold text-white leading-tight">
                {new Date().toLocaleDateString('it-IT', { day: 'numeric' })}
              </p>
            </div>
          </div>
          <WeatherWidget citta={centroSelezionato?.citta} provincia={centroSelezionato?.provincia} indirizzo={centroSelezionato?.indirizzo} inline />
          {user?.tipo_account === 'direttore' && (
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Task', tipo: 'task', color: 'bg-blue-600 hover:bg-blue-700' },
                { label: 'Controllo', tipo: 'controllo', color: 'bg-indigo-600 hover:bg-indigo-700' },
                { label: 'Prenotazione', tipo: 'prenotazione', color: 'bg-green-600 hover:bg-green-700' },
              ].map(({ label, tipo, color }) => (
                <button
                  key={label}
                  onClick={() => openQuickForm(tipo)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors ${color}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pulsanti rapidi - solo vigilanza */}
      {user?.tipo_account === 'vigilanza' && (
        <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
          {[
            { label: 'Nuovo Task', tipo: 'task', color: 'bg-blue-600 hover:bg-blue-700' },
            { label: 'Nuovo Ticket', tipo: 'ticket', color: 'bg-orange-500 hover:bg-orange-600' },
            { label: 'Nuovo Controllo', tipo: 'controllo', color: 'bg-indigo-600 hover:bg-indigo-700' },
            { label: 'Nuovo Report', tipo: 'report', color: 'bg-emerald-600 hover:bg-emerald-700' },
            { label: 'Segnalazione Pulizie', tipo: 'pulizia', color: 'bg-purple-600 hover:bg-purple-700' },
          ].map(({ label, tipo, color }) => (
            <button
              key={label}
              onClick={() => openQuickForm(tipo)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors ${color}`}
            >
              <Plus className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Summary Cards - Responsive Grid */}
      {(user?.tipo_account === 'proprieta' || user?.tipo_account === 'direttore') && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
          {/* Allert Fornitori DUVRI */}
          <div className="bg-red-50 rounded-lg border border-red-200 p-3 sm:p-4 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer" onClick={() => navigate('/Fornitori')}>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide line-clamp-2">Allert Fornitori</p>
              <div className="bg-red-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0"><AlertCircle className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-red-600" /></div>
            </div>
            <p className={`text-lg sm:text-2xl font-bold ${stats.fornitoriAlertCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>{stats.fornitoriAlertCount}</p>
            {stats.fornitoriAlertCount > 0 && <p className="text-xs text-red-500 mt-1">DUVRI Mancanti</p>}
          </div>

          {/* Report da leggere */}
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-3 sm:p-4 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer" onClick={() => navigate('/Report')}>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide line-clamp-2">Report da Leggere</p>
              <div className="bg-emerald-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0"><BookOpen className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-600" /></div>
            </div>
            <p className={`text-lg sm:text-2xl font-bold ${stats.reportDaLeggere > 0 ? 'text-blue-600' : 'text-slate-900'}`}>{stats.reportDaLeggere}</p>
            {stats.reportDaLeggere > 0 && <p className="text-xs text-blue-500 mt-1">non letti</p>}
          </div>

          {/* Incassi Mese */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 sm:p-4 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide line-clamp-2">Incassi Mese</p>
              <div className="bg-blue-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0"><DollarSign className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-blue-600" /></div>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-slate-900 line-clamp-1">{formatCurrency(stats.incassiMese)}</p>
          </div>

          {/* Incassi Anno */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 sm:p-4 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide line-clamp-2">Incassi Anno</p>
              <div className="bg-blue-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0"><TrendingUp className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-blue-600" /></div>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-slate-900 line-clamp-1">{formatCurrency(stats.incassiAnno)}</p>
            <div className="mt-2 sm:mt-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-600">Budget</p>
                <p className="text-xs font-medium text-blue-600">{percentualeBudget}%</p>
              </div>
              <Progress value={Math.min(parseFloat(percentualeBudget), 100)} className="h-1.5 sm:h-2" />
            </div>
          </div>

          {/* Spazi Occupati */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 sm:p-4 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide line-clamp-2">Spazi Occupati</p>
              <div className="bg-blue-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0"><Building2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-blue-600" /></div>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-slate-900">{stats.spaziOccupati}/{stats.spaziTotali}</p>
            <div className="mt-2 sm:mt-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-600">Occupazione</p>
                <p className="text-xs font-medium text-blue-600">{percentualeOccupazione}%</p>
              </div>
              <Progress value={parseInt(percentualeOccupazione)} className="h-1.5 sm:h-2" />
            </div>
          </div>

          {/* Affitto Medio Giornaliero */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 sm:p-4 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide line-clamp-2">Affitto Med/Gg</p>
              <div className="bg-blue-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0"><BarChart2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-blue-600" /></div>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-slate-900 line-clamp-1">{formatCurrency(stats.affittoMedioGiornaliero)}</p>
            <div className="mt-2 sm:mt-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-600">Occupazione</p>
                <p className="text-xs font-medium text-blue-600">{stats.tassoOccupazioneAnnuale.toFixed(1)}%</p>
              </div>
              <Progress value={Math.min(stats.tassoOccupazioneAnnuale, 100)} className="h-1.5 sm:h-2" />
            </div>
          </div>

          {/* Allert Capex Scaduti */}
          <div className="bg-red-50 rounded-lg border border-red-200 p-3 sm:p-4 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer" onClick={() => navigate('/Capex')}>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide line-clamp-2">Allert Capex</p>
              <div className="bg-red-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0"><AlertCircle className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-red-600" /></div>
            </div>
            <p className={`text-lg sm:text-2xl font-bold ${stats.capexAlertCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>{stats.capexAlertCount}</p>
            {stats.capexAlertCount > 0 && <p className="text-xs text-red-500 mt-1">Duvri mancanti</p>}
          </div>

          {/* Segnalazioni Pulizie da leggere */}
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-3 sm:p-4 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer" onClick={() => navigate('/Pulizie')}>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide line-clamp-2">Seg. Pulizie Nuove</p>
              <div className="bg-blue-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0"><Sparkles className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-blue-500" /></div>
            </div>
            <p className={`text-lg sm:text-2xl font-bold ${stats.pulizieDaLeggere > 0 ? 'text-blue-600' : 'text-slate-900'}`}>{stats.pulizieDaLeggere}</p>
            {stats.pulizieDaLeggere > 0 && <p className="text-xs text-blue-500 mt-1">non lette</p>}
          </div>

          {/* Numero Eventi */}
          <div className="bg-purple-50 rounded-lg border border-purple-200 p-3 sm:p-4 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide line-clamp-2">N. Eventi</p>
              <div className="bg-purple-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0"><Sparkles className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-purple-600" /></div>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-slate-900">{stats.eventStats.numeroEventiAnno}</p>
          </div>

          {/* Giorni Evento */}
          <div className="bg-purple-50 rounded-lg border border-purple-200 p-3 sm:p-4 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide line-clamp-2">Giorni Evento</p>
              <div className="bg-orange-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0"><Calendar className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-orange-600" /></div>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-slate-900">{stats.eventStats.giorniEvento}</p>
          </div>

          {/* Costo Eventi */}
          <div className="bg-purple-50 rounded-lg border border-purple-200 p-3 sm:p-4 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide line-clamp-2">Costo Eventi</p>
              <div className="bg-red-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0"><DollarSign className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-red-600" /></div>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-slate-900 line-clamp-1">{formatCurrency(stats.eventStats.costoEventiAnno)}</p>
          </div>

          {/* Costo Medio Giorno Evento */}
          <div className="bg-purple-50 rounded-lg border border-purple-200 p-3 sm:p-4 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide line-clamp-2">Costo Med/Gg Ev</p>
              <div className="bg-green-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0"><Target className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-green-600" /></div>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-slate-900 line-clamp-1">{formatCurrency(stats.eventStats.costoMedioGiornoEvento)}</p>
          </div>
          </div>
          )}

          {/* Agenda Cards */}
          <AgendaCards
            stats={stats}
            onSelect={openDetail}
            onCompleteTask={handleCompleteTask}
            onCompleteControllo={handleCompleteControllo}
            completingIds={completingIds}
            fullHeight={user?.tipo_account === 'vigilanza'}
          />

          {/* Bottom cards - solo per non-vigilanza */}
          {user?.tipo_account !== 'vigilanza' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">

          {/* Capex */}
          <Card className="bg-white border-slate-200 shadow-xl hover:shadow-2xl transition-shadow">
            <CardHeader className="pb-2 sm:pb-3 cursor-pointer hover:bg-slate-50 rounded-t-lg transition-colors" onClick={() => navigate('/Capex')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardHat className="w-4 sm:w-5 h-4 sm:h-5 text-yellow-600" />
                  <CardTitle className="text-sm sm:text-base md:text-lg font-semibold text-slate-800">Capex Programmati</CardTitle>
                </div>
                <span className="text-xs text-blue-600 font-medium">Vai →</span>
              </div>
            </CardHeader>
            <CardContent className="max-h-64 sm:max-h-96 overflow-y-auto">
              {stats.capexList.length === 0 ? (
                <p className="text-slate-500 text-center py-3 text-xs sm:text-sm">Nessun Capex in programma</p>
              ) : (
                <div className="space-y-1.5 sm:space-y-2">
                  {stats.capexList.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2 sm:p-3 bg-yellow-50 rounded-lg border border-yellow-100 text-xs sm:text-sm cursor-pointer hover:brightness-95 transition-all" onClick={() => openDetail('capex', c)}>
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="font-medium text-slate-800 truncate">{c.titolo}</p>
                        {c.fornitore && <p className="text-xs text-slate-500 truncate">{c.fornitore}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        {c.data_inizio && (
                          <p className="text-xs whitespace-nowrap">
                            <span className="font-bold text-red-600">{giorniMancanti(c.data_inizio)}</span>
                            {' · '}
                            <span className="font-medium text-yellow-700">
                              {format(new Date(c.data_inizio), 'dd MMM', { locale: it })}
                              {c.data_fine ? ` → ${format(new Date(c.data_fine), 'dd MMM', { locale: it })}` : ''}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pulizie Periodiche */}
          <Card className="bg-white border-slate-200 shadow-xl hover:shadow-2xl transition-shadow">
            <CardHeader className="pb-2 sm:pb-3 cursor-pointer hover:bg-slate-50 rounded-t-lg transition-colors" onClick={() => navigate('/Pulizie')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 sm:w-5 h-4 sm:h-5 text-blue-500" />
                  <CardTitle className="text-sm sm:text-base md:text-lg font-semibold text-slate-800">Pulizie Periodiche</CardTitle>
                </div>
                <span className="text-xs text-blue-600 font-medium">Vai →</span>
              </div>
            </CardHeader>
            <CardContent className="max-h-64 sm:max-h-96 overflow-y-auto">
              {stats.puliziePeriodiche.length === 0 ? (
                <p className="text-slate-500 text-center py-3 text-xs sm:text-sm">Nessuna pulizia da programmare</p>
              ) : (
                <div className="space-y-1.5 sm:space-y-2">
                  {stats.puliziePeriodiche.map(p => {
                    const isProgrammato = p.stato === 'programmato';
                    return (
                      <div key={p.id} className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border text-xs sm:text-sm cursor-pointer hover:brightness-95 transition-all ${isProgrammato ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`} onClick={() => openDetail('pulizia_periodica', p)}>
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="font-medium text-slate-800 truncate">{p.titolo}</p>
                          <p className="text-xs text-slate-500">{p.frequenza}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isProgrammato ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            {isProgrammato ? 'Programmato' : 'Da programmare'}
                          </span>
                          {p.prossima_scadenza && (
                            <p className="text-xs whitespace-nowrap mt-0.5">
                              <span className="font-bold text-red-600">{giorniMancanti(p.prossima_scadenza)}</span>
                              {' · '}
                              <span className="text-slate-500">{format(new Date(p.prossima_scadenza), 'dd MMM', { locale: it })}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ticket */}
          <Card className="bg-white border-slate-200 shadow-xl hover:shadow-2xl transition-shadow">
          <CardHeader className="pb-2 sm:pb-3 cursor-pointer hover:bg-slate-50 rounded-t-lg transition-colors" onClick={() => navigate('/Ticket')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 sm:w-5 h-4 sm:h-5 text-orange-600" />
                <CardTitle className="text-sm sm:text-base md:text-lg font-semibold text-slate-800">Ticket</CardTitle>
              </div>
              <span className="text-xs text-blue-600 font-medium">Vai →</span>
            </div>
          </CardHeader>
          <CardContent className="max-h-64 sm:max-h-96 overflow-y-auto">
            {(() => {
              const oggi = new Date(); oggi.setHours(0,0,0,0);
              const aperti = stats.ticketsList.filter(t => t.stato !== 'chiuso');
              if (aperti.length === 0) return <p className="text-slate-500 text-center py-3 text-xs sm:text-sm">Nessun ticket aperto</p>;

              const scaduti = aperti.filter(t => t.scadenza && new Date(t.scadenza) < oggi);
              const inCorso = aperti.filter(t => !t.scadenza || new Date(t.scadenza) >= oggi);

              const TicketCard = ({ t, isScaduto }) => (
                <div key={t.id} className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border text-xs sm:text-sm cursor-pointer hover:brightness-95 transition-all ${isScaduto ? 'bg-red-50 border-red-200' : t.tipologia === 'urgente' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-100'}`} onClick={() => openDetail('ticket', t)}>
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="font-medium text-slate-800 truncate">#{t.numero_ticket} · Solleciti: {t.numero_sollecito || 0}</p>
                    <p className="text-xs text-slate-500 truncate">{t.descrizione}</p>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${t.tipologia === 'urgente' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    {t.tipologia}
                  </span>
                </div>
              );

              return (
                <div className="space-y-4">
                  {scaduti.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">⚠️ Scaduti</h4>
                      <div className="space-y-1.5 sm:space-y-2">{scaduti.map(t => <TicketCard key={t.id} t={t} isScaduto={true} />)}</div>
                    </div>
                  )}
                  {inCorso.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">🔧 In corso</h4>
                      <div className="space-y-1.5 sm:space-y-2">{inCorso.map(t => <TicketCard key={t.id} t={t} />)}</div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
          </Card>

          {/* Eventi */}
          <Card className="bg-white border-slate-200 shadow-xl hover:shadow-2xl transition-shadow">
          <CardHeader className="pb-2 sm:pb-3 cursor-pointer hover:bg-slate-50 rounded-t-lg transition-colors" onClick={() => navigate('/Calendario')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 text-purple-600" />
                <CardTitle className="text-sm sm:text-base md:text-lg font-semibold text-slate-800">Eventi</CardTitle>
              </div>
              <span className="text-xs text-blue-600 font-medium">Vai →</span>
            </div>
          </CardHeader>
          <CardContent className="max-h-64 sm:max-h-96 overflow-y-auto">
            {stats.eventStats.eventiCorrentiList?.length === 0 && stats.eventStats.prossimiEventi.length === 0 ? (
              <p className="text-slate-500 text-center py-3 sm:py-4 text-xs sm:text-sm">
                Nessun evento in corso o in programma
              </p>
            ) : (
              <div className="space-y-1.5 sm:space-y-2">
                {stats.eventStats.eventiCorrentiList?.map((evento) => (
                  <div 
                    key={evento.id}
                    className="flex items-center justify-between p-2 sm:p-3 bg-purple-100 rounded-lg border border-purple-200 text-xs sm:text-sm cursor-pointer hover:brightness-95 transition-all"
                    onClick={() => openDetail('prenotazione', evento)}
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-medium text-slate-800 truncate text-xs sm:text-sm">
                        {evento.nome_evento || evento.cliente?.ragione_sociale || 'N.A.'}
                      </p>
                      <p className="text-xs text-purple-700 font-medium">
                        ✦ In corso
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-slate-700 whitespace-nowrap">{format(new Date(evento.data_inizio), 'dd MMM', { locale: it })} - {format(new Date(evento.data_fine), 'dd MMM', { locale: it })}</p>
                      </div>
                      </div>
                      ))}
                      {stats.eventStats.prossimiEventi.map((evento) => (
                      <div 
                      key={evento.id}
                      className="flex items-center justify-between p-2 sm:p-3 bg-purple-50 rounded-lg border border-purple-100 text-xs sm:text-sm cursor-pointer hover:brightness-95 transition-all"
                      onClick={() => openDetail('prenotazione', evento)}
                      >
                      <div className="flex-1 min-w-0 mr-2">
                      <p className="font-medium text-slate-800 truncate text-xs sm:text-sm">
                        {evento.nome_evento || evento.cliente?.ragione_sociale || 'N.A.'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Prossimo
                      </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs whitespace-nowrap"><span className="font-bold text-red-600">{giorniMancanti(evento.data_inizio)}</span> · <span className="font-medium text-slate-700">{format(new Date(evento.data_inizio), 'dd MMM', { locale: it })} - {format(new Date(evento.data_fine), 'dd MMM', { locale: it })}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          </Card>

          {/* Affitti Correnti */}
          <Card className="bg-white border-slate-200 shadow-xl hover:shadow-2xl transition-shadow">
          <CardHeader className="pb-2 sm:pb-3 cursor-pointer hover:bg-slate-50 rounded-t-lg transition-colors" onClick={() => navigate('/Calendario')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 sm:w-5 h-4 sm:h-5 text-green-600" />
                <CardTitle className="text-sm sm:text-base md:text-lg font-semibold text-slate-800">Affitti Correnti</CardTitle>
              </div>
              <span className="text-xs text-blue-600 font-medium">Vai →</span>
            </div>
          </CardHeader>
          <CardContent className="max-h-64 sm:max-h-96 overflow-y-auto">
            {stats.affittiCorrenti?.length === 0 ? (
              <p className="text-slate-500 text-center py-3 sm:py-4 text-xs sm:text-sm">
                Nessun affitto attivo al momento
              </p>
            ) : (
              <div className="space-y-1.5 sm:space-y-2">
                {stats.affittiCorrenti?.map((prenotazione) => (
                  <div 
                    key={prenotazione.id}
                    className="flex items-center justify-between p-2 sm:p-3 bg-green-50 rounded-lg border border-green-100 text-xs sm:text-sm cursor-pointer hover:brightness-95 transition-all"
                    onClick={() => openDetail('prenotazione', prenotazione)}
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-medium text-slate-800 truncate text-xs sm:text-sm">
                        {prenotazione.cliente?.ragione_sociale}
                      </p>
                      <p className="text-xs text-slate-600">
                        Spazio {prenotazione.spazio?.numero_spazio}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs whitespace-nowrap"><span className="font-bold text-red-600">scade {giorniMancanti(prenotazione.data_fine)}</span> · <span className="font-medium text-slate-700">{format(new Date(prenotazione.data_inizio), 'dd MMM', { locale: it })} - {format(new Date(prenotazione.data_fine), 'dd MMM', { locale: it })}</span></p>
                    </div>
                    </div>
                    ))}
                    </div>
                    )}
                    </CardContent>
                    </Card>

                    {/* Prossimi Affitti */}
                    <Card className="bg-white border-slate-200 shadow-xl hover:shadow-2xl transition-shadow">
                    <CardHeader className="pb-2 sm:pb-3 cursor-pointer hover:bg-slate-50 rounded-t-lg transition-colors" onClick={() => navigate('/Calendario')}>
                    <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                    <Calendar className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600" />
                    <CardTitle className="text-sm sm:text-base md:text-lg font-semibold text-slate-800">Prossimi Affitti</CardTitle>
                    </div>
                    <span className="text-xs text-blue-600 font-medium">Vai →</span>
                    </div>
                    </CardHeader>
                    <CardContent className="max-h-64 sm:max-h-96 overflow-y-auto">
                    {stats.prossimiAffitti.length === 0 ? (
                    <p className="text-slate-500 text-center py-3 sm:py-4 text-xs sm:text-sm">
                    Nessun affitto nei prossimi 30 giorni
                    </p>
                    ) : (
                    <div className="space-y-1.5 sm:space-y-2">
                    {stats.prossimiAffitti.map((prenotazione) => (
                    <div 
                     key={prenotazione.id}
                     className="flex items-center justify-between p-2 sm:p-3 bg-slate-50 rounded-lg text-xs sm:text-sm cursor-pointer hover:bg-slate-100 transition-all"
                     onClick={() => openDetail('prenotazione', prenotazione)}
                    >
                     <div className="flex-1 min-w-0 mr-2">
                       <p className="font-medium text-slate-800 truncate text-xs sm:text-sm">
                         {prenotazione.cliente?.ragione_sociale}
                       </p>
                       <p className="text-xs text-slate-600">
                         Spazio {prenotazione.spazio?.numero_spazio}
                       </p>
                       </div>
                       <div className="text-right shrink-0">
                       <p className="text-xs whitespace-nowrap"><span className="font-bold text-red-600">{giorniMancanti(prenotazione.data_inizio)}</span> · <span className="font-medium text-slate-700">{format(new Date(prenotazione.data_inizio), 'dd MMM', { locale: it })} - {format(new Date(prenotazione.data_fine), 'dd MMM', { locale: it })}</span></p>
                       </div>
                       </div>
                       ))}
                       </div>
                       )}
                       </CardContent>
                       </Card>
                       </div>
          )}

      <DashboardDetailModal
        open={detailModal.open}
        onClose={closeDetail}
        type={detailModal.type}
        item={detailModal.item}
        user={user}
      />

      {/* Quick forms */}
      <FormTask
        open={quickForm === 'task'}
        onClose={() => setQuickForm(null)}
        onSave={handleQuickTaskSave}
        task={null}
        user={user}
        centri={quickCentri}
        direttori={quickDirettori}
        vigilanze={quickVigilanze}
        centroDefault={centroSelezionato?.id !== 'tutti' ? centroSelezionato?.id : null}
      />
      <FormTicket
        open={quickForm === 'ticket'}
        onClose={() => setQuickForm(null)}
        onSave={handleQuickTicketSave}
        ticket={null}
        user={user}
      />
      <QuickFormControllo
        open={quickForm === 'controllo'}
        onClose={() => setQuickForm(null)}
        onSaved={() => {}}
        centroSelezionato={centroSelezionato}
        user={user}
      />
      <QuickFormReport
        open={quickForm === 'report'}
        onClose={() => setQuickForm(null)}
        onSaved={() => {}}
        centroSelezionato={centroSelezionato}
        user={user}
      />
      <FormPulizia
        open={quickForm === 'pulizia'}
        onClose={() => setQuickForm(null)}
        pulizia={null}
        centroId={centroSelezionato?.id !== 'tutti' ? centroSelezionato?.id : ''}
        user={user}
        onSave={() => setQuickForm(null)}
      />
      <QuickFormPrenotazione
        open={quickForm === 'prenotazione'}
        onClose={() => setQuickForm(null)}
        centroSelezionato={centroSelezionato}
        user={user}
      />
    </div>
  );
}