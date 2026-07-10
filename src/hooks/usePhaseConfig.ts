/**
 * @file src/hooks/usePhaseConfig.ts
 * @description Hook per caricare la configurazione di una fase post-operatoria
 * da Firestore (/fasi/{faseId}).
 *
 * Se il documento non esiste ancora su Firestore, restituisce una configurazione
 * di fallback minimale basata sul faseId, evitando crash dell'app.
 *
 * SEEDING FIRESTORE:
 * Per popolare le fasi, crea documenti in /fasi con ID = PostOpPhase
 * (es. "fase_1", "fase_2", ecc.) con i campi:
 * {
 *   titolo, descrizione, giorniRange, consistenzaSuggerita,
 *   cibiConsigliati, cibiVietati, consigli
 * }
 */

"use client";

import { useState, useEffect } from "react";
import { getPhaseConfig } from "@/lib/firebase/firestore";
import type { PostOpPhase, PostOpPhaseConfig } from "@/types";

// ---------------------------------------------------------------------------
// Configurazioni di fallback (usate se Firestore non ha ancora i dati)
// ---------------------------------------------------------------------------

const FALLBACK_PHASES: Record<PostOpPhase, PostOpPhaseConfig> = {
  fase_1: {
    id: "fase_1",
    titolo: "Fase 1 — Liquidi freddi",
    descrizione:
      "Giornate subito dopo l'operazione. Solo liquidi freddi o a temperatura ambiente.",
    giorniRange: [0, 1],
    consistenzaSuggerita: "Solo liquidi freddi",
    cibiConsigliati: ["Acqua fredda", "Gelato senza pezzi", "Ghiaccioli", "Brodo freddo"],
    cibiVietati: ["Cibi solidi", "Cibi caldi", "Agrumi", "Cibi piccanti"],
    consigli: [
      "Somministrare antidolorifico regolarmente come prescritto",
      "Assicurarsi che il bambino beva frequentemente",
      "Tenere la testa sollevata durante il riposo",
    ],
  },
  fase_2: {
    id: "fase_2",
    titolo: "Fase 2 — Alimenti semiliquidi",
    descrizione:
      "Transizione verso alimenti più consistenti. Continuare a privilegiare cibi freddi e morbidi.",
    giorniRange: [2, 4],
    consistenzaSuggerita: "Semiliquidi e morbidi, serviti freschi",
    cibiConsigliati: ["Yogurt freddo", "Gelato", "Purea di frutta", "Budino", "Brodo freddo"],
    cibiVietati: ["Cibi caldi", "Cibo croccante", "Agrumi", "Snack salati"],
    consigli: [
      "Somministrare antidolorifico 30 min prima dei pasti",
      "Offrire piccole quantità frequentemente",
      "Monitorare la temperatura corporea ogni 6 ore",
    ],
  },
  fase_3: {
    id: "fase_3",
    titolo: "Fase 3 — Alimenti morbidi",
    descrizione:
      "Il bambino può iniziare ad assumere alimenti morbidi che non richiedono masticazione intensa.",
    giorniRange: [5, 7],
    consistenzaSuggerita: "Morbidi, tiepidi (non caldi)",
    cibiConsigliati: ["Pasta scotta", "Riso", "Uova strapazzate", "Pesce bollito", "Purè"],
    cibiVietati: ["Cibi croccanti", "Pane tostato", "Agrumi", "Carni dure"],
    consigli: [
      "Introdurre gradualmente nuovi alimenti",
      "Evitare di forzare se il bambino non ha appetito",
      "Continuare il monitoraggio della temperatura",
    ],
  },
  fase_4: {
    id: "fase_4",
    titolo: "Fase 4 — Transizione",
    descrizione:
      "Il recupero procede bene. Graduale ritorno ad alimenti normali, ancora con attenzione.",
    giorniRange: [8, 10],
    consistenzaSuggerita: "Normali ma morbidi, evitare cibi duri",
    cibiConsigliati: ["Pasta", "Riso", "Carne morbida", "Verdure cotte", "Latticini"],
    cibiVietati: ["Patatine", "Cracker", "Cibi molto speziati", "Bevande gassate"],
    consigli: [
      "Ridurre gradualmente l'antidolorifico",
      "Riprendere le attività leggere",
      "Contattare il medico se compare sanguinamento",
    ],
  },
  fase_5: {
    id: "fase_5",
    titolo: "Fase 5 — Ritorno alla normalità",
    descrizione:
      "Recupero quasi completo. Riprendere progressivamente l'alimentazione normale.",
    giorniRange: [11, 14],
    consistenzaSuggerita: "Normale, con buon senso",
    cibiConsigliati: ["Tutti gli alimenti tollerati", "Frutta fresca", "Verdure crude"],
    cibiVietati: ["Cibi estremi (molto piccanti o molto duri)"],
    consigli: [
      "Visita di controllo dal pediatra",
      "Riprendere le attività normali",
      "Segnalare qualsiasi disagio residuo",
    ],
  },
};

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export interface UsePhaseConfigResult {
  phaseConfig: PostOpPhaseConfig | null;
  loading: boolean;
  error: string | null;
  /** True se i dati vengono da Firestore, false se dal fallback locale */
  isFromFirestore: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePhaseConfig(faseId: PostOpPhase | null): UsePhaseConfigResult {
  const [phaseConfig, setPhaseConfig] = useState<PostOpPhaseConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromFirestore, setIsFromFirestore] = useState<boolean>(false);

  useEffect(() => {
    if (!faseId) {
      setPhaseConfig(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    async function load() {
      if (!faseId) return;
      try {
        const config = await getPhaseConfig(faseId);
        if (config) {
          setPhaseConfig(config);
          setIsFromFirestore(true);
        } else {
          // Firestore non ha ancora questo documento → usa il fallback locale
          setPhaseConfig(FALLBACK_PHASES[faseId]);
          setIsFromFirestore(false);
        }
      } catch (err) {
        console.error("[usePhaseConfig] Errore:", err);
        setError("Impossibile caricare la configurazione della fase.");
        // Anche in caso di errore, mostra il fallback per non bloccare l'UI
        setPhaseConfig(FALLBACK_PHASES[faseId]);
        setIsFromFirestore(false);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [faseId]);

  return { phaseConfig, loading, error, isFromFirestore };
}
