/**
 * @file src/types/index.ts
 * @description Definizioni TypeScript condivise per l'intera applicazione.
 * Tutti i tipi rispecchiano la struttura dei documenti Firestore.
 */

// ---------------------------------------------------------------------------
// Utente e Ruoli
// ---------------------------------------------------------------------------

export type UserRole = "genitore" | "medico";

export interface UserProfile {
  uid: string;
  email: string;
  nome: string;
  cognome: string;
  ruolo: UserRole;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Paziente
// ---------------------------------------------------------------------------

/** Fasi post-operatorie della tonsillectomia */
export type PostOpPhase =
  | "fase_1"   // Giorno 0–1: liquidi freddi
  | "fase_2"   // Giorno 2–4: semiliquidi
  | "fase_3"   // Giorno 5–7: morbidi
  | "fase_4"   // Giorno 8–10: transizione
  | "fase_5";  // Giorno 11+: ritorno alla normalità

/** Profilo paziente salvato in Firestore */
export interface PatientProfile {
  id: string;
  nome: string;
  cognome: string;
  dataNascita: string;        // ISO 8601
  dataOperazione: string;     // ISO 8601
  faseAttualeId: PostOpPhase;
  noteClinicare?: string;
  parenteUid: string;         // UID Firebase Auth del genitore
}

// ---------------------------------------------------------------------------
// Log Diario (parametri vitali)
// ---------------------------------------------------------------------------

/** Singola voce del diario clinico */
export interface DiaryLog {
  id: string;
  patientId: string;
  timestamp: string;          // ISO 8601
  temperatura?: number;       // °C
  dolore?: number;            // Scala 0–10
  sanguinamento: boolean;
  vomito: boolean;
  alimentazione?: string;     // Descrizione libera
  note?: string;
  createdByUid: string;
}

// ---------------------------------------------------------------------------
// Prescrizioni Mediche
// ---------------------------------------------------------------------------

export interface Prescrizione {
  id: string;
  patientId: string;
  testo: string;
  medicoUid: string;
  medicoNome: string;
  timestamp: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// Configurazione Firestore (data-driven, NON hardcodata nel frontend)
// ---------------------------------------------------------------------------

/** Soglie di alert medico — lette da Firestore > /config/alerts */
export interface MedicalAlerts {
  temperaturaMaxC: number;    // Es. 38.5
  doloreSoglia: number;       // Scala 0–10, es. 7
  oreMaxSenzaAlimentazione: number;
  messaggioEmergenza: string; // Es. "Chiama il pediatra se..."
}

/** Fase post-operatoria — letta da Firestore > /fasi/{faseId} */
export interface PostOpPhaseConfig {
  id: PostOpPhase;
  titolo: string;             // Es. "Fase 1 — Liquidi freddi"
  descrizione: string;
  giorniRange: [number, number]; // Es. [0, 1]
  consistenzaSuggerita: string;
  cibiConsigliati: string[];
  cibiVietati: string[];
  consigli: string[];
}

export type RecipeConsistenza = "Liquida" | "Semiliquida" | "Morbida" | "Solida";

/** Ricetta — letta da Firestore > /ricette/{ricettaId} */
export interface Recipe {
  id: string;
  titolo: string;
  descrizione: string;
  fasiCompatibili: PostOpPhase[];
  ingredienti: string[];
  istruzioni: string[];
  urlImmagine?: string;
  consistenza: RecipeConsistenza;
}

// ---------------------------------------------------------------------------
// Linee Guida (Info / FAQ)
// ---------------------------------------------------------------------------

/** Linea guida — letta da Firestore > /info/{id} */
export interface Guideline {
  id: string;
  titolo: string;
  contenuto: string;
  categoria: string;
  icona_opzionale?: string;
}

// ---------------------------------------------------------------------------
// Navigazione
// ---------------------------------------------------------------------------

/** Singola voce della Bottom Navigation Bar */
export interface NavItem {
  label: string;
  href: string;
  iconName: string;
}
