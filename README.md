# TonsilCare PWA 🏥🍦

TonsilCare è una **Progressive Web App (PWA)** mobile-first dedicata al supporto domiciliare dei genitori di pazienti pediatrici sottoposti a tonsillectomia. L'app fornisce un diario clinico, una dashboard per il monitoraggio e un ricettario dinamico sincronizzato con Cloud Firestore.

## Caratteristiche Principali ✨

*   **Mobile-First e PWA:** UI ottimizzata per smartphone (Next.js 14 + Tailwind CSS). Installabile su Android/iOS (manifest, fallback offline).
*   **Completamente Data-Driven:** Ricette, linee guida, e soglie mediche lette in tempo reale da Cloud Firestore.
*   **Gestione Multi-Paziente:** Possibilità per un singolo genitore (tramite Firebase Auth) di registrare e monitorare più bambini contemporaneamente.
*   **Diario Clinico Intelligente:** Registrazione di temperatura, dolore (0-10) e sintomi post-operatori. Generazione di *alert medici* in caso di anomalie (es. febbre o sanguinamento).
*   **Ricettario Post-Operatorio:** Consultazione dinamica delle ricette idonee per le specifiche fasi del recupero (es. "Fase 1 - Liquidi", "Fase 2 - Morbidi").
*   **Push Notifications (Ready):** Struttura predisposta per l'invio di promemoria tramite Firebase Cloud Messaging.

---

## Stack Tecnologico 🛠

*   **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, TypeScript.
*   **Stato & Form:** React Hook Form + Zod (validazione rigorosa).
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
- **Firestore Database**: Crea il database in modalità produzione (le regole di sicurezza le imposteremo dopo).

Crea un file `.env.local` nella cartella principale del progetto copiando l'esempio `.env.local.example` e inserisci le tue chiavi Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY="tua-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="tuo-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="tuo-project"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="tuo-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="tuo-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="tuo-app-id"
```

### 4. Deploy delle Security Rules ed Indici (Firebase CLI)

Per proteggere il database e abilitare le query composte (es. ordinamento dei pazienti e dei log), fai il deploy delle configurazioni `firestore.rules` e `firestore.indexes.json` incluse nel repo.

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

## Deploy in Produzione (Vercel) 🌍

TonsilCare è ottimizzata per il deploy *zero-config* su Vercel.

1.  Effettua il login su [Vercel](https://vercel.com/).
2.  Clicca su **"Add New Project"** e collega il tuo repository GitHub.
3.  Prima di cliccare "Deploy", apri la sezione **"Environment Variables"**.
4.  Inserisci **tutte** le chiavi Firebase che avevi configurato in `.env.local` (`NEXT_PUBLIC_FIREBASE_API_KEY`, ecc.).
5.  Clicca **Deploy**.

Vercel rileverà automaticamente Next.js, compilerà staticamente le pagine, verificherà lo schema TypeScript e metterà l'app online (compresi i Service Worker per la PWA).

---

## Utilizzo (Walkthrough) 📖

1. **Registrazione:** Alla prima apertura, registrati usando email e password.
2. **Setup Paziente:** Inserisci nome e data dell'intervento del tuo bambino. Questo sblocca la Dashboard.
3. **Diario Clinico:** Clicca sul tasto '+' per registrare i parametri vitali di oggi (temperatura, dolore). Se la temperatura supera il limite imposto da Firestore (es. 38.5°C), comparirà un avviso medico d'emergenza.
4. **Esplora le Ricette:** Naviga nella sezione Ricette per visualizzare cibi adeguati alla fase post-operatoria in corso (Gelato, Brodo Tiepido, ecc.).

---
*Progetto sviluppato come Proof of Concept per il supporto medico-domiciliare.*
