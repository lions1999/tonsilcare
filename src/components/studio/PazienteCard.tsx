/**
 * @file src/components/studio/PazienteCard.tsx
 * @description Riga paziente nella Control Room medica, con badge alert e novità.
 *
 * Una sola presentazione per entrambe le larghezze: sotto `lg` è una card
 * dimensionata per il dito, da `lg` in su si compatta per il mouse e guadagna
 * lo stato "selezionato", che su mobile non serve perché lista e dettaglio non
 * sono mai visibili insieme.
 */

import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { UtenteProfile } from "@/types";
import type { DailyLog } from "@/lib/validations/diary";

export interface UtenteWithStatus extends UtenteProfile {
  latestLog: DailyLog | null;
  hasAlert: boolean;
}

interface PazienteCardProps {
  utente: UtenteWithStatus;
  /** True se è il paziente attualmente aperto nel pannello di destra. */
  selezionato?: boolean;
}

export default function PazienteCard({
  utente,
  selezionato = false,
}: PazienteCardProps) {
  // Lo sfondo dice la gravità, bordo e anello dicono la selezione: due
  // informazioni indipendenti che non devono sovrascriversi. Su un paziente in
  // allerta la selezione tocca quindi solo bordo e anello — colorare anche lo
  // sfondo spegnerebbe il rosso proprio sulla riga che il medico sta guardando,
  // cioè quella che ha più bisogno di restare riconoscibile a colpo d'occhio.
  const sfondo = utente.hasAlert
    ? "border-red-900/50 bg-red-950/20"
    : "border-slate-800/60 bg-slate-900/40";

  const selezione = selezionato
    ? utente.hasAlert
      ? "lg:border-indigo-400 lg:ring-1 lg:ring-indigo-400/60"
      : "lg:border-indigo-500 lg:bg-indigo-950/30 lg:ring-1 lg:ring-indigo-500/40"
    : "lg:hover:border-slate-700 lg:hover:bg-slate-900/70";

  return (
    <Link
      href={`/studio/utente/${utente.id}`}
      aria-current={selezionato ? "page" : undefined}
      className={`block rounded-2xl border p-4 transition-all hover:scale-[1.02] active:scale-95 lg:rounded-xl lg:p-3 lg:transition-colors lg:hover:scale-100 lg:active:scale-100 ${sfondo} ${
        utente.hasAlert ? "" : "hover:border-indigo-500/30"
      } ${selezione}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          {utente.haNuovoLogNonLetto && (
            <span
              aria-label="Nuovo log non letto"
              className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500"
            />
          )}
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-white text-lg lg:text-sm">
              {utente.nome} {utente.cognome}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 lg:mt-0 lg:text-[11px]">
              Operato il {new Date(utente.dataOperazione).toLocaleDateString("it-IT")}
            </p>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-3 lg:gap-1.5">
          {utente.hasAlert && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-900/50 px-2.5 py-1 text-xs font-medium text-red-200 border border-red-800/50 lg:gap-1 lg:px-2 lg:py-0.5 lg:text-[10px]">
              <AlertTriangle size={12} className="lg:h-2.5 lg:w-2.5" />
              Attenzione
            </span>
          )}
          {/* La freccia indica "apre un'altra schermata": su desktop il
              dettaglio è già accanto, quindi diventa rumore. */}
          <ChevronRight size={18} className="text-slate-500 lg:hidden" />
        </div>
      </div>

      {/* Ultimo Log Summary */}
      {utente.latestLog && (
        <div className={`mt-4 rounded-xl px-3 py-2 text-xs border lg:mt-2 lg:rounded-lg lg:px-2.5 lg:py-1.5 lg:text-[11px] ${
          utente.hasAlert ? "bg-red-950/40 border-red-900/30 text-red-200" : "bg-slate-800/40 border-slate-700/50 text-slate-300"
        }`}>
          <div className="flex justify-between items-center mb-1 lg:mb-0.5">
            <span className="opacity-80">Ultimo aggiornamento:</span>
            <span className="font-medium">
              {new Date(utente.latestLog.createdAt!).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="flex gap-4 font-medium mt-1 lg:mt-0.5 lg:gap-3">
            {utente.latestLog.temperatura && (
              <span>Temp: {utente.latestLog.temperatura}°C</span>
            )}
            {utente.latestLog.dolore !== undefined && (
              <span>Dolore: {utente.latestLog.dolore}/10</span>
            )}
            {(utente.latestLog.sanguinamento || utente.latestLog.vomito) && (
              <span className="text-red-400">Sintomi critici</span>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}
