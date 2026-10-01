"use client";

// Option B (formerly "Pulse") — the Area Sales Manager dashboard and the entry point
// of the Sales AI flow. Loud's structure (top nav, greeting + hero metric, comparison
// section, three-card row) with Syntrix's styling (one glow moment behind the hero,
// quiet confident dark). The page chrome lives in ./shell; Leadership is its own
// page (./LeadershipHome), reached from the persona menu.

import { LBL } from "@/data/labels";
import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CornerUpRight,
  Grid3x3,
  ListChecks,
  Lock,
  MoreHorizontal,
  MessageSquareQuote,
  Plus,
  Smartphone,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import {
  ACTION_ITEMS,
  ActionStatus,
  ACTION_MONTHS,
  AgentRun,
  INSIGHT_ACTIONS,
  PRIMARY_BLUE,
  PRIMARY_BLUE_SOFT,
  SignalType,
  SUGGESTED_ACTIONS,
  WEAKEST_BY_MONTH,
  AGENTS,
  AgentId,
  FINDINGS,
  FINDING_ACTIONS,
  FISCAL_YEAR,
  HEAD_PENDING,
  HEAD_PLAN_MONTHS,
  HEAD_REC_ROUTES,
  HEALTH_LEVELS,
  INSIGHTS,
  INSIGHTS_SUMMARY,
  OFFICERS,
  PLAN_MONTHS,
  PlanMonth,
  RECOMMENDATIONS,
  RecRoute,
  Recommendation,
  STATUS_META,
  SYNC_LABEL,
  TEAM_TRACKER,
  TERRITORIES,
  TERRITORY_HEALTH,
  THERMO_SET_CONFIDENCE,
  TODAY_LABEL,
  TRACKER,
  TRACKER_TREND,
  VIEWER,
  WIDGET_OPTIONS,
} from "@/data/cortexHome";
import { AiMeta, AiTag, ConfidenceScore } from "./ai";
import { StatusMark, pct, useWidth } from "./charts";
import { useHome } from "./HomeState";
import { AgentRunChip, useBrand } from "./agentRun";
import { TerritoryHealthCard } from "./territoryHealth";
import { STATUS_META_B, useStatusMeta } from "./statusPalette";
import { ConsoleAgentRow, InsightsSheet, weakest } from "./consoleSections";
import { MapPanel } from "./sections";
import { AgentIcon, CortexMark, StatusBadge } from "./primitives";
import { CortexPageRoot, PageFrame, Persona, useOutside } from "./shell";
import { useCortexNav } from "./nav";
import { SuggestedOutcome } from "./actionTrace";
import { ACTION_TRACES, REC_SUGGESTED, ROUTE_DONE_LABEL } from "@/data/actionTraces";
import { CardHeader, Dropdown, Eyebrow, KpiStripes, blueRamp, card } from "./kit";

export function OptionCHome() {
  return (
    <CortexPageRoot>
      <Pulse />
    </CortexPageRoot>
  );
}

// ---------------------------------------------------------------------------
// Hero: greeting + plan metric + Create Plan CTA (where Loud has Week/Month/Year)
// ---------------------------------------------------------------------------

function StripeBar({
  percent,
  bars = 20,
  height = 56,
  bright = true,
  barW = 3,
  gap = 3,
  marker,
  color = PRIMARY_BLUE,
}: {
  percent: number | null;
  bars?: number;
  height?: number;
  bright?: boolean;
  barW?: number;
  gap?: number;
  /** optional tick (percent) — e.g. projected finish */
  marker?: number;
  color?: string;
}) {
  const filled = percent == null ? 0 : Math.round((Math.min(percent, 100) / 100) * bars);
  const markerBar = marker == null ? -1 : Math.round((marker / 100) * bars) - 1;
  return (
    <div className="flex items-end" style={{ height, gap }} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="rounded-[1px]"
          style={{
            width: barW,
            height: "100%",
            background: i < filled ? color : "rgb(var(--cx-line))",
            opacity: i < filled ? (bright ? 0.45 + (0.55 * (i + 1)) / Math.max(filled, 1) : 0.55) : 1,
            boxShadow: i === markerBar && i >= filled ? "inset 0 0 0 1px rgb(var(--cx-faint))" : undefined,
          }}
        />
      ))}
    </div>
  );
}

