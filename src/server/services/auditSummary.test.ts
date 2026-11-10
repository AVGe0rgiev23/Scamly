// Unit tests for the safe summary of audit_log.details (auditSummary.ts, W3-06).

import { describe, expect, it } from "vitest";
import { MAX_SUMMARY_LENGTH, summarizeAuditDetails } from "@/server/services/auditSummary";

describe("summarizeAuditDetails", () => {
  it("role changes show the two Bulgarian role names", () => {
    expect(summarizeAuditDetails({ from: "family", to: "moderator" })).toBe(
      "Семейство → Модератор",
    );
  });

  it("script changes: address, number of fields, published or draft", () => {
    expect(
      summarizeAuditDetails({
        slug: "politsai",
        fields: ["titleBg", "published"],
        published: true,
      }),
    ).toBe("адрес: politsai · променени полета: 2 · публикувана");
    expect(summarizeAuditDetails({ slug: "kolet", published: false })).toBe(
      "адрес: kolet · чернова",
    );
  });

  it("other known facts: priority, removed phones, reason", () => {
    expect(summarizeAuditDetails({ priority: 2, protected_person_id: "p-1" })).toBe(
      "място в списъка: 2",
    );
    expect(summarizeAuditDetails({ devices_revoked: 1 })).toBe("премахнати телефони: 1");
    expect(summarizeAuditDetails({ protected_person_id: "p-1", reason: "person_deleted" })).toBe(
      "при изтриване на защитен човек",
    );
  });

  it("never shows ids, codes, dates, unknown keys or strange values", () => {
    const summary = summarizeAuditDetails({
      protected_person_id: "1f0e…",
      pairing_code_id: "abc",
      invite_id: "def",
      expires_at: "2026-11-09T10:00:00Z",
      from: "superuser",
      to: "admin",
      slug: "<script>",
      priority: -1,
      note: "secret",
    });
    expect(summary).toBe("");
    expect(summarizeAuditDetails(null)).toBe("");
    expect(summarizeAuditDetails(["a"])).toBe("");
    expect(summarizeAuditDetails("text")).toBe("");
  });

  it("is never longer than the limit", () => {
    const summary = summarizeAuditDetails({
      from: "family",
      to: "admin",
      slug: "a".repeat(60),
      fields: new Array(500).fill("x"),
      published: true,
      priority: 5,
      devices_revoked: 3,
      reason: "person_deleted",
      linked_existing_contact: true,
    });
    expect(summary.length).toBeLessThanOrEqual(MAX_SUMMARY_LENGTH);
    expect(summary.endsWith("…")).toBe(true);
  });
});
