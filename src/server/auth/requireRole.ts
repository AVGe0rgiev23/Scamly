// Role checks: "you must be logged in, and have one of these roles".
//
//   requireRole(["family"])          -> for API routes: throws 401 / 403 (ApiError)
//   requirePageRole(["family"], ...) -> for page layouts: redirects instead
//
// This is the real role check. The proxy only checks "logged in or not" (no database
// call per request); RLS in the database is the second lock behind this one.

import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ROUTES, type AppRole } from "@/config/routes";
import { getActor, type Actor } from "@/server/auth/actor";
import { forbidden, unauthorized } from "@/server/http/errors";
import type { DbClient } from "@/server/supabase/userClient";

// The rule itself, without Supabase (so it can be unit-tested):
//   no actor            -> 401 „Моля, влезте в профила си.“
//   role not in the list -> 403 „Нямате достъп…“
export function checkRole(actor: Actor | null, allowedRoles: AppRole[]): Actor {
  if (actor === null) {
    throw unauthorized();
  }
  if (!allowedRoles.includes(actor.role)) {
    throw forbidden();
  }
  return actor;
}

// Step 1 of every protected API route (BUILD_PLAN 3).
export async function requireRole(allowedRoles: AppRole[], client?: DbClient): Promise<Actor> {
  return checkRole(await getActor(client), allowedRoles);
}

// For page layouts: a guest goes to the login page (`loginPage`), a wrong role to /403.
// redirect() stops the rendering, like raising an exception.
export async function requirePageRole(allowedRoles: AppRole[], loginPage: string): Promise<Actor> {
  // "Only at request time": the check reads the session and the clock (token expiry),
  // so Next.js must never try to render it in advance (Cache Components).
  await connection();
  const actor = await getActor();
  if (actor === null) {
    redirect(loginPage);
  }
  if (!allowedRoles.includes(actor.role)) {
    redirect(ROUTES.forbidden);
  }
  return actor;
}
