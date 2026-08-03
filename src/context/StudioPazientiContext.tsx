/**
 * @file src/context/StudioPazientiContext.tsx
 * @description Stato condiviso della Control Room: lista pazienti, triage,
 * ricerca e filtri.
 *
 * Perché un provider e non lo stato dentro la pagina: nel layout a due pannelli
 * lista e dettaglio sono montati insieme, e ognuno leggerebbe da Firestore lo
 * stesso paziente. Sollevando la lista qui la lettura è una sola, e soprattutto
 * la lista sopravvive alla navigazione tra un paziente e l'altro.
 *
 * Da quella persistenza nasce anche il motivo di `segnaLetto`: prima, aprire un
 * paziente e tornare indietro rimontava la Control Room, che rileggeva tutto e
 * quindi mostrava il flag "novità" già azzerato. Con la lista persistente quel
 * rimontaggio non avviene più, e senza un aggiornamento esplicito il badge
 * resterebbe acceso su un paziente già letto.
 */

"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getAllUtenti,
  getLatestLog,
  getMedicalAlerts,
} from "@/lib/firebase/firestore";
import { parseDataLocale } from "@/lib/utils/date";
import { calcolaStatoFase, faseDiStato } from "@/lib/utils/fase";
import { useFasi } from "@/hooks/useFasi";
import type { UtenteWithStatus } from "@/components/studio/PazienteCard";
import type { QuickFilterType } from "@/components/studio/SearchAndFilterBar";
import type { PostOpPhase, PostOpPhaseConfig, UtenteProfile } from "@/types";

// ---------------------------------------------------------------------------
// Tipo del context
// ---------------------------------------------------------------------------

interface StudioPazientiContextValue {
  /** Pazienti in ordine di triage. L'ordine è stabile: vedi nota in fondo. */
  pazienti: UtenteWithStatus[];
  /** Pazienti dopo ricerca e filtri, nello stesso ordine. */
  pazientiFiltrati: UtenteWithStatus[];
  loading: boolean;

  /**
   * Le fasi configurate, per le voci del filtro "per fase". Vengono da qui e non
   * da un elenco scritto a mano nella barra dei filtri: il filtro confronta la
   * fase DERIVATA da questi stessi intervalli, e due liste separate potrebbero
   * offrire una fase che non esiste più o nasconderne una nuova.
   */
  fasi: PostOpPhaseConfig[];

  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filterType: QuickFilterType;
  setFilterType: (v: QuickFilterType) => void;
  selectedFase: PostOpPhase | null;
  setSelectedFase: (v: PostOpPhase | null) => void;
  resetFilters: () => void;

  /**
   * Aggiornamento ottimistico dopo che il medico ha aperto la scheda di un
   * paziente: spegne `haNuovoLogNonLetto` nello stato locale, senza rileggere
   * da Firestore. Badge e filtro "Con novità" si adeguano subito perché
   * derivano da questo stato.
   */
  segnaLetto: (utenteId: string) => void;

  /**
   * Applica alla lista i campi appena scritti su un paziente. È la forma
   * generale del bisogno che `segnaLetto` copre per il solo flag "novità": la
   * lista non si rimonta più tra un paziente e l'altro, quindi qualunque
   * scrittura fatta dal pannello di destra resta invisibile a sinistra finché
   * non si ricarica la pagina.
   *
   * Serve in particolare all'override della fase: senza, il filtro "per fase"
   * continuava a derivare la fase dal documento vecchio, e un paziente forzato
   * in Fase 2 compariva sotto Fase 3 mentre la sua scheda diceva Fase 2.
   */
  aggiornaPaziente: (utenteId: string, patch: Partial<UtenteProfile>) => void;
}

const StudioPazientiContext = createContext<
  StudioPazientiContextValue | undefined
