// Thermometer: the calculations ported from the reference build (index_v8.html), fed with the Excel workbook
// through the backend (GET /api/web/bootstrap → "thermometer"). Channel partners are the workbook's retailers
// (monthly actual and target value per SKU, summed to the four categories) and their distributors.
// Not in the workbook: last year's sales (LY is 0, so growth shows NA), project customers and LMS leads.
//
//   Retailer master + 8. Actual / 9. Target Sales Value → partners, cy and tgt per category per FY month (₹ lakh)
//   Oct–Mar targets  → (Yearly target − Apr–Sep targets) ÷ 6
//   Distributors     → the secondary sales and targets of their retailers

import { REGIONS } from "./leadership";
import { D } from "./source";

const Th = <T,>(key: string) => D<T>("thermometer", key);

// ---------------------------------------------------------------------------
// Calendar: April financial year. Workbook actuals run to 20 Sep 2026.
// ---------------------------------------------------------------------------

export const FY_MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"] as const;
export type MonthName = (typeof FY_MONTHS)[number];
/** index of the current month (Sep) in FY_MONTHS */
export const CUR = 5;
export const AS_OF = Th<{ day: number; days: number; label: string }>("AS_OF");
export const SYNC_NOTE = Th<string>("SYNC_NOTE");
export const FY_LABEL = "FY 2026–27";
const ALL = FY_MONTHS.map((_, i) => i);

