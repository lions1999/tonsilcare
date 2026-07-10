/**
 * @file src/app/offline/page.tsx
 * @description Pagina di fallback mostrata dal Service Worker quando manca la connessione.
 */

"use client";

import { WifiOff, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Aggiorna lo stato in tempo reale
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-900 shadow-xl shadow-black/50">
        <WifiOff size={40} className={isOnline ? "text-teal-500" : "text-slate-500"} />
      </div>

      <h1 className="mb-3 text-2xl font-black tracking-tight text-white">
        Sei Offline
      </h1>

      <p className="mb-8 max-w-xs text-sm leading-relaxed text-slate-400">
        Sembra che tu non abbia una connessione a internet. Alcune funzioni dell'app potrebbero non essere disponibili finché non torni online.
      </p>

      {/* Stato Connessione Dinamico */}
      <div className={`mb-10 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
        isOnline 
          ? "border-teal-500/30 bg-teal-500/10 text-teal-400"
          : "border-slate-800 bg-slate-900 text-slate-300"
      }`}>
        Stato attuale: {isOnline ? "Connessione ripristinata! 🎉" : "In attesa di rete..."}
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={handleRefresh}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-transform active:scale-95 hover:bg-blue-500"
        >
          <RefreshCcw size={18} />
          Riprova Connessione
        </button>

        <Link
          href="/"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-slate-700"
        >
          <Home size={18} />
          Torna alla Dashboard
        </Link>
      </div>
    </div>
  );
}
