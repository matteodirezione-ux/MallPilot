import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { sectionInfo } from './onboardingContent';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function SectionBanner({ section, userId }) {
  const info = sectionInfo[section];
  const [dismissed, setDismissed] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setDismissed(!userId ? true : localStorage.getItem(`mp_onb_${userId}_sec_${section}`) === '1');
    setOpen(false);
  }, [section, userId]);

  if (!info) return null;

  const Icon = info.icon;

  const dismiss = () => {
    if (userId) localStorage.setItem(`mp_onb_${userId}_sec_${section}`, '1');
    setDismissed(true);
  };

  return (
    <div className="px-4 md:px-8 pt-4 md:pt-6">
      {!dismissed && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex gap-3 items-start">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-blue-900 text-sm">{info.label}</p>
            <p className="text-sm text-blue-800/90 mt-0.5 leading-relaxed">{info.text}</p>
          </div>
          <button
            onClick={dismiss}
            className="flex-shrink-0 px-3 py-1.5 rounded-md bg-white border border-blue-300 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
          >
            Ho capito
          </button>
        </div>
      )}
      {dismissed && (
        <div className="flex justify-end">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition-colors"
                title={`Info sezione: ${info.label}`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>Info sezione</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80" side="bottom" align="end">
              <div className="flex gap-2.5 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{info.label}</p>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{info.text}</p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}