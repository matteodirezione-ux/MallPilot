import React from 'react';
import { format, isToday, isTomorrow, isBefore } from 'date-fns';
import { it } from 'date-fns/locale';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

const priorityConfig = {
  bassa: { label: 'Bassa', color: '#0ea5e9' },
  media: { label: 'Media', color: '#f59e0b' },
  alta: { label: 'Alta', color: '#ef4444' },
  urgente: { label: 'Urgente', color: '#dc2626' }
};

const statusConfig = {
  da_fare: { label: 'Da Fare', icon: 'circle', color: '#6b7280' },
  in_corso: { label: 'In Corso', icon: 'clock', color: '#3b82f6' },
  completato: { label: 'Completato', icon: 'check', color: '#10b981' },
  annullato: { label: 'Annullato', icon: 'x', color: '#9ca3af' }
};

export default function TasksDashboard({ tasks = [] }) {
  const getDueDateLabel = (date) => {
    const taskDate = new Date(date);
    if (isToday(taskDate)) return 'Oggi';
    if (isTomorrow(taskDate)) return 'Domani';
    if (isBefore(taskDate, new Date())) return 'Scaduti';
    return format(taskDate, 'EEEE d MMMM', { locale: it });
  };

  // Organizza i task per data di scadenza (solo attivi)
  const groupedTasks = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const domani = new Date(today); domani.setDate(today.getDate() + 1);

  const activeTasks = tasks.filter(t => {
    if (t.stato === 'completato' || t.stato === 'annullato') return false;
    if (!t.data_scadenza) return false;
    const d = new Date(t.data_scadenza); d.setHours(0,0,0,0);
    return d <= domani; // solo scaduti, oggi e domani
  });

  activeTasks.forEach(task => {
    let groupKey = 'senza_data';

    if (task.data_scadenza) {
      const dueDate = new Date(task.data_scadenza);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate.getTime() === today.getTime()) groupKey = 'oggi';
      else if (dueDate.getTime() === domani.getTime()) groupKey = 'domani';
      else if (dueDate < today) groupKey = 'scaduti';
      else groupKey = format(dueDate, 'yyyy-MM-dd');
    }

    if (!groupedTasks[groupKey]) groupedTasks[groupKey] = [];
    groupedTasks[groupKey].push(task);
  });

  // Ordina i gruppi: scaduti prima, poi oggi, poi domani, poi futuri
  const sortedGroups = Object.keys(groupedTasks).sort((a, b) => {
    const order = ['scaduti', 'oggi', 'domani'];
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });

  if (activeTasks.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p className="text-sm">Nessun task da visualizzare</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedGroups.map(groupKey => (
        <div key={groupKey}>
          <h4 className="text-sm font-semibold text-slate-700 mb-2 capitalize">
            {groupKey === 'oggi' ? '📅 Oggi' : 
             groupKey === 'domani' ? '📅 Domani' : 
             groupKey === 'scaduti' ? '⚠️ Scaduti' : 
             groupKey === 'senza_data' ? '📌 Senza Data' : 
             format(new Date(groupKey), 'eee d MMM', { locale: it })}
          </h4>
          <div className="space-y-2">
            {groupedTasks[groupKey].map(task => (
              <div 
                key={task.id}
                className={`p-2 rounded-lg border transition-colors ${groupKey === 'scaduti' ? 'bg-red-50 border-red-200 hover:border-red-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
              >
                <div className="flex items-start gap-2">
                  {/* Priority indicator */}
                  <div 
                    className="w-1 h-6 rounded-full shrink-0 mt-0.5"
                    style={{ backgroundColor: priorityConfig[task.priorita]?.color || '#9ca3af' }}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{task.titolo}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 bg-white rounded border border-slate-200 text-slate-600">
                        {priorityConfig[task.priorita]?.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-white rounded border border-slate-200 text-slate-600">
                        {statusConfig[task.stato]?.label}
                      </span>
                      {task.assegnato_a_nome && (
                        <span className="text-xs text-slate-500">→ {task.assegnato_a_nome}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}