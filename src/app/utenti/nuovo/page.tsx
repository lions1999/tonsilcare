/**
 * @file src/app/utenti/nuovo/page.tsx
 * @description Form per aggiungere un nuovo paziente.
 *
 * Viene usato:
 * 1. Subito dopo la registrazione (primo utente)
 * 2. Dalla Dashboard quando si vuole aggiungere un altro utente
 *
 * Query param ?primo=true → mostra un messaggio di benvenuto
 */

"use client";

import { useState, type FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Baby, AlertCircle, CalendarDays, Scale, Ruler, Stethoscope, ShieldAlert, Activity } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUtente } from "@/context/UtenteContext";
import { addUtente } from "@/lib/firebase/firestore";
import { calcolaBMI } from "@/lib/utils/paziente";
import { oggiPerInputDate } from "@/lib/utils/date";
import { calcolaStatoFase } from "@/lib/utils/fase";
import { useFasi } from "@/hooks/useFasi";
import {
  utenteProfileSchema,
  parseListaTesto,
  TIPI_INTERVENTO,
} from "@/lib/validations/utente";
import type { TipoIntervento } from "@/types";

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

function UtenteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPrimo = searchParams.get("primo") === "true";
  const { user } = useAuth();
  const { refetch } = useUtente();
  const { fasi } = useFasi();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stato form
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [dataNascita, setDataNascita] = useState("");
  const [dataOperazione, setDataOperazione] = useState("");
  const [tipoIntervento, setTipoIntervento] = useState<TipoIntervento | "">("");
  const [pesoIniziale, setPesoIniziale] = useState("");
  const [altezza, setAltezza] = useState("");
  const [allergieIntolleranze, setAllergieIntolleranze] = useState("");
  const [patologieAssociate, setPatologieAssociate] = useState("");

  // Anteprima BMI live — solo se peso e altezza sono entrambi numeri validi
  const pesoNum = parseFloat(pesoIniziale);
  const altezzaNum = parseFloat(altezza);
  const bmiPreview =
    Number.isFinite(pesoNum) && Number.isFinite(altezzaNum) && altezzaNum > 0
      ? calcolaBMI(pesoNum, altezzaNum)
      : null;

  // Anteprima della fase: mostra cosa produrrà la data scelta, senza che sia
  // modificabile. Il genitore sceglieva la fase a mano e non la aggiornava mai
  // più, quindi dopo pochi giorni il piano alimentare era quello sbagliato.
  const anteprimaFase =
    dataOperazione && fasi.length > 0
      ? calcolaStatoFase({ dataOperazione }, fasi)
      : null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError("Devi essere autenticato per aggiungere un utente.");
      return;
    }

    // Nessun controllo sulla data dell'operazione: una data futura è un
    // intervento previsto, non un errore. Vedi lo stato pre-operatorio in
    // lib/utils/fase.ts.
    const parsed = utenteProfileSchema.safeParse({
      nome: nome.trim(),
      cognome: cognome.trim(),
      dataNascita,
      dataOperazione,
      tipoIntervento: tipoIntervento || undefined,
      pesoIniziale: pesoNum,
      altezza: altezzaNum,
      allergieIntolleranze: parseListaTesto(allergieIntolleranze),
      patologieAssociate: parseListaTesto(patologieAssociate),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dati del form non validi.");
      return;
    }

    setLoading(true);

    try {
      const utenteId = await addUtente(user.uid, parsed.data);

      // Aggiorna l'UtenteContext con la nuova lista
      await refetch();

      // Salva l'utente selezionato nel localStorage
      localStorage.setItem("tonsilcare_active_utente_id", utenteId);

      // Redirect alla Dashboard
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("[NuovoUtente]", err);
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
              {isPrimo ? "Aggiungi il tuo bambino" : "Nuovo utente"}
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
        aria-label="Form aggiunta utente"
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
            max={oggiPerInputDate()}
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
          {/*
            Senza `max`: la data può essere nel futuro, perché la scheda si apre
            anche per un intervento solo programmato.
          */}
          <input
            id="paz-operazione"
            type="date"
            required
            value={dataOperazione}
            onChange={(e) => setDataOperazione(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50 [color-scheme:dark]"
            disabled={loading}
          />
          <p className="text-xs text-slate-500">
            Se l&apos;intervento è programmato, indica la data prevista.
          </p>

          {/* Anteprima della fase derivata — sola lettura */}
          {anteprimaFase && (
            <div
              aria-live="polite"
              className="flex items-start gap-2.5 rounded-xl border border-slate-700/60 bg-slate-800/40 px-3.5 py-3"
            >
              <Activity size={14} className="mt-0.5 flex-shrink-0 text-blue-400" />
              <div className="text-xs">
                {anteprimaFase.tipo === "pre_operatorio" && (
                  <p className="text-slate-300">
                    Intervento tra{" "}
                    <strong className="text-white">
                      {anteprimaFase.giorniAllIntervento}{" "}
                      {anteprimaFase.giorniAllIntervento === 1 ? "giorno" : "giorni"}
                    </strong>
                    . Il piano alimentare comparirà dal giorno dell&apos;operazione.
                  </p>
                )}
                {anteprimaFase.tipo === "in_fase" && (
                  <p className="text-slate-300">
                    Oggi è il{" "}
                    <strong className="text-white">{anteprimaFase.giorno}° giorno post-operatorio</strong>:{" "}
                    <strong className="text-white">{anteprimaFase.fase.titolo}</strong>.
                  </p>
                )}
                {anteprimaFase.tipo === "concluso" && (
                  <p className="text-slate-300">
                    Sono passati <strong className="text-white">{anteprimaFase.giorno} giorni</strong>:
                    il percorso post-operatorio guidato è concluso.
                  </p>
                )}
                {anteprimaFase.tipo === "indeterminato" && (
                  <p className="text-slate-400">Data non valida.</p>
                )}
                <p className="mt-1 text-slate-500">
                  La fase si aggiorna da sola ogni giorno. Solo il medico può modificarla.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tipo di intervento */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">
            <Stethoscope size={14} className="inline mr-1.5 text-slate-400" />
            Tipo di intervento
          </label>
          <div className="space-y-2">
            {TIPI_INTERVENTO.map((tipo) => (
              <label
                key={tipo.value}
                htmlFor={`tipo-${tipo.value}`}
                className={`
                  flex items-center gap-3
                  rounded-xl border px-4 py-3
                  cursor-pointer transition-all duration-150
                  ${tipoIntervento === tipo.value
                    ? "border-blue-500 bg-blue-900/30"
                    : "border-slate-700 bg-slate-800/40 hover:border-slate-600"
                  }
                `}
              >
                <input
                  type="radio"
                  id={`tipo-${tipo.value}`}
                  name="tipoIntervento"
                  value={tipo.value}
                  checked={tipoIntervento === tipo.value}
                  onChange={() => setTipoIntervento(tipo.value)}
                  className="accent-blue-500"
                  disabled={loading}
                  required
                />
                <span className="text-sm font-medium text-slate-200">{tipo.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Peso e altezza (con anteprima BMI) */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">
            Dati auxologici
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="paz-peso" className="flex items-center gap-1.5 text-xs text-slate-400">
                <Scale size={13} /> Peso (kg)
              </label>
              <input
                id="paz-peso"
                type="number"
                step="0.1"
                min="0"
                required
                value={pesoIniziale}
                onChange={(e) => setPesoIniziale(e.target.value)}
                placeholder="20"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50"
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="paz-altezza" className="flex items-center gap-1.5 text-xs text-slate-400">
                <Ruler size={13} /> Altezza (cm)
              </label>
              <input
                id="paz-altezza"
                type="number"
                step="0.1"
                min="0"
                required
                value={altezza}
                onChange={(e) => setAltezza(e.target.value)}
                placeholder="110"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50"
                disabled={loading}
              />
            </div>
          </div>
          {bmiPreview !== null && (
            <p className="text-xs text-slate-400">
              BMI: <strong className="text-slate-200">{bmiPreview.toFixed(1)}</strong>
            </p>
          )}
        </div>

        {/* Allergie / intolleranze */}
        <div className="space-y-1.5">
          <label htmlFor="paz-allergie" className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
            <ShieldAlert size={14} className="text-slate-400" />
            Allergie o intolleranze alimentari
          </label>
          <textarea
            id="paz-allergie"
            rows={2}
            value={allergieIntolleranze}
            onChange={(e) => setAllergieIntolleranze(e.target.value)}
            placeholder="Es. arachidi, lattosio (separati da virgola)"
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50"
            disabled={loading}
          />
        </div>

        {/* Patologie associate */}
        <div className="space-y-1.5">
          <label htmlFor="paz-patologie" className="block text-sm font-medium text-slate-300">
            Patologie associate
          </label>
          <textarea
            id="paz-patologie"
            rows={2}
            value={patologieAssociate}
            onChange={(e) => setPatologieAssociate(e.target.value)}
            placeholder="Es. asma, dermatite atopica (separate da virgola)"
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50"
            disabled={loading}
          />
        </div>

        {/* Submit */}
        <button
          id="btn-salva-utente"
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 py-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-blue-500 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" />Salvataggio…</>
          ) : (
            isPrimo ? "Inizia il monitoraggio →" : "Salva utente"
          )}
        </button>
      </form>
    </div>
  );
}

export default function NuovoUtentePage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-blue-500" size={32} /></div>}>
      <UtenteForm />
    </Suspense>
  );
}
