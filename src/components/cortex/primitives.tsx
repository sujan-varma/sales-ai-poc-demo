"use client";

import React, { createContext, useContext } from "react";
import { ArrowRight, Check, ChevronDown, Lock, Map as MapIcon, MessageSquareQuote, Plus, Thermometer, Users } from "lucide-react";
import { AGENTS, ActionStatus, AgentId, STATUS_META, ViewerRole } from "@/data/cortexHome";
import { useHome } from "./HomeState";
import { useStatusMeta } from "./statusPalette";

const AGENT_ICONS: Record<AgentId, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  huddle: Users,
  thermometer: Thermometer,
  map: MapIcon,
  pitch: MessageSquareQuote,
};

/** When on, every agent icon/dot renders grayscale — told apart by shape, not colour. */
const MonoIconsCtx = createContext(false);
export function MonoAgentIcons({ children }: { children: React.ReactNode }) {
  return <MonoIconsCtx.Provider value={true}>{children}</MonoIconsCtx.Provider>;
}
function useAgentColor(agent: AgentId) {
  return useContext(MonoIconsCtx) ? "rgb(var(--cx-faint))" : AGENTS[agent].color;
}

export function AgentIcon({ agent, size = "md", round = false, mono = false }: { agent: AgentId; size?: "sm" | "md" | "lg"; round?: boolean; mono?: boolean }) {
  const Icon = AGENT_ICONS[agent];
  const color = AGENTS[agent].color;
  const monoCtx = useContext(MonoIconsCtx);
  mono = mono || monoCtx;
  const box = { sm: "h-5 w-5", md: "h-7 w-7", lg: "h-9 w-9" }[size];
  const icon = { sm: "h-3 w-3", md: "h-3.5 w-3.5", lg: "h-[18px] w-[18px]" }[size];
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${round ? "rounded-full" : "rounded-md"} ${box} ${mono ? "border border-cx-line bg-cx-raised text-cx-muted" : ""}`}
      style={mono ? undefined : { background: `${color}1a`, color }}
    >
      <Icon className={icon} />
    </span>
  );
}

/** Small "which agent did this come from" marker. */
export function AgentChip({ agent, suffix }: { agent: AgentId; suffix?: string }) {
  const dot = useAgentColor(agent);
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-cx-faint">
      <span className="h-1.5 w-1.5 rounded-[2px]" style={{ background: dot }} />
      <span className="text-cx-muted">{AGENTS[agent].name}</span>
      {suffix && <span>· {suffix}</span>}
    </span>
  );
}

export function StatusBadge({ status }: { status: ActionStatus }) {
  const { meta, hollowUnassigned } = useStatusMeta();
  const m = meta[status];
  return (
    <span className="inline-flex h-5 shrink-0 items-center gap-1.5 rounded border border-cx-line bg-cx-raised px-1.5 text-[11px] text-cx-muted">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={status === "unassigned" && hollowUnassigned ? { border: `1px solid ${m.color}` } : { background: m.color }}
      />
      {m.label}
    </span>
  );
}

export function Panel({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`rounded-lg border border-cx-line bg-cx-panel ${className}`}>
      {children}
    </section>
  );
}

/** Option A section title (Geist). */
export function SectionTitle({ title }: { index?: string; title: string }) {
  return <h2 className="text-[16px] font-medium leading-tight tracking-[-0.01em] text-cx-text">{title}</h2>;
}

export function PanelHeader({
  title,
  agent,
  badge,
  right,
  index,
}: {
  title: string;
  /** card subtitles were removed product-wide (Head of Sales correction pass 4) */
  agent?: AgentId;
  badge?: React.ReactNode;
  right?: React.ReactNode;
  index?: string;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-cx-line px-5 py-4">
      <div className="min-w-0">
        {/* icon and title share one line, so they always align */}
        <div className="flex flex-wrap items-center gap-2.5">
          {agent && <AgentIcon agent={agent} />}
          <SectionTitle index={index} title={title} />
          {badge}
        </div>
      </div>
      {right}
    </header>
  );
}

export function TextLink({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex shrink-0 items-center gap-1 text-[12px] text-cx-muted hover:text-cx-text">
      {children}
      <ArrowRight className="h-3 w-3" />
    </button>
  );
}

/** Cross-link to another item on the page ("connects to"). */
export function ConnectChip({ label, target, agent }: { label: string; target: string; agent: AgentId }) {
  const { focus } = useHome();
  const dot = useAgentColor(agent);
  return (
    <button
      onClick={() => focus(target)}
      className="inline-flex h-6 items-center gap-1.5 rounded border border-cx-line bg-cx-raised px-2 text-[11.5px] text-cx-muted hover:border-cx-strong hover:text-cx-text"
    >
      <span className="h-1.5 w-1.5 rounded-[2px]" style={{ background: dot }} />
      {label}
    </button>
  );
}

export function CortexMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 4 L5 18 M12 4 L19 18 M5 18 L19 18" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.2" fill="none" />
      <circle cx="12" cy="4" r="2.6" fill="#5eead4" />
      <circle cx="5" cy="18" r="2.6" fill="currentColor" />
      <circle cx="19" cy="18" r="2.6" fill="currentColor" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2 text-cx-text">
      <CortexMark />
      <span className="font-data text-[13px] font-medium tracking-[0.28em]">CORTEX</span>
    </span>
  );
}

export function PersonaToggle() {
  const { role, setRole } = useHome();
  const opts: { id: ViewerRole; label: string }[] = [
    { id: "asm", label: "ASM" },
    { id: "head", label: "Sales head" },
  ];
  return (
    <div className="flex h-8 items-center rounded-md border border-cx-line bg-cx-panel p-0.5 text-[12px]" role="group" aria-label="View as">
      <span className="hidden px-2 text-cx-faint sm:inline">View as</span>
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => setRole(o.id)}
          aria-pressed={role === o.id}
          className={`h-full rounded px-2.5 ${role === o.id ? "bg-cx-hover text-cx-text" : "text-cx-faint hover:text-cx-muted"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** The always-reachable Create Plan CTA. Sales heads are read-only. */
export function CreatePlanButton({ compact = false, tone = "light" }: { compact?: boolean; tone?: "light" | "blue" }) {
  const { role, openPlan } = useHome();
  if (role === "head") {
    return (
      <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-cx-line px-2.5 text-[12px] text-cx-faint">
        <Lock className="h-3 w-3" /> Read-only
      </span>
    );
  }
  return (
    <button
      onClick={openPlan}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md font-medium ${
        tone === "blue"
          ? "h-9 bg-[#2f6fed] px-3.5 text-[13px] text-white shadow-[0_6px_24px_-6px_rgba(47,111,237,0.7)] hover:bg-[#4f86f7]"
          : "h-8 bg-cx-text px-3 text-[13px] text-cx-bg hover:opacity-90"
      }`}
    >
      <Plus className="h-3.5 w-3.5" />
      {compact ? "Create plan" : "Create Market Action Plan"}
    </button>
  );
}

export function Avatar({ initials }: { initials: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-cx-line bg-cx-raised font-data text-[11px] text-cx-muted">
      {initials}
    </span>
  );
}

/** Compact disclosure select (Option A officer filter). */
export function SelectMenu({ label, value, options, onChange }: { label: string; value: string | null; options: string[]; onChange: (v: string | null) => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12px] ${value ? "border-cx-strong bg-cx-hover text-cx-text" : "border-cx-line bg-cx-panel text-cx-muted hover:text-cx-text"}`}
      >
        <span className="text-cx-faint">{label}</span> {value ?? "Everyone"}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <ul className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-md border border-cx-strong bg-cx-raised p-1 shadow-2xl">
          {[null, ...options].map((o) => (
            <li key={o ?? "__all"}>
              <button
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-[12.5px] text-cx-muted hover:bg-cx-hover hover:text-cx-text"
              >
                {o ?? "Everyone"}
                {o === value && <Check className="h-3 w-3" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
