// Tests how the Supabase client sends a protected person's name to the database API.
import { createClient } from "@supabase/supabase-js";
import { expect, it, vi } from "vitest";
import { CreatePersonSchema } from "@/schemas/persons";
import type { Database } from "@/types/database";
import { insertPerson, type PersonRow } from "./personsRepository";

it("sends punctuation in a person's name as a JSON field value", async () => {
  const ownerId = "a1000000-0000-4000-8000-000000000001";
  const input = CreatePersonSchema.parse({
    displayName: "Анна О'Конър (баба); вкъщи",
    districtCode: "BG-01",
  });
  const saved: PersonRow = {
    id: "a1000000-0000-4000-8000-000000000002",
    owner_id: ownerId,
    display_name: input.displayName,
    district_code: input.districtCode,
    created_at: "2026-11-24T08:00:00Z",
  };
  const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json(saved));
  const client = createClient<Database>("https://scamly.invalid", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch },
  });

  await expect(insertPerson(client, { ownerId, ...input })).resolves.toEqual(saved);

  expect(fetch).toHaveBeenCalledOnce();
  const call = fetch.mock.calls[0];
  expect(call).toBeDefined();
  if (!call) throw new Error("Expected a request to Supabase");
  const [url, request] = call;
  expect(new URL(String(url)).pathname).toBe("/rest/v1/protected_persons");
  expect(request?.method).toBe("POST");
  expect(JSON.parse(String(request?.body))).toEqual({
    owner_id: ownerId,
    display_name: "Анна О'Конър (баба); вкъщи",
    district_code: "BG-01",
  });
});
