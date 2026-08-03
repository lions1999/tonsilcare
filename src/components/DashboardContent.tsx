/**
 * @file src/components/DashboardContent.tsx
 * @description Client Component per la Dashboard principale.
 *
 * Legge i dati reali da:
 * - UtenteContext → utente attivo (da Firestore via useUtenti)
 * - useFasi → intervalli delle fasi (da Firestore con fallback locale)
 * - getMedicalAlerts → soglie di alert (da Firestore)
 *
 * La fase non arriva dal documento del paziente: si deriva ogni volta da data
 * dell'intervento e giorno corrente (lib/utils/fase.ts), quindi la dashboard
 * cambia da sola al passare dei giorni. Prima era un campo scelto una volta e
 * mai aggiornato, e il piano alimentare restava indietro senza segnalarlo.
 *
 * Gestisce:
 * - Stato di caricamento (skeleton)
 * - Empty State (nessun paziente registrato)
 * - Errori Firestore
 * - I quattro stati della fase: pre-operatorio, in fase, forzata dal medico,
 *   percorso concluso
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Thermometer,
  Activity,
  ChevronRight,
  Utensils,
  PlusCircle,
  AlertTriangle,
  Clock,
  Heart,
  RefreshCw,
  CalendarClock,
  CircleCheck,
  Lock,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useUtente } from "@/context/UtenteContext";
import { useFasi } from "@/hooks/useFasi";
import { getMedicalAlerts } from "@/lib/firebase/firestore";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import type { DailyLog } from "@/lib/validations/diary";
import { calcolaStatoFase, faseDiStato, type StatoFase } from "@/lib/utils/fase";
import { TIPI_INTERVENTO } from "@/lib/validations/utente";
import EmptyState from "@/components/EmptyState";
import UserMenu from "@/components/UserMenu";
import UtenteSwitcher from "@/components/UtenteSwitcher";

import type { MedicalAlerts, UtenteProfile, PostOpPhaseConfig, Prescrizione } from "@/types";
import { getPrescrizioni } from "@/lib/firebase/firestore";

// ---------------------------------------------------------------------------
// Default soglie alert (fallback se Firestore non ha /config/alerts)
// ---------------------------------------------------------------------------

const DEFAULT_ALERTS: MedicalAlerts = {
  temperaturaMaxC: 38.5,
  doloreSoglia: 7,
  oreMaxSenzaAlimentazione: 8,
  messaggioEmergenza:
    "Contatta il pediatra o vai al Pronto Soccorso se la temperatura supera i 38.5°C o compare sanguinamento.",
};

// ---------------------------------------------------------------------------
// Sub-componenti UI
// ---------------------------------------------------------------------------

/** Skeleton di caricamento per le card */
function DashboardSkeleton() {
  return (
    <div className="min-h-full bg-slate-950 animate-pulse">
      {/* Header skeleton */}
      <header className="sticky top-0 z-30 border-b border-slate-800/50 bg-slate-950/90 px-4 pb-3 pt-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded bg-slate-800" />
            <div className="h-5 w-40 rounded bg-slate-800" />
          </div>
          <div className="h-9 w-9 rounded-xl bg-slate-800" />
        </div>
      </header>
      {/* Cards skeleton */}
      <div className="space-y-4 px-4 py-4">
        <div className="h-12 rounded-xl bg-slate-800/60" />
        <div className="h-48 rounded-2xl bg-blue-900/20" />
        <div className="h-32 rounded-2xl bg-slate-800/40" />
        <div className="h-40 rounded-2xl bg-slate-800/40" />
        <div className="h-14 rounded-2xl bg-blue-900/20" />
      </div>
    </div>
  );
}

/**
 * Il contatore in alto a destra. Prima dell'intervento conta alla rovescia,
 * dopo conta i giorni post-operatori: il numero da solo sarebbe ambiguo, ed è
 * la ragione per cui non basta mostrare un valore negativo.
 */
