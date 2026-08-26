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
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex gap-3 items-start">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-blue-900 text-sm">{info.label}</p>
          <ul className="text-sm text-blue-800/90 mt-1 leading-relaxed space-y-1 list-disc pl-5">
            {info.points.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
        <button
          onClick={dismiss}
          className="flex-shrink-0 px-3 py-1.5 rounded-md bg-white border border-blue-300 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
        >
          Ho capito
        </button>
      </div>
    </div>
  );
}