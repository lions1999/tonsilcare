/**
 * @file src/components/UtenteSwitcher.tsx
 * @description Selettore utente nell'header della Dashboard.
 * Legge la lista e l'utente attivo dall'UtenteContext (dati reali da Firestore).
 */

"use client";

import Link from "next/link";
import { ChevronDown, Baby, PlusCircle } from "lucide-react";
import { useState } from "react";
import { useUtente } from "@/context/UtenteContext";

export default function UtenteSwitcher() {
  const { utenti, activeUtente, setActiveUtente, loading } = useUtente();
  const [open, setOpen] = useState(false);

  // Durante il caricamento, mostra uno skeleton minimo
  if (loading) {
    return (
      <div className="h-9 w-32 animate-pulse rounded-xl bg-slate-800" />
    );
  }

  // Se non ci sono utenti, mostra solo il CTA
  if (utenti.length === 0 || !activeUtente) {
    return (
      <Link
        href="/utenti/nuovo?primo=true"
        id="btn-aggiungi-primo-utente"
        className="flex items-center gap-2 rounded-xl border border-dashed border-slate-600 px-3 py-2 text-sm text-slate-400 transition-colors hover:border-blue-500 hover:text-blue-400"
      >
        <PlusCircle size={15} />
        Aggiungi utente
      </Link>
    );
  }

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        id="btn-utente-switcher"
        aria-label="Seleziona utente"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/60 px-3 py-2 transition-colors hover:border-slate-600"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-600/20">
          <Baby size={14} className="text-blue-400" />
        </div>
        <div className="text-left">
          <p className="text-[10px] leading-none text-slate-400 mb-0.5">Utente</p>
          <p className="text-sm font-semibold leading-none text-white">
            {activeUtente.nome} {activeUtente.cognome}
          </p>
        </div>
        <ChevronDown
          size={14}
          className={`ml-1 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            aria-label="Lista utenti"
            className="absolute left-0 top-full z-50 mt-1 min-w-[220px] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl shadow-black/40"
          >
            {utenti.map((utente) => (
              <button
                key={utente.id}
                role="option"
                aria-selected={utente.id === activeUtente.id}
                onClick={() => {
                  setActiveUtente(utente);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                  utente.id === activeUtente.id
                    ? "bg-blue-900/40 text-blue-300"
                    : "text-slate-200 hover:bg-slate-800"
                }`}
              >
                <Baby size={14} className="flex-shrink-0 text-slate-400" />
                <span className="font-medium">
                  {utente.nome} {utente.cognome}
                </span>
              </button>
            ))}

            <div className="border-t border-slate-800">
              <Link
                href="/utenti/nuovo"
                id="btn-aggiungi-utente-dropdown"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-blue-400 transition-colors hover:bg-slate-800"
              >
                <PlusCircle size={14} />
                Aggiungi utente
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
