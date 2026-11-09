// /dev/moderator/scripts/nova: preview of /moderator/scripts/nova (a new card).

import { ScriptEditor } from "@/components/moderator/ScriptEditor";

export default function NewScriptPreviewPage() {
  return <ScriptEditor scriptId={null} basePath="/dev/moderator/scripts" />;
}