>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function StudioPazientiProvider({ children }: { children: ReactNode }) {
  const [pazienti, setPazienti] = useState<UtenteWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const { fasi, loading: fasiLoading } = useFasi();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<QuickFilterType>("tutti");
  const [selectedFase, setSelectedFase] = useState<PostOpPhase | null>(null);

  useEffect(() => {
    let annullato = false;

    async function caricaPazienti() {
      try {
        const [allUtenti, alertsConfig] = await Promise.all([
          getAllUtenti(),
          getMedicalAlerts(),
        ]);

        const conStato = await Promise.all(
          allUtenti.map(async (utente) => {
            const latestLog = await getLatestLog(utente.id);

            // Logica Triage (Alert) — invariata
            let hasAlert = false;
            if (latestLog && alertsConfig) {
              const { temperatura, dolore, sanguinamento, vomito } = latestLog;
              if (
                sanguinamento ||
                vomito ||
                (temperatura && temperatura >= alertsConfig.temperaturaMaxC) ||
                (dolore && dolore >= alertsConfig.doloreSoglia)
              ) {
                hasAlert = true;
              }
            }

            return { ...utente, latestLog, hasAlert };
          })
        );

        // Ordinamento: alert, poi novità, poi ultimo aggiornamento decrescente.
        // Calcolato QUI, una volta sola, e non in un useMemo sui dati: se
        // l'ordine si ricalcolasse a ogni cambio di stato, spegnere il flag
        // "novità" farebbe saltare la riga del paziente proprio mentre il
        // medico la sta leggendo. L'ordine si aggiorna al prossimo caricamento.
        conStato.sort((a, b) => {
          if (a.hasAlert !== b.hasAlert) return a.hasAlert ? -1 : 1;
          if (!!a.haNuovoLogNonLetto !== !!b.haNuovoLogNonLetto)
            return a.haNuovoLogNonLetto ? -1 : 1;
          const recency = (u: UtenteWithStatus) =>
            u.latestLog?.createdAt
              ? new Date(u.latestLog.createdAt).getTime()
              : parseDataLocale(u.dataOperazione).getTime();
          return recency(b) - recency(a);
        });

        if (!annullato) setPazienti(conStato);
      } catch (error) {
        console.error("Errore nel caricamento della Control Room", error);
      } finally {
        if (!annullato) setLoading(false);
      }
    }

    caricaPazienti();

    return () => {
      annullato = true;
    };
  }, []);

  const pazientiFiltrati = useMemo(() => {
    return pazienti.filter((u) => {
      const matchesSearch = `${u.nome} ${u.cognome}`
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase());
      if (!matchesSearch) return false;

      if (filterType === "allerta") return u.hasAlert;
      if (filterType === "novita") return !!u.haNuovoLogNonLetto;
      if (filterType === "fase") {
        if (!selectedFase) return true;
        // La fase si deriva qui, non si legge dal documento: `faseAttualeId` era
        // scritto alla creazione e mai aggiornato, quindi filtrare su quel campo
        // significava selezionare i pazienti in base a dove si trovavano il
        // giorno dell'iscrizione. Un paziente in pre-operatorio o a percorso
        // concluso non ha una fase e resta fuori da qualsiasi selezione.
        return faseDiStato(calcolaStatoFase(u, fasi))?.id === selectedFase;
      }
      return true;
    });
  }, [pazienti, searchQuery, filterType, selectedFase, fasi]);

  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setFilterType("tutti");
    setSelectedFase(null);
  }, []);

  const segnaLetto = useCallback((utenteId: string) => {
    setPazienti((precedenti) =>
      precedenti.map((u) =>
        u.id === utenteId && u.haNuovoLogNonLetto
          ? { ...u, haNuovoLogNonLetto: false }
          : u
      )
    );
  }, []);

  const aggiornaPaziente = useCallback(
    (utenteId: string, patch: Partial<UtenteProfile>) => {
      setPazienti((precedenti) =>
        precedenti.map((u) => (u.id === utenteId ? { ...u, ...patch } : u))
      );
    },
    []
  );

  const value = useMemo<StudioPazientiContextValue>(
    () => ({
      pazienti,
      pazientiFiltrati,
      loading: loading || fasiLoading,
      fasi,
      searchQuery,
      setSearchQuery,
      filterType,
      setFilterType,
      selectedFase,
      setSelectedFase,
      resetFilters,
      segnaLetto,
      aggiornaPaziente,
    }),
    [
      pazienti,
      pazientiFiltrati,
      loading,
      fasiLoading,
      fasi,
      searchQuery,
      filterType,
      selectedFase,
      resetFilters,
      segnaLetto,
      aggiornaPaziente,
    ]
  );

  return (
    <StudioPazientiContext.Provider value={value}>
      {children}
    </StudioPazientiContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useStudioPazienti(): StudioPazientiContextValue {
  const context = useContext(StudioPazientiContext);
  if (context === undefined) {
    throw new Error(
      "useStudioPazienti deve essere usato all'interno di <StudioPazientiProvider>"
    );
  }
  return context;
}
