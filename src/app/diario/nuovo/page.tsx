/**
 * @file src/app/diario/nuovo/page.tsx
 * @description Form di inserimento di un nuovo log giornaliero.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  ChevronLeft, 
  Thermometer, 
  Activity, 
  Droplet, 
  AlertTriangle, 
  Loader2,
  FileText
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useUtente } from "@/context/UtenteContext";
import { addDailyLog, getMedicalAlerts } from "@/lib/firebase/firestore";
import { dailyLogSchema, type DailyLogFormData } from "@/lib/validations/diary";
import type { MedicalAlerts } from "@/types";

export default function NuovoLogPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeUtente } = useUtente();
  
  const [alertsConfig, setAlertsConfig] = useState<MedicalAlerts | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // Caricamento soglie mediche
  useEffect(() => {
    getMedicalAlerts().then(setAlertsConfig).catch(console.error);
  }, []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<DailyLogFormData>({
    resolver: zodResolver(dailyLogSchema) as any,
    defaultValues: {
      temperatura: 36.5,
      dolore: 0,
      sanguinamento: false,
      vomito: false,
      note: "",
    },
  });

  const watchTemperatura = watch("temperatura");
  const watchDolore = watch("dolore");

  const processLog = async (data: DailyLogFormData) => {
    if (!user || !activeUtente) return;

    setIsSubmitting(true);
    
    // Controlla alert medici
    let isEmergency = false;
    const tempMax = alertsConfig?.temperaturaMaxC || 38.5;
    
    if (data.temperatura >= tempMax || data.sanguinamento) {
      isEmergency = true;
    }

    try {
      // Salva prima su db (così non perdiamo il dato clinico)
      await addDailyLog(activeUtente.id, user.uid, data);
      
      if (isEmergency) {
        setShowEmergencyModal(true);
      } else {
        router.push("/");
      }
    } catch (err) {
      console.error("Errore nel salvataggio del log:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activeUtente) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* HEADER */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800/50 bg-slate-950/90 px-4 py-4 backdrop-blur-md">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/50 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base font-bold text-white">Nuovo Log</h1>
        <div className="w-10" />
      </header>

      <main className="px-4 pt-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Come sta {activeUtente.nome}?</h2>
          <p className="text-sm text-slate-400">Registra i parametri vitali di oggi</p>
        </div>

        <form onSubmit={handleSubmit(processLog)} className="space-y-6">
          
          {/* TEMPERATURA */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Thermometer size={18} className="text-orange-400" />
              <label className="text-sm font-semibold text-slate-200">Temperatura Corporea</label>
            </div>
            
            <div className="flex items-center gap-4">
              <input
                type="number"
                step="0.1"
                {...register("temperatura", { valueAsNumber: true })}
                className="w-24 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-center text-xl font-bold text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-lg font-medium text-slate-400">°C</span>
            </div>
            {errors.temperatura && (
              <p className="mt-2 text-xs text-red-400">{errors.temperatura.message}</p>
            )}
          </div>

          {/* DOLORE (SLIDER) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-violet-400" />
                <label className="text-sm font-semibold text-slate-200">Livello di Dolore</label>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-sm font-bold text-violet-300">
                {watchDolore}
              </span>
            </div>
            
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              {...register("dolore", { valueAsNumber: true })}
              className="w-full accent-violet-500"
            />
            <div className="mt-2 flex justify-between text-[10px] font-medium uppercase text-slate-500">
              <span>0 - Nessuno</span>
              <span>5 - Moderato</span>
              <span>10 - Massimo</span>
            </div>
          </div>

          {/* SINTOMI (SWITCH) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Sintomi da segnalare</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                  <Droplet size={16} className="text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">Sanguinamento</p>
                  <p className="text-[10px] text-slate-500">Sputo o vomito con sangue rosso vivo</p>
                </div>
              </div>
              <Controller
                name="sanguinamento"
                control={control}
                render={({ field }) => (
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" className="peer sr-only" checked={field.value} onChange={field.onChange} />
                    <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-red-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
                  </label>
                )}
              />
            </div>

            <div className="h-px w-full bg-slate-800" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <AlertTriangle size={16} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">Vomito</p>
                  <p className="text-[10px] text-slate-500">Episodi di vomito nella giornata</p>
                </div>
              </div>
              <Controller
                name="vomito"
                control={control}
                render={({ field }) => (
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" className="peer sr-only" checked={field.value} onChange={field.onChange} />
                    <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
                  </label>
                )}
              />
            </div>
          </div>

          {/* NOTE */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <FileText size={18} className="text-blue-400" />
              <label className="text-sm font-semibold text-slate-200">Note (opzionale)</label>
            </div>
            <textarea
              {...register("note")}
              rows={3}
              placeholder="Come ha mangiato? Ha dormito bene?"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {errors.note && (
              <p className="mt-2 text-xs text-red-400">{errors.note.message}</p>
            )}
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-4 text-sm font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Salvataggio...
              </>
            ) : (
              "Salva Log Giornaliero"
            )}
          </button>
        </form>
      </main>

      {/* MODAL DI EMERGENZA */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/50 bg-red-950 p-6 shadow-2xl shadow-red-900/50 animate-fade-in-up">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <h3 className="mb-2 text-center text-xl font-bold text-white">Attenzione Medica Necessaria</h3>
            <p className="mb-6 text-center text-sm text-red-200">
              {alertsConfig?.messaggioEmergenza || 
               "I parametri inseriti indicano una situazione da valutare. Contatta immediatamente il pediatra o recati al Pronto Soccorso più vicino."}
            </p>
            <button
              onClick={() => router.push("/")}
              className="w-full rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white hover:bg-red-400"
            >
              Ho capito, torna alla Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
