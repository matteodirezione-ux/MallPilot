import React from 'react';
import MeteoMensile from '@/components/dashboard/MeteoMensile';
import { Cloud } from 'lucide-react';

export default function Meteo({ centroSelezionato }) {
  if (!centroSelezionato?.citta) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Cloud className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Nessun centro commerciale con città assegnata</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Meteo</h1>
        <p className="text-slate-500 text-sm mt-1">Confronto meteo mensile: anno corrente vs anno precedente</p>
      </div>
      <MeteoMensile citta={centroSelezionato.citta} provincia={centroSelezionato.provincia} centroId={centroSelezionato.id} />
    </div>
  );
}