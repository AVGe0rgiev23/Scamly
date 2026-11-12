// The big „Говорете“ button on the older person's text step (task W2-10): speak instead
// of typing. The browser's Web Speech API (SpeechRecognition, Bulgarian "bg-BG") turns
// the speech into text; what it hears is shown while speaking, and the final text is
// added at the end of the text field. Typing always stays possible.
//
//   - The button is shown ONLY when the browser has the API and the FEATURE_VOICE
//     switch is on (the server passes it down as `enabled`). It works best in Chrome
//     on Android (brief 5.2 A); Firefox has no API, so the button is simply not there.
//   - It never starts by itself: only a tap on „Говорете“ starts listening, and the
//     browser asks for the microphone at that moment.
//   - We store and send no audio. The browser does the speech-to-text itself (Chrome
//     uses Google's speech service for that); we only get the text.
"use client";

import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { fill } from "@/components/family/format";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { bg } from "@/i18n/bg";
import {
  findSpeechRecognition,
  readResults,
  voiceErrorMessage,
  type SpeechRecognitionLike,
  type SpeechScope,
} from "./voice";

type VoiceInputProps = {
  enabled: boolean; // the FEATURE_VOICE switch, read on the server
  disabled: boolean; // true while the answers are being sent
  onSpoken: (text: string) => void; // gets each piece of final text
};

// A small message under the button: an error (red) or an info line.
type Notice = { kind: "error" | "info"; text: string } | null;

// Does this browser have SpeechRecognition? Read with useSyncExternalStore so the
// server (no browser, answer false) and the browser can differ without a warning.
function noChanges() {
  return () => {};
}
function hasSpeechInBrowser(): boolean {
  return findSpeechRecognition(window as unknown as SpeechScope) !== null;
}
function hasSpeechOnServer(): boolean {
  return false;
}

export function VoiceInput({ enabled, disabled, onSpoken }: VoiceInputProps) {
  const supported = useSyncExternalStore(noChanges, hasSpeechInBrowser, hasSpeechOnServer);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState(""); // what it hears right now (not final)
  const [notice, setNotice] = useState<Notice>(null);
  // The running recognition session, if any (kept between renders, like a field).
  const session = useRef<SpeechRecognitionLike | null>(null);
  // Always the newest onSpoken, so a late result adds to the newest text.
  const latestOnSpoken = useRef(onSpoken);
  useEffect(() => {
    latestOnSpoken.current = onSpoken;
  });

  // Stop listening when the screen closes or the answers are being sent.
  useEffect(() => {
    if (disabled) session.current?.abort();
  }, [disabled]);
  useEffect(() => () => session.current?.abort(), []);

  if (!enabled || !supported) {
    return null;
  }

  function start() {
    const Recognition = findSpeechRecognition(window as unknown as SpeechScope);
    if (Recognition === null) return;
    const recognition = new Recognition();
    recognition.lang = "bg-BG";
    recognition.interimResults = true; // show words while the person is speaking
    recognition.continuous = false; // one sentence per tap: the most reliable on Android
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const { final, interim: guess } = readResults(event);
      if (final !== "") {
        latestOnSpoken.current(final);
        setNotice({ kind: "info", text: bg.voice.added });
      }
      setInterim(guess);
    };
    recognition.onerror = (event) => {
      const text = voiceErrorMessage(event.error);
      if (text !== null) setNotice({ kind: "error", text });
    };
    recognition.onend = () => {
      if (session.current === recognition) session.current = null;
      setListening(false);
      setInterim("");
    };

    session.current = recognition;
    setNotice(null);
    setInterim("");
    setListening(true);
    try {
      recognition.start(); // the browser asks for the microphone now
    } catch {
      session.current = null;
      setListening(false);
      setNotice({ kind: "error", text: bg.voice.errorOther });
    }
  }

  function stop() {
    session.current?.stop(); // the browser still delivers what it heard, then "end"
  }

  // The live status line: read aloud by screen readers when it changes (role="status").
  let status = "";
  if (listening) {
    status = interim === "" ? bg.voice.listening : fill(bg.voice.heard, { text: interim });
  } else if (notice !== null) {
    status = notice.text;
  }

  const isError = notice?.kind === "error" && !listening;
  return (
    <div className="voice-input flex flex-col gap-2">
      <Button
        variant="secondary"
        size="xl"
        className={cn("self-start", listening && "border-accent bg-accent-bg")}
        onClick={listening ? stop : start}
        disabled={disabled}
      >
        {listening ? (
          <Square className="size-6 shrink-0" aria-hidden="true" />
        ) : (
          <Mic className="size-6 shrink-0" aria-hidden="true" />
        )}
        <span>{listening ? bg.voice.stop : bg.voice.start}</span>
      </Button>
      {/* A live region: read aloud when it changes. Its height is reserved, so the
          buttons below do not jump when the text appears. */}
      <p
        role="status"
        className={cn("min-h-[1.6em] text-lg", isError ? "font-medium text-danger-fg" : "text-fg")}
      >
        {status}
      </p>
      <p className="text-sm text-fg-subtle">{bg.voice.privacyNote}</p>
    </div>
  );
}
