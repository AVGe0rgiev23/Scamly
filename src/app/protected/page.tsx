// /protected: the home of the older person's paired phone: the call check (W2-01).
// The role guard is in layout.tsx; everything on the screen runs in the browser and
// talks only to our API (which checks the phone's login again on every request).
// CallCheckPage reads the voice switch (W2-10) on the server first.

import { CallCheckPage } from "@/components/protected/CallCheckPage";

import { HelpLink } from "@/components/help/RoleHelp";

export default function ProtectedPage() {
  return (
    <>
      <CallCheckPage />
      <p>
        <HelpLink role="protected" />
      </p>
    </>
  );
}
