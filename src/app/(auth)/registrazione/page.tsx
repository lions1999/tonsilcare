/**
 * @file src/app/(auth)/registrazione/page.tsx
 * @description Pagina di registrazione nuovo genitore.
 *
 * Crea l'account Firebase Auth + il documento Firestore /utenti/{uid}.
 * Dopo la registrazione, redirect automatico alla pagina di aggiunta paziente.
 */

"use client";

import { useState, useRef, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Heart, AlertCircle, CheckCircle2 } from "lucide-react";
import { signUp } from "@/lib/firebase/auth";

// ---------------------------------------------------------------------------
// Mappatura errori Firebase → italiano
// ---------------------------------------------------------------------------
const FIREBASE_ERRORS: Record<string, string> = {
  "auth/email-already-in-use":    "Questa email è già registrata. Accedi o usa un'altra email.",
  "auth/invalid-email":           "Indirizzo email non valido.",
  "auth/weak-password":           "La password è troppo debole. Usa almeno 6 caratteri.",
  "auth/network-request-failed":  "Errore di rete. Controlla la connessione.",
  "auth/operation-not-allowed":   "La registrazione via email non è attiva. Contatta il supporto.",
};

function getErrorMessage(code: string): string {
  return FIREBASE_ERRORS[code] ?? "Si è verificato un errore. Riprova.";
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function RegistrazionePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const nomeRef = useRef<HTMLInputElement>(null);
  const cognomeRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const nome = nomeRef.current?.value.trim() ?? "";
    const cognome = cognomeRef.current?.value.trim() ?? "";
    const email = emailRef.current?.value.trim() ?? "";
    const password = passwordRef.current?.value ?? "";
    const confirm = confirmRef.current?.value ?? "";

    // Validazione client-side
    if (password !== confirm) {
      setError("Le password non coincidono.");
      return;
    }
    if (password.length < 6) {
      setError("La password deve contenere almeno 6 caratteri.");
      return;
    }

    setLoading(true);

    try {
      const credential = await signUp({ email, password, nome, cognome });

      // Imposta cookie di sessione per il middleware
      const token = await credential.user.getIdToken();
      document.cookie = `__session=${token}; path=/; SameSite=Strict; Secure`;

      // Dopo la registrazione → aggiungi il primo paziente
      router.push("/pazienti/nuovo?primo=true");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(getErrorMessage(code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">

      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/30">
          <Heart size={32} className="text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Crea il tuo account</h1>
        <p className="mt-1 text-sm text-slate-400">
          TonsilCare — Supporto post-operatorio
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4"
        aria-label="Form di registrazione"
      >
        {/* Errore */}
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="flex items-start gap-2.5 rounded-xl border border-red-800/50 bg-red-950/50 p-3.5"
          >
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Nome + Cognome */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="reg-nome" className="block text-sm font-medium text-slate-300">
              Nome
            </label>
            <input
              ref={nomeRef}
              id="reg-nome"
              type="text"
              autoComplete="given-name"
              required
              placeholder="Mario"
              className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50"
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reg-cognome" className="block text-sm font-medium text-slate-300">
              Cognome
            </label>
            <input
              ref={cognomeRef}
              id="reg-cognome"
              type="text"
              autoComplete="family-name"
              required
              placeholder="Rossi"
              className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50"
              disabled={loading}
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="reg-email" className="block text-sm font-medium text-slate-300">
            Email
          </label>
          <input
            ref={emailRef}
            id="reg-email"
            type="email"
            autoComplete="email"
            required
            placeholder="tuaemail@esempio.com"
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50"
            disabled={loading}
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="reg-password" className="block text-sm font-medium text-slate-300">
            Password
          </label>
          <div className="relative">
            <input
              ref={passwordRef}
              id="reg-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="Min. 6 caratteri"
              className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 pr-12 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50"
              disabled={loading}
            />
            <button
              type="button"
              aria-label={showPassword ? "Nascondi password" : "Mostra password"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Conferma Password */}
        <div className="space-y-1.5">
          <label htmlFor="reg-confirm" className="block text-sm font-medium text-slate-300">
            Conferma password
          </label>
          <div className="relative">
            <input
              ref={confirmRef}
              id="reg-confirm"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="Ripeti la password"
              className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 pr-12 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50"
              disabled={loading}
            />
            <button
              type="button"
              aria-label={showConfirm ? "Nascondi conferma password" : "Mostra conferma password"}
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Nota GDPR / privacy semplificata */}
        <p className="flex items-start gap-2 text-xs text-slate-500">
          <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-slate-600" />
          Registrandoti accetti i Termini di Servizio e la Privacy Policy.
          I dati del paziente sono protetti e accessibili solo a te.
        </p>

        {/* Submit */}
        <button
          id="btn-registrazione-submit"
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-blue-500 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creazione account…
            </>
          ) : (
            "Crea account"
          )}
        </button>
      </form>

      {/* Link a login */}
      <p className="mt-6 text-center text-sm text-slate-500">
        Hai già un account?{" "}
        <Link
          href="/login"
          id="link-login"
          className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          Accedi
        </Link>
      </p>
    </div>
  );
}
