// Offline tests for the juror demo kit's guards and decisions (P-12): no database.
import { describe, expect, it, vi } from "vitest";
import {
  assertDemoKitAllowed,
  canDeleteJurorAccount,
  DemoKitError,
  demoOwnerPassword,
  demoSiteUrl,
  isDemoKitEmail,
  LIVE_SITE_URL,
  parseDemoArgs,
  safeErrorMessage,
} from "./demo-kit-core";
import { main } from "./demo-kit";

describe("demo kit guard", () => {
  it("refuses without SCAMLY_DEMO_KIT=1 and in CI", () => {
    expect(() => assertDemoKitAllowed({})).toThrow(/SCAMLY_DEMO_KIT=1/);
    expect(() => assertDemoKitAllowed({ SCAMLY_DEMO_KIT: "true" })).toThrow();
    expect(() => assertDemoKitAllowed({ SCAMLY_DEMO_KIT: "1", CI: "true" })).toThrow(/CI/);
    expect(() => assertDemoKitAllowed({ SCAMLY_DEMO_KIT: "1" })).not.toThrow();
    expect(() => assertDemoKitAllowed({ SCAMLY_DEMO_KIT: "1", CI: "false" })).not.toThrow();
  });

  it("main() stops before touching the environment or the database without the flag", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await expect(main(["kit"], {})).rejects.toThrow(/nothing was written/);
    await expect(main(["reset"], { SCAMLY_DEMO_KIT: "0" })).rejects.toThrow();
    expect(log).not.toHaveBeenCalled(); // not even the database address
    log.mockRestore();
  });
});

describe("demo kit options", () => {
  it("knows only kit, reset and reset --all", () => {
    expect(parseDemoArgs(["kit"])).toEqual({ kind: "kit" });
    expect(parseDemoArgs(["reset"])).toEqual({ kind: "reset", all: false });
    expect(parseDemoArgs(["reset", "--all"])).toEqual({ kind: "reset", all: true });
    for (const args of [[], ["kit", "--all"], ["delete"], ["reset", "--force"]]) {
      expect(() => parseDemoArgs(args)).toThrow();
    }
  });

  it("links to the live site by default and accepts only a plain origin", () => {
    expect(demoSiteUrl(undefined)).toBe(LIVE_SITE_URL);
    expect(demoSiteUrl("http://localhost:3000/")).toBe("http://localhost:3000");
    for (const bad of ["http://example.com", "https://a:b@example.com", "https://x.com/path"]) {
      expect(() => demoSiteUrl(bad)).toThrow();
    }
  });

  it("checks the owner password length and never invents one", () => {
    expect(demoOwnerPassword(undefined)).toBeNull();
    expect(demoOwnerPassword("")).toBeNull();
    expect(demoOwnerPassword("long-enough-pass")).toBe("long-enough-pass");
    expect(() => demoOwnerPassword("short")).toThrow();
  });

  it("prints only its own error messages", () => {
    expect(safeErrorMessage(new DemoKitError("Cannot read the demo family."))).toBe(
      "Cannot read the demo family.",
    );
    expect(safeErrorMessage(new Error("duplicate key (juror@mail.bg)"))).not.toContain("@");
  });
});

describe("what the reset may delete", () => {
  const juror = { role: "family", joinedThroughDemoInvite: true, ownsPersons: 0, otherLinks: 0 };

  it("deletes a juror account that exists only for the demo", () => {
    expect(canDeleteJurorAccount(juror)).toBe(true);
  });

  it("keeps an account with any other data or role", () => {
    expect(canDeleteJurorAccount({ ...juror, joinedThroughDemoInvite: false })).toBe(false);
    expect(canDeleteJurorAccount({ ...juror, ownsPersons: 1 })).toBe(false);
    expect(canDeleteJurorAccount({ ...juror, otherLinks: 1 })).toBe(false);
    expect(canDeleteJurorAccount({ ...juror, role: "moderator" })).toBe(false);
  });

  it("recognises the kit's own reserved e-mail domain", () => {
    expect(isDemoKitEmail("ivan@demo-kit.scamly.invalid")).toBe(true);
    expect(isDemoKitEmail("juror@gmail.com")).toBe(false);
    expect(isDemoKitEmail(null)).toBe(false);
  });
});
