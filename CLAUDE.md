@AGENTS.md

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

Tutti i campi aggiunti oggi sono opzionali nel tipo TS (retrocompatibilità con i documenti creati prima della loro introduzione, che non li hanno). Nello schema Zod (`src/lib/validations/utente.ts`) usato dal form di creazione paziente, `tipoIntervento`, `pesoIniziale` e `altezza` sono invece obbligatori (il form non permette di salvare senza); `allergieIntolleranze` e `patologieAssociate` restano opzionali con default `[]` (`z.array(z.string()).default([])`) — un paziente senza allergie/patologie note produce comunque un array vuoto, mai `undefined`. Età e BMI sono valori derivati a runtime (`src/lib/utils/paziente.ts`), mai salvati su Firestore.

## Rename Paziente → Utente: residui noti

Il rename da "Paziente" a "Utente" (commit `e4af1ac`) non è mai stato completato in tutto il codice. Il 2026-07-17 sono emersi 3 residui concreti, tutti corretti:
- commenti `@file` stale nei doc-header di file rinominati (path vecchio nel commento);
- redirect rotto post-registrazione verso `/pazienti/nuovo` (404);
- `PROTECTED_ROUTES` nel middleware (`src/proxy.ts`) con `/pazienti` invece di `/utenti`, e senza `/impostazioni`/`/studio` — route autenticate raggiungibili senza login.

Un residuo simile, non ancora toccato: `firestore.indexes.json` ha un indice orfano su `collectionGroup: "pazienti"` con campo `parenteUid` (nessuna query lo usa più). **Qualsiasi nuova feature che tocca route, naming o path in questo repo va controllata con sospetto per residui analoghi** — non dare per scontato che un rename storico sia stato applicato ovunque.

## Stato feature: alert clinici (P0-4)

I trigger di alert basati su trend clinici (febbre persistente su più giorni, vomito ripetuto, peggioramento generale delle condizioni) sono **bloccati**, in attesa di soglie cliniche concrete da cliente/nutrizionista (quante ore/giorni per "persistente", quanti episodi per "ripetuto", quali segnali definiscono "peggioramento generale"). Non implementare euristiche arbitrarie nel frattempo: gli alert attuali (`config/alerts`) restano single-reading (temperatura/dolore sopra soglia, sanguinamento/vomito singolo) finché non arrivano numeri reali da usare.
