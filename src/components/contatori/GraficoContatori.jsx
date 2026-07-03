import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const MESI_LABEL = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

export default function GraficoContatori({ totaleMese, totaleAnnuo, label, accentColor }) {
  const color = accentColor || '#3b82f6';
  const data = MESI_LABEL.map((m, i) => ({ mese: m, valore: totaleMese[i] }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-700">Andamento mensile — {label}</h3>
        <span className="text-xs text-slate-500">
          Totale annuo: <span className="font-bold text-slate-700">{totaleAnnuo != null ? totaleAnnuo.toLocaleString('it-IT') : '—'}</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="mese" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={50} />
          <Tooltip
            formatter={(v) => v == null ? '—' : v.toLocaleString('it-IT')}
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
            cursor={{ fill: '#f1f5f9' }}
          />
          <Bar dataKey="valore" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}