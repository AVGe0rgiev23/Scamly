// /moderator/scripts: all scam cards, also drafts, for the moderator (W3-05).
// The list is loaded from our API in the browser (<ScriptLibrary />).

import { ScriptLibrary } from "@/components/moderator/ScriptLibrary";

export default function ModeratorScriptsPage() {
  return <ScriptLibrary />;
}
