// Leadership (Head of Sales) content — Anil Menon's org-wide view: 7 ASMs, 38 territories.
// Demo data for the Bondex dataset, like ./cortexHome. Figures are cross-checked so the
// sections agree with each other: the 214 September actions (TRACKER.head) are synced into
// 50 initiatives, whose impact matches the Action Impact table.

import {
  ActionStatus,
  AgentId,
  AgentRun,
  Confidence,
  EvidenceSource,
  FISCAL_YEAR,
  HEAD_PLAN_MONTHS,
  HealthGrid,
  HealthLevel,
  TERRITORY_HEALTH,
  TRACKER,
} from "./cortexHome";
import type { ActionTrace } from "./actionTraces";

export { FISCAL_YEAR, HEAD_PLAN_MONTHS };

const conf = (score: number, rationale: string, factors: [number, number, number], sources: EvidenceSource[], rescoredAt = "09:40"): Confidence => ({
  score,
  rationale,
  factors: { corroboration: factors[0], freshness: factors[1], reliability: factors[2] },
  sources,
  rescoredAt,
});

// ---------------------------------------------------------------------------
// Org structure
// ---------------------------------------------------------------------------

export interface Region {
  name: string;
  asm: string;
  initials: string;
  territories: string[];
  /** September plan, ₹ lakh — sums to HEAD_PLAN_MONTHS Sep (390 / 262.1) */
  sepEstimateL: number;
  sepAchievedL: number;
}

export const REGIONS: Region[] = [
  { name: "Saurashtra", asm: "Raman", initials: "RM", territories: ["Bhavnagar", "Junagadh", "Amreli", "Rajkot", "Jamnagar", "Porbandar"], sepEstimateL: 60, sepAchievedL: 38.6 },
  { name: "Ahmedabad Rural", asm: "Sudeep", initials: "SK", territories: ["Sanand", "Dholka", "Viramgam", "Bavla", "Dhandhuka"], sepEstimateL: 54, sepAchievedL: 35.6 },
  { name: "Vadodara", asm: "Neha", initials: "NS", territories: ["Vadodara City", "Anand", "Nadiad", "Bharuch", "Godhra", "Dahod"], sepEstimateL: 64, sepAchievedL: 49.9 },
  { name: "Surat", asm: "Farhan", initials: "FQ", territories: ["Surat City", "Navsari", "Valsad", "Vapi", "Bardoli", "Vyara"], sepEstimateL: 68, sepAchievedL: 47.6 },
  { name: "Ahmedabad City", asm: "Priya", initials: "PD", territories: ["Maninagar", "Naroda", "Vastrapur", "Chandkheda", "Bopal"], sepEstimateL: 60, sepAchievedL: 44.4 },
  { name: "Kutch", asm: "Vikram", initials: "VJ", territories: ["Bhuj", "Gandhidham", "Anjar", "Mandvi"], sepEstimateL: 34, sepAchievedL: 16.7 },
  { name: "North Gujarat", asm: "Hitesh", initials: "HP", territories: ["Mehsana", "Palanpur", "Patan", "Himmatnagar", "Deesa", "Gandhinagar"], sepEstimateL: 50, sepAchievedL: 29.3 },
];

export const TERRITORY_COUNT = REGIONS.reduce((n, r) => n + r.territories.length, 0); // 38

export function regionOf(territory: string) {
  return REGIONS.find((r) => r.territories.includes(territory) || r.name === territory)!;
}

// ---------------------------------------------------------------------------
// Territory Health — 7 regions, each opening to its territories
// ---------------------------------------------------------------------------

const H = (level: HealthLevel, value: string, detail: string) => ({ level, value, detail });
type C = [HealthLevel, string, string?];
const COLS = ["Revenue", "Coverage", "Collection", "Stock", "Pricing"];
const DEFAULT_DETAIL = [
  (v: string) => `${v} of Sept estimate`,
  () => "Retailers billed vs last month",
  (v: string) => (v === "OK" ? "No overdue" : "Overdue"),
  () => "Average stock cover",
  () => "No competitor signal",
];
const T = (name: string, ...cells: C[]) => ({ name, cells: cells.map(([l, v, d], i) => H(l, v, d ?? DEFAULT_DETAIL[i](v))) });

export const ORG_HEALTH: HealthGrid = {
  rowLabel: "Region",
  columns: COLS,
  rows: [
    { name: "Saurashtra", cells: [H(2, "64%", "Sept plan achieved"), H(1, "−6%", "Junagadh drives most of it"), H(1, "₹1.9L", "Overdue, mostly Bhavnagar"), H(3, "20d", "Average stock cover"), H(2, "1", "Unverified competitor signal")] },
    { name: "Ahmedabad Rural", cells: [H(2, "66%", "Sept plan achieved"), H(3, "+1%", "Retailers billed"), H(0, "₹3.2L", "Recovery at 41%"), H(3, "19d", "Average stock cover"), H(4, "0", "No competitor signal")] },
    { name: "Vadodara", cells: [H(4, "78%", "Sept plan achieved"), H(4, "+4%", "Retailers billed"), H(3, "₹0.6L", "Overdue"), H(2, "31d", "Overstock, primer"), H(3, "0", "No competitor signal")] },
    { name: "Surat", cells: [H(3, "70%", "Sept plan achieved"), H(2, "−2%", "Retailers billed"), H(4, "₹0.1L", "Overdue"), H(1, "8d", "3 top outlets low"), H(1, "2", "Competitor schemes seen")] },
    { name: "Ahmedabad City", cells: [H(3, "74%", "Sept plan achieved"), H(3, "0%", "Retailers billed"), H(3, "₹0.8L", "Overdue"), H(4, "24d", "Average stock cover"), H(3, "0", "No competitor signal")] },
    { name: "Kutch", cells: [H(0, "49%", "Sept plan achieved"), H(0, "−11%", "2 SO vacancies"), H(3, "₹0.4L", "Overdue"), H(3, "23d", "Average stock cover"), H(4, "0", "No competitor signal")] },
    { name: "North Gujarat", cells: [H(2, "59%", "Sept plan achieved"), H(3, "+2%", "Retailers billed"), H(2, "₹1.1L", "Overdue"), H(3, "21d", "Average stock cover"), H(2, "1", "Competitor price list seen")] },
  ],
};

