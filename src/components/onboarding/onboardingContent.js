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
    text: "La dashboard è la centrale operativa del centro commerciale: riunisce in un'unica schermata le informazioni che ti servono per iniziare la giornata. Trovi le prenotazioni in corso e quelle in scadenza, i task e i ticket del giorno con i relativi stati, il meteo aggiornato e l'agenda delle attività programmate. Le card rapide ti permettono di creare al volo una prenotazione, un task, un controllo o un report senza navigare nelle sezioni specifiche. È la pagina da cui partire ogni mattina per capire subito cosa richiede la tua attenzione e da cui accedere rapidamente a tutto il resto."
  },
  Task: {
    label: 'Task',
    icon: ListTodo,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    text: "Qui gestisci tutte le attività operative assegnate al personale del centro. Puoi creare task indicando titolo, descrizione, priorità (bassa, media, alta, urgente) e data di scadenza, e assegnarli a un direttore o a una vigilanza. I task sono organizzati in colonne Kanban (da fare, in corso, completato, annullato) e puoi cambiarne lo stato trascinandoli da una colonna all'altra. È possibile impostare ricorrenze (giornaliere, settimanali, mensili, annuali o personalizzate) così che il sistema generi automaticamente le ripetizioni. Inoltre, alcuni task vengono creati in automatico dal sistema a partire dalle prenotazioni o da altre attività, per garantire che nessun adempimento venga dimenticato."
  },
  Ticket: {
    label: 'Ticket',
    icon: Ticket,
    roles: ['proprieta', 'direttore', 'vigilanza', 'manutentore'],
    text: "I ticket sono le richieste di intervento manutentivo: il cuore del flusso tra direzione e manutentore. Un direttore apre un ticket descrivendo il problema, allegando foto e indicando la tipologia (ordinario o urgente) con la relativa scadenza. Il manutentore assegnato riceve la notifica, prende in carico l'intervento e poi inserisce il preventivo (costo stimato), gli allegati e le note di chiusura. Il direttore a quel punto approva il preventivo, chiede un sollecito se l'intervento tarda, oppure rifiuta motivando. Il sistema tiene traccia di ogni passaggio di stato (in attesa, approvato, preventivo inserito, da controllare, chiuso, rifiutato) e notifica automaticamente gli interessati a ogni cambio, così che la comunicazione non avvenga più tramite chat o email sparse."
  },
  CalendarioManutenzioni: {
    label: 'Controlli',
    icon: ClipboardList,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    text: "Il calendario dei controlli e delle manutenzioni periodiche del centro. Puoi visualizzare gli interventi per mese o per settimana e filtrarli per stato. Molti controlli non vanno inseriti a mano: il sistema li genera automaticamente a partire dalle prenotazioni attive (ad esempio i controlli di inizio e fine affitto) e dalle pulizie periodiche ricorrenti. Da qui monitori lo stato di ogni intervento, lo chiudi quando completato e ne tieni traccia con foto e note. È lo strumento per avere sempre sotto controllo cosa deve essere fatto e quando, senza dover ricordare le scadenze a memoria."
  },
  Calendario: {
    label: 'Calendario Expo',
    icon: Calendar,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    text: "Il calendario delle prenotazioni degli spazi espositivi del centro. Qui crei le prenotazioni distinguendo tre tipologie: affitto (genera contratto e conta nei ricavi), evento (non genera contratto) e spazio gratuito. Per ogni prenotazione scegli uno o più spazi, il cliente, le date di inizio e fine, il materiale dimostrativo e l'eventuale necessità di collegamento elettrico; il sistema calcola automaticamente il prezzo totale in base agli spazi selezionati. Puoi verificare la disponibilità degli spazi prima di confermare e generare il contratto con un clic. Le prenotazioni con durata superiore a 30 giorni attivano in automatico la generazione del contratto e le notifiche di scadenza a 30 giorni dalla fine, per non farti perdere le scadenze contrattuali più importanti."
  },
  Report: {
    label: 'Report',
    icon: BookOpen,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    text: "La sezione dedicata ai report operativi del centro, per documentare in modo strutturato l'attività periodica. Puoi compilare report inserendo titolo, descrizione, data e allegando foto e note, così da costruire un archivio consultabile nel tempo. I report sono utili per tracciare eventi, situazioni o interventi particolari e per mantenere una memoria condivisa tra direttori e vigilanza. Tutto resta storizzato e recuperabile, così chi subentra trova già il contesto delle attività precedenti."
  },
  Meteo: {
    label: 'Meteo',
    icon: Cloud,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    text: "L'analisi meteorologica del centro basata sui dati giornalieri archiviati (temperature minime/massime e codice meteo). Puoi consultare l'andamento del mese in corso e confrontare un periodo qualsiasi con lo stesso periodo dell'anno precedente, per valutare come il meteo ha influito sui flussi e sui corrispettivi. I dati vengono archiviati automaticamente giorno per giorno ed è possibile esportare il report in PDF. Il confronto meteo–corrispettivi è uno degli usi più preziosi: ti aiuta a capire se cali o picchi di incassi sono dovuti al clima o ad altre cause."
  },
  Consegne: {
    label: 'Consegne',
    icon: ArrowLeftRight,
    roles: ['vigilanza'],
    text: "I passaggi di consegna tra i turni di vigilanza. Qui chi conclude il turno registra le note del passaggio (situazioni in corso, anomalie, cose da tenere d'occhio) in modo che chi entra in turno successivo trovi subito il contesto. Le consegne sono organizzate per centro e per data, così si costruisce un diario operativo consultabile nel tempo. È lo strumento per garantire continuità tra i turni senza dover fare riferimenti a voce o messaggi separati."
  },
  Clienti: {
    label: 'Clienti',
    icon: Users,
    roles: ['proprieta', 'direttore'],
    text: "L'anagrafica dei clienti che prenotano gli spazi espositivi del centro. Per ogni cliente gestisci la ragione sociale, la partita IVA, il codice fiscale, il codice SDI per la fatturazione elettronica, la PEC e tutti i riferimenti di sede e del referente aziendale. Questi dati anagrafici sono fondamentali perché vengono utilizzati automaticamente per generare i contratti di affitto precompilati. Puoi anche inserire note libere e tenere lo storico dei clienti che hanno già operato nel centro, così da avere sempre a disposizione un archivio ordinato e aggiornato."
  },
  SpaziExpo: {
    label: 'Spazi Expo',
    icon: Building2,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    text: "La gestione degli spazi espositivi fisici del centro. Per ogni spazio definisci nome, dimensioni, prezzo (giornaliero o mensile), posizione e disponibilità. Quando crei una prenotazione il sistema verifica qui la disponibilità degli spazi nelle date scelte e calcola il prezzo totale in base agli spazi che hai selezionato. Avere gli spazi ben configurati, con prezzi e dimensioni corretti, è la base per un calendario e una fatturazione accurati: questa sezione alimenta tutto il flusso commerciale delle prenotazioni."
  },
  Marketing: {
    label: 'Marketing',
    icon: Megaphone,
    roles: ['proprieta', 'direttore'],
    text: "Il piano marketing annuale del centro, organizzato per sezioni: iniziative, comunicazione online, comunicazione offline e costi fissi. Per ogni voce inserisci il budget totale annuale e la ripartizione mensile (da gennaio a dicembre), così da avere subito il confronto tra budget previsto e speso mese per mese. Le iniziative sono classificate per tipologia (commercial, entertainment, community, cultural) e puoi assegnare a ogni mese il nome dell'iniziativa specifica. È lo strumento per pianificare e monitorare gli investimenti promozionali del centro nel corso dell'anno."
  },
  Fornitori: {
    label: 'Fornitori',
    icon: Truck,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    text: "L'anagrafica dei fornitori con tutta la documentazione di sicurezza. Per ogni fornitore gestisci i dati aziendali (ragione sociale, partita IVA, PEC, sede), i lavoratori con le rispettive mansioni, i DPI (dispositivi di protezione individuale) previsti e i subfornitori con la loro documentazione. Carichi e conservi i DUVRI (Documento Unico di Valutazione dei Rischi Interferenza) e il sistema segnala automaticamente quando un fornitore ha il DUVRI mancante o scaduto. È la sezione per mantenere la conformità normativa e la traccia documentale in caso di controlli."
  },
  Pulizie: {
    label: 'Pulizie',
    icon: Sparkles,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    text: "La gestione delle pulizie periodiche del centro. Per ogni attività definisci la frequenza (giornaliera, settimanale, quindicinale, mensile, trimestrale, semestrale o annuale), il fornitore, l'ultima esecuzione e la prossima scadenza, con la possibilità di allegare foto dell'ultima esecuzione. Le pulizie ricorrenti generano automaticamente le manutenzioni collegate nel calendario dei controlli, così che nulla venga dimenticato. È lo strumento per pianificare e monitorare la pulizia del centro nel tempo."
  },
  Capex: {
    label: 'Capex',
    icon: Hammer,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    text: "Gli interventi di investimento (Capex) del centro: la pianificazione delle spese strutturali, impiantistiche, tecnologiche, estetiche o di sicurezza. Per ogni intervento definisci anno di riferimento, descrizione, date di inizio e fine, costi previsti ed effettivi a consuntivo, e ne segui lo stato (da proporre, da pianificare, pianificato, completato). Gestisci anche la parte sicurezza: DUVRI, lavoratori con mansione, DPI, CSE e gli allegati. Gli interventi pianificati compaiono automaticamente nel calendario delle manutenzioni, così da avere una vista unica degli interventi in corso."
  },
  Documenti: {
    label: 'Documenti',
    icon: FileText,
    roles: ['proprieta', 'direttore'],
    text: "L'archivio documentale del centro: contratti, fatture, ricevute e altro ancora. I documenti possono essere collegati a una prenotazione e a un cliente, così ritrovi subito tutta la documentazione di un affitto. Qui carichi anche il contratto firmato dal cliente, chiudendo il cerchio del flusso contrattuale. È il archivio centralizzato che ti evita di cercare i documenti tra email e cartelle sparse: tutto è associato al centro, al cliente e alla prenotazione giusti."
  },
  Tenant: {
    label: 'Tenant',
    icon: Store,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    text: "L'anagrafica dei tenant, ovvero i negozi del centro. Per ogni tenant gestisci la ragione sociale, i contatti, i dati del contratto (canone, durata, scadenza), la piantina del negozio e il logo. I tenant possono essere invitati ad accedere all'app con un account dedicato per inserire autonomamente i propri corrispettivi mensili. È la sezione che tiene insieme la parte anagrafica e contrattuale dei negozi e che abilita il flusso di inserimento corrispettivi da parte dei negozianti."
  },
  Corrispettivi: {
    label: 'Corrispettivi',
    icon: TrendingUp,
    roles: ['proprieta', 'direttore', 'tenant'],
    text: "L'inserimento dei corrispettivi mensili dei negozi: per ogni negozio e per ogni mese si registrano i corrispettivi ivati, i corrispettivi netti e il numero di scontrini. I tenant inseriscono direttamente i propri dati dal loro account; direttori e proprietà vedono e verificano tutti i negozi del centro, con un cruscotto di stato per capire chi ha inserito e chi è in arretrato. I dati possono essere confrontati con l'andamento meteo per capire l'impatto del clima sugli incassi. È la base per il controllo di gestione e per le comunicazioni con i commerciali."
  },
  LetturaContatori: {
    label: 'Contatori',
    icon: Gauge,
    roles: ['proprieta', 'direttore', 'vigilanza'],
    text: "Le letture dei contatori del centro, in particolare dell'acqua giornaliera. Per ogni contatore inserisci i consumi giorno per giorno all'interno di una griglia mensile e definisci il costo unitario (€/m³): il sistema calcola in automatico i totali e i costi. Puoi consultare i grafici di andamento dei consumi per individuare picchi o anomalie (ad esempio perdite). È lo strumento per monitorare i consumi delle utenze in modo puntuale invece di aspettare la bolletta."
  },
  Utenze: {
    label: 'Utenze',
    icon: Zap,
    roles: ['proprieta', 'direttore'],
    text: "La gestione delle utenze del centro (elettricità, gas, acqua e simili). Qui tieni i riferimenti dei contratti di fornitura, i consumi e i costi, per avere un quadro complessivo delle spese ricorrenti del centro. È la sezione di supporto per il controllo dei costi fissi e per pianificare eventuali ottimizzazioni o rinegoziazioni."
  },
  Gestione: {
    label: 'Gestione',
    icon: Settings,
    roles: ['proprieta', 'direttore'],
    text: "L'amministrazione del sistema: qui si gestisce tutto ciò che sta dietro al funzionamento dell'app. Si creano e configurano i centri commerciali (con IBAN, logo e piantina), si invitano e assegnano direttori, vigilanza, manutentori e tenant ai rispettivi centri, e si gestiscono i budget annuali. Solo la proprietà può eliminare i record; i direttori vedono e gestiscono i propri centri e possono esportare backup filtrati sui dati di competenza. È la sezione riservata alla configurazione iniziale e alla gestione degli account."
  },
  StorageReport: {
    label: 'Storage',
    icon: HardDrive,
    roles: ['proprieta'],
    text: "Il report sull'occupazione dello storage dei file caricati nell'app (immagini, documenti, allegati di ticket, capex, fornitori e così via). Mostra quanto spazio occupano i vari tipi di file e aiuta a individuare eventuali contenuti pesanti da ottimizzare o comprimere. È lo strumento di monitoraggio per tenere sotto controllo l'utilizzo dello spazio di archiviazione nel tempo."
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