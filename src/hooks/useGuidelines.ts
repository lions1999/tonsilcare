/**
 * @file src/hooks/useGuidelines.ts
 * @description Hook per scaricare la lista di tutte le linee guida (FAQ) da Firestore.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { getGuidelines } from "@/lib/firebase/firestore";
import type { Guideline } from "@/types";

export function useGuidelines() {
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGuidelines = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGuidelines();
      setGuidelines(data);
    } catch (err) {
      console.error("[useGuidelines] Errore fetch linee guida:", err);
      setError("Impossibile caricare le informazioni. Controlla la connessione.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuidelines();
  }, [fetchGuidelines]);

  return {
    guidelines,
    loading,
    error,
    refetch: fetchGuidelines,
  };
}
