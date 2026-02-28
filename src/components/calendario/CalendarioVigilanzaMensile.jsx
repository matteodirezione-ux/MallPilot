import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, CalendarDays, MapPin, FileText } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, addMonths, subMonths, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';

export default function CalendarioVigilanzaMensile({ prenotazioni, spazi, clienti, currentMonth, setCurrentMonth }) {
  const [selectedPrenotazione, setSelectedPrenotazione] = useState(null);
  const giorni = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  }, [currentMonth]);

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
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 59, g: 130, b: 246 };
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-slate-800 capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Oggi</Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(g => (
            <div key={g} className="text-center text-xs sm:text-sm font-semibold text-slate-600 py-2">{g}</div>
          ))}

          {Array.from({ length: (giorni[0]?.getDay() + 6) % 7 }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-16 sm:min-h-24 bg-slate-50 rounded-lg" />
          ))}

          {giorni.map(giorno => {
            const dataKey = format(giorno, 'yyyy-MM-dd');
            const prenotazioniGiorno = prenotazioniPerGiorno[dataKey] || [];
            const isToday = isSameDay(giorno, new Date());

            return (
              <div
                key={dataKey}
                className={`min-h-16 sm:min-h-24 p-1 sm:p-2 border rounded-lg ${
                  isToday ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200'
                }`}
              >
                <div className={`text-xs sm:text-sm font-medium mb-1 ${isToday ? 'text-blue-700' : 'text-slate-700'}`}>
                  {format(giorno, 'd')}
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                  {prenotazioniGiorno.map(p => {
                    const spazio = getSpazioById(p.spazio_id);
                    const cliente = getClienteById(p.cliente_id);
                    const spazioColor = spazio?.colore || '#3b82f6';
                    const rgb = hexToRgb(spazioColor);
                    return (
                      <div
                        key={p.id}
                        style={{ backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`, borderColor: spazioColor }}
                        className="text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded border-2"
                      >
                        <div className="flex items-center gap-1">
                          <div
                            className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center font-bold text-[9px] sm:text-[10px] bg-white"
                            style={{ borderColor: spazioColor, color: spazioColor }}
                          >
                            {spazio?.numero_spazio || '?'}
                          </div>
                          <div className="font-medium truncate flex-1 text-slate-800 text-[10px] sm:text-xs">
                            {cliente?.ragione_sociale || 'Cliente'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {spazi.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-sm font-medium text-slate-700 mb-3">Spazi:</p>
            <div className="flex flex-wrap gap-3">
              {spazi.map(spazio => {
                const rgb = hexToRgb(spazio.colore || '#3b82f6');
                return (
                  <div key={spazio.id} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2" style={{ backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`, borderColor: spazio.colore || '#3b82f6' }} />
                    <span className="text-sm text-slate-600">{spazio.numero_spazio} - {spazio.nome || 'Spazio'}</span>
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