"use client";

// The agent pages (MAP Studio, Market Action Plans, Pitch): one frame and one page
// header, the same ones Thermometer uses, plus the small pills both agents share.
//
// Two personas sit on the same pages. The ASM owns them. The Head of Sales gets the
// read-only view: nothing is created, edited, pushed or taken back, and the one thing
// they can do is comment — which becomes a delegation ticket the ASM owns.

import React, { createContext, useContext, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { AgentId } from "@/data/cortexHome";
import { PRIORITY_COLOR, Priority } from "@/data/map";
import { useHome } from "./HomeState";
import { CortexPage, useCortexNav } from "./nav";
import { useAsmNav } from "./asmNav";
import { CortexPageRoot, PageFrame, Persona } from "./shell";
import { AgentIcon } from "./primitives";
import { LeadershipProvider, useHeadNav } from "./leadership/common";

export type AgentPersona = "asm" | "head";

// The persona is set on the frame, not read back out of HomeState: HomeState is settled in
// an effect, so a Head of Sales page would otherwise paint the ASM's buttons for one frame.
const PersonaCtx = createContext<AgentPersona>("asm");

/** The page each persona lands on when the other one's view of this agent is asked for. */
const COUNTERPART: Partial<Record<AgentId, Record<AgentPersona, CortexPage>>> = {
  map: { asm: "map-plans", head: "map-head" },
  pitch: { asm: "pitch", head: "pitch-head" },
};

export function AsmAgentPage({
  agent,
  persona = "asm",
  studio = false,
  topBarExtra,
  children,
}: {
  agent: AgentId;
  persona?: AgentPersona;
  tab?: number;
  studio?: boolean;
  topBarExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <CortexPageRoot>
      <PersonaCtx.Provider value={persona}>
        <LeadershipProvider>
          <Frame agent={agent} persona={persona} studio={studio} topBarExtra={topBarExtra}>
            {children}
          </Frame>
        </LeadershipProvider>
      </PersonaCtx.Provider>
    </CortexPageRoot>
  );
}

function Frame({ agent, persona, studio, topBarExtra, children }: { agent: AgentId; persona: AgentPersona; studio: boolean; topBarExtra?: React.ReactNode; children: React.ReactNode }) {
  const { setRole } = useHome();
  const go = useCortexNav();
  const asmNav = useAsmNav("none");
  const headNav = useHeadNav("none");
  const nav = persona === "head" ? headNav : asmNav;
  useEffect(() => setRole(persona), [setRole, persona]);
  return (
    <PageFrame
      persona={persona}
      personaOptions={["asm", "head"]}
      // switching persona stays on the same agent when that agent has the other view;
      // MAP Studio and the ad hoc canvas are the ASM's alone, so the Head goes to their home
      onPersona={(p: Persona) => {
        if (p === persona || p === "exec") return;
        const to = COUNTERPART[agent]?.[p as AgentPersona];
        go(studio && p === "head" ? "leadership" : to ?? (p === "head" ? "leadership" : "asm"));
      }}
      {...nav}
      studio={studio}
      topBarExtra={topBarExtra}
      activeAgent={agent}
    >
      {children}
    </PageFrame>
  );
}

/** Read-only is the Head of Sales everywhere on an agent page; the ASM owns the actions. */
export function useReadOnly() {
  return useContext(PersonaCtx) === "head";
}

/** Back link, agent title and one meta line; `right` holds the page's main actions. */
export function AgentPageHeader({
  agent,
  title,
  meta,
  back,
  crumb,
  right,
  children,
}: {
  agent: AgentId;
  title: string;
  meta: React.ReactNode;
  /** defaults to the viewer's own home */
  back?: { label: string; page: CortexPage };
  /** the item open inside a list page (breadcrumb tail) */
  crumb?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const go = useCortexNav();
  const head = useReadOnly();
  const to = back ?? { label: "Home", page: (head ? "leadership" : "asm") as CortexPage };
  return (
    <section className="cx-land-hero px-4 pb-6 pt-14 sm:px-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-cx-muted">
        <button onClick={() => go(to.page)} className="inline-flex items-center gap-1.5 hover:text-cx-text">
          <ArrowLeft className="h-3.5 w-3.5" /> {to.label}
        </button>
        {crumb && (
          <>
            <span className="text-cx-faint" aria-hidden>
              /
            </span>
            <span className="truncate text-cx-text" aria-current="page">
              {crumb}
            </span>
          </>
        )}
      </nav>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 text-[28px] font-medium leading-tight tracking-tight text-cx-text">
            <AgentIcon agent={agent} size="lg" /> {title}
          </h1>
          <p className="mt-1.5 text-[12.5px] text-cx-faint">{meta}</p>
        </div>
        {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
      </div>
      {children}
    </section>
  );
}

export function PriorityPill({ p }: { p: Priority }) {
  const c = PRIORITY_COLOR[p];
  return (
    <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full border px-2 text-[11.5px] text-cx-text" style={{ borderColor: `${c}66`, background: `${c}1a` }}>
      {p}
    </span>
  );
}

/** Dot + label status, the Option B status legend colours. */
export function DotStatus({ color, children, title }: { color: string; children: React.ReactNode; title?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] text-cx-text" title={title}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
      {children}
    </span>
  );
}

export const btn = "inline-flex h-8 items-center gap-1.5 rounded-md border border-cx-line bg-cx-panel px-2.5 text-[12.5px] text-cx-muted hover:border-cx-strong hover:text-cx-text";
export const btnPrimary = "inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2f6fed] px-3.5 text-[13px] font-medium text-white hover:bg-[#4f86f7] disabled:opacity-40";
