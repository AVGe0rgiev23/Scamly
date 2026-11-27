// PLACEHOLDERS: the ONLY made-up content shown on the public site.
//
// The home page shows small example screens (the two-phone scene, sample calls for
// the real engine, a sample pairing code). None of this is real data and none of it is a statistic:
// the names, times and texts below are examples, and each example screen is
// labelled „Примерен екран“. Change the examples here, in one place.

import type { CallInput } from "@/engine";

// A sample call for the demo in the hero. The verdict is NOT written here: the
// real engine (src/engine) computes it from these answers and this text.
export type SampleCall = {
  id: string;
  label: string;
  input: Omit<CallInput, "extraKeywords">;
};

export const SAMPLE_CALLS: SampleCall[] = [
  {
    id: "crash",
    label: "„Катастрофирах“",
    input: {
      claimedIdentity: "relative",
      asksMoney: "yes",
      handover: "courier_or_stranger",
      rushing: "yes",
      secrecy: "yes",
      text: "Мамо, катастрофирах, трябват ми пари. Ще дойде човек да ги вземе. Не казвай на никого.",
    },
  },
  {
    id: "police",
    label: "Фалшив полицай",
    input: {
      claimedIdentity: "police",
      asksMoney: "yes",
      handover: "courier_or_stranger",
      rushing: "yes",
      secrecy: "yes",
      text: "Обажда се инспектор Петров от полицията. Провеждаме акция срещу телефонни измамници. Пригответе спестяванията си и ги дайте на наш служител. Не казвайте на никого.",
    },
  },
  {
    id: "courier",
    label: "Куриер с такса",
    input: {
      claimedIdentity: "courier",
      asksMoney: "yes",
      handover: "bank_transfer",
      rushing: "no",
      secrecy: "no",
      text: "Имате пратка от чужбина. Трябва да платите мито и такса за доставка, иначе ще я върнем.",
    },
  },
  {
    id: "relative",
    label: "Обаждане от сина",
    input: {
      claimedIdentity: "relative",
      asksMoney: "no",
      handover: null,
      rushing: "no",
      secrecy: "no",
      text: "Здравей, мамо, аз съм. Ще дойда в събота на обяд. Да донеса ли нещо от магазина?",
    },
  },
];

// The example people and values on the home page (D34): the mother is protected, her
// son Иван is asked first; Ана and Георги are the rest of the family.
export const SAMPLE = {
  protectedName: "Мария",
  // How the son's phone calls her: the title of her phone, and inside a sentence.
  momTitle: "Мама",
  momInSentence: "мама",
  familyName: "Иван",
  otherFamily: ["Ана", "Георги"],
  pairingCode: "482 915",
  // The time on the son's lock screen in the hero.
  clock: "14:32",
} as const;
