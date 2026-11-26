// Unit tests for the order of the education cards (order.ts, P-04).

import { describe, expect, it } from "vitest";
import type { PublicScriptDto } from "@/schemas/scripts";
import { fakeRelativeFirst } from "./order";

function card(slug: string, scriptType: PublicScriptDto["scriptType"]): PublicScriptDto {
  return {
    slug,
    scriptType,
    titleBg: slug,
    howItStartsBg: "x",
    whatTheySayBg: "x",
    whatToDoBg: "x",
  };
}

describe("fakeRelativeFirst", () => {
  it("puts the fake-relative card first and keeps the others in their order", () => {
    const cards = [
      card("politsai", "police"),
      card("rodnina-v-beda", "relative_in_trouble"),
      card("falshiv-sluzhitel", "fake_official"),
      card("kolet-kurier", "courier"),
    ];
    expect(fakeRelativeFirst(cards).map((item) => item.slug)).toEqual([
      "rodnina-v-beda",
      "politsai",
      "falshiv-sluzhitel",
      "kolet-kurier",
    ]);
  });

  it("changes nothing without a fake-relative card and does not change its input", () => {
    const cards = [card("politsai", "police"), card("kolet-kurier", "courier")];
    expect(fakeRelativeFirst(cards)).toEqual(cards);
    expect(fakeRelativeFirst([])).toEqual([]);
  });
});