/** Day-of-month expected achievement curve (reference SC_DAY_CURVE): % of the month's target expected by each day. */
const DAY_CURVE = [0, 3, 5, 8, 10, 13, 15, 18, 20, 23, 25, 28, 30, 33, 35, 38, 40, 43, 45, 48, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
export function expectedFor(day: number, days: number) {
  if (day >= days) return 100;
  return DAY_CURVE[Math.max(1, Math.min(30, Math.ceil((day / days) * 30)))];
}
/** Expected MTD achievement on the data date. */
export const EXPECTED_TODAY = expectedFor(AS_OF.day, AS_OF.days);
export const DAY_CURVE_POINTS = Array.from({ length: AS_OF.days }, (_, i) => ({ day: i + 1, pct: expectedFor(i + 1, AS_OF.days) }));

// ---------------------------------------------------------------------------
// Periods, plan scenarios, filters
// ---------------------------------------------------------------------------

export type PeriodId = "mtd" | "ytd" | "prev" | "q" | "fy" | "bal";
export const PERIODS: { id: PeriodId; label: string; detail: string }[] = [
  { id: "mtd", label: "MTD", detail: `September to date (${AS_OF.day} Sep)` },
  { id: "ytd", label: "YTD", detail: "Apr–Aug, completed months" },
  { id: "prev", label: "Previous month", detail: "August" },
  { id: "q", label: "Quarter", detail: "Pick a quarter" },
  { id: "fy", label: "Full year", detail: "Apr 2026 – Mar 2027" },
  { id: "bal", label: "Balance year", detail: "Oct – Mar, not yet sold" },
];
export const QUARTERS = { Q1: [0, 1, 2], Q2: [3, 4, 5], Q3: [6, 7, 8], Q4: [9, 10, 11] } as const;
export type QuarterId = keyof typeof QUARTERS;

export type PlanId = "plan" | "stretch" | "rstab";
export const PLANS: { id: PlanId; label: string; detail: string }[] = [
  { id: "plan", label: "Plan", detail: "Annual operating plan" },
  { id: "stretch", label: "Stretch", detail: "Plan × 1.10" },
  { id: "rstab", label: "RSTAB", detail: "H1 shortfall spread over H2" },
];

export type Sector = "Trade" | "Non-Trade";

export interface ThermoFilters {
  period: PeriodId;
  quarter: QuarterId;
  plan: PlanId;
  sector: Sector | null;
  region: string | null;
  territory: string | null;
  category: string | null;
}
export const DEFAULT_FILTERS: ThermoFilters = { period: "mtd", quarter: "Q2", plan: "plan", sector: null, region: null, territory: null, category: null };

export function periodMonths(f: Pick<ThermoFilters, "period" | "quarter">): number[] {
  switch (f.period) {
    case "mtd":
      return [CUR];
    case "ytd":
      return ALL.slice(0, CUR);
    case "prev":
      return [CUR - 1];
    case "q":
      return [...QUARTERS[f.quarter]];
    case "fy":
      return ALL;
    case "bal":
      return ALL.slice(CUR + 1);
  }
}
/** Growth is compared over completed months. MTD and previous month compare on a YTD basis, as in the reference. */
export function growthMonths(f: Pick<ThermoFilters, "period" | "quarter">): number[] | null {
  if (f.period === "mtd" || f.period === "prev") return ALL.slice(0, CUR);
  if (f.period === "bal") return null;
  const m = periodMonths(f).filter((i) => i <= CUR);
  return m.length ? m : null;
}
export function periodLabel(f: Pick<ThermoFilters, "period" | "quarter">) {
  const ms = periodMonths(f);
  const span = ms.length ? `${FY_MONTHS[ms[0]]}${ms.length > 1 ? `–${FY_MONTHS[ms[ms.length - 1]]}` : ""}` : "none";
  if (f.period === "mtd") return `MTD · Sep to ${AS_OF.day}th`;
  if (f.period === "ytd") return `YTD · ${span}`;
  if (f.period === "prev") return "Previous month · Aug";
  if (f.period === "q") return `${f.quarter} · ${span}`;
  if (f.period === "fy") return `Full year · ${span}`;
  return `Balance year · ${span}`;
}

// ---------------------------------------------------------------------------
// Products: four Bondex categories, each opening to its pack sizes
// ---------------------------------------------------------------------------

const CATEGORY_BASE = [
  { id: "iwc", name: "IWC", full: "Integral Waterproofing Compound" },
  { id: "rp", name: "Repair Polymer", full: "Repair Polymer" },
  { id: "ap", name: "Acrylic Primer", full: "Acrylic Primer" },
  { id: "wc", name: "Waterproofing Compound", full: "Waterproofing Compound" },
] as const;
export type CategoryId = (typeof CATEGORY_BASE)[number]["id"];
/** pack sizes from 2. Products; split = each pack's share of the category's FY sales */
const PACKS = Th<Record<CategoryId, { packs: string[]; split: number[] }>>("CATEGORY_PACKS");
export const CATEGORIES: readonly { id: CategoryId; name: string; full: string; packs: readonly string[]; split: readonly number[] }[] = CATEGORY_BASE.map((c) => ({
  ...c,
  packs: PACKS[c.id]?.packs ?? [],
  split: PACKS[c.id]?.split ?? [],
}));
export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);
export const catByName = (n: string) => CATEGORIES.find((c) => c.name === n);

// ---------------------------------------------------------------------------
// Channel partners
// ---------------------------------------------------------------------------

export type CpType = "distributor" | "dealer" | "retailer" | "project";
export const CP_LABEL: Record<CpType, string> = { distributor: "Distributor", dealer: "Dealer", retailer: "Retailer", project: "Project customer" };

export interface ChannelPartner {
  code: string;
  name: string;
  type: CpType;
  region: string;
  asm: string;
  territory: string;
  /** "YYYY-MM-DD"; null for long-standing partners with no recorded date */
  appt: string;
  isNew: boolean;
  operating: boolean;
  /** LY average monthly sale, ₹ lakh. Fixes the size band; never moves with filters. */
  lyAvg: number;
  /** [category][month] in ₹ lakh. cy is zero for months not yet sold; Sep is month-to-date. */
  cy: number[][];
  ly: number[][];
  tgt: number[][];
  /** distributors: retailers linked in DMS */
  linkedRetailers?: number;
}

