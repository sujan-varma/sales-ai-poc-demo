// Thermometer: Bondex demo data and the calculations ported from the reference build
// (index_v8.html). Nothing here is uploaded or edited; it stands in for what Sales AI
// fetches from SFA and DMS. Every figure is generated from a seeded set of channel partners,
// so the Performance, Scorecard and Recommendations tabs always agree.
//
// Bondex mapping (docs/Thermometer — Build Prompt Review.md, §2):
//   DBA / RBA / Retailer        → Distributor / Dealer / Retailer (same size bands)
//   Trade / Projects / Stone    → Trade / Non-Trade (Stone dropped)
//   Adhesive types / SP100 / …  → IWC, Repair Polymer, Acrylic Primer, Waterproofing Compound → pack sizes
//   India-1 / India-2 / zones   → Gujarat regions (Head of Sales) or Saurashtra territories (ASM)
//   2600 / 3000 / RSTAB budget  → Plan / Stretch / RSTAB

import { REGIONS } from "./leadership";

// ---------------------------------------------------------------------------
// Calendar: Bondex runs an April financial year. Data is synced through 29 Sep 2026.
// ---------------------------------------------------------------------------

export const FY_MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"] as const;
export type MonthName = (typeof FY_MONTHS)[number];
/** index of the current month (Sep) in FY_MONTHS */
export const CUR = 5;
export const AS_OF = { day: 29, days: 30, label: "29 Sep 2026" };
export const SYNC_NOTE = "From SFA and DMS · synced 29 Sep, 08:00";
export const FY_LABEL = "FY 2026–27";
const ALL = FY_MONTHS.map((_, i) => i);

