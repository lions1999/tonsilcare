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

  const fetchRecipe = useCallback(async () => {
    if (!recipeId) {
      setRecipe(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getRecipeById(recipeId);
      if (!data) {
        setError("Ricetta non trovata.");
      } else {
        setRecipe(data);
      }
    } catch (err) {
      console.error("[useRecipe] Errore fetch ricetta:", err);
      setError("Impossibile caricare i dettagli della ricetta.");
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => {
    fetchRecipe();
  }, [fetchRecipe]);

  return {
    recipe,
    loading,
    error,
    refetch: fetchRecipe,
  };
}
