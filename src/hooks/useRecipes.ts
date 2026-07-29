/**
 * @file src/hooks/useRecipes.ts
 * @description Hook per scaricare la lista di tutte le ricette.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { getRecipes } from "@/lib/firebase/firestore";
import type { Recipe } from "@/types";

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Esegue la richiesta e ne normalizza l'esito senza toccare lo stato React,
   * così può essere usata sia dall'effect di mount che da refetch().
   */
  const richiediRicette = useCallback(async (): Promise<
    { ok: true; dati: Recipe[] } | { ok: false; errore: string }
  > => {
    try {
      return { ok: true, dati: await getRecipes() };
    } catch (err) {
      console.error("[useRecipes] Errore fetch ricette:", err);
      return { ok: false, errore: "Impossibile caricare il ricettario." };
    }
  }, []);

  // Caricamento iniziale. Ogni setState avviene nella continuazione asincrona:
  // aggiornare lo stato in modo sincrono qui incatenerebbe un secondo render
  // allo stesso commit (react-hooks/set-state-in-effect). Lo stato parte già
  // con loading=true, quindi non serve rialzarlo.
  useEffect(() => {
    let annullato = false;

    richiediRicette().then((esito) => {
      if (annullato) return;
      if (esito.ok) {
        setRecipes(esito.dati);
        setError(null);
      } else {
        setError(esito.errore);
      }
      setLoading(false);
    });

    return () => {
      annullato = true;
    };
  }, [richiediRicette]);

  /**
   * Ricarica su richiesta esplicita (event handler): qui lo spinner va rialzato,
   * e una setState sincrona è legittima perché non siamo dentro un effect.
   */
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const esito = await richiediRicette();
    if (esito.ok) setRecipes(esito.dati);
    else setError(esito.errore);
    setLoading(false);
  }, [richiediRicette]);

  return {
    recipes,
    loading,
    error,
    refetch,
  };
}
