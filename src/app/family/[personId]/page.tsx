// /family/[personId]: the page of one protected person.
//
// A Server Component that only reads the id from the address and checks its format
// (not a uuid -> the normal 404 page). Everything else is loaded from our API in
// the browser by <PersonDashboard />, so the API's checks decide what is shown.
// The role guard is in ../layout.tsx. With Cache Components the id is "request
// data", so it is read inside the layout's <Suspense>.

import { notFound } from "next/navigation";
import { PersonDashboard } from "@/components/family/PersonDashboard";
import { IdParamSchema } from "@/schemas/persons";

export default async function PersonPage({ params }: PageProps<"/family/[personId]">) {
  const { personId } = await params;
  const id = IdParamSchema.safeParse(personId);
  if (!id.success) {
    notFound();
  }
  return <PersonDashboard personId={id.data} />;
}
