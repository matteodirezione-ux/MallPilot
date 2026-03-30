import React from 'react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2 } from 'lucide-react';

const statoConfig = {
  da_fare: { label: 'Da Fare', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  in_corso: { label: 'In Corso', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  completato: { label: 'Completato', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  annullato: { label: 'Annullato', color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200' }
};

function ManutenzioneRow({ manutenzione, onEdit, onDelete, onToggleStatus }) {
  const sConf = statoConfig[manutenzione.stato] || statoConfig.da_fare;
  const dataScad = parseISO(manutenzione.data_scadenza);
  const isScaduto = isPast(dataScad) && !isToday(dataScad) && manutenzione.stato !== 'completato' && manutenzione.stato !== 'annullato';

  return (
    <div className={`border rounded-lg px-3 py-2.5 ${sConf.bg} ${sConf.border} transition-colors`}>
      {/* Layout mobile: due righe */}
      <div className="flex items-start gap-2.5">
        <Checkbox
          checked={manutenzione.stato === 'completato'}
          onCheckedChange={() => onToggleStatus(manutenzione)}
          className="mt-0.5 flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          {/* Riga 1: titolo + bottoni */}
          <div className="flex items-start justify-between gap-2">
            <p className={`font-medium text-sm leading-snug ${sConf.color}`}>{manutenzione.titolo}</p>
            <div className="flex gap-0.5 flex-shrink-0 -mt-0.5">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => onEdit(manutenzione)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => onDelete(manutenzione)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Riga 2: descrizione */}
          {manutenzione.descrizione && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{manutenzione.descrizione}</p>
          )}

          {/* Riga 3: data + assegnato */}
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className={`text-xs font-semibold ${isScaduto ? 'text-red-600' : 'text-slate-600'}`}>
              📅 {format(dataScad, 'd MMM yyyy', { locale: it })}
            </span>
            {manutenzione.assegnato_a_nome && (
              <span className="text-xs text-slate-500">→ {manutenzione.assegnato_a_nome}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GruppoPerGiorno({ lista, onEdit, onDelete, onToggleStatus }) {
  const perGiorno = {};
  lista.forEach(m => {
    const giorno = m.data_scadenza.slice(0, 10);
    if (!perGiorno[giorno]) perGiorno[giorno] = [];
    perGiorno[giorno].push(m);
  });
  const giorni = Object.keys(perGiorno).sort();

  return (
    <div className="space-y-4">
      {giorni.map(giorno => {
        const data = parseISO(giorno);
        const oggi = isToday(data);
        return (
          <div key={giorno}>
            <h4 className={`text-xs font-bold mb-2 uppercase tracking-wide ${oggi ? 'text-blue-600' : 'text-slate-500'}`}>
              {oggi ? '📌 Oggi — ' : ''}{format(data, 'EEEE d MMMM yyyy', { locale: it })}
            </h4>
            <div className="space-y-2">
              {perGiorno[giorno].map(m => (
                <ManutenzioneRow key={m.id} manutenzione={m} onEdit={onEdit} onDelete={onDelete} onToggleStatus={onToggleStatus} />
              ))}
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
  const completati = lista.filter(m => m.stato === 'completato' || m.stato === 'annullato');

  const damostrare = vistaApertiChiusi === 'chiusi' ? completati : attivi;

  return (
    <div>
      {damostrare.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p>Nessuna attività per il {annoSelezionato}</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${vistaApertiChiusi === 'chiusi' ? 'text-slate-500' : 'text-slate-700'}`}>
              {vistaApertiChiusi === 'chiusi' ? '✅ Completati' : '🔴 Aperti'}
              <span className="text-xs font-normal text-slate-400">({damostrare.length})</span>
            </h3>
            <GruppoPerGiorno lista={damostrare} onEdit={onEdit} onDelete={onDelete} onToggleStatus={onToggleStatus} />
          </div>
        </div>
      )}
    </div>
  );
}