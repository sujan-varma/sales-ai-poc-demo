"use client";

// Loads the Excel-backed data from the backend before any dashboard module is imported, then lazy-loads the
// page. The data modules (src/data) read the payload while they evaluate, so nothing renders on empty data.

import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { API_BASE, loadCortexData } from "@/data/source";

export type CortexView = "asm" | "leadership" | "thermometer-asm" | "thermometer-head" | "configuration" | "logs-activity" | "logs-priority";

type Loader = () => Promise<{ default: React.ComponentType }>;

const LOADERS: Record<CortexView, Loader> = {
  asm: () => import("@/components/cortex/OptionCHome").then((m) => ({ default: m.OptionCHome })),
  leadership: () => import("@/components/cortex/LeadershipHome").then((m) => ({ default: m.LeadershipHome })),
  "thermometer-asm": () => import("@/components/cortex/thermometer/ThermometerPage").then((m) => ({ default: () => <m.ThermometerPage persona="asm" /> })),
  "thermometer-head": () => import("@/components/cortex/thermometer/ThermometerPage").then((m) => ({ default: () => <m.ThermometerPage persona="head" /> })),
  configuration: () => import("@/components/cortex/ConfigurationPage").then((m) => ({ default: m.ConfigurationPage })),
  "logs-activity": () => import("@/components/cortex/LogsPage").then((m) => ({ default: () => <m.LogsPage view="activity" /> })),
  "logs-priority": () => import("@/components/cortex/LogsPage").then((m) => ({ default: () => <m.LogsPage view="priority" /> })),
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

export function DataGate({ view }: { view: CortexView }) {
  const [state, setState] = useState<"loading" | "ready" | "error">(globalThis.__CORTEX_DATA__ ? "ready" : "loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (state === "ready") return;
    let alive = true;
    setState("loading");
    loadCortexData()
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
          {error} · {API_BASE}/api/web/bootstrap
        </p>
        <p className="max-w-md text-[12px] text-cx-faint">Start the backend (backend/README.md) or set NEXT_PUBLIC_API_URL, then try again.</p>
        <button className="mt-2 rounded-md border border-cx-line px-4 py-2 text-[13px] text-cx-text hover:bg-cx-hover" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </Centered>
    );
  }
  if (!Page) return <Loading label="Loading sales data from the workbook…" />;
  return (
    <Suspense fallback={<Loading label="Preparing the dashboard…" />}>
      <Page />
    </Suspense>
  );
}