function ContatoreGiorni({ stato }: { stato: StatoFase }) {
  if (stato.tipo === "pre_operatorio") {
    return (
      <div className="flex min-w-[60px] flex-col items-center rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm">
        <span className="text-2xl font-black leading-none text-white">
          {stato.giorniAllIntervento}
        </span>
        <span className="text-center text-[10px] leading-tight text-blue-100/80">
          giorni<br />all&apos;intervento
        </span>
      </div>
    );
  }

  if (stato.tipo === "indeterminato") return null;

  return (
    <div className="flex min-w-[60px] flex-col items-center rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm">
      <span className="text-2xl font-black leading-none text-white">{stato.giorno}°</span>
      <span className="text-center text-[10px] leading-tight text-blue-100/80">
        giorno<br />post-op
      </span>
    </div>
  );
}

/** Card Stato Utente */
function UtenteStatusCard({
  utente,
  stato,
}: {
  utente: UtenteProfile;
  stato: StatoFase;
}) {
  const fase = faseDiStato(stato);
  return (
    <article
      aria-label="Stato dell'utente operato"
      className="relative overflow-hidden rounded-2xl p-5 shadow-xl shadow-blue-950/50 animate-fade-in-up"
      style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 50%, #1e3a8a 100%)" }}
    >
      <div aria-hidden="true" className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/5 blur-xl" />
      <div aria-hidden="true" className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-blue-300/10" />

      <div className="relative mb-4 flex items-start justify-between">
        <div>
          <p className="mb-0.5 text-xs font-medium uppercase tracking-widest text-blue-200/80">
            Stato del Paziente
          </p>
          <h2 className="text-xl font-bold leading-tight text-white">
            {utente.nome} {utente.cognome}
          </h2>
          <p className="mt-0.5 text-xs text-blue-100/70">
            {TIPI_INTERVENTO.find((t) => t.value === utente.tipoIntervento)?.label ?? "Tipo intervento non specificato"}
          </p>
        </div>
        <ContatoreGiorni stato={stato} />
      </div>

      {/*
        Il forzamento va detto al genitore, non solo al medico: senza, vedrebbe
        una fase che non torna con il giorno mostrato sopra e nessuna spiegazione.
      */}
      {stato.tipo === "forzata" && (
        <div className="relative mb-3 flex items-start gap-2 rounded-xl border border-amber-300/40 bg-amber-400/15 px-3 py-2.5">
          <Lock size={13} className="mt-0.5 flex-shrink-0 text-amber-200" />
          <div className="text-xs">
            <p className="font-semibold text-amber-100">Fase impostata dal medico</p>
            {stato.motivo && <p className="mt-0.5 text-amber-100/80">{stato.motivo}</p>}
          </div>
        </div>
      )}

      <div className="relative mb-4 rounded-xl bg-white/10 p-3 backdrop-blur-sm">
        {fase ? (
          <>
            <div className="mb-1 flex items-center gap-2">
              <Activity size={14} className="flex-shrink-0 text-blue-200" />
              <span className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                {fase.titolo}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-blue-50/90">{fase.descrizione}</p>
          </>
        ) : (
          <>
            <div className="mb-1 flex items-center gap-2">
              {stato.tipo === "pre_operatorio" ? (
                <CalendarClock size={14} className="flex-shrink-0 text-blue-200" />
              ) : (
                <CircleCheck size={14} className="flex-shrink-0 text-blue-200" />
              )}
              <span className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                {stato.tipo === "pre_operatorio" && "In attesa dell'intervento"}
                {stato.tipo === "concluso" && "Percorso concluso"}
                {stato.tipo === "indeterminato" && "Data dell'intervento non valida"}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-blue-50/90">
              {stato.tipo === "pre_operatorio" &&
                "Le indicazioni alimentari compariranno il giorno dell'operazione."}
              {stato.tipo === "concluso" &&
                `Sono passati ${stato.giorno} giorni dall'intervento: il percorso guidato copre i primi ${stato.ultimoGiornoPrevisto}. Per qualsiasi dubbio residuo, contatta il medico.`}
              {stato.tipo === "indeterminato" &&
                "Non riusciamo a calcolare il giorno post-operatorio. Verifica la data nella scheda del bambino."}
            </p>
          </>
        )}
      </div>

      {fase && (
        <ul className="relative space-y-1.5">
          {fase.consigli.slice(0, 2).map((consiglio, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-blue-100/80">
              <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-300" />
              {consiglio}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/** Card Piano Alimentare */
function MealPlanCard({ phase }: { phase: PostOpPhaseConfig }) {
  return (
    <article
      aria-label="Piano alimentare odierno"
      className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/80 shadow-lg animate-fade-in-up stagger-2"
    >
      <div className="flex items-center justify-between border-b border-teal-800/30 bg-teal-950/60 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal-500/30 bg-teal-500/20">
            <Utensils size={15} className="text-teal-400" />
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-teal-400/80">Oggi</p>
            <h2 className="text-sm font-bold text-slate-100">Piano Alimentare</h2>
          </div>
        </div>
        <Link
          href="/ricette"
          id="link-tutte-ricette"
          aria-label="Vedi tutte le ricette"
          className="flex items-center gap-1 text-xs font-medium text-teal-400 transition-colors hover:text-teal-300"
        >
          Tutte <ChevronRight size={13} />
        </Link>
      </div>

      <div className="px-4 pb-3 pt-3">
        <div className="mb-3 flex items-center gap-2">
          <Clock size={12} className="text-slate-400" />
          <span className="text-xs text-slate-400">
            Consistenza:{" "}
            <strong className="text-slate-200">{phase.consistenzaSuggerita}</strong>
          </span>
        </div>

        <div className="mb-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            ✅ Consigliati
          </p>
          <div className="flex flex-wrap gap-1.5">
            {phase.cibiConsigliati.map((cibo) => (
              <span key={cibo} className="rounded-full border border-green-800/40 bg-green-950/60 px-2.5 py-1 text-xs font-medium text-green-300">
                {cibo}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            ❌ Da evitare
          </p>
          <div className="flex flex-wrap gap-1.5">
            {phase.cibiVietati.map((cibo) => (
              <span key={cibo} className="rounded-full border border-red-800/40 bg-red-950/60 px-2.5 py-1 text-xs font-medium text-red-300">
                {cibo}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

/** Card parametri vitali (dati reali dal diario clinico) */
function VitalsQuickCard({ log }: { log: DailyLog | null }) {
  if (!log) {
    return (
      <article
        aria-label="Parametri vitali recenti"
        className="rounded-2xl border border-slate-700/50 bg-slate-800/80 p-4 shadow-lg animate-fade-in-up stagger-2"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Heart size={14} className="text-rose-400" />
            Ultimo rilevamento
          </h2>
          <span className="text-[10px] text-slate-500">Nessun log ancora</span>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-700/40 bg-slate-900/60 p-6 text-center">
          <Activity size={24} className="mb-2 text-slate-500" />
          <p className="text-sm font-medium text-slate-400">Non hai ancora inserito i parametri vitali di oggi.</p>
        </div>
      </article>
    );
  }

  // Formatta orario
  const logDate = new Date(log.createdAt);
  const isToday = new Date().toDateString() === logDate.toDateString();
  const timeString = logDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  const dateString = isToday ? `Oggi, ${timeString}` : `${logDate.toLocaleDateString("it-IT")}, ${timeString}`;

  return (
    <article
      aria-label="Parametri vitali recenti"
      className="rounded-2xl border border-slate-700/50 bg-slate-800/80 p-4 shadow-lg animate-fade-in-up stagger-2"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Heart size={14} className="text-rose-400" />
          Ultimo rilevamento
        </h2>
        <span className="text-[10px] text-slate-500">{dateString}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={`flex flex-col items-center justify-center rounded-xl border border-slate-700/40 p-3 ${log.temperatura >= 38 ? 'bg-red-900/40 border-red-500/50' : 'bg-slate-900/60'}`}>
          <Thermometer size={20} className={`mb-1 ${log.temperatura >= 38 ? 'text-red-400' : 'text-orange-400'}`} />
          <span className="text-2xl font-black text-white">{log.temperatura.toFixed(1)}</span>
          <span className="text-[10px] font-medium text-slate-400">°C Temp.</span>
        </div>
        <div className={`flex flex-col items-center justify-center rounded-xl border border-slate-700/40 p-3 ${log.dolore >= 7 ? 'bg-amber-900/40 border-amber-500/50' : 'bg-slate-900/60'}`}>
          <Activity size={20} className={`mb-1 ${log.dolore >= 7 ? 'text-amber-400' : 'text-violet-400'}`} />
          <span className="text-2xl font-black text-white">
            {log.dolore}
            <span className="text-base font-semibold text-slate-400">/10</span>
          </span>
          <span className="text-[10px] font-medium text-slate-400">Dolore</span>
        </div>
      </div>
    </article>
  );
}

/** Banner Alert Medico */
function AlertBanner({ alerts }: { alerts: MedicalAlerts }) {
  return (
    <aside
      aria-label="Avviso medico importante"
      role="note"
      className="flex items-start gap-3 rounded-xl border border-amber-700/40 bg-amber-950/50 p-3.5 animate-fade-in-up"
    >
      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-400" />
      <div>
        <p className="mb-0.5 text-xs font-semibold text-amber-300">
          Temperatura max: {alerts.temperaturaMaxC}°C
        </p>
        <p className="text-xs leading-relaxed text-amber-200/70">
          {alerts.messaggioEmergenza}
        </p>
      </div>
    </aside>
  );
}

/** Card Prescrizioni Medico */
function PrescrizioniCard({ prescrizioni }: { prescrizioni: Prescrizione[] }) {
  if (prescrizioni.length === 0) return null;

  return (
    <article
      aria-label="Nuovi messaggi dal medico"
      className="rounded-2xl border border-indigo-700/50 bg-indigo-900/40 p-4 shadow-lg animate-fade-in-up"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/20">
          <Activity size={15} className="text-indigo-400" />
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-indigo-400/80">Aggiornamenti</p>
          <h2 className="text-sm font-bold text-slate-100">Messaggi dal Medico</h2>
        </div>
      </div>
      <div className="space-y-3">
        {prescrizioni.map((pr) => (
          <div key={pr.id} className="rounded-xl bg-slate-900/60 p-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-indigo-300">{pr.medicoNome}</span>
              <span className="text-[10px] text-slate-500">
                {new Date(pr.timestamp).toLocaleDateString("it-IT", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-sm text-slate-200">{pr.testo}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Componente principale (Client Component)
// ---------------------------------------------------------------------------

export default function DashboardContent() {
  const { accountProfile } = useAuth();
  const { utenti, activeUtente, loading: utentiLoading, error: utentiError, refetch: refetchUtenti } = useUtente();
  const { latestLog, loading: logLoading, refetch: refetchLogs } = useDailyLogs();

  // Gli intervalli delle fasi; la fase del paziente si deriva da questi.
  const { fasi, loading: fasiLoading } = useFasi();

  // Carica alert medici da Firestore
  const [alerts, setAlerts] = useState<MedicalAlerts>(DEFAULT_ALERTS);
  const [prescrizioni, setPrescrizioni] = useState<Prescrizione[]>([]);

  useEffect(() => {
    getMedicalAlerts()
      .then((data) => {
        if (data) setAlerts(data);
      })
      .catch(() => {
        // Usa il fallback silenziosamente
      });
  }, []);

  useEffect(() => {
    const utenteId = activeUtente?.id;
    let annullato = false;

    // Anche il caso "nessun utente attivo" passa da una Promise: azzerare le
    // prescrizioni in modo sincrono qui incatenerebbe un secondo render allo
    // stesso commit (react-hooks/set-state-in-effect).
    const richiesta = utenteId
      ? getPrescrizioni(utenteId)
      : Promise.resolve<Prescrizione[]>([]);

    richiesta
      .then((dati) => {
        if (!annullato) setPrescrizioni(dati);
      })
      .catch((err) => {
        if (!annullato) console.error(err);
      });

    return () => {
      annullato = true;
    };
  }, [activeUtente?.id]);

  // ---- STATI DI CARICAMENTO ----
  const isLoading = utentiLoading || (activeUtente !== null && (fasiLoading || logLoading));

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // ---- STATO DI ERRORE ----
  if (utentiError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <AlertTriangle size={40} className="mb-4 text-amber-400" />
        <h2 className="mb-2 text-lg font-bold text-white">Errore di caricamento</h2>
        <p className="mb-6 text-sm text-slate-400">{utentiError}</p>
        <button
          onClick={() => { refetchUtenti(); refetchLogs(); }}
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
        >
          <RefreshCw size={14} />
          Riprova
        </button>
      </div>
    );
  }

  // ---- EMPTY STATE — nessun utente ----
  if (utenti.length === 0) {
    return (
      <div className="min-h-full bg-slate-950">
        <header className="sticky top-0 z-30 border-b border-slate-800/50 bg-slate-950/90 px-4 pb-3 pt-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Bentornato,</p>
              <h1 className="text-lg font-bold leading-tight text-white">
                {accountProfile?.nome ?? "Genitore"} 👋
              </h1>
            </div>
            <UserMenu />
          </div>
        </header>
        <EmptyState />
      </div>
    );
  }

  // ---- DASHBOARD COMPLETA ----
  if (!activeUtente) {
    return <DashboardSkeleton />;
  }

  const stato = calcolaStatoFase(activeUtente, fasi);
  const fase = faseDiStato(stato);

  return (
    <div className="min-h-full bg-slate-950">

      {/* ---- HEADER ---- */}
      <header className="sticky top-0 z-30 border-b border-slate-800/50 bg-slate-950/90 px-4 pb-3 pt-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Bentornato,</p>
            {/*
              Il saluto usa il nome del genitore, come già faceva l'header dello
              stato vuoto: l'identità del bambino è ora portata dallo switcher qui
              sotto, che altrimenti ripeterebbe lo stesso nome a pochi pixel di
              distanza.
            */}
            <h1 className="text-lg font-bold leading-tight text-white">
              {accountProfile?.nome ?? "Genitore"} 👋
            </h1>
          </div>
          <UserMenu />
        </div>

        {/*
          Selettore del bambino attivo. Va mostrato a ogni larghezza: senza, un
          genitore con più figli non ha alcun modo di cambiare paziente.
        */}
        <div className="mt-3">
          <UtenteSwitcher />
        </div>
      </header>

      {/* ---- CONTENUTO ---- */}
      {/*
        Da `lg` in su le card si dispongono su due colonne: a sinistra lo stato
        clinico del bambino, a destra ciò che c'è da leggere e da preparare.
        Allerta e azione principale attraversano entrambe le colonne, perché
        riguardano la pagina intera e non una delle due metà.

        I raggruppamenti sono scelti in modo da lasciare invariato l'ordine del
        DOM: srotolando le due colonne si ottiene la sequenza di oggi — allerta,
        stato, parametri, prescrizioni, piano alimentare, azione — quindi sotto
        i 1024px la dashboard resta identica.

        `lg:items-start` evita che le due colonne si allunghino alla stessa
        altezza: sono indipendenti, e la più corta non deve stirarsi.
      */}
      <div className="space-y-4 px-4 py-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5 lg:space-y-0">

        {/* Banner Alert Medico */}
        <div className="lg:col-span-2">
          <AlertBanner alerts={alerts} />
        </div>

        {/* Colonna sinistra: stato clinico del bambino */}
        <div className="space-y-4">
          <UtenteStatusCard utente={activeUtente} stato={stato} />
          <VitalsQuickCard log={latestLog} />
        </div>

        {/* Colonna destra: comunicazioni e indicazioni */}
        <div className="space-y-4">
          <PrescrizioniCard prescrizioni={prescrizioni} />
          {/*
            Il piano alimentare esiste solo se c'è una fase. Prima dell'intervento
            e a percorso concluso la card sparisce invece di mostrare le
            indicazioni dell'ultima fase configurata, che a quel punto sarebbero
            vecchie di settimane pur sembrando attuali.
          */}
          {fase && <MealPlanCard phase={fase} />}
        </div>

        {/* CTA Aggiungi Log */}
        <div className="lg:col-span-2">
        <Link
          href="/diario/nuovo"
          id="btn-aggiungi-log"
          aria-label="Aggiungi un nuovo log al diario clinico"
          className="
            group flex w-full items-center justify-center gap-3
            rounded-2xl bg-blue-600 px-6 py-4
            text-base font-bold text-white
            shadow-xl shadow-blue-900/40
            transition-all duration-200
            hover:bg-blue-500 active:scale-95
            animate-fade-in-up stagger-4 animate-pulse-ring
          "
        >
          <PlusCircle
            size={22}
            className="text-blue-100 transition-transform duration-300 group-hover:rotate-90"
          />
          Aggiungi Log Diario
        </Link>
        </div>

        <div className="h-4 lg:hidden" aria-hidden="true" />
      </div>
    </div>
  );
}
