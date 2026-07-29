/**
 * @file src/hooks/useRecipe.ts
 * @description Hook per scaricare una singola ricetta dato il suo ID.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { getRecipeById } from "@/lib/firebase/firestore";
import type { Recipe } from "@/types";

export function useRecipe(recipeId: string) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Se l'ID cambia mentre il componente resta montato (navigazione tra due
  // ricette), lo spinner va rialzato subito. React prevede di farlo durante il
  // render, non dentro un effect: qui la setState non incatena un render extra
  // perché avviene prima che questo venga commesso.
  const [idCaricato, setIdCaricato] = useState(recipeId);
  if (idCaricato !== recipeId) {
    setIdCaricato(recipeId);
    setLoading(true);
    setError(null);
  }

  /**
   * Esegue la richiesta e ne normalizza l'esito senza toccare lo stato React,
   * così può essere usata sia dall'effect che da refetch().
   */
  const richiediRicetta = useCallback(async (): Promise<
    { ok: true; dati: Recipe | null } | { ok: false; errore: string }
  > => {
    if (!recipeId) return { ok: true, dati: null };

    try {
      const data = await getRecipeById(recipeId);
      if (!data) return { ok: false, errore: "Ricetta non trovata." };
      return { ok: true, dati: data };
    } catch (err) {
      console.error("[useRecipe] Errore fetch ricetta:", err);
      return {
        ok: false,
        errore: "Impossibile caricare i dettagli della ricetta.",
      };
    }
  }, [recipeId]);

  // Ogni setState avviene nella continuazione asincrona: aggiornare lo stato in
  // modo sincrono qui incatenerebbe un secondo render allo stesso commit
  // (react-hooks/set-state-in-effect).
  useEffect(() => {
    let annullato = false;

    richiediRicetta().then((esito) => {
      if (annullato) return;
      if (esito.ok) {
        setRecipe(esito.dati);
        setError(null);
      } else {
        setError(esito.errore);
      }
      setLoading(false);
    });

    return () => {
      annullato = true;
    };
  }, [richiediRicetta]);

  /**
   * Ricarica su richiesta esplicita (event handler): qui lo spinner va rialzato,
   * e una setState sincrona è legittima perché non siamo dentro un effect.
   */
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const esito = await richiediRicetta();
    if (esito.ok) setRecipe(esito.dati);
    else setError(esito.errore);
    setLoading(false);
  }, [richiediRicetta]);

  return {
    recipe,
    loading,
    error,
    refetch,
  };
}
