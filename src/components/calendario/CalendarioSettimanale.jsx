import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';

export default function CalendarioSettimanale({ prenotazioni, spazi, clienti, currentWeek, setCurrentWeek, onEdit }) {
  const giorni = useMemo(() => {
    const inizio = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const fine = endOfWeek(currentWeek, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: inizio, end: fine });
  }, [currentWeek]);

  const prenotazioniPerGiorno = useMemo(() => {
    const map = {};
    giorni.forEach(giorno => {
      map[format(giorno, 'yyyy-MM-dd')] = prenotazioni.filter(p => {
        const dataInizio = new Date(p.data_inizio);
        const dataFine = new Date(p.data_fine);
        return isWithinInterval(giorno, { start: dataInizio, end: dataFine }) && p.stato !== 'cancellata';
      });
    });
    return map;
  }, [prenotazioni, giorni]);

  const getSpazioById = (id) => spazi.find(s => s.id === id);
  const getClienteById = (id) => clienti.find(c => c.id === id);

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 59, g: 130, b: 246 };
  };

  const inizioSettimana = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const fineSettimana = endOfWeek(currentWeek, { weekStartsOn: 1 });

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              {format(inizioSettimana, 'd MMM', { locale: it })} – {format(fineSettimana, 'd MMM yyyy', { locale: it })}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Vista settimanale</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())}>
              Oggi
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {giorni.map(giorno => {
            const dataKey = format(giorno, 'yyyy-MM-dd');
            const isToday = isSameDay(giorno, new Date());
            return (
              <div key={dataKey} className="text-center">
                <div className={`text-xs font-semibold uppercase mb-1 ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                  {format(giorno, 'EEE', { locale: it })}
                </div>
                <div className={`text-lg font-bold mb-2 w-9 h-9 flex items-center justify-center mx-auto rounded-full ${
                  isToday ? 'bg-blue-600 text-white' : 'text-slate-700'
                }`}>
                  {format(giorno, 'd')}
                </div>
              </div>
            );
          })}

          {giorni.map(giorno => {
            const dataKey = format(giorno, 'yyyy-MM-dd');
            const prenotazioniGiorno = prenotazioniPerGiorno[dataKey] || [];
            const isToday = isSameDay(giorno, new Date());

            return (
              <div
                key={`col-${dataKey}`}
                className={`min-h-64 p-2 border rounded-lg ${
                  isToday ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                {prenotazioniGiorno.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-xs text-slate-300">—</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {prenotazioniGiorno.map(p => {
                      const spazio = getSpazioById(p.spazio_id);
                      const cliente = getClienteById(p.cliente_id);
                      const spazioColor = spazio?.colore || '#3b82f6';
                      const rgb = hexToRgb(spazioColor);
                      return (
                        <div
                          key={p.id}
                          onClick={() => onEdit(p)}
                          style={{
                            backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`,
                            borderColor: spazioColor,
                          }}
                          className="text-xs px-2 py-1.5 rounded cursor-pointer border-l-4 hover:opacity-80 transition-opacity"
                        >
                          <div
                            className="font-bold text-[10px] mb-0.5"
                            style={{ color: spazioColor }}
                          >
                            {spazio?.numero_spazio || '?'} {spazio?.nome ? `· ${spazio.nome}` : ''}
                          </div>
                          <div className="text-slate-700 truncate font-medium">
                            {cliente?.ragione_sociale || 'Cliente'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legenda */}
        {spazi.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-sm font-medium text-slate-700 mb-3">Spazi:</p>
            <div className="flex flex-wrap gap-3">
              {spazi.map(spazio => {
                const rgb = hexToRgb(spazio.colore || '#3b82f6');
                return (
                  <div key={spazio.id} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded border-l-4"
                      style={{
                        backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`,
                        borderColor: spazio.colore || '#3b82f6'
                      }}
                    />
                    <span className="text-sm text-slate-600">
                      {spazio.numero_spazio} - {spazio.nome || 'Spazio'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}