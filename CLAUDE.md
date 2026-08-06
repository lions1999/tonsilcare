@AGENTS.md

## Build: `--webpack` obbligatorio, altrimenti la PWA sparisce in silenzio (2026-07-29)

`next-pwa` genera il service worker come **plugin webpack**. In Next.js 16 il bundler di default è Turbopack anche per `next build`: sotto Turbopack la config di `next-pwa` viene ignorata senza alcun errore — il build dice "riuscito", ma `public/sw.js` non viene creato e l'app non ha né offline né caching. Il progetto è nato direttamente su Next 16, quindi la PWA **non ha mai funzionato** fino al fix; il commento in `next.config.mjs` sosteneva il contrario ("in produzione webpack viene usato automaticamente"), vero solo fino a Next 15.

Per questo `package.json` ha `"build": "next build --webpack"`. Non togliere quel flag. `next dev` può restare su Turbopack perché `next-pwa` è disabilitato in sviluppo (`disable: NODE_ENV === "development"`).

Verifica dopo qualsiasi modifica alla toolchain di build: `npm run build` deve produrre `public/sw.js`, `public/workbox-*.js` e `public/fallback-*.js` (tutti gitignored). Se mancano, la PWA è morta anche se il build è verde. Questo è lo stesso pattern di fallimento silenzioso di `/config/alerts` (vedi sezione sul seeding): **niente crash, comportamento sbagliato**.

### `tsc` col dev server acceso può riportare errori che non esistono

`next dev` rigenera `.next/dev/types/validator.ts` mentre gira. Se `npx tsc --noEmit` lo legge a
metà scrittura, si vedono errori di **sintassi** (`TS1109: Expression expected`) su righe
troncate a metà parola — in quel file, mai nel sorgente. Non cercarli nel codice: si controlla
che i percorsi degli errori inizino tutti per `.next/`, si cancella quel file e si rilancia.
Già costato due cicli.

## Firestore rules: cosa è chiuso di proposito (2026-07-30)

### Verificare che le regole pubblicate siano davvero quelle del repo

**L'output di `firebase deploy` non è una verifica:** dice che il comando è arrivato in fondo,
non cosa sta girando. Un deploy verso il progetto sbagliato, o con un file non salvato, dà lo
stesso output verde. La CLI non sa rileggere le regole pubblicate; la Rules REST API sì.

Dopo ogni deploy:

```bash
node scripts/verifica-rules.mjs                            # tonsilcare-dev
node scripts/verifica-rules.mjs --project tonsilcare-app   # produzione
```

Esce 0 se tutto coincide, 1 altrimenti, quindi si può incatenare al deploy. Controlla due cose
distinte:

1. **il testo pubblicato coincide con `firestore.rules`** — hash più diff riga per riga;
2. **alcuni marcatori esistono davvero nel testo pubblicato.** Il confronto da solo dice se i
   due file sono uguali, non se sono giusti: se qualcuno cancella una regola e committa, gli
   hash restano identici e la protezione è sparita lo stesso. I marcatori sono le sette regole
   che ci sono costate un bug o un audit; l'elenco sta in cima allo script, e va allungato
   quando si aggiunge una protezione che conta.

Lo script è nato come procedura a mano fatta di due `curl` documentati qui. Era una ricetta,
non uno strumento: nessuno confrontava davvero gli hash, ed è già sparita una volta insieme
alla cartella temporanea in cui viveva.

Dettagli che costano tempo se non si sanno, entrambi già gestiti dallo script: il confronto va
fatto sui **byte UTF-8** (un round-trip in PowerShell legge l'UTF-8 come ANSI e storpia gli
accenti nei commenti, facendo sembrare diverse due regole identiche — già successo), e
`gcloud` non finisce sul PATH quando è installato con winget, vive sotto `%LOCALAPPDATA%` in un
percorso con spazi (si può forzare con la variabile `GCLOUD_CMD`).

### Stato al 2026-08-03: dev e produzione allineate

Entrambi i progetti hanno le regole dell'override della fase (il medico può scrivere i campi
`faseOverride*`, il genitore no), verificate rileggendole:

| progetto | ruleset | righe | differenze |
|---|---|---|---|
| `tonsilcare-dev` | `aa031db7-…` | 192 | 0 |
| `tonsilcare-app` | `60fadbc4-…` | 192 | 0 |

sha256 `3653933a48f67681` su entrambi, uguale al file nel repo, e tutti e sette i marcatori
presenti. Rieseguire lo script è il modo per sapere se questa tabella è ancora vera.

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

- Base: `nome`, `cognome`, `dataNascita`, `dataOperazione`, `accountId`, `noteClinicare?`
- **Deprecato il 2026-08-03: `faseAttualeId?`** — la fase non si salva più, si calcola (vedi la sezione sul calcolo automatico). Il campo resta sui documenti creati prima di quella data e **non viene ripulito**: bonificare dev ma non produzione darebbe due popolazioni di forma diversa. Nessun codice lo legge. Non riutilizzarlo per l'override del medico — è valorizzato su tutti i pazienti esistenti, quindi risulterebbero tutti forzati.
- Aggiunti il 2026-08-03 (override clinico della fase): `faseOverride?` (`PostOpPhase`), `faseOverrideMotivo?` (string), `faseOverrideDa?` (uid del medico), `faseOverrideIl?` (ISO 8601 con orario)
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

## Vocabolario: "utente" nel codice, "paziente" a schermo (2026-08-06)

**Il codice dice `utente`, l'interfaccia dice "paziente".** Non è un rename a metà: è una
separazione voluta fra identificatori e testo, decisa dopo aver visto cosa costa il percorso
inverso (la sezione qui sopra: giorni di residui per un rename fatto a metà). Fare
Utente → Paziente anche negli identificatori produrrebbe **due convenzioni conviventi**, che è
peggio di una sola imperfetta.

Restano `utente` e non si toccano: la collezione `/utenti`, le rotte `/utenti/nuovo` e
`/studio/utente/[id]`, i tipi (`UtenteProfile`, `UtenteWithStatus`), i componenti
(`UtenteSwitcher`, `UtenteProvider`), gli hook (`useUtente`, `useUtenti`), le funzioni
(`getUtente`, `addUtente`, `getAllUtenti`, `utenteProfileSchema`), le variabili, gli attributi
`id=` usati per le misure (`btn-utente-switcher`, `btn-salva-utente`, …), la chiave localStorage
`tonsilcare_active_utente_id` e i messaggi di `console.*`.

### Quale parola usare, a schermo

Tre casi, e la regola è **chi parla a chi**:

| parola | quando | esempi |
|---|---|---|
| **bambino** | l'app parla **al genitore del suo** figlio: primo accesso, stato vuoto | "Aggiungi il tuo bambino", "Aggiungi il tuo bambino per iniziare il monitoraggio" |
| **paziente** | l'app **nomina un'entità**: liste, form di ritorno, impostazioni, `aria-label` | "Nuovo paziente", "Pazienti Associati", "Seleziona paziente" |
| **paziente**, mai bambino | **qualsiasi schermata del medico** | "Pazienti in Triage", "Paziente non trovato" |

Perché "bambino" non è un residuo da ripulire: cambiarlo in "paziente" renderebbe fredda **la
prima frase che un genitore legge**. E perché il medico non lo usa mai: non ha quel rapporto, e
"bambino" in Control Room suonerebbe fuori posto.

Conseguenza concreta già applicata: in `utenti/nuovo` **il titolo cambia col ramo** — "Aggiungi
il tuo bambino" al primo accesso, "Nuovo paziente" al ritorno. Prima diceva "Aggiungi il tuo
bambino" / "Nuovo utente", che era incoerenza vera e non registro.

### Due stati vuoti diversi devono avere due frasi diverse

Emerso applicando il rename: la Control Room ha **due** stati vuoti, e prima si distinguevano
solo perché uno diceva "utente" e l'altro "paziente" — cioè per caso.

| stato | frase |
|---|---|
| non c'è nessun paziente | "Nessun paziente **registrato**." |
| i filtri non selezionano nessuno | "Nessun paziente **trovato**" + "Nessun paziente corrisponde ai filtri selezionati." |

Tradurre entrambi in "Nessun paziente trovato" sarebbe stato più fedele al rename e peggio per
il medico: **non saprebbe se il paziente non c'è o se l'ha nascosto lui con un filtro**, e le
due cose richiedono azioni opposte (crearlo, oppure azzerare i filtri). Vale per qualunque
elenco che venga aggiunto: se una schermata può essere vuota per più di un motivo, i motivi
vanno scritti diversi.

### L'unica eccezione: `UserMenu` dice "Menu utente" ed è corretto

`aria-label="Menu utente"` in `src/components/UserMenu.tsx` (due occorrenze, la copia mobile e
quella desktop) **non va rinominata**. Quel menu è dell'**account loggato** — il genitore o il
medico — non del bambino: contiene il logout e l'accesso a `/impostazioni`. Un lettore di
schermo che annunciasse "menu paziente" sopra il logout del genitore direbbe una cosa
attivamente falsa.

