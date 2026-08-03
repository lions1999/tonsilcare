/**
 * @file src/components/studio/SearchAndFilterBar.tsx
 * @description Ricerca per nome e filtri rapidi per la Control Room medica.
 */

"use client";

import { useState } from "react";
import { Search, AlertTriangle, Sparkles, SlidersHorizontal, ChevronDown } from "lucide-react";
import type { PostOpPhase, PostOpPhaseConfig } from "@/types";

export type QuickFilterType = "tutti" | "allerta" | "novita" | "fase";

interface SearchAndFilterBarProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  filterType: QuickFilterType;
  onFilterTypeChange: (v: QuickFilterType) => void;
  selectedFase: PostOpPhase | null;
  onFaseChange: (v: PostOpPhase | null) => void;
  /**
   * Le fasi configurate, dallo StudioPazientiContext. Qui c'era un elenco
   * scritto a mano di cinque voci: se il cliente ne toglie una, quell'elenco
   * offrirebbe una fase inesistente (zero risultati sempre); se ne aggiunge una,
   * i pazienti che ci finiscono sparirebbero dalla lista filtrata. In nessuno
   * dei due casi comparirebbe un errore.
   */
  fasi: PostOpPhaseConfig[];
}

export default function SearchAndFilterBar({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  selectedFase,
  onFaseChange,
  fasi,
}: SearchAndFilterBarProps) {
  const [faseDropdownOpen, setFaseDropdownOpen] = useState(false);

  const faseLabel = selectedFase
    ? fasi.find((f) => f.id === selectedFase)?.titolo ?? "Fase"
    : "Fase";

  return (
    <div className="mt-3 space-y-2.5">
      {/* Ricerca */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cerca paziente per nome..."
          aria-label="Cerca paziente per nome"
          className="w-full rounded-xl border border-slate-700/50 bg-slate-800/60 py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Filtri rapidi */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => onFilterTypeChange("tutti")}
          className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            filterType === "tutti"
              ? "border-indigo-500/50 bg-indigo-600/20 text-indigo-200"
              : "border-slate-700/50 bg-slate-800/40 text-slate-400 hover:text-slate-200"
          }`}
        >
          Tutti
        </button>
        <button
          onClick={() => onFilterTypeChange("allerta")}
          className={`flex-shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            filterType === "allerta"
              ? "border-red-800/50 bg-red-900/40 text-red-200"
              : "border-slate-700/50 bg-slate-800/40 text-slate-400 hover:text-slate-200"
          }`}
        >
          <AlertTriangle size={12} />
          Con allerta
        </button>
        <button
          onClick={() => onFilterTypeChange("novita")}
          className={`flex-shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            filterType === "novita"
              ? "border-blue-700/50 bg-blue-900/40 text-blue-200"
              : "border-slate-700/50 bg-slate-800/40 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles size={12} />
          Con novità
        </button>

        {/* Filtro fase (dropdown) */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => {
              const next = !faseDropdownOpen;
              setFaseDropdownOpen(next);
              if (next) onFilterTypeChange("fase");
            }}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              filterType === "fase"
                ? "border-indigo-500/50 bg-indigo-600/20 text-indigo-200"
                : "border-slate-700/50 bg-slate-800/40 text-slate-400 hover:text-slate-200"
            }`}
          >
            <SlidersHorizontal size={12} />
            <span className="max-w-[120px] truncate">{faseLabel}</span>
            <ChevronDown size={12} className={`transition-transform ${faseDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {faseDropdownOpen && (
            <>
              <div
                aria-hidden="true"
                className="fixed inset-0 z-40"
                onClick={() => setFaseDropdownOpen(false)}
              />
              <div
                role="listbox"
                aria-label="Filtra per fase post-operatoria"
                className="absolute left-0 top-full z-50 mt-1 min-w-[220px] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl shadow-black/40"
              >
                {fasi.map((fase) => (
                  <button
                    key={fase.id}
                    role="option"
                    aria-selected={selectedFase === fase.id}
                    onClick={() => {
                      onFaseChange(fase.id);
                      onFilterTypeChange("fase");
                      setFaseDropdownOpen(false);
                    }}
                    className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors ${
                      selectedFase === fase.id
                        ? "bg-indigo-900/40 text-indigo-300"
                        : "text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {fase.titolo}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
