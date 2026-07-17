/**
 * @file src/lib/validations/diary.ts
 * @description Schema di validazione Zod per il log giornaliero del diario clinico.
 */

import { z } from "zod";

export const dailyLogSchema = z.object({
  temperatura: z.number({
    required_error: "La temperatura è obbligatoria",
    invalid_type_error: "La temperatura deve essere un numero",
  } as any)
    .min(34, "La temperatura minima è 34°C")
    .max(42, "La temperatura massima è 42°C"),
  
  dolore: z.number()
    .min(0, "Il dolore minimo è 0")
    .max(10, "Il dolore massimo è 10"),
  
  sanguinamento: z.boolean().default(false),

  vomito: z.boolean().default(false),

  // Alimentazione e idratazione
  quantitaLiquidiBicchieri: z.number()
    .int("Il numero di bicchieri deve essere un numero intero")
    .min(0, "Il numero di bicchieri non può essere negativo")
    .max(20, "Il numero di bicchieri non può superare 20")
    .optional(),

  numeroPasti: z.number()
    .int("Il numero di pasti deve essere un numero intero")
    .min(0, "Il numero di pasti non può essere negativo")
    .max(10, "Il numero di pasti non può superare 10")
    .optional(),

  alimentiTollerati: z.array(z.string()).default([]),

  rifiutoCibo: z.boolean().default(false),

  nausea: z.boolean().default(false),

  doloreDeglutizione: z.number()
    .min(0, "Il dolore alla deglutizione minimo è 0")
    .max(10, "Il dolore alla deglutizione massimo è 10")
    .optional(),

  // Parametri clinici
  peso: z.number()
    .min(1, "Il peso minimo è 1 kg")
    .max(150, "Il peso massimo è 150 kg")
    .optional(),

  qualitaSonno: z.number()
    .int("La qualità del sonno deve essere un numero intero")
    .min(1, "La qualità del sonno minima è 1")
    .max(5, "La qualità del sonno massima è 5")
    .optional(),

  statoGenerale: z.number()
    .int("Lo stato generale deve essere un numero intero")
    .min(1, "Lo stato generale minimo è 1")
    .max(5, "Lo stato generale massimo è 5")
    .optional(),

  note: z.string().max(500, "Le note non possono superare i 500 caratteri").optional().default(""),
});

export type DailyLogFormData = z.infer<typeof dailyLogSchema>;

// Tipo per Firestore (include i metadati di sistema)
export interface DailyLog extends DailyLogFormData {
  id: string;
  createdByUid: string;
  createdAt: string; // ISO string o timestamp
}
