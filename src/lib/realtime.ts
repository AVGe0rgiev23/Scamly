// Live updates in the browser: Supabase Realtime, with a 5-second polling fallback
// (task W2-03, decision D7). Used by Roberta's pages:
//
//   watchCheck(checkId, onCheck)          the phone after the verdict („Иван ще ви се
//                                          обади веднага“), the family's alert page
//   watchPersonChecks(personId, onChecks) the family's live list of one person's checks
//
// Both return a stop() function; call it when the page closes (React: in the cleanup
// of useEffect).
//
// How it works:
//   1. Realtime is only a DOORBELL. When the database says "this check changed" (or "a
//      new alert for you"), we fetch the fresh data from OUR API (GET /api/checks/…).
//      So the page always gets the same shape (CheckDto, Bulgarian reasons, names),
//      whether the news came through Realtime or through polling.
//   2. Realtime needs the user's access token, so RLS can decide which changes this
//      user may receive. Our session cookies are HttpOnly (JavaScript can't read them),
//      so we ask GET /api/realtime/token for it.
//   3. Until Realtime says "SUBSCRIBED", and whenever it fails, we poll our API every
//      5 seconds. Pressing the big button must reach the family even on a network that
//      blocks WebSockets.
//
// The token and the client: supabase-js gives Realtime an `accessToken` function and
// asks it again on every heartbeat (every 25 s). A plain browser client would answer
// with the session it doesn't have (our cookies are HttpOnly), i.e. the publishable
// key, and that would REPLACE a token set once with realtime.setAuth(token). So we
// create the client with our own `accessToken` function: it returns the token from
// our API and fetches a new one shortly before the old one expires. supabase-js then
// calls realtime.setAuth(token) with it (and we call setAuth() once ourselves before
// subscribing, so the first join already carries the token).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/publicEnv";
import type { CheckDto, RealtimeTokenDto } from "@/schemas/checks";
import type { Database } from "@/types/database";

// How often we ask our API while Realtime is not connected.
export const POLL_INTERVAL_MS = 5_000;

// Fetch a new token this many seconds before the old one expires.
export const TOKEN_REFRESH_MARGIN_SECONDS = 60;

// ---------------------------------------------------------------------------------
// The access token
// ---------------------------------------------------------------------------------

// True when we have no token yet, or it expires within the next minute.
// expiresAt is in seconds (like Python's time.time()), nowMs in milliseconds.
export function tokenNeedsRefresh(token: RealtimeTokenDto | null, nowMs: number): boolean {
  if (token === null) {
    return true;
  }
  return token.expiresAt - TOKEN_REFRESH_MARGIN_SECONDS <= nowMs / 1000;
}

// GET from our own API. `cache: "no-store"`: always ask the server, never the cache.
async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`GET ${url} failed with status ${response.status}`);
  }
  return response.json();
}

// One token for the whole page (a module-level variable, like a Python module global).
let currentToken: RealtimeTokenDto | null = null;

async function getToken(): Promise<RealtimeTokenDto> {
  if (currentToken === null || tokenNeedsRefresh(currentToken, Date.now())) {
    // `as`: we trust the shape of our own API's answer (a type hint, no runtime check).
    currentToken = (await getJson("/api/realtime/token")) as RealtimeTokenDto;
  }
  return currentToken;
}

// One Supabase client for the whole page, made on first use. It is ONLY used for
// Realtime: every read and write still goes through our API (BUILD_PLAN section 0).
let realtimeClient: SupabaseClient<Database> | null = null;

function getRealtimeClient(): SupabaseClient<Database> {
  if (realtimeClient === null) {
    const env = getPublicEnv();
    realtimeClient = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      accessToken: async () => (await getToken()).accessToken,
    });
  }
  return realtimeClient;
}

// ---------------------------------------------------------------------------------
// The live-watch logic (no Supabase in it, so it can be unit-tested)
// ---------------------------------------------------------------------------------

// connect(onChange, onConnected) opens the Realtime subscription and returns a function
// that closes it. It calls onChange() for every database change and onConnected(true /
// false) whenever the connection is up or down.
export type LiveWatchParts = {
  refresh: () => Promise<void>; // load the data from our API and hand it to the page
  connect: (onChange: () => void, onConnected: (connected: boolean) => void) => Promise<() => void>;
  pollMs: number;
  onError: (error: unknown) => void;
};

