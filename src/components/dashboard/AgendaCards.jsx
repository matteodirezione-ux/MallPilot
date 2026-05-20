import React from 'react';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar, ListTodo, ClipboardList, HardHat, Sparkles, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';

const fmtDate = (d) => format(new Date(d), 'dd MMM', { locale: it });

function buildAgendaData({ stats, fromDate, toDate }) {
  const from = startOfDay(fromDate);
  const to = endOfDay(toDate);
  const inRange = (d) => { const dt = startOfDay(new Date(d)); return dt >= from && dt <= to; };
  // Overlap: l'intervallo [start, end] si sovrappone a [from, to]
  const overlaps = (start, end) => startOfDay(new Date(start)) <= to && endOfDay(new Date(end)) >= from;

  const tasks = (stats.tasksList || []).filter(t =>
    t.stato !== 'completato' && t.stato !== 'annullato' &&
    t.data_scadenza && inRange(t.data_scadenza)
  );

  const controlli = (stats.controlliList || []).filter(c =>
    c.stato !== 'completato' && c.stato !== 'annullato' &&
    c.data_scadenza && inRange(c.data_scadenza)
  );

  const allPrenotazioni = (stats.prossimiAffitti || []).concat(stats.affittiCorrenti || []).concat(stats.gratuitiList || []);
  const seen = new Set();
  // Affitti (normali + gratuiti): mostra solo quelli che INIZIANO nel range (non quelli già in corso da prima)
  const affitti = allPrenotazioni.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return !p.is_event && p.stato !== 'cancellata' && p.data_inizio && inRange(p.data_inizio);
  });

  // Capex in corso o che iniziano nel range
  const capex = (stats.capexList || []).filter(c =>
    c.stato !== 'completato' && c.data_inizio &&
    (c.data_fine ? overlaps(c.data_inizio, c.data_fine) : inRange(c.data_inizio))
  );

  // Pulizie con scadenza nel range
  const pulizie = (stats.puliziePeriodiche || []).filter(p => p.prossima_scadenza && inRange(p.prossima_scadenza));

  // Eventi in corso o che iniziano nel range
  const allEventSources = (stats.eventStats?.eventiCorrentiList || []).concat(stats.eventStats?.prossimiEventi || []);
  const seenEv = new Set();
  const eventi = allEventSources.filter(e => {
    if (seenEv.has(e.id)) return false;
    seenEv.add(e.id);
    return e.stato !== 'cancellata' && e.data_inizio && e.data_fine && overlaps(e.data_inizio, e.data_fine);
  });

  return { tasks, controlli, affitti, capex, pulizie, eventi };
}

function SectionLabel({ icon: Icon, color, label }) {
  return (
    <div className="flex items-center gap-1.5 mb-2 mt-3 first:mt-0">
      <div className={`w-0.5 h-3 rounded-full ${color.replace('text-', 'bg-')}`}></div>
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>{label}</span>
    </div>
  );
}

