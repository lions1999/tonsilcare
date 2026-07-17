/**
 * @file src/proxy.ts
 * @description Proxy Next.js 16 per la protezione delle route.
 *
 * LOGICA:
 * - Route protette: redirect a /login se cookie __session assente
 * - Route auth: redirect a / se cookie __session presente
 *
 * NOTA: gira in Edge Runtime — non può usare Firebase Auth SDK direttamente.
 * Usiamo il cookie __session impostato dal client dopo il login.
 */

import { type NextRequest, NextResponse } from "next/server";

/** Route che richiedono autenticazione */
const PROTECTED_ROUTES = ["/", "/diario", "/ricette", "/info", "/utenti", "/impostazioni", "/studio"];

/** Route solo per utenti NON autenticati */
const AUTH_ROUTES = ["/login", "/registrazione"];

/** Prefissi da ignorare (assets, api, ecc.) */
const PUBLIC_PREFIXES = [
  "/_next",
  "/api",
  "/icons",
  "/manifest.json",
  "/offline",
  "/favicon.ico",
];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignora assets e route pubbliche
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Legge il cookie di sessione Firebase
  const sessionCookie = request.cookies.get("__session")?.value;
  const isAuthenticated = Boolean(sessionCookie);

  // Utente NON autenticato → tenta di accedere a route protetta
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (!isAuthenticated && isProtected) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Utente autenticato → tenta di accedere a login/registrazione
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // -------------------------------------------------------------------------
  // RBAC (Role-Based Access Control)
  // -------------------------------------------------------------------------
  
  const userRole = request.cookies.get("__role")?.value;
  const isMedico = userRole === "medico";
  const isStudioRoute = pathname.startsWith("/studio");

  // Se è un medico e tenta di accedere alla dashboard genitore (/) -> redirect a /studio
  if (isAuthenticated && isMedico && pathname === "/") {
    return NextResponse.redirect(new URL("/studio", request.url));
  }

  // Se è un genitore e tenta di accedere a /studio -> redirect a /
  if (isAuthenticated && !isMedico && isStudioRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
