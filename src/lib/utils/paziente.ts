/**
 * @file src/lib/utils/paziente.ts
 * @description Valori derivati dal profilo paziente (età, BMI, giorno post-operatorio).
 * Calcolati a runtime e mai salvati su Firestore, per evitare che vadano fuori
 * sincrono con i dati grezzi (dataNascita, peso, altezza, dataOperazione) da cui derivano.
 */

/** Età in anni compiuti, calcolata da una data di nascita ISO 8601. */
export function calcolaEta(dataNascita: string): number {
  const oggi = new Date();
  const nascita = new Date(dataNascita);

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

/** Giorno post-operatorio corrente (0 = giorno dell'intervento), da una data ISO 8601. */
export function calcolaGiornoPostOp(dataOperazione: string): number {
  const oggi = new Date();
  const dataOp = new Date(dataOperazione);
  const diffMs = oggi.getTime() - dataOp.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}
