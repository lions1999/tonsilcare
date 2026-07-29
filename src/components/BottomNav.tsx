/**
 * @file src/components/BottomNav.tsx
 * @description Bottom Navigation Bar fissa in stile app mobile.
 *
 * Le destinazioni dipendono dal ruolo: il genitore naviga tra dashboard,
 * diario, ricettario e info; il medico tra Control Room, info e impostazioni.
 * Senza sessione la barra non viene mostrata affatto — tutte le rotte a cui
 * punta sono protette, quindi su /login e /registrazione i tab rimbalzerebbero
 * sulla pagina di partenza.
 *
 * "use client" è necessario per usePathname (hook di routing lato client).
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpenText,
  UtensilsCrossed,
  Info,
  Stethoscope,
  Settings,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// ---------------------------------------------------------------------------
// Configurazione tab di navigazione
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  ariaLabel: string;
  id: string;
}

/** Tab del genitore: il percorso di cura quotidiano del bambino. */
const NAV_ITEMS_GENITORE: readonly NavItem[] = [
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
 * Tab del medico. Niente "Home" verso `/`: il proxy rimbalza comunque il medico
 * su /studio (vedi src/proxy.ts), quindi quel tab si sarebbe illuminato senza
 * mai cambiare pagina. Niente diario né ricettario: sono costruiti sul paziente
 * attivo del genitore, che per un account medico non esiste.
 */
const NAV_ITEMS_MEDICO: readonly NavItem[] = [
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

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export default function BottomNav() {
  const pathname = usePathname();
  const { user, accountProfile, loading } = useAuth();

  // Durante la risoluzione dello stato auth non mostriamo nulla: renderizzare
  // i tab del genitore per poi sostituirli con quelli del medico produrrebbe
  // uno sfarfallio a ogni caricamento.
  if (loading || !user) return null;

  const navItems =
    accountProfile?.ruolo === "medico" ? NAV_ITEMS_MEDICO : NAV_ITEMS_GENITORE;

  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-slate-700/60 bg-slate-900/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-full max-w-lg">
        {navItems.map(({ label, href, icon: Icon, ariaLabel, id }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                id={id}
                aria-label={ariaLabel}
                aria-current={isActive ? "page" : undefined}
                className="flex w-full flex-col items-center justify-center gap-0.5 rounded-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900"
              >
                {/* Pill indicator quando attivo */}
                <span
                  className={`flex h-6 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                    isActive ? "bg-blue-500/20" : "hover:bg-slate-700/50"
                  }`}
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={`transition-colors duration-200 ${
                      isActive ? "text-blue-400" : "text-slate-400"
                    }`}
                  />
                </span>

                {/* Label */}
                <span
                  className={`text-[10px] font-medium leading-none transition-colors duration-200 ${
                    isActive ? "text-blue-400" : "text-slate-500"
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
