"use client";

// Logs — Priority Log first (where attention is needed), then Activity Log (the plain
// entry-by-entry backlog). The Head of Sales sees every region under the top-bar date filter;
// the ASM sees his own region. The live "what Sales AI is doing" view lives on Home only.

import { LBL } from "@/data/labels";
import React, { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { SYNC_LABEL } from "@/data/cortexHome";
import { useHome } from "./HomeState";
import { CortexPageRoot, PageFrame, Persona } from "./shell";
import { useCortexNav } from "./nav";
import { DateFilter, LeadershipProvider, useHeadNav } from "./leadership/common";
import { ActivityLogTable } from "./leadership/activity";
import { PriorityLog } from "./leadership/logs";
import { useAsmNav } from "./asmNav";

export function LogsPage({ view, persona = "head" }: { view: "activity" | "priority"; persona?: "asm" | "head" }) {
  return (
    <CortexPageRoot>
      <LeadershipProvider>
        <Logs view={view} persona={persona} />
      </LeadershipProvider>
    </CortexPageRoot>
  );
}

function Logs({ view, persona }: { view: "activity" | "priority"; persona: "asm" | "head" }) {
  const { setRole } = useHome();
  const go = useCortexNav();
  const head = persona === "head";
  const headNav = useHeadNav("logs");
  const asmNav = useAsmNav("logs");
  useEffect(() => {
    setRole(persona);
  }, [setRole, persona]);
  const changePersona = (p: Persona) => (head ? p === "asm" && go("asm-priority-log") : p === "head" && go("priority-log"));
  const tabs = [
    { id: "priority", label: "Priority Log", page: head ? "priority-log" : "asm-priority-log" },
    { id: "activity", label: "Activity Log", page: head ? "activity-log" : "asm-activity-log" },
  ] as const;

  return (
    <PageFrame persona={persona} personaOptions={["asm", "head"]} onPersona={changePersona} {...(head ? headNav : asmNav)} topBarExtra={head ? <DateFilter /> : undefined}>
      <div className="pb-24">
        <section className="cx-land-hero px-4 pb-6 pt-16 sm:px-6">
          <button onClick={() => go(head ? "leadership" : "asm")} className="inline-flex items-center gap-1.5 text-[12px] text-cx-muted hover:text-cx-text">
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </button>
          <h1 className="mt-3 text-[28px] font-medium leading-tight tracking-tight text-cx-text">Logs</h1>
          <p className="mt-1 text-[12px] text-cx-faint">
            {head ? `All ${LBL.regions}` : `${LBL.asmRegion} · ${LBL.asmTerritories}`} · <span className="font-data">{SYNC_LABEL}</span>
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
            <ActivityLogTable fixedRegion={head ? undefined : LBL.asmRegion} scopeLabel={head ? undefined : "last 7 days"} />
          ) : (
            <PriorityLog fixedRegion={head ? undefined : LBL.asmRegion} />
          )}
        </div>
      </div>
    </PageFrame>
  );
}
