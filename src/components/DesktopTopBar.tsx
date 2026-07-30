/**
 * @file src/components/DesktopTopBar.tsx
 * @description Navigazione orizzontale del genitore, da 1024px in su.
 *
 * Sostituisce la bottom nav, che su desktop è un pattern fuori posto. Le voci
 * arrivano da @/lib/navItems, le stesse che usa la barra mobile.
 *
 * Non contiene controlli utente (switcher, menu account): quelli restano
 * nell'header della pagina, dove vivono anche su mobile. Duplicarli qui
 * significherebbe mostrarli due volte sulla dashboard.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";
import { NAV_ITEMS_GENITORE, isNavItemAttivo } from "@/lib/navItems";

export default function DesktopTopBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 hidden border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-md lg:block">
      {/* Stessa larghezza del contenitore contenuti in AppShell, così barra e
          contenuto risultano allineati invece che scollati. */}
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-8 px-6">
        {/* Brand */}
        <Link
          href="/"
          className="flex flex-shrink-0 items-center gap-2"
          aria-label="TonsilCare, vai alla Dashboard"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 ring-1 ring-blue-500/30">
            <Activity size={16} className="text-blue-400" />
          </span>
          <span className="text-base font-bold tracking-tight text-white">
            TonsilCare
          </span>
        </Link>

        <nav aria-label="Navigazione principale">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS_GENITORE.map(({ label, href, icon: Icon, ariaLabel, id }) => {
              const isActive = isNavItemAttivo(href, pathname);

              return (
                <li key={href}>
                  <Link
                    href={href}
                    id={`${id}-desktop`}
                    aria-label={ariaLabel}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-400 ${
                      isActive
                        ? "bg-blue-500/15 text-blue-400"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                    }`}
                  >
                    <Icon size={16} strokeWidth={isActive ? 2.4 : 1.8} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
