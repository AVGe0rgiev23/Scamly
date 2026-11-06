// Unit tests for the live-watch logic of src/lib/realtime.ts: Realtime when it works,
// polling every 5 seconds when it doesn't, a safety poll every 10 seconds even when it
// does, and a load when the page wakes up. Realtime itself is replaced by a fake
// `connect`, and vi.useFakeTimers() lets the test move the clock by hand.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  newestFirst,
  POLL_INTERVAL_MS,
  SAFETY_POLL_INTERVAL_MS,
  startLiveWatch,
  tokenNeedsRefresh,
  type LiveWatchParts,
} from "@/lib/realtime";

describe("tokenNeedsRefresh", () => {
  const expiresAt = 1_800_000_000; // seconds

  it("asks for a token when there is none", () => {
    expect(tokenNeedsRefresh(null, 0)).toBe(true);
  });

  it("keeps a token until one minute before it expires", () => {
    const token = { userId: "u", accessToken: "t", expiresAt };
    expect(tokenNeedsRefresh(token, (expiresAt - 61) * 1000)).toBe(false);
    expect(tokenNeedsRefresh(token, (expiresAt - 60) * 1000)).toBe(true);
    expect(tokenNeedsRefresh(token, (expiresAt + 10) * 1000)).toBe(true);
  });
});

describe("startLiveWatch", () => {
  // A fake Realtime connection the test controls.
  let refreshes: number;
  let fireChange: () => void;
  let setConnected: (connected: boolean) => void;
  let closed: boolean;
  let liveStates: boolean[];
  let wake: () => void;
  let wakeStopped: boolean;

  function parts(connectFails: boolean = false): LiveWatchParts {
    return {
      refresh: async () => {
        refreshes += 1;
      },
      connect: async (onChange, onConnected) => {
        if (connectFails) {
          throw new Error("no token");
        }
        fireChange = onChange;
        setConnected = onConnected;
        return () => {
          closed = true;
        };
      },
      pollMs: POLL_INTERVAL_MS,
      safetyPollMs: SAFETY_POLL_INTERVAL_MS,
      onError: () => undefined,
      onLive: (live) => liveStates.push(live),
      listenForWake: (onWake) => {
        wake = onWake;
        return () => {
          wakeStopped = true;
        };
      },
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    refreshes = 0;
    closed = false;
    liveStates = [];
    wakeStopped = false;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads at once and polls every 5 s until Realtime is connected", async () => {
    const stop = startLiveWatch(parts());
    await vi.advanceTimersByTimeAsync(0);
    expect(refreshes).toBe(1);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(refreshes).toBe(3);

    setConnected(true); // one catch-up load at once
    await vi.advanceTimersByTimeAsync(0);
    expect(refreshes).toBe(4);
    expect(liveStates).toEqual([true]);

    fireChange(); // a database change rings the doorbell
    await vi.advanceTimersByTimeAsync(0);
    expect(refreshes).toBe(5);
    stop();
  });

  it("keeps a safety poll every 10 s while connected (a lost event still arrives)", async () => {
    const stop = startLiveWatch(parts());
    await vi.advanceTimersByTimeAsync(0);
    setConnected(true);
    await vi.advanceTimersByTimeAsync(0);
    const before = refreshes;

    // No events at all for 30 s: the safety poll still loads 3 times, not 6.
    await vi.advanceTimersByTimeAsync(30_000);
    expect(refreshes).toBe(before + 3);
    stop();
  });

  it("loads again when the page wakes up", async () => {
    const stop = startLiveWatch(parts());
    await vi.advanceTimersByTimeAsync(0);
    setConnected(true);
    await vi.advanceTimersByTimeAsync(0);
    const before = refreshes;
    wake(); // the tab is shown again, or the network is back
    await vi.advanceTimersByTimeAsync(0);
    expect(refreshes).toBe(before + 1);
    stop();
    expect(wakeStopped).toBe(true);
  });

  it("goes back to polling when Realtime drops", async () => {
    const stop = startLiveWatch(parts());
    await vi.advanceTimersByTimeAsync(0);
    setConnected(true);
    await vi.advanceTimersByTimeAsync(0);
    const before = refreshes;

    setConnected(false);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(refreshes).toBe(before + 3);
    stop();
  });

  it("keeps polling when Realtime can't start at all", async () => {
    const stop = startLiveWatch(parts(true));
    await vi.advanceTimersByTimeAsync(20_000);
    expect(refreshes).toBe(5); // once at the start + 4 polls
    expect(liveStates).toEqual([false]); // the page shows „every 5 seconds“
    stop();
  });

  it("runs one load at a time and loads once more for a doorbell during a load", async () => {
    let running = 0;
    let mostAtOnce = 0;
    let started = 0;
    let finishLoad: () => void = () => undefined;
    const slow: LiveWatchParts = {
      ...parts(),
      refresh: () => {
        started += 1;
        running += 1;
        mostAtOnce = Math.max(mostAtOnce, running);
        return new Promise<void>((resolve) => {
          finishLoad = () => {
            running -= 1;
            resolve();
          };
        });
      },
    };
    const stop = startLiveWatch(slow);
    await vi.advanceTimersByTimeAsync(0);
    expect(started).toBe(1);

    // Three doorbells while the first load is still running: no parallel loads...
    fireChange();
    fireChange();
    fireChange();
    await vi.advanceTimersByTimeAsync(0);
    expect(started).toBe(1);

    // ...and exactly one more load after it, which sees the newest data.
    finishLoad();
    await vi.advanceTimersByTimeAsync(0);
    expect(started).toBe(2);
    expect(mostAtOnce).toBe(1);
    finishLoad();
    stop();
  });

  it("stop() ends the polling and closes the Realtime channel", async () => {
    const stop = startLiveWatch(parts());
    await vi.advanceTimersByTimeAsync(0);
    stop();
    const before = refreshes;
    await vi.advanceTimersByTimeAsync(20_000);
    expect(refreshes).toBe(before);
    expect(closed).toBe(true);
  });
});

describe("newestFirst", () => {
  function check(id: string, startedAt: string) {
    return {
      id,
      protectedPersonId: "p",
      status: "started" as const,
      startedAt,
      answeredAt: null,
      answers: {
        claimedIdentity: null,
        asksMoney: null,
        handover: null,
        rushing: null,
        secrecy: null,
        textRedacted: null,
      },
      verdict: null,
      acknowledgement: null,
    };
  }

  it("merges the lists of several people, newest first, without duplicates", () => {
    const merged = newestFirst([
      check("a", "2026-11-05T09:00:00Z"),
      check("b", "2026-11-06T09:00:00Z"),
      check("a", "2026-11-05T09:00:00Z"),
      check("c", "2026-11-04T09:00:00Z"),
    ]);
    expect(merged.map((item) => item.id)).toEqual(["b", "a", "c"]);
  });
});