/** Territory rows under each region. Saurashtra's are Raman's own grid, unchanged. */
export const ORG_TERRITORY_ROWS: Record<string, HealthGrid["rows"]> = {
  Saurashtra: TERRITORY_HEALTH.asm.rows,
  "Ahmedabad Rural": [
    T("Sanand", [3, "72%"], [3, "+2%"], [1, "₹0.6L"], [3, "20d"], [4, "OK"]),
    T("Dholka", [2, "61%"], [3, "+1%"], [0, "₹1.3L", "Overdue across 2 distributors"], [3, "18d"], [4, "OK"]),
    T("Viramgam", [3, "69%"], [3, "0%"], [0, "₹0.9L", "1 distributor, 70 days overdue"], [3, "19d"], [4, "OK"]),
    T("Bavla", [2, "63%"], [2, "−1%"], [3, "₹0.2L"], [3, "21d"], [4, "OK"]),
    T("Dhandhuka", [3, "66%"], [4, "+3%"], [3, "₹0.2L"], [2, "30d", "Overstock, Repair Polymer"], [4, "OK"]),
  ],
  Vadodara: [
    T("Vadodara City", [4, "84%"], [4, "+5%"], [3, "₹0.2L"], [2, "33d", "Overstock, primer"], [3, "OK"]),
    T("Anand", [4, "81%"], [4, "+4%"], [4, "OK"], [3, "24d"], [3, "OK"]),
    T("Nadiad", [3, "76%"], [3, "+2%"], [3, "₹0.1L"], [2, "31d", "Overstock, primer"], [4, "OK"]),
    T("Bharuch", [4, "80%"], [4, "+6%"], [3, "₹0.2L"], [3, "22d"], [3, "OK"]),
    T("Godhra", [3, "72%"], [3, "+1%"], [4, "OK"], [3, "26d"], [4, "OK"]),
    T("Dahod", [3, "70%"], [3, "+2%"], [3, "₹0.1L"], [3, "25d"], [4, "OK"]),
  ],
  Surat: [
    T("Surat City", [3, "73%"], [2, "−3%"], [4, "OK"], [1, "7d", "2 top outlets under a week"], [1, "2", "Two competitor schemes at top outlets"]),
    T("Navsari", [3, "71%"], [3, "0%"], [4, "OK"], [3, "19d"], [2, "1", "Competitor scheme seen"]),
    T("Valsad", [3, "68%"], [2, "−2%"], [4, "OK"], [1, "9d", "1 top outlet low"], [3, "OK"]),
    T("Vapi", [4, "77%"], [3, "+1%"], [4, "OK"], [3, "21d"], [3, "OK"]),
    T("Bardoli", [2, "64%"], [2, "−4%"], [3, "₹0.1L"], [3, "20d"], [3, "OK"]),
    T("Vyara", [3, "66%"], [3, "0%"], [4, "OK"], [3, "23d"], [4, "OK"]),
  ],
  "Ahmedabad City": [
    T("Maninagar", [3, "75%"], [3, "+1%"], [3, "₹0.3L"], [4, "25d"], [3, "OK"]),
    T("Naroda", [3, "70%"], [2, "−2%"], [2, "₹0.4L", "2 dealers past 45 days"], [4, "24d"], [3, "OK"]),
    T("Vastrapur", [4, "81%"], [4, "+3%"], [4, "OK"], [4, "26d"], [4, "OK"]),
    T("Chandkheda", [3, "72%"], [3, "0%"], [3, "₹0.1L"], [3, "22d"], [3, "OK"]),
    T("Bopal", [3, "73%"], [3, "+1%"], [4, "OK"], [4, "24d"], [3, "OK"]),
  ],
  Kutch: [
    T("Bhuj", [2, "56%"], [1, "−8%", "1 SO vacancy"], [3, "₹0.1L"], [3, "22d"], [4, "OK"]),
    T("Gandhidham", [2, "61%"], [3, "+1%"], [3, "₹0.2L"], [3, "24d"], [4, "OK"]),
    T("Anjar", [0, "38%", "SO vacancy since August"], [0, "−17%", "41 retailers unbilled for 3 weeks"], [2, "₹0.1L"], [3, "23d"], [4, "OK"]),
    T("Mandvi", [1, "44%"], [1, "−9%"], [4, "OK"], [3, "24d"], [4, "OK"]),
  ],
  "North Gujarat": [
    T("Mehsana", [3, "66%"], [3, "+2%"], [2, "₹0.4L"], [3, "21d"], [3, "OK"]),
    T("Palanpur", [2, "55%"], [3, "+1%"], [1, "₹0.5L", "3 dealers past 60 days"], [3, "20d"], [2, "1", "Competitor price list seen"]),
    T("Patan", [2, "52%"], [3, "+3%"], [3, "₹0.1L"], [3, "22d"], [3, "OK"]),
    T("Himmatnagar", [3, "62%"], [3, "+2%"], [3, "₹0.1L"], [3, "21d"], [4, "OK"]),
    T("Deesa", [2, "54%"], [3, "+1%"], [4, "OK"], [3, "23d"], [3, "OK"]),
    T("Gandhinagar", [3, "63%"], [4, "+3%"], [4, "OK"], [3, "20d"], [4, "OK"]),
  ],
};

/** Weakest of all 38 territories — same scoring as the ASM screen's weakest(). */
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
export const ORG_WEAKEST_BY_MONTH = [
  { month: "Apr", name: "Anjar", why: "SO on leave · coverage −12%" },
  { month: "May", name: "Mandvi", why: "Revenue 51%" },
  { month: "Jun", name: "Amreli", why: "Monsoon · revenue 61%" },
  { month: "Jul", name: "Surat City", why: "Stock-outs at 5 outlets" },
  { month: "Aug", name: "Dholka", why: "Collection ₹1.9L" },
  { month: "Sep", name: "Anjar", why: "Revenue 38% · coverage −17%" },
];

// ---------------------------------------------------------------------------
// KPI figures (org-wide)
// ---------------------------------------------------------------------------

export const ORG_ACTIONS = TRACKER.head; // 214 actions in September, 131 done

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