export function startLiveWatch(parts: LiveWatchParts): () => void {
  let stopped = false;
  // ReturnType<typeof setInterval> = "whatever setInterval returns" (a number in the
  // browser, an object in Node.js).
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let disconnect: (() => void) | null = null;

  function refreshNow(): void {
    parts.refresh().catch(parts.onError);
  }
  function startPolling(): void {
    if (pollTimer === null && !stopped) {
      pollTimer = setInterval(refreshNow, parts.pollMs);
    }
  }
  function stopPolling(): void {
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  // Show the current state at once, and poll until Realtime is confirmed.
  refreshNow();
  startPolling();

  parts
    .connect(refreshNow, (connected) => {
      if (connected) {
        stopPolling();
        refreshNow(); // catch anything that changed while we were connecting
      } else {
        startPolling();
      }
    })
    .then((close) => {
      if (stopped) {
        close();
      } else {
        disconnect = close;
      }
    })
    .catch((error: unknown) => {
      // No token or no Realtime: polling simply goes on.
      parts.onError(error);
    });

  return () => {
    stopped = true;
    stopPolling();
    if (disconnect !== null) {
      disconnect();
    }
  };
}

// ---------------------------------------------------------------------------------
// The Realtime part
// ---------------------------------------------------------------------------------

// One kind of database change to listen to. The filter uses PostgREST syntax,
// e.g. "id=eq.<uuid>". RLS still decides whether this user receives it.
type Watch = {
  table: "checks" | "alerts";
  event: "*" | "INSERT" | "UPDATE";
  filter: string;
};

// Every channel needs its own name.
let channelCounter = 0;

// Builds a `connect` function for startLiveWatch. `makeWatches` gets the token first,
// because the alerts filter needs the user's id.
function realtimeConnector(
  name: string,
  makeWatches: (token: RealtimeTokenDto) => Watch[],
): LiveWatchParts["connect"] {
  return async (onChange, onConnected) => {
    const token = await getToken();
    const supabase = getRealtimeClient();
    await supabase.realtime.setAuth(); // load our token before the channel joins

    channelCounter += 1;
    const channel = supabase.channel(`${name}:${channelCounter}`);
    for (const watch of makeWatches(token)) {
      channel.on(
        "postgres_changes",
        { event: watch.event, schema: "public", table: watch.table, filter: watch.filter },
        () => onChange(),
      );
    }
    // status: "SUBSCRIBED", "TIMED_OUT", "CLOSED" or "CHANNEL_ERROR".
    channel.subscribe((status) => onConnected(status === "SUBSCRIBED"));

    return () => {
      void supabase.removeChannel(channel);
    };
  };
}

// ---------------------------------------------------------------------------------
// What the pages use
// ---------------------------------------------------------------------------------

// One check, live. For the phone ("has somebody acknowledged?") and the family.
export function watchCheck(
  checkId: string,
  onCheck: (check: CheckDto) => void,
  onError: (error: unknown) => void = () => undefined,
): () => void {
  return startLiveWatch({
    refresh: async () => {
      const body = (await getJson(`/api/checks/${encodeURIComponent(checkId)}`)) as {
        check: CheckDto;
      };
      onCheck(body.check);
    },
    connect: realtimeConnector(`check:${checkId}`, () => [
      { table: "checks", event: "UPDATE", filter: `id=eq.${checkId}` },
    ]),
    pollMs: POLL_INTERVAL_MS,
    onError,
  });
}

// The newest checks of one person, live (family only). A new check, its verdict and
// „Обаждам ѝ се сега“ all arrive as changes of the checks table; a new alert addressed
// to this family member rings the doorbell too.
export function watchPersonChecks(
  personId: string,
  onChecks: (checks: CheckDto[]) => void,
  onError: (error: unknown) => void = () => undefined,
): () => void {
  return startLiveWatch({
    refresh: async () => {
      const body = (await getJson(`/api/checks?personId=${encodeURIComponent(personId)}`)) as {
        checks: CheckDto[];
      };
      onChecks(body.checks);
    },
    connect: realtimeConnector(`person:${personId}`, (token) => [
      { table: "checks", event: "*", filter: `protected_person_id=eq.${personId}` },
      { table: "alerts", event: "INSERT", filter: `recipient_id=eq.${token.userId}` },
    ]),
    pollMs: POLL_INTERVAL_MS,
    onError,
  });
}
