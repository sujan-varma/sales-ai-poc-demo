"""Data for the Cortex web app (Next.js, src/data/*.ts), built from the Excel workbook (GET /api/web/bootstrap).

Every export the web app's data files used to hardcode is produced here with the same shape:
  * read straight from the workbook: org (RSM -> ASMs -> territories), monthly plan vs actual, territory health
    (revenue, coverage, collection, short supply, market share), channel partners per category per month,
    huddle verbatims, influencer KPIs, loyalty tiers
  * derived from workbook signals: actions, recommendations, insights, decisions, activity log, tiers, impact
  * not available in the workbook: listed in DATA_GAPS (returned with the payload)

Money is in ₹ lakh where the web app expects lakh (fields ending in L, thermometer partner arrays).
"""

from __future__ import annotations

import datetime as dt
import re
from collections import Counter, defaultdict
from typing import Any, Optional

from app.services import web_plan
from app.services.excel_data import Workbook

MASTER, GEO, PRODUCTS, CREDIT = "4. Retailer_Master", "1. Geography", "2. Products", "5. Retailer Credit"
ACT_V, TGT_V, PROJ, LOGI = "8. Actual Sales Value", "9. Target Sales Value", "11. Sep projections on qty", "15. Logistics fulfilment"
LOY1, LOY2, LOYS, SCHEME = "14b Q1 loyalty payout", "14c Q2 loyalty performance", "14a. Loyalty program structure", "13. Retailer scheme"
HUDDLE, MARKET, INFL = "Huddle", "Data 11 - Market Size", "Data 12 - Influencer Data"

AS_OF = dt.date(2026, 9, 20)
TODAY = dt.date(2026, 9, 21)
MONTH_DAYS = 30
FY = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
ACT_COL = {0: "Apr-26", 1: "May-26", 2: "Jun-26", 3: "Jul-26", 4: "Aug-26", 5: "Sep-26 MTD (till 20th)"}
TGT_COL = {0: "Apr-26", 1: "May-26", 2: "Jun-26", 3: "Jul-26", 4: "Aug-26", 5: "Sep-26"}
CAT_IDS = {"IWC": "iwc", "Repair Polymer": "rp", "Acrylic Primer": "ap", "Waterproofing Compound": "wc"}
CAT_ORDER = ["IWC", "Repair Polymer", "Acrylic Primer", "Waterproofing Compound"]
MARKET_CAT = {"IWC": "IWC", "Repair Polymer": "REP", "Acrylic Primer": "ACR", "Waterproofing Compound": "WAT"}
WD = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

DATA_GAPS = [
    {"area": "Last year's sales (LY)", "detail": "No prior-year sales, so growth % shows NA and size bands use the Apr–Aug average instead of the LY average."},
    {"area": "Action tracker", "detail": "No action records. Actions are generated from workbook signals (overdue, credit, target gap, short supply, loyalty, huddle themes). There is no completion history, so 'done' counts are 0 and trends start at the data date."},
    {"area": "Daily / weekly sales", "detail": "Sales are monthly (Sep to the 20th). 'Today' and 'This week' are the Sep MTD daily average × 1 and × 7."},
    {"area": "Stock cover", "detail": "No stock data. The health grid's Stock column shows short-supplied orders from '15. Logistics fulfilment' instead."},
    {"area": "Competitor pricing", "detail": "No price data. The Pricing column shows the company's share of market size per micro market from 'Data 11 - Market Size'."},
    {"area": "AI confidence scores", "detail": "No model outputs. Confidence is computed from how many workbook sheets support each item and how fresh they are."},
    {"area": "Activity log events", "detail": "No event log. The log is built from dated workbook records: SO visits, distributor orders and payments received."},
    {"area": "Decisions taken, routes, outcomes", "detail": "No decision history. Decisions are proposed from signals above the Configuration thresholds; nothing is marked as already decided."},
    {"area": "Initiative outcomes, acceptance, duplicates", "detail": "No initiative records; the roll-up groups signals by territory and type, with no accepted/rejected split."},
    {"area": "Non-Trade lead pipeline (LMS)", "detail": "No project leads in the workbook; the pipeline is empty."},
    {"area": "Ordering-app slabs, training, recruitment pipeline, de-growth targets", "detail": "Not in the workbook; those Thermometer initiative inputs are 0."},
    {"area": "Tertiary (BDE) sales", "detail": "Data 12 has influencer onboarding/activation counts, not sales value; BDE sales are 0."},
    {"area": "Project customers, dealers", "detail": "Outlets are retailers (Cement-Steel Dealers are shown as dealers); there are no project customers. Distributor sales are the secondary sales of their retailers."},
    {"area": "Weekly score history", "detail": "No history; Scorecard trends are flat at today's score."},
    {"area": "Configuration settings and history", "detail": "Platform settings and thresholds are app configuration, not workbook data."},
]


# ---------------------------------------------------------------- helpers

def _n(v: Any) -> float:
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) and v == v else 0.0


def L(v: float) -> float:
    return round(v / 1e5, 4)


def inr(v: float) -> str:
    if abs(v) >= 1e7:
        return f"₹{v / 1e7:.2f}Cr"
    if abs(v) >= 1e5:
        return f"₹{v / 1e5:.1f}L"
    return f"₹{round(v):,}"


def pct(a: float, b: float) -> Optional[float]:
    return a / b * 100 if b else None


def _date(v: Any) -> Optional[dt.date]:
    return dt.date.fromisoformat(v[:10]) if isinstance(v, str) and re.match(r"\d{4}-\d{2}-\d{2}", v) else None


def initials(name: str) -> str:
    p = str(name).split()
    return (p[0][:1] + (p[-1][:1] if len(p) > 1 else p[0][1:2])).upper()


def first(name: str) -> str:
    return str(name).split()[0]


def conf(score: int, rationale: str, sources: list[dict[str, Any]], at: str = "08:00") -> dict[str, Any]:
    ind = sum(1 for s in sources if s["independent"])
    return {
        "score": score, "rationale": rationale,
        "factors": {"corroboration": round(min(0.95, 0.45 + 0.15 * ind), 2), "freshness": 0.86, "reliability": round(score / 100, 2)},
        "sources": sources, "rescoredAt": at,
    }


def src(agent: str, title: str, detail: str, independent: bool = True, hours: float = 24) -> dict[str, Any]:
    return {"agent": agent, "title": title, "detail": detail, "when": "Excel · 20 Sep", "ageHours": hours, "independent": independent}


def score_from(n_sheets: int, base: int = 58) -> int:
    return min(92, base + 9 * n_sheets)


# ---------------------------------------------------------------- per-retailer facts

class _Org:
    def __init__(self, wb: Workbook, asm_name: str) -> None:
        S = wb.sheets
        self.master = S[MASTER].rows
        tgt_rows = S[TGT_V].rows
        if len(tgt_rows) != len(self.master):
            raise ValueError("Target sheet rows don't line up with the retailer master")
        by_id = lambda name: {r["retailer_id"]: r for r in reversed(S[name].rows)}
        act, cr, pj, lg = by_id(ACT_V), by_id(CREDIT), by_id(PROJ), by_id(LOGI)
        l1, l2 = by_id(LOY1), by_id(LOY2)
        self.products = [r for r in S[PRODUCTS].rows if isinstance(r.get("sku_id"), str) and isinstance(r.get("Retailer price"), (int, float))]
        self.sku_cat = {p["sku_id"]: p["category"] for p in self.products}
        self.geo = S[GEO].rows
        self.rsm = Counter(r["RSM name"] for r in self.geo).most_common(1)[0][0]
        self.state = Counter(r["state"] for r in self.geo).most_common(1)[0][0]

        # ASM -> territories (geography order) and region names
        terr_by_asm: dict[str, list[str]] = defaultdict(list)
        mm_by_asm: dict[str, Counter] = defaultdict(Counter)
        for g in self.geo:
            if g["Territory"] not in terr_by_asm[g["ASM Name"]]:
                terr_by_asm[g["ASM Name"]].append(g["Territory"])
            mm_by_asm[g["ASM Name"]][g["micro_market"]] += 1
        mm_of = {a: c.most_common(1)[0][0] for a, c in mm_by_asm.items()}
        shared = Counter(mm_of.values())
        # ASMs sharing a micro market (e.g. Ahmedabad) are named by the direction words their territories share
        def region_name(a: str, mm: str) -> str:
            if shared[mm] == 1:
                return mm
            words = [set(t.replace(mm, "").replace("-", " ").split()) for t in terr_by_asm[a]]
            common = set.intersection(*words) if words else set()
            pick = sorted(common) if common else sorted(set.union(*words))
            return f"{mm} {' & '.join(pick)}" if pick else f"{mm} ({a})"

        self.region_of_asm = {a: region_name(a, mm) for a, mm in mm_of.items()}
        self.micro_of_asm = mm_of
        self.terr_by_asm = dict(terr_by_asm)
        self.asm_of_terr = {t: a for a, ts in terr_by_asm.items() for t in ts}
        self.asm = asm_name if asm_name in terr_by_asm else next(iter(terr_by_asm))

        self.facts: list[dict[str, Any]] = []
        for r, t in zip(self.master, tgt_rows):
            rid = r["retailer_id"]
            a = act.get(rid, {})
            cy = {c: [0.0] * 12 for c in CAT_ORDER}
            tg = {c: [0.0] * 12 for c in CAT_ORDER}
            for sku, cat in self.sku_cat.items():
                for m, col in ACT_COL.items():
                    cy[cat][m] += _n(a.get(f"{col} / {sku}"))
                for m, col in TGT_COL.items():
                    tg[cat][m] += _n(t.get(f"{col} / {sku}"))
                h2 = max(0.0, _n(t.get(f"Yearly target / {sku}")) - sum(_n(t.get(f"{c} / {sku}")) for c in TGT_COL.values()))
                for m in range(6, 12):
                    tg[cat][m] += h2 / 6
            c, p, o = cr.get(rid, {}), pj.get(rid, {}), lg.get(rid, {})
            ach = p.get("MTD achiev % / Total")
            self.facts.append({
                "rid": rid, "name": r["retailer_name"], "asm": r["ASM Name"], "terr": r["Territory"], "so": r["Sales officer name"], "so_id": str(r["Sales officer ID"]),
                "dist_id": r["Distributor ID"], "dist": r["Distributor Name"], "type": r["Type of Outlet"], "cls": r["Outlet Class"],
                "new": r["New/old"] == "New", "onboarded": _date(r["Onboarded On"]), "micro": r["Micro Market"],
                "visit": _date(r["SO Last visit date"]), "vtime": r["SO Last visit time"] if isinstance(r["SO Last visit time"], str) else None,
                "cy": cy, "tgt": tg,
                "sep": sum(cy[k][5] for k in CAT_ORDER), "sep_t": sum(tg[k][5] for k in CAT_ORDER),
                "sep_mtd_t": _n(t.get("Sep-26 MTD (till 20th) / Total")),
                "aug_mtd": _n(a.get("Aug-26 MTD till 20th / Total")),
                "overdue": _n(c.get("Outstanding as on 20th Sep (Overdue outside credit period)")),
                "outstanding": _n(c.get("Outstanding as on 20th Sep (Due+ Overdue)")),
                "ageing": int(_n(c.get("Ageing (days) of Outstanding overdue outside credit limit period "))),
                "util": _n(c.get("Credit limit utilisation %")), "limit": _n(c.get("Credit limit value")),
                "bounces": int(_n(c.get("Cheque bounces in last 6 months"))), "risk": c.get("Risk category (High medium low no)"),
                "paid_on": _date(c.get("Last paid on")), "paid": _n(c.get("Last paid value")),
                "ach": ach if isinstance(ach, (int, float)) else None, "gap": _n(p.get("Gap / Total")),
                "short_sku": o.get("SKU short supplied by distributor to retailer"), "short_qty": _n(o.get("SKU order qty short supplied by distributor to retailer")),
                "order_id": o.get("Order ID"), "order_date": _date(o.get("Order date")),
                "loy1": l1.get(rid, {}), "loy2": l2.get(rid, {}),
                "has_act": rid in act,
            })
        self.by_asm: dict[str, list[dict]] = defaultdict(list)
        self.by_terr: dict[str, list[dict]] = defaultdict(list)
        for f in self.facts:
            self.by_asm[f["asm"]].append(f)
            self.by_terr[f["terr"]].append(f)
        self.asms = [a for a in self.terr_by_asm if self.by_asm.get(a)]
        self.market = {(r["Micro Market"], r["Category"]): r for r in S[MARKET].rows if r.get("Micro Market")}
        self.huddle = [r for r in S[HUDDLE].rows if isinstance(r.get("#"), (int, float)) and r.get("Theme")]
        # Data 12: first four columns have no header text (state, ASM, BDE position, BDE exists); then TGT/ACH/ACH% x4
        self.influencer = []
        for r in S[INFL].rows:
            vals = [v for k, v in r.items() if k != "_row_id"]
            if len(vals) > 4 and isinstance(vals[2], str) and vals[2].startswith("BDE-"):
                self.influencer.append({"asm": vals[1], "pos": vals[2], "exists": vals[3] == "Y",
                                        "nums": [v if isinstance(v, (int, float)) else 0 for v in vals[4:]]})
        self.loy_tiers = S[LOYS].rows
        self.scheme = {r["retailer_id"]: r for r in S[SCHEME].rows if r.get("retailer_id")}


