// Unit tests for the voice input helpers (voice.ts, W2-10).

import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import {
  appendSpoken,
  findSpeechRecognition,
  readResults,
  voiceErrorMessage,
  type SpeechResultEventLike,
} from "./voice";

// A constructor-like function, as browsers have for SpeechRecognition.
function FakeRecognition() {}

describe("findSpeechRecognition", () => {
  it("finds the standard name and Chrome's / Safari's webkit name", () => {
    expect(findSpeechRecognition({ SpeechRecognition: FakeRecognition })).toBe(FakeRecognition);
    expect(findSpeechRecognition({ webkitSpeechRecognition: FakeRecognition })).toBe(
      FakeRecognition,
    );
  });

  it("is null in a browser without speech recognition (e.g. Firefox)", () => {
    expect(findSpeechRecognition({})).toBeNull();
    expect(findSpeechRecognition({ SpeechRecognition: "not a class" })).toBeNull();
  });
});

// Builds a "result" event from (text, isFinal) pairs.
function resultEvent(resultIndex: number, pieces: [string, boolean][]): SpeechResultEventLike {
  const results = pieces.map(([transcript, isFinal]) => ({ isFinal, 0: { transcript } }));
  return { resultIndex, results };
}

describe("readResults", () => {
  it("splits final text from the current guess", () => {
    const event = resultEvent(0, [
      ["Казаха че са ", true],
      ["от полиция", false],
    ]);
    expect(readResults(event)).toEqual({ final: "Казаха че са", interim: "от полиция" });
  });

  it("reads only the new pieces (from resultIndex)", () => {
    const event = resultEvent(1, [
      ["старо", true],
      ["ново", true],
    ]);
    expect(readResults(event)).toEqual({ final: "ново", interim: "" });
  });
});

describe("appendSpoken", () => {
  it("adds spoken text after typed text with one space", () => {
    expect(appendSpoken("Искат пари.", "казаха да бързам", 2000)).toBe(
      "Искат пари. казаха да бързам",
    );
    expect(appendSpoken("Искат пари. ", "  казаха ", 2000)).toBe("Искат пари. казаха");
    expect(appendSpoken("", "полиция", 2000)).toBe("полиция");
  });

  it("keeps the field as it is when nothing was said", () => {
    expect(appendSpoken("текст", "   ", 2000)).toBe("текст");
  });

  it("never goes over the field's limit", () => {
    expect(appendSpoken("abc", "defgh", 6)).toBe("abc de");
  });
});

describe("voiceErrorMessage", () => {
  it("has a clear Bulgarian message for each common error", () => {
    expect(voiceErrorMessage("no-speech")).toBe(bg.voice.errorNoSpeech);
    expect(voiceErrorMessage("not-allowed")).toBe(bg.voice.errorNotAllowed);
    expect(voiceErrorMessage("service-not-allowed")).toBe(bg.voice.errorNotAllowed);
    expect(voiceErrorMessage("audio-capture")).toBe(bg.voice.errorNoMicrophone);
    expect(voiceErrorMessage("network")).toBe(bg.voice.errorNetwork);
    expect(voiceErrorMessage("something-new")).toBe(bg.voice.errorOther);
  });

  it("says nothing when we stopped it ourselves", () => {
    expect(voiceErrorMessage("aborted")).toBeNull();
  });
});
