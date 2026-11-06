// The „Инсталирай Scamly“ card (task W2-09): invites the person to install Scamly as
// an app on the phone. Shown on the home page and on /family. Two variants:
//
//   - Android / Chrome: only when the browser fired `beforeinstallprompt` (Scamly can
//     be installed and isn't yet). „Инсталирай“ opens the browser's own question.
//   - iPhone / iPad in Safari (not opened from the home screen): the 3 steps by hand,
//     because Safari has no install button for websites. On /family the push card
//     already shows the same steps (PushOptIn.tsx), so there we pass ios={false}.
//
// „Не сега“ hides the card and remembers it in localStorage (src/lib/install.ts).
// Nothing is shown on the server or in an installed app, so the page never jumps
// for people who don't need the card.
"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { bg } from "@/i18n/bg";
import {
  getInstallPromptEvent,
  isInstallDismissed,
  promptInstall,
  rememberInstallDismissed,
  subscribeToInstallPrompt,
} from "@/lib/install";
import { isIosNeedsHomeScreen } from "@/lib/push";
import { IosInstallSteps } from "./IosInstallSteps";

// For facts that never change while the page is open: nothing to listen to.
function noChanges(): () => void {
  return () => {};
}

export function InstallPrompt({ ios = true }: { ios?: boolean }) {
  const titleId = useId();
  // useSyncExternalStore reads a value that lives outside React (here: the saved
  // browser event, the device, localStorage). The last function is the value on the
  // server, where there is no browser: "no card".
  const installEvent = useSyncExternalStore(
    subscribeToInstallPrompt,
    getInstallPromptEvent,
    () => null,
  );
  const iosNeedsSteps = useSyncExternalStore(noChanges, isIosNeedsHomeScreen, () => false);
  const dismissedBefore = useSyncExternalStore(noChanges, isInstallDismissed, () => true);
  const [hidden, setHidden] = useState(false);

  const variant = installEvent !== null ? "android" : ios && iosNeedsSteps ? "ios" : null;
  if (hidden || dismissedBefore || variant === null) {
    return null;
  }

  function dismiss() {
    rememberInstallDismissed();
    setHidden(true);
  }

  async function install() {
    const outcome = await promptInstall(); // the browser's „Инсталиране?“ question
    if (outcome === "accepted") {
      setHidden(true);
    }
  }

  return (
    <Card className="install-card" role="region" aria-labelledby={titleId} data-variant={variant}>
      <h2 id={titleId}>{bg.install.title}</h2>
      <p>{variant === "android" ? bg.install.lead : bg.install.iosLead}</p>
      {variant === "ios" ? <IosInstallSteps /> : null}
      <div className="install-actions">
        {variant === "android" ? (
          <Button onClick={() => void install()}>{bg.install.button}</Button>
        ) : null}
        <Button variant="secondary" onClick={dismiss}>
          {bg.install.dismiss}
        </Button>
      </div>
    </Card>
  );
}