# ---------------------------------------------------------------- aggregations

def _sum(fs, key) -> float:
    return sum(f[key] for f in fs)


def _month(fs, kind: str, m: int) -> float:
    return sum(f[kind][c][m] for f in fs for c in CAT_ORDER)


def _billed(fs, key) -> int:
    return sum(1 for f in fs if f[key] > 0)


def health_cells(org: _Org, fs: list[dict], micro: str) -> list[dict[str, Any]]:
    act, mtd_t = _sum(fs, "sep"), _sum(fs, "sep_mtd_t")
    rev = pct(act, mtd_t) or 0
    lv = lambda v, cuts: next((4 - i for i, c in enumerate(cuts) if v >= c), 0)
    sep_b, aug_b = _billed(fs, "sep"), _billed(fs, "aug_mtd")
    cov = (sep_b - aug_b) / aug_b * 100 if aug_b else 0
    od, out = _sum(fs, "overdue"), _sum(fs, "outstanding")
    od_n = sum(1 for f in fs if f["overdue"] > 0)
    od_share = od / out * 100 if out else 0
    orders = sum(1 for f in fs if f["order_id"])
    short = sum(1 for f in fs if f["short_sku"])
    short_share = short / orders * 100 if orders else 0
    mk = org.market.get((micro, "Overall"))
    share = _n(mk.get("Client (LPM)")) / _n(mk.get("Market Size (LPM)")) * 100 if mk and _n(mk.get("Market Size (LPM)")) else None
    return [
        {"level": lv(rev, [100, 90, 80, 70]), "value": f"{rev:.0f}%", "detail": f"Sep MTD {inr(act)} of {inr(mtd_t)} phased target (to 20 Sep)"},
        {"level": lv(cov, [2, 0, -3, -8]), "value": f"{'+' if cov >= 0 else '−'}{abs(cov):.0f}%", "detail": f"{sep_b} retailers billed vs {aug_b} in Aug (to the 20th)"},
        {"level": 4 if od == 0 else lv(-od_share, [-5, -15, -30, -45]), "value": "OK" if od == 0 else inr(od), "detail": "No overdue" if od == 0 else f"Overdue at {od_n} retailers · {od_share:.0f}% of outstanding"},
        {"level": lv(-short_share, [0, -5, -10, -20]), "value": str(short), "detail": f"{short} of {orders} distributor orders short-supplied"},
        {"level": lv(share, [30, 22, 15, 10]) if share is not None else 3, "value": f"{share:.0f}%" if share is not None else "–", "detail": f"Company share of {micro} market size" if share is not None else "No market-size data"},
    ]


# ---------------------------------------------------------------- signals -> actions

def retailer_signals(f: dict) -> list[dict[str, Any]]:
    out = []
    if f["overdue"] > 0:
        out.append(dict(kind="collection", agent="thermometer", signal="Collection", value=f["overdue"],
                        title=f"Collect {inr(f['overdue'])} overdue ({f['ageing']} days)", delayed=f["ageing"] > 60,
                        pri=3 if f["risk"] == "High" else 2 if f["ageing"] > 30 else 1))
    elif f["util"] > 1.2:
        out.append(dict(kind="credit", agent="thermometer", signal="Collection", value=f["outstanding"] - f["limit"],
                        title=f"Credit limit utilised {f['util'] * 100:.0f}%", delayed=False, pri=1))
    if f["ach"] is not None and f["ach"] < 0.6 and f["gap"] > 0:
        gap_v = max(0.0, f["sep_mtd_t"] - f["sep"])
        out.append(dict(kind="gap", agent="map", signal="Revenue", value=gap_v,
                        title=f"Close the Sep target gap ({f['ach'] * 100:.0f}% MTD)", delayed=f["ach"] < 0.3, pri=2 if f["ach"] < 0.4 else 1))
    if f["short_sku"]:
        out.append(dict(kind="short", agent="thermometer", signal="Stock", value=0.0,
                        title=f"Resolve short supply of {f['short_sku']} ({int(f['short_qty'])} units)", delayed=False, pri=2))
    if f["visit"] is None or (AS_OF - f["visit"]).days > 30:
        out.append(dict(kind="coverage", agent="pitch", signal="Coverage", value=f["sep_t"] * 0.5,
                        title="Visit — not visited in 30+ days" if f["visit"] else "First SO visit — never visited", delayed=f["visit"] is None, pri=1))
    l2 = f["loy2"]
    add = l2.get("Additional qty sale required in sep to reach next slab")
    if isinstance(add, (int, float)) and 0 < add <= 300:
        out.append(dict(kind="loyalty", agent="pitch", signal="Revenue", value=0.0,
                        title=f"Loyalty: {int(add)} packs to {l2.get('Next eligible slab')}", delayed=False, pri=0))
    return out


# ---------------------------------------------------------------- main

_cache: dict[str, Any] = {}


def build(wb: Workbook, asm_name: str = "Raman") -> dict[str, Any]:
    key = (wb.loaded_at, asm_name)
    if _cache.get("key") == key:
        return _cache["data"]
    data = _build(wb, asm_name)
    _cache.update(key=key, data=data)
    return data


