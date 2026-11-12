// „Статистика“ in the admin panel (W3-06): checks per day (stacked by result), the
// result split, the kinds of scam and the reports per district (top 10), for the last
// 7, 30 or 90 days. Data: GET /api/admin/stats?days=…, which checks the admin role.
// Looks: a period switch, the totals as big numbers in a strip between hairlines, then
// the charts as hairline sections in two columns (the per-day chart spans both).
"use client";

import { useEffect, useState } from "react";
import { callApi } from "@/components/family/api";
import { districtName, fill } from "@/components/family/format";
import { Notice } from "@/components/ui/Notice";
import { Skeleton, SkeletonChart } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { bg } from "@/i18n/bg";
import {
  CHECK_LEVELS,
  DEFAULT_STATS_DAYS,
  REPORT_STATUSES,
  STATS_PERIODS,
  type AdminStatsDto,
} from "@/schemas/admin";
import { dayTotal, formatLongDay } from "./adminFormat";
import {
  BarChart,
  ChartCard,
  DayChart,
  LEVEL_FILL,
  LevelName,
  NumbersTable,
  PLAIN_FILL,
} from "./Charts";

type StatsState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; stats: AdminStatsDto };

export function StatsPanel() {
  const [days, setDays] = useState<number>(DEFAULT_STATS_DAYS);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<StatsState>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    async function load() {
      const result = await callApi<AdminStatsDto>(`/api/admin/stats?days=${days}`);
      if (!active) return;
      setState(
        result.ok
          ? { kind: "ready", stats: result.data }
          : { kind: "error", message: result.messageBg },
      );
    }
    void load();
    return () => {
      active = false;
    };
  }, [days, attempt]);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <h2 className="text-h3">{bg.admin.statsTitle}</h2>
        {/* The period: a row of three toggle buttons (aria-pressed says which is on). */}
        <div
          role="group"
          aria-label={bg.admin.periodLabel}
          className="inline-flex self-start rounded-md border border-line-strong p-1"
        >
          {STATS_PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              className="pressable tabular min-h-11 cursor-pointer rounded-sm px-4 font-mono text-sm text-fg-muted hover:text-fg aria-pressed:bg-surface-3 aria-pressed:font-semibold aria-pressed:text-fg"
              aria-pressed={days === period}
              onClick={() => {
                if (period === days) return;
                setState({ kind: "loading" });
                setDays(period);
              }}
            >
              {fill(bg.admin.periodDays, { days: period })}
            </button>
          ))}
        </div>
      </div>
      <StatsBody
        state={state}
        onRetry={() => {
          setState({ kind: "loading" });
          setAttempt(attempt + 1);
        }}
      />
    </div>
  );
}

// "Проверки: {count}" -> "Проверки:": the words of a total, shown above its big number.
function totalWords(template: string): string {
  return template.replace("{count}", "").trim();
}

