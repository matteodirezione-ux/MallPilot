import React, { useState, useEffect } from 'react';
import { format, getDaysInMonth, startOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WMO_ICONS = {
  0: { label: 'Sereno', emoji: '☀️', rank: 0 },
  1: { label: 'Prev. sereno', emoji: '🌤️', rank: 1 },
  2: { label: 'Parz. nuvoloso', emoji: '⛅', rank: 2 },
  3: { label: 'Nuvoloso', emoji: '☁️', rank: 3 },
  45: { label: 'Nebbia', emoji: '🌫️', rank: 4 },
  48: { label: 'Nebbia gelata', emoji: '🌫️', rank: 4 },
  51: { label: 'Pioggerella', emoji: '🌦️', rank: 5 },
  53: { label: 'Pioggerella', emoji: '🌦️', rank: 5 },
  55: { label: 'Pioggerella int.', emoji: '🌧️', rank: 6 },
  61: { label: 'Pioggia lieve', emoji: '🌧️', rank: 6 },
  63: { label: 'Pioggia', emoji: '🌧️', rank: 7 },
  65: { label: 'Pioggia int.', emoji: '🌧️', rank: 7 },
  71: { label: 'Neve lieve', emoji: '🌨️', rank: 8 },
  73: { label: 'Neve', emoji: '❄️', rank: 8 },
  75: { label: 'Neve int.', emoji: '❄️', rank: 8 },
  80: { label: 'Rovesci', emoji: '🌦️', rank: 6 },
  81: { label: 'Rovesci', emoji: '🌧️', rank: 7 },
  82: { label: 'Rovesci int.', emoji: '⛈️', rank: 9 },
  95: { label: 'Temporale', emoji: '⛈️', rank: 9 },
  96: { label: 'Temporale+gr.', emoji: '⛈️', rank: 10 },
  99: { label: 'Temporale forte', emoji: '⛈️', rank: 10 },
};

const getWmo = (code) => WMO_ICONS[code] ?? WMO_ICONS[Math.max(...Object.keys(WMO_ICONS).map(Number).filter(k => k <= (code ?? 0)))] ?? { label: '—', emoji: '🌡️', rank: 0 };

async function fetchMonthlyWeather(lat, lon, year, month) {
  // month is 1-based
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1));
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FRome&start_date=${startDate}&end_date=${endDate}`;
  // For past months use archive
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const isPast = year < currentYear || (year === currentYear && month < currentMonth);

  const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FRome&start_date=${startDate}&end_date=${endDate}`;

  const res = await fetch(isPast ? archiveUrl : url);
  const data = await res.json();
  return data.daily;
}