È il motivo per cui la regola non si può applicare con una sostituzione globale: **prima di
cambiare una stringa, chiedersi se "utente" lì significa il bambino o la persona che ha fatto
il login.**

### Nomi propri: iniziale maiuscola solo in presentazione

`conInizialeMaiuscola` (`src/lib/utils/testo.ts`) è applicata al nome dell'**account** nei
quattro punti in cui compare: i due saluti della dashboard, `UserMenu` e `/impostazioni`. Serve
perché chi si registra scrivendo tutto minuscolo vedeva "D" nell'avatar (che faceva già
`toUpperCase()`) e "davide" nel nome accanto, a due centimetri di distanza.

È **di sola presentazione** — il documento su Firestore non viene riscritto, come per età e BMI
in `lib/utils/paziente.ts`. E tocca **solo la prima lettera**: abbassare il resto trasformerebbe
"McDonald" in "Mcdonald" e "De Luca" in "De luca".

⚠️ **Debito noto: i nomi dei bambini non passano di lì.** Se un genitore digita "sofia" nel form
del paziente, la scheda clinica che il medico legge dirà "sofia", e così la Control Room, lo
switcher e il diario. Stessa funzione, altro insieme di punti; non fatto perché è un dato
diverso e va deciso insieme (anche `cognome`, e se valga la pena normalizzare in scrittura nel
form invece che in lettura ovunque).

## Stato feature: alert clinici (P0-4)

I trigger di alert basati su trend clinici (febbre persistente su più giorni, vomito ripetuto, peggioramento generale delle condizioni) sono **bloccati**, in attesa di soglie cliniche concrete da cliente/nutrizionista (quante ore/giorni per "persistente", quanti episodi per "ripetuto", quali segnali definiscono "peggioramento generale"). Non implementare euristiche arbitrarie nel frattempo: gli alert attuali (`config/alerts`) restano single-reading (temperatura/dolore sopra soglia, sanguinamento/vomito singolo) finché non arrivano numeri reali da usare.

Da non confondere con il bug corretto il 2026-08-04: *single-reading* è una scelta e riguarda
**quale logica** si applica (una misura sola invece di un trend); quel bug riguardava **su
quale misura** la si applica — solo l'ultimo log, quindi un valore rientrato nascondeva quello
fuori soglia registrato prima. Corretto restando single-reading: oggi la finestra è di 24 ore.

### Domanda aperta per il nutrizionista: come si segnala l'alimentazione insufficiente

Va posta **insieme** alle soglie qui sopra, non come questione a sé: è la stessa famiglia di
decisione. Nasce dalla rimozione di `oreMaxSenzaAlimentazione` (2026-08-04), soglia che stava
in `/config/alerts` e che nessun codice leggeva — e che **non era implementabile così com'era
definita**: "ore senza alimentazione" richiede di sapere *quando* il bambino ha mangiato, e il
diario registra `numeroPasti` per compilazione, senza alcun orario. L'unico istante disponibile
è `createdAt`, cioè quando il genitore ha aperto il form: un log delle 22:00 che dice "3 pasti"
non dice niente su quando è avvenuto l'ultimo, e un genitore che semplicemente non apre l'app
per nove ore farebbe scattare una soglia che misura il silenzio, non il digiuno.

Tre alternative valutate e scartate **ora** — quando arriva la risposta si riparte da qui,
senza rifare l'analisi:

- **`rifiutoCibo` come proxy.** È un booleano già raccolto dal diario, non richiederebbe di
  inventare nessun numero e resterebbe single-reading. Scartato perché stabilire che il rifiuto
  del cibo *da solo* è un segnale di allerta clinica è una decisione medica, non nostra.
- **`pastiMinGiornalieri`.** Implementabile sul dato esistente, ma serve un numero dal cliente
  e anche *da che ora del giorno* abbia senso valutarlo: il log è un'istantanea, e zero pasti
  alle 9:00 del mattino è normale. Senza quei due numeri è un'euristica arbitraria.
- **Orario dell'ultimo pasto nel form del diario.** Rende la soglia in ore calcolabile davvero,
  ma è un campo nuovo per il genitore e più attrito nella compilazione: da concordare col
  cliente, non una correzione tecnica.

Nota di metodo: la riformulazione apparentemente innocua "giorni consecutivi con zero pasti"
**non è gratuita** — richiede un numero di giorni dal clinico e aggrega su più giornate, quindi
ricade esattamente nella famiglia bloccata qui sopra.

## Notifiche push rimosse, sostituite da "novità" in-app (2026-07-17)

Le notifiche push (Firebase Cloud Messaging) sono state rimosse deliberatamente: l'infrastruttura esistente (`PushNotificationManager.tsx`, `firebase-messaging-sw.js`) era comunque quasi interamente mock (nessuna vera integrazione, nessun token mai salvato), e il costo di completarla (permessi browser, service worker, gestione token, supporto iOS PWA ancora incompleto) non era giustificato dal valore. Al suo posto: due flag booleani che pilotano un badge visivo in-app, niente notifiche esterne al dispositivo.

- `utenti/{utenteId}.haNuovoLogNonLetto` — impostato a `true` dal client genitore dopo `addDailyLog` (`markNuovoLogNonLetto` in `src/lib/firebase/firestore.ts`), azzerato dal client medico quando apre `/studio/utente/[id]` (non al caricamento della Control Room, solo alla consultazione della scheda specifica).
- `accounts/{accountId}.haRispostaMedicoNonLetta` — impostato a `true` dal client medico dopo `addPrescrizione`, azzerato dal client genitore **solo al click esplicito sull'avatar** in `src/components/UserMenu.tsx` (apertura del dropdown) — deliberatamente NON al semplice caricamento della dashboard, altrimenti il badge sparirebbe prima ancora che l'utente lo veda.

Sicurezza: `firestore.rules` ha regole `allow update` aggiuntive, ristrette al singolo campo via `request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])`, che permettono al medico di scrivere questi due flag su documenti di cui non è proprietario (il paziente/account del genitore) senza poter toccare nient'altro. Nessuna Cloud Function coinvolta — scelta deliberata per restare coerenti con l'architettura client-diretto già in uso in tutto il progetto (non esiste una cartella `functions/`).

## Control Room: chi scrive dal dettaglio deve aggiornare anche la lista (2026-08-03)

`StudioPazientiContext` carica i pazienti **una volta sola** e sopravvive alla navigazione tra
un paziente e l'altro — è il motivo per cui esiste il provider. Conseguenza: **una scrittura
fatta dal pannello di destra non si vede a sinistra**, e le due metà della stessa schermata
raccontano cose diverse finché qualcuno non ricarica la pagina.

Non è un problema teorico, è successo due volte:

- il flag "novità", risolto con `segnaLetto(utenteId)` — senza, il badge restava acceso
  accanto al paziente appena aperto;
- l'override della fase, risolto con `aggiornaPaziente(utenteId, patch)` — **la forma
  generale**. Senza, un paziente forzato in Fase 2 compariva sotto il filtro "Fase 3" mentre
  la sua scheda diceva Fase 2, e sotto "Fase 2" dava zero risultati.

**Regola: qualsiasi nuova scrittura fatta dalla scheda paziente va accompagnata da
`aggiornaPaziente()`.** Nessun errore segnala la dimenticanza — si vede solo confrontando due
zone della pagina, ed è per questo che è sfuggita la seconda volta pur essendo già documentata
nell'intestazione di `StudioPazientiContext.tsx`.

## L'allerta si valuta su una finestra di 24 ore, non sull'ultimo log (2026-08-04)

`StudioPazientiContext` leggeva un solo log per paziente e valutava le soglie su quello.
Conseguenza: 40 °C alle 8:00 e 37 °C alle 20:00 davano un paziente **senza alcun alert** — una
misura rientrata cancellava quella fuori soglia registrata poche ore prima. Invisibile con chi
compila una volta al giorno, evidente col primo genitore diligente.

Oggi `getLogsFinestraAlert(utenteId, ORE_FINESTRA_ALERT)` legge i log delle ultime 24 ore e
`valutaAlertFinestra` accende l'allerta se **una qualsiasi** di quelle letture supera le
soglie. **Resta single-reading**: cambia su quali letture si applica la logica, non quale
logica si applica. Non è il lavoro sui trend clinici (P0-4), che resta bloccato.

- **Finestra mobile, non giornata di calendario.** A mezzanotte l'allerta delle 23:50
  sparirebbe da sola: lo stesso bug spostato di qualche ora.
- **`ORE_FINESTRA_ALERT` sta in `lib/utils/alert.ts`, non in `/config/alerts`.** Non è una
  soglia clinica: dice per quanto tempo un segnale resta visibile, non quale valore è
  preoccupante.
- **Il costo in letture non è cambiato:** resta una query per paziente. Se la finestra non è
  vuota, il suo primo elemento è anche l'ultimo log in assoluto, quindi la seconda query parte
  solo per chi non registra da 24 ore. L'assunzione su cui poggia (ogni log ha `createdAt`)
  è annotata nel commento della funzione, insieme al perché `getUtenteLogs` si comporta
  diversamente sullo stesso dato.