/** Value guideline for a new partner (₹ lakh / month), used as its target. */
export const VALUE_GUIDE: Record<CpType, number> = { distributor: 2, dealer: 0.4, retailer: 0.1, project: 0.3 };

/** The workbook has no last-year sales: ly arrives missing and is all zeros here, so growth reads NA. */
export const CPS: ChannelPartner[] = Th<(Omit<ChannelPartner, "ly"> & { ly?: number[][] })[]>("CPS").map((c) => ({
  ...c,
  ly: c.ly ?? c.cy.map((row) => row.map(() => 0)),
}));

// ---------------------------------------------------------------------------
// Scope: which territories a persona sees
// ---------------------------------------------------------------------------

export type ThermoPersona = "asm" | "head";
export const ASM_REGION = REGIONS.find((r) => r.asm === Th<string>("ASM_NAME")) ?? REGIONS[0];

export interface Group {
  /** region name (Head of Sales) or territory (ASM) */
  name: string;
  sub: string;
  territories: string[];
}
export function groupsFor(p: ThermoPersona): Group[] {
  if (p === "head") return REGIONS.map((r) => ({ name: r.name, sub: r.asm, territories: r.territories }));
  return ASM_REGION.territories.map((t) => ({ name: t, sub: ASM_REGION.name, territories: [t] }));
}
export function scopeTerritories(p: ThermoPersona, f?: Pick<ThermoFilters, "region" | "territory">) {
  let t = p === "head" ? REGIONS.flatMap((r) => r.territories) : [...ASM_REGION.territories];
  if (f?.region) t = t.filter((x) => REGIONS.find((r) => r.name === f.region)?.territories.includes(x));
  if (f?.territory) t = t.filter((x) => x === f.territory);
  return t;
}
export const asmOf = (territory: string) => REGIONS.find((r) => r.territories.includes(territory))?.asm ?? ASM_REGION.asm;
export const regionOfTerr = (territory: string) => REGIONS.find((r) => r.territories.includes(territory))?.name ?? ASM_REGION.name;

// ---------------------------------------------------------------------------
// Size bands (fixed from the Apr–Aug average across all products; the workbook has no LY)
// ---------------------------------------------------------------------------

export const BANDS: Record<"distributor" | "dealer", { label: string; key: string; test: (v: number) => boolean }[]> = {
  distributor: [
    { label: "> ₹5 L", key: "d20", test: (v) => v > 5 },
    { label: "₹2–5 L", key: "d10", test: (v) => v >= 2 && v <= 5 },
    { label: "< ₹2 L", key: "dlt", test: (v) => v < 2 },
  ],
  dealer: [
    { label: "> ₹60k", key: "k5", test: (v) => v > 0.6 },
    { label: "₹25–60k", key: "k2", test: (v) => v >= 0.25 && v <= 0.6 },
    { label: "< ₹25k", key: "klt", test: (v) => v < 0.25 },
  ],
};
export const RETAILER_BANDS = [
  { label: "Elite Plus", test: (v: number) => v > 0.6 },
  { label: "Elite", test: (v: number) => v > 0.35 && v <= 0.6 },
  { label: "Premium", test: (v: number) => v > 0.2 && v <= 0.35 },
  { label: "Superior", test: (v: number) => v > 0.1 && v <= 0.2 },
  { label: "Classic", test: (v: number) => v > 0.06 && v <= 0.1 },
  { label: "Standard", test: (v: number) => v >= 0.03 && v <= 0.06 },
  { label: "< Standard", test: (v: number) => v < 0.03 },
];
export const retailerCategory = (v: number) => RETAILER_BANDS.find((b) => b.test(v))?.label ?? "< Standard";

