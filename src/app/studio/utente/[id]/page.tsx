/**
 * @file src/app/studio/utente/[id]/page.tsx
 * @description Pagina di dettaglio del paziente per il Medico.
 * Mostra storico parametri vitali e permette di inviare prescrizioni.
 */

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  ArrowLeft,
  Send,
  Activity,
  Thermometer,
  AlertCircle,
  MessageSquare,
  Stethoscope,
  ShieldAlert,
  GlassWater,
  Utensils,
  UtensilsCrossed,
  Salad,
  Meh,
  Frown,
  Scale,
  Moon,
  Smile,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStudioPazienti } from "@/context/StudioPazientiContext";
import {
  getUtente,
  getUtenteLogs,
  addPrescrizione,
  getPrescrizioni,
  clearNuovoLogNonLetto,
  markRispostaMedicoNonLetta,
} from "@/lib/firebase/firestore";
import { calcolaEta, calcolaBMI } from "@/lib/utils/paziente";
import { parseDataLocale } from "@/lib/utils/date";
import { valutaAlertLog } from "@/lib/utils/alert";
import { haTesto } from "@/lib/utils/testo";
import FasePazienteCard from "@/components/studio/FasePazienteCard";
import AvvisoTriageDisattivato from "@/components/studio/AvvisoTriageDisattivato";
import { TIPI_INTERVENTO } from "@/lib/validations/utente";
import type { UtenteProfile, Prescrizione } from "@/types";
import type { DailyLog } from "@/lib/validations/diary";

