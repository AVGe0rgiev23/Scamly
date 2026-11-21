// The interactive part of the scam map /karta (W3-03): the period switch (1 / 4 / 12
// weeks), the "scam wave" texts, the map with its legend, the district panel and the
// table of all 28 districts. Data: GET /api/map/stats?weeks=… in the browser (only
// counts of APPROVED reports; the CDN keeps the answer for 60 s, 3.39).
//
// Leaflet (the map drawing, DistrictMap.tsx) is loaded only in the browser and in its
// own small file (next/dynamic, ssr: false); everything else shows without it.
// Not colour-only: every number is also in the tooltips, the panel and the table.
//
// Look (Ореол v3, map.css): the map is the hero. The period switch is a Segmented
// control; the map sits on a stage-like frame with an aurora and the legend at its
// foot; the district panel and the scam waves are glass panels at the right (below on
// a phone); the table of districts is below on a raised panel with mono counts. A
// skeleton with the map's shape while loading, an error state with „Опитай отново“
// and an empty state when there are no reports yet.
"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { callApi } from "@/components/family/api";
import { fill } from "@/components/family/format";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import type { DistrictCode, DistrictStatsDto, MapStatsDto } from "@/schemas/reports";
import "./map.css";
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
      <Skeleton className="aspect-[3/2] w-full rounded-lg" />
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
    <div className="flex flex-col gap-8 md:gap-10">
      {/* The period switch: native radios (Segmented), so the arrow keys move between
          the periods. The values are text; Number() turns "12" back into 12. */}
      <Segmented
        label={bg.map.periodLabel}
        hideGroupLabel={false}
        className="map-period flex-wrap self-start"
        options={MAP_PERIODS.map((period) => ({
          value: String(period),
          label: bg.map.periods[period],
        }))}
        value={String(weeks)}
        onChange={(value) => {
          const period = Number(value) as MapPeriod;
          if (period === weeks) return;
          setState({ kind: "loading" });
          setWeeks(period);
        }}
      />

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

      <div className="map-credits">
        <p className="max-w-[80ch] text-sm text-fg-muted">{bg.map.attribution}</p>
        <p>
          <Link href={ROUTES.report} className="map-report-link">
            {bg.map.reportLink}
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        </p>
      </div>
    </div>
  );
}

// The shape of the page while the numbers load: the map stage, the panels, the table.
function MapLoading() {
  return (
    <div>
      <p role="status" className="sr-only">
        {bg.map.loading}
      </p>
      <div className="map-layout" aria-hidden="true">
        <div className="map-stage">
          <Skeleton className="aspect-[3/2] w-full rounded-lg" />
          <Skeleton className="mt-5 h-5 w-2/3 max-w-sm" />
        </div>
        <div className="map-side">
          <Skeleton className="h-44 w-full rounded-xl" />
          <div className="map-glass">
            <Skeleton className="h-6 w-40" />
            <SkeletonText lines={3} className="mt-4" />
          </div>
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

      <div className="map-layout">
        <div className="map-stage">
          <div className="map-stage-aurora" aria-hidden="true" />
          <DistrictMap stats={stats} selected={selected} onSelect={onSelect} />
          <Legend />
        </div>
        <div className="map-side">
          <DistrictPanel district={chosen} />
          <section aria-labelledby="map-waves-title" className="map-glass">
            <h2 id="map-waves-title" className="map-side-title">
              {bg.map.wavesTitle}
            </h2>
            {waves.length === 0 ? (
              <p className="mt-3 text-fg-muted">{bg.map.noWaves}</p>
            ) : (
              <ul className="map-waves">
                {waves.map((text) => (
                  <li key={text}>
                    <span className="map-wave-icon" aria-hidden="true">
                      <TrendingUp className="size-5" />
                    </span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section aria-labelledby="map-table-title" className="map-table-panel surface-raised">
        <h2 id="map-table-title" className="map-side-title">
          {bg.map.tableTitle}
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="map-table">
            <caption className="sr-only">{bg.map.tableCaption}</caption>
            <thead>
              <tr>
                <th scope="col">{bg.map.tableDistrict}</th>
                <th scope="col" className="map-num">
                  {bg.map.tableTotal}
                </th>
                <th scope="col">{bg.map.tableWave}</th>
              </tr>
            </thead>
            <tbody>
              {stats.districts.map((district) => (
                <tr
                  key={district.districtCode}
                  className={cn(district.districtCode === selected && "map-row-selected")}
                >
                  <th scope="row">
                    <button
                      type="button"
                      className="map-row-button"
                      aria-label={fill(bg.map.tableSelect, {
                        district: districtName(district.districtCode),
                      })}
                      aria-pressed={district.districtCode === selected}
                      onClick={() => onSelect(district.districtCode)}
                    >
                      {districtName(district.districtCode)}
                    </button>
                  </th>
                  <td className="map-num tabular font-mono">{district.total}</td>
                  <td className="text-fg-muted">
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
    <figure className="map-legend map-legend-bar">
      <figcaption className="text-sm text-fg-muted">{bg.map.legendTitle}</figcaption>
      <ul className="map-legend-list">
        {LEVELS.map((range) => (
          <li key={range.level} className="tabular font-mono text-xs">
            <span className={`map-swatch map-level-${range.level}`} aria-hidden="true" />
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
      className="map-panel map-glass map-panel-box"
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
          <h2 id="map-panel-title" className="map-side-title">
            {fill(bg.map.panelTitle, { district: districtName(district.districtCode) })}
          </h2>
          <p className="tabular mt-2 font-mono text-sm text-fg-muted">
            {fill(bg.map.panelTotal, { count: district.total })}
          </p>
          {scriptCounts(district).length > 0 ? (
            <>
              <h3 className="mt-5 text-base font-semibold">{bg.map.panelByScript}</h3>
              <ul className="map-panel-list">
                {scriptCounts(district).map(({ script, count }) => (
                  <li key={script}>
                    {scriptName(script)}: {reportsText(count)}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {district.waves.map((wave) => (
            <p key={wave.scriptType} className="mt-3">
              <Badge status="info">
                {fill(bg.map.panelWave, { script: scriptName(wave.scriptType) })}
              </Badge>
            </p>
          ))}
        </>
      )}
    </section>
  );
}
