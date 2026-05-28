import React from 'react';
import SafeImage from '@/components/ui/SafeImage';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Pencil, Trash2, CheckCircle2, XCircle, FileText, Wrench, Eye } from 'lucide-react';

export const STATI_CONFIG = {
  in_attesa_approvazione: { label: 'In attesa approvazione', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  approvato:              { label: 'Approvato',              color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
  approvato_con_preventivo: { label: 'Approvato con preventivo', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  preventivo_inserito:    { label: 'Preventivo inserito',    color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  da_controllare:         { label: 'Da controllare',         color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  chiuso:                 { label: 'Chiuso',                 color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  rifiutato:              { label: 'Rifiutato',              color: 'bg-red-100 text-red-700',      dot: 'bg-red-500' },
};

export const TIPOLOGIA_CONFIG = {
  ordinario: { label: 'Ordinario', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
  urgente:   { label: 'Urgente',   color: 'bg-red-50 text-red-700 border border-red-300' },
};

const formatData = (d) => {
  if (!d) return '-';
  try {
    const [y, m, g] = d.split('-');
    return `${g}/${m}/${y}`;
  } catch { return d; }
};

function TicketCard({ ticket, oggi, userRole, onCardClick, onEdit, onDelete, onAzione }) {
  const isScaduto = ticket.scadenza && new Date(ticket.scadenza) < oggi && ticket.stato !== 'chiuso';
  const stConf = STATI_CONFIG[ticket.stato] || STATI_CONFIG.in_attesa_approvazione;
  const tipConf = TIPOLOGIA_CONFIG[ticket.tipologia] || TIPOLOGIA_CONFIG.ordinario;

  const cardBg = ticket.tipologia === 'urgente'
    ? 'bg-red-50 border-red-200'
    : ticket.stato === 'chiuso'
    ? 'bg-green-50 border-green-200'
    : ticket.stato === 'da_controllare'
    ? 'bg-orange-50 border-orange-200'
    : ticket.stato === 'rifiutato'
    ? 'bg-red-50 border-red-200'
    : 'bg-white border-slate-200';

  // Azioni contestuali per ruolo
  const azioni = [];
  if (userRole === 'direttore' || userRole === 'proprieta') {
    if (ticket.stato === 'in_attesa_approvazione') {
      azioni.push({ key: 'approva', label: 'Approva', icon: CheckCircle2, className: 'bg-blue-600 hover:bg-blue-700 text-white' });
      azioni.push({ key: 'approva_preventivo', label: 'Richiedi preventivo', icon: FileText, className: 'bg-purple-600 hover:bg-purple-700 text-white' });
      azioni.push({ key: 'rifiuta', label: 'Rifiuta', icon: XCircle, className: 'bg-red-600 hover:bg-red-700 text-white' });
    }
    if (ticket.stato === 'preventivo_inserito') {
      azioni.push({ key: 'conferma_preventivo', label: 'Conferma preventivo', icon: CheckCircle2, className: 'bg-green-600 hover:bg-green-700 text-white' });
      azioni.push({ key: 'rifiuta_preventivo', label: 'Rifiuta preventivo', icon: XCircle, className: 'bg-red-600 hover:bg-red-700 text-white' });
    }
    if (ticket.stato === 'da_controllare') {
      azioni.push({ key: 'chiudi', label: 'Chiudi ticket', icon: CheckCircle2, className: 'bg-green-600 hover:bg-green-700 text-white' });
    }
  }
  if (userRole === 'vigilanza') {
    if (ticket.stato === 'da_controllare') {
      azioni.push({ key: 'chiudi', label: 'Chiudi ticket', icon: CheckCircle2, className: 'bg-green-600 hover:bg-green-700 text-white' });
    }
  }
  if (userRole === 'manutentore') {
    if (ticket.stato === 'approvato' || ticket.stato === 'approvato_con_preventivo' || ticket.stato === 'preventivo_inserito') {
      azioni.push({ key: 'da_controllare', label: 'Lavoro completato', icon: Wrench, className: 'bg-orange-600 hover:bg-orange-700 text-white' });
    }
  }

  return (
    <div
      onClick={() => onCardClick(ticket)}
      className={`rounded-xl border p-4 flex gap-4 items-start transition-all duration-200 cursor-pointer
        shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.14)] hover:-translate-y-0.5
        ${cardBg}`}
    >
      {/* Dot tipologia */}
      <div className={`w-1.5 self-stretch rounded-full flex-shrink-0 ${ticket.tipologia === 'urgente' ? 'bg-red-500' : 'bg-blue-400'}`} />

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span className="font-bold text-slate-800 text-sm">#{ticket.numero_ticket}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tipConf.color}`}>{tipConf.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stConf.color}`}>{stConf.label}</span>
          {isScaduto && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Scaduto</span>}
          {ticket.numero_sollecito > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">Sollecito {ticket.numero_sollecito}</span>
          )}
        </div>

        {ticket.descrizione && <p className="text-sm text-slate-600 mb-2 line-clamp-2">{ticket.descrizione}</p>}

        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
          <span>Operatore: <strong className="text-slate-700">{ticket.operatore}</strong></span>
          <span>Apertura: <strong className="text-slate-700">{formatData(ticket.data_apertura)}</strong></span>
          {ticket.scadenza && (
            <span className={isScaduto ? 'text-red-600 font-medium' : ''}>
              Scadenza: <strong className={isScaduto ? 'text-red-700' : 'text-slate-700'}>{formatData(ticket.scadenza)}</strong>
            </span>
          )}
          {ticket.costo_stimato && (
            <span>Preventivo: <strong className="text-slate-700">€ {ticket.costo_stimato.toLocaleString('it-IT')}</strong></span>
          )}
        </div>

        {ticket.note_manutentore && (
          <p className="text-xs text-slate-500 mt-1 italic line-clamp-1">Note: {ticket.note_manutentore}</p>
        )}

        {/* Azioni contestuali */}
        {azioni.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3" onClick={e => e.stopPropagation()}>
            {azioni.map(a => (
              <button
                key={a.key}
                onClick={() => onAzione(ticket, a.key)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${a.className}`}
              >
                <a.icon className="w-3.5 h-3.5" />
                {a.label}
              </button>
            ))}
          </div>
        )}

        {(ticket.foto_urls?.length > 0 || ticket.allegati_manutentore?.length > 0) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {[...(ticket.foto_urls || []), ...(ticket.allegati_manutentore || [])].slice(0, 4).map((url, i) => (
              <SafeImage key={i} src={url} alt="" className="w-10 h-10 rounded-md object-cover border border-slate-200" />
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
        {(userRole === 'direttore' || userRole === 'proprieta' || userRole === 'vigilanza') && (
          <>
            <button onClick={() => onEdit(ticket)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
            {(userRole === 'direttore' || userRole === 'proprieta') && (
              <button onClick={() => onDelete(ticket)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </>
        )}
        {userRole === 'manutentore' && (
          <button onClick={() => onCardClick(ticket)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
            <Eye className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function TicketList({ filtered, oggi, userRole, onCardClick, onEdit, onDelete, onAzione }) {
  const scaduti = filtered.filter(t => t.scadenza && new Date(t.scadenza) < oggi && t.stato !== 'chiuso' && t.stato !== 'rifiutato');
  const attivi = filtered.filter(t => !scaduti.includes(t));

  const cardProps = { oggi, userRole, onCardClick, onEdit, onDelete, onAzione };

  return (
    <div className="space-y-5">
      {scaduti.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" /> Scaduti ({scaduti.length})
          </h3>
          <div className="space-y-2">{scaduti.map(t => <TicketCard key={t.id} ticket={t} {...cardProps} />)}</div>
        </div>
      )}
      {attivi.length > 0 && (
        <div className="space-y-2">{attivi.map(t => <TicketCard key={t.id} ticket={t} {...cardProps} />)}</div>
      )}
    </div>
  );
}