export const DECISIONS: Decision[] = [
  {
    id: "dec-1",
    n: 1,
    question: "Hold scheme payouts for 3 Ahmedabad Rural distributors until they clear ₹3.2L?",
    context: "Recovery is at 41% with a day to month-end. Three distributors hold 70% of the overdue amount, and Sudeep's calls haven't moved it since the 22nd.",
    region: "Ahmedabad Rural",
    territory: "Dholka, Viramgam",
    asm: "Sudeep",
    raised: "Today, 10:40",
    stake: "₹3.2L overdue · ₹1.8L of September payouts affected",
    recommendation: "Hold September payouts for the two largest (₹2.3L between them) and give the third a 15-day repayment plan.",
    thresholdId: "collection",
    thresholdLabel: "Payout holds above ₹2L exposure come to you",
    options: [
      { id: "a", label: "Hold 2, plan for the third", recommended: true, outcome: "Payouts on hold for 2 distributors; 15-day plan for the third" },
      { id: "b", label: "Hold all 3", outcome: "Payouts on hold for all 3 distributors" },
      { id: "c", label: "No hold, keep chasing", outcome: "No hold; Sudeep keeps the recovery calls going" },
    ],
    run: { agent: "thermometer", steps: ["recording your decision", "flagging payouts in DMS", "briefing Sudeep"], result: "Sent to Sudeep's Tracker", link: "View in Tracker" },
    confidence: conf(
      81,
      "High: the overdue ageing comes straight from the DMS ledger and matches Sudeep's own call notes. The payout amounts are from the September scheme file.",
      [0.84, 0.9, 0.82],
      [
        { agent: "thermometer", title: "DMS overdue ageing", detail: "3 distributors, ₹3.2L, 41% recovered", when: "Today, 10:40", ageHours: 1, independent: true },
        { agent: "huddle", title: "Sudeep's review call", detail: "Recovery calls since 22 Sep", when: "Yesterday, 17:10", ageHours: 18, independent: true },
        { agent: "map", title: "September scheme payouts", detail: "₹1.8L due to the 3 distributors", when: "Today, 08:00", ageHours: 3, independent: false },
      ],
      "10:40"
    ),
  },
  {
    id: "dec-2",
    n: 2,
    question: "Allow 45-day credit for Mahuva retailers?",
    context: "14 retailers in Mahuva are asking for 45 days instead of the standard 30. The same objection came up at 3 Pitch visits since Friday and on this morning's distributor review call.",
    region: "Saurashtra",
    territory: "Bhavnagar",
    asm: "Raman",
    raised: "Today, 11:55 · escalated by Raman",
    stake: "₹4.2L monthly sell-in at stake · ₹1.4L already overdue in Bhavnagar",
    recommendation: "Approve 45 days for the 6 retailers with a clean 12-month payment record; keep 30 days for the other 8.",
    thresholdId: "credit",
    thresholdLabel: "Credit periods above 30 days come to you",
    options: [
      { id: "a", label: "Approve for the 6 with clean records", recommended: true, outcome: "45-day terms for 6 Mahuva retailers from 1 Oct; 30 days for the rest" },
      { id: "b", label: "Approve all 14", outcome: "45-day terms for all 14 Mahuva retailers from 1 Oct" },
      { id: "c", label: "Keep 30 days", outcome: "Credit stays at 30 days; Raman offers the 15-day scheme bridge instead" },
    ],
    run: { agent: "map", steps: ["recording your decision", "creating the delegation", "updating Raman's October draft"], result: "Sent to Raman's Tracker", link: "View in Tracker" },
    confidence: conf(
      78,
      "Medium-high: three independent visit logs and a call agree on the ask. The payment-record split relies on 12 months of DMS history for 6 of the 14 retailers.",
      [0.8, 0.86, 0.74],
      [
        { agent: "pitch", title: "3 visit logs", detail: "Mahuva retailers, same credit objection", when: "Since Fri 25 Sep", ageHours: 96, independent: true },
        { agent: "huddle", title: "Distributor review call", detail: "Kishore Patel raised it at 04:31", when: "Today, 07:20", ageHours: 4, independent: true },
        { agent: "thermometer", title: "Payment history", detail: "12 months, 14 retailers", when: "Today, 08:00", ageHours: 3, independent: true },
      ],
      "11:55"
    ),
  },
  {
    id: "dec-3",
    n: 3,
    question: "Move 2 sales officers from Ahmedabad City to Kutch for October?",
    context: "Kutch has had 2 SO vacancies since August. Coverage is down 11% and Anjar has 41 retailers unbilled for three weeks. Ahmedabad City is at 74% of plan with 9 officers.",
    region: "Kutch",
    territory: "Anjar, Mandvi",
    asm: "Vikram",
    raised: "Today, 17:30 · from the Kutch staffing call",
    stake: "₹6.8L October gap in Kutch · about ₹1.1L risk to Ahmedabad City's plan",
    recommendation: "Move 2 officers for 6 weeks, until the Kutch hires join. Vikram asked for it on this evening's staffing call; Priya hasn't responded yet.",
    thresholdId: "people",
    thresholdLabel: "Moving officers across ASMs always comes to you",
    options: [
      { id: "a", label: "Move 2 for 6 weeks", recommended: true, outcome: "2 officers move to Kutch from 5 Oct for 6 weeks" },
      { id: "b", label: "Move 1", outcome: "1 officer moves to Kutch from 5 Oct" },
      { id: "c", label: "Don't move; hire faster", outcome: "No move; the Kutch hiring request is escalated to HR" },
    ],
    run: { agent: "map", steps: ["updating both October drafts", "notifying Priya and Vikram"], result: "Kutch and Ahmedabad City drafts updated", link: "View plans" },
    confidence: conf(
      71,
      "Medium: the coverage gap is measured, but the October gain from two borrowed officers is estimated from Bhuj's recovery after the June hire, a single comparable.",
      [0.7, 0.92, 0.62],
      [
        { agent: "huddle", title: "Kutch staffing call", detail: "Vikram's request, 38 min", when: "Today, 17:30", ageHours: 0.3, independent: true },
        { agent: "thermometer", title: "Coverage signal", detail: "Anjar −17%, Mandvi −9%", when: "Today, 07:30", ageHours: 10, independent: true },
        { agent: "map", title: "Bhuj, June", detail: "Coverage recovery after one hire", when: "Jul month-end", ageHours: 1450, independent: false },
      ],
      "17:40"
    ),
  },
  {
    id: "dec-4",
    n: 4,
    question: "Match the reported ₹20/kg Dr. Fixit cut in Porbandar?",
    context: "One retailer reported the cut on a Pitch visit on Sunday. There's no invoice yet, and no second source in Huddle or SFA data.",
    region: "Saurashtra",
    territory: "Porbandar",
    asm: "Raman",
    raised: "Today, 08:15",
    stake: "About ₹0.9L monthly sell-in at 4 outlets, if the cut is real",
    recommendation: "Hold. Vipul M. gets an invoice copy by Thursday, and Sales AI raises this again if a second source confirms it.",
    thresholdId: "price",
    thresholdLabel: "Any change to list price comes to you",
    options: [
      { id: "a", label: "Hold until verified", recommended: true, outcome: "No price change; invoice check with Vipul M. by Thursday" },
      { id: "b", label: "Match at 4 outlets for October", outcome: "₹20/kg off list at 4 Porbandar outlets for October" },
      { id: "c", label: "Offer a scheme instead", outcome: "A volume scheme at the 4 outlets instead of a price cut" },
    ],
    run: { agent: "thermometer", steps: ["recording your decision", "creating the verification action"], result: "Sent to Raman's Tracker", link: "View in Tracker" },
    confidence: conf(
      52,
      "Low: a single second-hand report with no invoice. Treat it as unverified until another source confirms the price.",
      [0.3, 0.8, 0.5],
      [
        { agent: "pitch", title: "1 visit log", detail: "Retailer report, Porbandar", when: "Sun 27 Sep", ageHours: 50, independent: true },
        { agent: "huddle", title: "No mention", detail: "3 huddles checked since Sunday", when: "Today, 09:10", ageHours: 2, independent: false },
      ],
      "08:15"
    ),
  },
];

/** How Sales AI arrived at each decision's suggested answer (the "Suggested" trace). */
export const DECISION_TRACES: Record<string, ActionTrace> = {
  "dec-1": {
    input: { label: "DMS ledger event", detail: "Ahmedabad Rural overdue crossed ₹3L · recovery at 41%", at: "10:40" },
    evaluated: [
      { agent: "thermometer", verdict: "3 distributors hold 70% of the overdue; the two largest owe ₹2.3L", chosen: true },
      { agent: "map", verdict: "₹1.8L of September scheme payouts are due to the same three" },
      { agent: "huddle", verdict: "Sudeep's calls since the 22nd haven't moved the balance" },
    ],
    why: "Holding payouts for the two largest covers most of the exposure without cutting off the smallest, whose ageing is shortest. A hold above ₹2L is above your threshold, so it waits for you.",
    outcome: "Suggested: hold payouts for 2, a 15-day plan for the third",
    link: "View the ledger",
  },
  "dec-2": {
    input: { label: "Raman escalated recommendation #1", detail: "14 Mahuva retailers asking for 45-day credit", at: "11:55" },
    evaluated: [
      { agent: "pitch", verdict: "the same objection at 3 visits since Friday" },
      { agent: "thermometer", verdict: "6 of the 14 have a clean 12-month payment record", chosen: true },
      { agent: "huddle", verdict: "Kishore Patel raised it on this morning's call" },
    ],
    why: "Offering 45 days only where the payment record supports it keeps the ₹4.2L sell-in without adding to the ₹1.4L already overdue. Credit above 30 days is above your threshold.",
    outcome: "Suggested: 45 days for the 6 with clean records, 30 for the rest",
    link: "View the retailers",
  },
  "dec-3": {
    input: { label: "Kutch staffing call", detail: "Vikram asked for 2 officers until the hires join", at: "17:30" },
    evaluated: [
      { agent: "huddle", verdict: "Vikram's request, with Anjar and Mandvi named" },
      { agent: "thermometer", verdict: "coverage −17% in Anjar, −9% in Mandvi" },
      { agent: "map", verdict: "Ahmedabad City is at 74% of plan with 9 officers; Bhuj recovered after one hire in June", chosen: true },
    ],
    why: "Two officers for six weeks closes most of the Kutch gap at a small risk to Ahmedabad City's plan. Moving people across ASMs always comes to you.",
    outcome: "Suggested: move 2 officers for 6 weeks",
    link: "View both plans",
  },
  "dec-4": {
    input: { label: "Pitch visit log", detail: "1 retailer report of a ₹20/kg Dr. Fixit cut", at: "08:15" },
    evaluated: [
      { agent: "pitch", verdict: "a single second-hand report, no invoice" },
      { agent: "huddle", verdict: "no mention in 3 huddles since Sunday" },
      { agent: "thermometer", verdict: "no drop in Porbandar sell-through yet", chosen: true },
    ],
    why: "Nothing corroborates the cut, and sales haven't moved, so matching it now would give margin away on one rumour. Any list-price change comes to you.",
    outcome: "Suggested: hold until an invoice confirms it",
    link: "View the visit log",
  },
};

