// GET /api/map/stats?weeks=4: the numbers for the public scam map (BUILD_PLAN 3, #25;
// task W3-01). Anyone, no login.
//   200 { weeks, districts: [{ districtCode, total, byScript, waves }] } for all 28
//       districts: counts of APPROVED reports only, plus "scam wave" flags (Q10)
//   400 when weeks is not a whole number from 1 to 12
//
// Caching: the answer is the same for everybody (only counts), so the CDN may keep it
// for 60 seconds ("s-maxage=60"); browsers always ask again ("max-age=0"). That's at
// most one database round per minute however many people open the map, and a
// moderator's decision shows on the map within a minute.
// It is never built in advance at `next build` time (connection() below), so the map
// never shows numbers frozen on the day of the deploy.

import { connection } from "next/server";
import { MapStatsQuerySchema } from "@/schemas/reports";
import { handleApiError } from "@/server/http/errors";
import { createMapStatsDeps, getMapStats } from "@/server/services/mapStatsService";
import { createPublicClient } from "@/server/supabase/publicClient";

const MAP_STATS_CACHE_CONTROL = "public, max-age=0, s-maxage=60";

export async function GET(request: Request) {
  // Wait for a real request: with Cache Components, a GET route that reads nothing
  // from the request could otherwise be prerendered once at build time.
  await connection();
  try {
    // 1. valid query? (searchParams is like Python's urllib.parse.parse_qs)
    const url = new URL(request.url);
    const query = MapStatsQuerySchema.parse({ weeks: url.searchParams.get("weeks") ?? undefined });
    // 2. counts + waves, as a guest (the public client, no cookies, no secret key)
    const stats = await getMapStats(createMapStatsDeps(createPublicClient()), query.weeks);
    // 3. respond, cacheable for 60 seconds by the CDN (errors stay "no-store")
    return Response.json(stats, { headers: { "Cache-Control": MAP_STATS_CACHE_CONTROL } });
  } catch (error) {
    return handleApiError(error);
  }
}
