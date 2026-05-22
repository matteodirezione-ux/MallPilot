import React from 'react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2, AlertTriangle } from 'lucide-react';

const statoConfig = {
  da_fare: { label: 'Da Fare', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-50' },
  in_corso: { label: 'In Corso', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-50' },
  completato: { label: 'Completato', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-50' },
  annullato: { label: 'Annullato', color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-50' }
};

function ManutenzioneRow({ manutenzione, onEdit, onDelete, onToggleStatus }) {
  const sConf = statoConfig[manutenzione.stato] || statoConfig.da_fare;
  const dataScad = parseISO(manutenzione.data_scadenza);
  const isScaduto = isPast(dataScad) && !isToday(dataScad) && manutenzione.stato !== 'completato' && manutenzione.stato !== 'annullato';

  return (
    <div className={`rounded-xl border p-3 flex gap-3 items-start shadow-[0_4px_20px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.18),0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-200 ${sConf.bg} ${isScaduto ? 'border-red-50' : sConf.border}`}>
      <Checkbox checked={manutenzione.stato === 'completato'} onCheckedChange={() => onToggleStatus(manutenzione)} className="mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`font-medium text-sm ${manutenzione.stato === 'completato' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{manutenzione.titolo}</p>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => onEdit(manutenzione)} className="p-1 rounded hover:bg-white/50"><Pencil className="w-3.5 h-3.5 text-slate-400" /></button>
            <button onClick={() => onDelete(manutenzione)} className="p-1 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
          </div>
        </div>
        {manutenzione.descrizione && <p className="text-xs text-slate-500 mt-0.5 truncate">{manutenzione.descrizione}</p>}
        <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
          <span>📅 {format(dataScad, 'd MMM yyyy', { locale: it })}</span>
          {isScaduto && <span className="flex items-center gap-1 text-red-600 font-medium"><AlertTriangle className="w-3 h-3" />Scaduto</span>}
          {manutenzione.assegnato_a_nome && <span>→ {manutenzione.assegnato_a_nome}</span>}
        </div>
      </div>
    </div>
  );
}

function GruppoPerGiorno({ lista, onEdit, onDelete, onToggleStatus, ordinamentoDecrescente }) {
  const perGiorno = {};
  lista.forEach(m => {
    const giorno = m.data_scadenza.slice(0, 10);
    if (!perGiorno[giorno]) perGiorno[giorno] = [];
    perGiorno[giorno].push(m);
  });
  const giorni = Object.keys(perGiorno).sort(ordinamentoDecrescente ? (a, b) => b.localeCompare(a) : undefined);

  return (
    <div className="space-y-4">
      {giorni.map(giorno => {
        const data = parseISO(giorno);
        const oggi = isToday(data);
        const isScaduto = isPast(data) && !oggi;
        return (
          <div key={giorno}>
            <p className={`text-xs font-bold mb-2 ${isScaduto ? 'text-red-600' : oggi ? 'text-orange-600' : 'text-slate-500'}`}>
              {oggi ? '📌 Oggi — ' : ''}{format(data, 'EEEE d MMMM yyyy', { locale: it })}
              {isScaduto && <AlertTriangle className="inline w-3 h-3 ml-1 text-red-500" />}
            </p>
            <div className="space-y-2">
              {perGiorno[giorno].map(m => <ManutenzioneRow key={m.id} manutenzione={m} onEdit={onEdit} onDelete={onDelete} onToggleStatus={onToggleStatus} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ListaManutenzioni({ manutenzioni, onEdit, onDelete, onToggleStatus, annoSelezionato, vistaApertiChiusi }) {
  const lista = manutenzioni
    .filter(m => m.data_scadenza && m.data_scadenza.startsWith(String(annoSelezionato)))
    .sort((a, b) => a.data_scadenza.localeCompare(b.data_scadenza));

  const attivi = lista.filter(m => m.stato !== 'completato' && m.stato !== 'annullato');
  const completati = lista.filter(m => m.stato === 'completato' || m.stato === 'annullato').sort((a, b) => b.data_scadenza.localeCompare(a.data_scadenza));
  const damostrare = vistaApertiChiusi === 'chiusi' ? completati : attivi;

  return (
    <div>
      {damostrare.length === 0 ? (
        <p className="text-center text-slate-400 py-8">Nessuna attività per il {annoSelezionato}</p>
      ) : (
        <div>
          <p className="text-sm font-semibold text-slate-600 mb-3">
            {vistaApertiChiusi === 'chiusi' ? '✅ Completati' : '🔴 Aperti'} ({damostrare.length})
          </p>
          <GruppoPerGiorno lista={damostrare} onEdit={onEdit} onDelete={onDelete} onToggleStatus={onToggleStatus} ordinamentoDecrescente={vistaApertiChiusi === 'chiusi'} />
        </div>
      )}
    </div>
  );
}