/**
 * @file src/components/BottomNav.tsx
 * @description Bottom Navigation Bar fissa in stile app mobile.
 * 4 tab: Home, Diario, Ricette, Info.
 *
 * Usa "use client" perché ha bisogno di leggere la route attiva (usePathname).
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, // Home / Dashboard
  BookOpenText,    // Diario
  UtensilsCrossed, // Ricette
  Info,            // Info / Guida
} from "lucide-react";

// ---------------------------------------------------------------------------
// Configurazione tab di navigazione
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  {
    label: "Home",
    href: "/",
    icon: LayoutDashboard,
    ariaLabel: "Vai alla Dashboard",
  },
  {
    label: "Diario",
    href: "/diario",
    icon: BookOpenText,
    ariaLabel: "Vai al Diario clinico",
  },
  {
    label: "Ricette",
    href: "/ricette",
    icon: UtensilsCrossed,
    ariaLabel: "Vai alle Ricette",
  },
  {
    label: "Info",
    href: "/info",
    icon: Info,
    ariaLabel: "Vai alla sezione Informazioni",
  },
] as const;

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigazione principale"
      className="
        fixed bottom-0 left-0 right-0 z-50
        h-16
        bg-slate-900/95 backdrop-blur-md
        border-t border-slate-700/60
        safe-area-pb
        flex items-center
        max-w-lg mx-auto
        /* Limita la larghezza su tablet/desktop per mantenere l'aspetto mobile */
      "
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex w-full h-full">
        {NAV_ITEMS.map(({ label, href, icon: Icon, ariaLabel }) => {
          // Verifica se il tab è attivo
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-label={ariaLabel}
                aria-current={isActive ? "page" : undefined}
                className="
                  flex flex-col items-center justify-center
                  h-full w-full
                  gap-0.5
                  transition-all duration-200
                  group
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900
                  rounded-md
                "
              >
                {/* Icona con sfondo pill quando attivo */}
                <span
                  className={`
                    relative flex items-center justify-center
                    w-10 h-6 rounded-full
                    transition-all duration-200
                    ${isActive
                      ? "bg-blue-500/20"
                      : "group-hover:bg-slate-700/50"
                    }
                  `}
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={`
                      transition-colors duration-200
                      ${isActive
                        ? "text-blue-400"
                        : "text-slate-400 group-hover:text-slate-200"
                      }
                    `}
                  />
                </span>

                {/* Label */}
                <span
                  className={`
                    text-[10px] font-medium leading-none
                    transition-colors duration-200
                    ${isActive
                      ? "text-blue-400"
                      : "text-slate-500 group-hover:text-slate-300"
                    }
                  `}
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
