// next.config.mjs
// Configurazione Next.js con next-pwa per il supporto PWA
//
// NOTA: next-pwa usa webpack per generare il Service Worker.
// In Next.js 16+ con Turbopack come default, è necessario disabilitarlo
// esplicitamente per compatibilità con next-pwa.
// In produzione (next build) webpack viene usato automaticamente.

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