def _build(wb: Workbook, asm_name: str) -> dict[str, Any]:
    org = _Org(wb, asm_name)
    A = org.asm
    region_of = org.region_of_asm
    my_terrs = org.terr_by_asm[A]
    my = org.by_asm[A]
    allf = org.facts
    days_left = MONTH_DAYS - AS_OF.day
    so_counts = Counter(f["so"] for f in my)
    exec_so = so_counts.most_common(1)[0][0]

    # ---- REGIONS
    regions = []
    for a in org.asms:
        fs = org.by_asm[a]
        regions.append({"name": region_of[a], "asm": a, "initials": initials(a), "territories": org.terr_by_asm[a],
                        "sepEstimateL": L(_sum(fs, "sep_t")), "sepAchievedL": L(_sum(fs, "sep"))})
    regions.sort(key=lambda r: (r["asm"] != A, r["name"]))
    my_region = region_of[A]

    # ---- health grids
    org_rows = [{"name": region_of[a], "cells": health_cells(org, org.by_asm[a], org.micro_of_asm[a])} for a in org.asms]
    org_rows.sort(key=lambda r: r["name"] != my_region)
    terr_rows = {region_of[a]: [{"name": t, "cells": health_cells(org, org.by_terr[t], org.micro_of_asm[a])} for t in org.terr_by_asm[a] if org.by_terr.get(t)] for a in org.asms}
    cols = ["Revenue", "Coverage", "Collection", "Stock", "Pricing"]

    # ---- plan months
    def plan_months(fs, note_fn) -> list[dict]:
        out = []
        for m in range(6):
            est, ach = _month(fs, "tgt", m), _month(fs, "cy", m)
            if m < 5:
                out.append({"month": FY[m], "created": True, "estimateL": round(L(est), 1), "achievedL": round(L(ach), 1), "status": "delivered", "note": note_fn(m, est, ach)})
            else:
                proj = ach * MONTH_DAYS / AS_OF.day / est * 100 if est else 0
                out.append({"month": "Sep", "created": True, "estimateL": round(L(est), 1), "achievedL": round(L(ach), 1), "status": "progress",
                            "note": f"{days_left} days left · to 20 Sep · projected ~{proj:.0f}%"})
        out.append({"month": "Oct", "created": False, "estimateL": None, "achievedL": None, "status": "not-started", "note": "Not created · Sep month-end lands 1 Oct"})
        return out

    plan_my = plan_months(my, lambda m, e, a: f"{pct(a, e) or 0:.0f}% of target")
    plan_head = plan_months(allf, lambda m, e, a: f"{len(org.asms)} ASMs · {pct(a, e) or 0:.0f}% of target")

    # ---- signals / actions
    sig_rows = []  # (fact, signal)
    for f in allf:
        for s in retailer_signals(f):
            sig_rows.append((f, s))

    def status_of(s) -> str:
        return "delayed" if s["delayed"] else "progress"

    def counts(rows) -> dict[str, Any]:
        c = Counter(status_of(s) for _, s in rows)
        b = Counter(s["agent"] for _, s in rows)
        return {"total": len(rows), "counts": {"done": 0, "progress": c["progress"], "delayed": c["delayed"], "unassigned": c["unassigned"]},
                "bySource": {k: b.get(k, 0) for k in ("thermometer", "map", "huddle", "pitch")}}

    huddle_items = org.huddle
    huddle_actions = sum(int(_n(h.get("# of action items"))) for h in huddle_items)
    my_rows = [(f, s) for f, s in sig_rows if f["asm"] == A]

    # ASM-level actions: one per (territory, signal type)
    groups: dict[tuple, list] = defaultdict(list)
    for f, s in my_rows:
        groups[(f["terr"], s["kind"])].append((f, s))
    KIND_LABEL = {"collection": "Collection follow-up", "credit": "Credit limit review", "gap": "Sep target gap", "short": "Short-supply follow-up",
                  "coverage": "Retailer coverage", "loyalty": "Loyalty slab push"}
    asm_actions = []
    for (t, k), rows in sorted(groups.items(), key=lambda kv: -sum(s["value"] for _, s in kv[1])):
        val = sum(s["value"] for _, s in rows)
        delayed = sum(1 for _, s in rows if s["delayed"])
        asm_actions.append({"id": f"act-{re.sub(r'[^a-z0-9]+', '-', t.lower())}-{k}", "territory": t, "kind": k, "agent": rows[0][1]["agent"],
                            "n": len(rows), "value": val, "status": "delayed" if delayed > len(rows) / 2 else "progress",
                            "owner": Counter(f["so"] for f, _ in rows).most_common(1)[0][0],
                            "title": f"{KIND_LABEL[k]} · {len(rows)} retailer{'s' if len(rows) > 1 else ''}" + (f" · {inr(val)}" if val else "")})
    tracker_asm = counts(my_rows)
    tracker_head = counts(sig_rows)
    tracker_head["bySource"]["huddle"] += huddle_actions
    tracker_head["total"] += huddle_actions
    tracker_head["counts"]["unassigned"] += huddle_actions

    week_days = [(AS_OF - dt.timedelta(days=6 - i)) for i in range(7)]
    WEEK_DAYS = [f"{d.strftime('%a')} {d.day}" for d in week_days]

    def dots(rows, limit=24):
        out = []
        for f, s in sorted(rows, key=lambda x: -x[1]["value"])[:limit]:
            d = f["visit"] if f["visit"] and f["visit"] >= week_days[0] else AS_OF
            hour = int(f["vtime"][:2]) if f["vtime"] and d == f["visit"] else 8
            out.append({"agent": s["agent"], "day": (d - week_days[0]).days, "hour": hour, "status": status_of(s), "label": f"{s['title']} · {f['name']}"})
        return out

    attention_asm = [{"id": a["id"], "where": a["territory"], "action": KIND_LABEL[a["kind"]], "detail": a["title"].split(" · ", 1)[1],
                      "status": a["status"], "source": a["agent"], "owner": a["owner"]} for a in asm_actions[:4]]
    head_att = []
    for a in sorted(org.asms, key=lambda a: -sum(s["value"] for f, s in sig_rows if f["asm"] == a))[:3]:
        rows = [(f, s) for f, s in sig_rows if f["asm"] == a]
        dl = sum(1 for _, s in rows if s["delayed"])
        top = Counter(s["kind"] for _, s in rows).most_common(1)[0][0]
        head_att.append({"id": f"act-head-{a.lower()}", "where": f"{a} · {region_of[a]}", "action": f"{dl} delayed actions", "detail": f"Mostly {KIND_LABEL[top].lower()}", "status": "delayed", "source": "thermometer"})

    TRACKER = {
        "asm": {"scopeLabel": "My actions, from all four agents · September", **tracker_asm, "attention": attention_asm, "dots": dots(my_rows)},
        "head": {"scopeLabel": f"All actions under me · {len(org.asms)} ASMs · September", **tracker_head, "attention": head_att, "dots": dots(sig_rows, 60)},
    }
    team_rows = my_rows
    TEAM_TRACKER = counts(team_rows)
    officers = []
    for so, n in so_counts.most_common(6):
        ts = sorted({f["terr"] for f in my if f["so"] == so})
        acts = sum(1 for f, _ in my_rows if f["so"] == so)
        so_id = next(f["so_id"] for f in my if f["so"] == so)
        officers.append({"id": so_id, "name": so, "territories": ", ".join(ts), "share": round(acts / max(1, len(my_rows)) * 100)})
    action_items = [{"id": a["id"], "title": a["title"], "territory": a["territory"], "owner": A, "status": a["status"], "source": a["agent"], "hoursAgo": 24 + i * 3}
                    for i, a in enumerate(asm_actions[:8])]
    for i, (f, s) in enumerate(sorted(my_rows, key=lambda x: -x[1]["value"])[:10]):
        action_items.append({"id": f"act-t{i + 1}", "title": f"{s['title']} · {f['name']}", "territory": f["terr"], "owner": f["so"], "status": status_of(s), "source": s["agent"], "hoursAgo": 24 + i * 5,
                             "retailerId": f["rid"], "kind": s["kind"]})

    # monthly signal history: retailers under 80% of target each month (opened); no completion data
    def action_months(fs):
        out = []
        for m in range(6):
            n = sum(1 for f in fs if sum(f["tgt"][c][m] for c in CAT_ORDER) > 0 and sum(f["cy"][c][m] for c in CAT_ORDER) < 0.8 * sum(f["tgt"][c][m] for c in CAT_ORDER) * (AS_OF.day / MONTH_DAYS if m == 5 else 1))
            out.append({"month": FY[m], "opened": n, "completed": 0})
        return out

    def trend(total):
        return [{"label": l, "opened": (total if l == "20 Sep" else 0), "completed": 0} for l in ["1 Sep", "8 Sep", "15 Sep", "20 Sep"]]

    # ---- recommendations (ASM territories)
    recs = []

    def add_rec(territory, signal, title, why, impact, label, pitch_for, product, segment, sources, rationale):
        n = len(recs) + 1
        recs.append({"id": f"rec-{n}", "n": n, "territory": territory, "signal": signal, "title": title, "why": why,
                     "impactL": round(L(impact), 2), "impactLabel": label, "pitchFor": pitch_for, "product": product, "sector": "Retail",
                     "segment": segment, "raisedHoursAgo": 24 + n, "confidence": conf(score_from(len(sources)), rationale, sources)})

    def top_cat(fs, gap=True):
        g = Counter()
        for f in fs:
            for c in CAT_ORDER:
                g[c] += (f["tgt"][c][5] * AS_OF.day / MONTH_DAYS - f["cy"][c][5]) if gap else f["cy"][c][5]
        return g.most_common(1)[0]

    seg = lambda fs: Counter(f["type"] for f in fs).most_common(1)[0][0]
    for t in sorted(my_terrs, key=lambda t: -_sum(org.by_terr[t], "overdue")):
        fs = org.by_terr[t]
        od = [f for f in fs if f["overdue"] > 0]
        if od:
            topf = max(od, key=lambda f: f["overdue"])
            add_rec(t, "Collection", f"Collect {inr(_sum(od, 'overdue'))} overdue from {len(od)} retailers; start with {topf['name']} ({inr(topf['overdue'])}, {topf['ageing']} days).",
                    f"{sum(1 for f in od if f['risk'] == 'High')} high-risk accounts; {sum(f['bounces'] for f in od)} cheque bounces in 6 months.",
                    _sum(od, "overdue"), f"{inr(_sum(od, 'overdue'))} overdue", topf["name"], top_cat(fs, False)[0], seg(od),
                    [src("thermometer", "5. Retailer Credit", f"{len(od)} retailers past credit period"), src("pitch", "SO visits", f"{sum(1 for f in od if f['visit'] and (AS_OF - f['visit']).days <= 30)} visited in 30 days", False)],
                    "Overdue and ageing come straight from the credit sheet as on 20 Sep.")
            break
    for t in sorted(my_terrs, key=lambda t: -(_sum(org.by_terr[t], "sep_mtd_t") - _sum(org.by_terr[t], "sep"))):
        fs = org.by_terr[t]
        cat, gv = top_cat(fs)
        add_rec(t, "Revenue", f"Push {cat} in {t}: {inr(gv)} behind the phased Sep target.",
                f"{t} is at {pct(_sum(fs, 'sep'), _sum(fs, 'sep_mtd_t')) or 0:.0f}% of its MTD target with {days_left} days left.",
                gv, f"{inr(gv)} gap to date", f"{sum(1 for f in fs if f['ach'] is not None and f['ach'] < 0.6)} retailers under 60% of target", cat, seg(fs),
                [src("thermometer", "8. Actual Sales Value", "Sep MTD by SKU"), src("map", "9. Target Sales Value", "Sep target, phased to the 20th"), src("thermometer", "11. Sep projections", "Gap and run-rate per retailer")],
                "Actuals and targets are both from the workbook; the gap is phased to the 20th.")
        if len(recs) >= 2:
            break
    for t in sorted(my_terrs, key=lambda t: -sum(1 for f in org.by_terr[t] if f["visit"] is None or (AS_OF - f["visit"]).days > 30)):
        fs = org.by_terr[t]
        unv = [f for f in fs if f["visit"] is None or (AS_OF - f["visit"]).days > 30]
        if unv:
            add_rec(t, "Coverage", f"Cover {len(unv)} retailers in {t} not visited for 30+ days.",
                    f"{sum(1 for f in unv if f['visit'] is None)} have never had an SO visit; together they carry {inr(_sum(unv, 'sep_t'))} of Sep target.",
                    _sum(unv, "sep_t") * 0.5, f"{inr(_sum(unv, 'sep_t'))} Sep target uncovered", f"{len(unv)} retailers on the next beat", top_cat(unv, False)[0], seg(unv),
                    [src("pitch", "4. Retailer_Master", "SO last visit date per retailer"), src("map", "9. Target Sales Value", "Sep target of those retailers", False)],
                    "Visit dates are the SO's last recorded visit; there's no visit plan in the workbook.")
            break
    shorts = [f for f in my if f["short_sku"]]
    if shorts:
        t = Counter(f["terr"] for f in shorts).most_common(1)[0][0]
        sk = Counter(f["short_sku"] for f in shorts).most_common(1)[0][0]
        fs = [f for f in shorts if f["terr"] == t]
        add_rec(t, "Stock", f"Get {sk} delivered to {len(fs)} retailers in {t} short-supplied by their distributor.",
                f"{int(sum(f['short_qty'] for f in fs))} units short across {len(fs)} orders this month.",
                sum(f["sep"] for f in fs) * 0.1, f"{len(fs)} short-supplied orders", fs[0]["name"], org.sku_cat.get(sk, sk), seg(fs),
                [src("thermometer", "15. Logistics fulfilment", "Short-supplied SKU and quantity per order")],
                "Short supply is recorded per order in the logistics sheet.")
    mk = org.market.get((org.micro_of_asm[A], "Overall"))
    if mk:
        comps = {k: _n(v) for k, v in mk.items() if k.startswith("Competitor")}
        cname, cval = max(comps.items(), key=lambda kv: kv[1])
        share = _n(mk["Client (LPM)"]) / _n(mk["Market Size (LPM)"]) * 100
        add_rec(my_terrs[0], "Pricing", f"{cname.replace(' (LPM)', '')} out-sells us in {org.micro_of_asm[A]}: hold price, push schemes.",
                f"Company share is {share:.0f}% of market size; {cname.replace(' (LPM)', '')} has {cval / _n(mk['Market Size (LPM)']) * 100:.0f}%.",
                0.0, f"{share:.0f}% market share", f"Top outlets in {org.micro_of_asm[A]}", "Waterproofing Compound", seg(my),
                [src("map", "Data 11 - Market Size", "Client vs competitor LPM by micro market")], "Market size is a single estimate per micro market, not invoices.")
    # top up to 6 with the next biggest collection / revenue territories
    for t in my_terrs:
        if len(recs) >= 6:
            break
        if not any(r["territory"] == t and r["signal"] == "Revenue" for r in recs):
            fs = org.by_terr[t]
            cat, gv = top_cat(fs)
            if gv > 0:
                add_rec(t, "Revenue", f"Push {cat} in {t}: {inr(gv)} behind the phased Sep target.", f"{t} is at {pct(_sum(fs, 'sep'), _sum(fs, 'sep_mtd_t')) or 0:.0f}% of its MTD target.",
                        gv, f"{inr(gv)} gap to date", f"{t} retailers under 60%", cat, seg(fs),
                        [src("thermometer", "8. Actual Sales Value", "Sep MTD"), src("map", "9. Target Sales Value", "Sep target")], "From workbook actuals and targets.")

    # health cell -> recommendation links
    for r in recs:
        col = {"Revenue": 0, "Coverage": 1, "Collection": 2, "Stock": 3, "Pricing": 4}[r["signal"]]
        for row in terr_rows.get(my_region, []):
            if row["name"] == r["territory"] and "target" not in row["cells"][col]:
                row["cells"][col]["target"] = r["id"]

    sig_counts = Counter(r["signal"] for r in recs)
    SIGNAL_COUNTS = [{"type": k, "count": sig_counts.get(k, 0)} for k in ["Collection", "Coverage", "Revenue", "Stock", "Pricing"]]
    month_lev = Counter(s["signal"] for f, s in my_rows)
    LEVER_RAISED = {"today": {k: 0 for k in ["Collection", "Coverage", "Stock", "Pricing", "Revenue"]},
                    "week": {k: month_lev.get(k, 0) for k in ["Collection", "Coverage", "Stock", "Pricing", "Revenue"]},
                    "month": {k: month_lev.get(k, 0) for k in ["Collection", "Coverage", "Stock", "Pricing", "Revenue"]}}
    avg_conf = round(sum(r["confidence"]["score"] for r in recs) / max(1, len(recs)))
    THERMO_SET_CONFIDENCE = conf(avg_conf, f"Average across the {len(recs)} open recommendations, each built from workbook sheets as on 20 Sep.",
                                 [src("thermometer", f"{len(recs)} open signals", ", ".join(f"{k} ×{v}" for k, v in sig_counts.items()))])

    # ---- insights
    rec_by = {r["signal"]: r for r in recs}
    insights = []
    rc = rec_by.get("Collection")
    if rc:
        fs = [f for f in org.by_terr[rc["territory"]] if f["overdue"] > 0]
        insights.append({"id": "ins-collection", "headline": f"{rc['territory']} carries the largest overdue: {inr(_sum(fs, 'overdue'))} across {len(fs)} retailers.",
                         "body": f"Average ageing is {sum(f['ageing'] for f in fs) / len(fs):.0f} days and {sum(1 for f in fs if f['risk'] == 'High')} accounts are rated high risk. "
                                 f"{sum(1 for f in fs if f['paid_on'] and (AS_OF - f['paid_on']).days <= 30)} of them paid something in the last 30 days, so the follow-up should target the rest.",
                         "origin": {"agent": "thermometer", "when": "20 Sep"},
                         "connects": [{"label": "Recommendation #" + str(rc["n"]), "target": rc["id"], "agent": "thermometer"}] + ([{"label": "Tracker · Collection follow-up", "target": attention_asm[0]["id"], "agent": "thermometer"}] if attention_asm else []),
                         "confidence": rc["confidence"]})
    rcv = rec_by.get("Coverage")
    if rcv:
        insights.append({"id": "ins-coverage", "headline": rcv["title"], "body": rcv["why"] + " Re-sequencing the beat around these outlets recovers coverage without extra visits.",
                         "origin": {"agent": "pitch", "when": "20 Sep"}, "connects": [{"label": "Recommendation #" + str(rcv["n"]), "target": rcv["id"], "agent": "thermometer"}],
                         "confidence": rcv["confidence"]})
    my_act, my_mtd, my_full = _sum(my, "sep"), _sum(my, "sep_mtd_t"), _sum(my, "sep_t")
    rr = rec_by.get("Revenue")
    proj = my_act * MONTH_DAYS / AS_OF.day / my_full * 100 if my_full else 0
    insights.append({"id": "ins-pacing", "headline": f"September is at {inr(my_act)} of {inr(my_full)} ({pct(my_act, my_full) or 0:.0f}%); at this run-rate it closes near {proj:.0f}% of target.",
                     "body": f"Against the phased target to the 20th it's {pct(my_act, my_mtd) or 0:.0f}%." + (f" The biggest gap is {rr['product']} in {rr['territory']} ({rr['impactLabel']})." if rr else ""),
                     "origin": {"agent": "map", "when": "20 Sep"},
                     "connects": [{"label": "Market Action Plan · September", "target": "map-panel", "agent": "map"}] + ([{"label": "Recommendation #" + str(rr["n"]), "target": rr["id"], "agent": "thermometer"}] if rr else []),
                     "confidence": conf(score_from(3), "Actuals and targets from the workbook; the projection assumes the current daily run-rate.",
                                        [src("map", "9. Target Sales Value", "Sep target"), src("thermometer", "8. Actual Sales Value", "Sep MTD to 20th"), src("thermometer", "11. Sep projections", "Required run-rate")])})
    rp = rec_by.get("Pricing")
    if rp:
        insights.append({"id": "ins-competitor", "headline": rp["title"], "body": rp["why"] + " This is a market-size estimate, not invoice prices, so it supports a scheme push rather than a price change.",
                         "origin": {"agent": "huddle", "when": "20 Sep"}, "connects": [{"label": "Recommendation #" + str(rp["n"]), "target": rp["id"], "agent": "thermometer"}],
                         "confidence": rp["confidence"]})
    INSIGHTS_SUMMARY = {
        "short": f"September is at {pct(my_act, my_mtd) or 0:.0f}% of the phased target" + (f", {rc['territory']} has the largest overdue" if rc else "") + (f" and {rcv['impactLabel']} has no recent visit." if rcv else "."),
        "text": " ".join(i["headline"] for i in insights),
        "confidence": conf(round(sum(i["confidence"]["score"] for i in insights) / max(1, len(insights))), "Synthesised from the insights below, all computed from the workbook.",
                           [src("thermometer", f"{len(recs)} open signals", "From credit, sales, logistics and visit sheets")]),
    }

    # ---- findings (Huddle sheet verbatims)
    pr = {"High": 0, "Medium": 1, "Low": 2}
    hud = sorted(huddle_items, key=lambda h: (pr.get(h.get("Urgency"), 3), -_n(h.get("# of action items"))))
    findings, finding_actions = [], {}

    def link_for(theme: str):
        t = theme.lower()
        if any(w in t for w in ("payment", "credit", "collection", "overdue")) and "ins-collection" in {i["id"] for i in insights}:
            return "ins-collection", None
        if any(w in t for w in ("competitor", "price")) and "ins-competitor" in {i["id"] for i in insights}:
            return "ins-competitor", None
        if any(w in t for w in ("stock", "supply", "deliver")) and "Stock" in rec_by:
            return rec_by["Stock"]["id"], f"Recommendation #{rec_by['Stock']['n']}"
        return "ins-pacing", None

    for i, h in enumerate(hud[:4]):
        fid = f"find-{i + 1}"
        ins, lbl = link_for(h["Theme"])
        n_act = int(_n(h.get("# of action items")))
        findings.append({"id": fid, "theme": h["Theme"], "quote": str(h.get("Convo verbatim") or "").strip('"“”'), "speaker": h.get("Owner department designation") or "Sales",
                         "speakerRole": f"{h.get('Owner department') or 'Sales'} · urgency {h.get('Urgency')}", "session": f"{h.get('Huddle')} huddle", "when": "20 Sep",
                         "at": "", "insight": ins, **({"linkLabel": lbl} if lbl else {}),
                         "confidence": conf(score_from(1, 62), "Verbatim from the Huddle sheet; not cross-checked against sales data.", [src("huddle", "Huddle sheet", f"{n_act} action items, urgency {h.get('Urgency')}")])})
        finding_actions[fid] = {"label": "Send to Tracker", "run": {"agent": "huddle", "steps": ["reading the huddle theme", "creating the actions"],
                                                                     "result": f"Added to Tracker — {n_act} action items, owner: {h.get('Owner department designation') or 'Sales'}", "link": "View in Tracker"}}

    # ---- ask answers
    worst_t = min(my_terrs, key=lambda t: pct(_sum(org.by_terr[t], "sep"), _sum(org.by_terr[t], "sep_mtd_t")) or 0)
    wt = org.by_terr[worst_t]
    ASK = [
        {"q": f"Why is {rc['territory'] if rc else my_terrs[0]} collection slipping?", "answer": (insights[0]["headline"] + " " + insights[0]["body"]) if rc else "No overdue in your territories.",
         "links": [{"label": "Insight", "target": "ins-collection", "agent": "thermometer"}] + ([{"label": f"Recommendation #{rc['n']}", "target": rc["id"], "agent": "thermometer"}] if rc else []),
         "confidence": rc["confidence"] if rc else THERMO_SET_CONFIDENCE},
        {"q": "Which territory is furthest behind September plan?",
         "answer": f"{worst_t}, at {pct(_sum(wt, 'sep'), _sum(wt, 'sep_mtd_t')) or 0:.0f}% of its phased Sep target ({inr(_sum(wt, 'sep'))} of {inr(_sum(wt, 'sep_mtd_t'))} to the 20th). {top_cat(wt)[0]} is the largest gap.",
         "links": [{"label": "Market Action Plan", "target": "map-panel", "agent": "map"}] + ([{"label": f"Recommendation #{rr['n']}", "target": rr["id"], "agent": "thermometer"}] if rr else []),
         "confidence": insights[-2]["confidence"] if len(insights) > 1 else THERMO_SET_CONFIDENCE},
        {"q": "What should go into October's plan?", "answer": "Candidates from the open recommendations: " + "; ".join(r["title"] for r in recs[:3]) + ". Nothing goes into the plan until you accept it.",
         "links": [{"label": "Thermometer", "target": "thermo-panel", "agent": "thermometer"}, {"label": "Market Action Plan", "target": "map-panel", "agent": "map"}],
         "confidence": THERMO_SET_CONFIDENCE},
    ]

    # ---- what's working (real outcomes in the workbook)
    paid_q1 = [f for f in allf if f["loy1"].get("Payout status") in ("Paid", "Processed", "Approved")]
    paid_done = [f for f in paid_q1 if f["loy1"].get("Payout status") == "Paid"]
    pay30 = [f for f in allf if f["paid_on"] and (AS_OF - f["paid_on"]).days <= 30]
    new_f = [f for f in allf if f["new"]]
    sch = [org.scheme[f["rid"]] for f in allf if f["rid"] in org.scheme]

    def best(fs):
        return region_of[Counter(f["asm"] for f in fs).most_common(1)[0][0]] if fs else "—"

    WHATS_WORKING = {
        "rows": [
            {"type": "Payments received (last 30 days)", "actioned": sum(1 for f in allf if f["outstanding"] > 0), "delivered": len(pay30), "value": f"{inr(sum(f['paid'] for f in pay30))} received", "best": best(pay30)},
            {"type": "Q1 loyalty payouts", "actioned": len(paid_q1), "delivered": len(paid_done), "value": f"{inr(sum(_n(f['loy1'].get('Reward in final slab')) for f in paid_done))} paid", "best": best(paid_done)},
            {"type": "Retailer scheme slabs (Sep)", "actioned": len(sch), "delivered": sum(1 for s in sch if str(s.get("Current slab", "")).startswith("Slab")), "value": f"{inr(sum(_n(s.get('Benefit earned till 20th Sep')) for s in sch))} benefit earned", "best": "Mehsana + Palanpur + Patan" if sch else "—"},
            {"type": "New retailers billed in Sep", "actioned": len(new_f), "delivered": sum(1 for f in new_f if f["sep"] > 0), "value": f"{inr(sum(f['sep'] for f in new_f))} Sep MTD", "best": best([f for f in new_f if f["sep"] > 0])},
        ],
        "takeaway": f"{len(pay30)} retailers paid in the last 30 days; {sum(1 for f in new_f if f['sep'] > 0)} of {len(new_f)} new retailers are already billing in September.",
        "confidence": conf(score_from(3), "Counts are measured directly in the credit, loyalty, scheme and master sheets.", [src("thermometer", "5. Retailer Credit", "Last paid on / value"), src("pitch", "14b Q1 loyalty payout", "Payout status"), src("map", "13. Retailer scheme", "Slab benefits")]),
    }

    # ---- decisions (above thresholds)
    decisions, dec_traces, pending = [], {}, {}

    def add_dec(thr, label, question, context, region, territory, asm, stake, recommendation, options, run, c, trace, pend_at, pend_label):
        n = len(decisions) + 1
        did = f"dec-{n}"
        decisions.append({"id": did, "n": n, "question": question, "context": context, "region": region, "territory": territory, "asm": asm,
                          "raised": "20 Sep · from the workbook sync", "stake": stake, "recommendation": recommendation, "thresholdId": thr,
                          "thresholdLabel": label, "options": options, "run": run, "confidence": c})
        dec_traces[did] = trace
        pending[thr] = {"decision": n, "at": pend_at, "label": pend_label}

    worst_od = max(org.asms, key=lambda a: _sum(org.by_asm[a], "overdue"))
    od_fs = sorted([f for f in org.by_asm[worst_od] if f["overdue"] > 0], key=lambda f: -f["overdue"])
    big = od_fs[:3]
    add_dec("collection", "Payout holds above ₹2L exposure come to you",
            f"Hold loyalty and scheme payouts for {len(big)} {region_of[worst_od]} retailers until they clear {inr(sum(f['overdue'] for f in big))}?",
            f"{region_of[worst_od]} has {inr(_sum(od_fs, 'overdue'))} overdue across {len(od_fs)} retailers. The top {len(big)} hold {sum(f['overdue'] for f in big) / max(1, _sum(od_fs, 'overdue')) * 100:.0f}% of it.",
            region_of[worst_od], ", ".join(sorted({f["terr"] for f in big})), worst_od, f"{inr(sum(f['overdue'] for f in big))} overdue · {big[0]['name'] if big else ''} the largest",
            f"Hold payouts for the top {len(big)} and give the rest a 15-day repayment plan.",
            [{"id": "a", "label": f"Hold the top {len(big)}", "recommended": True, "outcome": f"Payouts on hold for {len(big)} retailers; 15-day plan for the rest"},
             {"id": "b", "label": "Hold all overdue accounts", "outcome": f"Payouts on hold for {len(od_fs)} retailers"},
             {"id": "c", "label": "No hold, keep chasing", "outcome": f"No hold; {worst_od} keeps the recovery calls going"}],
            {"agent": "thermometer", "steps": ["recording your decision", "flagging payouts", f"briefing {worst_od}"], "result": f"Sent to {worst_od}'s Tracker", "link": "View in Tracker"},
            conf(score_from(2), "Overdue and ageing are from the credit sheet as on 20 Sep.", [src("thermometer", "5. Retailer Credit", f"{len(od_fs)} retailers overdue"), src("pitch", "14b Q1 loyalty payout", "Payouts due", False)]),
            {"input": {"label": "Credit sheet", "detail": f"{region_of[worst_od]} overdue {inr(_sum(od_fs, 'overdue'))}", "at": "08:00"},
             "evaluated": [{"agent": "thermometer", "verdict": f"top {len(big)} retailers hold most of the overdue", "chosen": True}, {"agent": "pitch", "verdict": "loyalty payouts are due to some of the same retailers"}],
             "why": "Holding payouts for the largest accounts covers most of the exposure. Holds above ₹2L are above your threshold.", "outcome": f"Suggested: hold payouts for the top {len(big)}", "link": "View the credit sheet"},
            round(L(sum(f["overdue"] for f in big)), 1), inr(sum(f["overdue"] for f in big)))

    over = [f for f in allf if f["util"] > 1.5]
    if over:
        oa = Counter(f["asm"] for f in over).most_common(1)[0][0]
        ov = [f for f in over if f["asm"] == oa]
        add_dec("credit", "Credit beyond the approved limit comes to you",
                f"Stop new credit orders for {len(ov)} {region_of[oa]} retailers above 150% of their credit limit?",
                f"{len(over)} retailers org-wide are above 150% utilisation; {len(ov)} of them are in {region_of[oa]}.",
                region_of[oa], ", ".join(sorted({f["terr"] for f in ov}))[:60], oa, f"{inr(sum(f['outstanding'] - f['limit'] for f in ov))} above limit",
                "Allow orders only against advance payment until utilisation is under 100%.",
                [{"id": "a", "label": "Advance payment only", "recommended": True, "outcome": "New orders need advance payment until under the limit"},
                 {"id": "b", "label": "Raise their limits", "outcome": "Credit limits raised to current outstanding"},
                 {"id": "c", "label": "No change", "outcome": "Orders continue on credit"}],
                {"agent": "map", "steps": ["recording your decision", "updating credit holds"], "result": f"Sent to {oa}'s Tracker", "link": "View in Tracker"},
                conf(score_from(1), "Utilisation is from the credit sheet.", [src("thermometer", "5. Retailer Credit", "Credit limit utilisation %")]),
                {"input": {"label": "Credit sheet", "detail": f"{len(over)} retailers above 150% utilisation", "at": "08:00"},
                 "evaluated": [{"agent": "thermometer", "verdict": f"{len(ov)} in {region_of[oa]}", "chosen": True}],
                 "why": "Selling more on credit past the limit raises exposure further; the credit threshold sends this to you.", "outcome": "Suggested: advance payment only", "link": "View the retailers"},
                45, f"{max(f['util'] for f in ov) * 100:.0f}%")

    so_unv = Counter(f["so"] for f in allf if f["visit"] is None or (AS_OF - f["visit"]).days > 30)
    if so_unv:
        so, n = so_unv.most_common(1)[0]
        sa = Counter(f["asm"] for f in allf if f["so"] == so).most_common(1)[0][0]
        add_dec("people", "Moving sales officers across ASMs always comes to you",
                f"Re-assign part of {so}'s beat? {n} of their retailers haven't been visited in 30+ days.",
                f"{so} covers {sum(1 for f in allf if f['so'] == so)} retailers across {len({f['asm'] for f in allf if f['so'] == so})} ASMs.",
                region_of[sa], ", ".join(sorted({f["terr"] for f in allf if f["so"] == so}))[:60], sa, f"{n} retailers uncovered · {inr(sum(f['sep_t'] for f in allf if f['so'] == so and (f['visit'] is None or (AS_OF - f['visit']).days > 30)))} Sep target",
                f"Move the unvisited retailers in {sa}'s area to another officer for October.",
                [{"id": "a", "label": "Re-assign for October", "recommended": True, "outcome": "Unvisited retailers move to another officer from 1 Oct"},
                 {"id": "b", "label": "Keep, add a visit target", "outcome": f"{so} gets a visit target for the uncovered retailers"},
                 {"id": "c", "label": "No change", "outcome": "Beat stays as it is"}],
                {"agent": "map", "steps": ["updating the October beat draft", f"notifying {sa}"], "result": "October beat draft updated", "link": "View plans"},
                conf(score_from(1, 55), "Visit dates are each retailer's last SO visit only.", [src("pitch", "4. Retailer_Master", "SO last visit date")]),
                {"input": {"label": "Visit dates", "detail": f"{n} retailers not visited in 30+ days", "at": "08:00"},
                 "evaluated": [{"agent": "pitch", "verdict": f"{so} has the most uncovered retailers", "chosen": True}],
                 "why": "Coverage gaps concentrate on one officer; moving people across ASMs always comes to you.", "outcome": "Suggested: re-assign for October", "link": "View both plans"},
                0, f"{n} retailers")

    if mk:
        add_dec("price", "Any change to list price comes to you",
                f"Respond to {cname.replace(' (LPM)', '')} in {org.micro_of_asm[A]} with a price cut?",
                f"Company share is {share:.0f}% of the {org.micro_of_asm[A]} market; {cname.replace(' (LPM)', '')} holds {cval / _n(mk['Market Size (LPM)']) * 100:.0f}%.",
                my_region, ", ".join(my_terrs), A, f"{_n(mk['Market Size (LPM)']):,.0f} LPM market",
                "Hold the list price and run a volume scheme instead; market size is an estimate, not invoice prices.",
                [{"id": "a", "label": "Hold price, run a scheme", "recommended": True, "outcome": "No price change; volume scheme at top outlets"},
                 {"id": "b", "label": "Cut price by 5%", "outcome": "5% off list in the micro market for October"},
                 {"id": "c", "label": "No action", "outcome": "No change"}],
                {"agent": "thermometer", "steps": ["recording your decision"], "result": f"Sent to {A}'s Tracker", "link": "View in Tracker"},
                conf(score_from(1, 50), "One market-size estimate per micro market; no invoice prices.", [src("map", "Data 11 - Market Size", "Client vs competitor LPM")]),
                {"input": {"label": "Market size", "detail": f"{org.micro_of_asm[A]} · company {share:.0f}%", "at": "08:00"},
                 "evaluated": [{"agent": "map", "verdict": f"{cname.replace(' (LPM)', '')} is the largest competitor", "chosen": True}],
                 "why": "A list-price change is above your threshold and the evidence is an estimate.", "outcome": "Suggested: hold price, run a scheme", "link": "View market size"},
                5, f"{share:.0f}% share")

    # ---- ranges
    allm = lambda kind, m: _month(allf, kind, m)
    sep_a, sep_t = _sum(allf, "sep"), _sum(allf, "sep_t")
    fy_a = sum(allm("cy", m) for m in range(6))
    fy_t = sum(allm("tgt", m) for m in range(6))
    hc = tracker_head["counts"]
    acts = {"total": tracker_head["total"], **{k: hc[k] for k in ("done", "progress", "delayed", "unassigned")}}
    RANGES = [
        {"id": "today", "label": "Today", "detail": f"{TODAY.strftime('%a')} {TODAY.day} Sep · daily average", "phrase": "per day (Sep average)"},
        {"id": "week", "label": "This week", "detail": "Sep daily average × 7", "phrase": "per week (Sep average)"},
        {"id": "month", "label": "September", "detail": "1–20 Sep", "phrase": "in September"},
        {"id": "fy", "label": "FY 2026–27", "detail": "Apr–Sep, to date", "phrase": "this financial year"},
    ]
    RANGE_DATA = {
        "today": {"achievedL": round(L(sep_a / AS_OF.day), 1), "estimateL": round(L(sep_t / MONTH_DAYS), 1), "actions": acts},
        "week": {"achievedL": round(L(sep_a / AS_OF.day * 7), 1), "estimateL": round(L(sep_t / MONTH_DAYS * 7), 1), "actions": acts},
        "month": {"achievedL": round(L(sep_a), 1), "estimateL": round(L(sep_t), 1), "actions": acts},
        "fy": {"achievedL": round(L(fy_a), 1), "estimateL": round(L(fy_t), 1), "actions": acts},
    }
    REGION_ACTIONS = {}
    for a in org.asms:
        c = counts([(f, s) for f, s in sig_rows if f["asm"] == a])
        REGION_ACTIONS[region_of[a]] = {"total": c["total"], **c["counts"]}

    # ---- activity log: dated records in the workbook
    days = [TODAY - dt.timedelta(days=i) for i in range(7)]
    ACTIVITY_DAYS = [{"key": f"{d.day} Sep", "label": f"{WD[d.weekday()]}, {d.day} September", "short": "Today" if i == 0 else "Yesterday" if i == 1 else d.strftime("%a")} for i, d in enumerate(days)]
    activity = []
    sync_routes = Counter(s["agent"] for _, s in sig_rows)
    activity.append({"id": "a-sync", "day": f"{TODAY.day} Sep", "at": "08:00", "trigger": "scheduled", "source": "thermometer", "what": "Excel workbook sync (data to 20 Sep)", "region": "All regions",
                     "chain": [{"agent": "thermometer", "did": f"raised {len(sig_rows)} signals across {len(org.asms)} ASMs"}, {"agent": "map", "did": f"re-scored {len(org.asms)} September plans"}],
                     "routes": [{"to": "Tracker", "n": sync_routes.get("thermometer", 0) + sync_routes.get("pitch", 0)}, {"to": "Market Action Plan", "n": sync_routes.get("map", 0)}], **({"decision": 1} if decisions else {})})
    activity.append({"id": "a-huddle", "day": f"{TODAY.day} Sep", "at": "09:10", "trigger": "scheduled", "source": "huddle", "what": "Huddle themes", "region": "All regions",
                     "chain": [{"agent": "huddle", "did": f"decoded {len(huddle_items)} themes, {huddle_actions} action items"}],
                     "routes": [{"to": "Tracker", "n": huddle_actions}]})
    for d in days[1:]:
        for a in org.asms:
            fs = org.by_asm[a]
            vis = [f for f in fs if f["visit"] == d]
            ords = [f for f in fs if f["order_date"] == d]
            pays = [f for f in fs if f["paid_on"] == d]
            if vis:
                t0 = min((f["vtime"] or "11:00") for f in vis)[:5]
                activity.append({"id": f"v-{d.day}-{a}", "day": f"{d.day} Sep", "at": t0, "trigger": "scheduled", "source": "pitch", "what": "Visit logs", "region": region_of[a],
                                 "territory": Counter(f["terr"] for f in vis).most_common(1)[0][0],
                                 "chain": [{"agent": "pitch", "did": f"logged {len(vis)} SO visits"}, {"agent": "thermometer", "did": f"checked {sum(1 for f in vis if f['overdue'] > 0)} against overdue signals"}],
                                 "routes": [{"to": "Tracker", "n": sum(1 for f in vis if f["overdue"] > 0)}]})
            if ords:
                activity.append({"id": f"o-{d.day}-{a}", "day": f"{d.day} Sep", "at": "12:00", "trigger": "event", "source": "thermometer", "what": "Distributor orders", "region": region_of[a],
                                 "territory": Counter(f["terr"] for f in ords).most_common(1)[0][0],
                                 "chain": [{"agent": "thermometer", "did": f"{len(ords)} orders, {sum(1 for f in ords if f['short_sku'])} short-supplied"}],
                                 "routes": [{"to": "Tracker", "n": sum(1 for f in ords if f["short_sku"])}]})
            if pays:
                activity.append({"id": f"p-{d.day}-{a}", "day": f"{d.day} Sep", "at": "16:00", "trigger": "event", "source": "thermometer", "what": "Payments received", "region": region_of[a],
                                 "chain": [{"agent": "thermometer", "did": f"{len(pays)} payments, {inr(sum(f['paid'] for f in pays))}"}], "routes": []})
    activity.sort(key=lambda e: (days.index(next(d for d in days if f"{d.day} Sep" == e["day"])), e["at"]))
    today_act = [e for e in activity if e["day"] == f"{TODAY.day} Sep"]

    # ---- tiers (open actions ranked)
    tier_of = lambda f, s: 1 if (s["pri"] >= 3 or (s["kind"] == "collection" and f["ageing"] > 90)) else 2 if s["pri"] == 2 else 3 if s["kind"] in ("coverage", "short") else 4 if s["kind"] == "gap" else 5 if s["kind"] in ("credit",) else 6
    TIER_ITEMS: dict[str, list] = {str(t): [] for t in range(1, 7)}
    for i, (f, s) in enumerate(sorted(sig_rows, key=lambda x: -x[1]["value"])):
        t = tier_of(f, s)
        TIER_ITEMS[str(t)].append({"id": f"p{t}-{i}", "title": f"{s['title']} · {f['name']}", "territory": f["terr"], "region": region_of[f["asm"]],
                                   "owner": f["so"], "source": s["agent"], "status": status_of(s), "impact": inr(s["value"]) if s["value"] else "—",
                                   "due": "Overdue" if s["delayed"] else f"Due {MONTH_DAYS} Sep"})
    for k in TIER_ITEMS:
        TIER_ITEMS[k] = TIER_ITEMS[k][:20]

    # ---- roll-up, impact
    kinds = Counter(s["kind"] for _, s in sig_rows)
    THEME_NAME = {"collection": "Collection recovery", "credit": "Credit limit control", "gap": "Sep target gap closure", "short": "Short-supply resolution", "coverage": "Retailer coverage", "loyalty": "Loyalty slab push"}
    grp = {(f["terr"], s["kind"]) for f, s in sig_rows}
    ROLLUP = {"month": "September", "actions": len(sig_rows), "duplicatesMerged": len(sig_rows) - len({f["rid"] for f, _ in sig_rows}), "initiatives": len(grp),
              "accepted": len(grp), "rejected": 0, "rejectedWhy": "No accept/reject history in the workbook", "completed": 0, "wip": len(grp),
              "plannedL": round(L(sum(s["value"] for _, s in sig_rows)), 1), "achievedL": 0.0}
    ROLLUP_THEMES = [{"theme": THEME_NAME[k], "initiatives": len({g for g in grp if g[1] == k}), "accepted": len({g for g in grp if g[1] == k}), "completed": 0,
                      "plannedL": round(L(sum(s["value"] for _, s in sig_rows if s["kind"] == k)), 1), "achievedL": 0.0, "note": f"{n} retailer signals"}
                     for k, n in kinds.most_common()]
    l2s = [f["loy2"] for f in allf if f["loy2"]]
    aug_t, aug_a = allm("tgt", 4), allm("cy", 4)
    od_all = _sum(allf, "overdue")
    IMPACT_ROWS = [
        {"action": "Sep target (phased to the 20th)", "count": sum(1 for _ in allf), "desired": inr(_sum(allf, "sep_mtd_t")), "achieved": inr(sep_a),
         "score": round(pct(sep_a, _sum(allf, "sep_mtd_t")) or 0), "lastMonth": round(pct(aug_a, aug_t) or 0), "change": "Aug is the full month"},
        {"action": "Q2 loyalty packs", "count": len(l2s), "desired": f"{int(sum(_n(x.get('Q2 packs target (qty)')) for x in l2s)):,} packs", "achieved": f"{int(sum(_n(x.get('Q2 MTD packs sold actual (qty)')) for x in l2s)):,}",
         "score": round(pct(sum(_n(x.get("Q2 MTD packs sold actual (qty)")) for x in l2s), sum(_n(x.get("Q2 packs target (qty)")) for x in l2s)) or 0), "lastMonth": 0, "change": "No previous-quarter target"},
        {"action": "Collections (paid in last 30 days vs overdue)", "count": len(pay30), "desired": inr(od_all), "achieved": inr(sum(f["paid"] for f in pay30)),
         "score": round(min(100, pct(sum(f["paid"] for f in pay30), od_all) or 0)), "lastMonth": 0, "change": "No collection history"},
        {"action": "New retailers billing", "count": len(new_f), "desired": f"{len(new_f)} retailers", "achieved": str(sum(1 for f in new_f if f["sep"] > 0)),
         "score": round(pct(sum(1 for f in new_f if f["sep"] > 0), len(new_f)) or 0), "lastMonth": 0, "change": "—"},
    ]
    IMPACT_CONFIDENCE = conf(score_from(3), "Measured directly from the workbook's actuals, loyalty and credit sheets.", [src("thermometer", "8. Actual Sales Value", "Sep MTD"), src("pitch", "14c Q2 loyalty", "Packs sold"), src("thermometer", "5. Retailer Credit", "Payments")])

    # ---- lead insights, plan reviews, scorecard
    ach_r = {a: pct(_sum(org.by_asm[a], "sep"), _sum(org.by_asm[a], "sep_mtd_t")) or 0 for a in org.asms}
    lo_a, hi_a = min(ach_r, key=ach_r.get), max(ach_r, key=ach_r.get)
    od_r = {a: _sum(org.by_asm[a], "overdue") for a in org.asms}
    top_od = max(od_r, key=od_r.get)
    LEAD_INSIGHTS = [
        {"id": "li-1", "headline": f"{region_of[lo_a]} is at {ach_r[lo_a]:.0f}% of its phased Sep target while {region_of[hi_a]} is at {ach_r[hi_a]:.0f}%.",
         "region": f"{region_of[lo_a]} · {region_of[hi_a]}", "asms": [lo_a, hi_a], "from": "Thermometer, across regions", "agent": "thermometer", "when": "08:00",
         "confidence": conf(score_from(2), "Both from workbook actuals and targets.", [src("thermometer", "8. Actual Sales Value", "Sep MTD"), src("map", "9. Target Sales Value", "Sep target")])},
        {"id": "li-2", "headline": f"{region_of[top_od]} holds {od_r[top_od] / max(1, sum(od_r.values())) * 100:.0f}% of all overdue ({inr(od_r[top_od])}).",
         "region": region_of[top_od], "asms": [top_od], "from": "Credit sheet", "agent": "thermometer", "when": "08:00",
         "confidence": conf(score_from(1), "Overdue from the credit sheet.", [src("thermometer", "5. Retailer Credit", "Overdue by retailer")])},
    ]
    if huddle_items:
        hh = hud[0]
        LEAD_INSIGHTS.append({"id": "li-3", "headline": f"Huddle: {hh['Theme']}", "region": "All regions", "asms": org.asms[:2], "from": "Huddle themes", "agent": "huddle", "when": "09:10",
                              "confidence": conf(score_from(1, 55), "A single huddle theme; not cross-checked.", [src("huddle", "Huddle sheet", f"Urgency {hh.get('Urgency')}")])})
    LEAD_SUMMARY = " ".join(li["headline"] for li in LEAD_INSIGHTS)

    PLAN_REVIEWS, SCORECARD = [], []
    for a in org.asms:
        fs = org.by_asm[a]
        rows = [(f, s) for f, s in sig_rows if f["asm"] == a]
        g2: dict[tuple, list] = defaultdict(list)
        for f, s in rows:
            g2[(f["terr"], s["kind"])].append((f, s))
        inits = [{"title": THEME_NAME[k], "territory": t, "detail": f"{len(v)} retailers", "valueL": round(L(sum(s["value"] for _, s in v)), 1),
                  "status": "delayed" if sum(1 for _, s in v if s["delayed"]) > len(v) / 2 else "progress"}
                 for (t, k), v in sorted(g2.items(), key=lambda kv: -sum(s["value"] for _, s in kv[1]))[:4]]
        PLAN_REVIEWS.append({"region": region_of[a], "asm": a, "estimateL": L(_sum(fs, "sep_t")), "achievedL": L(_sum(fs, "sep")), "initiatives": inits, "tickets": []})
        r_ = ach_r[a]
        rag = "green" if r_ >= 90 else "amber" if r_ >= 70 else "red"
        top = Counter(s["kind"] for _, s in rows).most_common(1)
        vis7 = sum(1 for f in fs if f["visit"] and (AS_OF - f["visit"]).days <= 7)
        SCORECARD.append({"region": region_of[a], "asm": a, "rag": rag, "open": len(rows), "actioned48": round(vis7 / max(1, len(fs)) * 100),
                          "resolved": sum(1 for f in fs if f["ach"] is not None and f["ach"] >= 1), "top": f"{THEME_NAME[top[0][0]]} · {top[0][1]} retailers" if top else "—"})
    PLAN_REVIEWS.sort(key=lambda p: p["asm"] != A)
    SCORECARD.sort(key=lambda s: s["asm"] != A)

    # ---- weakest by month
    def weakest(groups_: dict[str, list]):
        out = []
        for m in range(6):
            best_ = None
            for name, fs in groups_.items():
                t = _month(fs, "tgt", m) * (AS_OF.day / MONTH_DAYS if m == 5 else 1)
                p_ = pct(_month(fs, "cy", m), t)
                if p_ is not None and (best_ is None or p_ < best_[1]):
                    best_ = (name, p_)
            out.append({"month": FY[m], "name": best_[0] if best_ else "—", "why": f"Revenue {best_[1]:.0f}% of target" if best_ else ""})
        return out

    WEAKEST = {"asm": weakest({t: org.by_terr[t] for t in my_terrs}), "head": weakest({region_of[a]: org.by_asm[a] for a in org.asms})}
    ORG_WEAKEST = weakest(dict(org.by_terr))

    # ---- suggested / insight actions, traces
    suggested = []
    for i, (f, s) in enumerate(sorted(my_rows, key=lambda x: -x[1]["value"])[:4]):
        suggested.append({"id": f"sug-{i + 1}", "title": f"{s['title']} · {f['name']}", "territory": f["terr"], "source": s["agent"],
                          "retailerId": f["rid"], "kind": s["kind"], "suggestedOwner": f["so"], "suggestedOwnerId": f["so_id"],
                          "why": f"From the workbook: {s['signal'].lower()} signal for {f['name']}", "confidence": recs[0]["confidence"] if recs else THERMO_SET_CONFIDENCE,
                          "run": {"agent": s["agent"], "steps": ["reading the signal", "creating the action"], "result": f"Added to your Tracker — {f['so']} suggested as owner", "link": "View in Tracker"}})
    INSIGHT_ACTIONS = {}
    for ins in insights:
        INSIGHT_ACTIONS[ins["id"]] = {"label": "Push to Pitch engine" if ins["id"] != "ins-pacing" else "Push to Market Action Plan",
                                      "run": {"agent": "pitch" if ins["id"] != "ins-pacing" else "map", "steps": ["reading the insight", "updating priorities"],
                                              "result": f"Updated the plan for {ins['headline'].split(':')[0][:40]}", "link": "View"}}
    REC_SUGGESTED = {r["id"]: {"Collection": "tracker", "Coverage": "pitch", "Revenue": "map", "Stock": "tracker", "Pricing": "pitch"}[r["signal"]] for r in recs}
    REC_SUGGESTED.update({"tr-prod": "pitch", "tr-degrow": "tracker", "tr-dealers": "tracker", "tr-nontrade": "map", "tr-bp": "pitch"})
    ACTION_TRACES = {}
    for r in recs:
        route = REC_SUGGESTED[r["id"]]
        ACTION_TRACES[r["id"]] = {"input": {"label": r["confidence"]["sources"][0]["title"], "detail": f"{r['territory']} · {r['impactLabel']}", "at": "08:00"},
                                  "evaluated": [{"agent": "thermometer", "verdict": r["why"], "chosen": route == "tracker"}, {"agent": "map", "verdict": "fits the current month's plan" if route == "map" else "no plan change needed", "chosen": route == "map"},
                                                {"agent": "pitch", "verdict": f"{r['pitchFor']}", "chosen": route == "pitch"}],
                                  "why": f"Routed to {ROUTE_LABEL[route]} because it's a {r['signal'].lower()} signal.", "outcome": f"{ROUTE_LABEL[route]} — {r['territory']}", "link": "View"}
    for ins in insights:
        ACTION_TRACES[ins["id"]] = {"input": {"label": ins["confidence"]["sources"][0]["title"], "detail": ins["headline"][:80], "at": "08:00"},
                                    "evaluated": [{"agent": ins["origin"]["agent"], "verdict": ins["body"][:120], "chosen": True}], "why": "Computed from the workbook on the 20 Sep sync.",
                                    "outcome": INSIGHT_ACTIONS[ins["id"]]["run"]["result"], "link": "View"}
    for fd in findings:
        ACTION_TRACES[fd["id"]] = {"input": {"label": fd["session"], "detail": fd["theme"][:80], "at": "09:10"},
                                   "evaluated": [{"agent": "huddle", "verdict": f"decoded {fd['confidence']['sources'][0]['detail']}", "chosen": True}],
                                   "why": "Huddle action items need an owner and a date, so they go to Tracker.", "outcome": finding_actions[fd["id"]]["run"]["result"], "link": "View in Tracker"}

    # ---- viewer, labels
    head_terrs = sum(len(v) for v in org.terr_by_asm.values())
    VIEWER = {
        "asm": {"name": A, "initials": initials(A), "role": "Area Sales Manager", "scope": f"{my_region}, {org.state} · {len(my_terrs)} territories", "greeting": f"Good morning, {first(A)}"},
        "head": {"name": org.rsm, "initials": initials(org.rsm), "role": "Sales Head · read-only", "scope": f"{org.state} · {len(org.asms)} ASMs · {head_terrs} territories", "greeting": f"Good morning, {first(org.rsm)}"},
        "exec": {"name": exec_so, "initials": initials(exec_so), "role": "Sales Officer", "scope": f"{Counter(f['terr'] for f in my if f['so'] == exec_so).most_common(1)[0][0]} territory · {so_counts[exec_so]} outlets", "greeting": f"Good morning, {first(exec_so)}"},
    }
    vis_week = sum(1 for f in my if f["visit"] and (AS_OF - f["visit"]).days < 7)
    AGENT_STATS = {"huddle": f"{len(huddle_items)} huddle themes", "thermometer": f"{len(recs)} recommendations open", "map": "October plan not created", "pitch": f"{vis_week} visits logged this week"}

    ytd_e = sum(_month(my, "tgt", m) for m in range(6))
    ytd_a = sum(_month(my, "cy", m) for m in range(6))

    # ---- thermometer partners
    cps = thermo_partners(org, region_of)
    cat_split = {}
    for p in org.products:
        cat_split.setdefault(p["category"], []).append(p)
    sku_sales = Counter()
    act_rows = {r["retailer_id"]: r for r in wb.sheets[ACT_V].rows}
    for r in act_rows.values():
        for sku in org.sku_cat:
            sku_sales[sku] += sum(_n(r.get(f"{c} / {sku}")) for c in ACT_COL.values())
    CATEGORY_PACKS = {}
    for cat, ps in cat_split.items():
        tot = sum(sku_sales[p["sku_id"]] for p in ps) or 1
        CATEGORY_PACKS[CAT_IDS[cat]] = {"packs": [p["pack"] for p in ps], "split": [round(sku_sales[p["sku_id"]] / tot, 4) for p in ps]}

    tiers = [r for r in org.loy_tiers if r.get("Tier")]
    SCHEME_REWARDS = [f"{t['Tier']} · trip to {t.get('Trip to')}" for t in tiers]
    LEVERS = thermo_levers(org, cps, tiers)
    BDES = thermo_bdes(org)

    plan = web_plan.build(wb, org, {"A": A, "sig_rows": sig_rows, "recs": recs, "rec_route": REC_SUGGESTED})

    return {
        "map": plan["map"], "pitch": plan["pitch"], "tracker": plan["tracker"],
        "cortexHome": {
            "AGENT_STATS": AGENT_STATS, "VIEWER": VIEWER,
            "TODAY_LABEL": f"{WD[TODAY.weekday()]}, {TODAY.day} September {TODAY.year}", "SYNC_LABEL": "Excel data as of 20 Sep 2026",
            "TERRITORIES": my_terrs, "DAYS_LEFT": days_left, "DATA_DAY": AS_OF.day,
            "INSIGHTS_SUMMARY": INSIGHTS_SUMMARY, "INSIGHTS": insights, "WEEK_DAYS": WEEK_DAYS, "TRACKER": TRACKER,
            "SIGNAL_COUNTS": SIGNAL_COUNTS, "RECOMMENDATIONS": recs,
            "HEAD_REC_STATUS": {r["id"]: {"owner": A, "state": "Awaiting decision"} for r in recs},
            "PLAN_MONTHS": plan_my, "FISCAL_YEAR": {"label": "FY 2026–27", "span": "1 Apr 2026 – 31 Mar 2027", "toDate": "Apr – Sep 2026, to 20 Sep"},
            "PLAN_META": {"owner": A, "scope": f"One plan · all {len(my_terrs)} territories", "refresh": "Refreshed monthly on prior month-end data", "ytdEstimateL": round(L(ytd_e), 1), "ytdAchievedL": round(L(ytd_a), 1)},
            "FINDINGS": findings, "ASK_ANSWERS": ASK, "WHATS_WORKING": WHATS_WORKING, "HEAD_PLAN_MONTHS": plan_head,
            "TRACKER_TREND": {"asm": trend(tracker_asm["total"]), "head": trend(tracker_head["total"])},
            "TERRITORY_HEALTH": {"asm": {"rowLabel": "Territory", "columns": cols, "rows": terr_rows.get(my_region, [])},
                                 "head": {"rowLabel": "Region", "columns": cols, "rows": org_rows}},
            "THERMO_SET_CONFIDENCE": THERMO_SET_CONFIDENCE, "HEAD_REC_ROUTES": {r["id"]: [] for r in recs},
            "OFFICERS": officers, "ACTION_ITEMS": action_items, "TEAM_TRACKER": TEAM_TRACKER,
            "HEAD_PENDING": {r["id"]: "Above ₹2L exposure needs your approval" for r in recs if r["impactL"] >= 2},
            "TRACKER_MONTH": {"labels": ["1 Sep", "8 Sep", "15 Sep", "20 Sep"], "done": [0, 0, 0, 0], "progress": [0, 0, 0, tracker_asm["counts"]["progress"]], "delayed": [0, 0, 0, tracker_asm["counts"]["delayed"]]},
            "LEVER_RAISED": LEVER_RAISED, "SUGGESTED_ACTIONS": suggested, "INSIGHT_ACTIONS": INSIGHT_ACTIONS,
            "ACTION_MONTHS": {"asm": action_months(my), "head": action_months(allf)}, "WEAKEST_BY_MONTH": WEAKEST,
            "PLAN_RUN": {"agent": "map", "steps": ["reading September to the 20th", "weighing open recommendations", "drafting initiatives"], "result": f"October draft ready — {min(3, len(recs))} initiatives across {len(my_terrs)} territories", "link": "View draft"},
            "FINDING_ACTIONS": finding_actions,
        },
        "leadership": {
            "REGIONS": regions, "ORG_HEALTH": {"rowLabel": "Region", "columns": cols, "rows": org_rows}, "ORG_TERRITORY_ROWS": terr_rows,
            "ORG_WEAKEST_BY_MONTH": ORG_WEAKEST, "DECISIONS": decisions, "DECISION_TRACES": dec_traces, "RANGES": RANGES, "RANGE_DATA": RANGE_DATA,
            "REGION_ACTIONS": REGION_ACTIONS, "ACTIVITY_DAYS": ACTIVITY_DAYS, "ACTIVITY": activity, "TODAY_ACTIVITY": today_act, "LIVE_QUEUE": [],
            "LIVE_ENTRY_ID": today_act[-1]["id"], "ROLLUP": ROLLUP, "ROLLUP_THEMES": ROLLUP_THEMES, "TIER_ITEMS": TIER_ITEMS,
            "IMPACT_ROWS": IMPACT_ROWS, "IMPACT_CONFIDENCE": IMPACT_CONFIDENCE, "LEAD_INSIGHTS_SUMMARY": LEAD_SUMMARY, "LEAD_INSIGHTS": LEAD_INSIGHTS,
            "PLAN_REVIEWS": PLAN_REVIEWS, "SCORECARD": SCORECARD, "THRESHOLD_PENDING": pending,
            "CONFIG_WHO": org.rsm,
            **plan["story"],
        },
        "thermometer": {
            "AS_OF": {"day": AS_OF.day, "days": MONTH_DAYS, "label": "20 Sep 2026"}, "SYNC_NOTE": "From the Excel workbook · data to 20 Sep 2026",
            "CATEGORY_PACKS": CATEGORY_PACKS, "CPS": cps, "BDES": BDES, "LEADS": [], "LEVERS": LEVERS, "SCHEME_REWARDS": SCHEME_REWARDS,
            "ASM_NAME": A,
        },
        "actionTraces": {"REC_SUGGESTED": REC_SUGGESTED, "ACTION_TRACES": ACTION_TRACES},
        "data_gaps": DATA_GAPS + web_plan.PLAN_GAPS,
    }


