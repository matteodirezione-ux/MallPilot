import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight, Droplet, Flame, Sun, ClipboardEdit, Zap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FormContatore from '@/components/contatori/FormContatore';
import ContatoreRow from '@/components/contatori/ContatoreRow';
import FormRilevazione from '@/components/contatori/FormRilevazione';
import FormRilevazioneGiornaliera from '@/components/contatori/FormRilevazioneGiornaliera';
import GraficoContatori from '@/components/contatori/GraficoContatori';
import AcquaGiornaliera from '@/components/contatori/AcquaGiornaliera';
import FormValoreMese from '@/components/contatori/FormValoreMese';

const daysInMonth = (y, m) => new Date(y, m, 0).getDate();

const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const MESI_LABEL = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

const TIPI = [
  { key: 'acqua_giornaliera', label: 'Acqua Giorn.', icon: Droplet, activeColor: 'bg-cyan-600 text-white', chartColor: '#0891b2' },
  { key: 'acqua', label: 'Acqua', icon: Droplet, activeColor: 'bg-blue-600 text-white', chartColor: '#3b82f6' },
  { key: 'energia', label: 'Energia', icon: Zap, activeColor: 'bg-purple-600 text-white', chartColor: '#9333ea' },
  { key: 'gas', label: 'Gas', icon: Flame, activeColor: 'bg-orange-600 text-white', chartColor: '#ea580c' },
  { key: 'fotovoltaico', label: 'Fotovoltaico', icon: Sun, activeColor: 'bg-yellow-500 text-white', chartColor: '#eab308' },
];

const fmt = (v) => v == null ? '—' : v.toLocaleString('it-IT');
const fmtVal = (v, m) => v == null ? '—' : m === 'costi' ? '€ ' + v.toLocaleString('it-IT', { maximumFractionDigits: 2 }) : v.toLocaleString('it-IT');

