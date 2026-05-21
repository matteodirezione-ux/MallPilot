import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parse, startOfMonth, addMonths, addYears, setMonth, setYear, getYear, getMonth } from 'date-fns';
import { it } from 'date-fns/locale';

const MONTHS = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const DAYS_HEADER = ['Lu','Ma','Me','Gi','Ve','Sa','Do'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  // 0=Sun..6=Sat → convert to Mon-first (0=Mon..6=Sun)
  const day = new Date(year, month, 1).getDay();
  return (day + 6) % 7;
}

export default function DatePicker({ value, onChange, placeholder, className = '' }) {
  const [open, setOpen] = useState(false);
  const selected = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;

  const today = new Date();
  const [view, setView] = useState('days'); // 'days' | 'months' | 'years'
  const [cursor, setCursor] = useState(selected || today);

  const year = getYear(cursor);
  const month = getMonth(cursor);

  const handleOpen = (isOpen) => {
    if (isOpen) {
      setCursor(selected || today);
      setView('days');
    }
    setOpen(isOpen);
  };

  const selectDate = (d) => {
    onChange(format(d, 'yyyy-MM-dd'));
    setOpen(false);
  };

  // ---- YEARS VIEW ----
  const yearStart = Math.floor(year / 12) * 12;
  const years = Array.from({ length: 12 }, (_, i) => yearStart + i);

  // ---- DAYS VIEW ----
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const isSelected = (d) => selected && getYear(selected) === year && getMonth(selected) === month && selected.getDate() === d;
  const isToday = (d) => getYear(today) === year && getMonth(today) === month && today.getDate() === d;

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button className={`flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white hover:bg-slate-50 transition-colors ${className}`}>
          <CalendarIcon className="w-4 h-4 text-slate-400" />
          {value ? format(selected, 'dd/MM/yyyy') : (placeholder || 'Seleziona data')}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">

        {/* Header navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => {
              if (view === 'days') setCursor(c => addMonths(c, -1));
              else if (view === 'months') setCursor(c => addYears(c, -1));
              else setCursor(c => setYear(c, getYear(c) - 12));
            }}
            className="p-1 rounded hover:bg-slate-100 text-slate-500"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => setView(v => v === 'days' ? 'months' : v === 'months' ? 'years' : 'days')}
            className="text-sm font-semibold text-slate-800 hover:text-blue-600 transition-colors px-2 py-1 rounded hover:bg-slate-100"
          >
            {view === 'days' && format(cursor, 'MMMM yyyy', { locale: it })}
            {view === 'months' && year}
            {view === 'years' && `${yearStart} – ${yearStart + 11}`}
          </button>

          <button
            onClick={() => {
              if (view === 'days') setCursor(c => addMonths(c, 1));
              else if (view === 'months') setCursor(c => addYears(c, 1));
              else setCursor(c => setYear(c, getYear(c) + 12));
            }}
            className="p-1 rounded hover:bg-slate-100 text-slate-500"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* YEARS VIEW */}
        {view === 'years' && (
          <div className="grid grid-cols-4 gap-1">
            {years.map(y => (
              <button
                key={y}
                onClick={() => { setCursor(c => setYear(c, y)); setView('months'); }}
                className={`py-1.5 rounded text-sm transition-colors ${y === year ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-100 text-slate-700'}`}
              >
                {y}
              </button>
            ))}
          </div>
        )}

        {/* MONTHS VIEW */}
        {view === 'months' && (
          <div className="grid grid-cols-3 gap-1">
            {MONTHS.map((m, i) => (
              <button
                key={i}
                onClick={() => { setCursor(c => setMonth(c, i)); setView('days'); }}
                className={`py-2 rounded text-sm transition-colors ${i === month ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-100 text-slate-700'}`}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {/* DAYS VIEW */}
        {view === 'days' && (
          <>
            <div className="grid grid-cols-7 mb-1">
              {DAYS_HEADER.map(d => (
                <div key={d} className="text-center text-xs text-slate-400 font-medium py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
              {cells.map((d, i) => (
                <button
                  key={i}
                  disabled={!d}
                  onClick={() => d && selectDate(new Date(year, month, d))}
                  className={`h-8 w-8 mx-auto rounded-full text-sm transition-colors
                    ${!d ? 'invisible' : ''}
                    ${d && isSelected(d) ? 'bg-blue-600 text-white font-semibold' : ''}
                    ${d && isToday(d) && !isSelected(d) ? 'border border-blue-400 text-blue-600 font-semibold' : ''}
                    ${d && !isSelected(d) && !isToday(d) ? 'hover:bg-slate-100 text-slate-700' : ''}
                  `}
                >
                  {d}
                </button>
              ))}
            </div>
            {/* Today shortcut */}
            <div className="mt-2 text-center">
              <button
                onClick={() => selectDate(today)}
                className="text-xs text-blue-600 hover:underline"
              >
                Oggi
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}