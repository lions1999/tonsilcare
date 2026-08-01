/**
 * @file src/lib/firebase/firestore.ts
 * @description Helper Firestore per le operazioni CRUD sui pazienti.
 *
 * ARCHITETTURA COLLEZIONI:
 * - /accounts/{uid}         → profilo genitore/medico
 * - /utenti/{utenteId}      → profilo utente operato (1 account → N utenti)
 * - /fasi/{faseId}          → config fase post-op (read-only, gestita da admin)
 * - /config/alerts          → soglie alert medico (read-only, gestita da admin)
 * - /ricette/{id}           → ricette (read-only, gestita da admin)
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
  type QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./config";
import type {
  UtenteProfile,
  PostOpPhase,
  PostOpPhaseConfig,
  MedicalAlerts,
  AccountProfile,
  Prescrizione,
  TipoIntervento,
} from "@/types";

// ---------------------------------------------------------------------------
// Profilo Account (genitore/medico)
// ---------------------------------------------------------------------------

/**
 * Recupera il profilo account da Firestore.
 */
export async function getAccountProfile(uid: string): Promise<AccountProfile | null> {
  const snap = await getDoc(doc(db, "accounts", uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as AccountProfile;
}

/**
 * Segnala al genitore che è arrivata una nuova prescrizione non ancora vista.
 * Chiamata dal client medico dopo addPrescrizione.
 */
export async function markRispostaMedicoNonLetta(accountId: string): Promise<void> {
  await updateDoc(doc(db, "accounts", accountId), {
    haRispostaMedicoNonLetta: true,
  });
}

/**
 * Azzera il flag "risposta medico non letta" sul proprio account.
 * Chiamata dal client genitore su un'azione esplicita di consultazione.
 */
export async function clearRispostaMedicoNonLetta(accountId: string): Promise<void> {
  await updateDoc(doc(db, "accounts", accountId), {
    haRispostaMedicoNonLetta: false,
  });
}

// ---------------------------------------------------------------------------
// Utenti Operati
// ---------------------------------------------------------------------------

export interface CreateUtenteData {
  nome: string;
  cognome: string;
  dataNascita: string;
  dataOperazione: string;
  faseAttualeId: PostOpPhase;
  noteClinica?: string;
  tipoIntervento?: TipoIntervento;
  pesoIniziale?: number;
  altezza?: number;
  allergieIntolleranze?: string[];
  patologieAssociate?: string[];
}

/**
 * Recupera tutti gli utenti operati dell'account corrente, ordinati per data operazione.
 */
export async function getUtenti(accountId: string): Promise<UtenteProfile[]> {
  const q = query(
    collection(db, "utenti"),
    where("accountId", "==", accountId)
  );
  const snap: QuerySnapshot<DocumentData> = await getDocs(q);
  const utenti = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as UtenteProfile[];
  return utenti.sort((a, b) => {
    return new Date(b.dataOperazione).getTime() - new Date(a.dataOperazione).getTime();
  });
}

/**
 * Recupera TUTTI gli utenti (solo per medici).
 */
export async function getAllUtenti(): Promise<UtenteProfile[]> {
  const q = query(collection(db, "utenti"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as UtenteProfile[];
}

/**
 * Recupera un singolo utente operato per ID.
 */
export async function getUtente(utenteId: string): Promise<UtenteProfile | null> {
  const snap = await getDoc(doc(db, "utenti", utenteId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as UtenteProfile;
}

/**
 * Crea un nuovo utente operato su Firestore.
 * Restituisce l'ID del documento creato.
 */
export async function addUtente(
  accountId: string,
  data: CreateUtenteData
): Promise<string> {
  const docRef = await addDoc(collection(db, "utenti"), {
    ...data,
    accountId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Aggiorna la fase post-operatoria di un utente.
 */
export async function updateUtentePhase(
  utenteId: string,
  faseAttualeId: PostOpPhase
): Promise<void> {
  await updateDoc(doc(db, "utenti", utenteId), {
    faseAttualeId,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Elimina un utente operato.
 */
export async function deleteUtente(utenteId: string): Promise<void> {
  await deleteDoc(doc(db, "utenti", utenteId));
}

// ---------------------------------------------------------------------------
// Configurazione medica — data-driven da Firestore (read-only per il client)
// ---------------------------------------------------------------------------

/**
 * Recupera le soglie di alert medico da /config/alerts.
 * Restituisce null se il documento non è ancora stato creato su Firestore.
 */
export async function getMedicalAlerts(): Promise<MedicalAlerts | null> {
  const snap = await getDoc(doc(db, "config", "alerts"));
  if (!snap.exists()) return null;
  return snap.data() as MedicalAlerts;
}

/**
 * Recupera la configurazione di una fase post-operatoria da /fasi/{faseId}.
 * Restituisce null se il documento non è ancora stato creato su Firestore.
 */
export async function getPhaseConfig(
  faseId: PostOpPhase
): Promise<PostOpPhaseConfig | null> {
  const snap = await getDoc(doc(db, "fasi", faseId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as PostOpPhaseConfig;
}

// ---------------------------------------------------------------------------
// Diario Clinico (Logs)
// ---------------------------------------------------------------------------

import type { DailyLogFormData, DailyLog } from "../validations/diary";
import { limit } from "firebase/firestore";

/**
 * Rimuove le chiavi con valore `undefined` da un oggetto. Firestore rifiuta
 * `undefined` come valore di campo in addDoc/setDoc (a differenza di `null`),
 * quindi i campi opzionali non compilati vanno omessi esplicitamente invece
 * di essere inviati con valore `undefined`.
 */
function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

/**
 * Aggiunge un log giornaliero nella sub-collection /diario dell'utente.
 */
export async function addDailyLog(
  utenteId: string,
  uid: string,
  logData: DailyLogFormData
): Promise<string> {
  const logsRef = collection(db, "utenti", utenteId, "diario");
  const docRef = await addDoc(logsRef, {
    ...omitUndefined(logData),
    createdByUid: uid,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Segnala al medico che è stato inserito un nuovo log diario non ancora
 * visualizzato in Control Room. Chiamata dal client genitore dopo addDailyLog.
 */
export async function markNuovoLogNonLetto(utenteId: string): Promise<void> {
  await updateDoc(doc(db, "utenti", utenteId), {
    haNuovoLogNonLetto: true,
  });
}

/**
 * Azzera il flag "nuovo log non letto". Chiamata dal client medico quando
 * apre la scheda di questo paziente.
 */
export async function clearNuovoLogNonLetto(utenteId: string): Promise<void> {
  await updateDoc(doc(db, "utenti", utenteId), {
    haNuovoLogNonLetto: false,
  });
}

/**
 * Recupera lo storico dei log di un utente (dal più recente).
 */
export async function getUtenteLogs(utenteId: string): Promise<DailyLog[]> {
  const q = query(
    collection(db, "utenti", utenteId, "diario"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    let createdAtStr = new Date().toISOString();
    if (data.createdAt && data.createdAt.toDate) {
      createdAtStr = data.createdAt.toDate().toISOString();
    }
    return { id: d.id, ...data, createdAt: createdAtStr } as DailyLog;
  });
}

/**
 * Recupera l'ultimo log registrato per un utente (ordinato per data decrescente).
 */
export async function getLatestLog(utenteId: string): Promise<DailyLog | null> {
  const q = query(
    collection(db, "utenti", utenteId, "diario"),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  
  const snap = await getDocs(q);
  if (snap.empty) return null;
  
  const d = snap.docs[0];
  
  // Per gestire correttamente la data:
  const data = d.data();
  let createdAtStr = new Date().toISOString();
  if (data.createdAt && data.createdAt.toDate) {
    createdAtStr = data.createdAt.toDate().toISOString();
  }
  
  return { id: d.id, ...data, createdAt: createdAtStr } as DailyLog;
}

// ---------------------------------------------------------------------------
// Prescrizioni Mediche
// ---------------------------------------------------------------------------

/**
 * Aggiunge una prescrizione per un utente.
 */
export async function addPrescrizione(
  utenteId: string,
  medicoUid: string,
  medicoNome: string,
  testo: string
): Promise<string> {
  const prescRef = collection(db, "utenti", utenteId, "prescrizioni");
  const docRef = await addDoc(prescRef, {
    utenteId,
    medicoUid,
    medicoNome,
    testo,
    timestamp: new Date().toISOString(),
  });
  return docRef.id;
}

/**
 * Recupera le prescrizioni di un utente, ordinate dalla più recente.
 */
export async function getPrescrizioni(utenteId: string): Promise<Prescrizione[]> {
  const q = query(
    collection(db, "utenti", utenteId, "prescrizioni"),
    orderBy("timestamp", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Prescrizione[];
}

// ---------------------------------------------------------------------------
// Ricettario Dinamico (Sprint 4)
// ---------------------------------------------------------------------------

import type { Recipe } from "@/types";

/**
 * Recupera tutte le ricette da Firestore
 */
export async function getRecipes(): Promise<Recipe[]> {
  const q = query(collection(db, "ricette"));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Recipe[];
}

/**
 * Recupera una ricetta specifica per ID
 */
export async function getRecipeById(id: string): Promise<Recipe | null> {
  const snap = await getDoc(doc(db, "ricette", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Recipe;
}


// ---------------------------------------------------------------------------
// Sezione Info / Linee Guida (Sprint 5)
// ---------------------------------------------------------------------------

import type { Guideline } from "@/types";

/**
 * Recupera tutte le linee guida da Firestore
 */
export async function getGuidelines(): Promise<Guideline[]> {
  const q = query(collection(db, "info"));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Guideline[];
}
