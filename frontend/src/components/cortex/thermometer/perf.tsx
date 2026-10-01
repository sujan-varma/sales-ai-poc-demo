"use client";

// Cell and evidence builders shared by the Performance table and the deep-dive tables,
// so a figure reads and explains itself the same way wherever it appears.

import React from "react";
import {
  Agg,
  CATEGORIES,
  Evidence,
  FY_LABEL,
  PLANS,
  Rstab,
  SYNC_NOTE,
  ThermoFilters,
  achPct,
  achRag,
  bpRag,
  fmtL,
  fmtN,
  fmtPct,
  periodLabel,
} from "@/data/thermometer";
import { Col, Fig, NA, RagChip } from "./ui";

export interface Ctx {
  f: ThermoFilters;
  /** human scope, e.g. "Rajkot · Distributor · Existing" */
  scope: string;
  territories: string[];
  /** what the partner set is, for the evidence trail */
  partners: string;
  /** retailer rows: target derived from the distributor target */
  derivedTarget?: string;
}

const planNote = (f: ThermoFilters) => PLANS.find((p) => p.id === f.plan)!;
const catNote = (f: ThermoFilters) => (f.category ? `${f.category} only` : "All four categories");
const terrNote = (t: string[]) => (t.length <= 3 ? t.join(", ") : `${t.length} territories`);

export function evSales(c: Ctx, a: Agg): Evidence {
  return {
    title: `Sales · ${c.scope}`,
    value: fmtL(a.sales),
    source: c.partners.includes("Retailer") ? "DMS secondary billing (distributor to retailer)" : c.partners.includes("Project") ? "DMS project invoices" : "DMS primary invoices",
    period: `${periodLabel(c.f)} · ${SYNC_NOTE}`,
    included: [c.partners, terrNote(c.territories), catNote(c.f), `${fmtN(a.count)} ${a.count === 1 ? "partner" : "partners"}`],
    excluded: [c.f.period === "mtd" ? "30 Sep, not yet invoiced" : "Months outside the period", ...(c.partners.includes("Retailer") ? [] : ["Retailer secondary sales"])],
  };
}
export function evTarget(c: Ctx, a: Agg): Evidence {
  const p = planNote(c.f);
  return {
    title: `Target · ${c.scope}`,
    value: fmtL(a.target),
    source: c.derivedTarget ?? `${FY_LABEL} operating plan, by partner, category and month`,
    period: periodLabel(c.f),
    formula: p.id === "plan" ? "Σ monthly plan over the period" : p.id === "stretch" ? "Σ monthly plan × 1.10" : "Σ monthly plan + (H1 plan − H1 actual) ÷ 6 per H2 month",
    included: [c.partners, terrNote(c.territories), catNote(c.f), `Scenario: ${p.label}`],
    excluded: ["Retailer targets on primary rows", "Partners appointed after the period"],
  };
}
export function evAch(c: Ctx, a: Agg): Evidence {
  const p = achPct(a);
  return {
    title: `Achievement · ${c.scope}`,
    value: fmtPct(p),
    source: "DMS invoices against the operating plan",
    period: periodLabel(c.f),
    formula: `${fmtL(a.sales)} ÷ ${fmtL(a.target)}`,
    included: [c.partners, terrNote(c.territories), catNote(c.f)],
    excluded: ["Partners with no plan line"],
    curve: c.f.period === "mtd",
  };
}
export function evGrowth(c: Ctx, a: Agg, existingOnly = false): Evidence {
  return {
    title: `Growth over last year · ${c.scope}`,
    value: fmtPct(a.growth),
    source: "DMS invoices, this year against the same months last year",
    period: c.f.period === "mtd" || c.f.period === "prev" ? "YTD basis, Apr–Aug (the current month is still open)" : periodLabel(c.f),
    formula: a.ly ? `(${fmtL(a.cyG)} − ${fmtL(a.ly)}) ÷ ${fmtL(a.ly)}` : undefined,
    included: [c.partners, terrNote(c.territories), catNote(c.f)],
    excluded: existingOnly ? ["New partners (no last-year base)"] : ["Nothing: new partners count in this year's sales"],
  };
}
export function evRstab(c: Ctx, r: Rstab, which: "current" | "planned" | "inc"): Evidence {
  const value = which === "current" ? fmtL(r.current) : which === "planned" ? fmtL(r.planned) : fmtPct(r.incPct);
  return {
    title: `${which === "current" ? "Current RSTAB" : which === "planned" ? "Planned RSTAB" : "RSTAB increase"} · ${c.scope}`,
    value,
    source: "Operating plan and DMS invoices",
    period: "Always year-to-date through August; remaining months Sep–Mar (7). Does not follow the period filter.",
    formula:
      which === "current"
        ? `(annual ${fmtL(r.annual)} − Apr–Aug actual ${fmtL(r.ytdActual)}) ÷ ${r.remMonths}`
        : which === "planned"
          ? `remaining plan ${fmtL(r.remaining)} ÷ ${r.remMonths}`
          : `current ÷ planned − 1`,
    included: [c.partners, terrNote(c.territories), catNote(c.f)],
    excluded: ["September month-to-date sales (the month is still open)"],
  };
}
export function evBilling(c: Ctx, a: Agg, which: "active" | "target" | "billing" | "ach"): Evidence {
  const pct = a.billTarget ? (a.billing / a.billTarget) * 100 : null;
  const v = which === "active" ? fmtN(a.active) : which === "target" ? fmtN(a.billTarget) : which === "billing" ? fmtN(a.billing) : fmtPct(pct);
  return {
    title: `${which === "active" ? "Active partners" : which === "target" ? "Billing target" : which === "billing" ? "Billing partners" : "Billing achievement"} · ${c.scope}`,
    value: v,
    source: "Partner status from SFA; billing from DMS",
    period: periodLabel(c.f),
    formula:
      which === "target"
        ? "Σ target billing participation per partner (by size band; new partners lower)"
        : which === "ach"
          ? `${a.billing} billing ÷ ${a.billTarget} expected`
          : which === "billing"
            ? "Active partners with sales above zero in the period"
            : "Partners marked operating in SFA",
    included: [c.partners, terrNote(c.territories)],
    excluded: ["Partners not operating"],
    curve: which === "ach" && c.f.period === "mtd",
  };
}

