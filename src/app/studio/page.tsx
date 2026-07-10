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
import { getAllPatients, getLatestLog, getMedicalAlerts } from "@/lib/firebase/firestore";
import type { PatientProfile, MedicalAlerts } from "@/types";
import type { DailyLog } from "@/lib/validations/diary";

interface PatientWithStatus extends PatientProfile {
  latestLog: DailyLog | null;
  hasAlert: boolean;
}

export default function StudioPage() {
  const { userProfile, signOut } = useAuth();
  const [patients, setPatients] = useState<PatientWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [allPatients, alertsConfig] = await Promise.all([
          getAllPatients(),
          getMedicalAlerts()
        ]);

        const patientsWithLogs = await Promise.all(
          allPatients.map(async (paziente) => {
            const latestLog = await getLatestLog(paziente.id);
            
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
              ...paziente,
              latestLog,
              hasAlert
            };
          })
        );

        // Ordinamento: prima quelli con Alert, poi ordinati per data operazione decrescente
        patientsWithLogs.sort((a, b) => {
          if (a.hasAlert && !b.hasAlert) return -1;
          if (!a.hasAlert && b.hasAlert) return 1;
          return new Date(b.dataOperazione).getTime() - new Date(a.dataOperazione).getTime();
        });

        setPatients(patientsWithLogs);
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
                Dr. {userProfile?.cognome}
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

      {/* Lista Pazienti */}
      <main className="px-4 py-6">
        <h2 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">
          Pazienti in Triage ({patients.length})
        </h2>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
          </div>
        ) : patients.length === 0 ? (
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-8 text-center">
            <CheckCircle className="mx-auto mb-3 text-green-500/50" size={40} />
            <p className="text-sm text-slate-400">Nessun paziente trovato.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {patients.map((paziente) => (
              <Link 
                key={paziente.id} 
                href={`/studio/paziente/${paziente.id}`}
                className={`block rounded-2xl border p-4 transition-all hover:scale-[1.02] active:scale-95 ${
                  paziente.hasAlert 
                    ? "border-red-900/50 bg-red-950/20" 
                    : "border-slate-800/60 bg-slate-900/40 hover:border-indigo-500/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white text-lg">
                      {paziente.nome} {paziente.cognome}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Operato il {new Date(paziente.dataOperazione).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {paziente.hasAlert && (
                      <span className="flex items-center gap-1.5 rounded-full bg-red-900/50 px-2.5 py-1 text-xs font-medium text-red-200 border border-red-800/50">
                        <AlertTriangle size={12} />
                        Attenzione
                      </span>
                    )}
                    <ChevronRight size={18} className="text-slate-500" />
                  </div>
                </div>

                {/* Ultimo Log Summary */}
                {paziente.latestLog && (
                  <div className={`mt-4 rounded-xl px-3 py-2 text-xs border ${
                    paziente.hasAlert ? "bg-red-950/40 border-red-900/30 text-red-200" : "bg-slate-800/40 border-slate-700/50 text-slate-300"
                  }`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="opacity-80">Ultimo aggiornamento:</span>
                      <span className="font-medium">
                        {new Date(paziente.latestLog.createdAt!).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex gap-4 font-medium mt-1">
                      {paziente.latestLog.temperatura && (
                        <span>Temp: {paziente.latestLog.temperatura}°C</span>
                      )}
                      {paziente.latestLog.dolore !== undefined && (
                        <span>Dolore: {paziente.latestLog.dolore}/10</span>
                      )}
                      {(paziente.latestLog.sanguinamento || paziente.latestLog.vomito) && (
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
