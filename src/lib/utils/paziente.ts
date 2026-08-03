/**
 * @file src/lib/utils/paziente.ts
 * @description Valori derivati dal profilo paziente (età, BMI).
 * Calcolati a runtime e mai salvati su Firestore, per evitare che vadano fuori
 * sincrono con i dati grezzi (dataNascita, peso, altezza) da cui derivano.
 *
 * `dataNascita` e `dataOperazione` sono stringhe solo-data: vanno lette con
 * `parseDataLocale`, mai con `new Date()`. Il perché è in src/lib/utils/date.ts.
 */

import { parseDataLocale } from "./date";

/** Età in anni compiuti, calcolata da una data di nascita ISO 8601. */
export function calcolaEta(dataNascita: string): number {
  const oggi = new Date();
  const nascita = parseDataLocale(dataNascita);

  let eta = oggi.getFullYear() - nascita.getFullYear();
  const meseNonRaggiunto =
    oggi.getMonth() < nascita.getMonth() ||
    (oggi.getMonth() === nascita.getMonth() && oggi.getDate() < nascita.getDate());

  if (meseNonRaggiunto) eta--;

  return Math.max(0, eta);
}

/** Indice di massa corporea, da peso (kg) e altezza (cm). */
export function calcolaBMI(pesoKg: number, altezzaCm: number): number {
  const altezzaM = altezzaCm / 100;
  return pesoKg / (altezzaM * altezzaM);
}

/*
 * `calcolaGiornoPostOp` viveva qui e troncava i valori negativi a zero. È stata
 * sostituita da `calcolaGiorniDaOperazione` in lib/utils/fase.ts, che restituisce
 * il valore con segno: un intervento previsto e non ancora eseguito dà un numero
 * negativo, e da quello nasce lo stato pre-operatorio. Due funzioni quasi uguali
 * sullo stesso dato sono la premessa perché divergano, quindi ne resta una sola.
 */
