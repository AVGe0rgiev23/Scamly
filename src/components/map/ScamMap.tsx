// The interactive part of the scam map /karta (W3-03): the period switch (1 / 4 / 12
// weeks), the "scam wave" texts, the map with its legend, the district panel and the
// table of all 28 districts. Data: GET /api/map/stats?weeks=… in the browser (only
// counts of APPROVED reports; the CDN keeps the answer for 60 s, 3.39).
//
// Leaflet (the map drawing, DistrictMap.tsx) is loaded only in the browser and in its
// own small file (next/dynamic, ssr: false); everything else shows without it.
// Not colour-only: every number is also in the tooltips, the panel and the table.
"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { callApi } from "@/components/family/api";
import { fill } from "@/components/family/format";
import { Button } from "@/components/ui/Button";
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
    <p role="status" className="muted map-canvas-loading">
      {bg.map.loading}
    </p>
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
    <div className="map-page">
      <div role="group" aria-label={bg.map.periodLabel} className="admin-periods map-periods">
        {MAP_PERIODS.map((period) => (
          <button
            key={period}
            type="button"
            className="button button-secondary admin-period"
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

      {state.kind === "loading" ? (
        <p role="status" className="muted">
          {bg.map.loading}
        </p>
      ) : null}
      {state.kind === "error" ? (
        <div className="family-error">
          <p role="alert" className="form-message form-message-error">
            {state.message}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setState({ kind: "loading" });
              setAttempt(attempt + 1);
            }}
          >
            {bg.map.retry}
          </Button>
        </div>
      ) : null}
      {state.kind === "ready" ? (
        <MapBody stats={state.stats} selected={selected} onSelect={onSelect} />
      ) : null}

      <p className="map-attribution">{bg.map.attribution}</p>
      <p>
        <Link href={ROUTES.report} className="site-footer-link">
          {bg.map.reportLink}
        </Link>
      </p>
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
      <section className="card map-waves" aria-labelledby="map-waves-title">
        <h2 id="map-waves-title">{bg.map.wavesTitle}</h2>
        {waves.length === 0 ? (
          <p>{bg.map.noWaves}</p>
        ) : (
          <ul>
            {waves.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        )}
      </section>

      {empty ? (
        <p role="status" className="muted">
          {bg.map.empty}
        </p>
      ) : null}

      <div className="map-layout">
        <div className="map-frame">
          <DistrictMap stats={stats} selected={selected} onSelect={onSelect} />
          <Legend />
        </div>
        <DistrictPanel district={chosen} />
      </div>

      <section aria-labelledby="map-table-title" className="map-table-section">
        <h2 id="map-table-title">{bg.map.tableTitle}</h2>
        <div className="admin-table-wrap">
          <table className="admin-table map-table">
            <caption className="sr-only">{bg.map.tableCaption}</caption>
            <thead>
              <tr>
                <th scope="col">{bg.map.tableDistrict}</th>
                <th scope="col" className="admin-num">
                  {bg.map.tableTotal}
                </th>
                <th scope="col">{bg.map.tableWave}</th>
              </tr>
            </thead>
            <tbody>
              {stats.districts.map((district) => (
                <tr key={district.districtCode}>
                  <th scope="row">
                    <button
                      type="button"
                      className="map-table-button"
                      aria-label={fill(bg.map.tableSelect, {
                        district: districtName(district.districtCode),
                      })}
                      aria-pressed={district.districtCode === selected}
                      onClick={() => onSelect(district.districtCode)}
                    >
                      {districtName(district.districtCode)}
                    </button>
                  </th>
                  <td className="admin-num">{district.total}</td>
                  <td>
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
      <figcaption>{bg.map.legendTitle}</figcaption>
      <ul>
        {LEVELS.map((range) => (
          <li key={range.level}>
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
    <section className="card map-panel" aria-live="polite" aria-labelledby="map-panel-title">
      {district === null ? (
        <>
          <h2 id="map-panel-title" className="sr-only">
            {bg.map.panelEmptyTitle}
          </h2>
          <p className="muted">{bg.map.panelHint}</p>
        </>
      ) : (
        <>
          <h2 id="map-panel-title">
            {fill(bg.map.panelTitle, { district: districtName(district.districtCode) })}
          </h2>
          <p className="map-panel-total">{fill(bg.map.panelTotal, { count: district.total })}</p>
          {scriptCounts(district).length > 0 ? (
            <>
              <h3>{bg.map.panelByScript}</h3>
              <ul>
                {scriptCounts(district).map(({ script, count }) => (
                  <li key={script}>
                    {scriptName(script)}: {reportsText(count)}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {district.waves.map((wave) => (
            <p key={wave.scriptType} className="map-panel-wave">
              {fill(bg.map.panelWave, { script: scriptName(wave.scriptType) })}
            </p>
          ))}
        </>
      )}
    </section>
  );
}
