/**
 * @file src/app/diario/page.tsx
 * @description Pagina Diario Clinico — placeholder per sprint futuro.
 *
 * TODO:
 * - [ ] Lista cronologica dei log (DailyLog[], vedi @/lib/validations/diary)
 * - [ ] Filtri per data
 * - [ ] Grafico andamento temperatura / dolore
 * - [ ] Link a /diario/nuovo
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenText, PlusCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Diario Clinico",
  description: "Storico dei parametri vitali e delle note cliniche.",
};

export default function DiarioPage() {
  return (
    <div className="min-h-full bg-slate-950">
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <BookOpenText size={24} className="text-blue-400" />
          <h1 className="text-xl font-bold text-white">Diario Clinico</h1>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Storico parametri vitali e note
        </p>
      </header>

      <div className="px-4 pb-8">
        {/* Placeholder contenuto — da implementare */}
        <div className="
          rounded-2xl border border-dashed border-slate-700
          p-10 text-center
        ">
          <BookOpenText size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm mb-4">
            Il diario sarà disponibile nel prossimo sprint.
          </p>
          <Link
            href="/diario/nuovo"
            id="btn-nuovo-log-diario"
            className="
              inline-flex items-center gap-2
              px-4 py-2 rounded-xl
              bg-blue-600 hover:bg-blue-500
              text-sm font-semibold text-white
              transition-colors
            "
          >
            <PlusCircle size={16} />
            Aggiungi primo log
          </Link>
        </div>
      </div>
    </div>
  );
}
