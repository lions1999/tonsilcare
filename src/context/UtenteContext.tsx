/**
 * @file src/context/UtenteContext.tsx
 * @description Context globale per l'utente operato attivo selezionato.
 *
 * Gestisce:
 * - Lista degli utenti (via useUtenti)
 * - Utente attivo (persistito in localStorage)
 * - setActiveUtente: cambia l'utente selezionato
 *
 * ANTI-HYDRATION MISMATCH:
 * L'accesso a localStorage avviene SOLO in useEffect (lato client, dopo il mount).
 * Il valore iniziale di activeUtente è sempre null per il primo render SSR.
 * Il componente che consuma il context deve gestire il caso null (loading skeleton).
 */

"use client";

import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useUtenti } from "@/hooks/useUtenti";
import type { UtenteProfile } from "@/types";

// ---------------------------------------------------------------------------
// Costante
// ---------------------------------------------------------------------------

const STORAGE_KEY = "tonsilcare_active_utente_id";

// ---------------------------------------------------------------------------
// Lettura dell'id salvato come "external store"
// ---------------------------------------------------------------------------
//
// localStorage è stato esterno a React: useSyncExternalStore è il modo previsto
// per leggerlo senza passare da useState+useEffect, che richiederebbe una
// setState sincrona nell'effect (react-hooks/set-state-in-effect) e un render
// in più dopo il mount.
//
// L'evento "storage" copre solo le altre schede, quindi teniamo un set di
// iscritti da notificare a mano quando siamo noi a scrivere.

const iscritti = new Set<() => void>();

function sottoscriviIdSalvato(onChange: () => void) {
  iscritti.add(onChange);
  window.addEventListener("storage", onChange);

  return () => {
    iscritti.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Snapshot lato client. */
function leggiIdSalvato(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

/** Snapshot lato server: durante il prerender non esiste localStorage. */
function leggiIdSalvatoSuServer(): string | null {
  return null;
}

function scriviIdSalvato(id: string) {
  localStorage.setItem(STORAGE_KEY, id);
  for (const notifica of iscritti) notifica();
}

// ---------------------------------------------------------------------------
// Tipo del context
// ---------------------------------------------------------------------------

interface UtenteContextValue {
  /** Lista completa degli utenti operati collegati all'account */
  utenti: UtenteProfile[];
  /** Utente attualmente selezionato (null durante caricamento o se non ce ne sono) */
  activeUtente: UtenteProfile | null;
  /** Seleziona un utente e lo persiste in localStorage */
  setActiveUtente: (utente: UtenteProfile) => void;
  /** True durante il caricamento iniziale */
  loading: boolean;
  /** Messaggio di errore Firestore (se presente) */
  error: string | null;
  /** Forza un nuovo fetch dalla Firestore */
  refetch: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const UtenteContext = createContext<UtenteContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function UtenteProvider({ children }: { children: ReactNode }) {
  const { utenti, loading, error, refetch } = useUtenti();

  const idSalvato = useSyncExternalStore(
    sottoscriviIdSalvato,
    leggiIdSalvato,
    leggiIdSalvatoSuServer
  );

  /**
   * L'utente attivo è derivato, non sincronizzato: si ricalcola da solo quando
   * cambia la lista o l'id salvato, senza effect. Se l'id salvato non esiste più
   * nella lista (utente eliminato da un altro dispositivo) si ripiega sul primo.
   */
  const activeUtente = useMemo<UtenteProfile | null>(() => {
    if (loading || utenti.length === 0) return null;
    return utenti.find((u) => u.id === idSalvato) ?? utenti[0] ?? null;
  }, [loading, utenti, idSalvato]);

  const setActiveUtente = useCallback((utente: UtenteProfile) => {
    scriviIdSalvato(utente.id);
  }, []);

  return (
    <UtenteContext.Provider
      value={{
        utenti,
        activeUtente,
        setActiveUtente,
        loading,
        error,
        refetch,
      }}
    >
      {children}
    </UtenteContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook per accedere al context dell'utente attivo.
 * Lancia un errore se usato fuori dall'UtenteProvider.
 */
export function useUtente(): UtenteContextValue {
  const context = useContext(UtenteContext);
  if (context === undefined) {
    throw new Error(
      "useUtente deve essere usato all'interno di <UtenteProvider>"
    );
  }
  return context;
}
