import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { eachMonthOfInterval, startOfYear, endOfYear, eachDayOfInterval, startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';
import { it } from 'date-fns/locale';

// Parsa date YYYY-MM-DD come date locali (evita shift UTC)
const parseLocalDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function DisponibilitaSpazi({ prenotazioni, spazi }) {
  const anno = new Date().getFullYear();

  const mesi = useMemo(() => {
    return eachMonthOfInterval({
      start: startOfYear(new Date(anno, 0, 1)),
      end: endOfYear(new Date(anno, 0, 1))
    });
  }, [anno]);

  // Per ogni spazio e ogni mese: calcola giorni occupati / totali
  const tabella = useMemo(() => {
    return [...spazi].sort((a, b) => (a.numero_spazio || '').localeCompare(b.numero_spazio || '', 'it', { numeric: true })).map(spazio => {
      const rigaMesi = mesi.map(mese => {
        const giorni = eachDayOfInterval({ start: startOfMonth(mese), end: endOfMonth(mese) });
        const totGiorni = giorni.length;

        const giorniOccupati = giorni.filter(giorno => {
          return prenotazioni.some(p => {
            if (p.stato === 'cancellata') return false;
            const spaziPrenotati = p.spazi_ids?.length ? p.spazi_ids : (p.spazio_id ? [p.spazio_id] : []);
            if (!spaziPrenotati.includes(spazio.id)) return false;
            return isWithinInterval(giorno, {
              start: new Date(p.data_inizio),
              end: new Date(p.data_fine)
            });
          });
        }).length;

        const giorniLiberi = totGiorni - giorniOccupati;
        const percOccupato = Math.round((giorniOccupati / totGiorni) * 100);

        return { totGiorni, giorniOccupati, giorniLiberi, percOccupato };
      });

      const totAnno = 365;
      const totOccupati = rigaMesi.reduce((s, m) => s + m.giorniOccupati, 0);
      const totLiberi = totAnno - totOccupati;

      return { spazio, mesi: rigaMesi, totOccupati, totLiberi };
    });
  }, [spazi, prenotazioni, mesi]);

  const getCellColor = (perc) => {
    if (perc === 0) return 'bg-emerald-50 text-emerald-700';
    if (perc < 50) return 'bg-yellow-50 text-yellow-700';
    if (perc < 100) return 'bg-orange-50 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  const getBarColor = (perc) => {
    if (perc === 0) return 'bg-emerald-400';
    if (perc < 50) return 'bg-yellow-400';
    if (perc < 100) return 'bg-orange-400';
    return 'bg-red-500';
  };

  if (spazi.length === 0) {
    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-slate-500">Nessuno spazio disponibile</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legenda */}
      <Card className="bg-white border-slate-200">
        <CardHeader className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold text-slate-800">
              Disponibilità Spazi — {anno}
            </CardTitle>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400 inline-block" /> Libero (0%)</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" /> Parziale (1–49%)</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-400 inline-block" /> Quasi pieno (50–99%)</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Pieno (100%)</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabella */}
      <Card className="bg-white border-slate-200 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700 sticky left-0 bg-slate-50 min-w-[140px]">
                    Spazio
                  </th>
                  {mesi.map(mese => (
                    <th key={mese.toString()} className="text-center px-2 py-3 font-semibold text-slate-600 min-w-[80px]">
                      {format(mese, 'MMM', { locale: it })}
                    </th>
                  ))}
                  <th className="text-center px-3 py-3 font-semibold text-slate-700 min-w-[100px] border-l border-slate-200">
                    Tot. Anno
                  </th>
                </tr>
              </thead>
              <tbody>
                {tabella.map(({ spazio, mesi: rigaMesi, totOccupati, totLiberi }) => (
                  <tr key={spazio.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 sticky left-0 bg-white">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: spazio.colore || '#3b82f6' }}
                        />
                        <div>
                          <p className="font-medium text-slate-800">{spazio.numero_spazio}</p>
                          {spazio.nome && <p className="text-xs text-slate-500 truncate max-w-[90px]">{spazio.nome}</p>}
                        </div>
                      </div>
                    </td>
                    {rigaMesi.map((dati, idx) => (
                      <td key={idx} className="px-2 py-2 text-center">
                        <div className={`rounded-lg px-1 py-2 ${getCellColor(dati.percOccupato)}`}>
                          <p className="font-semibold text-sm leading-none">{dati.giorniLiberi}g</p>
                          <p className="text-[10px] opacity-70 mt-0.5">liberi</p>
                          {/* Mini barra */}
                          <div className="mt-1.5 h-1.5 rounded-full bg-white/60 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getBarColor(dati.percOccupato)}`}
                              style={{ width: `${dati.percOccupato}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center border-l border-slate-200">
                      <div className="font-semibold text-slate-800">{totLiberi}g</div>
                      <div className="text-xs text-slate-500">liberi</div>
                      <div className="text-xs text-slate-400">{totOccupati}g occup.</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}