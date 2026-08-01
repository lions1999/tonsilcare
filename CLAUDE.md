@AGENTS.md

## Build: `--webpack` obbligatorio, altrimenti la PWA sparisce in silenzio (2026-07-29)

`next-pwa` genera il service worker come **plugin webpack**. In Next.js 16 il bundler di default è Turbopack anche per `next build`: sotto Turbopack la config di `next-pwa` viene ignorata senza alcun errore — il build dice "riuscito", ma `public/sw.js` non viene creato e l'app non ha né offline né caching. Il progetto è nato direttamente su Next 16, quindi la PWA **non ha mai funzionato** fino al fix; il commento in `next.config.mjs` sosteneva il contrario ("in produzione webpack viene usato automaticamente"), vero solo fino a Next 15.

Per questo `package.json` ha `"build": "next build --webpack"`. Non togliere quel flag. `next dev` può restare su Turbopack perché `next-pwa` è disabilitato in sviluppo (`disable: NODE_ENV === "development"`).

Verifica dopo qualsiasi modifica alla toolchain di build: `npm run build` deve produrre `public/sw.js`, `public/workbox-*.js` e `public/fallback-*.js` (tutti gitignored). Se mancano, la PWA è morta anche se il build è verde. Questo è lo stesso pattern di fallimento silenzioso di `/config/alerts` (vedi sezione sul seeding): **niente crash, comportamento sbagliato**.

## Firestore rules: cosa è chiuso di proposito (2026-07-30)

Le regole sono state irrigidite dopo un audit. Tre punti non erano marcati da alcun TODO e vanno lasciati come sono, salvo decisione esplicita:

- **`/accounts` update ha una allowlist** (`nome`, `cognome`, `haRispostaMedicoNonLetta`, `updatedAt`). Prima era libera, e `ruolo` era scrivibile dal client: **qualunque genitore poteva promuoversi a medico** scrivendo sul proprio documento, e da lì leggere schede e diari di tutti i bambini e creare prescrizioni, perché `isMedico()` legge esattamente quel campo. La promozione a medico si fa da Console o Admin SDK, che non passano dalle regole. Se serve permettere la modifica di un nuovo campo di profilo, si aggiunge all'elenco — non si riapre l'update.
- **`/utenti` update vincola `accountId` a restare invariato**, altrimenti un genitore può riassegnare un proprio paziente a un altro account.
- **`/utenti/{id}/diario/{logId}` ha `allow update: if false`.** Non è una mancanza di casi d'uso: è deliberato. Un log è la registrazione di cosa è stato osservato in un momento, e il medico decide su quei valori; l'update era aperto senza vincoli mentre il delete era già bloccato "per audit trail", quindi si poteva riscrivere un 40.5°C dopo che il medico l'aveva letto, senza lasciare traccia. **Va riaperto solo insieme al design della correzione** — entro quanto tempo si può correggere un log, e come il medico vede che un valore è stato cambiato — da concordare col cliente. Non al primo bisogno, e non nella variante intermedia "solo campi non clinici": quella permetterebbe di correggere una nota ma non un valore digitato male, cioè esattamente il caso in cui la correzione serve.

`/ricette` e `/info` sono passate a `write: if false`, chiudendo un TODO mai fatto che le rendeva scrivibili da qualunque utente autenticato. Il seeding non passa più dal client: vedi la sezione sul seeding.

## Firebase: dev vs produzione

Esistono due progetti Firebase separati (alias in `.firebaserc`):

- **`dev`** → `tonsilcare-dev` — sviluppo e test locali. È anche il `default` di `.firebaserc`: qualunque comando `firebase` lanciato **senza** `--project` esplicito colpisce questo progetto.
- **`prod`** → `tonsilcare-app` — produzione reale. Non è mai il default: va sempre selezionato esplicitamente con `firebase use prod` o `--project tonsilcare-app` / `--project prod`.

`.env.local` (gitignored) contiene le chiavi del progetto `dev` — è quello che usa `npm run dev` in locale. La produzione non ha un file env locale: le chiavi vivono nelle Environment Variables di Vercel (vedi README). Non creare un `.env.production` con credenziali reali: in Next.js `.env.local` ha comunque priorità su `.env.production` in ogni build locale (tranne `NODE_ENV=test`), quindi non offrirebbe la separazione voluta, e i file `.env.production`/`.env.development` sono per convenzione pensati per essere committati (mai per segreti).

Per operare esplicitamente su un progetto:
```bash
firebase use dev    # o: firebase use prod
firebase deploy --only firestore:rules,firestore:indexes --project prod   # solo quando serve davvero toccare produzione
```

