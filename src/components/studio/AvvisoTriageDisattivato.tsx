/**
 * @file src/components/studio/AvvisoTriageDisattivato.tsx
 * @description Avviso mostrato al medico quando mancano le soglie cliniche.
 *
 * Senza `/config/alerts`, `valutaAlertFinestra` non produce nessun motivo e
 * `hasAlert` è false per ogni paziente a prescindere dai valori: nessuna riga
 * rossa, filtro "Con allerta" sempre vuoto, nessuna icona sui log, nessun errore
 * e nessun warning. Il medico non vede un sistema degradato, vede un reparto in
 * cui sta bene tutto.
 *
 * DUE COSE CHE SEMBRANO DETTAGLI E NON LO SONO:
 *
 * 1. **Non è chiudibile, e non per svista.** Un avviso che dice "gli allarmi
 *    sono spenti" e ha una X viene chiuso una volta e non rivisto più, mentre la
 *    condizione resta. Qui non c'è stato da chiudere: sparisce solo quando le
 *    soglie tornano.
 * 2. **Il testo smentisce un'inferenza, non segnala un errore tecnico.** Il
 *    rischio non è che il medico non sappia di una configurazione mancante: è
 *    che legga una lista senza righe rosse e concluda che stanno tutti bene. Per
 *    questo la terza frase nomina esplicitamente ciò che il medico sta
 *    guardando. Non annacquarla in un generico "errore di configurazione".
 *
 * Solo lato medico: le schermate del genitore hanno i loro fallback hardcoded e
 * un avviso lì direbbe a un genitore qualcosa che non può risolvere.
 */

import { ShieldAlert } from "lucide-react";

/**
 * Dove l'avviso è montato. Cambia SOLO la terza frase.
 *
 * La formulazione concordata è scritta per la lista ("in questa lista", "apri le
 * singole schede"): detta a chi ha già una scheda aperta direbbe di fare ciò che
 * sta già facendo, cioè renderebbe l'avviso ignorabile proprio dove serve di più
 * — su mobile la scheda è l'unico punto dell'app in cui il medico legge log
 * clinici senza la lista accanto. Titolo e seconda riga restano identici nei due
 * casi: sono quelli che portano il significato.
 */
export type ContestoAvviso = "lista" | "scheda";

interface TestoContesto {
  /** Cosa il medico sta guardando e potrebbe leggere come rassicurazione. */
  premessa: string;
  /** Che cosa quel silenzio non significa. */
  conclusioneSbagliata: string;
  /** Cosa fare al posto di fidarsene. */
  cosaFare: string;
}

const TESTO: Record<ContestoAvviso, TestoContesto> = {
  lista: {
    premessa: "L'assenza di segnalazioni in questa lista",
    conclusioneSbagliata: "significa che i parametri siano nella norma",
    cosaFare: "apri le singole schede e avvisa chi gestisce l'ambiente.",
  },
  scheda: {
    premessa: "L'assenza di icone di allerta su questi log",
    conclusioneSbagliata: "significa che i valori siano nella norma",
    cosaFare: "leggili uno per uno e avvisa chi gestisce l'ambiente.",
  },
};

export default function AvvisoTriageDisattivato({
  contesto,
  className = "",
}: {
  contesto: ContestoAvviso;
  className?: string;
}) {
  const { premessa, conclusioneSbagliata, cosaFare } = TESTO[contesto];

  return (
    <aside
      role="alert"
      aria-live="assertive"
      className={`flex items-start gap-3 rounded-xl border border-red-500/50 bg-red-950/60 p-3 ${className}`}
    >
      <ShieldAlert size={18} className="mt-0.5 flex-shrink-0 text-red-400" />
      <div className="min-w-0">
        <p className="text-xs font-bold text-red-200">
          Soglie di allerta non configurate — il triage è disattivato.
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-red-200/80">
          Nessun paziente può risultare in allerta finché manca la configurazione
          clinica. {premessa}{" "}
          <strong className="font-bold text-red-200">non</strong>{" "}
          {conclusioneSbagliata}: {cosaFare}
        </p>
      </div>
    </aside>
  );
}