// ---------------------------------------------------------------------------
// Date range — one filter in the top bar governs every date-scoped section
// ---------------------------------------------------------------------------

export type RangeId = "today" | "week" | "month" | "fy";

export const RANGES: { id: RangeId; label: string; detail: string; phrase: string }[] = [
  { id: "today", label: "Today", detail: "Tue 29 Sep", phrase: "today" },
  { id: "week", label: "This week", detail: "23–29 Sep", phrase: "this week" },
  { id: "month", label: "September", detail: "1–29 Sep", phrase: "in September" },
  { id: "fy", label: "FY 2026–27", detail: "Apr–Sep, to date", phrase: "this financial year" },
];

export interface RangeFigures {
  achievedL: number;
  estimateL: number;
  actions: { total: number; done: number; progress: number; delayed: number; unassigned: number };
}

/** Org-wide figures per range. September matches TRACKER.head / HEAD_PLAN_MONTHS; FY sums Apr–Sep. */
export const RANGE_DATA: Record<RangeId, RangeFigures> = {
  today: { achievedL: 9.8, estimateL: 13.0, actions: { total: 68, done: 37, progress: 21, delayed: 6, unassigned: 4 } },
  week: { achievedL: 58.4, estimateL: 91.0, actions: { total: 121, done: 63, progress: 38, delayed: 12, unassigned: 8 } },
  month: { achievedL: 262.1, estimateL: 390, actions: { total: 214, done: 131, progress: 52, delayed: 19, unassigned: 12 } },
  fy: { achievedL: 1780.9, estimateL: 2093, actions: { total: 1214, done: 1045, progress: 118, delayed: 31, unassigned: 20 } },
};

/** September actions per region (sums to TRACKER.head). Other ranges scale from these shares. */
export const REGION_ACTIONS: Record<string, { total: number; done: number; progress: number; delayed: number; unassigned: number }> = {
  Saurashtra: { total: 48, done: 29, progress: 12, delayed: 4, unassigned: 3 },
  "Ahmedabad Rural": { total: 34, done: 17, progress: 10, delayed: 5, unassigned: 2 },
  Vadodara: { total: 30, done: 24, progress: 5, delayed: 1, unassigned: 0 },
  Surat: { total: 32, done: 19, progress: 8, delayed: 3, unassigned: 2 },
  "Ahmedabad City": { total: 27, done: 19, progress: 6, delayed: 1, unassigned: 1 },
  Kutch: { total: 22, done: 9, progress: 6, delayed: 4, unassigned: 3 },
  "North Gujarat": { total: 21, done: 14, progress: 5, delayed: 1, unassigned: 1 },
};

// ---------------------------------------------------------------------------
// Activity — what Sales AI has been doing. Independent, timestamped entries:
// meetings and signals happen all day in parallel, so there's no fixed sequence.
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
  /** what arrived: "Morning huddle", "DMS ledger"… */
  what: string;
  region: string;
  territory?: string;
  chain: { agent: AgentId; did: string }[];
  routes: { to: Destination; n: number }[];
  /** decision number this entry sent to the Head of Sales */
  decision?: number;
}

export const ACTIVITY_DAYS = [
  { key: "29 Sep", label: "Tuesday, 29 September", short: "Today" },
  { key: "28 Sep", label: "Monday, 28 September", short: "Yesterday" },
  { key: "27 Sep", label: "Sunday, 27 September", short: "Sun" },
  { key: "26 Sep", label: "Saturday, 26 September", short: "Sat" },
  { key: "25 Sep", label: "Friday, 25 September", short: "Fri" },
  { key: "24 Sep", label: "Thursday, 24 September", short: "Thu" },
  { key: "23 Sep", label: "Wednesday, 23 September", short: "Wed" },
];

const E = (id: string, at: string, trigger: TriggerKind, source: AgentId, what: string, region: string, territory: string | undefined, chain: [AgentId, string][], routes: [Destination, number][], decision?: number): ActivityEntry => ({
  id,
  day: "29 Sep",
  at,
  trigger,
  source,
  what,
  region,
  territory,
  chain: chain.map(([agent, did]) => ({ agent, did })),
  routes: routes.map(([to, n]) => ({ to, n })),
  decision,
});

