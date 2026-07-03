import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight, Droplet, Flame, Sun, ClipboardEdit } from 'lucide-react';
import FormContatore from '@/components/contatori/FormContatore';
import ContatoreRow from '@/components/contatori/ContatoreRow';
import FormRilevazione from '@/components/contatori/FormRilevazione';

const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const MESI_LABEL = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

const TIPI = [
  { key: 'acqua', label: 'Acqua', icon: Droplet, activeColor: 'bg-blue-600 text-white' },
  { key: 'gas', label: 'Gas', icon: Flame, activeColor: 'bg-orange-600 text-white' },
  { key: 'fotovoltaico', label: 'Fotovoltaico', icon: Sun, activeColor: 'bg-yellow-500 text-white' },
];

const fmt = (v) => v == null ? '—' : v.toLocaleString('it-IT');

export default function LetturaContatori({ centroSelezionato, user }) {
  const [tab, setTab] = useState('acqua');
  const [anno, setAnno] = useState(new Date().getFullYear());
  const [contatori, setContatori] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showRilevazione, setShowRilevazione] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formPadre, setFormPadre] = useState(null);

  useEffect(() => {
    if (centroSelezionato?.id) loadContatori();
  }, [centroSelezionato?.id, anno]);

  const loadContatori = async () => {
    setLoading(true);
    const isAll = centroSelezionato.id === 'tutti';
    const data = isAll
      ? await base44.entities.LetturaContatore.filter({ anno })
      : await base44.entities.LetturaContatore.filter({ centro_id: centroSelezionato.id, anno });
    setContatori(data);
    setLoading(false);
  };

  const contatoriTipo = contatori.filter(c => c.tipo === tab);
  const principali = contatoriTipo.filter(c => !c.contatore_padre_id);
  const getSub = (padreId) => contatoriTipo.filter(c => c.contatore_padre_id === padreId);

  const handleSave = async (data) => {
    const payload = {
      ...data,
      centro_id: centroSelezionato.id !== 'tutti' ? centroSelezionato.id : '',
      contatore_padre_id: formPadre?.id || editing?.contatore_padre_id || null,
    };
    if (editing) {
      await base44.entities.LetturaContatore.update(editing.id, payload);
    } else {
      await base44.entities.LetturaContatore.create(payload);
    }
    setShowForm(false); setEditing(null); setFormPadre(null);
    loadContatori();
  };

  const handleDelete = async (c) => {
    if (!confirm(`Eliminare "${c.nome}"${getSub(c.id).length ? ' e tutti i suoi sottocontatori' : ''}?`)) return;
    for (const s of getSub(c.id)) await base44.entities.LetturaContatore.delete(s.id);
    await base44.entities.LetturaContatore.delete(c.id);
    loadContatori();
  };

  const onEdit = (c) => { setFormPadre(null); setEditing(c); setShowForm(true); };
  const onAddSub = (c) => { setFormPadre(c); setEditing(null); setShowForm(true); };

  const handleSaveRilevazione = async ({ id, mese, valore }) => {
    await base44.entities.LetturaContatore.update(id, { [mese]: valore });
    setShowRilevazione(false);
    loadContatori();
  };

  // Totale consumo mensile (solo contatori principali)
  const totaleMese = MESI.map((_, i) => {
    let tot = 0, has = false;
    principali.forEach(c => {
      const val = c[MESI[i]];
      const prev = i === 0 ? c.lettura_iniziale : c[MESI[i - 1]];
      if (val != null && prev != null) { tot += val - prev; has = true; }
    });
    return has ? tot : null;
  });
  const totaleAnnuo = totaleMese.some(v => v != null) ? totaleMese.reduce((s, v) => s + (v || 0), 0) : null;

  if (!centroSelezionato?.id) return <div className="p-8 text-center text-slate-500">Seleziona un centro commerciale</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lettura Contatori</h1>
          <p className="text-slate-500 text-sm">{centroSelezionato?.nome}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={() => setAnno(a => a - 1)} className="text-slate-400 hover:text-slate-700"><ChevronLeft className="w-5 h-5" /></button>
            <span className="font-semibold px-2 text-sm text-slate-700">{anno}</span>
            <button onClick={() => setAnno(a => a + 1)} className="text-slate-400 hover:text-slate-700"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowRilevazione(true)} className="gap-2">
              <ClipboardEdit className="w-4 h-4" /> Nuova Rilevazione
            </Button>
            <Button onClick={() => { setEditing(null); setFormPadre(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="w-4 h-4" /> Nuovo Contatore
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {TIPI.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.key ? `${t.activeColor} shadow-sm` : 'text-slate-500 hover:text-slate-700'}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-400">Caricamento...</div>
      ) : principali.length === 0 ? (
        <div className="text-center py-8 text-slate-400">Nessun contatore {tab} per il {anno}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-2 py-2 text-left text-xs font-semibold text-slate-600 min-w-[160px]">Contatore</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-slate-600">Lettura Iniz.</th>
                {MESI_LABEL.map(l => <th key={l} className="px-2 py-2 text-center text-xs font-semibold text-slate-600 min-w-[60px]">{l}</th>)}
                <th className="px-2 py-2 text-center text-xs font-semibold text-slate-600 border-l border-slate-200 min-w-[70px]">Totale</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-slate-600 border-l border-slate-200 min-w-[90px]">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {principali.map(c => (
                <React.Fragment key={c.id}>
                  <ContatoreRow c={c} isSub={false} onEdit={onEdit} onAddSub={onAddSub} onDelete={handleDelete} labelConsumo={tab === 'fotovoltaico' ? 'Produzione' : 'Consumo'} />
                  {getSub(c.id).map(s => <ContatoreRow key={s.id} c={s} isSub={true} onEdit={onEdit} onAddSub={onAddSub} onDelete={handleDelete} labelConsumo={tab === 'fotovoltaico' ? 'Produzione' : 'Consumo'} />)}
                </React.Fragment>
              ))}
              <tr className="bg-slate-800 text-white border-t-2 border-slate-300">
                <td className="px-2 py-2 text-xs font-bold">TOTALE {tab === 'fotovoltaico' ? 'PRODUZIONE' : 'CONSUMO'}</td>
                <td className="px-2 py-2"></td>
                {totaleMese.map((v, i) => <td key={i} className="px-2 py-2 text-center text-xs font-bold">{fmt(v)}</td>)}
                <td className="px-2 py-2 text-center text-xs font-bold border-l border-slate-600">{fmt(totaleAnnuo)}</td>
                <td className="px-2 py-2 border-l border-slate-600"></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <FormContatore
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); setFormPadre(null); }}
        onSave={handleSave}
        contatore={editing}
        tipo={tab}
        anno={anno}
        isSub={!!formPadre}
        padreNome={formPadre?.nome}
      />

      <FormRilevazione
        open={showRilevazione}
        onClose={() => setShowRilevazione(false)}
        onSave={handleSaveRilevazione}
        contatori={contatoriTipo}
      />
    </div>
  );
}