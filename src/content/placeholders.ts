// PLACEHOLDERS: the ONLY made-up content shown on the public site.
//
// The home page shows small example screens (a sample call, a sample alert, a
// sample pairing code). None of this is real data and none of it is a statistic:
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
    label: "Обаждане от внучката",
    input: {
      claimedIdentity: "relative",
      asksMoney: "no",
      handover: null,
      rushing: "no",
      secrecy: "no",
      text: "Здравей, бабо, аз съм. Ще дойда в събота на обяд. Да донеса ли нещо от магазина?",
    },
  },
];

// The example people and values in the small feature screens.
export const SAMPLE = {
  protectedName: "Баба Мария",
  familyName: "Иван",
  pairingCode: "482 915",
  pairingTimeLeft: "9:42",
  alertTime: "14:32",
  // The times of the four steps of the sample alert (hours:minutes:seconds).
  timelineTimes: ["14:32:05", "14:32:06", "14:32:41", "14:33:10"],
  voiceHeard: "казаха, че са от полицията",
} as const;
