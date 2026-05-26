import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, ShieldCheck, ShieldAlert, Pencil, Trash2 } from 'lucide-react';

const tipologiaConfig = {
  ordinario: { label: 'Ordinario', color: 'bg-slate-100 text-slate-700' },
  urgente: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
};
const statoConfig = {
  aperto: { label: 'Aperto', color: 'bg-blue-100 text-blue-700' },
  in_corso: { label: 'In corso', color: 'bg-yellow-100 text-yellow-700' },
  chiuso: { label: 'Chiuso', color: 'bg-green-100 text-green-700' },
};

const TicketCard = React.memo(({ ticket, oggi, canConfirm, isReadOnly, handleCardClick, handleStatoChange, handleFieldChange, handleConferma, handleEdit, handleDelete, formatData }) => {
  const isScaduto = ticket.scadenza && new Date(ticket.scadenza) < oggi && ticket.stato !== 'chiuso';

  return (
    <div
      onClick={() => handleCardClick(ticket)}
      className={`rounded-xl border p-4 flex gap-4 items-start transition-all duration-200 cursor-pointer
        shadow-[0_4px_20px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.08)]
        hover:shadow-[0_12px_36px_rgba(0,0,0,0.18),0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5
        ${canConfirm && ticket.confermato ? 'bg-green-50 border-green-200' : canConfirm && !ticket.confermato ? 'bg-yellow-50 border-yellow-200' : 'bg-white/80 backdrop-blur-sm border-white'}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-semibold text-slate-800 text-sm">#{ticket.numero_ticket}</span>
          <Badge className={tipologiaConfig[ticket.tipologia]?.color}>{tipologiaConfig[ticket.tipologia]?.label}</Badge>
          {isReadOnly ? (
            <span className={`h-6 text-xs px-2 py-1 rounded-full font-medium ${statoConfig[ticket.stato]?.color}`}>{statoConfig[ticket.stato]?.label}</span>
          ) : (
            <Select value={ticket.stato} onValueChange={v => handleStatoChange(ticket, v)}>
              <SelectTrigger className={`h-6 text-xs px-2 py-0 border-0 rounded-full font-medium w-auto gap-1 ${statoConfig[ticket.stato]?.color}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aperto">Aperto</SelectItem>
                <SelectItem value="chiuso">Chiuso</SelectItem>
              </SelectContent>
            </Select>
          )}
          {!isReadOnly && (
            <Select value={String(ticket.numero_sollecito ?? 0)} onValueChange={v => handleFieldChange(ticket, 'numero_sollecito', Number(v))}>
              <SelectTrigger className={`h-6 text-xs px-2 py-0 rounded-full font-medium w-auto gap-1 ${(ticket.numero_sollecito > 0) ? 'border-0 bg-orange-100 text-orange-700' : 'border border-slate-200 text-slate-400 bg-white'}`}>
                <SelectValue>{ticket.numero_sollecito > 0 ? `Sollecito ${ticket.numero_sollecito}` : '+ Sollecito'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Nessun sollecito</SelectItem>
                {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>Sollecito {n}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {ticket.numero_sollecito > 0 && isReadOnly && (
            <span className="h-6 text-xs px-2 py-1 rounded-full font-medium bg-orange-100 text-orange-700">Sollecito {ticket.numero_sollecito}</span>
          )}
          {isScaduto && <Badge className="bg-red-100 text-red-700 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Scaduto</Badge>}
          {canConfirm && (
            <button
              onClick={(e) => handleConferma(ticket, e)}
              className={`flex items-center gap-1 h-6 text-xs px-2 py-1 rounded-full font-medium transition-colors ${ticket.confermato ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
            >
              {ticket.confermato ? <><ShieldCheck className="w-3 h-3" /> Confermato</> : <><ShieldAlert className="w-3 h-3" /> Da confermare</>}
            </button>
          )}
        </div>
        {ticket.descrizione && <p className="text-sm text-slate-600 mb-2 line-clamp-2">{ticket.descrizione}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 items-center">
          <span>Operatore: <strong className="text-slate-700">{ticket.operatore}</strong></span>
          <span>Apertura: <strong className="text-slate-700">{formatData(ticket.data_apertura)}</strong></span>
          <span className={`flex items-center gap-1 ${isScaduto ? 'text-red-600 font-medium' : ''}`}>
            Scadenza:
            {isReadOnly ? (
              <strong className="text-slate-700 ml-1">{formatData(ticket.scadenza)}</strong>
            ) : (
              <input
                type="date"
                value={ticket.scadenza || ''}
                onChange={e => handleFieldChange(ticket, 'scadenza', e.target.value)}
                className="ml-1 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 bg-white cursor-pointer hover:border-blue-400 focus:outline-none focus:border-blue-500"
              />
            )}
          </span>
        </div>
        {ticket.foto_urls?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {ticket.foto_urls.map((url, i) => (
              <img key={i} src={url} alt="" className="w-10 h-10 rounded-md object-cover border border-slate-200" />
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
        {!isReadOnly && (
          <>
            <button onClick={() => handleEdit(ticket)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(ticket)} className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
});

export default function TicketList({ filtered, oggi, canConfirm, isReadOnly, handleCardClick, handleStatoChange, handleFieldChange, handleConferma, handleEdit, handleDelete, formatData }) {
  const scaduti = filtered.filter(t => t.scadenza && new Date(t.scadenza) < oggi && t.stato !== 'chiuso')
    .sort((a, b) => new Date(a.scadenza) - new Date(b.scadenza));
  const inCorso = filtered.filter(t => !t.scadenza || new Date(t.scadenza) >= oggi || t.stato === 'chiuso')
    .sort((a, b) => {
      if (!a.scadenza && !b.scadenza) return 0;
      if (!a.scadenza) return 1;
      if (!b.scadenza) return -1;
      return new Date(a.scadenza) - new Date(b.scadenza);
    });

  const cardProps = { oggi, canConfirm, isReadOnly, handleCardClick, handleStatoChange, handleFieldChange, handleConferma, handleEdit, handleDelete, formatData };

  return (
    <div className="space-y-6">
      {scaduti.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-red-600 mb-2">⚠️ Scaduti ({scaduti.length})</h3>
          <div className="space-y-2">{scaduti.map(t => <TicketCard key={t.id} ticket={t} {...cardProps} />)}</div>
        </div>
      )}
      {inCorso.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">🔧 In corso ({inCorso.length})</h3>
          <div className="space-y-2">{inCorso.map(t => <TicketCard key={t.id} ticket={t} {...cardProps} />)}</div>
        </div>
      )}
    </div>
  );
}