export default function MeteoMensile({ citta, provincia }) {
  const location = citta || provincia;
  const now = new Date();
  const [meseCorrente, setMeseCorrente] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [mesePrecedente, setMesePrecedente] = useState(null); // { year, month }
  const [coords, setCoords] = useState(null);
  const [placeName, setPlaceName] = useState('');
  const [dataCorrente, setDataCorrente] = useState(null);
  const [dataPrecedente, setDataPrecedente] = useState(null);
  const [progressivoCorrente, setProgressivoCorrente] = useState(null); // dati ytd anno corrente
  const [progressivoPrecedente, setProgressivoPrecedente] = useState(null); // dati ytd anno precedente
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Calcola il mese di confronto (stesso mese anno precedente per default, ma navigabile)
  useEffect(() => {
    if (!location) return;
    const prevYear = meseCorrente.month === 1 ? meseCorrente.year - 1 : meseCorrente.year;
    const prevMonth = meseCorrente.month === 1 ? 12 : meseCorrente.month - 1;
    // Confronta con stesso mese anno precedente
    setMesePrecedente({ year: meseCorrente.year - 1, month: meseCorrente.month });
  }, [meseCorrente, location]);

  useEffect(() => {
    if (!location) return;
    geocode(location);
  }, [location]);

  useEffect(() => {
    if (!coords || !mesePrecedente) return;
    load();
  }, [coords, meseCorrente, mesePrecedente]);

  const geocode = async (loc) => {
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=1&language=it&format=json`);
      const data = await res.json();
      const place = data.results?.[0];
      if (!place) { setError('Luogo non trovato'); return; }
      setPlaceName(place.name);
      setCoords({ lat: place.latitude, lon: place.longitude });
    } catch { setError('Errore geocoding'); }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const currentRealYear = now.getFullYear();
      const currentRealMonth = now.getMonth() + 1;
      const isFutureMonth = meseCorrente.year > currentRealYear ||
        (meseCorrente.year === currentRealYear && meseCorrente.month > currentRealMonth);

      // Calcola progressivo YTD: dall'inizio dell'anno fino al mese visualizzato (incluso)
      // Per anno corrente: fino al mese corrente visualizzato (o mese reale se nel futuro)
      const ytdEndMonthC = isFutureMonth ? currentRealMonth : meseCorrente.month;
      const ytdEndMonthP = mesePrecedente.month; // stesso mese, anno precedente

      const fetchYtd = async (year, endMonth, capToToday) => {
        const promises = [];
        for (let m = 1; m <= endMonth; m++) {
          promises.push(fetchMonthlyWeather(coords.lat, coords.lon, year, m));
        }
        const results = await Promise.all(promises);
        // Unisci tutti i weather_code in un unico array flat
        const codes = [];
        results.forEach((d, idx) => {
          if (!d?.weather_code) return;
          d.weather_code.forEach((code, dayIdx) => {
            if (capToToday) {
              const dayDate = new Date(year, idx, dayIdx + 1); // idx = mese 0-based
              if (dayDate > now) return;
            }
            codes.push(code);
          });
        });
        return codes;
      };

      const [dc, dp, ytdC, ytdP] = await Promise.all([
        isFutureMonth ? Promise.resolve(null) : fetchMonthlyWeather(coords.lat, coords.lon, meseCorrente.year, meseCorrente.month),
        fetchMonthlyWeather(coords.lat, coords.lon, mesePrecedente.year, mesePrecedente.month),
        fetchYtd(meseCorrente.year, ytdEndMonthC, true),
        fetchYtd(mesePrecedente.year, ytdEndMonthP, false),
      ]);
      setDataCorrente(dc);
      setDataPrecedente(dp);
      setProgressivoCorrente(ytdC);
      setProgressivoPrecedente(ytdP);
    } catch { setError('Errore caricamento meteo'); }
    finally { setLoading(false); }
  };

  const navigate = (dir) => {
    setMeseCorrente(prev => {
      let m = prev.month + dir;
      let y = prev.year;
      if (m > 12) { m = 1; y++; }
      if (m < 1) { m = 12; y--; }
      return { year: y, month: m };
    });
  };

  if (!location) return null;

  const daysInMonth = meseCorrente ? getDaysInMonth(new Date(meseCorrente.year, meseCorrente.month - 1, 1)) : 0;
  const daysInPrevMonth = mesePrecedente ? getDaysInMonth(new Date(mesePrecedente.year, mesePrecedente.month - 1, 1)) : 0;

  const labelCorrente = meseCorrente ? format(new Date(meseCorrente.year, meseCorrente.month - 1, 1), 'MMMM yyyy', { locale: it }) : '';
  const labelPrecedente = mesePrecedente ? format(new Date(mesePrecedente.year, mesePrecedente.month - 1, 1), 'MMMM yyyy', { locale: it }) : '';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.12)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌤️</span>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Tabella Meteo Mensile</h3>
            {placeName && <p className="text-xs text-slate-500">📍 {placeName}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-white/70 transition-colors">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-xs font-semibold text-slate-700 min-w-[120px] text-center capitalize">{labelCorrente}</span>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-white/70 transition-colors">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2 animate-pulse">
          <span>🌤️</span><span>Caricamento dati meteo...</span>
        </div>
      )}
      {error && <div className="text-center py-6 text-red-500 text-sm">{error}</div>}

      {!loading && !error && dataPrecedente && (() => {
        const todayDate = new Date(); todayDate.setHours(0,0,0,0);

        // Helper: conta giornate (filtra future solo per l'anno corrente)
        const countDays = (data, year, month, filterFn, capToToday) => {
          if (!data?.weather_code) return null;
          return data.weather_code.filter((code, i) => {
            if (capToToday) {
              const d = new Date(year, month - 1, i + 1);
              if (d > todayDate) return false;
            }
            return filterFn(getWmo(code));
          }).length;
        };

        const avgTemp = (data, year, month, capToToday) => {
          if (!data?.temperature_2m_max || !data?.temperature_2m_min) return null;
          let sum = 0, count = 0;
          data.temperature_2m_max.forEach((max, i) => {
            if (capToToday) {
              const d = new Date(year, month - 1, i + 1);
              if (d > todayDate) return;
            }
            const min = data.temperature_2m_min[i] ?? max;
            sum += (max + min) / 2;
            count++;
          });
          return count ? +(sum / count).toFixed(1) : null;
        };

        const soleC = countDays(dataCorrente, meseCorrente.year, meseCorrente.month, w => w.rank <= 2, true);
        const soleP = countDays(dataPrecedente, mesePrecedente.year, mesePrecedente.month, w => w.rank <= 2, false);
        const piogC = countDays(dataCorrente, meseCorrente.year, meseCorrente.month, w => w.rank >= 5, true);
        const piogP = countDays(dataPrecedente, mesePrecedente.year, mesePrecedente.month, w => w.rank >= 5, false);

        // Progressivo YTD
        const countFromCodes = (codes, filterFn) => codes ? codes.filter(c => filterFn(getWmo(c))).length : null;
        const ytdSoleC = countFromCodes(progressivoCorrente, w => w.rank <= 2);
        const ytdSoleP = countFromCodes(progressivoPrecedente, w => w.rank <= 2);
        const ytdPiogC = countFromCodes(progressivoCorrente, w => w.rank >= 5);
        const ytdPiogP = countFromCodes(progressivoPrecedente, w => w.rank >= 5);
        const tempC = avgTemp(dataCorrente, meseCorrente.year, meseCorrente.month, true);
        const tempP = avgTemp(dataPrecedente, mesePrecedente.year, mesePrecedente.month, false);
        const deltaSole = (soleC !== null && soleP !== null) ? soleC - soleP : null;
        const deltaPiog = (piogC !== null && piogP !== null) ? piogC - piogP : null;
        const deltaTemp = (tempC !== null && tempP !== null) ? +(tempC - tempP).toFixed(1) : null;

        const DeltaBadge = ({ val, invert }) => {
          if (val === null || val === undefined) return null;
          const positive = invert ? val < 0 : val > 0;
          const negative = invert ? val > 0 : val < 0;
          return (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${val === 0 ? 'bg-slate-100 text-slate-500' : positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {val > 0 ? '+' : ''}{val}{typeof val === 'number' && !Number.isInteger(val) ? '' : ''}
            </span>
          );
        };

        return (
          <>
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-slate-100">
              {/* Card Sole */}
              <div className="rounded-xl bg-gradient-to-br from-yellow-50 to-amber-50 border border-amber-100 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xl">☀️</span>
                  <span className="text-xs font-semibold text-amber-700">Giorni sereni/nuvolosi</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-amber-800">{soleC !== null ? soleC : '—'}</span>
                      <span className="text-xs text-amber-600">{meseCorrente.year}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-medium text-amber-500">{soleP}</span>
                      <span className="text-xs text-amber-400">{mesePrecedente?.year}</span>
                    </div>
                  </div>
                  <DeltaBadge val={deltaSole} invert={false} />
                </div>
                {/* Progressivo YTD */}
                <div className="mt-2 pt-2 border-t border-amber-100">
                  <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Progressivo anno</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-amber-800">{ytdSoleC !== null ? ytdSoleC : '—'}</span>
                    <span className="text-xs text-amber-500">{meseCorrente.year}</span>
                    <span className="text-slate-300 text-xs">vs</span>
                    <span className="text-sm font-medium text-amber-400">{ytdSoleP !== null ? ytdSoleP : '—'}</span>
                    <span className="text-xs text-amber-300">{mesePrecedente?.year}</span>
                  </div>
                </div>
              </div>
              {/* Card Pioggia */}
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xl">🌧️</span>
                  <span className="text-xs font-semibold text-blue-700">Giorni di pioggia</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-blue-800">{piogC !== null ? piogC : '—'}</span>
                      <span className="text-xs text-blue-600">{meseCorrente.year}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-medium text-blue-400">{piogP}</span>
                      <span className="text-xs text-blue-300">{mesePrecedente?.year}</span>
                    </div>
                  </div>
                  <DeltaBadge val={deltaPiog} invert={true} />
                </div>
                {/* Progressivo YTD */}
                <div className="mt-2 pt-2 border-t border-blue-100">
                  <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1">Progressivo anno</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-blue-800">{ytdPiogC !== null ? ytdPiogC : '—'}</span>
                    <span className="text-xs text-blue-500">{meseCorrente.year}</span>
                    <span className="text-slate-300 text-xs">vs</span>
                    <span className="text-sm font-medium text-blue-300">{ytdPiogP !== null ? ytdPiogP : '—'}</span>
                    <span className="text-xs text-blue-200">{mesePrecedente?.year}</span>
                  </div>
                </div>
              </div>
              {/* Card Temperatura */}
              <div className="rounded-xl bg-gradient-to-br from-orange-50 to-red-50 border border-orange-100 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xl">🌡️</span>
                  <span className="text-xs font-semibold text-orange-700">Temperatura media</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-orange-800">{tempC !== null ? `${tempC}°` : '—'}</span>
                      <span className="text-xs text-orange-600">{meseCorrente.year}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-medium text-orange-400">{tempP !== null ? `${tempP}°` : '—'}</span>
                      <span className="text-xs text-orange-300">{mesePrecedente?.year}</span>
                    </div>
                  </div>
                  <DeltaBadge val={deltaTemp} invert={false} />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-600 border-b border-slate-200 z-10 w-10">Giorno</th>
                {/* Anno corrente */}
                <th colSpan={3} className="px-2 py-2 text-center font-semibold text-blue-700 border-b border-slate-200 bg-blue-50 capitalize">
                  {labelCorrente}
                </th>
                {/* Anno precedente */}
                <th colSpan={3} className="px-2 py-2 text-center font-semibold text-slate-600 border-b border-slate-200 capitalize">
                  {labelPrecedente}
                </th>
                {/* Delta */}
                <th colSpan={2} className="px-2 py-2 text-center font-semibold text-orange-700 border-b border-slate-200 bg-orange-50">
                  Delta
                </th>
              </tr>
              <tr className="bg-slate-50 text-[10px] text-slate-500">
                <th className="sticky left-0 bg-slate-50 px-3 py-1 border-b border-slate-100 z-10"></th>
                <th className="px-2 py-1 border-b border-slate-100 bg-blue-50 text-blue-600">Meteo</th>
                <th className="px-2 py-1 border-b border-slate-100 bg-blue-50 text-blue-600">Max</th>
                <th className="px-2 py-1 border-b border-slate-100 bg-blue-50 text-blue-600">Min</th>
                <th className="px-2 py-1 border-b border-slate-100">Meteo</th>
                <th className="px-2 py-1 border-b border-slate-100">Max</th>
                <th className="px-2 py-1 border-b border-slate-100">Min</th>
                <th className="px-2 py-1 border-b border-slate-100 bg-orange-50 text-orange-600">Stato</th>
                <th className="px-2 py-1 border-b border-slate-100 bg-orange-50 text-orange-600">ΔMax °C</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.max(daysInMonth, daysInPrevMonth) }, (_, i) => {
                // Mostra tutte le righe del mese (anche senza dati correnti, per mostrare l'anno precedente)
                const day = i + 1;
                const todayDate = new Date(); todayDate.setHours(0,0,0,0);
                const thisDayDate = new Date(meseCorrente.year, meseCorrente.month - 1, day);
                const isToday = thisDayDate.getTime() === todayDate.getTime();
                const isFuture = thisDayDate > todayDate;

                // Dati anno corrente
                 const cIdx = day - 1;
                const cValid = !!dataCorrente && cIdx < daysInMonth && cIdx < (dataCorrente?.time?.length ?? 0) && !isFuture;
                const cCode = cValid ? dataCorrente.weather_code?.[cIdx] : null;
                const cMax = cValid ? Math.round(dataCorrente.temperature_2m_max?.[cIdx] ?? 0) : null;
                const cMin = cValid ? Math.round(dataCorrente.temperature_2m_min?.[cIdx] ?? 0) : null;
                const cWmo = cCode !== null ? getWmo(cCode) : null;

                // Dati anno precedente (sempre visibili, non filtrati per data futura)
                const pIdx = day - 1;
                const pValid = pIdx < daysInPrevMonth && pIdx < (dataPrecedente?.time?.length ?? 0);
                const pCode = pValid ? dataPrecedente.weather_code?.[pIdx] : null;
                const pMax = pValid ? Math.round(dataPrecedente.temperature_2m_max?.[pIdx] ?? 0) : null;
                const pMin = pValid ? Math.round(dataPrecedente.temperature_2m_min?.[pIdx] ?? 0) : null;
                const pWmo = pCode !== null ? getWmo(pCode) : null;

                // Delta
                const deltaTemp = (cMax !== null && pMax !== null) ? cMax - pMax : null;
                const deltaMeteo = (cWmo && pWmo) ? cWmo.rank - pWmo.rank : null;

                let deltaTempColor = 'text-slate-500';
                if (deltaTemp !== null) {
                  if (deltaTemp > 2) deltaTempColor = 'text-red-600 font-semibold';
                  else if (deltaTemp < -2) deltaTempColor = 'text-blue-600 font-semibold';
                }

                let deltaMeteoLabel = '—';
                let deltaMeteoColor = 'text-slate-400';
                if (deltaMeteo !== null) {
                  if (deltaMeteo > 1) { deltaMeteoLabel = '↓ Peggio'; deltaMeteoColor = 'text-red-500 font-medium'; }
                  else if (deltaMeteo < -1) { deltaMeteoLabel = '↑ Meglio'; deltaMeteoColor = 'text-green-600 font-medium'; }
                  else { deltaMeteoLabel = '≈ Simile'; deltaMeteoColor = 'text-slate-500'; }
                }

                const weekDay = format(thisDayDate, 'EEE', { locale: it });

                return (
                  <tr key={day} className={`border-b border-slate-50 hover:bg-slate-50/80 transition-colors ${isToday ? 'bg-blue-50' : ''}`}>
                    <td className={`sticky left-0 px-3 py-1.5 font-semibold z-10 ${isToday ? 'bg-blue-100 text-blue-700' : 'bg-white text-slate-700'}`}>
                      <span>{day}</span>
                      <span className="ml-1 text-[9px] font-normal text-slate-400 uppercase">{weekDay}</span>
                    </td>
                    {/* Anno corrente */}
                    <td className="px-2 py-1.5 text-center bg-blue-50/40">
                      {cWmo ? <span title={cWmo.label}>{cWmo.emoji}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center bg-blue-50/40 font-medium text-red-500">
                      {cMax !== null ? `${cMax}°` : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-center bg-blue-50/40 text-slate-500">
                      {cMin !== null ? `${cMin}°` : '—'}
                    </td>
                    {/* Anno precedente */}
                    <td className="px-2 py-1.5 text-center">
                      {pWmo ? <span title={pWmo.label}>{pWmo.emoji}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center font-medium text-red-400">
                      {pMax !== null ? `${pMax}°` : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-center text-slate-400">
                      {pMin !== null ? `${pMin}°` : '—'}
                    </td>
                    {/* Delta */}
                    <td className={`px-2 py-1.5 text-center bg-orange-50/40 ${deltaMeteoColor}`}>
                      {deltaMeteoLabel}
                    </td>
                    <td className={`px-2 py-1.5 text-center bg-orange-50/40 ${deltaTempColor}`}>
                      {deltaTemp !== null ? `${deltaTemp > 0 ? '+' : ''}${deltaTemp}°` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
          </>
        );
      })()}
    </div>
  );
}