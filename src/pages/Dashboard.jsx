import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Sparkles
} from 'lucide-react';
import { format, addMonths, isWithinInterval, startOfMonth, endOfMonth, startOfYear, endOfYear, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import TasksDashboard from '@/components/dashboard/TasksDashboard';

export default function Dashboard({ centroSelezionato }) {
  const [stats, setStats] = useState({
    prossimiAffitti: [],
    affittiCorrenti: [],
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
    tasksList: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (centroSelezionato && centroSelezionato.id) {
      loadStats();
    }
  }, [centroSelezionato]);

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

      // Carica tutte le prenotazioni del centro (o tutti i centri se selezionato "Tutti")
      const prenotazioni = centroSelezionato?.id === 'tutti'
        ? await base44.entities.Prenotazione.list()
        : await base44.entities.Prenotazione.filter({ centro_id: centroSelezionato.id });

      // Affitti correnti (in corso oggi) - escludi eventi
      const affittiCorrentiList = prenotazioni.filter(p => {
        const dataInizio = new Date(p.data_inizio);
        const dataFine = new Date(p.data_fine);
        return !p.is_event && isWithinInterval(now, { start: dataInizio, end: dataFine }) && 
               p.stato !== 'cancellata';
      });

      // Prossimi affitti (prossimo mese, esclusi quelli già in corso e gli eventi)
      const prossimiAffitti = prenotazioni.filter(p => {
        const dataInizio = new Date(p.data_inizio);
        return !p.is_event && dataInizio > now &&
               isWithinInterval(dataInizio, { start: now, end: unMeseDopo }) && 
               p.stato !== 'cancellata';
      });

      // Arricchisci con dati cliente e spazio
      const [prossimiConDettagli, affittiCorrentiConDettagli] = await Promise.all([
        Promise.all(prossimiAffitti.map(async (p) => {
          const [cliente, spazio] = await Promise.all([
            base44.entities.Cliente.filter({ id: p.cliente_id }).then(r => r[0]),
            base44.entities.SpazioExpo.filter({ id: p.spazio_id }).then(r => r[0])
          ]);
          return { ...p, cliente, spazio };
        })),
        Promise.all(affittiCorrentiList.map(async (p) => {
          const [cliente, spazio] = await Promise.all([
            base44.entities.Cliente.filter({ id: p.cliente_id }).then(r => r[0]),
            base44.entities.SpazioExpo.filter({ id: p.spazio_id }).then(r => r[0])
          ]);
          return { ...p, cliente, spazio };
        }))
      ]);

      // Spazi occupati (prenotazioni attive oggi) - escludi eventi
      const spaziOccupatiOggi = prenotazioni.filter(p => {
        const dataInizio = new Date(p.data_inizio);
        const dataFine = new Date(p.data_fine);
        return !p.is_event && isWithinInterval(now, { start: dataInizio, end: dataFine }) && 
               p.stato !== 'cancellata';
      }).length;

      // Spazi totali
      const spazi = centroSelezionato?.id === 'tutti'
        ? await base44.entities.SpazioExpo.filter({ attivo: true })
        : await base44.entities.SpazioExpo.filter({ 
            centro_id: centroSelezionato.id,
            attivo: true 
          });

      // Incassi mese - escludi eventi
      const incassiMese = prenotazioni
        .filter(p => {
          const dataInizio = new Date(p.data_inizio);
          return !p.is_event && isWithinInterval(dataInizio, { start: inizioMese, end: fineMese }) && 
                 p.stato !== 'cancellata';
        })
        .reduce((sum, p) => sum + (p.prezzo_totale || 0), 0);

      // Incassi anno - escludi eventi
      const incassiAnno = prenotazioni
        .filter(p => {
          const dataInizio = new Date(p.data_inizio);
          return !p.is_event && dataInizio >= inizioAnno && p.stato !== 'cancellata';
        })
        .reduce((sum, p) => sum + (p.prezzo_totale || 0), 0);

      // Budget anno
      const budgets = centroSelezionato?.id === 'tutti'
        ? await base44.entities.Budget.filter({ anno: anno })
        : await base44.entities.Budget.filter({ 
            centro_id: centroSelezionato.id,
            anno: anno
          });
      const budgetAnno = centroSelezionato?.id === 'tutti'
        ? budgets.reduce((sum, b) => sum + (b.importo_budget || 0), 0)
        : budgets[0]?.importo_budget || 0;

      // Clienti totali
      const clienti = await base44.entities.Cliente.list();

      // Task statistics
      const tasksList = centroSelezionato?.id === 'tutti'
        ? await base44.entities.Task.list()
        : await base44.entities.Task.filter({ centro_id: centroSelezionato.id });
      
      const taskStats = {
        urgenti: tasksList.filter(t => t.priorita === 'urgente' && t.stato !== 'completato' && t.stato !== 'annullato').length,
        inCorso: tasksList.filter(t => t.stato === 'in_corso').length,
        completati: tasksList.filter(t => t.stato === 'completato').length,
        totali: tasksList.length
      };

      // Event statistics
      const allPrenotazioni = centroSelezionato?.id === 'tutti'
        ? await base44.entities.Prenotazione.list()
        : await base44.entities.Prenotazione.filter({ centro_id: centroSelezionato.id });
      
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const eventiCorrenti = allPrenotazioni.filter(p => p.is_event && p.stato !== 'cancellata' && new Date(p.data_inizio) <= hoje && new Date(p.data_fine) >= hoje);
      const prossimiEventi = allPrenotazioni.filter(p => p.is_event && p.stato !== 'cancellata' && new Date(p.data_inizio) > hoje).sort((a, b) => new Date(a.data_inizio) - new Date(b.data_inizio)).slice(0, 3);
      
      let giorniEvento = 0;
      allPrenotazioni.forEach(p => {
        if (p.is_event && (p.stato === 'confermata' || p.stato === 'in_corso')) {
          const inizio = new Date(p.data_inizio);
          const fine = new Date(p.data_fine);
          const giorni = Math.ceil((fine - inizio) / (1000 * 60 * 60 * 24)) + 1;
          giorniEvento += giorni;
        }
      });

      const eventStats = {
        giorniEvento,
        eventiCorrenti: eventiCorrenti.length,
        prossimiEventi
      };

      // Affitto medio giornaliero (solo prenotazioni non cancellate con durata > 0)
      const prenotazioniValide = prenotazioni.filter(p => p.stato !== 'cancellata' && p.prezzo_totale > 0);
      let affittoMedioGiornaliero = 0;
      if (prenotazioniValide.length > 0) {
        const totaleGiorni = prenotazioniValide.reduce((sum, p) => {
          const giorni = differenceInDays(new Date(p.data_fine), new Date(p.data_inizio)) + 1;
          return sum + Math.max(giorni, 1);
        }, 0);
        const totalePrezzi = prenotazioniValide.reduce((sum, p) => sum + (p.prezzo_totale || 0), 0);
        affittoMedioGiornaliero = totalePrezzi / totaleGiorni;
      }

      // Tasso di occupazione annuale (giorni occupati / (spazi * giorni anno) * 100)
      const inizioAnnoDate = startOfYear(now);
      const fineAnnoDate = endOfYear(now);
      const giorniAnno = differenceInDays(fineAnnoDate, inizioAnnoDate) + 1;
      const totaleGiorniDisponibili = spazi.length * giorniAnno;
      let tassoOccupazioneAnnuale = 0;
      if (totaleGiorniDisponibili > 0) {
        const giorniOccupati = prenotazioni
          .filter(p => p.stato !== 'cancellata')
          .reduce((sum, p) => {
            const inizio = new Date(Math.max(new Date(p.data_inizio), inizioAnnoDate));
            const fine = new Date(Math.min(new Date(p.data_fine), fineAnnoDate));
            const giorni = differenceInDays(fine, inizio) + 1;
            return sum + Math.max(giorni, 0);
          }, 0);
        tassoOccupazioneAnnuale = (giorniOccupati / totaleGiorniDisponibili) * 100;
      }

      // Enrich tasks with additional data if needed
      const tasksConDettagli = await Promise.all(
        tasksList.map(async (t) => {
          if (t.assegnato_a_email && !t.assegnato_a_nome) {
            const [utente] = await Promise.all([
              base44.entities.User.filter({ email: t.assegnato_a_email })
            ]);
            return { ...t, assegnato_a_nome: utente?.[0]?.full_name };
          }
          return t;
        })
      );

      setStats({
        prossimiAffitti: prossimiConDettagli,
        affittiCorrenti: affittiCorrentiConDettagli,
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
        tasksList: tasksConDettagli
      });
    } catch (error) {
      console.error('Errore caricamento statistiche:', error);
    } finally {
      setLoading(false);
    }
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
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-1">Dashboard</h1>
        <p className="text-slate-600 text-sm">{centroSelezionato?.nome}</p>
      </div>

      {/* Stats Grid - 2 cols on mobile, 3 on md, 7 on lg */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 md:gap-6 mb-6">
        {/* Spazi Occupati */}
        <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow col-span-1">
          <CardHeader className="pb-2 p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-slate-600 leading-tight">
                Spazi affittati
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-800 mb-2">
              {stats.spaziOccupati} / {stats.spaziTotali}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                  style={{ width: `${percentualeOccupazione}%` }}
                ></div>
              </div>
              <span className="text-xs font-medium text-blue-600">{percentualeOccupazione}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Incassi Mese */}
        <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow col-span-1">
          <CardHeader className="pb-2 p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-slate-600 leading-tight">
                Incassi Mese
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold text-slate-800 mb-1">
              {formatCurrency(stats.incassiMese)}
            </div>
            <p className="text-xs text-slate-500">
              {format(new Date(), 'MMM yyyy', { locale: it })}
            </p>
          </CardContent>
        </Card>

        {/* Incassi Anno / Budget */}
        <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow col-span-1">
          <CardHeader className="pb-2 p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-slate-600 leading-tight">
                Incassi Anno
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold text-slate-800 mb-1">
              {formatCurrency(stats.incassiAnno)}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all"
                  style={{ width: `${Math.min(percentualeBudget, 100)}%` }}
                ></div>
              </div>
              <span className="text-xs font-medium text-emerald-600">{percentualeBudget}%</span>
            </div>
            <p className="text-xs text-slate-500 truncate">
              Budget: {formatCurrency(stats.budgetAnno)}
            </p>
          </CardContent>
        </Card>

        {/* Affitto Medio Giornaliero */}
        <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow col-span-1">
          <CardHeader className="pb-2 p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-slate-600 leading-tight">
                Affitto Medio / gg
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                <BarChart2 className="w-4 h-4 text-orange-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold text-slate-800 mb-1">
              {formatCurrency(stats.affittoMedioGiornaliero)}
            </div>
            <p className="text-xs text-slate-500">Media affitti</p>
          </CardContent>
        </Card>

        {/* Tasso Occupazione Annuale */}
        <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow col-span-1">
          <CardHeader className="pb-2 p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-slate-600 leading-tight">
                Tasso Occupaz.
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                <Percent className="w-4 h-4 text-teal-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold text-slate-800 mb-2">
              {stats.tassoOccupazioneAnnuale.toFixed(1)}%
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all"
                  style={{ width: `${Math.min(stats.tassoOccupazioneAnnuale, 100)}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Giorni Evento Anno */}
        <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow col-span-1">
          <CardHeader className="pb-2 p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-slate-600 leading-tight">
                Giorni Evento
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-800">
              {stats.eventStats.giorniEvento}
            </div>
            <p className="text-xs text-slate-500 mt-2">Anno in corso</p>
          </CardContent>
        </Card>

        {/* Clienti Totali */}
        <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow col-span-1">
          <CardHeader className="pb-2 p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-slate-600 leading-tight">
                Clienti Totali
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-violet-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-800">
              {stats.clientiTotali}
            </div>
            <p className="text-xs text-slate-500 mt-2">Clienti registrati</p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom cards - 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Task per Giorno */}
        <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-slate-600" />
              <CardTitle className="text-base md:text-lg font-semibold text-slate-800">
                Task
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            <TasksDashboard tasks={stats.tasksList} />
          </CardContent>
        </Card>

        {/* Prossimi Eventi */}
        <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-base md:text-lg font-semibold text-slate-800">
                Prossimi Eventi
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {stats.eventStats.prossimiEventi.length === 0 ? (
              <p className="text-slate-500 text-center py-4 text-sm">
                Nessun evento nei prossimi giorni
              </p>
            ) : (
              <div className="space-y-2">
                {stats.eventStats.prossimiEventi.map((evento) => (
                  <div 
                    key={evento.id}
                    className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100"
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-medium text-slate-800 text-sm truncate">
                        {evento.cliente?.ragione_sociale || 'N.A.'}
                      </p>
                      <p className="text-xs text-slate-600">
                        {stats.eventStats.eventiCorrenti > 0 && evento.data_inizio === new Date().toISOString().split('T')[0] ? 'In corso' : 'Prossimo'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-slate-700">
                        {format(new Date(evento.data_inizio), 'dd MMM', { locale: it })} - {format(new Date(evento.data_fine), 'dd MMM', { locale: it })}
                      </p>
                      <p className="text-sm font-semibold text-purple-600">
                        {stats.eventStats.giorniEvento} giorni
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Affitti Correnti */}
        <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <CardTitle className="text-base md:text-lg font-semibold text-slate-800">
                Affitti Correnti
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {stats.affittiCorrenti?.length === 0 ? (
              <p className="text-slate-500 text-center py-4 text-sm">
                Nessun affitto attivo al momento
              </p>
            ) : (
              <div className="space-y-2">
                {stats.affittiCorrenti?.map((prenotazione) => (
                  <div 
                    key={prenotazione.id}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100"
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-medium text-slate-800 text-sm truncate">
                        {prenotazione.cliente?.ragione_sociale}
                      </p>
                      <p className="text-xs text-slate-600">
                        Spazio {prenotazione.spazio?.numero_spazio}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-slate-700">
                        {format(new Date(prenotazione.data_inizio), 'dd MMM', { locale: it })} - {format(new Date(prenotazione.data_fine), 'dd MMM', { locale: it })}
                      </p>
                      <p className="text-sm font-semibold text-green-600">
                        {formatCurrency(prenotazione.prezzo_totale)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prossimi Affitti */}
        <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base md:text-lg font-semibold text-slate-800">
                Prossimi Affitti (1 Mese)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {stats.prossimiAffitti.length === 0 ? (
              <p className="text-slate-500 text-center py-4 text-sm">
                Nessun affitto nei prossimi 30 giorni
              </p>
            ) : (
              <div className="space-y-2">
                {stats.prossimiAffitti.map((prenotazione) => (
                  <div 
                    key={prenotazione.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-medium text-slate-800 text-sm truncate">
                        {prenotazione.cliente?.ragione_sociale}
                      </p>
                      <p className="text-xs text-slate-600">
                        Spazio {prenotazione.spazio?.numero_spazio}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-slate-700">
                        {format(new Date(prenotazione.data_inizio), 'dd MMM', { locale: it })} - {format(new Date(prenotazione.data_fine), 'dd MMM', { locale: it })}
                      </p>
                      <p className="text-sm font-semibold text-green-600">
                        {formatCurrency(prenotazione.prezzo_totale)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}