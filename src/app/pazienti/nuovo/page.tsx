/**
 * @file src/app/pazienti/nuovo/page.tsx
 * @description Form per aggiungere un nuovo paziente.
 *
 * Viene usato:
 * 1. Subito dopo la registrazione (primo paziente)
 * 2. Dalla Dashboard quando si vuole aggiungere un altro paziente
 *
 * Query param ?primo=true → mostra un messaggio di benvenuto
 */

"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Baby, AlertCircle, CalendarDays } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePatient } from "@/context/PatientContext";
import { addPatient } from "@/lib/firebase/firestore";
import type { PostOpPhase } from "@/types";

// ---------------------------------------------------------------------------
// Configurazione fasi (etichette UI — la config completa è su Firestore)
// ---------------------------------------------------------------------------
const FASI: { value: PostOpPhase; label: string; range: string }[] = [
  { value: "fase_1", label: "Fase 1 — Liquidi freddi",    range: "Giorno 0–1" },
  { value: "fase_2", label: "Fase 2 — Semiliquidi",       range: "Giorno 2–4" },
  { value: "fase_3", label: "Fase 3 — Alimenti morbidi",  range: "Giorno 5–7" },
  { value: "fase_4", label: "Fase 4 — Transizione",       range: "Giorno 8–10" },
  { value: "fase_5", label: "Fase 5 — Normale",           range: "Giorno 11+" },
];

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function NuovoPazientePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPrimo = searchParams.get("primo") === "true";
  const { user } = useAuth();
  const { refetch } = usePatient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stato form
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [dataNascita, setDataNascita] = useState("");
  const [dataOperazione, setDataOperazione] = useState("");
  const [faseAttualeId, setFaseAttualeId] = useState<PostOpPhase>("fase_1");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError("Devi essere autenticato per aggiungere un paziente.");
      return;
    }

    // Validazione date
    const oggi = new Date();
    const opDate = new Date(dataOperazione);
    if (opDate > oggi) {
      setError("La data dell'operazione non può essere nel futuro.");
      return;
    }

    setLoading(true);

    try {
      const patientId = await addPatient(user.uid, {
        nome: nome.trim(),
        cognome: cognome.trim(),
        dataNascita,
        dataOperazione,
        faseAttualeId,
      });

      // Aggiorna il PatientContext con la nuova lista
      await refetch();

      // Salva il paziente selezionato nel localStorage
      localStorage.setItem("tonsilcare_active_patient_id", patientId);

      // Redirect alla Dashboard
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("[NuovoPaziente]", err);
      setError("Errore durante il salvataggio. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-950">

      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/30">
            <Baby size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              {isPrimo ? "Aggiungi il tuo bambino" : "Nuovo paziente"}
            </h1>
            {isPrimo && (
              <p className="text-xs text-slate-400">
                Ultimo passo per iniziare il monitoraggio 🎉
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="px-4 pb-10 space-y-5"
        aria-label="Form aggiunta paziente"
      >
        {/* Errore */}
        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-800/50 bg-red-950/50 p-3.5">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Nome + Cognome */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="paz-nome" className="block text-sm font-medium text-slate-300">Nome</label>
            <input
              id="paz-nome"
              type="text"
              required
              placeholder="Marco"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50"
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="paz-cognome" className="block text-sm font-medium text-slate-300">Cognome</label>
            <input
              id="paz-cognome"
              type="text"
              required
              placeholder="Rossi"
              value={cognome}
              onChange={(e) => setCognome(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50"
              disabled={loading}
            />
          </div>
        </div>

        {/* Data di nascita */}
        <div className="space-y-1.5">
          <label htmlFor="paz-nascita" className="block text-sm font-medium text-slate-300">
            <CalendarDays size={14} className="inline mr-1.5 text-slate-400" />
            Data di nascita
          </label>
          <input
            id="paz-nascita"
            type="date"
            required
            value={dataNascita}
            onChange={(e) => setDataNascita(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50 [color-scheme:dark]"
            disabled={loading}
          />
        </div>

        {/* Data operazione */}
        <div className="space-y-1.5">
          <label htmlFor="paz-operazione" className="block text-sm font-medium text-slate-300">
            <CalendarDays size={14} className="inline mr-1.5 text-slate-400" />
            Data dell&apos;operazione
          </label>
          <input
            id="paz-operazione"
            type="date"
            required
            value={dataOperazione}
            onChange={(e) => setDataOperazione(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50 [color-scheme:dark]"
            disabled={loading}
          />
        </div>

        {/* Fase attuale */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">
            Fase post-operatoria attuale
          </label>
          <p className="text-xs text-slate-500 mb-2">
            Puoi sempre aggiornare questa informazione dalla Dashboard.
          </p>
          <div className="space-y-2">
            {FASI.map((fase) => (
              <label
                key={fase.value}
                htmlFor={`fase-${fase.value}`}
                className={`
                  flex items-center justify-between
                  rounded-xl border px-4 py-3
                  cursor-pointer transition-all duration-150
                  ${faseAttualeId === fase.value
                    ? "border-blue-500 bg-blue-900/30"
                    : "border-slate-700 bg-slate-800/40 hover:border-slate-600"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id={`fase-${fase.value}`}
                    name="fase"
                    value={fase.value}
                    checked={faseAttualeId === fase.value}
                    onChange={() => setFaseAttualeId(fase.value)}
                    className="accent-blue-500"
                    disabled={loading}
                  />
                  <span className="text-sm font-medium text-slate-200">{fase.label}</span>
                </div>
                <span className="text-xs text-slate-500">{fase.range}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          id="btn-salva-paziente"
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 py-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-blue-500 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" />Salvataggio…</>
          ) : (
            isPrimo ? "Inizia il monitoraggio →" : "Salva paziente"
          )}
        </button>
      </form>
    </div>
  );
}
