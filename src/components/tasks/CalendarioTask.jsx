import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const prioritaColors = {
  bassa: 'bg-slate-200 text-slate-700',
  media: 'bg-blue-200 text-blue-800',
  alta: 'bg-orange-200 text-orange-800',
  urgente: 'bg-red-300 text-red-900',
};

export default function CalendarioTask({ tasks, onTaskClick }) {
  const [mese, setMese] = useState(new Date());

  const inizioMese = startOfMonth(mese);
  const fineMese = endOfMonth(mese);
  const giorni = eachDayOfInterval({ start: inizioMese, end: fineMese });

  // Offset per iniziare da lunedì
  let offset = getDay(inizioMese) - 1;
  if (offset < 0) offset = 6;

  const taskPerGiorno = (giorno) =>
    tasks.filter(t => t.data_scadenza && isSameDay(parseISO(t.data_scadenza), giorno));

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header navigazione */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <Button variant="ghost" size="icon" onClick={() => setMese(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="font-semibold text-slate-800 capitalize">
          {format(mese, 'MMMM yyyy', { locale: it })}
        </h2>
        <Button variant="ghost" size="icon" onClick={() => setMese(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Giorni della settimana */}
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(g => (
          <div key={g} className="py-2 text-center text-xs font-medium text-slate-500">{g}</div>
        ))}
      </div>

      {/* Griglia giorni */}
      <div className="grid grid-cols-7">
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-slate-100 bg-slate-50/50" />
        ))}

        {giorni.map(giorno => {
          const taskGiorno = taskPerGiorno(giorno);
          const isOggi = isToday(giorno);

          return (
            <div key={giorno.toISOString()} className={`min-h-[80px] border-b border-r border-slate-100 p-1.5 ${isOggi ? 'bg-blue-50' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1 ${
                isOggi ? 'bg-blue-600 text-white' : 'text-slate-600'
              }`}>
                {format(giorno, 'd')}
              </div>
              <div className="space-y-0.5">
                {taskGiorno.slice(0, 3).map(t => (
                  <button
                    key={t.id}
                    onClick={() => onTaskClick(t)}
                    className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate font-medium ${prioritaColors[t.priorita] || prioritaColors.media} ${t.stato === 'completato' ? 'opacity-40 line-through' : ''}`}
                    title={t.titolo}
                  >
                    {t.titolo}
                  </button>
                ))}
                {taskGiorno.length > 3 && (
                  <p className="text-xs text-slate-400 px-1">+{taskGiorno.length - 3} altri</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}