/** Target billing participation by channel and band (stands in for the reference's BP target file). */
export const BP_TARGET: Record<string, number> = {
  d20: 0.95, d10: 0.9, dlt: 0.85, dnew: 0.7,
  k5: 0.9, k2: 0.85, klt: 0.75, knew: 0.65,
  "Elite Plus": 0.85, Elite: 0.8, Premium: 0.75, Superior: 0.7, Classic: 0.65, Standard: 0.6, "< Standard": 0.5, rnew: 0.45,
  project: 0.8,
};
export function bpTargetFor(c: ChannelPartner) {
  if (c.type === "project") return BP_TARGET.project;
  if (c.type === "retailer") return c.isNew ? BP_TARGET.rnew : BP_TARGET[retailerCategory(c.lyAvg)];
  if (c.isNew) return c.type === "distributor" ? BP_TARGET.dnew : BP_TARGET.knew;
  const band = BANDS[c.type].find((b) => b.test(c.lyAvg))!;
  return BP_TARGET[band.key];
}
/** Distributor-to-retailer margin. A platform setting (Configuration), not a page input. */
export const RETAILER_MARGIN = 0.12;

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export interface Agg {
  sales: number;
  target: number | null;
  ly: number | null;
  cyG: number;
  growth: number | null;
  active: number;
  billing: number;
  billTarget: number;
  count: number;
}

const sumMonths = (row: number[], months: number[]) => months.reduce((a, m) => a + row[m], 0);
/** cp value over months, for one category or all */
export function cpValue(c: ChannelPartner, kind: "cy" | "ly" | "tgt", months: number[], cat?: CategoryId | null, pack?: number | null) {
  const cats = cat ? [CATEGORIES.findIndex((x) => x.id === cat)] : [0, 1, 2, 3];
  let v = 0;
  for (const ci of cats) v += sumMonths(c[kind][ci], months) * (pack != null ? CATEGORIES[ci].split[pack] : 1);
  return v;
}

/** RSTAB redistributes the H1 shortfall evenly across the six H2 months (reference rstabStateAdj). */
function rstabAdj(cps: ChannelPartner[], months: number[], cat?: CategoryId | null, pack?: number | null) {
  const h2 = months.filter((m) => m >= 6).length;
  if (!h2) return 0;
  const H1 = [0, 1, 2, 3, 4, 5];
  let t = 0;
  let a = 0;
  for (const c of cps) {
    t += cpValue(c, "tgt", H1, cat, pack);
    a += cpValue(c, "cy", H1, cat, pack);
  }
  return ((t - a) / 6) * h2;
}

export function targetOf(cps: ChannelPartner[], months: number[], plan: PlanId, cat?: CategoryId | null, pack?: number | null) {
  let t = 0;
  for (const c of cps) t += cpValue(c, "tgt", months, cat, pack);
  if (plan === "stretch") t *= 1.1;
  if (plan === "rstab") t = Math.max(0, t + rstabAdj(cps, months, cat, pack));
  return t;
}

export function calcGrowth(ly: number, cy: number) {
  return ly > 0 ? ((cy - ly) / ly) * 100 : null;
}

export interface AggOpts {
  months: number[];
  gm: number[] | null;
  plan: PlanId;
  cat?: CategoryId | null;
  pack?: number | null;
  /** growth over existing partners only (new partners have no LY base) */
  existingOnlyGrowth?: boolean;
  /** retailers: target is the linked distributor target × (1 + margin), split by category share */
  targetOverride?: number | null;
}
export function aggregate(cps: ChannelPartner[], o: AggOpts): Agg {
  let sales = 0;
  let cyG = 0;
  let ly = 0;
  let active = 0;
  let billing = 0;
  let billTarget = 0;
  for (const c of cps) {
    const s = cpValue(c, "cy", o.months, o.cat, o.pack);
    sales += s;
    if (o.gm && (!o.existingOnlyGrowth || !c.isNew)) {
      cyG += cpValue(c, "cy", o.gm, o.cat, o.pack);
      ly += cpValue(c, "ly", o.gm, o.cat, o.pack);
    }
    if (c.operating) {
      active++;
      billTarget += bpTargetFor(c);
      if (s > 0) billing++;
    }
  }
  const target = o.targetOverride !== undefined ? o.targetOverride : targetOf(cps, o.months, o.plan, o.cat, o.pack);
  return {
    sales,
    target: target && target > 0 ? target : target === 0 ? null : target,
    ly: o.gm ? ly : null,
    cyG,
    growth: o.gm ? calcGrowth(ly, cyG) : null,
    active,
    billing,
    billTarget: Math.round(billTarget),
    count: cps.length,
  };
}

