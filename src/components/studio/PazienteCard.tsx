/**
 * @file src/components/studio/PazienteCard.tsx
 * @description Riga paziente nella Control Room medica, con badge alert e novità.
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
}

export default function PazienteCard({ utente }: PazienteCardProps) {
  return (
    <Link
      href={`/studio/utente/${utente.id}`}
      className={`block rounded-2xl border p-4 transition-all hover:scale-[1.02] active:scale-95 ${
        utente.hasAlert
          ? "border-red-900/50 bg-red-950/20"
          : "border-slate-800/60 bg-slate-900/40 hover:border-indigo-500/30"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {utente.haNuovoLogNonLetto && (
            <span
              aria-label="Nuovo log non letto"
              className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500"
            />
          )}
          <div>
            <h3 className="font-semibold text-white text-lg">
              {utente.nome} {utente.cognome}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Operato il {new Date(utente.dataOperazione).toLocaleDateString("it-IT")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {utente.hasAlert && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-900/50 px-2.5 py-1 text-xs font-medium text-red-200 border border-red-800/50">
              <AlertTriangle size={12} />
              Attenzione
            </span>
          )}
          <ChevronRight size={18} className="text-slate-500" />
        </div>
      </div>

      {/* Ultimo Log Summary */}
      {utente.latestLog && (
        <div className={`mt-4 rounded-xl px-3 py-2 text-xs border ${
          utente.hasAlert ? "bg-red-950/40 border-red-900/30 text-red-200" : "bg-slate-800/40 border-slate-700/50 text-slate-300"
        }`}>
          <div className="flex justify-between items-center mb-1">
            <span className="opacity-80">Ultimo aggiornamento:</span>
            <span className="font-medium">
              {new Date(utente.latestLog.createdAt!).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="flex gap-4 font-medium mt-1">
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
