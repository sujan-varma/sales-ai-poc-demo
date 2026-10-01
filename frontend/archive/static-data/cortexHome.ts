// Single source of truth for the Cortex Home wireframes (Option A + Option C).
// Both layouts read only from this file so their content stays identical.

export type AgentId = "huddle" | "thermometer" | "map" | "pitch";
export type ActionStatus = "done" | "progress" | "delayed" | "unassigned";
export type ViewerRole = "asm" | "head";

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  stat: string;
  color: string;
}

export const AGENTS: Record<AgentId, Agent> = {
  huddle: {
    id: "huddle",
    name: "Huddle",
    role: "Meeting intelligence",
    description: "Calls, huddles and reviews, distilled into findings.",
    stat: "7 conversations today",
    color: "#4f96ef",
  },
  thermometer: {
    id: "thermometer",
    name: "Thermometer",
    role: "Performance signals",
    description: "Live signals and the actions they call for.",
    stat: "6 recommendations open",
    color: "#e85a70",
  },
  map: {
    id: "map",
    name: "Market Action Plan",
    role: "Territory planning",
    description: "One monthly plan across all six territories.",
    stat: "October plan not created",
    color: "#9a7cf0",
  },
  pitch: {
    id: "pitch",
    name: "Pitch",
    role: "Customer conversations",
    description: "What retailers and dealers tell your team on visits.",
    stat: "23 visits logged this week",
    color: "#7ca324",
  },
};

export const AGENT_ORDER: AgentId[] = ["huddle", "thermometer", "map", "pitch"];

export const STATUS_META: Record<ActionStatus, { label: string; color: string }> = {
  done: { label: "Completed", color: "#2fa85c" },
  progress: { label: "In progress", color: "#a1a1aa" },
  delayed: { label: "Delayed", color: "#c28a12" },
  unassigned: { label: "Unassigned", color: "#52525b" },
};

// ---------------------------------------------------------------------------
// Confidence — every AI-generated item carries one of these, no exceptions.
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

export const VIEWER = {
  asm: {
    name: "Raman",
    initials: "RM",
    role: "Area Sales Manager",
    scope: "Saurashtra, Gujarat · 6 territories",
    greeting: "Good morning, Raman",
  },
  head: {
    name: "Anil Menon",
    initials: "AM",
    role: "Sales Head · read-only",
    scope: "Gujarat · 7 ASMs · 38 territories",
    greeting: "Good morning, Anil",
  },
  exec: {
    name: "Ajay Talukar",
    initials: "AT",
    role: "Sales Executive",
    scope: "Junagadh territory · 10 outlets",
    greeting: "Good morning, Ajay",
  },
} as const;

export const TODAY_LABEL = "Tuesday, 29 September 2026";
export const SYNC_LABEL = "Synced with SFA 4 min ago";
export const TERRITORIES = ["Bhavnagar", "Junagadh", "Amreli", "Rajkot", "Jamnagar", "Porbandar"];

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

export interface Insight {
  id: string;
  headline: string;
  body: string;
  origin: { agent: AgentId; when: string };
  connects: { label: string; target: string; agent: AgentId }[];
  confidence: Confidence;
}

export const INSIGHTS_SUMMARY = {
  short: "Two territories need your decision today, September is closing near 68% of plan, and one loud signal is still unverified.",
  text: "Two territories need a decision from you today (Bhavnagar collections, Junagadh coverage). September will close near 68% of plan, with Amreli carrying most of the gap. One competitor signal in Porbandar is loud but unverified — hold before acting.",
  confidence: {
    score: 84,
    rationale:
      "Synthesised from the four insights below. Weighted toward the two high-confidence reads; the Porbandar signal is called out as unverified rather than counted.",
    factors: { corroboration: 0.82, freshness: 0.9, reliability: 0.8 },
    sources: [
      { agent: "thermometer", title: "5 open signals", detail: "Collection 2 · Coverage 2 · Revenue 1", when: "09:40 today", ageHours: 1, independent: true },
      { agent: "huddle", title: "2 conversations", detail: "Distributor review call and the morning huddle", when: "since 07:52 today", ageHours: 3, independent: true },
      { agent: "pitch", title: "11 visit logs", detail: "Bhavnagar and Junagadh visits since Friday", when: "since Fri 25 Sep", ageHours: 96, independent: true },
      { agent: "map", title: "September plan pacing", detail: "Actuals through 28 Sep", when: "08:00 today", ageHours: 3, independent: false },
    ],
    rescoredAt: "09:40",
  } satisfies Confidence,
};

