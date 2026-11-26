// The order of the education cards on /kak-raboti (P-04, D34): the „Роднина в беда“
// card (someone pretends to be a loved one) comes first, because it is our main story.
// The database keeps its own order (by script type, then title) and its seeded cards
// are not changed; we only move these cards to the front here, in the UI.
// A plain function without React, so it can be unit-tested.

import type { PublicScriptDto } from "@/schemas/scripts";

// Fake-relative cards first; all others keep the order they came in.
// Array.filter keeps the order, like a Python list comprehension with an `if`.
export function fakeRelativeFirst(scripts: PublicScriptDto[]): PublicScriptDto[] {
  const relative = scripts.filter((script) => script.scriptType === "relative_in_trouble");
  const others = scripts.filter((script) => script.scriptType !== "relative_in_trouble");
  return [...relative, ...others];
}
