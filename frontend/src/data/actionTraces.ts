// Per-action orchestration traces for the ASM screen. Each suggested action on the homepage — on Insights,
// Thermometer recommendations and Huddle findings — carries a trace: input → agents it was evaluated against →
// why it landed where it did → outcome. Data comes from the backend (GET /api/web/bootstrap → "actionTraces").

import { AgentId, RecRoute } from "./cortexHome";
import { D } from "./source";

export interface ActionTrace {
  input: { label: string; detail: string; at: string };
  /** every agent the action was checked against; `chosen` is the one that set the route */
  evaluated: { agent: AgentId; verdict: string; chosen?: boolean }[];
  why: string;
  outcome: string;
  link: string;
  /** part of it sat above the ASM's authority and went to the Sales Head */
  escalated?: string;
}

/** The route Sales AI suggests for each Thermometer recommendation. */
export const REC_SUGGESTED = D<Record<string, RecRoute>>("actionTraces", "REC_SUGGESTED");

/** Outcome wording for a route Sales AI has already taken. */
export const ROUTE_DONE_LABEL: Record<RecRoute, string> = {
  tracker: "Send to Tracker",
  map: "Escalate to Market Action Plan",
  pitch: "Push to Pitch engine",
  head: "Escalate to Sales Head",
};

export const ACTION_TRACES = D<Record<string, ActionTrace>>("actionTraces", "ACTION_TRACES");
