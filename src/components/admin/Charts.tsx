// Hand-made bar charts for the admin statistics (W3-06), built from plain HTML and
// CSS instead of a chart library (BUILD_PLAN Q9; WHY_WE_CHOSE: "Hand-made bar charts").
//
//   DayChart     one column per day, stacked by the result of the check
//   BarChart     horizontal bars with a name and a number (levels, scripts, districts)
//   NumbersTable the same numbers as a real <table>, inside „Покажи числата“
//
// The bars are only a picture (aria-hidden): screen readers read the table instead.
// Bar lengths are percentages of the biggest value, so the charts shrink with the
// screen (360 px) and never scroll sideways. The colours are our theme tokens, so dark
// mode works by itself; the red/yellow/green levels also have their symbol and word
// in the legend and stripes on yellow and "unfinished", so colour is never the only hint.

import type { ReactNode } from "react";
import { VERDICT_SYMBOLS } from "@/components/ui/Verdict";
import { fill } from "@/components/family/format";
import { bg } from "@/i18n/bg";
import { CHECK_LEVELS, type CheckLevel, type LevelCounts } from "@/schemas/admin";
import { barPercent, dayTotal, formatLongDay, formatShortDay } from "./adminFormat";

const LEVEL_SYMBOLS: Record<CheckLevel, string> = { ...VERDICT_SYMBOLS, unfinished: "…" };

// „! Признаци на измама“: the symbol (hidden from screen readers) and the word.
export function LevelName({ level }: { level: CheckLevel }) {
  return (
    <span className="admin-level-name">
      <span className={`admin-swatch admin-fill-${level}`} aria-hidden="true">
        {LEVEL_SYMBOLS[level]}
      </span>
      {bg.admin.levelNames[level]}
    </span>
  );
}

// A chart with its title, a short explanation, the picture and the numbers.
export function ChartCard(props: {
  title: string;
  text?: string;
  empty: boolean;
  children: ReactNode; // the picture (and its legend)
  table: ReactNode;
}) {
  return (
    <figure className="card admin-chart">
      <figcaption>
        <h3>{props.title}</h3>
        {props.text ? <p className="muted">{props.text}</p> : null}
      </figcaption>
      {props.empty ? <p className="muted">{bg.admin.noData}</p> : props.children}
      {props.empty ? null : (
        <details className="admin-numbers">
          <summary>
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
    <div className="admin-table-wrap">
      <table className="admin-table">
        <caption className="sr-only">{props.caption}</caption>
        <thead>
          <tr>
            {props.head.map((cell, index) => (
              <th key={cell} scope="col" className={index === 0 ? undefined : "admin-num"}>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <tr key={String(row[0])}>
              {row.map((cell, index) =>
                index === 0 ? (
                  <th key={index} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={index} className="admin-num">
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
    <ul className="admin-bars" aria-hidden="true">
      {bars.map((bar) => (
        <li key={bar.key} className="admin-bar-row">
          <span className="admin-bar-label">{bar.label}</span>
          <span className="admin-bar-track">
            <span
              className={`admin-bar ${bar.fillClass}`}
              style={{ width: `${barPercent(bar.value, max)}%` }}
            />
            <span className="admin-bar-value">{bar.value}</span>
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
      <ul className="admin-legend">
        {CHECK_LEVELS.map((level) => (
          <li key={level}>
            <LevelName level={level} />
          </li>
        ))}
      </ul>
      <div className="admin-days" aria-hidden="true">
        <p className="admin-days-max muted">{fill(bg.admin.maxLabel, { count: max })}</p>
        <div className="admin-days-plot">
          {days.map((day) => (
            <div
              key={day.date}
              className="admin-day"
              title={`${formatLongDay(day.date)}: ${dayTotal(day)}`}
            >
              {CHECK_LEVELS.map((level) =>
                day[level] > 0 ? (
                  <span
                    key={level}
                    className={`admin-day-part admin-fill-${level}`}
                    style={{ height: `${barPercent(day[level], max)}%` }}
                  />
                ) : null,
              )}
            </div>
          ))}
        </div>
        <p className="admin-days-axis muted">
          <span>{first ? formatShortDay(first.date) : ""}</span>
          <span>{middle && days.length > 2 ? formatShortDay(middle.date) : ""}</span>
          <span>{last ? formatShortDay(last.date) : ""}</span>
        </p>
      </div>
    </>
  );
}
