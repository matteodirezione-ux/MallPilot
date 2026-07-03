import React from 'react';
import { Pencil, Plus, Trash2, GitBranch } from 'lucide-react';

const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];

const fmt = (v) => v == null ? '—' : v.toLocaleString('it-IT');

const calcConsumo = (c, idx) => {
  const val = c[MESI[idx]];
  if (val == null) return null;
  const prev = idx === 0 ? c.lettura_iniziale : c[MESI[idx - 1]];
  if (prev == null) return null;
  return val - prev;
};

// In modalità diretta (energia) i valori mensili sono già consumi/produzioni
const getValoreMese = (c, i, direct) => direct ? c[MESI[i]] : calcConsumo(c, i);

const getTotale = (c, direct) => {
  let tot = 0, has = false;
  for (let i = 0; i < 12; i++) {
    const v = getValoreMese(c, i, direct);
    if (v != null) { tot += v; has = true; }
  }
  return has ? tot : null;
};

export default function ContatoreRow({ c, isSub, onEdit, onAddSub, onDelete, labelConsumo = 'Consumo', directConsumo = false }) {
  if (directConsumo) {
    // Un'unica riga: i valori mensili sono direttamente consumi/produzioni
    return (
      <tr className={isSub ? 'bg-amber-50/60 border-l-4 border-l-amber-400' : 'bg-white border-l-4 border-l-transparent'}>
        <td className={`px-2 py-2 text-xs font-medium ${isSub ? 'pl-6 text-amber-700 italic' : 'text-slate-800'}`}>
          <div className="flex items-center gap-1">
            {isSub && <GitBranch className="w-3 h-3 text-amber-500" />}
            {isSub && <span className="px-1 py-0.5 rounded bg-amber-200/70 text-amber-800 text-[10px] font-bold uppercase tracking-wide">Sub</span>}
            {c.nome}
          </div>
        </td>
        {MESI.map((m, i) => (
          <td key={m} className="px-2 py-2 text-center text-xs font-medium text-blue-700">{fmt(c[m])}</td>
        ))}
        <td className="px-2 py-2 text-center text-xs font-bold text-blue-800 border-l border-slate-100">{fmt(getTotale(c, true))}</td>
        <td className="px-2 py-2 text-center border-l border-slate-100">
          <div className="flex items-center justify-center gap-1">
            <button onClick={() => onEdit(c)} className="p-1 rounded hover:bg-slate-100"><Pencil className="w-3 h-3 text-slate-400" /></button>
            {!isSub && (
              <button onClick={() => onAddSub(c)} className="p-1 rounded hover:bg-blue-50" title="Aggiungi sottocontatore"><Plus className="w-3 h-3 text-blue-500" /></button>
            )}
            <button onClick={() => onDelete(c)} className="p-1 rounded hover:bg-red-50"><Trash2 className="w-3 h-3 text-red-400" /></button>
          </div>
        </td>
      </tr>
    );
  }

  // Modalità contatore (letture cumulative + consumo derivato)
  return (
    <>
      <tr className={isSub ? 'bg-amber-50/60 border-l-4 border-l-amber-400' : 'bg-white border-l-4 border-l-transparent'}>
        <td className={`px-2 py-2 text-xs font-medium ${isSub ? 'pl-6 text-amber-700 italic' : 'text-slate-800'}`}>
          <div className="flex items-center gap-1">
            {isSub && <GitBranch className="w-3 h-3 text-amber-500" />}
            {isSub && <span className="px-1 py-0.5 rounded bg-amber-200/70 text-amber-800 text-[10px] font-bold uppercase tracking-wide">Sub</span>}
            {c.nome}
          </div>
        </td>
        <td className="px-2 py-2 text-center text-xs text-slate-600">{fmt(c.lettura_iniziale)}</td>
        {MESI.map(m => (
          <td key={m} className="px-2 py-2 text-center text-xs text-slate-700">{fmt(c[m])}</td>
        ))}
        <td className="px-2 py-2 text-center text-xs font-medium text-slate-800 border-l border-slate-100">{fmt(getTotale(c, false))}</td>
        <td className="px-2 py-2 text-center border-l border-slate-100">
          <div className="flex items-center justify-center gap-1">
            <button onClick={() => onEdit(c)} className="p-1 rounded hover:bg-slate-100"><Pencil className="w-3 h-3 text-slate-400" /></button>
            {!isSub && (
              <button onClick={() => onAddSub(c)} className="p-1 rounded hover:bg-blue-50" title="Aggiungi sottocontatore"><Plus className="w-3 h-3 text-blue-500" /></button>
            )}
            <button onClick={() => onDelete(c)} className="p-1 rounded hover:bg-red-50"><Trash2 className="w-3 h-3 text-red-400" /></button>
          </div>
        </td>
      </tr>
      <tr className={isSub ? 'bg-amber-50/40 border-l-4 border-l-amber-400' : 'bg-blue-50/50 border-l-4 border-l-transparent'}>
        <td className={`px-2 py-1 text-xs italic ${isSub ? 'pl-6 text-amber-500' : 'text-slate-400'}`}>↳ {labelConsumo}</td>
        <td className="px-2 py-1"></td>
        {MESI.map((_, i) => (
          <td key={i} className="px-2 py-1 text-center text-xs font-medium text-blue-700">{fmt(calcConsumo(c, i))}</td>
        ))}
        <td className="px-2 py-1 text-center text-xs font-bold text-blue-800 border-l border-slate-100">{fmt(getTotale(c, false))}</td>
        <td className="px-2 py-1 border-l border-slate-100"></td>
      </tr>
    </>
  );
}