export const INSIGHTS: Insight[] = [
  {
    id: "ins-collection",
    headline: "Bhavnagar's collection problem is moving downstream, from distributors to retailers.",
    body: "Thermometer flagged ₹1.4L overdue across 6 distributors on Monday. On this morning's call, two of those distributors said retailers are holding payments until the post-monsoon repair season picks up, and Pitch logged the same credit-extension objection at 3 retailer visits since Friday. Treat it as a credit-terms problem, not a follow-up cadence problem.",
    origin: { agent: "thermometer", when: "Mon 28 Sep" },
    connects: [
      { label: "Tracker · Collection follow-up", target: "act-bhavnagar", agent: "thermometer" },
      { label: "Recommendation #1", target: "rec-1", agent: "thermometer" },
      { label: "Huddle quote · 10:12", target: "find-1", agent: "huddle" },
    ],
    confidence: {
      score: 92,
      rationale: "High because three independent agents reached the same conclusion within 36 hours, and the distributor statement is first-hand.",
      factors: { corroboration: 0.95, freshness: 0.92, reliability: 0.88 },
      sources: [
        { agent: "thermometer", title: "Overdue collection signal", detail: "₹1.4L across 6 distributors, 60% recovered", when: "Mon 28 Sep, 08:00", ageHours: 26, independent: true },
        { agent: "huddle", title: "Distributor review call", detail: "Kishore Patel, Shree Ambica Traders, at 04:31", when: "Today, 10:12", ageHours: 1, independent: true },
        { agent: "pitch", title: "3 retailer visit logs", detail: "Objection tagged “credit extension”", when: "Fri 25 – Mon 28 Sep", ageHours: 36, independent: true },
      ],
      rescoredAt: "10:20",
    },
  },
  {
    id: "ins-coverage",
    headline: "Junagadh's coverage drop is a route problem, not a demand problem.",
    body: "Retailer coverage is down 14% in Junagadh, but order value per visit is up 8%, so the outlets being reached are buying. The gap traces to the Keshod cluster: the Tuesday beat has been skipped for two weeks because of road work. Re-sequencing the beat should recover most of it without extra spend.",
    origin: { agent: "thermometer", when: "Sun 27 Sep" },
    connects: [
      { label: "Tracker · Keshod coverage", target: "act-junagadh", agent: "thermometer" },
      { label: "Recommendation #2", target: "rec-2", agent: "thermometer" },
      { label: "Huddle quote · 09:05", target: "find-2", agent: "huddle" },
    ],
    confidence: {
      score: 78,
      rationale: "Medium-high: the numbers from Thermometer and Pitch agree, but the cause rests on one sales officer's account in this morning's huddle.",
      factors: { corroboration: 0.7, freshness: 0.88, reliability: 0.76 },
      sources: [
        { agent: "thermometer", title: "Coverage signal", detail: "−14% retailers billed, Junagadh, 4 weeks", when: "Sun 27 Sep", ageHours: 50, independent: true },
        { agent: "pitch", title: "Order value per visit", detail: "+8% across 42 Junagadh visits", when: "Mon 28 Sep", ageHours: 28, independent: true },
        { agent: "huddle", title: "Morning huddle", detail: "Ajay Talukar, at 02:14 — cause only", when: "Today, 09:05", ageHours: 2, independent: false },
      ],
      rescoredAt: "09:40",
    },
  },
  {
    id: "ins-pacing",
    headline: "September will close near 68% of plan, and Amreli's Repair Polymer line is 70% of the gap.",
    body: "With one day left the plan is at ₹38.6L of ₹60L. Every territory except Amreli is within 10 points of its estimate. Amreli's Repair Polymer sell-through stalled after the scheme ended on 15 Sep, which is worth carrying into October's plan as a restart rather than a new initiative.",
    origin: { agent: "map", when: "Today, 08:00" },
    connects: [
      { label: "Market Action Plan · September", target: "map-panel", agent: "map" },
      { label: "Recommendation #3", target: "rec-3", agent: "thermometer" },
      { label: "Tracker · Amreli secondary", target: "act-amreli", agent: "map" },
    ],
    confidence: {
      score: 85,
      rationale: "High: plan actuals and the revenue signal agree, and the data is less than a day old. Month-end closing could still shift the final number by 2–3 points.",
      factors: { corroboration: 0.84, freshness: 0.95, reliability: 0.82 },
      sources: [
        { agent: "map", title: "September plan actuals", detail: "₹38.6L of ₹60L, through 28 Sep", when: "Today, 08:00", ageHours: 3, independent: true },
        { agent: "thermometer", title: "Revenue signal", detail: "Amreli Repair Polymer −31% vs estimate", when: "Mon 28 Sep", ageHours: 27, independent: true },
      ],
      rescoredAt: "09:40",
    },
  },
  {
    id: "ins-competitor",
    headline: "A competitor price cut in Porbandar is being repeated, but nobody has seen it yet.",
    body: "One dealer said a neighbour is getting ₹20/kg off Dr. Fixit waterproofing. There is no matching drop in Porbandar sales, no invoice, and no second mention in Pitch. Worth a verification visit before matching any price.",
    origin: { agent: "huddle", when: "Today, 09:05" },
    connects: [
      { label: "Recommendation #6", target: "rec-6", agent: "thermometer" },
      { label: "Tracker · Verify pricing", target: "act-porbandar", agent: "huddle" },
      { label: "Huddle quote · 09:05", target: "find-3", agent: "huddle" },
    ],
    confidence: {
      score: 38,
      rationale: "Low because it is a single, second-hand statement with no corroboration from sales data or visit logs.",
      factors: { corroboration: 0.1, freshness: 0.8, reliability: 0.35 },
      sources: [
        { agent: "huddle", title: "Morning huddle", detail: "Relayed by Vipul M. from Jalaram Hardware, at 07:52", when: "Today, 09:05", ageHours: 17, independent: true },
        { agent: "thermometer", title: "No matching sales drop", detail: "Porbandar waterproofing flat week-on-week", when: "Today, 08:00", ageHours: 3, independent: false },
      ],
      rescoredAt: "09:40",
    },
  },
];

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

export const WEEK_DAYS = ["Wed 23", "Thu 24", "Fri 25", "Sat 26", "Sun 27", "Mon 28", "Tue 29"];

const ASM_DOTS: WeekDot[] = [
  { agent: "huddle", day: 0, hour: 10, status: "done", label: "Confirm Rajkot dealer meet date" },
  { agent: "huddle", day: 2, hour: 17, status: "done", label: "Share scheme sheet with Amreli SOs" },
  { agent: "huddle", day: 5, hour: 9, status: "progress", label: "Collect distributor ageing report, Bhavnagar" },
  { agent: "huddle", day: 5, hour: 18, status: "unassigned", label: "Verify competitor pricing, Porbandar" },
  { agent: "huddle", day: 6, hour: 9, status: "progress", label: "Draft alternate Keshod beat" },
  { agent: "thermometer", day: 0, hour: 8, status: "done", label: "Top-up Acrylic Primer, Rajkot" },
  { agent: "thermometer", day: 1, hour: 8, status: "done", label: "Call 3 dormant dealers, Jamnagar" },
  { agent: "thermometer", day: 2, hour: 8, status: "delayed", label: "Keshod retailer coverage" },
  { agent: "thermometer", day: 4, hour: 8, status: "progress", label: "Re-activate 2 dealers, Jamnagar" },
  { agent: "thermometer", day: 5, hour: 8, status: "progress", label: "Collection follow-up, Bhavnagar" },
  { agent: "thermometer", day: 6, hour: 8, status: "unassigned", label: "Stock check, Sai Ashirwad Tiles Galaxy" },
  { agent: "map", day: 0, hour: 11, status: "done", label: "Monsoon-repair display, 8 outlets" },
  { agent: "map", day: 1, hour: 14, status: "done", label: "Dealer credit review, Rajkot" },
  { agent: "map", day: 2, hour: 11, status: "progress", label: "Repair Polymer secondary sales, Amreli" },
  { agent: "map", day: 3, hour: 12, status: "done", label: "Retailer onboarding, Jamnagar" },
  { agent: "map", day: 5, hour: 15, status: "delayed", label: "Waterproofing demo days, Junagadh" },
  { agent: "pitch", day: 1, hour: 16, status: "done", label: "Send sample kit, National Nikhil Cement" },
  { agent: "pitch", day: 2, hour: 13, status: "progress", label: "Respond to 45-day credit ask, Mahuva" },
  { agent: "pitch", day: 4, hour: 12, status: "done", label: "Price list refresh, Porbandar" },
  { agent: "pitch", day: 6, hour: 11, status: "progress", label: "Follow up on retailer objection, Bhavnagar" },
];

