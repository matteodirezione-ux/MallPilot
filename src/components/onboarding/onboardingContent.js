import {
  LayoutDashboard, ListTodo, Ticket, ClipboardList, Calendar, BookOpen, Cloud,
  ArrowLeftRight, Users, Building2, Megaphone, Truck, Sparkles, Hammer, FileText,
  Store, TrendingUp, Gauge, Zap, Settings, HardDrive
} from 'lucide-react';

// Ruoli: 'proprieta', 'direttore', 'vigilanza', 'manutentore', 'tenant'
// (allineati ai roles definiti nella navigazione di Layout.jsx)
export const sectionInfo = {
  Dashboard: {
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    points: [
      "Tutto ciò che conta, sotto controllo in un unico colpo d'occhio.",
      "Visualizza controlli, task, ticket, prenotazioni, eventi, pulizie periodiche in corso o in scadenza, insieme alle condizioni meteo.",
      "Utilizza le card rapide per creare in pochi secondi prenotazioni, task, controlli e report.",
      "Hai ogni giorno una visione immediata delle attività che richiedono attenzione, con priorità e scadenze sempre a portata di mano."
    ]
  },
  Task: {
    label: 'Task',
    icon: ListTodo,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    points: [
      "Qui crei le attività operative assegnate al personale del centro.",
      "Per ogni task: titolo, descrizione, priorità (bassa→urgente), scadenza e assegnatario.",
      "Crea Task ricorrenti automatici: giornaliere, settimanali, mensili, annuali o personalizzate.",
      "Alcuni task sono generati in automatico dalle prenotazioni."
    ]
  },
  Ticket: {
    label: 'Ticket',
    icon: Ticket,
    roles: ['proprieta', 'direttore', 'vigilanza', 'manutentore'],
    points: [
      "Qui puoi aprire i ticket di intervento per la manutenzione.",
      "Il direttore o la vigilanza aprono il ticket con descrizione, foto, tipologia (ordinario/urgente) e scadenza.",
      "Il direttore approva, sollecita o rifiuta motivando.",
      "Il manutentore riceve la notifica, interviene e inserisce preventivo, allegati e note, quando ha terminato l'intervento cambia lo stato da controllare.",
      "Il direttore o la vigilanza controllano e chiudono il ticket.",
      "Si può scaricare un report Excel con i ticket raggruppati per mese.",
      "Notifiche automatiche a ogni cambio di stato."
    ]
  },
  CalendarioManutenzioni: {
    label: 'Controlli',
    icon: ClipboardList,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    points: [
      "Qui l'obiettivo è avere una situazione chiara e immediata dei controlli periodici.",
      "Si possono inserire controlli spot o ricorrenti.",
      "Calendario delle manutenzioni e dei controlli periodici.",
      "Vista per mese o settimana, con filtri per stato.",
      "Molti controlli sono generati in automatico da prenotazioni e pulizie ricorrenti."
    ]
  },
  Calendario: {
    label: 'Calendario Expo',
    icon: Calendar,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    points: [
      "Prenotazioni degli spazi espositivi del centro.",
      "Tre tipologie: affitto (genera contratto), evento, spazio gratuito.",
      "Si scelgono spazi, cliente, date, materiale e necessità elettrica; prezzo calcolato in automatico.",
      "Verifica disponibilità e generazione contratto con un clic.",
      "Prenotazioni >30 giorni attivano contratto e notifiche di scadenza automatiche."
    ]
  },
  Report: {
    label: 'Report',
    icon: BookOpen,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    points: [
      "Report operativi periodici del centro.",
      "Per ogni report: titolo, descrizione, data, foto e note.",
      "Archivio storico e consultabile nel tempo.",
      "Memoria condivisa tra direttori e vigilanza."
    ]
  },
  Meteo: {
    label: 'Meteo',
    icon: Cloud,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    points: [
      "Analisi meteorologica con dati giornalieri archiviati.",
      "Temperature min/max e codice meteo WMO.",
      "Confronto di un periodo con lo stesso periodo dell'anno precedente.",
      "Esportazione report in PDF.",
      "Utile per interpretare l'andamento dei corrispettivi."
    ]
  },
  Consegne: {
    label: 'Consegne',
    icon: ArrowLeftRight,
    roles: ['vigilanza'],
    points: [
      "Passaggi di consegna tra i turni di vigilanza.",
      "Note del passaggio: situazioni in corso, anomalie, cose da tenere d'occhio.",
      "Organizzate per centro e per data.",
      "Garantisce continuità operativa tra i turni."
    ]
  },
  Clienti: {
    label: 'Clienti',
    icon: Users,
    roles: ['proprieta', 'direttore'],
    points: [
      "Anagrafica dei clienti che prenotano gli spazi.",
      "Dati gestiti: ragione sociale, PIVA, codice fiscale, codice SDI, PEC, sede, referente.",
      "I dati anagrafici alimentano i contratti precompilati.",
      "Note libere e archivio storico dei clienti."
    ]
  },
  SpaziExpo: {
    label: 'Spazi Expo',
    icon: Building2,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    points: [
      "Gestione degli spazi espositivi fisici del centro.",
      "Per ogni spazio: nome, dimensioni, prezzo (giornaliero/mensile), posizione, disponibilità.",
      "Le prenotazioni verificano qui la disponibilità e calcolano il prezzo.",
      "Base per calendario e fatturazione accurati."
    ]
  },
  Marketing: {
    label: 'Marketing',
    icon: Megaphone,
    roles: ['proprieta', 'direttore'],
    points: [
      "Piano marketing annuale del centro.",
      "Sezioni: iniziative, comunicazione online, comunicazione offline, costi fissi.",
      "Budget totale + ripartizione mensile (gen→dic).",
      "Iniziative classificate: commercial, entertainment, community, cultural.",
      "Confronto tra budget previsto e speso."
    ]
  },
  Fornitori: {
    label: 'Fornitori',
    icon: Truck,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    points: [
      "Anagrafica fornitori con documentazione di sicurezza.",
      "Per fornitore: dati azienda, lavoratori con mansione, DPI, subfornitori.",
      "Caricamento e conservazione dei DUVRI.",
      "Segnalazione automatica di DUVRI mancante o scaduto."
    ]
  },
  Pulizie: {
    label: 'Pulizie',
    icon: Sparkles,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    points: [
      "Gestione delle pulizie periodiche del centro.",
      "Per ogni attività: frequenza, fornitore, ultima esecuzione, prossima scadenza, foto.",
      "Frequenze: giornaliera, settimanale, quindicinale, mensile, trimestrale, semestrale, annuale.",
      "Le pulizie ricorrenti generano automaticamente le manutenzioni collegate."
    ]
  },
  Capex: {
    label: 'Capex',
    icon: Hammer,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    points: [
      "Interventi di investimento (Capex) del centro.",
      "Per ogni intervento: anno, descrizione, date, costi previsti ed effettivi, stato.",
      "Categorie: strutturale, impiantistico, tecnologico, estetico, sicurezza, altro.",
      "Gestione sicurezza: DUVRI, lavoratori, DPI, CSE, allegati.",
      "Gli interventi pianificati compaiono nel calendario manutenzioni."
    ]
  },
  Documenti: {
    label: 'Documenti',
    icon: FileText,
    roles: ['proprieta', 'direttore'],
    points: [
      "Archivio documentale del centro: contratti, fatture, ricevute.",
      "Documenti collegabili a prenotazione e cliente.",
      "Caricamento del contratto firmato dal cliente.",
      "Archivio centralizzato, niente più documenti sparsi tra email."
    ]
  },
  Tenant: {
    label: 'Tenant',
    icon: Store,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    points: [
      "Anagrafica dei tenant (negozi) del centro.",
      "Per ogni tenant: ragione sociale, contatti, dati contratto, piantina, logo.",
      "I tenant possono essere invitati con account dedicato.",
      "I tenant inseriscono autonomamente i propri corrispettivi."
    ]
  },
  Corrispettivi: {
    label: 'Corrispettivi',
    icon: TrendingUp,
    roles: ['proprieta', 'direttore', 'tenant'],
    points: [
      "Inserimento dei corrispettivi mensili dei negozi.",
      "Per negozio e mese: corrispettivi ivati, netti, numero scontrini.",
      "I tenant inseriscono i propri; direttori e proprietà vedono e verificano tutti.",
      "Cruscotto di stato per capire chi ha inserito e chi è in arretrato.",
      "Confronto con l'andamento meteo."
    ]
  },
  LetturaContatori: {
    label: 'Contatori',
    icon: Gauge,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    points: [
      "Letture dei contatori del centro, in particolare acqua giornaliera.",
      "Inserimento dei consumi giorno per giorno in una griglia mensile.",
      "Definizione del costo unitario (€/m³): totali e costi calcolati in automatico.",
      "Grafici di andamento per individuare picchi o anomalie (es. perdite)."
    ]
  },
  Utenze: {
    label: 'Utenze',
    icon: Zap,
    roles: ['proprieta', 'direttore'],
    points: [
      "Gestione delle utenze del centro (elettricità, gas, acqua).",
      "Riferimenti dei contratti di fornitura, consumi e costi.",
      "Quadro complessivo delle spese ricorrenti.",
      "Supporto al controllo dei costi fissi."
    ]
  },
  Gestione: {
    label: 'Gestione',
    icon: Settings,
    roles: ['proprieta', 'direttore'],
    points: [
      "Amministrazione del sistema.",
      "Creazione e configurazione dei centri (IBAN, logo, piantina).",
      "Invito e assegnazione di direttori, vigilanza, manutentori, tenant.",
      "Gestione dei budget annuali.",
      "Solo la proprietà elimina; i direttori vedono i propri centri ed esportano backup filtrati."
    ]
  },
  StorageReport: {
    label: 'Storage',
    icon: HardDrive,
    roles: ['proprieta'],
    points: [
      "Report sull'occupazione dello storage dei file caricati.",
      "Mostra lo spazio usato per tipo di file (immagini, documenti, allegati).",
      "Aiuta a individuare contenuti pesanti da comprimere.",
      "Monitoraggio dell'utilizzo dello spazio nel tempo."
    ]
  }
};

export const sectionOrder = [
  'Dashboard', 'Task', 'Ticket', 'CalendarioManutenzioni', 'Calendario', 'Report', 'Meteo', 'Consegne',
  'Clienti', 'SpaziExpo', 'Marketing', 'Fornitori', 'Pulizie', 'Capex',
  'Documenti', 'Tenant', 'Corrispettivi', 'LetturaContatori', 'Utenze', 'Gestione', 'StorageReport'
];

// Restituisce solo le sezioni visibili per il tipo di account dato
export function getSectionsForRole(tipoAccount) {
  if (!tipoAccount) return [];
  return sectionOrder.filter(key => sectionInfo[key].roles.includes(tipoAccount));
}