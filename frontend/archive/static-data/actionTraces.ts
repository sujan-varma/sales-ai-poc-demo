// Per-action orchestration traces for the ASM screen (30 Sep follow-up).
// Each suggested action on the homepage — on Insights, Thermometer recommendations and
// Since this morning — is something Sales AI has already done. Its trace shows how that
// one action was routed: input received → agents it was evaluated against → why it
// landed where it did → outcome. Scoped to one action; the day-wide view is Leadership's.

import { AgentId, RecRoute } from "./cortexHome";

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

/** The route Sales AI already took for each Thermometer recommendation. */
export const REC_SUGGESTED: Record<string, RecRoute> = {
  "rec-1": "tracker",
  "rec-2": "tracker",
  "rec-3": "map",
  "rec-4": "pitch",
  "rec-5": "tracker",
  "rec-6": "tracker",
  // Thermometer agent page: recommendations derived from Performance and the Scorecard
  "tr-prod": "pitch",
  "tr-degrow": "tracker",
  "tr-dealers": "tracker",
  "tr-nontrade": "map",
  "tr-bp": "pitch",
};

/** Outcome wording for a route Sales AI has already taken. */
export const ROUTE_DONE_LABEL: Record<RecRoute, string> = {
  tracker: "Send to Tracker",
  map: "Escalate to Market Action Plan",
  pitch: "Push to Pitch engine",
};

