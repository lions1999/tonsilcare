/**
 * @file src/app/ricette/[id]/page.tsx
 * @description Pagina di dettaglio di una singola ricetta.
 */

"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Info, CheckCircle2, ListOrdered, List } from "lucide-react";
import { useRecipe } from "@/hooks/useRecipe";

export default function DettaglioRicettaPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { recipe, loading, error } = useRecipe(id);
  const [activeTab, setActiveTab] = useState<"ingredienti" | "preparazione">("ingredienti");

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 animate-pulse">
        <div className="h-64 w-full bg-slate-800" />
        <div className="p-6">
          <div className="mb-4 h-8 w-3/4 rounded bg-slate-800" />
          <div className="mb-8 h-4 w-1/2 rounded bg-slate-800" />
          <div className="mb-6 flex gap-4">
            <div className="h-10 w-1/2 rounded bg-slate-800" />
            <div className="h-10 w-1/2 rounded bg-slate-800" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-slate-800" />
            <div className="h-4 w-full rounded bg-slate-800" />
            <div className="h-4 w-3/4 rounded bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center">
        <Info size={40} className="mb-4 text-slate-600" />
        <h1 className="mb-2 text-xl font-bold text-white">Ricetta non trovata</h1>
        <p className="mb-6 text-sm text-slate-400">{error || "Impossibile caricare questa ricetta."}</p>
        <button
          onClick={() => router.back()}
          className="rounded-xl bg-slate-800 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-700"
        >
          Torna indietro
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* HEADER SOVRAPPOSTO ALL'IMMAGINE */}
      <div className="relative h-72 w-full bg-slate-800">
        {recipe.urlImmagine && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.urlImmagine}
            alt={recipe.titolo}
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-900/60" />
        
        {/* NAVIGAZIONE */}
        <div className="absolute left-4 top-4 z-10 flex w-[calc(100%-2rem)] items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* TITOLO FLUTTUANTE */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-md bg-teal-500/90 px-2 py-1 text-xs font-bold text-white shadow-sm backdrop-blur-sm">
              {recipe.consistenza}
            </span>
            {recipe.fasiCompatibili.map(fase => (
              <span key={fase} className="rounded-md bg-blue-500/90 px-2 py-1 text-[10px] font-bold uppercase text-white shadow-sm backdrop-blur-sm">
                {fase.replace("_", " ")}
              </span>
            ))}
          </div>
          <h1 className="text-3xl font-black leading-tight text-white shadow-black drop-shadow-md">
            {recipe.titolo}
          </h1>
        </div>
      </div>

      <main className="px-6 pt-6">
        <p className="mb-8 text-sm leading-relaxed text-slate-300">
          {recipe.descrizione}
        </p>

        {/* TABS */}
        <div className="mb-6 flex rounded-xl bg-slate-900/60 p-1">
          <button
            onClick={() => setActiveTab("ingredienti")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              activeTab === "ingredienti"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <List size={16} />
            Ingredienti
          </button>
          <button
            onClick={() => setActiveTab("preparazione")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              activeTab === "preparazione"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ListOrdered size={16} />
            Preparazione
          </button>
        </div>

        {/* CONTENUTO TABS */}
        <div className="animate-fade-in-up">
          {activeTab === "ingredienti" && (
            <ul className="space-y-3">
              {recipe.ingredienti.map((ingrediente, idx) => (
                <li key={idx} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                  <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-teal-500" />
                  <span className="text-sm font-medium text-slate-200">{ingrediente}</span>
                </li>
              ))}
            </ul>
          )}

          {activeTab === "preparazione" && (
            <div className="space-y-6">
              {recipe.istruzioni.map((step, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-900/40 text-sm font-bold text-blue-400">
                    {idx + 1}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
