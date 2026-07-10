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

  useEffect(() => {
    /**
     * onAuthStateChanged si attiva ogni volta che lo stato auth cambia:
     * - All'avvio dell'app (risolve la sessione persistente)
     * - Dopo login / logout
     */
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Carica il profilo Firestore dell'account
        try {
          const profile = await getAccountProfile(firebaseUser.uid);
          setAccountProfile(profile);
          
          // Imposta il cookie __role per il middleware
          if (profile?.ruolo) {
            document.cookie = `__role=${profile.ruolo}; path=/; SameSite=Strict; Secure`;
          }
        } catch (error) {
          console.error("[AuthContext] Errore caricamento profilo:", error);
          setAccountProfile(null);
          document.cookie = `__role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict; Secure`;
        }
      } else {
        setAccountProfile(null);
        // Pulisci il cookie __role se l'utente non è loggato
        document.cookie = `__role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict; Secure`;
      }

      setLoading(false);
    });

    // Cleanup: disiscrivi il listener quando il componente smonta
    return () => unsubscribe();
  }, []);

  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    // 1. Logout da Firebase Auth
    await firebaseSignOut();
    // 2. Cancella il cookie di sessione tramite l'API route
    await fetch("/api/logout", { method: "POST" });
    // 3. Pulisci lo stato locale e i cookie
    setUser(null);
    setAccountProfile(null);
    document.cookie = `__role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict; Secure`;
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
