import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format, parse } from 'date-fns';
import { it } from 'date-fns/locale';

export default function DatePicker({ value, onChange, placeholder, className = '' }) {
  const [open, setOpen] = useState(false);
  const selected = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={`flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white hover:bg-slate-50 transition-colors ${className}`}>
          <CalendarIcon className="w-4 h-4 text-slate-400" />
          {value ? format(selected, 'dd/MM/yyyy') : (placeholder || 'Seleziona data')}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) { onChange(format(date, 'yyyy-MM-dd')); setOpen(false); }
          }}
          locale={it}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}