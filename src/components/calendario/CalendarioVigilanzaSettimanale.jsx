import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, CalendarDays, MapPin, FileText, Zap, User, Phone, Mail } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { Sparkles } from 'lucide-react';
import { it } from 'date-fns/locale';

export default function CalendarioVigilanzaSettimanale({ prenotazioni, spazi, clienti, currentWeek, setCurrentWeek }) {
  const [selectedPrenotazione, setSelectedPrenotazione] = useState(null);

  const giorni = useMemo(() => {
    const inizio = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const fine = endOfWeek(currentWeek, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: inizio, end: fine });
  }, [currentWeek]);

  const parseLocalDate = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const prenotazioniPerGiorno = useMemo(() => {
    const map = {};
    giorni.forEach(giorno => {
      map[format(giorno, 'yyyy-MM-dd')] = prenotazioni.filter(p => {
        const dataInizio = parseLocalDate(p.data_inizio);
        const dataFine = parseLocalDate(p.data_fine);
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
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {giorni.map(giorno => {
            const isToday = isSameDay(giorno, new Date());
            return (
              <div key={format(giorno, 'yyyy-MM-dd')} className="text-center">
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
                className={`min-h-48 sm:min-h-64 p-1 sm:p-2 border rounded-lg ${
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
                          onClick={() => setSelectedPrenotazione({ prenotazione: p, spazio, cliente })}
                          style={{ backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`, borderColor: spazioColor }}
                          className="text-xs px-1 sm:px-2 py-1 sm:py-1.5 rounded cursor-pointer border-l-4 hover:opacity-80 transition-opacity"
                        >
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="font-bold text-[10px]" style={{ color: spazioColor }}>
                              {spazio?.numero_spazio || '?'}
                            </span>
                            {p.is_event && <Sparkles className="w-3 h-3 text-purple-500 flex-shrink-0" />}
                          </div>
                          <div className={`truncate font-medium text-[10px] sm:text-xs ${p.is_event ? 'text-purple-800' : 'text-slate-700'}`}>
                            {p.is_event ? (p.nome_evento || 'Evento') : (cliente?.ragione_sociale || 'Cliente')}
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

        {selectedPrenotazione && (
          <Dialog open={!!selectedPrenotazione} onOpenChange={() => setSelectedPrenotazione(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dettaglio Prenotazione</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm flex-shrink-0 bg-white"
                    style={{ borderColor: selectedPrenotazione.spazio?.colore || '#3b82f6', color: selectedPrenotazione.spazio?.colore || '#3b82f6' }}
                  >
                    {selectedPrenotazione.spazio?.numero_spazio || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">
                      {selectedPrenotazione.prenotazione.is_event ? (selectedPrenotazione.prenotazione.nome_evento || 'Evento') : (selectedPrenotazione.cliente?.ragione_sociale || 'Cliente')}
                    </p>
                    <p className="text-sm text-slate-500">{selectedPrenotazione.spazio?.nome || `Spazio ${selectedPrenotazione.spazio?.numero_spazio}`}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <CalendarDays className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Periodo</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {format(new Date(selectedPrenotazione.prenotazione.data_inizio), 'd MMMM yyyy', { locale: it })}
                      {' → '}
                      {format(new Date(selectedPrenotazione.prenotazione.data_fine), 'd MMMM yyyy', { locale: it })}
                    </p>
                  </div>
                </div>

                {!selectedPrenotazione.prenotazione.is_event && selectedPrenotazione.cliente && (
                  selectedPrenotazione.cliente.referente_nome || selectedPrenotazione.cliente.referente_telefono || selectedPrenotazione.cliente.referente_email
                ) && (
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <User className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 font-medium">Referente</p>
                      {selectedPrenotazione.cliente.referente_nome && <p className="text-sm font-semibold text-slate-800">{selectedPrenotazione.cliente.referente_nome}</p>}
                      {selectedPrenotazione.cliente.referente_telefono && (
                        <a href={`tel:${selectedPrenotazione.cliente.referente_telefono}`} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                          <Phone className="w-3.5 h-3.5" />{selectedPrenotazione.cliente.referente_telefono}
                        </a>
                      )}
                      {selectedPrenotazione.cliente.referente_email && (
                        <a href={`mailto:${selectedPrenotazione.cliente.referente_email}`} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                          <Mail className="w-3.5 h-3.5" />{selectedPrenotazione.cliente.referente_email}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {selectedPrenotazione.spazio?.piantina_url && (
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-1">Posizione</p>
                      <img src={selectedPrenotazione.spazio.piantina_url} alt="Piantina" className="max-h-48 rounded-lg object-contain" />
                    </div>
                  </div>
                )}

                {selectedPrenotazione.prenotazione.necessita_elettricita && (
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <Zap className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    <p className="text-sm font-semibold text-yellow-800">Necessita di elettricità</p>
                  </div>
                )}

                {selectedPrenotazione.prenotazione.note && (
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <FileText className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Note</p>
                      <p className="text-sm text-slate-700">{selectedPrenotazione.prenotazione.note}</p>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}