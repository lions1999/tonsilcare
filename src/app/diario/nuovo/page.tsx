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
  FileText,
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
import { useUtente } from "@/context/UtenteContext";
import { addDailyLog, getMedicalAlerts, markNuovoLogNonLetto } from "@/lib/firebase/firestore";
import {
  dailyLogSchema,
  type DailyLogFormData,
  type DailyLogFormInput,
} from "@/lib/validations/diary";
import { parseListaTesto } from "@/lib/validations/utente";
import type { MedicalAlerts } from "@/types";

export default function NuovoLogPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeUtente } = useUtente();
  
  const [alertsConfig, setAlertsConfig] = useState<MedicalAlerts | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const [alimentiTolleratiText, setAlimentiTolleratiText] = useState("");
  const [hasDoloreDeglutizione, setHasDoloreDeglutizione] = useState(false);
  const [hasQualitaSonno, setHasQualitaSonno] = useState(false);
  const [hasStatoGenerale, setHasStatoGenerale] = useState(false);

  // Caricamento soglie mediche
  useEffect(() => {
    getMedicalAlerts().then(setAlertsConfig).catch(console.error);
  }, []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    // I tre generici distinguono i valori in compilazione (default non ancora
    // applicati) da quelli che escono dalla validazione e arrivano a processLog.
  } = useForm<DailyLogFormInput, unknown, DailyLogFormData>({
    resolver: zodResolver(dailyLogSchema),
    defaultValues: {
      temperatura: 36.5,
      dolore: 0,
      sanguinamento: false,
      vomito: false,
      rifiutoCibo: false,
      nausea: false,
      note: "",
    },
  });

  const watchDolore = watch("dolore");
  const watchDoloreDeglutizione = watch("doloreDeglutizione");
  const watchQualitaSonno = watch("qualitaSonno");
  const watchStatoGenerale = watch("statoGenerale");

  // Le tre scale soggettive sono opzionali: la checkbox controlla se lo
  // slider è visibile. Alla deselezione il valore va resettato esplicitamente
  // a undefined, altrimenti l'ultimo valore trascinato resterebbe pronto per
  // l'invio anche se il genitore ha "ritirato" il dato nascondendo lo slider.
  const toggleDoloreDeglutizione = (checked: boolean) => {
    setHasDoloreDeglutizione(checked);
    setValue("doloreDeglutizione", checked ? 0 : undefined, { shouldValidate: true });
  };

  const toggleQualitaSonno = (checked: boolean) => {
    setHasQualitaSonno(checked);
    setValue("qualitaSonno", checked ? 3 : undefined, { shouldValidate: true });
  };

  const toggleStatoGenerale = (checked: boolean) => {
    setHasStatoGenerale(checked);
    setValue("statoGenerale", checked ? 3 : undefined, { shouldValidate: true });
  };

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
      await addDailyLog(activeUtente.id, user.uid, {
        ...data,
        alimentiTollerati: parseListaTesto(alimentiTolleratiText),
      });

      // Segnala al medico che c'è un nuovo log da vedere in Control Room.
      // Fallisce silenziosamente: il log clinico è già salvato, questo flag
      // è solo un'indicazione UI secondaria e non deve bloccare il flusso.
      markNuovoLogNonLetto(activeUtente.id).catch((err) =>
        console.error("Errore aggiornamento flag haNuovoLogNonLetto:", err)
      );

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

            <div className="h-px w-full bg-slate-800" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                  <UtensilsCrossed size={16} className="text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">Rifiuto del cibo</p>
                  <p className="text-[10px] text-slate-500">Il bambino ha rifiutato di mangiare</p>
                </div>
              </div>
              <Controller
                name="rifiutoCibo"
                control={control}
                render={({ field }) => (
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" className="peer sr-only" checked={field.value} onChange={field.onChange} />
                    <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-orange-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
                  </label>
                )}
              />
            </div>

            <div className="h-px w-full bg-slate-800" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-500/10">
                  <Meh size={16} className="text-lime-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">Nausea</p>
                  <p className="text-[10px] text-slate-500">Nausea senza episodi di vomito</p>
                </div>
              </div>
              <Controller
                name="nausea"
                control={control}
                render={({ field }) => (
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" className="peer sr-only" checked={field.value} onChange={field.onChange} />
                    <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-lime-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
                  </label>
                )}
              />
            </div>
          </div>

          {/* ALIMENTAZIONE E IDRATAZIONE */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-5">
            <div className="flex items-center gap-2">
              <GlassWater size={18} className="text-cyan-400" />
              <label className="text-sm font-semibold text-slate-200">Alimentazione e Idratazione</label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="log-liquidi" className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <GlassWater size={14} />
                  Bicchieri di liquidi
                </label>
                <input
                  id="log-liquidi"
                  type="number"
                  min="0"
                  max="20"
                  placeholder="—"
                  {...register("quantitaLiquidiBicchieri", {
                    setValueAs: (v) => (v === "" ? undefined : Number(v)),
                  })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-center text-lg font-bold text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {errors.quantitaLiquidiBicchieri && (
                  <p className="mt-2 text-xs text-red-400">{errors.quantitaLiquidiBicchieri.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="log-pasti" className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <Utensils size={14} />
                  Numero di pasti
                </label>
                <input
                  id="log-pasti"
                  type="number"
                  min="0"
                  max="10"
                  placeholder="—"
                  {...register("numeroPasti", {
                    setValueAs: (v) => (v === "" ? undefined : Number(v)),
                  })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-center text-lg font-bold text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {errors.numeroPasti && (
                  <p className="mt-2 text-xs text-red-400">{errors.numeroPasti.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="log-alimenti" className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Salad size={14} />
                Alimenti tollerati
              </label>
              <textarea
                id="log-alimenti"
                rows={2}
                value={alimentiTolleratiText}
                onChange={(e) => setAlimentiTolleratiText(e.target.value)}
                placeholder="Es. yogurt, purè, gelato (separati da virgola)"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="h-px w-full bg-slate-800" />

            <div>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-300">
                <input
                  type="checkbox"
                  checked={hasDoloreDeglutizione}
                  onChange={(e) => toggleDoloreDeglutizione(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-rose-500"
                />
                <Frown size={16} className="text-rose-400" />
                Ho un dato sul dolore alla deglutizione da registrare oggi
              </label>

              {hasDoloreDeglutizione && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Dolore alla deglutizione</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-sm font-bold text-rose-300">
                      {watchDoloreDeglutizione}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    {...register("doloreDeglutizione", { valueAsNumber: true })}
                    className="w-full accent-rose-500"
                  />
                  <div className="mt-2 flex justify-between text-[10px] font-medium uppercase text-slate-500">
                    <span>0 - Nessuno</span>
                    <span>5 - Moderato</span>
                    <span>10 - Massimo</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PARAMETRI CLINICI */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-5">
            <div className="flex items-center gap-2">
              <Scale size={18} className="text-emerald-400" />
              <label className="text-sm font-semibold text-slate-200">Parametri Clinici</label>
            </div>

            <div>
              <label htmlFor="log-peso" className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Scale size={14} />
                Peso di oggi (facoltativo)
              </label>
              <div className="flex items-center gap-4">
                <input
                  id="log-peso"
                  type="number"
                  step="0.1"
                  min="1"
                  max="150"
                  placeholder="—"
                  {...register("peso", {
                    setValueAs: (v) => (v === "" ? undefined : Number(v)),
                  })}
                  className="w-24 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-center text-xl font-bold text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-lg font-medium text-slate-400">kg</span>
              </div>
              {errors.peso && (
                <p className="mt-2 text-xs text-red-400">{errors.peso.message}</p>
              )}
            </div>

            <div className="h-px w-full bg-slate-800" />

            <div>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-300">
                <input
                  type="checkbox"
                  checked={hasQualitaSonno}
                  onChange={(e) => toggleQualitaSonno(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-indigo-500"
                />
                <Moon size={16} className="text-indigo-400" />
                Ho un dato sulla qualità del sonno da registrare oggi
              </label>

              {hasQualitaSonno && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Qualità del sonno</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-sm font-bold text-indigo-300">
                      {watchQualitaSonno}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    {...register("qualitaSonno", { valueAsNumber: true })}
                    className="w-full accent-indigo-500"
                  />
                  <div className="mt-2 flex justify-between text-[10px] font-medium uppercase text-slate-500">
                    <span>1 - Pessimo</span>
                    <span>3 - Nella media</span>
                    <span>5 - Ottimo</span>
                  </div>
                </div>
              )}
            </div>

            <div className="h-px w-full bg-slate-800" />

            <div>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-300">
                <input
                  type="checkbox"
                  checked={hasStatoGenerale}
                  onChange={(e) => toggleStatoGenerale(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-amber-500"
                />
                <Smile size={16} className="text-amber-400" />
                Ho un dato sullo stato generale da registrare oggi
              </label>

              {hasStatoGenerale && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Stato generale</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-sm font-bold text-amber-300">
                      {watchStatoGenerale}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    {...register("statoGenerale", { valueAsNumber: true })}
                    className="w-full accent-amber-500"
                  />
                  <div className="mt-2 flex justify-between text-[10px] font-medium uppercase text-slate-500">
                    <span>1 - Pessimo</span>
                    <span>3 - Nella media</span>
                    <span>5 - Ottimo</span>
                  </div>
                </div>
              )}
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