function scaleDots(base: WeekDot[], copies: number): WeekDot[] {
  // Deterministic "rolled-up" dot field for the sales-head view.
  const out: WeekDot[] = [];
  for (let c = 0; c < copies; c++) {
    base.forEach((d, i) => {
      const jitter = ((i * 7 + c * 13) % 10) / 10;
      out.push({ ...d, hour: Math.min(23, (d.hour + c * 5 + jitter * 3) % 24), label: `${d.label} (ASM ${c + 1})` });
    });
  }
  return out;
}

export const TRACKER: Record<ViewerRole, TrackerData> = {
  asm: {
    scopeLabel: "My actions, from all four agents · September",
    total: 48,
    counts: { done: 29, progress: 12, delayed: 4, unassigned: 3 },
    bySource: { thermometer: 17, map: 15, huddle: 10, pitch: 6 },
    attention: [
      { id: "act-bhavnagar", where: "Bhavnagar", action: "Collection follow-up", detail: "Due in 2 days · 60% recovered", status: "progress", source: "thermometer", owner: "Mehul S." },
      { id: "act-junagadh", where: "Junagadh", action: "Keshod retailer coverage", detail: "8 days overdue", status: "delayed", source: "thermometer", owner: "Ajay T." },
      { id: "act-amreli", where: "Amreli", action: "Repair Polymer secondary sales", detail: "54% of September estimate", status: "progress", source: "map", owner: "Kiran D." },
      { id: "act-porbandar", where: "Porbandar", action: "Verify competitor pricing claim", detail: "Raised yesterday · no owner", status: "unassigned", source: "huddle" },
    ],
    dots: ASM_DOTS,
  },
  head: {
    scopeLabel: "All actions under me · 7 ASMs · September",
    total: 214,
    counts: { done: 131, progress: 52, delayed: 19, unassigned: 12 },
    bySource: { thermometer: 78, map: 64, huddle: 45, pitch: 27 },
    attention: [
      { id: "act-head-1", where: "Raman · Saurashtra", action: "4 delayed actions", detail: "Keshod coverage 8 days overdue", status: "delayed", source: "thermometer" },
      { id: "act-head-2", where: "Sudeep · Ahmedabad Rural", action: "Collection recovery", detail: "41% recovered, due Fri", status: "progress", source: "thermometer" },
      { id: "act-head-3", where: "Neha · Vadodara", action: "October plan draft", detail: "5 actions without an owner", status: "unassigned", source: "map" },
    ],
    dots: scaleDots(ASM_DOTS, 3),
  },
};

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
  /** when Thermometer first raised it — drives Today / This week / This month */
  raisedHoursAgo: number;
  confidence: Confidence;
}

export const SIGNAL_COUNTS: { type: SignalType; count: number }[] = [
  { type: "Collection", count: 1 },
  { type: "Coverage", count: 2 },
  { type: "Revenue", count: 1 },
  { type: "Stock", count: 1 },
  { type: "Pricing", count: 1 },
];

export const RECOMMENDATIONS: Recommendation[] = [
  {
    id: "rec-1",
    n: 1,
    territory: "Bhavnagar",
    signal: "Collection",
    title: "Call the 6 overdue distributors before 5 Oct and offer a 15-day bridge on retailer credit.",
    why: "60% recovered so far; retailers are the bottleneck, not distributors.",
    impactL: 1.4,
    impactLabel: "₹1.4L outstanding",
    pitchFor: "Mahuva retailers on Thursday's beat",
    product: "Waterproofing Compound",
    sector: "Retail",
    segment: "Hardware & Paint",
    raisedHoursAgo: 26,
    confidence: INSIGHTS[0].confidence,
  },
  {
    id: "rec-2",
    n: 2,
    territory: "Junagadh",
    signal: "Coverage",
    title: "Move the Tuesday Keshod beat to Thursday until the road work clears.",
    why: "38 retailers unbilled for two weeks; order value per visit is up.",
    impactL: 3.2,
    impactLabel: "₹3.2L monthly billing",
    pitchFor: "Keshod cluster, Thursday beat",
    product: "Repair Polymer",
    sector: "Retail",
    segment: "Hardware & Paint",
    raisedHoursAgo: 50,
    confidence: { ...INSIGHTS[1].confidence, score: 84, rationale: "High: the skipped beat is visible in SFA visit data as well as the huddle, so the action no longer depends on one account." , sources: [...INSIGHTS[1].confidence.sources.slice(0, 2), { agent: "huddle", title: "Morning huddle", detail: "Ajay Talukar, at 02:14", when: "Today, 09:05", ageHours: 2, independent: true }] },
  },
  {
    id: "rec-3",
    n: 3,
    territory: "Amreli",
    signal: "Revenue",
    title: "Restart the Repair Polymer scheme at 12 dealers for the first two weeks of October.",
    why: "Sell-through fell 31% after the scheme ended on 15 Sep.",
    impactL: 4.1,
    impactLabel: "₹4.1L October upside",
    pitchFor: "Patel Hardware + 11 Amreli dealers",
    product: "Repair Polymer",
    sector: "Retail",
    segment: "Cement-Steel Dealers",
    raisedHoursAgo: 27,
    confidence: {
      score: 71,
      rationale: "Medium: the drop is clearly linked to the scheme ending, but last year's restart recovered only 60% of the loss, so upside is uncertain.",
      factors: { corroboration: 0.72, freshness: 0.9, reliability: 0.6 },
      sources: [
        { agent: "thermometer", title: "Revenue signal", detail: "Repair Polymer −31% vs estimate", when: "Mon 28 Sep", ageHours: 27, independent: true },
        { agent: "map", title: "September plan actuals", detail: "Amreli at 54% of estimate", when: "Today, 08:00", ageHours: 3, independent: true },
        { agent: "map", title: "Last year's restart", detail: "Oct 2025 recovered 60% of the drop", when: "Oct 2025", ageHours: 8760, independent: false },
      ],
      rescoredAt: "09:40",
    },
  },
  {
    id: "rec-4",
    n: 4,
    territory: "Rajkot",
    signal: "Stock",
    title: "Replenish Acrylic Primer at Sai Ashirwad Tiles Galaxy: 9 days of cover left.",
    why: "Top-10 outlet; stocked out for 6 days in August.",
    impactL: 0.9,
    impactLabel: "₹0.9L at risk",
    pitchFor: "Sai Ashirwad Tiles Galaxy",
    product: "Acrylic Primer",
    sector: "Retail",
    segment: "Tile & Sanitaryware",
    raisedHoursAgo: 3,
    confidence: {
      score: 89,
      rationale: "High: stock and sell-through data are both from SFA, updated this morning, and match the retailer's own ask on Friday's visit.",
      factors: { corroboration: 0.86, freshness: 0.97, reliability: 0.9 },
      sources: [
        { agent: "thermometer", title: "Stock cover signal", detail: "9 days at current run-rate", when: "Today, 08:00", ageHours: 3, independent: true },
        { agent: "pitch", title: "Visit log", detail: "Owner asked for early reorder", when: "Fri 25 Sep", ageHours: 94, independent: true },
      ],
      rescoredAt: "09:40",
    },
  },
  {
    id: "rec-5",
    n: 5,
    territory: "Jamnagar",
    signal: "Coverage",
    title: "Re-activate 5 dealers with no orders in 60+ days.",
    why: "Two of the five responded to last week's calls.",
    impactL: 2.2,
    impactLabel: "₹2.2L potential",
    pitchFor: "5 dormant Jamnagar dealers",
    product: "Waterproofing Compound",
    sector: "Projects",
    segment: "Cement-Steel Dealers",
    raisedHoursAgo: 240,
    confidence: {
      score: 63,
      rationale: "Medium: the dormancy is certain, but why these dealers stopped ordering isn't known yet, so the impact estimate is loose.",
      factors: { corroboration: 0.55, freshness: 0.75, reliability: 0.62 },
      sources: [
        { agent: "thermometer", title: "Dormancy signal", detail: "5 dealers, 60–84 days since last order", when: "Thu 24 Sep", ageHours: 122, independent: true },
        { agent: "pitch", title: "2 call logs", detail: "Interest, no order yet", when: "Fri 25 Sep", ageHours: 96, independent: false },
      ],
      rescoredAt: "09:40",
    },
  },
  {
    id: "rec-6",
    n: 6,
    territory: "Porbandar",
    signal: "Pricing",
    title: "Match the reported ₹20/kg cut on Waterproofing Compound at 4 dealers.",
    why: "Single second-hand report. Verify before acting.",
    impactL: 2.7,
    impactLabel: "₹2.7L at stake",
    pitchFor: "Jalaram Hardware (verify pricing)",
    product: "Waterproofing Compound",
    sector: "Retail",
    segment: "Hardware & Paint",
    raisedHoursAgo: 17,
    confidence: INSIGHTS[3].confidence,
  },
];