function StatsBody({ state, onRetry }: { state: StatsState; onRetry: () => void }) {
  if (state.kind === "loading") {
    return (
      <>
        <p role="status" className="sr-only">
          {bg.admin.loading}
        </p>
        {/* The shape of the page: the totals strip and the first chart. */}
        <div aria-hidden="true">
          <Skeleton className="h-4 w-64 max-w-full" />
          <div className="mt-4 flex gap-12 border-y border-line py-6">
            <Skeleton className="h-12 w-28" />
            <Skeleton className="h-12 w-28" />
          </div>
          <Skeleton className="mt-8 h-7 w-56" />
          <SkeletonChart className="mt-6 h-48 md:h-56" />
        </div>
      </>
    );
  }
  if (state.kind === "error") {
    return <ErrorState text={state.message} retryLabel={bg.admin.retry} onRetry={onRetry} />;
  }

  const { stats } = state;
  const levelHead = [
    bg.admin.tableDate,
    ...CHECK_LEVELS.map((level) => bg.admin.levelNames[level]),
    bg.admin.tableTotal,
  ];
  const answered = stats.checksByScript.reduce((sum, row) => sum + row.count, 0);

  return (
    <>
      <p className="tabular font-mono text-sm text-fg-muted">
        {fill(bg.admin.periodRange, {
          from: formatLongDay(stats.from),
          to: formatLongDay(stats.to),
        })}
      </p>
      {/* The two totals: a strip between hairlines (the first chart draws the lower one), big numbers in the data font.
          Each is one line of text for screen readers („Проверки: 15“). */}
      <div className="mt-4 flex flex-wrap gap-x-16 gap-y-2 border-t border-line py-5">
        {[
          { words: totalWords(bg.admin.totalsChecks), count: stats.totals.checks },
          { words: totalWords(bg.admin.totalsReports), count: stats.totals.reports },
        ].map((total) => (
          <p key={total.words}>
            <span className="block text-sm text-fg-muted">{total.words}</span>{" "}
            <span className="tabular mt-1 block font-mono text-h2 leading-none font-semibold">
              {total.count}
            </span>
          </p>
        ))}
      </div>
      {stats.partial ? (
        <Notice status="caution" role="status" className="mt-6">
          {bg.admin.partialNote}
        </Notice>
      ) : null}

      <div className="grid gap-x-12 md:grid-cols-2">
        <ChartCard
          className="md:col-span-2"
          title={bg.admin.checksPerDayTitle}
          text={bg.admin.checksPerDayText}
          empty={stats.totals.checks === 0}
          table={
            <NumbersTable
              caption={bg.admin.checksPerDayTitle}
              head={levelHead}
              rows={stats.checksPerDay.map((day) => [
                formatLongDay(day.date),
                ...CHECK_LEVELS.map((level) => day[level]),
                dayTotal(day),
              ])}
            />
          }
        >
          <DayChart days={stats.checksPerDay} />
        </ChartCard>

        <ChartCard
          title={bg.admin.checksByLevelTitle}
          empty={stats.totals.checks === 0}
          table={
            <NumbersTable
              caption={bg.admin.checksByLevelTitle}
              head={[bg.admin.tableLevel, bg.admin.tableCount]}
              rows={CHECK_LEVELS.map((level) => [
                bg.admin.levelNames[level],
                stats.checksByLevel[level],
              ])}
            />
          }
        >
          <BarChart
            bars={CHECK_LEVELS.map((level) => ({
              key: level,
              label: <LevelName level={level} />,
              value: stats.checksByLevel[level],
              fillClass: LEVEL_FILL[level],
            }))}
          />
        </ChartCard>

        <ChartCard
          title={bg.admin.checksByScriptTitle}
          text={bg.admin.checksByScriptText}
          empty={answered === 0}
          table={
            <NumbersTable
              caption={bg.admin.checksByScriptTitle}
              head={[bg.admin.tableScript, bg.admin.tableCount]}
              rows={stats.checksByScript.map((row) => [
                bg.scripts.typeNames[row.scriptType],
                row.count,
              ])}
            />
          }
        >
          <BarChart
            bars={stats.checksByScript.map((row) => ({
              key: row.scriptType,
              label: bg.scripts.typeNames[row.scriptType],
              value: row.count,
              fillClass: PLAIN_FILL,
            }))}
          />
        </ChartCard>

        <ChartCard
          title={bg.admin.reportsByDistrictTitle}
          text={bg.admin.reportsByDistrictText}
          empty={stats.totals.reports === 0}
          table={
            <NumbersTable
              caption={bg.admin.reportsByDistrictTitle}
              head={[
                bg.admin.tableDistrict,
                ...REPORT_STATUSES.map((status) => bg.admin.reportStatuses[status]),
                bg.admin.tableTotal,
              ]}
              rows={stats.reportsByDistrict.map((row) => [
                districtName(row.districtCode),
                ...REPORT_STATUSES.map((status) => row[status]),
                row.total,
              ])}
            />
          }
        >
          <ul className="mb-6 flex flex-wrap gap-x-6 gap-y-1 text-sm text-fg-muted">
            {REPORT_STATUSES.map((status) => (
              <li key={status}>
                {bg.admin.reportStatuses[status]}:{" "}
                <strong className="tabular font-mono font-semibold text-fg">
                  {stats.reportsByStatus[status]}
                </strong>
              </li>
            ))}
          </ul>
          <BarChart
            bars={stats.reportsByDistrict.map((row) => ({
              key: row.districtCode,
              label: districtName(row.districtCode),
              value: row.total,
              fillClass: PLAIN_FILL,
            }))}
          />
        </ChartCard>
      </div>
    </>
  );
}
