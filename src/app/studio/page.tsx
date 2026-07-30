/**
 * @file src/app/studio/page.tsx
 * @description Stato del pannello destro quando nessun paziente è selezionato.
 *
 * La lista non è più qui: vive nel layout, così resta montata mentre si naviga
 * tra i pazienti (vedi src/app/studio/layout.tsx). Questa pagina riempie solo
 * il pannello di destra, ed è visibile unicamente su desktop — su mobile a
 * /studio si vede la lista a schermo intero, non un invito a selezionare.
 */

"use client";

import { MousePointerClick } from "lucide-react";
import { useStudioPazienti } from "@/context/StudioPazientiContext";

export default function StudioPage() {
  const { pazienti, loading } = useStudioPazienti();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center lg:min-h-dvh">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60">
        <MousePointerClick size={26} className="text-slate-600" />
      </div>

      <h2 className="mb-2 text-base font-semibold text-slate-300">
        Nessun paziente selezionato
      </h2>

      <p className="max-w-xs text-sm leading-relaxed text-slate-500">
        {loading
          ? "Caricamento dei pazienti in corso..."
          : pazienti.length === 0
            ? "Non ci sono ancora pazienti da seguire."
            : "Scegli un paziente dalla lista per vedere i suoi parametri e inviare una prescrizione."}
      </p>
    </div>
  );
}
