// The call check with its feature switch: reads FEATURE_VOICE on the server, at
// request time, and passes it to the browser part as a normal prop (W2-10). So voice
// input can be switched off on Vercel without a new build (D12: voice is cut early
// if we run late). Used by /protected and the test preview /dev/protected.
//
// An async Server Component: `await connection()` means "only when a request comes
// in, never at `next build`", so it must sit inside <Suspense> (the /protected layout
// has one; the preview page adds its own).
//
// withDistrict (the real /protected only): also reads the paired person's district,
// so „Изпратете анонимно на картата“ on a red screen needs no question (P-11). The
// preview has no paired phone and asks for the district instead.

import { connection } from "next/server";
import type { ReactNode } from "react";
import { getFeatures } from "@/config/features";
import { CallCheck } from "./CallCheck";
import { loadPairedDistrict } from "./pairedDistrict";

export async function CallCheckPage({
  districtNotice,
  withDistrict = false,
}: {
  districtNotice?: ReactNode;
  withDistrict?: boolean;
}) {
  await connection();
  const districtCode = withDistrict ? await loadPairedDistrict() : null;
  return (
    <CallCheck
      voiceEnabled={getFeatures().voice}
      districtNotice={districtNotice}
      districtCode={districtCode}
    />
  );
}
