// Thermometer calculations above the raw data: the scorecard (reference SC2 rows and
// colouring), the initiative KPI tables, and the recommendations Sales AI derives from them.
// Pure functions over src/data/thermometer.ts; the tabs only render what comes back.

import { AgentId, Confidence, RecRoute } from "@/data/cortexHome";
import { ActionTrace } from "@/data/actionTraces";
import {
  AS_OF,
  BANDS,
  BDES,
  CATEGORIES,
  CPS,
  CUR,
  CategoryId,
  ChannelPartner,
  EXPECTED_TODAY,
  FY_MONTHS,
  LEVERS,
  Rag3,
  RETAILER_BANDS,
  ThermoPersona,
  VALUE_GUIDE,
  asmOf,
  bpTargetFor,
  calcGrowth,
  cpValue,
  fmtL,
  groupsFor,
  regionOfTerr,
  retailerCategory,
  targetOf,
} from "@/data/thermometer";

const H1 = [0, 1, 2, 3, 4, 5];
const COMPLETED = [0, 1, 2, 3, 4];
export const cpsIn = (territories: string[], type?: ChannelPartner["type"] | ChannelPartner["type"][]) => {
  const set = new Set(territories);
  const types = type ? (Array.isArray(type) ? type : [type]) : null;
  return CPS.filter((c) => set.has(c.territory) && (!types || types.includes(c.type)));
};
const apptIdx = (c: ChannelPartner) => {
  const [y, m] = c.appt.split("-").map(Number);
  return (y - 2026) * 12 + (m - 4);
};
/** months from the appointment month through the last completed month (Aug) */
export function activeMonths(c: ChannelPartner) {
  const s = Math.max(0, apptIdx(c));
  return COMPLETED.filter((m) => m >= s);
}
const sep = (c: ChannelPartner) => cpValue(c, "cy", [CUR]);

// ---------------------------------------------------------------------------
// Colouring (reference scClr*)
// ---------------------------------------------------------------------------

export type AreaType = "phased" | "std" | "p7590" | "drcp" | "ratio" | "degrow" | "recruit";
export function clr(type: AreaType, pct: number | null, thr?: number | null): Rag3 {
  if (pct == null || !isFinite(pct)) return "na";
  switch (type) {
    case "phased":
      return pct >= EXPECTED_TODAY ? "green" : pct >= EXPECTED_TODAY * 0.9 ? "amber" : "red";
    case "std":
      return pct >= 100 ? "green" : pct >= 85 ? "amber" : "red";
    case "p7590":
      return pct >= 90 ? "green" : pct >= 75 ? "amber" : "red";
    case "drcp":
      return pct >= 100 ? "green" : pct >= 90 ? "amber" : "red";
    case "ratio":
      return pct >= 80 && pct <= 120 ? "green" : (pct >= 70 && pct < 80) || (pct > 120 && pct <= 130) ? "amber" : "red";
    case "recruit":
      return pct > 90 ? "green" : pct >= 80 ? "amber" : "red";
    case "degrow":
      if (thr == null) return "na";
      return pct > thr ? "red" : pct >= thr * 0.9 ? "amber" : "green";
  }
}
export const THRESH_LABEL: Record<AreaType, string> = {
  phased: `Day-phased: ${EXPECTED_TODAY}% expected by ${AS_OF.day} Sep (amber from ${(EXPECTED_TODAY * 0.9).toFixed(1)}%)`,
  std: "Green ≥ 100%, amber ≥ 85%",
  p7590: "Green ≥ 90%, amber ≥ 75%",
  drcp: "Green ≥ 100%, amber ≥ 90%",
  ratio: "Green 80–120%, amber 70–80% or 120–130%",
  degrow: "Lower is better: red above the month's maximum, amber within 10% of it",
  recruit: "Green > 90%, amber 80–90%",
};
/** Maximum share of active partners allowed to be de-growing, by the last completed FY month. */
export const DEGROW_MAX = FY_MONTHS.map((_, i) => Math.round(((12 - (i + 1)) / 12) * 1000) / 10);

// ---------------------------------------------------------------------------
// Shared KPI builders (the scorecard and the initiative tables read the same numbers)
// ---------------------------------------------------------------------------

export function distExp(t: string[]) {
  const nw = cpsIn(t, "distributor").filter((c) => c.isNew);
  const add = nw.length;
  const addTarget = t.length * 1; // one new distributor per territory this year
  const billed = nw.filter((c) => sep(c) > 0);
  const thru = add ? nw.reduce((a, c) => a + sep(c), 0) / add : null;
  const r25 = nw.filter((c) => (c.linkedRetailers ?? 0) > 25);
  return { list: nw, add, addTarget, billed: billed.length, thru, thruTarget: VALUE_GUIDE.distributor, r25: r25.length };
}
export function dealerExp(t: string[]) {
  const nw = cpsIn(t, "dealer").filter((c) => c.isNew);
  const add = nw.length;
  const addTarget = t.length * 2;
  const billed = nw.filter((c) => sep(c) > 0).length;
  const billed2 = nw.filter((c) => sep(c) > 0 || cpValue(c, "cy", [CUR - 1]) > 0).length;
  const thru = add ? nw.reduce((a, c) => a + sep(c), 0) / add : null;
  const vg = nw.filter((c) => sep(c) >= VALUE_GUIDE.dealer).length;
  const ytdUniv = nw.filter((c) => activeMonths(c).length > 0);
  const vgYtd = ytdUniv.filter((c) => cpValue(c, "cy", activeMonths(c)) / activeMonths(c).length >= VALUE_GUIDE.dealer).length;
  return { list: nw, add, addTarget, billed, billed2, thru, thruTarget: VALUE_GUIDE.dealer, vg, ytdUniv: ytdUniv.length, vgYtd };
}
export const RET_GUIDE = 0.15; // average retailer throughput guideline, ₹ lakh / month (₹15,000)
export function retExp(t: string[]) {
  const nw = cpsIn(t, "retailer").filter((c) => c.isNew);
  const curMonth = nw.filter((c) => apptIdx(c) === CUR);
  const tillLast = nw.filter((c) => apptIdx(c) < CUR);
  const tillLastTarget = Math.round(tillLast.length * 1.15 + t.length);
  const curTarget = Math.max(1, Math.round(t.length * 0.5));
  const billedThis = tillLast.filter((c) => sep(c) > 0).length;
  const win3 = [CUR - 2, CUR - 1, CUR];
  const billed3 = tillLast.filter((c) => win3.some((m) => cpValue(c, "cy", [m]) > 0)).length;
  const thru = tillLast.length ? tillLast.reduce((a, c) => a + sep(c), 0) / tillLast.length : null;
  let ys = 0;
  let am = 0;
  let vgYtd = 0;
  const ytdUniv = tillLast.filter((c) => activeMonths(c).length > 0);
  for (const c of ytdUniv) {
    const ms = activeMonths(c);
    const v = cpValue(c, "cy", ms);
    ys += v;
    am += ms.length;
    if (v / ms.length >= VALUE_GUIDE.retailer) vgYtd++;
  }
  const vg = tillLast.filter((c) => sep(c) >= VALUE_GUIDE.retailer).length;
  return { list: nw, tillLast, curMonth, tillLastTarget, curTarget, billedThis, billed3, thru, thruYtd: am ? ys / am : null, vg, ytdUniv: ytdUniv.length, vgYtd };
}

