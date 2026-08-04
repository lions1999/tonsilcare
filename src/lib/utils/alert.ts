/**
 * @file src/lib/utils/alert.ts
 * @description Le condizioni di allerta clinica, in un posto solo.
 *
 * Erano scritte a mano in quattro punti con quattro definizioni diverse: la
 * Control Room guardava sanguinamento/vomito/temperatura/dolore, la scheda
 * paziente ometteva il dolore, il form del diario guardava solo temperatura e
 * sanguinamento, e la dashboard del genitore aveva 38 e 7 hardcoded al posto
 * delle soglie configurate. Divergevano senza che niente lo segnalasse.
 *
 * QUESTA RESTA UNA VALUTAZIONE *SINGLE-READING*: una singola misura fuori
 * soglia accende l'allerta. Non è il lavoro sui trend clinici (febbre
 * persistente, vomito ripetuto, peggioramento generale), che resta bloccato in
 * attesa di soglie concrete dal nutrizionista. Qui cambia solo su QUALI letture
 * si applica la stessa logica di sempre: non più il solo ultimo log, ma tutti
 * quelli delle ultime ORE_FINESTRA_ALERT ore.
 */

import type { DailyLog } from "@/lib/validations/diary";
import type { MedicalAlerts } from "@/types";

/**
 * Ampiezza della finestra di valutazione, in ore.
 *
 * Prima si guardava solo `getLatestLog`, quindi una misura rientrata cancellava
 * quella fuori soglia registrata poche ore prima: 40 °C alle 8:00 e 37 °C alle
 * 20:00 davano un paziente senza alcun alert. Invisibile con chi compila una
 * volta al giorno, evidente col primo genitore diligente.
 *
 * Finestra mobile e non giornata di calendario: a mezzanotte l'allerta delle
 * 23:50 sparirebbe da sola, cioè lo stesso bug spostato di qualche ora.
 *
 * NON è una soglia clinica e non va in /config/alerts: è per quanto tempo un
 * segnale resta visibile al medico, non quale valore è preoccupante.
 */
export const ORE_FINESTRA_ALERT = 24;

export type TipoMotivoAlert =
  | "sanguinamento"
  | "vomito"
  | "temperatura"
  | "dolore";

export interface MotivoAlert {
  tipo: TipoMotivoAlert;
  /** Temperatura in °C o dolore 0–10. Assente per i due sintomi booleani. */
  valore?: number;
  /** `createdAt` del log che l'ha generato (ISO con orario). */
  quando: string;
}

/**
 * Ordine di gravità con cui i motivi vengono presentati. I due sintomi booleani
 * per primi perché sono eventi ("è successo"), i due numerici dopo.
 */
const ORDINE_GRAVITA: TipoMotivoAlert[] = [
  "sanguinamento",
  "vomito",
  "temperatura",
  "dolore",
];

/**
 * Valuta UN log contro le soglie configurate. Sono le stesse quattro condizioni
 * di sempre; l'unica differenza è che ora hanno un nome e un valore associato,
 * perché il medico possa sapere cosa ha acceso l'allerta.
 *
 * Con `config` a null non restituisce niente: senza /config/alerts non esiste
 * una soglia da applicare, ed è il fallimento silenzioso già documentato (un
 * ambiente senza quel documento non evidenzia mai nessun paziente).
 */
export function valutaAlertLog(
  log: DailyLog,
  config: MedicalAlerts | null
): MotivoAlert[] {
  if (!config) return [];

  const motivi: MotivoAlert[] = [];
  const quando = log.createdAt;

  if (log.sanguinamento) motivi.push({ tipo: "sanguinamento", quando });
  if (log.vomito) motivi.push({ tipo: "vomito", quando });
  if (log.temperatura && log.temperatura >= config.temperaturaMaxC) {
    motivi.push({ tipo: "temperatura", valore: log.temperatura, quando });
  }
  if (log.dolore && log.dolore >= config.doloreSoglia) {
    motivi.push({ tipo: "dolore", valore: log.dolore, quando });
  }

  return motivi;
}

/**
 * Unione dei motivi su tutti i log della finestra, **deduplicata per tipo** e
 * ordinata per gravità.
 *
 * La deduplica non è cosmetica: un genitore che registra cinque volte in una
 * giornata febbrile produrrebbe cinque voci identiche, e la card diventerebbe
 * illeggibile proprio sul paziente che ha più bisogno di essere letto. Di ogni
 * tipo si tiene la lettura peggiore — la temperatura più alta, il dolore più
 * alto — e per i due booleani, che un valore non ce l'hanno, l'occorrenza più
 * recente.
 */
export function valutaAlertFinestra(
  logs: DailyLog[],
  config: MedicalAlerts | null
): MotivoAlert[] {
  const peggiorePerTipo = new Map<TipoMotivoAlert, MotivoAlert>();

  for (const log of logs) {
    for (const motivo of valutaAlertLog(log, config)) {
      const attuale = peggiorePerTipo.get(motivo.tipo);
      if (!attuale || sostituisce(motivo, attuale)) {
        peggiorePerTipo.set(motivo.tipo, motivo);
      }
    }
  }

  return ORDINE_GRAVITA.map((tipo) => peggiorePerTipo.get(tipo)).filter(
    (m): m is MotivoAlert => m !== undefined
  );
}

/** True se `candidato` va tenuto al posto di `attuale` (stesso tipo). */
function sostituisce(candidato: MotivoAlert, attuale: MotivoAlert): boolean {
  if (candidato.valore !== undefined && attuale.valore !== undefined) {
    return candidato.valore > attuale.valore;
  }
  // Sintomi booleani: nessun valore da confrontare, vince il più recente.
  return new Date(candidato.quando).getTime() > new Date(attuale.quando).getTime();
}

/**
 * Etichetta leggibile di un motivo, p.es. `40.0 °C alle 08:00` oppure
 * `Vomito ieri 22:40`.
 *
 * Il "ieri" serve: con una finestra di 24 ore, alle 07:00 di oggi un'allerta
 * "alle 08:00" è di ieri, e l'ora da sola la farebbe sembrare imminente. La
 * data completa invece non serve — dentro 24 ore le uniche possibilità sono
 * oggi e ieri.
 *
 * `createdAt` è un istante vero (ISO con orario), quindi `new Date()` è
 * corretto: le utility di `lib/utils/date.ts` servono ai campi solo-giorno
 * (`dataNascita`, `dataOperazione`) e qui non vanno usate.
 */
export function descriviMotivo(motivo: MotivoAlert, adesso: Date = new Date()): string {
  const istante = new Date(motivo.quando);
  const ora = istante.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const quando =
    istante.toDateString() === adesso.toDateString() ? `alle ${ora}` : `ieri ${ora}`;

  switch (motivo.tipo) {
    case "temperatura":
      return `${motivo.valore?.toFixed(1)} °C ${quando}`;
    case "dolore":
      return `Dolore ${motivo.valore}/10 ${quando}`;
    case "sanguinamento":
      return `Sanguinamento ${quando}`;
    case "vomito":
      return `Vomito ${quando}`;
  }
}
