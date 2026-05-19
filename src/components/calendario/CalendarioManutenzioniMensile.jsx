import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export default function CalendarioManutenzioniMensile({ tasks, onTaskClick, onToggleStatus, onNewTask, onMonthChange, annoSelezionato }) {
  const [mese, setMese] = React.useState(new Date());

  React.useEffect(() => {
    if (annoSelezionato) setMese(prev => new Date(annoSelezionato, prev.getMonth(), 1));
  }, [annoSelezionato]);

  const inizioMese = startOfMonth(mese);
  const fineMese = endOfMonth(mese);
  const giorni = eachDayOfInterval({ start: inizioMese, end: fineMese });
  let offset = getDay(inizioMese) - 1;
  if (offset < 0) offset = 6;
  const taskPerGiorno = (giorno) => tasks.filter(t => t.data_scadenza && isSameDay(parseISO(t.data_scadenza), giorno));

  const handleMonthChange = (direction) => {
    const newMese = new Date(mese.getFullYear(), mese.getMonth() + direction, 1);
    setMese(newMese);
    onMonthChange?.(newMese);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <Button variant="ghost" size="icon" onClick={() => handleMonthChange(-1)}><ChevronLeft className="w-4 h-4" /></Button>
        <h2 className="font-semibold text-slate-800">{format(mese, 'MMMM yyyy', { locale: it })}</h2>
        <Button variant="ghost" size="icon" onClick={() => handleMonthChange(1)}><ChevronRight className="w-4 h-4" /></Button>
      </div>
      <div className="grid grid-cols-7 border-b border-slate-100">
        {[['L','Lun'],['M','Mar'],['M','Mer'],['G','Gio'],['V','Ven'],['S','Sab'],['D','Dom']].map(([short, full], i) => (
          <div key={i} className="text-center py-2">
            <span className="md:hidden text-xs font-semibold text-slate-500">{short}</span>
            <span className="hidden md:inline text-xs font-semibold text-slate-500">{full}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: offset }).map((_, i) => <div key={i} className="border-b border-r border-slate-100" />)}
        {giorni.map(giorno => {
          const taskGiorno = taskPerGiorno(giorno);
          const isOggi = isToday(giorno);
          return (
            <div key={giorno.toISOString()} className={`border-b border-r border-slate-100 min-h-[60px] md:min-h-[100px] ${isOggi ? 'bg-blue-50' : ''}`}>
              <div className="p-1 flex justify-between items-center">
                <span className={`text-xs font-semibold ${isOggi ? 'text-blue-600' : 'text-slate-600'}`}>{format(giorno, 'd')}</span>
                {/* Mobile dot indicators */}
                <div className="md:hidden flex gap-0.5">
                  {taskGiorno.length > 0 && (
                    <button onClick={() => taskGiorno.length === 1 ? onTaskClick(taskGiorno[0]) : onNewTask(giorno)}>
                      {taskGiorno.slice(0, 3).map(t => (
                        <span key={t.id} onClick={e => { e.stopPropagation(); onTaskClick(t); }} className={`inline-block w-2 h-2 rounded-full ${t.stato === 'completato' ? 'bg-green-500' : 'bg-red-500'}`} title={t.titolo} />
                      ))}
                    </button>
                  )}
                </div>
                <button onClick={() => onNewTask(giorno)} className="md:hidden text-slate-300 text-xs">+</button>
              </div>
              {/* Desktop full items */}
              <div className="hidden md:block px-1 pb-1 space-y-0.5">
                {taskGiorno.slice(0, 4).map(t => (
                  <div key={t.id} className="flex items-start gap-1">
                    <Checkbox checked={t.stato === 'completato'} onCheckedChange={() => onToggleStatus(t)} className="mt-0.5 w-3 h-3" />
                    <span onClick={() => onTaskClick(t)} className={`flex-1 text-xs truncate cursor-pointer font-medium ${t.stato === 'completato' ? 'text-green-700 line-through' : 'text-red-700'}`} title={t.titolo}>{t.titolo}</span>
                  </div>
                ))}
                {taskGiorno.length > 4 && <p className="text-xs text-slate-400">+{taskGiorno.length - 4}</p>}
                <button onClick={() => onNewTask(giorno)} className="flex items-center gap-0.5 text-slate-300 hover:text-blue-500 text-xs">
                  <Plus className="w-3 h-3" /> Nuovo
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}