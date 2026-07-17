/**
 * @file src/components/UserMenu.tsx
 * @description Menu utente nell'header con avatar, nome e pulsante logout.
 * Mostra un dropdown con l'opzione di logout.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, ChevronDown, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { clearRispostaMedicoNonLetta } from "@/lib/firebase/firestore";

export default function UserMenu() {
  const { user, accountProfile, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  // Stato locale per riflettere subito l'azzeramento in UI: accountProfile
  // viene caricato una tantum da AuthContext, non in realtime.
  const [flagCleared, setFlagCleared] = useState(false);

  if (!user) return null;

  const hasNovita = !flagCleared && !!accountProfile?.haRispostaMedicoNonLetta;

  const handleToggleMenu = () => {
    const next = !open;
    setOpen(next);
    // Azzera solo all'apertura (azione esplicita di consultazione), non alla
    // chiusura, e solo se il flag era effettivamente attivo.
    if (next && hasNovita && accountProfile) {
      clearRispostaMedicoNonLetta(accountProfile.uid).catch((err) =>
        console.error("Errore azzeramento flag haRispostaMedicoNonLetta:", err)
      );
      setFlagCleared(true);
    }
  };

  // Iniziale del nome per l'avatar
  const iniziale = accountProfile?.nome?.[0]?.toUpperCase()
    ?? user.displayName?.[0]?.toUpperCase()
    ?? user.email?.[0]?.toUpperCase()
    ?? "G";

  const nomeDisplay = accountProfile
    ? `${accountProfile.nome} ${accountProfile.cognome}`
    : user.displayName ?? user.email ?? "Genitore";

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } catch (err) {
      console.error("[UserMenu] Errore logout:", err);
      setLoggingOut(false);
    }
  };

  return (
    <div className="relative">
      {/* Trigger avatar */}
      <button
        id="btn-user-menu"
        aria-label="Menu utente"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={handleToggleMenu}
        className="flex items-center gap-2 rounded-xl bg-blue-600/20 border border-blue-500/30 pl-2 pr-1 py-1 transition-colors hover:bg-blue-600/30"
      >
        {/* Avatar con iniziale */}
        <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
          {iniziale}
          {hasNovita && (
            <span
              aria-label="Nuova prescrizione dal medico"
              className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-sky-400 ring-2 ring-slate-950"
            />
          )}
        </div>
        <ChevronDown
          size={13}
          className={`text-blue-300 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown menu */}
      {open && (
        <>
          {/* Overlay */}
          <div
            aria-hidden="true"
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          <div
            role="menu"
            aria-label="Menu utente"
            className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border border-slate-700 bg-slate-900 shadow-xl shadow-black/50 overflow-hidden"
          >
            {/* Info utente */}
            <div className="border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {iniziale}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {nomeDisplay}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Opzioni */}
            <div className="p-1">
              <button
                role="menuitem"
                onClick={() => { setOpen(false); router.push("/impostazioni"); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <User size={14} className="text-slate-400" />
                Profilo & Impostazioni
              </button>

              <div className="my-1 border-t border-slate-800" />

              <button
                id="btn-logout"
                role="menuitem"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-950/40 transition-colors disabled:opacity-50"
              >
                {loggingOut
                  ? <Loader2 size={14} className="animate-spin" />
                  : <LogOut size={14} />
                }
                {loggingOut ? "Disconnessione…" : "Esci"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
