import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, CalendarDays, MapPin, FileText, Zap, User, Phone, Mail } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, addMonths, subMonths, isSameDay } from 'date-fns';
import { Sparkles } from 'lucide-react';
import { it } from 'date-fns/locale';

export default function CalendarioMensile({ prenotazioni, spazi, clienti, currentMonth, setCurrentMonth, onEdit, onDelete, isVigilanza }) {
  const [selectedPrenotazione, setSelectedPrenotazione] = useState(null);

  const giorni = useMemo(() => {
    const inizio = startOfMonth(currentMonth);
    const fine = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: inizio, end: fine });
  }, [currentMonth]);

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
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 59, g: 130, b: 246 };
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-slate-800">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
              Oggi
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
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
            const isToday = isSameDay(giorno, new Date());

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
                  {prenotazioniGiorno.map(p => {
                    const spazio = getSpazioById(p.spazio_id);
                    const cliente = getClienteById(p.cliente_id);
                    const spazioColor = spazio?.colore || '#3b82f6';
                    const rgb = hexToRgb(spazioColor);
                    return (
                      <div
                         key={p.id}
                         onClick={() => isVigilanza ? setSelectedPrenotazione({ prenotazione: p, spazio, cliente }) : (onEdit && onEdit(p))}
                         style={p.is_event ? {
                           backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`,
                           borderColor: spazioColor,
                         } : {
                           backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
                           borderColor: spazioColor,
                           color: spazioColor
                         }}
                         className={`text-xs px-2 py-1 rounded border-2 hover:opacity-80 transition-opacity cursor-pointer`}
                       >
                        <div className="flex items-center gap-1.5">
                          <div
                            className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center font-bold text-[10px] bg-white"
                            style={{ borderColor: spazioColor, color: spazioColor }}
                          >
                            {spazio?.numero_spazio || '?'}
                          </div>
                          {p.is_event && <Sparkles className="flex-shrink-0 w-3 h-3 text-purple-500" />}
                          <div className={`font-medium truncate flex-1 ${p.is_event ? 'text-purple-800' : ''}`} style={p.is_event ? {} : { color: '#1e293b' }}>
                            {p.is_event ? (p.nome_evento || 'Evento') : (cliente?.ragione_sociale || 'Cliente')}
                          </div>
                        </div>
                        {/* Spazi aggiuntivi */}
                        {p.spazi_ids && p.spazi_ids.filter(id => id !== p.spazio_id).length > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-0.5">
                            {p.spazi_ids.filter(id => id !== p.spazio_id).map(id => {
                              const s = getSpazioById(id);
                              if (!s) return null;
                              const sc = s.colore || '#3b82f6';
                              return (
                                <span key={id} className="text-[9px] px-1 py-0.5 rounded bg-white border font-medium" style={{ borderColor: sc, color: sc }}>
                                  +{s.numero_spazio}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>


      </CardContent>

      {/* Dialog dettaglio prenotazione */}
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
                  <p className="font-semibold text-slate-800">{selectedPrenotazione.prenotazione.is_event ? (selectedPrenotazione.prenotazione.nome_evento || 'Evento') : (selectedPrenotazione.cliente?.ragione_sociale || 'Cliente')}</p>
                  <p className="text-sm text-slate-500">{selectedPrenotazione.spazio?.nome || `Spazio ${selectedPrenotazione.spazio?.numero_spazio}`}</p>
                  {selectedPrenotazione.prenotazione.spazi_ids && selectedPrenotazione.prenotazione.spazi_ids.filter(id => id !== selectedPrenotazione.prenotazione.spazio_id).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-xs text-slate-400">Spazi aggiuntivi:</span>
                      {selectedPrenotazione.prenotazione.spazi_ids.filter(id => id !== selectedPrenotazione.prenotazione.spazio_id).map(id => {
                        const s = getSpazioById(id);
                        if (!s) return null;
                        const sc = s.colore || '#3b82f6';
                        return (
                          <span key={id} className="text-xs px-1.5 py-0.5 rounded border font-medium" style={{ borderColor: sc, color: sc, backgroundColor: `${sc}15` }}>
                            {s.numero_spazio}{s.nome ? ` · ${s.nome}` : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}
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
              {!selectedPrenotazione.spazio?.piantina_url && selectedPrenotazione.spazio?.descrizione && (
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Posizione</p>
                    <p className="text-sm text-slate-700">{selectedPrenotazione.spazio.descrizione}</p>
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
      </Card>
      );
      }