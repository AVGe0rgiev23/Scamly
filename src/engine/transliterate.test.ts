// Unit tests for transliterate.ts: шльокавица → Cyrillic.

import { describe, expect, it } from "vitest";
import { hasLatin, transliterate } from "./transliterate";

// Transliterates every word of a sentence (the real code does it token by token).
function sentence(text: string): string {
  return text
    .split(" ")
    .map((word) => transliterate(word))
    .join(" ");
}

describe("transliterate", () => {
  it("turns the examples from the brief into Cyrillic", () => {
    expect(transliterate("politsiya")).toBe("полиция");
    expect(sentence("hvarlete parite ot terasata")).toBe("хварлете парите от терасата");
    expect(sentence("sinat vi katastrofira")).toBe("синат ви катастрофира");
  });

  it("applies the longest rule first: sht before sh, sh before s + h", () => {
    expect(transliterate("shte")).toBe("ще");
    expect(transliterate("sht")).toBe("щ");
    expect(transliterate("shapka")).toBe("шапка");
    expect(transliterate("chovek")).toBe("човек");
    expect(transliterate("zhena")).toBe("жена");
    expect(transliterate("tsena")).toBe("цена");
  });

  it("maps ya/ia/q to я and yu/iu to ю", () => {
    expect(transliterate("tryabva")).toBe("трябва");
    expect(transliterate("policia")).toBe("полиця");
    expect(transliterate("policiq")).toBe("полиция");
    expect(transliterate("yutiya")).toBe("ютия");
    expect(transliterate("liubov")).toBe("любов");
  });

  it("decides y by context: й next to a vowel, ъ between consonants", () => {
    expect(transliterate("dayte")).toBe("дайте");
    expect(transliterate("moy")).toBe("мой");
    expect(transliterate("yoan")).toBe("йоан");
    expect(transliterate("kyshta")).toBe("къща");
  });

  it("maps w, x, h and j as planned", () => {
    expect(transliterate("wreme")).toBe("време");
    expect(transliterate("xubavo")).toBe("хубаво");
    expect(transliterate("hora")).toBe("хора");
    expect(transliterate("jivot")).toBe("йивот");
  });

  it("leaves Cyrillic words alone and handles mixed words", () => {
    expect(transliterate("полиция")).toBe("полиция");
    expect(transliterate("kaшete")).toBe("кашете");
    expect(transliterate("2026")).toBe("2026");
  });

  it("knows which words contain Latin letters", () => {
    expect(hasLatin("pari")).toBe(true);
    expect(hasLatin("PARI")).toBe(true);
    expect(hasLatin("пари")).toBe(false);
    expect(hasLatin("100")).toBe(false);
  });
});
