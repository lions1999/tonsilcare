/**
 * @file src/components/UserMenu.tsx
 * @description Controllo account: avatar con iniziale, identità e uscita.
 * Serve entrambi i ruoli, con voci diverse.
 *
 * Da 1024px in su vive in fondo a destra nella DesktopNavBar, quindi su **ogni**
 * pagina. Prima stava solo nell'header della dashboard, e il genitore che era su
 * Diario, Ricette o Info non aveva alcun modo di uscire: doveva tornare in home.
 * Sotto 1024px la barra non esiste e il menu resta dov'era, nell'header della
 * dashboard — che per il genitore è anche l'unico ingresso a /impostazioni,
 * pagina non presente tra le voci di navigazione.
 *
 * Perché il medico ha un dropdown invece del solo bottone "Esci" che aveva nella
 * sidebar: su una postazione condivisa di studio l'identità dell'account deve
 * essere leggibile mentre si scrivono prescrizioni, e prima compariva solo
 * nell'intestazione della Control Room — cioè non nella scheda paziente, che è
 * dove le prescrizioni si scrivono davvero. Il click in più cade su un'azione
 * rara che ha comunque una conferma modale.
 *
 * "Profilo & Impostazioni" è solo del genitore: il medico ha già Impostazioni
 * come voce della barra, a pochi centimetri, e due strade per lo stesso posto
 * sulla stessa riga sono rumore.
 */

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import BottoneLogout from "@/components/BottoneLogout";
import { clearRispostaMedicoNonLetta } from "@/lib/firebase/firestore";
import { conInizialeMaiuscola } from "@/lib/utils/testo";
import { useChiusuraAlClickFuori } from "@/hooks/useChiusuraAlClickFuori";
import type { UserRole } from "@/types";

interface UserMenuProps {
  ruolo?: UserRole;
  /** Classi del contenitore, per nasconderlo dove è di troppo (vedi AppShell). */
  className?: string;
  /**
   * Id del bottone. Serve perché il componente è montato **due volte** insieme —
   * nella barra desktop e nell'header della dashboard — e i due si escludono per
   * larghezza, non per montaggio: con un id fisso il DOM ne conterrebbe due
   * uguali, `getElementById` restituirebbe quello nascosto e l'HTML sarebbe
   * invalido. Stessa convenzione delle voci di navigazione (`-desktop`).
   */
  idBottone?: string;
}

export default function UserMenu({
  ruolo,
  className,
  idBottone = "btn-user-menu",
}: UserMenuProps) {
  const { user, accountProfile } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Stato locale per riflettere subito l'azzeramento in UI: accountProfile
  // viene caricato una tantum da AuthContext, non in realtime.
  const [flagCleared, setFlagCleared] = useState(false);
  const contenitore = useRef<HTMLDivElement>(null);

  /*
    Chiusura al click fuori.

    Qui c'era un overlay `fixed inset-0` che intercettava il click, e non
    funzionava: misurato 390×125 invece di 390×844, perché questo menu vive
    dentro header con `backdrop-blur`. Il perché e le tre occorrenze stanno in
    `useChiusuraAlClickFuori`, che è nato da questa correzione: era rimasta
    scritta solo in CLAUDE.md, e il bug si è ripresentato lo stesso in
    `UtenteSwitcher`.

    Il menu in sé resta `absolute` ed è corretto così — si ancora al contenitore
    qui sotto, che il blocco contenitore non tocca.
  */
  useChiusuraAlClickFuori(open, contenitore, () => setOpen(false));

  if (!user) return null;

  const isMedico = ruolo === "medico";

  /*
    Il badge non è filtrato per ruolo: dipende dal dato. `haRispostaMedicoNonLetta`
    viene scritto solo sull'account del genitore destinatario di una prescrizione,
    quindi su un account medico è sempre assente e il pallino non compare.
  */
  const hasNovita = !flagCleared && !!accountProfile?.haRispostaMedicoNonLetta;

  const handleToggleMenu = () => {
    const next = !open;
    setOpen(next);
    // Azzera solo all'apertura (azione esplicita di consultazione), non alla
    // chiusura, e solo se il flag era effettivamente attivo.
    if (next && hasNovita && accountProfile) {
      clearRispostaMedicoNonLetta(accountProfile.uid).catch((err) =>
        console.error("Errore azzeramento flag haRispostaMedicoNonLetta:", err)
      );
      setFlagCleared(true);
    }
  };

  // Iniziale del nome per l'avatar
  const iniziale = accountProfile?.nome?.[0]?.toUpperCase()
    ?? user.displayName?.[0]?.toUpperCase()
    ?? user.email?.[0]?.toUpperCase()
    ?? (isMedico ? "M" : "G");

  // Iniziali maiuscole anche se chi si è registrato ha digitato tutto minuscolo:
  // l'avatar qui sopra lo fa già da sempre con `toUpperCase()`, e senza questa
  // riga il cerchio direbbe "D" mentre il nome accanto dice "davide".
  const nomeCompleto = accountProfile
    ? `${conInizialeMaiuscola(accountProfile.nome)} ${conInizialeMaiuscola(accountProfile.cognome)}`
    : user.displayName ?? user.email ?? (isMedico ? "Medico" : "Genitore");
  // "Dr." come nell'intestazione della Control Room, che usa la stessa convenzione.
  const nomeDisplay = isMedico ? `Dr. ${nomeCompleto}` : nomeCompleto;

  const accento = isMedico
    ? {
        trigger: "bg-indigo-600/20 border-indigo-500/30 hover:bg-indigo-600/30",
        avatar: "bg-indigo-600",
        chevron: "text-indigo-300",
      }
    : {
        trigger: "bg-blue-600/20 border-blue-500/30 hover:bg-blue-600/30",
        avatar: "bg-blue-600",
        chevron: "text-blue-300",
      };

  return (
    <div ref={contenitore} className={`relative ${className ?? ""}`}>
      {/* Trigger avatar */}
      <button
        id={idBottone}
        aria-label="Menu utente"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={handleToggleMenu}
        className={`flex items-center gap-2 rounded-xl border pl-2 pr-1 py-1 transition-colors ${accento.trigger}`}
      >
        {/* Avatar con iniziale */}
        <div
          className={`relative flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${accento.avatar}`}
        >
          {iniziale}
          {hasNovita && (
            <span
              aria-label="Nuova prescrizione dal medico"
              className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-sky-400 ring-2 ring-slate-950"
            />
          )}
        </div>
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 ${accento.chevron} ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          role="menu"
          aria-label="Menu utente"
          className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border border-slate-700 bg-slate-900 shadow-xl shadow-black/50 overflow-hidden"
        >
          {/* Info utente */}
          <div className="border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${accento.avatar}`}
              >
                {iniziale}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {nomeDisplay}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Opzioni */}
          <div className="p-1">
            {!isMedico && (
              <>
                <button
                  role="menuitem"
                  onClick={() => { setOpen(false); router.push("/impostazioni"); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <User size={14} className="text-slate-400" />
                  Profilo & Impostazioni
                </button>

                <div className="my-1 border-t border-slate-800" />
              </>
            )}

            <BottoneLogout className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-950/40 transition-colors">
              <LogOut size={14} />
              Esci
            </BottoneLogout>
          </div>
        </div>
      )}
    </div>
  );
}
