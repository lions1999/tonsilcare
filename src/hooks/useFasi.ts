/**
 * @file src/hooks/useFasi.ts
 * @description Carica l'elenco completo delle fasi post-operatorie da /fasi.
 *
 * Sostituisce `usePhaseConfig(faseId)`, che leggeva un solo documento perché la
 * fase era un id salvato sul paziente. Ora la fase si deriva dal calendario
 * (lib/utils/fase.ts) e per confrontare il giorno post-operatorio con i
 * `giorniRange` servono tutti gli intervalli, non uno.
 *
 * SEEDING: `node scripts/seed.mjs` popola /fasi da seed-data/fasi.json.
 */

"use client";

import { useEffect, useState } from "react";
import { getAllPhaseConfigs } from "@/lib/firebase/firestore";
import type { PostOpPhaseConfig } from "@/types";

// ---------------------------------------------------------------------------
// Fallback locale
// ---------------------------------------------------------------------------

/**
 * Usato solo se /fasi è vuota o irraggiungibile: l'app continua a funzionare
 * invece di lasciare il genitore senza indicazioni.
 *
 * ATTENZIONE: duplica seed-data/fasi.json e nessun controllo verifica che siano
 * allineati. Vedi la sezione "Le fasi post-operatorie sono definite in TRE
 * posti" in CLAUDE.md prima di modificarlo.
 */
const FASI_FALLBACK: PostOpPhaseConfig[] = [
  {
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
  {
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
  {
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
  {
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
  {
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
];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseFasiResult {
  fasi: PostOpPhaseConfig[];
  loading: boolean;
}

export function useFasi(): UseFasiResult {
  const [fasi, setFasi] = useState<PostOpPhaseConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Ogni setState avviene nella continuazione asincrona: aggiornare lo stato in
  // modo sincrono qui incatenerebbe un secondo render allo stesso commit
  // (react-hooks/set-state-in-effect).
  useEffect(() => {
    let annullato = false;

    getAllPhaseConfigs()
      .then((daFirestore) => {
        if (annullato) return;
        if (daFirestore.length === 0) {
          // Il fallback tiene in piedi l'app, ma va detto: una /fasi vuota è
          // indistinguibile dal funzionamento normale, ed è già costata giorni
          // di indagine su questo progetto.
          console.warn(
            "[useFasi] /fasi è vuota: uso le fasi di fallback locali. " +
              "Popolala con `node scripts/seed.mjs`."
          );
          setFasi(FASI_FALLBACK);
        } else {
          setFasi(daFirestore);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (annullato) return;
        console.error("[useFasi] Errore nella lettura di /fasi:", err);
        setFasi(FASI_FALLBACK);
        setLoading(false);
      });

    return () => {
      annullato = true;
    };
  }, []);

  return { fasi, loading };
}
