import {
  LayoutDashboard, ListTodo, Ticket, ClipboardList, Calendar, BookOpen, Cloud,
  ArrowLeftRight, Users, Building2, Megaphone, Truck, Sparkles, Hammer, FileText,
  Store, TrendingUp, Gauge, Zap, Settings, HardDrive
} from 'lucide-react';

// Chiavi = currentPageName (corrispondente alle route di App.jsx)
export const sectionInfo = {
  Dashboard: {
    label: 'Dashboard',
    icon: LayoutDashboard,
    text: "La panoramica operativa del centro. Vedi in un colpo d'occhio le prenotazioni in corso, i task e i ticket del giorno, il meteo e l'agenda. È la pagina da cui partire ogni mattina per capire cosa richiede attenzione."
  },
  Task: {
    label: 'Task',
    icon: ListTodo,
    text: "Le attività operative assegnate al personale del centro. Crea task, assegnali a direttori o vigilanza, imposta scadenze e ricorrenze. Trascinali tra le colonne per cambiarne lo stato (da fare → in corso → completato). I task possono essere generati automaticamente dalle prenotazioni."
  },
  Ticket: {
    label: 'Ticket',
    icon: Ticket,
    text: "Le richieste di intervento manutentivo. I direttori aprono un ticket descrivendo il problema; il manutentore assegnato riceve la notifica, interviene e inserisce preventivo, allegati e note. Il direttore poi approva, sollecita o rifiuta. Gli interventi urgenti hanno scadenze più strette."
  },
  CalendarioManutenzioni: {
    label: 'Controlli',
    icon: ClipboardList,
    text: "Il calendario delle manutenzioni e dei controlli periodici del centro. Visualizza gli interventi per mese o settimana. I controlli vengono generati automaticamente dalle prenotazioni attive; da qui li monitori e li chiudi quando completati."
  },
  Calendario: {
    label: 'Calendario Expo',
    icon: Calendar,
    text: "Il calendario delle prenotazioni degli spazi espositivi. Crea prenotazioni distinguendo affitti, eventi e spazi gratuiti, verifica la disponibilità degli spazi e genera il contratto. Le prenotazioni superiori a 30 giorni attivano automaticamente contratto e notifiche di scadenza."
  },
  Report: {
    label: 'Report',
    icon: BookOpen,
    text: "I report operativi del centro. Compila e archivia report periodici con foto e note per documentare l'attività del centro."
  },
  Meteo: {
    label: 'Meteo',
    icon: Cloud,
    text: "L'analisi meteorologica del centro con dati giornalieri archiviati. Confronta un periodo con lo stesso periodo dell'anno precedente ed esporta il report in PDF. I dati meteo aiutano a interpretare l'andamento dei corrispettivi."
  },
  Consegne: {
    label: 'Consegne',
    icon: ArrowLeftRight,
    text: "I passaggi di consegna tra i turni di vigilanza. Registra le note del passaggio per mantenere la continuità operativa tra un turno e l'altro."
  },
  Clienti: {
    label: 'Clienti',
    icon: Users,
    text: "L'anagrafica dei clienti che prenotano gli spazi. Gestisci ragione sociale, partita IVA, codice SDI, referenti e documenti. I dati anagrafici vengono usati per generare i contratti."
  },
  SpaziExpo: {
    label: 'Spazi Expo',
    icon: Building2,
    text: "La gestione degli spazi espositivi del centro. Definisci ogni spazio con dimensioni, prezzo e disponibilità. Le prenotazioni verificano qui la disponibilità e calcolano il prezzo in base agli spazi scelti."
  },
  Marketing: {
    label: 'Marketing',
    icon: Megaphone,
    text: "Il piano marketing annuale del centro. Organizza iniziative, comunicazione online/offline e costi fissi, con budget mensile per voce. Le iniziative sono classificate per tipologia (commercial, entertainment, community, cultural)."
  },
  Fornitori: {
    label: 'Fornitori',
    icon: Truck,
    text: "L'anagrafica dei fornitori con documentazione di sicurezza. Per ogni fornitore gestisci DUVRI, lavoratori, DPI e subfornitori. Il sistema segnala quando manca il DUVRI obbligatorio."
  },
  Pulizie: {
    label: 'Pulizie',
    icon: Sparkles,
    text: "La gestione delle pulizie periodiche del centro. Definisci frequenze, fornitori e foto dell'ultima esecuzione. Le pulizie ricorrenti generano automaticamente le manutenzioni collegate."
  },
  Capex: {
    label: 'Capex',
    icon: Hammer,
    text: "Gli interventi di investimento (Capex) del centro. Pianifica e approva gli interventi, traccia costi previsti ed effettivi e gestisci DUVRI, lavoratori, DPI e CSE. Gli interventi pianificati compaiono nel calendario delle manutenzioni."
  },
  Documenti: {
    label: 'Documenti',
    icon: FileText,
    text: "L'archivio documentale del centro: contratti, fatture, ricevute e altro. I documenti sono collegati a prenotazioni e clienti; qui carichi anche il contratto firmato dal cliente."
  },
  Tenant: {
    label: 'Tenant',
    icon: Store,
    text: "L'anagrafica dei tenant (negozi) del centro. Gestisci contratti, canoni, piantine del negozio e loghi. I tenant possono accedere all'app per inserire i propri corrispettivi."
  },
  Corrispettivi: {
    label: 'Corrispettivi',
    icon: TrendingUp,
    text: "L'inserimento dei corrispettivi mensili dei negozi: incassi ivati/netti e numero scontrini. I tenant inseriscono i propri dati; direttori e proprietà vedono e verificano tutti i negozi. I dati si confrontano con l'andamento meteo."
  },
  LetturaContatori: {
    label: 'Contatori',
    icon: Gauge,
    text: "Le letture dei contatori del centro, in particolare l'acqua giornaliera. Inserisci i consumi giorno per giorno e il sistema calcola i costi in base al costo unitario."
  },
  Utenze: {
    label: 'Utenze',
    icon: Zap,
    text: "La gestione delle utenze e dei consumi del centro."
  },
  Gestione: {
    label: 'Gestione',
    icon: Settings,
    text: "L'amministrazione del sistema. Qui la proprietà e i direttori gestiscono centri, direttori, vigilanza, manutentori, tenant, budget e assegnazioni. Solo la proprietà può eliminare; i direttori vedono i propri centri ed esportano backup filtrati."
  },
  StorageReport: {
    label: 'Storage',
    icon: HardDrive,
    text: "Il report sull'occupazione dello storage dei file caricati nell'app. Mostra quanto spazio occupano immagini, documenti e allegati, per ottimizzare gli upload."
  }
};

export const sectionOrder = [
  'Dashboard', 'Task', 'Ticket', 'CalendarioManutenzioni', 'Calendario', 'Report', 'Meteo', 'Consegne',
  'Clienti', 'SpaziExpo', 'Marketing', 'Fornitori', 'Pulizie', 'Capex',
  'Documenti', 'Tenant', 'Corrispettivi', 'LetturaContatori', 'Utenze', 'Gestione', 'StorageReport'
];