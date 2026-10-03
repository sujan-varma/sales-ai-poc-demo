// Market Action Plan — MAP Studio and the Market Action Plans table. One plan per ASM per month across all of the
// ASM's territories. Built from the Excel workbook by the backend (GET /api/web/bootstrap → `map`): September's
// initiatives come from workbook signals with Estimated / Agreed / Delivered in their own unit, October is the draft
// MAP Studio opens on, and the market sheets read 'Data 11', 'Data 12' and 'MAP_Distributor Assessment'.

import { ActionTrace } from "./actionTraces";
import { AgentId, PLAN_MONTHS } from "./cortexHome";
import { D } from "./source";

const M = <T,>(key: string) => D<T>("map", key);

/** Who and where this plan is for. */
export const MAP_LABELS = M<{ asm: string; region: string; state: string; head: string; headScope: string; month: string; territories: string[] }>("LABELS");

export const TERRITORIES = M<string[]>("TERRITORIES");
export type Territory = string;

export const CATEGORIES = M<string[]>("CATEGORIES");

export type Band = "Strong" | "Moderate" | "Weak";
export const BAND_COLOR: Record<Band, string> = { Strong: "#2fa85c", Moderate: "#e0b43a", Weak: "#e85a70" };

/** Market share by territory, banded like the Territory Summary (strong ≥25%, weak <20%). ₹ market per year, estimated. */
export const TERRITORY_SHARE = M<Record<Territory, { share: number; band: Band; marketCr: number }>>("TERRITORY_SHARE");
export const REGION_SHARE = M<{ share: number; band: Band; marketCr: number }>("REGION_SHARE");

/** Sales officers under the ASM, with the territories each covers (most retailers first). */
export const SALES_EXECS = M<{ name: string; territories: Territory[] }[]>("SALES_EXECS");
const EXEC_FOR = M<Record<Territory, string>>("EXEC_FOR");
export const execFor = (t: Territory) => EXEC_FOR[t] ?? SALES_EXECS[0]?.name ?? MAP_LABELS.asm;

// ---------------------------------------------------------------------------
// The September plan
// ---------------------------------------------------------------------------

export type Priority = "High" | "Medium" | "Low";
export const PRIORITY_COLOR: Record<Priority, string> = { High: "#e85a70", Medium: "#e0b43a", Low: "#7c7f89" };

export type Lever = "Distributor revival" | "Dealer revival" | "Retail reach" | "Range selling" | "Influencer engagement";
export type Channel = "Distributor" | "Dealer" | "Retailer" | "Influencer";

/** Row status, in the table's own words. Colours come from the Option B status legend. */
export type InitStatus = "ticket-closed" | "escalated" | "in-pitch" | "closed" | "unassigned";
export const INIT_STATUS: Record<InitStatus, { label: string; color: string }> = {
  "ticket-closed": { label: "Ticket closed · close row", color: "#e0b43a" },
  escalated: { label: "Escalated to Tracker", color: "#4f86f7" },
  "in-pitch": { label: "In Pitch", color: "#4f86f7" },
  closed: { label: "Closed", color: "#2fa85c" },
  unassigned: { label: "Unassigned", color: "#7c7f89" },
};

/** How an initiative reached Pitch: the priority rule pushed it, the ASM confirmed it, or it hasn't gone. */
export type PitchPush = { mode: "auto" | "confirmed"; outlets: string[]; at: string } | null;

export interface Initiative {
  id: string;
  n: number;
  title: string;
  tag?: { label: string; tone: "ai" | "warn" };
  lever: Lever;
  channel: Channel;
  product: string;
  sector: "Trade" | "Non-Trade";
  territory: Territory;
  owner: string;
  priority: Priority;
  status: InitStatus;
  /** Tracker ticket, when one exists */
  ticket?: string;
  /** "₹L" figures count toward the plan's summary row; the others are counted in their own unit */
  unit: "₹L" | "outlets" | "retailers" | "applicators";
  est: number;
  agreed: number;
  delivered: number | null;
  description: string;
  steps: string[];
  source: { agent: AgentId; ref: string; at: string };
  pitch: PitchPush;
  attachments: number;
  comments: { who: string; at: string; text: string; ticket?: string }[];
  visit?: { by: string; at: string; when: string; state: string; note: string };
}

export const SEP_PLAN = M<{ id: string; label: string; scope: string; version: string; locked: string; lockedShort: string; agreedOn: string; history: string }>("SEP_PLAN");

