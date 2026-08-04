/**
 * @file src/components/DesktopNavBar.tsx
 * @description Navigazione orizzontale di **entrambi** i ruoli, da 1024px in su.
 *
 * Sostituisce la coppia DesktopTopBar (genitore) + DesktopSidebar (medico), due
 * componenti che facevano la stessa cosa con markup diverso pur leggendo già le
 * voci dalla stessa sorgente. Erano anche due posti dove correggere lo stesso
 * bug. Qui cambiano le voci e le azioni, non il layout.
 *
 * Perché il medico perde la sidebar: 240px orizzontali erano spesi proprio nella
 * schermata dove l'orizzontale è conteso — la Control Room affianca lista da
 * 420px e dettaglio — e tre voci non giustificano il pattern da gestionale.
 *
 * ALLINEAMENTO — il punto delicato. Il contenitore interno replica esattamente
 * il wrapper del contenuto in AppShell (`mx-auto`, `px-6`, stesso tetto di
 * larghezza per ruolo), perché barra e contenuto condividano il margine
 * sinistro. Per il medico coincide quasi sempre col bordo della finestra; per il
 * genitore, il cui contenuto è centrato entro 1024px, no: ancorare la barra al
 * bordo darebbe il logo a sinistra estrema e le card centrate altrove. **I due
 * tetti restano diversi ed è voluto** (1024 per il genitore, 1920 per il
 * medico): il testo del genitore su 1920px tornerebbe a righe illeggibili.
 * Unificare la barra non significa unificare la larghezza.
 *
 * Il controllo account (UserMenu) sta in fondo a destra per **entrambi** i
 * ruoli. Prima viveva solo nell'header della dashboard del genitore, che è una
 * pagina su quattro: da Diario, Ricette e Info non si poteva uscire affatto.
 * Sotto `lg` la barra non c'è e il menu resta nell'header della dashboard, che
 * per il genitore è anche l'unica porta verso /impostazioni.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";
import { navItemsPerRuolo, isNavItemAttivo } from "@/lib/navItems";
import UserMenu from "@/components/UserMenu";
import type { UserRole } from "@/types";

export default function DesktopNavBar({ ruolo }: { ruolo: UserRole | undefined }) {
  const pathname = usePathname();
  const isMedico = ruolo === "medico";
  const navItems = navItemsPerRuolo(ruolo);

  // Il brand porta alla prima destinazione del ruolo, non a "/": per il medico
  // "/" viene comunque rimbalzata su /studio dal proxy (src/proxy.ts).
  const destinazionePrincipale = navItems[0];

  const accento = isMedico
    ? {
        logo: "bg-indigo-600/20 ring-indigo-500/30",
        icona: "text-indigo-400",
        attivo: "bg-indigo-500/15 text-indigo-300",
        focus: "focus-visible:ring-indigo-400",
      }
    : {
        logo: "bg-blue-600/20 ring-blue-500/30",
        icona: "text-blue-400",
        attivo: "bg-blue-500/15 text-blue-400",
        focus: "focus-visible:ring-blue-400",
      };

  return (
    <header className="sticky top-0 z-40 hidden border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-md lg:block lg:flex-shrink-0">
      <div
        className={`mx-auto flex h-16 w-full items-center gap-8 px-6 ${
          isMedico ? "max-w-[1920px]" : "max-w-5xl"
        }`}
      >
        {/* Brand */}
        <Link
          href={destinazionePrincipale.href}
          className="flex flex-shrink-0 items-center gap-2"
          aria-label={`TonsilCare — ${destinazionePrincipale.ariaLabel}`}
        >
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${accento.logo}`}
          >
            <Activity size={16} className={accento.icona} />
          </span>
          <span className="text-base font-bold tracking-tight text-white">
            TonsilCare
          </span>
        </Link>

        <nav aria-label="Navigazione principale">
          <ul className="flex items-center gap-1">
            {navItems.map(({ label, href, icon: Icon, ariaLabel, id }) => {
              const isActive = isNavItemAttivo(href, pathname);

              return (
                <li key={href}>
                  <Link
                    href={href}
                    id={`${id}-desktop`}
                    aria-label={ariaLabel}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 ${accento.focus} ${
                      isActive
                        ? accento.attivo
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

        {/*
          L'account sta in fondo alla barra, dall'altra parte rispetto alle
          destinazioni: identità e uscita non sono posti dove andare. È la
          stessa separazione che il logout aveva in fondo alla sidebar.
        */}
        <div className="ml-auto flex flex-shrink-0 items-center">
          <UserMenu ruolo={ruolo} idBottone="btn-user-menu-desktop" />
        </div>
      </div>
    </header>
  );
}
