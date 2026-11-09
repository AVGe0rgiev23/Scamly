// /moderator/scripts/[id]: edit one scam card (W3-05).
// Only checks the id's format here (not an id -> the normal 404 page); the card is
// loaded from our API in the browser by <ScriptEditor />. With Cache Components the
// id is request data, so it is read inside the layout's <Suspense>.

import { notFound } from "next/navigation";
import { ScriptEditor } from "@/components/moderator/ScriptEditor";
import { IdParamSchema } from "@/schemas/persons";

export default async function EditScriptPage({ params }: PageProps<"/moderator/scripts/[id]">) {
  const { id } = await params;
  const scriptId = IdParamSchema.safeParse(id);
  if (!scriptId.success) {
    notFound();
  }
  return <ScriptEditor scriptId={scriptId.data} />;
}
