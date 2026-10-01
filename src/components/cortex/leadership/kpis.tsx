"use client";

// Leadership KPI row: the ASM screen's three striped cells, at org-wide scope and governed by
// the top-bar date filter. "View details" on Target achieved and Open actions works like
// Raman's view (the card shifts right and expands), but breaks the figure down by region.

import { LBL } from "@/data/labels";
import React, { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { HEALTH_LEVELS } from "@/data/cortexHome";
import { HEAD_PLAN_MONTHS, RANGE_DATA, REGION_ACTIONS, REGIONS, TERRITORY_COUNT, weakestTerritory } from "@/data/leadership";
import { useHome } from "../HomeState";
import { card, Eyebrow, KpiStripes, blueRamp } from "../kit";
import { useStatusMeta } from "../statusPalette";
import { useLeadership, useRange } from "./common";

const KPI_H = 158;
const inr = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 1 });
type KpiId = "achieved" | "actions" | "weakest";

function Cell({ label, chip, control, value, right, sub, children, expanded }: {
  label: string;
  chip?: string;
  control: React.ReactNode;
  value: React.ReactNode;
  right: React.ReactNode;
  sub: React.ReactNode;
  children: React.ReactNode;
  expanded?: boolean;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-y-3 px-5 py-4 md:gap-y-0 ${expanded ? "" : "md:h-[var(--kpi-h)]"}`} style={{ ["--kpi-h" as string]: `${KPI_H}px` }}>
      <div className="flex min-h-5 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[12.5px] text-cx-muted md:truncate">{label}</span>
          {chip && <span className="shrink-0 whitespace-nowrap rounded border border-cx-strong px-1.5 text-[10.5px] text-cx-text">{chip}</span>}
        </div>
        {control}
      </div>
      <div className="mt-2 flex h-7 items-baseline justify-between gap-2">
        {value}
        {right}
      </div>
      <p className="mt-1 text-[11.5px] leading-[16px] text-cx-faint md:truncate">{sub}</p>
      <div className="mt-auto">{children}</div>
    </div>
  );
}

function DetailsToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} aria-expanded={open} className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[12px] text-cx-muted hover:text-cx-text">
      {open ? (
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
}

function AchievedFigure({ control }: { control: React.ReactNode }) {
  const range = useRange();
  const d = RANGE_DATA[range.id];
  const p = Math.round((d.achievedL / d.estimateL) * 100);
  const filled = Math.round(p / 5);
  let fills: (string | null)[];
  let tip: (i: number) => [string, string?];
  if (range.id === "fy") {
    // the filled stripes are shared out across the months by what each contributed
    const months = HEAD_PLAN_MONTHS.filter((m) => m.achievedL != null);
    const alloc = months.map((m) => Math.max(1, Math.round((m.achievedL! / d.achievedL) * filled)));
    while (alloc.reduce((a, b) => a + b, 0) > filled) alloc[alloc.indexOf(Math.max(...alloc))]--;
    while (alloc.reduce((a, b) => a + b, 0) < filled) alloc[alloc.indexOf(Math.min(...alloc))]++;
    const owner = alloc.flatMap((n, mi) => Array.from({ length: n }, () => mi));
    fills = Array.from({ length: 20 }, (_, i) => (i < filled ? `rgb(47 111 237 / ${0.42 + (0.58 * (owner[i] + 1)) / months.length})` : null));
    tip = (i) => (i < filled ? [`${months[owner[i]].month} · ₹${inr(months[owner[i]].achievedL!)}L`, "Filled stripes shared out by each month's contribution"] : [`Not yet reached · ${i * 5}–${(i + 1) * 5}%`, "Each stripe = 5% of the estimate"]);
  } else {
    const ramp = blueRamp(filled);
    fills = Array.from({ length: 20 }, (_, i) => (i < filled ? ramp(i) : null));
    tip = (i) => [i < filled ? `Achieved · ${i * 5}–${(i + 1) * 5}%` : `Not yet reached · ${i * 5}–${(i + 1) * 5}%`, `Each stripe = 5% · dashed line = ₹${inr(d.estimateL)}L`];
  }
  return (
    <Cell
      label={`Target achieved · ${range.id === "fy" ? "FY 2026–27 to date" : range.label}`}
      chip="All regions"
      control={control}
      value={<span className="font-data text-[28px] leading-none text-cx-text">₹{inr(d.achievedL)}L</span>}
      right={<span className="font-data text-[20px] leading-none text-cx-text">{p}%</span>}
      sub={<>of ₹{inr(d.estimateL)}L estimated · {range.detail} · across {LBL.regions}</>}
    >
      <KpiStripes fills={fills} tip={tip} />
    </Cell>
  );
}

function ActionsFigure({ control }: { control: React.ReactNode }) {
  const { meta } = useStatusMeta();
  const range = useRange();
  const t = RANGE_DATA[range.id].actions;
  const open = t.total - t.done;
  const n = (v: number) => Math.round((v / t.total) * 20);
  const done = n(t.done), prog = n(t.progress), del = n(t.delayed);
  const band = (i: number) => (i < done ? "done" : i < done + prog ? "progress" : i < done + prog + del ? "delayed" : "unassigned");
  const count = { done: t.done, progress: t.progress, delayed: t.delayed, unassigned: t.unassigned };
  return (
    <Cell
      label={`Open actions · ${range.label}`}
      chip="Org-wide"
      control={control}
      value={<span className="font-data text-[28px] leading-none text-cx-text">{open}</span>}
      right={<span className="font-data text-[20px] leading-none text-cx-text">{Math.round((t.done / t.total) * 100)}%</span>}
      sub={<>of {t.total} across {LBL.asms} · {t.progress} in progress · {t.delayed} delayed · {t.unassigned} no owner</>}
    >
      <KpiStripes fills={Array.from({ length: 20 }, (_, i) => meta[band(i)].color)} tip={(i) => [`${meta[band(i)].label} · ${count[band(i)]} of ${t.total}`, "Each stripe = 5% of the range's actions"]} />
    </Cell>
  );
}

function WeakestFigure() {
  const { focus } = useHome();
  const w = weakestTerritory();
  const cols = ["Revenue", "Coverage", "Collection", "Stock", "Pricing"];
  const [dim, setDim] = useState<number | null>(null);
  const hc = dim != null ? w.row.cells[dim] : null;
  return (
    <Cell
      label="Weakest territory · today"
      chip={`of ${TERRITORY_COUNT}`}
      control={
        <button onClick={() => focus("org-health")} className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[12px] text-cx-muted hover:text-cx-text">
          In Territory Health <ChevronRight className="h-3 w-3" />
        </button>
      }
      value={<span className="truncate text-[28px] font-medium leading-none tracking-tight text-cx-text">{w.name}</span>}
      right={
        <span className="shrink-0 font-data text-[12px] text-cx-faint">
          {w.region} · {w.asm}
        </span>
      }
      sub={
        <>
          {w.metric} <span className="text-cx-text">{w.cell.value}</span> · {w.cell.detail} · {w.critical} critical
        </>
      }
    >
      <div className="relative grid grid-cols-5 gap-1.5" onMouseLeave={() => setDim(null)}>
        {w.row.cells.map((c, i) => (
          <button key={i} onMouseEnter={() => setDim(i)} onFocus={() => setDim(i)} onBlur={() => setDim(null)} aria-label={`${cols[i]}: ${HEALTH_LEVELS[c.level].label}, ${c.value}. ${c.detail}`} className="flex flex-col items-stretch gap-1 text-left">
            <span className={`truncate text-center text-[10px] leading-[12px] ${dim === i ? "text-cx-text" : "text-cx-faint"}`}>{cols[i]}</span>
            <span
              className="flex h-[22px] items-center justify-center rounded-[3px] font-data text-[10.5px]"
              style={{ background: HEALTH_LEVELS[c.level].color, color: c.level === 2 ? "rgb(var(--cx-text))" : "rgba(255,255,255,0.92)", boxShadow: dim === i ? "0 0 0 2px rgb(var(--cx-text))" : undefined }}
            >
              {c.value}
            </span>
          </button>
        ))}
        {hc && (
          <span role="tooltip" className="pointer-events-none absolute bottom-full z-30 mb-2 whitespace-nowrap rounded-md border border-cx-strong bg-cx-raised px-2.5 py-1.5 text-[11.5px] shadow-xl" style={{ left: `${((dim! + 0.5) / 5) * 100}%`, transform: `translateX(${dim === 0 ? "-20%" : dim === 4 ? "-80%" : "-50%"})` }}>
            <span className="block text-cx-text">
              {cols[dim!]} · {HEALTH_LEVELS[hc.level].label}
            </span>
            <span className="block text-[10.5px] text-cx-faint">{hc.detail}</span>
          </span>
        )}
      </div>
    </Cell>
  );
}

// ---------------------------------------------------------------------------
// Region breakdown (the expanded view)
// ---------------------------------------------------------------------------

function RegionCards({ id }: { id: "achieved" | "actions" }) {
  const { toast } = useHome();
  const { meta } = useStatusMeta();
  const range = useRange();
  const scroller = React.useRef<HTMLDivElement>(null);
  const d = RANGE_DATA[range.id];
  const sepA = REGIONS.reduce((n, r) => n + r.sepAchievedL, 0);
  const sepE = REGIONS.reduce((n, r) => n + r.sepEstimateL, 0);
  // each region keeps its September standing relative to the org, then figures are scaled so they sum to the org total
  const rangePct = d.achievedL / d.estimateL;
  const raw = REGIONS.map((r) => {
    const e = d.estimateL * (r.sepEstimateL / sepE);
    return { e, a: e * Math.min(1, Math.max(0.2, rangePct + (r.sepAchievedL / r.sepEstimateL - sepA / sepE) * 0.6)) };
  });
  const scale = d.achievedL / raw.reduce((n, x) => n + x.a, 0);
  const scroll = (dx: number) => scroller.current?.scrollBy({ left: dx, behavior: "smooth" });

  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Eyebrow>By region · {range.label}</Eyebrow>
        <span className="flex items-center gap-1">
          <button onClick={() => scroll(-420)} className="flex h-7 w-7 items-center justify-center rounded-md border border-cx-line text-cx-faint hover:text-cx-text" aria-label="Scroll back">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => scroll(420)} className="flex h-7 w-7 items-center justify-center rounded-md border border-cx-line text-cx-faint hover:text-cx-text" aria-label="Scroll on">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
      <div className="relative">
        <div ref={scroller} className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
          {REGIONS.map((r, ri) => {
            if (id === "achieved") {
              const e = raw[ri].e;
              const a = raw[ri].a * scale;
              const p = Math.round((a / e) * 100);
              const filled = Math.round(p / 10);
              const status = p < 60 ? { label: "Behind", color: "#d64550" } : p < 72 ? { label: "Watch", color: "#e0b43a" } : { label: "On track", color: "#2fa85c" };
              return (
                <div key={r.name} className="w-[196px] shrink-0 snap-start rounded-lg border border-cx-line bg-cx-raised/40 p-3.5">
                  <p className="flex items-center justify-between gap-2 text-[12.5px] text-cx-text">
                    <span className="truncate">{r.name}</span>
                    <span className="font-data text-[10.5px] text-cx-faint">{r.asm}</span>
                  </p>
                  <p className="mt-2 flex items-baseline justify-between">
                    <span className="font-data text-[20px] leading-none text-cx-text">₹{inr(a)}L</span>
                    <span className="font-data text-[13px] text-cx-muted">{p}%</span>
                  </p>
                  <p className="mt-1 text-[11px] text-cx-faint">of ₹{inr(e)}L estimated</p>
                  <span className="mt-3 flex h-4 gap-[2px]" aria-hidden>
                    {Array.from({ length: 10 }, (_, i) => (
                      <span key={i} className="flex-1 rounded-[1px]" style={{ background: i < filled ? `rgb(47 111 237 / ${0.42 + (0.58 * (i + 1)) / Math.max(filled, 1)})` : "rgb(var(--cx-line))" }} />
                    ))}
                  </span>
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-cx-muted">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.color }} /> {status.label}
                  </p>
                </div>
              );
            }
            const base = REGION_ACTIONS[r.name];
            const k = d.actions.total / LBL.monthActions;
            const x = { total: Math.round(base.total * k), done: Math.round(base.done * k), progress: Math.round(base.progress * k), delayed: Math.round(base.delayed * k), unassigned: Math.round(base.unassigned * k) };
            const open = x.total - x.done;
            const seg = (v: number) => (x.total ? (v / x.total) * 100 : 0);
            return (
              <div key={r.name} className="w-[196px] shrink-0 snap-start rounded-lg border border-cx-line bg-cx-raised/40 p-3.5">
                <p className="flex items-center justify-between gap-2 text-[12.5px] text-cx-text">
                  <span className="truncate">{r.name}</span>
                  <span className="font-data text-[10.5px] text-cx-faint">{r.asm}</span>
                </p>
                <p className="mt-2 flex items-baseline justify-between">
                  <span className="font-data text-[20px] leading-none text-cx-text">{open}</span>
                  <span className="font-data text-[13px] text-cx-muted">{x.total ? Math.round((x.done / x.total) * 100) : 0}% done</span>
                </p>
                <p className="mt-1 text-[11px] text-cx-faint">open of {x.total}</p>
                <span className="mt-3 flex h-4 gap-[2px] overflow-hidden rounded-[1px]" aria-hidden>
                  {(["done", "progress", "delayed", "unassigned"] as const).map((b) => (
                    <span key={b} style={{ width: `${seg(x[b])}%`, background: meta[b].color }} />
                  ))}
                </span>
                <p className="mt-2 text-[11px] text-cx-muted">
                  {x.delayed} delayed · {x.unassigned} no owner
                </p>
              </div>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-cx-panel to-transparent" />
      </div>
      <div className="mt-2 flex justify-end">
        <button onClick={() => toast(`Opens the Market Action Plan agent, all ${LBL.regions}.`)} className="inline-flex items-center gap-1 text-[12px] text-cx-muted hover:text-cx-text">
          View all in Market Action Plan <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/** Three cells between hairlines; an opened card shifts right and expands to two cells' height. */
export function LeadershipKpis() {
  const [open, setOpen] = useState<KpiId | null>(null);
  useLeadership(); // re-render with the range
  const figure = (id: KpiId, expanded = false) => {
    const control = id === "weakest" ? null : <DetailsToggle open={expanded} onToggle={() => setOpen(expanded ? null : id)} />;
    if (id === "achieved") return <AchievedFigure key={id} control={control} />;
    if (id === "actions") return <ActionsFigure key={id} control={control} />;
    return <WeakestFigure key={id} />;
  };
  const ids: KpiId[] = ["achieved", "actions", "weakest"];
  if (!open) {
    return (
      <section aria-label="Key metrics" className="grid grid-cols-1 divide-y divide-cx-line md:grid-cols-3 md:divide-x md:divide-y-0">
        {ids.map((id) => figure(id))}
      </section>
    );
  }
  return (
    <section aria-label="Key metrics" className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="flex flex-col divide-y divide-cx-line lg:border-r lg:border-cx-line">{ids.filter((id) => id !== open).map((id) => figure(id))}</div>
      <div key={open} className="cx-slide-in min-w-0 lg:pl-4">
        <div className={`${card} flex flex-col`} style={{ minHeight: KPI_H * 2 + 1 }}>
          {figure(open, true)}
          <div className="border-t border-cx-line px-5 pb-4 pt-3">
            <RegionCards id={open as "achieved" | "actions"} />
          </div>
        </div>
      </div>
    </section>
  );
}
