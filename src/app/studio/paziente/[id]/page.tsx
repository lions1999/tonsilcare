/**
 * @file src/app/studio/paziente/[id]/page.tsx
 * @description Pagina di dettaglio del paziente per il Medico.
 * Mostra storico parametri vitali e permette di inviare prescrizioni.
 */

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Send, Activity, Thermometer, AlertCircle, MessageSquare } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getPatient, getPatientLogs, addPrescrizione, getPrescrizioni } from "@/lib/firebase/firestore";
import type { PatientProfile, Prescrizione } from "@/types";
import type { DailyLog } from "@/lib/validations/diary";

export default function PazienteDettaglioMedico() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, userProfile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [paziente, setPaziente] = useState<PatientProfile | null>(null);
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
          getPatient(id),
          getPatientLogs(id),
          getPrescrizioni(id)
        ]);
        setPaziente(pz);
        setLogs(lg);
        setPrescrizioni(pr);
      } catch (err) {
        console.error("Errore recupero paziente", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleInvioPrescrizione = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nuovaPrescrizione.trim() || !user || !userProfile || !paziente) return;

    setErrorForm(null);
    setInvioPrescrizione(true);

    try {
      await addPrescrizione(
        paziente.id, 
        user.uid, 
        `Dr. ${userProfile.cognome}`, 
        nuovaPrescrizione.trim()
      );
      setNuovaPrescrizione("");
      // Ricarica prescrizioni
      const pr = await getPrescrizioni(paziente.id);
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

  if (!paziente) {
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
              {paziente.nome} {paziente.cognome}
            </h1>
            <p className="text-xs text-slate-400">
              Operato il {new Date(paziente.dataOperazione).toLocaleDateString("it-IT")}
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-8">
        
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
              {logs.map((log) => (
                <div key={log.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <div className="flex items-center justify-between border-b border-slate-800/50 pb-2 mb-2">
                    <span className="text-xs text-slate-400">
                      {new Date(log.createdAt!).toLocaleDateString("it-IT", { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {(log.sanguinamento || log.vomito || (log.temperatura && log.temperatura >= 38.5)) && (
                      <span className="text-red-400">
                        <AlertCircle size={14} />
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {log.temperatura && (
                      <div className="flex items-center gap-1.5">
                        <Thermometer size={14} className="text-slate-500" />
                        <span className={log.temperatura >= 38.5 ? "text-red-400 font-medium" : ""}>
                          {log.temperatura}°C
                        </span>
                      </div>
                    )}
                    {log.dolore !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-xs">Dolore:</span>
                        <span className={log.dolore >= 7 ? "text-orange-400 font-medium" : ""}>
                          {log.dolore}/10
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2 text-xs space-y-1">
                    {log.sanguinamento && <p className="text-red-400 flex items-center gap-1"><AlertCircle size={10} /> Sanguinamento riportato</p>}
                    {log.vomito && <p className="text-red-400 flex items-center gap-1"><AlertCircle size={10} /> Vomito riportato</p>}
                    {log.note && <p className="text-slate-400 mt-2 bg-slate-950/50 p-2 rounded-lg italic">"{log.note}"</p>}
                  </div>
                </div>
              ))}
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
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-indigo-300">{pr.medicoNome}</span>
                    <span className="text-[10px] text-slate-500">
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
