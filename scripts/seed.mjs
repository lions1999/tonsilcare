#!/usr/bin/env node
/**
 * @file scripts/seed.mjs
 * @description Popola le collezioni di contenuto e configurazione di Firestore.
 *
 * Perché uno script e non un pulsante nell'app: `/ricette`, `/info`, `/fasi` e
 * `/config` sono contenuto clinico e soglie, non dati dell'utente. Le regole li
 * hanno in sola lettura per il client, quindi il seeding passa dall'Admin SDK,
 * che le regole non le attraversa.
 *
 * È idempotente per costruzione: ogni documento ha un id derivato dal contenuto
 * (lo `slug`, o la chiave della fase), quindi rieseguirlo aggiorna invece di
 * duplicare. Il vecchio seed usava addDoc e a ogni click aggiungeva copie.
 *
 * AUTENTICAZIONE — Application Default Credentials:
 *
 *   gcloud auth application-default login
 *
 * Nessun file di credenziali nel repo.
 *
 * USO:
 *   node scripts/seed.mjs                      # tonsilcare-dev (default)
 *   node scripts/seed.mjs --dry-run            # mostra cosa scriverebbe
 *   node scripts/seed.mjs --project tonsilcare-app --conferma-produzione
 *
 * Su produzione il flag di conferma è obbligatorio: dev è il default in tutto
 * il progetto (vedi .firebaserc), e un seed lanciato per sbaglio su
 * tonsilcare-app sovrascriverebbe contenuti clinici reali.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const RADICE = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEV = "tonsilcare-dev";
const PROD = "tonsilcare-app";

// ---------------------------------------------------------------------------
// Argomenti
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const valoreDi = (nome) => {
  const i = argv.indexOf(nome);
  return i !== -1 ? argv[i + 1] : undefined;
};

const projectId = valoreDi("--project") ?? DEV;
const dryRun = argv.includes("--dry-run");
const confermaProduzione = argv.includes("--conferma-produzione");

if (projectId === PROD && !confermaProduzione) {
  console.error(
    `\nRifiuto di scrivere su ${PROD} senza --conferma-produzione.\n` +
      `È produzione: il seed sovrascrive contenuti clinici reali.\n`
  );
  process.exit(1);
}

const leggi = (nome) =>
  JSON.parse(readFileSync(join(RADICE, "seed-data", nome), "utf8"));

// ---------------------------------------------------------------------------
// Scrittura
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nProgetto:  ${projectId}${projectId === PROD ? "  ⚠️  PRODUZIONE" : ""}`);
  console.log(`Modalità:  ${dryRun ? "dry-run (nessuna scrittura)" : "scrittura"}\n`);

  const db = dryRun
    ? null
    : (initializeApp({ credential: applicationDefault(), projectId }),
      getFirestore());

  const ricette = leggi("ricette.json");
  const info = leggi("info.json");
  const fasi = leggi("fasi.json");
  const alerts = leggi("config-alerts.json");

  // Lo slug è l'id del documento e non un campo: ripeterlo dentro il documento
  // creerebbe due fonti per la stessa informazione, destinate a divergere.
  const documenti = [
    ...ricette.map(({ slug, ...dati }) => ["ricette", slug, dati]),
    ...info.map(({ slug, ...dati }) => ["info", slug, dati]),
    ...Object.entries(fasi).map(([id, dati]) => ["fasi", id, dati]),
    ["config", "alerts", alerts],
  ];

  for (const [collezione, id, dati] of documenti) {
    const percorso = `${collezione}/${id}`;
    if (dryRun) {
      console.log(`  [dry-run] ${percorso}  (${Object.keys(dati).length} campi)`);
      continue;
    }
    await db.collection(collezione).doc(id).set(dati);
    console.log(`  scritto   ${percorso}`);
  }

  console.log(`\n${documenti.length} documenti${dryRun ? " da scrivere" : " scritti"}.\n`);

  if (!dryRun) {
    // Rilettura indipendente: non ci si fida dell'assenza di errori in scrittura.
    console.log("Verifica per rilettura:");
    for (const [collezione] of [["ricette"], ["info"], ["fasi"], ["config"]]) {
      const snap = await db.collection(collezione).get();
      console.log(`  ${collezione}: ${snap.size} documenti`);
    }
    console.log("");
  }
}

main().catch((errore) => {
  console.error("\nSeed fallito:", errore.message);
  if (String(errore.message).includes("Could not load the default credentials")) {
    console.error("\nEsegui prima:  gcloud auth application-default login\n");
  }
  process.exit(1);
});
