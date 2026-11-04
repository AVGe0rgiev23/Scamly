// The Realtime access token (GET /api/realtime/token, task W2-03).
//
// Why this exists: our login cookies are HttpOnly, so JavaScript in the browser can't
// read the session (an XSS bug can't steal it). But Supabase Realtime runs IN the
// browser and needs the user's access token, so RLS can decide which live changes
// this user may receive. So the page asks our server for the token.
//
// Trade-off (documented in HOW_IT_WORKS): the page's JavaScript now sees the
// short-lived ACCESS token (valid about 1 hour). The REFRESH token, which could keep a
// session alive for weeks, stays in the HttpOnly cookie and is never sent to the page.
//
// The route first checks the caller with the Auth server (requireRole -> getUser()),
// then reads the session from the cookies. This function makes sure both belong to
// the same account before it hands out anything.

import "server-only";
import type { RealtimeTokenDto } from "@/schemas/checks";
import type { Actor } from "@/server/auth/actor";
import { unauthorized } from "@/server/http/errors";

// The parts of a Supabase session we need (like a small Python dataclass).
export type SessionInfo = {
  userId: string;
  accessToken: string;
  expiresAt: number | undefined; // seconds since 1970
};

export function issueRealtimeToken(actor: Actor, session: SessionInfo | null): RealtimeTokenDto {
  // No session in the cookies, a session of another account, or no expiry: refuse.
  if (session === null || session.userId !== actor.userId || session.expiresAt === undefined) {
    throw unauthorized();
  }
  return {
    userId: actor.userId,
    accessToken: session.accessToken,
    expiresAt: session.expiresAt,
  };
}
