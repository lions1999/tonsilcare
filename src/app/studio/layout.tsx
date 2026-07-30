/**
 * @file src/app/studio/layout.tsx
 * @description Layout del portale medico.
 *
 * Il provider sta qui, e non dentro la pagina, per due motivi legati fra loro:
 * un layout di Next non si rimonta navigando tra le rotte figlie, quindi la
 * lista pazienti sopravvive al passaggio da un paziente all'altro; e con lista
 * e dettaglio montati insieme la lettura dei dati resta una sola invece di
 * duplicarsi.
 */

import type { ReactNode } from "react";
import { StudioPazientiProvider } from "@/context/StudioPazientiContext";
import StudioShell from "@/components/studio/StudioShell";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <StudioPazientiProvider>
      <StudioShell>{children}</StudioShell>
    </StudioPazientiProvider>
  );
}
