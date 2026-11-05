// /protected: TEMPORARY page that only shows the name of the area (the site header shows
// who is logged in). The real page comes later.

import { bg } from "@/i18n/bg";

export default function ProtectedPage() {
  return <h1 className="text-3xl font-bold">{bg.areas.protected}</h1>;
}
