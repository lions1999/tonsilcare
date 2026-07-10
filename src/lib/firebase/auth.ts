/**
 * @file src/lib/firebase/auth.ts
 * @description Funzioni di autenticazione Firebase (email + password).
 * Queste funzioni wrappano l'SDK Firebase Auth per un'interfaccia più pulita.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  type User,
  type UserCredential,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";

// ---------------------------------------------------------------------------
// Tipi locali
// ---------------------------------------------------------------------------

export interface SignUpData {
  email: string;
  password: string;
  nome: string;
  cognome: string;
}

export interface SignInData {
  email: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Registrazione
// ---------------------------------------------------------------------------

/**
 * Registra un nuovo genitore con email + password.
 * Crea anche il documento profilo su Firestore in /utenti/{uid}.
 */
export async function signUp({
  email,
  password,
  nome,
  cognome,
}: SignUpData): Promise<UserCredential> {
  // 1. Crea l'utente su Firebase Auth
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = credential;

  // 2. Aggiorna il displayName su Firebase Auth
  await updateProfile(user, { displayName: `${nome} ${cognome}` });

  // 3. Salva il profilo su Firestore
  await setDoc(doc(db, "utenti", user.uid), {
    uid: user.uid,
    email: user.email,
    nome,
    cognome,
    ruolo: "genitore", // Ruolo di default
    displayName: `${nome} ${cognome}`,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return credential;
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

/**
 * Effettua il login con email + password.
 */
export async function signIn({ email, password }: SignInData): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

/**
 * Disconnette l'utente corrente.
 */
export async function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}

// ---------------------------------------------------------------------------
// Reset Password
// ---------------------------------------------------------------------------

/**
 * Invia un'email di reset password.
 */
export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email, {
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Restituisce l'utente corrente (sincrono — solo se già caricato).
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}
