// The interactive part of the scam map /karta (W3-03): the period switch (1 / 4 / 12
// weeks), the "scam wave" texts, the map with its legend, the district panel and the
// table of all 28 districts. Data: GET /api/map/stats?weeks=… in the browser (only
// counts of APPROVED reports; the CDN keeps the answer for 60 s, 3.39).
//
// Leaflet (the map drawing, DistrictMap.tsx) is loaded only in the browser and in its
// own small file (next/dynamic, ssr: false); everything else shows without it.
// Not colour-only: every number is also in the tooltips, the panel and the table.
//
// Look: the period switch as a segmented control; the map large on the left (8 of 12
// columns), the district panel and the waves on the right; the table of districts
// below with mono counts. A skeleton with the map's shape while loading, an error
// state with „Опитай отново“ and an empty state when there are no reports yet.
"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { callApi } from "@/components/family/api";
import { fill } from "@/components/family/format";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import type { DistrictCode, DistrictStatsDto, MapStatsDto } from "@/schemas/reports";
import {
  DEFAULT_PERIOD,
  districtName,
  legendText,
  LEVELS,
  MAP_PERIODS,
  reportsText,
  scriptCounts,
  scriptName,
  waveTexts,
  type MapPeriod,
} from "./mapData";

// Leaflet only in the browser, in a separate file (like a lazy Python import).
const DistrictMap = dynamic(() => import("./DistrictMap"), {
  ssr: false,
  loading: () => (
    <div>
      <p role="status" className="sr-only">
        {bg.map.loading}
      </p>
      <Skeleton className="aspect-[3/2] w-full rounded-md" />
    </div>
  ),
});

type StatsState =
  { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; stats: MapStatsDto };

export function ScamMap() {
  const [weeks, setWeeks] = useState<MapPeriod>(DEFAULT_PERIOD);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<StatsState>({ kind: "loading" });
  const [selected, setSelected] = useState<DistrictCode | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const result = await callApi<MapStatsDto>(`/api/map/stats?weeks=${weeks}`);
      if (!active) return;
      setState(
        result.ok
          ? { kind: "ready", stats: result.data }
          : { kind: "error", message: bg.map.loadError },
      );
    }
    void load();
    return () => {
      active = false;
    };
  }, [weeks, attempt]);

  // The same function on every render, so the map's effects don't run again.
  const onSelect = useCallback((code: DistrictCode) => setSelected(code), []);

  return (
    <div className="flex flex-col gap-10">
      <div
        role="group"
        aria-label={bg.map.periodLabel}
        className="inline-flex max-w-full self-start rounded-md border border-line-strong bg-surface-1 p-1"
      >
        {MAP_PERIODS.map((period) => (
          <button
            key={period}
            type="button"
            className="pressable min-h-11 cursor-pointer rounded-sm border border-transparent px-4 font-semibold text-fg-muted hover:text-fg aria-pressed:border-accent-line aria-pressed:bg-accent-bg aria-pressed:text-fg"
            aria-pressed={weeks === period}
            onClick={() => {
              if (period === weeks) return;
              setState({ kind: "loading" });
              setWeeks(period);
            }}
          >
            {bg.map.periods[period]}
          </button>
        ))}
      </div>

      {state.kind === "loading" ? <MapLoading /> : null}
      {state.kind === "error" ? (
        <ErrorState
          text={state.message}
          retryLabel={bg.map.retry}
          onRetry={() => {
            setState({ kind: "loading" });
            setAttempt(attempt + 1);
          }}
        />
      ) : null}
      {state.kind === "ready" ? (
        <MapBody stats={state.stats} selected={selected} onSelect={onSelect} />
      ) : null}

      <div className="flex flex-col gap-2 border-t border-line pt-6">
        <p className="text-sm text-fg-subtle">{bg.map.attribution}</p>
        <p>
          <Link
            href={ROUTES.report}
            className="inline-flex min-h-12 items-center gap-2 font-semibold text-accent underline underline-offset-4 hover:text-accent-hover"
          >
            {bg.map.reportLink}
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        </p>
      </div>
    </div>
  );
}

// The shape of the page while the numbers load: the map box, the panel and the table.
function MapLoading() {
  return (
    <div>
      <p role="status" className="sr-only">
        {bg.map.loading}
      </p>
      <div className="grid gap-6 md:grid-cols-12" aria-hidden="true">
        <Skeleton className="aspect-[3/2] w-full rounded-lg md:col-span-8" />
        <div className="flex flex-col gap-6 md:col-span-4">
          <Skeleton className="h-40 w-full rounded-lg" />
          <SkeletonText lines={4} />
        </div>
      </div>
    </div>
  );
}

type BodyProps = {
  stats: MapStatsDto;
  selected: DistrictCode | null;
  onSelect: (code: DistrictCode) => void;
};

