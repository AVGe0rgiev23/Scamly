// Tests for the person page's two tabs (P-10): the address part after "#".
import { describe, expect, it } from "vitest";
import { tabFromHash } from "./personTabs";

describe("tabFromHash", () => {
  it("opens „Кой е истинският“ by default", () => {
    expect(tabFromHash("")).toBe("contacts");
    expect(tabFromHash("#blizki")).toBe("contacts");
    expect(tabFromHash("#nonsense")).toBe("contacts");
  });

  it("opens „Настройки“, also for the old history and phones links", () => {
    expect(tabFromHash("#nastroyki")).toBe("settings");
    expect(tabFromHash("#proverki")).toBe("settings");
    expect(tabFromHash("telefoni")).toBe("settings");
  });
});
