/**
 * @file src/app/ricette/page.tsx
 * @description Pagina principale del ricettario dinamico con lista, filtri e ricerca.
 */

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Utensils } from "lucide-react";
import { useRecipes } from "@/hooks/useRecipes";
import BottomNav from "@/components/BottomNav";
import type { RecipeConsistenza } from "@/types";

function RecipeSkeleton() {
  return (
    <div className="flex animate-pulse flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-xl">
      <div className="h-40 w-full bg-slate-800" />
      <div className="p-4">
        <div className="mb-2 h-5 w-3/4 rounded bg-slate-800" />
        <div className="mb-4 h-4 w-1/2 rounded bg-slate-800" />
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-full bg-slate-800" />
          <div className="h-6 w-16 rounded-full bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

export default function RicettePage() {
  const { recipes, loading, error } = useRecipes();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConsistenza, setSelectedConsistenza] = useState<RecipeConsistenza | "Tutte">("Tutte");

  const consistenze: (RecipeConsistenza | "Tutte")[] = ["Tutte", "Liquida", "Semiliquida", "Morbida", "Solida"];

  // Filtraggio lato client
  const filteredRecipes = recipes.filter(recipe => {
    // Filtro consistenza
    if (selectedConsistenza !== "Tutte" && recipe.consistenza !== selectedConsistenza) {
      return false;
    }
    
    // Filtro testo (titolo o ingredienti)
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const matchTitle = recipe.titolo.toLowerCase().includes(term);
      const matchIngredients = recipe.ingredienti.some(ing => ing.toLowerCase().includes(term));
      if (!matchTitle && !matchIngredients) return false;
    }
    
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-800/50 bg-slate-950/90 px-4 py-4 backdrop-blur-md">
        <h1 className="flex items-center gap-2 text-xl font-bold text-white">
          <Utensils size={20} className="text-teal-400" />
          Ricettario
        </h1>
      </header>

      <main className="px-4 pt-6">
        {/* RICERCA */}
        <div className="relative mb-6">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Search size={18} className="text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Cerca ricetta o ingrediente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/50 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* FILTRI CONSISTENZA */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {consistenze.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedConsistenza(c)}
              className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                selectedConsistenza === c
                  ? "bg-teal-500 text-teal-950"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* ERROR STATE */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <RecipeSkeleton />
            <RecipeSkeleton />
            <RecipeSkeleton />
          </div>
        )}

        {/*
          EMPTY STATE — senza azione: il ricettario è contenuto clinico, in sola
          lettura per il client (firestore.rules). Si popola con
          `node scripts/seed.mjs`, non da qui.
        */}
        {!loading && !error && recipes.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 p-8 text-center">
            <Utensils size={40} className="mb-4 text-slate-600" />
            <h2 className="mb-2 text-lg font-bold text-white">Nessuna ricetta</h2>
            <p className="text-sm text-slate-400">
              Il ricettario non è ancora stato pubblicato.
            </p>
          </div>
        )}

        {/* RISULTATI RICERCA VUOTI */}
        {!loading && !error && recipes.length > 0 && filteredRecipes.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-500">
            Nessuna ricetta corrisponde ai filtri selezionati.
          </div>
        )}

        {/*
          GRID RICETTE — tre colonne da `lg`. Il contenitore del genitore è
          largo al più 1024px, quindi una quarta colonna comprimerebbe le card
          sotto la larghezza che serve all'immagine di copertina.
        */}
        {!loading && filteredRecipes.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRecipes.map((recipe) => (
              <Link key={recipe.id} href={`/ricette/${recipe.id}`}>
                <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 transition-all hover:border-teal-500/50 hover:shadow-lg hover:shadow-teal-900/20">
                  {/* HERO IMAGE */}
                  <div className="relative h-40 w-full overflow-hidden bg-slate-800">
                    {recipe.urlImmagine ? (
                      /*
                        `fill` invece di width/height: le dimensioni reali del file
                        non sono note (l'URL arriva da Firestore), e il contenitore
                        ha già altezza fissa. `sizes` descrive le tre colonne del
                        grid, altrimenti Next scarica sempre l'immagine full-width.
                      */
                      <Image
                        src={recipe.urlImmagine}
                        alt={recipe.titolo}
                        fill
                        sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Utensils size={32} className="text-slate-600" />
                      </div>
                    )}
                    {/* GRADIENT OVERLAY */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-80" />
                  </div>
                  
                  {/* CONTENT */}
                  <div className="flex flex-1 flex-col p-4">
                    <h2 className="mb-1 text-base font-bold text-white line-clamp-1">{recipe.titolo}</h2>
                    <p className="mb-4 text-xs text-slate-400 line-clamp-2 flex-1">{recipe.descrizione}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md bg-teal-500/20 px-2 py-1 text-[10px] font-semibold text-teal-300">
                        {recipe.consistenza}
                      </span>
                      {recipe.fasiCompatibili.map(fase => (
                        <span key={fase} className="rounded-md bg-blue-500/20 px-2 py-1 text-[10px] font-semibold uppercase text-blue-300">
                          {fase.replace("_", " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
