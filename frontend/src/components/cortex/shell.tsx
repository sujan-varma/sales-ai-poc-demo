"use client";

// Option B page shell, shared by every page in the Sales AI flow (ASM, Leadership, …):
// providers + theme, the hero glow, the thin agent rail, the top nav with the persona
// menu, and the AI Assistant drawer. Pages supply only their content.

import React, { useEffect, useRef, useState } from "react";
import { Bot, Check, PanelLeftClose, PanelLeftOpen, Search, SlidersHorizontal, UserMinus } from "lucide-react";
import { AGENTS, AGENT_ORDER, AgentId, VIEWER } from "@/data/cortexHome";
import { AiStyleProvider } from "./ai";
import { AssistantDrawer, ASSISTANT_PUSH } from "./assistant";
import { BrandProvider } from "./agentRun";
import { HomeProvider, useHome } from "./HomeState";
import { AgentIcon, MonoAgentIcons } from "./primitives";
import { PulseStatusPalette } from "./statusPalette";
import { ThemeRoot, ThemeToggle, useTheme } from "./theme";
import { useCortexNav } from "./nav";
import { AssignmentsProvider } from "./assignments";
import covasantWordmark from "@/assets/brand/covasant-wordmark.png";
import covasantMark from "@/assets/brand/covasant-mark.png";

/** Next gives an image object; the single-file export gives a data URL string. */
const imgSrc = (m: unknown) => (typeof m === "string" ? m : (m as { src: string }).src);

export type Persona = "asm" | "head" | "exec";

export const iconBtn =
  "flex h-9 w-9 items-center justify-center rounded-lg border border-cx-line bg-cx-panel text-cx-muted hover:border-cx-strong hover:text-cx-text";

const plainIcon = "flex h-9 w-9 items-center justify-center rounded-lg text-cx-muted hover:text-cx-text";

/** Providers every Option B page sits inside. One theme key, so dark/light carries across pages. */
export function CortexPageRoot({ children }: { children: React.ReactNode }) {
  return (
    <ThemeRoot scope="cx-b" storageKey="cortex-b-theme">
      <BrandProvider name="Sales AI">
        <HomeProvider>
          <AssignmentsProvider>
            <AiStyleProvider value="capsule">
              {/* agent icons are monotone grey everywhere in Option B — told apart by shape */}
              <MonoAgentIcons>
                <PulseStatusPalette>{children}</PulseStatusPalette>
              </MonoAgentIcons>
            </AiStyleProvider>
          </AssignmentsProvider>
        </HomeProvider>
      </BrandProvider>
    </ThemeRoot>
  );
}

export function useOutside<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", k);
    };
  }, [open, close]);
  return ref;
}


// ---------------------------------------------------------------------------
// Top nav + persona popover
// ---------------------------------------------------------------------------

