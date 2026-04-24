import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const priorityConfig = {
  bassa: { label: 'Bassa', color: 'bg-sky-100 text-sky-700' },
  media: { label: 'Media', color: 'bg-amber-100 text-amber-700' },
  alta: { label: 'Alta', color: 'bg-red-100 text-red-700' },
  urgente: { label: 'Urgente', color: 'bg-red-200 text-red-800 font-bold' }
};

const statoConfig = {
  da_fare: 'bg-slate-100 text-slate-700',
  in_corso: 'bg-blue-100 text-blue-700',
  completato: 'bg-green-100 text-green-700',
  annullato: 'bg-gray-100 text-gray-500',
  aperto: 'bg-orange-100 text-orange-700',
  chiuso: 'bg-green-100 text-green-700',
  da_pianificare: 'bg-orange-100 text-orange-700',
  pianificato: 'bg-blue-100 text-blue-700',
  da_programmare: 'bg-orange-100 text-orange-700',
  programmato: 'bg-blue-100 text-blue-700',
};

const fmt = (d) => d ? format(new Date(d), 'dd MMMM yyyy', { locale: it }) : '—';

const Row = ({ label, value }) => value ? (
  <div className="flex flex-col sm:flex-row sm:gap-3 py-2 border-b border-slate-100 last:border-0">
    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide sm:w-36 shrink-0">{label}</span>
    <span className="text-sm text-slate-800 mt-0.5 sm:mt-0">{value}</span>
  </div>
) : null;

