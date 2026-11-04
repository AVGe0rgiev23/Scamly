// The ADMIN Supabase client: uses the service-role (secret) key, which BYPASSES RLS.
//
// "server-only" makes the build fail if a browser component ever imports this file,
// so the secret key can never be sent to a phone.
//
// ALLOWED USES (BUILD_PLAN 2.4). Use it ONLY in these places, and only after the
// permission check in code (where the caller is logged in, load the target with the
// USER client first, so RLS proves they may see it):
//   1. pairingService.redeem(): create the device's auth user, set its role, bind it
//      (also pairingService.createCode(): pairing_codes has no browser access at all)
//   2. pairingService.revokeDevice() (deviceService.revoke() in BUILD_PLAN):
//      delete the device's auth user
//   3. checkService.start() / submitAnswers(): store the server-computed verdict (Week 2)
//   4. alertService.fanOut(): alert rows for other users, push and e-mail (Week 2)
//   4b. checkService.acknowledge(): write acknowledged_by on the check (Week 2)
//   5. reportService.submit(): anonymous guest reports (Week 3)
//   6. adminService.changeRole() and writing the audit_log
//   7. the rate limiter (src/server/security/rateLimit.ts): hit_rate_limit()
// (BUILD_PLAN 2.4 also listed 8. GET /api/health. It does NOT need this client: it
// reads the public districts table with the publishable key; see HOW_IT_WORKS 3.22.)
// Anything else must use the user client (userClient.ts).

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import type { DbClient } from "@/server/supabase/userClient";
import type { Database } from "@/types/database";

export function createAdminClient(): DbClient {
  const env = getServerEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    // The server never "logs in" with this client, so it keeps no session.
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