export type RecDecision = "tracked" | "escalated" | "dismissed";

/** Sales-head view: who owns each recommendation, and what they did with it. */
export const HEAD_REC_STATUS: Record<string, { owner: string; state: string }> = {
  "rec-1": { owner: "Raman", state: "Awaiting decision" },
  "rec-2": { owner: "Raman", state: "Added to Tracker" },
  "rec-3": { owner: "Raman", state: "Escalated to October plan" },
  "rec-4": { owner: "Raman", state: "Awaiting decision" },
  "rec-5": { owner: "Raman", state: "Awaiting decision" },
  "rec-6": { owner: "Raman", state: "Dismissed · verify first" },
};

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

export const PLAN_MONTHS: PlanMonth[] = [
  { month: "Apr", created: true, estimateL: 48, achievedL: 44.2, status: "delivered", note: "Built on Mar month-end" },
  { month: "May", created: true, estimateL: 52, achievedL: 50.4, status: "delivered", note: "Built on Apr month-end" },
  { month: "Jun", created: true, estimateL: 50, achievedL: 41.5, status: "delivered", note: "Monsoon onset" },
  { month: "Jul", created: true, estimateL: 55, achievedL: 49.0, status: "delivered", note: "Built on Jun month-end" },
  { month: "Aug", created: true, estimateL: 58, achievedL: 53.4, status: "delivered", note: "Built on Jul month-end" },
  { month: "Sep", created: true, estimateL: 60, achievedL: 38.6, status: "progress", note: "1 day left · projected ~68%" },
  { month: "Oct", created: false, estimateL: null, achievedL: null, status: "not-started", note: "Not created · Sep month-end lands 1 Oct" },
];

/** Indian financial year: 1 April – 31 March. Plans are monthly; there is no annual target. */
export const FISCAL_YEAR = { label: "FY 2026–27", span: "1 Apr 2026 – 31 Mar 2027", toDate: "Apr – Sep 2026, to 29 Sep" };

export const PLAN_META = {
  owner: "Raman",
  scope: "One plan · all 6 territories",
  refresh: "Refreshed monthly on prior month-end data",
  ytdEstimateL: 323,
  ytdAchievedL: 277.1,
};

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
  confidence: Confidence;
}

export const FINDINGS: Finding[] = [
  {
    id: "find-1",
    theme: "Credit terms pressure",
    quote: "Retailers in Mahuva are asking us for 45 days. We give 30. Until the repair season starts, nobody is paying early.",
    speaker: "Kishore Patel",
    speakerRole: "Distributor · Shree Ambica Traders, Bhavnagar",
    session: "Distributor review call",
    when: "Today, 10:12",
    at: "04:31",
    insight: "ins-collection",
    confidence: {
      score: 86,
      rationale: "High: first-hand statement from the distributor, and the same 45-day ask appears in two Pitch visit logs.",
      factors: { corroboration: 0.8, freshness: 0.98, reliability: 0.84 },
      sources: [
        { agent: "huddle", title: "Transcript segment", detail: "04:31 – 05:02, speaker verified", when: "Today, 10:12", ageHours: 1, independent: true },
        { agent: "pitch", title: "2 visit logs", detail: "“45-day credit” objection, Mahuva", when: "Sat 26 Sep", ageHours: 72, independent: true },
      ],
      rescoredAt: "10:20",
    },
  },
  {
    id: "find-2",
    theme: "Beat disruption",
    quote: "With the Keshod road dug up, we've been skipping the Tuesday beat entirely for two weeks.",
    speaker: "Ajay Talukar",
    speakerRole: "Sales Officer · Junagadh",
    session: "Morning huddle",
    when: "Today, 09:05",
    at: "02:14",
    insight: "ins-coverage",
    confidence: {
      score: 81,
      rationale: "High: the skipped visits are visible in SFA check-in data for the last two Tuesdays.",
      factors: { corroboration: 0.78, freshness: 0.97, reliability: 0.8 },
      sources: [
        { agent: "huddle", title: "Transcript segment", detail: "02:14 – 02:40", when: "Today, 09:05", ageHours: 2, independent: true },
        { agent: "thermometer", title: "SFA check-ins", detail: "0 of 14 Keshod visits on 15 and 22 Sep", when: "Mon 28 Sep", ageHours: 27, independent: true },
      ],
      rescoredAt: "09:40",
    },
  },
  {
    id: "find-3",
    theme: "Competitor pricing · unverified",
    quote: "My neighbour says Dr. Fixit is giving ₹20 a kilo off on waterproofing. I haven't seen the invoice.",
    speaker: "Jalaram Hardware",
    speakerRole: "Dealer · Porbandar, relayed by Vipul M.",
    session: "Morning huddle",
    when: "Today, 09:05",
    at: "07:52",
    insight: "ins-competitor",
    confidence: INSIGHTS[3].confidence,
  },
  {
    id: "find-4",
    theme: "Stock-out risk",
    quote: "If the primer runs out again before Diwali, I'll take the other brand the distributor keeps offering me.",
    speaker: "Sai Ashirwad Tiles Galaxy",
    speakerRole: "Retailer · Rajkot, relayed by Mehul S.",
    session: "Mid-day review call",
    when: "Today, 11:05",
    at: "12:48",
    insight: "rec-4",
    linkLabel: "Recommendation #4",
    confidence: {
      score: 83,
      rationale: "High: the switching threat matches Thermometer's 9-day stock cover signal and August's 6-day stock-out at the same outlet.",
      factors: { corroboration: 0.8, freshness: 0.99, reliability: 0.78 },
      sources: [
        { agent: "huddle", title: "Transcript segment", detail: "12:48 – 13:20, relayed by SO", when: "Today, 11:05", ageHours: 0.5, independent: true },
        { agent: "thermometer", title: "Stock cover signal", detail: "9 days at current run-rate", when: "Today, 08:00", ageHours: 3, independent: true },
      ],
      rescoredAt: "11:20",
    },
  },
];

