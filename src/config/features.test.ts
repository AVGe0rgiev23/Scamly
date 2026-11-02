// Unit tests for the feature switches in features.ts.

import { describe, expect, it } from "vitest";
import { getFeatures, parseBoolean } from "@/config/features";

describe("parseBoolean", () => {
  it('treats "true" and "1" as on, in any letter case and with spaces', () => {
    expect(parseBoolean("true", false)).toBe(true);
    expect(parseBoolean("TRUE", false)).toBe(true);
    expect(parseBoolean(" 1 ", false)).toBe(true);
  });

  it("treats any other text as off", () => {
    expect(parseBoolean("false", true)).toBe(false);
    expect(parseBoolean("0", true)).toBe(false);
    expect(parseBoolean("yes", true)).toBe(false);
  });

  it("uses the default when the variable is missing or empty", () => {
    expect(parseBoolean(undefined, true)).toBe(true);
    expect(parseBoolean(undefined, false)).toBe(false);
    expect(parseBoolean("   ", true)).toBe(true);
  });
});

describe("getFeatures", () => {
  it("uses the safe defaults when no variables are set", () => {
    expect(getFeatures({})).toEqual({
      ai: false,
      voice: true,
      escalation: false,
      push: true,
      email: true,
    });
  });

  it("lets every switch be changed by its environment variable", () => {
    const features = getFeatures({
      FEATURE_AI: "true",
      FEATURE_VOICE: "false",
      FEATURE_ESCALATION: "1",
      FEATURE_PUSH: "0",
      FEATURE_EMAIL: "false",
    });
    expect(features).toEqual({
      ai: true,
      voice: false,
      escalation: true,
      push: false,
      email: false,
    });
  });
});
