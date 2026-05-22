import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, Building2, User, Calendar, ArrowUpDown, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function ListaPrenotazioni({ prenotazioni, spazi, clienti, onEdit, onDelete }) {
  const annoCorrente = new Date().getFullYear();
  const [sortField, setSortField] = useState('data_inizio');
  const [sortDir, setSortDir] = useState('asc');

  const prenotazioniAnno = useMemo(() => {
    return prenotazioni.filter(p => new Date(p.data_inizio).getFullYear() === annoCorrente);
  }, [prenotazioni, annoCorrente]);

  const prenotazioniOrdinate = useMemo(() => {
    return [...prenotazioniAnno].sort((a, b) => {
      let valA, valB;
      if (sortField === 'data_inizio') {
        valA = new Date(a.data_inizio);
        valB = new Date(b.data_inizio);
      } else if (sortField === 'cliente') {
        const cA = clienti.find(c => c.id === a.cliente_id);
        const cB = clienti.find(c => c.id === b.cliente_id);
        valA = cA?.ragione_sociale?.toLowerCase() || '';
        valB = cB?.ragione_sociale?.toLowerCase() || '';
      } else if (sortField === 'prezzo_totale') {
        valA = a.prezzo_totale || 0;
        valB = b.prezzo_totale || 0;
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [prenotazioniAnno, sortField, sortDir, clienti]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

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

  const totale = prenotazioniOrdinate.reduce((sum, p) => sum + (p.prezzo_totale || 0), 0);

  if (prenotazioniAnno.length === 0) {
    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="w-16 h-16 text-slate-300 mb-4" />
          <p className="text-slate-500 text-center">Nessuna prenotazione per il {annoCorrente}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con ordinamento e totali */}
      <Card className="bg-white border-slate-200">
        <CardHeader className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Anno {annoCorrente}</p>
              <p className="text-lg font-bold text-slate-800">
                {prenotazioniOrdinate.length} prenotazioni · {formatCurrency(totale)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Ordina per:</span>
              <Button
                variant={sortField === 'data_inizio' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('data_inizio')}
                className="flex items-center gap-1"
              >
                <Calendar className="w-3 h-3" />
                Data
                <SortIcon field="data_inizio" />
              </Button>
              <Button
                variant={sortField === 'cliente' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('cliente')}
                className="flex items-center gap-1"
              >
                <User className="w-3 h-3" />
                Operatore
                <SortIcon field="cliente" />
              </Button>
              <Button
                variant={sortField === 'prezzo_totale' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('prezzo_totale')}
                className="flex items-center gap-1"
              >
                Valore
                <SortIcon field="prezzo_totale" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Lista prenotazioni */}
      <div className="space-y-3">
        {prenotazioniOrdinate.map(prenotazione => {
          const spazio = getSpazioById(prenotazione.spazio_id);
          const cliente = getClienteById(prenotazione.cliente_id);

          return (
            <div key={prenotazione.id} className={`rounded-xl border overflow-hidden transition-all duration-200
              shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]
              hover:shadow-[0_8px_28px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.06)] hover:-translate-y-0.5
              ${prenotazione.is_event ? 'bg-purple-50/80 backdrop-blur-sm border-purple-200' : 'bg-white/80 backdrop-blur-sm border-slate-200'}`}>
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      {prenotazione.is_event && (
                        <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          <Sparkles className="w-3 h-3" /> Evento
                        </span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatoColor(prenotazione.stato)}`}>
                        {prenotazione.stato.charAt(0).toUpperCase() + prenotazione.stato.slice(1).replace('_', ' ')}
                      </span>
                      <h3 className="text-lg font-bold text-slate-800">{formatCurrency(prenotazione.prezzo_totale)}</h3>
                      {prenotazione.prezzo_mensile && <span className="text-xs text-slate-500">{formatCurrency(prenotazione.prezzo_mensile)}/mese</span>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Building2 className="w-4 h-4 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Spazio {spazio?.numero_spazio || '—'}</p>
                          {spazio?.nome && <p className="text-xs text-slate-500">{spazio.nome}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <User className="w-4 h-4 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{prenotazione.is_event ? (prenotazione.nome_evento || 'Evento') : (cliente?.ragione_sociale || '—')}</p>
                          {!prenotazione.is_event && cliente?.email && <p className="text-xs text-slate-500">{cliente.email}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <p className="text-sm font-medium">{format(new Date(prenotazione.data_inizio), 'dd MMM', { locale: it })} – {format(new Date(prenotazione.data_fine), 'dd MMM yyyy', { locale: it })}</p>
                      </div>
                    </div>
                    {prenotazione.note && <p className="text-sm text-slate-500 bg-slate-50 rounded px-3 py-2">{prenotazione.note}</p>}
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(prenotazione)} className="text-blue-600"><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(prenotazione.id)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
            </div>
           );
        })}
      </div>
    </div>
  );
}