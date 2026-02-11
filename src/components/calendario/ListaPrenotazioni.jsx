import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, Building2, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function ListaPrenotazioni({ prenotazioni, spazi, clienti, onEdit, onDelete }) {
  const [meseSelezionato, setMeseSelezionato] = useState(format(new Date(), 'yyyy-MM'));

  const mesiDisponibili = useMemo(() => {
    const mesi = new Set();
    prenotazioni.forEach(p => {
      const mese = format(new Date(p.data_inizio), 'yyyy-MM');
      mesi.add(mese);
    });
    return Array.from(mesi).sort().reverse();
  }, [prenotazioni]);

  const prenotazioniFiltrate = useMemo(() => {
    return prenotazioni
      .filter(p => format(new Date(p.data_inizio), 'yyyy-MM') === meseSelezionato)
      .sort((a, b) => new Date(a.data_inizio) - new Date(b.data_inizio));
  }, [prenotazioni, meseSelezionato]);

  const getSpazioById = (id) => spazi.find(s => s.id === id);
  const getClienteById = (id) => clienti.find(c => c.id === id);

  const getStatoColor = (stato) => {
    const colors = {
      confermata: 'bg-blue-100 text-blue-800',
      in_corso: 'bg-green-100 text-green-800',
      completata: 'bg-slate-100 text-slate-600',
      cancellata: 'bg-red-100 text-red-800'
    };
    return colors[stato] || colors.confermata;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  if (mesiDisponibili.length === 0) {
    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="w-16 h-16 text-slate-300 mb-4" />
          <p className="text-slate-500 text-center">Nessuna prenotazione disponibile</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-800">
              Filtra per Mese
            </CardTitle>
            <Select value={meseSelezionato} onValueChange={setMeseSelezionato}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mesiDisponibili.map(mese => (
                  <SelectItem key={mese} value={mese}>
                    {format(new Date(mese + '-01'), 'MMMM yyyy', { locale: it })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {prenotazioniFiltrate.length === 0 ? (
        <Card className="bg-white border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="w-16 h-16 text-slate-300 mb-4" />
            <p className="text-slate-500 text-center">
              Nessuna prenotazione per {format(new Date(meseSelezionato + '-01'), 'MMMM yyyy', { locale: it })}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {prenotazioniFiltrate.map(prenotazione => {
            const spazio = getSpazioById(prenotazione.spazio_id);
            const cliente = getClienteById(prenotazione.cliente_id);

            return (
              <Card key={prenotazione.id} className="bg-white border-slate-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatoColor(prenotazione.stato)}`}>
                          {prenotazione.stato.charAt(0).toUpperCase() + prenotazione.stato.slice(1).replace('_', ' ')}
                        </span>
                        <h3 className="text-xl font-semibold text-slate-800">
                          {formatCurrency(prenotazione.prezzo_totale)}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Building2 className="w-4 h-4" />
                          <div>
                            <p className="text-sm font-medium">Spazio {spazio?.numero_spazio}</p>
                            {spazio?.nome && <p className="text-xs text-slate-500">{spazio.nome}</p>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-600">
                          <User className="w-4 h-4" />
                          <div>
                            <p className="text-sm font-medium">{cliente?.ragione_sociale}</p>
                            {cliente?.email && <p className="text-xs text-slate-500">{cliente.email}</p>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4" />
                          <div>
                            <p className="text-sm font-medium">
                              {format(new Date(prenotazione.data_inizio), 'dd MMM', { locale: it })} - {format(new Date(prenotazione.data_fine), 'dd MMM yyyy', { locale: it })}
                            </p>
                            {prenotazione.prezzo_mensile && (
                              <p className="text-xs text-slate-500">
                                {formatCurrency(prenotazione.prezzo_mensile)}/mese
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {prenotazione.note && (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-sm text-slate-600">{prenotazione.note}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(prenotazione)}
                        className="text-blue-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(prenotazione.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}