**Nota su comandi distruttivi da Git Bash su Windows:** un comando `firebase firestore:delete "/collezione/doc" ...` lanciato da Git Bash può ricevere in argv un path riscritto silenziosamente da MSYS (es. `/accounts/UID` diventa `C:/Program Files/Git/accounts/UID`), perché MSYS converte automaticamente gli argomenti che iniziano con `/`. Il comando "riesce" (exit code 0) senza aver toccato il documento reale, perché il path riscritto non corrisponde a nulla. Per qualunque operazione distruttiva su Firestore/GCP: evitare argomenti con `/` iniziale quando possibile, oppure verificare prima con `node -e "console.log(JSON.stringify(process.argv))" "<stesso-argomento>"`, e non fidarsi mai del solo exit code — verificare sempre il risultato con una lettura indipendente (script read-only o Firebase Console).

**Regola per i test end-to-end nel browser:** ogni test manuale o automatizzato (Playwright incluso) va eseguito esclusivamente contro `tonsilcare-dev` — cioè con `.env.local` puntato al progetto `dev` (il default). Non ripuntare mai `.env.local` a `tonsilcare-app` per una sessione di test: è così che sono finiti dati fittizi in produzione la prima volta (vedi nota sopra).

## Modello dati Firestore — `/utenti/{utenteId}`

Campi del profilo paziente (`UtenteProfile` in `src/types/index.ts`):