/** Today, oldest first. The 17:30 Kutch staffing call is the one still being processed when the page opens. */
const TODAY: ActivityEntry[] = [
  E("a-0730", "07:30", "scheduled", "thermometer", "Overnight SFA and DMS sync", "All regions", undefined, [["thermometer", "raised 9 signals, 2 critical"]], [["Tracker", 6], ["Market Action Plan", 3]]),
  E("a-0752", "07:52", "scheduled", "huddle", "Distributor review call", "Saurashtra", "Bhavnagar", [["huddle", "decoded a credit-terms follow-up"], ["thermometer", "matched it to the ₹1.4L overdue"]], [["Tracker", 1]]),
  E("a-0815", "08:15", "scheduled", "pitch", "Visit logs", "Saurashtra", "Porbandar", [["pitch", "found a reported ₹20/kg competitor cut"], ["thermometer", "found no second source"]], [["Tracker", 1]], 4),
  E("a-0910", "09:10", "scheduled", "huddle", "Morning huddle", "Saurashtra", undefined, [["huddle", "decoded 30 commitments"], ["thermometer", "matched 11 to live signals"]], [["Tracker", 22], ["Market Action Plan", 5], ["Pitch", 3]]),
  E("a-0925", "09:25", "scheduled", "huddle", "Morning huddle", "Vadodara", undefined, [["huddle", "decoded 14 commitments"], ["pitch", "prioritised 3 demo outlets"]], [["Tracker", 11], ["Pitch", 3]]),
  E("a-0948", "09:48", "scheduled", "huddle", "Morning huddle", "Surat", undefined, [["huddle", "decoded 12 commitments"], ["map", "linked 3 to the October draft"]], [["Tracker", 9], ["Market Action Plan", 3]]),
  E("a-1012", "10:12", "scheduled", "huddle", "Beat review", "Saurashtra", "Junagadh", [["thermometer", "flagged coverage risk on the Keshod beat"]], [["Tracker", 1]]),
  E("a-1040", "10:40", "event", "thermometer", "Collection overdue crossed ₹3L", "Ahmedabad Rural", "Dholka", [["thermometer", "traced 70% of it to 3 distributors"], ["map", "checked the September payouts due"]], [["Tracker", 2]], 1),
  E("a-1105", "11:05", "scheduled", "huddle", "Mid-day review call", "Saurashtra", "Rajkot", [["thermometer", "confirmed 9 days of primer cover"], ["pitch", "moved Sai Ashirwad to the top of Thursday's beat"]], [["Pitch", 1]]),
  E("a-1155", "11:55", "explicit", "thermometer", "Raman escalated recommendation #1", "Saurashtra", "Bhavnagar", [["thermometer", "re-scored it with today's visits"]], [], 2),
  E("a-1230", "12:30", "event", "map", "Plan pacing fell below 60%", "North Gujarat", "Palanpur", [["map", "flagged the September plan"], ["thermometer", "tied it to 3 dealers past 60 days"]], [["Market Action Plan", 1]]),
  E("a-1320", "13:20", "scheduled", "huddle", "Distributor review call", "Surat", undefined, [["huddle", "decoded 9 commitments"], ["pitch", "flagged 2 competitor schemes"]], [["Tracker", 6], ["Pitch", 3]]),
  E("a-1410", "14:10", "scheduled", "pitch", "Visit logs", "Vadodara", "Nadiad", [["pitch", "logged 18 visits"], ["thermometer", "confirmed primer overstock at 2 dealers"]], [["Tracker", 2]]),
  E("a-1500", "15:00", "scheduled", "map", "Month-end plan re-score", "All regions", undefined, [["map", "re-scored all 7 September plans"], ["thermometer", "flagged Kutch and North Gujarat"]], [["Market Action Plan", 7]]),
  E("a-1645", "16:45", "scheduled", "map", "Cross-tool sync, state level", "All regions", undefined, [["map", "merged 38 duplicates from 4 tools"]], [["Initiatives", 50]]),
  E("a-1730", "17:30", "scheduled", "huddle", "Staffing call", "Kutch", undefined, [["huddle", "decoded 11 commitments"], ["thermometer", "cross-checked 4 against coverage signals"]], [["Tracker", 7], ["Market Action Plan", 3]], 3),
];

/** Earlier days, built from the same kinds of events so the Activity Log has real length. */
const PAST_KINDS: { trigger: TriggerKind; source: AgentId; what: string; chain: [AgentId, string][]; routes: (n: number) => [Destination, number][]; scope: "region" | "territory" | "all" }[] = [
  { trigger: "scheduled", source: "thermometer", what: "Overnight SFA and DMS sync", chain: [["thermometer", "raised {n} signals"]], routes: (n) => [["Tracker", n - 2], ["Market Action Plan", 2]], scope: "all" },
  { trigger: "scheduled", source: "huddle", what: "Morning huddle", chain: [["huddle", "decoded {n} commitments"], ["thermometer", "matched {m} to live signals"]], routes: (n) => [["Tracker", n - 3], ["Pitch", 3]], scope: "region" },
  { trigger: "event", source: "thermometer", what: "Stock cover under 10 days", chain: [["thermometer", "flagged a top outlet"], ["pitch", "moved it up the next beat"]], routes: () => [["Pitch", 1]], scope: "territory" },
  { trigger: "scheduled", source: "pitch", what: "Visit logs", chain: [["pitch", "logged {n} visits"], ["thermometer", "checked them against open signals"]], routes: () => [["Tracker", 2]], scope: "territory" },
  { trigger: "event", source: "thermometer", what: "Collection overdue past 45 days", chain: [["thermometer", "traced it to {m} distributors"]], routes: (n) => [["Tracker", Math.max(1, n % 4)]], scope: "territory" },
  { trigger: "scheduled", source: "huddle", what: "Distributor review call", chain: [["huddle", "decoded {n} commitments"], ["pitch", "flagged a competitor scheme"]], routes: (n) => [["Tracker", n - 1], ["Pitch", 1]], scope: "region" },
  { trigger: "explicit", source: "map", what: "ASM edited the plan", chain: [["map", "re-scored the plan"], ["thermometer", "checked it against live signals"]], routes: () => [["Market Action Plan", 1]], scope: "region" },
  { trigger: "scheduled", source: "huddle", what: "Dealer review call", chain: [["huddle", "decoded {n} commitments"], ["map", "linked {m} to the plan"]], routes: (n) => [["Tracker", n - 2], ["Market Action Plan", 2]], scope: "region" },
];
const PAST_COUNT: Record<string, number> = { "28 Sep": 13, "27 Sep": 4, "26 Sep": 8, "25 Sep": 12, "24 Sep": 11, "23 Sep": 10 };

const PAST: ActivityEntry[] = ACTIVITY_DAYS.slice(1).flatMap((d, di) => {
  const count = PAST_COUNT[d.key];
  return Array.from({ length: count }, (_, i) => {
    const kind = i === 0 ? PAST_KINDS[0] : PAST_KINDS[1 + ((i * 3 + di) % (PAST_KINDS.length - 1))];
    const region = REGIONS[(i * 5 + di * 2) % REGIONS.length];
    const territory = region.territories[(i + di) % region.territories.length];
    const n = 4 + ((i * 7 + di * 3) % 11);
    const m = 1 + ((i + di) % 4);
    const minutes = 7 * 60 + 20 + Math.round((i / Math.max(count - 1, 1)) * (10 * 60 + 30)) + ((i * 13) % 9);
    const at = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    return {
      id: `p-${d.key}-${i}`,
      day: d.key,
      at,
      trigger: kind.trigger,
      source: kind.source,
      what: kind.what,
      region: kind.scope === "all" ? "All regions" : region.name,
      territory: kind.scope === "territory" ? territory : undefined,
      chain: kind.chain.map(([agent, did]) => ({ agent, did: did.replace("{n}", String(n)).replace("{m}", String(m)) })),
      routes: kind.routes(n).map(([to, k]) => ({ to, n: k })),
    };
  });
});

/** Every entry, newest day first, each day morning to night. */
export const ACTIVITY: ActivityEntry[] = [...TODAY, ...PAST];
/** Inputs that arrive while the homepage is open, after the 17:30 call lands. Not yet in the log at page load. */
export const LIVE_QUEUE: ActivityEntry[] = [
  E("a-1741", "17:41", "scheduled", "pitch", "Visit logs", "Saurashtra", "Rajkot", [["pitch", "logged 14 visits"], ["thermometer", "matched 2 to the primer stock signal"]], [["Tracker", 2]]),
  E("a-1752", "17:52", "event", "thermometer", "Stock cover under 10 days", "Surat", "Vapi", [["thermometer", "flagged 2 top outlets"], ["pitch", "moved them up tomorrow's beat"]], [["Pitch", 2]]),
];

export const TODAY_ACTIVITY = TODAY;
export const LIVE_ENTRY_ID = "a-1730";
/** actions an entry routed on its own (initiatives are merges, not new actions) */
export const entryActions = (e: ActivityEntry) => e.routes.filter((r) => r.to !== "Initiatives").reduce((n, r) => n + r.n, 0);

// ---------------------------------------------------------------------------
// Roll-up Action Log — September, synthesized
// ---------------------------------------------------------------------------

