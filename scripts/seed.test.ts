// Offline tests for the destructive-operation guard and the actual seed orchestration.
import { describe, expect, it, vi } from "vitest";
import type { Actor } from "@/server/auth/actor";
import {
  demoAccounts,
  executeSeed,
  parseSeedOptions,
  validateSeedTarget,
  type SeedDeps,
} from "./seed-core";

function fakeSeed() {
  const calls: string[] = [];
  const deps: SeedDeps = {
    assertEmpty: vi.fn(async () => {
      calls.push("empty");
    }),
    createAccount: vi.fn(async (account) => {
      calls.push(account.key);
      return { userId: account.key, role: account.role } as Actor;
    }),
    createPerson: vi.fn(async () => {
      calls.push("person");
      return "person-id";
    }),
    pairDevice: vi.fn(async () => {
      calls.push("paired");
      return "device-id";
    }),
    addContact: vi.fn(async () => {
      calls.push("contact-link");
    }),
    addSamples: vi.fn(async () => {
      calls.push("samples");
    }),
  };
  return { calls, deps };
}

describe("seed safety", () => {
  it("defaults to an offline plan and refuses incomplete or ambiguous apply arguments", () => {
    expect(parseSeedOptions([])).toEqual({ apply: false, target: null });
    expect(parseSeedOptions(["--dry-run"])).toEqual({ apply: false, target: null });
    for (const args of [
      ["--apply"],
      ["--force"],
      ["--apply", "--target", "https://demo.supabase.co", "--reset"],
    ]) {
      expect(() => parseSeedOptions(args)).toThrow();
    }
  });

  it("requires the exact configured origin and rejects credentials, unsafe URLs and weak passwords", () => {
    const password = "local-test-password";
    expect(
      validateSeedTarget("https://demo.supabase.co/", "https://demo.supabase.co", password),
    ).toBe(password);
    expect(() =>
      validateSeedTarget("https://other.supabase.co", "https://demo.supabase.co", password),
    ).toThrow();
    for (const url of [
      "https://secret@demo.supabase.co",
      "https://demo.supabase.co/path",
      "http://demo.supabase.co",
      "https://demo.supabase.co?key=value",
    ]) {
      expect(() => parseSeedOptions(["--apply", "--target", url])).toThrow();
    }
    for (const value of [undefined, "short", "x".repeat(73)]) {
      expect(() =>
        validateSeedTarget("https://demo.supabase.co", "https://demo.supabase.co", value),
      ).toThrow();
    }
  });

  it("does not perform any writes when empty-database verification fails", async () => {
    const { calls, deps } = fakeSeed();
    deps.assertEmpty = vi.fn(async () => {
      throw new Error("existing data");
    });
    await expect(executeSeed(deps, "local-test-password")).rejects.toThrow("existing data");
    expect(calls).toEqual([]);
    expect(deps.createAccount).not.toHaveBeenCalled();
  });

  it("creates each human role, linked contact and paired-device fixtures only after preflight", async () => {
    const { calls, deps } = fakeSeed();
    await executeSeed(deps, "local-test-password");
    expect(calls).toEqual([
      "empty",
      "family",
      "contact",
      "moderator",
      "admin",
      "person",
      "contact-link",
      "paired",
      "samples",
    ]);
    expect(deps.addContact).toHaveBeenCalledWith("person-id", "contact");
    expect(deps.addSamples).toHaveBeenCalledWith("person-id", "device-id", "moderator");
    expect(demoAccounts().map((account) => account.role)).toEqual([
      "family",
      "family",
      "moderator",
      "admin",
    ]);
  });

  it("stops before linked data if account role verification fails", async () => {
    const { deps } = fakeSeed();
    deps.createAccount = vi.fn(async () => ({ role: "protected" }) as Actor);
    await expect(executeSeed(deps, "local-test-password")).rejects.toThrow("role verification");
    expect(deps.createPerson).not.toHaveBeenCalled();
    expect(deps.pairDevice).not.toHaveBeenCalled();
  });
});
