import React from 'react';
import { Pencil, Plus, Trash2, GitBranch } from 'lucide-react';

const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const MESI_LABEL = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

const fmt = (v) => v == null ? '—' : v.toLocaleString('it-IT');
const fmtCost = (v) => v == null ? '—' : '€ ' + Number(v).toLocaleString('it-IT', { maximumFractionDigits: 2 });
const fmtUnit = (v) => v == null ? '—' : '€ ' + Number(v).toLocaleString('it-IT', { minimumFractionDigits: 3, maximumFractionDigits: 4 });

const calcConsumo = (c, idx) => {
  const val = c[MESI[idx]];
  if (val == null) return null;
  const prev = idx === 0 ? c.lettura_iniziale : c[MESI[idx - 1]];
  if (prev == null) return null;
  return val - prev;
};
const getConsumo = (c, i, direct) => direct ? c[MESI[i]] : calcConsumo(c, i);
const getTotaleConsumo = (c, direct) => {
  let tot = 0, has = false;
  for (let i = 0; i < 12; i++) {
    const v = getConsumo(c, i, direct);
    if (v != null) { tot += v; has = true; }
  }
  return has ? tot : null;
};
const getCosto = (c, i) => c['costo_' + MESI[i]];
const getTotaleCosto = (c) => {
  let tot = 0, has = false;
  for (let i = 0; i < 12; i++) {
    const v = getCosto(c, i);
    if (v != null) { tot += v; has = true; }
  }
  return has ? tot : null;
};

// Costo unitario calcolato: costo_mese / consumo_mese
const getCostoUnitarioCalc = (c, i, direct) => {
  const costo = getCosto(c, i);
  const cons = getConsumo(c, i, direct);
  if (costo == null || cons == null || cons === 0) return null;
  return costo / cons;
};
// Media annua ponderata
const getMediaCostoUnitario = (c, direct) => {
  let totCosto = 0, totCons = 0, has = false;
  for (let i = 0; i < 12; i++) {
    const costo = getCosto(c, i);
    const cons = getConsumo(c, i, direct);
    if (costo != null && cons != null && cons !== 0) { totCosto += costo; totCons += cons; has = true; }
  }
  return has && totCons > 0 ? totCosto / totCons : null;
};

const valColor = (mode) => mode === 'costi' ? 'text-emerald-700' : 'text-blue-700';
const totColor = (mode) => mode === 'costi' ? 'text-emerald-800' : 'text-blue-800';

