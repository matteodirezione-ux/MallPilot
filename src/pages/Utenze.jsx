import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, Droplet, Zap, Flame, Sun, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const MESI_LABEL = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

const TIPI_UTENZE = [
  { key: 'acqua',        label: 'Acqua',        icon: Droplet, color: '#3b82f6', unit: 'm³',  direct: false },
  { key: 'energia',      label: 'Energia',      icon: Zap,     color: '#9333ea', unit: 'kWh', direct: true  },
  { key: 'gas',          label: 'Gas',          icon: Flame,   color: '#ea580c', unit: 'm³',  direct: false },
  { key: 'fotovoltaico', label: 'Fotovoltaico', icon: Sun,     color: '#eab308', unit: 'kWh', direct: true  },
];

// ── helpers ──────────────────────────────────────────────────────────────────
const principali = (list) => list.filter(c => !c.contatore_padre_id);

const consMese = (contatori, idx, direct) => {
  let tot = 0, has = false;
  principali(contatori).forEach(c => {
    let v = null;
    if (direct) {
      v = c[MESI[idx]];
    } else {
      const val = c[MESI[idx]];
      const prev = idx === 0 ? c.lettura_iniziale : c[MESI[idx - 1]];
      if (val != null && prev != null) v = val - prev;
    }
    if (v != null) { tot += v; has = true; }
  });
  return has ? tot : null;
};

const costoMese = (contatori, idx) => {
  let tot = 0, has = false;
  principali(contatori).forEach(c => {
    const v = c['costo_' + MESI[idx]];
    if (v != null) { tot += v; has = true; }
  });
  return has ? tot : null;
};

const unitCostMese = (contatori, idx, direct) => {
  let sum = 0, count = 0;
  principali(contatori).forEach(c => {
    const costo = c['costo_' + MESI[idx]];
    const cons = consMese([c], idx, direct);
    if (costo != null && cons != null && cons !== 0) { sum += costo / cons; count++; }
  });
  return count > 0 ? sum / count : null;
};

// Somma/media solo sui mesi in cui ENTRAMBE le funzioni hanno un valore non nullo
const totaleComune = (fnCurr, fnPrev) => {
  let totC = 0, totP = 0, has = false;
  MESI.forEach((_, i) => {
    const c = fnCurr(i), p = fnPrev(i);
    if (c != null && p != null) { totC += c; totP += p; has = true; }
  });
  return has ? { curr: totC, prev: totP } : { curr: null, prev: null };
};
const mediaComune = (fnCurr, fnPrev) => {
  let sumC = 0, sumP = 0, count = 0;
  MESI.forEach((_, i) => {
    const c = fnCurr(i), p = fnPrev(i);
    if (c != null && p != null) { sumC += c; sumP += p; count++; }
  });
  return count > 0 ? { curr: sumC / count, prev: sumP / count } : { curr: null, prev: null };
};
// Per i totali di singolo anno (usati nel grafico) manteniamo quello che c'è
const totaleAnno = (fn) => {
  const vals = MESI.map((_, i) => fn(i)).filter(v => v != null);
  return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) : null;
};
const mediaAnno = (fn) => {
  const vals = MESI.map((_, i) => fn(i)).filter(v => v != null);
  return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
};

const pct = (curr, prev) => {
  if (curr == null || prev == null || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
};

// ── DeltaBadge ────────────────────────────────────────────────────────────────
function DeltaBadge({ curr, prev, invertPositive }) {
  const delta = pct(curr, prev);
  if (delta == null) return <span className="text-slate-400 text-xs">—</span>;
  const isPos = delta > 0;
  const isGood = invertPositive ? isPos : !isPos;
  const Icon = Math.abs(delta) < 0.5 ? Minus : isPos ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isGood ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      <Icon className="w-3 h-3" />
      {isPos ? '+' : ''}{delta.toFixed(1)}%
    </span>
  );
}

