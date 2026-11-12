// The iPhone steps „Сподели“ → „Добави към началния екран“ → open Scamly from the
// icon, each with a small icon of what to look for on the screen (W2-09): a numbered
// list of hairline-separated rows.
// Shared by the push card (src/components/family/PushOptIn.tsx, Alex, W2-05) and the
// install card (InstallPrompt.tsx), so the hint is written and drawn only once.

import { Share, SquarePlus } from "lucide-react";
import { LogoMark } from "@/components/layout/Logo";
import { bg } from "@/i18n/bg";

const ROW = "flex min-h-12 items-center gap-3 border-b border-line py-2 last:border-b-0";
const ICON = "size-6 shrink-0 text-fg-muted";

export function IosInstallSteps() {
  return (
    <ol className="mt-4 border-t border-line">
      <li className={ROW}>
        {/* The iPhone share symbol: a square with an arrow pointing up. */}
        <Share className={ICON} aria-hidden="true" />
        <span>{bg.pushOptIn.iosStepShare}</span>
      </li>
      <li className={ROW}>
        {/* „Добави към началния екран“: a rounded square with a plus. */}
        <SquarePlus className={ICON} aria-hidden="true" />
        <span>{bg.pushOptIn.iosStepAdd}</span>
      </li>
      <li className={ROW}>
        <span className="shrink-0">
          <LogoMark size={24} />
        </span>
        <span>{bg.pushOptIn.iosStepOpen}</span>
      </li>
    </ol>
  );
}
