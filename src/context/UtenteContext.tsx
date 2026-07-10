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
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useUtenti } from "@/hooks/useUtenti";
import type { UtenteProfile } from "@/types";

// ---------------------------------------------------------------------------
// Costante
// ---------------------------------------------------------------------------

const STORAGE_KEY = "tonsilcare_active_utente_id";

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
  const [activeUtenteState, setActiveUtenteState] = useState<UtenteProfile | null>(null);
  // Traccia se il localStorage è stato letto (per evitare hydration mismatch)
  const [hydrated, setHydrated] = useState(false);

  /**
   * Dopo il mount, legge l'utente attivo dal localStorage.
   * Se non è salvato o non esiste più nella lista, usa il primo della lista.
   */
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    // Aspetta sia il mount lato client che il caricamento degli utenti
    if (!hydrated || loading) return;

    if (utenti.length === 0) {
      setActiveUtenteState(null);
      return;
    }

    const savedId = localStorage.getItem(STORAGE_KEY);
    const restored = savedId
      ? utenti.find((u) => u.id === savedId) ?? utenti[0]
      : utenti[0];

    setActiveUtenteState(restored ?? null);
  }, [hydrated, loading, utenti]);

  const setActiveUtente = useCallback((utente: UtenteProfile) => {
    setActiveUtenteState(utente);
    localStorage.setItem(STORAGE_KEY, utente.id);
  }, []);

  return (
    <UtenteContext.Provider
      value={{
        utenti,
        activeUtente: activeUtenteState,
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
