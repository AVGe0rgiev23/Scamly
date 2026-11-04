// Unit tests for the live-watch logic of src/lib/realtime.ts: Realtime when it works,
// polling every 5 seconds when it doesn't. Realtime itself is replaced by a fake
// `connect`, and vi.useFakeTimers() lets the test move the clock by hand.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  POLL_INTERVAL_MS,
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
      onError: () => undefined,
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    refreshes = 0;
    closed = false;
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

    setConnected(true); // one catch-up load, then no more polling
    await vi.advanceTimersByTimeAsync(30_000);
    expect(refreshes).toBe(4);

    fireChange(); // a database change rings the doorbell
    await vi.advanceTimersByTimeAsync(0);
    expect(refreshes).toBe(5);
    stop();
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
