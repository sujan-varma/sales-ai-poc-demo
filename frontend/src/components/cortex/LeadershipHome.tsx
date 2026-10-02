"use client";

// Leadership dashboard (Head of Sales) — its own page in the Sales AI flow, on the Option B
// shell (./shell) and DESIGN.md tokens. Org-wide and read-only. One date filter in the top
// bar governs the date-scoped sections.
//
// Order: greeting · KPIs · what Sales AI has been doing (live flow) · needs your decision ·
// Thermometer scorecard + priority log (7 each, matched height) · insights + Territory Health ·
// action impact · Market Action Plans. The full record lives in Logs → Activity Log.

import { LBL } from "@/data/labels";
import React, { useEffect } from "react";
import { Grid3x3 } from "lucide-react";
import { HEALTH_LEVELS, SYNC_LABEL, TODAY_LABEL, VIEWER } from "@/data/cortexHome";
import { ORG_HEALTH, ORG_TERRITORY_ROWS, TERRITORY_COUNT, weakestTerritory } from "@/data/leadership";
import { useHome } from "./HomeState";
import { CortexPageRoot, PageFrame, Persona } from "./shell";
import { useCortexNav } from "./nav";
import { TerritoryHealthCard } from "./territoryHealth";
import { DateFilter, LeadershipProvider, useHeadNav } from "./leadership/common";
import { LeadershipKpis } from "./leadership/kpis";
import { OrchestrationStory } from "./leadership/orchestration";
import { DecisionsTable } from "./leadership/decisions";
import { PriorityTop } from "./leadership/logs";
import { ImpactMetrics } from "./leadership/impact";
import { LeadershipInsights, PlanReviewPanel, ThermoScorecard } from "./leadership/asmContent";

export function LeadershipHome() {
  return (
    <CortexPageRoot>
      <LeadershipProvider>
        <Leadership />
      </LeadershipProvider>
    </CortexPageRoot>
  );
}

function Leadership() {
  const { setRole } = useHome();
  const go = useCortexNav();
  const nav = useHeadNav("home");
  // shared pieces (assistant drawer, agent runs) read the viewer role from HomeState
  useEffect(() => setRole("head"), [setRole]);
  const changePersona = (p: Persona) => p === "asm" && go("asm");

  return (
    <PageFrame persona="head" personaOptions={["asm", "head"]} onPersona={changePersona} {...nav} topBarExtra={<DateFilter />}>
      <div className="pb-24">
        <LeadershipHero />
        <div className="cx-stagger space-y-8 px-4 sm:px-6">
          <LeadershipKpis />
          <OrchestrationStory />
          <DecisionsTable />
          <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2">
            <ThermoScorecard compact />
            <PriorityTop />
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <LeadershipInsights />
            <TerritoryHealthCard id="org-health" role="head" grid={ORG_HEALTH} groups={ORG_TERRITORY_ROWS} header={<OrgHealthHeader />} />
          </div>
          <ImpactMetrics />
          <PlanReviewPanel />
        </div>
      </div>
    </PageFrame>
  );
}

function LeadershipHero() {
  const v = VIEWER.head;
  const [first] = v.name.split(" ");
  return (
    <section className="cx-land-hero relative px-4 pb-8 pt-16 sm:px-6">
      <div>
        <div>
          <h1 className="text-[28px] font-medium leading-tight tracking-tight text-cx-text">
            Welcome back, <span className="text-[#4f86f7]">{first}</span>
          </h1>
          <p className="mt-1 text-[12px] text-cx-faint">
            Head of Sales · {v.scope} · {TODAY_LABEL} · <span className="font-data">{SYNC_LABEL}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

/** Territory Health header: the weakest of all 38 territories, org-wide. */
function OrgHealthHeader() {
  const w = weakestTerritory();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-[15px] font-medium text-cx-text">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cx-line bg-cx-raised text-cx-muted">
          <Grid3x3 className="h-4 w-4" />
        </span>
        Territory health
        <span className="text-[11.5px] font-normal text-cx-faint">{LBL.regions} · {TERRITORY_COUNT} territories</span>
      </h2>
      <span className="inline-flex items-center gap-2 rounded-lg border border-cx-line bg-cx-raised px-2.5 py-1.5 text-[12px]" title={`${w.metric} ${w.cell.value} · ${w.cell.detail}`}>
        <span className="h-2 w-2 rounded-full" style={{ background: HEALTH_LEVELS[0].color }} />
        <span className="text-cx-faint">Weakest:</span>
        <span className="font-medium text-cx-text">{w.name}</span>
        <span className="hidden text-cx-faint sm:inline">· {w.region}</span>
      </span>
    </div>
  );
}
