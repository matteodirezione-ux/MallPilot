import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Pencil, ChevronLeft, ChevronRight, Droplet } from 'lucide-react';
import FormContatoreGiornaliero from '@/components/contatori/FormContatoreGiornaliero';

const MESI_NOMI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const daysInMonth = (y, m) => new Date(y, m, 0).getDate();
const fmt = (v) => v == null ? '' : v.toLocaleString('it-IT');

const valoreCella = (c, d, mode) => {
  const v = c[`d${d}`];
  if (v == null) return null;
  return mode === 'costi' ? v * (c.costo_unitario || 0) : v;
};

const totaleContatore = (c, N, mode) => {
  let tot = 0, has = false;
  for (let i = 1; i <= N; i++) { const v = c[`d${i}`]; if (v != null) { tot += v; has = true; } }
  if (!has) return null;
  return mode === 'costi' ? tot * (c.costo_unitario || 0) : tot;
};

const fmtVal = (v, mode) => {
  if (v == null) return '';
  return mode === 'costi' ? '€ ' + v.toLocaleString('it-IT', { maximumFractionDigits: 2 }) : v.toLocaleString('it-IT');
};

export default function AcquaGiornaliera({ centroSelezionato, anno, mode = 'consumi', mese, setMese, contatori, loading, onReload }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const N = daysInMonth(anno, mese);

  const handleSave = async (data) => {
    const payload = { ...data, centro_id: centroSelezionato.id !== 'tutti' ? centroSelezionato.id : '', tipo: 'acqua' };
    if (editing) {
      await base44.entities.LetturaContatoreGiornaliero.update(editing.id, payload);
    } else {
      await base44.entities.LetturaContatoreGiornaliero.create(payload);
    }
    setShowForm(false); setEditing(null);
    onReload();
  };

  const handleDelete = async (c) => {
    if (!confirm(`Eliminare il contatore "${c.nome}"?`)) return;
    await base44.entities.LetturaContatoreGiornaliero.delete(c.id);
    onReload();
  };

  const shiftMese = (delta) => {
    setMese(m => {
      let nm = m + delta;
      if (nm < 1) nm = 12;
      if (nm > 12) nm = 1;
      return nm;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => shiftMese(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-bold text-slate-800 min-w-[120px] text-center">{MESI_NOMI[mese - 1]}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => shiftMese(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-400">Caricamento...</div>
      ) : contatori.length === 0 ? (
        <div className="text-center py-8 text-slate-400">Nessun contatore per {MESI_NOMI[mese - 1]} {anno}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-2 py-2 text-left text-xs font-semibold text-slate-600 min-w-[60px] sticky left-0 bg-slate-100">Giorno</th>
                {contatori.map(c => (
                  <th key={c.id} className="px-2 py-2 text-center text-xs font-semibold text-slate-700 min-w-[90px]">
                    <div className="flex items-center justify-center gap-1">
                      <Droplet className="w-3 h-3 text-blue-400" />
                      <button onClick={() => { setEditing(c); setShowForm(true); }} className="hover:text-blue-600 flex items-center gap-1">
                        <span className="truncate max-w-[100px]">{c.nome}</span>
                        <Pencil className="w-3 h-3 text-slate-400" />
                      </button>
                      <button onClick={() => handleDelete(c)} className="p-0.5 rounded hover:bg-red-50">
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="px-2 py-2 text-center border-l border-slate-200 min-w-[90px]">
                  <Button onClick={() => { setEditing(null); setShowForm(true); }} size="sm" className="bg-blue-600 hover:bg-blue-700 h-7 px-2 gap-1">
                    <Plus className="w-3.5 h-3.5" /> Nuovo
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: N }, (_, i) => i + 1).map(d => (
                <tr key={d} className={d % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}>
                  <td className="px-2 py-1.5 text-xs font-medium text-slate-600 text-center sticky left-0 bg-inherit">{d}</td>
                  {contatori.map(c => (
                    <td key={c.id} className={`px-2 py-1.5 text-center text-xs ${mode === 'costi' ? 'text-emerald-700' : 'text-slate-700'}`}>{fmtVal(valoreCella(c, d, mode), mode)}</td>
                  ))}
                  <td className="px-2 py-1.5 border-l border-slate-200"></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-blue-600 text-white border-t-2 border-slate-300">
                <td className={`px-2 py-2 text-xs font-bold sticky left-0 ${mode === 'costi' ? 'bg-emerald-600' : 'bg-blue-600'}`}>{mode === 'costi' ? 'COSTO' : 'CONSUMO'}</td>
                {contatori.map(c => (
                  <td key={c.id} className="px-2 py-2 text-center text-xs font-bold">{fmtVal(totaleContatore(c, N, mode), mode)}</td>
                ))}
                <td className="px-2 py-2 border-l border-slate-600"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <FormContatoreGiornaliero
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSave={handleSave}
        contatore={editing}
        anno={anno}
        mese={mese}
      />
    </div>
  );
}