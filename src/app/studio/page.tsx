/**
 * @file src/app/studio/page.tsx
 * @description Control Room per i Medici (Sprint 7).
 * Mostra tutti i pazienti ordinati per livello di emergenza (Triage).
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Activity, AlertTriangle, CheckCircle, ChevronRight, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getAllUtenti, getLatestLog, getMedicalAlerts } from "@/lib/firebase/firestore";
import type { UtenteProfile, MedicalAlerts } from "@/types";
import type { DailyLog } from "@/lib/validations/diary";

interface UtenteWithStatus extends UtenteProfile {
  latestLog: DailyLog | null;
  hasAlert: boolean;
}

export default function StudioPage() {
  const { accountProfile, signOut } = useAuth();
  const [utenti, setUtenti] = useState<UtenteWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [allUtenti, alertsConfig] = await Promise.all([
          getAllUtenti(),
          getMedicalAlerts()
        ]);

        const utentiWithLogs = await Promise.all(
          allUtenti.map(async (utente) => {
            const latestLog = await getLatestLog(utente.id);
            
            // Logica Triage (Alert)
            let hasAlert = false;
            if (latestLog && alertsConfig) {
              const { temperatura, dolore, sanguinamento, vomito } = latestLog;
              if (
                sanguinamento || 
                vomito || 
                (temperatura && temperatura >= alertsConfig.temperaturaMaxC) ||
                (dolore && dolore >= alertsConfig.doloreSoglia)
              ) {
                hasAlert = true;
              }
            }

            return {
              ...utente,
              latestLog,
              hasAlert
            };
          })
        );

        // Ordinamento: prima quelli con Alert, poi ordinati per data operazione decrescente
        utentiWithLogs.sort((a, b) => {
          if (a.hasAlert && !b.hasAlert) return -1;
          if (!a.hasAlert && b.hasAlert) return 1;
          return new Date(b.dataOperazione).getTime() - new Date(a.dataOperazione).getTime();
        });

        setUtenti(utentiWithLogs);
      } catch (error) {
        console.error("Errore nel caricamento della Control Room", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="min-h-dvh bg-slate-950 pb-20">
      {/* Header Medico */}
      <header className="sticky top-0 z-10 border-b border-slate-800/60 bg-slate-950/80 px-4 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30">
              <Activity size={20} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Control Room</h1>
              <p className="text-xs text-slate-400">
                Dr. {accountProfile?.cognome}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="rounded-full bg-slate-800/50 p-2 text-slate-400 hover:text-white"
            aria-label="Esci"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Lista Utenti */}
      <main className="px-4 py-6">
        <h2 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">
          Utenti in Triage ({utenti.length})
        </h2>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
          </div>
        ) : utenti.length === 0 ? (
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-8 text-center">
            <CheckCircle className="mx-auto mb-3 text-green-500/50" size={40} />
            <p className="text-sm text-slate-400">Nessun utente trovato.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {utenti.map((utente) => (
              <Link 
                key={utente.id} 
                href={`/studio/utente/${utente.id}`}
                className={`block rounded-2xl border p-4 transition-all hover:scale-[1.02] active:scale-95 ${
                  utente.hasAlert 
                    ? "border-red-900/50 bg-red-950/20" 
                    : "border-slate-800/60 bg-slate-900/40 hover:border-indigo-500/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white text-lg">
                      {utente.nome} {utente.cognome}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Operato il {new Date(utente.dataOperazione).toLocaleDateString("it-IT")}
                    </p>
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
