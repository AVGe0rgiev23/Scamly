// GET /api/push/public-key (task W2-05): what the browser needs to switch push on.
//   200 { enabled: true,  publicKey: "BEl6…" }  push is on: subscribe with this key
//   200 { enabled: false, publicKey: null }     FEATURE_PUSH is off or no VAPID keys:
//                                               hide the „Включи известията“ button
// Open to everyone: the VAPID PUBLIC key is public by design (every browser that
// subscribes gets it). The private key never leaves the server.
//
// Why a route and not a NEXT_PUBLIC_VAPID_PUBLIC_KEY variable: NEXT_PUBLIC_ values are
// copied into the JavaScript at `next build` time, so changing the key or switching
// push off on Vercel would need a new build, and we would keep the same key in two
// variables. This route reads VAPID_PUBLIC_KEY when the request comes in.

import { connection } from "next/server";
import { getFeatures } from "@/config/features";
import { getServerEnv } from "@/lib/env";
import type { PushPublicKeyDto } from "@/schemas/push";
import { handleApiError, json } from "@/server/http/errors";
import { getPushConfig } from "@/server/notifications/pushChannel";

export async function GET() {
  // Read the settings at request time, never at `next build` time.
  await connection();
  try {
    const config = getPushConfig(getServerEnv(), getFeatures());
    const body: PushPublicKeyDto =
      config === null
        ? { enabled: false, publicKey: null }
        : { enabled: true, publicKey: config.publicKey };
    return json(body);
  } catch (error) {
    return handleApiError(error);
  }
}