- **Nessuna modifica a `firestore.rules` né a `firestore.indexes.json`:** il medico legge già
  la sotto-collezione `diario`, e `where` + `orderBy` insistono sullo stesso campo, quindi
  basta l'indice a campo singolo automatico.

### Cosa succede quando l'allerta esce dalla finestra

**Il paziente smette semplicemente di essere rosso, senza lasciare traccia di esserlo stato**,
e scende nell'ordinamento perché `hasAlert` è il primo criterio di sort. È una scelta
consapevole, non una dimenticanza: la finestra sposta la sparizione da "al log successivo" a
"dopo 24 ore", non la elimina.

Attenuazione parziale da conoscere: `haNuovoLogNonLetto` è indipendente e **non** scade col
tempo — resta acceso finché il medico non apre quella scheda. Un paziente che ha avuto 40 °C
ieri e non è mai stato aperto conserva quindi il pallino blu. Non è un sostituto: dice "c'è
qualcosa di nuovo", non "c'era un'allerta".

**Evoluzione già ragionata, se il medico chiederà "come faccio a sapere quali allerte ho già
visto":** allerta persistente finché non viene presa in carico. Clinicamente è la più corretta
— un allarme non dovrebbe spegnersi da solo — ma non è la correzione di un bug: richiede un
campo nuovo su `/utenti`, una scrittura dal client medico, una modifica alla allowlist
`hasOnly` in `firestore.rules` con deploy e riverifica su dev *e* produzione (oggi allineate,
vedi la sezione sulle rules) e un'azione "prendi in carico" che oggi non esiste in nessuna
schermata. Va progettata, non aggiunta.

### Le condizioni di allerta hanno un posto solo: `src/lib/utils/alert.ts`

Erano scritte a mano in quattro punti, con quattro definizioni **divergenti**: la Control Room
guardava sanguinamento/vomito/temperatura/dolore, la scheda paziente ometteva il dolore, il
form del diario guardava solo temperatura e sanguinamento, la dashboard del genitore aveva 38
e 7 hardcoded. Ora **tre punti su quattro** passano da qui: Control Room e scheda paziente con
`valutaAlertFinestra` / `valutaAlertLog`, e dal 2026-08-05 anche `VitalsQuickCard` sulla
dashboard del genitore.

Resta fuori **il modale di emergenza in `diario/nuovo`**, che scatta su temperatura o
sanguinamento ma non su vomito e dolore. Non è una dimenticanza: allinearlo cambia **quando una
famiglia riceve un allarme**, quindi è una decisione clinica da porre al cliente insieme alle
soglie sui trend, non un riordino tecnico. Vedi i debiti aperti.

Due conseguenze visibili al medico, dichiarate perché altrimenti sembrano malfunzionamenti:

1. **La card mostra il motivo dell'allerta, con l'ora.** Serve: da quando si guardano 24 ore,
   la lettura che accende il rosso spesso non è quella riassunta sulla card, e senza motivo il
   medico leggerebbe "Temp: 37.0°C" dentro un riquadro rosso. Si mostrano tutti i motivi
   (deduplicati per tipo, tenendo la lettura peggiore, in ordine di gravità), non solo il più
   grave: con febbre al mattino e dolore 9/10 nel pomeriggio, tenere solo il primo
   nasconderebbe il secondo. Oltre due si passa a `+N`. L'ora è nuda solo se la lettura è di
   oggi, altrimenti prefisso "ieri" — dentro 24 ore le uniche possibilità sono quelle due, e
   alle 07:00 un "alle 08:00" senza prefisso sembrerebbe imminente.
2. **Il dolore accende l'icona rossa sui singoli log della scheda paziente, anche su quelli
   storici** che ieri non l'avevano. Lo storico non è cambiato, è cambiato come lo si legge:
   la scheda ora usa la stessa definizione della lista invece di una sua. Nello stesso
   passaggio sono spariti i fallback hardcoded `?? 38.5` e `?? 7`: senza `/config/alerts` ora
   non viene evidenziato niente, coerentemente con la Control Room, invece di applicare soglie
   che nessuno ha configurato.

## Debiti aperti: un bug e due limiti di scala (2026-08-03, aggiornato 2026-08-05)

Emersi confrontando la bozza di specifica col codice. **Vanno trattati con urgenza diversa**:
il primo produce comportamento sbagliato oggi, gli altri due funzionano correttamente ora e si
romperanno al crescere dell'uso. I due bug del 2026-08-03 sono stati corretti (vedi la sezione
sulla finestra di 24 ore); il terzo, `VitalsQuickCard`, il 2026-08-05. Quello che resta non è
in attesa di tempo ma **di una decisione clinica del cliente**.

### Bug — sbagliato adesso, con i dati attuali

- **Il modale di emergenza in `diario/nuovo/page.tsx` scatta su temperatura o sanguinamento,
  ma non su vomito e dolore**, che invece accendono l'allerta del medico. È l'ultimo dei
  quattro punti che non passa da `lib/utils/alert.ts`, e **va lasciato lì finché il cliente non
  decide**: allinearlo non è un riordino tecnico, cambia in quali casi una famiglia riceve un
  allarme a schermo. Va posto insieme alle soglie sui trend e alla domanda per il nutrizionista,
  non risolto di passaggio. Nota che scatta anche con `?? 38.5` scritto a mano, quindi in un
  ambiente senza `/config/alerts` allarma con una soglia che nessuno ha configurato.

**Corretto il 2026-08-05: `VitalsQuickCard`.** I due riquadri "Temp." e "Dolore" della
dashboard genitore confrontavano con `38` e `7` letterali, ignorando `/config/alerts` che la
stessa pagina aveva già caricato per il banner: **una configurazione che mente**, la forma
speculare di `oreMaxSenzaAlimentazione` (lì una configurazione che nessuno leggeva). Con la
soglia configurata a 38.5 il genitore vedeva rosso a 38.0 mentre il medico non vedeva niente, e
alzare la soglia non cambiava quella schermata. Ora passa da `valutaAlertLog` e senza
configurazione non evidenzia nulla.

**Conseguenza visibile, dichiarata perché sembra un difetto: al primo render i due riquadri
sono neutri e si colorano un istante dopo.** Le soglie arrivano da Firestore in un `useEffect`,
quindi il primo passaggio avviene con `configAlert` a `null` — che è lo stesso stato di un
ambiente non configurato, ed è giusto che si comporti allo stesso modo. Prima non succedeva
perché i numeri erano scritti nel componente e disponibili subito: la reattività istantanea era
il sintomo del bug, non una qualità da recuperare. **Non "sistemarlo" reintroducendo un valore
di partenza**: qualunque default lo farebbe partire da soglie che nessuno ha configurato, cioè
esattamente ciò che è stato tolto. Se un giorno desse fastidio, la strada è uno stato di
caricamento esplicito, non un numero di comodo.

La prova della correzione sta su `tonsilcare-dev`: la paziente **Sofia Test** ha due log
apposta, 38.2 °C e 38.6 °C, che con la soglia a 38.5 stanno uno per parte del confine. Sono
tenuti lì di proposito — non sono dati sporchi da ripulire, e riscriverli costa più che
lasciarli.

Attenzione a una distinzione che quella correzione ha reso più netta: `DEFAULT_ALERTS` in
`DashboardContent.tsx` **è ancora lì e serve solo ad `AlertBanner`**, che senza testo non
avrebbe niente da mostrare. Non va passato a ciò che valuta le soglie, altrimenti il fallback
hardcoded torna, solo spostato. È il motivo per cui la configurazione vera vive in uno stato
separato (`configAlert`, che può essere `null`) e il banner riceve `configAlert ?? DEFAULT_ALERTS`.

**Corretto il 2026-08-06: `messaggioEmergenza` mancante.** Il banner **non** spariva e **non**
mostrava un buco: restava col titolo "Temperatura max: 38.5 °C" e un secondo paragrafo di
altezza **zero**, cioè si presentava come un banner completo e voluto mentre le istruzioni su
cosa fare in emergenza non c'erano. Un banner visibilmente rotto verrebbe segnalato, quello no.
Il caso si presenta con `/config/alerts` **presente** e soglie valide, quindi `configAlert` è
non-null e `DEFAULT_ALERTS` non entra in gioco.

**Oggi il banner non compare affatto.** Nessun testo di ripiego, e la ragione va tenuta:

- **Un ripiego sarebbe un fallback hardcoded travestito, peggiore di quelli già rimossi.**
  `DEFAULT_ALERTS` scatta solo quando manca l'intera configurazione; un `||` sul singolo campo
  scatterebbe in un ambiente **configurato**, coprendo una configurazione incompleta e reale
  con un'istruzione clinica che nessuno ha deciso.
- **Il titolo da solo non basta a giustificare il banner.** È un'unità di senso sola: la soglia
  è la premessa, il messaggio è la conclusione. Un "Temperatura max: 38.5 °C" isolato invita il
  genitore a dedurre un'azione che nessuno ha scritto — informazione monca su una soglia
  clinica.
- **Il percorso acuto non è toccato:** il modale in `diario/nuovo` ha un suo testo con ripiego
  e scatta mentre il genitore digita un valore fuori soglia. Questo banner è ambientale.