// ---------------------------------------------------------------------------
// Column sets
// ---------------------------------------------------------------------------

export const SALES_COLS: Col[] = [
  { key: "t", label: "Target", width: 96 },
  { key: "s", label: "Sales", width: 96 },
  { key: "a", label: "Achievement", width: 108 },
  { key: "g", label: "Growth over LY", width: 104 },
  { key: "rc", label: "Current RSTAB", width: 104 },
  { key: "rp", label: "Planned RSTAB", width: 104 },
  { key: "ri", label: "RSTAB Δ", width: 84 },
];
export const BILL_COLS: Col[] = [
  { key: "ac", label: "Active", width: 72, divide: true },
  { key: "bt", label: "Billing target", width: 92 },
  { key: "bc", label: "Billing", width: 72 },
  { key: "ba", label: "Achievement", width: 108 },
];
export const CHANNEL_COLS = [...SALES_COLS, ...BILL_COLS];
export const CHANNEL_GROUPS = [
  { label: "Sales performance", span: SALES_COLS.length },
  { label: "Billing performance", span: BILL_COLS.length },
];

export function salesCells(c: Ctx, a: Agg, r: Rstab | null, opts: { growth?: "new" | "existing" | "na" } = {}): React.ReactNode[] {
  const p = achPct(a);
  return [
    a.target ? <Fig key="t" ev={() => evTarget(c, a)}>{fmtL(a.target)}</Fig> : <NA key="t" />,
    <Fig key="s" ev={() => evSales(c, a)}>{fmtL(a.sales)}</Fig>,
    p == null ? (
      <NA key="a" />
    ) : (
      <Fig key="a" ev={() => evAch(c, a)} className="no-underline">
        <RagChip rag={achRag(p, c.f.period)}>{fmtPct(p)}</RagChip>
      </Fig>
    ),
    opts.growth === "new" ? (
      <span key="g" className="font-plex text-[11.5px] text-cx-faint">New partner</span>
    ) : opts.growth === "na" || a.growth == null ? (
      <NA key="g" />
    ) : (
      <Fig key="g" ev={() => evGrowth(c, a, opts.growth === "existing")}>
        <span style={{ color: a.growth < 0 ? "#d64550" : undefined }}>{a.growth > 0 ? "+" : ""}{fmtPct(a.growth)}</span>
      </Fig>
    ),
    r ? <Fig key="rc" ev={() => evRstab(c, r, "current")}>{fmtL(r.current)}</Fig> : <NA key="rc" />,
    r ? <Fig key="rp" ev={() => evRstab(c, r, "planned")}>{fmtL(r.planned)}</Fig> : <NA key="rp" />,
    r && r.incPct != null ? (
      <Fig key="ri" ev={() => evRstab(c, r, "inc")}>
        <span style={{ color: r.incPct > 10 ? "#d64550" : r.incPct > 0 ? "#c28a12" : "#2fa85c" }}>{r.incPct > 0 ? "+" : ""}{r.incPct.toFixed(1)}%</span>
      </Fig>
    ) : (
      <NA key="ri" />
    ),
  ];
}
export function billCells(c: Ctx, a: Agg): React.ReactNode[] {
  const pct = a.billTarget ? (a.billing / a.billTarget) * 100 : null;
  return [
    <Fig key="ac" ev={() => evBilling(c, a, "active")}>{fmtN(a.active)}</Fig>,
    a.billTarget ? <Fig key="bt" ev={() => evBilling(c, a, "target")}>{fmtN(a.billTarget)}</Fig> : <NA key="bt" />,
    <Fig key="bc" ev={() => evBilling(c, a, "billing")}>{fmtN(a.billing)}</Fig>,
    pct == null ? (
      <NA key="ba" />
    ) : (
      <Fig key="ba" ev={() => evBilling(c, a, "ach")} className="no-underline">
        <RagChip rag={bpRag(a.billing, a.billTarget, c.f.period)}>{fmtPct(pct)}</RagChip>
      </Fig>
    ),
  ];
}
export const naCells = (n: number) => Array.from({ length: n }, (_, i) => <NA key={i} />);

export const categoryId = (name: string | null) => (name ? CATEGORIES.find((c) => c.name === name)?.id ?? null : null);