export function degrowOf(t: string[], type: "dealer" | "retailer") {
  const elig = cpsIn(t, type).filter((c) => c.operating && !c.isNew && apptIdx(c) < 0);
  const list = elig
    .map((c) => {
      const lyAvg = cpValue(c, "ly", Array.from({ length: 12 }, (_, i) => i)) / 12;
      const cyAvg = cpValue(c, "cy", COMPLETED) / COMPLETED.length;
      return { c, lyAvg, cyAvg, growth: calcGrowth(lyAvg, cyAvg) };
    })
    .filter((x) => x.cyAvg < x.lyAvg);
  const cat = (v: number) => (type === "dealer" ? BANDS.dealer.find((b) => b.test(v))!.label : retailerCategory(v));
  const cats = type === "dealer" ? BANDS.dealer.map((b) => b.label) : RETAILER_BANDS.map((b) => b.label);
  return { active: elig.length, count: list.length, byCat: cats.map((k) => ({ label: k, items: list.filter((x) => cat(x.lyAvg) === k) })) };
}

export function appOf(t: string[]) {
  const slabs = LEVERS[t[0]].appSlabs.map((s) => ({ label: s.label, days: s.days, target: 0, met: 0, billedOnce: 0 }));
  let secondary = 0;
  for (const x of t)
    LEVERS[x].appSlabs.forEach((s, i) => {
      slabs[i].target += s.target;
      slabs[i].met += s.met;
      slabs[i].billedOnce += s.billedOnce;
    });
  for (const x of t) secondary += LEVERS[x].secondary;
  const primary = cpsIn(t, "distributor").reduce((a, c) => a + sep(c), 0);
  const tgt = slabs.reduce((a, s) => a + s.target, 0);
  const met = slabs.reduce((a, s) => a + s.met, 0);
  return { slabs, target: tgt, met, billedOnce: slabs.reduce((a, s) => a + s.billedOnce, 0), primary, secondary, ratio: primary > 0 ? (secondary / primary) * 100 : null };
}
export function beatOf(t: string[]) {
  const execs = { "Sales Officer": { count: 0, above6: 0 }, "Territory Sales Exec": { count: 0, above6: 0 } } as Record<string, { count: number; above6: number }>;
  let vpd = 0;
  const cp = { Distributor: { target: 0, met: 0, metOnce: 0 }, Dealer: { target: 0, met: 0, metOnce: 0 }, Retailer: { target: 0, met: 0, metOnce: 0 } } as Record<string, { target: number; met: number; metOnce: number }>;
  let n = 0;
  for (const x of t) {
    const L = LEVERS[x];
    L.execs.forEach((e) => {
      execs[e.role].count += e.count;
      execs[e.role].above6 += e.above6;
      n += e.count;
    });
    vpd += L.visitsPerDay * L.execs.reduce((a, e) => a + e.count, 0);
    L.cpNorm.forEach((c) => {
      cp[c.type].target += c.target;
      cp[c.type].met += c.met;
      cp[c.type].metOnce += c.metOnce;
    });
  }
  const tot = Object.values(execs);
  return {
    execs,
    execCount: tot.reduce((a, e) => a + e.count, 0),
    above6: tot.reduce((a, e) => a + e.above6, 0),
    visitsPerDay: n ? vpd / n : null,
    cp,
    cpTarget: Object.values(cp).reduce((a, c) => a + c.target, 0),
    cpMet: Object.values(cp).reduce((a, c) => a + c.met, 0),
    workingDays: 20,
  };
}
export function orderOf(t: string[]) {
  const s = { visited: 0, ordered: 0, invoiced: 0, secondary: 0, pv: 0, tv: 0 };
  for (const x of t) {
    const L = LEVERS[x];
    s.visited += L.cpsVisited;
    s.ordered += L.cpsOrdered;
    s.invoiced += L.invoiced;
    s.secondary += L.totalSecondary;
    s.pv += L.productiveVisits;
    s.tv += L.totalVisits;
  }
  const k1t = Math.round(s.visited * 0.5);
  return {
    ...s,
    k1Target: k1t,
    k1Pct: k1t ? (s.ordered / k1t) * 100 : null,
    k2: s.secondary ? s.invoiced / s.secondary : null,
    k2Pct: s.secondary ? (s.invoiced / s.secondary / 0.3) * 100 : null,
    k3: s.tv ? s.pv / s.tv : null,
    k3Pct: s.tv ? (s.pv / s.tv / 0.6) * 100 : null,
  };
}
export function tertiaryOf(t: string[]) {
  const set = new Set(t);
  const rows = BDES.filter((b) => set.has(b.territory));
  const FTD = [0, 1, 2, 3, 4, 5];
  const part = (role: string) => {
    const rs = rows.filter((b) => b.role === role);
    const tgt = rs.reduce((a, b) => a + b.monthlyTarget * FTD.length, 0);
    const ach = rs.reduce((a, b) => a + FTD.reduce((x, m) => x + b.months[m], 0), 0);
    return { rows: rs, tgt, ach, pct: tgt ? (ach / tgt) * 100 : null };
  };
  const leadTgt = rows.reduce((a, b) => a + b.leadTgt, 0);
  const leadAch = rows.reduce((a, b) => a + b.leadAch, 0);
  const opp = rows.reduce((a, b) => a + b.oppValue, 0);
  const conv = rows.reduce((a, b) => a + b.converted, 0);
  return { rows, bde: part("BDE"), appl: part("BDE – Applicator"), leadTgt, leadAch, oppPerLead: leadAch ? opp / leadAch : null, conv: leadAch ? conv / leadAch : null };
}
export function applOf(t: string[]) {
  const k = LEVERS[t[0]].appl.map((a) => ({ kpi: a.kpi, target: 0, ach: 0 }));
  for (const x of t) LEVERS[x].appl.forEach((a, i) => ((k[i].target += a.target), (k[i].ach += a.ach)));
  return { kpis: k, target: k.reduce((a, x) => a + x.target, 0), ach: k.reduce((a, x) => a + x.ach, 0) };
}
export function recruitOf(t: string[]) {
  const d = { Trade: { total: 0, onGround: 0, offered: 0, pipeline: 0 }, "Non-Trade": { total: 0, onGround: 0, offered: 0, pipeline: 0 } } as Record<string, { total: number; onGround: number; offered: number; pipeline: number }>;
  for (const x of t) LEVERS[x].hc.forEach((h) => ((d[h.division].total += h.total), (d[h.division].onGround += h.onGround), (d[h.division].offered += h.offered), (d[h.division].pipeline += h.pipeline)));
  const total = { total: 0, onGround: 0, offered: 0, pipeline: 0 };
  Object.values(d).forEach((v) => ((total.total += v.total), (total.onGround += v.onGround), (total.offered += v.offered), (total.pipeline += v.pipeline)));
  return { d, total, pct: total.total ? (total.onGround / total.total) * 100 : null };
}
export function trainingOf(t: string[]) {
  const roles = LEVERS[t[0]].training.map((x) => ({ role: x.role, hc: 0, basicTgt: 0, basicDone: 0, interTgt: x.interTgt == null ? null : 0, interDone: x.interDone == null ? null : 0 }));
  for (const x of t)
    LEVERS[x].training.forEach((r, i) => {
      const o = roles[i];
      o.hc += r.hc;
      o.basicTgt += r.basicTgt;
      o.basicDone += r.basicDone;
      if (o.interTgt != null && r.interTgt != null) o.interTgt += r.interTgt;
      if (o.interDone != null && r.interDone != null) o.interDone += r.interDone;
    });
  const tot = roles.reduce((a, r) => ({ hc: a.hc + r.hc, basicTgt: a.basicTgt + r.basicTgt, basicDone: a.basicDone + r.basicDone, interTgt: a.interTgt + (r.interTgt ?? 0), interDone: a.interDone + (r.interDone ?? 0) }), { hc: 0, basicTgt: 0, basicDone: 0, interTgt: 0, interDone: 0 });
  return { roles, tot };
}
export function schemeOf(t: string[]) {
  const rows = LEVERS[t[0]].scheme.map((s) => ({ reward: s.reward, customers: 0, achieved: 0, salesTgt: 0, salesAch: 0 }));
  for (const x of t) LEVERS[x].scheme.forEach((s, i) => ((rows[i].customers += s.customers), (rows[i].achieved += s.achieved), (rows[i].salesTgt += s.salesTgt), (rows[i].salesAch += s.salesAch)));
  const tot = rows.reduce((a, r) => ({ customers: a.customers + r.customers, achieved: a.achieved + r.achieved, salesTgt: a.salesTgt + r.salesTgt, salesAch: a.salesAch + r.salesAch }), { customers: 0, achieved: 0, salesTgt: 0, salesAch: 0 });
  return { rows, tot };
}
export function bpOf(t: string[], type: ChannelPartner["type"]) {
  const cps = cpsIn(t, type).filter((c) => c.operating);
  let billTarget = 0;
  let billing = 0;
  for (const c of cps) {
    // the per-partner BP target (band / new) summed into the expected number of billing partners
    billTarget += bpTargetFor(c);
    if (sep(c) > 0) billing++;
  }
  return { active: cps.length, billing, billTarget, pct: billTarget ? (billing / billTarget) * 100 : null };
}
export function catAch(t: string[], cat: CategoryId, months = [CUR]) {
  const cps = cpsIn(t, ["distributor", "dealer"]);
  const sales = cps.reduce((a, c) => a + cpValue(c, "cy", months, cat), 0);
  const tgt = targetOf(cps, months, "plan", cat);
  return { sales, tgt, pct: tgt ? (sales / tgt) * 100 : null };
}
export function nonTradeAch(t: string[], months = [CUR]) {
  const cps = cpsIn(t, "project");
  const sales = cps.reduce((a, c) => a + cpValue(c, "cy", months), 0);
  const tgt = targetOf(cps, months, "plan");
  return { sales, tgt, pct: tgt ? (sales / tgt) * 100 : null };
}

