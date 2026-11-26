// Route tests for „Провери истинския“ (/api/identity-checks/**, task P-05): the
// route handlers check the origin, the role and the input, then hand over to the
// service. The service itself is tested in identityCheckService.test.ts.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bg } from "@/i18n/bg";
import { ApiError } from "@/server/http/errors";
import { GET as getOne, PATCH as answer } from "./[id]/route";
import { GET as family } from "./family/route";
import { GET as list, POST as ask } from "./route";

const fakes = vi.hoisted(() => ({
  requireRole: vi.fn(),
  askFamilyMember: vi.fn(),
  listMyIdentityChecks: vi.fn(),
  getIdentityCheck: vi.fn(),
  answerIdentityCheck: vi.fn(),
  listFamilyForPhone: vi.fn(),
}));

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/server/auth/requireRole", () => ({ requireRole: fakes.requireRole }));
vi.mock("@/server/supabase/userClient", () => ({ createUserClient: async () => ({}) }));
vi.mock("@/server/supabase/adminClient", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/server/services/identityCheckService", () => ({
  createIdentityCheckDeps: () => ({}),
  askFamilyMember: fakes.askFamilyMember,
  listMyIdentityChecks: fakes.listMyIdentityChecks,
  getIdentityCheck: fakes.getIdentityCheck,
  answerIdentityCheck: fakes.answerIdentityCheck,
  listFamilyForPhone: fakes.listFamilyForPhone,
}));

const ID = "1c000000-0000-0000-0000-000000000001";
const IVAN = "c0000000-0000-0000-0000-000000000003";
const MARIA = "c0000000-0000-0000-0000-000000000004";
const phone = { userId: "phone", role: "protected" };
const ivan = { userId: IVAN, role: "family" };

function send(method: string, url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://scamly.test${url}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/identity-checks", () => {
  it("lets a phone ask and answers 201 with the question", async () => {
    fakes.requireRole.mockResolvedValue(phone);
    fakes.askFamilyMember.mockResolvedValue({ id: ID, status: "pending" });
    const response = await ask(send("POST", "/api/identity-checks", { claimedUserId: IVAN }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ identityCheck: { id: ID, status: "pending" } });
    expect(fakes.requireRole).toHaveBeenCalledWith(["protected"], expect.anything());
    expect(fakes.askFamilyMember).toHaveBeenCalledWith({}, phone, { claimedUserId: IVAN });
  });

  it("passes askedUserId on (the next family member is asked about the same person)", async () => {
    fakes.requireRole.mockResolvedValue(phone);
    fakes.askFamilyMember.mockResolvedValue({ id: ID, status: "pending" });
    const response = await ask(
      send("POST", "/api/identity-checks", { claimedUserId: IVAN, askedUserId: MARIA }),
    );
    expect(response.status).toBe(201);
    expect(fakes.askFamilyMember).toHaveBeenCalledWith({}, phone, {
      claimedUserId: IVAN,
      askedUserId: MARIA,
    });
  });

  it("answers 400 for a malformed askedUserId", async () => {
    fakes.requireRole.mockResolvedValue(phone);
    const response = await ask(
      send("POST", "/api/identity-checks", { claimedUserId: IVAN, askedUserId: "maria" }),
    );
    expect(response.status).toBe(400);
    expect(fakes.askFamilyMember).not.toHaveBeenCalled();
  });

  it("refuses another site (CSRF) before anything else", async () => {
    const response = await ask(
      send(
        "POST",
        "/api/identity-checks",
        { claimedUserId: IVAN },
        { "sec-fetch-site": "cross-site" },
      ),
    );
    expect(response.status).toBe(403);
    expect(fakes.requireRole).not.toHaveBeenCalled();
  });

  it("answers 400 for a missing or malformed claimedUserId", async () => {
    fakes.requireRole.mockResolvedValue(phone);
    const response = await ask(send("POST", "/api/identity-checks", { claimedUserId: "ivan" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("validation");
    expect(fakes.askFamilyMember).not.toHaveBeenCalled();
  });

  it("answers 403 for a family account", async () => {
    fakes.requireRole.mockRejectedValue(new ApiError(403, "forbidden", bg.errors.forbidden));
    const response = await ask(send("POST", "/api/identity-checks", { claimedUserId: IVAN }));
    expect(response.status).toBe(403);
  });
});

describe("GET /api/identity-checks", () => {
  it("is for family members and returns their list", async () => {
    fakes.requireRole.mockResolvedValue(ivan);
    fakes.listMyIdentityChecks.mockResolvedValue({ pending: [], warnings: [] });
    const response = await list();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ pending: [], warnings: [] });
    expect(fakes.requireRole).toHaveBeenCalledWith(["family"], expect.anything());
  });
});

