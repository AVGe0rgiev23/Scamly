// Help page inside the protected area's existing role guard.
import { RoleHelp } from "@/components/help/RoleHelp";

export default function HelpPage() {
  return (
    <main className="shell py-10 md:py-16">
      <RoleHelp role="protected" />
    </main>
  );
}
