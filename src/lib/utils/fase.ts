/**
 * @file src/lib/utils/fase.ts
 * @description Derivazione della fase post-operatoria da data dell'intervento,
 * giorno corrente e intervalli configurati.
 *
 * PERCHE' DERIVATA E NON SALVATA
 * La fase era un campo del documento, scelto dal genitore alla registrazione e
 * mai più aggiornato. Dopo pochi giorni diceva il falso: un paziente al 7 giorno
 * post-op mostrava "FASE 1 - liquidi freddi". Non è cosmetico, perché la fase
 * decide il piano alimentare che il genitore legge.
 *
 * GLI INTERVALLI SONO DATI, NON LOGICA
 * `giorniRange` arriva sempre dall'esterno, tipicamente dai documenti /fasi.
 * Qui dentro non compare nessun numero di giorni: se il cliente conferma 4 fasi
 * invece di 5, o sposta una soglia, si aggiorna seed-data/fasi.json e questo
 * file non si tocca.
 */

import type { PostOpPhase, PostOpPhaseConfig } from "@/types";
import { parseDataLocale, differenzaInGiorni, oggiLocale } from "./date";

/**
 * Il minimo che serve per derivare la fase. `UtenteProfile` lo soddisfa, ma
 * accettare la forma minima permette di calcolare l'anteprima nel form, dove
 * il paziente non esiste ancora.
 */
export interface DatiPerFase {
  dataOperazione: string;
  faseOverride?: PostOpPhase;
  faseOverrideMotivo?: string;
}

export type StatoFase =
  /** L'intervento non è ancora avvenuto. `giorniAllIntervento` è positivo. */
  | { tipo: "pre_operatorio"; giorno: number; giorniAllIntervento: number }
  /** Fase determinata dal calendario. */
  | { tipo: "in_fase"; giorno: number; fase: PostOpPhaseConfig }
  /** Fase imposta dal medico: vince sul calcolo. */
  | { tipo: "forzata"; giorno: number; fase: PostOpPhaseConfig; motivo?: string }
  /** Oltre l'ultimo giorno coperto dagli intervalli configurati. */
  | { tipo: "concluso"; giorno: number; ultimoGiornoPrevisto: number }
  /** Data non interpretabile o nessuna fase configurata. */
  | { tipo: "indeterminato"; giorno: number };

/**
 * Giorni trascorsi dall'intervento. 0 = giorno dell'operazione, **negativo se
 * l'intervento è previsto e non ancora eseguito**.
 */
export function calcolaGiorniDaOperazione(
  dataOperazione: string,
  oggi: Date = oggiLocale()
): number {
  return differenzaInGiorni(parseDataLocale(dataOperazione), oggi);
}

/**
 * Stato della fase per un paziente, in un dato giorno.
 *
 * Ordine di valutazione: l'override del medico vince su tutto, perché è una
 * decisione clinica esplicita presa guardando il paziente, non un calcolo.
 */
export function calcolaStatoFase(
  dati: DatiPerFase,
  fasi: PostOpPhaseConfig[],
  oggi: Date = oggiLocale()
): StatoFase {
  const giorno = calcolaGiorniDaOperazione(dati.dataOperazione, oggi);

  // Data malformata: meglio dichiararsi indeterminati che restituire un numero
  // che sembra valido. NaN si propagherebbe in silenzio in ogni confronto.
  if (!Number.isFinite(giorno) || fasi.length === 0) {
    return { tipo: "indeterminato", giorno };
  }

  if (dati.faseOverride) {
    const forzata = fasi.find((f) => f.id === dati.faseOverride);
    // Se l'id forzato non esiste più tra le fasi configurate (il cliente ne ha
    // tolta una), si ricade sul calcolo automatico invece di non mostrare
    // nulla. L'override resta scritto sul documento e torna valido se la fase
    // viene ripristinata.
    if (forzata) {
      return { tipo: "forzata", giorno, fase: forzata, motivo: dati.faseOverrideMotivo };
    }
  }

  if (giorno < 0) {
    return { tipo: "pre_operatorio", giorno, giorniAllIntervento: -giorno };
  }

  const ultimoGiornoPrevisto = Math.max(...fasi.map((f) => f.giorniRange[1]));
  if (giorno > ultimoGiornoPrevisto) {
    return { tipo: "concluso", giorno, ultimoGiornoPrevisto };
  }

  // Tra le fasi già iniziate vince quella cominciata più tardi. Scegliere così
  // invece di cercare l'intervallo che contiene il giorno rende la funzione
  // totale anche se gli intervalli configurati hanno buchi o si sovrappongono:
  // un refuso nei dati non può mai produrre "nessuna fase".
  const iniziate = fasi.filter((f) => f.giorniRange[0] <= giorno);
  if (iniziate.length === 0) {
    return { tipo: "indeterminato", giorno };
  }
  const fase = iniziate.reduce((a, b) => (b.giorniRange[0] > a.giorniRange[0] ? b : a));

  return { tipo: "in_fase", giorno, fase };
}

/**
 * La configurazione della fase, se lo stato ne ha una. Pre-operatorio, percorso
 * concluso e stato indeterminato non hanno indicazioni alimentari da mostrare:
 * restituiscono null, e chi chiama decide cosa mettere al loro posto.
 */
export function faseDiStato(stato: StatoFase): PostOpPhaseConfig | null {
  return stato.tipo === "in_fase" || stato.tipo === "forzata" ? stato.fase : null;
}

/**
 * Etichetta breve della fase, per le liste dove non c'è spazio per la card
 * intera. Restituisce null quando non c'è una fase da nominare.
 */
export function etichettaBreveFase(stato: StatoFase): string | null {
  switch (stato.tipo) {
    case "in_fase":
    case "forzata":
      return stato.fase.titolo;
    case "pre_operatorio":
      return "Pre-operatorio";
    case "concluso":
      return "Percorso concluso";
    case "indeterminato":
      return null;
  }
}
