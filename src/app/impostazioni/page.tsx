/**
 * @file src/app/impostazioni/page.tsx
 * @description Pagina Impostazioni Profilo. Mostra i dati dell'account, i pazienti associati e il tasto Logout.
 */

"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, LogOut, User, Mail, Users, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePatient } from "@/context/PatientContext";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import PushNotificationManager from "@/components/PushNotificationManager";

export default function ImpostazioniPage() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { patients } = usePatient();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Pulizia cookie o local storage se necessario (è già gestita dall'AuthContext o middleware)
      document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      router.push("/login");
    } catch (error) {
      console.error("Errore durante il logout:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* HEADER */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800/50 bg-slate-950/90 px-4 py-4 backdrop-blur-md">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/50 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="flex items-center gap-2 text-base font-bold text-white">
          <Settings size={18} className="text-slate-400" />
          Impostazioni Profilo
        </h1>
        <div className="w-10" />
      </header>

      <main className="px-4 py-6">
        {/* SEZIONE ACCOUNT */}
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
            Account Genitore
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-4 border-b border-slate-800 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-900/50 text-blue-400">
                <User size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Nome completo</p>
                <p className="font-semibold text-white">
                  {userProfile ? `${userProfile.nome} ${userProfile.cognome}` : (user?.displayName || "Genitore")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                <Mail size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Indirizzo Email</p>
                <p className="font-semibold text-white">{userProfile?.email || user?.email || "Non disponibile"}</p>
              </div>
            </div>
          </div>
        </section>

        {/* SEZIONE PAZIENTI */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
            Pazienti Associati
          </h2>
          <div className="space-y-3">
            {patients.length > 0 ? (
              patients.map(patient => (
                <div key={patient.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-900/30 text-teal-400">
                      <Users size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{patient.nome} {patient.cognome}</p>
                      <p className="text-xs text-slate-400">
                        Operato il {new Date(patient.dataOperazione).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Nessun paziente associato a questo account.</p>
            )}
          </div>
        </section>

        {/* SEZIONE NOTIFICHE */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
            Preferenze Notifiche
          </h2>
          <PushNotificationManager />
        </section>

        {/* LOGOUT */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4 font-bold text-red-500 transition-colors hover:bg-red-500/20"
        >
          <LogOut size={20} />
          Esci dall'Account
        </button>

      </main>
    </div>
  );
}