⚠️ **Compromesso accettato, non dimenticato: per il genitore l'assenza è invisibile** — niente
banner e niente avviso. È deliberato: l'alternativa è dirgli un'istruzione clinica non
configurata, e un errore di configurazione lui non può risolverlo (stessa regola per cui
`AvvisoTriageDisattivato` è solo lato medico). Il segnale va a chi può correggere, con un
`console.error` che nomina il campo — nel `useEffect`, non nella funzione di render, dove si
ripeterebbe a ogni passaggio.

Dettaglio di layout che non si deduce: **`lg:col-span-2` sta sull'`<aside>` dentro
`AlertBanner`, non su un wrapper**. Con un wrapper, il `null` avrebbe lasciato un figlio vuoto
— una cella di griglia con la sua riga di gap a `lg`, e un elemento in più contato da
`space-y-4` sotto. È lo stesso difetto dell'avviso dentro `<main class="space-y-8">` della
scheda paziente.

### Lo stesso schema altrove: otto punti, censiti il 2026-08-06

Campi di testo letti da Firestore e resi **senza controllo**, dove l'assenza produce un
elemento vuoto invece di un'assenza visibile. Tutti hanno la stessa raggiungibilità del
banner: non producibili dal client (`/fasi`, `/ricette`, `/info` sono `write: if false`;
`Prescrizione.testo` e il motivo dell'override sono validati in scrittura, bottone disabilitato
più `trim()`), ma producibili da Console o Admin SDK.

| dove | campo | cosa si vede se manca |
|---|---|---|
| `DashboardContent.tsx` | `cibiConsigliati` / `cibiVietati` | l'intestazione "✅ Consigliati" resta, sotto nessun chip |
| `DashboardContent.tsx` | `consistenzaSuggerita` | etichetta penzolante "Consistenza:" e il nulla |
| `DashboardContent.tsx` | `fase.descrizione` | paragrafo vuoto nella card della fase |
| `DashboardContent.tsx`, `studio/utente/[id]` | `Prescrizione.testo` | card con nome del medico e data, corpo vuoto |
| `DashboardContent.tsx`, `studio/utente/[id]` | `medicoNome` | attribuzione con la data e senza nome |
| `info/page.tsx` | `Guideline.contenuto` | l'accordion si apre sul vuoto |
| `ricette/[id]/page.tsx` | `ingredienti` / `istruzioni` | il tab esiste, il suo contenuto no |
| `studio/FasePazienteCard.tsx` | `stato.motivo` | riquadro ambra col lucchetto e nessun testo |

**Il precedente giusto è già nel repo:** `studio/utente/[id]/page.tsx` controlla `length`
**prima** di rendere l'intestazione di allergie e patologie. La guardia va sul **contenitore**,
non sul contenuto — è la differenza tra un'assenza e un buco.

I primi tre sono il **piano alimentare**, e vanno per un giro dedicato: lì va deciso se
sparisce il singolo blocco o la card intera, e "Consigliati" con zero chip **un genitore lo
legge come "nessun alimento consigliato"**, che è più grave del banner. Non è un riordino
tecnico: cambia cosa legge una famiglia.

**Debito di famiglia diversa, trovato di passaggio:** `noteClinicare` (`src/types/index.ts`) è
dichiarato in `UtenteProfile` e **non è reso da nessuna parte**. Non è questo schema, è quello
di `oreMaxSenzaAlimentazione`: un campo valorizzabile che non produce nulla. Chi lo scrivesse
da Console crederebbe di aver annotato qualcosa che nessuno leggerà mai.

### Limiti di scala — corretti oggi, rotti domani

- **La Control Room non ha paginazione.** `getAllUtenti()` scarica l'intera collezione e poi
  esegue **una query per paziente** per i log della finestra di allerta; ricerca e filtri
  lavorano in memoria su tutto l'elenco. Con 3 pazienti è istantaneo, con 200 sono 201 letture a ogni apertura. Da
  affrontare prima che i pazienti siano molti, non quando lo sono.
- **Non esiste associazione medico–paziente.** Nessun campo lega un paziente a un medico:
  `getAllUtenti()` legge tutto e le regole autorizzano qualunque account con `ruolo: medico`.
  Con un solo studio non si nota. **Dal secondo medico in poi, ognuno vede tutti i pazienti di
  tutti** — e va progettato prima che il secondo medico esista, perché tocca modello dati e
  regole insieme. Nota che la bozza per il cliente parla di "lista dei pazienti *in cura*",
  quindi la promessa è già stata fatta.

## Seeding Firestore: `node scripts/seed.mjs` (2026-07-30)

Tutte e quattro le collezioni di contenuto e configurazione — `/ricette`, `/info`, `/fasi`, `/config/alerts` — si popolano con un solo comando:

```bash
gcloud auth application-default login    # una volta
node scripts/seed.mjs --dry-run          # mostra cosa scriverebbe
node scripts/seed.mjs                    # tonsilcare-dev (default)
```

**Prima di lanciarlo, verifica che `firebase-admin` sia installato**: il 2026-08-03 risultava
in `devDependencies` ma assente da `node_modules`, e lo script muore con `ERR_MODULE_NOT_FOUND`
(`npm install` lo rimette). Nota anche che `gcloud` non finisce sul PATH: dopo l'installazione
con winget vive in `%LOCALAPPDATA%\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd`, e il
percorso contiene spazi — va messo tra virgolette quando lo si invoca da uno script.

Su produzione serve il flag esplicito, altrimenti lo script si rifiuta di partire:

```bash
node scripts/seed.mjs --project tonsilcare-app --conferma-produzione
```

I contenuti vivono in `seed-data/*.json`, versionati. Gli id dei documenti sono deterministici (lo `slug`, o la chiave della fase), quindi **rieseguire lo script aggiorna invece di duplicare**. Il vecchio seeding passava da due funzioni client-callable (`seedInitialRecipes`, `seedInitialGuidelines`) invocate da pulsanti nelle pagine `/ricette` e `/info`: usavano `addDoc` senza guardia, quindi ogni click aggiungeva copie. Sono state rimosse insieme ai pulsanti, perché le regole non consentono più la scrittura dal client.

**Perché ora conviene lanciarlo sempre su un ambiente nuovo:** l'assenza di queste collezioni non produce un errore, produce comportamento sbagliato silenzioso.
- `/fasi` mancante → `useFasi.ts` ha un fallback hardcoded (`FASI_FALLBACK`), l'app funziona comunque. Quel fallback duplica `seed-data/fasi.json`, oggi allineati ma destinati a divergere. Dal 2026-08-03 il fallback almeno **si annuncia**: `console.warn` quando `/fasi` è vuota.
- `/config/alerts` mancante → **il sistema di allarme è muto, non degradato.** Vedi sotto.

Prima di investigare una feature data-driven che sembra "rotta" su un ambiente, verificare che la collezione/documento Firestore da cui dipende esista davvero, invece di assumere un bug di codice.

### Stato del seeding: dev e produzione popolate (2026-08-04)

Entrambi gli ambienti hanno tutte e quattro le collezioni, con lo stesso contenuto del repo.
**Produzione è stata popolata il 2026-08-04**, quando era completamente vuota — `/ricette`,
`/info`, `/fasi`, `/config` e anche `/utenti` e `/accounts` a zero documenti, quindi il seed
non ha sovrascritto niente. Prima di rilanciarlo su `tonsilcare-app` quella condizione **non
vale più**: `set()` è senza `merge` e riscrive i documenti interi.

Verifica fatta rileggendo con una connessione separata invece di fidarsi del riepilogo che lo
script stampa da sé: 13 documenti su 13, confronto per impronta del contenuto contro
`seed-data/`, zero differenze. È lo stesso principio delle rules — non si verifica una
scrittura con lo stesso canale che potrebbe aver mentito.

⚠️ **Le 5 fasi su produzione sono le nostre, non quelle della specifica cliente.** Il cliente
deve ancora confermare se sono 4 o 5 (vedi la sezione sulle fasi). Scelta consapevole: i
contenuti e soprattutto `/config/alerts` valgono più dell'attesa, e il riseed costerà quanto
sarebbe costato oggi. Quando arriverà la risposta, però, **vanno riseedati entrambi gli
ambienti**, non solo dev — più `FASI_FALLBACK` in `useFasi.ts` e il tipo `PostOpPhase`, che è
un'unione di cinque id e non si aggiorna da solo togliendo una fase dai dati.

### Se `/config/alerts` manca: il lato medico tace, il lato genitore finge (2026-08-04)

