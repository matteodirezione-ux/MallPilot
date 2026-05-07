import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FormMarketing from '@/components/marketing/FormMarketing';

const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const MESI_LABEL = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];

const TIPOLOGIA_COLORS = {
  COMMERCIAL: 'bg-blue-100 text-blue-800',
  ENTERTAINMENT: 'bg-purple-100 text-purple-800',
  COMMUNITY: 'bg-green-100 text-green-800',
  CULTURAL: 'bg-orange-100 text-orange-800',
  altro: 'bg-slate-100 text-slate-700',
};

const fmt = (v) => v ? v.toLocaleString('it-IT') : '–';
const fmtEuro = (v) => v ? `€ ${v.toLocaleString('it-IT')}` : '–';
const sum = (rows, mese) => rows.reduce((acc, r) => acc + (r[mese] || 0), 0);
const totaleBudget = (rows) => rows.reduce((acc, r) => acc + (r.budget_totale || 0), 0);

export default function Marketing({ centroSelezionato, user }) {
  const [rows, setRows] = useState([]);
  const [anno, setAnno] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const centroId = centroSelezionato?.id;

  useEffect(() => {
    if (centroId && centroId !== 'tutti') loadData();
  }, [centroId, anno]);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.Marketing.filter({ centro_id: centroId, anno });
    setRows(data);
    setLoading(false);
  };

  const handleSave = async (formData) => {
    if (editRow?.id) {
      await base44.entities.Marketing.update(editRow.id, formData);
    } else {
      await base44.entities.Marketing.create({ ...formData, centro_id: centroId, anno });
    }
    setFormOpen(false);
    setEditRow(null);
    loadData();
  };

  const handleDelete = async (id) => {
    await base44.entities.Marketing.delete(id);
    setDeleteConfirm(null);
    loadData();
  };

  const iniziative = rows.filter(r => r.sezione === 'iniziativa');
  const online = rows.filter(r => r.sezione === 'comunicazione_online');
  const offline = rows.filter(r => r.sezione === 'comunicazione_offline');
  const fissi = rows.filter(r => r.sezione === 'costo_fisso');

  const totaleIniziativeMese = (m) => sum(iniziative, m);
  const totaleOnlineMese = (m) => sum(online, m);
  const totaleOfflineMese = (m) => sum(offline, m);
  const totaleComunicazioneMese = (m) => totaleOnlineMese(m) + totaleOfflineMese(m);
  const totalePianoMese = (m) => totaleIniziativeMese(m) + totaleComunicazioneMese(m);
  const totaleFissiMese = (m) => sum(fissi, m);
  const totaleBudgetMese = (m) => totalePianoMese(m) + totaleFissiMese(m);

  const grandTotal = totaleBudget(rows);

  const openEdit = (row) => { setEditRow(row); setFormOpen(true); };
  const openNew = (sezione) => { setEditRow({ sezione }); setFormOpen(true); };

  const isVigilanza = user?.tipo_account === 'vigilanza';

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Piano Marketing</h1>
          <p className="text-sm text-slate-500 mt-1">{centroSelezionato?.nome} · Budget operativo {anno}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(anno)} onValueChange={v => setAnno(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024,2025,2026,2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
          <table className="w-full text-xs min-w-[1200px]">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left px-3 py-3 w-64 font-semibold">VOCE</th>
                <th className="text-right px-2 py-3 font-semibold">TOTALE</th>
                {MESI_LABEL.map(m => (
                  <th key={m} className="text-right px-2 py-3 font-semibold w-20">{m}</th>
                ))}
                {!isVigilanza && <th className="px-2 py-3 w-16"></th>}
              </tr>
            </thead>
            <tbody>

              {/* ── INIZIATIVE ── */}
              <SectionHeader label="INIZIATIVE" onAdd={!isVigilanza ? () => openNew('iniziativa') : null} colSpan={15} color="bg-blue-700" />
              {iniziative.map(row => (
                <InitiativeRow key={row.id} row={row} onEdit={() => openEdit(row)} onDelete={() => setDeleteConfirm(row.id)} isVigilanza={isVigilanza} />
              ))}
              <TotaleRow label="TOTALE INIZIATIVE" rows={iniziative} mesi={MESI} bold isVigilanza={isVigilanza} />
              <PercRow label="DISTRIBUZIONE MENSILE" totFn={totaleIniziativeMese} total={totaleBudget(iniziative)} mesi={MESI} />

              {/* ── COMUNICAZIONE ONLINE ── */}
              <SectionHeader label="ONLINE" onAdd={!isVigilanza ? () => openNew('comunicazione_online') : null} colSpan={15} color="bg-emerald-700" />
              {online.map(row => (
                <SimpleRow key={row.id} row={row} onEdit={() => openEdit(row)} onDelete={() => setDeleteConfirm(row.id)} isVigilanza={isVigilanza} />
              ))}
              <TotaleRow label="TOTALE ONLINE" rows={online} mesi={MESI} bold isVigilanza={isVigilanza} />

              {/* ── COMUNICAZIONE OFFLINE ── */}
              <SectionHeader label="OFFLINE" onAdd={!isVigilanza ? () => openNew('comunicazione_offline') : null} colSpan={15} color="bg-amber-700" />
              {offline.map(row => (
                <SimpleRow key={row.id} row={row} onEdit={() => openEdit(row)} onDelete={() => setDeleteConfirm(row.id)} isVigilanza={isVigilanza} />
              ))}
              <TotaleRow label="TOTALE OFFLINE" rows={offline} mesi={MESI} bold isVigilanza={isVigilanza} />

              {/* Totale comunicazione */}
              <tr className="bg-emerald-50 font-semibold border-t-2 border-emerald-300">
                <td className="px-3 py-2 text-emerald-800">TOTALE COMUNICAZIONE</td>
                <td className="text-right px-2 py-2 text-emerald-800">{fmtEuro(totaleBudget(online) + totaleBudget(offline))}</td>
                {MESI.map(m => <td key={m} className="text-right px-2 py-2 text-emerald-800">{fmt(totaleComunicazioneMese(m)) !== '–' ? fmt(totaleComunicazioneMese(m)) : ''}</td>)}
                {!isVigilanza && <td />}
              </tr>
              <PercRow label="DISTRIBUZIONE MENSILE" totFn={totaleComunicazioneMese} total={totaleBudget(online) + totaleBudget(offline)} mesi={MESI} />

              {/* Totale pianificato */}
              <tr className="bg-blue-50 font-bold border-t-2 border-blue-400 text-blue-900">
                <td className="px-3 py-2">TOTALE PIANIFICATO</td>
                <td className="text-right px-2 py-2">{fmtEuro(totaleBudget(iniziative) + totaleBudget(online) + totaleBudget(offline))}</td>
                {MESI.map(m => <td key={m} className="text-right px-2 py-2">{fmt(totalePianoMese(m)) !== '–' ? fmt(totalePianoMese(m)) : ''}</td>)}
                {!isVigilanza && <td />}
              </tr>
              <PercRow label="DISTRIBUZIONE MENSILE" totFn={totalePianoMese} total={totaleBudget(iniziative) + totaleBudget(online) + totaleBudget(offline)} mesi={MESI} />

              {/* ── COSTI FISSI ── */}
              <SectionHeader label="COSTI FISSI" onAdd={!isVigilanza ? () => openNew('costo_fisso') : null} colSpan={15} color="bg-rose-700" />
              {fissi.map(row => (
                <SimpleRow key={row.id} row={row} onEdit={() => openEdit(row)} onDelete={() => setDeleteConfirm(row.id)} isVigilanza={isVigilanza} />
              ))}
              <TotaleRow label="TOTALE COSTI FISSI" rows={fissi} mesi={MESI} bold isVigilanza={isVigilanza} />
              <PercRow label="DISTRIBUZIONE MENSILE" totFn={totaleFissiMese} total={totaleBudget(fissi)} mesi={MESI} />

              {/* Grand Total */}
              <tr className="bg-slate-800 text-white font-bold border-t-2 border-slate-600 text-sm">
                <td className="px-3 py-3">TOTALE BUDGET</td>
                <td className="text-right px-2 py-3">{fmtEuro(totaleBudget([...iniziative, ...online, ...offline, ...fissi]))}</td>
                {MESI.map(m => <td key={m} className="text-right px-2 py-3">{totaleBudgetMese(m) ? fmt(totaleBudgetMese(m)) : ''}</td>)}
                {!isVigilanza && <td />}
              </tr>

            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      {formOpen && (
        <FormMarketing
          row={editRow}
          onSave={handleSave}
          onCancel={() => { setFormOpen(false); setEditRow(null); }}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-slate-800 mb-2">Elimina voce</h3>
            <p className="text-sm text-slate-600 mb-4">Sei sicuro di voler eliminare questa voce?</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>Annulla</Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(deleteConfirm)}>Elimina</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function SectionHeader({ label, onAdd, colSpan, color }) {
  return (
    <tr className={`${color} text-white text-xs font-bold`}>
      <td className="px-3 py-2 uppercase tracking-wide">{label}</td>
      <td colSpan={colSpan - 1} className="px-2 py-2 text-right">
        {onAdd && (
          <button onClick={onAdd} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/20 hover:bg-white/30 transition-colors text-white text-xs">
            <Plus className="w-3 h-3" /> Aggiungi
          </button>
        )}
      </td>
    </tr>
  );
}

function InitiativeRow({ row, onEdit, onDelete, isVigilanza }) {
  const mesi = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  const perc = row.budget_totale && totaleBudget([row]) > 0
    ? Math.round((row.budget_totale / row.budget_totale) * 100)
    : 0;

  return (
    <>
      {/* Riga costo */}
      <tr className="border-b border-slate-100 hover:bg-slate-50">
        <td className="px-3 py-1.5 font-medium text-slate-800">
          <div className="flex items-center gap-1.5">
            <span>{row.nome}</span>
            {row.tipologia && <span className={`text-[9px] px-1 py-0.5 rounded font-semibold ${TIPOLOGIA_COLORS[row.tipologia] || 'bg-slate-100 text-slate-600'}`}>{row.tipologia}</span>}
          </div>
        </td>
        <td className="text-right px-2 py-1.5 font-semibold text-slate-800">{row.budget_totale ? row.budget_totale.toLocaleString('it-IT') : '–'}</td>
        {mesi.map(m => (
          <td key={m} className="text-right px-2 py-1.5 text-slate-700">
            <div>{row[m] ? row[m].toLocaleString('it-IT') : ''}</div>
            {row[`nome_iniziativa_${m}`] && <div className="text-[9px] text-slate-500">{row[`nome_iniziativa_${m}`]}</div>}
          </td>
        ))}
        {!isVigilanza && (
          <td className="px-2 py-1.5">
            <div className="flex gap-1 justify-end">
              <button onClick={onEdit} className="p-1 rounded hover:bg-slate-100 text-slate-500"><Pencil className="w-3 h-3" /></button>
              <button onClick={onDelete} className="p-1 rounded hover:bg-red-100 text-red-500"><Trash2 className="w-3 h-3" /></button>
            </div>
          </td>
        )}
      </tr>
    </>
  );
}

function SimpleRow({ row, onEdit, onDelete, isVigilanza }) {
  const mesi = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-3 py-2 text-slate-700">{row.nome}</td>
      <td className="text-right px-2 py-2 font-medium text-slate-800">{row.budget_totale ? row.budget_totale.toLocaleString('it-IT') : '–'}</td>
      {mesi.map(m => (
        <td key={m} className="text-right px-2 py-2 text-slate-700">
          {row[m] ? row[m].toLocaleString('it-IT') : ''}
        </td>
      ))}
      {!isVigilanza && (
        <td className="px-2 py-2">
          <div className="flex gap-1 justify-end">
            <button onClick={onEdit} className="p-1 rounded hover:bg-slate-100 text-slate-500"><Pencil className="w-3 h-3" /></button>
            <button onClick={onDelete} className="p-1 rounded hover:bg-red-100 text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        </td>
      )}
    </tr>
  );
}

function TotaleRow({ label, rows, mesi, bold, isVigilanza }) {
  return (
    <tr className={`bg-slate-100 border-t-2 border-slate-300 ${bold ? 'font-bold' : 'font-semibold'}`}>
      <td className="px-3 py-2 text-slate-800 text-xs">{label}</td>
      <td className="text-right px-2 py-2 text-slate-800 text-xs">{totaleBudget(rows) ? totaleBudget(rows).toLocaleString('it-IT') : '–'}</td>
      {mesi.map(m => {
        const v = sum(rows, m);
        return <td key={m} className="text-right px-2 py-2 text-slate-800 text-xs">{v ? v.toLocaleString('it-IT') : ''}</td>;
      })}
      {!isVigilanza && <td />}
    </tr>
  );
}

function PercRow({ label, totFn, total, mesi }) {
  return (
    <tr className="bg-slate-50 text-[10px] text-slate-500 border-b border-slate-200">
      <td className="px-3 py-1">{label}</td>
      <td className="text-right px-2 py-1">100%</td>
      {mesi.map(m => {
        const v = totFn(m);
        const p = total > 0 && v > 0 ? Math.round((v / total) * 100) : 0;
        return <td key={m} className="text-right px-2 py-1">{p > 0 ? `${p}%` : ''}</td>;
      })}
      <td />
    </tr>
  );
}