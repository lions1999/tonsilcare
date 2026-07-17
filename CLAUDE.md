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
