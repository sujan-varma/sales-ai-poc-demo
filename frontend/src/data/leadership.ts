// Leadership (Head of Sales) data. Types, helpers and Configuration settings live here; every data value comes
// from the backend (GET /api/web/bootstrap → "leadership"), built from the Excel workbook. See ./source.ts.

import { ActionStatus, AgentId, AgentRun, Confidence, FISCAL_YEAR, HEAD_PLAN_MONTHS, HealthGrid, TRACKER, VIEWER } from "./cortexHome";
import type { ActionTrace } from "./actionTraces";
import { D } from "./source";

export { FISCAL_YEAR, HEAD_PLAN_MONTHS };

const Ld = <T,>(key: string) => D<T>("leadership", key);

// ---------------------------------------------------------------------------
// Org structure
// ---------------------------------------------------------------------------

export interface Region {
  name: string;
  asm: string;
  initials: string;
  territories: string[];
  /** current month target and achieved to date, ₹ lakh */
  sepEstimateL: number;
  sepAchievedL: number;
}

export const REGIONS = Ld<Region[]>("REGIONS");

export const TERRITORY_COUNT = REGIONS.reduce((n, r) => n + r.territories.length, 0);

export function regionOf(territory: string) {
  return REGIONS.find((r) => r.territories.includes(territory) || r.name === territory) ?? REGIONS[0];
}

// ---------------------------------------------------------------------------
// Territory Health — regions, each opening to its territories
// ---------------------------------------------------------------------------

const COLS = ["Revenue", "Coverage", "Collection", "Stock", "Pricing"];

export const ORG_HEALTH = Ld<HealthGrid>("ORG_HEALTH");

/** Territory rows under each region. */
export const ORG_TERRITORY_ROWS = Ld<Record<string, HealthGrid["rows"]>>("ORG_TERRITORY_ROWS");

/** Weakest of all territories — same scoring as the ASM screen's weakest(). */
export function weakestTerritory() {
  const all = Object.entries(ORG_TERRITORY_ROWS).flatMap(([region, rows]) => rows.map((row) => ({ region, row })));
  const scored = all.map((x) => ({
    ...x,
    score: x.row.cells.reduce((n, c) => n + (4 - c.level), 0),
    critical: x.row.cells.filter((c) => c.level === 0).length,
    worst: x.row.cells.reduce((a, c, i) => (c.level < x.row.cells[a].level ? i : a), 0),
  }));
  scored.sort((a, b) => b.score - a.score || b.critical - a.critical);
  const w = scored[0];
  return { name: w.row.name, region: w.region, asm: regionOf(w.region).asm, row: w.row, metric: COLS[w.worst], cell: w.row.cells[w.worst], critical: w.critical };
}

/** Which territory was weakest org-wide in each month (KPI detail). */
export const ORG_WEAKEST_BY_MONTH = Ld<{ month: string; name: string; why: string }[]>("ORG_WEAKEST_BY_MONTH");

// ---------------------------------------------------------------------------
// KPI figures (org-wide)
// ---------------------------------------------------------------------------

export const ORG_ACTIONS = TRACKER.head;

// ---------------------------------------------------------------------------
// Sales AI Needs a Decision — above the thresholds set in Configuration
// ---------------------------------------------------------------------------

export interface DecisionOption {
  id: string;
  label: string;
  recommended?: boolean;
  /** what happens, as the ASM will see it */
  outcome: string;
}

export interface Decision {
  id: string;
  n: number;
  question: string;
  context: string;
  region: string;
  territory: string;
  asm: string;
  raised: string;
  stake: string;
  recommendation: string;
  thresholdId: ThresholdId;
  thresholdLabel: string;
  options: DecisionOption[];
  run: AgentRun;
  confidence: Confidence;
}

export const DECISIONS = Ld<Decision[]>("DECISIONS");

/** How Sales AI arrived at each decision's suggested answer (the "Suggested" trace). */
export const DECISION_TRACES = Ld<Record<string, ActionTrace>>("DECISION_TRACES");

// ---------------------------------------------------------------------------
// Date range — one filter in the top bar governs every date-scoped section
// ---------------------------------------------------------------------------

export type RangeId = "today" | "week" | "month" | "fy";

export const RANGES = Ld<{ id: RangeId; label: string; detail: string; phrase: string }[]>("RANGES");

