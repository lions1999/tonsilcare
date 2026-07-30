/**
 * @file src/components/studio/ListaPazienti.tsx
 * @description Pannello lista della Control Room: intestazione, ricerca, filtri
 * e elenco pazienti in ordine di triage.
 *
 * Non possiede dati: li legge da StudioPazientiContext. È l'unica presentazione
 * della lista — su mobile occupa lo schermo, su desktop è il pannello sinistro
 * accanto al dettaglio.
 */

"use client";

import { Loader2, Activity, CheckCircle, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStudioPazienti } from "@/context/StudioPazientiContext";
import PazienteCard from "@/components/studio/PazienteCard";
import SearchAndFilterBar from "@/components/studio/SearchAndFilterBar";
import EmptyState from "@/components/EmptyState";

export default function ListaPazienti() {
  const { accountProfile, signOut } = useAuth();
  const {
    pazienti,
    pazientiFiltrati,
    loading,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    selectedFase,
    setSelectedFase,
    resetFilters,
  } = useStudioPazienti();

  return (
    <div className="min-h-dvh bg-slate-950 pb-20 lg:min-h-0 lg:pb-0">
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
          {/*
            Il logout resta qui e non nella sidebar desktop: è l'unico controllo
            account del portale medico, e spostarlo lo toglierebbe da mobile,
            dove la sidebar non esiste.
          */}
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
      <div className="px-4 py-6">
        <h2 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">
          Utenti in Triage ({pazientiFiltrati.length})
        </h2>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
          </div>
        ) : pazienti.length === 0 ? (
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-8 text-center">
            <CheckCircle className="mx-auto mb-3 text-green-500/50" size={40} />
            <p className="text-sm text-slate-400">Nessun utente trovato.</p>
          </div>
        ) : pazientiFiltrati.length === 0 ? (
          <EmptyState
            title="Nessun paziente trovato"
            description="Nessun paziente corrisponde ai filtri selezionati."
            ctaLabel="Cancella filtri"
            onCtaClick={resetFilters}
          />
        ) : (
          <div className="space-y-3">
            {pazientiFiltrati.map((utente) => (
              <PazienteCard key={utente.id} utente={utente} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