ROUTE_LABEL = {"tracker": "Tracker", "map": "the Market Action Plan", "pitch": "the Pitch engine"}


# ---------------------------------------------------------------- thermometer partners, levers, BDEs

def thermo_partners(org: _Org, region_of: dict[str, str]) -> list[dict[str, Any]]:
    out = []
    seen: Counter = Counter()
    dist_acc: dict[str, dict] = {}
    for f in org.facts:
        seen[f["rid"]] += 1
        code = f["rid"] if seen[f["rid"]] == 1 else f"{f['rid']}-{seen[f['rid']]}"
        cy = [[round(L(v), 5) for v in f["cy"][c]] for c in CAT_ORDER]
        tg = [[round(L(v), 5) for v in f["tgt"][c]] for c in CAT_ORDER]
        avg = sum(sum(row[:5]) for row in cy) / 5
        out.append({"code": code, "name": f["name"], "type": "dealer" if f["type"] == "Cement-Steel Dealer" else "retailer",
                    "region": region_of[f["asm"]], "asm": f["asm"], "territory": f["terr"],
                    "appt": f["onboarded"].isoformat() if f["onboarded"] else "2020-01-01", "isNew": f["new"], "operating": True,
                    "lyAvg": round(avg, 5), "cy": cy, "tgt": tg})
        d = dist_acc.setdefault(f["dist_id"], {"name": f["dist"], "asm": Counter(), "terr": Counter(), "cy": [[0.0] * 12 for _ in CAT_ORDER], "tg": [[0.0] * 12 for _ in CAT_ORDER], "n": 0})
        d["asm"][f["asm"]] += 1
        d["terr"][f["terr"]] += 1
        d["n"] += 1
        for ci in range(4):
            for m in range(12):
                d["cy"][ci][m] += cy[ci][m]
                d["tg"][ci][m] += tg[ci][m]
    for did, d in dist_acc.items():
        a = d["asm"].most_common(1)[0][0]
        avg = sum(sum(row[:5]) for row in d["cy"]) / 5
        out.append({"code": f"D{did}", "name": d["name"], "type": "distributor", "region": region_of[a], "asm": a, "territory": d["terr"].most_common(1)[0][0],
                    "appt": "2020-01-01", "isNew": False, "operating": True, "lyAvg": round(avg, 5),
                    "cy": [[round(v, 5) for v in row] for row in d["cy"]], "tgt": [[round(v, 5) for v in row] for row in d["tg"]], "linkedRetailers": d["n"]})
    return out