/** Day-of-month expected achievement curve (reference SC_DAY_CURVE): % of the month's target expected by each day. */
const DAY_CURVE = [0, 3, 5, 8, 10, 13, 15, 18, 20, 23, 25, 28, 30, 33, 35, 38, 40, 43, 45, 48, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
export function expectedFor(day: number, days: number) {
  if (day >= days) return 100;
  return DAY_CURVE[Math.max(1, Math.min(30, Math.ceil((day / days) * 30)))];
}
/** Expected MTD achievement today: 95% on 29 of 30. */
export const EXPECTED_TODAY = expectedFor(AS_OF.day, AS_OF.days);
export const DAY_CURVE_POINTS = Array.from({ length: AS_OF.days }, (_, i) => ({ day: i + 1, pct: expectedFor(i + 1, AS_OF.days) }));

// ---------------------------------------------------------------------------
// Periods, plan scenarios, filters
// ---------------------------------------------------------------------------

export type PeriodId = "mtd" | "ytd" | "prev" | "q" | "fy" | "bal";
export const PERIODS: { id: PeriodId; label: string; detail: string }[] = [
  { id: "mtd", label: "MTD", detail: "September to date (29 Sep)" },
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
  if (f.period === "mtd") return `MTD · Sep to 29th`;
  if (f.period === "ytd") return `YTD · ${span}`;
  if (f.period === "prev") return "Previous month · Aug";
  if (f.period === "q") return `${f.quarter} · ${span}`;
  if (f.period === "fy") return `Full year · ${span}`;
  return `Balance year · ${span}`;
}

// ---------------------------------------------------------------------------
// Products: four Bondex categories, each opening to its pack sizes
// ---------------------------------------------------------------------------

export const CATEGORIES = [
  { id: "iwc", name: "IWC", full: "Integral Waterproofing Compound", packs: ["200 ml", "1 L", "5 L"], split: [0.25, 0.45, 0.3] },
  { id: "rp", name: "Repair Polymer", full: "Repair Polymer", packs: ["1 L", "5 L", "20 L"], split: [0.3, 0.45, 0.25] },
  { id: "ap", name: "Acrylic Primer", full: "Acrylic Primer", packs: ["1 L", "4 L", "20 L"], split: [0.35, 0.4, 0.25] },
  { id: "wc", name: "Waterproofing Compound", full: "Waterproofing Compound", packs: ["1 kg", "5 kg", "20 kg"], split: [0.2, 0.45, 0.35] },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];
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

// Apr–Aug averages 1.0 so the de-growth check (Apr–Aug avg vs LY ÷ 12) isn't skewed by the monsoon
const SEASON = [1.1, 1.15, 0.95, 0.85, 0.95, 1.0, 1.05, 1.0, 0.9, 0.95, 1.0, 1.1];
const MIX: Record<CpType, number[]> = {
  distributor: [0.3, 0.25, 0.2, 0.25],
  dealer: [0.32, 0.22, 0.18, 0.28],
  retailer: [0.42, 0.14, 0.14, 0.3],
  project: [0.2, 0.36, 0.14, 0.3],
};
/** Value guideline for a new partner (₹ lakh / month), used as its target. */
export const VALUE_GUIDE: Record<CpType, number> = { distributor: 2, dealer: 0.4, retailer: 0.1, project: 0.3 };

/** Territory pace (CY vs LY) and plan uplift — set so the org shows a real spread. */
const PACE: Record<string, number> = {
  Bhavnagar: 0.98, Junagadh: 0.9, Amreli: 0.84, Rajkot: 1.12, Jamnagar: 0.95, Porbandar: 1.04,
  Sanand: 0.9, Dholka: 0.82, Viramgam: 0.96, Bavla: 0.88, Dhandhuka: 0.86,
  "Vadodara City": 1.16, Anand: 1.1, Nadiad: 1.08, Bharuch: 1.12, Godhra: 0.98, Dahod: 1.02,
  "Surat City": 1.06, Navsari: 1.0, Valsad: 0.94, Vapi: 1.1, Bardoli: 0.97, Vyara: 0.92,
  Maninagar: 1.08, Naroda: 1.02, Vastrapur: 1.12, Chandkheda: 1.05, Bopal: 1.14,
  Bhuj: 0.78, Gandhidham: 0.84, Anjar: 0.7, Mandvi: 0.76,
  Mehsana: 0.94, Palanpur: 0.86, Patan: 0.88, Himmatnagar: 0.98, Deesa: 0.9, Gandhinagar: 1.04,
};
/** Category-level shocks, matching what the homepage already says (Amreli Repair Polymer, Junagadh WP Compound). */
const CAT_PACE: Record<string, Partial<Record<CategoryId, number>>> = {
  Amreli: { rp: 0.62 },
  Junagadh: { wc: 0.78 },
  Anjar: { iwc: 0.82 },
  Dholka: { ap: 0.8 },
  Bopal: { wc: 1.15 },
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Shree", "Jay", "Om", "Sai", "Maruti", "Krishna", "Ambika", "Patel", "Shiv", "Gayatri", "Mahavir", "Sahjanand", "Navkar", "Balaji", "Umiya", "Khodiyar"];
const LAST: Record<CpType, string[]> = {
  distributor: ["Distributors", "Agencies", "Trading Co.", "Marketing", "Enterprise"],
  dealer: ["Hardware", "Paints & Hardware", "Building Solutions", "Sanitary Mart", "Traders"],
  retailer: ["Hardware Store", "Paint Point", "Tiles & Bath", "Building Mart", "Colour House", "Tiles Galaxy"],
  project: ["Infra", "Constructions", "Developers", "Builders", "Projects"],
};
const PREFIX: Record<CpType, string> = { distributor: "BXD", dealer: "BXK", retailer: "BXR", project: "BXP" };

function apptFor(type: CpType, isNew: boolean, r: () => number) {
  if (!isNew) {
    const y = 2016 + Math.floor(r() * 8);
    return `${y}-${String(1 + Math.floor(r() * 12)).padStart(2, "0")}-15`;
  }
  // distributors/dealers new from Nov 2025, retailers from Oct 2025, up to the current month
  const start = type === "retailer" ? { y: 2025, m: 10 } : { y: 2025, m: 11 };
  const span = type === "retailer" ? 12 : 11; // through Sep 2026
  const k = Math.floor(r() * span);
  const m0 = start.m - 1 + k;
  const y = start.y + Math.floor(m0 / 12);
  return `${y}-${String((m0 % 12) + 1).padStart(2, "0")}-${String(3 + Math.floor(r() * 24)).padStart(2, "0")}`;
}
/** FY month index the appointment falls in (negative = before this FY). */
function apptFyIdx(appt: string) {
  const [y, m] = appt.split("-").map(Number);
  return (y - 2026) * 12 + (m - 4);
}

function buildCps(): ChannelPartner[] {
  const out: ChannelPartner[] = [];
  let serial = 1000;
  for (const reg of REGIONS) {
    for (const terr of reg.territories) {
      const r = rng(hash(terr));
      const pace = PACE[terr] ?? 0.95;
      const uplift = 1.04 + r() * 0.05;
      const counts: Record<CpType, number> = {
        distributor: 2 + Math.floor(r() * 2),
        dealer: 6 + Math.floor(r() * 5),
        retailer: 16 + Math.floor(r() * 14),
        project: 2 + Math.floor(r() * 3),
      };
      (Object.keys(counts) as CpType[]).forEach((type) => {
        for (let i = 0; i < counts[type]; i++) {
          serial++;
          const newChance = type === "retailer" ? 0.2 : type === "project" ? 0.1 : 0.16;
          // every territory gets at least one new distributor and dealer, so expansion KPIs read
          const isNew = (i === counts[type] - 1 && (type === "distributor" || type === "dealer")) || r() < newChance;
          const appt = apptFor(type, isNew, r);
          const lyAvg = isNew
            ? 0
            : type === "distributor"
              ? 0.4 + Math.pow(r(), 1.5) * 5.2
              : type === "dealer"
                ? 0.1 + Math.pow(r(), 1.3) * 0.8
                : type === "retailer"
                  ? 0.02 + Math.pow(r(), 2.2) * 1.0
                  : 0.1 + r() * 0.5;
          const cpPace = pace * (0.8 + r() * 0.55);
          const operating = r() > 0.09;
          const startIdx = isNew ? Math.max(0, apptFyIdx(appt)) : -99;
          const mix = MIX[type].map((w) => w * (0.75 + r() * 0.5));
          const mixSum = mix.reduce((a, b) => a + b, 0);
          // months with no billing at all for this partner, more often for slower partners
          const gapMonth = FY_MONTHS.map(() => r() < (cpPace < 0.9 ? 0.2 : 0.1));
          const cy: number[][] = [];
          const ly: number[][] = [];
          const tgt: number[][] = [];
          CATEGORIES.forEach((cat, ci) => {
            const share = mix[ci] / mixSum;
            const catPace = CAT_PACE[terr]?.[cat.id] ?? 1;
            const lyRow: number[] = [];
            const cyRow: number[] = [];
            const tRow: number[] = [];
            FY_MONTHS.forEach((_, m) => {
              // last year had its own no-billing months too, so the two years compare like for like
              const lyv = r() < 0.1 ? 0 : lyAvg * share * SEASON[m] * (0.95 + r() * 0.24);
              lyRow.push(lyv);
              const base = isNew ? VALUE_GUIDE[type] * share * SEASON[m] : lyv;
              const active = !isNew || m >= startIdx;
              tRow.push(active ? (isNew ? base : lyAvg * share * SEASON[m] * uplift) : 0);
              if (m > CUR || !active || !operating) {
                cyRow.push(0);
                return;
              }
              const gap = gapMonth[m];
              const ramp = isNew ? (0.55 + r() * 0.9) * (type === "distributor" ? 1 : 1) : 1;
              let v = gap ? 0 : base * cpPace * catPace * ramp * (isNew ? 1 : 1);
              if (m === CUR) v *= (AS_OF.day / AS_OF.days) * (0.94 + r() * 0.08);
              cyRow.push(v);
            });
            ly.push(lyRow);
            cy.push(cyRow);
            tgt.push(tRow);
          });
          const name = `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[type][Math.floor(r() * LAST[type].length)]}`;
          out.push({
            code: `${PREFIX[type]}${serial}`,
            name: type === "retailer" && terr === "Junagadh" && i === 0 ? "Sai Ashirwad Tiles Galaxy" : `${name}, ${terr}`,
            type,
            region: reg.name,
            asm: reg.asm,
            territory: terr,
            appt,
            isNew,
            operating,
            lyAvg,
            cy,
            ly,
            tgt,
            linkedRetailers: type === "distributor" ? 8 + Math.floor(r() * 36) : undefined,
          });
        }
      });
    }
  }
  return out;
}

export const CPS: ChannelPartner[] = buildCps();

// ---------------------------------------------------------------------------
// Scope: which territories a persona sees
// ---------------------------------------------------------------------------

export type ThermoPersona = "asm" | "head";
export const ASM_REGION = REGIONS[0]; // Saurashtra, Raman

export interface Group {
  /** region name (Head of Sales) or territory (ASM) */
  name: string;
  sub: string;
  territories: string[];
}
export function groupsFor(p: ThermoPersona): Group[] {
  if (p === "head") return REGIONS.map((r) => ({ name: r.name, sub: r.asm, territories: r.territories }));
  return ASM_REGION.territories.map((t) => ({ name: t, sub: "Saurashtra", territories: [t] }));
}
export function scopeTerritories(p: ThermoPersona, f?: Pick<ThermoFilters, "region" | "territory">) {
  let t = p === "head" ? REGIONS.flatMap((r) => r.territories) : [...ASM_REGION.territories];
  if (f?.region) t = t.filter((x) => REGIONS.find((r) => r.name === f.region)?.territories.includes(x));
  if (f?.territory) t = t.filter((x) => x === f.territory);
  return t;
}
export const asmOf = (territory: string) => REGIONS.find((r) => r.territories.includes(territory))?.asm ?? "Raman";
export const regionOfTerr = (territory: string) => REGIONS.find((r) => r.territories.includes(territory))?.name ?? "Saurashtra";

// ---------------------------------------------------------------------------
// Size bands (fixed from LY average across all products)
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
function buildBdes(): BdeRow[] {
  const out: BdeRow[] = [];
  let n = 400;
  for (const reg of REGIONS)
    for (const t of reg.territories) {
      const r = rng(hash(`bde:${t}`));
      const k = 1 + Math.floor(r() * 2);
      for (let i = 0; i < k; i++) {
        n++;
        const tgt = 0.3 + r() * 0.8;
        const lvl = (PACE[t] ?? 0.95) * (0.7 + r() * 0.5);
        const lt = 12 + Math.floor(r() * 26);
        const la = Math.round(lt * (0.55 + r() * 0.6));
        out.push({
          code: `BDE-${n}`,
          role: i === 0 ? "BDE" : "BDE – Applicator",
          name: ["Kunal", "Dhruv", "Mitesh", "Jignesh", "Ravi", "Alpesh", "Nirav", "Ketan", "Hardik", "Paresh"][Math.floor(r() * 10)] + ` (${t})`,
          territory: t,
          monthlyTarget: tgt,
          months: FY_MONTHS.map((_, m) => (m > CUR ? 0 : tgt * lvl * (0.85 + r() * 0.3) * (m === CUR ? AS_OF.day / AS_OF.days : 1))),
          leadTgt: lt,
          leadAch: la,
          oppValue: la * (0.25 + r() * 0.5),
          converted: Math.round(la * (0.14 + r() * 0.24)),
        });
      }
    }
  return out;
}
export const BDES = buildBdes();

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
function buildLeads(): Lead[] {
  const out: Lead[] = [];
  let n = 7100;
  const SITES = ["Residency", "Heights", "Business Park", "Township", "Tower", "Mall", "Hospital block", "Warehouse"];
  for (const reg of REGIONS)
    for (const t of reg.territories) {
      const r = rng(hash(`lms:${t}`));
      const k = 4 + Math.floor(r() * 8);
      const lvl = r();
      for (let i = 0; i < k; i++) {
        n++;
        out.push({
          id: `L${n}`,
          territory: t,
          site: `${t} ${SITES[Math.floor(r() * SITES.length)]}`,
          projectType: (["Residential", "Commercial", "Infra"] as const)[Math.floor(r() * 3)],
          stage: r() < 0.8 ? "Open" : "Closed",
          status: r() < 0.25 + lvl * 0.45 ? "Hot" : r() < 0.6 ? "Warm" : "Cold",
          amount: 0.4 + r() * r() * 6 * (0.5 + lvl),
          source: ["Architect", "Builder", "Dealer", "Referral", "Website"][Math.floor(r() * 5)],
          date: `2026-0${4 + Math.floor(r() * 6)}-${String(1 + Math.floor(r() * 27)).padStart(2, "0")}`,
        });
      }
    }
  return out;
}
export const LEADS = buildLeads();

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

export const SCHEME_REWARDS = ["Dubai trip · 4N/5D", "Bangkok trip · 3N/4D", "Goa trip · 2N/3D", "Gold coin · 10 g", "Gift voucher · ₹25,000", "Credit note · 1%"];

function buildLevers(): Record<string, TerrLevers> {
  const out: Record<string, TerrLevers> = {};
  for (const reg of REGIONS)
    for (const t of reg.territories) {
      const r = rng(hash(`lev:${t}`));
      const p = PACE[t] ?? 0.95;
      const q = (lo: number, hi: number) => lo + r() * (hi - lo);
      const dists = CPS.filter((c) => c.territory === t && c.type === "distributor" && c.operating).length;
      const slabsDef = [
        { label: "> ₹5 L / month", days: 20 },
        { label: "₹3–5 L / month", days: 12 },
        { label: "₹1.5–3 L / month", days: 8 },
        { label: "< ₹1.5 L / month", days: 6 },
      ];
      const per = [0.2, 0.35, 0.3, 0.15];
      const primary = CPS.filter((c) => c.territory === t && c.type === "distributor").reduce((a, c) => a + cpValue(c, "cy", [CUR]), 0);
      out[t] = {
        territory: t,
        appSlabs: slabsDef.map((s, i) => {
          const target = Math.max(i === 0 ? 0 : 1, Math.round(dists * per[i] * 1.6 + r() * 1.4));
          const met = Math.min(target, Math.round(target * q(0.45, 1.05) * p));
          return { ...s, target, met, billedOnce: Math.min(target, met + Math.round(r() * (target - met + 1))) };
        }),
        secondary: primary * q(0.82, 1.32) * (1 + RETAILER_MARGIN),
        execs: [
          { role: "Sales Officer" as const, count: 2 + Math.floor(r() * 2), above6: 0 },
          { role: "Territory Sales Exec" as const, count: 1 + Math.floor(r() * 2), above6: 0 },
        ].map((e) => ({ ...e, above6: Math.min(e.count, Math.round(e.count * q(0.4, 1.05) * p)) })),
        visitsPerDay: q(4.2, 7.4) * Math.min(1.1, p + 0.05),
        cpNorm: (["Distributor", "Dealer", "Retailer"] as const).map((type) => {
          const target = CPS.filter((c) => c.territory === t && c.operating && CP_LABEL[c.type] === type).length;
          const met = Math.round(target * q(0.5, 1.02) * Math.min(1, p + 0.05));
          return { type, target, met: Math.min(target, met), metOnce: Math.min(target, met + Math.round(r() * (target - met))) };
        }),
        cpsVisited: Math.round(q(30, 70)),
        cpsOrdered: 0,
        invoiced: 0,
        totalSecondary: 0,
        productiveVisits: 0,
        totalVisits: Math.round(q(260, 520)),
        appl: [
          { kpi: "Applicator retention", target: Math.round(q(10, 22)), ach: 0 },
          { kpi: "New applicator activation", target: Math.round(q(6, 14)), ach: 0 },
          { kpi: "Contractor addition", target: Math.round(q(3, 9)), ach: 0 },
          { kpi: "Contractor activation", target: Math.round(q(3, 7)), ach: 0 },
        ].map((a) => ({ ...a, ach: Math.round(a.target * q(0.55, 1.15) * p) })),
        hc: [
          { division: "Trade" as Sector, total: 4 + Math.floor(r() * 3), onGround: 0, offered: 0, pipeline: 0 },
          { division: "Non-Trade" as Sector, total: 1 + Math.floor(r() * 2), onGround: 0, offered: 0, pipeline: 0 },
        ].map((h) => {
          const og = Math.max(1, h.total - (r() < 0.45 * (2 - p) ? 1 + Math.floor(r() * 2) : 0));
          const gap = h.total - Math.min(og, h.total);
          const offered = Math.min(gap, Math.floor(r() * (gap + 1)));
          return { ...h, onGround: Math.min(og, h.total), offered, pipeline: gap - offered };
        }),
        training: [
          { role: "ASM", hc: 0 },
          { role: "Sales Officer", hc: 2 + Math.floor(r() * 2) },
          { role: "Territory Sales Exec", hc: 1 + Math.floor(r() * 2) },
          { role: "BDE", hc: 1 },
          { role: "BDE – Applicator", hc: Math.floor(r() * 2) },
        ].map((x) => {
          const basicTgt = Math.max(0, x.hc - (r() < 0.25 ? 1 : 0));
          const basicDone = Math.min(basicTgt, Math.round(basicTgt * q(0.55, 1.05)));
          const inter = x.role === "Sales Officer" || x.role === "Territory Sales Exec" ? null : Math.max(0, basicTgt - (r() < 0.4 ? 1 : 0));
          return { ...x, basicTgt, basicDone, interTgt: inter, interDone: inter == null ? null : Math.min(inter, Math.round(inter * q(0.3, 1))) };
        }),
        degrowTgt: { dealer: [Math.round(q(1, 4)), Math.round(q(1, 3))], retailer: [Math.round(q(3, 9)), Math.round(q(2, 7))] },
        scheme: SCHEME_REWARDS.map((reward, i) => {
          const customers = Math.max(0, Math.round(q(0, 3) - i * 0.25));
          const achieved = Math.min(customers, Math.round(customers * q(0.3, 1) * p));
          const salesTgt = customers * q(1.5, 6) * (1.6 - i * 0.18);
          return { reward, customers, achieved, salesTgt, salesAch: salesTgt * q(0.55, 1.2) * p };
        }),
      };
      const o = out[t];
      o.cpsOrdered = Math.round(o.cpsVisited * q(0.38, 0.85));
      o.totalSecondary = o.secondary;
      o.invoiced = o.totalSecondary * q(0.16, 0.42);
      o.productiveVisits = Math.round(o.totalVisits * q(0.42, 0.78) * Math.min(1.05, p + 0.05));
      // the region's ASM sits in the first territory's headcount
      if (t === reg.territories[0]) o.training[0].hc = 1;
      o.training[0].basicTgt = o.training[0].hc;
      o.training[0].basicDone = o.training[0].hc ? (r() < 0.8 ? 1 : 0) : 0;
      o.training[0].interTgt = o.training[0].hc;
      o.training[0].interDone = o.training[0].hc ? (r() < 0.55 ? 1 : 0) : 0;
    }
  return out;
}
export const LEVERS = buildLevers();

// ---------------------------------------------------------------------------
// Weekly score history (stands in for the reference's Scoring sheet)
// ---------------------------------------------------------------------------

export const SCORE_WEEKS = ["W3 Jun", "W4 Jun", "W1 Jul", "W2 Jul", "W3 Jul", "W4 Jul", "W1 Aug", "W2 Aug", "W3 Aug", "W4 Aug", "W1 Sep", "W2 Sep", "W3 Sep"];
export function scoreHistory(group: string, current: number, max: number) {
  const r = rng(hash(`score:${group}`));
  const start = Math.max(2, current - 6 + Math.round(r() * 5));
  return SCORE_WEEKS.map((label, i) => {
    const t = i / (SCORE_WEEKS.length - 1);
    const v = Math.round(start + (current - start) * t + (r() - 0.5) * 4);
    return { label, value: Math.max(0, Math.min(max, v)) };
  });
}
