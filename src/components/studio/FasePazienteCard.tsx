/**
 * @file src/components/studio/FasePazienteCard.tsx
 * @description Fase post-operatoria nella scheda paziente del medico, con il
 * comando per forzarla.
 *
 * La fase non compariva da nessuna parte in Control Room: il medico poteva
 * filtrare i pazienti "per fase" senza mai vedere in che fase fossero, e non
 * aveva modo di correggerla. Ora la vede derivata dal calendario e può
 * imporne un'altra — una guarigione lenta o una complicanza sono decisioni
 * cliniche, non calcoli.
 */

"use client";

import { useState } from "react";
import { Activity, Lock, Loader2, RotateCcw } from "lucide-react";
import { setFaseOverride, clearFaseOverride } from "@/lib/firebase/firestore";
import { calcolaStatoFase, faseDiStato } from "@/lib/utils/fase";
import type { PostOpPhase, PostOpPhaseConfig, UtenteProfile } from "@/types";

interface FasePazienteCardProps {
  utente: UtenteProfile;
  fasi: PostOpPhaseConfig[];
  medicoUid: string;
  /** Applica al paziente in pagina i campi appena scritti, senza rileggere. */
  onAggiornato: (patch: Partial<UtenteProfile>) => void;
}

export default function FasePazienteCard({
  utente,
  fasi,
  medicoUid,
  onAggiornato,
}: FasePazienteCardProps) {
  const [formAperto, setFormAperto] = useState(false);
  const [faseScelta, setFaseScelta] = useState<PostOpPhase | "">("");
  const [motivo, setMotivo] = useState("");
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const stato = calcolaStatoFase(utente, fasi);
  const fase = faseDiStato(stato);
  const forzata = stato.tipo === "forzata";

  const salva = async () => {
    if (!faseScelta || !motivo.trim()) {
      setErrore("Scegli la fase e indica il motivo.");
      return;
    }
    setErrore(null);
    setInCorso(true);
    try {
      await setFaseOverride(utente.id, medicoUid, faseScelta, motivo.trim());
      onAggiornato({
        faseOverride: faseScelta,
        faseOverrideMotivo: motivo.trim(),
        faseOverrideDa: medicoUid,
        faseOverrideIl: new Date().toISOString(),
      });
      setFormAperto(false);
      setMotivo("");
      setFaseScelta("");
    } catch (err) {
      console.error("[FasePazienteCard] setFaseOverride:", err);
      setErrore("Non è stato possibile salvare la fase forzata.");
    } finally {
      setInCorso(false);
    }
  };

  const rimuovi = async () => {
    setErrore(null);
    setInCorso(true);
    try {
      await clearFaseOverride(utente.id);
      onAggiornato({
        faseOverride: undefined,
        faseOverrideMotivo: undefined,
        faseOverrideDa: undefined,
        faseOverrideIl: undefined,
      });
    } catch (err) {
      console.error("[FasePazienteCard] clearFaseOverride:", err);
      setErrore("Non è stato possibile rimuovere il forzamento.");
    } finally {
      setInCorso(false);
    }
  };

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
        <Activity size={16} className="text-indigo-400" />
        Fase post-operatoria
      </h2>

      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        {/* Stato corrente */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-slate-100">
              {fase?.titolo ??
                (stato.tipo === "pre_operatorio"
                  ? "Non ancora operato"
                  : stato.tipo === "concluso"
                    ? "Percorso concluso"
                    : "Fase non determinabile")}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {stato.tipo === "pre_operatorio" &&
                `Intervento tra ${stato.giorniAllIntervento} ${
                  stato.giorniAllIntervento === 1 ? "giorno" : "giorni"
                }`}
              {stato.tipo === "in_fase" && `${stato.giorno}° giorno post-operatorio`}
              {stato.tipo === "forzata" && `${stato.giorno}° giorno post-operatorio`}
              {stato.tipo === "concluso" &&
                `${stato.giorno}° giorno — gli intervalli configurati coprono fino al ${stato.ultimoGiornoPrevisto}°`}
              {stato.tipo === "indeterminato" && "Data dell'intervento non interpretabile"}
            </p>
          </div>

          <span
            className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              forzata
                ? "border-amber-700/50 bg-amber-900/40 text-amber-300"
                : "border-slate-700 bg-slate-800/60 text-slate-400"
            }`}
          >
            {forzata ? "Forzata" : "Automatica"}
          </span>
        </div>

        {/* Dettaglio del forzamento */}
        {forzata && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-800/40 bg-amber-950/30 px-3 py-2.5">
            <Lock size={13} className="mt-0.5 flex-shrink-0 text-amber-400" />
            <div className="min-w-0 text-xs">
              <p className="text-amber-200">{stato.motivo}</p>
              {utente.faseOverrideIl && (
                <p className="mt-1 text-amber-200/60">
                  Impostata il{" "}
                  {new Date(utente.faseOverrideIl).toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          </div>
        )}

        {errore && (
          <p role="alert" className="text-xs text-red-400">
            {errore}
          </p>
        )}

        {/* Comandi */}
        {!formAperto ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFormAperto(true)}
              disabled={inCorso || fasi.length === 0}
              className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {forzata ? "Cambia fase forzata" : "Forza una fase"}
            </button>
            {forzata && (
              <button
                type="button"
                onClick={rimuovi}
                disabled={inCorso}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                {inCorso ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                Torna al calcolo automatico
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5 rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
            <div className="space-y-1.5">
              <label htmlFor="fase-forzata" className="block text-xs font-medium text-slate-300">
                Fase da applicare
              </label>
              <select
                id="fase-forzata"
                value={faseScelta}
                onChange={(e) => setFaseScelta(e.target.value as PostOpPhase)}
                disabled={inCorso}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
              >
                <option value="">Seleziona…</option>
                {fasi.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.titolo}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="fase-motivo" className="block text-xs font-medium text-slate-300">
                Motivo clinico
              </label>
              {/*
                Resta obbligatorio anche se non è più rivolto al genitore: il
                forzamento scavalca il calcolo e cambia le indicazioni
                alimentari che la famiglia riceve, quindi è l'unica traccia del
                perché — per il medico stesso più avanti, o per un collega.
                Una decisione che cambia la guida clinica non dovrebbe restare
                senza motivazione. Renderlo facoltativo è una riga.

                L'etichetta dice "non compare nell'app" e non "il genitore non
                la vedrà", perché la seconda sarebbe falsa: il campo vive su
                /utenti/{id}, che il genitore può leggere per intero, quindi lo
                riceve comunque nella risposta di rete. Promettere una
                riservatezza che non c'è è peggio che non prometterla: qualcuno
                ci scriverebbe dentro cose che non deve poter leggere. Per una
                nota davvero riservata servirebbe una sotto-collezione con
                lettura ristretta al medico.
              */}
              <p className="text-[11px] leading-relaxed text-slate-500">
                Nota per il personale medico: non compare nell&apos;app del genitore,
                ma <strong className="font-semibold text-slate-400">non è un campo
                riservato</strong> — non usarlo per informazioni che non deve poter
                leggere.
              </p>
              <textarea
                id="fase-motivo"
                rows={2}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                disabled={inCorso}
                placeholder="Es. guarigione più lenta del previsto, mantenere semiliquidi"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={salva}
                disabled={inCorso}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
              >
                {inCorso && <Loader2 size={12} className="animate-spin" />}
                Applica
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormAperto(false);
                  setErrore(null);
                }}
                disabled={inCorso}
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200 disabled:opacity-50"
              >
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
