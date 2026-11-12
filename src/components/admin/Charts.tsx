// Hand-made bar charts for the admin statistics (W3-06), built from plain HTML and
// CSS instead of a chart library (BUILD_PLAN Q9; WHY_WE_CHOSE: "Hand-made bar charts").
//
//   DayChart     one column per day, stacked by the result of the check
//   BarChart     horizontal bars with a name and a number (levels, scripts, districts)
//   NumbersTable the same numbers as a real <table>, inside „Покажи числата“
//
// The bars are only a picture (aria-hidden): screen readers read the table instead.
// Bar lengths are percentages of the biggest value, so the charts shrink with the
// screen (360 px) and never scroll sideways. The colours are our status tokens
// (red/yellow/green = danger/caution/safe, unfinished = surface-3), so dark mode works
// by itself; the levels also have their icon and word in the legend, and stripes on
// yellow and "unfinished", so colour is never the only hint.

import { ChevronRight, CircleDashed } from "lucide-react";
import type { ReactNode } from "react";
import { fill } from "@/components/family/format";
import { StatusIcon } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { LEVEL_STATUS } from "@/components/ui/Verdict";
import { bg } from "@/i18n/bg";
import { CHECK_LEVELS, type CheckLevel, type LevelCounts } from "@/schemas/admin";
import { barPercent, dayTotal, formatLongDay, formatShortDay } from "./adminFormat";

// Thin diagonal stripes in the page colour over a fill: a pattern that tells
// "suspicious" and "unfinished" apart from the plain fills without colour.
const STRIPES = "bg-[image:repeating-linear-gradient(135deg,transparent_0_4px,var(--bg)_4px_6px)]";

// The fill of each level (a token class; plus stripes for two of them).
export const LEVEL_FILL: Record<CheckLevel, string> = {
  red: "bg-danger-solid",
  yellow: cn("bg-caution-solid", STRIPES),
  green: "bg-safe-solid",
  unfinished: cn("bg-surface-3", STRIPES),
};

// The fill of the bars that are not a level (kinds of scam, districts).
export const PLAIN_FILL = "bg-accent";

// The colour of the icon in the legend (the tinted text colour of each status).
const LEVEL_ICON_TEXT: Record<CheckLevel, string> = {
  red: "text-danger-fg",
  yellow: "text-caution-fg",
  green: "text-safe-fg",
  unfinished: "text-fg-subtle",
};

// „Признаци на измама“ with its icon and a small swatch of the bar colour.
export function LevelName({ level }: { level: CheckLevel }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn("size-3.5 shrink-0 rounded-sm border border-line", LEVEL_FILL[level])}
        aria-hidden="true"
      />
      {level === "unfinished" ? (
        <CircleDashed className="size-[1.15em] shrink-0 text-fg-subtle" aria-hidden="true" />
      ) : (
        <StatusIcon status={LEVEL_STATUS[level]} className={LEVEL_ICON_TEXT[level]} />
      )}
      {bg.admin.levelNames[level]}
    </span>
  );
}

// A chart with its title, a short explanation, the picture and the numbers.
// A section between hairlines (not a box), so several charts read as one panel.
export function ChartCard(props: {
  title: string;
  text?: string;
  empty: boolean;
  children: ReactNode; // the picture (and its legend)
  table: ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn("min-w-0 border-t border-line pt-6 pb-8", props.className)}>
      <figcaption className="mb-6 max-w-[60ch]">
        <h3 className="text-h3">{props.title}</h3>
        {props.text ? <p className="mt-1 text-sm text-fg-muted">{props.text}</p> : null}
      </figcaption>
      {props.empty ? <p className="text-fg-subtle">{bg.admin.noData}</p> : props.children}
      {props.empty ? null : (
        <details className="group mt-4">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-medium text-fg-muted hover:text-fg [&::-webkit-details-marker]:hidden">
            <ChevronRight className="size-4 group-open:rotate-90" aria-hidden="true" />
            {bg.admin.showNumbers}
            <span className="sr-only">: {props.title}</span>
          </summary>
          {props.table}
        </details>
      )}
    </figure>
  );
}