export default function LetturaContatori({ centroSelezionato, user }) {
  const [tab, setTab] = useState(user?.tipo_account === 'vigilanza' ? 'acqua_giornaliera' : 'acqua');
  const [anno, setAnno] = useState(new Date().getFullYear());
  const [mode, setMode] = useState('consumi');
  const [contatori, setContatori] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showRilevazione, setShowRilevazione] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formPadre, setFormPadre] = useState(null);
  const [dailyMese, setDailyMese] = useState(new Date().getMonth() + 1);
  const [dailyContatori, setDailyContatori] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [showRilevazioneGiornaliera, setShowRilevazioneGiornaliera] = useState(false);

  useEffect(() => {
    if (centroSelezionato?.id && tab !== 'acqua_giornaliera') loadContatori();
  }, [centroSelezionato?.id, anno, tab]);

  useEffect(() => {
    if (centroSelezionato?.id && tab === 'acqua_giornaliera') loadDaily();
  }, [centroSelezionato?.id, anno, tab, dailyMese]);

  const ensureDaily = async (centroId, anno, mese) => {
    const every = await base44.entities.LetturaContatoreGiornaliero.filter({ centro_id: centroId });
    const byNome = {};
    every.forEach(c => {
      const cur = byNome[c.nome];
      if (!cur || (c.anno * 12 + c.mese) > (cur.anno * 12 + cur.mese)) byNome[c.nome] = c;
    });
    const currentNomi = new Set(every.filter(c => c.anno === anno && c.mese === mese).map(c => c.nome));
    const missing = Object.values(byNome).filter(t => !currentNomi.has(t.nome));
    if (missing.length === 0) return;
    for (const t of missing) {
      await base44.entities.LetturaContatoreGiornaliero.create({
        centro_id: centroId, tipo: 'acqua', nome: t.nome, anno, mese,
        costo_unitario: t.costo_unitario ?? null,
      });
    }
  };

  const loadDaily = async () => {
    if (!centroSelezionato?.id) return;
    setDailyLoading(true);
    const isAll = centroSelezionato.id === 'tutti';
    if (!isAll) await ensureDaily(centroSelezionato.id, anno, dailyMese);
    const data = isAll
      ? await base44.entities.LetturaContatoreGiornaliero.filter({ anno, mese: dailyMese })
      : await base44.entities.LetturaContatoreGiornaliero.filter({ centro_id: centroSelezionato.id, anno, mese: dailyMese });
    setDailyContatori(data);
    setDailyLoading(false);
  };

  const ensureAnno = async (centroId, anno) => {
    const every = await base44.entities.LetturaContatore.filter({ centro_id: centroId });
    const parentOf = (c) => every.find(x => x.id === c.contatore_padre_id);
    const key = (c) => c.tipo + '|' + c.nome + '|' + (parentOf(c)?.nome || '');
    const byKey = {};
    every.forEach(c => { const k = key(c); if (!byKey[k] || c.anno > byKey[k].anno) byKey[k] = c; });
    const currentKeys = new Set(every.filter(c => c.anno === anno).map(key));
    const missing = Object.values(byKey).filter(t => !currentKeys.has(key(t)));
    if (missing.length === 0) return;
    for (const t of missing.filter(m => !m.contatore_padre_id)) {
      const direct = t.tipo === 'energia';
      await base44.entities.LetturaContatore.create({
        centro_id: centroId, tipo: t.tipo, nome: t.nome, anno,
        contatore_padre_id: null,
        costo_unitario: t.costo_unitario ?? null,
        lettura_iniziale: direct ? null : (t.dic ?? t.lettura_iniziale ?? null),
      });
    }
    const refreshed = await base44.entities.LetturaContatore.filter({ centro_id: centroId, anno });
    for (const t of missing.filter(m => m.contatore_padre_id)) {
      const pOld = parentOf(t);
      const newParent = refreshed.find(x => x.nome === pOld.nome && x.tipo === pOld.tipo && !x.contatore_padre_id);
      if (!newParent) continue;
      const direct = t.tipo === 'energia';
      await base44.entities.LetturaContatore.create({
        centro_id: centroId, tipo: t.tipo, nome: t.nome, anno,
        contatore_padre_id: newParent.id,
        costo_unitario: t.costo_unitario ?? null,
        lettura_iniziale: direct ? null : (t.dic ?? t.lettura_iniziale ?? null),
      });
    }
  };

  const loadContatori = async () => {
    setLoading(true);
    const isAll = centroSelezionato.id === 'tutti';
    if (!isAll) await ensureAnno(centroSelezionato.id, anno);
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
    const field = mode === 'costi' ? 'costo_' + mese : mese;
    await base44.entities.LetturaContatore.update(id, { [field]: valore });
    setShowRilevazione(false);
    loadContatori();
  };

  const handleSaveRilevazioneGiornaliera = async ({ id, giorno, valore }) => {
    await base44.entities.LetturaContatoreGiornaliero.update(id, { [`d${giorno}`]: valore });
    setShowRilevazioneGiornaliera(false);
    loadDaily();
  };

  const [quick, setQuick] = useState(null);
  const handleQuickSave = async (valore) => {
    if (!quick) return;
    await base44.entities.LetturaContatore.update(quick.contatore.id, { [quick.field]: valore });
    setQuick(null);
    loadContatori();
  };

  // Per energia i valori sono consumi diretti, non letture cumulative
  const directConsumo = tab === 'energia';
  // Totale consumo mensile (solo contatori principali)
  const totaleMese = MESI.map((_, i) => {
    let tot = 0, has = false;
    principali.forEach(c => {
      let v = null;
      if (mode === 'costi') {
        v = c['costo_' + MESI[i]];
      } else if (directConsumo) {
        v = c[MESI[i]];
      } else {
        const val = c[MESI[i]];
        const prev = i === 0 ? c.lettura_iniziale : c[MESI[i - 1]];
        if (val != null && prev != null) v = val - prev;
      }
      if (v != null) { tot += v; has = true; }
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
          {user?.tipo_account !== 'vigilanza' && (
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setMode('consumi')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'consumi' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Consumi</button>
              <button onClick={() => setMode('costi')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'costi' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Costi</button>
            </div>
          )}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAnno(a => a - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-bold text-slate-800 min-w-[44px] text-center">{anno}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAnno(a => a + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          {tab !== 'acqua_giornaliera' && (
            <Button onClick={() => setShowRilevazione(true)} className="bg-orange-600 hover:bg-orange-700 gap-2 hidden md:inline-flex">
              <ClipboardEdit className="w-4 h-4" /> Nuova Rilevazione
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Desktop: tab bar orizzontale */}
        <div className="hidden md:flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          {TIPI.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.key ? `${t.activeColor} shadow-sm` : 'text-slate-500 hover:text-slate-700'}`}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Mobile: Rilevazione + tendina sezioni + nuovo contatore */}
        <div className="flex items-center gap-2 w-full md:hidden">
          {tab === 'acqua_giornaliera' ? (
            dailyContatori.length > 0 && (
              <Button onClick={() => setShowRilevazioneGiornaliera(true)} size="sm" className="bg-orange-600 hover:bg-orange-700 gap-1.5 shrink-0">
                <ClipboardEdit className="w-4 h-4" /> Rilevazione
              </Button>
            )
          ) : (
            <Button onClick={() => setShowRilevazione(true)} size="sm" className="bg-orange-600 hover:bg-orange-700 gap-1.5 shrink-0">
              <ClipboardEdit className="w-4 h-4" /> Rilevazione
            </Button>
          )}
          <Select value={tab} onValueChange={setTab}>
            <SelectTrigger className={`flex-1 min-w-0 h-8 border-0 ${TIPI.find(t => t.key === tab)?.activeColor}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPI.map(t => {
                const Icon = t.icon;
                return (
                  <SelectItem key={t.key} value={t.key} className="gap-2">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md ${t.activeColor}`}><Icon className="w-3.5 h-3.5" /></span>
                    <span className="ml-1.5">{t.label}</span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: azione destra */}
        <div className="hidden md:flex items-center gap-2">
          {tab === 'acqua_giornaliera' && dailyContatori.length > 0 && (
            <Button onClick={() => setShowRilevazioneGiornaliera(true)} className="bg-orange-600 hover:bg-orange-700 gap-2">
              <ClipboardEdit className="w-4 h-4" /> Rilevazione
            </Button>
          )}
        </div>
      </div>

      {tab === 'acqua_giornaliera' ? (
        <AcquaGiornaliera
          centroSelezionato={centroSelezionato}
          anno={anno}
          mode={mode}
          mese={dailyMese}
          setMese={setDailyMese}
          contatori={dailyContatori}
          loading={dailyLoading}
          onReload={loadDaily}
        />
      ) : loading ? (
        <div className="text-center py-8 text-slate-400">Caricamento...</div>
      ) : principali.length === 0 ? (
        <div className="text-center py-8 text-slate-400">Nessun contatore {tab} per il {anno}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-2 py-2 text-left text-xs font-semibold text-slate-600 min-w-[160px]">Contatore</th>
                {!directConsumo && mode === 'consumi' && <th className="px-2 py-2 text-center text-xs font-semibold text-slate-600">Lettura Iniz.</th>}
                {MESI_LABEL.map(l => <th key={l} className="px-2 py-2 text-center text-xs font-semibold text-slate-600 min-w-[60px]">{l}</th>)}
                <th className="px-2 py-2 text-center text-xs font-semibold text-slate-600 border-l border-slate-200 min-w-[70px]">Totale</th>
                <th className="px-2 py-2 text-center border-l border-slate-200 min-w-[90px]">
                  <Button onClick={() => { setEditing(null); setFormPadre(null); setShowForm(true); }} size="sm" className="bg-blue-600 hover:bg-blue-700 h-7 px-2 gap-1">
                    <Plus className="w-3.5 h-3.5" /> Nuovo
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {principali.map(c => (
                <React.Fragment key={c.id}>
                  <ContatoreRow c={c} isSub={false} onEdit={onEdit} onAddSub={onAddSub} onDelete={handleDelete} onQuickEdit={(contatore, field, label) => setQuick({ contatore, field, label })} labelConsumo={tab === 'fotovoltaico' ? 'Produzione' : 'Consumo'} directConsumo={directConsumo} mode={mode} />
                  {getSub(c.id).map(s => <ContatoreRow key={s.id} c={s} isSub={true} onEdit={onEdit} onAddSub={onAddSub} onDelete={handleDelete} onQuickEdit={(contatore, field, label) => setQuick({ contatore, field, label })} labelConsumo={tab === 'fotovoltaico' ? 'Produzione' : 'Consumo'} directConsumo={directConsumo} mode={mode} />)}
                </React.Fragment>
              ))}
              <tr className="bg-slate-800 text-white border-t-2 border-slate-300">
                <td className="px-2 py-2 text-xs font-bold">TOTALE {mode === 'costi' ? 'COSTO' : tab === 'fotovoltaico' ? 'PRODUZIONE' : 'CONSUMO'}</td>
                {!directConsumo && mode === 'consumi' && <td className="px-2 py-2"></td>}
                {totaleMese.map((v, i) => <td key={i} className="px-2 py-2 text-center text-xs font-bold">{fmtVal(v, mode)}</td>)}
                <td className="px-2 py-2 text-center text-xs font-bold border-l border-slate-600">{fmtVal(totaleAnnuo, mode)}</td>
                <td className="px-2 py-2 border-l border-slate-600"></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!loading && principali.length > 0 && (
        <GraficoContatori
          totaleMese={totaleMese}
          totaleAnnuo={totaleAnnuo}
          label={tab === 'fotovoltaico' ? 'Produzione' : 'Consumo'}
          accentColor={TIPI.find(t => t.key === tab)?.chartColor}
        />
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
        mode={mode}
      />

      <FormRilevazioneGiornaliera
        open={showRilevazioneGiornaliera}
        onClose={() => setShowRilevazioneGiornaliera(false)}
        onSave={handleSaveRilevazioneGiornaliera}
        contatori={dailyContatori}
        mese={dailyMese}
        anno={anno}
        giorni={daysInMonth(anno, dailyMese)}
      />

      <FormValoreMese
        open={!!quick}
        contatore={quick?.contatore}
        field={quick?.field}
        meseLabel={quick?.label}
        mode={quick?.field?.startsWith('costo_') ? 'costi' : 'consumi'}
        onClose={() => setQuick(null)}
        onSave={handleQuickSave}
      />
    </div>
  );
}