export interface RangeFigures {
  achievedL: number;
  estimateL: number;
  actions: { total: number; done: number; progress: number; delayed: number; unassigned: number };
}

export const RANGE_DATA = Ld<Record<RangeId, RangeFigures>>("RANGE_DATA");

/** Current-month actions per region. Other ranges scale from these shares. */
export const REGION_ACTIONS = Ld<Record<string, { total: number; done: number; progress: number; delayed: number; unassigned: number }>>("REGION_ACTIONS");

// ---------------------------------------------------------------------------
// Activity — dated records from the workbook (visits, orders, payments) and the data sync
// ---------------------------------------------------------------------------

export type TriggerKind = "scheduled" | "event" | "explicit";
export type Destination = "Tracker" | "Market Action Plan" | "Pitch" | "Initiatives";

export const TRIGGER_LABEL: Record<TriggerKind, string> = {
  scheduled: "Scheduled",
  event: "Automatic event",
  explicit: "Explicit action",
};

export interface ActivityEntry {
  id: string;
  day: string;
  at: string;
  trigger: TriggerKind;
  /** the agent the input came in through */
  source: AgentId;
  /** what arrived: "Visit logs", "Distributor orders"… */
  what: string;
  region: string;
  territory?: string;
  chain: { agent: AgentId; did: string }[];
  routes: { to: Destination; n: number }[];
  /** decision number this entry sent to the Head of Sales */
  decision?: number;
}

export const ACTIVITY_DAYS = Ld<{ key: string; label: string; short: string }[]>("ACTIVITY_DAYS");

/** Every entry, newest day first, each day morning to night. */
export const ACTIVITY = Ld<ActivityEntry[]>("ACTIVITY");
/** Inputs that arrive while the homepage is open. */
export const LIVE_QUEUE = Ld<ActivityEntry[]>("LIVE_QUEUE");

export const TODAY_ACTIVITY = Ld<ActivityEntry[]>("TODAY_ACTIVITY");
export const LIVE_ENTRY_ID = Ld<string>("LIVE_ENTRY_ID");
/** actions an entry routed on its own (initiatives are merges, not new actions) */
export const entryActions = (e: ActivityEntry) => e.routes.filter((r) => r.to !== "Initiatives").reduce((n, r) => n + r.n, 0);

// ---------------------------------------------------------------------------
// Roll-up Action Log
// ---------------------------------------------------------------------------

export const TOOL_COUNTS: { agent: AgentId | "churn"; tool: string; n: number }[] = [
  { agent: "thermometer", tool: "Thermometer", n: TRACKER.head.bySource.thermometer },
  { agent: "map", tool: "Market Action Planner", n: TRACKER.head.bySource.map },
  { agent: "huddle", tool: "Huddle", n: TRACKER.head.bySource.huddle },
  { agent: "pitch", tool: "Pitch", n: TRACKER.head.bySource.pitch },
  { agent: "churn", tool: "Churn", n: 0 },
];

export const ROLLUP = Ld<{
  month: string;
  actions: number;
  duplicatesMerged: number;
  initiatives: number;
  accepted: number;
  rejected: number;
  rejectedWhy: string;
  completed: number;
  wip: number;
  plannedL: number;
  achievedL: number;
}>("ROLLUP");

export interface RollupTheme {
  theme: string;
  initiatives: number;
  accepted: number;
  completed: number;
  plannedL: number;
  achievedL: number;
  note: string;
}

export const ROLLUP_THEMES = Ld<RollupTheme[]>("ROLLUP_THEMES");

// ---------------------------------------------------------------------------
// Priority-tiered log — open actions, ranked
// ---------------------------------------------------------------------------

export interface TierItem {
  id: string;
  title: string;
  territory: string;
  region: string;
  owner: string;
  source: AgentId;
  status: Exclude<ActionStatus, "done">;
  impact: string;
  due: string;
}

export const TIERS = [
  { n: 1, label: "Critical", desc: "Revenue or credit at risk this week" },
  { n: 2, label: "High", desc: "Large gap, or high-risk credit" },
  { n: 3, label: "Elevated", desc: "Coverage or supply slipping" },
  { n: 4, label: "Standard", desc: "Target gap, due this month" },
  { n: 5, label: "Low", desc: "Credit limit watch" },
  { n: 6, label: "Watch", desc: "Loyalty and other small pushes" },
] as const;

