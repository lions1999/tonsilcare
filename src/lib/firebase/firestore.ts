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
  deleteField,
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
  // `uid` dopo lo spread. Il documento contiene un campo `uid` (lo scrive
  // signUp), e con lo spread dopo era quel campo a vincere sull'uid autenticato
  // ricevuto come argomento. Questa è la collezione da cui le regole leggono
  // `ruolo`: l'identità con cui l'app lavora deve venire dal chiamante
  // autenticato, mai da un valore scritto dentro al documento.
  return { ...snap.data(), uid } as AccountProfile;
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

/**
 * Nessun campo `faseAttualeId`: la fase non si salva, si deriva da
 * `dataOperazione` e dagli intervalli di /fasi (vedi lib/utils/fase.ts).
 */
export interface CreateUtenteData {
  nome: string;
  cognome: string;
  dataNascita: string;
  dataOperazione: string;
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
  const utenti = snap.docs.map((d) => ({ ...d.data(), id: d.id })) as UtenteProfile[];
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
  return snap.docs.map((d) => ({ ...d.data(), id: d.id })) as UtenteProfile[];
}

/**
 * Recupera un singolo utente operato per ID.
 */
export async function getUtente(utenteId: string): Promise<UtenteProfile | null> {
  const snap = await getDoc(doc(db, "utenti", utenteId));
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as UtenteProfile;
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
 * Forza la fase post-operatoria di un paziente, scavalcando il calcolo
 * automatico. Riservata al medico: le regole rifiutano questi campi sia da un
 * genitore sia da un medico che provi a firmarli con l'uid di un collega.
 *
 * `faseOverrideIl` è una stringa ISO scritta dal client e non un
 * `serverTimestamp()`, come già fa `addPrescrizione`: serve solo per mostrare
 * "forzata il ...", e una stringa evita la conversione del Timestamp in
 * lettura — la stessa che nel diario ha richiesto un caso a parte.
 */
export async function setFaseOverride(
  utenteId: string,
  medicoUid: string,
  faseOverride: PostOpPhase,
  motivo: string
): Promise<void> {
  await updateDoc(doc(db, "utenti", utenteId), {
    faseOverride,
    faseOverrideMotivo: motivo,
    faseOverrideDa: medicoUid,
    faseOverrideIl: new Date().toISOString(),
  });
}

/**
 * Rimuove il forzamento e restituisce il paziente al calcolo automatico.
 * I campi vengono cancellati, non azzerati: la loro ASSENZA è il segnale di
 * "fase automatica", e un `faseOverride: null` residuo sarebbe uno stato in più
 * da interpretare in lettura.
 */
export async function clearFaseOverride(utenteId: string): Promise<void> {
  await updateDoc(doc(db, "utenti", utenteId), {
    faseOverride: deleteField(),
    faseOverrideMotivo: deleteField(),
    faseOverrideDa: deleteField(),
    faseOverrideIl: deleteField(),
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
 * Restituisce null se il documento non esiste, o se esiste ma le soglie non
 * sono utilizzabili.
 *
 * Perché "inutilizzabile" viene trattato come "assente": qui prima si faceva
 * `snap.data() as MedicalAlerts`, un cast senza controlli. Con `temperaturaMaxC`
 * mancante, `log.temperatura >= undefined` è `false` SEMPRE — le allerte di
 * temperatura sparivano in silenzio mentre quelle di dolore continuavano a
 * funzionare, cioè una lista che sembra viva mentre metà del triage è spento.
 * Restituendo null quella silenziosità parziale e muta diventa totale e
 * annunciata: la Control Room mostra l'avviso "triage disattivato".
 *
 * Si controllano solo i due campi che le soglie usano davvero.
 * `messaggioEmergenza` NON è validato di proposito: è testo per il banner del
 * genitore, non una soglia, e spegnere il triage del medico per una stringa che
 * il medico non vede sarebbe sproporzionato.
 *
 * La sua assenza è gestita dove vive il banner: `AlertBanner` in
 * DashboardContent non compare affatto, invece di restare col titolo e un
 * paragrafo di altezza zero. Non spostare quel controllo qui: renderebbe
 * `null` l'intera configurazione, cioè spegnerebbe il triage del medico per una
 * stringa che riguarda solo il genitore.
 *
 * Nessun client può produrre questo stato — /config è `write: if false` — ma
 * una modifica da Console o Admin SDK sì.
 */
export async function getMedicalAlerts(): Promise<MedicalAlerts | null> {
  const snap = await getDoc(doc(db, "config", "alerts"));
  if (!snap.exists()) return null;

  const dati = snap.data();
  const sogliaInutilizzabile = (valore: unknown) =>
    typeof valore !== "number" || !Number.isFinite(valore);

  const campiNonValidi = (["temperaturaMaxC", "doloreSoglia"] as const).filter(
    (campo) => sogliaInutilizzabile(dati[campo])
  );

  if (campiNonValidi.length > 0) {
    console.error(
      "[getMedicalAlerts] /config/alerts esiste ma non è utilizzabile: " +
        `${campiNonValidi.join(", ")} ` +
        `${campiNonValidi.length > 1 ? "non sono numeri validi" : "non è un numero valido"}. ` +
        "Il triage resta disattivato finché non viene corretto " +
        "(`node scripts/seed.mjs`).",
      dati
    );
    return null;
  }

  return dati as MedicalAlerts;
}

/**
 * Recupera TUTTE le fasi post-operatorie da /fasi, ordinate per giorno d'inizio.
 * Restituisce un array vuoto se la collezione non è ancora stata popolata.
 *
 * Legge l'intera collezione e non un singolo documento perché la fase non è più
 * un id salvato sul paziente: si deriva confrontando il giorno post-operatorio
 * con i `giorniRange`, e per farlo servono tutti gli intervalli.
 */
export async function getAllPhaseConfigs(): Promise<PostOpPhaseConfig[]> {
  const snap = await getDocs(collection(db, "fasi"));
  const fasi = snap.docs.map((d) => ({ ...d.data(), id: d.id })) as PostOpPhaseConfig[];
  return fasi.sort((a, b) => a.giorniRange[0] - b.giorniRange[0]);
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
    // `createdAt` DEVE restare dopo lo spread: qui l'override è voluto, perché
    // sostituisce il Timestamp di Firestore con la stringa ISO. `id` invece va
    // dopo lo spread per la ragione opposta — che nessun campo salvato possa
    // vincere sull'id vero del documento. Non "uniformare" spostando createdAt
    // prima: la conversione salterebbe senza errori, e il tipo DailyLog dice
    // comunque `string`.
    return { ...data, id: d.id, createdAt: createdAtStr } as DailyLog;
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
  
  // Stesso ordine di getUtenteLogs, per la stessa ragione: `id` dopo lo spread
  // perché l'id del documento non sia sovrascrivibile da un campo salvato,
  // `createdAt` dopo perché lì l'override (Timestamp → stringa ISO) è voluto.
  return { ...data, id: d.id, createdAt: createdAtStr } as DailyLog;
}

/**
 * Recupera i log delle ultime `ore` ore, dal più recente, insieme all'ultimo
 * log in assoluto.
 *
 * Serve alla Control Room, che prima leggeva un solo log per paziente
 * (`getLatestLog`) e valutava le soglie su quello: una misura rientrata
 * cancellava quella fuori soglia registrata poche ore prima. Restituisce anche
 * `latestLog` perché la card mostra comunque l'ultimo rilevamento, che dentro
 * la finestra può non essere quello che ha acceso l'allerta.
 *
 * Costo: **una query per paziente, come prima**. Se la finestra non è vuota, il
 * suo primo elemento è anche l'ultimo log in assoluto, quindi la seconda query
 * parte solo per i pazienti che non registrano da più di `ore` ore.
 *
 * ⚠️ Quell'ottimizzazione poggia su un'assunzione che questo file altrove NON
 * garantisce: che ogni log abbia `createdAt`. Un documento con quel campo
 * assente (scrittura interrotta) è invisibile al filtro di disuguaglianza, e se
 * fosse proprio lui il più recente `latestLog` sarebbe sbagliato — mentre
 * `getUtenteLogs`, che il campo mancante lo tollera fabbricando `now`, lo
 * mostrerebbe comunque nello storico. Due comportamenti divergenti sullo stesso
 * dato. Non corretto qui: sistemarlo vuol dire decidere cosa significa un log
 * senza istante, non aggiungere un ramo.
 *
 * `where` e `orderBy` insistono sullo stesso campo, quindi basta l'indice a
 * campo singolo automatico: `firestore.indexes.json` resta vuoto.
 */
export async function getLogsFinestraAlert(
  utenteId: string,
  ore: number
): Promise<{ logs: DailyLog[]; latestLog: DailyLog | null }> {
  const inizioFinestra = new Date(Date.now() - ore * 60 * 60 * 1000);

  const snap = await getDocs(
    query(
      collection(db, "utenti", utenteId, "diario"),
      where("createdAt", ">=", inizioFinestra),
      orderBy("createdAt", "desc")
    )
  );

  const logs = snap.docs.map((d) => {
    const data = d.data();
    // Stesso ordine di getUtenteLogs e per le stesse due ragioni opposte: `id`
    // dopo lo spread perché nessun campo salvato possa vincere sull'id vero,
    // `createdAt` dopo perché lì l'override (Timestamp → stringa ISO) è voluto.
    // Qui il campo c'è per costruzione: senza, il documento non sarebbe passato
    // dal filtro di disuguaglianza.
    return {
      ...data,
      id: d.id,
      createdAt: data.createdAt.toDate().toISOString(),
    } as DailyLog;
  });

  if (logs.length > 0) return { logs, latestLog: logs[0] };

  // Finestra vuota: il paziente non registra da un pezzo, ma la card mostra
  // comunque l'ultimo rilevamento e l'ordinamento della lista lo usa come
  // criterio di recency.
  return { logs, latestLog: await getLatestLog(utenteId) };
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
  return snap.docs.map((d) => ({ ...d.data(), id: d.id })) as Prescrizione[];
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
  return snap.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Recipe[];
}

/**
 * Recupera una ricetta specifica per ID
 */
export async function getRecipeById(id: string): Promise<Recipe | null> {
  const snap = await getDoc(doc(db, "ricette", id));
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as Recipe;
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
  return snap.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Guideline[];
}