export const achPct = (a: { sales: number; target: number | null }) => (a.target && a.target > 0 ? (a.sales / a.target) * 100 : null);

/** Balance-to-year-end run-rate, always on a YTD basis whatever the period (reference rstabFor). */
export interface Rstab {
  annual: number;
  ytdActual: number;
  remaining: number;
  remMonths: number;
  planned: number;
  current: number;
  incPct: number | null;
}
export function rstabOf(cps: ChannelPartner[], plan: PlanId, cat?: CategoryId | null, pack?: number | null, override?: { annual: number; remaining: number }): Rstab | null {
  const completed = ALL.slice(0, CUR);
  const rem = ALL.slice(CUR);
  const annual = override ? override.annual : targetOf(cps, ALL, plan, cat, pack);
  const remaining = override ? override.remaining : targetOf(cps, rem, plan, cat, pack);
  if (!(annual > 0)) return null;
  let ytd = 0;
  for (const c of cps) ytd += cpValue(c, "cy", completed, cat, pack);
  const planned = remaining / rem.length;
  const current = Math.max(annual - ytd, 0) / rem.length;
  return { annual, ytdActual: ytd, remaining, remMonths: rem.length, planned, current, incPct: planned > 0 ? (current / planned - 1) * 100 : null };
}

// ---------------------------------------------------------------------------
// Status colours (DESIGN.md semantic colours only)
// ---------------------------------------------------------------------------

export type Rag3 = "green" | "amber" | "red" | "na";
export const RAG_COLOR: Record<Rag3, string> = { green: "#2fa85c", amber: "#e0b43a", red: "#d64550", na: "rgb(var(--cx-faint))" };
export const RAG_LABEL: Record<Rag3, string> = { green: "Green", amber: "Amber", red: "Red", na: "NA" };

/** Achievement colour on the performance tables: MTD against the day curve, other periods 100 / 90. */
export function achRag(pct: number | null, period: PeriodId): Rag3 {
  if (pct == null || !isFinite(pct)) return "na";
  if (period === "mtd") {
    const e = EXPECTED_TODAY;
    return pct >= e ? "green" : pct >= e * 0.9 ? "amber" : "red";
  }
  return pct >= 100 ? "green" : pct >= 90 ? "amber" : "red";
}
/** Billing participation: actual BP against target BP (× the day curve for MTD). */
export function bpRag(billing: number, billTarget: number, period: PeriodId): Rag3 {
  if (!billTarget) return "na";
  const pct = (billing / billTarget) * 100;
  return achRag(pct, period);
}

// ---------------------------------------------------------------------------
// Evidence: where a number came from
// ---------------------------------------------------------------------------

export interface Evidence {
  title: string;
  value: string;
  source: string;
  period: string;
  included: string[];
  excluded: string[];
  formula?: string;
  /** shows the day-of-month curve the colour was judged against */
  curve?: boolean;
}

// ---------------------------------------------------------------------------
// Number formatting (₹ lakh, crore above 100 L)
// ---------------------------------------------------------------------------

export function fmtL(n: number | null | undefined) {
  if (n == null || !isFinite(n)) return "–";
  const a = Math.abs(n);
  if (a >= 100) return `₹${(n / 100).toFixed(2)} Cr`;
  if (a >= 10) return `₹${n.toFixed(1)} L`;
  return `₹${n.toFixed(2)} L`;
}
export const fmtPct = (n: number | null | undefined, d = 1) => (n == null || !isFinite(n) ? "NA" : `${n.toFixed(d)}%`);
export const fmtN = (n: number | null | undefined) => (n == null || !isFinite(n) ? "NA" : Math.round(n).toLocaleString("en-IN"));

