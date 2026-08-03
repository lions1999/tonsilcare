/**
 * @file src/lib/validations/utente.ts
 * @description Schema di validazione Zod per la creazione di un nuovo utente operato.
 */

import { z } from "zod";
import type { TipoIntervento } from "@/types";

// ---------------------------------------------------------------------------
// Opzioni UI per il tipo di intervento
// ---------------------------------------------------------------------------

export const TIPI_INTERVENTO: { value: TipoIntervento; label: string }[] = [
  { value: "adenoidectomia", label: "Adenoidectomia" },
  { value: "tonsillectomia", label: "Tonsillectomia" },
  { value: "adenotonsillectomia", label: "Adenotonsillectomia" },
];

// ---------------------------------------------------------------------------
// Parsing liste a testo libero (allergie, patologie)
// ---------------------------------------------------------------------------

/**
 * Converte il testo di una textarea (voci separate da virgola) in un array pulito:
 * ogni voce viene trimmata e le stringhe vuote risultanti (virgole doppie, spazi
 * finali, ecc.) vengono scartate prima del salvataggio su Firestore.
 */
export function parseListaTesto(raw: string): string[] {
  return raw
    .split(",")
    .map((voce) => voce.trim())
    .filter((voce) => voce.length > 0);
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const utenteProfileSchema = z.object({
  nome: z.string().min(1, "Il nome è obbligatorio"),
  cognome: z.string().min(1, "Il cognome è obbligatorio"),
  dataNascita: z.string().min(1, "La data di nascita è obbligatoria"),
  // Nessun limite superiore: la specifica prevede l'intervento "previsto o
  // eseguito", quindi una data futura è legittima e produce lo stato
  // pre-operatorio. La fase non è più un campo del form: si deriva da questa
  // data e dagli intervalli di /fasi (vedi lib/utils/fase.ts).
  dataOperazione: z.string().min(1, "La data dell'operazione è obbligatoria"),

  tipoIntervento: z.enum(
    ["adenoidectomia", "tonsillectomia", "adenotonsillectomia"],
    { error: "Il tipo di intervento è obbligatorio" }
  ),

  pesoIniziale: z.number({ error: "Il peso è obbligatorio e deve essere un numero" })
    .min(3, "Il peso minimo è 3 kg")
    .max(150, "Il peso massimo è 150 kg"),

  altezza: z.number({ error: "L'altezza è obbligatoria e deve essere un numero" })
    .min(40, "L'altezza minima è 40 cm")
    .max(200, "L'altezza massima è 200 cm"),

  allergieIntolleranze: z.array(z.string()).default([]),
  patologieAssociate: z.array(z.string()).default([]),
});

export type UtenteProfileFormData = z.infer<typeof utenteProfileSchema>;
