import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { X } from 'lucide-react';
import { getWmo } from './meteoUtils';

export default function MeteoConfrontoPeriodi({ records, periodoA, periodoB, placeName, onChiudi }) {
  const labelA = `${format(parseISO(periodoA.start), 'dd MMM yyyy', { locale: it })} → ${format(parseISO(periodoA.end), 'dd MMM yyyy', { locale: it })}`;
  const labelB = `${format(parseISO(periodoB.start), 'dd MMM yyyy', { locale: it })} → ${format(parseISO(periodoB.end), 'dd MMM yyyy', { locale: it })}`;

  const stats = useMemo(() => {
    const compute = (start, end) => {
      const s = parseISO(start);
      const e = parseISO(end);
      const inRange = records.filter(r => {
        if (!r.data) return false;
        const d = parseISO(r.data);
        return d >= s && d <= e;
      });
      let sereni = 0, pioggia = 0, tempSum = 0, tempCount = 0;
      const days = [];
      inRange.forEach(r => {
        const wmo = getWmo(r.weather_code);
        if (wmo) {
          if (wmo.rank <= 2) sereni++;
          if (wmo.rank >= 5) pioggia++;
        }
        const tMax = r.temp_max;
        const tMin = r.temp_min;
        if (tMax !== null && tMax !== undefined) {
          tempSum += (tMax + (tMin ?? tMax)) / 2;
          tempCount++;
        }
        days.push({
          data: r.data,
          wmo,
          tMax: tMax ?? null,
          tMin: tMin ?? null,
        });
      });
      days.sort((a, b) => a.data.localeCompare(b.data));
      return {
        totale: inRange.length,
        sereni,
        pioggia,
        tempMedia: tempCount ? +(tempSum / tempCount).toFixed(1) : null,
        giorni: days,
      };
    };
    return {
      a: compute(periodoA.start, periodoA.end),
      b: compute(periodoB.start, periodoB.end),
    };
  }, [records, periodoA, periodoB]);

  const maxLen = Math.max(stats.a.giorni.length, stats.b.giorni.length);

  const DeltaBadge = ({ val, invert, unit = '' }) => {
    if (val === null || val === undefined) return <span className="text-slate-400 text-xs">—</span>;
    const positive = invert ? val < 0 : val > 0;
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${val === 0 ? 'bg-slate-100 text-slate-500' : positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
        {val > 0 ? '+' : ''}{val}{unit}
      </span>
    );
  };

  const fmtVal = (val, unit = '') => val !== null && val !== undefined ? `${val}${unit}` : '—';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.12)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Confronto periodi</h3>
            {placeName && <p className="text-xs text-slate-500">📍 {placeName}</p>}
          </div>
        </div>
        <button onClick={onChiudi} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors text-xs font-medium text-slate-700 shadow-sm">
          <X className="w-3.5 h-3.5" />
          Torna al mese
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border-b border-slate-100">
        <div className="rounded-xl bg-gradient-to-br from-yellow-50 to-amber-50 border border-amber-100 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xl">☀️</span>
            <span className="text-xs font-semibold text-amber-700">Giorni sereni/nuvolosi</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-800">{stats.a.sereni}</span>
              <span className="text-xs text-amber-600">A</span>
              <span className="text-slate-300 text-xs">vs</span>
              <span className="text-base font-medium text-amber-500">{stats.b.sereni}</span>
              <span className="text-xs text-amber-400">B</span>
            </div>
            <DeltaBadge val={stats.a.sereni - stats.b.sereni} invert={false} />
          </div>
          <p className="text-[10px] text-amber-500 mt-2">Totale giorni: A {stats.a.totale} · B {stats.b.totale}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xl">🌧️</span>
            <span className="text-xs font-semibold text-blue-700">Giorni di pioggia</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-800">{stats.a.pioggia}</span>
              <span className="text-xs text-blue-600">A</span>
              <span className="text-slate-300 text-xs">vs</span>
              <span className="text-base font-medium text-blue-400">{stats.b.pioggia}</span>
              <span className="text-xs text-blue-300">B</span>
            </div>
            <DeltaBadge val={stats.a.pioggia - stats.b.pioggia} invert={true} />
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-orange-50 to-red-50 border border-orange-100 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xl">🌡️</span>
            <span className="text-xs font-semibold text-orange-700">Temperatura media</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-orange-800">{fmtVal(stats.a.tempMedia, '°')}</span>
              <span className="text-xs text-orange-600">A</span>
              <span className="text-slate-300 text-xs">vs</span>
              <span className="text-base font-medium text-orange-400">{fmtVal(stats.b.tempMedia, '°')}</span>
              <span className="text-xs text-orange-300">B</span>
            </div>
            <DeltaBadge val={stats.a.tempMedia !== null && stats.b.tempMedia !== null ? +(stats.a.tempMedia - stats.b.tempMedia).toFixed(1) : null} invert={false} unit="°" />
          </div>
        </div>
      </div>

      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-4 text-xs">
        <div><span className="font-semibold text-indigo-600">Periodo A:</span> <span className="text-slate-600">{labelA}</span></div>
        <div><span className="font-semibold text-purple-600">Periodo B:</span> <span className="text-slate-600">{labelB}</span></div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50">
              <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-600 border-b border-slate-200 z-10 w-10">n°</th>
              <th colSpan={3} className="px-2 py-2 text-center font-semibold text-indigo-700 border-b border-slate-200 bg-indigo-50">Periodo A</th>
              <th colSpan={3} className="px-2 py-2 text-center font-semibold text-purple-700 border-b border-slate-200 bg-purple-50">Periodo B</th>
              <th colSpan={2} className="px-2 py-2 text-center font-semibold text-orange-700 border-b border-slate-200 bg-orange-50">Delta</th>
            </tr>
            <tr className="bg-slate-50 text-[10px] text-slate-500">
              <th className="sticky left-0 bg-slate-50 px-3 py-1 border-b border-slate-100 z-10"></th>
              <th className="px-2 py-1 border-b border-slate-100 bg-indigo-50 text-indigo-600">Data</th>
              <th className="px-2 py-1 border-b border-slate-100 bg-indigo-50 text-indigo-600">Meteo</th>
              <th className="px-2 py-1 border-b border-slate-100 bg-indigo-50 text-indigo-600">Max/Min</th>
              <th className="px-2 py-1 border-b border-slate-100 bg-purple-50 text-purple-600">Data</th>
              <th className="px-2 py-1 border-b border-slate-100 bg-purple-50 text-purple-600">Meteo</th>
              <th className="px-2 py-1 border-b border-slate-100 bg-purple-50 text-purple-600">Max/Min</th>
              <th className="px-2 py-1 border-b border-slate-100 bg-orange-50 text-orange-600">Stato</th>
              <th className="px-2 py-1 border-b border-slate-100 bg-orange-50 text-orange-600">ΔMax °C</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxLen }, (_, i) => {
              const ga = stats.a.giorni[i];
              const gb = stats.b.giorni[i];
              const deltaTemp = (ga?.tMax !== null && gb?.tMax !== null && ga?.tMax !== undefined && gb?.tMax !== undefined) ? ga.tMax - gb.tMax : null;
              const deltaMeteo = (ga?.wmo && gb?.wmo) ? ga.wmo.rank - gb.wmo.rank : null;
              let deltaTempColor = 'text-slate-500';
              if (deltaTemp !== null) {
                if (deltaTemp > 2) deltaTempColor = 'text-red-600 font-semibold';
                else if (deltaTemp < -2) deltaTempColor = 'text-blue-600 font-semibold';
              }
              let deltaMeteoLabel = '—', deltaMeteoColor = 'text-slate-400';
              if (deltaMeteo !== null) {
                if (deltaMeteo > 1) { deltaMeteoLabel = '↓ Peggio'; deltaMeteoColor = 'text-red-500 font-medium'; }
                else if (deltaMeteo < -1) { deltaMeteoLabel = '↑ Meglio'; deltaMeteoColor = 'text-green-600 font-medium'; }
                else { deltaMeteoLabel = '≈ Simile'; deltaMeteoColor = 'text-slate-500'; }
              }
              return (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                  <td className="sticky left-0 px-3 py-1.5 font-semibold z-10 bg-white text-slate-700">{i + 1}</td>
                  <td className="px-2 py-1.5 text-center bg-indigo-50/40 text-slate-600">{ga ? format(parseISO(ga.data), 'dd MMM', { locale: it }) : '—'}</td>
                  <td className="px-2 py-1.5 text-center bg-indigo-50/40">{ga?.wmo ? <span title={ga.wmo.label}>{ga.wmo.emoji}</span> : <span className="text-slate-300">—</span>}</td>
                  <td className="px-2 py-1.5 text-center bg-indigo-50/40 text-slate-500">{ga ? `${ga.tMax ?? '—'}°/${ga.tMin ?? '—'}°` : '—'}</td>
                  <td className="px-2 py-1.5 text-center bg-purple-50/40 text-slate-600">{gb ? format(parseISO(gb.data), 'dd MMM', { locale: it }) : '—'}</td>
                  <td className="px-2 py-1.5 text-center bg-purple-50/40">{gb?.wmo ? <span title={gb.wmo.label}>{gb.wmo.emoji}</span> : <span className="text-slate-300">—</span>}</td>
                  <td className="px-2 py-1.5 text-center bg-purple-50/40 text-slate-500">{gb ? `${gb.tMax ?? '—'}°/${gb.tMin ?? '—'}°` : '—'}</td>
                  <td className={`px-2 py-1.5 text-center bg-orange-50/40 ${deltaMeteoColor}`}>{deltaMeteoLabel}</td>
                  <td className={`px-2 py-1.5 text-center bg-orange-50/40 ${deltaTempColor}`}>{deltaTemp !== null ? `${deltaTemp > 0 ? '+' : ''}${deltaTemp.toFixed(1)}°` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}