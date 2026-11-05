// /family/new: add a protected person (name + district). The role guard is in
// ../layout.tsx; the form sends POST /api/persons from the browser.

import { CreatePersonPage } from "@/components/family/CreatePersonPage";

export default function NewPersonPage() {
  return <CreatePersonPage />;
}
