// /403: shown when a logged-in person opens an area that is not for their role
// (e.g. a family member opens /admin). TEMPORARY plain version; Roberta styles it in
// Session F.

import Link from "next/link";
import { bg } from "@/i18n/bg";

export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-3xl font-bold">{bg.areas.forbiddenTitle}</h1>
      <p className="text-lg">{bg.areas.forbiddenText}</p>
      <Link href="/" className="text-lg underline">
        {bg.common.backHome}
      </Link>
    </main>
  );
}
