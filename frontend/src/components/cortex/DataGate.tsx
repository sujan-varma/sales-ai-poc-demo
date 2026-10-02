"use client";

// Loads the Excel-backed data from the backend, one section at a time with a checklist, before any dashboard module
// is imported, then lazy-loads the page. The data modules (src/data) read the payload while they evaluate, so nothing renders on empty data.

import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { apiUrl, loadCortexData, type LoadProgress } from "@/data/source";

export type CortexView =
  | "asm"
  | "leadership"
  | "thermometer-asm"
  | "thermometer-head"
  | "configuration"
  | "logs-activity"
  | "logs-priority"
  | "asm-logs-activity"
  | "asm-logs-priority"
  | "map-plans"
  | "map-studio"
  | "pitch"
  | "pitch-detail"
  | "pitch-adhoc"
  | "tracker"
  | "tracker-head"
  | "huddle"
  | "huddle-meetings"
  | "huddle-series"
  | "huddle-meeting";

type Loader = () => Promise<{ default: React.ComponentType }>;

const LOADERS: Record<CortexView, Loader> = {
  asm: () => import("@/components/cortex/OptionCHome").then((m) => ({ default: m.OptionCHome })),
  leadership: () => import("@/components/cortex/LeadershipHome").then((m) => ({ default: m.LeadershipHome })),
  "thermometer-asm": () => import("@/components/cortex/thermometer/ThermometerPage").then((m) => ({ default: () => <m.ThermometerPage persona="asm" /> })),
  "thermometer-head": () => import("@/components/cortex/thermometer/ThermometerPage").then((m) => ({ default: () => <m.ThermometerPage persona="head" /> })),
  configuration: () => import("@/components/cortex/ConfigurationPage").then((m) => ({ default: m.ConfigurationPage })),
  "logs-activity": () => import("@/components/cortex/LogsPage").then((m) => ({ default: () => <m.LogsPage view="activity" /> })),
  "logs-priority": () => import("@/components/cortex/LogsPage").then((m) => ({ default: () => <m.LogsPage view="priority" /> })),
  "asm-logs-activity": () => import("@/components/cortex/LogsPage").then((m) => ({ default: () => <m.LogsPage view="activity" persona="asm" /> })),
  "asm-logs-priority": () => import("@/components/cortex/LogsPage").then((m) => ({ default: () => <m.LogsPage view="priority" persona="asm" /> })),
  "map-plans": () => import("@/components/cortex/map/MapPlansPage").then((m) => ({ default: m.MapPlansPage })),
  "map-studio": () => import("@/components/cortex/map/MapStudioPage").then((m) => ({ default: m.MapStudioPage })),
  pitch: () => import("@/components/cortex/pitch/PitchPage").then((m) => ({ default: m.PitchPage })),
  "pitch-detail": () => import("@/components/cortex/pitch/PitchDetailPage").then((m) => ({ default: m.PitchDetailPage })),
  "pitch-adhoc": () => import("@/components/cortex/pitch/PitchAdhocPage").then((m) => ({ default: m.PitchAdhocPage })),
  tracker: () => import("@/components/cortex/tracker/TrackerPage").then((m) => ({ default: () => <m.TrackerPage persona="asm" /> })),
  "tracker-head": () => import("@/components/cortex/tracker/TrackerPage").then((m) => ({ default: () => <m.TrackerPage persona="head" /> })),
  huddle: () => import("@/components/cortex/huddle/IntelHubPage").then((m) => ({ default: m.IntelHubPage })),
  "huddle-meetings": () => import("@/components/cortex/huddle/MeetingRepositoryPage").then((m) => ({ default: m.MeetingRepositoryPage })),
  "huddle-series": () => import("@/components/cortex/huddle/SeriesPage").then((m) => ({ default: m.SeriesPage })),
  "huddle-meeting": () => import("@/components/cortex/huddle/MeetingPage").then((m) => ({ default: m.MeetingPage })),
};

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">{children}</div>;
}

function Loading({ label }: { label: string }) {
  return (
    <Centered>
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-cx-faint/30 border-t-cx-text" aria-hidden />
      <p className="text-[13px] text-cx-muted">{label}</p>
    </Centered>
  );
}

const fmt = (n: number) => n.toLocaleString("en-IN");

/** Each section of the workbook data, ticked off as it arrives from the backend. */
function Loader({ progress }: { progress: LoadProgress | null }) {
  const steps = progress?.steps ?? [];
  const done = steps.filter((x) => x.state === "done").length;
  return (
    <Centered>
      <div className="w-full max-w-md rounded-xl border border-cx-line bg-cx-panel p-5 text-left" role="status" aria-live="polite">
        <p className="font-data text-[10.5px] uppercase tracking-[0.08em] text-cx-faint">Sales AI</p>
        <p className="mt-1 text-[15px] font-medium text-cx-text">Loading sales data</p>
        <p className="mt-1 text-[12px] text-cx-muted">
          {!steps.length ? "Processing the workbook on the server…" : `Processed from the workbook · ${done} of ${steps.length} sections loaded`}
        </p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-cx-hover">
          <div className="h-full rounded-full bg-cx-text transition-[width] duration-300" style={{ width: `${steps.length ? (done / steps.length) * 100 : 6}%` }} />
        </div>
        <ul className="mt-3 space-y-1">
          {steps.map((x) => (
            <li key={x.key} className="flex items-center gap-2.5 py-1 text-[12.5px]">
              {x.state === "done" ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-[#3fb950]" aria-hidden />
              ) : x.state === "loading" ? (
                <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-cx-faint/30 border-t-cx-text" aria-hidden />
              ) : (
                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center" aria-hidden>
                  <span className="h-1.5 w-1.5 rounded-full bg-cx-faint/50" />
                </span>
              )}
              <span className={x.state === "waiting" ? "flex-1 text-cx-faint" : "flex-1 text-cx-text"}>{x.label}</span>
              <span className="font-data text-[11px] text-cx-muted">{fmt(x.records)} records</span>
            </li>
          ))}
        </ul>
      </div>
    </Centered>
  );
}

export function DataGate({ view }: { view: CortexView }) {
  const [state, setState] = useState<"loading" | "ready" | "error">(globalThis.__CORTEX_DATA__ ? "ready" : "loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState<LoadProgress | null>(null);

  useEffect(() => {
    if (state === "ready") return;
    let alive = true;
    setState("loading");
    loadCortexData((p) => alive && setProgress(p))
      .then(() => alive && setState("ready"))
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
        setState("error");
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // created only once the data is loaded, so the page modules evaluate with real data
  const Page = useMemo(() => (state === "ready" ? lazy(LOADERS[view]) : null), [state, view]);

  if (state === "error") {
    return (
      <Centered>
        <p className="text-[15px] font-medium text-cx-text">Couldn&apos;t load the sales data</p>
        <p className="max-w-md text-[13px] text-cx-muted">
          {error} · {apiUrl()}/api/web/sections
        </p>
        <p className="max-w-md text-[12px] text-cx-faint">Start the backend (backend/README.md) or set API_URL on the frontend server, then try again.</p>
        <button className="mt-2 rounded-md border border-cx-line px-4 py-2 text-[13px] text-cx-text hover:bg-cx-hover" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </Centered>
    );
  }
  if (!Page) return <Loader progress={progress} />;
  return (
    <Suspense fallback={<Loading label="Preparing the dashboard…" />}>
      <Page />
    </Suspense>
  );
}
