import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const prioritaColors = {
  bassa: 'bg-slate-200 text-slate-700',
  media: 'bg-blue-200 text-blue-800',
  alta: 'bg-orange-200 text-orange-800',
  urgente: 'bg-red-300 text-red-900',
};

export default function CalendarioTask({ tasks, onTaskClick, onDayClick }) {
  const [mese, setMese] = useState(new Date());
  const inizioMese = startOfMonth(mese);
  const fineMese = endOfMonth(mese);
  const giorni = eachDayOfInterval({ start: inizioMese, end: fineMese });
  let offset = getDay(inizioMese) - 1;
  if (offset < 0) offset = 6;
  const taskPerGiorno = (giorno) => tasks.filter(t => t.data_scadenza && isSameDay(parseISO(t.data_scadenza), giorno));

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <Button variant="ghost" size="icon" onClick={() => setMese(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}><ChevronLeft className="w-4 h-4" /></Button>
        <h2 className="font-semibold text-slate-800">{format(mese, 'MMMM yyyy', { locale: it })}</h2>
        <Button variant="ghost" size="icon" onClick={() => setMese(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}><ChevronRight className="w-4 h-4" /></Button>
      </div>
      <div className="grid grid-cols-7 border-b border-slate-100">
        {['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(g => (
          <div key={g} className="text-center text-xs font-semibold text-slate-500 py-2">{g}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: offset }).map((_, i) => <div key={i} className="min-h-[80px] border-b border-r border-slate-100" />)}
        {giorni.map(giorno => {
          const taskGiorno = taskPerGiorno(giorno);
          const isOggi = isToday(giorno);
          return (
            <div key={giorno.toISOString()} onClick={() => onDayClick && onDayClick(giorno)} className={`min-h-[80px] border-b border-r border-slate-100 p-1.5 cursor-pointer hover:bg-slate-50 transition-colors ${isOggi ? 'bg-blue-50 hover:bg-blue-100' : ''}`}>
              <p className={`text-xs font-semibold mb-1 ${isOggi ? 'text-blue-600' : 'text-slate-600'}`}>{format(giorno, 'd')}</p>
              {taskGiorno.slice(0, 3).map(t => (
                <button key={t.id} onClick={e => { e.stopPropagation(); onTaskClick(t); }} className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate font-medium mb-0.5 ${prioritaColors[t.priorita] || prioritaColors.media} ${t.stato === 'completato' ? 'opacity-40 line-through' : ''}`} title={t.titolo}>{t.titolo}</button>
              ))}
              {taskGiorno.length > 3 && <p className="text-xs text-slate-400">+{taskGiorno.length - 3} altri</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}