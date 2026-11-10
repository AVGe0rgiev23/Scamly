// „Статистика“ in the admin panel (W3-06): checks per day (stacked by result), the
// result split, the kinds of scam and the reports per district (top 10), for the last
// 7, 30 or 90 days. Data: GET /api/admin/stats?days=…, which checks the admin role.
"use client";

import { useEffect, useState } from "react";
import { callApi } from "@/components/family/api";
import { districtName, fill } from "@/components/family/format";
import { Button } from "@/components/ui/Button";
import { bg } from "@/i18n/bg";
import {
  CHECK_LEVELS,
  DEFAULT_STATS_DAYS,
  REPORT_STATUSES,
  STATS_PERIODS,
  type AdminStatsDto,
} from "@/schemas/admin";
import { dayTotal, formatLongDay } from "./adminFormat";
import { BarChart, ChartCard, DayChart, LevelName, NumbersTable } from "./Charts";

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
    <div className="admin-section">
      <h2>{bg.admin.statsTitle}</h2>
      <div role="group" aria-label={bg.admin.periodLabel} className="admin-periods">
        {STATS_PERIODS.map((period) => (
          <button
            key={period}
            type="button"
            className="button button-secondary admin-period"
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

function StatsBody({ state, onRetry }: { state: StatsState; onRetry: () => void }) {
  if (state.kind === "loading") {
    return (
      <p role="status" className="muted">
        {bg.admin.loading}
      </p>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="family-error">
        <p role="alert" className="form-message form-message-error">
          {state.message}
        </p>
        <Button variant="secondary" onClick={onRetry}>
          {bg.admin.retry}
        </Button>
      </div>
    );
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
      <p className="admin-period-line">
        <span>
          {fill(bg.admin.periodRange, {
            from: formatLongDay(stats.from),
            to: formatLongDay(stats.to),
          })}
        </span>
        <strong>{fill(bg.admin.totalsChecks, { count: stats.totals.checks })}</strong>
        <strong>{fill(bg.admin.totalsReports, { count: stats.totals.reports })}</strong>
      </p>
      {stats.partial ? (
        <p role="status" className="form-message admin-partial">
          {bg.admin.partialNote}
        </p>
      ) : null}

      <div className="admin-charts">
        <ChartCard
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
              fillClass: `admin-fill-${level}`,
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
              fillClass: "admin-fill-primary",
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
          <ul className="admin-statuses">
            {REPORT_STATUSES.map((status) => (
              <li key={status}>
                {bg.admin.reportStatuses[status]}: <strong>{stats.reportsByStatus[status]}</strong>
              </li>
            ))}
          </ul>
          <BarChart
            bars={stats.reportsByDistrict.map((row) => ({
              key: row.districtCode,
              label: districtName(row.districtCode),
              value: row.total,
              fillClass: "admin-fill-primary",
            }))}
          />
        </ChartCard>
      </div>
    </>
  );
}
