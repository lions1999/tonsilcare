/**
 * @file src/components/UtenteSwitcher.tsx
 * @description Selettore utente nell'header della Dashboard.
 * Legge la lista e l'utente attivo dall'UtenteContext (dati reali da Firestore).
 */

"use client";

import Link from "next/link";
import { ChevronDown, Baby, PlusCircle } from "lucide-react";
import { useRef, useState } from "react";
import { useUtente } from "@/context/UtenteContext";
import { useChiusuraAlClickFuori } from "@/hooks/useChiusuraAlClickFuori";

export default function UtenteSwitcher() {
  const { utenti, activeUtente, setActiveUtente, loading } = useUtente();
  const [open, setOpen] = useState(false);
  const contenitore = useRef<HTMLDivElement>(null);

  /*
    Chiusura al click fuori.

    Qui c'era un overlay `fixed inset-0`, ed era rotto da sempre: misurato a
    375×812, l'overlay era 375×**125** — grande quanto l'header della dashboard,
    non quanto la pagina. Questo componente vive dentro un header con
    `backdrop-blur`, che crea un blocco contenitore per i `fixed` discendenti.
    Terza occorrenza dello stesso difetto nel progetto; l'hook esiste per non
    farne una quarta.
  */
  useChiusuraAlClickFuori(open, contenitore, () => setOpen(false));

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
        Aggiungi paziente
      </Link>
    );
  }

  return (
    <div className="relative" ref={contenitore}>
      {/* Trigger */}
      <button
        id="btn-utente-switcher"
        aria-label="Seleziona paziente"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/60 px-3 py-2 transition-colors hover:border-slate-600"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-600/20">
          <Baby size={14} className="text-blue-400" />
        </div>
        <div className="text-left">
          {/*
            "Paziente" al singolare perché etichetta il singolo nome qui sotto,
            quello attivo. Il testo di questo file dice "paziente" ovunque; il
            componente, le variabili e la rotta /utenti/nuovo restano "utente" ed
            è voluto — vedi la regola sul vocabolario in CLAUDE.md.
          */}
          <p className="text-[10px] leading-none text-slate-400 mb-0.5">Paziente</p>
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
      {/*
        `absolute` ed è corretto: si ancora al contenitore `relative` qui sopra,
        cioè al primo antenato posizionato, che il blocco contenitore del
        `backdrop-blur` non tocca. È solo il `fixed` a spostarsi.
      */}
      {open && (
        <>
          <div
            role="listbox"
            aria-label="Lista pazienti"
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
                Aggiungi paziente
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
