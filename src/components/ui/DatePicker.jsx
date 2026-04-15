import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format, parse } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * DatePicker riutilizzabile con stile Popover+Calendar.
 * Props:
 *  - value: stringa 'yyyy-MM-dd'
 *  - onChange: (stringa 'yyyy-MM-dd') => void
 *  - placeholder: stringa opzionale
 *  - className: classi aggiuntive per il trigger
 */
export default function DatePicker({ value, onChange, placeholder, className = '' }) {
  const [open, setOpen] = useState(false);
  const selected = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`h-9 w-full flex items-center gap-2 px-3 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors ${className}`}
        >
          <CalendarIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className={value ? 'text-slate-800' : 'text-slate-400'}>
            {value ? format(selected, 'dd/MM/yyyy') : (placeholder || 'Seleziona data')}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onChange(format(date, 'yyyy-MM-dd'));
              setOpen(false);
            }
          }}
          locale={it}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}