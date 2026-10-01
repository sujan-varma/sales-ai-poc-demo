"use client";

// Option A — persistent sidebar + top bar, "field ledger" treatment:
// warm graphite / paper themes, serif display type, numbered sections.

import React, { useEffect, useState } from "react";
import { Bell, Home, PanelLeftClose, PanelLeftOpen, Settings, SlidersHorizontal, Sparkles } from "lucide-react";
import { AGENTS, AGENT_ORDER, SYNC_LABEL, TODAY_LABEL, VIEWER } from "@/data/cortexHome";
import { HomeProvider, useHome } from "@/components/cortex/HomeState";
import { ThemeRoot, ThemeToggle } from "@/components/cortex/theme";
import { ConsoleStatusPalette } from "@/components/cortex/statusPalette";
import { TerritoryHealthCard } from "@/components/cortex/territoryHealth";
import { AiStyleProvider } from "@/components/cortex/ai";
import { ConsoleAgentRow, ConsoleHuddle, ConsoleInsights, ConsoleKpiBar, ConsoleThermometer } from "@/components/cortex/consoleSections";
import { AssistantDrawer, ASSISTANT_PUSH } from "@/components/cortex/assistant";
import { AgentIcon, Avatar, CreatePlanButton, MonoAgentIcons, PersonaToggle, SectionTitle } from "@/components/cortex/primitives";
import { ActionTrackerPanel, MapPanel, WhatsWorkingPanel } from "@/components/cortex/sections";

export function OptionAHome() {
  return (
    <ThemeRoot scope="cx-a" storageKey="cortex-a-theme">
      <HomeProvider>
        <AiStyleProvider value="pill">
          <ConsoleStatusPalette>
            <MonoAgentIcons>
              <Shell />
            </MonoAgentIcons>
          </ConsoleStatusPalette>
        </AiStyleProvider>
      </HomeProvider>
    </ThemeRoot>
  );
}

// ---------------------------------------------------------------------------
// Sidebar — full names when expanded, icons + tooltips when collapsed.
// ---------------------------------------------------------------------------

function NavTip({ label, show }: { label: string; show: boolean }) {
  if (!show) return null;
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-cx-strong bg-cx-raised px-2 py-1 text-[12px] text-cx-text shadow-xl group-hover/tip:block group-focus-within/tip:block"
    >
      {label}
    </span>
  );
}

function NavGroup({ label, collapsed }: { label: string; collapsed: boolean }) {
  return (
    <p className={`mb-1.5 mt-6 font-data text-[10.5px] uppercase tracking-[0.1em] text-cx-faint ${collapsed ? "text-center text-[9px]" : "px-2.5"}`}>
      {label}
    </p>
  );
}

