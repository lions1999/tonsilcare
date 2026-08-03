/**
 * @file src/lib/utils/date.ts
 * @description Aritmetica su date "solo giorno" (YYYY-MM-DD).
 *
 * PERCHE' ESISTE QUESTO FILE
 * `new Date("2026-07-27")` non produce la mezzanotte locale: lo standard impone
 * di interpretare le stringhe solo-data come UTC, quindi in Italia quel valore
 * e' le 02:00 del 27 (o l'01:00 in inverno). Confrontarlo con `new Date()`, che
 * e' l'istante locale, sposta i conti di qualche ora — abbastanza da cambiare il
 * giorno di calendario.
 *
 * Effetto osservato: con intervento il 27/07, alle 00:30 del 03/08 la differenza
 * in millisecondi vale 6 giorni e 22 ore e mezza, quindi `Math.floor` restituiva
 * 6 mentre il calendario diceva 7. Il genitore leggeva il piano alimentare del
 * giorno prima. Nessun errore, nessun avviso.
 *
 * I campi `dataNascita` e `dataOperazione` sono solo-data e vanno letti da qui.
 * I campi `createdAt` e `timestamp` sono istanti veri (ISO con orario e fuso):
 * per quelli `new Date()` e' corretto e queste funzioni non servono.
 */

/** Riconosce le stringhe solo-data, le uniche che il parser nativo tratta come UTC. */
const SOLO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Interpreta una data ISO come mezzanotte **locale**.
 *
 * Le stringhe con orario passano dal parser nativo (che gestisce gia' il fuso
 * correttamente) e vengono poi troncate al giorno locale, cosi' il valore di
 * ritorno ha sempre la stessa forma: mezzanotte locale del giorno di calendario
 * che l'utente vede scritto.
 */
export function parseDataLocale(iso: string): Date {
  const parti = SOLO_DATA.exec(iso.trim());
  if (parti) {
    return new Date(Number(parti[1]), Number(parti[2]) - 1, Number(parti[3]));
  }
  return inizioGiornoLocale(new Date(iso));
}

/** Mezzanotte locale del giorno a cui appartiene l'istante dato. */
export function inizioGiornoLocale(istante: Date): Date {
  return new Date(istante.getFullYear(), istante.getMonth(), istante.getDate());
}

/** Mezzanotte locale di oggi. */
export function oggiLocale(): Date {
  return inizioGiornoLocale(new Date());
}

/**
 * Giorni di calendario tra due date, positivo se `a` viene dopo `da`.
 *
 * `Math.round` e non `Math.floor`: nei giorni di cambio dell'ora legale la
 * distanza tra due mezzanotti locali e' di 23 o 25 ore, e il troncamento
 * perderebbe (o guadagnerebbe) un giorno due volte l'anno.
 */
export function differenzaInGiorni(da: Date, a: Date): number {
  const MS_PER_GIORNO = 24 * 60 * 60 * 1000;
  return Math.round((a.getTime() - da.getTime()) / MS_PER_GIORNO);
}

/**
 * Data di oggi nel formato `YYYY-MM-DD` degli `<input type="date">`.
 *
 * Non e' `new Date().toISOString().split("T")[0]`: quello e' il giorno UTC, che
 * tra mezzanotte e l'alba e' ancora ieri. Usato come `max` di un input, vietava
 * di selezionare la giornata in corso.
 */
export function oggiPerInputDate(): string {
  const oggi = new Date();
  const mese = String(oggi.getMonth() + 1).padStart(2, "0");
  const giorno = String(oggi.getDate()).padStart(2, "0");
  return `${oggi.getFullYear()}-${mese}-${giorno}`;
}
