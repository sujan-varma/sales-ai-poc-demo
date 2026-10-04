// ASM / Sales Head homepage data. Types and UI configuration live here; every data value comes from the
// backend (GET /api/web/bootstrap → "cortexHome"), built from the Excel workbook. See ./source.ts.

import { D } from "./source";

export type AgentId = "huddle" | "thermometer" | "map" | "pitch";
export type ActionStatus = "done" | "progress" | "delayed" | "unassigned";
export type ViewerRole = "asm" | "head";

const C = <T,>(key: string) => D<T>("cortexHome", key);

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  stat: string;
  color: string;
}

const AGENT_STATS = C<Record<AgentId, string>>("AGENT_STATS");

export const AGENTS: Record<AgentId, Agent> = {
  huddle: { id: "huddle", name: "Huddle", role: "Meeting intelligence", description: "Calls, huddles and reviews, distilled into findings.", stat: AGENT_STATS.huddle, color: "#4f96ef" },
  thermometer: { id: "thermometer", name: "Thermometer", role: "Performance signals", description: "Live signals and the actions they call for.", stat: AGENT_STATS.thermometer, color: "#e85a70" },
  map: { id: "map", name: "Market Action Plan", role: "Territory planning", description: "One monthly plan across all your territories.", stat: AGENT_STATS.map, color: "#9a7cf0" },
  pitch: { id: "pitch", name: "Pitch", role: "Customer conversations", description: "What retailers and dealers tell your team on visits.", stat: AGENT_STATS.pitch, color: "#7ca324" },
};

export const AGENT_ORDER: AgentId[] = ["huddle", "thermometer", "map", "pitch"];

export const STATUS_META: Record<ActionStatus, { label: string; color: string }> = {
  done: { label: "Completed", color: "#2fa85c" },
  progress: { label: "In progress", color: "#a1a1aa" },
  delayed: { label: "Delayed", color: "#c28a12" },
  unassigned: { label: "Unassigned", color: "#52525b" },
};

// ---------------------------------------------------------------------------
// Confidence — every AI-generated item carries one of these
// ---------------------------------------------------------------------------

export interface EvidenceSource {
  agent: AgentId;
  title: string;
  detail: string;
  when: string;
  ageHours: number;
  /** false = context only, did not independently corroborate the conclusion */
  independent: boolean;
}

export interface Confidence {
  score: number;
  rationale: string;
  factors: { corroboration: number; freshness: number; reliability: number };
  sources: EvidenceSource[];
  rescoredAt: string;
}

// ---------------------------------------------------------------------------
// Viewer context
// ---------------------------------------------------------------------------

type Viewer = { name: string; initials: string; role: string; scope: string; greeting: string };
export const VIEWER = C<{ asm: Viewer; head: Viewer; exec: Viewer }>("VIEWER");

export const TODAY_LABEL = C<string>("TODAY_LABEL");
export const SYNC_LABEL = C<string>("SYNC_LABEL");
export const TERRITORIES = C<string[]>("TERRITORIES");
/** days left in the current month after the data date, and the data date's day of month */
export const DAYS_LEFT = C<number>("DAYS_LEFT");
export const DATA_DAY = C<number>("DATA_DAY");
/** the workbook's data date, "YYYY-MM-DD" */
export const DATA_AS_OF = C<string>("DATA_AS_OF");

/** The backend's confidence rule: base + perSheet × workbook sheets behind an item, capped; freshness is the data's age. */
const CONF_RULE = C<{ base: number; perSheet: number; max: number; freshness: number; dataLabel: string }>("CONF_RULE");
export const scoreFrom = (sheets: number) => Math.min(CONF_RULE.max, CONF_RULE.base + CONF_RULE.perSheet * sheets);
/** A confidence scored by that rule: one point per independent workbook sheet among the sources. */
export function confFromSources(rationale: string, sources: EvidenceSource[]): Confidence {
  const ind = sources.filter((s) => s.independent).length;
  const score = scoreFrom(ind);
  return {
    score,
    rationale,
    factors: { corroboration: Math.round(Math.min(0.95, 0.45 + 0.15 * ind) * 100) / 100, freshness: CONF_RULE.freshness, reliability: score / 100 },
    sources,
    rescoredAt: CONF_RULE.dataLabel,
  };
}
/** An evidence source that is a workbook sheet, dated with the data date. */
export const sheetSrc = (agent: AgentId, sheet: string, detail: string, independent = true): EvidenceSource => ({
  agent,
  title: sheet,
  detail,
  when: `Excel · ${CONF_RULE.dataLabel}`,
  ageHours: 24,
  independent,
});

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

