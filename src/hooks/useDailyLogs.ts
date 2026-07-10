/**
 * @file src/hooks/useDailyLogs.ts
 * @description Hook per recuperare l'ultimo log giornaliero del paziente attivo.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { getLatestLog } from "@/lib/firebase/firestore";
import type { DailyLog } from "@/lib/validations/diary";
import { useUtente } from "@/context/UtenteContext";

export function useDailyLogs() {
  const { activeUtente } = useUtente();
  const [latestLog, setLatestLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestLog = useCallback(async () => {
    if (!activeUtente) {
      setLatestLog(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const log = await getLatestLog(activeUtente.id);
      setLatestLog(log);
    } catch (err) {
      console.error("[useDailyLogs] Errore fetch log:", err);
      setError("Impossibile caricare i parametri vitali.");
    } finally {
      setLoading(false);
    }
  }, [activeUtente]);

  useEffect(() => {
    fetchLatestLog();
  }, [fetchLatestLog]);

  return {
    latestLog,
    loading,
    error,
    refetch: fetchLatestLog,
  };
}