// ---------------------------------------------------------------------------
// Scorecard
// ---------------------------------------------------------------------------

export type Link = { kind: "initiative"; id: InitiativeId; kpi?: string } | { kind: "deep"; tab: "channel" | "product" | "nontrade"; cat?: CategoryId };
export interface Area {
  key: string;
  label: string;
  type: AreaType;
  link: Link;
}
export const SC_TOPICS: { topic: string; areas: Area[] }[] = [
  {
    topic: "Distributor addition",
    areas: [
      { key: "distBilling", label: "# New distributors billing", type: "phased", link: { kind: "initiative", id: "dist-exp", kpi: "billing" } },
      { key: "dist25", label: "# Distributors with > 25 retailers", type: "std", link: { kind: "initiative", id: "dist-exp", kpi: "r25" } },
      { key: "distThru", label: "Avg. distributor throughput (LPM)", type: "phased", link: { kind: "initiative", id: "dist-exp", kpi: "thru" } },
    ],
  },
  {
    topic: "Dealer addition (from 1 Nov)",
    areas: [
      { key: "dealerBilling", label: "# New dealers billing", type: "phased", link: { kind: "initiative", id: "dealer-exp", kpi: "billing2" } },
      { key: "dealerVg", label: "# New dealers above value guideline", type: "p7590", link: { kind: "initiative", id: "dealer-exp", kpi: "vgYtd" } },
      { key: "dealerThru", label: "Avg. dealer throughput (LPM)", type: "phased", link: { kind: "initiative", id: "dealer-exp", kpi: "thru" } },
    ],
  },
  {
    topic: "Retailer addition (from 1 Oct)",
    areas: [
      { key: "retAdd", label: "Retailer addition", type: "phased", link: { kind: "initiative", id: "ret-exp", kpi: "addCur" } },
      { key: "retBilling", label: "New retailers billing", type: "p7590", link: { kind: "initiative", id: "ret-exp", kpi: "billed3" } },
      { key: "retThru", label: "Avg. retailer throughput (LPM), appointed till Aug", type: "phased", link: { kind: "initiative", id: "ret-exp", kpi: "thru" } },
    ],
  },
  {
    topic: "Channel participation (existing and new)",
    areas: [
      { key: "bpDist", label: "Distributor billing participation", type: "phased", link: { kind: "deep", tab: "channel" } },
      { key: "bpDealer", label: "Dealer billing participation", type: "phased", link: { kind: "deep", tab: "channel" } },
      { key: "bpRet", label: "Retailer billing participation", type: "phased", link: { kind: "deep", tab: "channel" } },
    ],
  },
  {
    topic: "Product sale",
    areas: CATEGORIES.map((c) => ({ key: `prod_${c.id}`, label: `${c.name} sale`, type: "phased" as AreaType, link: { kind: "deep" as const, tab: "product" as const, cat: c.id } })),
  },
  { topic: "De-growing partners", areas: [{ key: "degrow", label: "# De-growing dealers and retailers", type: "degrow", link: { kind: "initiative", id: "degrow" } }] },
  {
    topic: "Ordering app adoption",
    areas: [
      { key: "appReg", label: "Regular app ordering", type: "p7590", link: { kind: "initiative", id: "app", kpi: "total" } },
      { key: "secPrim", label: "Secondary / primary ratio (80–120%)", type: "ratio", link: { kind: "initiative", id: "app", kpi: "ratio" } },
    ],
  },
  {
    topic: "Beat-plan adherence (this month)",
    areas: [
      { key: "beatSe", label: "Salesforce visit-norm adherence", type: "std", link: { kind: "initiative", id: "beat", kpi: "above6" } },
      { key: "beatCp", label: "Channel-partner visit-norm adherence", type: "drcp", link: { kind: "initiative", id: "beat", kpi: "cp" } },
    ],
  },
  { topic: "SFA order taking", areas: [{ key: "otProd", label: "Productivity per executive", type: "std", link: { kind: "initiative", id: "order", kpi: "k3" } }] },
  {
    topic: "Applicator programme and BDE (FY to date)",
    areas: [
      { key: "appl", label: "Applicator and contractor participation", type: "std", link: { kind: "initiative", id: "applicator" } },
      { key: "bde", label: "Tertiary sales: BDE", type: "std", link: { kind: "initiative", id: "tertiary", kpi: "bde" } },
      { key: "bdeAppl", label: "Tertiary sales: BDE – Applicator", type: "std", link: { kind: "initiative", id: "tertiary", kpi: "appl" } },
    ],
  },
  { topic: "Non-Trade (MTD)", areas: [{ key: "nonTrade", label: "Budget achievement %", type: "phased", link: { kind: "deep", tab: "nontrade" } }] },
  { topic: "Recruitment (FY to date)", areas: [{ key: "recruit", label: "Recruitment status", type: "recruit", link: { kind: "initiative", id: "recruit" } }] },
  { topic: "Training (FY to date)", areas: [{ key: "training", label: "Workforce trained (basic)", type: "std", link: { kind: "initiative", id: "training", kpi: "total" } }] },
];
export const SC_AREAS = SC_TOPICS.flatMap((t) => t.areas);