// ── CardUtenza ────────────────────────────────────────────────────────────────
function CardUtenza({ tipo, curr, prev, mode, anno, tempsCurr, tempsPrev }) {
  const { label, icon: Icon, color, unit, direct } = tipo;
  const isFoto = tipo.key === 'fotovoltaico';

  let getCurr, getPrev, fmtVal, aggLabel;

  if (mode === 'consumi') {
    getCurr = (i) => consMese(curr, i, direct);
    getPrev = (i) => consMese(prev, i, direct);
    fmtVal  = (v) => v == null ? '—' : v.toLocaleString('it-IT', { maximumFractionDigits: 0 }) + ' ' + unit;
    aggLabel = isFoto ? 'Produzione' : 'Consumo';
  } else if (mode === 'costi') {
    getCurr = (i) => costoMese(curr, i);
    getPrev = (i) => costoMese(prev, i);
    fmtVal  = (v) => v == null ? '—' : '€ ' + v.toLocaleString('it-IT', { maximumFractionDigits: 0 });
    aggLabel = 'Costo';
  } else {
    getCurr = (i) => unitCostMese(curr, i, direct);
    getPrev = (i) => unitCostMese(prev, i, direct);
    fmtVal  = (v) => v == null ? '—' : '€ ' + v.toLocaleString('it-IT', { minimumFractionDigits: 3, maximumFractionDigits: 4 }) + '/' + unit;
    aggLabel = '€/' + unit;
  }

  const aggFn = mode === 'costo_unitario' ? mediaComune : totaleComune;
  const { curr: totCurr, prev: totPrev } = aggFn(getCurr, getPrev);

  const chartData = MESI_LABEL.map((m, i) => ({
    mese: m,
    corrente:   getCurr(i),
    precedente: getPrev(i),
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ backgroundColor: color + '20' }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{label}</h3>
            <p className="text-xs text-slate-400">{aggLabel}</p>
          </div>
        </div>
        <DeltaBadge curr={totCurr} prev={totPrev} invertPositive={isFoto && mode !== 'costi'} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Anno corrente</p>
          <p className="text-lg font-bold text-slate-800">{fmtVal(totCurr)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Anno precedente</p>
          <p className="text-lg font-bold text-slate-500">{fmtVal(totPrev)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Variazione</p>
          {totCurr != null && totPrev != null ? (
            <>
              <p className={`text-base font-bold ${totCurr - totPrev > 0 ? (isFoto && mode !== 'costi' ? 'text-emerald-600' : 'text-red-600') : (isFoto && mode !== 'costi' ? 'text-red-600' : 'text-emerald-600')}`}>
                {totCurr - totPrev > 0 ? '+' : ''}{fmtVal(totCurr - totPrev)}
              </p>
              <DeltaBadge curr={totCurr} prev={totPrev} invertPositive={isFoto && mode !== 'costi'} />
            </>
          ) : <p className="text-base font-bold text-slate-400">—</p>}
        </div>
      </div>

      {/* Tabella mensile */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-1.5 pr-2 text-slate-400 font-medium">Mese</th>
              <th className="text-right py-1.5 px-2 text-slate-400 font-medium">{anno - 1}</th>
              <th className="text-right py-1.5 px-2 text-slate-400 font-medium">{anno}</th>
              <th className="text-right py-1.5 pl-2 text-slate-400 font-medium">Var %</th>
              <th className="text-right py-1.5 px-2 text-orange-300 font-medium">°C {anno-1}</th>
              <th className="text-right py-1.5 px-2 text-orange-400 font-medium">°C {anno}</th>
              <th className="text-right py-1.5 pl-2 text-orange-300 font-medium">Δ°C</th>
            </tr>
          </thead>
          <tbody>
            {MESI_LABEL.map((m, i) => {
              const c = getCurr(i), p = getPrev(i);
              const delta = pct(c, p);
              const hasData = c != null || p != null;
              if (!hasData) return null;
              const isGood = delta == null ? null : (isFoto && mode !== 'costi') ? delta > 0 : delta < 0;
              const tc = tempsCurr?.[i], tp = tempsPrev?.[i];
              const deltaTemp = tc != null && tp != null ? tc - tp : null;
              const deltaTempPct = pct(tc, tp);
              return (
                <tr key={m} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-1 pr-2 text-slate-600 font-medium">{m}</td>
                  <td className="py-1 px-2 text-right text-slate-400">{fmtVal(p)}</td>
                  <td className="py-1 px-2 text-right font-semibold text-slate-700">{fmtVal(c)}</td>
                  <td className="py-1 pl-2 text-right">
                    {delta == null ? <span className="text-slate-300">—</span> : (
                      <span className={`font-semibold ${isGood ? 'text-emerald-600' : 'text-red-600'}`}>
                        {c - p > 0 ? '+' : ''}{fmtVal(c - p)} ({delta > 0 ? '+' : ''}{delta.toFixed(1)}%)
                      </span>
                    )}
                  </td>
                  <td className="py-1 px-2 text-right text-slate-400">{tp != null ? tp.toFixed(1) + '°' : '—'}</td>
                  <td className="py-1 px-2 text-right text-slate-500">{tc != null ? tc.toFixed(1) + '°' : '—'}</td>
                  <td className="py-1 pl-2 text-right">
                    {deltaTemp == null ? <span className="text-slate-300">—</span> : (
                      <span className={`font-semibold ${deltaTemp > 0 ? 'text-orange-500' : 'text-blue-500'}`}>
                        {deltaTemp > 0 ? '+' : ''}{deltaTemp.toFixed(1)}° ({deltaTempPct != null ? (deltaTempPct > 0 ? '+' : '') + deltaTempPct.toFixed(1) + '%' : '—'})
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="mese" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(v, name) => [fmtVal(v), name]}
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }}
            cursor={{ fill: '#f8fafc' }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="corrente"   name="Anno corrente" fill={color}       radius={[3,3,0,0]} />
          <Bar dataKey="precedente" name="Anno prec."    fill={color + '55'} radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── fetchMonthlyTemps: Open-Meteo historical monthly means ───────────────────
async function fetchMonthlyTemps(lat, lon, year) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const start = `${year}-01-01`;
  const endDate = year < currentYear
    ? `${year}-12-31`
    : new Date(now - 86400000).toISOString().slice(0, 10);

  // archive covers up to ~5 days ago; historical-forecast covers recent years not yet in archive
  // Try archive first; if it fails or returns no data for that year, fall back to historical-forecast
  let baseUrl;
  if (year <= currentYear - 1) {
    baseUrl = 'https://archive-api.open-meteo.com/v1/archive';
  } else {
    // Current year: use historical-forecast which covers recent months up to today
    baseUrl = 'https://historical-forecast-api.open-meteo.com/v1/forecast';
  }

  const url = `${baseUrl}?latitude=${lat}&longitude=${lon}&start_date=${start}&end_date=${endDate}&daily=temperature_2m_mean&timezone=Europe%2FRome`;
  const res = await fetch(url);
  if (!res.ok) return Array(12).fill(null);
  const data = await res.json();
  if (!data.daily?.time?.length) return Array(12).fill(null);
  const sums = Array(12).fill(0), counts = Array(12).fill(0);
  data.daily.time.forEach((dateStr, i) => {
    const m = new Date(dateStr).getMonth();
    const v = data.daily.temperature_2m_mean[i];
    if (v != null) { sums[m] += v; counts[m]++; }
  });
  return sums.map((s, i) => counts[i] > 0 ? s / counts[i] : null);
}

// ── geocode city via Open-Meteo geocoding ─────────────────────────────────────
async function geocodeCity(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=it&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.results?.length) return null;
  return { lat: data.results[0].latitude, lon: data.results[0].longitude };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Utenze({ centroSelezionato }) {
  const [anno, setAnno] = useState(new Date().getFullYear());
  const [mode, setMode] = useState('consumi');
  const [contatoriAnno, setContatoriAnno] = useState([]);
  const [contatoriPrev, setContatoriPrev] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tempsCurr, setTempsCurr] = useState(Array(12).fill(null));
  const [tempsPrev, setTempsPrev] = useState(Array(12).fill(null));

  useEffect(() => {
    if (centroSelezionato?.id) loadData();
  }, [centroSelezionato?.id, anno]);

  const loadData = async () => {
    setLoading(true);
    const isAll = centroSelezionato.id === 'tutti';
    const [curr, prev] = await Promise.all([
      isAll ? base44.entities.LetturaContatore.filter({ anno })
            : base44.entities.LetturaContatore.filter({ centro_id: centroSelezionato.id, anno }),
      isAll ? base44.entities.LetturaContatore.filter({ anno: anno - 1 })
            : base44.entities.LetturaContatore.filter({ centro_id: centroSelezionato.id, anno: anno - 1 }),
    ]);
    setContatoriAnno(curr);
    setContatoriPrev(prev);

    // Fetch temperature data
    const city = centroSelezionato?.citta || centroSelezionato?.nome;
    if (city && centroSelezionato.id !== 'tutti') {
      const coords = await geocodeCity(city);
      if (coords) {
        const [tc, tp] = await Promise.all([
          fetchMonthlyTemps(coords.lat, coords.lon, anno),
          fetchMonthlyTemps(coords.lat, coords.lon, anno - 1),
        ]);
        setTempsCurr(tc);
        setTempsPrev(tp);
      } else {
        setTempsCurr(Array(12).fill(null));
        setTempsPrev(Array(12).fill(null));
      }
    } else {
      setTempsCurr(Array(12).fill(null));
      setTempsPrev(Array(12).fill(null));
    }

    setLoading(false);
  };

  if (!centroSelezionato?.id) return <div className="p-8 text-center text-slate-500">Seleziona un centro commerciale</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Utenze</h1>
          <p className="text-slate-500 text-sm">Confronto {anno} vs {anno - 1} — {centroSelezionato?.nome}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode toggle */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setMode('consumi')}       className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'consumi'       ? 'bg-blue-600 text-white shadow-sm'   : 'text-slate-500 hover:text-slate-700'}`}>Consumi</button>
            <button onClick={() => setMode('costi')}         className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'costi'         ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Costi</button>
            <button onClick={() => setMode('costo_unitario')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'costo_unitario' ? 'bg-amber-600 text-white shadow-sm'   : 'text-slate-500 hover:text-slate-700'}`}>€/Unità</button>
          </div>
          {/* Anno selector */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAnno(a => a - 1)}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm font-bold text-slate-800 min-w-[44px] text-center">{anno}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAnno(a => a + 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Caricamento...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {TIPI_UTENZE.map(tipo => (
            <CardUtenza
              key={tipo.key + mode}
               tipo={tipo}
               curr={contatoriAnno.filter(c => c.tipo === tipo.key)}
               prev={contatoriPrev.filter(c => c.tipo === tipo.key)}
               mode={mode}
               anno={anno}
               tempsCurr={tempsCurr}
               tempsPrev={tempsPrev}
            />
          ))}
        </div>
      )}
    </div>
  );
}