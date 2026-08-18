# TonsilCare PWA 🏥🍦

TonsilCare è una **Progressive Web App (PWA)** mobile-first dedicata al supporto domiciliare dei pazienti pediatrici sottoposti a tonsillectomia. L'app fornisce un diario clinico per i genitori, e una "Control Room" (Triage) per i medici curanti, tutto sincronizzato tramite Cloud Firestore.

## Caratteristiche Principali ✨

*   **Sistema a Doppio Ruolo (RBAC):**
    *   **Genitori:** Dashboard personale per gestire uno o più bambini, registrare il diario clinico quotidiano e visualizzare i consigli alimentari / prescrizioni in base al giorno post-operatorio.
    *   **Medici:** Control Room che elenca tutti i pazienti assistiti, con **Triage automatico** (chi ha superato le soglie di allerta nelle ultime 24 ore finisce in cima, evidenziato, con il motivo e l'ora della lettura che l'ha acceso), **ricerca per nome** e **filtri rapidi** per allerta, novità e fase post-operatoria.
*   **Database Relazionale Misto Firestore:** Struttura scalabile e sicura basata su `accounts` (auth/ruoli) e `utenti` (dati clinici del paziente), protetta da Security Rules per garantire il rispetto della privacy.
*   **Mobile-First, con layout desktop dedicato:** UI pensata prima per smartphone (Next.js 16 App Router + Tailwind CSS 4), con una barra di navigazione desktop condivisa dai due ruoli e una Control Room a due pannelli (lista + scheda paziente) sopra i 1024px. Installabile su Android/iOS come PWA, con manifest e fallback offline.
*   **Diario Clinico Esteso:** Oltre a temperatura e dolore (0–10), registra idratazione (bicchieri), numero di pasti, alimenti tollerati, rifiuto del cibo, nausea, vomito, sanguinamento, dolore alla deglutizione, peso, qualità del sonno e stato generale. Genera *alert medici* immediati per il genitore in caso di anomalie, segnalando contemporaneamente il medico.
*   **Ricettario Post-Operatorio:** Consultazione dinamica delle ricette idonee per le specifiche fasi del recupero.
*   **Novità in-app:** Indicatori visivi (badge) per segnalare nuovi log diario al medico e nuove prescrizioni al genitore, senza notifiche push esterne al dispositivo.

---

## Stack Tecnologico 🛠

*   **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript, Lucide Icons.
*   **Stato & Form:** Context API, React Hook Form + Zod 4 (validazione rigorosa).
*   **Backend & DB:** Firebase Authentication, Cloud Firestore (accesso client-diretto, nessuna Cloud Function).
*   **PWA:** `next-pwa` per service worker e asset caching.

---

## Prerequisiti

