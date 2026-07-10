/**
 * @file src/hooks/usePatients.ts
 * @description Hook per recuperare la lista dei pazienti del genitore loggato.
 *
 * Gestisce:
 * - Fetch da Firestore filtrato per parenteUid (dall'AuthContext)
 * - Stato loading / error
 * - Refetch manuale
 *
 * NOTA: Non gestisce il "paziente attivo" — quello è compito del PatientContext,
 * che usa questo hook internamente.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPatients } from "@/lib/firebase/firestore";
import type { PatientProfile } from "@/types";

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export interface UsePatientsResult {
  /** Lista completa dei pazienti del genitore */
  patients: PatientProfile[];
  /** True durante il caricamento iniziale (non durante i refetch) */
  loading: boolean;
  /** Messaggio di errore se la fetch ha fallito */
  error: string | null;
  /** Forza un nuovo fetch da Firestore */
  refetch: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePatients(): UsePatientsResult {
  const { user } = useAuth();

  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    // Se non c'è un utente autenticato, reset dello stato
    if (!user) {
      setPatients([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const list = await getPatients(user.uid);
      setPatients(list);
    } catch (err) {
      console.error("[usePatients] Errore fetch pazienti:", err);
      setError(
        "Impossibile caricare i pazienti. Controlla la connessione e riprova."
      );
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    fetchPatients();
  }, [fetchPatients]);

  return {
    patients,
    loading,
    error,
    refetch: fetchPatients,
  };
}