describe("GET /api/identity-checks/family", () => {
  it("is for phones only", async () => {
    fakes.requireRole.mockResolvedValue(phone);
    fakes.listFamilyForPhone.mockResolvedValue({ people: [] });
    const response = await family();
    expect(response.status).toBe(200);
    expect(fakes.requireRole).toHaveBeenCalledWith(["protected"], expect.anything());
  });
});

describe("GET /api/identity-checks/:id", () => {
  it("lets the phone and the family read one question", async () => {
    fakes.requireRole.mockResolvedValue(phone);
    fakes.getIdentityCheck.mockResolvedValue({ id: ID });
    const response = await getOne(
      new Request(`https://scamly.test/api/identity-checks/${ID}`),
      params(ID),
    );
    expect(response.status).toBe(200);
    expect(fakes.requireRole).toHaveBeenCalledWith(["family", "protected"], expect.anything());
  });

  it("answers 404 for an id that is not a uuid", async () => {
    fakes.requireRole.mockResolvedValue(phone);
    const response = await getOne(
      new Request("https://scamly.test/api/identity-checks/x"),
      params("x"),
    );
    expect(response.status).toBe(404);
    expect(fakes.getIdentityCheck).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/identity-checks/:id", () => {
  it("passes the answer of the family member to the service", async () => {
    fakes.requireRole.mockResolvedValue(ivan);
    fakes.answerIdentityCheck.mockResolvedValue({ id: ID, status: "not_me" });
    const response = await answer(
      send("PATCH", `/api/identity-checks/${ID}`, { answer: "not_me" }),
      params(ID),
    );
    expect(response.status).toBe(200);
    expect(fakes.requireRole).toHaveBeenCalledWith(["family"], expect.anything());
    expect(fakes.answerIdentityCheck).toHaveBeenCalledWith({}, ivan, ID, "not_me");
  });

  it("answers 400 for any other answer", async () => {
    fakes.requireRole.mockResolvedValue(ivan);
    const response = await answer(
      send("PATCH", `/api/identity-checks/${ID}`, { answer: "expired" }),
      params(ID),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.messageBg).toBe(bg.identityChecks.answerInvalid);
    expect(fakes.answerIdentityCheck).not.toHaveBeenCalled();
  });

  it("passes the 409 of the service on (already answered)", async () => {
    fakes.requireRole.mockResolvedValue(ivan);
    fakes.answerIdentityCheck.mockRejectedValue(
      new ApiError(409, "already_answered", bg.identityChecks.alreadyAnswered),
    );
    const response = await answer(
      send("PATCH", `/api/identity-checks/${ID}`, { answer: "its_me" }),
      params(ID),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("already_answered");
  });

  it("refuses another site (CSRF)", async () => {
    const response = await answer(
      send(
        "PATCH",
        `/api/identity-checks/${ID}`,
        { answer: "its_me" },
        { origin: "https://evil.test" },
      ),
      params(ID),
    );
    expect(response.status).toBe(403);
    expect(fakes.requireRole).not.toHaveBeenCalled();
  });
});
