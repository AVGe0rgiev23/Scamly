// /protected: the home of the older person's paired phone: the call check (W2-01).
// The role guard is in layout.tsx; everything on the screen runs in the browser and
// talks only to our API (which checks the phone's login again on every request).

import { CallCheck } from "@/components/protected/CallCheck";

export default function ProtectedPage() {
  return <CallCheck />;
}
