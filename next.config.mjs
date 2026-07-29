// next.config.mjs
// Configurazione Next.js con next-pwa per il supporto PWA
//
// NOTA: next-pwa genera il Service Worker come plugin webpack, quindi gira
// SOLO se il build usa webpack. In Next.js 16 il bundler di default è
// Turbopack anche per `next build`: con Turbopack la config di next-pwa
// viene ignorata in silenzio (build "riuscito", ma nessun public/sw.js).
// Per questo lo script di build in package.json passa `--webpack`.
// Se un giorno si toglie quel flag, la PWA smette di funzionare senza errori:
// verificare sempre che `npm run build` produca public/sw.js.
//
// In sviluppo next-pwa è disabilitato (vedi `disable` sotto), quindi `next dev`
// può continuare a usare Turbopack senza problemi.

import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",          // Cartella di output per sw.js e workbox
  register: true,          // Registra automaticamente il service worker
  skipWaiting: true,       // Il nuovo SW prende il controllo immediatamente
  disable: process.env.NODE_ENV === "development", // Disabilita in dev per evitare cache
  fallbacks: {
    // Pagina di fallback quando si è offline
    document: "/offline",
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Silenzia l'avviso di Turbopack in sviluppo
  // (next-pwa opera solo in produzione — vedi disable: dev above)
  turbopack: {},
  // Configurazione immagini: aggiungere domini remoti quando necessario
  images: {
    remotePatterns: [],
  },
};

export default withPWA(nextConfig);
