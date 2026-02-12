import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  Calendar, 
  Building2, 
  DollarSign, 
  Users,
  Target
} from 'lucide-react';
import { format, addMonths, isWithinInterval, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Dashboard({ centroSelezionato }) {
  const [stats, setStats] = useState({
    prossimiAffitti: [],
    affittiCorrenti: [],
    spaziOccupati: 0,
    spaziTotali: 0,
    incassiMese: 0,
    incassiAnno: 0,
    budgetAnno: 0,
    clientiTotali: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (centroSelezionato) {
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

      // Affitti correnti (in corso oggi)
      const affittiCorrentiList = prenotazioni.filter(p => {
        const dataInizio = new Date(p.data_inizio);
        const dataFine = new Date(p.data_fine);
        return isWithinInterval(now, { start: dataInizio, end: dataFine }) && 
               p.stato !== 'cancellata';
      });

      // Prossimi affitti (prossimo mese, esclusi quelli già in corso)
      const prossimiAffitti = prenotazioni.filter(p => {
        const dataInizio = new Date(p.data_inizio);
        return dataInizio > now &&
               isWithinInterval(dataInizio, { start: now, end: unMeseDopo }) && 
               p.stato !== 'cancellata';
      }).slice(0, 5);

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

      // Spazi occupati (prenotazioni attive oggi)
      const spaziOccupatiOggi = prenotazioni.filter(p => {
        const dataInizio = new Date(p.data_inizio);
        const dataFine = new Date(p.data_fine);
        return isWithinInterval(now, { start: dataInizio, end: dataFine }) && 
               p.stato !== 'cancellata';
      }).length;

      // Spazi totali
      const spazi = centroSelezionato?.id === 'tutti'
        ? await base44.entities.SpazioExpo.filter({ attivo: true })
        : await base44.entities.SpazioExpo.filter({ 
            centro_id: centroSelezionato.id,
            attivo: true 
          });

      // Incassi mese
      const incassiMese = prenotazioni
        .filter(p => {
          const dataInizio = new Date(p.data_inizio);
          return isWithinInterval(dataInizio, { start: inizioMese, end: fineMese }) && 
                 p.stato !== 'cancellata';
        })
        .reduce((sum, p) => sum + (p.prezzo_totale || 0), 0);

      // Incassi anno
      const incassiAnno = prenotazioni
        .filter(p => {
          const dataInizio = new Date(p.data_inizio);
          return dataInizio >= inizioAnno && p.stato !== 'cancellata';
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
      
      setStats({
        prossimiAffitti: prossimiConDettagli,
        affittiCorrenti: affittiCorrentiConDettagli,
        spaziOccupati: spaziOccupatiOggi,
        spaziTotali: spazi.length,
        incassiMese,
        incassiAnno,
        budgetAnno,
        clientiTotali: clienti.length
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
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Dashboard</h1>
        <p className="text-slate-600">{centroSelezionato?.nome}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Spazi Occupati */}
        <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                Spazi Affittati
              </CardTitle>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800 mb-2">
              {stats.spaziOccupati} / {stats.spaziTotali}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                  style={{ width: `${percentualeOccupazione}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-blue-600">{percentualeOccupazione}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Incassi Mese */}
        <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                Incassi Mese
              </CardTitle>
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800 mb-2">
              {formatCurrency(stats.incassiMese)}
            </div>
            <p className="text-xs text-slate-500">
              {format(new Date(), 'MMMM yyyy', { locale: it })}
            </p>
          </CardContent>
        </Card>

        {/* Incassi Anno / Budget */}
        <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                Incassi Anno / Budget
              </CardTitle>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800 mb-2">
              {formatCurrency(stats.incassiAnno)}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all"
                  style={{ width: `${Math.min(percentualeBudget, 100)}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-emerald-600">{percentualeBudget}%</span>
            </div>
            <p className="text-xs text-slate-500">
              Budget: {formatCurrency(stats.budgetAnno)}
            </p>
          </CardContent>
        </Card>

        {/* Clienti Totali */}
        <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                Clienti Totali
              </CardTitle>
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">
              {stats.clientiTotali}
            </div>
          </CardContent>
        </Card>

        {/* Affitti Correnti */}
        <Card className="md:col-span-2 bg-white border-slate-200 hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <CardTitle className="text-lg font-semibold text-slate-800">
                Affitti Correnti
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {stats.affittiCorrenti?.length === 0 ? (
              <p className="text-slate-500 text-center py-4">
                Nessun affitto attivo al momento
              </p>
            ) : (
              <div className="space-y-3">
                {stats.affittiCorrenti?.map((prenotazione) => (
                  <div 
                    key={prenotazione.id}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100 hover:bg-green-100 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">
                        {prenotazione.cliente?.ragione_sociale}
                      </p>
                      <p className="text-sm text-slate-600">
                        Spazio {prenotazione.spazio?.numero_spazio}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">
                        {format(new Date(prenotazione.data_inizio), 'dd MMM', { locale: it })} - {format(new Date(prenotazione.data_fine), 'dd MMM yyyy', { locale: it })}
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
        <Card className="md:col-span-2 bg-white border-slate-200 hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg font-semibold text-slate-800">
                Prossimi Affitti (1 Mese)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {stats.prossimiAffitti.length === 0 ? (
              <p className="text-slate-500 text-center py-4">
                Nessun affitto nei prossimi 30 giorni
              </p>
            ) : (
              <div className="space-y-3">
                {stats.prossimiAffitti.map((prenotazione) => (
                  <div 
                    key={prenotazione.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">
                        {prenotazione.cliente?.ragione_sociale}
                      </p>
                      <p className="text-sm text-slate-600">
                        Spazio {prenotazione.spazio?.numero_spazio}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">
                        {format(new Date(prenotazione.data_inizio), 'dd MMM', { locale: it })} - {format(new Date(prenotazione.data_fine), 'dd MMM yyyy', { locale: it })}
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