#!/usr/bin/env node
/**
 * @file scripts/verifica-rules.mjs
 * @description Rilegge le regole Firestore PUBBLICATE e le confronta con
 * `firestore.rules` del repo.
 *
 * Perché serve: l'output di `firebase deploy` dice che il comando è arrivato in
 * fondo, non cosa sta girando. La CLI non ha un modo per rileggere le regole
 * pubblicate; la Rules REST API sì. Un deploy "riuscito" verso il progetto
 * sbagliato, o un file non salvato, producono lo stesso output verde.
 *
 * Due controlli, non uno:
 *  1. il testo pubblicato coincide con quello del repo (hash + diff per righe);
 *  2. alcuni MARCATORI esistono davvero nel testo pubblicato. Il confronto da
 *     solo dice se i due file sono uguali, non se sono giusti: se qualcuno
 *     cancella una regola e committa, hash identici e protezione sparita. I
 *     marcatori sono le regole cui teniamo di più, elencate qui sotto.
 *
 * AUTENTICAZIONE — Application Default Credentials, le stesse di seed.mjs:
 *
 *   gcloud auth application-default login
 *
 * `gcloud` non finisce sul PATH quando è installato con winget: lo script lo
 * cerca sotto %LOCALAPPDATA%. Il percorso contiene spazi, da cui le virgolette.
 * Si può forzare con la variabile d'ambiente GCLOUD_CMD.
 *
 * USO:
 *   node scripts/verifica-rules.mjs                              # tonsilcare-dev
 *   node scripts/verifica-rules.mjs --project tonsilcare-app     # produzione
 *
 * Esce con 0 se tutto coincide, 1 se c'è una differenza o manca un marcatore:
 * si può incatenare a un deploy.
 */

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RADICE = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEV = "tonsilcare-dev";
const PROD = "tonsilcare-app";

const argv = process.argv.slice(2);
const valoreDi = (nome) => {
  const i = argv.indexOf(nome);
  return i !== -1 ? argv[i + 1] : undefined;
};
const projectId = valoreDi("--project") ?? DEV;

/**
 * Regole che devono esistere nel testo PUBBLICATO. Ognuna è costata un bug o un
 * audit: se una sparisce, l'app continua a funzionare e nessuno se ne accorge.
 * Aggiungere una voce quando si aggiunge una protezione che conta.
 */
const MARCATORI = [
  [
    "allowlist sui campi di /accounts (senza, un genitore si promuove a medico)",
    /hasOnly\(\['nome', 'cognome', 'haRispostaMedicoNonLetta', 'updatedAt'\]\)/,
  ],
  [
    "il diario non si modifica dopo l'invio",
    /allow update: if false;/,
  ],
  [
    "/ricette e /info non scrivibili dal client",
    /allow write: if false;/,
  ],
  [
    "l'account non può riassegnare un paziente a un altro account",
    /request\.resource\.data\.accountId == resource\.data\.accountId/,
  ],
  [
    "solo il medico scrive i campi faseOverride*",
    /hasOnly\(\['faseOverride', 'faseOverrideMotivo', 'faseOverrideDa', 'faseOverrideIl'\]\)/,
  ],
  [
    "il genitore non può toccare i faseOverride*",
    /hasAny\(\['faseOverride', 'faseOverrideMotivo', 'faseOverrideDa', 'faseOverrideIl'\]\)/,
  ],
  [
    "chi forza una fase la firma col proprio uid",
    /faseOverrideDa == request\.auth\.uid/,
  ],
];

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

function accessToken() {
  const gcloud =
    process.env.GCLOUD_CMD ??
    `${process.env.LOCALAPPDATA}\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd`;
  try {
    return execFileSync(
      `"${gcloud}"`,
      ["auth", "application-default", "print-access-token"],
      { encoding: "utf8", shell: true, stdio: ["ignore", "pipe", "pipe"] }
    ).trim();
  } catch {
    console.error(
      `\nNon riesco a ottenere un token da gcloud.\n` +
        `Cercato in: ${gcloud}\n` +
        `Se è installato altrove: GCLOUD_CMD="<percorso>" node scripts/verifica-rules.mjs\n` +
        `Se non hai ancora le credenziali: gcloud auth application-default login\n`
    );
    process.exit(2);
  }
}