function AgendaCard({ title, bgHeader, borderColor, headerTextColor, dateLabel, stats, fromDate, toDate, onSelect, onCompleteTask, onCompleteControllo, completingIds, fullHeight }) {
  const { tasks, controlli, affitti, capex, pulizie, eventi } = buildAgendaData({ stats, fromDate, toDate });
  const isEmpty = tasks.length + controlli.length + affitti.length + capex.length + pulizie.length + eventi.length === 0;

  const prioritaColor = { urgente: 'bg-red-100 text-red-700', alta: 'bg-orange-100 text-orange-700', media: 'bg-yellow-100 text-yellow-700', bassa: 'bg-slate-100 text-slate-600' };

  return (
    <Card className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-all flex flex-col overflow-hidden">
      <CardHeader className={`pb-2 sm:pb-3 rounded-t-lg border-b ${bgHeader} ${borderColor}`}>
        <div className="flex items-center gap-2">
          <div className={`w-1 h-8 rounded-full ${bgHeader.replace('bg-', 'bg-').replace('50', '500')}`}></div>
          <div className="flex-1">
            <CardTitle className={`text-sm sm:text-base font-bold ${headerTextColor}`}>{title}</CardTitle>
            <p className={`text-xs font-medium ${headerTextColor} opacity-80`}>{dateLabel}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className={`flex-1 overflow-y-auto pt-3 ${fullHeight ? 'max-h-[calc(100vh-220px)]' : 'max-h-80'}`}>
        {isEmpty ? (
          <p className="text-slate-400 text-center py-4 text-xs sm:text-sm italic">Niente in programma</p>
        ) : (
          <div>
            {/* Tasks */}
            {tasks.length > 0 && (
              <>
                <SectionLabel icon={ListTodo} color="text-blue-600" label="Task" />
                <div className="space-y-1.5">
                  {tasks.map(t => (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
                      onClick={() => onSelect('task', t)}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); onCompleteTask(t.id); }}
                        disabled={completingIds.has(t.id)}
                        className="shrink-0 w-5 h-5 rounded-full border-2 border-slate-300 hover:border-green-500 hover:bg-green-50 transition-colors flex items-center justify-center disabled:opacity-50"
                        title="Segna come completato"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{t.titolo}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {t.priorita && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${prioritaColor[t.priorita] || 'bg-slate-100 text-slate-600'}`}>{t.priorita}</span>}
                          <span className="text-xs text-slate-500 whitespace-nowrap">{fmtDate(t.data_scadenza)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Controlli */}
            {controlli.length > 0 && (
              <>
                <SectionLabel icon={ClipboardList} color="text-indigo-600" label="Controlli" />
                <div className="space-y-1.5">
                  {controlli.map(c => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all"
                      onClick={() => onSelect('manutenzione', c)}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); onCompleteControllo(c.id); }}
                        disabled={completingIds.has(c.id)}
                        className="shrink-0 w-5 h-5 rounded-full border-2 border-slate-300 hover:border-green-500 hover:bg-green-50 transition-colors flex items-center justify-center disabled:opacity-50"
                        title="Segna come completato"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{c.titolo}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{fmtDate(c.data_scadenza)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Affitti */}
            {affitti.length > 0 && (
              <>
                <SectionLabel icon={Calendar} color="text-green-600" label="Affitti (inizio)" />
                <div className="space-y-1.5">
                  {affitti.map(p => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm cursor-pointer hover:shadow-md hover:border-green-300 transition-all ${p.is_gratuito ? 'bg-white' : 'bg-white'}`}
                      onClick={() => onSelect('prenotazione', p)}
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{p.cliente?.ragione_sociale || 'N.D.'}</p>
                          {p.is_gratuito && <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 font-medium">Gratuito</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Spazio {p.spazio?.numero_spazio || '-'}</p>
                      </div>
                      <span className={`text-xs font-semibold whitespace-nowrap shrink-0 ${p.is_gratuito ? 'text-teal-700' : 'text-green-700'}`}>{fmtDate(p.data_inizio)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Capex */}
            {capex.length > 0 && (
              <>
                <SectionLabel icon={HardHat} color="text-yellow-600" label="Capex" />
                <div className="space-y-1.5">
                  {capex.map(c => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm cursor-pointer hover:shadow-md hover:border-yellow-300 transition-all"
                      onClick={() => onSelect('capex', c)}
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="font-medium text-slate-800 truncate">{c.titolo}</p>
                        {c.fornitore && <p className="text-xs text-slate-500 truncate mt-0.5">{c.fornitore}</p>}
                      </div>
                      <span className="text-xs text-yellow-700 font-semibold whitespace-nowrap shrink-0">{fmtDate(c.data_inizio)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pulizie */}
            {pulizie.length > 0 && (
              <>
                <SectionLabel icon={Sparkles} color="text-purple-600" label="Pulizie Programmate" />
                <div className="space-y-1.5">
                  {pulizie.map(p => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm cursor-pointer hover:shadow-md hover:border-purple-300 transition-all"
                      onClick={() => onSelect('pulizia_periodica', p)}
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="font-medium text-slate-800 truncate">{p.titolo}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{p.frequenza}</p>
                      </div>
                      <span className="text-xs text-purple-700 font-semibold whitespace-nowrap shrink-0">{fmtDate(p.prossima_scadenza)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Eventi */}
            {eventi.length > 0 && (
              <>
                <SectionLabel icon={Sparkles} color="text-pink-600" label="Eventi" />
                <div className="space-y-1.5">
                  {eventi.map(e => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm cursor-pointer hover:shadow-md hover:border-pink-300 transition-all"
                      onClick={() => onSelect('prenotazione', e)}
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="font-medium text-slate-800 truncate">{e.nome_evento || 'Evento'}</p>
                        <p className="text-xs text-pink-600 font-medium mt-0.5 whitespace-nowrap">✦ {fmtDate(e.data_inizio)} → {fmtDate(e.data_fine)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AgendaCards({ stats, onSelect, onCompleteTask, onCompleteControllo, completingIds, fullHeight }) {
  const oggi = new Date(); oggi.setHours(0,0,0,0);
  const domani = addDays(oggi, 1);
  const fra3 = addDays(oggi, 3);
  const fra7 = addDays(oggi, 7);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
      <AgendaCard
        title="Oggi"
        bgHeader="bg-amber-50"
        borderColor="border-amber-200"
        headerTextColor="text-amber-700"
        dateLabel={format(oggi, "EEEE d MMMM", { locale: it })}
        stats={stats}
        fromDate={oggi}
        toDate={oggi}
        onSelect={onSelect}
        onCompleteTask={onCompleteTask}
        onCompleteControllo={onCompleteControllo}
        completingIds={completingIds}
        fullHeight={fullHeight}
      />
      <AgendaCard
        title="Domani"
        bgHeader="bg-sky-50"
        borderColor="border-sky-200"
        headerTextColor="text-sky-700"
        dateLabel={format(domani, "EEEE d MMMM", { locale: it })}
        stats={stats}
        fromDate={domani}
        toDate={domani}
        onSelect={onSelect}
        onCompleteTask={onCompleteTask}
        onCompleteControllo={onCompleteControllo}
        completingIds={completingIds}
        fullHeight={fullHeight}
      />
      <AgendaCard
        title="Prossimi 7 giorni"
        bgHeader="bg-violet-50"
        borderColor="border-violet-200"
        headerTextColor="text-violet-700"
        dateLabel={`${format(fra3, "d MMM", { locale: it })} – ${format(fra7, "d MMM", { locale: it })}`}
        stats={stats}
        fromDate={fra3}
        toDate={fra7}
        onSelect={onSelect}
        onCompleteTask={onCompleteTask}
        onCompleteControllo={onCompleteControllo}
        completingIds={completingIds}
        fullHeight={fullHeight}
      />
    </div>
  );
}