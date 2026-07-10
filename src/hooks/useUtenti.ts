/**
 * @file src/hooks/useUtenti.ts
 * @description Hook React per caricare e gestire la lista degli utenti operati
 * dell'account corrente.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUtenti } from "@/lib/firebase/firestore";
import type { UtenteProfile } from "@/types";

export function useUtenti() {
  const { user } = useAuth();
  const [utenti, setUtenti] = useState<UtenteProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUtenti = useCallback(async () => {
    if (!user) {
      setUtenti([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getUtenti(user.uid);
      setUtenti(data);
    } catch (err) {
      console.error("Errore durante il fetch degli utenti:", err);
      setError("Impossibile caricare la lista degli utenti. Riprova più tardi.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUtenti();
  }, [fetchUtenti]);

  return {
    utenti,
    loading,
    error,
    refetch: fetchUtenti,
  };
}