export const SEP_INITIATIVES = M<Initiative[]>("SEP_INITIATIVES");

/** Summary row: only ₹ initiatives count toward impact; Delivered is against Agreed. */
export function planSummary(rows: Initiative[]) {
  const money = rows.filter((r) => r.unit === "₹L");
  const est = money.reduce((n, r) => n + r.est, 0);
  const agreed = money.reduce((n, r) => n + r.agreed, 0);
  const delivered = money.reduce((n, r) => n + (r.delivered ?? 0), 0);
  const closed = rows.filter((r) => r.status === "closed").length;
  const tracker = rows.filter((r) => r.ticket && r.status !== "closed").length;
  const pitch = rows.filter((r) => r.pitch).length;
  return { est, agreed, delivered, pct: agreed ? Math.round((delivered / agreed) * 100) : 0, closed, total: rows.length, tracker, pitch };
}

/** New since the September plan was built: workbook signals, and visit feedback the officers typed in the app. */
export const SINCE_LOCKED = M<{
  signals: { agent: AgentId; when: string; text: string; item: string }[];
  feedback: { by: string; at: string; when: string; kind: string; text: string; item: string }[];
}>("SINCE_LOCKED");

/** Past months have no plan records; their count is the territory × category pairs under 80% of target that month. */
const PLAN_INITIATIVE_COUNTS = M<number[]>("PLAN_INITIATIVE_COUNTS");
const MONTH_LONG: Record<string, string> = { Apr: "April", May: "May", Jun: "June", Jul: "July", Aug: "August", Sep: "September", Oct: "October" };

/** The monthly index. October is the draft MAP Studio opens on. */
export const PLAN_INDEX = PLAN_MONTHS.map((m) => ({
  ...m,
  label: `${MONTH_LONG[m.month] ?? m.month} 2026`,
  versions: m.created ? 1 : 0,
  initiatives: m.month === "Sep" ? SEP_INITIATIVES.length : m.created ? PLAN_INITIATIVE_COUNTS[["Apr", "May", "Jun", "Jul", "Aug"].indexOf(m.month)] ?? 0 : 0,
}));

// ---------------------------------------------------------------------------
// Orchestration traces: why an initiative is in the plan, and how it reached Pitch
// ---------------------------------------------------------------------------

export function initiativeTrace(i: Initiative): ActionTrace {
  const others: AgentId[] = (["thermometer", "huddle", "map", "pitch"] as AgentId[]).filter((a) => a !== i.source.agent && a !== "map");
  return {
    input: { label: i.source.ref, detail: `${i.title} · ${i.territory}`, at: i.source.at },
    evaluated: [
      { agent: i.source.agent, verdict: i.source.agent === "map" ? "read the target against what was achieved" : "raised the signal behind this initiative", chosen: i.source.agent !== "map" },
      ...(i.source.agent !== "map" ? [{ agent: "map" as AgentId, verdict: `sized it at ${fmtValue(i, i.est)} and set ${i.priority.toLowerCase()} priority` }] : []),
      ...others.filter((a) => a !== "pitch").map((a) => ({ agent: a, verdict: "checked for a matching signal; none contradicted it" })),
    ],
    why: `${i.lever} at ${i.channel.toLowerCase()} level is where ${i.territory} has the most to gain this month, and ${i.owner} covers the territory.`,
    outcome: `In the ${SEP_PLAN.label.split(" ")[0]} plan as #${i.n}, ${i.priority} priority, owner ${i.owner}`,
    link: "View plan",
  };
}

export function pushTrace(i: Initiative): ActionTrace {
  const auto = i.pitch?.mode === "auto";
  return {
    input: { label: auto ? `${SEP_PLAN.label.split(" ")[0]} plan agreed` : `Pushed by ${MAP_LABELS.asm}`, detail: `#${i.n} ${i.title} · ${i.priority} priority`, at: i.pitch?.at ?? "Just now" },
    evaluated: [
      { agent: "map", verdict: `${i.priority} priority, ${fmtValue(i, i.agreed)} agreed`, chosen: auto },
      { agent: "pitch", verdict: `found ${i.pitch?.outlets.length ?? 0} outlet${(i.pitch?.outlets.length ?? 0) === 1 ? "" : "s"} on ${i.owner}'s beats`, chosen: !auto },
    ],
    why: auto
      ? `The auto-push rule sends High-priority initiatives to Pitch as soon as the plan is agreed (set in Configuration by ${MAP_LABELS.head}). ${MAP_LABELS.asm} can take it back out.`
      : `Below the auto-push cut-off, so Pitch suggested it and ${MAP_LABELS.asm} confirmed the push.`,
    outcome: `A talking point in ${i.owner}'s pitch for ${i.pitch?.outlets.join(", ") ?? "the outlets in scope"}, routed to the SFA app`,
    link: "View in Pitch",
  };
}