// ---------------------------------------------------------------------------
// Tertiary (applicator) sales, BDE level — no CP or LY fields, so growth and billing are NA
// ---------------------------------------------------------------------------

export interface BdeRow {
  code: string;
  role: "BDE" | "BDE – Applicator";
  name: string;
  territory: string;
  monthlyTarget: number;
  months: number[];
  leadTgt: number;
  leadAch: number;
  oppValue: number;
  converted: number;
}
/** From Data 12 - Influencer Data: onboarding target / achieved as leads, activation as converted. No sales value. */
export const BDES = Th<BdeRow[]>("BDES");

// ---------------------------------------------------------------------------
// Non-Trade lead pipeline (LMS). No personal data is shown: no contacts or mobiles.
// ---------------------------------------------------------------------------

export interface Lead {
  id: string;
  territory: string;
  site: string;
  projectType: "Residential" | "Commercial" | "Infra";
  stage: "Open" | "Closed";
  status: "Hot" | "Warm" | "Cold";
  amount: number;
  source: string;
  date: string;
}
/** No LMS leads in the workbook. */
export const LEADS = Th<Lead[]>("LEADS");

// ---------------------------------------------------------------------------
// Initiative inputs, per territory (stand-ins for the reference's lever sheets)
// ---------------------------------------------------------------------------

export interface TerrLevers {
  territory: string;
  // ordering app (Bandhan): distributors per cadence slab and how many met it
  appSlabs: { label: string; days: number; target: number; met: number; billedOnce: number }[];
  secondary: number;
  // beat-plan adherence (DRCP)
  execs: { role: "Sales Officer" | "Territory Sales Exec"; count: number; above6: number }[];
  visitsPerDay: number;
  cpNorm: { type: "Distributor" | "Dealer" | "Retailer"; target: number; met: number; metOnce: number }[];
  // SFA order taking
  cpsVisited: number;
  cpsOrdered: number;
  invoiced: number;
  totalSecondary: number;
  productiveVisits: number;
  totalVisits: number;
  // applicator programme
  appl: { kpi: string; target: number; ach: number }[];
  // recruitment
  hc: { division: Sector; total: number; onGround: number; offered: number; pipeline: number }[];
  // training
  training: { role: string; hc: number; basicTgt: number; basicDone: number; interTgt: number | null; interDone: number | null }[];
  // degrowing targets (end of Sep, Oct)
  degrowTgt: { dealer: [number, number]; retailer: [number, number] };
  // dealer scheme (FTS)
  scheme: { reward: string; customers: number; achieved: number; salesTgt: number; salesAch: number }[];
}

/** 14a. Loyalty program structure: tiers and their trips. */
export const SCHEME_REWARDS = Th<string[]>("SCHEME_REWARDS");

/** Per-territory initiative inputs: visits, orders, secondary sales, SO headcount, influencer KPIs (Data 12) and
 *  loyalty slabs (14a/14c) from the workbook. Ordering-app slabs, training, recruitment pipeline and de-growth
 *  targets are not in the workbook and are 0. */
export const LEVERS = Th<Record<string, TerrLevers>>("LEVERS");

// ---------------------------------------------------------------------------
// Weekly score history (stands in for the reference's Scoring sheet)
// ---------------------------------------------------------------------------

export const SCORE_WEEKS = ["W1 Aug", "W2 Aug", "W3 Aug", "W4 Aug", "W1 Sep", "W2 Sep", "W3 Sep"];
/** No weekly score history in the workbook: the trend is flat at the current score. */
export function scoreHistory(_group: string, current: number, max: number) {
  return SCORE_WEEKS.map((label) => ({ label, value: Math.max(0, Math.min(max, current)) }));
}
