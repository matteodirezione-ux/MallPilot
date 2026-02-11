import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isWithinInterval, addMonths, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';

export default function CalendarioMensile({ prenotazioni, spazi, clienti, currentMonth, setCurrentMonth, onEdit, onDelete }) {
  const giorni = useMemo(() => {
    const inizio = startOfMonth(currentMonth);
    const fine = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: inizio, end: fine });
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
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 59, g: 130, b: 246 };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-slate-800">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
            >
              Oggi
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(giorno => (
            <div key={giorno} className="text-center text-sm font-semibold text-slate-600 py-2">
              {giorno}
            </div>
          ))}
          
          {/* Padding iniziale */}
          {Array.from({ length: (giorni[0]?.getDay() + 6) % 7 }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-24 bg-slate-50 rounded-lg"></div>
          ))}
          
          {/* Giorni del mese */}
          {giorni.map(giorno => {
            const dataKey = format(giorno, 'yyyy-MM-dd');
            const prenotazioniGiorno = prenotazioniPerGiorno[dataKey] || [];
            const isToday = format(giorno, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            
            return (
              <div
                key={dataKey}
                className={`min-h-24 p-2 border rounded-lg ${
                  isToday ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200'
                } hover:shadow-md transition-shadow`}
              >
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-700' : 'text-slate-700'}`}>
                  {format(giorno, 'd')}
                </div>
                <div className="space-y-1">
                  {prenotazioniGiorno.slice(0, 2).map(p => {
                    const spazio = getSpazioById(p.spazio_id);
                    const cliente = getClienteById(p.cliente_id);
                    const spazioColor = spazio?.colore || '#3b82f6';
                    const rgb = hexToRgb(spazioColor);
                    return (
                      <div
                        key={p.id}
                        onClick={() => onEdit(p)}
                        style={{
                          backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
                          borderColor: spazioColor,
                          color: spazioColor
                        }}
                        className="text-xs px-2 py-1 rounded cursor-pointer border-2 hover:opacity-80 transition-opacity"
                      >
                        <div className="flex items-center gap-1.5">
                          <div 
                            className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center font-bold text-[10px] bg-white"
                            style={{ borderColor: spazioColor, color: spazioColor }}
                          >
                            {spazio?.numero_spazio || '?'}
                          </div>
                          <div className="font-medium truncate flex-1" style={{ color: '#1e293b' }}>
                            {cliente?.ragione_sociale || 'Cliente'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {prenotazioniGiorno.length > 2 && (
                    <div className="text-xs text-slate-500 px-2">
                      +{prenotazioniGiorno.length - 2} altro/i
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legenda Spazi */}
        {spazi.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-sm font-medium text-slate-700 mb-3">Spazi:</p>
            <div className="flex flex-wrap gap-3">
              {spazi.map(spazio => {
                const rgb = hexToRgb(spazio.colore || '#3b82f6');
                return (
                  <div key={spazio.id} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded border-2" 
                      style={{ 
                        backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
                        borderColor: spazio.colore || '#3b82f6'
                      }}
                    ></div>
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