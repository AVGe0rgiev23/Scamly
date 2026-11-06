// The iPhone steps „Сподели“ → „Добави към началния екран“ → open Scamly from the
// icon, each with a small drawing of what to look for on the screen (W2-09).
// Shared by the push card (src/components/family/PushOptIn.tsx, Alex, W2-05) and the
// install card (InstallPrompt.tsx), so the hint is written and drawn only once.

import { LogoMark } from "@/components/layout/Logo";
import { bg } from "@/i18n/bg";

export function IosInstallSteps() {
  return (
    <ol className="push-ios-steps">
      <li>
        <ShareIcon />
        <span>{bg.pushOptIn.iosStepShare}</span>
      </li>
      <li>
        <AddIcon />
        <span>{bg.pushOptIn.iosStepAdd}</span>
      </li>
      <li>
        <LogoMark />
        <span>{bg.pushOptIn.iosStepOpen}</span>
      </li>
    </ol>
  );
}

// The iPhone share symbol: a square with an arrow pointing up.
function ShareIcon() {
  return (
    <svg className="push-icon" viewBox="0 0 24 24" width="36" height="36" aria-hidden="true">
      <path d="M8 9H6v12h12V9h-2" />
      <path d="M12 3v12M8 7l4-4 4 4" />
    </svg>
  );
}

// „Добави към началния екран“: a rounded square with a plus.
function AddIcon() {
  return (
    <svg className="push-icon" viewBox="0 0 24 24" width="36" height="36" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
