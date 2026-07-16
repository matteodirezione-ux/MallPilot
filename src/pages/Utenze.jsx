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
function CardUtenza({ tipo, curr, prev, mode }) {
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

  const aggFn   = mode === 'costo_unitario' ? mediaAnno : totaleAnno;
  const totCurr = aggFn(getCurr);
  const totPrev = aggFn(getPrev);

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
        <div className="flex items-center gap-2">
          {totCurr != null && totPrev != null && (
            <span className={`text-sm font-bold ${totCurr - totPrev > 0 ? (isFoto && mode !== 'costi' ? 'text-emerald-600' : 'text-red-600') : (isFoto && mode !== 'costi' ? 'text-red-600' : 'text-emerald-600')}`}>
              {totCurr - totPrev > 0 ? '+' : ''}{fmtVal(totCurr - totPrev)}
            </span>
          )}
          <DeltaBadge curr={totCurr} prev={totPrev} invertPositive={isFoto && mode !== 'costi'} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Anno corrente</p>
          <p className="text-lg font-bold text-slate-800">{fmtVal(totCurr)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Anno precedente</p>
          <p className="text-lg font-bold text-slate-500">{fmtVal(totPrev)}</p>
        </div>
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Utenze({ centroSelezionato }) {
  const [anno, setAnno] = useState(new Date().getFullYear());
  const [mode, setMode] = useState('consumi');
  const [contatoriAnno, setContatoriAnno] = useState([]);
  const [contatoriPrev, setContatoriPrev] = useState([]);
  const [loading, setLoading] = useState(true);

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
            />
          ))}
        </div>
      )}
    </div>
  );
}