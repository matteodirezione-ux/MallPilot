import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export default function CalendarioManutenzioniMensile({ tasks, onTaskClick, onToggleStatus, onNewTask, onMonthChange, annoSelezionato }) {
  const [mese, setMese] = React.useState(new Date());

  React.useEffect(() => {
    if (annoSelezionato) {
      setMese(prev => new Date(annoSelezionato, prev.getMonth(), 1));
    }
  }, [annoSelezionato]);

  const inizioMese = startOfMonth(mese);
  const fineMese = endOfMonth(mese);
  const giorni = eachDayOfInterval({ start: inizioMese, end: fineMese });

  let offset = getDay(inizioMese) - 1;
  if (offset < 0) offset = 6;

  const taskPerGiorno = (giorno) =>
    tasks.filter(t => t.data_scadenza && isSameDay(parseISO(t.data_scadenza), giorno));

  const handleMonthChange = (direction) => {
    const newMese = new Date(mese.getFullYear(), mese.getMonth() + direction, 1);
    setMese(newMese);
    onMonthChange?.(newMese);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header navigazione */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <Button variant="ghost" size="icon" onClick={() => handleMonthChange(-1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="font-semibold text-slate-800 capitalize">
          {format(mese, 'MMMM yyyy', { locale: it })}
        </h2>
        <Button variant="ghost" size="icon" onClick={() => handleMonthChange(1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Giorni della settimana */}
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
        {[['L','Lun'], ['M','Mar'], ['M','Mer'], ['G','Gio'], ['V','Ven'], ['S','Sab'], ['D','Dom']].map(([short, full], i) => (
          <div key={i} className="py-2 text-center text-xs font-medium text-slate-500">
            <span className="sm:hidden">{short}</span>
            <span className="hidden sm:inline">{full}</span>
          </div>
        ))}
      </div>

      {/* Griglia giorni */}
      <div className="grid grid-cols-7">
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[60px] md:min-h-[100px] border-b border-r border-slate-100 bg-slate-50/50" />
        ))}

        {giorni.map(giorno => {
          const taskGiorno = taskPerGiorno(giorno);
          const isOggi = isToday(giorno);

          return (
            <div
              key={giorno.toISOString()}
              className={`min-h-[60px] md:min-h-[100px] border-b border-r border-slate-100 p-1 md:p-2 transition-colors ${
                isOggi ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1 md:mb-2 ${
                isOggi ? 'bg-blue-600 text-white' : 'text-slate-600'
              }`}>
                {format(giorno, 'd')}
              </div>

              <div className="space-y-1">
                {/* Mobile: dot indicators */}
                <div className="sm:hidden">
                  {taskGiorno.length > 0 && (
                    <div
                      className="flex flex-wrap gap-0.5 cursor-pointer"
                      onClick={() => taskGiorno.length === 1 ? onTaskClick(taskGiorno[0]) : onNewTask(giorno)}
                    >
                      {taskGiorno.slice(0, 3).map(t => (
                        <div
                          key={t.id}
                          onClick={(e) => { e.stopPropagation(); onTaskClick(t); }}
                          className={`w-2 h-2 rounded-full ${t.stato === 'completato' ? 'bg-green-500' : 'bg-red-500'}`}
                          title={t.titolo}
                        />
                      ))}
                      {taskGiorno.length > 3 && (
                        <span className="text-[9px] text-slate-400">+{taskGiorno.length - 3}</span>
                      )}
                    </div>
                  )}
                  <button
                    className="w-full mt-0.5 text-[10px] text-slate-300 hover:text-blue-500 text-center"
                    onClick={() => onNewTask(giorno)}
                  >+</button>
                </div>

                {/* Desktop: full items */}
                <div className="hidden sm:block space-y-1.5">
                  {taskGiorno.slice(0, 4).map(t => (
                    <div
                      key={t.id}
                      className={`flex items-start gap-1.5 p-1 rounded text-xs group transition-colors ${
                        t.stato === 'completato'
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <Checkbox
                        checked={t.stato === 'completato'}
                        onCheckedChange={() => onToggleStatus(t)}
                        className="mt-0.5"
                      />
                      <span
                        onClick={() => onTaskClick(t)}
                        className={`flex-1 truncate cursor-pointer font-medium ${
                          t.stato === 'completato' ? 'text-green-700' : 'text-red-700'
                        }`}
                        title={t.titolo}
                      >
                        {t.titolo}
                      </span>
                    </div>
                  ))}
                  {taskGiorno.length > 4 && (
                    <p className="text-xs text-slate-400 px-1">+{taskGiorno.length - 4}</p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-6 text-xs text-slate-400 hover:text-blue-600 gap-1"
                    onClick={() => onNewTask(giorno)}
                  >
                    <Plus className="w-3 h-3" />
                    Nuovo
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}