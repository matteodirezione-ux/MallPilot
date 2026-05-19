import React from 'react';
import { format, addDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar, ListTodo, ClipboardList, HardHat, Sparkles } from 'lucide-react';

// Helpers
const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const sameDay = (d1, d2) => d1.getTime() === d2.getTime();
const fmtDate = (d) => format(new Date(d), 'dd MMM', { locale: it });

function AgendaSection({ icon: Icon, color, label, items, emptyMsg }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-2">
      <div className={`flex items-center gap-1 mb-1`}>
        <Icon className={`w-3 h-3 ${color}`} />
        <span className={`text-xs font-semibold uppercase tracking-wide ${color}`}>{label}</span>
      </div>
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div key={item.id || idx} className="text-xs text-slate-700 bg-white/70 rounded px-2 py-1 border border-slate-100 truncate">
            {item.label}
            {item.sub && <span className="text-slate-400 ml-1">{item.sub}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function buildAgendaData({ stats, fromDate, toDate }) {
  const from = startOfDay(fromDate);
  const to = endOfDay(toDate);

  const inRange = (d) => {
    const dt = startOfDay(new Date(d));
    return dt >= from && dt <= to;
  };

  // Tasks: scadenza in range, non completati/annullati
  const tasks = (stats.tasksList || []).filter(t =>
    t.stato !== 'completato' && t.stato !== 'annullato' &&
    t.data_scadenza && inRange(t.data_scadenza)
  ).map(t => ({ id: t.id, label: t.titolo, sub: `· ${fmtDate(t.data_scadenza)}` }));

  // Controlli: scadenza in range, non completati/annullati
  const controlli = (stats.controlliList || []).filter(c =>
    c.stato !== 'completato' && c.stato !== 'annullato' &&
    c.data_scadenza && inRange(c.data_scadenza)
  ).map(c => ({ id: c.id, label: c.titolo, sub: `· ${fmtDate(c.data_scadenza)}` }));

  // Affitti: data_inizio in range, non evento, non cancellato
  const affitti = (stats.prossimiAffitti || []).concat(stats.affittiCorrenti || []).filter((p, i, arr) =>
    arr.findIndex(x => x.id === p.id) === i &&
    !p.is_event && p.stato !== 'cancellata' &&
    p.data_inizio && inRange(p.data_inizio)
  ).map(p => ({
    id: p.id,
    label: p.cliente?.ragione_sociale || p.cliente_id || 'N.D.',
    sub: `· spazio ${p.spazio?.numero_spazio || '-'}`
  }));

  // Capex: data_inizio in range
  const capex = (stats.capexList || []).filter(c =>
    c.data_inizio && inRange(c.data_inizio)
  ).map(c => ({ id: c.id, label: c.titolo }));

  // Pulizie periodiche: prossima_scadenza in range
  const pulizie = (stats.puliziePeriodiche || []).filter(p =>
    p.prossima_scadenza && inRange(p.prossima_scadenza)
  ).map(p => ({ id: p.id, label: p.titolo, sub: `· ${p.frequenza}` }));

  return { tasks, controlli, affitti, capex, pulizie };
}

function AgendaCard({ title, bgColor, borderColor, headerColor, dateLabel, stats, fromDate, toDate }) {
  const { tasks, controlli, affitti, capex, pulizie } = buildAgendaData({ stats, fromDate, toDate });
  const isEmpty = tasks.length + controlli.length + affitti.length + capex.length + pulizie.length === 0;

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} p-3 sm:p-4 shadow-md`}>
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-0.5">
          <Calendar className={`w-4 h-4 ${headerColor}`} />
          <h3 className={`font-bold text-sm ${headerColor}`}>{title}</h3>
        </div>
        <p className="text-xs text-slate-500">{dateLabel}</p>
      </div>

      {isEmpty ? (
        <p className="text-xs text-slate-400 italic">Niente in programma</p>
      ) : (
        <div>
          <AgendaSection icon={ListTodo} color="text-blue-600" label="Task" items={tasks} />
          <AgendaSection icon={ClipboardList} color="text-indigo-600" label="Controlli" items={controlli} />
          <AgendaSection icon={Calendar} color="text-green-600" label="Affitti (inizio)" items={affitti} />
          <AgendaSection icon={HardHat} color="text-yellow-600" label="Capex" items={capex} />
          <AgendaSection icon={Sparkles} color="text-purple-600" label="Pulizie" items={pulizie} />
        </div>
      )}
    </div>
  );
}

export default function AgendaCards({ stats }) {
  const oggi = today();
  const domani = addDays(oggi, 1);
  const fra3 = addDays(oggi, 3);
  const fra7 = addDays(oggi, 7);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
      <AgendaCard
        title="Oggi"
        bgColor="bg-amber-50"
        borderColor="border-amber-200"
        headerColor="text-amber-700"
        dateLabel={format(oggi, "EEEE d MMMM", { locale: it })}
        stats={stats}
        fromDate={oggi}
        toDate={oggi}
      />
      <AgendaCard
        title="Domani"
        bgColor="bg-sky-50"
        borderColor="border-sky-200"
        headerColor="text-sky-700"
        dateLabel={format(domani, "EEEE d MMMM", { locale: it })}
        stats={stats}
        fromDate={domani}
        toDate={domani}
      />
      <AgendaCard
        title="Prossimi 7 giorni"
        bgColor="bg-violet-50"
        borderColor="border-violet-200"
        headerColor="text-violet-700"
        dateLabel={`${format(fra3, "d MMM", { locale: it })} – ${format(fra7, "d MMM", { locale: it })}`}
        stats={stats}
        fromDate={fra3}
        toDate={fra7}
      />
    </div>
  );
}