/**
 * @file src/app/page.tsx
 * @description Dashboard — Server Component wrapper.
 *
 * Questo file gestisce SOLO i metadati SEO.
 * Tutta la logica UI e dati è in DashboardContent (Client Component).
 *
 * ARCHITETTURA SPRINT 2:
 * - Nessun dato hardcodato o mock
 * - I dati provengono da:
 *   → UtenteContext (utente attivo da Firestore)
 *   → useFasi (intervalli delle fasi da Firestore + fallback)
 *   → getMedicalAlerts (soglie da Firestore + fallback)
 */

import { type Metadata } from "next";
import DashboardContent from "@/components/DashboardContent";

// ---------------------------------------------------------------------------
// Metadati SEO
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Riepilogo stato paziente, parametri vitali e piano alimentare odierno.",
};

// ---------------------------------------------------------------------------
// Pagina
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  return <DashboardContent />;
}
