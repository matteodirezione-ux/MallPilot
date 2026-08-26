import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { sectionInfo, getSectionsForRole } from './onboardingContent';

export default function WelcomeModal({ userId, tipoAccount }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const visibleSections = useMemo(() => getSectionsForRole(tipoAccount), [tipoAccount]);

  useEffect(() => {
    if (userId && localStorage.getItem(`mp_onb_${userId}_welcome`) !== '1') {
      setOpen(true);
      setStep(0);
    }
  }, [userId]);

  const totalSteps = visibleSections.length;
  const lastStep = totalSteps + 1; // intro + sections + end
  const isIntro = step === 0;
  const isEnd = step === lastStep;
  const sectionKey = !isIntro && !isEnd ? visibleSections[step - 1] : null;
  const section = sectionKey ? sectionInfo[sectionKey] : null;

  const next = () => setStep(s => Math.min(s + 1, lastStep));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const finish = () => {
    if (userId) localStorage.setItem(`mp_onb_${userId}_welcome`, '1');
    setOpen(false);
  };

  const progress = Math.round((step / lastStep) * 100);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-hidden p-0 gap-0">
        {/* Progress bar */}
        <div className="h-1.5 w-full bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(88vh - 1.5rem - 4rem)' }}>
          {isIntro && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white mb-5 shadow-lg shadow-blue-500/30">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Benvenuto in Mall Pilot</h2>
              <p className="text-slate-500 mt-1">La piattaforma di gestione dei centri commerciali</p>
              <p className="text-sm text-slate-600 mt-5 max-w-md mx-auto leading-relaxed">
                Scopriamo insieme le sezioni dell'app che ti riguardano. Usa i pulsanti per scorrere: in ogni
                sezione troverai poi un banner di spiegazione che potrai chiudere e rivedere quando vuoi.
              </p>
              <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-400">
                <span>{totalSteps} sezioni</span>
                <span>•</span>
                <span>~1 minuto</span>
              </div>
            </div>
          )}

          {section && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-500/30">
                  <section.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                    Sezione {step} di {totalSteps}
                  </p>
                  <h2 className="text-xl font-bold text-slate-900 leading-tight">{section.label}</h2>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{section.text}</p>
            </div>
          )}

          {isEnd && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white mb-5 shadow-lg shadow-emerald-500/30">
                <Check className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Tutto pronto!</h2>
              <p className="text-sm text-slate-600 mt-3 max-w-md mx-auto leading-relaxed">
                Hai visto tutte le sezioni che ti competono. Ricorda: su ogni sezione troverai un banner
                informativo e, una volta chiuso, l'icona info per rivederlo in qualsiasi momento.
              </p>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
          <Button variant="ghost" size="sm" onClick={prev} disabled={isIntro} className="gap-1">
            <ChevronLeft className="w-4 h-4" />
            Indietro
          </Button>

          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: lastStep + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-blue-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Vai al passo ${i + 1}`}
              />
            ))}
          </div>

          {isEnd ? (
            <Button size="sm" onClick={finish} className="gap-1 bg-gradient-to-r from-blue-600 to-blue-700">
              Inizia
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={next} className="gap-1">
              {isIntro ? 'Inizia il tour' : 'Avanti'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}