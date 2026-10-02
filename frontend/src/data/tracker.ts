// Action Tracker — the board and the ticket record. Columns: Needs an Owner · In Progress · Awaiting Verification ·
// Closed / Verified. The ASM sees My Actions and Team; the Sales Head sees the roll-up at ASM level only, never the
// officer beneath. Tickets come from the backend (GET /api/web/bootstrap → `tracker`): the ASM's signal groups from
// the workbook, the officers' own field actions, and — applied per request — what was assigned in Sales AI, started
// or completed in the officers' app, and verified here.

import { ActionTrace } from "./actionTraces";
import { AgentId } from "./cortexHome";
import { Priority, SEP_INITIATIVES } from "./map";
import { D } from "./source";

const T = <V,>(key: string) => D<V>("tracker", key);

export const TRACKER_LABELS = T<{ asm: string; region: string; state: string; head: string; headScope: string; month: string; territories: string[] }>("LABELS");

export type Column = "owner" | "progress" | "verify" | "closed";
export const COLUMNS: { id: Column; label: string; color: string; hollow?: boolean }[] = [
  { id: "owner", label: "Needs an Owner", color: "#7c7f89" },
  { id: "progress", label: "In Progress", color: "#4f86f7" },
  // no extra hue: a hollow blue ring reads as "done by the owner, not yet verified"
  { id: "verify", label: "Awaiting Verification", color: "#4f86f7", hollow: true },
  { id: "closed", label: "Closed / Verified", color: "#2fa85c" },
];

export type TicketSource = AgentId | "assistant" | "channel";
export const SOURCE_LABEL: Record<TicketSource, string> = {
  huddle: "Huddle",
  thermometer: "Thermometer",
  map: "Market Action Plan",
  pitch: "Pitch",
  assistant: "Assistant",
  channel: "Channel-facing",
};
export type TicketClass = "Channel" | "Collection" | "Coverage" | "Range" | "Pricing" | "Internal";

export interface Person {
  name: string;
  role: string;
  relation: "Assignee" | "Delegated to" | "Watching" | "Escalation contact";
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  source: TicketSource;
  cls: TicketClass;
  priority: Priority;
  column: Column;
  isNew?: boolean;
  territory: string;
  /** the ASM who owns the region (what the Sales Head sees) */
  asm: string;
  region: string;
  /** null = needs an owner */
  assignee: string | null;
  delegatedTo?: string;
  due: string;
  sla: { label: string; breach?: boolean; met?: boolean };
  watchers: Person[];
  provenance: { screen: string; insightId?: string; evidence: string; raised: string };
  entities: string;
  value?: { unit: string; est: number; agreed: number; delivered: number | null };
  age: string;
  decision?: string;
  closure?: { outcome: string; verifier: string; ack: string };
  relationships: { parent?: string; children?: string; duplicate?: string; blocks?: string; related?: string };
  activity: { who: string; what: string; when: string }[];
  comments: { who: string; when: string; text: string }[];
  attachments: number;
  views: number;
  /** what closing this ticket propagates to (use-case step 11) */
  links?: { initiative?: string; insight?: string; pitchOutlet?: string };
  /** the officer's own "done" from the app, waiting for the ASM's verification */
  sfaDone?: { by: string; when: string; outcome: string; delivered?: number };
  /** an assignment stored by the backend (ACT-…), vs an officer's field action from the workbook */
  stored?: boolean;
  /** what the home page assigns it by (act-…), when it is one of the workbook signal groups */
  ref?: string;
  retailerId?: string;
  soId?: string;
  kind?: string;
}

/** The ASM's region: signal groups, the officers' field actions, and everything assigned in Sales AI. */
export const ASM_TICKETS = T<Ticket[]>("ASM_TICKETS");

/** "My Actions": what the ASM owns (including what he delegated). "Team": what the officers own directly. */
export const isMine = (t: Ticket) => t.assignee === TRACKER_LABELS.asm || t.assignee === null;

// ---------------------------------------------------------------------------
// Sales Head roll-up: every ASM's tickets, at ASM level (no officer names)
// ---------------------------------------------------------------------------

