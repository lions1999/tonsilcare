/**
 * @file src/components/EmptyState.tsx
 * @description Componente Empty State per quando il genitore non ha ancora
 * aggiunto nessun paziente.
 *
 * Mostra un messaggio amichevole e un CTA per aggiungere il primo paziente.
 */

import Link from "next/link";
import { Baby, PlusCircle } from "lucide-react";

interface EmptyStateProps {
  /** Titolo del messaggio */
  title?: string;
  /** Descrizione */
  description?: string;
  /** Label del pulsante CTA */
  ctaLabel?: string;
  /** Destinazione del CTA */
  ctaHref?: string;
}

export default function EmptyState({
  title = "Nessun paziente registrato",
  description = "Aggiungi il tuo bambino per iniziare il monitoraggio post-operatorio.",
  ctaLabel = "Aggiungi il tuo primo paziente",
  ctaHref = "/utenti/nuovo?primo=true",
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">

      {/* Illustrazione */}
      <div className="relative mb-6">
        {/* Cerchio esterno decorativo */}
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-600/10 border border-blue-500/20">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/20 border border-blue-500/30">
            <Baby size={32} className="text-blue-400" />
          </div>
        </div>
        {/* Badge + */}
        <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 border-2 border-slate-950 shadow-lg">
          <PlusCircle size={14} className="text-white" />
        </div>
      </div>

      {/* Testo */}
      <h2 className="mb-2 text-xl font-bold text-white">{title}</h2>
      <p className="mb-8 max-w-xs text-sm leading-relaxed text-slate-400">
        {description}
      </p>

      {/* CTA */}
      <Link
        href={ctaHref}
        id="btn-empty-state-cta"
        className="
          flex items-center gap-2.5
          rounded-2xl bg-blue-600 px-6 py-4
          text-sm font-bold text-white
          shadow-xl shadow-blue-900/40
          transition-all duration-200
          hover:bg-blue-500 active:scale-95
        "
      >
        <PlusCircle size={18} />
        {ctaLabel}
      </Link>

      {/* Nota rassicurante */}
      <p className="mt-6 text-xs text-slate-600">
        Potrai aggiungere più pazienti in qualsiasi momento
      </p>
    </div>
  );
}
