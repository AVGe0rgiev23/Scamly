// Unit tests for the education pages' data (educationService.ts, W3-05), with fakes.

import { afterEach, describe, expect, it, vi } from "vitest";
import type { ScriptRow } from "@/server/repositories/scriptsRepository";
import {
  loadEducationCard,
  loadEducationList,
  type EducationDeps,
} from "@/server/services/educationService";

const ROW: ScriptRow = {
  id: "5c000000-0000-4000-8000-000000000001",
  slug: "politsai",
  script_type: "police",
  title_bg: "Фалшив полицай",
  how_it_starts_bg: "Звъни „полицай“.",
  what_they_say_bg: "„Помогнете ни.“",
  what_to_do_bg: "Затворете.",
  extra_keywords: ["жетон"],
  published: true,
  updated_at: "2026-11-09T10:00:00Z",
};

function deps(overrides: Partial<EducationDeps> = {}): EducationDeps {
  return {
    listPublished: async () => [ROW],
    findPublishedBySlug: async (slug) => (slug === ROW.slug ? ROW : null),
    ...overrides,
  };
}

const PUBLIC_CARD = {
  slug: "politsai",
  scriptType: "police",
  titleBg: "Фалшив полицай",
  howItStartsBg: "Звъни „полицай“.",
  whatTheySayBg: "„Помогнете ни.“",
  whatToDoBg: "Затворете.",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadEducationList", () => {
  it("returns the published cards without keywords", async () => {
    expect(await loadEducationList(deps())).toEqual([PUBLIC_CARD]);
  });

  it("returns null (the page shows a message) when the database fails or is not set up", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = deps({ listPublished: async () => Promise.reject(new Error("down")) });
    expect(await loadEducationList(failing)).toBeNull();
    expect(await loadEducationList(null)).toBeNull();
  });
});

describe("loadEducationCard", () => {
  it("finds a published card by its address", async () => {
    expect(await loadEducationCard(deps(), "politsai")).toEqual(PUBLIC_CARD);
  });

  it("answers not_found for an unknown card or a malformed address, without asking for bad ones", async () => {
    const asked: string[] = [];
    const recording = deps({
      findPublishedBySlug: async (slug) => {
        asked.push(slug);
        return null;
      },
    });
    expect(await loadEducationCard(recording, "chernova")).toBe("not_found");
    expect(await loadEducationCard(recording, "../admin")).toBe("not_found");
    expect(await loadEducationCard(recording, "Политсай")).toBe("not_found");
    expect(asked).toEqual(["chernova"]);
  });

  it("returns null when the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = deps({ findPublishedBySlug: async () => Promise.reject(new Error("down")) });
    expect(await loadEducationCard(failing, "politsai")).toBeNull();
  });
});