export interface Metric {
  pct: number | null;
  num?: number;
  den?: number;
  thr?: number;
  fmt?: "count" | "lakh";
}
const R = (num: number, den: number, fmt: Metric["fmt"] = "count"): Metric => (den > 0 ? { pct: (num / den) * 100, num, den, fmt } : { pct: null });

export function evalGroup(t: string[]): Record<string, Metric> {
  const o: Record<string, Metric> = {};
  const de = distExp(t);
  o.distBilling = R(de.billed, de.add);
  o.dist25 = R(de.r25, de.add);
  o.distThru = de.thru != null ? R(de.thru, de.thruTarget, "lakh") : { pct: null };
  const ke = dealerExp(t);
  o.dealerBilling = R(ke.billed2, ke.add);
  o.dealerVg = R(ke.vgYtd, ke.ytdUniv);
  o.dealerThru = ke.thru != null ? R(ke.thru, ke.thruTarget, "lakh") : { pct: null };
  const re = retExp(t);
  o.retAdd = R(re.curMonth.length, re.curTarget);
  o.retBilling = R(re.billed3, re.tillLast.length);
  o.retThru = re.thru != null ? R(re.thru, RET_GUIDE, "lakh") : { pct: null };
  const bd = bpOf(t, "distributor");
  const bk = bpOf(t, "dealer");
  const br = bpOf(t, "retailer");
  o.bpDist = R(bd.billing, bd.billTarget);
  o.bpDealer = R(bk.billing, bk.billTarget);
  o.bpRet = R(br.billing, br.billTarget);
  CATEGORIES.forEach((c) => {
    const a = catAch(t, c.id);
    o[`prod_${c.id}`] = R(a.sales, a.tgt, "lakh");
  });
  const dk = degrowOf(t, "dealer");
  const dr = degrowOf(t, "retailer");
  const den = dk.active + dr.active;
  o.degrow = den ? { pct: ((dk.count + dr.count) / den) * 100, num: dk.count + dr.count, den, thr: DEGROW_MAX[CUR - 1] } : { pct: null };
  const ap = appOf(t);
  o.appReg = R(ap.met, ap.target);
  o.secPrim = ap.ratio != null ? { pct: ap.ratio, num: ap.secondary, den: ap.primary, fmt: "lakh" } : { pct: null };
  const bt = beatOf(t);
  o.beatSe = R(bt.above6, bt.execCount);
  o.beatCp = R(bt.cpMet, bt.cpTarget);
  const ot = orderOf(t);
  o.otProd = ot.k3Pct != null ? { pct: ot.k3Pct, num: ot.pv, den: ot.tv } : { pct: null };
  const al = applOf(t);
  o.appl = R(al.ach, al.target);
  const te = tertiaryOf(t);
  o.bde = R(te.bde.ach, te.bde.tgt, "lakh");
  o.bdeAppl = R(te.appl.ach, te.appl.tgt, "lakh");
  const nt = nonTradeAch(t);
  o.nonTrade = R(nt.sales, nt.tgt, "lakh");
  const rc = recruitOf(t);
  o.recruit = R(rc.total.onGround, rc.total.total);
  const tr = trainingOf(t);
  o.training = R(tr.tot.basicDone, tr.tot.basicTgt);
  return o;
}
export const statusOf = (a: Area, m: Metric | undefined): Rag3 => clr(a.type, m?.pct ?? null, m?.thr);

