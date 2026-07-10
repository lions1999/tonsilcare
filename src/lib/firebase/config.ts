/**
 * @file src/lib/firebase/config.ts
 * @description Inizializzazione e configurazione del client Firebase.
 *
 * ISTRUZIONI DI SETUP:
 * 1. Copia il file `.env.local.example` in `.env.local`
 * 2. Vai su https://console.firebase.google.com
 * 3. Crea un nuovo progetto "TonsilCare"
 * 4. In "Impostazioni progetto" > "Le tue app" > "App web", copia la config
 * 5. Incolla i valori nel file `.env.local`
 *
 * SICUREZZA: Non committare mai `.env.local` su Git!
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// ---------------------------------------------------------------------------
// Configurazione Firebase — letta dalle variabili d'ambiente
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // opzionale
};

// ---------------------------------------------------------------------------
// Singleton — Evita re-inizializzazione multipla in Next.js (Hot Module Reload)
// ---------------------------------------------------------------------------
const app: FirebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

// ---------------------------------------------------------------------------
// Servizi Firebase esportati per l'uso nell'app
// ---------------------------------------------------------------------------

/** Client Authentication (email/password, Google Sign-In, ecc.) */
export const auth: Auth = getAuth(app);

/** Istanza Firestore per lettura/scrittura di documenti */
export const db: Firestore = getFirestore(app);

/** L'istanza app principale (utile per servizi aggiuntivi come Storage) */
export default app;