function Sidebar() {
  const { role, toast } = useHome();
  const v = VIEWER[role];
  const [collapsed, setCollapsed] = useState(false);
  const Toggle = collapsed ? PanelLeftOpen : PanelLeftClose;
  const item = `flex w-full items-center rounded-md hover:bg-cx-hover ${collapsed ? "justify-center p-1.5" : "gap-2.5 px-2 py-1.5"}`;
  const plainItem = `flex h-9 w-full items-center rounded-md text-[13px] text-cx-muted hover:bg-cx-hover hover:text-cx-text ${collapsed ? "justify-center" : "gap-2.5 px-2.5"}`;

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-cx-line bg-cx-bg transition-[width] duration-200 lg:flex ${collapsed ? "w-[68px]" : "w-[248px]"}`}
    >
      {/* h-16 + border-b matches the top bar exactly, so the two borders form one line */}
      <div className={`flex h-16 shrink-0 items-center border-b border-cx-line ${collapsed ? "justify-center px-2" : "justify-between pl-5 pr-3"}`}>
        {!collapsed && <span className="font-data text-[13px] font-medium tracking-[0.28em] text-cx-text">CORTEX</span>}
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-8 w-8 items-center justify-center rounded-md text-cx-faint hover:bg-cx-hover hover:text-cx-text"
        >
          <Toggle className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex-1 px-2 py-3">
        <div className="group/tip relative">
          <a href="#" aria-current="page" aria-label="Home" className={`flex h-9 items-center rounded-md bg-cx-hover text-[13px] text-cx-text ${collapsed ? "justify-center" : "gap-2.5 px-2.5"}`}>
            <Home className="h-4 w-4" /> {!collapsed && "Home"}
          </a>
          <NavTip label="Home" show={collapsed} />
        </div>

        <NavGroup label="Agents" collapsed={collapsed} />
        <ul className="space-y-0.5">
          {AGENT_ORDER.map((a) => (
            <li key={a} className="group/tip relative">
              <button onClick={() => toast(`Opens ${AGENTS[a].name}.`)} aria-label={AGENTS[a].name} className={`${item} text-left`}>
                <AgentIcon agent={a} />
                {!collapsed && (
                  <span className="min-w-0">
                    <span className="block text-[13px] leading-snug text-cx-text">{AGENTS[a].name}</span>
                    <span className="block text-[11px] leading-snug text-cx-faint">{AGENTS[a].stat}</span>
                  </span>
                )}
              </button>
              <NavTip label={AGENTS[a].name} show={collapsed} />
            </li>
          ))}
        </ul>

        <NavGroup label="Platform" collapsed={collapsed} />
        <div className="group/tip relative">
          <button onClick={() => toast("Opens Configuration: agents, thresholds, data sources.")} aria-label="Configuration" className={plainItem}>
            <SlidersHorizontal className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <span className="min-w-0 text-left">
                <span className="block leading-snug">Configuration</span>
                <span className="block text-[11px] leading-snug text-cx-faint">Agents, thresholds, data sources</span>
              </span>
            )}
          </button>
          <NavTip label="Configuration" show={collapsed} />
        </div>
        <div className="group/tip relative mt-0.5">
          <button onClick={() => toast("Opens Settings.")} aria-label="Settings" className={plainItem}>
            <Settings className="h-4 w-4 shrink-0" /> {!collapsed && "Settings"}
          </button>
          <NavTip label="Settings" show={collapsed} />
        </div>
      </nav>
      <div className="border-t border-cx-line px-2 py-2">
        <div className={`flex items-center py-2 ${collapsed ? "justify-center" : "gap-2.5 px-2"}`}>
          <Avatar initials={v.initials} />
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] text-cx-text">{v.name}</span>
              <span className="block truncate text-[11px] text-cx-faint">{v.role}</span>
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------

function AssistantTab() {
  const { assistantOpen, setAssistantOpen } = useHome();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAssistantOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setAssistantOpen]);

  return (
    <button
      onClick={() => setAssistantOpen((o) => !o)}
      aria-expanded={assistantOpen}
      aria-controls="ai-assistant"
      className="cx-glow inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-medium text-cx-text"
    >
      <Sparkles className="h-3.5 w-3.5 text-[color:var(--ai-ink)]" />
      AI Assistant
      <kbd className="hidden rounded border border-cx-strong px-1 font-data text-[10px] font-normal text-cx-faint xl:inline">⌘K</kbd>
    </button>
  );
}

function TopBar() {
  const { role } = useHome();
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-cx-line bg-cx-bg/90 px-4 backdrop-blur sm:px-8">
      <span className="font-data text-[13px] font-medium tracking-[0.28em] text-cx-text lg:hidden">CORTEX</span>
      <span className="hidden font-data text-[11px] uppercase tracking-[0.1em] text-cx-faint lg:inline">Home</span>
      <div className="ml-auto flex shrink-0 items-center gap-2.5">
        <ThemeToggle />
        <span className="hidden xl:block">
          <PersonaToggle />
        </span>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-cx-line text-cx-muted hover:text-cx-text" aria-label="Notifications">
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-cx-text" />
        </button>
        <CreatePlanButton tone="blue" />
        <AssistantTab />
        <span className="lg:hidden">
          <Avatar initials={VIEWER[role].initials} />
        </span>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function Shell() {
  const { role, assistantOpen } = useHome();
  const v = VIEWER[role];
  return (
    <div className={`flex min-h-screen transition-[padding] duration-200 ${assistantOpen ? ASSISTANT_PUSH : ""}`}>
      <AssistantDrawer />
      <Sidebar />
      <div className="min-w-0 flex-1">
        <TopBar />
        <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-9 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-serif text-[42px] font-normal leading-[1.02] tracking-[-0.015em] text-cx-text">{v.greeting}</h1>
              <p className="mt-2 text-[12.5px] text-cx-faint">
                {v.role} · {v.scope} · {TODAY_LABEL}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="xl:hidden">
                <PersonaToggle />
              </span>
              <p className="font-data text-[11px] text-cx-faint">{SYNC_LABEL}</p>
            </div>
          </div>

          <div className="mt-7">
            <ConsoleKpiBar />
          </div>

          <div className="mt-12 space-y-12">
            <ConsoleInsights />
            {/* Action Tracker 30% · Territory Health 70% */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]">
              <ActionTrackerPanel />
              <TerritoryHealthCard
              id="health-panel"
              role={role}
              borderClass="rounded-lg border-cx-line"
              header={
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SectionTitle title="Territory health" />
                  <span className="text-[11.5px] text-cx-faint">{role === "asm" ? "6 territories" : "7 regions"} · today</span>
                </div>
              }
              />
            </div>
            <MapPanel />
            {role === "head" && <WhatsWorkingPanel />}
            {/* Thermometer sets the row height; Huddle's list scrolls inside it */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <ConsoleThermometer />
              <ConsoleHuddle />
            </div>
            <ConsoleAgentRow />
          </div>
        </main>
      </div>
    </div>
  );
}
