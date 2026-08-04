/**
 * @file src/app/layout.tsx
 * @description Root Layout dell'applicazione TonsilCare.
 *
 * Responsabilità:
 * - Caricamento font Inter da Google Fonts
 * - Metadati SEO e PWA (manifest, theme-color)
 * - Viewport mobile-first
 * - Struttura base: header + contenuto scrollabile + bottom nav fissa
 */

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { AuthProvider } from "@/context/AuthContext";
import { UtenteProvider } from "@/context/UtenteContext";

// ---------------------------------------------------------------------------
// Font — Inter con subset latin
// ---------------------------------------------------------------------------
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// ---------------------------------------------------------------------------
// Metadati SEO & PWA
// ---------------------------------------------------------------------------
export const metadata: Metadata = {
  // --- SEO Base ---
  title: {
    default: "TonsilCare — Supporto Post-Tonsillectomia",
    template: "%s | TonsilCare",
  },
  description:
    "App di supporto domiciliare per genitori di pazienti pediatrici post-tonsillectomia. Monitoraggio parametri vitali, piani alimentari e diario clinico.",
  keywords: [
    "tonsillectomia",
    "post-operatorio",
    "pediatria",
    "supporto domiciliare",
    "parametri vitali",
    "piano alimentare",
  ],
  authors: [{ name: "TonsilCare Team" }],

  // --- PWA ---
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TonsilCare",
  },

  // --- Open Graph (condivisione social) ---
  openGraph: {
    title: "TonsilCare — Supporto Post-Tonsillectomia",
    description:
      "Monitora il recupero del tuo bambino con TonsilCare: parametri vitali, piani alimentari e diario clinico.",
    type: "website",
    locale: "it_IT",
    siteName: "TonsilCare",
  },

  // --- Icons ---
  icons: {
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    icon: [
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
  },
};

// ---------------------------------------------------------------------------
// Viewport — Mobile-first con supporto safe area (notch iPhone)
// ---------------------------------------------------------------------------
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
    { media: "(prefers-color-scheme: light)", color: "#1d4ed8" },
  ],
  width: "device-width",
  initialScale: 1,
  // `maximumScale: 1` e `userScalable: false` erano qui per un effetto
  // "app nativa", ma impediscono all'utente di ingrandire la pagina: su
  // un'app che mostra parametri clinici a genitori e medici è una barriera
  // di accessibilità, non una rifinitura. Rimossi.
  viewportFit: "cover",  // Contenuto sotto la notch
};

// ---------------------------------------------------------------------------
// Root Layout
// ---------------------------------------------------------------------------
interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="it" className={`${inter.variable} dark`}>
      <head>
        {/*
          Meta tag aggiuntivi per iOS PWA standalone:
          - apple-mobile-web-app-capable: nasconde la barra del browser
          - format-detection: previene l'autolink di numeri telefonici
        */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="font-sans bg-slate-950 text-slate-100">
        <AuthProvider>
          <UtenteProvider>
            {/*
              La struttura del guscio (bottom nav su mobile, barra in alto su
              desktop per entrambi i ruoli) dipende dallo stato di
              autenticazione, che è disponibile solo lato client: vive quindi in
              AppShell e non qui, dove siamo in un server component.
            */}
            <AppShell>{children}</AppShell>
          </UtenteProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
