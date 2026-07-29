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

  // Al cambio di account (login/logout) lo spinner va rialzato subito. React
  // prevede di farlo durante il render, non dentro un effect: qui la setState
  // non incatena un render extra perché avviene prima che questo sia commesso.
  const [utenteCaricato, setUtenteCaricato] = useState(user);
  if (utenteCaricato !== user) {
    setUtenteCaricato(user);
    setLoading(true);
    setError(null);
  }

  /**
   * Esegue la richiesta e ne normalizza l'esito senza toccare lo stato React,
   * così può essere usata sia dall'effect che da refetch().
   */
  const richiediUtenti = useCallback(async (): Promise<
    { ok: true; dati: UtenteProfile[] } | { ok: false; errore: string }
  > => {
    if (!user) return { ok: true, dati: [] };

    try {
      return { ok: true, dati: await getUtenti(user.uid) };
    } catch (err) {
      console.error("Errore durante il fetch degli utenti:", err);
      return {
        ok: false,
        errore: "Impossibile caricare la lista degli utenti. Riprova più tardi.",
      };
    }
  }, [user]);

  // Ogni setState avviene nella continuazione asincrona: aggiornare lo stato in
  // modo sincrono qui incatenerebbe un secondo render allo stesso commit
  // (react-hooks/set-state-in-effect).
  useEffect(() => {
    let annullato = false;

    richiediUtenti().then((esito) => {
      if (annullato) return;
      if (esito.ok) {
        setUtenti(esito.dati);
        setError(null);
      } else {
        setError(esito.errore);
      }
      setLoading(false);
    });

    return () => {
      annullato = true;
    };
  }, [richiediUtenti]);

  /**
   * Ricarica su richiesta esplicita (event handler): qui lo spinner va rialzato,
   * e una setState sincrona è legittima perché non siamo dentro un effect.
   */
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const esito = await richiediUtenti();
    if (esito.ok) setUtenti(esito.dati);
    else setError(esito.errore);
    setLoading(false);
  }, [richiediUtenti]);

  return {
    utenti,
    loading,
    error,
    refetch,
  };
}
