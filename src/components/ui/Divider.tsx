// A thin line between two parts of a page. With `signal` it is drawn as the calm
// signal line (the brand motif) instead of a plain rule.

import { cn } from "./cn";
import { SignalLine } from "./SignalLine";

export function Divider({ signal = false, className }: { signal?: boolean; className?: string }) {
  if (signal) {
    return <SignalLine state="idle" className={cn("h-6 text-line-strong", className)} />;
  }
  return <hr className={cn("border-0 border-t border-line", className)} />;
}