export const ACTION_TRACES: Record<string, ActionTrace> = {
  // Insights
  "ins-collection": {
    input: { label: "Thermometer signal + 11 visit logs", detail: "Bhavnagar · ₹1.4L overdue across 6 distributors", at: "09:40" },
    evaluated: [
      { agent: "thermometer", verdict: "confirmed the overdue is moving from distributors to retailers" },
      { agent: "pitch", verdict: "12 Mahuva outlets on Thursday's beat can carry the credit-bridge pitch", chosen: true },
      { agent: "map", verdict: "no plan change: September already has a Bhavnagar collection initiative" },
      { agent: "huddle", verdict: "matched the 04:31 distributor-call excerpt as supporting evidence" },
    ],
    why: "The fix is a conversation at the outlet, not a new task, so it acts fastest through Pitch. The distributor calls are already in Tracker.",
    outcome: "Updated Bhavnagar's pitch plan — 12 outlets affected",
    link: "View pitch",
  },
  "ins-pacing": {
    input: { label: "September actuals", detail: "Through 28 Sep · Amreli Repair Polymer is 70% of the gap", at: "08:00" },
    evaluated: [
      { agent: "map", verdict: "the October draft is open; a scheme restart fits as an initiative", chosen: true },
      { agent: "thermometer", verdict: "34-day overstock at 2 dealers points the same way" },
      { agent: "pitch", verdict: "not now: 12 dealers need a scheme, not a new visit script" },
    ],
    why: "A two-week scheme restart runs into October, so it belongs in next month's plan rather than as a one-off action.",
    outcome: "Added to the October plan draft — 12 Amreli dealers",
    link: "View plan",
  },

  // Since this morning
  "find-1": {
    input: { label: "Distributor review call", detail: "Kishore Patel at 04:31 · Mahuva credit terms", at: "07:20" },
    evaluated: [
      { agent: "huddle", verdict: "decoded a commitment: follow up on Mahuva credit terms", chosen: true },
      { agent: "thermometer", verdict: "matched it to the ₹1.4L Bhavnagar overdue signal" },
      { agent: "pitch", verdict: "the same objection came up at 3 visits since Friday" },
    ],
    why: "It's a follow-up someone has to own by a date, so it went to Tracker with Mehul S. suggested as owner.",
    outcome: "Added to Tracker — retailer credit terms, Mehul S. suggested",
    link: "View in Tracker",
  },
  "find-4": {
    input: { label: "Mid-day review call", detail: "Retailer threat at 12:48, relayed by Mehul S.", at: "11:05" },
    evaluated: [
      { agent: "huddle", verdict: "flagged a switching threat from a top-10 Rajkot outlet" },
      { agent: "thermometer", verdict: "9 days of primer cover left, and a stock-out in August" },
      { agent: "pitch", verdict: "the outlet is on Thursday's Rajkot beat", chosen: true },
    ],
    why: "The quickest refill is the visit already planned for Thursday, so Sales AI moved the outlet to the top of that beat instead of opening a new task.",
    outcome: "Sai Ashirwad Tiles Galaxy moved to the top of Thursday's Rajkot beat",
    link: "View pitch",
  },

  // Thermometer recommendations
  "rec-1": {
    input: { label: "Collection signal", detail: "Bhavnagar · 6 distributors, ageing past 45 days", at: "09:40" },
    evaluated: [
      { agent: "thermometer", verdict: "calls to 6 named distributors by 5 Oct: work with an owner and a date", chosen: true },
      { agent: "pitch", verdict: "the credit-bridge pitch already reaches Mahuva retailers" },
      { agent: "map", verdict: "no plan change: in the September plan already" },
    ],
    why: "Calls with a deadline and a named owner are Tracker work.",
    outcome: "Added to Tracker — Bhavnagar queue, Mehul S. suggested",
    link: "View in Tracker",
    escalated: "Offering longer credit is above your authority, so that part went to Anil as a decision.",
  },
  "rec-2": {
    input: { label: "Coverage signal", detail: "Junagadh −14% · Keshod beat skipped 2 weeks", at: "08:00" },
    evaluated: [
      { agent: "huddle", verdict: "Ajay said the Tuesday Keshod beat was skipped for road work" },
      { agent: "thermometer", verdict: "the coverage drop matches the skipped beat, not demand", chosen: true },
      { agent: "map", verdict: "no plan change: the gap is the route, not the target" },
    ],
    why: "Moving a beat is a single action for Ajay T., so it went to Tracker rather than the plan.",
    outcome: "Added to Tracker — Junagadh queue, Ajay T. suggested",
    link: "View in Tracker",
  },
  "rec-3": {
    input: { label: "Revenue signal", detail: "Amreli at 54% of the September estimate", at: "08:00" },
    evaluated: [
      { agent: "map", verdict: "a two-week scheme restart spans October", chosen: true },
      { agent: "thermometer", verdict: "34-day overstock confirms stalled sell-through" },
      { agent: "pitch", verdict: "Patel Hardware visits follow once the scheme is live" },
    ],
    why: "It changes next month's targets and scheme spend, so it belongs in the October plan.",
    outcome: "Added to the October plan as a suggested initiative",
    link: "View plan",
  },
  "rec-4": {
    input: { label: "Stock signal", detail: "Sai Ashirwad Tiles Galaxy · 9 days of cover", at: "08:00" },
    evaluated: [
      { agent: "thermometer", verdict: "a top-10 outlet under 10 days' cover" },
      { agent: "pitch", verdict: "the outlet is on Thursday's Rajkot beat", chosen: true },
      { agent: "huddle", verdict: "the retailer threatened to switch brands on the 12:48 call" },
    ],
    why: "The Thursday visit gets there before the stock runs out, so Sales AI raised the outlet's priority on that beat.",
    outcome: "Updated pitch priorities for Sai Ashirwad Tiles Galaxy — top of Thursday's beat",
    link: "View pitch",
  },
  "rec-5": {
    input: { label: "Coverage signal", detail: "Jamnagar · 5 dealers with no orders in 60+ days", at: "07:30" },
    evaluated: [
      { agent: "thermometer", verdict: "5 named dealers to call back this week", chosen: true },
      { agent: "pitch", verdict: "no visit logs in 60 days, so nothing to pitch on yet" },
      { agent: "map", verdict: "re-activation is already a September initiative in Jamnagar" },
    ],
    why: "A call-back list with names is Tracker work; the plan already covers the wider push.",
    outcome: "Added to Tracker — Jamnagar queue, Neel P. suggested",
    link: "View in Tracker",
  },
  "rec-6": {
    input: { label: "Pitch visit log", detail: "1 retailer report of a ₹20/kg competitor cut", at: "08:15" },
    evaluated: [
      { agent: "pitch", verdict: "a single second-hand report, no invoice" },
      { agent: "huddle", verdict: "no mention in 3 huddles since Sunday" },
      { agent: "thermometer", verdict: "created a verification action: get an invoice copy", chosen: true },
    ],
    why: "One unverified source isn't enough to act on price, so Sales AI asked Vipul M. to verify first.",
    outcome: "Added to Tracker — invoice check with Vipul M. by Thursday",
    link: "View in Tracker",
    escalated: "Any list-price change is above threshold, so the price question itself went to Anil.",
  },
};