def thermo_levers(org: _Org, cps: list[dict], tiers: list[dict]) -> dict[str, Any]:
    out = {}
    infl = {r["pos"][4:]: r for r in org.influencer}
    for t, fs in org.by_terr.items():
        sos = {f["so"] for f in fs}
        sep_vis = [f for f in fs if f["visit"] and f["visit"].month == 9]
        v30 = [f for f in fs if f["visit"] and (AS_OF - f["visit"]).days <= 30]
        ordered = [f for f in fs if f["order_id"]]
        sec = sum(f["sep"] for f in fs)
        inf = infl.get(t) or next((v for k, v in infl.items() if k.split()[0] in t or t.split()[0] in k), None)
        nums = inf["nums"] if inf else []
        v30_ids = {f["rid"] for f in v30}

        def kpi(i: int, name: str):
            return {"kpi": name, "target": int(nums[i * 3]) if len(nums) > i * 3 + 1 else 0, "ach": int(nums[i * 3 + 1]) if len(nums) > i * 3 + 1 else 0}

        def by_type(label, pred):
            g = [f for f in fs if pred(f)]
            return {"type": label, "target": len(g), "met": sum(1 for f in g if f["rid"] in v30_ids), "metOnce": sum(1 for f in g if f["visit"])}

        scheme = []
        for tier in tiers:
            name = tier["Tier"]
            aiming = [f for f in fs if f["loy2"].get("Next eligible slab") == name]
            inside = [f for f in fs if f["loy2"].get("Current slab") == name]
            scheme.append({"reward": f"{name} · trip to {tier.get('Trip to')}", "customers": len(aiming) + len(inside), "achieved": len(inside),
                           "salesTgt": round(L(sum(f["sep_t"] for f in aiming + inside)), 4), "salesAch": round(L(sum(f["sep"] for f in aiming + inside)), 4)})
        out[t] = {
            "territory": t,
            "appSlabs": [{"label": l, "days": d, "target": 0, "met": 0, "billedOnce": 0} for l, d in [("> ₹5 L / month", 20), ("₹3–5 L / month", 12), ("₹1.5–3 L / month", 8), ("< ₹1.5 L / month", 6)]],
            "secondary": round(L(sec), 4),
            "execs": [{"role": "Sales Officer", "count": len(sos), "above6": 0}, {"role": "Territory Sales Exec", "count": 0, "above6": 0}],
            "visitsPerDay": round(len(sep_vis) / max(1, AS_OF.day) / max(1, len(sos)), 2),
            "cpNorm": [by_type("Distributor", lambda f: False), by_type("Dealer", lambda f: f["type"] == "Cement-Steel Dealer"), by_type("Retailer", lambda f: f["type"] != "Cement-Steel Dealer")],
            "cpsVisited": len(sep_vis), "cpsOrdered": len(ordered), "invoiced": round(L(sum(f["sep"] for f in ordered)), 4), "totalSecondary": round(L(sec), 4),
            "productiveVisits": sum(1 for f in sep_vis if f["sep"] > 0), "totalVisits": len(sep_vis),
            "appl": [kpi(0, "General contractor onboarding"), kpi(1, "General contractor activation"), kpi(2, "New tile contractor activation"), kpi(3, "Tile contractor retention")],
            "hc": [{"division": "Trade", "total": len(sos), "onGround": len(sos), "offered": 0, "pipeline": 0},
                   {"division": "Non-Trade", "total": 1 if inf and inf["exists"] else 0, "onGround": 1 if inf and inf["exists"] else 0, "offered": 0, "pipeline": 0}],
            "training": [{"role": r, "hc": 0, "basicTgt": 0, "basicDone": 0, "interTgt": None if r in ("Sales Officer", "Territory Sales Exec") else 0, "interDone": None if r in ("Sales Officer", "Territory Sales Exec") else 0}
                         for r in ["ASM", "Sales Officer", "Territory Sales Exec", "BDE", "BDE – Applicator"]],
            "degrowTgt": {"dealer": [0, 0], "retailer": [0, 0]},
            "scheme": scheme,
        }
    return out


def thermo_bdes(org: _Org) -> list[dict[str, Any]]:
    out = []
    n = 400
    for r in org.influencer:
        t = r["pos"][4:]
        terr = t if t in org.by_terr else next((x for x in org.by_terr if x.split()[0] in t), t)
        nums = r["nums"]
        n += 1
        # onboarding TGT / ACH as the lead target / achieved; activation ACH as converted
        out.append({"code": f"BDE-{n}", "role": "BDE", "name": r["pos"], "territory": terr, "monthlyTarget": 0, "months": [0] * 12,
                    "leadTgt": int(nums[0]) if len(nums) > 1 else 0, "leadAch": int(nums[1]) if len(nums) > 1 else 0, "oppValue": 0,
                    "converted": int(nums[4]) if len(nums) > 4 else 0})
    return out
