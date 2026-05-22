import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Trash2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import ImageLightbox from '@/components/ui/ImageLightbox';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

const prioritaConfig = {
  bassa: { label: 'Bassa', class: 'bg-slate-100 text-slate-700' },
  media: { label: 'Media', class: 'bg-blue-100 text-blue-700' },
  alta: { label: 'Alta', class: 'bg-orange-100 text-orange-700' },
  urgente: { label: 'Urgente', class: 'bg-red-100 text-red-700' },
};

const statoConfig = {
  da_fare: { label: 'Da fare', class: 'bg-slate-100 text-slate-700', icon: Clock },
  in_corso: { label: 'In corso', class: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  completato: { label: 'Completato', class: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  annullato: { label: 'Annullato', class: 'bg-slate-100 text-slate-400', icon: null },
};

function formatScadenza(data) {
  if (!data) return '';
  const d = parseISO(data);
  if (isToday(d)) return 'Oggi';
  if (isTomorrow(d)) return 'Domani';
  return format(d, 'd MMM yyyy', { locale: it });
}

function DettaglioTask({ task, open, onClose }) {
  const pConf = prioritaConfig[task.priorita] || prioritaConfig.media;
  const sConf = statoConfig[task.stato] || statoConfig.da_fare;
  const [lightbox, setLightbox] = useState(null);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{task.titolo}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full ${pConf.class}`}>{pConf.label}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${sConf.class}`}>{sConf.label}</span>
            {task.ricorrente && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Ricorrente</span>}
          </div>
          {task.descrizione && <p className="text-sm text-slate-600">{task.descrizione}</p>}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {task.data_scadenza && <div><p className="text-xs text-slate-500">Scadenza</p><p className="font-medium">{format(parseISO(task.data_scadenza), 'd MMM yyyy', { locale: it })}</p></div>}
            {task.assegnato_a_nome && <div><p className="text-xs text-slate-500">Assegnato a</p><p className="font-medium">{task.assegnato_a_nome}</p></div>}
            {task.assegnato_da_nome && <div><p className="text-xs text-slate-500">Assegnato da</p><p className="font-medium">{task.assegnato_da_nome}</p></div>}
          </div>
          {task.note && <p className="text-sm text-slate-600"><strong>Note:</strong> {task.note}</p>}
          {task.foto_urls?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Foto ({task.foto_urls.length})</p>
              <div className="flex flex-wrap gap-1">
                {task.foto_urls.map((url, i) => <img key={i} src={url} alt="" className="w-16 h-16 rounded object-cover cursor-pointer hover:opacity-80" onClick={() => setLightbox(i)} />)}
              </div>
            </div>
          )}
          {lightbox !== null && task.foto_urls?.length > 0 && <ImageLightbox urls={task.foto_urls} startIndex={lightbox} onClose={() => setLightbox(null)} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaskRow({ task, onEdit, onDelete, onToggleStato, canEdit, canDelete }) {
  const [showDettaglio, setShowDettaglio] = useState(false);
  const pConf = prioritaConfig[task.priorita] || prioritaConfig.media;
  const sConf = statoConfig[task.stato] || statoConfig.da_fare;
  const isScaduto = task.data_scadenza && isPast(parseISO(task.data_scadenza)) && !isToday(parseISO(task.data_scadenza)) && task.stato !== 'completato' && task.stato !== 'annullato';

  return (
    <>
      <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer
        shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]
        hover:shadow-[0_8px_28px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.06)] hover:-translate-y-0.5
        ${task.stato === 'completato' ? 'bg-green-50/60 border-green-100' : isScaduto ? 'bg-red-50 border-red-200' : 'bg-white/80 backdrop-blur-sm border-slate-200'}`} onClick={() => setShowDettaglio(true)}>
        <button onClick={e => { e.stopPropagation(); onToggleStato(task); }} className="mt-0.5 flex-shrink-0">
          {task.stato === 'completato' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Clock className="w-5 h-5 text-slate-300" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm ${task.stato === 'completato' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.titolo}</p>
          {task.descrizione && <p className="text-xs text-slate-500 truncate mt-0.5">{task.descrizione}</p>}
          {task.foto_urls?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {task.foto_urls.map((url, i) => <img key={i} src={url} alt="" className="w-10 h-10 rounded object-cover" />)}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-1 text-xs">
            {task.data_scadenza && <span className={isScaduto ? 'text-red-600 font-semibold' : 'text-slate-500'}>{formatScadenza(task.data_scadenza)}</span>}
            {task.assegnato_a_nome && <span className="text-slate-400">→ {task.assegnato_a_nome}</span>}
            <span className={`px-1.5 py-0.5 rounded ${pConf.class}`}>{pConf.label}</span>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={() => onEdit(task)} className="p-1.5 rounded-lg hover:bg-slate-100"><Pencil className="w-3.5 h-3.5 text-slate-400" /></button>
            {canDelete && <button onClick={() => onDelete(task.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>}
          </div>
        )}
      </div>
      {showDettaglio && <DettaglioTask task={task} open={showDettaglio} onClose={() => setShowDettaglio(false)} />}
    </>
  );
}

export default function ListaTask({ tasks, onEdit, onDelete, onToggleStato, canEdit, canDelete, vistaApertiChiusi }) {
  const daFare = tasks.filter(t => t.stato !== 'completato' && t.stato !== 'annullato');
  const completati = tasks.filter(t => t.stato === 'completato' || t.stato === 'annullato').sort((a, b) => new Date(b.data_scadenza) - new Date(a.data_scadenza));

  const gruppi = {};
  const senzaData = [];
  daFare.forEach(t => {
    if (!t.data_scadenza) { senzaData.push(t); }
    else { if (!gruppi[t.data_scadenza]) gruppi[t.data_scadenza] = []; gruppi[t.data_scadenza].push(t); }
  });
  const dateOrdinate = Object.keys(gruppi).sort();

  const getLabelData = (dateStr) => {
    const d = parseISO(dateStr);
    if (isPast(d) && !isToday(d)) return { label: `⚠ ${format(d, 'd MMM yyyy', { locale: it })}`, color: 'text-red-600' };
    if (isToday(d)) return { label: `📅 Oggi — ${format(d, 'd MMM yyyy', { locale: it })}`, color: 'text-orange-600' };
    if (isTomorrow(d)) return { label: `📋 Domani — ${format(d, 'd MMM yyyy', { locale: it })}`, color: 'text-blue-600' };
    return { label: `📋 ${format(d, 'd MMM yyyy', { locale: it })}`, color: 'text-slate-700' };
  };

  if (tasks.length === 0) return <div className="text-center py-8 text-slate-400">Nessun task trovato</div>;

  return (
    <div className="space-y-6">
      {vistaApertiChiusi !== 'chiusi' && (
        <div>
          <h2 className="font-semibold text-slate-600 mb-3 text-sm">📋 Aperti</h2>
          {daFare.length > 0 ? (
            <div className="space-y-6">
              {dateOrdinate.map(dateStr => {
                const { label, color } = getLabelData(dateStr);
                return (
                  <div key={dateStr}>
                    <p className={`text-xs font-semibold mb-2 ${color}`}>{label} <span className="text-slate-400 ml-1">({gruppi[dateStr].length})</span></p>
                    <div className="space-y-2">{gruppi[dateStr].map(t => <TaskRow key={t.id} task={t} onEdit={onEdit} onDelete={onDelete} onToggleStato={onToggleStato} canEdit={canEdit(t)} canDelete={canDelete(t)} />)}</div>
                  </div>
                );
              })}
              {senzaData.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2 text-slate-500">📋 Senza scadenza <span className="text-slate-400 ml-1">({senzaData.length})</span></p>
                  <div className="space-y-2">{senzaData.map(t => <TaskRow key={t.id} task={t} onEdit={onEdit} onDelete={onDelete} onToggleStato={onToggleStato} canEdit={canEdit(t)} canDelete={canDelete(t)} />)}</div>
                </div>
              )}
            </div>
          ) : <p className="text-sm text-slate-400">Nessun task aperto</p>}
        </div>
      )}
      {completati.length > 0 && (
        <div>
          <h2 className="font-semibold text-slate-600 mb-3 text-sm">✓ Completati</h2>
          <div className="space-y-2">{completati.map(t => <TaskRow key={t.id} task={t} onEdit={onEdit} onDelete={onDelete} onToggleStato={onToggleStato} canEdit={canEdit(t)} canDelete={canDelete(t)} />)}</div>
        </div>
      )}
    </div>
  );
}