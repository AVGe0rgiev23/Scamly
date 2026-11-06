// Helpers for voice input on the older person's text step (task W2-10, VoiceInput.tsx).
// The browser's Web Speech API turns speech into text; these small pure functions
// (no browser needed) are unit-tested in voice.test.ts.

import { bg } from "@/i18n/bg";

// ---------------------------------------------------------------------------------
// The few parts of the Web Speech API we use. TypeScript's built-in types don't
// describe SpeechRecognition yet (only Chrome-based browsers and Safari have it), so we
// describe them ourselves, like a Python Protocol.
// ---------------------------------------------------------------------------------

// One recognised piece of speech: `isFinal` false = still a guess (interim result).
export type SpeechResultLike = {
  isFinal: boolean;
  0: { transcript: string }; // the best guess
};

// The "result" event: every piece heard so far; new ones start at `resultIndex`.
export type SpeechResultEventLike = {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechResultLike };
};

// The "error" event: `error` is a code such as "no-speech" or "not-allowed".
export type SpeechErrorEventLike = { error: string };

// A recognition session (new SpeechRecognition()).
export type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  onerror: ((event: SpeechErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

// The class itself: `new` makes a session (like calling a Python class).
export type SpeechRecognitionClass = new () => SpeechRecognitionLike;

// Where the class may live: the standard name, or Chrome's and Safari's "webkit" name.
export type SpeechScope = {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
};

// The browser's SpeechRecognition class, or null when this browser has none (then the
// „Говорете“ button is not shown at all; typing always works).
export function findSpeechRecognition(scope: SpeechScope): SpeechRecognitionClass | null {
  const found = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
  return typeof found === "function" ? (found as SpeechRecognitionClass) : null;
}

// Splits the new pieces of a "result" event into final text and the current guess.
export function readResults(event: SpeechResultEventLike): { final: string; interim: string } {
  let final = "";
  let interim = "";
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result = event.results[i];
    if (result === undefined) continue;
    if (result.isFinal) {
      final += result[0].transcript;
    } else {
      interim += result[0].transcript;
    }
  }
  return { final: final.trim(), interim: interim.trim() };
}

// Adds spoken text at the end of what is already in the field, with one space in
// between, and never longer than `max` characters (the field's limit).
export function appendSpoken(current: string, spoken: string, max: number): string {
  const words = spoken.trim();
  if (words === "") {
    return current;
  }
  const needsSpace = current !== "" && !/\s$/.test(current);
  return (current + (needsSpace ? " " : "") + words).slice(0, max);
}

// A clear Bulgarian message for an error code of the Web Speech API, or null when
// there is nothing to say ("aborted" = we stopped it ourselves).
export function voiceErrorMessage(code: string): string | null {
  switch (code) {
    case "aborted":
      return null;
    case "no-speech":
      return bg.voice.errorNoSpeech;
    case "not-allowed":
    case "service-not-allowed":
      return bg.voice.errorNotAllowed;
    case "audio-capture":
      return bg.voice.errorNoMicrophone;
    case "network":
      return bg.voice.errorNetwork;
    default:
      return bg.voice.errorOther;
  }
}
