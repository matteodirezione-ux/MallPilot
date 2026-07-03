import React from 'react';
import { Pencil, Plus, Trash2, GitBranch } from 'lucide-react';

const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];

const fmt = (v) => v == null ? '—' : v.toLocaleString('it-IT');
const fmtVal = (v, mode) => v == null ? '—' : mode === 'costi' ? '€ ' + v.toLocaleString('it-IT', { maximumFractionDigits: 2 }) : v.toLocaleString('it-IT');

const calcConsumo = (c, idx) => {
  const val = c[MESI[idx]];
  if (val == null) return null;
  const prev = idx === 0 ? c.lettura_iniziale : c[MESI[idx - 1]];
  if (prev == null) return null;
  return val - prev;
};

const getConsumo = (c, i, direct) => direct ? c[MESI[i]] : calcConsumo(c, i);

const getValore = (c, i, direct, mode) => {
  const cons = getConsumo(c, i, direct);
  if (cons == null) return null;
  return mode === 'costi' ? cons * (c.costo_unitario || 0) : cons;
};

const getTotale = (c, direct, mode) => {
  let tot = 0, has = false;
  for (let i = 0; i < 12; i++) {
    const v = getConsumo(c, i, direct);
    if (v != null) { tot += v; has = true; }
  }
  if (!has) return null;
  return mode === 'costi' ? tot * (c.costo_unitario || 0) : tot;
};

const valColor = (mode) => mode === 'costi' ? 'text-emerald-700' : 'text-blue-700';
const totColor = (mode) => mode === 'costi' ? 'text-emerald-800' : 'text-blue-800';

export default function ContatoreRow({ c, isSub, onEdit, onAddSub, onDelete, labelConsumo = 'Consumo', directConsumo = false, mode = 'consumi' }) {
  const azioni = (
    <td className="px-2 py-2 text-center border-l border-slate-100">
      <div className="flex items-center justify-center gap-1">
        <button onClick={() => onEdit(c)} className="p-1 rounded hover:bg-slate-100"><Pencil className="w-3 h-3 text-slate-400" /></button>
        {!isSub && (
          <button onClick={() => onAddSub(c)} className="p-1 rounded hover:bg-blue-50" title="Aggiungi sottocontatore"><Plus className="w-3 h-3 text-blue-500" /></button>
        )}
        <button onClick={() => onDelete(c)} className="p-1 rounded hover:bg-red-50"><Trash2 className="w-3 h-3 text-red-400" /></button>
      </div>
    </td>
  );

  const nomeCell = (
    <td className={`px-2 py-2 text-xs font-medium ${isSub ? 'pl-6 text-amber-700 italic' : 'text-slate-800'}`}>
      <div className="flex items-center gap-1">
        {isSub && <GitBranch className="w-3 h-3 text-amber-500" />}
        {isSub && <span className="px-1 py-0.5 rounded bg-amber-200/70 text-amber-800 text-[10px] font-bold uppercase tracking-wide">Sub</span>}
        {c.nome}
      </div>
    </td>
  );

  if (directConsumo) {
    return (
      <tr className={isSub ? 'bg-amber-50/60 border-l-4 border-l-amber-400' : 'bg-white border-l-4 border-l-transparent'}>
        {nomeCell}
        {MESI.map((m, i) => (
          <td key={m} className={`px-2 py-2 text-center text-xs font-medium ${valColor(mode)}`}>{fmtVal(getValore(c, i, true, mode), mode)}</td>
        ))}
        <td className={`px-2 py-2 text-center text-xs font-bold ${totColor(mode)} border-l border-slate-100`}>{fmtVal(getTotale(c, true, mode), mode)}</td>
        {azioni}
      </tr>
    );
  }

  return (
    <>
      <tr className={isSub ? 'bg-amber-50/60 border-l-4 border-l-amber-400' : 'bg-white border-l-4 border-l-transparent'}>
        {nomeCell}
        <td className="px-2 py-2 text-center text-xs text-slate-600">{fmt(c.lettura_iniziale)}</td>
        {MESI.map(m => (
          <td key={m} className="px-2 py-2 text-center text-xs text-slate-700">{fmt(c[m])}</td>
        ))}
        <td className="px-2 py-2 text-center text-xs font-medium text-slate-800 border-l border-slate-100">{fmt(getTotale(c, false, 'consumi'))}</td>
        {azioni}
      </tr>
      <tr className={isSub ? 'bg-amber-50/40 border-l-4 border-l-amber-400' : 'bg-blue-50/50 border-l-4 border-l-transparent'}>
        <td className={`px-2 py-1 text-xs italic ${isSub ? 'pl-6 text-amber-500' : mode === 'costi' ? 'text-emerald-500' : 'text-slate-400'}`}>↳ {mode === 'costi' ? 'Costo' : labelConsumo}</td>
        <td className="px-2 py-1"></td>
        {MESI.map((_, i) => (
          <td key={i} className={`px-2 py-1 text-center text-xs font-medium ${valColor(mode)}`}>{fmtVal(getValore(c, i, false, mode), mode)}</td>
        ))}
        <td className={`px-2 py-1 text-center text-xs font-bold ${totColor(mode)} border-l border-slate-100`}>{fmtVal(getTotale(c, false, mode), mode)}</td>
        <td className="px-2 py-1 border-l border-slate-100"></td>
      </tr>
    </>
  );
}