export const TOOL_COUNTS: { agent: AgentId | "churn"; tool: string; n: number }[] = [
  { agent: "thermometer", tool: "Thermometer", n: TRACKER.head.bySource.thermometer },
  { agent: "map", tool: "Market Action Planner", n: TRACKER.head.bySource.map },
  { agent: "huddle", tool: "Huddle", n: TRACKER.head.bySource.huddle },
  { agent: "pitch", tool: "Pitch", n: TRACKER.head.bySource.pitch },
  { agent: "churn", tool: "Churn", n: 0 },
];

export const ROLLUP = {
  month: "September",
  actions: TRACKER.head.total, // 214
  duplicatesMerged: 38,
  initiatives: 50,
  accepted: 41,
  rejected: 9,
  rejectedWhy: "5 repeated work already in a plan, 4 fell below the confidence floor",
  completed: 24,
  wip: 17,
  plannedL: 92.4,
  achievedL: 61.8,
};

export interface RollupTheme {
  theme: string;
  initiatives: number;
  accepted: number;
  completed: number;
  plannedL: number;
  achievedL: number;
  note: string;
}

export const ROLLUP_THEMES: RollupTheme[] = [
  { theme: "Retailer addition", initiatives: 15, accepted: 14, completed: 9, plannedL: 24.0, achievedL: 19.2, note: "352 new retailers billed" },
  { theme: "Collection recovery", initiatives: 10, accepted: 9, completed: 3, plannedL: 21.5, achievedL: 8.6, note: "Ahmedabad Rural and Saurashtra lag" },
  { theme: "Scheme pitching", initiatives: 8, accepted: 7, completed: 5, plannedL: 14.2, achievedL: 11.9, note: "Monsoon-repair scheme led" },
  { theme: "Influencer addition", initiatives: 7, accepted: 5, completed: 3, plannedL: 11.0, achievedL: 6.4, note: "171 applicators enrolled" },
  { theme: "Product demos at large outlets", initiatives: 5, accepted: 4, completed: 3, plannedL: 9.8, achievedL: 9.1, note: "Best return per action" },
  { theme: "Stock replenishment", initiatives: 5, accepted: 2, completed: 1, plannedL: 11.9, achievedL: 6.6, note: "3 rejected as already in plans" },
];

// ---------------------------------------------------------------------------
// Priority-tiered log — the 83 open actions, ranked by Sales AI
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
  { n: 2, label: "High", desc: "Plan gap over ₹1L, or 7+ days late" },
  { n: 3, label: "Elevated", desc: "Coverage or stock slipping" },
  { n: 4, label: "Standard", desc: "On track, due this month" },
  { n: 5, label: "Low", desc: "No deadline pressure" },
  { n: 6, label: "Watch", desc: "Parked until a signal confirms it" },
] as const;

const P1: Omit<TierItem, "id" | "region">[] = [
  { title: "Collect ₹1.3L overdue from 2 distributors", territory: "Dholka", owner: "Sudeep", source: "thermometer", status: "delayed", impact: "₹1.3L", due: "Due today" },
  { title: "Cover 41 unbilled retailers on the Anjar beat", territory: "Anjar", owner: "Vikram", source: "thermometer", status: "delayed", impact: "₹1.9L", due: "9 days late" },
  { title: "Settle the 45-day credit ask from Mahuva retailers", territory: "Bhavnagar", owner: "Raman", source: "pitch", status: "progress", impact: "₹4.2L", due: "Waiting on Decision #2" },
  { title: "Recover ₹0.9L from a distributor 70 days overdue", territory: "Viramgam", owner: "Sudeep", source: "thermometer", status: "progress", impact: "₹0.9L", due: "Due Thu" },
  { title: "Replenish Acrylic Primer at 2 top outlets", territory: "Surat City", owner: "Farhan", source: "thermometer", status: "progress", impact: "₹1.2L", due: "Due Wed" },
  { title: "Cover 38 unbilled Keshod retailers", territory: "Junagadh", owner: "Ajay T.", source: "thermometer", status: "delayed", impact: "₹1.1L", due: "8 days late" },
  { title: "Staff the Mandvi beat until the new SO joins", territory: "Mandvi", owner: "No owner", source: "map", status: "unassigned", impact: "₹0.8L", due: "Needs an owner" },
  { title: "Lift Repair Polymer sales at 12 dealers", territory: "Amreli", owner: "Kiran D.", source: "map", status: "progress", impact: "₹1.6L", due: "Due Fri" },
  { title: "Counter two competitor schemes at top outlets", territory: "Surat City", owner: "Farhan", source: "pitch", status: "progress", impact: "₹1.4L", due: "Due Thu" },
  { title: "Chase 3 dealers past 60 days overdue", territory: "Palanpur", owner: "Hitesh", source: "thermometer", status: "delayed", impact: "₹0.5L", due: "4 days late" },
  { title: "Collect ₹1.4L overdue from 6 distributors", territory: "Bhavnagar", owner: "Mehul S.", source: "thermometer", status: "progress", impact: "₹1.4L", due: "Due Thu" },
  { title: "Top up the top outlet down to 9 days' cover", territory: "Valsad", owner: "No owner", source: "thermometer", status: "unassigned", impact: "₹0.6L", due: "Needs an owner" },
];

/** Templates for tiers 2–6: [title, source, impact range ₹L]. {n} = a small count. */
const TEMPLATES: Record<number, [string, AgentId, [number, number]][]> = {
  2: [
    ["Lift Repair Polymer secondary sales", "map", [1.0, 1.8]],
    ["Run waterproofing demo days at {n} large outlets", "map", [0.9, 1.6]],
    ["Re-activate {n} dormant dealers", "thermometer", [0.6, 1.2]],
    ["Cover the vacant SO's beat", "map", [0.8, 1.4]],
    ["Chase August scheme claims from {n} distributors", "map", [0.5, 1.1]],
    ["Close the distributor ageing report", "thermometer", [0.6, 1.3]],
  ],
  3: [
    ["Add {n} new retailers on the main beat", "thermometer", [0.4, 0.9]],
    ["Enrol {n} applicators through a dealer meet", "huddle", [0.3, 0.8]],
    ["Clear 30-day overstock at {n} dealers", "thermometer", [0.4, 0.9]],
    ["Move the skipped beat to Thursday", "huddle", [0.3, 0.6]],
    ["Refresh the price list at {n} outlets", "pitch", [0.2, 0.5]],
  ],
  4: [
    ["Pitch the monsoon-repair scheme at {n} outlets", "pitch", [0.3, 0.7]],
    ["Share the October plan draft with sales officers", "map", [0.2, 0.4]],
    ["Log retailer objections from this week's visits", "pitch", [0.1, 0.3]],
    ["Review retailer onboarding numbers", "map", [0.2, 0.4]],
    ["Set up a contractor meet", "huddle", [0.3, 0.6]],
  ],
  5: [
    ["Update display photos for {n} outlets", "pitch", [0.1, 0.2]],
    ["Merge duplicate outlets in SFA", "thermometer", [0.1, 0.2]],
    ["Send sample kits to {n} new retailers", "pitch", [0.1, 0.3]],
    ["Schedule a product-training call", "huddle", [0.1, 0.2]],
  ],
  6: [
    ["Verify a competitor price claim", "huddle", [0.2, 0.9]],
    ["Watch Dr. Fixit scheme uptake", "pitch", [0.2, 0.6]],
    ["Re-check a reported stock-out", "thermometer", [0.1, 0.4]],
    ["Confirm a new dealer's GST details", "map", [0.1, 0.2]],
  ],
};