export const TIER_ITEMS: Record<number, TierItem[]> = Object.fromEntries(
  Object.entries(Ld<Record<string, TierItem[]>>("TIER_ITEMS")).map(([k, v]) => [Number(k), v])
);

// ---------------------------------------------------------------------------
// Action Impact Metrics
// ---------------------------------------------------------------------------

export interface ImpactRow {
  action: string;
  count: number;
  desired: string;
  achieved: string;
  /** 0–100 */
  score: number;
  lastMonth: number;
  change: string;
}

export const IMPACT_ROWS = Ld<ImpactRow[]>("IMPACT_ROWS");
export const IMPACT_CONFIDENCE = Ld<Confidence>("IMPACT_CONFIDENCE");

// ---------------------------------------------------------------------------
// Rolled-up ASM content
// ---------------------------------------------------------------------------

export interface LeadInsight {
  id: string;
  headline: string;
  region: string;
  /** ASMs this could go to (leadership assigns only to ASMs) */
  asms: string[];
  from: string;
  agent: AgentId;
  when: string;
  confidence: Confidence;
}

export const LEAD_INSIGHTS_SUMMARY = Ld<string>("LEAD_INSIGHTS_SUMMARY");
export const LEAD_INSIGHTS = Ld<LeadInsight[]>("LEAD_INSIGHTS");

export interface PlanInitiative {
  title: string;
  territory: string;
  detail: string;
  valueL: number;
  status: "done" | "progress" | "delayed";
}

export interface PlanReview {
  region: string;
  asm: string;
  estimateL: number;
  achievedL: number;
  initiatives: PlanInitiative[];
  tickets: { id: string; text: string; state: string }[];
}

export const PLAN_REVIEWS = Ld<PlanReview[]>("PLAN_REVIEWS");

export type Rag = "red" | "amber" | "green";

export interface ScorecardRow {
  region: string;
  asm: string;
  rag: Rag;
  open: number;
  /** % of the region's retailers visited in the last 7 days */
  actioned48: number;
  resolved: number;
  top: string;
}

export const SCORECARD = Ld<ScorecardRow[]>("SCORECARD");

// ---------------------------------------------------------------------------
// Configuration (app settings — not workbook data)
// ---------------------------------------------------------------------------

export interface NumberSetting {
  id: string;
  kind: "number";
  label: string;
  help: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
}
export interface ToggleSetting {
  id: string;
  kind: "toggle";
  label: string;
  help: string;
  value: boolean;
}
export interface ChoiceSetting {
  id: string;
  kind: "choice";
  label: string;
  help: string;
  value: string;
  options: string[];
}
export type PlatformSetting = NumberSetting | ToggleSetting | ChoiceSetting;

export const PLATFORM_SETTINGS: PlatformSetting[] = [
  { id: "beats", kind: "number", label: "Beats per sales officer per week", help: "The national standard. Every officer's weekly beat plan is built to this number.", value: 8, min: 4, max: 14, step: 1, unit: "beats" },
  { id: "visits", kind: "number", label: "Minimum outlet visits per beat", help: "Beats with fewer visits show as under-covered in Territory Health.", value: 12, min: 6, max: 25, step: 1, unit: "visits" },
  { id: "stock", kind: "number", label: "Stock cover alert", help: "Thermometer raises a signal when a top outlet's cover drops below this.", value: 10, min: 3, max: 30, step: 1, unit: "days" },
  { id: "overdue", kind: "number", label: "Collection overdue signal", help: "Invoices older than this become a Thermometer signal.", value: 30, min: 15, max: 90, step: 5, unit: "days" },
  { id: "huddle", kind: "toggle", label: "Decode huddles when they end on schedule", help: "Sales AI starts on the transcript as soon as a scheduled huddle ends, without anyone asking.", value: true },
  { id: "pitch-auto", kind: "choice", label: "Auto-push plan initiatives to Pitch", help: "When an ASM's plan is agreed, initiatives at or above this priority go to Pitch on their own. The rest are suggested in Pitch for the ASM to confirm.", value: "High priority only", options: ["High priority only", "High and Medium", "Never, always ask"] },
  { id: "sync", kind: "choice", label: "Cross-tool sync", help: "How often Sales AI merges actions from all tools into state-level initiatives.", value: "Every 4 hours", options: ["Every 2 hours", "Every 4 hours", "Twice a day", "Once a day"] },
];