export interface Insight {
  id: string;
  /** the territory it is about — the "View all" drawer filters on it */
  territory: string;
  headline: string;
  body: string;
  origin: { agent: AgentId; when: string };
  connects: { label: string; target: string; agent: AgentId }[];
  confidence: Confidence;
  /** computed from the data date's own records — the card marks it so new work is findable at a glance */
  isNew?: boolean;
}

export const INSIGHTS_SUMMARY = C<{ short: string; text: string; confidence: Confidence }>("INSIGHTS_SUMMARY");
export const INSIGHTS = C<Insight[]>("INSIGHTS");

// ---------------------------------------------------------------------------
// Action Tracker
// ---------------------------------------------------------------------------

export interface TrackerAttention {
  id: string;
  where: string;
  action: string;
  detail: string;
  status: ActionStatus;
  source: AgentId;
  owner?: string;
}

export interface TrackerData {
  scopeLabel: string;
  total: number;
  counts: Record<ActionStatus, number>;
  bySource: Record<AgentId, number>;
  attention: TrackerAttention[];
  dots: WeekDot[];
}

export interface WeekDot {
  agent: AgentId;
  day: number; // 0..6 → WEEK_DAYS
  hour: number; // 0..24
  status: ActionStatus;
  label: string;
}

export const WEEK_DAYS = C<string[]>("WEEK_DAYS");
export const TRACKER = C<Record<ViewerRole, TrackerData>>("TRACKER");

// ---------------------------------------------------------------------------
// Thermometer recommendations
// ---------------------------------------------------------------------------

export type SignalType = "Collection" | "Coverage" | "Revenue" | "Stock" | "Pricing";

export interface Recommendation {
  id: string;
  n: number;
  territory: string;
  signal: SignalType;
  title: string;
  why: string;
  impactL: number; // ₹ lakh
  impactLabel: string;
  /** Who a "Send to Pitch" would prioritise on the next visit. */
  pitchFor: string;
  product: string;
  sector: string;
  segment: string;
  /** the workbook retailers behind the recommendation */
  outlets: number;
  /** when Thermometer first raised it — drives Today / This week / This month */
  raisedHoursAgo: number;
  confidence: Confidence;
}

export const SIGNAL_COUNTS = C<{ type: SignalType; count: number }[]>("SIGNAL_COUNTS");
export const RECOMMENDATIONS = C<Recommendation[]>("RECOMMENDATIONS");

export type RecDecision = "tracked" | "escalated" | "dismissed";

/** Sales-head view: who owns each recommendation, and what they did with it. */
export const HEAD_REC_STATUS = C<Record<string, { owner: string; state: string }>>("HEAD_REC_STATUS");

// ---------------------------------------------------------------------------
// Market Action Plan — one plan per ASM, across every territory, monthly.
// ---------------------------------------------------------------------------

export type PlanMonthStatus = "delivered" | "progress" | "not-started";

export interface PlanMonth {
  month: string;
  created: boolean;
  estimateL: number | null;
  achievedL: number | null;
  status: PlanMonthStatus;
  note: string;
}

export const PLAN_MONTHS = C<PlanMonth[]>("PLAN_MONTHS");

/** Indian financial year: 1 April – 31 March. */
export const FISCAL_YEAR = C<{ label: string; span: string; toDate: string }>("FISCAL_YEAR");

export const PLAN_META = C<{ owner: string; scope: string; refresh: string; ytdEstimateL: number; ytdAchievedL: number }>("PLAN_META");

// ---------------------------------------------------------------------------
// From today's conversations (Huddle)
// ---------------------------------------------------------------------------