// The numbers of a chart as a table: a header row and one row per bar / day.
export function NumbersTable(props: {
  caption: string;
  head: string[];
  rows: (string | number)[][];
}) {
  return (
    // Scrolls sideways on its own (never the page) when a phone is too narrow.
    <div className="mt-3 max-w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{props.caption}</caption>
        <thead>
          <tr className="border-b border-line-strong">
            {props.head.map((cell, index) => (
              <th
                key={cell}
                scope="col"
                className={cn(
                  "py-2 pr-4 font-semibold text-fg-muted last:pr-0",
                  index === 0 ? "text-left" : "text-right",
                )}
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <tr key={String(row[0])} className="border-b border-line">
              {row.map((cell, index) =>
                index === 0 ? (
                  <th key={index} scope="row" className="py-2 pr-4 text-left font-medium">
                    {cell}
                  </th>
                ) : (
                  <td
                    key={index}
                    className="tabular py-2 pr-4 text-right font-mono text-xs last:pr-0"
                  >
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type Bar = { key: string; label: ReactNode; value: number; fillClass: string };

// Horizontal bars: the name above, the bar and its number below (fits 360 px).
export function BarChart({ bars }: { bars: Bar[] }) {
  const max = Math.max(0, ...bars.map((bar) => bar.value));
  return (
    <ul className="flex flex-col gap-4" aria-hidden="true">
      {bars.map((bar) => (
        <li key={bar.key} className="min-w-0">
          <span className="block text-sm text-fg">{bar.label}</span>
          <span className="mt-1.5 flex items-center gap-3">
            <span className="h-3 min-w-0 flex-1 rounded-sm bg-surface-2">
              {/* Only the length comes from the data (inline style); the colour is a token. */}
              <span
                className={cn("block h-full rounded-sm", bar.fillClass)}
                style={{ width: `${barPercent(bar.value, max)}%` }}
              />
            </span>
            <span className="tabular w-10 shrink-0 text-right font-mono text-sm">{bar.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

// One column per day, stacked: red at the bottom, then yellow, green, unfinished.
export function DayChart({ days }: { days: ({ date: string } & LevelCounts)[] }) {
  const max = Math.max(0, ...days.map(dayTotal));
  const first = days[0];
  const last = days[days.length - 1];
  const middle = days[Math.floor(days.length / 2)];
  return (
    <>
      <ul className="mb-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {CHECK_LEVELS.map((level) => (
          <li key={level}>
            <LevelName level={level} />
          </li>
        ))}
      </ul>
      <div aria-hidden="true">
        <p className="tabular mb-2 font-mono text-xs text-fg-subtle">
          {fill(bg.admin.maxLabel, { count: max })}
        </p>
        <div className="grid-lines flex h-48 items-end gap-px border-b border-line-strong md:h-56">
          {days.map((day) => (
            <div
              key={day.date}
              className="admin-day flex h-full min-w-0 flex-1 flex-col-reverse"
              title={`${formatLongDay(day.date)}: ${dayTotal(day)}`}
            >
              {CHECK_LEVELS.map((level) =>
                day[level] > 0 ? (
                  <span
                    key={level}
                    className={cn("block w-full", LEVEL_FILL[level])}
                    style={{ height: `${barPercent(day[level], max)}%` }}
                  />
                ) : null,
              )}
            </div>
          ))}
        </div>
        <p className="tabular mt-2 flex justify-between font-mono text-xs text-fg-subtle">
          <span>{first ? formatShortDay(first.date) : ""}</span>
          <span>{middle && days.length > 2 ? formatShortDay(middle.date) : ""}</span>
          <span>{last ? formatShortDay(last.date) : ""}</span>
        </p>
      </div>
    </>
  );
}
