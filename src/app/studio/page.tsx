/**
 * @file src/app/studio/page.tsx
 * @description Control Room per i Medici (Sprint 7).
 * Mostra tutti i pazienti ordinati per livello di emergenza (Triage), con
 * ricerca e filtri rapidi (Sprint "novità").
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Activity, CheckCircle, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getAllUtenti, getLatestLog, getMedicalAlerts } from "@/lib/firebase/firestore";
import PazienteCard, { type UtenteWithStatus } from "@/components/studio/PazienteCard";
import SearchAndFilterBar, { type QuickFilterType } from "@/components/studio/SearchAndFilterBar";
import EmptyState from "@/components/EmptyState";
import type { PostOpPhase } from "@/types";

export default function StudioPage() {
  const { accountProfile, signOut } = useAuth();
  const [utenti, setUtenti] = useState<UtenteWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<QuickFilterType>("tutti");
  const [selectedFase, setSelectedFase] = useState<PostOpPhase | null>(null);

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

            // Logica Triage (Alert) — invariata
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

        // Ordinamento: alert, poi novità, poi ultimo aggiornamento decrescente
        utentiWithLogs.sort((a, b) => {
          if (a.hasAlert !== b.hasAlert) return a.hasAlert ? -1 : 1;
          if (!!a.haNuovoLogNonLetto !== !!b.haNuovoLogNonLetto) return a.haNuovoLogNonLetto ? -1 : 1;
          const recency = (u: typeof a) =>
            u.latestLog?.createdAt
              ? new Date(u.latestLog.createdAt).getTime()
              : new Date(u.dataOperazione).getTime();
          return recency(b) - recency(a);
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

  const filteredUtenti = useMemo(() => {
    return utenti.filter((u) => {
      const matchesSearch = `${u.nome} ${u.cognome}`
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase());
      if (!matchesSearch) return false;

      if (filterType === "allerta") return u.hasAlert;
      if (filterType === "novita") return !!u.haNuovoLogNonLetto;
      if (filterType === "fase") return selectedFase ? u.faseAttualeId === selectedFase : true;
      return true;
    });
  }, [utenti, searchQuery, filterType, selectedFase]);

  const resetFilters = () => {
    setSearchQuery("");
    setFilterType("tutti");
    setSelectedFase(null);
  };

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

        <SearchAndFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterType={filterType}
          onFilterTypeChange={setFilterType}
          selectedFase={selectedFase}
          onFaseChange={setSelectedFase}
        />
      </header>

      {/* Lista Utenti */}
      <main className="px-4 py-6">
        <h2 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">
          Utenti in Triage ({filteredUtenti.length})
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
        ) : filteredUtenti.length === 0 ? (
          <EmptyState
            title="Nessun paziente trovato"
            description="Nessun paziente corrisponde ai filtri selezionati."
            ctaLabel="Cancella filtri"
            onCtaClick={resetFilters}
          />
        ) : (
          <div className="space-y-3">
            {filteredUtenti.map((utente) => (
              <PazienteCard key={utente.id} utente={utente} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