export function fmtValue(i: Pick<Initiative, "unit">, v: number | null) {
  if (v == null) return "—";
  return i.unit === "₹L" ? `₹${v.toFixed(1)} L` : `${v} ${i.unit}`;
}

// ---------------------------------------------------------------------------
// MAP Studio: the October draft
// ---------------------------------------------------------------------------

export const OCT_PLAN = M<{ label: string; short: string; basis: string }>("OCT_PLAN");

export interface DraftInitiative {
  id: string;
  title: string;
  territory: Territory;
  lever: Lever;
  product: string;
  priority: Priority;
  owner: string;
  estL: number;
  why: string;
  from: { agent: AgentId; label: string };
  carried?: boolean;
}

export const OCT_DRAFT = M<DraftInitiative[]>("OCT_DRAFT");

export function draftTrace(d: DraftInitiative): ActionTrace {
  return {
    input: { label: d.from.label, detail: `${d.territory} · ${d.product}`, at: "Generated just now" },
    evaluated: [
      { agent: d.from.agent, verdict: d.carried ? "carried an unfinished September initiative" : "supplied the signal", chosen: !d.carried },
      { agent: "map", verdict: `sized it at ₹${d.estL.toFixed(1)} L against September actuals`, chosen: !!d.carried },
      { agent: "pitch", verdict: d.priority === "High" ? "will receive it automatically once the plan is agreed" : `will suggest it; ${MAP_LABELS.asm} confirms the push` },
    ],
    why: d.why,
    outcome: `Draft initiative · ${d.priority} priority · owner ${d.owner}`,
    link: "View plan",
  };
}

/** "Things to consider", per territory (all of them when the scope is the whole region). */
export const CONSIDER = M<{ agent: AgentId; territory: Territory; text: string; open: "thermometer" | "huddle" }[]>("CONSIDER");

const STUDIO = M<{
  weakest: string;
  weak: Record<string, string>;
  distributors: Record<string, string>;
  /** what Studio reads before drafting: Huddle sheet themes, retailers the SOs visited this month, open tickets and initiatives */
  sources: { huddleThemes: number; visitsThisMonth: number; openTickets: number; openInitiatives: number };
}>("STUDIO");
export const STUDIO_SOURCES = STUDIO.sources;

/** Answers for the Studio's quick prompts, per scope, from the workbook. "" means "generate the plan". */
export function studioAnswer(q: string, scope: Territory | null): string {
  const s = scope ?? MAP_LABELS.region;
  const t = q.toLowerCase();
  if (t.includes("weak") || t.includes("behind")) return STUDIO.weak[scope ?? "*"] ?? STUDIO.weak["*"];
  if (t.includes("distributor")) return STUDIO.distributors[scope ?? "*"] ?? STUDIO.distributors["*"];
  if (t.includes("generate") || t.includes("plan")) return "";
  return `I can answer about ${s}: market size and share, distributors, reach, influencers, and what Thermometer raised this month. Or ask me to generate the ${OCT_PLAN.short} plan.`;
}
export const WEAKEST_TERRITORY = STUDIO.weakest;

// ---------------------------------------------------------------------------
// Toolbar sheets: Market Size · Market Share · Reach · Influencers
// ---------------------------------------------------------------------------

/** ₹ Cr per year (estimated); shares in % of the category. `comp` follows COMPETITORS. */
export const MARKET_BY_CATEGORY = M<{ cat: string; sizeCr: number; bondex: number; comp: number[]; note: string }[]>("MARKET_BY_CATEGORY");
/** The five largest competitors in the region, as the workbook numbers them (C2, C3, …). */
export const COMPETITORS = M<string[]>("COMPETITORS");
export const MARKET_SOURCE = M<string>("MARKET_SOURCE");

export const REACH = M<{ distributor: string; territory: Territory; universe: number; mapped: number; billed: number }[]>("REACH");
export const REACH_TARGET = M<number>("REACH_TARGET");

/** Influencer KPIs per BDE territory: [achieved, target]. */
export const INFLUENCERS = M<{ type: string; territory: Territory; onboarded: [number, number]; active: [number, number]; retained: [number, number] }[]>("INFLUENCERS");