export default function ContatoreRow({ c, isSub, onEdit, onAddSub, onDelete, onQuickEdit = () => {}, labelConsumo = 'Consumo', directConsumo = false, mode = 'consumi', unitLabel = '' }) {
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
    <td className={`px-2 py-2 text-xs ${isSub ? 'pl-6 text-amber-800 italic font-semibold' : 'font-bold text-slate-900'}`}>
      <div className="flex items-center gap-1.5">
        {isSub && <GitBranch className="w-3.5 h-3.5 text-amber-600" />}
        {isSub && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wide shadow-sm">Sub</span>}
        {c.nome}
      </div>
    </td>
  );

  // Modalità costo_unitario: calcolato = costo / consumo per ogni mese
  if (mode === 'costo_unitario') {
    return (
      <tr className={isSub ? 'bg-amber-100 border-l-[6px] border-l-amber-500 border-t border-t-amber-200' : 'bg-white border-l-[6px] border-l-transparent border-t border-t-slate-100'}>
        {nomeCell}
        <td className={`px-2 py-2 text-center text-xs ${isSub ? 'text-amber-700 italic' : 'font-bold text-amber-800'}`}>{unitLabel}</td>
        {MESI.map((m, i) => (
          <td key={m} className={`px-2 py-2 text-center text-xs ${isSub ? 'text-amber-700' : 'font-bold text-amber-800'}`}>{fmtUnit(getCostoUnitarioCalc(c, i, directConsumo))}</td>
        ))}
        <td className={`px-2 py-2 text-center text-xs ${isSub ? 'text-amber-700' : 'font-bold text-amber-900'} border-l border-slate-200`}>{fmtUnit(getMediaCostoUnitario(c, directConsumo))}</td>
        {azioni}
      </tr>
    );
  }

  // Modalità costi: tabella indipendente, valori € inseriti manualmente (slegati dai consumi)
  if (mode === 'costi') {
    return (
      <tr className={isSub ? 'bg-amber-100 border-l-[6px] border-l-amber-500 border-t border-t-amber-200' : 'bg-white border-l-[6px] border-l-transparent border-t border-t-slate-100'}>
        {nomeCell}
        {MESI.map((m, i) => (
          <td key={m} onClick={() => onQuickEdit(c, 'costo_' + m, MESI_LABEL[i])} className={`px-2 py-2 text-center text-xs cursor-pointer hover:bg-emerald-50 transition-colors ${isSub ? valColor(mode) + ' font-normal' : 'font-bold ' + valColor(mode)}`}>{fmtCost(getCosto(c, i))}</td>
        ))}
        <td className={`px-2 py-2 text-center text-xs ${isSub ? totColor(mode) + ' font-normal' : 'font-bold ' + totColor(mode)} border-l border-slate-200`}>{fmtCost(getTotaleCosto(c))}</td>
        {azioni}
      </tr>
    );
  }

  // Modalità consumi (letture/consumi)
  if (directConsumo) {
    return (
      <tr className={isSub ? 'bg-amber-100 border-l-[6px] border-l-amber-500 border-t border-t-amber-200' : 'bg-white border-l-[6px] border-l-transparent border-t border-t-slate-100'}>
        {nomeCell}
        {MESI.map((m, i) => (
          <td key={m} onClick={() => onQuickEdit(c, m, MESI_LABEL[i])} className={`px-2 py-2 text-center text-xs cursor-pointer hover:bg-blue-50 transition-colors ${isSub ? valColor(mode) + ' font-normal' : 'font-bold ' + valColor(mode)}`}>{fmt(getConsumo(c, i, true))}</td>
        ))}
        <td className={`px-2 py-2 text-center text-xs ${isSub ? totColor(mode) + ' font-normal' : 'font-bold ' + totColor(mode)} border-l border-slate-200`}>{fmt(getTotaleConsumo(c, true))}</td>
        {azioni}
      </tr>
    );
  }

  return (
    <>
      <tr className={isSub ? 'bg-amber-100 border-l-[6px] border-l-amber-500 border-t border-t-amber-200' : 'bg-white border-l-[6px] border-l-transparent border-t border-t-slate-100'}>
        {nomeCell}
        <td onClick={() => onQuickEdit(c, 'lettura_iniziale', 'Lettura Iniz.')} className={`px-2 py-2 text-center text-xs cursor-pointer hover:bg-blue-50 transition-colors ${isSub ? 'text-slate-600' : 'font-bold text-slate-700'}`}>{fmt(c.lettura_iniziale)}</td>
        {MESI.map((m, i) => (
          <td key={m} onClick={() => onQuickEdit(c, m, MESI_LABEL[i])} className={`px-2 py-2 text-center text-xs cursor-pointer hover:bg-blue-50 transition-colors ${isSub ? 'text-slate-600' : 'font-bold text-slate-800'}`}>{fmt(c[m])}</td>
        ))}
        <td className={`px-2 py-2 text-center text-xs ${isSub ? 'text-slate-700' : 'font-bold text-slate-900'} border-l border-slate-200`}>{fmt(getTotaleConsumo(c, false))}</td>
        {azioni}
      </tr>
      <tr className={isSub ? 'bg-amber-50 border-l-[6px] border-l-amber-500' : 'bg-blue-50/50 border-l-[6px] border-l-transparent'}>
        <td className={`px-2 py-1 text-xs italic ${isSub ? 'pl-6 text-amber-600 font-semibold' : 'text-slate-400'}`}>↳ {labelConsumo}</td>
        <td className="px-2 py-1"></td>
        {MESI.map((_, i) => (
          <td key={i} className={`px-2 py-1 text-center text-xs ${isSub ? valColor('consumi') + ' font-normal' : 'font-bold ' + valColor('consumi')}`}>{fmt(getConsumo(c, i, false))}</td>
        ))}
        <td className={`px-2 py-1 text-center text-xs font-bold ${totColor('consumi')} border-l border-slate-200`}>{fmt(getTotaleConsumo(c, false))}</td>
        <td className="px-2 py-1 border-l border-slate-200"></td>
      </tr>
    </>
  );
}