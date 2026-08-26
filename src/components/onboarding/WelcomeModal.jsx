import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { sectionInfo, sectionOrder } from './onboardingContent';

export default function WelcomeModal({ userId }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (userId && localStorage.getItem(`mp_onb_${userId}_welcome`) !== '1') {
      setOpen(true);
    }
  }, [userId]);

  const start = () => {
    if (userId) localStorage.setItem(`mp_onb_${userId}_welcome`, '1');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Benvenuto in Mall Pilot</DialogTitle>
              <DialogDescription>La piattaforma di gestione dei centri commerciali</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 text-sm text-slate-600">
          <p>
            Mall Pilot ti aiuta a gestire prenotazioni degli spazi, task, manutenzioni, ticket, corrispettivi
            e documentazione del centro — tutto da un unico posto. Ecco in breve cosa trovi in ogni sezione:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sectionOrder.map(key => {
              const s = sectionInfo[key];
              const Icon = s.icon;
              return (
                <div key={key} className="flex gap-2 items-start p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-xs">{s.label}</p>
                    <p className="text-xs text-slate-500 leading-snug">{s.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 pt-1">
            All'apertura di ogni sezione troverai un banner di spiegazione: puoi chiuderlo con «Ho capito» e
            rivederlo in qualsiasi momento cliccando sull'icona info in alto a destra.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={start} className="w-full sm:w-auto">Inizia</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}