export default function UtenteDettaglioMedico() {
  const { id } = useParams<{ id: string }>();
  const { user, accountProfile } = useAuth();
  /*
    Le soglie arrivano da qui e non da una `getMedicalAlerts()` di questa pagina:
    erano due letture della stessa configurazione, quindi due valori che potevano
    divergere — la famiglia di problemi che questo repo produce di continuo (le
    fasi in tre posti, i fallback hardcoded lato genitore).

    Il provider sta nel layout di /studio, quindi c'è anche su mobile, dove la
    lista è nascosta da una classe CSS ma resta montata. Se un giorno questa
    pagina finisse fuori dal provider, `useStudioPazienti` lancia un errore con
    un messaggio esplicito invece di propagare `undefined` — vale già oggi per
    `segnaLetto` e `fasi`, qui sotto.
  */
  const {
    segnaLetto,
    fasi,
    aggiornaPaziente,
    configAlert,
    configAlertMancante,
  } = useStudioPazienti();

  const [loading, setLoading] = useState(true);
  const [utente, setUtente] = useState<UtenteProfile | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [prescrizioni, setPrescrizioni] = useState<Prescrizione[]>([]);

  // Form Prescrizione
  const [nuovaPrescrizione, setNuovaPrescrizione] = useState("");
  const [invioPrescrizione, setInvioPrescrizione] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const [pz, lg, pr] = await Promise.all([
          getUtente(id),
          getUtenteLogs(id),
          getPrescrizioni(id)
        ]);
        setUtente(pz);
        setLogs(lg);
        setPrescrizioni(pr);

        // Azzera il flag "novità" solo se era true, per evitare write superflue.
        if (pz?.haNuovoLogNonLetto) {
          clearNuovoLogNonLetto(id).catch((err) =>
            console.error("Errore azzeramento flag haNuovoLogNonLetto:", err)
          );
          setUtente((prev) => (prev ? { ...prev, haNuovoLogNonLetto: false } : prev));

          // Lo stesso aggiornamento va propagato alla lista, che nel layout a
          // due pannelli resta montata: senza, il badge "novità" rimarrebbe
          // acceso accanto al paziente che il medico ha appena aperto, e il
          // filtro "Con novità" continuerebbe a includerlo.
          segnaLetto(id);
        }
      } catch (err) {
        console.error("Errore recupero utente", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, segnaLetto]);

  const handleInvioPrescrizione = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nuovaPrescrizione.trim() || !user || !accountProfile || !utente) return;

    setErrorForm(null);
    setInvioPrescrizione(true);

    try {
      await addPrescrizione(
        utente.id,
        user.uid,
        `Dr. ${accountProfile.cognome}`,
        nuovaPrescrizione.trim()
      );
      markRispostaMedicoNonLetta(utente.accountId).catch((err) =>
        console.error("Errore aggiornamento flag haRispostaMedicoNonLetta:", err)
      );
      setNuovaPrescrizione("");
      // Ricarica prescrizioni
      const pr = await getPrescrizioni(utente.id);
      setPrescrizioni(pr);
    } catch (err) {
      console.error(err);
      setErrorForm("Errore nell'invio della prescrizione.");
    } finally {
      setInvioPrescrizione(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  if (!utente) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 p-6 text-center">
        <p className="text-slate-400 mb-4">Paziente non trovato.</p>
        <Link href="/studio" className="text-indigo-400 hover:underline">
          &larr; Torna alla Control Room
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-200 pb-20">
      
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-800/60 bg-slate-950/80 px-4 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link href="/studio" className="p-2 -ml-2 rounded-full hover:bg-slate-800 transition-colors">
            <ArrowLeft size={20} className="text-slate-400" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">
              {utente.nome} {utente.cognome}
            </h1>
            <p className="text-xs text-slate-400">
              Operato il {parseDataLocale(utente.dataOperazione).toLocaleDateString("it-IT")}
            </p>
          </div>
        </div>
      </header>

      {/*
        `lg:hidden`, e non un controllo sulla larghezza in JavaScript: su desktop
        la lista è affiancata e mostra già lo stesso avviso, quindi due copie
        sarebbero solo rumore. Sotto `lg` la lista è nascosta (StudioShell) e
        questa è l'unica schermata in cui il medico legge log clinici senza
        averla accanto — cioè dove l'inferenza "nessuna icona rossa, tutto
        normale" è più facile da fare. Stesso idioma di UserMenu: due montaggi
        che si escludono per breakpoint.

        Fuori da <main> di proposito: lì `space-y-8` dà il margine con
        `> * + *`, e un figlio nascosto da `lg:hidden` resta un fratello — su
        desktop avrebbe aggiunto 32px di vuoto in cima al pannello ogni volta che
        la configurazione manca.
      */}
      {configAlertMancante && (
        <AvvisoTriageDisattivato
          contesto="scheda"
          className="mx-4 mt-6 lg:hidden"
        />
      )}

      <main className="px-4 py-6 space-y-8">

        {/* Riepilogo Clinico */}
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
            <Stethoscope size={16} className="text-indigo-400" />
            Dati Clinici e Auxologici
          </h2>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Tipo intervento</p>
                <p className="font-medium text-slate-200">
                  {TIPI_INTERVENTO.find((t) => t.value === utente.tipoIntervento)?.label ?? "Non specificato"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Età</p>
                <p className="font-medium text-slate-200">{calcolaEta(utente.dataNascita)} anni</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Peso iniziale / Altezza</p>
                <p className="font-medium text-slate-200">
                  {utente.pesoIniziale && utente.altezza
                    ? `${utente.pesoIniziale} kg / ${utente.altezza} cm`
                    : "Non specificato"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">BMI</p>
                <p className="font-medium text-slate-200">
                  {utente.pesoIniziale && utente.altezza
                    ? calcolaBMI(utente.pesoIniziale, utente.altezza).toFixed(1)
                    : "Non specificato"}
                </p>
              </div>
            </div>

            {(utente.allergieIntolleranze?.length || utente.patologieAssociate?.length) ? (
              <div className="border-t border-slate-800 pt-3 space-y-2">
                {utente.allergieIntolleranze && utente.allergieIntolleranze.length > 0 && (
                  <div className="flex items-start gap-2 text-sm">
                    <ShieldAlert size={14} className="mt-0.5 flex-shrink-0 text-amber-400" />
                    <p className="text-slate-300">
                      <span className="text-xs text-slate-500 block">Allergie / intolleranze</span>
                      {utente.allergieIntolleranze.join(", ")}
                    </p>
                  </div>
                )}
                {utente.patologieAssociate && utente.patologieAssociate.length > 0 && (
                  <div className="flex items-start gap-2 text-sm">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
                    <p className="text-slate-300">
                      <span className="text-xs text-slate-500 block">Patologie associate</span>
                      {utente.patologieAssociate.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </section>

        {/* Fase post-operatoria, con l'override clinico */}
        {user && (
          <FasePazienteCard
            utente={utente}
            fasi={fasi}
            medicoUid={user.uid}
            onAggiornato={(patch) => {
              setUtente((prec) => (prec ? { ...prec, ...patch } : prec));
              // Anche la lista a sinistra, che resta montata: senza, il filtro
              // "per fase" continuerebbe a derivare la fase dal documento
              // vecchio e mostrerebbe il paziente sotto la fase calcolata
              // mentre la sua scheda ne indica un'altra.
              aggiornaPaziente(utente.id, patch);
            }}
          />
        )}

        {/* Storico Diario Clinico */}
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
            <Activity size={16} className="text-indigo-400" />
            Storico Parametri
          </h2>

          {logs.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center text-sm text-slate-500">
              Nessun log giornaliero registrato.
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                // Le soglie non si rivalutano a mano: è la stessa funzione che
                // usa la Control Room, su un log solo. Prima qui c'erano tre
                // confronti scritti a mano con fallback hardcoded (38.5 e 7) e
                // una definizione di allerta diversa da quella della lista —
                // l'icona ignorava il dolore.
                //
                // Conseguenza voluta della rimozione dei fallback: senza
                // /config/alerts non viene evidenziato niente, esattamente come
                // in Control Room, invece di applicare soglie che nessuno ha
                // configurato.
                const motivi = valutaAlertLog(log, configAlert);
                const fuoriSoglia = (tipo: "temperatura" | "dolore") =>
                  motivi.some((m) => m.tipo === tipo);

                return (
                <div key={log.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <div className="flex items-center justify-between border-b border-slate-800/50 pb-2 mb-2">
                    <span className="text-xs text-slate-400">
                      {new Date(log.createdAt!).toLocaleDateString("it-IT", { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {motivi.length > 0 && (
                      <span className="text-red-400">
                        <AlertCircle size={14} />
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {log.temperatura && (
                      <div className="flex items-center gap-1.5">
                        <Thermometer size={14} className="text-slate-500" />
                        <span className={fuoriSoglia("temperatura") ? "text-red-400 font-medium" : ""}>
                          {log.temperatura}°C
                        </span>
                      </div>
                    )}
                    {log.dolore !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-xs">Dolore:</span>
                        <span className={fuoriSoglia("dolore") ? "text-orange-400 font-medium" : ""}>
                          {log.dolore}/10
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Alimentazione, idratazione e parametri aggiuntivi (P0-3) */}
                  {(log.quantitaLiquidiBicchieri !== undefined ||
                    log.numeroPasti !== undefined ||
                    log.peso !== undefined ||
                    log.doloreDeglutizione !== undefined ||
                    log.qualitaSonno !== undefined ||
                    log.statoGenerale !== undefined) && (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-300 border-t border-slate-800/50 pt-2">
                      {log.quantitaLiquidiBicchieri !== undefined && (
                        <span className="flex items-center gap-1">
                          <GlassWater size={12} className="text-cyan-400" /> {log.quantitaLiquidiBicchieri} bicchieri
                        </span>
                      )}
                      {log.numeroPasti !== undefined && (
                        <span className="flex items-center gap-1">
                          <Utensils size={12} className="text-cyan-400" /> {log.numeroPasti} pasti
                        </span>
                      )}
                      {log.peso !== undefined && (
                        <span className="flex items-center gap-1">
                          <Scale size={12} className="text-emerald-400" /> {log.peso} kg
                        </span>
                      )}
                      {log.doloreDeglutizione !== undefined && (
                        <span className="flex items-center gap-1">
                          <Frown size={12} className="text-rose-400" /> Deglutizione {log.doloreDeglutizione}/10
                        </span>
                      )}
                      {log.qualitaSonno !== undefined && (
                        <span className="flex items-center gap-1">
                          <Moon size={12} className="text-indigo-400" /> Sonno {log.qualitaSonno}/5
                        </span>
                      )}
                      {log.statoGenerale !== undefined && (
                        <span className="flex items-center gap-1">
                          <Smile size={12} className="text-amber-400" /> Stato {log.statoGenerale}/5
                        </span>
                      )}
                    </div>
                  )}

                  {log.alimentiTollerati && log.alimentiTollerati.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Salad size={12} className="text-lime-400 flex-shrink-0" />
                      {log.alimentiTollerati.map((cibo) => (
                        <span key={cibo} className="rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[10px] text-slate-300">
                          {cibo}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 text-xs space-y-1">
                    {log.sanguinamento && <p className="text-red-400 flex items-center gap-1"><AlertCircle size={10} /> Sanguinamento riportato</p>}
                    {log.vomito && <p className="text-red-400 flex items-center gap-1"><AlertCircle size={10} /> Vomito riportato</p>}
                    {log.rifiutoCibo && <p className="text-orange-400 flex items-center gap-1"><UtensilsCrossed size={10} /> Rifiuto del cibo</p>}
                    {log.nausea && <p className="text-lime-400 flex items-center gap-1"><Meh size={10} /> Nausea</p>}
                    {log.note && <p className="text-slate-400 mt-2 bg-slate-950/50 p-2 rounded-lg italic">&quot;{log.note}&quot;</p>}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Prescrizioni Precedenti */}
        {prescrizioni.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
              <MessageSquare size={16} className="text-indigo-400" />
              Prescrizioni Inviate
            </h2>
            <div className="space-y-3">
              {prescrizioni.map((pr) => (
                <div key={pr.id} className="rounded-xl border border-indigo-900/30 bg-indigo-950/20 p-4">
                  {/* Vedi la stessa riga in DashboardContent: `ml-auto` perché
                      `justify-between` con un figlio solo allinea a sinistra. */}
                  <div className="flex justify-between items-center mb-2">
                    {haTesto(pr.medicoNome) && (
                      <span className="text-xs font-semibold text-indigo-300">{pr.medicoNome}</span>
                    )}
                    <span className="ml-auto text-[10px] text-slate-500">
                      {new Date(pr.timestamp).toLocaleDateString("it-IT", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{pr.testo}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Nuova Prescrizione */}
        <section>
          <h2 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
            Invia Prescrizione al Genitore
          </h2>
          <form onSubmit={handleInvioPrescrizione} className="space-y-3">
            {errorForm && <p className="text-xs text-red-400">{errorForm}</p>}
            <textarea
              required
              rows={4}
              value={nuovaPrescrizione}
              onChange={(e) => setNuovaPrescrizione(e.target.value)}
              placeholder="Scrivi qui indicazioni terapeutiche, variazioni dosaggio farmaci o note..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800/60 p-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none"
              disabled={invioPrescrizione}
            />
            <button
              type="submit"
              disabled={invioPrescrizione || !nuovaPrescrizione.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {invioPrescrizione ? (
                <><Loader2 size={16} className="animate-spin" /> Invio in corso...</>
              ) : (
                <><Send size={16} /> Invia Prescrizione</>
              )}
            </button>
          </form>
        </section>

      </main>
    </div>
  );
}
