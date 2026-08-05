/**
 * @file src/lib/utils/testo.ts
 * @description Normalizzazioni di testo per la sola presentazione.
 */

/**
 * Restituisce il testo con la prima lettera maiuscola, lasciando intatto il
 * resto.
 *
 * È una normalizzazione **di sola presentazione**: il valore su Firestore resta
 * quello che la persona ha digitato. Stessa scelta di età e BMI in
 * `lib/utils/paziente.ts` — si deriva a runtime, non si riscrive il dato. Il
 * contrario significherebbe che aprire una schermata modifica un documento, e
 * che il nome sarebbe corretto solo per chi è passato di lì.
 *
 * **Il resto della stringa non viene toccato, di proposito.** Abbassare le
 * lettere successive è la variante che sembra più "pulita" e rovina i casi veri:
 * "McDonald" diventerebbe "Mcdonald", "De Luca" → "De luca", e un nome scritto
 * tutto maiuscolo da chi lo preferisce così verrebbe riscritto. Qui si copre il
 * caso richiesto — chi digita tutto minuscolo — senza inventare una politica sui
 * nomi propri.
 *
 * `Array.from` invece di `[0]` perché una stringa indicizzata spezza le coppie
 * surrogate: con un nome che inizia per carattere fuori dal BMP, `testo[0]` è
 * mezzo carattere.
 */
export function conInizialeMaiuscola(testo: string | undefined | null): string {
  if (!testo) return "";

  const caratteri = Array.from(testo);
  const primo = caratteri[0];
  if (!primo) return "";

  return primo.toLocaleUpperCase("it-IT") + caratteri.slice(1).join("");
}
