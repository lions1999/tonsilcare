/**
 * @file src/components/ProfiloNonDisponibile.tsx
 * @description Schermata mostrata quando c'è una sessione valida ma il profilo
 * dell'account — e quindi il ruolo — non è stato caricato.
 *
 * Sostituisce il contenuto dell'app invece di affiancarlo: senza ruolo non si
 * sa se l'utente sia un genitore o un medico, e mostrare comunque le pagine
 * significherebbe far vedere a un medico l'interfaccia del genitore. Meglio
 * fermarsi e dirlo.
 *
 * Le due vie d'uscita sono entrambe necessarie: il retry per l'errore
 * transitorio (rete assente al caricamento), il logout perché senza di esso una
 * sessione con profilo rotto sarebbe un vicolo cieco permanente — non c'è
 * nessuna navigazione visibile da cui andarsene.
 */

"use client";

import { useState } from "react";
import { AlertTriangle, RefreshCcw, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import BottoneLogout from "@/components/BottoneLogout";

export default function ProfiloNonDisponibile() {
  const { ricaricaProfilo } = useAuth();
  const [inCorso, setInCorso] = useState(false);
  const [tentativoFallito, setTentativoFallito] = useState(false);

  const riprova = async () => {
    setInCorso(true);
    setTentativoFallito(false);
    try {
      await ricaricaProfilo();
      // Se il profilo è stato caricato questo componente viene smontato da
      // AppShell; se siamo ancora qui, il problema persiste.
      setTentativoFallito(true);
    } finally {
      setInCorso(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 p-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-950/50 ring-1 ring-amber-700/40">
        <AlertTriangle size={34} className="text-amber-500" />
      </div>

      <h1 className="mb-3 text-xl font-black tracking-tight text-white">
        Non riusciamo a caricare il tuo profilo
      </h1>

      <p className="mb-8 max-w-sm text-sm leading-relaxed text-slate-400">
        L&apos;accesso è andato a buon fine, ma non siamo riusciti a recuperare i
        dati del tuo account. Senza non possiamo mostrarti le sezioni giuste.
        Spesso dipende dalla connessione: riprova tra un istante.
      </p>

      {tentativoFallito && (
        <p
          role="status"
          className="mb-6 max-w-sm rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs leading-relaxed text-slate-400"
        >
          Il problema persiste. Se continua, esci e rientra: se anche così non si
          risolve, l&apos;account potrebbe avere bisogno di assistenza.
        </p>
      )}

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          onClick={riprova}
          disabled={inCorso}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-transform hover:bg-blue-500 active:scale-95 disabled:opacity-60"
        >
          {inCorso ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <RefreshCcw size={18} />
          )}
          {inCorso ? "Riprovo..." : "Riprova"}
        </button>

        <BottoneLogout className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-slate-700">
          <LogOut size={18} />
          Esci dall&apos;account
        </BottoneLogout>
      </div>
    </div>
  );
}
