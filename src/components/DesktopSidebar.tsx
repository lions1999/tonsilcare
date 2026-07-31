/**
 * @file src/components/DesktopSidebar.tsx
 * @description Navigazione laterale del medico, da 1024px in su.
 *
 * Sostituisce la bottom nav: il medico è l'utente che lavora davvero a una
 * scrivania, e una sidebar persistente è il pattern atteso in un gestionale.
 * Le voci arrivano da @/lib/navItems, le stesse che usa la barra mobile.
 *
 * Come la top bar del genitore, non contiene controlli account: restano
 * nell'header della pagina, dove vivono anche su mobile.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LogOut } from "lucide-react";
import { NAV_ITEMS_MEDICO, isNavItemAttivo } from "@/lib/navItems";
import BottoneLogout from "@/components/BottoneLogout";

export default function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 flex-shrink-0 flex-col border-r border-slate-800/60 bg-slate-900/40 lg:flex">
      {/* Brand */}
      <div className="flex h-16 flex-shrink-0 items-center gap-2 border-b border-slate-800/60 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 ring-1 ring-indigo-500/30">
          <Activity size={16} className="text-indigo-400" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight text-white">
            TonsilCare
          </p>
          <p className="text-[10px] leading-tight text-slate-500">Portale medico</p>
        </div>
      </div>

      <nav aria-label="Navigazione principale" className="min-h-0 flex-1 overflow-y-auto p-3">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS_MEDICO.map(({ label, href, icon: Icon, ariaLabel, id }) => {
            const isActive = isNavItemAttivo(href, pathname);

            return (
              <li key={href}>
                <Link
                  href={href}
                  id={`${id}-desktop`}
                  aria-label={ariaLabel}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                    isActive
                      ? "bg-indigo-500/15 text-indigo-300"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/*
        L'uscita sta in fondo alla navigazione, separata dalle destinazioni: è
        un'azione, non un posto dove andare. Prima viveva nell'intestazione
        della Control Room, dove era l'unico controllo account in mezzo a titolo
        e filtri.
      */}
      <div className="flex-shrink-0 border-t border-slate-800/60 p-3">
        <BottoneLogout
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-red-950/40 hover:text-red-300 focus-visible:ring-2 focus-visible:ring-red-400"
          ariaLabel="Esci dall'account"
        >
          <LogOut size={18} strokeWidth={1.8} />
          Esci
        </BottoneLogout>
      </div>
    </aside>
  );
}
