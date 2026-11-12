// An inline message under a form or above a list: an error, a success, a warning or
// a neutral note. `role` makes screen readers read it aloud: "alert" interrupts
// (errors), "status" waits for a pause (success, progress).

import type { HTMLAttributes } from "react";
import { STATUS_TINT, StatusIcon, type Status } from "./Badge";
import { cn } from "./cn";

type NoticeProps = HTMLAttributes<HTMLDivElement> & {
  status?: Status;
  // The message as a heading-like first line (optional).
  title?: string;
};

export function Notice({ status = "info", title, className, children, ...props }: NoticeProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border px-4 py-3 text-base",
        STATUS_TINT[status],
        className,
      )}
      {...props}
    >
      <StatusIcon status={status} className="mt-[0.2em]" />
      <div className="min-w-0 text-fg">
        {title === undefined ? null : <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}
