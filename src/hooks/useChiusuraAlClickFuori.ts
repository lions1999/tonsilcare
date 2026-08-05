/**
 * @file src/hooks/useChiusuraAlClickFuori.ts
 * @description Chiude un dropdown quando si clicca fuori dai suoi contenitori.
 *
 * ESISTE PER IMPEDIRE UN BUG CHE SI È RIPETUTO TRE VOLTE. Il modo "ovvio" di
 * fare questa cosa è un overlay `fixed inset-0` sotto al menu che intercetta il
 * click. In questo progetto **non funziona**: ogni header ha `backdrop-blur`, e
 * `backdrop-filter` (come `transform`, `filter`, `will-change`, `contain`,
 * `perspective`) crea un blocco contenitore per i discendenti `position: fixed`.
 * L'overlay copre quindi l'header invece del viewport.
 *
 * Misurato, non dedotto, sui tre casi:
 *
 * | dove | overlay | doveva essere |
 * |---|---|---|
 * | SearchAndFilterBar (filtro "Fase") | solo l'header | il viewport |
 * | UserMenu (menu account) | 390×125 | 390×844 |
 * | UtenteSwitcher (selettore paziente) | 375×125 | 375×812 |
 *
 * Il fallimento è silenzioso nel modo peggiore: il menu si apre, si usa e si
 * chiude dal bottone — manca solo il click fuori, che nessuno verifica di
 * proposito. In `UserMenu` è sopravvissuto mesi in produzione, e in
 * `UtenteSwitcher` è stato trovato **misurando per altro**, non rileggendo la
 * regola già scritta in CLAUDE.md. Da lì questo hook: la documentazione da sola
 * non ha impedito la terza occorrenza, quindi il modo giusto deve costare meno
 * del modo sbagliato.
 *
 * Il menu **in sé** può restare `absolute`: si ancora al primo antenato
 * *posizionato*, che il blocco contenitore non tocca. Il portale usato in
 * `SearchAndFilterBar` risolve un problema diverso — lì il menu veniva
 * *ritagliato* da un `overflow` — e non va copiato dove quel problema non c'è.
 *
 * `pointerdown` e non `click`: si chiude appena si preme, prima che il click
 * arrivi a destinazione, ed è l'evento che copre mouse, tocco e penna insieme.
 */

"use client";

import { useEffect, useRef, type RefObject } from "react";

type Contenitore = RefObject<HTMLElement | null>;

/**
 * @param attivo  Se il menu è aperto. A `false` non c'è nessun listener
 *                registrato: non è un'ottimizzazione, è ciò che evita che N
 *                dropdown chiusi ascoltino ogni pointerdown della pagina.
 * @param contenitori Uno o più elementi considerati "dentro". Più di uno serve
 *                quando trigger e menu non condividono un antenato — p.es. se il
 *                menu è in un portale: senza il ref del bottone, premere il
 *                bottone per chiudere lo chiuderebbe e riaprirebbe subito.
 * @param onChiudi Cosa fare quando il click è fuori.
 */
export function useChiusuraAlClickFuori(
  attivo: boolean,
  contenitori: Contenitore | Contenitore[],
  onChiudi: () => void
): void {
  // Refs e callback letti al momento dell'evento, non catturati alla
  // sottoscrizione: senza, un `onChiudi` scritto inline (il caso normale)
  // cambierebbe identità a ogni render e farebbe togliere e rimettere il
  // listener di continuo.
  const ultimi = useRef({ contenitori, onChiudi });
  useEffect(() => {
    ultimi.current = { contenitori, onChiudi };
  });

  useEffect(() => {
    if (!attivo) return;

    const chiudiSeFuori = (e: PointerEvent) => {
      const { contenitori: correnti, onChiudi: chiudi } = ultimi.current;
      const elenco = Array.isArray(correnti) ? correnti : [correnti];
      const dentro = elenco.some((r) => r.current?.contains(e.target as Node));
      if (!dentro) chiudi();
    };

    document.addEventListener("pointerdown", chiudiSeFuori);
    return () => document.removeEventListener("pointerdown", chiudiSeFuori);
  }, [attivo]);
}
