// /dev/moderator/scripts/edit: preview of /moderator/scripts/[id], always with the
// made-up id PREVIEW_SCRIPT_ID (a fixed address, so no Suspense is needed).

import { PREVIEW_SCRIPT_ID } from "@/components/moderator/preview";
import { ScriptEditor } from "@/components/moderator/ScriptEditor";

export default function ScriptEditorPreviewPage() {
  return <ScriptEditor scriptId={PREVIEW_SCRIPT_ID} basePath="/dev/moderator/scripts" />;
}
