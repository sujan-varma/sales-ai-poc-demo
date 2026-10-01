"use client";

// Option A (Console) only — compressed Insights, Thermometer and Huddle.
// One blue "AI inferred" badge per section; every AI item carries its own
// blue "92% confidence" pill that opens the shared why-this-score card.

import { LBL } from "@/data/labels";
import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, CornerUpRight, FileText, ListPlus, MessageSquareQuote, MoreHorizontal, UserMinus, X } from "lucide-react";
import {
  AGENTS,
  AGENT_CARDS,
  AgentId,
  FINDINGS,
  HEAD_PLAN_MONTHS,
  HEALTH_LEVELS,
  INSIGHTS,
  PLAN_MONTHS,
  RECOMMENDATIONS,
  RecRoute,
  SignalType,
  TERRITORY_HEALTH,
  TRACKER,
} from "@/data/cortexHome";
import { AiTag, ConfidenceScore } from "./ai";
import { pct } from "./charts";
import { useStatusMeta } from "./statusPalette";
import { useHome } from "./HomeState";
import { AgentChip, AgentIcon, ConnectChip, Panel, SectionTitle } from "./primitives";

const BLUE = "#4f86f7";

export function SectionHeader({
  title,
  index,
  subtitle,
  icon,
  badge,
  right,
  className = "px-5 pb-1 pt-5",
}: {
  title: string;
  index?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        {/* icon and title share one line, so they always align */}
        <div className="flex flex-wrap items-center gap-2.5">
          {icon}
          <SectionTitle index={index} title={title} />
          {badge}
        </div>
        {subtitle && <p className={`mt-1.5 text-[12px] text-cx-faint ${icon ? "pl-[38px]" : ""}`}>{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <h3 className="font-data text-[10.5px] uppercase tracking-[0.08em] text-cx-faint">{children}</h3>;
}

function MoreButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 text-[12px] text-cx-muted hover:text-cx-text">
      {children} <ArrowRight className="h-3 w-3" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Insights — three compact pointers; "View all" opens a lighter detail sheet.
// ---------------------------------------------------------------------------

/** An insight's Pitch target: borrowed from the recommendation it connects to. */
function insightPitchFor(connects: { target: string }[]) {
  const rec = RECOMMENDATIONS.find((r) => connects.some((c) => c.target === r.id));
  return rec?.pitchFor;
}

export function InsightsSheet({
  onClose,
  focusId,
  renderAction,
}: {
  onClose: () => void;
  focusId: string | null;
  /** Option B: suggested / agreed / closed per insight instead of the Actions menu */
  renderAction?: (id: string) => React.ReactNode;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  // Deep link: scroll to and highlight the insight that was clicked.
  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`sheet-${focusId}`);
    if (!el) return;
    el.scrollIntoView({ block: "start" });
    el.classList.remove("cx-flash");
    void el.offsetWidth;
    el.classList.add("cx-flash");
  }, [focusId]);
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/50" onClick={onClose}>
      <aside
        role="dialog"
        aria-label="All insights"
        className="h-full w-full max-w-[min(860px,70vw)] overflow-y-auto border-l border-cx-strong bg-cx-bg px-9 py-8 max-md:max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[20px] font-medium leading-none tracking-[-0.01em] text-cx-text">All insights</h2>
            <AiTag />
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-cx-faint hover:bg-cx-hover hover:text-cx-text" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-[12px] text-cx-faint">Read across all four agents · 10:20</p>
        <ol className="mt-6">
          {INSIGHTS.map((ins, i) => (
            <li
              id={`sheet-${ins.id}`}
              key={ins.id}
              aria-current={focusId === ins.id ? "true" : undefined}
              className={`scroll-mt-6 border-t px-3 py-7 first:border-t-0 ${
                focusId === ins.id ? "rounded-lg border-transparent bg-[#2f6fed]/[0.09] shadow-[inset_3px_0_0_#4f86f7]" : "border-cx-line"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded border border-cx-strong font-data text-[10.5px] text-cx-muted">{i + 1}</span>
                  <AgentChip agent={ins.origin.agent} suffix={ins.origin.when} />
                </span>
                <span className="flex items-start gap-2.5">
                  <ConfidenceScore confidence={ins.confidence} align="right" />
                  {!renderAction && <ActionsMenu routeKey={`ins:${ins.id}`} pitchFor={insightPitchFor(ins.connects)} />}
                </span>
              </div>
              <h3 className="mt-3 text-[15px] font-medium leading-snug text-cx-text">{ins.headline}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-cx-muted">{ins.body}</p>
              {renderAction && <div className="mt-3">{renderAction(ins.id)}</div>}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ins.connects.map((c) => (
                  <ConnectChip key={c.target} {...c} />
                ))}
              </div>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

export function ConsoleInsights() {
  const [sheet, setSheet] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const openSheet = (id: string | null) => {
    setFocusId(id);
    setSheet(true);
  };
  return (
    <Panel id="insights">
      <SectionHeader title="Insights" badge={<AiTag />} right={<MoreButton onClick={() => openSheet(null)}>View all</MoreButton>} />
      <ul className="px-5 pb-3 pt-2">
        {INSIGHTS.slice(0, 3).map((ins, i) => (
          <li id={ins.id} key={ins.id} className="flex items-center gap-4 border-b border-cx-line py-3.5 last:border-0">
            <button
              onClick={() => openSheet(ins.id)}
              aria-label={`Open insight ${i + 1} in full`}
              title={`From ${AGENTS[ins.origin.agent].name} · open in full`}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-cx-strong font-data text-[11px] text-cx-muted hover:border-cx-text hover:text-cx-text"
            >
              {i + 1}
            </button>
            <p className="line-clamp-2 min-w-0 flex-1 text-[14px] leading-snug text-cx-text">{ins.headline}</p>
            <ConfidenceScore confidence={ins.confidence} align="right" />
          </li>
        ))}
      </ul>
      {sheet && <InsightsSheet focusId={focusId} onClose={() => setSheet(false)} />}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Thermometer — taller scatter + time range, single "Actions" trigger per row.
// ---------------------------------------------------------------------------

const RANGES = [
  { id: "today", label: "Today", maxHours: 24 },
  { id: "week", label: "This week", maxHours: 24 * 7 },
  { id: "month", label: "This month", maxHours: 24 * 31 },
] as const;

const ROUTES: { id: RecRoute; label: string; done: string; color: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
  { id: "tracker", label: "Add to Tracker", done: "In Tracker", color: "#2fa85c", icon: ListPlus },
  { id: "map", label: "Escalate to Market Action Plan", done: "In October plan", color: AGENTS.map.color, icon: CornerUpRight },
  { id: "pitch", label: "Send to Pitch", done: "In Pitch", color: AGENTS.pitch.color, icon: MessageSquareQuote },
];

/** Single "Actions" trigger; hover or click opens the three destinations as a menu anchored right. */
function ActionsMenu({ routeKey, n, pitchFor }: { routeKey: string; n?: number; pitchFor?: string }) {
  const { role, routes, toggleRoute, decisions, decide, toast } = useHome();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = routes[routeKey] ?? [];
  const tag = n != null ? `#${n}` : "Insight";

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  if (role === "head") return <span className="whitespace-nowrap text-[11.5px] text-cx-faint">Read-only</span>;
  if (decisions[routeKey] === "dismissed") {
    return (
      <span className="flex items-center gap-2 whitespace-nowrap text-[12px] text-cx-faint">
        Dismissed
        <button onClick={() => decide(routeKey, null)} className="hover:text-cx-text">
          Undo
        </button>
      </span>
    );
  }

  return (
    <div ref={ref} className="relative flex flex-col items-end gap-1.5" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] ${open ? "border-cx-strong bg-cx-hover text-cx-text" : "border-cx-line text-cx-muted hover:text-cx-text"}`}
      >
        <MoreHorizontal className="h-3.5 w-3.5" /> Actions
      </button>
      {active.length > 0 && (
        <span className="flex flex-wrap justify-end gap-1">
          {ROUTES.filter((x) => active.includes(x.id)).map((x) => (
            <span key={x.id} className="inline-flex h-5 items-center gap-1 whitespace-nowrap rounded border px-1.5 text-[10.5px] text-cx-muted" style={{ borderColor: `${x.color}66` }}>
              <Check className="h-2.5 w-2.5" style={{ color: x.color }} /> {x.done}
            </span>
          ))}
        </span>
      )}
      {open && (
        <div role="menu" className="absolute right-0 top-7 z-40 pt-1.5">
          <div className="w-[260px] rounded-lg border border-cx-strong bg-cx-raised p-1 shadow-2xl">
            {ROUTES.map((x) => {
              const on = active.includes(x.id);
              const Icon = on ? Check : x.icon;
              return (
                <button
                  key={x.id}
                  role="menuitemcheckbox"
                  aria-checked={on}
                  onClick={() => {
                    toggleRoute(routeKey, x.id);
                    toast(on ? `${tag} removed from ${x.done.replace("In ", "")}.` : `${tag}: ${x.id === "pitch" && pitchFor ? `prioritised for ${pitchFor}` : x.done.toLowerCase()}.`);
                  }}
                  className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-cx-hover"
                >
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: x.color }} />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] text-cx-text">{on ? x.done : x.label}</span>
                    {x.id === "pitch" && pitchFor && <span className="block truncate text-[11px] text-cx-faint">for {pitchFor}</span>}
                  </span>
                </button>
              );
            })}
            {!active.length && (
              <button onClick={() => decide(routeKey, "dismissed")} className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[12.5px] text-cx-faint hover:bg-cx-hover hover:text-cx-muted">
                <X className="h-3.5 w-3.5" /> Dismiss
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** The levers shown as plain filter labels on Option A's Thermometer card (no chart). */
const LEVERS: SignalType[] = ["Collection", "Stock", "Pricing", "Revenue"];

export function ConsoleThermometer() {
  const { role, decisions, routes, hoveredRec, setHoveredRec, toast } = useHome();
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("today");
  const [lever, setLever] = useState<SignalType | null>(null);
  const max = RANGES.find((x) => x.id === range)!.maxHours;
  const inRange = RECOMMENDATIONS.filter((r) => r.raisedHoursAgo <= max);
  const shown = inRange.filter((r) => !lever || r.signal === lever).slice(0, 4);
  const openFull = () => toast("Opens Thermometer · all recommendations.");
  const open = RECOMMENDATIONS.filter((r) => !decisions[r.id] && !routes[r.id]?.length).length;
  const rangeLabel = RANGES.find((x) => x.id === range)!.label.toLowerCase();

  return (
    <Panel id="thermo-panel" className="flex h-full flex-col">
      <SectionHeader
        title={role === "asm" ? "Thermometer" : "Thermometer · my team"}
        icon={<AgentIcon agent="thermometer" />}
        badge={
          <button onClick={openFull} title="Open all recommendations" className="rounded transition-opacity hover:opacity-80">
            <AiTag />
          </button>
        }
        subtitle={role === "asm" ? `Recommendations · ${open} open · nothing is applied until you choose` : "Recommendations · read-only · what your ASMs did with each"}
        right={
          <div className="flex h-7 items-center rounded-md border border-cx-line p-0.5 text-[11.5px]" role="group" aria-label="Time range">
            {RANGES.map((x) => (
              <button
                key={x.id}
                aria-pressed={range === x.id}
                onClick={() => {
                  setRange(x.id);
                  setLever(null);
                }}
                className={`h-full rounded px-2 ${range === x.id ? "bg-cx-hover text-cx-text" : "text-cx-faint hover:text-cx-muted"}`}
              >
                {x.label}
              </button>
            ))}
          </div>
        }
      />
      {/* levers as plain labels — filter the list; no chart on this card */}
      <div className="flex flex-wrap items-center gap-1.5 px-5 pb-3 pt-4" role="group" aria-label="Filter by lever">
        <span className="mr-1 text-[11.5px] text-cx-faint">Lever</span>
        {[null, ...LEVERS].map((l) => {
          const on = lever === l;
          return (
            <button
              key={l ?? "all"}
              onClick={() => setLever(l)}
              aria-pressed={on}
              className={`h-7 rounded-md border px-2.5 text-[12px] ${on ? "border-cx-strong bg-cx-hover text-cx-text" : "border-cx-line text-cx-muted hover:text-cx-text"}`}
            >
              {l ?? "All"}
            </button>
          );
        })}
      </div>
      <ul className="flex-1 border-t border-cx-line px-2 pb-1 pt-1">
        {shown.length === 0 && (
          <li className="px-3 py-6 text-center text-[12.5px] text-cx-faint">
            Nothing {lever ? `on ${lever} ` : ""}raised {rangeLabel}.
          </li>
        )}
        {shown.map((r) => (
          <li
            id={r.id}
            key={r.id}
            onMouseEnter={() => setHoveredRec(r.id)}
            onMouseLeave={() => setHoveredRec(null)}
            className={`rounded-lg px-3 py-3 ${hoveredRec === r.id ? "bg-cx-hover/50" : ""} ${decisions[r.id] === "dismissed" ? "opacity-60" : ""}`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded border border-cx-strong font-data text-[10.5px] text-cx-muted">{r.n}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] text-cx-faint">
                  <span className="text-cx-muted">{r.territory}</span> · {r.signal} · <span className="font-data">{r.impactLabel}</span>
                </p>
                <p className="mt-1 text-[13.5px] leading-snug text-cx-text">{r.title}</p>
              </div>
              <div className="flex shrink-0 items-start gap-2 whitespace-nowrap">
                <span className="pt-0.5">
                  <ConfidenceScore confidence={r.confidence} align="right" />
                </span>
                <ActionsMenu routeKey={r.id} n={r.n} pitchFor={r.pitchFor} />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="border-t border-cx-line px-5 py-3">
        <MoreButton onClick={openFull}>View all {RECOMMENDATIONS.length} recommendations</MoreButton>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// From today's Huddle — no section backdrop; horizontal scroll of items.
// ---------------------------------------------------------------------------

export function ConsoleHuddle() {
  const { toast } = useHome();
  const scroller = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState(false);
  const ordered = [...FINDINGS].sort((a, b) => {
    const t = (w: string) => (w.startsWith("Today") ? 1 : 0);
    return t(b.when) - t(a.when) || b.when.localeCompare(a.when);
  });

  // Fade the bottom edge only while there is more to scroll to.
  const update = () => {
    const el = scroller.current;
    if (el) setFade(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  };
  useEffect(() => {
    update();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const mask = fade ? "linear-gradient(to bottom, #000 calc(100% - 64px), transparent)" : undefined;

  return (
    <Panel id="findings" className="flex h-full flex-col">
      <SectionHeader
        className="px-5 pb-3 pt-5"
        title="From today's Huddle"
        icon={<AgentIcon agent="huddle" />}
        badge={<AiTag />}
        subtitle="Quoted from calls and huddles · each traceable to its transcript"
        right={<MoreButton onClick={() => toast("Opens Huddle · everything inferred today.")}>View all</MoreButton>}
      />
      {/* The list is absolutely positioned so it never grows the row: Territory Health sets the height. */}
      <div className="relative min-h-[280px] flex-1">
        <div
          ref={scroller}
          onScroll={update}
          className="absolute inset-0 overflow-y-auto px-5 pb-2 [scrollbar-width:thin]"
          style={{ maskImage: mask, WebkitMaskImage: mask }}
        >
          <ul>
            {ordered.map((f) => (
              <li id={f.id} key={f.id} className="border-t border-cx-line py-4 first:border-t-0 first:pt-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-cx-text">{f.theme}</span>
                  <ConfidenceScore confidence={f.confidence} align="right" />
                </div>
                <blockquote className="mt-2.5 line-clamp-3 border-l-2 pl-3 text-[13.5px] leading-relaxed text-cx-text" style={{ borderColor: `${AGENTS.huddle.color}88` }}>
                  “{f.quote}”
                </blockquote>
                <p className="mt-2 truncate pl-3.5 text-[11.5px] text-cx-faint">
                  <span className="text-cx-muted">{f.speaker}</span> · {f.when}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => toast(`Opens the ${f.session.toLowerCase()} transcript at ${f.at}.`)}
                    className="inline-flex h-6 items-center gap-1 rounded border border-cx-line bg-cx-raised px-2 text-[11.5px] text-cx-muted hover:border-cx-strong hover:text-cx-text"
                  >
                    <FileText className="h-3 w-3" /> {f.session} · {f.at}
                  </button>
                  <ConnectChip label={f.linkLabel ?? "Insight"} target={f.insight} agent="huddle" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// KPI bar — the first thing on the page. Target achieved · Open actions ·
// Weakest territory (proposed; pending Raghu's confirmation).
// ---------------------------------------------------------------------------

/** Weakest = the row with the most "unhealthy" weight across all metrics. */
export function weakest(role: "asm" | "head") {
  const g = TERRITORY_HEALTH[role];
  const scored = g.rows.map((row) => ({
    row,
    score: row.cells.reduce((n, c) => n + (4 - c.level), 0),
    critical: row.cells.filter((c) => c.level === 0).length,
    worst: row.cells.reduce((a, c, i) => (c.level < row.cells[a].level ? i : a), 0),
  }));
  scored.sort((a, b) => b.score - a.score || b.critical - a.critical);
  const w = scored[0];
  const cell = w.row.cells[w.worst];
  return { name: w.row.name, metric: g.columns[w.worst], cell, critical: w.critical, unit: role === "asm" ? "territory" : "region" };
}

/** variant "a" = Option A's ledger look (serif figures, 4px corners); "b" = Option B (Plex, 8px). */
export function ConsoleKpiBar({ variant = "a", planTarget = "map-panel" }: { variant?: "a" | "b"; planTarget?: string }) {
  const { role, focus } = useHome();
  const fig = "font-plex text-[40px] font-medium leading-none tracking-tight";
  const figUnit = "font-plex text-[22px] leading-none text-cx-faint";
  const { meta } = useStatusMeta();
  const sep = (role === "asm" ? PLAN_MONTHS : HEAD_PLAN_MONTHS).find((m) => m.month === "Sep")!;
  const p = pct(sep)!;
  const t = TRACKER[role];
  const open = t.total - t.counts.done;
  const w = weakest(role);
  const cell =
    variant === "a"
      ? "group flex min-w-0 flex-col rounded-lg border border-cx-line bg-cx-panel px-6 py-5 text-left transition-colors hover:border-cx-strong"
      : "group flex min-w-0 flex-col px-6 py-5 text-left transition-colors hover:bg-cx-hover/40";
  const label = "flex items-center gap-2 font-data text-[10.5px] uppercase tracking-[0.1em] text-cx-faint";

  return (
    <section
      aria-label="Key metrics"
      className={
        variant === "a"
          ? "grid grid-cols-1 gap-4 md:grid-cols-3"
          : "grid grid-cols-1 divide-y divide-cx-line overflow-hidden rounded-lg border border-cx-line bg-cx-panel md:grid-cols-3 md:divide-x md:divide-y-0"
      }
    >
      <button className={cell} onClick={() => focus(planTarget)}>
        <span className={label}>Target achieved · September</span>
        <span className="mt-3 flex items-baseline gap-1.5">
          <span className={`${fig} text-cx-text`}>{p}</span>
          <span className={figUnit}>%</span>
        </span>
        <span className="relative mt-4 block h-1 rounded-full bg-cx-strong/70">
          <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${p}%`, background: "#4f86f7" }} />
        </span>
        <span className="mt-2.5 text-[12px] text-cx-muted">
          <span className="font-data text-cx-text">₹{sep.achievedL}L</span> of ₹{sep.estimateL}L · {LBL.daysLeft}
        </span>
      </button>

      <button className={cell} onClick={() => focus("tracker-panel")}>
        <span className={label}>Open actions</span>
        <span className="mt-3 flex items-baseline gap-2">
          <span className={`${fig} text-cx-text`}>{open}</span>
          <span className="text-[12px] text-cx-faint">of {t.total} this month</span>
        </span>
        <span className="mt-4 flex h-1 gap-[2px]">
          {(["progress", "delayed", "unassigned"] as const).map((k) => (
            <span key={k} className="h-full first:rounded-l-full last:rounded-r-full" style={{ flexGrow: t.counts[k], background: meta[k].color }} />
          ))}
        </span>
        <span className="mt-2.5 text-[12px] text-cx-muted">
          <span className="font-data text-cx-text">{t.counts.progress}</span> in progress · <span className="font-data text-cx-text">{t.counts.delayed}</span> delayed ·{" "}
          <span className="font-data text-cx-text">{t.counts.unassigned}</span> unassigned
        </span>
      </button>

      <button className={cell} onClick={() => focus("health-panel")}>
        <span className={label}>
          Weakest {w.unit}
          <span className="rounded-[3px] border border-dashed border-cx-strong px-1 text-[9.5px] tracking-[0.06em] text-cx-muted" title="Proposed metric — pending Raghu's confirmation">
            Proposed
          </span>
        </span>
        <span className={`mt-3 truncate ${fig} text-cx-text`}>{w.name}</span>
        <span className="mt-4 flex h-1 gap-[2px]">
          {TERRITORY_HEALTH[role].rows
            .find((r) => r.name === w.name)!
            .cells.map((c, i) => (
              <span key={i} className="h-full flex-1 first:rounded-l-full last:rounded-r-full" style={{ background: HEALTH_LEVELS[c.level].color }} />
            ))}
        </span>
        <span className="mt-2.5 truncate text-[12px] text-cx-muted">
          {w.metric} <span className="font-data text-cx-text">{w.cell.value}</span> · {w.cell.detail}
        </span>
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Agents — a row of thin cards. Churn is a placeholder (not yet defined).
// ---------------------------------------------------------------------------

export function ConsoleAgentRow({ variant = "a" }: { variant?: "a" | "b" }) {
  const { toast } = useHome();
  const radius = "rounded-lg";
  // Both options: label beside the icon. Option B: grayscale icons (shape only) and "… agent" names.
  const beside = true;
  const mono = variant === "b";
  const label = (name: string) => (variant === "b" ? `${name} agent` : name);
  return (
    <section aria-label="Agents">
      {variant === "a" ? (
        <SectionHeader title="Agents" className="pb-4" subtitle="Open an agent to work in it directly" />
      ) : (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-medium text-cx-text">Agents</h2>
          <span className="text-[11.5px] text-cx-faint">Open an agent to work in it directly</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {AGENT_CARDS.map((a) =>
          a.placeholder ? (
            <div key={a.id} className={`flex border border-dashed border-cx-strong px-4 py-3 ${radius} ${beside ? "items-center gap-3" : "flex-col py-3.5"}`}>
              <span className={`flex items-center ${beside ? "" : "justify-between"}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-dashed border-cx-strong text-cx-faint">
                  <UserMinus className="h-3.5 w-3.5" />
                </span>
                {!beside && <span className="font-data text-[9.5px] uppercase tracking-[0.08em] text-cx-faint">Soon</span>}
              </span>
              <span className={`min-w-0 ${beside ? "flex-1" : "mt-3"}`}>
                <span className="block truncate text-[13.5px] text-cx-text">{label(a.name)}</span>
                <span className="block truncate text-[11.5px] text-cx-faint">{beside ? "Coming soon" : a.stat}</span>
              </span>
            </div>
          ) : (
            <button
              key={a.id}
              onClick={() => toast(`Opens ${a.name}.`)}
              className={`group flex border border-cx-line bg-cx-panel px-4 text-left transition-colors hover:border-cx-strong ${radius} ${beside ? "items-center gap-3 py-3" : "flex-col py-3.5"}`}
            >
              {beside ? (
                <>
                  <AgentIcon agent={a.id as AgentId} mono={mono} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] leading-tight text-cx-text">{label(a.name)}</span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-cx-faint">{a.stat}</span>
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-cx-faint transition-colors group-hover:text-cx-text" />
                </>
              ) : (
                <>
                  <span className="flex items-center justify-between">
                    <AgentIcon agent={a.id as AgentId} />
                    <ArrowUpRight className="h-3.5 w-3.5 text-cx-faint transition-colors group-hover:text-cx-text" />
                  </span>
                  <span className="mt-3 text-[13.5px] text-cx-text">{a.name}</span>
                  <span className="mt-0.5 truncate text-[11.5px] text-cx-faint">{a.stat}</span>
                </>
              )}
            </button>
          )
        )}
      </div>
    </section>
  );
}