// ---------------------------------------------------------------------------
// Ask Cortex — canned answers for the wireframe
// ---------------------------------------------------------------------------

export interface AskAnswer {
  q: string;
  answer: string;
  links: { label: string; target: string; agent: AgentId }[];
  confidence: Confidence;
}

export const ASK_ANSWERS: AskAnswer[] = [
  {
    q: "Why is Bhavnagar collection slipping?",
    answer: "Retailers are holding payments until the repair season starts, and distributors are passing that delay up to you. ₹1.4L is outstanding across 6 distributors, 60% recovered. Two distributors asked for 45-day retailer credit; you currently give 30.",
    links: [
      { label: "Insight", target: "ins-collection", agent: "thermometer" },
      { label: "Recommendation #1", target: "rec-1", agent: "thermometer" },
    ],
    confidence: INSIGHTS[0].confidence,
  },
  {
    q: "Which territory is furthest behind September plan?",
    answer: "Amreli, at 54% of its September estimate. Repair Polymer accounts for about 70% of the gap after the scheme ended on 15 Sep. The other five territories are within 10 points of estimate.",
    links: [
      { label: "Market Action Plan", target: "map-panel", agent: "map" },
      { label: "Recommendation #3", target: "rec-3", agent: "thermometer" },
    ],
    confidence: INSIGHTS[2].confidence,
  },
  {
    q: "What should go into October's plan?",
    answer: "Three candidates so far: restart the Amreli Repair Polymer scheme, a Bhavnagar retailer-credit bridge, and a temporary Keshod beat change. Anything you escalate from Thermometer is added to this list as a suggested initiative. Nothing goes into the plan until you accept it.",
    links: [
      { label: "Thermometer", target: "thermo-panel", agent: "thermometer" },
      { label: "Market Action Plan", target: "map-panel", agent: "map" },
    ],
    confidence: {
      score: 74,
      rationale: "Medium: built from the three highest-confidence open recommendations. The October estimate isn't fixed until September month-end data lands on 1 Oct.",
      factors: { corroboration: 0.74, freshness: 0.7, reliability: 0.78 },
      sources: [
        { agent: "thermometer", title: "Open recommendations", detail: "#1, #2, #3", when: "Today, 09:40", ageHours: 1, independent: true },
        { agent: "map", title: "September actuals", detail: "Through 28 Sep, not closed", when: "Today, 08:00", ageHours: 3, independent: false },
      ],
      rescoredAt: "10:20",
    },
  },
];

// ---------------------------------------------------------------------------
// Sales head: “what's actually working” (concept layer)
// ---------------------------------------------------------------------------

export const WHATS_WORKING = {
  rows: [
    { type: "Collection follow-ups", actioned: 14, delivered: 11, value: "₹9.8L recovered", best: "Saurashtra" },
    { type: "Beat re-sequencing", actioned: 9, delivered: 6, value: "+212 retailer visits", best: "Vadodara" },
    { type: "Scheme restarts", actioned: 12, delivered: 5, value: "₹6.1L incremental", best: "Ahmedabad Rural" },
    { type: "Competitor price matches", actioned: 4, delivered: 1, value: "₹0.4L retained", best: "—" },
  ],
  takeaway: "Collection follow-ups pay back most reliably. Matching reported competitor prices has paid off once in four attempts.",
  confidence: {
    score: 66,
    rationale: "Medium: outcomes are measured, but 39 actions over two quarters is a small sample, and attribution ignores seasonality.",
    factors: { corroboration: 0.6, freshness: 0.7, reliability: 0.68 },
    sources: [
      { agent: "map", title: "Plan outcomes", detail: "Apr–Aug, 7 ASMs", when: "Aug month-end", ageHours: 700, independent: true },
      { agent: "thermometer", title: "Recommendation log", detail: "39 actioned recommendations", when: "Today, 08:00", ageHours: 3, independent: true },
    ],
    rescoredAt: "08:00",
  } satisfies Confidence,
};

// ---------------------------------------------------------------------------
// Pulse layout (/home-c) — additional content
// ---------------------------------------------------------------------------

/** Org-wide monthly plan roll-up for the sales head (7 ASMs). */
export const HEAD_PLAN_MONTHS: PlanMonth[] = [
  { month: "Apr", created: true, estimateL: 312, achievedL: 281.4, status: "delivered", note: "7 of 7 ASM plans created" },
  { month: "May", created: true, estimateL: 338, achievedL: 322.9, status: "delivered", note: "7 of 7 ASM plans created" },
  { month: "Jun", created: true, estimateL: 330, achievedL: 268.2, status: "delivered", note: "Monsoon onset" },
  { month: "Jul", created: true, estimateL: 352, achievedL: 309.8, status: "delivered", note: "7 of 7 ASM plans created" },
  { month: "Aug", created: true, estimateL: 371, achievedL: 336.5, status: "delivered", note: "7 of 7 ASM plans created" },
  { month: "Sep", created: true, estimateL: 390, achievedL: 262.1, status: "progress", note: "1 day left · projected ~71%" },
  { month: "Oct", created: false, estimateL: null, achievedL: null, status: "not-started", note: "0 of 7 ASM plans created" },
];