function MonthTimeline({ months, closedColor }: { months: PlanMonth[]; closedColor?: string }) {
  const { toast } = useHome();
  const scroller = useRef<HTMLDivElement>(null);
  const entries = months.filter((m) => m.created).slice().reverse(); // this month first, prior months scroll back
  const statusLabel = { delivered: "Delivered", progress: "In progress", "not-started": "Not created" } as const;
  const scroll = (dx: number) => scroller.current?.scrollBy({ left: dx, behavior: "smooth" });

  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between">
        <Eyebrow>Monthly plans · achieved vs. estimate</Eyebrow>
        <span className="flex gap-1">
          <button onClick={() => scroll(-340)} className="flex h-7 w-7 items-center justify-center rounded-md border border-cx-line text-cx-faint hover:text-cx-text" aria-label="Scroll to newer months">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => scroll(340)} className="flex h-7 w-7 items-center justify-center rounded-md border border-cx-line text-cx-faint hover:text-cx-text" aria-label="Scroll to earlier months">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
      <div className="relative">
        <div ref={scroller} className="flex snap-x overflow-x-auto pb-2 [scrollbar-width:thin]">
          {entries.map((m, i) => {
            const p = pct(m);
            const current = i === 0;
            const projected = Number(m.note.match(/~(\d+)%/)?.[1] ?? 0) || undefined;
            return (
              <button
                key={m.month}
                onClick={() => toast(`Opens the ${m.month} plan.`)}
                className={`shrink-0 snap-start border-l border-cx-line px-5 text-left first:border-l-0 first:pl-0 hover:[&_.cx-m]:text-cx-text ${current ? "w-[360px]" : "w-[176px]"}`}
              >
                <p className="flex items-center gap-2 text-[12px] text-cx-muted">
                  <span className="cx-m">{m.month} 2026</span>
                  {current && <span className="rounded border border-cx-strong px-1 text-[10px] text-cx-text">This month</span>}
                </p>
                <div className="mt-1.5 flex items-baseline justify-between gap-3">
                  <p className={`font-data leading-tight text-cx-text ${current ? "text-[26px]" : "text-[20px]"}`}>₹{m.achievedL}L</p>
                  {current && <p className="font-data text-[20px] text-cx-text">{p}%</p>}
                </div>
                <p className="text-[11px] text-cx-faint">
                  of ₹{m.estimateL}L estimated{current && ` · ${LBL.daysLeft}${projected ? ` · projected ~${projected}%` : ""}`}
                </p>
                <div className="relative mt-3">
                  <div className="absolute inset-x-0 top-0 border-t border-dashed border-cx-strong" />
                  <div className="pt-1.5">
                    {current ? (
                      <StripeBar percent={p} bars={20} barW={11} gap={5} height={48} marker={projected} />
                    ) : (
                      <StripeBar percent={p} bright={false} height={48} color={closedColor} />
                    )}
                  </div>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-cx-muted">
                  <svg width="8" height="8" aria-hidden>
                    <StatusMark status={m.status === "delivered" ? "done" : "progress"} x={4} y={4} r={3} />
                  </svg>
                  {!current && <span className="font-data text-cx-text">{p}%</span>}
                  {!current && " · "}
                  {statusLabel[m.status]}
                  {current && <span className="text-cx-faint"> · outlined stripe = projected finish</span>}
                </p>
              </button>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-cx-bg to-transparent" />
      </div>
      <p className="mt-1 text-[11px] text-cx-faint">Dashed line = 100% of estimate · each stripe = 5%</p>
    </div>
  );
}

function Hero({ persona }: { persona: "asm" | "head" }) {
  const { openPlan } = useHome();
  const v = VIEWER[persona];
  const [first] = v.greeting.replace("Good morning, ", "").split(" ");
  // Smaller and higher: the name is the same every day; the KPI cards below matter more.
  return (
    <section className="cx-land-hero relative px-4 pb-8 pt-16 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-medium leading-tight tracking-tight text-cx-text">
            Welcome back, <span className="text-[#4f86f7]">{first}</span>
          </h1>
          <p className="mt-1 text-[12px] text-cx-faint">
            {v.role.replace(" · read-only", "")} · {v.scope} · {TODAY_LABEL} · <span className="font-data">{SYNC_LABEL}</span>
          </p>
        </div>
        {persona === "asm" ? (
          <div className="flex flex-col items-end gap-1">
            <button onClick={openPlan} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#2f6fed] px-4 text-[13px] font-medium text-white hover:bg-[#4f86f7]">
              <Plus className="h-4 w-4" /> Create Market Action Plan
            </button>
            <span className="text-[12px] text-cx-faint">October not created · September closes and lands 1 October 2026</span>
          </div>
        ) : (
          <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-cx-line bg-cx-panel/70 px-4 text-[13px] text-cx-faint">
            <Lock className="h-3.5 w-3.5" /> Read-only · ASMs create plans
          </span>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// KPI cards — Achieved · Open action items · Weakest territory.
// "View details" shifts the card to the right and expands a month-by-month view.
// ---------------------------------------------------------------------------

type KpiId = "achieved" | "actions" | "weakest";

const KPI_H = 158; // one collapsed KPI cell; the expanded view is exactly two cells + the divider

function KpiCard({ id, persona, expanded, onToggle }: { id: KpiId; persona: "asm" | "head"; expanded: boolean; onToggle: () => void }) {
  const { meta } = useStatusMeta();
  const [hoverDim, setHoverDim] = useState<number | null>(null);
  const plan = persona === "asm" ? PLAN_MONTHS : HEAD_PLAN_MONTHS;
  const sep = plan.find((m) => m.month === "Sep")!;
  const t = TRACKER[persona];
  const w = weakest(persona);
  const inr = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 1 });
  const sub = "mt-1 truncate text-[11.5px] leading-[16px] text-cx-faint";

  const toggle = (
    <button onClick={onToggle} aria-expanded={expanded} className="inline-flex shrink-0 items-center gap-1 text-[12px] text-cx-muted hover:text-cx-text">
      {expanded ? (
        <>
          Close details <X className="h-3 w-3" />
        </>
      ) : (
        <>
          View details <ChevronRight className="h-3 w-3" />
        </>
      )}
    </button>
  );
  const head = (title: React.ReactNode) => (
    <div className="flex h-5 items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">{title}</div>
      {!expanded && toggle}
    </div>
  );
  const value = (left: React.ReactNode, right: React.ReactNode) => (
    <div className="mt-2 flex h-7 items-baseline justify-between gap-2">
      {left}
      {right}
    </div>
  );

  let body: React.ReactNode;
  if (id === "achieved" && persona === "head") {
    const months = plan.filter((m) => m.achievedL != null);
    const total = months.reduce((n, m) => n + (m.achievedL ?? 0), 0);
    // 20 stripes shared out across the months by what each contributed
    const alloc = months.map((m) => Math.max(1, Math.round(((m.achievedL ?? 0) / total) * 20)));
    while (alloc.reduce((a, b) => a + b, 0) > 20) alloc[alloc.indexOf(Math.max(...alloc))]--;
    const owner = alloc.flatMap((n, mi) => Array.from({ length: n }, () => mi));
    const fills = owner.map((mi) => `rgb(47 111 237 / ${0.42 + (0.58 * (mi + 1)) / months.length})`);
    body = (
      <>
        {head(
          <>
            <span className="truncate text-[12.5px] text-cx-muted">{FISCAL_YEAR.label}</span>
            <span className="rounded border border-cx-strong px-1.5 text-[10.5px] text-cx-text">All regions</span>
          </>
        )}
        {value(<span className="font-data text-[28px] leading-none text-cx-text">₹{inr(total)}L</span>, <span className="font-data text-[13px] leading-none text-cx-faint">{months.length} months</span>)}
        <p className={sub}>
          Cumulative across all {LBL.regions} · Apr–Sep · Sep ₹{inr(sep.achievedL!)}L so far
        </p>
        <div className="mt-auto">
          <KpiStripes fills={fills} tip={(i) => [`${months[owner[i]].month} · ₹${inr(months[owner[i]].achievedL!)}L achieved`, "Stripes shared out by each month's contribution"]} />
        </div>
      </>
    );
  } else if (id === "achieved") {
    const p = pct(sep)!;
    const projected = Number(sep.note.match(/~(\d+)%/)?.[1] ?? 0);
    const filled = Math.round(p / 5);
    const ramp = blueRamp(filled);
    body = (
      <>
        {head(
          <>
            <span className="truncate text-[12.5px] text-cx-muted">Achieved target · Sep 2026</span>
            <span className="rounded border border-cx-strong px-1.5 text-[10.5px] text-cx-text">This month</span>
          </>
        )}
        {value(<span className="font-data text-[28px] leading-none text-cx-text">₹{inr(sep.achievedL!)}L</span>, <span className="font-data text-[20px] leading-none text-cx-text">{p}%</span>)}
        <p className={sub}>of ₹{inr(sep.estimateL!)}L estimated · {LBL.daysLeft} · projected ~{projected}%</p>
        <div className="mt-auto">
          <KpiStripes
            fills={Array.from({ length: 20 }, (_, i) => (i < filled ? ramp(i) : null))}
            projected={Math.round(projected / 5) - 1}
            tip={(i) => [
              i === Math.round(projected / 5) - 1
                ? `Projected finish · ~${projected}% of estimate`
                : i < filled
                  ? `Achieved · ${i * 5}–${(i + 1) * 5}% of estimate`
                  : `Not yet reached · ${i * 5}–${(i + 1) * 5}%`,
              `Each stripe = 5% · dashed line = 100% of ₹${inr(sep.estimateL!)}L`,
            ]}
          />
        </div>
      </>
    );
  } else if (id === "actions") {
    const open = t.total - t.counts.done;
    const complete = Math.round((t.counts.done / t.total) * 100);
    const n = (v: number) => Math.round((v / t.total) * 20);
    const done = n(t.counts.done), prog = n(t.counts.progress), del = n(t.counts.delayed);
    const fills = Array.from({ length: 20 }, (_, i) =>
      i < done ? meta.done.color : i < done + prog ? meta.progress.color : i < done + prog + del ? meta.delayed.color : meta.unassigned.color
    );
    body = (
      <>
        {head(<span className="truncate text-[12.5px] text-cx-muted">Open action items · September</span>)}
        {value(<span className="font-data text-[28px] leading-none text-cx-text">{open}</span>, <span className="font-data text-[20px] leading-none text-cx-text">{complete}%</span>)}
        <p className={sub}>
          of {t.total} this month · {t.counts.progress} in progress · {t.counts.delayed} delayed · {t.counts.unassigned} no owner
        </p>
        <div className="mt-auto">
          <KpiStripes
            fills={fills}
            tip={(i) => {
              const [label, count] =
                i < done ? ["Completed", t.counts.done] : i < done + prog ? ["In progress", t.counts.progress] : i < done + prog + del ? ["Delayed", t.counts.delayed] : ["No owner", t.counts.unassigned];
              return [`${label} · ${count} of ${t.total} actions`, "Each stripe = 5% · dashed line = all of this month's actions"];
            }}
          />
        </div>
      </>
    );
  } else {
    const g = TERRITORY_HEALTH[persona];
    const row = g.rows.find((r) => r.name === w.name)!;
    const hc = hoverDim != null ? row.cells[hoverDim] : null;
    body = (
      <>
        {head(<span className="truncate text-[12.5px] text-cx-muted">Weakest {w.unit} · this month</span>)}
        {value(
          <span className="truncate text-[28px] font-medium leading-none tracking-tight text-cx-text">{w.name}</span>,
          <span className="shrink-0 font-data text-[12px] text-cx-faint">{w.critical} critical</span>
        )}
        <p className={sub}>
          {w.metric} <span className="text-cx-text">{w.cell.value}</span> · {w.cell.detail}
        </p>
        {/* one bar per health dimension; labels sit above so the bars align with the other cards' stripes */}
        <div className="relative mt-auto grid grid-cols-5 gap-1.5" onMouseLeave={() => setHoverDim(null)}>
          {row.cells.map((c, i) => (
            <button
              key={i}
              onMouseEnter={() => setHoverDim(i)}
              onFocus={() => setHoverDim(i)}
              onBlur={() => setHoverDim(null)}
              aria-label={`${g.columns[i]}: ${HEALTH_LEVELS[c.level].label}, ${c.value}. ${c.detail}`}
              className="flex flex-col items-stretch gap-1 text-left"
            >
              <span className={`truncate text-center text-[10px] leading-[12px] ${hoverDim === i ? "text-cx-text" : "text-cx-faint"}`}>{g.columns[i]}</span>
              <span
                className="flex h-[22px] items-center justify-center rounded-[3px] font-data text-[10.5px] transition-[box-shadow]"
                style={{
                  background: HEALTH_LEVELS[c.level].color,
                  color: c.level === 2 ? "rgb(var(--cx-muted))" : "rgba(255,255,255,0.92)",
                  boxShadow: hoverDim === i ? "0 0 0 2px rgb(var(--cx-text))" : undefined,
                }}
              >
                {c.value}
              </span>
            </button>
          ))}
          {hc && (
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full z-30 mb-2 whitespace-nowrap rounded-md border border-cx-strong bg-cx-raised px-2.5 py-1.5 text-[11.5px] shadow-xl"
              style={{ left: `${((hoverDim! + 0.5) / 5) * 100}%`, transform: `translateX(${hoverDim === 0 ? "-20%" : hoverDim === 4 ? "-80%" : "-50%"})` }}
            >
              <span className="block text-cx-text">
                {g.columns[hoverDim!]} · {HEALTH_LEVELS[hc.level].label}
              </span>
              <span className="block text-[10.5px] text-cx-faint">{hc.detail}</span>
            </span>
          )}
        </div>
      </>
    );
  }

  if (expanded && id === "achieved") body = null; // the monthly plans view carries its own heading

  return (
    <div
      id={id === "achieved" ? "plan-hero" : undefined}
      className={`flex min-w-0 flex-col overflow-visible px-5 py-4 ${expanded ? card : ""}`}
      style={expanded ? { minHeight: KPI_H * 2 + 1 } : { height: KPI_H }}
    >
      {body}
      {expanded && (
        <div className={`min-h-0 flex-1 ${id === "achieved" ? "" : "mt-3 border-t border-cx-line pt-3"}`}>
          <KpiDetails id={id} persona={persona} />
        </div>
      )}
      {expanded && <div className="mt-auto flex justify-end pt-3">{toggle}</div>}
    </div>
  );
}

/** Month-by-month breakdowns, compact enough to fit the expanded cell. */
function KpiDetails({ id, persona }: { id: KpiId; persona: "asm" | "head" }) {
  const { meta } = useStatusMeta();
  const cols = "grid grid-cols-6 gap-2";
  if (id === "achieved") return <MonthTimeline months={persona === "asm" ? PLAN_MONTHS : HEAD_PLAN_MONTHS} closedColor={STATUS_META_B.done.color} />;
  if (id === "actions") {
    const rows = ACTION_MONTHS[persona];
    const max = Math.max(...rows.map((r) => r.opened));
    return (
      <div className={cols}>
        {rows.map((r, i) => {
          const current = i === rows.length - 1;
          return (
            <div key={r.month} className={`min-w-0 rounded-md px-2 py-1.5 ${current ? "bg-cx-raised" : ""}`}>
              <div className="flex h-16 items-end justify-center">
                <div className="relative w-6 overflow-hidden rounded-sm" style={{ height: `${(r.opened / max) * 100}%`, boxShadow: "inset 0 0 0 1px rgb(var(--cx-strong))" }}>
                  <span className="absolute inset-x-0 bottom-0" style={{ height: `${(r.completed / r.opened) * 100}%`, background: meta.done.color }} />
                </div>
              </div>
              <p className="mt-1 text-center text-[11.5px] text-cx-text">
                {r.month}
                {current && <span className="text-[10px] text-cx-faint"> · now</span>}
              </p>
              <p className="text-center font-data text-[10px] text-cx-faint">
                {r.completed}/{r.opened} done · {r.opened - r.completed} open
              </p>
            </div>
          );
        })}
      </div>
    );
  }
  const rows = WEAKEST_BY_MONTH[persona];
  const tally = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.name]: (acc[r.name] ?? 0) + 1 }), {});
  const [top, times] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  return (
    <div>
      <p className="mb-2 text-[11.5px] text-cx-muted">
        <span className="text-cx-text">{top}</span> was weakest in {times} of the last {rows.length} months
      </p>
      <div className={cols}>
        {rows.map((r, i) => {
          const current = i === rows.length - 1;
          return (
            <div key={r.month} className={`min-w-0 rounded-md border px-2 py-2 ${current ? "border-[#2f6fed]/60 bg-[#2f6fed]/10" : "border-cx-line"}`}>
              <p className="font-data text-[10px] text-cx-faint">
                {r.month}
                {current && " · now"}
              </p>
              <p className={`mt-0.5 truncate text-[12.5px] ${r.name === top ? "font-medium text-cx-text" : "text-cx-muted"}`}>{r.name}</p>
              <p className="truncate text-[10.5px] text-cx-faint">{r.why}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** No card backdrop: three cells between hairlines, divided by single lines. */
function KpiCards({ persona }: { persona: "asm" | "head" }) {
  const [open, setOpen] = useState<KpiId | null>(null);
  const ids: KpiId[] = ["achieved", "actions", "weakest"];
  const frame = "";
  if (!open) {
    return (
      <section aria-label="Key metrics" className={`grid grid-cols-1 divide-y divide-cx-line md:grid-cols-3 md:divide-x md:divide-y-0 ${frame}`}>
        {ids.map((id) => (
          <KpiCard key={id} id={id} persona={persona} expanded={false} onToggle={() => setOpen(id)} />
        ))}
      </section>
    );
  }
  return (
    <section aria-label="Key metrics" className={`grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] ${frame}`}>
      <div className="flex flex-col divide-y divide-cx-line lg:border-r lg:border-cx-line">
        {ids
          .filter((id) => id !== open)
          .map((id) => (
            <KpiCard key={id} id={id} persona={persona} expanded={false} onToggle={() => setOpen(id)} />
          ))}
      </div>
      {/* the opened card shifts to the right and expands — to exactly the height of the two beside it */}
      <div key={open} className="cx-slide-in min-w-0 lg:pl-4">
        <KpiCard id={open} persona={persona} expanded onToggle={() => setOpen(null)} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Insights (prominent, right below the hero)
// ---------------------------------------------------------------------------

/** Suggested action on an insight: what Sales AI already did (outcome + ✓), or Agreed / Closed when handled. */
function InsightAction({ id, from = INSIGHT_ACTIONS, bare = false }: { id: string; from?: typeof INSIGHT_ACTIONS; bare?: boolean }) {
  const a = from[id];
  if (!a) return null;
  if ("closed" in a || "agreed" in a) {
    const agreed = "agreed" in a;
    return (
      <p className={`${bare ? "" : "mt-2.5"} flex h-8 items-center gap-2 rounded-md border border-cx-line px-2.5 text-[11.5px] text-cx-faint`}>
        <span
          className="shrink-0 rounded px-1.5 font-data text-[10px] uppercase tracking-[0.06em]"
          style={{ background: agreed ? `${STATUS_META.done.color}26` : "rgb(var(--cx-raised))", color: agreed ? STATUS_META.done.color : "rgb(var(--cx-muted))" }}
        >
          {agreed ? "Agreed" : "Closed"}
        </span>
        <span className="truncate">{(agreed ? a.agreed : a.closed).replace(/^(Agreed|Closed) · /, "")}</span>
      </p>
    );
  }
  // already done by Sales AI: reads as an outcome, with its own trace (see <SuggestedRow>)
  return (
    <div className={bare ? "" : "mt-2.5"}>
      <SuggestedOutcome label={a.label} trace={ACTION_TRACES[id]} />
    </div>
  );
}

/** Actions menu + the suggested action's outcome (its trace opens as a tooltip). */
function SuggestedRow({ id, from = INSIGHT_ACTIONS, rec, routeKey }: { id: string; from?: typeof INSIGHT_ACTIONS; rec?: Recommendation; routeKey: string }) {
  return (
    <div className="flex items-start gap-2">
      {rec && <ActionsDropdown routeKey={routeKey} rec={rec} />}
      <div className="min-w-0 flex-1">
        <InsightAction id={id} from={from} bare />
      </div>
    </div>
  );
}

function InsightsCard() {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [sheet, setSheet] = useState<string | null | false>(false);
  return (
    <section id="insights" className={`${card} flex h-full flex-col p-5`}>
      <CardHeader
        icon={<Sparkles className="h-4 w-4" />}
        title="Insights"
        badge={<AiTag />}
        right={
          <button onClick={() => setSheet(null)} className="inline-flex items-center gap-1 text-[12px] text-cx-muted hover:text-cx-text">
            View all <ChevronRight className="h-3 w-3" />
          </button>
        }
      />
      {/* two full lines, then "View more" */}
      <p className={`mt-3 text-[13.5px] leading-relaxed text-cx-text ${summaryOpen ? "" : "line-clamp-2"}`}>
        {INSIGHTS_SUMMARY.text}
      </p>
      <button onClick={() => setSummaryOpen((o) => !o)} className="mt-0.5 self-start text-[11.5px] text-cx-muted hover:text-cx-text">
        {summaryOpen ? "View less" : "View more"}
      </button>
      <ul className="mt-3">
        {INSIGHTS.slice(0, 3).map((ins) => (
          <li id={ins.id} key={ins.id} className="border-t border-cx-line py-4">
            <div className="flex items-start gap-2.5">
              <AgentIcon agent={ins.origin.agent} size="sm" />
              <div className="min-w-0 flex-1">
                {/* confidence sits at the far right of the title line; the title wraps cleanly beside it */}
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-snug text-cx-text [text-wrap:pretty]">{ins.headline}</p>
                  <span className="shrink-0">
                    <ConfidenceScore confidence={ins.confidence} align="right" />
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-cx-faint">
                  {AGENTS[ins.origin.agent].name} · {ins.origin.when} ·{" "}
                  <button onClick={() => setSheet(ins.id)} className="text-cx-muted underline-offset-2 hover:text-cx-text hover:underline">
                    View more
                  </button>
                </p>
                <div className="mt-2.5">
                  <SuggestedRow id={ins.id} rec={linkedRec(ins.id)} routeKey={`ins:${ins.id}`} />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {sheet !== false && <InsightsSheet focusId={sheet} onClose={() => setSheet(false)} renderAction={(id) => <SuggestedRow id={id} rec={linkedRec(id)} routeKey={`ins:${id}`} />} />}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Card 1 — Action Tracker (line treatment)
// ---------------------------------------------------------------------------

function TrendChart({ data, color = STATUS_META.done.color }: { data: { label: string; opened: number; completed: number }[]; color?: string }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const h = 140;
  const m = { l: 8, r: 8, t: 12, b: 22 };
  const iw = Math.max(0, w - m.l - m.r);
  const ih = h - m.t - m.b;
  const max = Math.max(...data.map((d) => d.opened)) * 1.1;
  const X = (i: number) => m.l + (i / (data.length - 1)) * iw;
  const Y = (v: number) => m.t + ih - (v / max) * ih;
  const line = (k: "opened" | "completed") => data.map((d, i) => `${i ? "L" : "M"}${X(i)},${Y(d[k])}`).join(" ");
  const green = color;
  const gid = `cx-done-${color.slice(1)}`;

  return (
    <div ref={ref} className="relative w-full">
      {w > 0 && (
        <svg
          width={w}
          height={h}
          role="img"
          aria-label="Cumulative actions opened and completed this month"
          onMouseMove={(e) => {
            const i = Math.round(((e.clientX - e.currentTarget.getBoundingClientRect().left - m.l) / iw) * (data.length - 1));
            setHi(i >= 0 && i < data.length ? i : null);
          }}
          onMouseLeave={() => setHi(null)}
        >
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={green} stopOpacity={0.28} />
              <stop offset="1" stopColor={green} stopOpacity={0} />
            </linearGradient>
          </defs>
          {[0.5, 1].map((f) => (
            <line key={f} x1={m.l} x2={w - m.r} y1={Y(max * f / 1.1)} y2={Y(max * f / 1.1)} style={{ stroke: "rgb(var(--cx-line))" }} />
          ))}
          <path d={`${line("completed")} L${X(data.length - 1)},${Y(0)} L${X(0)},${Y(0)} Z`} fill={`url(#${gid})`} />
          <path d={line("opened")} fill="none" style={{ stroke: "rgb(var(--cx-muted))" }} strokeWidth={1.5} strokeDasharray="4 4" />
          <path d={line("completed")} fill="none" stroke={green} strokeWidth={2} />
          {data.map((d, i) => (
            <text key={d.label} x={X(i)} y={h - 5} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} fontSize={10} style={{ fill: hi === i ? "rgb(var(--cx-text))" : "rgb(var(--cx-faint))" }} fontFamily="var(--font-plex-mono)">
              {d.label}
            </text>
          ))}
          {hi != null && (
            <>
              <line x1={X(hi)} x2={X(hi)} y1={m.t} y2={m.t + ih} style={{ stroke: "rgb(var(--cx-strong))" }} strokeDasharray="2 3" />
              <circle cx={X(hi)} cy={Y(data[hi].opened)} r={3.5} style={{ fill: "rgb(var(--cx-panel))", stroke: "rgb(var(--cx-muted))" }} strokeWidth={1.5} />
              <circle cx={X(hi)} cy={Y(data[hi].completed)} r={3.5} fill={green} style={{ stroke: "rgb(var(--cx-panel))" }} strokeWidth={1.5} />
            </>
          )}
        </svg>
      )}
      {hi != null && (
        <div className="pointer-events-none absolute top-0 z-10 space-y-0.5" style={{ left: Math.min(X(hi) + 8, w - 120) }}>
          <p className="rounded border border-cx-strong bg-cx-raised px-1.5 py-0.5 font-data text-[10.5px] text-cx-muted">
            <span className="mr-1 inline-block h-2 w-0.5 bg-cx-muted align-middle" />
            {data[hi].opened} opened
          </p>
          <p className="rounded border border-cx-strong bg-cx-raised px-1.5 py-0.5 font-data text-[10.5px] text-cx-text">
            <span className="mr-1 inline-block h-2 w-0.5 align-middle" style={{ background: green }} />
            {data[hi].completed} completed
          </p>
        </div>
      )}
    </div>
  );
}

function agoLabel(h: number) {
  if (h < 1) return "just now";
  if (h < 24) return `${Math.round(h)}h ago`;
  if (h < 48) return "yesterday";
  return `${Math.round(h / 24)}d ago`;
}

type ActionGroup = "mine" | "owner" | "suggested";

/** My-actions state, shared by the filter pills (beside the tabs) and the list beneath. */
function useMyActions() {
  const { routes } = useHome();
  const [group, setGroup] = useState<ActionGroup>("suggested");
  const [assigned, setAssigned] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState<Record<string, string>>({}); // suggestion id → assignee
  const [dismissed, setDismissed] = useState<string[]>([]);

  const mine = ACTION_ITEMS.filter((a) => a.owner === LBL.asmName && a.status !== "unassigned").sort((a, b) => a.hoursAgo - b.hoursAgo);
  const routedIn = RECOMMENDATIONS.filter((r) => routes[r.id]?.includes("tracker")).map((r) => ({
    id: `new-${r.id}`,
    title: r.title,
    territory: r.territory,
    source: "thermometer" as AgentId,
    hoursAgo: 0,
  }));
  const needOwner = [...routedIn, ...ACTION_ITEMS.filter((a) => a.owner === LBL.asmName && a.status === "unassigned")].filter((a) => !assigned[a.id]);
  const suggested = SUGGESTED_ACTIONS.filter((x) => !dismissed.includes(x.id));
  const counts: Record<ActionGroup, number> = {
    mine: mine.length + Object.values(adding).filter((w) => w === "Me").length,
    owner: needOwner.length,
    suggested: suggested.length - Object.keys(adding).length,
  };
  return { group, setGroup, mine, needOwner, suggested, counts, assigned, setAssigned, adding, setAdding, setDismissed };
}
type MyActions = ReturnType<typeof useMyActions>;

function MyActionPills({ m }: { m: MyActions }) {
  const brand = useBrand();
  const pills: { id: ActionGroup; label: string }[] = [
    { id: "mine", label: "My actions" },
    { id: "owner", label: "Needs an owner" },
    { id: "suggested", label: `Suggested by ${brand}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter actions">
      {pills.map((p) => {
        const on = m.group === p.id;
        return (
          <button
            key={p.id}
            onClick={() => m.setGroup(p.id)}
            aria-pressed={on}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] ${
              on ? "border-[#2f6fed]/60 bg-[#2f6fed]/15 text-cx-text" : "border-cx-line text-cx-muted hover:text-cx-text"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

function MyActionsList({ m }: { m: MyActions }) {
  const { toast } = useHome();
  // on narrow screens the controls wrap under the title instead of squeezing it
  const row = "flex flex-wrap items-start gap-x-3 gap-y-2 border-b border-cx-line py-3 last:border-0 [&>span:nth-child(2)]:basis-[200px]";
  const people = ["Me", ...OFFICERS.map((o) => o.name)];

  return (
    <div className="mt-4">
      <ul>
        {m.group === "mine" &&
          m.mine.slice(0, 6).map((a) => (
            <li id={a.id} key={a.id} className={row}>
              <AgentIcon agent={a.source} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-cx-text" title={a.title}>
                  {a.title}
                </span>
                <span className="block text-[11px] text-cx-faint">
                  {a.territory} · {agoLabel(a.hoursAgo)}
                </span>
              </span>
              <StatusBadge status={a.status} />
            </li>
          ))}

        {m.group === "owner" && m.needOwner.length === 0 && <li className="py-4 text-[12px] text-cx-faint">Everything has an owner.</li>}
        {m.group === "owner" &&
          m.needOwner.slice(0, 6).map((a) => (
            <li id={a.id} key={a.id} className={row}>
              <AgentIcon agent={a.source} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-cx-text" title={a.title}>
                  {a.title}
                </span>
                <span className="block text-[11px] text-cx-faint">
                  {a.territory} · no owner yet · {agoLabel(a.hoursAgo)}
                </span>
              </span>
              <Dropdown
                label="Assign"
                placeholder="to…"
                allOption={false}
                value={null}
                options={OFFICERS.map((o) => o.name)}
                onChange={(v) => {
                  if (!v) return;
                  m.setAssigned((x) => ({ ...x, [a.id]: v }));
                  toast(`Assigned to ${v}. It appears in their SFA app.`);
                }}
              />
            </li>
          ))}

        {m.group === "suggested" &&
          m.suggested.slice(0, 6).map((x) => {
            const who = m.adding[x.id];
            return (
              <li key={x.id} className={row}>
                <AgentIcon agent={x.source} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] leading-snug text-cx-text">{x.title}</span>
                  <span className="mt-0.5 block text-[11px] text-cx-faint">
                    {x.territory} · {x.why}
                  </span>
                  {who && (
                    <span className="mt-2 block">
                      <AgentRunChip run={{ ...x.run, result: `Assigned to ${who === "Me" ? "you" : who} and added to Tracker`, link: "View in Tracker" }} />
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {!who && (
                    <>
                      <button
                        onClick={() => m.setDismissed((d) => [...d, x.id])}
                        className="rounded-md p-1 text-cx-faint hover:bg-cx-hover hover:text-cx-muted"
                        aria-label="Dismiss suggestion"
                        title="Dismiss"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      {/* assigning is part of the same action, not a separate step */}
                      <Dropdown label="Assign & Add to Tracker" placeholder="" allOption={false} value={null} options={people} onChange={(v) => v && m.setAdding((a) => ({ ...a, [x.id]: v }))} />
                    </>
                  )}
                  <ConfidenceScore confidence={x.confidence} align="right" />
                </span>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

function TrackerCard({ role }: { role: "asm" | "head" }) {
  const { toast } = useHome();
  const { meta } = useStatusMeta();
  // My actions is the first, default tab (opening on "Suggested by Sales AI")
  const [scope, setScope] = useState<"team" | "mine">("mine");
  const [officer, setOfficer] = useState<string | null>(null);
  const my = useMyActions();
  const mineView = role === "asm" && scope === "mine";

  // --- counts for the current scope
  let c: { total: number; done: number; progress: number; delayed: number; label: string };
  if (role === "head") {
    const t = TRACKER.head;
    c = { total: t.total, done: t.counts.done, progress: t.counts.progress, delayed: t.counts.delayed, label: t.scopeLabel };
  } else if (mineView) {
    const t = TRACKER.asm;
    c = { total: t.total, done: t.counts.done, progress: t.counts.progress, delayed: t.counts.delayed, label: "My actions · September" };
  } else {
    const share = officer ? OFFICERS.find((o) => o.name === officer)!.share / TEAM_TRACKER.total : 1;
    c = {
      total: Math.round(TEAM_TRACKER.total * share),
      done: Math.round(TEAM_TRACKER.counts.done * share),
      progress: Math.round(TEAM_TRACKER.counts.progress * share),
      delayed: Math.round(TEAM_TRACKER.counts.delayed * share),
      label: officer ? `${officer} · ${OFFICERS.find((o) => o.name === officer)!.territories} · September` : `All ${OFFICERS.length} sales officers · September`,
    };
  }
  const open = c.total - c.done;

  // --- team trend (team / head only)
  const baseTrend = role === "head" ? TRACKER_TREND.head : TRACKER_TREND.asm;
  const end = baseTrend[baseTrend.length - 1].opened;
  const trend = baseTrend.map((d) => ({ ...d, opened: Math.round((d.opened * c.total) / end), completed: Math.round((d.completed * c.total) / end) }));

  // --- top team actions: highest priority first (delayed, then in progress), most recent within each
  const rank: Record<ActionStatus, number> = { delayed: 0, unassigned: 1, progress: 2, done: 3 };
  const top =
    role === "head"
      ? TRACKER.head.attention.map((a, i) => ({ id: a.id, title: `${a.action} — ${a.detail}`, territory: a.where, owner: "", status: a.status, source: a.source, hoursAgo: i * 6 + 2 }))
      : ACTION_ITEMS.filter((a) => a.owner !== LBL.asmName && (!officer || a.owner === officer)).sort((a, b) => rank[a.status] - rank[b.status] || a.hoursAgo - b.hoursAgo);

  const stat = (label: string, n: number, color?: string) => (
    <span className="inline-flex items-center gap-1.5">
      {color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
      {label} <span className="font-data text-cx-text">{n}</span>
    </span>
  );

  return (
    <section id="tracker-panel" className={`${card} h-full p-5`}>
      <CardHeader
        icon={<ListChecks className="h-4 w-4" />}
        title="Action Tracker"
        badge={<AiTag />}
        right={
          <button onClick={() => toast("Opens the full Action Tracker.")} className="inline-flex items-center gap-1 text-[12px] text-cx-muted hover:text-cx-text">
            View all <ChevronRight className="h-3 w-3" />
          </button>
        }
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {role === "asm" && (
          <>
            <div className="flex h-8 items-center rounded-lg border border-cx-line bg-cx-panel p-0.5 text-[12px]" role="group" aria-label="Whose actions">
              {(["mine", "team"] as const).map((k) => (
                <button
                  key={k}
                  aria-pressed={scope === k}
                  onClick={() => {
                    setScope(k);
                    if (k === "mine") setOfficer(null);
                  }}
                  className={`h-full rounded-md px-2.5 ${scope === k ? "bg-cx-hover text-cx-text" : "text-cx-faint hover:text-cx-muted"}`}
                >
                  {k === "mine" ? "My actions" : "Team actions"}
                </button>
              ))}
            </div>
            {scope === "team" && <Dropdown label="Officer" value={officer} options={OFFICERS.map((o) => o.name)} onChange={setOfficer} />}
            {mineView && <MyActionPills m={my} />}
          </>
        )}
        {!mineView && <span className="text-[11.5px] text-cx-faint">{c.label}</span>}
      </div>

      {/* the same counts on both tabs */}
      <div className="mt-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <p className="flex items-baseline gap-2">
          <span className="font-data text-[36px] leading-none text-cx-text">{c.total}</span>
          <span className="text-[12px] text-cx-muted">actions</span>
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-cx-faint">
          {stat("Open", open)}
          {stat("Completed", c.done, meta.done.color)}
          {stat("In progress", c.progress, meta.progress.color)}
          {stat("Delayed", c.delayed, meta.delayed.color)}
        </p>
      </div>

      {mineView ? (
        <MyActionsList m={my} />
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-cx-faint">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px] border border-dashed border-cx-muted" /> Opened
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: meta.done.color }} /> Completed
            </span>
          </div>
          <div className="mt-2">
            <TrendChart data={trend} color={meta.done.color} />
          </div>
          <div className="mt-5 border-t border-cx-line pt-4">
            <div className="flex items-baseline justify-between">
              <Eyebrow>Top actions · {role === "head" ? "across the org" : officer ?? "the team"}</Eyebrow>
              <span className="font-data text-[10.5px] text-cx-faint">delayed first</span>
            </div>
            <ul className="mt-1">
              {top.slice(0, 5).map((a) => (
                <li id={a.id} key={a.id} className="flex items-start gap-3 border-b border-cx-line py-2.5 last:border-0">
                  <AgentIcon agent={a.source} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-cx-text" title={a.title}>
                      {a.title}
                    </span>
                    <span className="block text-[11px] text-cx-faint">
                      {a.territory}
                      {a.owner && ` · ${a.owner}`} · {agoLabel(a.hoursAgo)}
                    </span>
                  </span>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}

function SinceMorningCard() {
  const { toast } = useHome();
  const rows = FINDINGS.filter((f) => f.when.startsWith("Today")).sort((a, b) => b.when.localeCompare(a.when));
  return (
    <section id="findings" className={`${card} h-full p-5`}>
      <CardHeader
        icon={<MessageSquareQuote className="h-4 w-4" />}
        title="Since this morning"
        badge={<AiTag />}
        right={<span className="font-data text-[11px] text-cx-faint">{rows.length} from Huddle</span>}
      />
      <ul className="mt-3">
        {rows.map((f) => (
          <li id={f.id} key={f.id} className="group/f border-t border-cx-line py-4 first:border-t-0">
            <div className="flex items-start gap-2.5">
              <AgentIcon agent="huddle" size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <span className="truncate pt-0.5 text-[12.5px] font-medium text-cx-text">{f.theme}</span>
                  <span className="shrink-0">
                    <ConfidenceScore confidence={f.confidence} align="right" />
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-cx-muted">“{f.quote}”</p>
                <button onClick={() => toast(`Opens the ${f.session.toLowerCase()} transcript at ${f.at}.`)} className="mt-2 block max-w-full truncate text-left text-[11px] text-cx-faint hover:text-cx-text">
                  {f.speaker} · {f.session} · {f.when.replace("Today, ", "")} · at {f.at}
                </button>
                {/* Actions (same mechanic as Thermometer) beside the Suggested action */}
                <div className="mt-3">
                  <SuggestedRow id={f.id} from={FINDING_ACTIONS} rec={linkedRec(f.insight)} routeKey={`find:${f.id}`} />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// + Add widget
// ---------------------------------------------------------------------------

const PinnedCtx = React.createContext<{ pinned: string[]; setPinned: React.Dispatch<React.SetStateAction<string[]>> }>({ pinned: [], setPinned: () => {} });

/** mode "button": the + Add widget control (top bar) · mode "cards": the pinned widgets in the page */
function AddWidget({ mode }: { mode: "button" | "cards" }) {
  const [open, setOpen] = useState(false);
  const { pinned, setPinned } = React.useContext(PinnedCtx);
  const ref = useOutside<HTMLDivElement>(open, () => setOpen(false));
  const available = WIDGET_OPTIONS.filter((w) => !pinned.includes(w.id));

  return (
    <>
      {mode === "button" && (
      <div className="flex justify-end">
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            disabled={!available.length}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-cx-line bg-cx-panel px-3 text-[12.5px] text-cx-muted hover:border-cx-strong hover:text-cx-text disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" /> Add widget
          </button>
          {open && (
            <div className="absolute right-0 top-full z-40 mt-2 w-[min(520px,calc(100vw-32px))] rounded-lg border border-cx-strong bg-cx-raised p-2 shadow-2xl">
              <p className="px-2 pb-2 pt-1 text-[11px] text-cx-faint">Pin a widget to Home</p>
              <div className="grid gap-1 sm:grid-cols-2">
                {available.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      setPinned((p) => [...p, w.id]);
                      setOpen(false);
                    }}
                    className="flex items-start gap-2.5 rounded-md p-2 text-left hover:bg-cx-hover"
                  >
                    <AgentIcon agent={w.agent} size="sm" />
                    <span>
                      <span className="block text-[12.5px] text-cx-text">{w.title}</span>
                      <span className="block text-[11px] text-cx-faint">{w.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      )}
      {mode === "cards" && pinned.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {pinned.map((id) => {
            const w = WIDGET_OPTIONS.find((x) => x.id === id)!;
            return (
              <div key={id} className={`${card} p-5`}>
                <div className="flex items-start justify-between">
                  <AgentIcon agent={w.agent} />
                  <button onClick={() => setPinned((p) => p.filter((x) => x !== id))} className="rounded p-1 text-cx-faint hover:text-cx-text" aria-label={`Remove ${w.title}`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-3 text-[13.5px] text-cx-text">{w.title}</p>
                <p className="text-[12px] text-cx-faint">{w.description}</p>
                <div className="mt-3 h-12 rounded-md border border-dashed border-cx-strong" />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Thermometer recommendations — three destinations, any combination.
// ---------------------------------------------------------------------------

const ROUTE_META: Record<RecRoute, { color: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; idle: (r: Recommendation) => string; done: (r: Recommendation) => string }> = {
  tracker: { color: STATUS_META.done.color, icon: ListChecks, idle: () => "Send to Tracker", done: () => "In Tracker" },
  map: { color: PRIMARY_BLUE_SOFT, icon: CornerUpRight, idle: () => "Escalate to Market Action Plan", done: () => "In October plan (suggested)" },
  pitch: { color: AGENTS.pitch.color, icon: MessageSquareQuote, idle: (r) => `Send to Pitch · ${r.pitchFor}`, done: (r) => `Prioritised for ${r.pitchFor}` },
};

function RouteButtons({
  r,
  role,
  compact = false,
  routeKey,
  onRouted,
}: {
  r: Recommendation;
  role: "asm" | "head";
  compact?: boolean;
  routeKey?: string;
  onRouted?: (k: RecRoute) => void;
}) {
  const { routes, toggleRoute, toast } = useHome();
  const key = routeKey ?? r.id;
  const active = role === "head" ? HEAD_REC_ROUTES[r.id] ?? [] : routes[key] ?? [];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(Object.keys(ROUTE_META) as RecRoute[]).map((k) => {
        const m = ROUTE_META[k];
        const on = active.includes(k);
        const Icon = on ? Check : m.icon;
        if (role === "head") {
          return (
            <span
              key={k}
              className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] ${on ? "text-cx-text" : "border-cx-line text-cx-faint opacity-60"}`}
              style={on ? { borderColor: `${m.color}80`, background: `${m.color}14` } : undefined}
            >
              <Icon className="h-3.5 w-3.5" style={{ color: on ? m.color : undefined }} />
              {on ? m.done(r) : m.idle(r).split(" · ")[0]}
            </span>
          );
        }
        return (
          <button
            key={k}
            aria-pressed={on}
            onClick={() => {
              toggleRoute(key, k);
              if (!on && onRouted) onRouted(k);
              else toast(on ? `#${r.n} removed from ${k === "map" ? "the October plan" : k === "pitch" ? "Pitch" : "Tracker"}.` : `#${r.n}: ${m.done(r)}.`);
            }}
            title={k === "pitch" ? `Prioritise for ${r.pitchFor}` : undefined}
            className={`inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border px-2.5 text-[12px] transition-colors ${
              on ? "text-cx-text" : "border-cx-strong bg-cx-raised text-cx-text hover:border-cx-faint hover:bg-cx-hover"
            }`}
            style={on ? { borderColor: `${m.color}99`, background: `${m.color}1f` } : undefined}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: m.color }} />
            <span className="truncate">{on ? (compact ? m.done(r).replace(/^Prioritised for .*/, "In Pitch") : m.done(r)) : compact ? m.idle(r).split(" · ")[0] : m.idle(r)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** What each destination's agent does, shown as it works. */
function routeRun(r: Recommendation, k: RecRoute): AgentRun {
  if (k === "tracker") return { agent: "thermometer", steps: ["creating the action", "suggesting an owner"], result: `Added to Tracker — ${r.territory} queue`, link: "View in Tracker" };
  if (k === "map") return { agent: "map", steps: ["opening the October draft", "adding a suggested initiative"], result: "Added to the October plan as a suggested initiative", link: "View plan" };
  return { agent: "pitch", steps: ["updating priorities", "plan modified"], result: `Updated pitch priorities for ${r.pitchFor} — ${4 + r.n * 2} outlets affected`, link: "View pitch" };
}

/** The recommendation a finding or insight points at (for the Pitch target). */
function linkedRec(target: string): Recommendation | undefined {
  const direct = RECOMMENDATIONS.find((r) => r.id === target);
  if (direct) return direct;
  const ins = INSIGHTS.find((i) => i.id === target);
  const recId = ins?.connects.find((c) => c.target.startsWith("rec-"))?.target;
  return RECOMMENDATIONS.find((r) => r.id === recId);
}

/** One "Actions" mechanic, shared with Thermometer: Send to Tracker · Escalate to Market Action Plan · Send to Pitch. */
function ActionsDropdown({ routeKey, rec }: { routeKey: string; rec: Recommendation }) {
  const { routes, toggleRoute, toast } = useHome();
  const [open, setOpen] = useState(false);
  const [run, setRun] = useState<{ run: AgentRun; key: number } | null>(null);
  const ref = useOutside<HTMLDivElement>(open, () => setOpen(false));
  const active = routes[routeKey] ?? [];
  return (
    <div className="flex flex-col gap-2">
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="menu"
          className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12px] ${open ? "border-cx-strong bg-cx-hover text-cx-text" : "border-cx-line text-cx-muted hover:text-cx-text"}`}
        >
          <MoreHorizontal className="h-3.5 w-3.5" /> Actions
          {active.length > 0 && <span className="font-data text-[10.5px] text-cx-faint">· {active.length}</span>}
          <ChevronDown className="h-3 w-3" />
        </button>
        {open && (
          <div role="menu" className="absolute left-0 top-full z-40 mt-1 w-[270px] rounded-lg border border-cx-strong bg-cx-raised p-1 shadow-2xl">
            {(Object.keys(ROUTE_META) as RecRoute[]).map((k) => {
              const m = ROUTE_META[k];
              const on = active.includes(k);
              const Icon = on ? Check : m.icon;
              return (
                <button
                  key={k}
                  role="menuitemcheckbox"
                  aria-checked={on}
                  onClick={() => {
                    toggleRoute(routeKey, k);
                    setOpen(false);
                    if (on) toast(`Removed from ${k === "map" ? "the October plan" : k === "pitch" ? "Pitch" : "Tracker"}.`);
                    else setRun({ run: routeRun(rec, k), key: Date.now() });
                  }}
                  className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-cx-hover"
                >
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: m.color }} />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] text-cx-text">{on ? m.done(rec) : m.idle(rec).split(" · ")[0]}</span>
                    {k === "pitch" && <span className="block truncate text-[11px] text-cx-faint">for {rec.pitchFor}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {run && <AgentRunChip key={run.key} run={run.run} />}
    </div>
  );
}

const B_RANGES = [
  { id: "today", label: "Today", maxHours: 24 },
  { id: "week", label: "This week", maxHours: 24 * 7 },
  { id: "month", label: "This month", maxHours: 24 * 31 },
] as const;
const B_LEVERS: SignalType[] = ["Collection", "Stock", "Pricing", "Revenue"];

const REC_FILTERS = [
  { key: "product", label: "Product" },
  { key: "sector", label: "Business sector" },
  { key: "segment", label: "Business segment" },
  { key: "territory", label: "Territory" },
] as const;
type RecFilterKey = (typeof REC_FILTERS)[number]["key"];

function ThermoBox({ role }: { role: "asm" | "head" }) {
  const { routes, decisions, decide, toggleRoute } = useHome();
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<RecFilterKey, string | null>>({ product: null, sector: null, segment: null, territory: null });
  const [range, setRange] = useState<(typeof B_RANGES)[number]["id"]>("week");
  const [lever, setLever] = useState<SignalType | null>(null);
  const [runs, setRuns] = useState<Record<string, { run: AgentRun; key: number }>>({});
  const maxHours = B_RANGES.find((x) => x.id === range)!.maxHours;
  const filtered = RECOMMENDATIONS.filter(
    (r) => r.raisedHoursAgo <= maxHours && (!lever || r.signal === lever) && REC_FILTERS.every(({ key }) => !filters[key] || r[key] === filters[key])
  );
  // Sales head: decisions that need Anil come first.
  const rows = role === "head" ? [...filtered].sort((a, b) => Number(!!HEAD_PENDING[b.id]) - Number(!!HEAD_PENDING[a.id])) : filtered;
  const anyFilter = Object.values(filters).some(Boolean);
  const th = "px-3 py-2.5 text-left text-[11px] font-normal text-cx-faint";

  return (
    <section id="thermo-panel" className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <AgentIcon agent="thermometer" />
          <h2 className="text-[15px] font-medium text-cx-text">{role === "asm" ? "Thermometer recommendations" : "Thermometer · my team"}</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11.5px] text-cx-faint" title={TERRITORIES.join(", ")}>
            {TERRITORIES.length} territories · today
          </span>
          <AiMeta confidence={THERMO_SET_CONFIDENCE} align="right" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-cx-line px-5 py-3">
        <div className="flex h-8 items-center rounded-lg border border-cx-line bg-cx-panel p-0.5 text-[12px]" role="group" aria-label="Time range">
          {B_RANGES.map((x) => (
            <button
              key={x.id}
              aria-pressed={range === x.id}
              onClick={() => setRange(x.id)}
              className={`h-full rounded-md px-2.5 ${range === x.id ? "bg-cx-hover text-cx-text" : "text-cx-faint hover:text-cx-muted"}`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <span className="flex flex-wrap items-center gap-1" role="group" aria-label="Lever">
          <span className="ml-1 mr-0.5 text-[11.5px] text-cx-faint">Lever</span>
          {[null, ...B_LEVERS].map((l) => (
            <button
              key={l ?? "all"}
              onClick={() => setLever(l)}
              aria-pressed={lever === l}
              className={`h-8 rounded-lg border px-2.5 text-[12px] ${lever === l ? "border-cx-strong bg-cx-hover text-cx-text" : "border-cx-line text-cx-muted hover:text-cx-text"}`}
            >
              {l ?? "All"}
            </button>
          ))}
        </span>
        <span className="mx-1 h-5 w-px bg-cx-line" aria-hidden />
        {REC_FILTERS.map(({ key, label }) => (
          <Dropdown
            key={key}
            label={label}
            value={filters[key]}
            options={key === "territory" ? TERRITORIES : Array.from(new Set(RECOMMENDATIONS.map((r) => r[key])))}
            onChange={(v) => setFilters((f) => ({ ...f, [key]: v }))}
          />
        ))}
        <span className="ml-auto flex items-center gap-3 text-[11.5px] text-cx-faint">
          Covers {TERRITORIES.join(", ")}
          {anyFilter && (
            <>
              <span className="text-cx-muted">
                · {rows.length} of {RECOMMENDATIONS.length}
              </span>
              <button onClick={() => setFilters({ product: null, sector: null, segment: null, territory: null })} className="text-cx-muted hover:text-cx-text">
                Clear
              </button>
            </>
          )}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border-t border-cx-line">
          <thead>
            <tr className="border-b border-cx-line">
              <th className={`${th} w-12 pl-5`}>#</th>
              <th className={`${th} w-[170px]`}>Territory / category</th>
              <th className={th}>Recommendation</th>
              <th className={`${th} w-[190px]`}>Confidence</th>
              <th className={`${th} w-[520px] pr-5`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[12.5px] text-cx-faint">
                  Nothing matches for {B_RANGES.find((x) => x.id === range)!.label.toLowerCase()}
                  {lever ? ` on ${lever}` : ""}.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const dismissed = role === "asm" && decisions[r.id] === "dismissed";
              const pending = role === "head" ? HEAD_PENDING[r.id] : undefined;
              const rkey = pending ? `head:${r.id}` : r.id;
              const active = role === "head" && !pending ? HEAD_REC_ROUTES[r.id] ?? [] : routes[rkey] ?? [];
              const reveal = openRow === r.id;
              // the route Sales AI already took (ASM view): shown as an outcome, with its own trace
              const sug = role === "asm" ? REC_SUGGESTED[r.id] : undefined;
              const sugDone = !!sug && active.includes(sug);
              return (
                <React.Fragment key={r.id}>
                <tr id={r.id} className={`group border-b border-cx-line align-top last:border-0 hover:bg-cx-hover/40 ${dismissed ? "opacity-50" : ""}`}>
                  <td className="py-4 pl-5 pr-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded border border-ai/30 font-data text-[10.5px] text-ai">{r.n}</span>
                  </td>
                  <td className="px-3 py-4">
                    <p className="text-[13px] text-cx-text">{r.territory}</p>
                    <p className="text-[11.5px] text-cx-faint">{r.signal}</p>
                    <p className="mt-1 font-data text-[11px] text-cx-muted">{r.impactLabel}</p>
                    <p className="mt-0.5 text-[10.5px] text-cx-faint">{r.product}</p>
                  </td>
                  <td className="px-3 py-4">
                    {pending && (
                      <p className="mb-1.5 inline-flex items-center gap-1.5 rounded border border-cx-text/60 px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-cx-text">
                        <span className="h-1.5 w-1.5 rounded-full bg-cx-text" /> {active.length ? "Decided by you" : "Needs your decision"}
                      </p>
                    )}
                    <p className="text-[13.5px] leading-snug text-cx-text">{r.title}</p>
                    <p className="mt-0.5 text-[12px] text-cx-faint">{pending ? `${pending}. ` : ""}{r.why}</p>
                  </td>
                  <td className="px-3 py-4">
                    <ConfidenceScore confidence={r.confidence} />
                  </td>
                  <td className="py-4 pl-3 pr-5">
                    {dismissed ? (
                      <span className="flex items-center gap-3 text-[12px] text-cx-faint">
                        Dismissed
                        <button onClick={() => decide(r.id, null)} className="inline-flex items-center gap-1 hover:text-cx-text">
                          <Undo2 className="h-3 w-3" /> Undo
                        </button>
                      </span>
                    ) : role === "head" && !pending ? (
                      <RouteButtons r={r} role="head" />
                    ) : (
                      <>
                        {sug && (
                          <div className="mb-2 max-w-[360px]">
                            <SuggestedOutcome
                              label={ROUTE_DONE_LABEL[sug]}
                              trace={ACTION_TRACES[r.id]}
                              removed={!sugDone}
                              onRestore={() => toggleRoute(rkey, sug)}
                            />
                          </div>
                        )}
                        <div className={`${reveal ? "hidden" : "flex"} flex-wrap items-center gap-1.5 group-hover:hidden`}>
                          {pending && !active.length ? (
                            <button
                              onClick={() => setOpenRow(r.id)}
                              className="inline-flex h-7 items-center gap-1.5 rounded-md bg-cx-text px-3 text-[12px] font-medium text-cx-bg hover:opacity-90"
                            >
                              Take action <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setOpenRow(r.id)}
                              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-cx-line px-2.5 text-[12px] text-cx-muted hover:text-cx-text"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" /> Actions
                            </button>
                          )}
                          {active.filter((k) => k !== sug).map((k) => (
                            <span key={k} className="inline-flex h-6 items-center gap-1 rounded border px-1.5 text-[11px] text-cx-muted" style={{ borderColor: `${ROUTE_META[k].color}66` }}>
                              <Check className="h-3 w-3" style={{ color: ROUTE_META[k].color }} /> {k === "map" ? "Plan" : k === "pitch" ? "Pitch" : "Tracker"}
                            </span>
                          ))}
                        </div>
                        <div className={`${reveal ? "flex" : "hidden"} flex-nowrap items-center gap-1.5 whitespace-nowrap group-hover:flex [&>div]:flex-nowrap`}>
                          <RouteButtons r={r} role="asm" compact routeKey={rkey} onRouted={(k) => setRuns((m) => ({ ...m, [r.id]: { run: routeRun(r, k), key: Date.now() } }))} />
                          {!active.length && !pending && (
                            <button onClick={() => decide(r.id, "dismissed")} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-cx-faint hover:bg-cx-hover hover:text-cx-muted" aria-label="Dismiss" title="Dismiss">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                    {runs[r.id] && (
                      <div className="mt-2">
                        <AgentRunChip key={runs[r.id].key} run={runs[r.id].run} />
                      </div>
                    )}
                  </td>
                </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sales executive — not their tool
// ---------------------------------------------------------------------------

function ExecNote({ onBack }: { onBack: () => void }) {
  const v = VIEWER.exec;
  return (
    <section className="flex justify-center px-4 pb-24 pt-10 sm:px-6 sm:pt-20">
      <div className={`${card} w-full max-w-lg p-6 text-center`}>
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-cx-strong bg-cx-raised text-cx-text">
          <Smartphone className="h-5 w-5" />
        </span>
        <h1 className="mt-5 text-[22px] font-medium tracking-tight text-cx-text">{v.name.split(" ")[0]}, Sales AI comes to you in your SFA app</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-cx-muted">
          Sales executives don&apos;t have a separate Sales AI screen. Sales AI adds two things to the SFA app you already use on your beat:
        </p>
        <ul className="mx-auto mt-4 max-w-sm space-y-2 text-left">
          <li className="flex gap-2.5 rounded-md border border-cx-line bg-cx-raised p-2.5 text-[12.5px] text-cx-muted">
            <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-cx-text" />
            <span>
              <span className="text-cx-text">Your actions</span> — what your ASM assigned you, with due dates.
            </span>
          </li>
          <li className="flex gap-2.5 rounded-md border border-cx-line bg-cx-raised p-2.5 text-[12.5px] text-cx-muted">
            <span className="mt-0.5 shrink-0">
              <AgentIcon agent="thermometer" size="sm" />
            </span>
            <span>
              <span className="text-cx-text">A Thermometer callout</span> — the one signal that matters most on today&apos;s beat.
            </span>
          </li>
        </ul>
        <button onClick={onBack} className="mt-6 inline-flex h-9 items-center rounded-lg border border-cx-strong px-3.5 text-[13px] text-cx-muted hover:bg-cx-hover hover:text-cx-text">
          Back to the Area Sales Manager view
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/** Territory Health header for Option B: Weakest Territory lives here (no KPI bar). */
function HealthHeader({ role }: { role: "asm" | "head" }) {
  const w = weakest(role);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-[15px] font-medium text-cx-text">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cx-line bg-cx-raised text-cx-muted">
          <Grid3x3 className="h-4 w-4" />
        </span>
        Territory health
        <span className="text-[11.5px] font-normal text-cx-faint">{role === "asm" ? LBL.asmTerritories : LBL.regions} · today</span>
      </h2>
      <span className="inline-flex items-center gap-2 rounded-lg border border-cx-line bg-cx-raised px-2.5 py-1.5 text-[12px]" title={`${w.metric} ${w.cell.value} · ${w.cell.detail}`}>
        <span className="h-2 w-2 rounded-full" style={{ background: HEALTH_LEVELS[0].color }} />
        <span className="text-cx-faint">Weakest {w.unit}:</span>
        <span className="font-medium text-cx-text">{w.name}</span>
        <span className="hidden text-cx-faint sm:inline">
          · {w.metric} {w.cell.value}
        </span>
      </span>
    </div>
  );
}

function Pulse() {
  const { setRole, setAssistantOpen } = useHome();
  const go = useCortexNav();
  const [pinned, setPinned] = useState<string[]>([]);
  // Leadership is a separate page; "exec" is the in-page SFA note.
  const [persona, setPersona] = useState<"asm" | "exec">("asm");
  const changePersona = (p: Persona) => {
    if (p === "head") return go("leadership");
    setPersona(p);
    if (p === "asm") setRole("asm");
    else setAssistantOpen(false);
  };
  const role = "asm";

  return (
    <PinnedCtx.Provider value={{ pinned, setPinned }}>
      <PageFrame persona={persona} onPersona={changePersona} navActions={<AddWidget mode="button" />}>
        {persona === "exec" ? (
          <ExecNote onBack={() => changePersona("asm")} />
        ) : (
          <div className="pb-24">
            <Hero persona={role} />
            <div className="cx-stagger space-y-8 px-4 sm:px-6">
              <KpiCards persona={role} />
              {/* directly beneath the KPIs, so a busy user reaches the agents without scrolling */}
              <div className="pt-4">
                <ConsoleAgentRow variant="b" />
              </div>
              <AddWidget mode="cards" />
              {/* Row 1 — Action Tracker · Insights (same height) */}
              <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,65fr)_minmax(0,35fr)]">
                <TrackerCard role={role} />
                <InsightsCard />
              </div>
              {/* Row 2 — Since this morning · Territory Health */}
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <SinceMorningCard />
                <TerritoryHealthCard id="health-panel" role={role} header={<HealthHeader role={role} />} />
              </div>
              <ThermoBox role={role} />
              {/* Option A's Market Action Plan timeline, reused as is */}
              <MapPanel />
            </div>
          </div>
        )}
      </PageFrame>
    </PinnedCtx.Provider>
  );
}
