// Huddle agent — Intel Hub, Meeting Repository, series and meeting pages. Built by the backend from the workbook's
// 'Huddle' sheet for the ASM's team (GET /api/web/bootstrap → `huddle`): Sales themes are the team's recurring
// Morning and Evening huddles, other departments' themes are ad-hoc cross-functional calls. Actions assigned from these
// pages become Tracker tickets and carry their real status back here.

import { D } from "./source";

const H = <T,>(key: string) => D<T>("huddle", key);

export const HUDDLE_LABELS = H<{ asm: string; region: string; head: string; team: string[]; territories: string[]; dataDate: string; today: string }>("LABELS");

export type Health = "critical" | "attention" | "warning" | "healthy";
export type Urgency = "High" | "Medium" | "Low";
export type ActionStatus = "pending" | "in_progress" | "completed";

export interface HuddleAction {
  id: string;
  theme: number;
  description: string;
  /** the owning designation from the Huddle sheet */
  owner: string;
  /** action items the sheet counts for this theme */
  count: number;
  priority: Urgency;
  due: string;
  status: ActionStatus;
  /** the person it was assigned to in Sales AI, and its Tracker ticket */
  assignee: string | null;
  ticket: string | null;
  evidence: string;
}

export interface HuddleBlocker {
  id: string;
  theme: number;
  description: string;
  /** systemic = high urgency; gap = an incomplete discussion that needs another team */
  type: "systemic" | "gap";
  severity: "high" | "medium";
  resolved: boolean;
  owner: string;
  evidence: string;
}

export interface Attendee {
  name: string;
  role: string;
  /** SO visits logged that day (field activity); null for non-field roles */
  visits: number | null;
}

export interface QualityRow {
  criteria: string;
  weight: number;
  score: number;
  contribution: number;
  evidence: string[];
}

export interface Meeting {
  id: string;
  seriesId: string;
  name: string;
  date: string;
  time: string;
  duration: number;
  kind: "Recurring" | "Ad-hoc";
  organiser: string;
  zone: string;
  department: string;
  attendees: Attendee[];
  topics: string[];
  themes: number[];
  summary: string;
  transcript: { t: string; speaker: string; text: string; gist: string; theme: number }[];
  actions: HuddleAction[];
  blockers: HuddleBlocker[];
  quality: { final: number; rows: QualityRow[] };
  score: number;
  tone: { label: "positive" | "neutral" | "negative"; score: number };
  signals: { title: string; description: string; source: string; theme: number; confidence: number }[];
  health: Health;
  /** product categories and business segments the meeting's themes name */
  products: string[];
  segments: string[];
  /** action id → the business function that owns it (Action Execution Overview) */
  functions: Record<string, string>;
  confidence: "High" | "Medium";
  /** share of the meeting's themes the workbook's sales data corroborates */
  confidencePct: number;
}

export interface Series {
  id: string;
  name: string;
  type: string;
  kind: "Recurring" | "Ad-hoc";
  level: string;
  zone: string;
  area: string;
  organiser: string;
  department: string;
  duration: number;
  time: string;
  attendees: string[];
  meetings: string[];
}

export const SERIES = H<Series[]>("SERIES");
export const MEETINGS = H<Record<string, Meeting>>("MEETINGS");
export const NEXT_MEETING = H<Record<string, { date: string; time: string; attendees: number }>>("NEXT");
export const COMPLIANCE = H<{ happened: number; future: number; cancelled: number }>("COMPLIANCE");

export interface Insight {
  title: string;
  description: string;
  /** 0–1 */
  confidence: number;
  meetingId: string;
  urgency: Urgency;
  source: string;
}
/** team → category → insights */
export const INSIGHTS = H<Record<string, Record<string, Insight[]>>>("INSIGHTS");
export const CATEGORY_LABEL = H<Record<string, string>>("CATEGORY_LABEL");
export const CATEGORY_ORDER = ["pricing", "product", "competition", "channel_feedback", "supply", "people", "systems"];

/** Field Operations Health: one entity per region (level 2), territory (3) and sales officer (4), scored 0–100 on the
 *  workbook against SalesPulze's Capability Building criteria (null where a measure has no data) */
export type Band = "healthy" | "moderate" | "attention" | "critical" | "nodata";
export interface Entity {
  id: string;
  level: 2 | 3 | 4;
  name: string;
  parent: string | null;
  asm: string;
  retailers: number;
  meetings: number;
  score: number | null;
  band: Band;
  parts: Record<string, number | null>;
}
export const ENTITIES = H<Entity[]>("ENTITIES");
export const CB_CRITERIA = H<{ name: string; weight: number }[]>("CB_CRITERIA");
/** average Capability Building of the day's meetings */
export const TREND = H<{ date: string; capability: number }[]>("TREND");
export const PRODUCTS = H<string[]>("PRODUCTS");
export const SEGMENTS = H<string[]>("SEGMENTS");
export const FUNCTIONS = H<string[]>("FUNCTIONS");
export const STATE = H<string>("STATE");
export const HOME_REGION = H<string>("HOME_REGION");

export const HUDDLE_TERRITORIES = H<{ name: string; retailers: number; issue: string; officers: string[] }[]>("TERRITORIES");

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

export const seriesOf = (id: string) => SERIES.find((s) => s.id === id);
export const meetingsOf = (s: Series) => s.meetings.map((id) => MEETINGS[id]).filter(Boolean);
export const allMeetings = () => Object.values(MEETINGS).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

const TODAY = new Date(`${HUDDLE_LABELS.today}T00:00:00`);
/** meetings within the last N days of the app's today (null = all time) */
export function inRange(m: Meeting, days: number | null) {
  if (days == null) return true;
  return (TODAY.getTime() - new Date(`${m.date}T00:00:00`).getTime()) / 864e5 <= days;
}

export const isOverdue = (a: HuddleAction) => a.status !== "completed" && new Date(`${a.due}T00:00:00`) < TODAY;

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const at = (iso: string) => new Date(`${iso}T00:00:00`);
/** "16 Sep 2026" */
export const fmtDate = (iso: string) => `${at(iso).getDate()} ${MON[at(iso).getMonth()]} ${at(iso).getFullYear()}`;
/** "Wed 16 Sep" */
export const fmtDay = (iso: string) => `${WD[at(iso).getDay()]} ${at(iso).getDate()} ${MON[at(iso).getMonth()]}`;
export function daysAgo(iso: string) {
  const n = Math.round((TODAY.getTime() - new Date(`${iso}T00:00:00`).getTime()) / 864e5);
  return n <= 0 ? "Today" : n === 1 ? "Yesterday" : `${n} days ago`;
}

export const TIME_RANGES: { label: string; days: number | null }[] = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All Time", days: null },
];
