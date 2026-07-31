/**
 * @file src/components/AppShell.tsx
 * @description Guscio dell'applicazione: sceglie la navigazione in base a ruolo
 * e larghezza.
 *
 * Esiste perché la scelta dipende dallo stato di autenticazione, che è
 * accessibile solo lato client, mentre il root layout è un server component.
 *
 * Regola di fondo: **la larghezza non viene mai rilevata in JavaScript.** Le tre
 * navigazioni sono tutte nel DOM e vengono mostrate o nascoste dai breakpoint
 * Tailwind. Usare matchMedia produrrebbe un mismatch di idratazione e uno
 * sfarfallio a ogni caricamento. Il ruolo, che JavaScript conosce, discrimina
 * *quale* chrome montare; la larghezza, che conosce solo il CSS, discrimina
 * quale mostrare.
 *
 * Sotto 1024px la struttura resta identica a quella precedente: i wrapper
 * aggiunti sono contenitori a blocco senza stile finché non scatta `lg`.
 */

"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";
import DesktopTopBar from "@/components/DesktopTopBar";
import DesktopSidebar from "@/components/DesktopSidebar";
import ProfiloNonDisponibile from "@/components/ProfiloNonDisponibile";

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, accountProfile, loading, profiloNonDisponibile } = useAuth();

  // Senza sessione (o mentre la si risolve) niente chrome: le rotte pubbliche
  // sono /login e /registrazione, dove ogni destinazione rimbalzerebbe indietro.
  const autenticato = !loading && !!user;
  const isMedico = accountProfile?.ruolo === "medico";

  // Sessione valida ma ruolo ignoto (profilo non caricabile o inesistente).
  // Non ripieghiamo sulla navigazione del genitore: sarebbe una UI sbagliata
  // con l'aria di essere quella giusta, e un medico si troverebbe davanti
  // l'interfaccia dei pazienti senza capire perché. Meglio fermarsi, dirlo, e
  // dare una via d'uscita.
  if (autenticato && profiloNonDisponibile) {
    return <ProfiloNonDisponibile />;
  }

  return (
    /*
      Da `lg` in su la finestra non scorre più: l'altezza è bloccata a quella
      del viewport e a scorrere sono i pannelli interni. È ciò che rende
      indipendenti lista e dettaglio nel portale medico — con un unico
      scorrimento di pagina, muovere l'uno trascinava anche l'altro.
      Sotto `lg` resta il normale scorrimento di pagina.
    */
    <div className="lg:flex lg:h-dvh lg:overflow-hidden">
      {autenticato && isMedico && <DesktopSidebar />}

      <div className="lg:flex lg:min-w-0 lg:flex-1 lg:flex-col">
        {autenticato && !isMedico && <DesktopTopBar />}

        {/*
          Contenitore del contenuto. Sotto `lg` conserva esattamente le classi
          originali del root layout (max-w-lg centrato, altezza piena, colonna).

          Da `lg` in su il tetto dipende dal ruolo, e non è un dettaglio
          estetico: il contenuto del genitore è fatto di card e testo, che oltre
          una certa larghezza diventano righe troppo lunghe da leggere, mentre
          la Control Room del medico diventerà una tabella e ha bisogno di spazio.

          Il medico ha comunque un tetto, solo molto più alto. Senza, su un
          monitor 2560 la riga paziente misura 2236px e su un ultrawide 3440
          arriva a 3116px: a quelle ampiezze l'occhio perde la corrispondenza
          tra la prima e l'ultima colonna della stessa riga. 1920px riempie
          qualsiasi monitor normale senza degenerare.
        */}
        <div
          className={`relative mx-auto flex min-h-dvh max-w-lg flex-col lg:min-h-0 lg:w-full lg:flex-1 lg:px-6 ${
            isMedico ? "lg:max-w-[1920px]" : "lg:max-w-5xl"
          }`}
        >
          {/*
            `lg:min-h-0` è necessario perché un figlio flex possa scorrere: senza,
            la sua altezza minima resta quella del contenuto e il pannello cresce
            invece di scorrere. `lg:pb-0` toglie il fondo che altrimenti farebbe
            eccedere di qualche decina di pixel i pannelli alti quanto la
            finestra, rendendo di nuovo scrollabile la pagina.
          */}
          <main
            id="main-content"
            className="flex-1 overflow-y-auto pb-20 lg:min-h-0 lg:pb-0"
          >
            {children}
          </main>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
