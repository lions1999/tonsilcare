/**
 * @file src/components/PushNotificationManager.tsx
 * @description Componente per richiedere all'utente il permesso di inviare Notifiche Push
 * e recuperare il token FCM da salvare su Firestore.
 */

"use client";

import { useState, useEffect } from "react";
import { BellRing, Check, X, Loader2 } from "lucide-react";
// In un'app reale, qui importeremmo:
// import { getMessaging, getToken } from "firebase/messaging";
// import app from "@/lib/firebase/config";

export default function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission | "default">("default");
  const [isRequesting, setIsRequesting] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    // Controlla il permesso attuale al mount se il browser supporta le notifiche
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      alert("Il tuo browser non supporta le notifiche web.");
      return;
    }

    setIsRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        // MOCK: Generazione token fittizia per dimostrazione
        // Reale:
        // const messaging = getMessaging(app);
        // const token = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY });
        const mockToken = "fcm_token_" + Math.random().toString(36).substring(2, 15);
        setFcmToken(mockToken);
        console.log("Token FCM generato (mock):", mockToken);
        // Qui si dovrebbe salvare il token nel documento utente su Firestore
      }
    } catch (error) {
      console.error("Errore durante la richiesta permessi notifiche:", error);
    } finally {
      setIsRequesting(false);
    }
  };

  // Se i permessi sono già stati concessi o rifiutati, possiamo nascondere il banner o mostrare uno stato
  if (permission === "granted") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-teal-500/20 bg-teal-500/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-900/50 text-teal-400">
            <Check size={20} />
          </div>
          <div>
            <p className="font-semibold text-white">Notifiche attivate</p>
            <p className="text-xs text-slate-400">Riceverai promemoria per i farmaci.</p>
          </div>
        </div>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-900/50 text-red-400">
            <X size={20} />
          </div>
          <div>
            <p className="font-semibold text-white">Notifiche bloccate</p>
            <p className="text-xs text-slate-400">Abilitale nelle impostazioni del browser.</p>
          </div>
        </div>
      </div>
    );
  }

  // Se "default", mostriamo la richiesta
  return (
    <div className="rounded-2xl border border-blue-500/30 bg-blue-900/10 p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400">
          <BellRing size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-white">Attiva le Notifiche Push</h3>
          <p className="text-xs leading-relaxed text-slate-300">
            Vuoi ricevere avvisi in tempo reale per la somministrazione dei farmaci e aggiornamenti sul decorso?
          </p>
        </div>
      </div>
      
      <button
        onClick={requestPermission}
        disabled={isRequesting}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
      >
        {isRequesting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        {isRequesting ? "Richiesta in corso..." : "Consenti Notifiche"}
      </button>
    </div>
  );
}