const TIER_SIZE: Record<number, number> = { 1: 12, 2: 15, 3: 16, 4: 14, 5: 13, 6: 13 }; // 83 = open actions in September
const DUE: Record<number, string[]> = {
  2: ["Due Fri", "Due Sat", "7 days late", "Due 3 Oct", "10 days late"],
  3: ["Due 5 Oct", "Due 6 Oct", "Due Fri", "Due 8 Oct"],
  4: ["Due 10 Oct", "Due 12 Oct", "Due 15 Oct"],
  5: ["No date", "Due 20 Oct", "Due 31 Oct"],
  6: ["Parked", "Re-check Thu", "Re-check 6 Oct"],
};
const STATUS_MIX: Record<number, TierItem["status"][]> = {
  2: ["delayed", "progress", "progress", "delayed", "unassigned"],
  3: ["progress", "progress", "delayed", "progress"],
  4: ["progress", "progress", "unassigned"],
  5: ["progress", "unassigned", "progress"],
  6: ["unassigned", "progress", "unassigned"],
};
const ALL_TERRITORIES = REGIONS.flatMap((r) => r.territories.map((t) => ({ t, r })));

export const TIER_ITEMS: Record<number, TierItem[]> = (() => {
  const out: Record<number, TierItem[]> = {
    1: P1.map((x, i) => ({ ...x, id: `p1-${i}`, region: regionOf(x.territory).name })),
  };
  let k = 7; // deterministic walk over the 38 territories
  for (let tier = 2; tier <= 6; tier++) {
    out[tier] = Array.from({ length: TIER_SIZE[tier] }, (_, i) => {
      const [tpl, source, [lo, hi]] = TEMPLATES[tier][i % TEMPLATES[tier].length];
      const { t, r } = ALL_TERRITORIES[(k = (k + 11) % ALL_TERRITORIES.length)];
      const n = 2 + ((i * 5 + tier) % 7);
      const status = STATUS_MIX[tier][i % STATUS_MIX[tier].length];
      const impact = lo + ((hi - lo) * ((i * 37 + tier * 13) % 10)) / 9;
      return {
        id: `p${tier}-${i}`,
        title: tpl.replace("{n}", String(n)),
        territory: t,
        region: r.name,
        owner: status === "unassigned" ? "No owner" : r.asm,
        source,
        status,
        impact: `₹${impact.toFixed(1)}L`,
        due: status === "unassigned" ? "Needs an owner" : DUE[tier][i % DUE[tier].length],
      };
    });
  }
  return out;
})();

// ---------------------------------------------------------------------------
// Action Impact Metrics — how Sales AI is learning
// ---------------------------------------------------------------------------

export interface ImpactRow {
  action: string;
  count: number;
  desired: string;
  achieved: string;
  /** 0–100; the calculation behind it is not shown */
  score: number;
  lastMonth: number;
  change: string;
}

export const IMPACT_ROWS: ImpactRow[] = [
  { action: "Product demonstration at large retail outlets", count: 18, desired: "₹9.8L", achieved: "₹9.1L", score: 88, lastMonth: 76, change: "Now suggested at every outlet above ₹2L a month" },
  { action: "Reach addition (new retailers billed)", count: 42, desired: "+420 retailers", achieved: "+352", score: 84, lastMonth: 78, change: "Weighted up in October drafts" },
  { action: "Scheme pitching", count: 36, desired: "₹14.2L sell-in", achieved: "₹11.9L", score: 81, lastMonth: 80, change: "No change" },
  { action: "Dormant dealer re-activation", count: 19, desired: "38 dealers", achieved: "27", score: 71, lastMonth: 69, change: "No change" },
  { action: "Influencer addition (applicators)", count: 28, desired: "+260 applicators", achieved: "+171", score: 66, lastMonth: 71, change: "Now paired with a demo day" },
  { action: "Stock top-ups at top outlets", count: 24, desired: "₹11.9L", achieved: "₹6.6L", score: 58, lastMonth: 55, change: "Triggers at 10 days' cover, not 7" },
  { action: "Collection recovery drives", count: 31, desired: "₹21.5L", achieved: "₹8.6L", score: 47, lastMonth: 58, change: "Escalates at 30 days overdue, not 45" },
];

export const IMPACT_CONFIDENCE = conf(
  74,
  "Scores come from completed actions only. Demo and scheme actions have large samples; influencer addition has 28, so its score moves more month to month.",
  [0.72, 0.88, 0.7],
  [
    { agent: "thermometer", title: "131 completed actions", detail: "September, all 7 regions", when: "Today, 16:45", ageHours: 1, independent: true },
    { agent: "map", title: "Plan outcomes", detail: "Apr–Aug, 7 ASMs", when: "Aug month-end", ageHours: 700, independent: true },
  ],
  "16:45"
);

// ---------------------------------------------------------------------------
// Rolled-up ASM content
// ---------------------------------------------------------------------------

/** Insights still waiting on the Head of Sales — not decisions, and not what the ASMs already closed. */
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

export const LEAD_INSIGHTS_SUMMARY =
  "Three things need a call from you that aren't decisions yet: competitor schemes in Surat, primer that could move from Vadodara to Surat, and North Gujarat's slipping plan. 9 other ASM insights were closed this week and aren't shown.";

export const LEAD_INSIGHTS: LeadInsight[] = [
  {
    id: "li-1",
    headline: "Vadodara has 31–33 days of primer overstock while three Surat outlets are down to 7–9 days. Moving stock between the two regions would cover both.",
    region: "Vadodara · Surat",
    asms: ["Neha", "Farhan"],
    from: "Thermometer, across regions",
    agent: "thermometer",
    when: "14:10",
    confidence: conf(
      79,
      "High on the stock figures, both from DMS. Whether the distributors will agree to a transfer is not known.",
      [0.78, 0.92, 0.74],
      [
        { agent: "thermometer", title: "Stock cover, 2 regions", detail: "Nadiad and Vadodara City vs Surat City and Valsad", when: "Today, 14:10", ageHours: 3, independent: true },
        { agent: "pitch", title: "18 Vadodara visit logs", detail: "Dealers asking for slower primer deliveries", when: "Today", ageHours: 4, independent: true },
      ],
      "14:10"
    ),
  },
  {
    id: "li-2",
    headline: "Two competitor schemes are running at Surat's top outlets while stock cover there is down to 7–8 days.",
    region: "Surat",
    asms: ["Farhan"],
    from: "Distributor review call",
    agent: "huddle",
    when: "13:20",
    confidence: conf(
      68,
      "Medium: the schemes were seen on two separate visits; stock cover is measured from DMS. Whether the schemes are pulling sales yet is not known.",
      [0.66, 0.9, 0.62],
      [
        { agent: "huddle", title: "Surat review call", detail: "Farhan's team, 32 min", when: "Today, 13:20", ageHours: 4, independent: true },
        { agent: "pitch", title: "2 visit logs", detail: "Scheme leaflets at 2 outlets", when: "Since Mon", ageHours: 30, independent: true },
      ],
      "13:20"
    ),
  },
  {
    id: "li-3",
    headline: "North Gujarat will close near 59% of plan. Most of the gap is 3 Palanpur dealers past 60 days overdue, who have also stopped ordering.",
    region: "North Gujarat",
    asms: ["Hitesh"],
    from: "Plan re-score",
    agent: "map",
    when: "15:00",
    confidence: conf(
      74,
      "Medium-high: plan actuals are measured; the link between overdue and stopped orders comes from 3 dealers, a small sample.",
      [0.72, 0.9, 0.7],
      [
        { agent: "map", title: "September plan re-score", detail: "₹29.3L of ₹50L", when: "Today, 15:00", ageHours: 2, independent: true },
        { agent: "thermometer", title: "Dealer overdue", detail: "3 dealers, ₹0.5L past 60 days", when: "Today, 12:30", ageHours: 5, independent: true },
      ],
      "15:00"
    ),
  },
];

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