// ---------------------------------------------------------------------------
// Confronto
// ---------------------------------------------------------------------------

// Ignora la sola convenzione di fine riga: git normalizza CRLF/LF in questo
// repo, e quella non è una differenza di regole.
const norm = (s) => s.replace(/\r\n/g, "\n");
const sha = (s) => createHash("sha256").update(norm(s), "utf8").digest("hex");

async function main() {
  const token = accessToken();
  const intestazioni = {
    Authorization: `Bearer ${token}`,
    "x-goog-user-project": projectId,
  };

  const chiama = async (url) => {
    const risposta = await fetch(url, { headers: intestazioni });
    if (!risposta.ok) {
      console.error(`\n${risposta.status} da ${url}\n${await risposta.text()}\n`);
      process.exit(2);
    }
    return risposta.json();
  };

  const releases = await chiama(
    `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`
  );
  const rilascio = releases.releases?.find((r) => r.name.endsWith("/cloud.firestore"));
  if (!rilascio) {
    console.error(`\nNessun rilascio cloud.firestore su ${projectId}.\n`);
    process.exit(2);
  }

  const ruleset = await chiama(
    `https://firebaserules.googleapis.com/v1/${rilascio.rulesetName}`
  );

  // Il confronto va fatto sui byte UTF-8. Un round-trip via PowerShell legge
  // l'UTF-8 come ANSI e storpia gli accenti nei commenti, facendo sembrare
  // diverse due regole identiche: è già successo su questo progetto.
  const pubblicato = ruleset.source.files[0].content;
  const locale = readFileSync(join(RADICE, "firestore.rules"), "utf8");

  const righeP = norm(pubblicato).split("\n");
  const righeL = norm(locale).split("\n");

  const differenze = [];
  for (let i = 0; i < Math.max(righeP.length, righeL.length); i++) {
    if (righeP[i] !== righeL[i]) differenze.push(i + 1);
  }

  console.log(`\nProgetto:    ${projectId}${projectId === PROD ? "  ⚠️  PRODUZIONE" : ""}`);
  console.log(`Ruleset:     ${rilascio.rulesetName.split("/").pop()}`);
  console.log(`Pubblicato:  ${rilascio.updateTime}`);
  console.log(`Righe:       ${righeP.length} pubblicate, ${righeL.length} locali`);
  console.log(`sha256:      ${sha(pubblicato).slice(0, 16)} pubblicato`);
  console.log(`             ${sha(locale).slice(0, 16)} locale`);

  if (differenze.length > 0) {
    console.log(`\n✗ ${differenze.length} righe diverse:\n`);
    for (const n of differenze.slice(0, 10)) {
      console.log(`  riga ${n}`);
      console.log(`    pubblicata: ${righeP[n - 1] ?? "(assente)"}`);
      console.log(`    locale:     ${righeL[n - 1] ?? "(assente)"}`);
    }
    if (differenze.length > 10) console.log(`  … e altre ${differenze.length - 10}`);
  } else {
    console.log(`\n✓ Il testo pubblicato è identico a firestore.rules`);
  }

  console.log(`\nMarcatori nel testo pubblicato:`);
  let mancanti = 0;
  for (const [nome, re] of MARCATORI) {
    const presente = re.test(pubblicato);
    if (!presente) mancanti++;
    console.log(`  ${presente ? "✓" : "✗"} ${nome}`);
  }

  const ok = differenze.length === 0 && mancanti === 0;
  console.log(
    ok
      ? `\nTutto allineato.\n`
      : `\nVerifica FALLITA: ${differenze.length} righe diverse, ${mancanti} marcatori mancanti.\n`
  );
  process.exit(ok ? 0 : 1);
}

main();
