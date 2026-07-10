/**
 * @file src/lib/firebase/firestore.ts
 * @description Helper Firestore per le operazioni CRUD sui pazienti.
 *
 * ARCHITETTURA COLLEZIONI:
 * - /utenti/{uid}           → profilo genitore
 * - /pazienti/{patientId}   → profilo paziente (1 genitore → N pazienti)
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
  PatientProfile,
  PostOpPhase,
  PostOpPhaseConfig,
  MedicalAlerts,
  UserProfile,
  Prescrizione,
} from "@/types";

// ---------------------------------------------------------------------------
// Profilo Utente (genitore/medico)
// ---------------------------------------------------------------------------

/**
 * Recupera il profilo utente da Firestore.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "utenti", uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as UserProfile;
}

// ---------------------------------------------------------------------------
// Pazienti
// ---------------------------------------------------------------------------

export interface CreatePatientData {
  nome: string;
  cognome: string;
  dataNascita: string;
  dataOperazione: string;
  faseAttualeId: PostOpPhase;
  noteClinica?: string;
}

/**
 * Recupera tutti i pazienti del genitore corrente, ordinati per data creazione.
 */
export async function getPatients(parenteUid: string): Promise<PatientProfile[]> {
  const q = query(
    collection(db, "pazienti"),
    where("parenteUid", "==", parenteUid)
    // orderBy("createdAt", "desc") — riabilitare dopo che l'indice composito è pronto
    // (firebase deploy --only firestore:indexes — attende ~2 minuti)
  );
  const snap: QuerySnapshot<DocumentData> = await getDocs(q);
  // Sort client-side nel frattempo
  const patients = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PatientProfile[];
  return patients.sort((a, b) => {
    // Ordina per data operazione decrescente come fallback
    return new Date(b.dataOperazione).getTime() - new Date(a.dataOperazione).getTime();
  });
}

/**
 * Recupera TUTTI i pazienti (solo per medici).
 */
