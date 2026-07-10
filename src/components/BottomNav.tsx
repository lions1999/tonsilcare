/**
 * @file src/components/BottomNav.tsx
 * @description Bottom Navigation Bar fissa in stile app mobile.
 * 4 tab: Home, Diario, Ricette, Info.
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

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-slate-700/60 bg-slate-900/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-full max-w-lg">
        {NAV_ITEMS.map(({ label, href, icon: Icon, ariaLabel, id }) => {
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