/** Cumulative actions opened vs completed through September, by week. */
export const TRACKER_TREND: Record<ViewerRole, { label: string; opened: number; completed: number }[]> = {
  asm: [
    { label: "1 Sep", opened: 12, completed: 3 },
    { label: "8 Sep", opened: 23, completed: 9 },
    { label: "15 Sep", opened: 34, completed: 17 },
    { label: "22 Sep", opened: 43, completed: 24 },
    { label: "29 Sep", opened: 48, completed: 29 },
  ],
  head: [
    { label: "1 Sep", opened: 52, completed: 13 },
    { label: "8 Sep", opened: 101, completed: 40 },
    { label: "15 Sep", opened: 150, completed: 77 },
    { label: "22 Sep", opened: 190, completed: 106 },
    { label: "29 Sep", opened: 214, completed: 131 },
  ],
};

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

const H = (level: HealthLevel, value: string, detail: string, target?: string) => ({ level, value, detail, target });

export const TERRITORY_HEALTH: Record<ViewerRole, HealthGrid> = {
  asm: {
    rowLabel: "Territory",
    columns: ["Revenue", "Coverage", "Collection", "Stock", "Pricing"],
    rows: [
      { name: "Bhavnagar", cells: [H(3, "92%", "92% of Sept estimate"), H(4, "+2%", "Retailers billed vs last month"), H(0, "₹1.4L", "Overdue across 6 distributors", "rec-1"), H(3, "21d", "Average stock cover"), H(3, "OK", "No competitor signal")] },
      { name: "Junagadh", cells: [H(2, "88%", "88% of Sept estimate"), H(0, "−14%", "Keshod beat skipped 2 weeks", "rec-2"), H(4, "OK", "No overdue"), H(3, "18d", "Average stock cover"), H(3, "OK", "No competitor signal")] },
      { name: "Amreli", cells: [H(0, "54%", "Repair Polymer stalled after scheme", "rec-3"), H(2, "−3%", "Retailers billed vs last month"), H(3, "OK", "₹0.2L overdue, 1 dealer"), H(2, "34d", "Overstock, Repair Polymer"), H(3, "OK", "No competitor signal")] },
      { name: "Rajkot", cells: [H(4, "97%", "97% of Sept estimate"), H(3, "+1%", "Retailers billed vs last month"), H(4, "OK", "No overdue"), H(1, "9d", "Sai Ashirwad Tiles Galaxy", "rec-4"), H(4, "OK", "No competitor signal")] },
      { name: "Jamnagar", cells: [H(3, "90%", "90% of Sept estimate"), H(1, "5", "Dealers dormant 60+ days", "rec-5"), H(3, "OK", "₹0.3L overdue, 2 dealers"), H(3, "22d", "Average stock cover"), H(4, "OK", "No competitor signal")] },
      { name: "Porbandar", cells: [H(3, "95%", "95% of Sept estimate"), H(3, "0%", "Retailers billed vs last month"), H(4, "OK", "No overdue"), H(3, "25d", "Average stock cover"), H(2, "?", "Reported ₹20/kg cut, unverified", "rec-6")] },
    ],
  },
  head: {
    rowLabel: "Region",
    columns: ["Revenue", "Coverage", "Collection", "Stock", "Pricing"],
    rows: [
      { name: "Saurashtra", cells: [H(2, "64%", "Sept plan achieved"), H(1, "−6%", "Junagadh drives most of it"), H(1, "₹1.9L", "Overdue, mostly Bhavnagar"), H(3, "20d", "Average stock cover"), H(2, "1", "Unverified competitor signal")] },
      { name: "Ahmedabad Rural", cells: [H(3, "71%", "Sept plan achieved"), H(3, "+1%", "Retailers billed"), H(0, "₹3.2L", "Recovery at 41%"), H(3, "19d", "Average stock cover"), H(4, "0", "No competitor signal")] },
      { name: "Vadodara", cells: [H(4, "82%", "Sept plan achieved"), H(4, "+4%", "Retailers billed"), H(3, "₹0.6L", "Overdue"), H(2, "31d", "Overstock, primer"), H(3, "0", "No competitor signal")] },
      { name: "Surat", cells: [H(3, "74%", "Sept plan achieved"), H(2, "−2%", "Retailers billed"), H(4, "₹0.1L", "Overdue"), H(1, "8d", "3 top outlets low"), H(1, "2", "Competitor schemes seen")] },
      { name: "Ahmedabad City", cells: [H(4, "79%", "Sept plan achieved"), H(3, "0%", "Retailers billed"), H(3, "₹0.8L", "Overdue"), H(4, "24d", "Average stock cover"), H(3, "0", "No competitor signal")] },
      { name: "Kutch", cells: [H(1, "58%", "Sept plan achieved"), H(0, "−11%", "2 SO vacancies"), H(3, "₹0.4L", "Overdue"), H(3, "23d", "Average stock cover"), H(4, "0", "No competitor signal")] },
      { name: "North Gujarat", cells: [H(3, "70%", "Sept plan achieved"), H(3, "+2%", "Retailers billed"), H(2, "₹1.1L", "Overdue"), H(3, "21d", "Average stock cover"), H(2, "1", "Competitor price list seen")] },
    ],
  },
};

/** Set-level confidence for the Thermometer box itself. */
export const THERMO_SET_CONFIDENCE: Confidence = {
  score: 73,
  rationale: "Average across the 6 open recommendations: 3 high, 2 medium, 1 low. The low one (#6, Porbandar pricing) rests on a single second-hand report.",
  factors: { corroboration: 0.68, freshness: 0.86, reliability: 0.72 },
  sources: [
    { agent: "thermometer", title: "6 open signals", detail: "Collection, Coverage ×2, Revenue, Stock, Pricing", when: "Today, 09:40", ageHours: 1, independent: true },
    { agent: "huddle", title: "2 conversations", detail: "Used as corroboration on #1, #2, #6", when: "Since 07:52 today", ageHours: 3, independent: true },
    { agent: "pitch", title: "Visit logs", detail: "Used as corroboration on #1, #4, #5", when: "Since Fri 25 Sep", ageHours: 96, independent: true },
  ],
  rescoredAt: "09:40",
};

export type RecRoute = "tracker" | "map" | "pitch";

/** Sales-head view: where each recommendation was routed by the ASM. */
export const HEAD_REC_ROUTES: Record<string, RecRoute[]> = {
  "rec-1": ["tracker", "pitch"],
  "rec-2": ["tracker"],
  "rec-3": ["map", "pitch"],
  "rec-4": [],
  "rec-5": [],
  "rec-6": [],
};

export const WIDGET_OPTIONS = [
  { id: "w-route", title: "Today's routes", description: "Where your sales executives are visiting today", agent: "pitch" as AgentId },
  { id: "w-stock", title: "Stock cover watchlist", description: "Outlets with under 14 days of cover", agent: "thermometer" as AgentId },
  { id: "w-scheme", title: "Scheme performance", description: "Live schemes vs their sell-through targets", agent: "map" as AgentId },
  { id: "w-competitor", title: "Competitor mentions", description: "Every competitor mention from calls and visits", agent: "huddle" as AgentId },
];

