/**
 * @file src/context/AuthContext.tsx
 * @description Context React per l'autenticazione Firebase.
 *
 * Fornisce:
 * - `user`           → utente Firebase Auth corrente (o null)
 * - `accountProfile` → profilo Firestore dell'account (genitore/medico)
 * - `loading`        → true mentre Firebase risolve lo stato auth iniziale
 * - `signOut`        → funzione di logout
 *
 * Utilizzo:
 * ```tsx
 * const { user, loading } = useAuth();
 * ```
 */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/config";
import { signOut as firebaseSignOut } from "@/lib/firebase/auth";
import { getAccountProfile } from "@/lib/firebase/firestore";
import type { AccountProfile } from "@/types";

// ---------------------------------------------------------------------------
// Tipo del context
// ---------------------------------------------------------------------------

interface AuthContextValue {
  /** Utente Firebase Auth (null = non loggato, undefined = caricamento) */
  user: User | null;
  /** Profilo account da Firestore */
  accountProfile: AccountProfile | null;
  /** True mentre Firebase risolve lo stato di autenticazione iniziale */
  loading: boolean;
  /**
   * True quando esiste una sessione valida ma il profilo — e quindi il ruolo —
   * non è disponibile: fetch fallita, oppure documento `accounts/{uid}`
   * inesistente. Sono due strade diverse allo stesso punto cieco: senza ruolo
   * l'app non può decidere che interfaccia mostrare, e indovinare significa
   * mostrarne una sbagliata con l'aria di essere quella giusta.
   */
  profiloNonDisponibile: boolean;
  /** Ritenta il caricamento del profilo per l'utente corrente */
  ricaricaProfilo: () => Promise<void>;
  /** Effettua il logout e reindirizza alla pagina di login */
  signOut: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profiloNonDisponibile, setProfiloNonDisponibile] = useState(false);

  const pulisciCookieRuolo = () => {
    document.cookie = `__role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict; Secure`;
  };

  /**
   * Carica il profilo dell'account e allinea il cookie __role.
   *
   * Estratta dal listener perché serve anche al retry manuale: un errore di
   * rete non deve costringere l'utente a rifare il login.
   *
   * Nota: `getAccountProfile` non lancia se il documento non esiste, restituisce
   * `null`. Ai fini di questa app i due casi sono lo stesso problema — nessun
   * ruolo — quindi convergono entrambi su `profiloNonDisponibile`.
   */
  const caricaProfilo = useCallback(async (uid: string) => {
    try {
      const profile = await getAccountProfile(uid);
      setAccountProfile(profile);

      if (profile?.ruolo) {
        setProfiloNonDisponibile(false);
        document.cookie = `__role=${profile.ruolo}; path=/; SameSite=Strict; Secure`;
      } else {
        setProfiloNonDisponibile(true);
        pulisciCookieRuolo();
      }
    } catch (error) {
      console.error("[AuthContext] Errore caricamento profilo:", error);
      setAccountProfile(null);
      setProfiloNonDisponibile(true);
      pulisciCookieRuolo();
    }
  }, []);

  useEffect(() => {
    /**
     * onAuthStateChanged si attiva ogni volta che lo stato auth cambia:
     * - All'avvio dell'app (risolve la sessione persistente)
     * - Dopo login / logout
     */
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // `setLoading(false)` resta dopo l'await: finché il profilo non è
        // risolto lo stato è "in caricamento", mai "caricato senza ruolo".
        await caricaProfilo(firebaseUser.uid);
      } else {
        setAccountProfile(null);
        setProfiloNonDisponibile(false);
        pulisciCookieRuolo();
      }

      setLoading(false);
    });

    // Cleanup: disiscrivi il listener quando il componente smonta
    return () => unsubscribe();
  }, [caricaProfilo]);

  /**
   * Ritenta il caricamento del profilo. Non tocca `loading`: quello stato
   * significa "sto risolvendo l'autenticazione" e nasconde ogni chrome, mentre
   * qui l'utente è già davanti a una schermata di errore che gestisce da sé
   * l'indicazione di attesa.
   */
  const ricaricaProfilo = useCallback(async () => {
    if (!user) return;
    await caricaProfilo(user.uid);
  }, [user, caricaProfilo]);

  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    // 1. Logout da Firebase Auth
    await firebaseSignOut();
    // 2. Cancella il cookie di sessione tramite l'API route
    await fetch("/api/logout", { method: "POST" });
    // 3. Pulisci lo stato locale e i cookie
    setUser(null);
    setAccountProfile(null);
    setProfiloNonDisponibile(false);
    pulisciCookieRuolo();
    // 4. Redirect al login
    router.push("/login");
    router.refresh();
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accountProfile,
        loading,
        profiloNonDisponibile,
        ricaricaProfilo,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook per accedere al context Auth.
 * Lancia un errore se usato fuori dall'AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve essere usato all'interno di <AuthProvider>");
  }
  return context;
}