*   [Node.js](https://nodejs.org/it/) **v20.9 o superiore** (richiesto da Next.js 16)
*   Un progetto su [Firebase Console](https://console.firebase.google.com/)
*   Un account gratuito su [Vercel](https://vercel.com/) (per il deploy in produzione)

---

## Configurazione ed Esecuzione Locale 🚀

### 1. Clona il repository

```bash
git clone https://github.com/lions1999/tonsilcare.git
```

### 2. Installa le dipendenze

```bash
npm install
```

### 3. Configura Firebase
Nella tua Console Firebase crea un'app Web e recupera le chiavi di configurazione.
Inoltre, abilita:
- **Authentication**: Provider *Email/Password*.
- **Firestore Database**: Crea il database in modalità produzione.

Copia `.env.local.example` in `.env.local` e inserisci le chiavi del tuo progetto di **sviluppo**:

```env
NEXT_PUBLIC_FIREBASE_API_KEY="tua-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="tuo-progetto-dev.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="tuo-progetto-dev"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="tuo-progetto-dev.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_APP_ID="tuo-app-id"
```

> `.env.local` è gitignored e deve puntare **sempre** al progetto di sviluppo, mai a produzione — inclusi i test manuali e automatizzati nel browser. Vedi la sezione *Ambienti dev / produzione* più sotto.

### 4. Deploy delle Security Rules ed Indici (Firebase CLI)

`.firebaserc` è già versionato con gli alias dei due progetti, quindi non serve `firebase use --add`: basta selezionare l'alias giusto.

```bash
npm i -g firebase-tools
firebase login
firebase use dev
firebase deploy --only firestore
```

**Poi verifica cosa è stato pubblicato davvero.** L'output di `firebase deploy` dice che il comando è arrivato in fondo, non cosa sta girando: un deploy verso il progetto sbagliato, o con un file non salvato, produce lo stesso verde. La CLI non sa rileggere le regole pubblicate, la Rules REST API sì:

```bash
node scripts/verifica-rules.mjs                            # tonsilcare-dev
node scripts/verifica-rules.mjs --project tonsilcare-app   # produzione
```

Esce `0` se tutto coincide, `1` altrimenti, quindi si può incatenare al deploy. Controlla due cose distinte: che il testo pubblicato coincida con `firestore.rules` (hash + diff riga per riga) e che alcune **regole marcatore** esistano davvero nel testo pubblicato — perché se qualcuno cancella una protezione e committa, gli hash restano identici e la protezione è sparita lo stesso. Richiede le stesse credenziali del seeding (`gcloud auth application-default login`).

### 5. Popola le collezioni Firestore (obbligatorio) ⚠️

Su un progetto Firebase nuovo il database è vuoto, e **l'app non se ne accorge in modo uniforme**: alcune funzionalità hanno un fallback, altre falliscono in silenzio. In particolare, senza il documento `/config/alerts` la Control Room non evidenzia **mai** un paziente in allerta, per quanto gravi siano i parametri.

Dal 2026-08-06 questo stato **viene dichiarato a schermo** al medico, con un avviso non chiudibile in cima alla lista pazienti: il rischio non è che non sappia della configurazione mancante, è che legga un elenco senza righe rosse e concluda che stanno tutti bene. L'avviso non compare al genitore, che quell'errore non può risolverlo.

Tutte e quattro le collezioni si popolano con un comando solo. La scrittura è bloccata al client (`allow write: if false` in `firestore.rules`), quindi il seeding passa dall'Admin SDK, che le regole non le attraversa:

```bash
gcloud auth application-default login    # una volta
node scripts/seed.mjs --dry-run          # mostra cosa scriverebbe
node scripts/seed.mjs                    # tonsilcare-dev (default)
```

I contenuti stanno in `seed-data/*.json`, versionati, e gli id dei documenti sono deterministici: rieseguire lo script aggiorna invece di duplicare. Su produzione serve il flag esplicito `--project tonsilcare-app --conferma-produzione`.

Cosa viene creato:

- **`/config/alerts`** — soglie cliniche. Campi e valori di partenza:
  | Campo | Tipo | Valore |
  |---|---|---|
  | `temperaturaMaxC` | number | `38.5` |
  | `doloreSoglia` | number | `7` |
  | `messaggioEmergenza` | string | testo da mostrare al genitore in caso di allerta |
- **`/fasi/{fase_1 … fase_5}`** — configurazione delle fasi post-operatorie. Se la collezione manca l'app resta usabile grazie al fallback hardcoded in `src/hooks/useFasi.ts` (`FASI_FALLBACK`), che lo annuncia in console quando scatta.
- **`/ricette`** e **`/info`** — contenuti clinici. Prima si popolavano da un pulsante *"Popola Database (Seed)"* nelle pagine omonime: usava `addDoc` senza guardia, quindi ogni click aggiungeva copie. Pulsante e funzioni sono stati rimossi.

### 6. Avvia il server di sviluppo

```bash
npm run dev
```
L'applicazione sarà visibile su `http://localhost:3000`. Per il controllo statico: `npm run lint`.

> ⚠️ **Non togliere `--webpack` da `npm run build`.** `next-pwa` genera il service worker come plugin **webpack**, e in Next.js 16 il bundler di default è Turbopack anche per `next build`: sotto Turbopack la configurazione di `next-pwa` viene ignorata **senza alcun errore**. Il build dice "riuscito", ma `public/sw.js` non viene creato e l'app resta senza offline né caching. Dopo qualsiasi modifica alla toolchain, verifica che `npm run build` produca `public/sw.js`, `public/workbox-*.js` e `public/fallback-*.js` (tutti gitignored): se mancano, la PWA è morta anche col build verde.

---

## Ambienti dev / produzione 🔀

Il repo è configurato per due progetti Firebase distinti (`.firebaserc`):

| Alias | Progetto | Uso |
|---|---|---|
| `dev` (**default**) | `tonsilcare-dev` | sviluppo, test locali e nel browser |
| `prod` | `tonsilcare-app` | produzione |

`dev` è anche il `default`: qualunque comando `firebase` lanciato **senza** `--project` esplicito colpisce lo sviluppo. Per toccare la produzione bisogna dirlo esplicitamente:

```bash
firebase deploy --only firestore:rules,firestore:indexes --project prod
```

Le chiavi di produzione **non vivono in nessun file del repo**: stanno solo nelle Environment Variables di Vercel. Non creare un `.env.production` con credenziali reali — in Next.js `.env.local` ha comunque priorità in ogni build locale, quindi non offrirebbe la separazione voluta.

---

## Promozione a Medico (Firestore) 👨‍⚕️

Di default, tutti i nuovi utenti registrati vengono creati con il ruolo di **'genitore'**.
Per testare la Control Room Medica, devi elevare i permessi del tuo account:
1. Registrati normalmente sull'app.
2. Apri la [Firebase Console](https://console.firebase.google.com/).
3. Vai in **Firestore Database** → collezione `accounts` → seleziona il tuo UID.
4. Cambia il valore del campo `ruolo` da `genitore` a `medico`.
5. Rifai il login: verrai reindirizzato in automatico alla rotta `/studio` (Control Room).

---

## Deploy in Produzione (Vercel) 🌍

TonsilCare è ottimizzata per il deploy *zero-config* su Vercel.

1.  Effettua il login su [Vercel](https://vercel.com/).
2.  Clicca su **"Add New Project"** e collega il tuo repository GitHub.
3.  Prima di cliccare "Deploy", apri la sezione **"Environment Variables"**.
4.  Inserisci le chiavi Firebase del progetto di **produzione** (`tonsilcare-app`) — **non** quelle di `.env.local`, che sono di sviluppo. I nomi delle variabili sono gli stessi elencati al punto 3.
5.  Assicurati che anche il progetto di produzione abbia le collezioni del punto 5 (`/config/alerts`, `/fasi`, `/ricette`, `/info`) e le Security Rules deployate con `--project prod`.
6.  Clicca **Deploy**.

Vercel rileverà automaticamente Next.js, compilerà staticamente le pagine, verificherà lo schema TypeScript e metterà l'app online.

---

## Limiti noti ⚠️

Cose che oggi funzionano ma vanno sapute prima di mettere l'app in mano a qualcuno:

*   **Non esiste un'associazione medico–paziente.** Nessun campo lega un paziente a un medico: la Control Room legge l'intera collezione `utenti`, e le regole autorizzano qualunque account con `ruolo: medico`. Con un solo studio non si nota; **dal secondo medico in poi, ognuno vede i pazienti di tutti**. Va progettato prima che il secondo medico esista, perché tocca modello dati e regole insieme.
*   **La Control Room non ha paginazione.** Scarica tutti i pazienti e poi esegue una query per ciascuno per i log della finestra di allerta; ricerca e filtri lavorano in memoria. Con pochi pazienti è istantaneo, con 200 sono 201 letture a ogni apertura.
*   **Le 5 fasi post-operatorie non sono ancora confermate dal cliente** (potrebbero diventare 4). Cambiarle significa aggiornare `seed-data/fasi.json`, rilanciare il seed **su dev e su produzione**, allineare `FASI_FALLBACK` in `src/hooks/useFasi.ts` e il tipo `PostOpPhase`, che è un'unione di cinque id e non si aggiorna da solo.
*   **I log del diario non sono modificabili**, per scelta: `allow update: if false` sulla sotto-collezione. Un log è la registrazione di cosa è stato osservato in un momento, e il medico decide su quei valori; riaprirlo richiede prima di progettare come si corregge e come il medico vede che un valore è cambiato.

---

## Documentazione per chi sviluppa 📚

`CLAUDE.md` (nella root) è il documento operativo del progetto: contiene le decisioni prese e **il motivo**, i bug già pagati una volta e i dettagli che non si deducono leggendo il codice — perché il build ha bisogno di `--webpack`, cosa chiudono esattamente le Security Rules e cosa è stato lasciato aperto di proposito, come si simula l'assenza di una configurazione senza cancellarla, quali debiti sono in attesa di una decisione del cliente.

Leggilo prima di modificare rules, seeding, fasi o alert: diverse scelte che sembrano sviste sono deliberate e spiegate lì.

---

## Utilizzo (Walkthrough) 📖

*   **Lato Genitore:**
    1. Registrati e aggiungi i dati di base dell'utente (tuo figlio): anagrafica, data e tipo di intervento, peso e altezza di partenza, eventuali allergie e patologie associate.
    2. Usa la Dashboard per tenere sotto controllo i parametri, la fase post-operatoria odierna e leggere le comunicazioni mediche.
    3. Clicca su "+ Aggiungi Log Diario" ogni giorno per registrare temperatura, dolore, alimentazione, idratazione e gli altri parametri clinici.
    4. Quando il medico invia una prescrizione, un badge compare sull'avatar in alto: aprilo per leggerla.
*   **Lato Medico:**
    1. Una volta impostato il ruolo a 'medico', l'app mostrerà la Control Room.
    2. I pazienti sono elencati in ordine di triage: chi supera le soglie di `/config/alerts` per temperatura o dolore, o segnala sanguinamento o vomito, appare in cima evidenziato in rosso. La valutazione guarda **tutte le letture delle ultime 24 ore**, non solo l'ultima: un valore rientrato non nasconde più quello fuori soglia registrato poche ore prima. La card mostra il motivo e l'ora. Puoi cercare per nome e filtrare per allerta, novità o fase.
    3. Clicca su un paziente per consultare la sua scheda e lo storico cronologico dei log diario.
    4. Dalla stessa pagina puoi inviare una nuova prescrizione al genitore, che la riceverà come "novità" in-app.

---
*Progetto sviluppato come supporto medico-domiciliare in tempo reale.*
