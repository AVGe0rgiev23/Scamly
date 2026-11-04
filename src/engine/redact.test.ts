// Unit tests for redact.ts: personal data is removed, ordinary text is not.

import { describe, expect, it } from "vitest";
import { passesLuhn, redactPersonalData } from "./redact";

describe("phones", () => {
  it("redacts Bulgarian mobiles with spaces, dashes, dots or nothing", () => {
    for (const phone of [
      "0888123456",
      "0888 123 456",
      "088 812 3456",
      "0888-123-456",
      "0888.123.456",
      "0898 12 34 56",
    ]) {
      expect(redactPersonalData(`Обадете се на ${phone}.`)).toBe("Обадете се на [ТЕЛЕФОН].");
    }
  });

  it("redacts +359 and 00359 numbers", () => {
    expect(redactPersonalData("+359 888 123 456")).toBe("[ТЕЛЕФОН]");
    expect(redactPersonalData("+359888123456")).toBe("[ТЕЛЕФОН]");
    expect(redactPersonalData("00359 88 812 3456")).toBe("[ТЕЛЕФОН]");
    expect(redactPersonalData("+359 (0) 888 123 456")).toBe("[ТЕЛЕФОН]");
    expect(redactPersonalData("+359 2 981 1234")).toBe("[ТЕЛЕФОН]");
  });

  it("redacts landlines", () => {
    expect(redactPersonalData("02 981 1234")).toBe("[ТЕЛЕФОН]");
    expect(redactPersonalData("032-123-456")).toBe("[ТЕЛЕФОН]");
  });
});

describe("e-mails", () => {
  it("redacts e-mail addresses", () => {
    expect(redactPersonalData("Пишете на ivan.petrov+bank@mail.bg веднага")).toBe(
      "Пишете на [ИМЕЙЛ] веднага",
    );
    expect(redactPersonalData("a@b.co")).toBe("[ИМЕЙЛ]");
  });
});

describe("IBANs", () => {
  it("redacts a Bulgarian IBAN with or without spaces, in any case", () => {
    expect(redactPersonalData("Сметка BG80BNBG96611020345678.")).toBe("Сметка [IBAN].");
    expect(redactPersonalData("BG80 BNBG 9661 1020 3456 78")).toBe("[IBAN]");
    expect(redactPersonalData("bg80bnbg96611020345678")).toBe("[IBAN]");
  });

  it("redacts a foreign IBAN shape", () => {
    expect(redactPersonalData("DE89 3704 0044 0532 0130 00")).toBe("[IBAN]");
    expect(redactPersonalData("GB29NWBK60161331926819")).toBe("[IBAN]");
  });
});

describe("card numbers", () => {
  it("redacts 13–19 digit numbers that pass the Luhn check", () => {
    expect(redactPersonalData("Картата е 4111 1111 1111 1111.")).toBe("Картата е [КАРТА].");
    expect(redactPersonalData("4111-1111-1111-1111")).toBe("[КАРТА]");
    expect(redactPersonalData("5555555555554444")).toBe("[КАРТА]");
    expect(redactPersonalData("4222222222222")).toBe("[КАРТА]"); // 13 digits
  });

  it("leaves long numbers that fail the Luhn check", () => {
    expect(redactPersonalData("Номер 4111 1111 1111 1112")).toBe("Номер 4111 1111 1111 1112");
  });

  it("implements the Luhn check", () => {
    expect(passesLuhn("79927398713")).toBe(true);
    expect(passesLuhn("79927398710")).toBe(false);
    expect(passesLuhn("")).toBe(false);
  });
});

describe("ЕГН", () => {
  it("redacts a 10-digit personal number", () => {
    expect(redactPersonalData("ЕГН 4502151234, моля.")).toBe("ЕГН [ЕГН], моля.");
  });

  it("does not redact 9 or 11 digits as an ЕГН", () => {
    expect(redactPersonalData("123456789")).toBe("123456789");
    expect(redactPersonalData("12345678901")).toBe("12345678901");
  });
});

describe("known names", () => {
  it("redacts known names case-insensitively, whole words only", () => {
    expect(
      redactPersonalData("Обадих се на мария петрова и Иван.", ["Мария Петрова", "Иван"]),
    ).toBe("Обадих се на [ИМЕ] и [ИМЕ].");
    expect(redactPersonalData("Иванка дойде.", ["Иван"])).toBe("Иванка дойде.");
  });

  it("redacts each part of a full name on its own", () => {
    expect(redactPersonalData("Петрова каза, че Мария е вкъщи.", ["Мария Петрова"])).toBe(
      "[ИМЕ] каза, че [ИМЕ] е вкъщи.",
    );
  });

  it("ignores empty names and escapes special characters", () => {
    expect(redactPersonalData("Текст без имена.", ["", "  ", "a"])).toBe("Текст без имена.");
    expect(redactPersonalData("Здравей, Ан.(тест)", ["Ан.(тест)"])).toBe("Здравей, [ИМЕ]");
  });
});

describe("several kinds in one text", () => {
  it("redacts every kind at once", () => {
    const text =
      "Аз съм Иван от банката, тел. 0888 123 456, имейл ivan@bank.bg. " +
      "Преведете по BG80BNBG96611020345678 и кажете картата 4111111111111111 и ЕГН 4502151234.";
    expect(redactPersonalData(text, ["Иван"])).toBe(
      "Аз съм [ИМЕ] от банката, тел. [ТЕЛЕФОН], имейл [ИМЕЙЛ]. " +
        "Преведете по [IBAN] и кажете картата [КАРТА] и ЕГН [ЕГН].",
    );
  });
});

describe("no false positives", () => {
  it("leaves amounts, dates, times and short numbers alone", () => {
    for (const text of [
      "Трябват 100 лева до 5 часа.",
      "Дайте 2000 евро.",
      "Елате на 08.11.2026 в 10:30.",
      "Срещата е на 05.11.2026 10:00 ч.",
      "Роден съм през 1948 г.",
      "Кодът на пратката е 12345.",
      "",
    ]) {
      expect(redactPersonalData(text)).toBe(text);
    }
  });
});