type HeadRow = Pick<Ticket, "id" | "title" | "asm" | "region" | "territory" | "source" | "cls" | "priority" | "column" | "due" | "sla" | "age">;
const ESCALATION: Person = { name: TRACKER_LABELS.head, role: `Sales Head · ${TRACKER_LABELS.state}`, relation: "Escalation contact" };

const H = (r: HeadRow): Ticket => ({
  ...r,
  description: `${r.title}. Owned in ${r.asm}'s team; open it in ${r.asm}'s Tracker for the officer detail.`,
  assignee: r.column === "owner" ? null : r.asm,
  watchers: [{ name: r.asm, role: `ASM · ${r.region}`, relation: "Assignee" }, ESCALATION],
  provenance: { screen: `${SOURCE_LABEL[r.source]} · ${r.region}`, evidence: "See the ASM's record", raised: `${SOURCE_LABEL[r.source]}, 20 Sep` },
  entities: `${r.territory} · ${r.region}`,
  relationships: {},
  activity: [{ who: SOURCE_LABEL[r.source], what: `raised this in ${r.region}`, when: "20 Sep, 08:00" }],
  comments: [],
  attachments: 0,
  views: 1,
});

export const OTHER_ASM_TICKETS: Ticket[] = T<HeadRow[]>("OTHER_ASM_TICKETS").map(H);

/** The ASM's tickets as the Sales Head sees them: owner is the ASM, the officer layer is folded away. */
const SE_NAMES = T<string[]>("SE_NAMES");
const SE_RE = SE_NAMES.length ? new RegExp(`\\b(${SE_NAMES.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![a-z])`, "g") : null;
const foldSe = (s: string) =>
  SE_RE ? s.replace(SE_RE, (_m, _n, at: number) => (at === 0 || /[.!?]\s$/.test(s.slice(Math.max(0, at - 2), at)) ? "The Sales Executive" : "the Sales Executive")) : s;

export const HEAD_TICKETS: Ticket[] = [
  ...ASM_TICKETS.map((t) => ({
    ...t,
    title: foldSe(t.title),
    description: foldSe(t.description),
    sla: t.sla.label === "Waiting on you" ? { ...t.sla, label: `Waiting on ${t.asm}` } : t.sla,
    provenance: { ...t.provenance, screen: foldSe(t.provenance.screen) },
    closure: t.closure && { ...t.closure, outcome: foldSe(t.closure.outcome) },
    assignee: t.assignee === null ? null : t.asm,
    delegatedTo: undefined,
    watchers: t.watchers.filter((w) => !w.role.startsWith("Sales Executive")),
    activity: t.activity.map((a) => ({ ...a, who: SE_NAMES.includes(a.who) ? `${t.asm}'s team` : a.who, what: foldSe(a.what) })),
    comments: [],
    sfaDone: undefined,
  })),
  ...OTHER_ASM_TICKETS,
];

export const HEAD_ASMS = T<string[]>("HEAD_ASMS");

// ---------------------------------------------------------------------------
// Closing the loop (use-case step 11): a verified close updates the plan and the insight
// ---------------------------------------------------------------------------

export interface LoopState {
  /** ticket id → what was recorded on close */
  closed: Record<string, { delivered?: number; outcome: string; at: string }>;
}
const LOOP_KEY = "cx-loop";
export function readLoop(): LoopState {
  try {
    const raw = sessionStorage.getItem(LOOP_KEY);
    return raw ? { closed: {}, ...JSON.parse(raw) } : { closed: {} };
  } catch {
    return { closed: {} };
  }
}
export function writeLoop(s: LoopState) {
  try {
    sessionStorage.setItem(LOOP_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: the close still shows on this page */
  }
}

/** Plan initiative overrides from tickets closed this session. */
export function initiativeOverrides(loop: LoopState): Record<string, { delivered?: number; closed: true; ticket: string }> {
  const out: Record<string, { delivered?: number; closed: true; ticket: string }> = {};
  for (const [id, c] of Object.entries(loop.closed)) {
    const t = ASM_TICKETS.find((x) => x.id === id);
    if (t?.links?.initiative) out[t.links.initiative] = { delivered: c.delivered, closed: true, ticket: id };
  }
  return out;
}

/** Insights closed by a verified ticket this session. */
export function closedInsights(loop: LoopState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, c] of Object.entries(loop.closed)) {
    const t = ASM_TICKETS.find((x) => x.id === id);
    if (t?.links?.insight) out[t.links.insight] = `${c.outcome} · ${id}`;
  }
  return out;
}

