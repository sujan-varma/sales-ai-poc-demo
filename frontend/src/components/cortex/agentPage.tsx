"use client";

// The ASM's agent pages (MAP Studio, Market Action Plans, Pitch): one frame and one page
// header, the same ones Thermometer uses, plus the small pills both agents share.

import React, { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { AgentId } from "@/data/cortexHome";
import { PRIORITY_COLOR, Priority } from "@/data/map";
import { useHome } from "./HomeState";
import { CortexPage, useCortexNav } from "./nav";
import { useAsmNav } from "./asmNav";
import { CortexPageRoot, PageFrame, Persona } from "./shell";
import { AgentIcon } from "./primitives";

export function AsmAgentPage({ agent, studio = false, topBarExtra, children }: { agent: AgentId; tab?: number; studio?: boolean; topBarExtra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <CortexPageRoot>
      <Frame agent={agent} studio={studio} topBarExtra={topBarExtra}>
        {children}
      </Frame>
    </CortexPageRoot>
  );
}

function Frame({ agent, studio, topBarExtra, children }: { agent: AgentId; studio: boolean; topBarExtra?: React.ReactNode; children: React.ReactNode }) {
  const { setRole } = useHome();
  const go = useCortexNav();
  const nav = useAsmNav("none");
  useEffect(() => setRole("asm"), [setRole]);
  return (
    <PageFrame
      persona="asm"
      personaOptions={["asm", "head"]}
      // MAP and Pitch have no Head of Sales view in this pass; switching persona goes to his home
      onPersona={(p: Persona) => p === "head" && go("leadership")}
      {...nav}
      studio={studio}
      topBarExtra={topBarExtra}
      activeAgent={agent}
    >
      {children}
    </PageFrame>
  );
}

/** Back link, agent title and one meta line; `right` holds the page's main actions. */
export function AgentPageHeader({
  agent,
  title,
  meta,
  back = { label: "Home", page: "asm" },
  crumb,
  right,
  children,
}: {
  agent: AgentId;
  title: string;
  meta: React.ReactNode;
  back?: { label: string; page: CortexPage };
  /** the item open inside a list page (breadcrumb tail) */
  crumb?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const go = useCortexNav();
  return (
    <section className="cx-land-hero px-4 pb-6 pt-14 sm:px-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-cx-muted">
        <button onClick={() => go(back.page)} className="inline-flex items-center gap-1.5 hover:text-cx-text">
          <ArrowLeft className="h-3.5 w-3.5" /> {back.label}
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
