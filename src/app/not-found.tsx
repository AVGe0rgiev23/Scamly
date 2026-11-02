// The page shown when an address does not exist (HTTP 404), in Bulgarian.

import Link from "next/link";
import { bg } from "@/i18n/bg";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-3xl font-bold">{bg.common.notFoundTitle}</h1>
      <p className="text-lg">{bg.common.notFoundText}</p>
      <Link href="/" className="text-lg underline">
        {bg.common.backHome}
      </Link>
    </main>
  );
}
