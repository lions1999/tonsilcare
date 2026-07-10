/**
 * @file public/firebase-messaging-sw.js
 * @description Service Worker per la gestione in background delle notifiche Firebase Cloud Messaging (FCM).
 * In un ambiente di produzione Next.js, i parametri di configurazione andrebbero passati
 * tramite query params dal frontend al momento della registrazione, o iniettati via script di build.
 * Per semplicità qui usiamo un costrutto standard.
 */

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// NOTA: in un'app reale questi valori andrebbero letti o passati in modo dinamico per non esporli hardcoded
// sebbene in Firebase i config apiKey ecc. siano considerati pubblici.
const firebaseConfig = {
  // Sostituisci questi valori (o iniettali dinamicamente) con quelli reali del tuo .env.local
  // Esempio:
  // apiKey: new URL(location).searchParams.get("apiKey"),
  apiKey: "API_KEY_PLACEHOLDER",
  authDomain: "tonsilcare-app.firebaseapp.com",
  projectId: "tonsilcare-app",
  storageBucket: "tonsilcare-app.appspot.com",
  messagingSenderId: "SENDER_ID_PLACEHOLDER",
  appId: "APP_ID_PLACEHOLDER",
};

// Inizializza l'app Firebase nel Service Worker se l'oggetto firebase è disponibile
if (firebase && firebase.initializeApp) {
  try {
    firebase.initializeApp(firebaseConfig);

    const messaging = firebase.messaging();

    // Intercetta i messaggi push ricevuti quando l'app è in background
    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Messaggio ricevuto in background: ', payload);

      const notificationTitle = payload.notification?.title || 'Nuovo Avviso TonsilCare';
      const notificationOptions = {
        body: payload.notification?.body || 'Hai un nuovo aggiornamento sul diario clinico.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: payload.data
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } catch (error) {
    console.warn("Errore inizializzazione Firebase nel Service Worker:", error);
  }
}