export async function getAllPatients(): Promise<PatientProfile[]> {
  const q = query(collection(db, "pazienti"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PatientProfile[];
}

/**
 * Recupera un singolo paziente per ID.
 */
export async function getPatient(patientId: string): Promise<PatientProfile | null> {
  const snap = await getDoc(doc(db, "pazienti", patientId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as PatientProfile;
}

/**
 * Crea un nuovo paziente su Firestore.
 * Alias: addPatient (richiesto dallo Sprint 2).
 * Restituisce l'ID del documento creato.
 */
export async function addPatient(
  parenteUid: string,
  data: CreatePatientData
): Promise<string> {
  const docRef = await addDoc(collection(db, "pazienti"), {
    ...data,
    parenteUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/** @deprecated Usa addPatient */
export const createPatient = addPatient;

/**
 * Aggiorna la fase post-operatoria di un paziente.
 */
export async function updatePatientPhase(
  patientId: string,
  faseAttualeId: PostOpPhase
): Promise<void> {
  await updateDoc(doc(db, "pazienti", patientId), {
    faseAttualeId,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Elimina un paziente.
 * ATTENZIONE: non elimina i log della sotto-collezione (richiede Cloud Function).
 */
export async function deletePatient(patientId: string): Promise<void> {
  await deleteDoc(doc(db, "pazienti", patientId));
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
 * Aggiunge un log giornaliero nella sub-collection /logs del paziente.
 */
export async function addDailyLog(
  patientId: string,
  uid: string,
  logData: DailyLogFormData
): Promise<string> {
  const logsRef = collection(db, "pazienti", patientId, "logs");
  const docRef = await addDoc(logsRef, {
    ...logData,
    createdByUid: uid,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Recupera lo storico dei log di un paziente (dal più recente).
 */
export async function getPatientLogs(patientId: string): Promise<DailyLog[]> {
  const q = query(
    collection(db, "pazienti", patientId, "logs"),
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
 * Recupera l'ultimo log registrato per un paziente (ordinato per data decrescente).
 */
export async function getLatestLog(patientId: string): Promise<DailyLog | null> {
  const q = query(
    collection(db, "pazienti", patientId, "logs"),
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
 * Aggiunge una prescrizione per un paziente.
 */
export async function addPrescrizione(
  patientId: string,
  medicoUid: string,
  medicoNome: string,
  testo: string
): Promise<string> {
  const prescRef = collection(db, "pazienti", patientId, "prescrizioni");
  const docRef = await addDoc(prescRef, {
    patientId,
    medicoUid,
    medicoNome,
    testo,
    timestamp: new Date().toISOString(),
  });
  return docRef.id;
}

/**
 * Recupera le prescrizioni di un paziente, ordinate dalla più recente.
 */
export async function getPrescrizioni(patientId: string): Promise<Prescrizione[]> {
  const q = query(
    collection(db, "pazienti", patientId, "prescrizioni"),
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

/**
 * Funzione temporanea per il seeding di Firestore.
 * Popola la collezione "ricette" con 3 elementi fittizi.
 */
export async function seedInitialRecipes(): Promise<void> {
  const initialRecipes: Omit<Recipe, "id">[] = [
    {
      titolo: "Ghiacciolo alla Frutta",
      descrizione: "Ghiaccioli fatti in casa, perfetti per alleviare il dolore post-operatorio. Senza pezzi per evitare fastidi.",
      fasiCompatibili: ["fase_1", "fase_2"],
      ingredienti: [
        "100ml Succo di mela limpido",
        "100ml Acqua",
        "Formine per ghiaccioli"
      ],
      istruzioni: [
        "Mescola il succo di mela con l'acqua in una caraffa.",
        "Versa il liquido nelle formine per ghiaccioli.",
        "Riponi nel congelatore per almeno 4 ore o fino a completa solidificazione.",
        "Servi al bambino quando avverte fastidio."
      ],
      urlImmagine: "https://images.unsplash.com/photo-1558222625-cd1976092040?q=80&w=600&auto=format&fit=crop",
      consistenza: "Liquida"
    },
    {
      titolo: "Passato di Verdure Tiepido",
      descrizione: "Una vellutata leggera e nutriente, servita rigorosamente tiepida o a temperatura ambiente.",
      fasiCompatibili: ["fase_2", "fase_3"],
      ingredienti: [
        "1 Patata dolce",
        "1 Carota",
        "1 Zucchina piccola",
        "Brodo vegetale freddo o tiepido q.b."
      ],
      istruzioni: [
        "Pulisci e taglia a tocchetti le verdure.",
        "Fai bollire le verdure finché non sono morbidissime.",
        "Scola le verdure e frullale aggiungendo poco brodo fino ad ottenere una crema liscia senza grumi.",
        "LASCIA RAFFREDDARE completamente fino a temperatura ambiente o tiepida prima di servire."
      ],
      urlImmagine: "https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=600&auto=format&fit=crop",
      consistenza: "Semiliquida"
    },
    {
      titolo: "Frullato di Banana e Yogurt",
      descrizione: "Fresco, nutriente e saziante. Ottimo come spuntino morbido e freddo.",
      fasiCompatibili: ["fase_2", "fase_3", "fase_4"],
      ingredienti: [
        "1 Banana molto matura",
        "125g Yogurt bianco dolce freddo da frigo",
        "Poco latte per allungare se necessario"
      ],
      istruzioni: [
        "Sbuccia la banana e tagliala a fette sottili.",
        "Metti la banana e lo yogurt nel frullatore.",
        "Frulla alla massima velocità fino a ottenere un composto omogeneo.",
        "Se risulta troppo denso, aggiungi un goccio di latte freddo.",
        "Servi in un bicchiere largo (senza cannuccia, che potrebbe creare vuoto e sforzare la gola)."
      ],
      urlImmagine: "https://images.unsplash.com/photo-1553530666-ba11a90a2a47?q=80&w=600&auto=format&fit=crop",
      consistenza: "Morbida"
    }
  ];

  const ricetteRef = collection(db, "ricette");
  
  for (const recipe of initialRecipes) {
    await addDoc(ricetteRef, recipe);
  }
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

/**
 * Funzione temporanea per il seeding di Firestore.
 * Popola la collezione "info" con alcune FAQ fittizie essenziali.
 */
export async function seedInitialGuidelines(): Promise<void> {
  const initialGuidelines: Omit<Guideline, "id">[] = [
    {
      titolo: "Gestione del dolore notturno",
      contenuto: "Il dolore tende a peggiorare durante la notte. Assicurati di dare l'antidolorifico prescritto esattamente agli orari indicati, anche se significa svegliare il bambino. Fai bere un sorso d'acqua prima e dopo la somministrazione per mantenere la gola umida.",
      categoria: "Dolore",
      icona_opzionale: "Activity"
    },
    {
      titolo: "Cosa fare in caso di sanguinamento",
      contenuto: "Un leggero striato di sangue nella saliva o nel naso può essere normale nei primi giorni. Se invece noti sangue rosso vivo abbondante (sputo o vomito), recati immediatamente in Pronto Soccorso o chiama il 112. Nel frattempo, fai fare gargarismi con acqua ghiacciata o tieni del ghiaccio sul collo.",
      categoria: "Emergenze",
      icona_opzionale: "AlertTriangle"
    },
    {
      titolo: "Quando reintrodurre cibi solidi?",
      contenuto: "Dipende dalla fase di guarigione, ma in media intorno al 10°-12° giorno, previa visita di controllo. Non avere fretta: biscotti, fette biscottate e cibi taglienti possono graffiare la ferita causando emorragie tardive. Procedi gradualmente con cibi sempre più densi ma morbidi.",
      categoria: "Alimentazione",
      icona_opzionale: "Utensils"
    },
    {
      titolo: "Gestione della febbre",
      contenuto: "Una febbricola (fino a 38°C) è comune nei primi giorni. Se supera i 38.5°C, non scende con i farmaci o persiste oltre il terzo giorno, contatta il pediatra per escludere eventuali sovrainfezioni batteriche.",
      categoria: "Sintomi",
      icona_opzionale: "Thermometer"
    }
  ];

  const infoRef = collection(db, "info");
  
  for (const guide of initialGuidelines) {
    await addDoc(infoRef, guide);
  }
}