const I = (title: string, territory: string, detail: string, valueL: number, status: PlanInitiative["status"]): PlanInitiative => ({ title, territory, detail, valueL, status });

const PLAN_INITIATIVES: Record<string, PlanInitiative[]> = {
  Saurashtra: [
    I("Repair Polymer restart", "Amreli", "12 dealers", 6.2, "progress"),
    I("Keshod beat coverage", "Junagadh", "38 retailers", 3.4, "delayed"),
    I("Collection recovery", "Bhavnagar", "6 distributors", 1.4, "progress"),
    I("Monsoon-repair displays", "Rajkot", "8 outlets", 2.1, "done"),
  ],
  "Ahmedabad Rural": [
    I("Collection recovery", "Dholka", "2 distributors", 2.3, "delayed"),
    I("Collection recovery", "Viramgam", "1 distributor, 70 days", 0.9, "progress"),
    I("Retailer addition", "Sanand", "24 retailers", 2.6, "done"),
    I("Scheme pitching", "Bavla", "15 outlets", 1.9, "progress"),
  ],
  Vadodara: [
    I("Demo days at large outlets", "Vadodara City", "6 outlets", 4.1, "done"),
    I("Primer overstock clearance", "Nadiad", "2 dealers", 2.2, "progress"),
    I("Applicator enrolment", "Anand", "40 applicators", 1.6, "done"),
  ],
  Surat: [
    I("Stock top-ups at top outlets", "Surat City", "2 outlets", 2.6, "progress"),
    I("Counter competitor schemes", "Surat City", "3 outlets", 2.4, "progress"),
    I("Stock top-up", "Valsad", "1 top outlet", 1.2, "progress"),
    I("Retailer addition", "Vapi", "18 retailers", 2.1, "done"),
  ],
  "Ahmedabad City": [
    I("Retailer addition", "Bopal", "30 retailers", 3.1, "done"),
    I("Scheme pitching", "Maninagar", "20 outlets", 2.5, "done"),
    I("Dealer overdue follow-up", "Naroda", "2 dealers", 0.4, "progress"),
  ],
  Kutch: [
    I("Beat coverage", "Anjar", "41 retailers", 3.6, "delayed"),
    I("SO hiring", "Mandvi", "1 seat open", 0, "delayed"),
    I("Dealer re-activation", "Bhuj", "5 dealers", 1.2, "progress"),
  ],
  "North Gujarat": [
    I("Dealer overdue recovery", "Palanpur", "3 dealers", 0.5, "progress"),
    I("Demo days at large outlets", "Mehsana", "4 outlets", 2.2, "done"),
    I("Retailer addition", "Patan", "22 retailers", 2.4, "progress"),
  ],
};

export const PLAN_REVIEWS: PlanReview[] = REGIONS.map((r) => ({
  region: r.name,
  asm: r.asm,
  estimateL: r.sepEstimateL,
  achievedL: r.sepAchievedL,
  initiatives: PLAN_INITIATIVES[r.name],
  tickets: r.name === "Kutch" ? [{ id: "DL-2038", text: "Can a Bhuj officer cover Anjar for two weeks?", state: "In progress · Vikram" }] : r.name === "Surat" ? [{ id: "DL-2031", text: "Show me the scheme sell-through before the October draft.", state: "Answered · Farhan" }] : [],
}));

export type Rag = "red" | "amber" | "green";

export interface ScorecardRow {
  region: string;
  asm: string;
  rag: Rag;
  open: number;
  /** % of signals actioned within 48 hours */
  actioned48: number;
  resolved: number;
  top: string;
}

export const SCORECARD: ScorecardRow[] = [
  { region: "Saurashtra", asm: "Raman", rag: "amber", open: 6, actioned48: 67, resolved: 14, top: "Coverage · Junagadh −14%" },
  { region: "Ahmedabad Rural", asm: "Sudeep", rag: "red", open: 5, actioned48: 40, resolved: 8, top: "Collection · ₹3.2L overdue" },
  { region: "Vadodara", asm: "Neha", rag: "green", open: 2, actioned48: 100, resolved: 17, top: "Stock · primer overstock" },
  { region: "Surat", asm: "Farhan", rag: "amber", open: 4, actioned48: 75, resolved: 11, top: "Pricing · 2 competitor schemes" },
  { region: "Ahmedabad City", asm: "Priya", rag: "green", open: 1, actioned48: 100, resolved: 12, top: "Collection · 2 Naroda dealers" },
  { region: "Kutch", asm: "Vikram", rag: "red", open: 5, actioned48: 20, resolved: 5, top: "Coverage · 2 SO vacancies" },
  { region: "North Gujarat", asm: "Hitesh", rag: "amber", open: 3, actioned48: 67, resolved: 10, top: "Pricing · competitor price list" },
];

// ---------------------------------------------------------------------------
// Configuration
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

export const THRESHOLDS: Threshold[] = [
  { id: "collection", area: "Collections", metric: "Payout hold exposure", mode: "below", value: 2, min: 0, max: 6, step: 0.5, fmt: (v) => `₹${v}L`, last30: { auto: 14, escalated: 2 }, pending: { decision: 1, at: 3.2, label: "₹3.2L" } },
  { id: "credit", area: "Credit", metric: "Credit period offered to retailers", mode: "below", value: 30, min: 15, max: 60, step: 5, fmt: (v) => `${v} days`, last30: { auto: 22, escalated: 1 }, pending: { decision: 2, at: 45, label: "45 days" } },
  { id: "price", area: "Pricing", metric: "Change to list price", mode: "below", value: 0, min: 0, max: 10, step: 0.5, fmt: (v) => (v === 0 ? "No change" : `${v}%`), last30: { auto: 0, escalated: 3 }, pending: { decision: 4, at: 6, label: "~6%" } },
  { id: "scheme", area: "Schemes", metric: "Scheme budget per region, per month", mode: "below", value: 3, min: 0, max: 10, step: 0.5, fmt: (v) => `₹${v}L`, last30: { auto: 9, escalated: 1 } },
  { id: "plan", area: "Plans", metric: "Target revision on a live plan", mode: "below", value: 5, min: 0, max: 20, step: 1, fmt: (v) => `±${v}%`, last30: { auto: 6, escalated: 0 } },
  { id: "confidence", area: "All areas", metric: "Minimum confidence to act alone", mode: "above", value: 70, min: 50, max: 95, step: 5, fmt: (v) => `${v}%`, last30: { auto: 188, escalated: 4 } },
  { id: "people", area: "People", metric: "Moving sales officers across ASMs", mode: "always", value: 0, min: 0, max: 0, step: 0, fmt: () => "Always", last30: { auto: 0, escalated: 1 }, pending: { decision: 3, at: 0, label: "2 officers" } },
];

export const CONFIG_HISTORY = [
  { when: "22 Sep, 18:05", who: "Anil Menon", what: "Stock cover alert raised from 7 to 10 days" },
  { when: "22 Sep, 18:04", who: "Anil Menon", what: "Collection overdue signal lowered from 45 to 30 days" },
  { when: "1 Sep, 10:30", who: "Anil Menon", what: "Minimum confidence to act alone raised from 65% to 70%" },
];