// ---------------------------------------------------------------------------
// Pulse Pass 2 — My actions vs team actions
// ---------------------------------------------------------------------------

export const OFFICERS = [
  { name: "Mehul S.", territories: "Bhavnagar, Rajkot", share: 32 },
  { name: "Ajay T.", territories: "Junagadh", share: 30 },
  { name: "Kiran D.", territories: "Amreli", share: 26 },
  { name: "Neel P.", territories: "Jamnagar", share: 26 },
  { name: "Vipul M.", territories: "Porbandar", share: 22 },
];

export interface ActionItem {
  id: string;
  title: string;
  territory: string;
  owner: string; // "Raman" = the ASM's own action
  status: ActionStatus;
  source: AgentId;
  hoursAgo: number;
}

export const ACTION_ITEMS: ActionItem[] = [
  { id: "act-bhavnagar", title: "Decide on the 45-day credit ask from Mahuva retailers", territory: "Bhavnagar", owner: "Raman", status: "progress", source: "pitch", hoursAgo: 2 },
  { id: "act-junagadh", title: "Agree the Thursday Keshod beat with Ajay", territory: "Junagadh", owner: "Raman", status: "delayed", source: "thermometer", hoursAgo: 5 },
  { id: "act-amreli", title: "Sign off the Repair Polymer scheme restart", territory: "Amreli", owner: "Raman", status: "progress", source: "map", hoursAgo: 9 },
  { id: "act-porbandar", title: "Verify the Porbandar competitor pricing claim", territory: "Porbandar", owner: "Raman", status: "unassigned", source: "huddle", hoursAgo: 17 },
  { id: "act-m5", title: "Chase August scheme claims from 3 distributors", territory: "Jamnagar", owner: "Raman", status: "delayed", source: "map", hoursAgo: 30 },
  { id: "act-m6", title: "Share the October plan draft with sales officers", territory: "All territories", owner: "Raman", status: "unassigned", source: "map", hoursAgo: 40 },
  { id: "act-m7", title: "Close out the Bhavnagar distributor ageing report", territory: "Bhavnagar", owner: "Raman", status: "delayed", source: "thermometer", hoursAgo: 52 },
  { id: "act-m8", title: "Review retailer onboarding numbers", territory: "Jamnagar", owner: "Raman", status: "progress", source: "map", hoursAgo: 70 },
  { id: "act-t1", title: "Collect ₹1.4L overdue from 6 distributors", territory: "Bhavnagar", owner: "Mehul S.", status: "progress", source: "thermometer", hoursAgo: 1 },
  { id: "act-t2", title: "Replenish Acrylic Primer at Sai Ashirwad Tiles Galaxy", territory: "Rajkot", owner: "Mehul S.", status: "progress", source: "thermometer", hoursAgo: 3 },
  { id: "act-t3", title: "Cover 38 unbilled Keshod retailers", territory: "Junagadh", owner: "Ajay T.", status: "delayed", source: "thermometer", hoursAgo: 6 },
  { id: "act-t4", title: "Lift Repair Polymer secondary sales", territory: "Amreli", owner: "Kiran D.", status: "progress", source: "map", hoursAgo: 8 },
  { id: "act-t5", title: "Get an invoice copy for the Dr. Fixit price claim", territory: "Porbandar", owner: "Vipul M.", status: "progress", source: "huddle", hoursAgo: 15 },
  { id: "act-t6", title: "Re-activate 5 dormant dealers", territory: "Jamnagar", owner: "Neel P.", status: "progress", source: "thermometer", hoursAgo: 20 },
  { id: "act-t7", title: "Run waterproofing demo days", territory: "Junagadh", owner: "Ajay T.", status: "delayed", source: "map", hoursAgo: 28 },
  { id: "act-t8", title: "Onboard 4 new retailers", territory: "Jamnagar", owner: "Neel P.", status: "delayed", source: "map", hoursAgo: 45 },
  { id: "act-t9", title: "Clear 34-day overstock at 2 dealers", territory: "Amreli", owner: "Kiran D.", status: "progress", source: "thermometer", hoursAgo: 50 },
  { id: "act-t10", title: "Log retailer objections from Mahuva visits", territory: "Bhavnagar", owner: "Mehul S.", status: "progress", source: "pitch", hoursAgo: 60 },
];

/** Team-wide tracker totals (all sales officers under the ASM) for September. */
export const TEAM_TRACKER = {
  total: 136,
  counts: { done: 84, progress: 38, delayed: 14, unassigned: 0 } as Record<ActionStatus, number>,
  bySource: { thermometer: 51, map: 42, huddle: 26, pitch: 17 } as Record<AgentId, number>,
};

/** Sales-head view: recommendations that sit above ASM authority and need the head's decision. */
export const HEAD_PENDING: Record<string, string> = {
  "rec-1": "Changing retailer credit terms needs your approval",
  "rec-6": "Matching a competitor price is above ASM authority",
};

// ---------------------------------------------------------------------------
// Option A — Action Tracker line graph (September, ASM's own actions).
// Completed is cumulative; In progress and Delayed are what's open on each date.
// Team / person / org views scale these to their own month-end counts.
// ---------------------------------------------------------------------------

export const TRACKER_MONTH = {
  labels: ["1 Sep", "5 Sep", "8 Sep", "12 Sep", "15 Sep", "19 Sep", "22 Sep", "26 Sep", "29 Sep"],
  done: [2, 5, 9, 13, 17, 21, 24, 27, 29],
  progress: [5, 8, 10, 12, 13, 13, 12, 12, 12],
  delayed: [0, 1, 1, 2, 3, 3, 4, 4, 4],
};

/** Option A agent cards. Churn is new and not yet defined: placeholder only. */
export const AGENT_CARDS: { id: AgentId | "churn"; name: string; stat: string; placeholder?: boolean }[] = [
  { id: "huddle", name: "Huddle", stat: "7 conversations today" },
  { id: "map", name: "Market Action Plan", stat: "October not created" },
  { id: "pitch", name: "Pitch", stat: "23 visits this week" },
  { id: "thermometer", name: "Thermometer", stat: "6 recommendations open" },
  { id: "churn", name: "Churn", stat: "Placeholder · not yet defined", placeholder: true },
];

/**
 * Option A Thermometer bars: everything Thermometer raised per lever in each
 * range, including recommendations already actioned or dismissed. The open
 * ones (RECOMMENDATIONS) are the solid part of each bar.
 */
export const LEVER_RAISED: Record<"today" | "week" | "month", Record<SignalType, number>> = {
  today: { Collection: 1, Coverage: 0, Stock: 1, Pricing: 1, Revenue: 0 },
  week: { Collection: 3, Coverage: 5, Stock: 2, Pricing: 1, Revenue: 2 },
  month: { Collection: 9, Coverage: 14, Stock: 6, Pricing: 3, Revenue: 7 },
};