export interface Finding {
  id: string;
  theme: string;
  quote: string;
  speaker: string;
  speakerRole: string;
  session: string;
  when: string;
  at: string;
  insight: string;
  linkLabel?: string;
  /** the territory of the insight or recommendation it corroborates (the Huddle sheet has none) */
  territory: string;
  /** same marking as Insights */
  isNew?: boolean;
  confidence: Confidence;
}

export const FINDINGS = C<Finding[]>("FINDINGS");

// ---------------------------------------------------------------------------
// Ask Cortex
// ---------------------------------------------------------------------------

export interface AskAnswer {
  q: string;
  answer: string;
  links: { label: string; target: string; agent: AgentId }[];
  confidence: Confidence;
}

export const ASK_ANSWERS = C<AskAnswer[]>("ASK_ANSWERS");

// ---------------------------------------------------------------------------
// Sales head: “what's actually working”
// ---------------------------------------------------------------------------

export const WHATS_WORKING = C<{
  rows: { type: string; actioned: number; delivered: number; value: string; best: string }[];
  takeaway: string;
  confidence: Confidence;
}>("WHATS_WORKING");

/** Org-wide monthly plan roll-up for the sales head. */
export const HEAD_PLAN_MONTHS = C<PlanMonth[]>("HEAD_PLAN_MONTHS");

/** Cumulative actions opened vs completed through the month, by week. */
export const TRACKER_TREND = C<Record<ViewerRole, { label: string; opened: number; completed: number }[]>>("TRACKER_TREND");

export type HealthLevel = 0 | 1 | 2 | 3 | 4;
export const HEALTH_LEVELS: { label: string; color: string }[] = [
  { label: "Critical", color: "#d64550" },
  { label: "At risk", color: "#8c3a40" },
  { label: "Watch", color: "rgb(var(--hl-watch))" },
  { label: "Stable", color: "#2d6a45" },
  { label: "Healthy", color: "#2fa85c" },
];

export interface HealthGrid {
  rowLabel: string;
  columns: string[];
  rows: { name: string; cells: { level: HealthLevel; value: string; detail: string; target?: string }[] }[];
}

export const TERRITORY_HEALTH = C<Record<ViewerRole, HealthGrid>>("TERRITORY_HEALTH");

/** Set-level confidence for the Thermometer box itself. */
export const THERMO_SET_CONFIDENCE = C<Confidence>("THERMO_SET_CONFIDENCE");

// "head" is the one destination outside the ASM's own territory workflow: it raises the
// recommendation to the Sales Head as a decision rather than routing it to one of his agents.
export type RecRoute = "tracker" | "map" | "pitch" | "head";

/** Sales-head view: where each recommendation was routed by the ASM. */
export const HEAD_REC_ROUTES = C<Record<string, RecRoute[]>>("HEAD_REC_ROUTES");

export const WIDGET_OPTIONS = [
  { id: "w-route", title: "Today's routes", description: "Where your sales officers are visiting today", agent: "pitch" as AgentId },
  { id: "w-stock", title: "Short-supply watchlist", description: "Orders the distributor short-supplied", agent: "thermometer" as AgentId },
  { id: "w-scheme", title: "Scheme performance", description: "Loyalty and scheme slabs vs their targets", agent: "map" as AgentId },
  { id: "w-competitor", title: "Competitor share", description: "Company vs competitor share of market size", agent: "huddle" as AgentId },
];

// ---------------------------------------------------------------------------
// My actions vs team actions
// ---------------------------------------------------------------------------

/** Sales officers under the ASM; `id` is the workbook's Sales officer ID (SO018). */
export const OFFICERS = C<{ id?: string; name: string; territories: string; share: number }[]>("OFFICERS");

export interface ActionItem {
  id: string;
  title: string;
  territory: string;
  owner: string; // VIEWER.asm.name = the ASM's own action
  status: ActionStatus;
  source: AgentId;
  hoursAgo: number;
  /** retailer-level items: the workbook retailer and signal they came from */
  retailerId?: string;
  kind?: string;
}

export const ACTION_ITEMS = C<ActionItem[]>("ACTION_ITEMS");

