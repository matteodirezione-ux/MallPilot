import React, { useState, useMemo } from 'react';
import { differenceInDays, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronUp, ChevronDown, ChevronsUpDown, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function SortIcon({ col, sortConfig }) {
  if (sortConfig.key !== col) return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300" />;
  return sortConfig.direction === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
    : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />;
}

export default function TabellaPrenotazioni({ prenotazioni, clienti, spazi, onEdit, onDelete, isVigilanza }) {
  const [sortConfig, setSortConfig] = useState({ key: 'data_inizio', direction: 'asc' });
  const annoCorrente = new Date().getFullYear();
  const [annoFiltro, setAnnoFiltro] = useState(annoCorrente);

  const clientiMap = useMemo(() => Object.fromEntries(clienti.map(c => [c.id, c])), [clienti]);
  const spaziMap = useMemo(() => Object.fromEntries(spazi.map(s => [s.id, s])), [spazi]);

  const getNome = (p) => {
    if (p.is_event && p.nome_evento) return p.nome_evento;
    const cliente = clientiMap[p.cliente_id];
    return cliente?.ragione_sociale || cliente?.insegna || '—';
  };

  const getSpazio = (p) => {
    const ids = p.spazi_ids?.length ? p.spazi_ids : [p.spazio_id].filter(Boolean);
    return ids.map(id => spaziMap[id]?.numero_spazio || id).join(', ') || '—';
  };

  const getDurata = (p) => {
    if (!p.data_inizio || !p.data_fine) return 0;
    return differenceInDays(new Date(p.data_fine), new Date(p.data_inizio)) + 1;
  };

  const toggleSort = (key) => {
    setSortConfig(prev =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  };

  // Anni disponibili dai dati
  const anniDisponibili = useMemo(() => {
    const anni = new Set(prenotazioni.map(p => p.data_inizio ? new Date(p.data_inizio).getFullYear() : null).filter(Boolean));
    return [...anni].sort((a, b) => b - a);
  }, [prenotazioni]);

  const filtrate = useMemo(() =>
    prenotazioni.filter(p => {
      if (!p.data_inizio) return false;
      return new Date(p.data_inizio).getFullYear() === annoFiltro;
    }),
  [prenotazioni, annoFiltro]);

  const sorted = useMemo(() => {
    return [...filtrate].sort((a, b) => {
      let va, vb;
      switch (sortConfig.key) {
        case 'nome':      va = getNome(a).toLowerCase(); vb = getNome(b).toLowerCase(); break;
        case 'costo':     va = a.prezzo_totale ?? 0;     vb = b.prezzo_totale ?? 0;     break;
        case 'durata':    va = getDurata(a);              vb = getDurata(b);              break;
        case 'data_inizio': va = a.data_inizio ?? '';    vb = b.data_inizio ?? '';       break;
        case 'stato':     va = a.stato ?? '';             vb = b.stato ?? '';             break;
        default: return 0;
      }
      if (va < vb) return sortConfig.direction === 'asc' ? -1 : 1;
      if (va > vb) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtrate, sortConfig, clientiMap, spaziMap]);

  const statoColor = {
    confermata: 'bg-blue-100 text-blue-700',
    in_corso:   'bg-green-100 text-green-700',
    completata: 'bg-slate-100 text-slate-600',
    cancellata: 'bg-red-100 text-red-600',
  };

  const statoLabel = {
    confermata: 'Confermata',
    in_corso:   'In corso',
    completata: 'Completata',
    cancellata: 'Cancellata',
  };

  const Th = ({ col, label }) => (
    <th
      className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 cursor-pointer select-none whitespace-nowrap hover:text-slate-700"
      onClick={() => toggleSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        <SortIcon col={col} sortConfig={sortConfig} />
      </span>
    </th>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm font-semibold text-slate-700">{sorted.length} prenotazioni</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Anno:</span>
          <div className="flex gap-1">
            {anniDisponibili.map(a => (
              <button
                key={a}
                onClick={() => setAnnoFiltro(a)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${annoFiltro === a ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <Th col="nome"       label="Nome / Cliente" />
              <Th col="data_inizio" label="Data inizio" />
              <Th col="durata"     label="Durata" />
              <Th col="costo"      label="Costo" />
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 whitespace-nowrap">Spazio</th>
              <Th col="stato"      label="Stato" />
              {!isVigilanza && <th className="py-2.5 px-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={isVigilanza ? 6 : 7} className="py-10 text-center text-slate-400 text-sm">
                  Nessuna prenotazione trovata
                </td>
              </tr>
            ) : sorted.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[220px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {p.is_event && (
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold uppercase whitespace-nowrap">Evento</span>
                    )}
                    {p.is_gratuito && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold uppercase whitespace-nowrap">Gratuito</span>
                    )}
                    {!p.is_event && !p.is_gratuito && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold uppercase whitespace-nowrap">Affitto</span>
                    )}
                    <span className="truncate">{getNome(p)}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                  {p.data_inizio ? format(new Date(p.data_inizio), 'd MMM yyyy', { locale: it }) : '—'}
                </td>
                <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                  {getDurata(p)} gg
                </td>
                <td className="py-2.5 px-3 text-slate-700 font-semibold whitespace-nowrap">
                  {p.prezzo_totale != null
                    ? '€ ' + p.prezzo_totale.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '—'}
                </td>
                <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{getSpazio(p)}</td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statoColor[p.stato] || 'bg-slate-100 text-slate-600'}`}>
                    {statoLabel[p.stato] || p.stato}
                  </span>
                </td>
                {!isVigilanza && (
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => onEdit(p)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => onDelete(p.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}