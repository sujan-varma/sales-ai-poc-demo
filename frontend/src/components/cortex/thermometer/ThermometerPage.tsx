"use client";

// The Thermometer agent page, for the ASM (/thermometer) and the Head of Sales
// (/leadership/thermometer): Performance · Scorecard · Recommendations. Read-only:
// data arrives from the Excel workbook through the backend, and nothing on the page is uploaded, edited or exported.

import { LBL } from "@/data/labels";
import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { DEFAULT_FILTERS, FY_LABEL, SYNC_NOTE, ThermoFilters, ThermoPersona, groupsFor } from "@/data/thermometer";
import { useHome } from "../HomeState";
import { CortexPageRoot, PageFrame, Persona } from "../shell";
import { useCortexNav } from "../nav";
import { useAsmNav } from "../asmNav";
import { AgentIcon } from "../primitives";
import { LeadershipProvider, useHeadNav } from "../leadership/common";
import { Link } from "./engine";
import { DeepDive, DeepScope } from "./DeepDive";
import { InitiativeDrawer, InitiativeOpen } from "./Initiatives";
import { PerformanceTab } from "./PerformanceTab";
import { RecommendationsTab } from "./RecommendationsTab";
import { ScorecardTab } from "./ScorecardTab";
import { Tabs } from "./ui";
import { SyncControl } from "./SyncControl";

type Tab = "performance" | "scorecard" | "recommendations";
const TABS: { id: Tab; label: string }[] = [
  { id: "performance", label: "Performance" },
  { id: "scorecard", label: "Scorecard" },
  { id: "recommendations", label: "Recommendations" },
];

export function ThermometerPage({ persona }: { persona: ThermoPersona }) {
  return (
    <CortexPageRoot>
      <LeadershipProvider>{persona === "head" ? <HeadFrame /> : <AsmFrame />}</LeadershipProvider>
    </CortexPageRoot>
  );
}

function AsmFrame() {
  const { setRole } = useHome();
  const go = useCortexNav();
  const asmNav = useAsmNav("none");
  useEffect(() => setRole("asm"), [setRole]);
  return (
    <PageFrame
      persona="asm"
      personaOptions={["asm", "head"]}
      onPersona={(p: Persona) => p === "head" && go("thermometer-head")}
      {...asmNav}
      activeAgent="thermometer"
    >
      <Body persona="asm" />
    </PageFrame>
  );
}

function HeadFrame() {
  const { setRole } = useHome();
  const go = useCortexNav();
  const nav = useHeadNav("none");
  useEffect(() => setRole("head"), [setRole]);
  return (
    <PageFrame persona="head" personaOptions={["asm", "head"]} onPersona={(p: Persona) => p === "asm" && go("thermometer")} {...nav} activeAgent="thermometer">
      <Body persona="head" />
    </PageFrame>
  );
}

function Body({ persona }: { persona: ThermoPersona }) {
  const go = useCortexNav();
  const [tab, setTab] = useState<Tab>("performance");
  // a homepage "View all" can open a specific tab
  useEffect(() => {
    try {
      const t = sessionStorage.getItem("cx-thermo-tab") as Tab | null;
      if (t && TABS.some((x) => x.id === t)) setTab(t);
      sessionStorage.removeItem("cx-thermo-tab");
    } catch {
      /* storage unavailable */
    }
  }, []);
  const [f, setF] = useState<ThermoFilters>(DEFAULT_FILTERS);
  const [deep, setDeep] = useState<DeepScope | null>(null);
  const [initiative, setInitiative] = useState<InitiativeOpen | null>(null);
  const groups = groupsFor(persona);
  const closeDeep = useCallback(() => setDeep(null), []);
  const closeInit = useCallback(() => setInitiative(null), []);

  /** a recommendation's evidence link: the initiative or deep dive behind it, scoped to its territory */
  const onLink = (l: Link, territory: string) => {
    if (l.kind === "initiative") {
      const g = groups.find((x) => x.territories.includes(territory));
      setInitiative({ id: l.id, group: g?.name ?? null, kpi: l.kpi });
    } else setDeep({ label: territory, territories: [territory], tab: l.tab, cat: l.cat ?? null });
  };

  return (
    <div className="pb-24">
      <section className="cx-land-hero px-4 pb-6 pt-14 sm:px-6">
        <button onClick={() => go(persona === "head" ? "leadership" : "asm")} className="inline-flex items-center gap-1.5 text-[12px] text-cx-muted hover:text-cx-text">
          <ArrowLeft className="h-3.5 w-3.5" /> Home
        </button>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-3 text-[28px] font-medium leading-tight tracking-tight text-cx-text">
              <AgentIcon agent="thermometer" size="lg" /> Thermometer
            </h1>
            <p className="mt-1.5 text-[12.5px] text-cx-faint">
              {persona === "head" ? `All ${LBL.regions} · ${LBL.territories} · read-only` : `${LBL.asmRegion} · ${LBL.asmTerritories}`} · {FY_LABEL} · <span className="font-data">{SYNC_NOTE}</span>
            </p>
          </div>
          <SyncControl />
        </div>
        <div className="mt-5">
          <Tabs value={tab} options={TABS} onChange={setTab} label="Thermometer" />
        </div>
      </section>
      <div className="px-4 sm:px-6" role="tabpanel" aria-label={TABS.find((t) => t.id === tab)!.label}>
        {tab === "performance" && <PerformanceTab persona={persona} f={f} setF={setF} openDeep={setDeep} />}
        {tab === "scorecard" && <ScorecardTab persona={persona} onInitiative={setInitiative} onDeep={setDeep} />}
        {tab === "recommendations" && <RecommendationsTab persona={persona} onLink={onLink} />}
      </div>
      {deep && <DeepDive key={`${deep.label}-${deep.tab}`} f={f} scope={deep} onClose={closeDeep} />}
      {initiative && <InitiativeDrawer key={`${initiative.id}-${initiative.group}-${initiative.kpi}`} open={initiative} groups={groups} allLabel={persona === "head" ? "All regions" : "All territories"} onClose={closeInit} />}
    </div>
  );
}
