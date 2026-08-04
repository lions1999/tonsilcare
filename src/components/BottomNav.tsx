/**
 * @file src/components/BottomNav.tsx
 * @description Bottom Navigation Bar fissa in stile app mobile.
 *
 * Le destinazioni dipendono dal ruolo e vivono in @/lib/navItems, condivise con
 * la barra orizzontale desktop (DesktopNavBar), che serve entrambi i ruoli.
 *
 * Visibile solo sotto `lg`: da 1024px in su la navigazione passa alla barra in
 * alto. La barra resta comunque nel DOM e viene nascosta via CSS, non
 * smontata da JavaScript: rilevare il breakpoint a runtime causerebbe uno
 * sfarfallio all'idratazione.
 *
 * Senza sessione non viene mostrata affatto — tutte le rotte a cui punta sono
 * protette, quindi su /login e /registrazione i tab rimbalzerebbero sulla
 * pagina di partenza.
 *
 * "use client" è necessario per usePathname (hook di routing lato client).
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { navItemsPerRuolo, isNavItemAttivo } from "@/lib/navItems";

export default function BottomNav() {
  const pathname = usePathname();
  const { user, accountProfile, loading } = useAuth();

  // Durante la risoluzione dello stato auth non mostriamo nulla: renderizzare
  // i tab del genitore per poi sostituirli con quelli del medico produrrebbe
  // uno sfarfallio a ogni caricamento.
  if (loading || !user) return null;

  const navItems = navItemsPerRuolo(accountProfile?.ruolo);

  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-slate-700/60 bg-slate-900/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-full max-w-lg">
        {navItems.map(({ label, href, icon: Icon, ariaLabel, id }) => {
          const isActive = isNavItemAttivo(href, pathname);

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
