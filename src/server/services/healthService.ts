// The health check behind GET /api/health (BUILD_PLAN 3, #1; W1-13).
//
// It answers one question: "is the app running AND can it reach the database?"
// Two callers use it:
//   - the keep-alive workflow (.github/workflows/keep-alive.yml) every 12 hours, so the
//     free Supabase project sees activity and is not paused (BUILD_PLAN R1);
//   - an uptime monitor, if we add one, to e-mail us when the site is down.
//
// The service gets its database query and its clock as "dependencies" (deps), like
// the other services. The real route passes the real ones; the unit tests pass
// fakes, so no network is needed (dependency injection).

import "server-only";

// What the route needs to give the service. Like a Python Protocol with two methods.
export type HealthDeps = {
  // Runs one cheap real query; throws when the database can't be reached.
  pingDatabase: () => Promise<void>;
  // The current time (a fake clock in tests).
  now: () => Date;
};

// The JSON body of the answer. The `|` means "one of these two shapes"
// (like `Healthy | Unhealthy` with two dataclasses in Python).
//   healthy   -> 200 { ok: true, db: true, time: "2026-11-09T10:00:00.000Z" }
//   unhealthy -> 503 { ok: false, db: false }
// The unhealthy body never says WHY: error texts could reveal hosts or settings.
export type HealthResult = { ok: true; db: true; time: string } | { ok: false; db: false };

export async function checkHealth(deps: HealthDeps): Promise<HealthResult> {
  try {
    await deps.pingDatabase();
  } catch (error) {
    // Only for our server log (Vercel → Logs), never for the caller. Only the error's
    // name and message: the query sends no keys, so they can't contain secrets.
    const description = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error("[health] database check failed:", description);
    return { ok: false, db: false };
  }
  return { ok: true, db: true, time: deps.now().toISOString() };
}
