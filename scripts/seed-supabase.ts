// Computer-only seed adapter; the admin key is never imported by browser code.
import { createClient } from "@supabase/supabase-js";
import { bg } from "@/i18n/bg";
import type { ServerEnv } from "@/lib/env";
import { loadActor, supabaseActorReader, type Actor } from "@/server/auth/actor";
import { createPerson } from "@/server/services/personService";
import {
  createPairingCode,
  createPairingDeps,
  redeemPairingCode,
} from "@/server/services/pairingService";
import type { DbClient } from "@/server/supabase/userClient";
import type { Database } from "@/types/database";
import { EMPTY_TABLES, type DemoAccount, type SeedDeps } from "./seed-core";

export function createSeedDeps(env: ServerEnv): SeedDeps {
  const options = {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  };
  const admin = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    options,
  );
  const clients = new Map<string, DbClient>();
  const userClient = () =>
    createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      options,
    );

  function clientFor(actor: Actor): DbClient {
    const client = clients.get(actor.userId);
    if (!client) throw new Error("No authenticated demo client.");
    return client;
  }

  return {
    async assertEmpty() {
      const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (users.error) throw new Error("Cannot verify empty Auth users.");
      if (users.data.users.length !== 0)
        throw new Error("Auth already contains users; seed refuses to modify it.");
      for (const table of EMPTY_TABLES) {
        const { count, error } = await admin
          .from(table)
          .select("*", { count: "exact", head: true });
        if (error || count === null) throw new Error(`Cannot verify empty table: ${table}.`);
        if (count !== 0) throw new Error(`Table ${table} is not empty; seed refuses to modify it.`);
      }
      const districts = await admin.from("districts").select("code");
      if (
        districts.error ||
        districts.data.length !== 28 ||
        !districts.data.some((row) => row.code === "BG-02")
      ) {
        throw new Error("Apply the complete migrations with the 28 districts before seeding.");
      }
    },
    async createAccount(account: DemoAccount, password: string) {
      const result = await admin.auth.admin.createUser({
        email: account.email,
        password,
        email_confirm: true,
        user_metadata: { display_name: account.displayName },
      });
      if (result.error) throw new Error(`Cannot create demo ${account.key} account.`);
      const id = result.data.user.id;
      const role = await admin
        .from("profiles")
        .update({ role: account.role, email_alerts: false })
        .eq("id", id);
      if (role.error) throw new Error(`Cannot set demo ${account.key} role.`);
      const client = userClient();
      const login = await client.auth.signInWithPassword({ email: account.email, password });
      if (login.error) throw new Error(`Cannot verify demo ${account.key} login.`);
      const actor = await loadActor(supabaseActorReader(client));
      if (!actor || actor.userId !== id || actor.role !== account.role)
        throw new Error(`Cannot verify demo ${account.key} profile.`);
      clients.set(id, client);
      return actor;
    },
    async createPerson(owner) {
      const person = await createPerson(clientFor(owner), owner, {
        displayName: bg.seed.personName,
        districtCode: "BG-02",
      });
      return person.id;
    },
    async addContact(personId, contactId) {
      // The owner is contact #1 via the existing trigger; this linked family member is #2.
      const result = await admin.from("trusted_contacts").insert({
        protected_person_id: personId,
        user_id: contactId,
        display_name: bg.seed.contactName,
        priority: 2,
      });
      if (result.error) throw new Error("Cannot add the demo trusted contact.");
    },
    async pairDevice(owner, personId) {
      // Reuse the real service, including atomic code consumption, role/device setup and audit.
      const ownerDeps = createPairingDeps(clientFor(owner), admin);
      const code = await createPairingCode(ownerDeps, owner, personId);
      const deviceClient = userClient();
      const paired = await redeemPairingCode(
        createPairingDeps(deviceClient, admin),
        { code: code.code, label: bg.seed.deviceLabel },
        "127.0.0.1",
      );
      const device = await loadActor(supabaseActorReader(deviceClient));
      if (device?.role !== "protected" || device.device?.id !== paired.deviceId)
        throw new Error("Cannot verify the paired demo device.");
      return paired.deviceId;
    },
    async addSamples(personId, deviceId, moderatorId) {
      const now = new Date();
      const iso = now.toISOString();
      const checks: Database["public"]["Tables"]["checks"]["Insert"][] = [
        {
          protected_person_id: personId,
          device_id: deviceId,
          status: "answered",
          claimed_identity: "police",
          asks_money: "yes",
          score: 60,
          risk_level: "red",
          script_type: "police",
          hard_rules: ["HR1_POLICE_ASKS_MONEY"],
          reason_codes: ["HR1_POLICE_ASKS_MONEY", "identity_police", "money"],
          text_redacted: bg.seed.policeCheckText,
          engine_version: "demo-fixture-1",
          started_at: iso,
          answered_at: iso,
        },
        {
          protected_person_id: personId,
          device_id: deviceId,
          status: "answered",
          claimed_identity: "official",
          asks_money: "no",
          score: 15,
          risk_level: "green",
          script_type: "fake_official",
          // Batch inserts fill missing columns with NULL, not the column default,
          // so every row must list hard_rules (NOT NULL) explicitly.
          hard_rules: [],
          reason_codes: ["identity_official"],
          text_redacted: bg.seed.bankCheckText,
          engine_version: "demo-fixture-1",
          started_at: iso,
          answered_at: iso,
        },
      ];
      const savedChecks = await admin.from("checks").insert(checks);
      if (savedChecks.error) throw new Error("Cannot create demo check fixtures.");
      const reports: Database["public"]["Tables"]["reports"]["Insert"][] = [
        {
          district_code: "BG-02",
          script_type: "police",
          occurred_on: iso.slice(0, 10),
          description_redacted: bg.seed.pendingReportText,
          status: "pending",
        },
        {
          district_code: "BG-22",
          script_type: "courier",
          occurred_on: iso.slice(0, 10),
          description_redacted: bg.seed.approvedReportText,
          status: "approved",
          reviewed_by: moderatorId,
          reviewed_at: iso,
        },
      ];
      const savedReports = await admin.from("reports").insert(reports);
      if (savedReports.error) throw new Error("Cannot create demo report fixtures.");
    },
  };
}
