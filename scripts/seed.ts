// Local demo setup: offline plan by default; writes only after explicit target confirmation.
import { pathToFileURL } from "node:url";
import { getServerEnv } from "@/lib/env";
import { demoAccounts, executeSeed, parseSeedOptions, validateSeedTarget } from "./seed-core";

export async function main(args: string[]): Promise<void> {
  const options = parseSeedOptions(args);
  if (!options.apply) {
    console.log(
      "Offline seed plan: 4 confirmed human accounts, 1 protected person, 1 paired device, 2 linked contacts, 2 checks and 2 reports.",
    );
    for (const account of demoAccounts()) console.log(`${account.role}: ${account.email}`);
    console.log(
      "No database connection or write. Ask Alex which empty database to use. Set SEED_DEMO_PASSWORD locally, then use --apply --target <approved Supabase URL>.",
    );
    return;
  }
  if (!options.target) throw new Error("An approved empty database target is required.");
  const env = getServerEnv();
  const password = validateSeedTarget(
    options.target,
    env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SEED_DEMO_PASSWORD,
  );
  const { createSeedDeps } = await import("./seed-supabase");
  try {
    await executeSeed(createSeedDeps(env), password);
  } catch {
    // Provider errors can contain submitted values. Never print raw errors or credentials.
    throw new Error(
      "Seed stopped. Some fixtures may have been created; inspect the approved demo database before retrying. No automatic cleanup or reset was performed.",
    );
  }
  console.log(
    "Demo fixtures created and account roles verified. Human passwords come from SEED_DEMO_PASSWORD; device credentials were not stored or printed. Pair a real browser separately through /svarzhi.",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Seed stopped.");
    process.exitCode = 1;
  });
}
