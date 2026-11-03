// /family: TEMPORARY page that only shows the name of the area (the layout shows
// who is logged in). The real page comes later.

import { bg } from "@/i18n/bg";

export default function FamilyPage() {
  return <h1 className="text-3xl font-bold">{bg.areas.family}</h1>;
}
