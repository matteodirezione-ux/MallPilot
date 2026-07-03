import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Pencil, ChevronLeft, ChevronRight, Droplet, ClipboardEdit } from 'lucide-react';
import FormContatoreGiornaliero from '@/components/contatori/FormContatoreGiornaliero';
import FormRilevazioneGiornaliera from '@/components/contatori/FormRilevazioneGiornaliera';

const MESI_NOMI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const MESI_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const daysInMonth = (y, m) => new Date(y, m, 0).getDate();
const fmt = (v) => v == null ? '' : v.toLocaleString('it-IT');

const consumoContatore = (c, N) => {
  const vals = [];
  for (let i = 1; i <= N; i++) { const v = c[`d${i}`]; if (v != null) vals.push(v); }
  if (vals.length < 2) return null;
  return vals[vals.length - 1] - vals[0];
};

// Consumo del singolo giorno = differenza dalla lettura del giorno precedente
const consumoGiorno = (c, d) => {
  if (d === 1) return null;
  const v = c[`d${d}`], prev = c[`d${d - 1}`];
  if (v == null || prev == null) return null;
  return v - prev;
};

const valoreCella = (c, d, mode) => {
  const cons = consumoGiorno(c, d);
  if (cons == null) return null;
  return mode === 'costi' ? cons * (c.costo_unitario || 0) : cons;
};

const totaleContatore = (c, N, mode) => {
  const cons = consumoContatore(c, N);
  if (cons == null) return null;
  return mode === 'costi' ? cons * (c.costo_unitario || 0) : cons;
};

const fmtVal = (v, mode) => {
  if (v == null) return '';
  return mode === 'costi' ? '€ ' + v.toLocaleString('it-IT', { maximumFractionDigits: 2 }) : v.toLocaleString('it-IT');
};

export default function AcquaGiornaliera({ centroSelezionato, anno, mode = 'consumi' }) {
  const [mese, setMese] = useState(new Date().getMonth() + 1);
  const [contatori, setContatori] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showRilevazione, setShowRilevazione] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (centroSelezionato?.id) load();
  }, [centroSelezionato?.id, anno, mese]);

  const load = async () => {
    setLoading(true);
    const isAll = centroSelezionato.id === 'tutti';
    const data = isAll
      ? await base44.entities.LetturaContatoreGiornaliero.filter({ anno, mese })
      : await base44.entities.LetturaContatoreGiornaliero.filter({ centro_id: centroSelezionato.id, anno, mese });
    setContatori(data);
    setLoading(false);
  };

  const N = daysInMonth(anno, mese);

  const handleSave = async (data) => {
    const payload = { ...data, centro_id: centroSelezionato.id !== 'tutti' ? centroSelezionato.id : '', tipo: 'acqua' };
    if (editing) {
      await base44.entities.LetturaContatoreGiornaliero.update(editing.id, payload);
    } else {
      await base44.entities.LetturaContatoreGiornaliero.create(payload);
    }
    setShowForm(false); setEditing(null);
    load();
  };

  const handleDelete = async (c) => {
    if (!confirm(`Eliminare il contatore "${c.nome}"?`)) return;
    await base44.entities.LetturaContatoreGiornaliero.delete(c.id);
    load();
  };

  const handleSaveRilevazione = async ({ id, giorno, valore }) => {
    const c = contatori.find(x => x.id === id);
    if (!c) return;
    await base44.entities.LetturaContatoreGiornaliero.update(id, { [`d${giorno}`]: valore });
    setShowRilevazione(false);
    load();
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
        <div className="flex items-center gap-2">
          {contatori.length > 0 && (
            <Button onClick={() => setShowRilevazione(true)} className="bg-orange-600 hover:bg-orange-700 gap-2">
              <ClipboardEdit className="w-4 h-4" /> Rilevazione
            </Button>
          )}
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus className="w-4 h-4" /> Nuovo Contatore
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
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: N }, (_, i) => i + 1).map(d => (
                <tr key={d} className={d % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}>
                  <td className="px-2 py-1.5 text-xs font-medium text-slate-600 text-center sticky left-0 bg-inherit">{d}</td>
                  {contatori.map(c => (
                    <td key={c.id} className={`px-2 py-1.5 text-center text-xs ${mode === 'costi' ? 'text-emerald-700' : 'text-slate-700'}`}>{fmtVal(valoreCella(c, d, mode), mode)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-blue-600 text-white border-t-2 border-slate-300">
                <td className={`px-2 py-2 text-xs font-bold sticky left-0 ${mode === 'costi' ? 'bg-emerald-600' : 'bg-blue-600'}`}>{mode === 'costi' ? 'COSTO' : 'CONSUMO'}</td>
                {contatori.map(c => (
                  <td key={c.id} className="px-2 py-2 text-center text-xs font-bold">{fmtVal(totaleContatore(c, N, mode), mode)}</td>
                ))}
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

      <FormRilevazioneGiornaliera
        open={showRilevazione}
        onClose={() => setShowRilevazione(false)}
        onSave={handleSaveRilevazione}
        contatori={contatori}
        mese={mese}
        anno={anno}
        giorni={N}
      />
    </div>
  );
}