- Base: `nome`, `cognome`, `dataNascita`, `dataOperazione`, `faseAttualeId`, `accountId`, `noteClinicare?`
- Aggiunti il 2026-07-17: `tipoIntervento?` (`adenoidectomia` | `tonsillectomia` | `adenotonsillectomia`), `pesoIniziale?` (kg — baseline auxologica rilevata al momento dell'intervento, **distinta** dal peso storico che sarà tracciato nel diario giornaliero per il calcolo del calo ponderale, non ancora implementato), `altezza?` (cm), `allergieIntolleranze?` (string[]), `patologieAssociate?` (string[])
- Aggiunto il 2026-07-17 (sistema "novità", vedi sotto): `haNuovoLogNonLetto?` (boolean)

Tutti i campi elencati sopra sono opzionali nel tipo TS (retrocompatibilità con i documenti creati prima della loro introduzione, che non li hanno). Nello schema Zod (`src/lib/validations/utente.ts`) usato dal form di creazione paziente, `tipoIntervento`, `pesoIniziale` e `altezza` sono invece obbligatori (il form non permette di salvare senza); `allergieIntolleranze` e `patologieAssociate` restano opzionali con default `[]` (`z.array(z.string()).default([])`) — un paziente senza allergie/patologie note produce comunque un array vuoto, mai `undefined`. Età e BMI sono valori derivati a runtime (`src/lib/utils/paziente.ts`), mai salvati su Firestore.

`AccountProfile` (`/accounts/{uid}`) ha analogamente un campo `haRispostaMedicoNonLetta?: boolean`, stesso pattern retrocompatibile — vedi sezione "novità" sotto.

## Rename Paziente → Utente: residui noti

Il rename da "Paziente" a "Utente" (commit `e4af1ac`) non è mai stato completato in tutto il codice. Il 2026-07-17 sono emersi 3 residui concreti, tutti corretti:
- commenti `@file` stale nei doc-header di file rinominati (path vecchio nel commento);
- redirect rotto post-registrazione verso `/pazienti/nuovo` (404);
- `PROTECTED_ROUTES` nel middleware (`src/proxy.ts`) con `/pazienti` invece di `/utenti`, e senza `/impostazioni`/`/studio` — route autenticate raggiungibili senza login.

Un quarto residuo, risolto poco dopo (commit `e219ff3`): `firestore.indexes.json` aveva un indice orfano su `collectionGroup: "pazienti"` con campo `parenteUid`, che nessuna query usava più; oggi il file è vuoto (`{"indexes": [], "fieldOverrides": []}`). **Qualsiasi nuova feature che tocca route, naming o path in questo repo va controllata con sospetto per residui analoghi** — non dare per scontato che un rename storico sia stato applicato ovunque.

## Stato feature: alert clinici (P0-4)

I trigger di alert basati su trend clinici (febbre persistente su più giorni, vomito ripetuto, peggioramento generale delle condizioni) sono **bloccati**, in attesa di soglie cliniche concrete da cliente/nutrizionista (quante ore/giorni per "persistente", quanti episodi per "ripetuto", quali segnali definiscono "peggioramento generale"). Non implementare euristiche arbitrarie nel frattempo: gli alert attuali (`config/alerts`) restano single-reading (temperatura/dolore sopra soglia, sanguinamento/vomito singolo) finché non arrivano numeri reali da usare.

## Notifiche push rimosse, sostituite da "novità" in-app (2026-07-17)

Le notifiche push (Firebase Cloud Messaging) sono state rimosse deliberatamente: l'infrastruttura esistente (`PushNotificationManager.tsx`, `firebase-messaging-sw.js`) era comunque quasi interamente mock (nessuna vera integrazione, nessun token mai salvato), e il costo di completarla (permessi browser, service worker, gestione token, supporto iOS PWA ancora incompleto) non era giustificato dal valore. Al suo posto: due flag booleani che pilotano un badge visivo in-app, niente notifiche esterne al dispositivo.

- `utenti/{utenteId}.haNuovoLogNonLetto` — impostato a `true` dal client genitore dopo `addDailyLog` (`markNuovoLogNonLetto` in `src/lib/firebase/firestore.ts`), azzerato dal client medico quando apre `/studio/utente/[id]` (non al caricamento della Control Room, solo alla consultazione della scheda specifica).
- `accounts/{accountId}.haRispostaMedicoNonLetta` — impostato a `true` dal client medico dopo `addPrescrizione`, azzerato dal client genitore **solo al click esplicito sull'avatar** in `src/components/UserMenu.tsx` (apertura del dropdown) — deliberatamente NON al semplice caricamento della dashboard, altrimenti il badge sparirebbe prima ancora che l'utente lo veda.

Sicurezza: `firestore.rules` ha regole `allow update` aggiuntive, ristrette al singolo campo via `request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])`, che permettono al medico di scrivere questi due flag su documenti di cui non è proprietario (il paziente/account del genitore) senza poter toccare nient'altro. Nessuna Cloud Function coinvolta — scelta deliberata per restare coerenti con l'architettura client-diretto già in uso in tutto il progetto (non esiste una cartella `functions/`).

## Seeding Firestore: `node scripts/seed.mjs` (2026-07-30)

Tutte e quattro le collezioni di contenuto e configurazione — `/ricette`, `/info`, `/fasi`, `/config/alerts` — si popolano con un solo comando:

```bash
gcloud auth application-default login    # una volta
node scripts/seed.mjs --dry-run          # mostra cosa scriverebbe
node scripts/seed.mjs                    # tonsilcare-dev (default)
```

Su produzione serve il flag esplicito, altrimenti lo script si rifiuta di partire:

```bash
node scripts/seed.mjs --project tonsilcare-app --conferma-produzione
```

I contenuti vivono in `seed-data/*.json`, versionati. Gli id dei documenti sono deterministici (lo `slug`, o la chiave della fase), quindi **rieseguire lo script aggiorna invece di duplicare**. Il vecchio seeding passava da due funzioni client-callable (`seedInitialRecipes`, `seedInitialGuidelines`) invocate da pulsanti nelle pagine `/ricette` e `/info`: usavano `addDoc` senza guardia, quindi ogni click aggiungeva copie. Sono state rimosse insieme ai pulsanti, perché le regole non consentono più la scrittura dal client.

**Perché ora conviene lanciarlo sempre su un ambiente nuovo:** l'assenza di queste collezioni non produce un errore, produce comportamento sbagliato silenzioso.
- `/fasi` mancante → `usePhaseConfig.ts` ha un fallback hardcoded (`FALLBACK_PHASES`), l'app funziona comunque. Nota: quel fallback duplica `seed-data/fasi.json`, oggi allineati ma destinati a divergere — unificarli è un lavoro a sé.
- `/config/alerts` mancante → **nessun fallback** in `src/app/studio/page.tsx`: `hasAlert` resta sempre `false` per qualsiasi paziente, a prescindere dalla gravità dei parametri. Bug osservato il 2026-07-17 su `tonsilcare-dev` (collezione `config` mai creata).

Prima di investigare una feature data-driven che sembra "rotta" su un ambiente, verificare che la collezione/documento Firestore da cui dipende esista davvero, invece di assumere un bug di codice.

## Cookie `__role`: scrittura sincrona al login/registrazione (2026-07-17)

`src/proxy.ts` decide il redirect RBAC medico↔genitore (`/` → `/studio` e viceversa) leggendo il cookie `__role`. Quel cookie **non va più impostato solo** nel listener asincrono `onAuthStateChanged` di `src/context/AuthContext.tsx` (che fa un fetch Firestore prima di scriverlo): se il login/la registrazione fa `router.push()` prima che quel fetch sia completato, il middleware valuta il redirect con `__role` ancora assente e lo salta — bug riprodotto: un medico che fa login atterra sulla dashboard genitore invece che su `/studio`, e solo una navigazione manuale successiva (quando il cookie è ormai arrivato) funziona correttamente.

Fix: `src/app/(auth)/login/page.tsx` e `src/app/(auth)/registrazione/page.tsx` scrivono `__role` esplicitamente e **prima** di `router.push`, in modo sincrono col resto del flusso di autenticazione (il login legge il profilo con `getAccountProfile`; la registrazione lo sa già staticamente, `signUp` crea sempre `ruolo: "genitore"`). `AuthContext.tsx` resta invariato e continua a coprire i cambi di ruolo durante una sessione già attiva — qualunque nuovo flusso di autenticazione aggiunto in futuro (SSO, magic link, ecc.) deve replicare lo stesso pattern: scrivere `__role` prima di navigare, non affidarsi solo al listener.
