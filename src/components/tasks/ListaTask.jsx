import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, CheckCircle2, RefreshCw, Clock, AlertCircle, User } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

const prioritaConfig = {
  bassa: { label: 'Bassa', class: 'bg-slate-100 text-slate-700' },
  media: { label: 'Media', class: 'bg-blue-100 text-blue-700' },
  alta: { label: 'Alta', class: 'bg-orange-100 text-orange-700' },
  urgente: { label: 'Urgente', class: 'bg-red-100 text-red-700' },
};

const statoConfig = {
  da_fare: { label: 'Da fare', class: 'bg-slate-100 text-slate-700', icon: Clock },
  in_corso: { label: 'In corso', class: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  completato: { label: 'Completato', class: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  annullato: { label: 'Annullato', class: 'bg-slate-100 text-slate-400', icon: null },
};

function formatScadenza(data) {
  if (!data) return '';
  const d = parseISO(data);
  if (isToday(d)) return 'Oggi';
  if (isTomorrow(d)) return 'Domani';
  return format(d, 'd MMM yyyy', { locale: it });
}

function getScadenzaColor(data, stato) {
  if (stato === 'completato' || stato === 'annullato') return 'text-slate-400';
  if (!data) return '';
  const d = parseISO(data);
  if (isPast(d) && !isToday(d)) return 'text-red-600 font-semibold';
  if (isToday(d)) return 'text-orange-600 font-semibold';
  return 'text-slate-600';
}

function TaskRow({ task, onEdit, onDelete, onToggleStato, canEdit, canDelete }) {
  const pConf = prioritaConfig[task.priorita] || prioritaConfig.media;
  const sConf = statoConfig[task.stato] || statoConfig.da_fare;
  const StatoIcon = sConf.icon;
  
  const isScaduto = task.data_scadenza && isPast(parseISO(task.data_scadenza)) && !isToday(parseISO(task.data_scadenza)) && task.stato !== 'completato' && task.stato !== 'annullato';

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${isScaduto ? 'bg-red-50 border-red-300' : 'bg-white'} hover:shadow-sm transition-shadow ${task.stato === 'completato' ? 'opacity-60' : ''}`}>
      <button
        onClick={() => onToggleStato(task)}
        className="mt-0.5 flex-shrink-0"
        title="Cambia stato"
      >
        {task.stato === 'completato'
          ? <CheckCircle2 className="w-5 h-5 text-green-500" />
          : <div className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-blue-500 transition-colors" />
        }
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`font-medium text-slate-800 ${task.stato === 'completato' ? 'line-through' : ''}`}>
            {task.titolo}
          </p>
          <div className="flex items-center gap-1 flex-shrink-0">
            {task.ricorrente && (
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" title="Ricorrente" />
            )}
            <Badge className={`text-xs px-1.5 ${pConf.class}`}>{pConf.label}</Badge>
          </div>
        </div>

        {task.descrizione && (
          <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{task.descrizione}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {task.data_scadenza && (
            <span className={`text-xs flex items-center gap-1 ${getScadenzaColor(task.data_scadenza, task.stato)}`}>
              <Clock className="w-3 h-3" />
              {formatScadenza(task.data_scadenza)}
            </span>
          )}
          {task.assegnato_a_nome && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <User className="w-3 h-3" />
              {task.assegnato_a_nome}
            </span>
          )}
          {task.assegnato_da_nome && task.assegnato_da_email !== task.assegnato_a_email && (
            <span className="text-xs text-slate-400">da {task.assegnato_da_nome}</span>
          )}
          <Badge className={`text-xs px-1.5 ${sConf.class}`}>{sConf.label}</Badge>
        </div>
      </div>

      {canEdit && (
        <div className="flex gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => onEdit(task)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          {canDelete && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => onDelete(task.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ListaTask({ tasks, onEdit, onDelete, onToggleStato, canEdit, canDelete }) {
  // Separa da fare e completati
  const daFare = tasks.filter(t => t.stato !== 'completato' && t.stato !== 'annullato');
  const completati = tasks.filter(t => t.stato === 'completato' || t.stato === 'annullato')
    .sort((a, b) => new Date(a.data_scadenza) - new Date(b.data_scadenza));

  // Raggruppa da fare per data
  const gruppi = {};
  const senzaData = [];

  daFare.forEach(t => {
    if (!t.data_scadenza) {
      senzaData.push(t);
    } else {
      const key = t.data_scadenza; // formato YYYY-MM-DD
      if (!gruppi[key]) gruppi[key] = [];
      gruppi[key].push(t);
    }
  });

  const dateOrdinate = Object.keys(gruppi).sort();

  const getLabelData = (dateStr) => {
    const d = parseISO(dateStr);
    if (isPast(d) && !isToday(d)) return { label: `⚠ ${format(d, 'd MMM yyyy', { locale: it })}`, color: 'text-red-600' };
    if (isToday(d)) return { label: `📅 Oggi — ${format(d, 'd MMM yyyy', { locale: it })}`, color: 'text-orange-600' };
    if (isTomorrow(d)) return { label: `📋 Domani — ${format(d, 'd MMM yyyy', { locale: it })}`, color: 'text-blue-600' };
    return { label: `📋 ${format(d, 'd MMM yyyy', { locale: it })}`, color: 'text-slate-700' };
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Nessun task trovato</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          📋 Da Fare
        </h2>
        {daFare.length === 0 ? (
          <div className="text-center py-8 text-slate-400">Nessun task da fare</div>
        ) : (
          <div>
            {dateOrdinate.map(dateStr => {
              const { label, color } = getLabelData(dateStr);
              const list = gruppi[dateStr];
              return (
                <div key={dateStr} className="mb-5">
                  <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${color}`}>
                    <span>{label}</span>
                    <span className="text-xs font-normal bg-white border rounded-full px-2 py-0.5">{list.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {list.map(t => (
                      <TaskRow key={t.id} task={t} onEdit={onEdit} onDelete={onDelete} onToggleStato={onToggleStato} canEdit={canEdit} />
                    ))}
                  </div>
                </div>
              );
            })}

            {senzaData.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-slate-500">
                  <span>📋 Senza scadenza</span>
                  <span className="text-xs font-normal bg-white border rounded-full px-2 py-0.5">{senzaData.length}</span>
                </h3>
                <div className="space-y-2">
                  {senzaData.map(t => (
                    <TaskRow key={t.id} task={t} onEdit={onEdit} onDelete={onDelete} onToggleStato={onToggleStato} canEdit={canEdit} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {completati.length > 0 && (
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            ✓ Completati / Annullati
          </h2>
          <div className="space-y-2">
            {completati.map(t => (
              <TaskRow key={t.id} task={t} onEdit={onEdit} onDelete={onDelete} onToggleStato={onToggleStato} canEdit={canEdit} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}