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

  const fetchRecipes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRecipes();
      setRecipes(data);
    } catch (err) {
      console.error("[useRecipes] Errore fetch ricette:", err);
      setError("Impossibile caricare il ricettario.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  return {
    recipes,
    loading,
    error,
    refetch: fetchRecipes,
  };
}
