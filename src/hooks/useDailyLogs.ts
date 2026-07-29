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

  // Al cambio di paziente attivo lo spinner va rialzato subito, altrimenti la
  // dashboard mostrerebbe per un istante i parametri del paziente precedente.
  // React prevede di farlo durante il render, non dentro un effect: qui la
  // setState non incatena un render extra perché avviene prima del commit.
  const [utenteCaricato, setUtenteCaricato] = useState(activeUtente);
  if (utenteCaricato !== activeUtente) {
    setUtenteCaricato(activeUtente);
    setLoading(true);
    setError(null);
  }

  /**
   * Esegue la richiesta e ne normalizza l'esito senza toccare lo stato React,
   * così può essere usata sia dall'effect che da refetch().
   */
  const richiediUltimoLog = useCallback(async (): Promise<
    { ok: true; dati: DailyLog | null } | { ok: false; errore: string }
  > => {
    if (!activeUtente) return { ok: true, dati: null };

    try {
      return { ok: true, dati: await getLatestLog(activeUtente.id) };
    } catch (err) {
      console.error("[useDailyLogs] Errore fetch log:", err);
      return { ok: false, errore: "Impossibile caricare i parametri vitali." };
    }
  }, [activeUtente]);

  // Ogni setState avviene nella continuazione asincrona: aggiornare lo stato in
  // modo sincrono qui incatenerebbe un secondo render allo stesso commit
  // (react-hooks/set-state-in-effect).
  useEffect(() => {
    let annullato = false;

    richiediUltimoLog().then((esito) => {
      if (annullato) return;
      if (esito.ok) {
        setLatestLog(esito.dati);
        setError(null);
      } else {
        setError(esito.errore);
      }
      setLoading(false);
    });

    return () => {
      annullato = true;
    };
  }, [richiediUltimoLog]);

  /**
   * Ricarica su richiesta esplicita (event handler): qui lo spinner va rialzato,
   * e una setState sincrona è legittima perché non siamo dentro un effect.
   */
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const esito = await richiediUltimoLog();
    if (esito.ok) setLatestLog(esito.dati);
    else setError(esito.errore);
    setLoading(false);
  }, [richiediUltimoLog]);

  return {
    latestLog,
    loading,
    error,
    refetch,
  };
}