function PersonaMenu({ persona, options, onChange }: { persona: Persona; options: Persona[]; onChange: (p: Persona) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside<HTMLDivElement>(open, () => setOpen(false));
  const v = VIEWER[persona];
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-9 items-center gap-2 rounded-lg border border-cx-line bg-cx-panel pl-1 pr-2.5 hover:border-cx-strong"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cx-hover font-data text-[11px] text-cx-text">{v.initials}</span>
        <span className="hidden text-left sm:block">
          <span className="block text-[12px] leading-4 text-cx-text">{v.name}</span>
          <span className="block text-[10.5px] leading-3 text-cx-faint">{v.role.replace(" · read-only", "")}</span>
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-lg border border-cx-strong bg-cx-raised p-1.5 shadow-2xl">
          <p className="px-2 pb-1.5 pt-1 font-data text-[10.5px] uppercase tracking-[0.08em] text-cx-faint">View Sales AI as</p>
          {options.map((p) => (
            <button
              key={p}
              onClick={() => {
                onChange(p);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-cx-hover"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-cx-line font-data text-[10.5px] text-cx-muted">{VIEWER[p].initials}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] text-cx-text">{VIEWER[p].name}</span>
                <span className="block text-[11px] text-cx-faint">{VIEWER[p].role.replace(" · read-only", "")}</span>
              </span>
              {p === persona && <Check className="h-3.5 w-3.5 text-cx-text" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AssistantMenu() {
  const { assistantOpen, setAssistantOpen } = useHome();
  return (
    <button
      onClick={() => setAssistantOpen((o) => !o)}
      aria-expanded={assistantOpen}
      aria-label="AI Assistant"
      title="AI Assistant"
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors ${
        assistantOpen ? "border-[#2f6fed] bg-[#2f6fed] text-white" : "border-[#2f6fed]/50 bg-[#2f6fed]/15 text-[color:var(--ai-ink)] hover:bg-[#2f6fed]/25"
      }`}
    >
      <Bot className="h-4 w-4" /> <span className="hidden sm:inline">AI Assistant</span>
    </button>
  );
}

function TopNav({
  persona,
  personaOptions,
  onPersona,
  tabs,
  currentTab,
  onTab,
  actions,
  extra,
  onAgents,
}: {
  persona: Persona;
  personaOptions: Persona[];
  onPersona: (p: Persona) => void;
  tabs: string[];
  currentTab: number;
  onTab?: (i: number) => boolean | void;
  actions?: React.ReactNode;
  /** sits right beside the persona menu (Leadership: the date filter) */
  extra?: React.ReactNode;
  onAgents: () => void;
}) {
  const { toast } = useHome();
  return (
    <header className="cx-land-fade relative z-30 flex h-16 items-center gap-3 px-4 sm:px-6">
      <button onClick={onAgents} className={`${iconBtn} md:hidden`} aria-label="Agents">
        <PanelLeftOpen className="h-4 w-4" />
      </button>
      <span className="whitespace-nowrap font-data text-[13px] font-medium tracking-[0.28em] text-cx-text">SALES AI</span>
      <nav
        className={`ml-5 items-center gap-1 rounded-lg border border-cx-line bg-cx-panel/70 p-1 backdrop-blur ${persona === "exec" ? "hidden" : "hidden lg:flex"}`}
      >
        {tabs.map((t, i) => (
          <button
            key={t}
            onClick={() => onTab?.(i) || (i !== currentTab && toast(`Opens ${t}.`))}
            aria-current={i === currentTab ? "page" : undefined}
            className={`h-8 rounded-md px-3.5 text-[13px] ${i === currentTab ? "bg-cx-text text-cx-bg" : "text-cx-muted hover:bg-cx-hover hover:text-cx-text"}`}
          >
            {t}
          </button>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-1.5">
        {actions && <div className="mr-1 hidden md:block">{actions}</div>}
        <ThemeToggle className={plainIcon} />
        <button onClick={() => toast("Search territories, retailers and actions.")} className={plainIcon} aria-label="Search" title="Search">
          <Search className="h-4 w-4" />
        </button>
        {persona !== "exec" && <AssistantMenu />}
        {extra}
        <PersonaMenu persona={persona} options={personaOptions} onChange={onPersona} />
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Thin agent rail
// ---------------------------------------------------------------------------

function AgentRail({ expanded, setExpanded, persona, configActive, activeAgent }: { expanded: boolean; setExpanded: (v: boolean) => void; persona: Persona; configActive: boolean; activeAgent?: AgentId }) {
  const { toast } = useHome();
  const go = useCortexNav();
  const { theme } = useTheme();
  return (
    <>
      {expanded && <div className="fixed inset-0 z-30 bg-black/40 md:bg-transparent" onClick={() => setExpanded(false)} />}
      <aside
        className={`cx-land-rail fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-cx-line bg-cx-bg/95 py-3 backdrop-blur transition-[width] ${
          expanded ? "w-56 shadow-2xl" : "hidden w-14 md:flex"
        } ${expanded ? "flex" : ""}`}
        aria-label="Agents"
      >
        <div className="flex h-10 items-center gap-2.5 px-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cx-strong font-data text-[14px] font-semibold text-cx-text" aria-label="Sales AI">
            S
          </span>
          {expanded && <span className="text-[14px] font-medium text-cx-text">Sales AI</span>}
        </div>
        <p className={`mt-4 px-3 font-data text-[9.5px] uppercase tracking-[0.08em] text-cx-faint ${expanded ? "pl-4" : "text-center"}`}>Agents</p>
        <ul className="mt-2 space-y-1 px-2">
          {AGENT_ORDER.map((a) => (
            <li key={a} className="group/tip relative">
              <button
                // Thermometer has its own page; the other agents aren't built in this flow yet
                onClick={() => (a === "thermometer" ? go(persona === "head" ? "thermometer-head" : "thermometer") : toast(`Opens ${AGENTS[a].name}.`))}
                aria-label={`${AGENTS[a].name} agent`}
                aria-current={activeAgent === a ? "page" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-md p-1.5 hover:bg-cx-hover ${activeAgent === a ? "bg-cx-hover" : ""} ${expanded ? "" : "justify-center"}`}
              >
                <AgentIcon agent={a} round />
                {expanded && (
                  <span className="min-w-0 text-left">
                    <span className="block text-[12.5px] leading-snug text-cx-text">{AGENTS[a].name} agent</span>
                    <span className="block truncate text-[10.5px] text-cx-faint">{AGENTS[a].stat}</span>
                  </span>
                )}
              </button>
              {!expanded && (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-cx-strong bg-cx-raised px-2 py-1 text-[12px] text-cx-text shadow-xl group-hover/tip:block group-focus-within/tip:block"
                >
                  {AGENTS[a].name} agent
                </span>
              )}
            </li>
          ))}
          <li className="group/tip relative">
            <span aria-label="Churn — coming soon" className={`flex w-full items-center gap-2.5 rounded-md p-1.5 ${expanded ? "" : "justify-center"}`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-cx-strong text-cx-faint">
                <UserMinus className="h-3.5 w-3.5" />
              </span>
              {expanded && (
                <span className="min-w-0 text-left">
                  <span className="block truncate text-[12.5px] text-cx-muted">Churn agent</span>
                  <span className="block truncate text-[10.5px] text-cx-faint">Coming soon</span>
                </span>
              )}
            </span>
            {!expanded && (
              <span
                role="tooltip"
                className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-cx-strong bg-cx-raised px-2 py-1 text-[12px] text-cx-text shadow-xl group-hover/tip:block group-focus-within/tip:block"
              >
                Churn agent · coming soon
              </span>
            )}
          </li>
        </ul>
        <div className="group/tip relative mx-2 mt-auto">
          <button
            // Configuration belongs to the Head of Sales: platform settings and decision thresholds
            onClick={() => (persona === "head" ? go("configuration") : toast("Opens Configuration: agents, thresholds, data sources."))}
            aria-label="Configuration"
            aria-current={configActive ? "page" : undefined}
            className={`flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-[12.5px] hover:bg-cx-hover hover:text-cx-text ${configActive ? "bg-cx-hover text-cx-text" : "text-cx-muted"} ${expanded ? "" : "justify-center"}`}
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0" />
            {expanded && "Configuration"}
          </button>
          {!expanded && (
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-cx-strong bg-cx-raised px-2 py-1 text-[12px] text-cx-text shadow-xl group-hover/tip:block group-focus-within/tip:block"
            >
              Configuration
            </span>
          )}
        </div>
        <div className="group/tip relative mx-2 mt-2 border-t border-cx-line pt-2">
          <span className={`flex items-center px-1 ${expanded ? "h-auto flex-col items-start gap-1 py-1" : "h-8 justify-center"}`} aria-label="Built by Covasant">
            {expanded ? (
              <>
                <span className="text-[10px] uppercase tracking-[0.08em] text-cx-faint">Built by</span>
                {/* navy wordmark on light; shown in white on the dark theme so it stays legible */}
                <img src={imgSrc(covasantWordmark)} alt="Covasant — AI-Driven. Human-Inspired." className="h-auto w-[132px]" style={theme === "dark" ? { filter: "brightness(0) invert(1)", opacity: 0.9 } : undefined} />
              </>
            ) : (
              <img src={imgSrc(covasantMark)} alt="Covasant" className="h-6 w-6 rounded-md" />
            )}
          </span>
          {!expanded && (
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-cx-strong bg-cx-raised px-2 py-1 text-[12px] text-cx-text shadow-xl group-hover/tip:block"
            >
              Built by Covasant
            </span>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`mx-2 mt-1 flex h-8 items-center gap-2 rounded-md px-2 text-[12px] text-cx-faint hover:bg-cx-hover hover:text-cx-text ${expanded ? "" : "justify-center"}`}
          aria-label={expanded ? "Collapse agents" : "Expand agents"}
        >
          {expanded ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          {expanded && "Collapse"}
        </button>
      </aside>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page frame: glow + rail + nav + assistant. "exec" is the bare SFA-note state.
// ---------------------------------------------------------------------------

export function PageFrame({
  persona,
  personaOptions = ["asm", "head", "exec"],
  onPersona,
  tabs = ["Home", "Action Tracker", "Market Action Plan", "Reports"],
  currentTab = 0,
  onTab,
  configActive = false,
  activeAgent,
  navActions,
  topBarExtra,
  children,
}: {
  persona: Persona;
  personaOptions?: Persona[];
  onPersona: (p: Persona) => void;
  tabs?: string[];
  /** index of the tab for this page; -1 when the page isn't one of the tabs (Configuration) */
  currentTab?: number;
  /** return true when the page handled the click itself */
  onTab?: (i: number) => boolean | void;
  configActive?: boolean;
  /** the agent whose page this is, marked in the rail */
  activeAgent?: AgentId;
  navActions?: React.ReactNode;
  topBarExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { assistantOpen } = useHome();
  const [railOpen, setRailOpen] = useState(false);
  const bare = persona === "exec";
  return (
    <div className={`relative min-h-screen overflow-x-clip transition-[padding] duration-200 ${assistantOpen && !bare ? ASSISTANT_PUSH : ""}`}>
      {!bare && <AssistantDrawer />}
      {/* the one glow moment, behind the nav + hero */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[640px]" style={{ background: "var(--cx-hero-glow)" }} />
      {!bare && <AgentRail expanded={railOpen} setExpanded={setRailOpen} persona={persona} configActive={configActive} activeAgent={activeAgent} />}
      <div className={`relative ${!bare ? "md:pl-14" : ""}`}>
        <div className="mx-auto max-w-[1440px]">
          <TopNav
            persona={persona}
            personaOptions={personaOptions}
            onPersona={onPersona}
            tabs={tabs}
            currentTab={currentTab}
            onTab={onTab}
            actions={bare ? undefined : navActions}
            extra={bare ? undefined : topBarExtra}
            onAgents={() => setRailOpen(true)}
          />
          {children}
        </div>
      </div>
    </div>
  );
}
