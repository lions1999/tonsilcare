/**
 * @file src/components/PatientSwitcher.tsx
 * @description Selettore paziente nell'header della Dashboard.
 * Legge la lista e il paziente attivo dal PatientContext (dati reali da Firestore).
 */

"use client";

import Link from "next/link";
import { ChevronDown, Baby, PlusCircle } from "lucide-react";
import { useState } from "react";
import { usePatient } from "@/context/PatientContext";

export default function PatientSwitcher() {
  const { patients, activePatient, setActivePatient, loading } = usePatient();
  const [open, setOpen] = useState(false);

  // Durante il caricamento, mostra uno skeleton minimo
  if (loading) {
    return (
      <div className="h-9 w-32 animate-pulse rounded-xl bg-slate-800" />
    );
  }

  // Se non ci sono pazienti, mostra solo il CTA
  if (patients.length === 0 || !activePatient) {
    return (
      <Link
        href="/pazienti/nuovo?primo=true"
        id="btn-aggiungi-primo-paziente"
        className="flex items-center gap-2 rounded-xl border border-dashed border-slate-600 px-3 py-2 text-sm text-slate-400 transition-colors hover:border-blue-500 hover:text-blue-400"
      >
        <PlusCircle size={15} />
        Aggiungi paziente
      </Link>
    );
  }

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        id="btn-patient-switcher"
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
          <p className="text-[10px] leading-none text-slate-400 mb-0.5">Paziente</p>
          <p className="text-sm font-semibold leading-none text-white">
            {activePatient.nome} {activePatient.cognome}
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
            aria-label="Lista pazienti"
            className="absolute left-0 top-full z-50 mt-1 min-w-[220px] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl shadow-black/40"
          >
            {patients.map((patient) => (
              <button
                key={patient.id}
                role="option"
                aria-selected={patient.id === activePatient.id}
                onClick={() => {
                  setActivePatient(patient);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                  patient.id === activePatient.id
                    ? "bg-blue-900/40 text-blue-300"
                    : "text-slate-200 hover:bg-slate-800"
                }`}
              >
                <Baby size={14} className="flex-shrink-0 text-slate-400" />
                <span className="font-medium">
                  {patient.nome} {patient.cognome}
                </span>
              </button>
            ))}

            <div className="border-t border-slate-800">
              <Link
                href="/pazienti/nuovo"
                id="btn-aggiungi-paziente-dropdown"
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
