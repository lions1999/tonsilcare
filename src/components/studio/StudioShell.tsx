/**
 * @file src/components/studio/StudioShell.tsx
 * @description Disposizione a due pannelli del portale medico.
 *
 * Su desktop lista e dettaglio stanno sempre affiancati: si passa da un
 * paziente all'altro senza perdere di vista il triage. Su mobile lo spazio non
 * basta, quindi si vede l'uno o l'altro a seconda della rotta.
 *
 * La rotta resta la fonte di verità anche su desktop — /studio/utente/[id] è
 * una pagina vera, non uno stato interno — così deep link, ricaricamento e
 * tasto indietro continuano a funzionare.
 *
 * NOTA sulla larghezza della lista: il piano iniziale prevedeva a /studio una
 * tabella a piena larghezza, che si sarebbe ristretta all'apertura di un
 * paziente. È incompatibile con due pannelli sempre presenti — o la lista
 * occupa tutto, o c'è spazio per il dettaglio. Vince il pannello fisso: il
 * medico vede sempre entrambi, e la colonna a 380px resta leggibile su
 * qualunque monitor invece di rifloware a ogni selezione.
 */

"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import ListaPazienti from "@/components/studio/ListaPazienti";

export default function StudioShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const dettaglioAperto = pathname.startsWith("/studio/utente/");

  return (
    <div className="lg:flex lg:items-start lg:gap-6">
      {/* Pannello lista: su mobile sparisce quando è aperto un paziente. */}
      <div
        className={`${
          dettaglioAperto ? "hidden lg:block" : "block"
        } lg:sticky lg:top-0 lg:max-h-dvh lg:w-[380px] lg:flex-shrink-0 lg:overflow-y-auto`}
      >
        <ListaPazienti />
      </div>

      {/* Pannello dettaglio: su mobile compare solo su una scheda vera. */}
      <div
        className={`${
          dettaglioAperto ? "block" : "hidden lg:block"
        } min-w-0 lg:flex-1`}
      >
        {children}
      </div>
    </div>
  );
}