// ---------------------------------------------------------------------------
// Option B — consolidated spec additions
// ---------------------------------------------------------------------------

/** Covasant primary blue — replaces purple everywhere on Option B. */
export const PRIMARY_BLUE = "#2f6fed";
export const PRIMARY_BLUE_SOFT = "#4f86f7";

/** A short, honest sequence an agent shows while it works, then a concrete result. */
export interface AgentRun {
  agent: AgentId;
  steps: string[];
  result: string;
  link: string;
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
}

export const SUGGESTED_ACTIONS: SuggestedAction[] = [
  {
    id: "sug-1",
    title: "Pitch the 15-day credit bridge at 3 Mahuva retailers",
    territory: "Bhavnagar",
    source: "pitch",
    why: "Same credit objection logged at 3 visits since Friday",
    confidence: INSIGHTS[0].confidence,
    run: { agent: "thermometer", steps: ["reading the recommendation", "creating the action"], result: "Added to your Tracker — due Thu, Bhavnagar", link: "View in Tracker" },
  },
  {
    id: "sug-2",
    title: "Follow up with Kishore Patel on retailer credit terms",
    territory: "Bhavnagar",
    source: "huddle",
    why: "Raised on this morning's distributor review call",
    confidence: FINDINGS[0].confidence,
    run: { agent: "huddle", steps: ["pulling the 04:31 transcript", "creating the action"], result: "Added to your Tracker — linked to the call transcript", link: "View in Tracker" },
  },
  {
    id: "sug-3",
    title: "Carry the Amreli Repair Polymer restart into October",
    territory: "Amreli",
    source: "map",
    why: "September gap is 70% Repair Polymer after the scheme ended",
    confidence: INSIGHTS[2].confidence,
    run: { agent: "map", steps: ["reading September actuals", "adding a suggested initiative"], result: "Added to your Tracker and the October plan draft", link: "View plan" },
  },
  {
    id: "sug-4",
    title: "Replenish Acrylic Primer at Sai Ashirwad Tiles Galaxy",
    territory: "Rajkot",
    source: "thermometer",
    why: "9 days of stock cover left at a top-10 outlet",
    confidence: RECOMMENDATIONS[3].confidence,
    run: { agent: "thermometer", steps: ["checking stock cover", "creating the action"], result: "Added to your Tracker — Mehul S. suggested as owner", link: "View in Tracker" },
  },
];

/** Suggested action per insight — or a closed action when it's already been handled. */
export const INSIGHT_ACTIONS: Record<string, { label: string; run: AgentRun } | { closed: string } | { agreed: string }> = {
  "ins-collection": {
    label: "Push to Pitch engine",
    run: { agent: "pitch", steps: ["reading the Bhavnagar insight", "updating priorities", "plan modified"], result: "Updated Bhavnagar's pitch plan — 12 outlets affected", link: "View pitch" },
  },
  "ins-coverage": { agreed: "Agreed · Ajay T. moves the Keshod beat to Thursday from 1 Oct" },
  "ins-pacing": {
    label: "Push to Market Action Plan",
    run: { agent: "map", steps: ["reading September actuals", "drafting the initiative", "adding to the October draft"], result: "Added to the October plan draft — 12 Amreli dealers", link: "View plan" },
  },
  "ins-competitor": { closed: "Closed · parked until a second source confirms the price cut" },
};

/** KPI detail views: month-by-month breakdowns (Apr–Sep). */
export const ACTION_MONTHS: Record<ViewerRole, { month: string; opened: number; completed: number }[]> = {
  asm: [
    { month: "Apr", opened: 38, completed: 35 },
    { month: "May", opened: 42, completed: 40 },
    { month: "Jun", opened: 51, completed: 46 },
    { month: "Jul", opened: 44, completed: 40 },
    { month: "Aug", opened: 46, completed: 43 },
    { month: "Sep", opened: 48, completed: 29 },
  ],
  head: [
    { month: "Apr", opened: 176, completed: 160 },
    { month: "May", opened: 190, completed: 178 },
    { month: "Jun", opened: 221, completed: 196 },
    { month: "Jul", opened: 204, completed: 187 },
    { month: "Aug", opened: 209, completed: 193 },
    { month: "Sep", opened: 214, completed: 131 },
  ],
};

export const WEAKEST_BY_MONTH: Record<ViewerRole, { month: string; name: string; why: string }[]> = {
  asm: [
    { month: "Apr", name: "Porbandar", why: "Coverage −9%" },
    { month: "May", name: "Jamnagar", why: "4 dormant dealers" },
    { month: "Jun", name: "Amreli", why: "Revenue 71% · monsoon" },
    { month: "Jul", name: "Junagadh", why: "Collection ₹2.1L" },
    { month: "Aug", name: "Amreli", why: "Revenue 82%" },
    { month: "Sep", name: "Amreli", why: "Revenue 54%" },
  ],
  head: [
    { month: "Apr", name: "Kutch", why: "2 SO vacancies" },
    { month: "May", name: "Kutch", why: "Coverage −12%" },
    { month: "Jun", name: "Saurashtra", why: "Monsoon · 81%" },
    { month: "Jul", name: "Surat", why: "Stock-outs at 5 outlets" },
    { month: "Aug", name: "Ahmedabad Rural", why: "Collection ₹3.9L" },
    { month: "Sep", name: "Saurashtra", why: "Coverage −6%" },
  ],
};

/** Market Action Plan draft generation (Create plan) shown as agent work. */
export const PLAN_RUN: AgentRun = {
  agent: "map",
  steps: ["reading September month-end", "weighing escalated suggestions", "drafting initiatives"],
  result: "October draft ready — 3 initiatives across 6 territories",
  link: "View draft",
};

/** Option B · Since this morning: what to do about each finding (revealed on hover). */
export const FINDING_ACTIONS: Record<string, { label: string; run: AgentRun } | { closed: string } | { agreed: string }> = {
  "find-4": {
    label: "Push to Pitch engine",
    run: { agent: "pitch", steps: ["reading the 12:48 transcript", "updating priorities", "plan modified"], result: "Sai Ashirwad Tiles Galaxy moved to the top of Thursday's Rajkot beat", link: "View pitch" },
  },
  "find-1": {
    label: "Send to Tracker",
    run: { agent: "huddle", steps: ["pulling the 04:31 transcript", "creating the action", "suggesting an owner"], result: "Added to Tracker — retailer credit terms, Mehul S. suggested", link: "View in Tracker" },
  },
  "find-2": { agreed: "Agreed · the Keshod beat moves to Thursday from 1 Oct" },
};
