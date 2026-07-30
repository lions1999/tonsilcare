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

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, accountProfile, loading } = useAuth();

  // Senza sessione (o mentre la si risolve) niente chrome: le rotte pubbliche
  // sono /login e /registrazione, dove ogni destinazione rimbalzerebbe indietro.
  const autenticato = !loading && !!user;
  const isMedico = accountProfile?.ruolo === "medico";

  return (
    <div className="lg:flex">
      {autenticato && isMedico && <DesktopSidebar />}

      <div className="lg:flex lg:min-w-0 lg:flex-1 lg:flex-col">
        {autenticato && !isMedico && <DesktopTopBar />}

        {/*
          Contenitore del contenuto. Sotto `lg` conserva esattamente le classi
          originali del root layout (max-w-lg centrato, altezza piena, colonna).

          Da `lg` in su il tetto dipende dal ruolo, e non è un dettaglio
          estetico: il contenuto del genitore è fatto di card e testo, che oltre
          una certa larghezza diventano righe troppo lunghe da leggere, mentre
          la Control Room del medico diventerà una tabella e ha bisogno di tutto
          lo spazio disponibile.
        */}
        <div
          className={`relative mx-auto flex min-h-dvh max-w-lg flex-col lg:min-h-0 lg:w-full lg:flex-1 lg:px-6 ${
            isMedico ? "lg:max-w-none" : "lg:max-w-5xl"
          }`}
        >
          <main
            id="main-content"
            className="flex-1 overflow-y-auto pb-20 lg:pb-10"
          >
            {children}
          </main>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
