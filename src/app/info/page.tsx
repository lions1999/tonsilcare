/**
 * @file src/app/info/page.tsx
 * @description Pagina Informazioni / FAQ post-operatorie.
 */

"use client";

import { useState } from "react";
import { Info, Phone, ChevronDown, Activity, AlertTriangle, Utensils, Thermometer, Database, Loader2 } from "lucide-react";
import { useGuidelines } from "@/hooks/useGuidelines";
import { seedInitialGuidelines } from "@/lib/firebase/firestore";
import BottomNav from "@/components/BottomNav";
import type { Guideline } from "@/types";

// Helper per renderizzare l'icona dinamicamente in base al nome stringa
function IconByName({ name, className }: { name?: string; className?: string }) {
  switch (name) {
    case "Activity": return <Activity className={className} />;
    case "AlertTriangle": return <AlertTriangle className={className} />;
    case "Utensils": return <Utensils className={className} />;
    case "Thermometer": return <Thermometer className={className} />;
    default: return <Info className={className} />;
  }
}

/**
 * Singolo elemento dell'Accordion
 */
function AccordionItem({ guide }: { guide: Guideline }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 transition-colors hover:bg-slate-900">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-900/40">
            <IconByName name={guide.icona_opzionale} className="h-4 w-4 text-blue-400" />
          </div>
          <span className="font-semibold text-white">{guide.titolo}</span>
        </div>
        <ChevronDown
          size={18}
          className={`text-slate-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-4 pb-5 pt-1 text-sm leading-relaxed text-slate-300">
            {guide.contenuto}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function InfoPage() {
  const { guidelines, loading, error, refetch } = useGuidelines();
  const [isSeeding, setIsSeeding] = useState(false);

  // Raggruppa le guidelines per categoria
  const guidelinesByCategory = guidelines.reduce((acc, guide) => {
    if (!acc[guide.categoria]) acc[guide.categoria] = [];
    acc[guide.categoria].push(guide);
    return acc;
  }, {} as Record<string, Guideline[]>);

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      await seedInitialGuidelines();
      await refetch();
    } catch (err) {
      console.error("Errore nel seeding", err);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-800/50 bg-slate-950/90 px-4 py-4 backdrop-blur-md">
        <h1 className="flex items-center gap-2 text-xl font-bold text-white">
          <Info size={20} className="text-blue-400" />
          Info Utili
        </h1>
      </header>

      <main className="px-4 pt-6">
        
        {/* PULSANTE EMERGENZA */}
        <button
          onClick={() => window.open('tel:112')}
          className="mb-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-red-600 px-6 py-4 text-base font-bold text-white shadow-xl shadow-red-900/40 transition-all active:scale-95 hover:bg-red-500"
        >
          <Phone size={22} className="animate-pulse" />
          Chiama Soccorsi / Reparto
        </button>

        {/* LOADING STATE */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 w-full animate-pulse rounded-2xl bg-slate-900" />
            ))}
          </div>
        )}

        {/* ERROR STATE */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {/* EMPTY STATE / SEEDING */}
        {!loading && !error && guidelines.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 p-8 text-center">
            <Info size={40} className="mb-4 text-slate-600" />
            <h2 className="mb-2 text-lg font-bold text-white">Nessuna informazione</h2>
            <p className="mb-6 text-sm text-slate-400">
              Non ci sono linee guida nel database attualmente.
            </p>
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              {isSeeding ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} />}
              {isSeeding ? "Popolamento in corso..." : "Popola Database (Seed)"}
            </button>
          </div>
        )}

        {/* ACCORDION LINEE GUIDA */}
        {!loading && guidelines.length > 0 && (
          <div className="space-y-8">
            {Object.entries(guidelinesByCategory).map(([categoria, items]) => (
              <section key={categoria}>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                  {categoria}
                </h2>
                <div className="space-y-3">
                  {items.map(guide => (
                    <AccordionItem key={guide.id} guide={guide} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

      </main>

      <BottomNav />
    </div>
  );
}
