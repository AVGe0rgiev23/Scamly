// The whole call check on the older person's phone (/protected, W2-01), as one
// Client Component that moves through the screens:
//
//   home  (the big button)  ->  questions  ->  result
//
// Pressing the big button sends POST /api/checks at once (the server alerts the
// family before any question is answered) and opens the questions without waiting
// for the answer, so a slow network never holds the person back.
"use client";

import { useRef, useState } from "react";
import { callApi } from "@/components/family/api";
import { useCallContact } from "./callContact";
import { CheckHome } from "./CheckHome";

// Which screen is shown. Like a Python Literal["home", "questions"].
type Stage = "home" | "questions";

// POST /api/checks -> the new check's id, or null if the request failed (offline,
// server down, too many checks). The questions go on either way.
async function startCheckOnServer(): Promise<string | null> {
  const result = await callApi<{ checkId: string }>("/api/checks", "POST");
  return result.ok ? result.data.checkId : null;
}

export function CallCheck() {
  const contact = useCallContact();
  const [stage, setStage] = useState<Stage>("home");
  // The running POST /api/checks (a Promise is like a Python asyncio Task).
  // useRef keeps it between renders without redrawing the screen.
  const checkIdRequest = useRef<Promise<string | null> | null>(null);

  function start() {
    checkIdRequest.current = startCheckOnServer();
    setStage("questions");
  }

  return (
    <main className="call-check">
      {stage === "home" ? <CheckHome contact={contact} onStart={start} /> : null}
    </main>
  );
}
