import React, { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay, addDays, subDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarDays, MapPin, FileText, Zap, User, Phone, Mail } from 'lucide-react';

export default function CalendarioGiornaliero({ prenotazioni, spazi, clienti, onEdit, isVigilanza }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPrenotazione, setSelectedPrenotazione] = useState(null);

  const getSpazioById = (id) => spazi.find(s => s.id === id);
  const getClienteById = (id) => clienti.find(c => c.id === id);

  const getPrenotazioneColor = (p) => {
    if (p.is_gratuito) return '#16a34a'; // verde = gratuito
    if (p.is_event) return '#9333ea'; // viola = evento
    const giorni = Math.abs((new Date(p.data_fine) - new Date(p.data_inizio)) / (1000 * 60 * 60 * 24));
    if (giorni >= 300) return '#3b82f6'; // blu = permanente
    return '#b45309'; // giallo scuro = non permanente
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 59, g: 130, b: 246 };
  };

  const prenotazioniGiorno = useMemo(() => {
    const giorno = startOfDay(currentDate);
    return prenotazioni.filter(p => {
      const dataInizio = startOfDay(new Date(p.data_inizio));
      const dataFine = endOfDay(new Date(p.data_fine));
      return giorno >= dataInizio && giorno <= dataFine && p.stato !== 'cancellata';
    }).sort((a, b) => {
      const spazioA = getSpazioById(a.spazio_id);
      const spazioB = getSpazioById(b.spazio_id);
      const numA = parseInt(spazioA?.numero_spazio || '0') || 0;
      const numB = parseInt(spazioB?.numero_spazio || '0') || 0;
      return numA - numB;
    });
  }, [currentDate, prenotazioni, clienti, spazi]);

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              {format(currentDate, 'EEEE d MMMM yyyy', { locale: it })}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Vista giornaliera</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subDays(currentDate, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Oggi
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {prenotazioniGiorno.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nessuna prenotazione per questo giorno</p>
          </div>
        ) : (
          <div className="space-y-3">
            {prenotazioniGiorno.map(p => {
              const spazio = getSpazioById(p.spazio_id);
              const cliente = getClienteById(p.cliente_id);
              const color = getPrenotazioneColor(p);
              const rgb = hexToRgb(color);

              return (
                <div
                  key={p.id}
                  onClick={() => isVigilanza ? setSelectedPrenotazione({ prenotazione: p, spazio, cliente }) : (onEdit && onEdit(p))}
                  style={{
                    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
                    borderColor: color,
                  }}
                  className="rounded-lg border-l-4 p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm flex-shrink-0 bg-white"
                      style={{ borderColor: color, color: color }}
                    >
                      {spazio?.numero_spazio || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-800 truncate">
                          {p.is_event ? (p.nome_evento || 'Evento') : (cliente?.ragione_sociale || 'Cliente')}
                        </p>
                        {p.is_event && <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />}
                      </div>
                      <p className="text-sm text-slate-600">{spazio?.nome || `Spazio ${spazio?.numero_spazio}`}</p>
                      
                      {p.spazi_ids && p.spazi_ids.filter(id => id !== p.spazio_id).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {p.spazi_ids.filter(id => id !== p.spazio_id).map(id => {
                            const s = getSpazioById(id);
                            if (!s) return null;
                            const sc = getPrenotazioneColor(p);
                            return (
                              <span key={id} className="text-xs px-2 py-1 rounded border font-medium" style={{ borderColor: sc, color: sc, backgroundColor: `rgba(${hexToRgb(sc).r}, ${hexToRgb(sc).g}, ${hexToRgb(sc).b}, 0.1)` }}>
                                +{s.numero_spazio} {s.nome && `· ${s.nome}`}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

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
                  style={{ borderColor: getPrenotazioneColor(selectedPrenotazione.prenotazione) || '#3b82f6', color: getPrenotazioneColor(selectedPrenotazione.prenotazione) || '#3b82f6' }}
                >
                  {selectedPrenotazione.spazio?.numero_spazio || '?'}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    {selectedPrenotazione.prenotazione.is_event ? (selectedPrenotazione.prenotazione.nome_evento || 'Evento') : (selectedPrenotazione.cliente?.ragione_sociale || 'Cliente')}
                  </p>
                  <p className="text-sm text-slate-500">{selectedPrenotazione.spazio?.nome || `Spazio ${selectedPrenotazione.spazio?.numero_spazio}`}</p>
                  {selectedPrenotazione.prenotazione.spazi_ids && selectedPrenotazione.prenotazione.spazi_ids.filter(id => id !== selectedPrenotazione.prenotazione.spazio_id).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-xs text-slate-400">Spazi aggiuntivi:</span>
                      {selectedPrenotazione.prenotazione.spazi_ids.filter(id => id !== selectedPrenotazione.prenotazione.spazio_id).map(id => {
                        const s = getSpazioById(id);
                        if (!s) return null;
                        const sc = getPrenotazioneColor(selectedPrenotazione.prenotazione);
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