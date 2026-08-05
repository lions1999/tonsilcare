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

import { usePathname } from "next/navigation";
import { Loader2, Activity, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStudioPazienti } from "@/context/StudioPazientiContext";
import PazienteCard from "@/components/studio/PazienteCard";
import SearchAndFilterBar from "@/components/studio/SearchAndFilterBar";
import AvvisoTriageDisattivato from "@/components/studio/AvvisoTriageDisattivato";
import EmptyState from "@/components/EmptyState";

export default function ListaPazienti() {
  const pathname = usePathname();
  const { accountProfile } = useAuth();

  // Quale paziente è aperto nel pannello destro. Ricavato dalla rotta e non da
  // uno stato locale: la rotta è già la fonte di verità della selezione, e così
  // l'evidenziazione è corretta anche arrivando da un deep link o da un reload.
  const utenteIdAperto = pathname.startsWith("/studio/utente/")
    ? pathname.split("/")[3]
    : null;
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
    fasi,
    configAlertMancante,
  } = useStudioPazienti();

  return (
    <div className="min-h-dvh bg-slate-950 pb-20 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:pb-0">
      {/*
        Header Medico. Su mobile è `sticky` perché scorre la pagina intera; su
        desktop diventa un fratello flex che non scorre affatto, mentre a
        scorrere è l'elenco qui sotto. Il risultato è lo stesso — titolo,
        ricerca e filtri sempre visibili — ma ottenuto senza sovrapposizioni.
      */}
      <header className="sticky top-0 z-10 border-b border-slate-800/60 bg-slate-950/80 px-4 py-4 backdrop-blur-xl lg:static lg:flex-shrink-0 lg:px-3 lg:py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 lg:gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30 lg:h-8 lg:w-8 lg:rounded-lg">
              <Activity size={20} className="text-indigo-400 lg:h-4 lg:w-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white lg:text-sm">Control Room</h1>
              <p className="text-xs text-slate-400 lg:text-[11px]">
                Dr. {accountProfile?.cognome}
              </p>
            </div>
          </div>
        </div>

        <SearchAndFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterType={filterType}
          onFilterTypeChange={setFilterType}
          selectedFase={selectedFase}
          onFaseChange={setSelectedFase}
          fasi={fasi}
        />

        {/*
          Nell'header, non nell'elenco: qui è la parte che NON scorre, mentre
          l'elenco sì. Un avviso che scorre via viene letto una volta, e
          l'inferenza sbagliata — "non ci sono righe rosse, stanno tutti bene" —
          si forma proprio mentre si scorre. Costa spazio verticale in un
          pannello da 420px, ma solo in un ambiente rotto, dove quel costo è
          esattamente il punto.

          L'header ha `backdrop-blur-xl`: nessun rischio dalla sezione nota su
          `position: fixed`, perché questo avviso è statico e non contiene
          elementi fissi.
        */}
        {configAlertMancante && (
          <AvvisoTriageDisattivato contesto="lista" className="mt-3" />
        )}
      </header>

      {/* Lista pazienti */}
      {/* L'elenco è l'unica parte che scorre nel pannello lista. */}
      <div className="px-4 py-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-3 lg:py-4">
        <h2 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider lg:mb-2.5 lg:text-[11px]">
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
          <div className="space-y-3 lg:space-y-2">
            {pazientiFiltrati.map((utente) => (
              <PazienteCard
                key={utente.id}
                utente={utente}
                selezionato={utente.id === utenteIdAperto}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
