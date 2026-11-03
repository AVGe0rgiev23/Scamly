// /svarzhi („свържи“): TEMPORARY pairing page for the older person's phone
// (BUILD_PLAN section 5). Roberta designs the real one in Session F (big digits,
// the ?kod= link from the QR code, clear errors).

import { bg } from "@/i18n/bg";
import { PairForm } from "../_auth-placeholders/forms";

export default function PairPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-bold">{bg.pairing.title}</h1>
      <p className="text-lg">{bg.pairing.intro}</p>
      <PairForm />
    </main>
  );
}
