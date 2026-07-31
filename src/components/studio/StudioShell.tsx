/**
 * @file src/components/studio/StudioShell.tsx
 * @description Disposizione a due pannelli del portale medico.
 *
 * Su desktop lista e dettaglio stanno sempre affiancati e scorrono in modo
 * indipendente: si passa da un paziente all'altro senza perdere di vista il
 * triage, e leggere lo storico di una scheda non trascina via la lista.
 * Su mobile lo spazio non basta, quindi si vede l'uno o l'altro a seconda
 * della rotta e la pagina scorre come sempre.
 *
 * La rotta resta la fonte di verità anche su desktop — /studio/utente/[id] è
 * una pagina vera, non uno stato interno — così deep link, ricaricamento e
 * tasto indietro continuano a funzionare.
 *
 * NOTA sulla larghezza della lista: il piano iniziale prevedeva a /studio una
 * tabella a piena larghezza, che si sarebbe ristretta all'apertura di un
 * paziente. È incompatibile con due pannelli sempre presenti — o la lista
 * occupa tutto, o c'è spazio per il dettaglio. Vince il pannello fisso: il
 * medico vede sempre entrambi, e la colonna resta leggibile su qualunque
 * monitor invece di rifloware a ogni selezione.
 */

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import ListaPazienti from "@/components/studio/ListaPazienti";

export default function StudioShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const dettaglioAperto = pathname.startsWith("/studio/utente/");
  const pannelloDettaglio = useRef<HTMLDivElement>(null);

  /*
    Riporta in cima il pannello destro quando cambia paziente.

    Serve proprio perché ora quel pannello ha uno scorrimento proprio: senza,
    chi ha letto fino in fondo lo storico di un paziente e ne apre un altro se
    lo ritroverebbe già scorso a metà — o, se il nuovo paziente ha meno log,
    davanti a spazio vuoto senza capire perché. Con lo scorrimento di pagina
    unico il problema non esisteva.
  */
  useEffect(() => {
    pannelloDettaglio.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="lg:flex lg:h-full lg:gap-6">
      {/* Pannello lista: su mobile sparisce quando è aperto un paziente. */}
      <div
        className={`${
          dettaglioAperto ? "hidden lg:flex" : "block"
        } lg:h-full lg:w-[420px] lg:flex-shrink-0 lg:flex-col lg:overflow-hidden`}
      >
        <ListaPazienti />
      </div>

      {/* Pannello dettaglio: su mobile compare solo su una scheda vera. */}
      <div
        ref={pannelloDettaglio}
        className={`${
          dettaglioAperto ? "block" : "hidden lg:block"
        } min-w-0 lg:h-full lg:flex-1 lg:overflow-y-auto`}
      >
        {children}
      </div>
    </div>
  );
}