function MapBody({ stats, selected, onSelect }: BodyProps) {
  const waves = waveTexts(stats);
  const empty = stats.districts.every((district) => district.total === 0);
  const chosen = stats.districts.find((district) => district.districtCode === selected) ?? null;

  return (
    <>
      {empty ? (
        <div role="status">
          <EmptyState text={bg.map.empty} />
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-12">
        <div className="flex flex-col gap-4 md:col-span-8">
          <div className="rounded-lg border border-line bg-surface-1 p-2 grid-lines md:p-4">
            <DistrictMap stats={stats} selected={selected} onSelect={onSelect} />
          </div>
          <Legend />
        </div>
        <div className="flex flex-col gap-6 md:col-span-4">
          <DistrictPanel district={chosen} />
          <section aria-labelledby="map-waves-title" className="border-t border-line pt-5">
            <h2 id="map-waves-title" className="text-h3">
              {bg.map.wavesTitle}
            </h2>
            {waves.length === 0 ? (
              <p className="mt-3 text-fg-muted">{bg.map.noWaves}</p>
            ) : (
              <ul className="mt-3 flex flex-col">
                {waves.map((text) => (
                  <li key={text} className="border-t border-line py-3 first:border-t-0">
                    {text}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section aria-labelledby="map-table-title">
        <h2 id="map-table-title" className="text-h3">
          {bg.map.tableTitle}
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">{bg.map.tableCaption}</caption>
            <thead>
              <tr className="border-b border-line-strong text-sm text-fg-muted">
                <th scope="col" className="py-2 pr-4 font-semibold">
                  {bg.map.tableDistrict}
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">
                  {bg.map.tableTotal}
                </th>
                <th scope="col" className="py-2 font-semibold">
                  {bg.map.tableWave}
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.districts.map((district) => (
                <tr
                  key={district.districtCode}
                  className={cn(
                    "border-b border-line",
                    district.districtCode === selected && "bg-surface-2",
                  )}
                >
                  <th scope="row" className="pr-4 font-normal">
                    <button
                      type="button"
                      className="min-h-11 cursor-pointer text-left font-semibold text-fg underline-offset-4 hover:text-accent hover:underline aria-pressed:text-accent"
                      aria-label={fill(bg.map.tableSelect, {
                        district: districtName(district.districtCode),
                      })}
                      aria-pressed={district.districtCode === selected}
                      onClick={() => onSelect(district.districtCode)}
                    >
                      {districtName(district.districtCode)}
                    </button>
                  </th>
                  <td className="tabular py-2 pr-4 text-right font-mono">{district.total}</td>
                  <td className="py-2 text-fg-muted">
                    {district.waves.length === 0
                      ? bg.map.tableNoWave
                      : district.waves.map((wave) => scriptName(wave.scriptType)).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

// The legend: a colour box and its numbers for every level.
function Legend() {
  return (
    <figure className="map-legend">
      <figcaption className="text-sm text-fg-muted">{bg.map.legendTitle}</figcaption>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
        {LEVELS.map((range) => (
          <li key={range.level} className="tabular flex items-center gap-2 font-mono text-xs">
            <span
              className={`map-swatch map-level-${range.level} size-4 rounded-sm border border-line-strong`}
              aria-hidden="true"
            />
            {legendText(range)}
          </li>
        ))}
      </ul>
    </figure>
  );
}

// The details of the chosen district. aria-live: a screen reader reads the new
// numbers when a district is chosen, while the focus stays on the map or the table.
function DistrictPanel({ district }: { district: DistrictStatsDto | null }) {
  return (
    <section
      className="map-panel min-h-40 rounded-lg border border-line bg-surface-1 p-5 md:p-6"
      aria-live="polite"
      aria-labelledby="map-panel-title"
    >
      {district === null ? (
        <>
          <h2 id="map-panel-title" className="sr-only">
            {bg.map.panelEmptyTitle}
          </h2>
          <p className="text-fg-muted">{bg.map.panelHint}</p>
        </>
      ) : (
        <>
          <h2 id="map-panel-title" className="text-h3">
            {fill(bg.map.panelTitle, { district: districtName(district.districtCode) })}
          </h2>
          <p className="tabular mt-2 font-mono text-sm text-fg-muted">
            {fill(bg.map.panelTotal, { count: district.total })}
          </p>
          {scriptCounts(district).length > 0 ? (
            <>
              <h3 className="mt-5 text-base font-semibold">{bg.map.panelByScript}</h3>
              <ul className="mt-2 flex flex-col">
                {scriptCounts(district).map(({ script, count }) => (
                  <li key={script} className="border-t border-line py-2">
                    {scriptName(script)}: {reportsText(count)}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {district.waves.map((wave) => (
            <p key={wave.scriptType} className="mt-3">
              <Badge>{fill(bg.map.panelWave, { script: scriptName(wave.scriptType) })}</Badge>
            </p>
          ))}
        </>
      )}
    </section>
  );
}
