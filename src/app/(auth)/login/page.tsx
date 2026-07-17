/**
 * @file src/app/(auth)/login/page.tsx
 * @description Pagina di login con email + password.
 *
 * Gestisce:
 * - Form di login con validazione HTML nativa
 * - Messaggi di errore Firebase tradotti in italiano
 * - Link a "Password dimenticata" e "Registrati"
 * - Redirect post-login (alla route originale o alla Dashboard)
 * - Impostazione del cookie di sessione per il middleware
 */

"use client";

import { useState, useRef, type FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Heart, AlertCircle } from "lucide-react";
import { signIn } from "@/lib/firebase/auth";
import { getAccountProfile } from "@/lib/firebase/firestore";

// ---------------------------------------------------------------------------
// Mappatura errori Firebase → messaggi in italiano
// ---------------------------------------------------------------------------
const FIREBASE_ERRORS: Record<string, string> = {
  "auth/user-not-found":      "Nessun account trovato con questa email.",
  "auth/wrong-password":      "Password non corretta.",
  "auth/invalid-email":       "Indirizzo email non valido.",
  "auth/user-disabled":       "Questo account è stato disabilitato.",
  "auth/too-many-requests":   "Troppi tentativi. Riprova tra qualche minuto.",
  "auth/invalid-credential":  "Email o password non corretti.",
  "auth/network-request-failed": "Errore di rete. Controlla la connessione.",
};

function getErrorMessage(code: string): string {
  return FIREBASE_ERRORS[code] ?? "Si è verificato un errore. Riprova.";
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const email = emailRef.current?.value ?? "";
    const password = passwordRef.current?.value ?? "";

    try {
      const credential = await signIn({ email, password });

      // Imposta il cookie di sessione per il middleware
      // Il token ID ha durata 1 ora — per produzione usa Firebase Session Cookies
      const token = await credential.user.getIdToken();
      document.cookie = `__session=${token}; path=/; SameSite=Strict; Secure`;

      // Scrive __role qui, sincrono col login, invece di aspettare il
      // listener asincrono di AuthContext: altrimenti il router.push() qui
      // sotto arriva al middleware prima che il ruolo sia noto, e il
      // redirect RBAC medico -> /studio non scatta.
      try {
        const profile = await getAccountProfile(credential.user.uid);
        if (profile?.ruolo) {
          document.cookie = `__role=${profile.ruolo}; path=/; SameSite=Strict; Secure`;
        }
      } catch (roleErr) {
        console.error("[Login] Errore lettura ruolo account:", roleErr);
        // Non blocca il login: AuthContext lo scriverà comunque appena risolve.
      }

      router.push(redirectTo);
      router.refresh();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(getErrorMessage(code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">

      {/* Logo / Brand */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/30">
          <Heart size={32} className="text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">TonsilCare</h1>
        <p className="mt-1 text-sm text-slate-400">
          Accedi al tuo account
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4"
        aria-label="Form di accesso"
      >
        {/* Messaggio di errore */}
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

        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="login-email"
            className="block text-sm font-medium text-slate-300"
          >
            Email
          </label>
          <input
            ref={emailRef}
            id="login-email"
            type="email"
            autoComplete="email"
            required
            placeholder="tuaemail@esempio.com"
            className="
              w-full rounded-xl border border-slate-700
              bg-slate-800/60 px-4 py-3
              text-sm text-white placeholder-slate-500
              transition-colors
              focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none
              disabled:opacity-50
            "
            disabled={loading}
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-slate-300"
            >
              Password
            </label>
            <Link
              href="/reset-password"
              id="link-reset-password"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Password dimenticata?
            </Link>
          </div>
          <div className="relative">
            <input
              ref={passwordRef}
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              minLength={6}
              placeholder="••••••••"
              className="
                w-full rounded-xl border border-slate-700
                bg-slate-800/60 px-4 py-3 pr-12
                text-sm text-white placeholder-slate-500
                transition-colors
                focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none
                disabled:opacity-50
              "
              disabled={loading}
            />
            <button
              type="button"
              aria-label={showPassword ? "Nascondi password" : "Mostra password"}
              onClick={() => setShowPassword((v) => !v)}
              className="
                absolute right-3 top-1/2 -translate-y-1/2
                text-slate-400 hover:text-slate-200
                transition-colors p-1
              "
            >
              {showPassword
                ? <EyeOff size={16} />
                : <Eye size={16} />
              }
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          id="btn-login-submit"
          type="submit"
          disabled={loading}
          className="
            w-full rounded-xl bg-blue-600 py-3.5
            text-sm font-semibold text-white
            transition-all duration-200
            hover:bg-blue-500 active:scale-95
            disabled:opacity-60 disabled:cursor-not-allowed
            flex items-center justify-center gap-2
          "
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Accesso in corso…
            </>
          ) : (
            "Accedi"
          )}
        </button>
      </form>

      {/* Link a registrazione */}
      <p className="mt-6 text-center text-sm text-slate-500">
        Non hai un account?{" "}
        <Link
          href="/registrazione"
          id="link-registrazione"
          className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          Registrati gratis
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" size={32} /></div>}>
      <LoginForm />
    </Suspense>
  );
}
