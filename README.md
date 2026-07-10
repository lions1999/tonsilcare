# TonsilCare PWA 🏥🍦

TonsilCare è una **Progressive Web App (PWA)** mobile-first dedicata al supporto domiciliare dei pazienti pediatrici sottoposti a tonsillectomia. L'app fornisce un diario clinico per i genitori, e una "Control Room" (Triage) per i medici curanti, tutto sincronizzato in tempo reale tramite Cloud Firestore.

## Caratteristiche Principali ✨

*   **Sistema a Doppio Ruolo (RBAC):**
    *   **Genitori:** Dashboard personale per gestire uno o più bambini, registrare il diario clinico quotidiano e visualizzare i consigli alimentari / prescrizioni in base al giorno post-operatorio.
    *   **Medici:** Control Room che mostra tutti i pazienti assistiti, con un sistema di **Triage automatico** che evidenzia chi ha inserito allerte (febbre alta, sanguinamento). Possibilità di inviare messaggi/prescrizioni direttamente al genitore.
*   **Database Relazionale Misto Firestore:** Struttura scalabile e sicura basata su `accounts` (auth/ruoli) e `utenti` (dati clinici del paziente), protetta da solide Security Rules per garantire il rispetto della privacy.
*   **Mobile-First e PWA:** UI ottimizzata per smartphone (Next.js 14 + Tailwind CSS). Installabile su Android/iOS, con manifest e fallback offline.
*   **Diario Clinico Intelligente:** Registrazione di temperatura, dolore (0-10) e sintomi post-operatori. Generazione di *alert medici* immediati per il genitore in caso di anomalie, avvisando contemporaneamente il medico.
*   **Ricettario Post-Operatorio:** Consultazione dinamica delle ricette idonee per le specifiche fasi del recupero.
*   **Notifiche:** Struttura predisposta per l'invio di promemoria tramite Firebase Cloud Messaging.

---

## Stack Tecnologico 🛠

*   **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, TypeScript, Lucide Icons.
*   **Stato & Form:** Context API, React Hook Form + Zod (validazione rigorosa).
*   **Backend & DB:** Firebase Authentication, Cloud Firestore.
*   **PWA:** `next-pwa` per service workers e asset caching.

---

## Prerequisiti

*   [Node.js](https://nodejs.org/it/) (v18 o superiore consigliato)
*   Un progetto su [Firebase Console](https://console.firebase.google.com/)
*   Un account gratuito su [Vercel](https://vercel.com/) (per il deploy in produzione)

---

## Configurazione ed Esecuzione Locale 🚀

### 1. Clona il repository

```bash
git clone https://github.com/tuo-username/tonsilcare.git
cd tonsilcare
```

### 2. Installa le dipendenze

```bash
npm install
```

### 3. Configura Firebase
Vai nella tua Console Firebase, crea un'app Web e recupera le tue chiavi di configurazione.
Inoltre, abilita:
- **Authentication**: Provider *Email/Password*.
- **Firestore Database**: Crea il database in modalità produzione.

Crea un file `.env.local` nella cartella principale del progetto (vedi `.env.local.example`) e inserisci le chiavi:

```env
NEXT_PUBLIC_FIREBASE_API_KEY="tua-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="tuo-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="tuo-project"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="tuo-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="tuo-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="tuo-app-id"
```

### 4. Deploy delle Security Rules ed Indici (Firebase CLI)

Per proteggere il database in base ai Ruoli (Genitore vs Medico) e abilitare l'ordinamento avanzato in Control Room, fai il deploy delle configurazioni `firestore.rules` e `firestore.indexes.json` incluse nel repo:

```bash
npm i -g firebase-tools
firebase login
firebase use --add tuo-project-id
firebase deploy --only firestore
```

### 5. Avvia il server di sviluppo

```bash
npm run dev
```
L'applicazione sarà visibile su `http://localhost:3000`.

---

## Promozione a Medico (Firestore) 👨‍⚕️

Di default, tutti i nuovi utenti registrati vengono creati con il ruolo di **'genitore'**.
Per testare la Control Room Medica, devi elevare i permessi del tuo account:
1. Registrati normalmente sull'app.
2. Apri la [Firebase Console](https://console.firebase.google.com/).
3. Vai in **Firestore Database** -> collezione `accounts` -> seleziona il tuo UID.
4. Cambia il valore del campo `ruolo` da `genitore` a `medico`.
5. Ricarica l'applicazione: verrai reindirizzato in automatico alla rotta `/studio` (Control Room).

---

## Deploy in Produzione (Vercel) 🌍

TonsilCare è ottimizzata per il deploy *zero-config* su Vercel.

1.  Effettua il login su [Vercel](https://vercel.com/).
2.  Clicca su **"Add New Project"** e collega il tuo repository GitHub.
3.  Prima di cliccare "Deploy", apri la sezione **"Environment Variables"**.
4.  Inserisci **tutte** le chiavi Firebase che avevi configurato in `.env.local`.
5.  Clicca **Deploy**.

Vercel rileverà automaticamente Next.js, compilerà staticamente le pagine, verificherà lo schema TypeScript e metterà l'app online.

---

## Utilizzo (Walkthrough) 📖

*   **Lato Genitore:**
    1. Registrati e aggiungi i dati di base dell'utente (tuo figlio) inserendo la data dell'intervento.
    2. Usa la Dashboard per tenere sotto controllo i parametri, la fase post-operatoria odierna e leggere le comunicazioni mediche.
    3. Clicca su "+ Aggiungi Log Diario" ogni giorno per inserire temperatura e dolore.
*   **Lato Medico:**
    1. Una volta impostato il ruolo a 'medico', l'app mostrerà la Control Room.
    2. I pazienti sono elencati in ordine di triage: chi registra febbre/sanguinamento appare in cima alla lista, evidenziato in rosso.
    3. Clicca su un paziente per vedere il grafico storico dei suoi parametri vitali.
    4. Usa la chat integrata nella pagina del paziente per inviare nuove prescrizioni al genitore in tempo reale.

---
*Progetto sviluppato come supporto medico-domiciliare in tempo reale.*
