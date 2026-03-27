import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Sparkles, Calendar } from 'lucide-react';

export default function OccupazioneSpazi({ prenotazioni, spazi, clienti }) {
  const occupazione = useMemo(() => {
    return spazi.map(spazio => {
      const prenotazioniSpazio = prenotazioni.filter(p => 
        (p.spazio_id === spazio.id || p.spazi_ids?.includes(spazio.id)) && 
        p.stato !== 'cancellata'
      );

      const affitti = prenotazioniSpazio.filter(p => !p.is_event);
      const eventi = prenotazioniSpazio.filter(p => p.is_event);

      return {
        spazio,
        affitti,
        eventi,
        occupato: prenotazioniSpazio.length > 0
      };
    });
  }, [prenotazioni, spazi]);

  const totalAffitti = affitti => affitti.reduce((sum, p) => sum + (p.prezzo_totale || 0), 0);

  return (
    <div className="space-y-4">
      {/* Riepilogo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-blue-700">{occupazione.filter(o => o.occupato).length}</p>
            <p className="text-xs text-blue-600">Spazi occupati</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-700">{occupazione.filter(o => o.affitti.length > 0).length}</p>
            <p className="text-xs text-green-600">In affitto</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-purple-700">{occupazione.filter(o => o.eventi.length > 0).length}</p>
            <p className="text-xs text-purple-600">Con eventi</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-slate-700">{occupazione.filter(o => !o.occupato).length}</p>
            <p className="text-xs text-slate-600">Liberi</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista spazi */}
      <div className="grid gap-4">
        {occupazione.map(({ spazio, affitti, eventi }) => (
          <Card key={spazio.id} className={affitti.length > 0 || eventi.length > 0 ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">Spazio {spazio.numero_spazio}</CardTitle>
                  {spazio.nome && <p className="text-sm text-slate-600 mt-1">{spazio.nome}</p>}
                </div>
                <div className="flex gap-1">
                  {affitti.length > 0 && <Badge className="bg-blue-600">In affitto</Badge>}
                  {eventi.length > 0 && <Badge className="bg-purple-600">Con evento</Badge>}
                  {affitti.length === 0 && eventi.length === 0 && <Badge variant="outline">Libero</Badge>}
                </div>
              </div>
            </CardHeader>

            {(affitti.length > 0 || eventi.length > 0) && (
              <CardContent className="space-y-3">
                {affitti.map(affitto => {
                  const cliente = clienti.find(c => c.id === affitto.cliente_id);
                  return (
                    <div key={affitto.id} className="bg-white rounded-lg p-3 border border-blue-100">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-blue-900">{cliente?.ragione_sociale || 'Cliente'}</p>
                          <p className="text-xs text-blue-700 mt-0.5">Affitto</p>
                        </div>
                        <p className="text-sm font-bold text-blue-900">€ {affitto.prezzo_totale?.toLocaleString('it-IT')}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-blue-700">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(affitto.data_inizio), 'd MMM yyyy', { locale: it })} - {format(new Date(affitto.data_fine), 'd MMM yyyy', { locale: it })}
                      </div>
                    </div>
                  );
                })}

                {eventi.map(evento => (
                  <div key={evento.id} className="bg-white rounded-lg p-3 border border-purple-100">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-purple-900">{evento.nome_evento || 'Evento'}</p>
                          <p className="text-xs text-purple-700 mt-0.5">Evento</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-purple-700">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(evento.data_inizio), 'd MMM yyyy', { locale: it })} - {format(new Date(evento.data_fine), 'd MMM yyyy', { locale: it })}
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}