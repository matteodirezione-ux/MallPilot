import React, { useState, useEffect } from 'react';
import { sectionInfo } from './onboardingContent';

export default function SectionBanner({ section, userId }) {
  const info = sectionInfo[section];
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(!userId ? true : localStorage.getItem(`mp_onb_${userId}_sec_${section}`) === '1');
  }, [section, userId]);

  if (!info || dismissed) return null;

  const Icon = info.icon;

  const dismiss = () => {
    if (userId) localStorage.setItem(`mp_onb_${userId}_sec_${section}`, '1');
    setDismissed(true);
  };

  return (
    <div className="px-4 md:px-8 pt-4 md:pt-6">
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-500 to-blue-600" />
        <div className="p-4 md:p-5 pl-6 md:pl-7">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900 text-sm">{info.label}</p>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Guida sezione</span>
              </div>
              <ul className="text-sm text-slate-600 mt-2 leading-relaxed space-y-1.5">
                {info.points.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 flex-shrink-0 w-1 h-1 rounded-full bg-blue-500" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={dismiss}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-700 transition-colors shadow-sm"
            >
              Ho capito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}