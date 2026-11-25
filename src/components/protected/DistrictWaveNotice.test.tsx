// Protects the home notice's district boundary and optional failure behavior.
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { DistrictWaveNotice } from "./DistrictWaveNotice";

const deps = vi.hoisted(() => ({
  user: {},
  stats: {},
  getActor: vi.fn(),
  findPerson: vi.fn(),
  getWave: vi.fn(),
}));

vi.mock("@/server/supabase/userClient", () => ({ createUserClient: () => deps.user }));
vi.mock("@/server/supabase/publicClient", () => ({ createPublicClient: () => ({}) }));
vi.mock("@/server/auth/actor", () => ({ getActor: deps.getActor }));
vi.mock("@/server/repositories/personsRepository", () => ({ findPersonById: deps.findPerson }));
vi.mock("@/server/services/mapStatsService", () => ({
  createMapStatsDeps: () => deps.stats,
  getDistrictWave: deps.getWave,
}));

beforeEach(() => {
  vi.resetAllMocks();
  deps.getActor.mockResolvedValue({ role: "protected", device: { protectedPersonId: "paired" } });
  deps.findPerson.mockResolvedValue({ district_code: "BG-02" });
});

it("uses the paired person's district and renders the Bulgarian warning", async () => {
  deps.getWave.mockResolvedValue({ scriptType: "police", lastSevenDays: 6 });
  const markup = renderToStaticMarkup(await DistrictWaveNotice());

  expect(deps.findPerson).toHaveBeenCalledWith(deps.user, "paired");
  expect(deps.getWave).toHaveBeenCalledExactlyOnceWith(deps.stats, "BG-02");
  expect(markup).toContain("Сигнали за измами в област Бургас");
  expect(markup).toContain("6 сигнала");
});

it("does not look up private district data without a paired phone", async () => {
  deps.getActor.mockResolvedValue(null);

  expect(await DistrictWaveNotice()).toBeNull();
  expect(deps.findPerson).not.toHaveBeenCalled();
  expect(deps.getWave).not.toHaveBeenCalled();
});

it("keeps the call check available when wave data cannot be loaded", async () => {
  deps.getWave.mockRejectedValue(new Error("unavailable"));

  expect(await DistrictWaveNotice()).toBeNull();
});
