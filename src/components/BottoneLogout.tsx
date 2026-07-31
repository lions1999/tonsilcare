/**
 * @file src/components/BottoneLogout.tsx
 * @description Punto unico di uscita dall'account: apre una conferma prima di
 * eseguire il logout.
 *
 * Esiste come componente unico perché l'app ha più punti da cui si esce
 * (sidebar del medico, menu utente del genitore, impostazioni, schermata di
 * profilo non disponibile) e ognuno di essi deve comportarsi allo stesso modo:
 * stessa conferma e, soprattutto, stessa procedura di uscita. Prima non era
 * così — la pagina Impostazioni chiamava Firebase direttamente e lasciava il
 * cookie di sessione al suo posto.
 *
 * Il trigger è passato come children, così ogni punto di chiamata mantiene il
 * proprio aspetto (icona, voce di menu, bottone pieno) senza che il componente
 * debba conoscere tutte le varianti.
 *
 * La finestra è un `<dialog>` nativo: porta con sé focus trap, chiusura con
 * Esc, backdrop e semantica modale senza aggiungere dipendenze. Per una singola
 * conferma è più sensato di una libreria di componenti.
 */

"use client";

import { useRef, useState, type ReactNode } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface BottoneLogoutProps {
  /** Contenuto del trigger: icona, testo, o entrambi. */
  children: ReactNode;
  /** Classi del trigger, per adattarlo al contesto in cui vive. */
  className?: string;
  ariaLabel?: string;
}

export default function BottoneLogout({
  children,
  className,
  ariaLabel,
}: BottoneLogoutProps) {
  const { signOut } = useAuth();
  const dialogo = useRef<HTMLDialogElement>(null);
  const [inCorso, setInCorso] = useState(false);

  const conferma = async () => {
    setInCorso(true);
    try {
      await signOut();
    } catch (errore) {
      console.error("Errore durante il logout:", errore);
      setInCorso(false);
      dialogo.current?.close();
    }
    // In caso di successo non riabilitiamo il bottone: signOut porta al login
    // e il componente viene smontato.
  };

  return (
    <>
      <button
        type="button"
        onClick={() => dialogo.current?.showModal()}
        className={className}
        aria-label={ariaLabel}
      >
        {children}
      </button>

      {/*
        Il <dialog> occupa tutto il viewport e il riquadro vero è il div interno.
        Serve per la chiusura al click fuori: con un dialog dimensionato sul
        contenuto, l'area attorno non gli appartiene e non riceve alcun evento —
        verificato, il click non arrivava proprio. `open:grid` applica il
        centraggio solo a finestra aperta, altrimenti sovrascriverebbe il
        `display: none` che la tiene nascosta.
      */}
      <dialog
        ref={dialogo}
        aria-labelledby="titolo-conferma-logout"
        onClick={(e) => {
          if (e.target === dialogo.current && !inCorso) dialogo.current?.close();
        }}
        className="m-0 h-full max-h-none w-full max-w-none bg-transparent p-4 text-slate-100 open:grid open:place-items-center backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm"
      >
        <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl shadow-black/60">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-950/50 ring-1 ring-red-800/50">
            <LogOut size={24} className="text-red-400" />
          </div>

          <h2
            id="titolo-conferma-logout"
            className="mb-2 text-lg font-bold text-white"
          >
            Vuoi uscire dall&apos;account?
          </h2>

          <p className="mb-6 text-sm leading-relaxed text-slate-400">
            Dovrai inserire di nuovo email e password per rientrare.
          </p>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={conferma}
              disabled={inCorso}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
            >
              {inCorso ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogOut size={16} />
              )}
              {inCorso ? "Uscita in corso..." : "Esci"}
            </button>

            <button
              type="button"
              onClick={() => dialogo.current?.close()}
              disabled={inCorso}
              className="w-full rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-60"
            >
              Annulla
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
