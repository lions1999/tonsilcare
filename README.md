# TonsilCare PWA 🏥🍦

TonsilCare è una **Progressive Web App (PWA)** mobile-first dedicata al supporto domiciliare dei pazienti pediatrici sottoposti a tonsillectomia. L'app fornisce un diario clinico per i genitori, e una "Control Room" (Triage) per i medici curanti, tutto sincronizzato tramite Cloud Firestore.

## Caratteristiche Principali ✨

*   **Sistema a Doppio Ruolo (RBAC):**
    *   **Genitori:** Dashboard personale per gestire uno o più bambini, registrare il diario clinico quotidiano e visualizzare i consigli alimentari / prescrizioni in base al giorno post-operatorio.
    *   **Medici:** Control Room che elenca tutti i pazienti assistiti, con **Triage automatico** (chi ha superato le soglie di allerta finisce in cima, evidenziato), **ricerca per nome** e **filtri rapidi** per allerta, novità e fase post-operatoria.
*   **Database Relazionale Misto Firestore:** Struttura scalabile e sicura basata su `accounts` (auth/ruoli) e `utenti` (dati clinici del paziente), protetta da Security Rules per garantire il rispetto della privacy.
*   **Mobile-First e PWA:** UI ottimizzata per smartphone (Next.js 16 App Router + Tailwind CSS 4). Installabile su Android/iOS, con manifest e fallback offline.
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

### 5. Popola le collezioni Firestore (obbligatorio) ⚠️

Su un progetto Firebase nuovo il database è vuoto, e **l'app non se ne accorge in modo uniforme**: alcune funzionalità hanno un fallback, altre falliscono in silenzio. In particolare, senza il documento `/config/alerts` la Control Room non evidenzia **mai** un paziente in allerta, per quanto gravi siano i parametri — senza alcun errore a schermo.

**Da creare a mano da Firebase Console** (la scrittura è bloccata al client, `allow write: if false` in `firestore.rules`):

- **`/config/alerts`** — soglie cliniche. Campi e valori di partenza:
  | Campo | Tipo | Valore |
  |---|---|---|
  | `temperaturaMaxC` | number | `38.5` |
  | `doloreSoglia` | number | `7` |
  | `oreMaxSenzaAlimentazione` | number | `8` |
  | `messaggioEmergenza` | string | testo da mostrare al genitore in caso di allerta |
- **`/fasi/{fase_1 … fase_5}`** — configurazione delle fasi post-operatorie. Se la collezione manca l'app resta usabile grazie al fallback hardcoded in `src/hooks/usePhaseConfig.ts` (`FALLBACK_PHASES`), che puoi usare come traccia per i documenti reali.

**Da popolare dall'app** (una tantum): apri `/ricette` e `/info` da loggato — se la collezione è vuota la pagina mostra un pulsante *"Popola Database (Seed)"* che crea i contenuti iniziali.

### 6. Avvia il server di sviluppo

```bash
npm run dev
```
L'applicazione sarà visibile su `http://localhost:3000`.

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

## Utilizzo (Walkthrough) 📖

*   **Lato Genitore:**
    1. Registrati e aggiungi i dati di base dell'utente (tuo figlio): anagrafica, data e tipo di intervento, peso e altezza di partenza, eventuali allergie e patologie associate.
    2. Usa la Dashboard per tenere sotto controllo i parametri, la fase post-operatoria odierna e leggere le comunicazioni mediche.
    3. Clicca su "+ Aggiungi Log Diario" ogni giorno per registrare temperatura, dolore, alimentazione, idratazione e gli altri parametri clinici.
    4. Quando il medico invia una prescrizione, un badge compare sull'avatar in alto: aprilo per leggerla.
*   **Lato Medico:**
    1. Una volta impostato il ruolo a 'medico', l'app mostrerà la Control Room.
    2. I pazienti sono elencati in ordine di triage: chi supera le soglie di `/config/alerts` (o segnala sanguinamento/vomito) appare in cima, evidenziato in rosso. Puoi cercarli per nome e filtrare per allerta, novità o fase.
    3. Clicca su un paziente per consultare la sua scheda e lo storico cronologico dei log diario.
    4. Dalla stessa pagina puoi inviare una nuova prescrizione al genitore, che la riceverà come "novità" in-app.

---
*Progetto sviluppato come supporto medico-domiciliare in tempo reale.*
