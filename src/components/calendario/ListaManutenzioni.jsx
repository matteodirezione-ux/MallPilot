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
    <div className={`border rounded-lg p-3 ${sConf.bg} ${sConf.border} transition-colors`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={manutenzione.stato === 'completato'}
          onCheckedChange={() => onToggleStatus(manutenzione)}
          className="mt-1"
        />

        <div className="flex-1 min-w-0">
          <p className={`font-medium ${sConf.color}`}>
            {manutenzione.titolo}
          </p>

          {manutenzione.descrizione && (
            <p className="text-sm text-slate-600 mt-1">{manutenzione.descrizione}</p>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-xs px-2 py-1 rounded ${sConf.bg} ${sConf.border} border font-medium ${sConf.color}`}>
              {sConf.label}
            </span>
            <span className={`text-xs font-medium ${isScaduto ? 'text-red-600' : 'text-slate-600'}`}>
              {format(dataScad, 'd MMM yyyy', { locale: it })}
            </span>
            {manutenzione.assegnato_a_nome && (
              <span className="text-xs text-slate-500">→ {manutenzione.assegnato_a_nome}</span>
            )}
          </div>
        </div>

        <div className="flex gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-blue-600"
            onClick={() => onEdit(manutenzione)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-red-600"
            onClick={() => onDelete(manutenzione.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ListaManutenzioni({ manutenzioni, onEdit, onDelete, onToggleStatus }) {
  if (manutenzioni.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>Nessuna manutenzione da visualizzare</p>
      </div>
    );
  }

  const groupedByStatus = {
    da_fare: [],
    in_corso: [],
    completato: [],
    annullato: []
  };

  manutenzioni.forEach(m => {
    if (groupedByStatus[m.stato]) {
      groupedByStatus[m.stato].push(m);
    }
  });

  return (
    <div className="space-y-6">
      {['da_fare', 'in_corso', 'completato'].map(status => {
        const list = groupedByStatus[status];
        if (list.length === 0) return null;

        const sConf = statoConfig[status];
        const labels = { da_fare: '🔴 Da Fare', in_corso: '🔵 In Corso', completato: '✅ Completato' };

        return (
          <div key={status}>
            <h3 className={`text-sm font-semibold ${sConf.color} mb-3 uppercase`}>
              {labels[status]} ({list.length})
            </h3>
            <div className="space-y-2">
              {list.map(m => (
                <ManutenzioneRow
                  key={m.id}
                  manutenzione={m}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleStatus={onToggleStatus}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}