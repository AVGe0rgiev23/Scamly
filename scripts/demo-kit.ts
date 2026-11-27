// Juror demo kit (P-12): the command line. `npm run demo:kit` and `npm run demo:reset`.
// Refuses to run without SCAMLY_DEMO_KIT=1 and in CI; never prints keys or passwords.
// Step by step for the defense: docs/evidence/demo-kit.md.
import { pathToFileURL } from "node:url";
import { getServerEnv } from "@/lib/env";
import {
  assertDemoKitAllowed,
  demoOwnerPassword,
  demoSiteUrl,
  DEMO_OWNER_EMAIL,
  parseDemoArgs,
  safeErrorMessage,
} from "./demo-kit-core";

// env: like os.environ in Python (a dict of optional strings); the tests pass their own.
export async function main(
  args: string[],
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  // 1. The guards come first: nothing below runs without the explicit flag.
  assertDemoKitAllowed(env);
  const command = parseDemoArgs(args);
  const siteUrl = demoSiteUrl(env.SCAMLY_DEMO_SITE_URL);
  const ownerPassword = demoOwnerPassword(env.SCAMLY_DEMO_PASSWORD);
  const serverEnv = getServerEnv();
  // The database's address is not a secret; it shows Alex which database is changed.
  console.log(`Database: ${new URL(serverEnv.NEXT_PUBLIC_SUPABASE_URL).origin}`);

  const { runDemoKit, runDemoReset } = await import("./demo-kit-supabase");
  try {
    if (command.kind === "kit") {
      const kit = await runDemoKit(serverEnv, {
        siteUrl,
        ownerPassword,
        outputRoot: process.cwd(),
      });
      console.log(kit.createdFamily ? "Demo family created." : "Demo family reused.");
      console.log(`Owner account: ${DEMO_OWNER_EMAIL}`);
      console.log(
        ownerPassword === null
          ? "Owner password: random, not shown (set SCAMLY_DEMO_PASSWORD to log in as Иван)."
          : "Owner password: the value of SCAMLY_DEMO_PASSWORD.",
      );
      if (kit.pairingCode !== null) {
        console.log(
          `No demo phone is paired yet. On the demo phone open ${siteUrl}/svarzhi within 10 minutes and enter: ${kit.pairingCode}`,
        );
      } else {
        console.log("Demo phone: already paired (kept).");
      }
      console.log(`Juror invite (single use, until ${kit.expiresAt}):`);
      console.log(kit.inviteUrl);
      console.log(`QR picture: ${kit.qrFile}`);
      console.log("After the demo: npm run demo:reset");
    } else {
      const reset = await runDemoReset(serverEnv, command.all);
      console.log(
        `Juror links removed: ${reset.jurorsUnlinked}; juror accounts deleted: ${reset.jurorAccountsDeleted}; kept (they have other data): ${reset.jurorAccountsKept}.`,
      );
      console.log(
        reset.familyDeleted
          ? "Demo family deleted (Иван, Мария and her phone)."
          : "Demo family kept (use npm run demo:reset -- --all to delete it).",
      );
    }
  } catch (error) {
    // Only our own messages are shown; provider errors can contain submitted values.
    throw new Error(`Demo kit stopped: ${safeErrorMessage(error)}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Demo kit stopped.");
    process.exitCode = 1;
  });
}