/** Team-wide tracker totals (all sales officers under the ASM). */
export const TEAM_TRACKER = C<{ total: number; counts: Record<ActionStatus, number>; bySource: Record<AgentId, number> }>("TEAM_TRACKER");

/** Sales-head view: recommendations that sit above ASM authority and need the head's decision. */
export const HEAD_PENDING = C<Record<string, string>>("HEAD_PENDING");

/** Action Tracker line graph for the month (ASM's own actions). */
export const TRACKER_MONTH = C<{ labels: string[]; done: number[]; progress: number[]; delayed: number[] }>("TRACKER_MONTH");

/** Agent cards. Churn is new and not yet defined: placeholder only. */
export const AGENT_CARDS: { id: AgentId | "churn"; name: string; stat: string; placeholder?: boolean }[] = [
  { id: "huddle", name: "Huddle", stat: AGENT_STATS.huddle },
  { id: "map", name: "Market Action Plan", stat: AGENT_STATS.map },
  { id: "pitch", name: "Pitch", stat: AGENT_STATS.pitch },
  { id: "thermometer", name: "Thermometer", stat: AGENT_STATS.thermometer },
  { id: "churn", name: "Churn", stat: "Placeholder · not yet defined", placeholder: true },
];

/** Everything Thermometer raised per lever in each range. */
export const LEVER_RAISED = C<Record<"today" | "week" | "month", Record<SignalType, number>>>("LEVER_RAISED");

// ---------------------------------------------------------------------------
// Option B — consolidated spec additions
// ---------------------------------------------------------------------------

/** Covasant primary blue. */
export const PRIMARY_BLUE = "#2f6fed";
export const PRIMARY_BLUE_SOFT = "#4f86f7";

/** A short, honest sequence an agent shows while it works, then a concrete result. */
export interface AgentRun {
  agent: AgentId;
  steps: string[];
  result: string;
  /** omitted when the result lands somewhere this viewer can't open (an escalation to the Sales Head) */
  link?: string;
}

/** System-suggested new actions, from any module, that could be added to Tracker. */
export interface SuggestedAction {
  id: string;
  title: string;
  territory: string;
  source: AgentId;
  why: string;
  confidence: Confidence;
  run: AgentRun;
  /** the workbook retailer + signal behind the suggestion, and the officer who serves that retailer */
  retailerId?: string;
  kind?: string;
  suggestedOwner?: string;
}

export const SUGGESTED_ACTIONS = C<SuggestedAction[]>("SUGGESTED_ACTIONS");

/**
 * What an item is waiting on. Most signals resolve without the ASM: an agent does the work
 * (`done`), the ASM already settled it (`agreed`), or it closed itself (`closed`, optionally
 * because SFA confirmed the outcome). Only the rest carry a suggested action to confirm.
 */
export type ItemAction = { label: string; run: AgentRun } | { done: string } | { agreed: string } | { closed: string; bySfa?: boolean };

/** Suggested action per insight — or how it was settled (backend rules; see data_gaps). */
export const INSIGHT_ACTIONS = C<Record<string, ItemAction>>("INSIGHT_ACTIONS");

/** KPI detail views: month-by-month breakdowns (Apr–Sep). */
export const ACTION_MONTHS = C<Record<ViewerRole, { month: string; opened: number; completed: number }[]>>("ACTION_MONTHS");

export const WEAKEST_BY_MONTH = C<Record<ViewerRole, { month: string; name: string; why: string }[]>>("WEAKEST_BY_MONTH");

/** Market Action Plan draft generation (Create plan) shown as agent work. */
export const PLAN_RUN = C<AgentRun>("PLAN_RUN");

/** What to do about each Huddle finding. */
export const FINDING_ACTIONS = C<Record<string, ItemAction>>("FINDING_ACTIONS");

/** The walkthrough thread the cards narrow to while demo scope is on, chosen by the backend. */
export const DEMO_SCENARIO_DATA = C<{ id: string; name: string; short: string; insights: string[]; findings: string[]; leadInsights: string[] }>("DEMO_SCENARIO");
