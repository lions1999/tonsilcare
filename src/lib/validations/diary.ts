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
  
  note: z.string().max(500, "Le note non possono superare i 500 caratteri").optional().default(""),
});

export type DailyLogFormData = z.infer<typeof dailyLogSchema>;

// Tipo per Firestore (include i metadati di sistema)
export interface DailyLog extends DailyLogFormData {
  id: string;
  patientId: string;
  createdByUid: string;
  createdAt: string; // ISO string o timestamp
}
