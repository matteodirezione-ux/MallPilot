import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { sectionInfo } from './onboardingContent';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function SectionInfoButton({ section }) {
  const info = sectionInfo[section];
  const [open, setOpen] = useState(false);
  if (!info) return null;
  const Icon = info.icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center w-7 h-7 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0"
          title={`Info sezione: ${info.label}`}
        >
          <Info className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" side="bottom" align="start">
        <div className="flex gap-2.5 items-start">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">{info.label}</p>
            <ul className="text-sm text-slate-600 mt-1 leading-relaxed space-y-1 list-disc pl-5">
              {info.points.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}