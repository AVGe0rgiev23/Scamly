// Exercise account export and deletion boundaries with synthetic sessions.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bg } from "@/i18n/bg";
import { ApiError } from "@/server/http/errors";
import { GET as download } from "./export/route";
import { DELETE as remove } from "./route";

const fakes = vi.hoisted(() => ({
  requireRole: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
  deleteAuthUser: vi.fn(),
  exportFamilyData: vi.fn(),
  admin: {},
}));

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/server/auth/requireRole", () => ({ requireRole: fakes.requireRole }));
vi.mock("@/server/supabase/userClient", () => ({
  createUserClient: () => ({ auth: { getUser: fakes.getUser, signOut: fakes.signOut } }),
}));
vi.mock("@/server/supabase/adminClient", () => ({ createAdminClient: () => fakes.admin }));
vi.mock("@/server/repositories/authUsersRepository", () => ({
  deleteAuthUser: fakes.deleteAuthUser,
}));
vi.mock("@/server/services/accountExport", () => ({ exportFamilyData: fakes.exportFamilyData }));

const caller = "family-demo";
const email = "family@example.test";

function deleteRequest(body: object) {
  return new Request("https://scamly.test/api/me", {
    method: "DELETE",
    body: JSON.stringify(body),
  });
}

describe("family account data API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fakes.requireRole.mockResolvedValue({ userId: caller });
    fakes.getUser.mockResolvedValue({ data: { user: { id: caller, email } }, error: null });
  });

  it("requires the exact confirmation before deleting anything", async () => {
    expect((await remove(deleteRequest({ confirm: "delete" }))).status).toBe(400);
    expect(fakes.deleteAuthUser).not.toHaveBeenCalled();
  });

  it("deletes the signed-in family account and ends its local session", async () => {
    expect((await remove(deleteRequest({ confirm: bg.accountData.confirmWord }))).status).toBe(200);
    expect(fakes.requireRole).toHaveBeenCalledWith(["family"], expect.anything());
    expect(fakes.deleteAuthUser).toHaveBeenCalledExactlyOnceWith(fakes.admin, caller);
    expect(fakes.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
  });

  it("requires the family role before exporting", async () => {
    fakes.requireRole.mockRejectedValue(new ApiError(403, "forbidden", bg.errors.forbidden));
    const response = await download(new Request("https://scamly.test/api/me/export"));
    expect(response.status).toBe(403);
    expect(fakes.exportFamilyData).not.toHaveBeenCalled();
  });

  it("returns a non-cacheable attachment scoped to the authenticated account", async () => {
    const data = { profile: { id: caller, email }, protectedPeople: [] };
    fakes.exportFamilyData.mockResolvedValue(data);
    const response = await download(new Request("https://scamly.test/api/me/export"));
    expect(fakes.exportFamilyData).toHaveBeenCalledExactlyOnceWith(
      expect.anything(),
      caller,
      email,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
    expect(await response.json()).toEqual(data);
  });
});
