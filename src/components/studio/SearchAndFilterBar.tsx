/**
 * @file src/components/studio/SearchAndFilterBar.tsx
 * @description Ricerca per nome e filtri rapidi per la Control Room medica.
 */

"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, AlertTriangle, Sparkles, SlidersHorizontal, ChevronDown } from "lucide-react";
import { useChiusuraAlClickFuori } from "@/hooks/useChiusuraAlClickFuori";
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
  const bottoneFaseRef = useRef<HTMLButtonElement>(null);
  const menuFaseRef = useRef<HTMLDivElement>(null);

  const faseLabel = selectedFase
    ? fasi.find((f) => f.id === selectedFase)?.titolo ?? "Fase"
    : "Fase";

  /*
    Il menu vive in un portale su <body> ed è posizionato a mano sotto il
    bottone. Sembra troppo per un elenco di cinque voci; ecco perché serve.

    Un menu `absolute` veniva ritagliato: la riga dei filtri ha `overflow-x-auto`
    e il CSS forza l'altro asse da `visible` ad `auto`, quindi quel contenitore
    ritaglia anche in verticale. Misurato: clientHeight 34px contro un menu da
    222px, tagliato a un settimo — il bug segnalato.

    Togliere l'overflow non era la strada: con una fase selezionata il bottone
    porta il titolo completo e la riga misura 463px contro 396 disponibili,
    quindi lo scorrimento orizzontale serve davvero. E più in alto ci sono altri
    due contenitori con `overflow-hidden`.

    Nemmeno `position: fixed` da solo basta: l'header ha `backdrop-blur-xl`, e
    `backdrop-filter` crea un blocco contenitore per i discendenti `fixed`. Il
    menu si ancorava all'header invece che al viewport e finiva a 264px di
    distanza dal bottone. Il portale lo toglie da sotto quell'ancoraggio.

    Il portale resta quindi per il RITAGLIO e per l'ancoraggio del menu, non
    più per la chiusura: quella passa da `useChiusuraAlClickFuori` (vedi sotto).

    Lo stile viene scritto direttamente sull'elemento invece che via stato: è
    una misura di layout, e passare dallo stato aggiungerebbe un render a ogni
    riposizionamento durante lo scroll.
  */
  useLayoutEffect(() => {
    if (!faseDropdownOpen) return;

    const posiziona = () => {
      const bottone = bottoneFaseRef.current;
      const menu = menuFaseRef.current;
      if (!bottone || !menu) return;

      const r = bottone.getBoundingClientRect();
      const MARGINE = 8;
      const DISTANZA = 4;

      // Solo verso il basso: l'header è `sticky top-0`, quindi il bottone sta
      // sempre in cima allo schermo e un ramo "apri verso l'alto" non
      // scatterebbe mai. Quando lo spazio è poco il menu si accorcia e scorre
      // al suo interno — rimisurato il 2026-08-06 a 1440x320: si ferma a 102px
      // (contro i 200px di contenuto) e resta dentro il viewport.
      menu.style.top = `${r.bottom + DISTANZA}px`;
      menu.style.maxHeight = `${Math.max(
        96,
        window.innerHeight - r.bottom - DISTANZA - MARGINE
      )}px`;

      // La larghezza si può leggere solo dopo che maxHeight è applicata: se
      // compare la barra di scorrimento interna, l'elemento si allarga.
      const larghezza = menu.offsetWidth;
      menu.style.left = `${Math.min(
        Math.max(MARGINE, r.left),
        window.innerWidth - larghezza - MARGINE
      )}px`;
    };

    posiziona();
    // `capture: true` perché lo scroll che conta avviene dentro i contenitori
    // della Control Room, non sulla finestra: senza, il menu resterebbe fermo
    // mentre il bottone scorre via.
    window.addEventListener("scroll", posiziona, true);
    window.addEventListener("resize", posiziona);
    return () => {
      window.removeEventListener("scroll", posiziona, true);
      window.removeEventListener("resize", posiziona);
    };
  }, [faseDropdownOpen, fasi.length]);

  /*
    Chiusura al click fuori.

    Qui c'era un overlay `fixed inset-0`, l'unico dei tre del progetto che
    funzionasse davvero — ma per una ragione collaterale: sta dentro il portale
    insieme al menu, quindi non è discendente dell'header con `backdrop-blur` e
    non ne subisce il blocco contenitore. Misurato prima di questa modifica,
    1440×900, cioè il viewport intero. Chi tocca l'arrangiamento del portale
    però lo rirompe senza che nulla lo segnali, e sarebbe la quarta volta.

    Ora che non c'è più, "`fixed inset-0` come overlay di chiusura" non esiste
    in nessun punto del repo: la ricerca stessa diventa il controllo — chi lo
    reintroduce sta scrivendo qualcosa che non ha precedenti qui.

    DUE ref e non uno: il menu è in un portale, quindi non ha il bottone come
    antenato. Senza `bottoneFaseRef`, premere il bottone per chiudere farebbe
    prima chiudere (pointerdown fuori dal menu) e poi riaprire (il click che
    fa toggle), cioè il menu non si chiuderebbe mai dal suo stesso bottone.
  */
  const contenitori = useMemo(
    () => [bottoneFaseRef, menuFaseRef],
    []
  );
  useChiusuraAlClickFuori(faseDropdownOpen, contenitori, () =>
    setFaseDropdownOpen(false)
  );

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
            ref={bottoneFaseRef}
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

          {faseDropdownOpen && createPortal(
            <div
              ref={menuFaseRef}
              role="listbox"
              aria-label="Filtra per fase post-operatoria"
              className="fixed z-50 min-w-[220px] overflow-y-auto overscroll-contain rounded-xl border border-slate-700 bg-slate-900 shadow-xl shadow-black/40"
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
            </div>,
            document.body
          )}
        </div>
      </div>
    </div>
  );
}
