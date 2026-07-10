/**
 * @file src/context/PatientContext.tsx
 * @description Context globale per il paziente attivo selezionato.
 *
 * Gestisce:
 * - Lista dei pazienti (via usePatients)
 * - Paziente attivo (persistito in localStorage)
 * - setActivePatient: cambia il paziente selezionato
 *
 * ANTI-HYDRATION MISMATCH:
 * L'accesso a localStorage avviene SOLO in useEffect (lato client, dopo il mount).
 * Il valore iniziale di activePatient è sempre null per il primo render SSR.
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
import { usePatients } from "@/hooks/usePatients";
import type { PatientProfile } from "@/types";

// ---------------------------------------------------------------------------
// Costante
// ---------------------------------------------------------------------------

const STORAGE_KEY = "tonsilcare_active_patient_id";

// ---------------------------------------------------------------------------
// Tipo del context
// ---------------------------------------------------------------------------

interface PatientContextValue {
  /** Lista completa dei pazienti del genitore */
  patients: PatientProfile[];
  /** Paziente attualmente selezionato (null durante caricamento o se non ce ne sono) */
  activePatient: PatientProfile | null;
  /** Seleziona un paziente e lo persiste in localStorage */
  setActivePatient: (patient: PatientProfile) => void;
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

const PatientContext = createContext<PatientContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function PatientProvider({ children }: { children: ReactNode }) {
  const { patients, loading, error, refetch } = usePatients();
  const [activePatient, setActivePatientState] = useState<PatientProfile | null>(null);
  // Traccia se il localStorage è stato letto (per evitare hydration mismatch)
  const [hydrated, setHydrated] = useState(false);

  /**
   * Dopo il mount, legge il paziente attivo dal localStorage.
   * Se non è salvato o non esiste più nella lista, usa il primo della lista.
   */
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    // Aspetta sia il mount lato client che il caricamento dei pazienti
    if (!hydrated || loading) return;

    if (patients.length === 0) {
      setActivePatientState(null);
      return;
    }

    const savedId = localStorage.getItem(STORAGE_KEY);
    const restored = savedId
      ? patients.find((p) => p.id === savedId) ?? patients[0]
      : patients[0];

    setActivePatientState(restored ?? null);
  }, [hydrated, loading, patients]);

  const setActivePatient = useCallback((patient: PatientProfile) => {
    setActivePatientState(patient);
    localStorage.setItem(STORAGE_KEY, patient.id);
  }, []);

  return (
    <PatientContext.Provider
      value={{
        patients,
        activePatient,
        setActivePatient,
        loading,
        error,
        refetch,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook per accedere al context del paziente attivo.
 * Lancia un errore se usato fuori dal PatientProvider.
 */
export function usePatient(): PatientContextValue {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error(
      "usePatient deve essere usato all'interno di <PatientProvider>"
    );
  }
  return context;
}
