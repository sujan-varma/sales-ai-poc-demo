"use client";

// Logs — the Head of Sales' two dedicated log screens, reached from the top nav and from
// their homepage cards: Priority Log first (where attention is needed), then Activity Log
// (pure observation: the month's summary, today's totals, the live timeline, every entry).

import { LBL } from "@/data/labels";
import React, { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { SYNC_LABEL } from "@/data/cortexHome";
import { useHome } from "./HomeState";
import { CortexPageRoot, PageFrame, Persona } from "./shell";
import { useCortexNav } from "./nav";
import { DateFilter, LeadershipProvider, useHeadNav } from "./leadership/common";
import { ActivityLogTable, LiveTimeline, TodayTotals } from "./leadership/activity";
import { PriorityLog, RollupLog } from "./leadership/logs";

export function LogsPage({ view }: { view: "activity" | "priority" }) {
  return (
    <CortexPageRoot>
      <LeadershipProvider>
        <Logs view={view} />
      </LeadershipProvider>
    </CortexPageRoot>
  );
}

function Logs({ view }: { view: "activity" | "priority" }) {
  const { setRole } = useHome();
  const go = useCortexNav();
  const nav = useHeadNav("logs");
  useEffect(() => setRole("head"), [setRole]);
  const changePersona = (p: Persona) => p === "asm" && go("asm");
  const tabs = [
    { id: "priority", label: "Priority Log", page: "priority-log" },
    { id: "activity", label: "Activity Log", page: "activity-log" },
  ] as const;

  return (
    <PageFrame persona="head" personaOptions={["asm", "head"]} onPersona={changePersona} {...nav} topBarExtra={<DateFilter />}>
      <div className="pb-24">
        <section className="cx-land-hero px-4 pb-6 pt-16 sm:px-6">
          <button onClick={() => go("leadership")} className="inline-flex items-center gap-1.5 text-[12px] text-cx-muted hover:text-cx-text">
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </button>
          <h1 className="mt-3 text-[28px] font-medium leading-tight tracking-tight text-cx-text">Logs</h1>
          <p className="mt-1 text-[12px] text-cx-faint">
            All {LBL.regions} · <span className="font-data">{SYNC_LABEL}</span>
          </p>
          <div className="mt-5 flex h-9 w-fit items-center rounded-lg border border-cx-line bg-cx-panel p-1 text-[13px]" role="tablist" aria-label="Logs">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={view === t.id}
                onClick={() => go(t.page)}
                className={`h-full whitespace-nowrap rounded-md px-3.5 ${view === t.id ? "bg-cx-text text-cx-bg" : "text-cx-muted hover:bg-cx-hover hover:text-cx-text"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>
        <div className="px-4 sm:px-6" role="tabpanel">
          {view === "activity" ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
                <RollupLog />
                <LiveTimeline />
              </div>
              <TodayTotals />
              <ActivityLogTable />
            </div>
          ) : (
            <PriorityLog />
          )}
        </div>
      </div>
    </PageFrame>
  );
}