// ---------------------------------------------------------------------------
// Initiatives: catalogue, sections, card status
// ---------------------------------------------------------------------------

export type InitiativeId =
  | "beat" | "app" | "dist-score" | "scheme" | "competitor" | "degrow" | "hierarchy" | "csat" | "grievance"
  | "dist-exp" | "dealer-exp" | "order" | "ret-exp" | "tertiary" | "applicator" | "recruit" | "training"
  | "share" | "placement" | "mix" | "new-product";

export interface InitiativeDef {
  id: InitiativeId;
  name: string;
  live: boolean;
  /** required input when not live (shown in place of KPIs) */
  needs?: string;
  kpis?: string[];
}
export const INITIATIVES: Record<InitiativeId, InitiativeDef> = {
  beat: { id: "beat", name: "Beat-plan adherence", live: true },
  app: { id: "app", name: "Distributor ordering app", live: true },
  "dist-score": { id: "dist-score", name: "Distributor scorecard", live: false, needs: "Distributor scorecard feed from DMS", kpis: ["# distributors scoring above 3.5", "Average distributor score", "Throughput, reach and range scores"] },
  scheme: { id: "scheme", name: "Dealer scheme", live: true },
  competitor: { id: "competitor", name: "Competitor outlet share gain", live: false, needs: "Outlet-level competitor share survey", kpis: ["# competitor outlets identified", "Share gain at those outlets", "Sales from converted outlets"] },
  degrow: { id: "degrow", name: "De-growing partner recovery", live: true },
  hierarchy: { id: "hierarchy", name: "Manager and hierarchy visits", live: false, needs: "Hierarchy visit plan from SFA", kpis: ["% adherence to the visit plan", "Planned, completed and missed visits"] },
  csat: { id: "csat", name: "Channel satisfaction", live: false, needs: "Channel CSAT survey", kpis: ["# partners scoring above 4", "Average CSAT", "Open issues"] },
  grievance: { id: "grievance", name: "Grievance desk", live: false, needs: "Grievance desk tickets", kpis: ["% resolved on time", "Raised and closed", "Average resolution time"] },
  "dist-exp": { id: "dist-exp", name: "Distributor expansion", live: true },
  "dealer-exp": { id: "dealer-exp", name: "Dealer expansion", live: true },
  order: { id: "order", name: "SFA order taking", live: true },
  "ret-exp": { id: "ret-exp", name: "Retailer expansion", live: true },
  tertiary: { id: "tertiary", name: "Applicator tertiary sales", live: true },
  applicator: { id: "applicator", name: "Applicator programme", live: true },
  recruit: { id: "recruit", name: "Recruitment", live: true },
  training: { id: "training", name: "Training", live: true },
  share: { id: "share", name: "IWC market share", live: false, needs: "Industry market-share data", kpis: ["IWC share in priority markets", "Share gain or loss vs LY"] },
  placement: { id: "placement", name: "Waterproofing Compound placement", live: false, needs: "Outlet placement survey", kpis: ["# dealers and retailers with WP Compound placed", "Placement %", "Billing participation on WP Compound"] },
  mix: { id: "mix", name: "Primer attach rate", live: false, needs: "Invoice line-level mix data", kpis: ["Acrylic Primer attached to Repair Polymer orders", "Mix shift vs LY"] },
  "new-product": { id: "new-product", name: "New product placement", live: false, needs: "Launch tracker", kpis: ["# outlets with new SKUs", "New SKU billing %", "Placement vs target"] },
};
export const INITIATIVE_SECTIONS: { title: string; groups: { title: string; ids: InitiativeId[] }[] }[] = [
  {
    title: "Primary: distributors and dealers",
    groups: [
      { title: "Existing channel", ids: ["beat", "app", "scheme", "degrow", "dist-score", "competitor", "hierarchy", "csat", "grievance"] },
      { title: "New channel", ids: ["dist-exp", "dealer-exp"] },
    ],
  },
  { title: "Secondary: retailers", groups: [{ title: "Existing channel", ids: ["order"] }, { title: "New channel", ids: ["ret-exp"] }] },
  { title: "Tertiary: applicators", groups: [{ title: "Tertiary sales", ids: ["tertiary"] }, { title: "Influencer management", ids: ["applicator"] }] },
  { title: "Recruitment and training", groups: [{ title: "People", ids: ["recruit", "training"] }] },
  { title: "Product", groups: [{ title: "Share and placement", ids: ["share", "placement", "mix", "new-product"] }] },
];

