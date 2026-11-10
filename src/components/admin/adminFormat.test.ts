// Unit tests for the admin pages' helpers (adminFormat.ts, W3-06).

import { describe, expect, it } from "vitest";
import {
  actionLabel,
  barPercent,
  dayTotal,
  formatLongDay,
  formatShortDay,
  targetLabel,
} from "./adminFormat";

describe("admin helpers", () => {
  it("formats calendar days without shifting them", () => {
    expect(formatShortDay("2026-11-09")).toBe("9.11");
    expect(formatShortDay("2026-01-31")).toBe("31.01");
    expect(formatLongDay("2026-11-09")).toBe("9 ноември 2026 г.");
  });

  it("bar lengths: share of the longest bar, never below 0 or above 100", () => {
    expect(barPercent(5, 10)).toBe(50);
    expect(barPercent(1, 3)).toBe(33.3);
    expect(barPercent(10, 10)).toBe(100);
    expect(barPercent(12, 10)).toBe(100);
    expect(barPercent(0, 10)).toBe(0);
    expect(barPercent(3, 0)).toBe(0);
  });

  it("counts a day and names actions and targets in Bulgarian, unknown ones as their code", () => {
    expect(dayTotal({ red: 1, yellow: 2, green: 3, unfinished: 4 })).toBe(10);
    expect(actionLabel("role_changed")).toBe("Смяна на роля");
    expect(actionLabel("something_new")).toBe("something_new");
    expect(targetLabel("device")).toBe("Телефон");
    expect(targetLabel("thing")).toBe("thing");
  });
});
