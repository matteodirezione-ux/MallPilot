import React from 'react';
import SafeImage from '@/components/ui/SafeImage';
import { AlertCircle, Pencil, Trash2, CheckCircle2, XCircle, FileText, Wrench, Eye, ChevronDown, ClipboardList } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const STATI_CONFIG = {
  in_attesa_approvazione: { label: 'In attesa approvazione', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400', cardBg: 'bg-slate-50 border-transparent', leftBar: 'bg-slate-400' },
  approvato:              { label: 'Approvato',              color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500',  cardBg: 'bg-blue-50 border-transparent',   leftBar: 'bg-blue-500' },
  approvato_con_preventivo: { label: 'Richiesta preventivo', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500', cardBg: 'bg-purple-50 border-transparent', leftBar: 'bg-purple-500' },
  preventivo_inserito:    { label: 'Preventivo inserito',    color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500', cardBg: 'bg-yellow-50 border-transparent', leftBar: 'bg-yellow-500' },
  da_controllare:         { label: 'Da controllare',         color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', cardBg: 'bg-orange-50 border-transparent', leftBar: 'bg-orange-500' },
  chiuso:                 { label: 'Chiuso',                 color: 'bg-green-100 text-green-700',  dot: 'bg-green-500',  cardBg: 'bg-green-50 border-transparent',  leftBar: 'bg-green-500' },
  rifiutato:              { label: 'Rifiutato',              color: 'bg-red-100 text-red-700',      dot: 'bg-red-500',    cardBg: 'bg-red-50 border-transparent',    leftBar: 'bg-red-500' },
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

// Transizioni stato permesse per ruolo: [statoAttuale] -> [stati selezionabili]
function getStatiPermessi(ticket, userRole) {
  const s = ticket.stato;
  if (userRole === 'direttore' || userRole === 'proprieta') {
    if (s === 'in_attesa_approvazione') return ['in_attesa_approvazione', 'approvato', 'approvato_con_preventivo', 'rifiutato'];
    if (s === 'da_controllare') return ['da_controllare', 'chiuso'];
    // Per tutti gli altri stati, il direttore/proprietà può comunque cambiarlo a qualsiasi stato
    return Object.keys(STATI_CONFIG);
  }
  if (userRole === 'vigilanza') {
    if (s === 'da_controllare') return ['da_controllare', 'chiuso'];
    return null;
  }
  if (userRole === 'manutentore') {
    if (s === 'approvato') return ['approvato', 'preventivo_inserito', 'da_controllare'];
    if (s === 'approvato_con_preventivo') return ['approvato_con_preventivo', 'preventivo_inserito', 'da_controllare'];
    if (s === 'preventivo_inserito') return ['preventivo_inserito', 'da_controllare'];
    return null;
  }
  return null;
}

function StatoBadge({ ticket, userRole, onAzione }) {
  const stConf = STATI_CONFIG[ticket.stato] || STATI_CONFIG.in_attesa_approvazione;
  const statiPermessi = getStatiPermessi(ticket, userRole);

  if (!statiPermessi) {
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stConf.color}`}>{stConf.label}</span>;
  }

  const handleChange = (nuovoStato) => {
    if (nuovoStato === ticket.stato) return;
    // Solo rifiutato richiede il dialog per il motivo, tutto il resto è update diretto
    if (nuovoStato === 'rifiutato') {
      onAzione(ticket, 'rifiuta');
    } else {
      onAzione(ticket, 'set_stato:' + nuovoStato);
    }
  };

  return (
    <div onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
      <Select value={ticket.stato} onValueChange={handleChange}>
        <SelectTrigger className={`h-6 text-xs px-2 py-0 border-0 rounded-full font-medium w-auto gap-1 shadow-none focus:ring-0 ${stConf.color}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statiPermessi.map(s => (
            <SelectItem key={s} value={s} className="text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${STATI_CONFIG[s]?.dot}`} />
                {STATI_CONFIG[s]?.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SollecitoControl({ ticket, userRole, onAzione }) {
  const canEdit = userRole === 'direttore' || userRole === 'proprieta' || userRole === 'vigilanza';
  if (!canEdit) {
    if (ticket.numero_sollecito > 0)
      return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">Sollecito {ticket.numero_sollecito}</span>;
    return null;
  }
  return (
    <div onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
      <Select value={String(ticket.numero_sollecito ?? 0)} onValueChange={v => onAzione(ticket, 'sollecito:' + v)}>
        <SelectTrigger className={`h-6 text-xs px-2 py-0 rounded-full font-medium w-auto gap-1 shadow-none focus:ring-0 ${ticket.numero_sollecito > 0 ? 'border-0 bg-orange-100 text-orange-700' : 'border border-slate-200 text-slate-400 bg-white'}`}>
          <SelectValue>{ticket.numero_sollecito > 0 ? `Sollecito ${ticket.numero_sollecito}` : '+ Sollecito'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0" className="text-xs">Nessun sollecito</SelectItem>
          {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)} className="text-xs">Sollecito {n}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function TicketCard({ ticket, oggi, userRole, onCardClick, onEdit, onDelete, onAzione }) {
  const isScaduto = ticket.scadenza && new Date(ticket.scadenza) < oggi && ticket.stato !== 'chiuso';
  const tipConf = TIPOLOGIA_CONFIG[ticket.tipologia] || TIPOLOGIA_CONFIG.ordinario;
  const statoConf = STATI_CONFIG[ticket.stato] || STATI_CONFIG.in_attesa_approvazione;

  return (
    <div
      onClick={() => onCardClick(ticket)}
      className={`rounded-xl border overflow-hidden flex gap-0 items-stretch transition-all duration-200 cursor-pointer
        shadow-[0_4px_20px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.2)] hover:-translate-y-0.5
        ${statoConf.cardBg}`}
    >
      {/* Barra colorata sinistra */}
      <div className={`w-1.5 flex-shrink-0 ${statoConf.leftBar}`} />

      <div className="flex-1 min-w-0 p-4 flex gap-4 items-start">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span className="font-bold text-slate-800 text-sm">#{ticket.numero_ticket}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tipConf.color}`}>{tipConf.label}</span>

          {/* Stato inline con dropdown per chi può cambiarlo */}
          <StatoBadge ticket={ticket} userRole={userRole} onAzione={onAzione} />

          {isScaduto && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Scaduto</span>}

          {/* Sollecito inline */}
          <SollecitoControl ticket={ticket} userRole={userRole} onAzione={onAzione} />
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
          {ticket.costo_stimato && userRole !== 'vigilanza' && (
            <span>Preventivo: <strong className="text-slate-700">€ {ticket.costo_stimato.toLocaleString('it-IT')}</strong></span>
          )}
        </div>

        {ticket.note_manutentore && (
          <p className="text-xs text-slate-500 mt-1 italic line-clamp-1">Note: {ticket.note_manutentore}</p>
        )}

        {(ticket.foto_urls?.length > 0 || ticket.allegati_manutentore?.length > 0) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {[...(ticket.foto_urls || []), ...(ticket.allegati_manutentore || [])].slice(0, 4).map((url, i) => (
              <SafeImage key={i} src={url} alt="" className="w-10 h-10 rounded-md object-cover border border-slate-200" />
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-1 flex-shrink-0 items-start" onClick={e => e.stopPropagation()}>
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
          <div className="flex flex-col gap-1 items-end">
            {ticket.stato === 'approvato_con_preventivo' && (
              <button
                onClick={() => onEdit(ticket)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                Inserisci preventivo
              </button>
            )}
            <button onClick={() => onCardClick(ticket)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
              <Eye className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

const STATI_ORDER = [
  'in_attesa_approvazione',
  'approvato',
  'approvato_con_preventivo',
  'preventivo_inserito',
  'da_controllare',
  'chiuso',
  'rifiutato',
];

const sortByScadenza = (a, b) => {
  // Urgenti prima
  if (a.tipologia === 'urgente' && b.tipologia !== 'urgente') return -1;
  if (a.tipologia !== 'urgente' && b.tipologia === 'urgente') return 1;
  if (!a.scadenza && !b.scadenza) return 0;
  if (!a.scadenza) return 1;
  if (!b.scadenza) return -1;
  return new Date(a.scadenza) - new Date(b.scadenza);
};

export default function TicketList({ filtered, oggi, userRole, onCardClick, onEdit, onDelete, onAzione }) {
  const cardProps = { oggi, userRole, onCardClick, onEdit, onDelete, onAzione };

  // Raggruppa per stato
  const gruppi = STATI_ORDER.map(stato => ({
    stato,
    tickets: filtered.filter(t => t.stato === stato).sort(sortByScadenza),
  })).filter(g => g.tickets.length > 0);

  return (
    <div className="space-y-6">
      {gruppi.map(({ stato, tickets }) => {
        const conf = STATI_CONFIG[stato];
        return (
          <div key={stato}>
            <h3 className={`text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-md inline-flex items-center gap-1.5 mb-2 ${conf.color}`}>
              <span className={`w-2 h-2 rounded-full ${conf.dot}`} />
              {conf.label} ({tickets.length})
            </h3>
            <div className="space-y-2">
              {tickets.map(t => <TicketCard key={t.id} ticket={t} {...cardProps} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}