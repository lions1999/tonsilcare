/**
 * @file src/app/(auth)/layout.tsx
 * @description Layout per le pagine di autenticazione (login, registrazione).
 * NON include la BottomNav — è un layout pulito centrato verticalmente.
 */

import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-950 flex flex-col">
      {/* Sfondo decorativo */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        {/* Blob blu in alto */}
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
        {/* Blob teal in basso */}
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-teal-600/10 blur-3xl" />
      </div>

      {/* Contenuto centrato */}
      <main
        id="auth-main"
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12"
      >
        {children}
      </main>
    </div>
  );
}
