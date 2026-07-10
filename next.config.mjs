// next.config.mjs
// Configurazione Next.js con next-pwa per il supporto PWA
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
  // Configurazione immagini: aggiungere domini remoti quando necessario
  images: {
    remotePatterns: [],
  },
};

export default withPWA(nextConfig);
