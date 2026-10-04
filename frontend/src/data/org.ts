// Org-wide Market Action Plan and Pitch data for the Head of Sales's read-only pages. Built by the backend
// (GET /api/web/bootstrap → `org`): every ASM's plan for every month, each ASM's Sales Executives, and the pitches
// their September plans pushed — the same build the ASM's own pages use, run for every ASM. See ./source.ts.
//
// The viewing ASM's own September rows and pitches are not in `org`: they come from `map` and `pitch`, which carry
// the assignments and app updates the backend applies per request, so both views read the same live rows.

import type { Pitch, OutletType, TalkingPoint } from "./pitch";
import { Initiative, MAP_LABELS, SEP_INITIATIVES, registerInitiatives } from "./map";
import { DOpt } from "./source";

// Optional: an older backend has no `org` section, and then the org pages show their "No data" card.
const O = <T,>(key: string, fallback: T) => DOpt<T>("org", key, fallback);

// ---------------------------------------------------------------------------
// The roster: Sales Executives under every ASM
// ---------------------------------------------------------------------------

export interface OrgExec {
  name: string;
  region: string;
  asm: string;
  territories: string[];
}

/** One row per officer per ASM: an officer serving two ASMs in the workbook appears under each. */
export const ORG_EXECS = O<OrgExec[]>("ORG_EXECS", []);
export const execsOf = (region: string) => ORG_EXECS.filter((e) => e.region === region);
/** distinct people, not rows */
export const ORG_SE_COUNT = new Set(ORG_EXECS.map((e) => e.name)).size;

// ---------------------------------------------------------------------------
// The plan index: every ASM's plan, every month
// ---------------------------------------------------------------------------

export interface OrgPlan {
  id: string;
  region: string;
  asm: string;
  initials: string;
  month: string;
  label: string;
  territories: string[];
  created: boolean;
  versions: number;
  initiatives: number;
  estimateL: number | null;
  achievedL: number | null;
  status: "delivered" | "progress" | "not-started";
  note: string;
}

export const ORG_PLANS = O<OrgPlan[]>("ORG_PLANS", []);
export const orgPlan = (id: string) => ORG_PLANS.find((p) => p.id === id);
/** the viewing ASM's region, as the org plans name it */
export const OWN_REGION = ORG_PLANS.find((p) => p.asm === MAP_LABELS.asm)?.region ?? MAP_LABELS.region;

const INITIATIVES = O<Record<string, Initiative[]>>("ORG_INITIATIVES", {});
for (const rows of Object.values(INITIATIVES)) registerInitiatives(rows);

/** A plan's rows. The viewing ASM's September is the live one in `map`, with its tickets applied. */
export function orgInitiatives(planId: string): Initiative[] {
  const p = orgPlan(planId);
  if (p && p.asm === MAP_LABELS.asm && p.month === "Sep") return SEP_INITIATIVES;
  return INITIATIVES[planId] ?? [];
}

// ---------------------------------------------------------------------------
// Org-wide pitches: the other ASMs' September pushes, one per outlet
// ---------------------------------------------------------------------------

/** Each carries the ASM and region it was built for (officers can serve more than one ASM). */
export const ORG_PITCHES = O<(Pitch & { asm: string; region: string })[]>("ORG_PITCHES", []);
export const ORG_OUTLETS = O<Record<string, { type: OutletType; territory: string; code: string }>>("ORG_OUTLETS", {});
export const ORG_KPIS = O<Record<string, { value: string; target: string; outstanding: string; skus: string }>>("ORG_KPIS", {});
export const ORG_POINTS = O<Record<string, Omit<TalkingPoint, "n">[]>>("ORG_POINTS", {});
export const ORG_PLAN_LINES = O<Record<string, string>>("ORG_PLAN_LINES", {});

// ---------------------------------------------------------------------------
// Flagged, and the org-wide roll-up the Head of Sales's index shows
// ---------------------------------------------------------------------------

/**
 * Where an initiative still needs someone: an open Tracker ticket, a live talking point in Pitch, or both. One
 * rule, used by the per-plan summary row and by the org roll-up above it, so the Head of Sales's count is exactly
 * the sum of the ones he finds inside the plans. A closed row counts for nothing on either side.
 */
export function flagsOf(i: Pick<Initiative, "ticket" | "status" | "pitch">) {
  const open = i.status !== "closed";
  const tracker = open && Boolean(i.ticket);
  const pitch = open && Boolean(i.pitch);
  return { tracker, pitch, flagged: tracker || pitch, both: tracker && pitch };
}

export interface OrgStats {
  /** plans an ASM has created, of the plans the period could hold */
  created: number;
  possible: number;
  closed: number;
  live: number;
  estimateL: number;
  achievedL: number;
  pct: number;
  flagged: number;
  tracker: number;
  pitch: number;
  both: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Every figure on the Head of Sales's KPI row, for the months the period filter covers. */
export function orgStats(months: string[], scope?: (p: OrgPlan) => boolean): OrgStats {
  const want = new Set(months);
  const plans = ORG_PLANS.filter((p) => want.has(p.month) && (!scope || scope(p)));
  const made = plans.filter((p) => p.created);
  const estimateL = round1(made.reduce((n, p) => n + (p.estimateL ?? 0), 0));
  const achievedL = round1(made.reduce((n, p) => n + (p.achievedL ?? 0), 0));
  const f = { flagged: 0, tracker: 0, pitch: 0, both: 0 };
  for (const p of made)
    for (const i of orgInitiatives(p.id)) {
      const x = flagsOf(i);
      if (!x.flagged) continue;
      f.flagged++;
      if (x.tracker) f.tracker++;
      if (x.pitch) f.pitch++;
      if (x.both) f.both++;
    }
  return {
    created: made.length,
    possible: plans.length,
    closed: made.filter((p) => p.status === "delivered").length,
    live: made.filter((p) => p.status === "progress").length,
    estimateL,
    achievedL,
    pct: estimateL ? Math.round((achievedL / estimateL) * 100) : 0,
    ...f,
  };
}