Non è più lo stato di nessuno dei due ambienti, ma resta vero per qualsiasi progetto nuovo. Dal
2026-08-06 **il silenzio lato medico è annunciato** (vedi la sezione sull'avviso qui sotto); il
meccanismo sottostante è invariato, ed è questo:

`getMedicalAlerts()` restituisce `null`, e da lì le due metà dell'app si comportano in modo
opposto:

- **Medico — nessun alert, mai.** `valutaAlertLog` con `config` a `null` restituisce zero
  motivi, quindi `hasAlert` è `false` per ogni paziente a prescindere dai valori: nessuna riga
  rossa in Control Room, filtro "Con allerta" sempre vuoto, nessuna icona sui log nella scheda
  paziente. **Il comportamento è ancora questo — cambia solo che ora c'è un avviso a schermo
  che lo dichiara.** Senza, il medico non vedeva un sistema degradato: vedeva un reparto in cui
  sta bene tutto.
- **Genitore — l'app sembra funzionare.** `DashboardContent` ha `DEFAULT_ALERTS`, quindi il
  banner continua ad annunciare "Temperatura max: 38.5 °C" col messaggio di emergenza, e il
  modale di emergenza in `diario/nuovo` scatta lo stesso (`?? 38.5` scritto a mano).
  `VitalsQuickCard` **non** rientra più in questo elenco dal 2026-08-05: senza configurazione
  resta neutra.

L'asimmetria è la parte pericolosa: i fallback hardcoded rimasti lato genitore — già in lista
come bug a sé — **nascondono l'assenza della configurazione** proprio sulle schermate dove
salterebbe all'occhio.

Nota storica: fino al 2026-08-04 la scheda paziente degradava invece di tacere, perché aveva i
suoi `?? 38.5` e `?? 7`. Sono stati tolti di proposito insieme all'unificazione delle
condizioni di allerta — applicare soglie che nessuno ha configurato è un modo diverso di
mentire. Il silenzio lato medico è quindi totale, ed è esattamente perché lo è che dal
2026-08-06 viene **dichiarato a schermo**.

### Fatto il 2026-08-06: l'avviso "triage disattivato" lato medico

`src/components/studio/AvvisoTriageDisattivato.tsx`, montato in due punti che **si escludono
per breakpoint**: nell'header di `ListaPazienti` (sempre) e in cima a `/studio/utente/[id]` con
`lg:hidden`. Scartato il `console.warn` alla `useFasi`: nessun medico apre la console, e qui il
fallimento non è un degrado ma un silenzio totale su un sistema di allarme clinico.

Requisiti rispettati, da non erodere in un refactor:

- **Non chiudibile.** Nessuna X, nessun `onClose`, nessuno stato interno: non c'è niente da
  chiudere. Un avviso che dice "gli allarmi sono spenti" e si può far sparire viene chiuso una
  volta e non rivisto più, proprio mentre la condizione persiste. Misurato: zero
  `button`/`a`/`input` dentro l'elemento.
- **Il testo smentisce un'inferenza, non segnala un errore tecnico.** Il rischio non è che il
  medico non sappia di una configurazione mancante: è che legga una lista senza righe rosse e
  concluda che stanno tutti bene. Per questo la terza frase nomina ciò che il medico sta
  guardando. Non annacquarla in un generico "errore di configurazione".
- **Solo lato medico.** Le schermate del genitore hanno i loro fallback hardcoded: sono un bug
  a sé e vanno affrontate lì, non con un avviso che al genitore direbbe qualcosa che non può
  risolvere.
- **Nell'header della lista, non nell'elenco.** L'header non scorre. Un avviso che scorre via
  viene letto una volta, e l'inferenza sbagliata si forma proprio mentre si scorre. Costa 100px
  in un pannello da 420px, ma solo in un ambiente rotto — dove quel costo è il punto.

**La copia sulla scheda ha la terza frase diversa, ed è deliberato.** La formulazione concordata
è scritta per la lista: "apri le singole schede" detto a chi ha già una scheda aperta gli dice
di fare ciò che sta già facendo, cioè rende l'avviso ignorabile proprio dove serve di più.
Titolo e seconda riga sono **identici** nelle due varianti: sono quelli che portano il
significato. Il testo sta tutto nella costante `TESTO` di quel file, non sparso nei due punti
di montaggio.

Perché anche sulla scheda: su desktop la lista è affiancata e l'avviso si vede comunque, ma
**sotto `lg` la lista è nascosta** e la scheda diventa l'unico posto dell'app in cui il medico
legge log clinici senza averla accanto. La scelta di quale copia mostrare è **solo CSS**
(`lg:hidden`), mai `matchMedia`: stesso idioma di `UserMenu`. Verificato a 375, 1014 e 1440 —
esattamente un avviso visibile in ogni combinazione.

Due dettagli che non si deducono leggendo il codice:

- **L'avviso della scheda sta FUORI da `<main>`.** Lì `space-y-8` dà i margini con `> * + *`, e
  un figlio nascosto da `lg:hidden` resta un fratello: dentro, su desktop, avrebbe aggiunto
  32px di vuoto in cima al pannello ogni volta che la configurazione manca.
- **`configAlertMancante` è derivato, non memorizzato**: `!caricamento && configAlert === null`.
  `caricamento` parte da `true` e la configurazione arriva nello **stesso `Promise.all`** dei
  pazienti, quindi non esiste un render in cui l'avviso preceda la lista — il lampeggio è
  impossibile per costruzione, non evitato con un ritardo. Misurato con un `MutationObserver`
  armato prima della navigazione: avviso e prima card compaiono allo stesso millisecondo. **Non
  "sistemarlo" scomponendo la lettura in un `useEffect` a sé**: sarebbe esattamente il difetto
  di `VitalsQuickCard` (vedi la sezione sul primo render neutro), qui su un avviso di sicurezza.

**Ci ricade anche il fallimento di lettura** (rete, permessi), non solo il documento assente: la
causa tecnica è diversa ma la conseguenza per il medico è identica — nessuna soglia applicata,
nessuna riga rossa possibile — ed è quella che l'avviso deve smentire. Il motivo preciso resta
in console.

La scheda paziente **non rilegge più le soglie da sé**: `getMedicalAlerts()` era chiamata anche
lì, cioè due letture della stessa configurazione e due valori che potevano divergere. Ora
`configAlert` arriva dal context. Se quella pagina finisse fuori dal provider, `useStudioPazienti`
lancia già un errore con messaggio esplicito invece di propagare `undefined` — vale da prima,
perché usa `segnaLetto` e `fasi` dallo stesso hook.

### `getMedicalAlerts` valida le soglie: inutilizzabile = assente (2026-08-06)

Faceva `snap.data() as MedicalAlerts`, un cast senza controlli. Con `temperaturaMaxC` mancante,
`log.temperatura >= undefined` è `false` **sempre**: le allerte di temperatura sparivano in
silenzio mentre quelle di dolore continuavano a funzionare — una lista che *sembra viva* mentre
metà del triage è spento, cioè peggio dell'assenza totale. Ora una configurazione con soglie non
numeriche restituisce `null` più un `console.error` che nomina i campi colpevoli, e ricade
nell'avviso qui sopra: una silenziosità parziale e muta diventa totale e annunciata.

Nessun client può produrre quello stato (`/config` è `write: if false`), ma una modifica da
Console o Admin SDK sì.

**`messaggioEmergenza` non è validato, di proposito**: è testo per il banner del genitore, non
una soglia, e spegnere il triage del medico per una stringa che il medico non vede sarebbe
sproporzionato. **Non spostare quel controllo qui**: renderebbe `null` l'intera configurazione,
cioè spegnerebbe il triage del medico per una stringa che riguarda solo il genitore.

La sua assenza è gestita dove vive il banner: dal 2026-08-06 `AlertBanner` **non compare
affatto** invece di restare col titolo e un paragrafo di altezza zero. Il perché di quella
scelta — e perché non un testo di ripiego — sta nella sezione sui debiti aperti.

### Come simulare l'assenza senza cancellare `/config/alerts`

Il documento **esiste su entrambi gli ambienti**, e cancellarlo per provare non è un'opzione.
Il modo usato: modifica locale temporanea del **solo id del documento** in `getMedicalAlerts` —
`"alerts"` → `"alerts-non-esiste"`. Esercita il percorso vero da capo a fondo (lettura Firestore
reale, `!snap.exists()` reale, stato del context reale) senza scrivere né cancellare niente:
leggere un documento inesistente è una lettura, e `/config/{docId}` è leggibile da qualunque
autenticato. Per il caso **malformato**, stessa tecnica puntata su un documento che esiste ma ha
la forma sbagliata: `doc(db, "fasi", "fase_1")`. Zero scritture, zero residui su dev.

⚠️ **Quella riga serve anche il lato genitore.** Un residuo non ripristinato spegne le soglie
ovunque, non solo in Control Room. Il ripristino si verifica col `git diff` — la riga
`doc(db, "config", "alerts")` non deve comparire tra le modifiche — e ricontrollando **anche la
dashboard genitore**, non solo la Control Room.

## L'id del documento vince sempre sul campo salvato (2026-08-03)

Tutte le letture in `src/lib/firebase/firestore.ts` costruiscono l'oggetto come
`{ ...snap.data(), id: snap.id }` — **spread prima, id dopo**. Non è uno stile: con l'ordine
opposto un campo `id` salvato dentro al documento vince sull'id vero, senza errori. Erano 11
occorrenze, tutte con l'ordine sbagliato.

Due casi vanno letti con attenzione prima di "uniformare":

- **`getUtenteLogs` / `getLatestLog`**: `{ ...data, id, createdAt }`. `createdAt` sta dopo lo
  spread perché lì l'override è **voluto** (Timestamp → stringa ISO). Spostarlo prima rompe
  la conversione in silenzio, e il tipo continua a dichiarare `string`.
- **`getAccountProfile`**: `{ ...snap.data(), uid }` dove `uid` è l'argomento della funzione,
  cioè l'utente **autenticato**. Non è l'id di un documento: è l'identità del chiamante, e
  `/accounts` è la collezione da cui le regole leggono `ruolo`.

**Debito noto:** `signUp` (`src/lib/firebase/auth.ts`) scrive ancora `uid: user.uid` dentro
`accounts/{user.uid}`. Dopo la correzione quel campo è duplicato e ininfluente in lettura, ma
continua a essere scritto su ogni nuovo account. Toglierlo tocca la scrittura e i documenti
già esistenti (e `AccountProfile` dichiara `uid` obbligatorio), quindi va fatto insieme, non
di passaggio. Stessa cosa era `seed-data/fasi.json`, che aveva `id` come campo: lì è già stato
rimosso.

## Una sola barra in alto, per entrambi i ruoli (2026-08-04)

`DesktopTopBar` (genitore) e `DesktopSidebar` (medico) facevano la stessa cosa con markup
diverso, pur leggendo già le voci dalla stessa sorgente: due posti dove correggere lo stesso
bug. Oggi esiste solo `src/components/DesktopNavBar.tsx`, che prende il ruolo come prop.
**Cambiano le voci e le azioni, non il layout.** Il medico ha perso i 240px di sidebar proprio
nella schermata dove l'orizzontale è conteso — lista da 420px più dettaglio affiancati — e tre
voci non giustificavano il pattern da gestionale.

- **Barra e contenuto condividono il wrapper**: `mx-auto`, `px-6` e lo **stesso tetto di
  larghezza per ruolo**, replicato in due punti (`AppShell` col prefisso `lg:`, la barra
  senza). È l'unico modo per cui il margine sinistro coincide, e per il genitore è la
  differenza tra una barra ancorata al contenuto e una col logo al bordo estremo mentre le
  card stanno al centro. Misurato a 2560: logo e prima colonna entrambi a x=792 (genitore),
  x=344 (medico). Se cambi un tetto, cambiali tutti e due — non lo segnala niente.
- **I due tetti restano diversi ed è voluto**: 1024px al genitore, 1920px al medico. Unificare
  la barra non è unificare la larghezza: il testo della dashboard steso su 1920px riporta le
  righe illeggibili corrette in fase 1. Sono due decisioni indipendenti.
- **`UserMenu` sta in fondo a destra per entrambi i ruoli** (dal 2026-08-05, vedi sotto).
- **Costo verticale: 65px.** Con le card "in allerta" (138px + 8 di gap) i pazienti visibili
  senza scorrere non cambiano — 4 a 1024×900 e a 1440×900, 8 a 2560×1440 — perché il taglio
  non arriva a una card intera; con le card compatte (61px) se ne perde una. In cambio il
  pannello dettaglio guadagna 240px a ogni larghezza.
- **`SearchAndFilterBar` continua a servirsi di `overflow-x-auto`, e il portale del menu
  resta.** I 240px recuperati vanno al dettaglio, non ai filtri: il pannello lista è
  `lg:w-[420px]` **fisso**. Misurato dopo la modifica, sommando i figli a menu chiuso: 462.6px
  di contenuto contro 396 disponibili, identico a prima e a tutte le larghezze.

Verificato a 390, 1024, 1440 e 2560px su entrambi i ruoli. Sotto 1024px non cambia **niente**:
confronto elemento per elemento del DOM renderizzato prima e dopo, 117 elementi a /studio e
143 sulla dashboard genitore, tutte le geometrie identiche (l'unico scarto è la CTA "Aggiungi
Log Diario", che oscilla di 5px da sola per via dell'animazione `pulse-ring`).

Il `<dialog>` di conferma del logout ora vive **dentro** un header con `backdrop-blur` — la
sidebar il blur non ce l'aveva. Verificato che non ricada nel problema della sezione qui
sotto: il top layer non è soggetto al blocco contenitore, la finestra copre il viewport
(1440×900 a partire da 0,0) e resta centrata.

### `UserMenu` nella barra: era una funzione mancante, non estetica (2026-08-05)

`UserMenu` viveva **solo** nell'header della dashboard, cioè su una pagina su quattro. Da
Diario, Ricette e Info il genitore **non aveva alcun modo di uscire**, e nemmeno di arrivare a
`/impostazioni`: quella pagina non è tra le sue voci di navigazione, quindi il menu ne è
l'unico ingresso. Oggi il componente sta in fondo a destra nella barra, per entrambi i ruoli.

- **Sotto `lg` resta dov'era** — nell'header della dashboard, con `lg:hidden` — perché la
  barra non esiste e quella è l'unica uscita che il genitore ha su mobile. Non è un duplicato:
  i due si escludono per larghezza.
- **È montato due volte insieme**, quindi l'id del bottone è parametrico
  (`btn-user-menu` / `btn-user-menu-desktop`, come `nav-home` / `nav-home-desktop`). Con un id
  fisso il DOM ne conteneva due uguali e `getElementById` restituiva quello **nascosto** —
  preso mentre misuravo, non da un errore.
- **Effetto voluto: il badge "novità" ora si vede su ogni pagina.** Un genitore che sta
  leggendo le ricette si accorge che il medico ha risposto; prima doveva passare dalla home.
  L'azzeramento del flag all'apertura del menu è l'unico punto dell'app dove avviene, e
  funziona da entrambe le posizioni — verificato accendendo `haRispostaMedicoNonLetta`
  dall'Admin SDK su dev e rileggendo il documento dopo il click, non guardando solo la UI.
- **Il medico ha lo stesso menu, senza "Profilo & Impostazioni"**: ha già Impostazioni come
  voce della barra, e due strade per lo stesso posto sulla stessa riga sono rumore. Il motivo
  per cui ha un dropdown invece del bottone "Esci" secco che aveva nella sidebar non è la
  simmetria: su una postazione condivisa l'identità dell'account va letta *mentre* si scrivono
  prescrizioni, e prima compariva solo nell'intestazione della Control Room — cioè non nella
  scheda paziente, che è dove le prescrizioni si scrivono.

**Bug preesistente corretto per necessità:** la chiusura al click fuori usava un overlay
`fixed inset-0` che **non ha mai funzionato**, nemmeno su mobile. `UserMenu` vive dentro header
con `backdrop-blur`, e vale la sezione qui sotto: misurato prima della modifica, l'overlay era
390×**125** invece di 390×844, cioè grande quanto l'header della dashboard, e cliccare sul
contenuto non chiudeva niente. Ora la chiusura passa da `useChiusuraAlClickFuori` (dal
2026-08-06; prima era lo stesso listener scritto a mano qui dentro). Il menu in sé resta
`absolute` ed è corretto: un elemento assoluto si ancora
al primo antenato **posizionato**, che non è toccato dal blocco contenitore — il portale come
in `SearchAndFilterBar` serviva lì perché il menu veniva *ritagliato* da un `overflow`, che qui
non succede.

### `/impostazioni` per il genitore esiste solo dentro `UserMenu`

**Il genitore non ha `/impostazioni` tra le sue voci di navigazione** — né in `NAV_ITEMS_GENITORE`
né, di conseguenza, nella bottom nav o nella barra. L'unico ingresso a quella pagina è la voce
"Profilo & Impostazioni" nel dropdown di `UserMenu`. E poiché `/impostazioni` contiene a sua
volta un "Esci dall'Account", quel dropdown è **sia l'unica porta verso le impostazioni sia
l'unica uscita dall'app su mobile** (il medico no: ha Impostazioni come voce di barra).

È una dipendenza che **non si vede leggendo i componenti**: `UserMenu` sembra un menu account
qualunque, e niente nel codice dice che due funzioni dell'app dipendono dal fatto che sia
montato. Chi lo nasconde, lo condiziona, o lo sposta dietro un breakpoint sta togliendo delle
strade, non spostando un controllo. È il motivo per cui nella dashboard è `lg:hidden` invece
che rimosso.

Le vie d'uscita, per intero: barra desktop (entrambi i ruoli, ogni pagina), header della
dashboard sotto `lg` (solo genitore), pagina `/impostazioni`, schermata "profilo non
disponibile". Tutte passano da `BottoneLogout`.

### Il selettore paziente sta accanto al nome, non su una riga sua (2026-08-06)

`UtenteSwitcher` stava su una **riga propria** sotto il saluto, nell'header della dashboard
genitore. Oggi sta sulla stessa riga del nome. Non è un ritocco estetico: **l'header è
`sticky`**, quindi la sua altezza è tolta al contenuto su tutta la dashboard, non solo in cima.

**Misurato: da 125px a 75px**, identico a 375, 1024 e 1440 — l'altezza dell'header non dipende
dalla larghezza, quindi i 50px tornano indietro a ogni schermata e a ogni larghezza.

Le tre classi che lo tengono in piedi, tutte necessarie:

- **`min-w-0` su entrambi i livelli** del contenitore flex (la riga e il blocco saluto+nome).
  È ciò che permette al nome di **troncare** invece di spingere fuori il selettore: un elemento
  flex ha `min-width: auto` di default e si rifiuta di rimpicciolirsi sotto il proprio
  contenuto. Su uno solo dei due livelli non basta.
- **`truncate` sul nome** — il nome è testo, ed è la cosa giusta da tagliare.
- **`flex-shrink-0` sul selettore** — è un **controllo**, non testo: schiacciato resta a
  schermo ma smette di essere cliccabile per intero.

Provato con un nome lungo a 375px: il nome tronca, il selettore **resta intero a 148px**,
nessuna sovrapposizione con `UserMenu` e nessun overflow di pagina. Senza `min-w-0`, un
genitore con un nome lungo schiaccia il selettore contro `UserMenu`.

**Perché questa sezione esiste:** il selettore su una riga propria è la disposizione più ovvia
da scrivere, e chi la rimettesse oggi non troverebbe **da nessuna parte** il motivo per cui era
stata tolta — la misura viveva solo nel messaggio di commit `0211b6c`. Il costo non si vede
guardando l'header: si vede in fondo alla pagina, dove mancano 50px di contenuto a ogni
scorrimento.

Due dettagli decisi nello stesso passaggio, per non riaprirli:

- **Il saluto usa il nome del genitore, non quello del bambino.** L'identità del bambino la
  porta il selettore lì accanto: metterla anche nel saluto ripeterebbe lo stesso nome a pochi
  pixel di distanza.
- **Il selettore si vede a ogni larghezza**, senza `lg:hidden` e senza condizioni. Nasconderlo
  toglie a un genitore con più figli l'unico modo di cambiare paziente — stessa famiglia di
  errore descritta per `UserMenu` qui sopra.

## `backdrop-blur` sull'header rompe i figli `position: fixed` (2026-08-03)

Gli header di questo progetto usano `backdrop-blur-xl`. `backdrop-filter` (come `transform`,
`filter`, `will-change`, `contain`, `perspective`) **crea un blocco contenitore per i
discendenti `position: fixed`**: dentro quell'header, `fixed` non significa più "rispetto al
viewport" ma "rispetto all'header". Non è deducibile leggendo il codice — la classe sta su un
elemento, l'effetto si vede su un altro.

Cosa è costato finora, in `SearchAndFilterBar.tsx`:
- il menu del filtro "Fase" posizionato con coordinate da `getBoundingClientRect()` finiva
  **264px lontano dal bottone**, perché le coordinate del viewport venivano risolte contro
  l'origine dell'header;
- l'overlay `fixed inset-0` che chiude il menu al click fuori **copriva solo l'header** invece
  della pagina: cliccare altrove non chiudeva niente. Era rotto da sempre, per la stessa
  ragione, e nessuno se n'era accorto perché il menu era già inutilizzabile per un altro
  motivo (vedi sotto).

### Regola: niente overlay `fixed inset-0` per chiudere un dropdown

**Questo pattern ha già fallito tre volte, sempre allo stesso modo, e ogni volta era rotto dal
primo giorno senza che nessuno se ne accorgesse:**

| dove | overlay misurato | doveva essere | scoperto |
|---|---|---|---|
| `SearchAndFilterBar` (filtro "Fase") | solo l'header | il viewport | 2026-08-03 |
| `UserMenu` (menu account) | 390×**125** | 390×844 | 2026-08-05 |
| `UtenteSwitcher` (selettore paziente) | 375×**125** | 375×812 | 2026-08-06 |

Tre volte non è sfortuna, è il pattern sbagliato per questo progetto: **ogni header qui ha
`backdrop-blur`**, quindi qualunque `fixed` che ci nasca dentro si ancora all'header. E il
fallimento è silenzioso nel modo peggiore — il menu si apre, si usa, si chiude dal bottone:
manca solo il click fuori, che nessuno verifica di proposito. In `UserMenu` è sopravvissuto
per mesi in produzione.

**La terza volta è la ragione per cui esiste `src/hooks/useChiusuraAlClickFuori.ts`.** Quando
si è ripresentata, questa regola era già scritta qui da tre giorni: il bug è stato trovato
**misurando per altro** — spostando lo switcher accanto al nome del genitore — non rileggendo
la documentazione. La conclusione è che una regola scritta non basta se il modo sbagliato resta
più facile da scrivere di quello giusto. L'hook rende il modo giusto un import.

**Quindi: la chiusura al click fuori si fa con `useChiusuraAlClickFuori(aperto, ref, onChiudi)`**
(usato da `UserMenu` e `UtenteSwitcher`). Non dipende dal contesto di impilamento, non ha
z-index da bilanciare, e funziona ovunque il componente venga spostato. Da preferire anche fuori
dagli header: il prossimo dropdown potrebbe finirci dentro per un refactor, e allora si
romperebbe senza che nessuno tocchi quel file. L'hook accetta **più ref** proprio per il caso in
cui trigger e menu non condividano un antenato (menu in un portale): senza il ref del bottone,
premerlo per chiudere lo chiuderebbe e riaprirebbe nello stesso gesto.

### Censimento al 2026-08-06: `fixed inset-0` non chiude più nessun dropdown

Cercato in tutto `src/`. Ne restano **due**, entrambe sfondi e nessuna delle due rotta; le
altre due erano overlay di chiusura e sono state migrate all'hook. Delle due rimaste, una
merita attenzione:

| dove | cos'era | stato |
|---|---|---|
| `UtenteSwitcher` | overlay di chiusura | **rimosso**, sostituito dall'hook |
| `SearchAndFilterBar` | overlay di chiusura del filtro "Fase" | **rimosso**, sostituito dall'hook con due ref |
| `diario/nuovo/page.tsx:577` | sfondo del modale di emergenza | resta, e va bene — ma leggi l'avvertenza qui sotto |
| `(auth)/layout.tsx:15` | sfondo decorativo | resta: `pointer-events-none`, nessun antenato che crei blocco contenitore |

**Come overlay di chiusura non ne esiste più nemmeno uno, ed è il punto**: da oggi
`grep -rn "fixed inset-0" src/` è esso stesso il controllo. Chi lo reintroduce sta scrivendo
qualcosa che in questo repo non ha precedenti, e chi legge il codice non trova un esempio da
imitare.

`SearchAndFilterBar` era l'unico dei tre che **funzionasse davvero** — misurato 1440×900, cioè
il viewport intero — ma per una ragione collaterale: stava dentro il portale insieme al menu,
quindi non era discendente dell'header con `backdrop-blur`. Migrato lo stesso, perché chi tocca
l'arrangiamento del portale lo rirompeva senza che nulla lo segnalasse. **Il portale resta**:
serve a un problema diverso, il ritaglio (vedi la nota sull'`overflow-x-auto` più sotto), e
quella funzione non è cambiata.

⚠️ **Il modale di emergenza in `diario/nuovo` funziona per una condizione che nessuno sa di
dover mantenere.** Non è dentro l'header: è **fratello** di `<header>` e `<main>`, figlio
diretto della radice della pagina, e né `AppShell` né `app/layout.tsx` hanno `backdrop-blur`,
`transform`, `filter`, `will-change`, `contain` o `perspective`. Basta una di quelle proprietà
su un qualsiasi antenato — o annidarlo dentro l'header per comodità di JSX — perché il suo
`fixed inset-0` smetta di coprire il viewport e si ancori a quel contenitore. Succederebbe in
silenzio, come le altre tre volte, ma **su un modale clinico**: quello che dice a una famiglia
di chiamare il pediatra. Se un giorno va spostato, va rimisurato — `getBoundingClientRect()`
deve dare il viewport intero — oppure portato in un portale su `document.body`.

Gli altri componenti con uno stato "aperto" non usano affatto il pattern e non sono a rischio:
`FasePazienteCard` (form in linea), `info/page` (accordion), `BottoneLogout` (`<dialog>` nativo
con `showModal()`, quindi top layer, che il blocco contenitore non tocca).

Il menu **in sé** può restare `absolute`: si ancora al primo antenato *posizionato*, che il
blocco contenitore non tocca. Il portale di `SearchAndFilterBar` risolve un problema diverso —
lì il menu veniva **ritagliato** da un `overflow` — e non va copiato dove quel problema non
c'è. Le due cose sono ora separate anche nel codice: il portale per il ritaglio,
`useChiusuraAlClickFuori` per la chiusura.

**Qualunque dropdown, tooltip, popover o overlay che nasca dentro un header con
`backdrop-blur` avrà lo stesso problema.** La soluzione usata è un portale su `document.body`
(`createPortal`), che toglie l'elemento da sotto quell'ancoraggio. Non correggere le
coordinate a mano compensando l'offset dell'header: funzionerebbe finché qualcuno non aggiunge
un `transform` da un'altra parte, e allora si romperebbe di nuovo in silenzio.

Nota collegata sullo stesso file: la riga dei filtri ha `overflow-x-auto`, e **il CSS forza
l'asse non specificato da `visible` ad `auto`**. Quel contenitore quindi ritaglia anche in
verticale (`clientHeight` 34px contro un menu da 222px), e ritagliava il menu a tutte le
larghezze, mobile compreso. L'`overflow-x` serve davvero — con una fase selezionata la riga
misura 463px contro 396 disponibili — quindi la via d'uscita è togliere il menu dal
contenitore, non togliere l'overflow.

## Le date solo-giorno non si leggono con `new Date()` (2026-08-03)

`dataNascita` e `dataOperazione` sono stringhe `YYYY-MM-DD`. Lo standard impone di
interpretarle come **UTC**, quindi `new Date("2026-07-27")` in Italia sono le 02:00 del 27.
Confrontarle con `new Date()`, che è l'istante locale, sposta i conti di qualche ora — e
quelle ore bastano a cambiare il giorno di calendario. Con intervento il 27/07, alle 00:30 del
03/08 la dashboard mostrava il **6°** giorno post-op invece del 7°, cioè il piano alimentare
del giorno prima. A fusi negativi lo scarto è ancora più visibile: le tre schermate che
stampano "Operato il …" mostravano il giorno precedente.

Usare sempre `src/lib/utils/date.ts`:
- `parseDataLocale(iso)` per i campi solo-giorno;
- `differenzaInGiorni(a, b)` — arrotonda, non tronca: tra due mezzanotti locali ci sono 23 o
  25 ore nei giorni di cambio dell'ora legale;
- `oggiPerInputDate()` per il `max` degli `<input type="date">` — `toISOString()` dà il giorno
  UTC, e dopo mezzanotte vietava di selezionare la giornata in corso.

`createdAt` e `timestamp` sono invece istanti veri (ISO con orario): per quelli `new Date()`
è corretto e queste funzioni non servono. `calcolaGiornoPostOp` non esiste più: troncava i
negativi a zero, ed è stata sostituita da `calcolaGiorniDaOperazione` in `lib/utils/fase.ts`,
che restituisce il valore con segno.

## La fase post-operatoria si calcola, non si dichiara (2026-08-03)

Il form chiedeva sia `dataOperazione` sia `faseAttualeId`, ma la seconda si ricava dalla
prima. La fase veniva scritta alla creazione della scheda e **non aggiornata mai più**
(`updateUtentePhase` esisteva e non era chiamata da nessuna parte), quindi dopo pochi giorni
il documento diceva il falso: "figlio prova" risultava al 7° giorno post-op e insieme in
"FASE 1 — liquidi freddi". Non è cosmetico — da quel valore dipende il piano alimentare che
legge il genitore.

Oggi `src/lib/utils/fase.ts` deriva lo stato da data dell'intervento, giorno corrente e
`giorniRange` delle fasi. **In quel file non compare nessun numero di giorni**: gli intervalli
arrivano da `/fasi`, e questo vale anche per la soglia oltre la quale il percorso è concluso,
che è il massimo dei range configurati. Cambiare le fasi resta una modifica di dati.

Quattro stati, non uno:
- **pre-operatorio** — `dataOperazione` può essere nel futuro (la specifica prevede
  l'intervento "previsto o eseguito"). Il form non vieta più le date future.
- **in fase** — il caso normale.
- **percorso concluso** — oltre l'ultimo giorno coperto. Il piano alimentare **sparisce**
  invece di mostrare per sempre l'ultima fase, che a 30 giorni direbbe ancora "recupero quasi
  completo, visita di controllo".
- **indeterminato** — data illeggibile o `/fasi` vuota, dichiarato invece di restituire un
  numero che sembra valido.

L'override del medico (`faseOverride`) vince su tutto ed è mostrato come forzato a entrambi.
Se punta a una fase non più configurata, si ricade sul calcolo automatico invece di non
mostrare niente.

### Cosa vede il genitore del forzamento, e perché così (2026-08-03)

Solo una pillola ambra: **"Fase impostata dal medico"**, testo fisso. Il riquadro fa
**attribuzione** — non è il calcolo automatico, l'ha deciso una persona — non identificazione.

- **Il motivo clinico NON gli viene mostrato.** Mostrarlo apriva un secondo canale
  medico→genitore che nessuno aveva progettato, a dieci pixel dalle prescrizioni, che quel
  ruolo ce l'hanno per davvero e sono firmate e datate. Il medico finiva a scrivere in stile
  clinico ("riabilitazione quasi conclusa") in un campo letto da un genitore come messaggio
  rivolto a lui.
- **Il motivo resta obbligatorio** anche se non è più rivolto a nessuno: il forzamento
  scavalca il calcolo e cambia le indicazioni alimentari che la famiglia riceve, quindi è
  l'unica traccia del perché — per il medico stesso più avanti o per un collega.
- **⚠️ Il campo non è riservato.** "Interno" vuol dire *non mostrato nell'app*. Vive su
  `/utenti/{id}`, che il genitore legge per intero: lo riceve comunque nella risposta di rete.
  L'etichetta nel form lo dice esplicitamente, perché promettere una riservatezza che non
  esiste è peggio che non prometterla — qualcuno ci scriverebbe dentro cose che il genitore
  non deve poter leggere. Per una nota davvero riservata servirebbe una sotto-collezione con
  lettura ristretta al medico. Non fatta.

**Valutato e scartato: mostrare il nome del medico.** Le prescrizioni dicono "Dr. Rossi", il
forzamento no, ed è un'incoerenza cosmetica voluta. Il genitore **non può** risolvere
`faseOverrideDa` (un uid): `/accounts/{uid}` ha `allow read` solo per il proprietario, ed è
giusto così. L'unica via sarebbe denormalizzare `faseOverrideDaNome` come fa `addPrescrizione`
con `medicoNome`, il che comporta un dato duplicato che diventa stale se il medico cambia
cognome, più una modifica alla `hasOnly` delle regole e due deploy con relative verifiche su
progetti appena allineati. Il nome non aggiunge nulla all'attribuzione. **Non è una
dimenticanza: non riaprirlo senza una ragione nuova.**

### Le fasi sono ancora definite in DUE posti (erano tre)

1. **`seed-data/fasi.json`** → i documenti `/fasi/{faseId}`. È la fonte che l'app legge.
2. **`FASI_FALLBACK` in `src/hooks/useFasi.ts`** → usato solo se `/fasi` è vuota o
   irraggiungibile. Contenuto duplicato di (1). Da quando esiste, quando scatta lo dice in
   console: prima una `/fasi` vuota era indistinguibile dal funzionamento normale.

Il terzo posto — `FASE_OPTIONS` in `SearchAndFilterBar.tsx` — **non esiste più**: le voci del
filtro "per fase" vengono dalle stesse fasi caricate, e il filtro confronta la fase *derivata*
invece di `faseAttualeId`. Prima quel filtro selezionava i pazienti in base a dove si
trovavano il giorno dell'iscrizione, e con 4 fasi avrebbe offerto una fase inesistente.

**Il cliente deve ancora confermare se le fasi sono 4 o 5.** Quando risponderà: aggiornare
`seed-data/fasi.json`, rilanciare il seed **su dev e su produzione** — dal 2026-08-04 le
nostre 5 fasi stanno anche su `tonsilcare-app`, quindi non basta più allineare l'ambiente di
sviluppo — e allineare `FASI_FALLBACK`. Il resto segue da solo, Control Room compresa. Nota
che il tipo `PostOpPhase` è un'unione di cinque id: togliere una fase dai dati non aggiorna il
tipo, e aggiungerne una richiede di toccarlo.

Il seed su produzione richiede il flag esplicito e riscrive tutte e quattro le collezioni, non
solo `/fasi`: vedi la sezione sul seeding, e ricorda che da quando quell'ambiente ha contenuti
la riscrittura non è più a costo zero come lo era su un progetto vuoto.

## Cookie `__role`: scrittura sincrona al login/registrazione (2026-07-17)

`src/proxy.ts` decide il redirect RBAC medico↔genitore (`/` → `/studio` e viceversa) leggendo il cookie `__role`. Quel cookie **non va più impostato solo** nel listener asincrono `onAuthStateChanged` di `src/context/AuthContext.tsx` (che fa un fetch Firestore prima di scriverlo): se il login/la registrazione fa `router.push()` prima che quel fetch sia completato, il middleware valuta il redirect con `__role` ancora assente e lo salta — bug riprodotto: un medico che fa login atterra sulla dashboard genitore invece che su `/studio`, e solo una navigazione manuale successiva (quando il cookie è ormai arrivato) funziona correttamente.

Fix: `src/app/(auth)/login/page.tsx` e `src/app/(auth)/registrazione/page.tsx` scrivono `__role` esplicitamente e **prima** di `router.push`, in modo sincrono col resto del flusso di autenticazione (il login legge il profilo con `getAccountProfile`; la registrazione lo sa già staticamente, `signUp` crea sempre `ruolo: "genitore"`). `AuthContext.tsx` resta invariato e continua a coprire i cambi di ruolo durante una sessione già attiva — qualunque nuovo flusso di autenticazione aggiunto in futuro (SSO, magic link, ecc.) deve replicare lo stesso pattern: scrivere `__role` prima di navigare, non affidarsi solo al listener.
