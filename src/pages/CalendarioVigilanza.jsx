import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import CalendarioVigilanzaMensile from '@/components/calendario/CalendarioVigilanzaMensile';
import CalendarioVigilanzaSettimanale from '@/components/calendario/CalendarioVigilanzaSettimanale';
import { Building2, ChevronDown, CalendarDays, Calendar } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { differenceInDays } from 'date-fns';

export default function CalendarioVigilanza({ centroSelezionato: centroFromLayout, user }) {
  const [prenotazioni, setPrenotazioni] = useState([]);
  const [spazi, setSpazi] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [vista, setVista] = useState('settimanale');
  const [loading, setLoading] = useState(true);
  const [nascondiPermanenti, setNascondiPermanenti] = useState(false);
  const [soloEventi, setSoloEventi] = useState(false);
  const [centri, setCentri] = useState([]);
  const [centroSelezionato, setCentroSelezionato] = useState(null);

  const loadCentroData = async (centro) => {
    setLoading(true);
    const [prenotaz, spaziData, clientiData] = await Promise.all([
      base44.entities.Prenotazione.filter({ centro_id: centro.id }),
      base44.entities.SpazioExpo.filter({ centro_id: centro.id }),
      base44.entities.Cliente.filter({ centro_id: centro.id }),
    ]);
    setPrenotazioni(prenotaz);
    setSpazi(spaziData);
    setClienti(clientiData);
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      // Se l'utente è vigilanza, usa i centri assegnati passati dal layout
      if (user?.tipo_account === 'vigilanza') {
        if (centroFromLayout) {
          // Carica tutti i centri assegnati tramite assegnazioni
          const assegnazioni = await base44.entities.Assegnazione.filter({ user_email: user.email });
          const centriIds = [...new Set(assegnazioni.map(a => a.centro_id))];
          const allCentri = await base44.entities.CentroCommerciale.list();
          const centriAssegnati = allCentri.filter(c => centriIds.includes(c.id) && c.attivo);
          setCentri(centriAssegnati);
          const savedId = localStorage.getItem('vigilanza_centro_id');
          const centro = centriAssegnati.find(c => c.id === savedId) || centroFromLayout;
          setCentroSelezionato(centro);
          await loadCentroData(centro);
        } else {
          setLoading(false);
        }
      } else {
        // Proprietà o direttore: vede tutti i centri
        const allCentri = await base44.entities.CentroCommerciale.list();
        setCentri(allCentri);
        if (allCentri.length > 0) {
          const savedId = localStorage.getItem('vigilanza_centro_id');
          const centro = allCentri.find(c => c.id === savedId) || allCentri[0];
          setCentroSelezionato(centro);
          await loadCentroData(centro);
        } else {
          setLoading(false);
        }
      }
    };
    init();
  }, [user]);

  const handleCentroChange = async (centroId) => {
    const centro = centri.find(c => c.id === centroId);
    if (!centro) return;
    setCentroSelezionato(centro);
    localStorage.setItem('vigilanza_centro_id', centroId);
    await loadCentroData(centro);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (centri.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Nessun centro commerciale disponibile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Calendario Vigilanza</h1>
              {centroSelezionato && (
                <p className="text-sm text-slate-500">{centroSelezionato.nome}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle vista */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm">
              <button
                onClick={() => setVista('settimanale')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                  vista === 'settimanale' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                Settimana
              </button>
              <button
                onClick={() => setVista('mensile')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                  vista === 'mensile' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Mese
              </button>
            </div>

            {centri.length > 1 && (
              <div className="relative">
                <select
                  value={centroSelezionato?.id || ''}
                  onChange={(e) => handleCentroChange(e.target.value)}
                  className="appearance-none px-4 py-2 pr-10 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {centri.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-6 mb-4">
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

        {(() => {
          const filteredPrenotazioni = prenotazioni.filter(p => {
            if (nascondiPermanenti) {
              const giorni = differenceInDays(new Date(p.data_fine), new Date(p.data_inizio));
              if (giorni >= 300) return false;
            }
            if (soloEventi && !p.is_event) return false;
            return true;
          });

          if (vista === 'mensile') {
            return (
              <CalendarioVigilanzaMensile
                prenotazioni={filteredPrenotazioni}
                spazi={spazi}
                clienti={clienti}
                currentMonth={currentMonth}
                setCurrentMonth={setCurrentMonth}
              />
            );
          }
          return (
            <CalendarioVigilanzaSettimanale
              prenotazioni={filteredPrenotazioni}
              spazi={spazi}
              clienti={clienti}
              currentWeek={currentWeek}
              setCurrentWeek={setCurrentWeek}
            />
          );
        })()}
      </div>
    </div>
  );
}