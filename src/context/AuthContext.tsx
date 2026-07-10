/**
 * @file src/context/AuthContext.tsx
 * @description Context React per l'autenticazione Firebase.
 *
 * Fornisce:
 * - `user`           → utente Firebase Auth corrente (o null)
 * - `userProfile`    → profilo Firestore del genitore
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
import { getUserProfile, type UserProfile } from "@/lib/firebase/firestore";

// ---------------------------------------------------------------------------
// Tipo del context
// ---------------------------------------------------------------------------

interface AuthContextValue {
  /** Utente Firebase Auth (null = non loggato, undefined = caricamento) */
  user: User | null;
  /** Profilo genitore da Firestore */
  userProfile: UserProfile | null;
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
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
        // Carica il profilo Firestore del genitore
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error("[AuthContext] Errore caricamento profilo:", error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
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
    // 3. Pulisci lo stato locale
    setUser(null);
    setUserProfile(null);
    // 4. Redirect al login
    router.push("/login");
    router.refresh();
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
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
