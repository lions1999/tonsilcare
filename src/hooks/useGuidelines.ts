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

  /**
   * Esegue la richiesta e ne normalizza l'esito senza toccare lo stato React,
   * così può essere usata sia dall'effect di mount che da refetch().
   */
  const richiediLineeGuida = useCallback(async (): Promise<
    { ok: true; dati: Guideline[] } | { ok: false; errore: string }
  > => {
    try {
      return { ok: true, dati: await getGuidelines() };
    } catch (err) {
      console.error("[useGuidelines] Errore fetch linee guida:", err);
      return {
        ok: false,
        errore: "Impossibile caricare le informazioni. Controlla la connessione.",
      };
    }
  }, []);

  // Caricamento iniziale. Ogni setState avviene nella continuazione asincrona:
  // aggiornare lo stato in modo sincrono qui incatenerebbe un secondo render
  // allo stesso commit (react-hooks/set-state-in-effect). Lo stato parte già
  // con loading=true, quindi non serve rialzarlo.
  useEffect(() => {
    let annullato = false;

    richiediLineeGuida().then((esito) => {
      if (annullato) return;
      if (esito.ok) {
        setGuidelines(esito.dati);
        setError(null);
      } else {
        setError(esito.errore);
      }
      setLoading(false);
    });

    return () => {
      annullato = true;
    };
  }, [richiediLineeGuida]);

  /**
   * Ricarica su richiesta esplicita (event handler): qui lo spinner va rialzato,
   * e una setState sincrona è legittima perché non siamo dentro un effect.
   */
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const esito = await richiediLineeGuida();
    if (esito.ok) setGuidelines(esito.dati);
    else setError(esito.errore);
    setLoading(false);
  }, [richiediLineeGuida]);

  return {
    guidelines,
    loading,
    error,
    refetch,
  };
}