function TaskDetail({ item }) {
  return (
    <>
      <Row label="Titolo" value={item.titolo} />
      <Row label="Descrizione" value={item.descrizione} />
      <Row label="Stato" value={<span className={`px-2 py-0.5 rounded text-xs font-medium ${statoConfig[item.stato]}`}>{item.stato?.replace(/_/g,' ')}</span>} />
      <Row label="Priorità" value={<span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConfig[item.priorita]?.color}`}>{priorityConfig[item.priorita]?.label}</span>} />
      <Row label="Scadenza" value={fmt(item.data_scadenza)} />
      <Row label="Assegnato a" value={item.assegnato_a_nome || item.assegnato_a_email} />
      <Row label="Assegnato da" value={item.assegnato_da_nome || item.assegnato_da_email} />
      <Row label="Note" value={item.note} />
      {item.foto_urls?.length > 0 && (
        <div className="pt-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Foto</p>
          <div className="flex gap-2 flex-wrap">
            {item.foto_urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ManutenzioneDetail({ item }) {
  return (
    <>
      <Row label="Titolo" value={item.titolo} />
      <Row label="Descrizione" value={item.descrizione} />
      <Row label="Stato" value={<span className={`px-2 py-0.5 rounded text-xs font-medium ${statoConfig[item.stato]}`}>{item.stato?.replace(/_/g,' ')}</span>} />
      <Row label="Scadenza" value={fmt(item.data_scadenza)} />
      <Row label="Assegnato a" value={item.assegnato_a_nome || item.assegnato_a_email} />
      <Row label="Assegnato da" value={item.assegnato_da_nome || item.assegnato_da_email} />
      <Row label="Note" value={item.note} />
    </>
  );
}

function TicketDetail({ item }) {
  return (
    <>
      <Row label="Numero" value={`#${item.numero_ticket}`} />
      <Row label="Operatore" value={item.operatore} />
      <Row label="Tipologia" value={<span className={`px-2 py-0.5 rounded text-xs font-medium ${item.tipologia === 'urgente' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{item.tipologia}</span>} />
      <Row label="Stato" value={<span className={`px-2 py-0.5 rounded text-xs font-medium ${statoConfig[item.stato]}`}>{item.stato}</span>} />
      <Row label="Apertura" value={fmt(item.data_apertura)} />
      <Row label="Scadenza" value={fmt(item.scadenza)} />
      <Row label="Solleciti" value={item.numero_sollecito != null ? String(item.numero_sollecito) : null} />
      <Row label="Descrizione" value={item.descrizione} />
      {item.foto_urls?.length > 0 && (
        <div className="pt-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Foto</p>
          <div className="flex gap-2 flex-wrap">
            {item.foto_urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function CapexDetail({ item }) {
  const fmtEur = (n) => n != null ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n) : null;
  return (
    <>
      <Row label="Titolo" value={item.titolo} />
      <Row label="Descrizione" value={item.descrizione} />
      <Row label="Stato" value={<span className={`px-2 py-0.5 rounded text-xs font-medium ${statoConfig[item.stato]}`}>{item.stato?.replace(/_/g,' ')}</span>} />
      <Row label="Categoria" value={item.categoria} />
      <Row label="Fornitore" value={item.fornitore} />
      <Row label="Data inizio" value={fmt(item.data_inizio)} />
      <Row label="Data fine" value={fmt(item.data_fine)} />
      <Row label="Costo previsto" value={fmtEur(item.costo_previsto)} />
      <Row label="Costo effettivo" value={fmtEur(item.costo_effettivo)} />
      <Row label="Note" value={item.note} />
      {item.allegati_urls?.length > 0 && (
        <div className="pt-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Allegati</p>
          <div className="flex gap-2 flex-wrap">
            {item.allegati_urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">Allegato {i+1}</a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function PuliziaPeriodicaDetail({ item }) {
  return (
    <>
      <Row label="Titolo" value={item.titolo} />
      <Row label="Descrizione" value={item.descrizione} />
      <Row label="Frequenza" value={item.frequenza} />
      <Row label="Stato" value={<span className={`px-2 py-0.5 rounded text-xs font-medium ${statoConfig[item.stato]}`}>{item.stato?.replace(/_/g,' ')}</span>} />
      <Row label="Fornitore" value={item.fornitore} />
      <Row label="Ultima esecuzione" value={fmt(item.ultima_esecuzione)} />
      <Row label="Prossima scadenza" value={fmt(item.prossima_scadenza)} />
      <Row label="Note" value={item.note} />
      {item.foto_urls?.length > 0 && (
        <div className="pt-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Foto</p>
          <div className="flex gap-2 flex-wrap">
            {item.foto_urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ReportDetail({ item }) {
  return (
    <>
      <Row label="Operatore" value={item.operatore} />
      <Row label="Data" value={fmt(item.data)} />
      <Row label="Contenuto" value={item.contenuto} />
      {item.foto_urls?.length > 0 && (
        <div className="pt-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Foto</p>
          <div className="flex gap-2 flex-wrap">
            {item.foto_urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function PrenotazioneDetail({ item }) {
  const fmtEur = (n) => n != null ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n) : null;
  return (
    <>
      <Row label="Cliente" value={item.cliente?.ragione_sociale} />
      <Row label="Spazio" value={item.spazio?.numero_spazio} />
      <Row label="Stato" value={<span className={`px-2 py-0.5 rounded text-xs font-medium ${statoConfig[item.stato]}`}>{item.stato}</span>} />
      <Row label="Data inizio" value={fmt(item.data_inizio)} />
      <Row label="Data fine" value={fmt(item.data_fine)} />
      <Row label="Prezzo totale" value={fmtEur(item.prezzo_totale)} />
      <Row label="Materiale" value={item.materiale_dimostrativo} />
      <Row label="Elettricità" value={item.necessita_elettricita ? 'Sì' : null} />
      <Row label="Note" value={item.note} />
    </>
  );
}

const titleMap = {
  task: 'Dettaglio Task',
  manutenzione: 'Dettaglio Controllo',
  ticket: 'Dettaglio Ticket',
  capex: 'Dettaglio Capex',
  pulizia_periodica: 'Dettaglio Pulizia Periodica',
  report: 'Dettaglio Report',
  prenotazione: 'Dettaglio Affitto',
};

export default function DashboardDetailModal({ open, onClose, type, item }) {
  if (!item) return null;

  const renderContent = () => {
    switch (type) {
      case 'task': return <TaskDetail item={item} />;
      case 'manutenzione': return <ManutenzioneDetail item={item} />;
      case 'ticket': return <TicketDetail item={item} />;
      case 'capex': return <CapexDetail item={item} />;
      case 'pulizia_periodica': return <PuliziaPeriodicaDetail item={item} />;
      case 'report': return <ReportDetail item={item} />;
      case 'prenotazione': return <PrenotazioneDetail item={item} />;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titleMap[type] || 'Dettaglio'}</DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-slate-100">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}