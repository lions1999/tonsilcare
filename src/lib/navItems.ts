/**
 * @file src/lib/navItems.ts
 * @description Sorgente unica delle voci di navigazione.
 *
 * Le stesse destinazioni sono consumate da tre componenti diversi — la bottom
 * nav su mobile, la top bar del genitore e la sidebar del medico su desktop —
 * quindi vivono qui e non dentro uno di essi: duplicarle significherebbe
 * garantire che prima o poi divergano.
 */

import {
  LayoutDashboard,
  BookOpenText,
  UtensilsCrossed,
  Info,
  Stethoscope,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  ariaLabel: string;
  id: string;
}

/** Voci del genitore: il percorso di cura quotidiano del bambino. */
export const NAV_ITEMS_GENITORE: readonly NavItem[] = [
  {
    label: "Home",
    href: "/",
    icon: LayoutDashboard,
    ariaLabel: "Vai alla Dashboard",
    id: "nav-home",
  },
  {
    label: "Diario",
    href: "/diario",
    icon: BookOpenText,
    ariaLabel: "Vai al Diario clinico",
    id: "nav-diario",
  },
  {
    label: "Ricette",
    href: "/ricette",
    icon: UtensilsCrossed,
    ariaLabel: "Vai alle Ricette",
    id: "nav-ricette",
  },
  {
    label: "Info",
    href: "/info",
    icon: Info,
    ariaLabel: "Vai alla sezione Informazioni",
    id: "nav-info",
  },
] as const;

/**
 * Voci del medico. Niente "Home" verso `/`: il proxy rimbalza comunque il
 * medico su /studio (src/proxy.ts), quindi quel tab si sarebbe illuminato senza
 * mai cambiare pagina. Niente diario né ricettario: sono costruiti sul paziente
 * attivo del genitore, che per un account medico non esiste.
 */
export const NAV_ITEMS_MEDICO: readonly NavItem[] = [
  {
    label: "Pazienti",
    href: "/studio",
    icon: Stethoscope,
    ariaLabel: "Vai alla Control Room",
    id: "nav-studio",
  },
  {
    label: "Info",
    href: "/info",
    icon: Info,
    ariaLabel: "Vai alla sezione Informazioni",
    id: "nav-info",
  },
  {
    label: "Impostazioni",
    href: "/impostazioni",
    icon: Settings,
    ariaLabel: "Vai alle Impostazioni",
    id: "nav-impostazioni",
  },
] as const;

/** Voci da mostrare per un ruolo. Il genitore è il default anche a ruolo ignoto. */
export function navItemsPerRuolo(ruolo: UserRole | undefined): readonly NavItem[] {
  return ruolo === "medico" ? NAV_ITEMS_MEDICO : NAV_ITEMS_GENITORE;
}

/**
 * Se la voce corrisponde alla rotta corrente. Sta qui e non nei componenti per
 * lo stesso motivo delle voci: le tre navigazioni devono evidenziare lo stesso
 * tab a parità di URL. `/` è un caso a sé perché è prefisso di ogni altra rotta.
 */
export function isNavItemAttivo(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