/** Card colour = the card-driving KPI(s), as in the reference: one KPI → its status; two → red if either is red, green only if both are. */
function two(a: Rag3, b: Rag3): Rag3 {
  if (a === "red" || b === "red") return "red";
  if (a === "na" && b === "na") return "na";
  if (a === "green" && b === "green") return "green";
  return "amber";
}
const iStd = (p: number | null): Rag3 => (p == null ? "na" : p >= 100 ? "green" : p >= 90 ? "amber" : "red");
export function initiativeStatus(id: InitiativeId, t: string[]): { rag: Rag3; line: string } {
  const pc = (n: number, d: number) => (d > 0 ? (n / d) * 100 : null);
  const f = (p: number | null) => (p == null ? "NA" : `${p.toFixed(0)}%`);
  switch (id) {
    case "degrow": {
      const m = evalGroup(t).degrow;
      const rag = clr("degrow", m.pct, m.thr);
      return { rag, line: m.pct == null ? "No active partners" : `${m.num} of ${m.den} de-growing (${f(m.pct)} vs ${m.thr}% max)` };
    }
    case "scheme": {
      const s = schemeOf(t).tot;
      const p = pc(s.salesAch, s.salesTgt);
      return { rag: iStd(p), line: `Scheme sales ${f(p)} of target` };
    }
    case "app": {
      const a = appOf(t);
      const p = pc(a.met, a.target);
      return { rag: clr("p7590", p), line: `${a.met} of ${a.target} distributors on cadence` };
    }
    case "beat": {
      const b = beatOf(t);
      const p = pc(b.above6, b.execCount);
      return { rag: iStd(p), line: `${b.above6} of ${b.execCount} executives above 6 visits a day` };
    }
    case "dist-exp": {
      const d = distExp(t);
      return { rag: two(clr("phased", pc(d.billed, d.add)), d.add ? iStd(pc(d.r25, d.add)) : "na"), line: `${d.billed} of ${d.add} new distributors billing` };
    }
    case "dealer-exp": {
      const d = dealerExp(t);
      return { rag: two(d.ytdUniv ? clr("p7590", pc(d.vgYtd, d.ytdUniv)) : "na", iStd(pc(d.billed2, d.add))), line: `${d.billed2} of ${d.add} new dealers billed in 2 months` };
    }
    case "ret-exp": {
      const r = retExp(t);
      return { rag: two(clr("phased", pc(r.curMonth.length, r.curTarget)), r.tillLast.length ? clr("p7590", pc(r.billed3, r.tillLast.length)) : "na"), line: `${r.curMonth.length} of ${r.curTarget} added in Sep` };
    }
    case "order": {
      const o = orderOf(t);
      return { rag: iStd(o.k3Pct), line: `Productivity ${o.k3 == null ? "NA" : `${(o.k3 * 100).toFixed(0)}%`} vs 60%` };
    }
    case "tertiary": {
      const x = tertiaryOf(t);
      const ks = [iStd(x.bde.pct), iStd(pc(x.leadAch, x.leadTgt)), iStd(x.appl.pct)];
      const rag: Rag3 = ks.includes("red") ? "red" : ks.every((k) => k === "green") ? "green" : "amber";
      return { rag, line: `BDE tertiary ${f(x.bde.pct)} of target` };
    }
    case "applicator": {
      const a = applOf(t);
      const ks = a.kpis.map((k) => iStd(pc(k.ach, k.target)));
      const rag: Rag3 = ks.includes("red") ? "red" : ks.every((k) => k === "green") ? "green" : "amber";
      return { rag, line: `${ks.filter((k) => k !== "green").length} of ${ks.length} KPIs below target` };
    }
    case "recruit": {
      const r = recruitOf(t);
      return { rag: clr("recruit", r.pct), line: `On ground ${f(r.pct)} (${r.total.onGround} of ${r.total.total})` };
    }
    case "training": {
      const x = trainingOf(t).tot;
      const p = pc(x.basicDone, x.basicTgt);
      return { rag: p == null ? "na" : p >= 100 ? "green" : p >= 85 ? "amber" : "red", line: `${f(p)} of the eligible workforce trained` };
    }
    default:
      return { rag: "na", line: "Data not available" };
  }
}

// ---------------------------------------------------------------------------
// Recommendations: the reference Action Plan, derived from the same numbers
// ---------------------------------------------------------------------------

export type Priority = "High" | "Medium" | "Low";
export interface ThermoRec {
  id: string;
  priority: Priority;
  title: string;
  evidence: string;
  action: string;
  upliftL: number | null;
  territory: string;
  region: string;
  asm: string;
  lever: { label: string; link: Link };
  route: RecRoute;
  confidence: Confidence;
  trace: ActionTrace;
}

