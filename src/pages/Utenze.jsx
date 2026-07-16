import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, Droplet, Zap, Flame, Sun, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from 'recharts';

const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const MESI_LABEL = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

const TIPI_UTENZE = [
  { key: 'acqua', label: 'Acqua', icon: Droplet, color: '#3b82f6', unit: 'm³', direct: false },
  { key: 'energia', label: 'Energia', icon: Zap, color: '#9333ea', unit: 'kWh', direct: true },
  { key: 'gas', label: 'Gas', icon: Flame, color: '#ea580c', unit: 'm³', direct: false },
  { key: 'fotovoltaico', label: 'Fotovoltaico', icon: Sun, color: '#eab308', unit: 'kWh', direct: true },
];

const calcConsumoMese = (contatori, mese_idx, direct) => {
  const principali = contatori.filter(c => !c.contatore_padre_id);
  let tot = 0, has = false;
  principali.forEach(c => {
    let v = null;
    if (direct) {
      v = c[MESI[mese_idx]];
    } else {
      const val = c[MESI[mese_idx]];
      const prev = mese_idx === 0 ? c.lettura_iniziale : c[MESI[mese_idx - 1]];
      if (val != null && prev != null) v = val - prev;
    }
    if (v != null) { tot += v; has = true; }
  });
  return has ? tot : null;
};

const calcTotaleAnno = (contatori, direct) => {
  let tot = 0, has = false;
  for (let i = 0; i < 12; i++) {
    const v = calcConsumoMese(contatori, i, direct);
    if (v != null) { tot += v; has = true; }
  }
  return has ? tot : null;
};

const fmt = (v, unit) => v == null ? '—' : v.toLocaleString('it-IT', { maximumFractionDigits: 0 }) + ' ' + unit;
const pct = (curr, prev) => {
  if (curr == null || prev == null || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
};

function DeltaBadge({ curr, prev, invertPositive = false }) {
  const delta = pct(curr, prev);
  if (delta == null) return <span className="text-slate-400 text-xs">—</span>;
  const isPositive = delta > 0;
  // Per fotovoltaico produrre di più è positivo, per utenze consumare di più è negativo
  const isGood = invertPositive ? isPositive : !isPositive;
  const Icon = Math.abs(delta) < 0.5 ? Minus : isPositive ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isGood ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      <Icon className="w-3 h-3" />
      {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
    </span>
  );
}

function CardUtenza({ tipo, contatoriAnno, contatoriPrevAnno }) {
  const { key, label, icon: Icon, color, unit, direct } = tipo;
  const curr = contatoriAnno.filter(c => c.tipo === key);
  const prev = contatoriPrevAnno.filter(c => c.tipo === key);

  const totCurr = calcTotaleAnno(curr, direct);
  const totPrev = calcTotaleAnno(prev, direct);

  const chartData = MESI_LABEL.map((m, i) => ({
    mese: m,
    corrente: calcConsumoMese(curr, i, direct),
    precedente: calcConsumoMese(prev, i, direct),
  }));

  const isFotovoltaico = key === 'fotovoltaico';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ backgroundColor: color + '20' }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <h3 className="font-bold text-slate-800">{label}</h3>
        </div>
        <DeltaBadge curr={totCurr} prev={totPrev} invertPositive={isFotovoltaico} />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Anno corrente</p>
          <p className="text-lg font-bold text-slate-800">{fmt(totCurr, unit)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Anno precedente</p>
          <p className="text-lg font-bold text-slate-500">{fmt(totPrev, unit)}</p>
        </div>
      </div>

      {/* Grafico mensile comparativo */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="mese" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(v, name) => [v == null ? '—' : v.toLocaleString('it-IT') + ' ' + unit, name]}
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }}
            cursor={{ fill: '#f8fafc' }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="corrente" name="Anno corrente" fill={color} radius={[3, 3, 0, 0]} />
          <Bar dataKey="precedente" name="Anno prec." fill={color + '55'} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Utenze({ centroSelezionato, user }) {
  const [anno, setAnno] = useState(new Date().getFullYear());
  const [contatoriAnno, setContatoriAnno] = useState([]);
  const [contatoriPrevAnno, setContatoriPrevAnno] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (centroSelezionato?.id) loadData();
  }, [centroSelezionato?.id, anno]);

  const loadData = async () => {
    setLoading(true);
    const isAll = centroSelezionato.id === 'tutti';
    const [curr, prev] = await Promise.all([
      isAll
        ? base44.entities.LetturaContatore.filter({ anno })
        : base44.entities.LetturaContatore.filter({ centro_id: centroSelezionato.id, anno }),
      isAll
        ? base44.entities.LetturaContatore.filter({ anno: anno - 1 })
        : base44.entities.LetturaContatore.filter({ centro_id: centroSelezionato.id, anno: anno - 1 }),
    ]);
    setContatoriAnno(curr);
    setContatoriPrevAnno(prev);
    setLoading(false);
  };

  if (!centroSelezionato?.id) return <div className="p-8 text-center text-slate-500">Seleziona un centro commerciale</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Utenze</h1>
          <p className="text-slate-500 text-sm">Confronto consumi {anno} vs {anno - 1} — {centroSelezionato?.nome}</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAnno(a => a - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-bold text-slate-800 min-w-[44px] text-center">{anno}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAnno(a => a + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Caricamento...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {TIPI_UTENZE.map(tipo => (
            <CardUtenza
              key={tipo.key}
              tipo={tipo}
              contatoriAnno={contatoriAnno}
              contatoriPrevAnno={contatoriPrevAnno}
            />
          ))}
        </div>
      )}
    </div>
  );
}