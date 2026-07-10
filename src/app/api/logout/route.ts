/**
 * @file src/app/api/logout/route.ts
 * @description API route per il logout — cancella il cookie di sessione.
 * Chiamata dal client dopo Firebase signOut().
 */

import { type NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest) {
  const response = NextResponse.json({ ok: true });

  // Cancella il cookie di sessione impostando la scadenza nel passato
  response.cookies.set("__session", "", {
    expires: new Date(0),
    path: "/",
    httpOnly: false,
    sameSite: "strict",
  });

  return response;
}