const src = (agent: AgentId, title: string, detail: string, when: string, ageHours: number, independent = true) => ({ agent, title, detail, when, ageHours, independent });
function conf(score: number, rationale: string, sources: ReturnType<typeof src>[]): Confidence {
  return { score, rationale, factors: { corroboration: Math.min(0.95, score / 100 + 0.03), freshness: 0.9, reliability: Math.min(0.95, score / 100) }, sources, rescoredAt: "08:00" };
}

/** worst territory in scope by a metric (lowest first) */
function worst<T>(t: string[], f: (x: string) => T | null, key: (v: T) => number) {
  return t
    .map((x) => ({ x, v: f(x) }))
    .filter((y): y is { x: string; v: T } => y.v != null)
    .sort((a, b) => key(a.v) - key(b.v))[0];
}

export function buildRecs(persona: ThermoPersona): ThermoRec[] {
  const t = groupsFor(persona).flatMap((g) => g.territories);
  const out: ThermoRec[] = [];
  const add = (r: Omit<ThermoRec, "region" | "asm">) => out.push({ ...r, region: regionOfTerr(r.territory), asm: asmOf(r.territory) });

  // 1. Product gap: the category and territory furthest behind its YTD plan
  const prod = worst(
    t,
    (x) => {
      const rows = CATEGORIES.map((c) => ({ c, a: catAch([x], c.id, [0, 1, 2, 3, 4, 5]) })).filter((y) => y.a.pct != null);
      return rows.sort((a, b) => a.a.pct! - b.a.pct!)[0] ?? null;
    },
    (v) => v.a.pct!
  );
  if (prod) {
    const { c, a } = prod.v;
    const gap = Math.max(0, a.tgt - a.sales);
    const dealers = cpsIn([prod.x], "dealer").filter((d) => cpValue(d, "cy", H1, c.id) < cpValue(d, "tgt", H1, c.id) * 0.7).length;
    add({
      id: "tr-prod",
      priority: a.pct! < 75 ? "High" : "Medium",
      title: `Recover the ${c.name} gap in ${prod.x}`,
      evidence: `${c.name} in ${prod.x} is at ${a.pct!.toFixed(0)}% of plan for Apr–Sep: ${fmtL(a.sales)} of ${fmtL(a.tgt)}, ${fmtL(gap)} short. ${dealers} dealers are under 70% of their own plan.`,
      action: `Put ${c.name} on the next two beats for the ${dealers} slow dealers, with a trial-pack scheme.`,
      upliftL: gap * 0.5,
      territory: prod.x,
      lever: { label: "Product deep dive", link: { kind: "deep", tab: "product", cat: c.id } },
      route: "pitch",
      confidence: conf(82, `Plan vs actual is from DMS invoices through ${AS_OF.label}; the dealer split is direct. Visit logs agree the gap is distribution, not demand.`, [
        src("thermometer", "DMS invoices", `${prod.x} · ${c.name}, Apr–Sep`, "08:00 today", 3),
        src("map", "September plan", `${prod.x} category targets`, "08:00 today", 3, false),
        src("pitch", "Visit logs", `${dealers + 4} visits since 1 Sep`, "since 1 Sep", 300),
      ]),
      trace: {
        input: { label: "Thermometer product signal", detail: `${prod.x} · ${c.name} at ${a.pct!.toFixed(0)}% of H1 plan`, at: "08:00" },
        evaluated: [
          { agent: "thermometer", verdict: `${dealers} dealers carry most of the shortfall` },
          { agent: "map", verdict: "already in the October draft as a watch item" },
          { agent: "pitch", verdict: "a trial-pack pitch fits these dealers' last orders", chosen: true },
        ],
        why: "The gap sits with a named set of dealers who stopped reordering, so the fastest lever is the next visit, not a new plan line.",
        outcome: `Prioritised ${c.name} for ${dealers} dealers on ${prod.x}'s next beats`,
        link: "View pitch",
      },
    });
  }

  // 2. De-growing partners: the territory with the highest de-growing share
  const dg = worst(
    t,
    (x) => {
      const k = degrowOf([x], "dealer");
      const r = degrowOf([x], "retailer");
      const den = k.active + r.active;
      return den ? { pct: ((k.count + r.count) / den) * 100, n: k.count + r.count, den, dealers: k.count } : null;
    },
    (v) => -v.pct
  );
  if (dg) {
    const thr = DEGROW_MAX[CUR - 1];
    add({
      id: "tr-degrow",
      priority: dg.v.pct > thr ? "High" : "Medium",
      title: `Win back the de-growing partners in ${dg.x}`,
      evidence: `${dg.v.n} of ${dg.x}'s ${dg.v.den} active dealers and retailers are averaging below last year (${dg.v.pct.toFixed(0)}%, against a ${thr}% ceiling for August). ${dg.v.dealers} are dealers.`,
      action: `Call the ${dg.v.dealers} de-growing dealers this week with their LY run-rate and a recovery target for October.`,
      upliftL: null,
      territory: dg.x,
      lever: { label: "De-growing partner recovery", link: { kind: "initiative", id: "degrow" } },
      route: "tracker",
      confidence: conf(78, "De-growth is computed per partner from DMS (Apr–Aug average vs last year ÷ 12), so the list is exact; whether a call recovers them is the uncertain part.", [
        src("thermometer", "DMS sales, two years", `${dg.v.den} partners in ${dg.x}`, "08:00 today", 3),
        src("huddle", "Morning huddle", "Two partners named as switching", "09:10 today", 2),
      ]),
      trace: {
        input: { label: "De-growth check, monthly", detail: `${dg.x} · ${dg.v.n} partners below LY`, at: "08:00" },
        evaluated: [
          { agent: "thermometer", verdict: "named partners with an owner each: work for the Tracker", chosen: true },
          { agent: "map", verdict: "not a plan change; the target already holds" },
        ],
        why: "Each partner needs a call from a named officer by a date, which is exactly what a Tracker action is.",
        outcome: `${dg.v.dealers} recovery calls in ${asmOf(dg.x)}'s Tracker`,
        link: "View in Tracker",
      },
    });
  }

  // 3. New dealers not billing
  const nd = worst(
    t,
    (x) => {
      const d = dealerExp([x]);
      return d.add ? { pct: (d.billed2 / d.add) * 100, d } : null;
    },
    (v) => v.pct
  );
  if (nd && nd.v.pct < 100) {
    const d = nd.v.d;
    add({
      id: "tr-dealers",
      priority: nd.v.pct < 60 ? "High" : "Medium",
      title: `Activate the new dealers in ${nd.x}`,
      evidence: `${d.add - d.billed2} of ${nd.x}'s ${d.add} dealers appointed since November haven't billed in August or September. Average throughput is ${d.thru == null ? "NA" : fmtL(d.thru)} a month, against the ₹40k guideline.`,
      action: "Book a first order with each silent dealer through their distributor before 15 Oct.",
      upliftL: (d.add - d.billed2) * VALUE_GUIDE.dealer,
      territory: nd.x,
      lever: { label: "Dealer expansion", link: { kind: "initiative", id: "dealer-exp", kpi: "billing2" } },
      route: "tracker",
      confidence: conf(74, "Billing comes from DMS. Two of the dealers were appointed late in August, so a slow start is partly expected.", [
        src("thermometer", "DMS billing", `${d.add} dealers appointed since Nov`, "08:00 today", 3),
        src("pitch", "Visit logs", "3 onboarding visits", "since 15 Aug", 1080),
      ]),
      trace: {
        input: { label: "Expansion check", detail: `${nd.x} · ${d.add - d.billed2} silent new dealers`, at: "08:00" },
        evaluated: [
          { agent: "thermometer", verdict: "first orders need an owner and a date", chosen: true },
          { agent: "pitch", verdict: "onboarding pitch already used on these dealers" },
        ],
        why: "The dealers are appointed but inactive; a booked first order is a task, so it went to the Tracker.",
        outcome: `${d.add - d.billed2} first-order actions in ${asmOf(nd.x)}'s Tracker`,
        link: "View in Tracker",
      },
    });
  }

  // 4. Non-Trade gap → plan
  const ntw = worst(t, (x) => nonTradeAch([x], [0, 1, 2, 3, 4, 5]).pct, (v) => v);
  if (ntw && ntw.v < 90) {
    const a = nonTradeAch([ntw.x], [0, 1, 2, 3, 4, 5]);
    add({
      id: "tr-nontrade",
      priority: ntw.v < 75 ? "High" : "Medium",
      title: `Rebuild the Non-Trade pipeline in ${ntw.x}`,
      evidence: `Project sales in ${ntw.x} are at ${ntw.v.toFixed(0)}% of plan for Apr–Sep (${fmtL(a.sales)} of ${fmtL(a.tgt)}). Hot leads cover less of the next three months than the 6× pipeline rule asks for.`,
      action: "Add two builder meets to the October plan and move the warm leads into named follow-ups.",
      upliftL: Math.max(0, a.tgt - a.sales) * 0.4,
      territory: ntw.x,
      lever: { label: "Non-Trade deep dive", link: { kind: "deep", tab: "nontrade" } },
      route: "map",
      confidence: conf(70, "Sales are exact; the pipeline view depends on how current the lead stages in LMS are.", [
        src("thermometer", "Project invoices", `${ntw.x}, Apr–Sep`, "08:00 today", 3),
        src("map", "October draft", "No Non-Trade initiative yet", "08:00 today", 3, false),
      ]),
      trace: {
        input: { label: "Non-Trade pacing", detail: `${ntw.x} · ${ntw.v.toFixed(0)}% of H1 plan`, at: "08:00" },
        evaluated: [
          { agent: "map", verdict: "a builder-meet initiative fits the October plan", chosen: true },
          { agent: "thermometer", verdict: "not one named action; a month of activity" },
        ],
        why: "Closing a project gap takes a month of meets and follow-ups, so it belongs in the plan as an initiative.",
        outcome: `Added to ${asmOf(ntw.x)}'s October plan as a suggested initiative`,
        link: "View plan",
      },
    });
  }

  // 5. Retailer billing participation
  const bp = worst(t, (x) => bpOf([x], "retailer").pct, (v) => v);
  if (bp && bp.v < 85) {
    const b = bpOf([bp.x], "retailer");
    add({
      id: "tr-bp",
      priority: bp.v < 70 ? "Medium" : "Low",
      title: `Lift retailer billing in ${bp.x}`,
      evidence: `${b.billing} of ${b.active} active retailers in ${bp.x} have billed this month, against ${Math.round(b.billTarget)} expected by now (${bp.v.toFixed(0)}% of target participation).`,
      action: "Route the non-billing retailers into this week's beats through SFA order taking.",
      upliftL: (b.billTarget - b.billing) * 0.12,
      territory: bp.x,
      lever: { label: "Channel deep dive", link: { kind: "deep", tab: "channel" } },
      route: "pitch",
      confidence: conf(68, "Participation is exact from secondary billing; the last few days of the month usually add some billing back.", [src("thermometer", "Secondary billing", `${b.active} retailers in ${bp.x}`, "08:00 today", 3)]),
      trace: {
        input: { label: "Participation check", detail: `${bp.x} · ${b.active - b.billing} retailers not billed`, at: "08:00" },
        evaluated: [
          { agent: "pitch", verdict: "beat order can carry the non-billing retailers", chosen: true },
          { agent: "thermometer", verdict: "too many retailers for individual actions" },
        ],
        why: "The retailers are already on beats; reprioritising the beat is cheaper than separate actions.",
        outcome: `Non-billing retailers moved up ${bp.x}'s beats`,
        link: "View pitch",
      },
    });
  }

  const P: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
  return out.sort((a, b) => P[a.priority] - P[b.priority] || (b.upliftL ?? -1) - (a.upliftL ?? -1));
}
