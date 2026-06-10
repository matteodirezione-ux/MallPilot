import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, TrendingUp, Megaphone, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const MESI_LABEL = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];

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
  const [budgetInput, setBudgetInput] = useState('');
  const [budgetSaved, setBudgetSaved] = useState(0);
  const [collapsed, setCollapsed] = useState({ iniziativa: false, comunicazione_online: false, comunicazione_offline: false, costo_fisso: false });

  const centroId = centroSelezionato?.id;

  useEffect(() => {
    if (centroId && centroId !== 'tutti') {
      loadData();
      const key = `mkt_budget_${centroId}_${anno}`;
      const saved = localStorage.getItem(key);
      if (saved) { setBudgetSaved(parseFloat(saved)); setBudgetInput(saved); }
      else { setBudgetSaved(0); setBudgetInput(''); }
    }
  }, [centroId, anno]);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.Marketing.filter({ centro_id: centroId, anno });
    setRows(data);
    setLoading(false);
  };

  const handleSave = async (formData) => {
    const cleaned = { ...formData };
    MESI.forEach(m => {
      const v = cleaned[m];
      cleaned[m] = (v !== '' && v !== null && v !== undefined) ? (parseFloat(String(v).replace(',', '.')) || null) : null;
    });
    const sommaMesi = MESI.reduce((acc, m) => acc + (cleaned[m] || 0), 0);
    if (cleaned.budget_totale !== '' && cleaned.budget_totale !== null && cleaned.budget_totale !== undefined) {
      cleaned.budget_totale = parseFloat(String(cleaned.budget_totale).replace(',', '.')) || sommaMesi || null;
    } else {
      cleaned.budget_totale = sommaMesi || null;
    }
    if (editRow?.id) {
      await base44.entities.Marketing.update(editRow.id, cleaned);
    } else {
      await base44.entities.Marketing.create({ ...cleaned, centro_id: centroId, anno });
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

  const totaleComunicazioneMese = (m) => sum(online, m) + sum(offline, m);
  const totaleBudgetMese = (m) => sum(iniziative, m) + totaleComunicazioneMese(m) + sum(fissi, m);

  const openEdit = (row) => { setEditRow(row); setFormOpen(true); };
  const openNew = (sezione) => { setEditRow({ sezione }); setFormOpen(true); };
  const toggleCollapse = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  const isVigilanza = user?.tipo_account === 'vigilanza';

  if (!centroId || centroId === 'tutti') {
    return <div className="p-8 text-center text-slate-500">Seleziona un centro per visualizzare il piano marketing</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Megaphone className="w-6 h-6" /> Piano Marketing</h1>
          <p className="text-slate-500 text-sm">{centroSelezionato?.nome} · Budget operativo {anno}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setAnno(a => a - 1)} className="text-slate-400 hover:text-slate-700 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold px-3 text-slate-700">{anno}</span>
          <button onClick={() => setAnno(a => a + 1)} className="text-slate-400 hover:text-slate-700 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* KPI */}
      {(() => {
        const consuntivo = totaleBudget(rows);
        const diff = budgetSaved > 0 ? budgetSaved - consuntivo : null;
        const fmtC = (v) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-xs text-purple-600 font-medium mb-2">Budget</p>
              <input type="number" value={budgetInput} onChange={e => setBudgetInput(e.target.value)}
                onBlur={() => { const val = parseFloat(budgetInput) || 0; setBudgetSaved(val); localStorage.setItem(`mkt_budget_${centroId}_${anno}`, String(val)); }}
                placeholder="–" className="text-xl font-bold text-slate-900 bg-transparent border-b border-purple-300 focus:border-purple-600 outline-none w-full" />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500 font-medium mb-2">Consuntivo</p>
              <p className="text-xl font-bold text-slate-800">{fmtC(consuntivo)}</p>
            </div>
            <div className={`rounded-xl p-4 border ${diff === null ? 'bg-slate-50 border-slate-200' : diff >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-xs font-medium mb-2 text-slate-500">Differenza</p>
              <p className={`text-xl font-bold ${diff === null ? 'text-slate-400' : diff >= 0 ? 'text-green-700' : 'text-red-700'}`}>{diff !== null ? fmtC(diff) : '–'}</p>
            </div>
          </div>
        );
      })()}

      {loading ? (
        <div className="text-center py-8 text-slate-400">Caricamento...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2 font-semibold text-slate-600 w-48">VOCE</th>
                <th className="px-2 py-2 font-semibold text-slate-600 w-20">TOTALE</th>
                {MESI_LABEL.map(m => <th key={m} className="px-2 py-2 font-semibold text-slate-500 w-16">{m}</th>)}
                {!isVigilanza && <th className="w-16"></th>}
              </tr>
            </thead>
            <tbody>
              <SectionHeader label="INIZIATIVE" onAdd={!isVigilanza ? () => openNew('iniziativa') : null} colSpan={15} color="bg-blue-700" collapsed={collapsed.iniziativa} onToggle={() => toggleCollapse('iniziativa')} />
              {!collapsed.iniziativa && iniziative.map(row => <SimpleRow key={row.id} row={row} onEdit={() => openEdit(row)} onDelete={() => setDeleteConfirm(row.id)} isVigilanza={isVigilanza} />)}
              <TotaleRow label="TOTALE INIZIATIVE" rows={iniziative} mesi={MESI} bold isVigilanza={isVigilanza} />

              <SectionHeader label="COMUNICAZIONE ONLINE" onAdd={!isVigilanza ? () => openNew('comunicazione_online') : null} colSpan={15} color="bg-emerald-700" collapsed={collapsed.comunicazione_online} onToggle={() => toggleCollapse('comunicazione_online')} />
              {!collapsed.comunicazione_online && online.map(row => <SimpleRow key={row.id} row={row} onEdit={() => openEdit(row)} onDelete={() => setDeleteConfirm(row.id)} isVigilanza={isVigilanza} />)}

              <SectionHeader label="COMUNICAZIONE OFFLINE" onAdd={!isVigilanza ? () => openNew('comunicazione_offline') : null} colSpan={15} color="bg-amber-700" collapsed={collapsed.comunicazione_offline} onToggle={() => toggleCollapse('comunicazione_offline')} />
              {!collapsed.comunicazione_offline && offline.map(row => <SimpleRow key={row.id} row={row} onEdit={() => openEdit(row)} onDelete={() => setDeleteConfirm(row.id)} isVigilanza={isVigilanza} />)}

              <TotaleRow label="TOTALE COMUNICAZIONE" rows={[...online, ...offline]} mesi={MESI} isVigilanza={isVigilanza} />

              <SectionHeader label="COSTI FISSI" onAdd={!isVigilanza ? () => openNew('costo_fisso') : null} colSpan={15} color="bg-rose-700" collapsed={collapsed.costo_fisso} onToggle={() => toggleCollapse('costo_fisso')} />
              {!collapsed.costo_fisso && fissi.map(row => <SimpleRow key={row.id} row={row} onEdit={() => openEdit(row)} onDelete={() => setDeleteConfirm(row.id)} isVigilanza={isVigilanza} />)}
              <TotaleRow label="TOTALE COSTI FISSI" rows={fissi} mesi={MESI} isVigilanza={isVigilanza} />

              <TotaleRow label="TOTALE BUDGET" rows={rows} mesi={MESI} bold isVigilanza={isVigilanza} />
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      {formOpen && (
        <MarketingForm row={editRow} onSave={handleSave} onClose={() => { setFormOpen(false); setEditRow(null); }} />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <Dialog open onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Elimina voce</DialogTitle></DialogHeader>
            <p className="text-sm text-slate-600">Sei sicuro di voler eliminare questa voce?</p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">Annulla</Button>
              <Button onClick={() => handleDelete(deleteConfirm)} className="flex-1 bg-red-600 hover:bg-red-700">Elimina</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function SectionHeader({ label, onAdd, colSpan, color, collapsed, onToggle }) {
  return (
    <tr className={`${color} text-white cursor-pointer`} onClick={onToggle}>
      <td className="px-3 py-1.5 font-bold text-xs flex items-center gap-2">
        {collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        {label}
      </td>
      <td colSpan={13}></td>
      <td className="px-2 py-1.5 text-right">
        {onAdd && (
          <button onClick={e => { e.stopPropagation(); onAdd(); }} className="text-xs bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded">+ Aggiungi</button>
        )}
      </td>
    </tr>
  );
}

function SimpleRow({ row, onEdit, onDelete, isVigilanza }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-3 py-1.5 text-slate-700">{row.nome}</td>
      <td className="px-2 py-1.5 text-right text-slate-600">{row.budget_totale ? row.budget_totale.toLocaleString('it-IT') : '–'}</td>
      {MESI.map(m => <td key={m} className="px-2 py-1.5 text-right text-slate-500">{row[m] ? row[m].toLocaleString('it-IT') : ''}</td>)}
      {!isVigilanza && (
        <td className="px-2 py-1.5">
          <div className="flex gap-1 justify-end">
            <button onClick={onEdit} className="p-1 hover:bg-slate-100 rounded"><Pencil className="w-3 h-3 text-slate-400" /></button>
            <button onClick={onDelete} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3 text-red-400" /></button>
          </div>
        </td>
      )}
    </tr>
  );
}

function TotaleRow({ label, rows, mesi, bold, isVigilanza }) {
  const cls = bold ? 'font-bold bg-slate-100' : 'font-medium bg-slate-50';
  return (
    <tr className={`border-b border-slate-200 ${cls}`}>
      <td className="px-3 py-1.5 text-slate-700">{label}</td>
      <td className="px-2 py-1.5 text-right">{totaleBudget(rows) ? totaleBudget(rows).toLocaleString('it-IT') : '–'}</td>
      {mesi.map(m => { const v = sum(rows, m); return <td key={m} className="px-2 py-1.5 text-right">{v ? v.toLocaleString('it-IT') : ''}</td>; })}
      {!isVigilanza && <td></td>}
    </tr>
  );
}

function MarketingForm({ row, onSave, onClose }) {
  const [form, setForm] = useState({
    sezione: row?.sezione || 'iniziativa',
    nome: row?.nome || '',
    tipologia: row?.tipologia || '',
    budget_totale: row?.budget_totale || '',
    ...MESI.reduce((acc, m) => ({ ...acc, [m]: row?.[m] || '' }), {})
  });

  const setMese = (m, v) => {
    setForm(prev => {
      const updated = { ...prev, [m]: v };
      const somma = MESI.reduce((acc, k) => acc + (parseFloat(String(updated[k]).replace(',', '.')) || 0), 0);
      return { ...updated, budget_totale: somma > 0 ? somma : '' };
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{row?.id ? 'Modifica voce' : 'Nuova voce'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Sezione</Label>
            <select value={form.sezione} onChange={e => setForm(p => ({ ...p, sezione: e.target.value }))} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="iniziativa">Iniziativa</option>
              <option value="comunicazione_online">Comunicazione Online</option>
              <option value="comunicazione_offline">Comunicazione Offline</option>
              <option value="costo_fisso">Costo Fisso</option>
            </select>
          </div>
          <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} className="mt-1" /></div>
          {form.sezione === 'iniziativa' && (
            <div>
              <Label>Tipologia</Label>
              <select value={form.tipologia} onChange={e => setForm(p => ({ ...p, tipologia: e.target.value }))} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="">–</option>
                {['COMMERCIAL','ENTERTAINMENT','COMMUNITY','CULTURAL','altro'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
          <div><Label>Budget Totale (€)</Label><Input type="number" value={form.budget_totale} onChange={e => setForm(p => ({ ...p, budget_totale: e.target.value }))} className="mt-1" /></div>
          <div>
            <Label>Importi mensili (€)</Label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {MESI.map((m, i) => (
                <div key={m}>
                  <p className="text-xs text-slate-500 mb-0.5">{MESI_LABEL[i]}</p>
                  <Input type="number" value={form[m]} onChange={e => setMese(m, e.target.value)} className="h-8 text-xs" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Annulla</Button>
            <Button type="button" onClick={() => onSave(form)} className="flex-1 bg-blue-600 hover:bg-blue-700">Salva</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}