/** The plan's Delivered after this session's closes (₹ initiatives only). */
export function deliveredAfter(loop: LoopState) {
  const o = initiativeOverrides(loop);
  return SEP_INITIATIVES.filter((i) => i.unit === "₹L").reduce((n, i) => n + (o[i.id]?.delivered ?? i.delivered ?? 0), 0);
}

export function ticketTrace(t: Ticket): ActionTrace {
  const agent: AgentId = t.source === "assistant" || t.source === "channel" ? "map" : t.source;
  return {
    input: { label: t.provenance.screen, detail: t.provenance.evidence, at: t.provenance.raised },
    evaluated: [
      { agent, verdict: t.source === "channel" ? "received it from the distributor portal" : t.source === "assistant" ? "raised it from an AI Assistant answer" : "raised the item", chosen: true },
      ...(t.links?.initiative ? [{ agent: "map" as AgentId, verdict: `tied it to the plan row it delivers` }] : []),
      ...(t.links?.pitchOutlet ? [{ agent: "pitch" as AgentId, verdict: `carries it as a talking point at ${t.links.pitchOutlet}` }] : []),
    ],
    why: t.assignee ? `${t.territory} is in ${t.asm}'s region${t.delegatedTo ? `, and ${t.delegatedTo} covers it on the ground` : ""}, so it landed in the ${t.asm} Tracker.` : "No owner could be inferred with enough confidence, so it waits in Needs an Owner.",
    outcome: `${t.id} · ${COLUMNS.find((c) => c.id === t.column)!.label}`,
    link: t.links?.initiative ? "View plan" : "View in Tracker",
  };
}

/** "1 Oct, 18:10": stamps for what happens on this page. */
export function nowLabel(d = new Date()) {
  return `${d.getDate()} ${d.toLocaleString("en-GB", { month: "short" })}, ${d.toTimeString().slice(0, 5)}`;
}

// ---------------------------------------------------------------------------
// The October plan's tickets: saving in MAP Studio opens one per initiative for its owner
// ---------------------------------------------------------------------------

const OCT_BASE = T<number>("OCT_TICKET_BASE");
export const octTicketId = (k: number) => `TKT-${OCT_BASE + k}`;

export function octTickets(rows: { id: string; title: string; territory: string; owner: string; priority: Priority; targetL: number; estL: number; why: string }[], savedAt: string): Ticket[] {
  const { asm, region } = TRACKER_LABELS;
  return rows.map((d, k) => {
    const mine = d.owner === asm;
    return {
      id: octTicketId(k),
      title: d.title,
      description: `${d.why} From the October plan, saved in MAP Studio.`,
      source: "map",
      cls: "Channel",
      priority: d.priority,
      column: "progress",
      isNew: true,
      territory: d.territory,
      asm,
      region,
      assignee: asm,
      delegatedTo: mine ? undefined : d.owner,
      due: "31 Oct",
      sla: { label: "Starts 1 Oct" },
      watchers: [{ name: asm, role: `ASM · ${region}`, relation: "Assignee" }, ...(mine ? [] : [{ name: d.owner, role: `Sales Executive · ${d.territory}`, relation: "Delegated to" as const }])],
      provenance: { screen: "Market Action Plan · October, saved in MAP Studio", evidence: "October plan v1", raised: `${asm}, ${savedAt}` },
      entities: d.territory,
      value: { unit: "₹L", est: d.estL, agreed: d.targetL, delivered: null },
      age: "0 days",
      relationships: { related: `October plan · #${k + 1} ${d.title}` },
      activity: [
        { who: asm, what: "saved the October plan in MAP Studio", when: savedAt },
        ...(mine ? [] : [{ who: "Sales AI", what: `delegated it to ${d.owner}`, when: savedAt }]),
      ],
      comments: [],
      attachments: 0,
      views: 1,
    };
  });
}