export type ThresholdId = "collection" | "credit" | "price" | "people" | "scheme" | "plan" | "confidence";

export interface Threshold {
  id: ThresholdId;
  area: string;
  metric: string;
  /** "below": Sales AI decides up to the value · "above": Sales AI decides from the value up · "always": always escalates */
  mode: "below" | "above" | "always";
  value: number;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
  last30: { auto: number; escalated: number };
  /** the open decision this threshold sent up, and where it sits on the scale */
  pending?: { decision: number; at: number; label: string };
}

const PENDING = Ld<Partial<Record<ThresholdId, { decision: number; at: number; label: string }>>>("THRESHOLD_PENDING");
const withPending = (t: Omit<Threshold, "pending">): Threshold => (PENDING[t.id] ? { ...t, pending: PENDING[t.id] } : t);

export const THRESHOLDS: Threshold[] = [
  withPending({ id: "collection", area: "Collections", metric: "Payout hold exposure", mode: "below", value: 2, min: 0, max: 60, step: 0.5, fmt: (v) => `₹${v}L`, last30: { auto: 0, escalated: PENDING.collection ? 1 : 0 } }),
  withPending({ id: "credit", area: "Credit", metric: "Credit period offered to retailers", mode: "below", value: 30, min: 15, max: 60, step: 5, fmt: (v) => `${v} days`, last30: { auto: 0, escalated: PENDING.credit ? 1 : 0 } }),
  withPending({ id: "price", area: "Pricing", metric: "Change to list price", mode: "below", value: 0, min: 0, max: 10, step: 0.5, fmt: (v) => (v === 0 ? "No change" : `${v}%`), last30: { auto: 0, escalated: PENDING.price ? 1 : 0 } }),
  withPending({ id: "scheme", area: "Schemes", metric: "Scheme budget per region, per month", mode: "below", value: 3, min: 0, max: 10, step: 0.5, fmt: (v) => `₹${v}L`, last30: { auto: 0, escalated: 0 } }),
  withPending({ id: "plan", area: "Plans", metric: "Target revision on a live plan", mode: "below", value: 5, min: 0, max: 20, step: 1, fmt: (v) => `±${v}%`, last30: { auto: 0, escalated: 0 } }),
  withPending({ id: "confidence", area: "All areas", metric: "Minimum confidence to act alone", mode: "above", value: 70, min: 50, max: 95, step: 5, fmt: (v) => `${v}%`, last30: { auto: 0, escalated: 0 } }),
  withPending({ id: "people", area: "People", metric: "Moving sales officers across ASMs", mode: "always", value: 0, min: 0, max: 0, step: 0, fmt: () => "Always", last30: { auto: 0, escalated: PENDING.people ? 1 : 0 } }),
];

/** No configuration history in the workbook; this starts empty apart from the defaults being set. */
export const CONFIG_HISTORY = [{ when: "Defaults", who: VIEWER.head.name, what: "Thresholds set to the platform defaults" }];

// ---------------------------------------------------------------------------
// Orchestration story — the Head of Sales homepage's live animation. A representative chain told one stage at a
// time; the Activity Log stays the accurate, concurrent record. The counts come from the workbook's last data day
// (SO visits, distributor orders, open signals, the weakest territory's projection).
// ---------------------------------------------------------------------------

export type StoryIcon = "sfa" | "tracker-thermo" | "map" | "thermometer" | "leadership";

export interface StoryStage {
  icon: StoryIcon;
  /** who is acting, shown above the caption */
  actor: string;
  /** while live: what it's doing right now */
  doing: string;
  /** once done: what it did */
  did: string;
}

export interface StoryRun {
  id: string;
  what: string;
  where: string;
  startedAt: string;
  finishedAt: string;
  stages: StoryStage[];
}

/** In progress when the homepage opens: the latest sync, for the default ASM's region. */
export const LIVE_STORY = Ld<StoryRun>("LIVE_STORY");

/** Shown when nothing is running: the previous complete run, across all regions. */
export const LAST_STORY = Ld<StoryRun>("LAST_STORY");
