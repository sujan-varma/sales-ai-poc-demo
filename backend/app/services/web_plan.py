"""Market Action Plan, Pitch and Action Tracker data for the web app (the `map`, `pitch` and `tracker` modules of
GET /api/web/bootstrap), built from the Excel workbook for one ASM, plus the Head of Sales orchestration story.

  Plan initiatives  one per workbook signal worth a plan row, each with Estimated / Agreed / Delivered in its unit:
                    distributor revival   'MAP_Distributor Assessment' Jun→Aug de-growth; delivered = Sep MTD
                                          secondary of its retailers above Aug MTD (both to the 20th)
                    retail reach          distributors under 70% of their retailer universe mapped; delivered =
                                          new retailers billing in September
                    range selling         each territory's largest category gap; est/agreed = Sep target,
                                          delivered = Sep MTD actual
                    dealer revival        retailers that billed in Q1 but nothing in Jul–Aug; delivered = their
                                          Sep MTD sales
                    influencer engagement 'Data 12' monthly activation per BDE territory
  Market            'Data 11 - Market Size' shares; ₹ size = company run-rate ÷ company share; territories split
                    the region's market by their distributors' retailer universe
  Pitch             one pitch per outlet the plan reaches; talking points from the outlet's own workbook rows
                    (tenure, credit, Sep projections, loyalty pitch statements, logistics, product push)
  Tracker           ASM-level signal groups (Needs an owner), the officers' retailer actions (Team), and — added
                    per request in `overlay()` — what was assigned, started, completed and verified (tracker.json)

The workbook has no plan versions, ASM targets, visit notes or ticket history: Agreed equals Estimated, versions
are v1, and comments/feedback come only from what people enter in the apps (see PLAN_GAPS).
"""

from __future__ import annotations

import copy
import datetime as dt
import math
import re
from collections import Counter, defaultdict
from typing import Any, Optional

from app.services import tracker as tracker_store
from app.services.excel_data import Workbook

DIST_SHEET = "MAP_Distributor Assessment"
PROJ = "11. Sep projections on qty"
ACT_Q = "6. Actual Sales qty"

AS_OF = dt.date(2026, 9, 20)
TODAY = dt.date(2026, 9, 21)
MONTH_DAYS = 30
CAT_ORDER = ["IWC", "Repair Polymer", "Acrylic Primer", "Waterproofing Compound"]
MARKET_CAT = {"IWC": "IWC", "Repair Polymer": "REP", "Acrylic Primer": "ACR", "Waterproofing Compound": "WAT"}
DIST_CAT = {"IWC sales %": "IWC", "REP sales %": "Repair Polymer", "ACR sales %": "Acrylic Primer", "WAT sales%": "Waterproofing Compound"}
OUTLET_TYPE = {"Cement-Steel Dealer": "Dealer"}  # everything else is a retail counter
KIND_CLASS = {"collection": "Collection", "credit": "Collection", "gap": "Range", "short": "Channel", "coverage": "Coverage", "loyalty": "Channel"}
KIND_LABEL = {"collection": "Collection follow-up", "credit": "Credit limit review", "gap": "Sep target gap", "short": "Short-supply follow-up",
              "coverage": "Retailer coverage", "loyalty": "Loyalty slab push"}
APP_KIND = {"collection": "collection", "credit": "credit_limit", "gap": "target_gap", "short": "short_supply", "loyalty": "loyalty"}
WEB_KIND = {v: k for k, v in APP_KIND.items()}
REACH_TARGET = 0.7


def _conf(n_sheets: int) -> int:
    """Talking-point confidence, the same rule as web_data.score_from: 58 plus 9 per workbook sheet behind it, at most 92."""
    return min(92, 58 + 9 * n_sheets)

PLAN_GAPS = [
    {"area": "Plan versions, locks and ASM targets",
     "detail": "No plan records. The September plan is built from workbook signals as v1; Agreed equals the AI Estimated figure because there are no ASM targets."},
    {"area": "Market size in ₹",
     "detail": "'Data 11' gives shares in LPM, not rupees. The ₹ market is the company's Apr–Aug run-rate divided by its share; territories split their region's market by their distributors' retailer universe."},
    {"area": "Visit notes, pitch coverage, SFA timestamps",
     "detail": "Only each retailer's last SO visit (date and time) exists. A pitch counts as visited when that visit is on or after 1 Sep; there is no per-talking-point coverage or visit note."},
    {"area": "Ticket history, comments, SLA",
     "detail": "Tickets come from workbook signals; their history starts at the 20 Sep data date. Assignments, updates, completions and verifications made in the apps are stored by the backend and show here."},
]


def _n(v: Any) -> float:
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) and v == v else 0.0


def L(v: float) -> float:
    return round(v / 1e5, 1)


def inr(v: float) -> str:
    if abs(v) >= 1e7:
        return f"₹{v / 1e7:.2f} Cr"
    if abs(v) >= 1e5:
        return f"₹{v / 1e5:.1f} L"
    return f"₹{round(v):,}"


def _dm(d: Optional[dt.date], t: Optional[str] = None) -> str:
    if not d:
        return "—"
    return f"{d.day} {d.strftime('%b')}" + (f", {t[:5]}" if t else "")


def _clean_dist(name: str) -> str:
    return re.sub(r"\s*-\s*BSD$", "", str(name)).strip()


def _key(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", _clean_dist(name).replace("(New)", "").lower())


def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def _priority(pct_done: Optional[float], big: bool) -> str:
    if pct_done is not None and pct_done >= 90:
        return "Low"
    if big and (pct_done is None or pct_done < 70):
        return "High"
    return "Medium"


# ---------------------------------------------------------------- build (cached per workbook load + ASM)

def build(wb: Workbook, org: Any, ctx: dict[str, Any]) -> dict[str, Any]:
    A: str = ctx["A"]
    region: str = org.region_of_asm[A]
    terrs = [t for t in org.terr_by_asm[A] if org.by_terr.get(t)]
    my = org.by_asm[A]
    micro = org.micro_of_asm[A]
    by_rid = {f["rid"]: f for f in org.facts}
    proj = {r["retailer_id"]: r for r in reversed(wb.sheets[PROJ].rows)}
    qty = {r["retailer_id"]: r for r in reversed(wb.sheets[ACT_Q].rows)}
    skus = [(p["sku_id"], p["sku_name"], p.get("pack"), p["category"]) for p in org.products]

    # ---- people
    so_n = Counter(f["so"] for f in my)
    so_terr: dict[str, Counter] = defaultdict(Counter)
    for f in my:
        so_terr[f["so"]][f["terr"]] += 1
    execs = [{"name": so, "id": next(f["so_id"] for f in my if f["so"] == so), "territories": [t for t, _ in so_terr[so].most_common() if t in terrs]}
             for so, _ in so_n.most_common()]
    exec_for = {t: Counter(f["so"] for f in org.by_terr[t] if f["asm"] == A).most_common(1)[0][0] for t in terrs}

    # ---- market model
    mk = {r["Category"]: r for (m, _), r in org.market.items() if m == micro}
    in_micro = [f for f in org.facts if f["micro"] == micro]
    run_rate = lambda fs, cat=None: sum(sum(f["cy"][c][m] for m in range(5)) for f in fs for c in ([cat] if cat else CAT_ORDER)) / 5 * 12
    comp_cols = [k for k in (mk.get("Overall") or {}) if k.startswith("Competitor")]
    top_comp = sorted(comp_cols, key=lambda k: -_n(mk["Overall"].get(k)))[:5] if mk.get("Overall") else []
    comp_label = [f"C{re.search(r'(\d+)', k).group(1)}" for k in top_comp]

    def share_of(row: Optional[dict]) -> Optional[float]:
        return _n(row.get("Client (LPM)")) / _n(row.get("Market Size (LPM)")) * 100 if row and _n(row.get("Market Size (LPM)")) else None

    overall_share = share_of(mk.get("Overall"))
    region_market = run_rate(in_micro) / (overall_share / 100) if overall_share else 0.0
    band = lambda s: "Strong" if s >= 25 else "Moderate" if s >= 20 else "Weak"

    drows = [r for r in wb.sheets[DIST_SHEET].rows if r.get("ASM Name") == A]
    terr_of_dist = {}
    for r in drows:
        prim = str(r.get("Primary Territory") or "")
        terr_of_dist[_key(r["Distributor Name"])] = next((t for t in terrs if prim.lower().startswith(t.lower())), terrs[0] if terrs else prim)
    universe_t = Counter()
    for r in drows:
        universe_t[terr_of_dist[_key(r["Distributor Name"])]] += int(_n(r.get("Retailer Universe of the Distributor")))
    if not universe_t:
        universe_t = Counter({t: len(org.by_terr[t]) for t in terrs})
    u_total = sum(universe_t.values()) or 1

    TERRITORY_SHARE = {}
    for t in terrs:
        m_t = region_market * universe_t.get(t, 0) / u_total
        s_t = run_rate([f for f in org.by_terr[t] if f["asm"] == A]) / m_t * 100 if m_t else 0.0
        TERRITORY_SHARE[t] = {"share": round(s_t, 1), "band": band(s_t), "marketCr": round(m_t / 1e7, 1)}
    REGION_SHARE = {"share": round(overall_share or 0, 1), "band": band(overall_share or 0), "marketCr": round(region_market / 1e7, 1)}

    MARKET_BY_CATEGORY = []
    for cat in CAT_ORDER:
        row = mk.get(MARKET_CAT[cat])
        s = share_of(row)
        if s is None:
            continue
        size = _n(row["Market Size (LPM)"])
        comp = [round(_n(row.get(k)) / size * 100, 1) for k in top_comp]
        lead = max(range(len(comp)), key=lambda i: comp[i]) if comp else None
        note = (f"{comp_label[lead]} leads at {comp[lead]:.0f}%; the company holds {s:.0f}%." if lead is not None and comp[lead] > s
                else f"The company leads the category at {s:.0f}%.")
        MARKET_BY_CATEGORY.append({"cat": cat, "sizeCr": round(run_rate(in_micro, cat) / (s / 100) / 1e7, 1) if s else 0, "bondex": round(s, 1), "comp": comp, "note": note})

    REACH = [{"distributor": _clean_dist(r["Distributor Name"]), "territory": terr_of_dist[_key(r["Distributor Name"])],
              "universe": int(_n(r.get("Retailer Universe of the Distributor"))), "mapped": int(_n(r.get("# Retailers mapped currently"))),
              "billed": int(_n(r.get("#Unique retailers billed in last quarter")))} for r in drows]

    INFLUENCERS = []
    for i in org.influencer:
        if i["asm"] != A:
            continue
        x = i["nums"] + [0] * 12
        terr = str(i["pos"]).replace("BDE-", "")
        INFLUENCERS.append({"type": i["pos"], "territory": terr, "onboarded": [x[1], x[0]], "active": [x[4], x[3]], "retained": [x[7], x[6]]})

    # ---- outlets (every one the plan or pitch can reach)
    OUTLETS: dict[str, dict[str, Any]] = {}

    def outlet(f: dict) -> str:
        OUTLETS.setdefault(f["name"], {"type": OUTLET_TYPE.get(f["type"], "Retailer"), "territory": f["terr"], "code": f["rid"]})
        return f["name"]

    def dist_outlet(name: str, code: Any, terr: str) -> str:
        OUTLETS.setdefault(name, {"type": "Distributor", "territory": terr, "code": f"DST-{code}"})
        return name

    def top_outlets(fs: list[dict], key, k: int = 3) -> list[str]:
        return [outlet(f) for f in sorted(fs, key=key)[:k]]

    def last_visit(names: list[str]) -> Optional[dict[str, Any]]:
        fs = [by_name[n] for n in names if n in by_name and by_name[n]["visit"] and by_name[n]["visit"] >= dt.date(2026, 9, 1)]
        if not fs:
            return None
        f = max(fs, key=lambda f: (f["visit"], f["vtime"] or ""))
        return {"by": f["so"], "at": f["name"], "when": _dm(f["visit"], f["vtime"]), "state": "Visited",
                "note": f"Last SO visit on record. {f['name']} is at {inr(f['sep'])} Sep MTD" + (f", {inr(f['overdue'])} overdue." if f["overdue"] > 0 else ".")}

    by_name = {f["name"]: f for f in my}

    # ---- September initiatives
    inits: list[dict[str, Any]] = []
    sep1 = "1 Sep, 08:00"

    def add(**kw):
        inits.append(kw)

    my_by_dist: dict[str, list[dict]] = defaultdict(list)
    for f in my:
        my_by_dist[_key(f["dist"])].append(f)
    for r in sorted(drows, key=lambda r: -(_n(r.get("June'26 sales")) - _n(r.get("Aug'26 sales")))):
        name, k = _clean_dist(r["Distributor Name"]), _key(r["Distributor Name"])
        fs = my_by_dist.get(k, [])
        jun, aug = _n(r.get("June'26 sales")), _n(r.get("Aug'26 sales"))
        t = terr_of_dist[k]
        owner = Counter(f["so"] for f in fs).most_common(1)[0][0] if fs else exec_for.get(t, A)
        top_cat = DIST_CAT[max(DIST_CAT, key=lambda c: _n(r.get(c)))]
        if jun > aug and fs:
            est = jun - aug
            rec = max(0.0, sum(f["sep"] for f in fs) - sum(f["aug_mtd"] for f in fs))
            pct_d = rec / est * 100 if est else None
            add(id=f"i-dist-{_slug(name)}", title=name, lever="Distributor revival", channel="Distributor", product=top_cat, territory=t, owner=owner,
                unit="₹L", est=L(est), agreed=L(est), delivered=L(rec), big=est >= 1e5, pct=pct_d,
                description=f"Secondary sales fell from {inr(jun)} in June to {inr(aug)} in August ({(aug - jun) / jun * 100:.0f}%). {top_cat} is {_n(r.get([c for c in DIST_CAT if DIST_CAT[c] == top_cat][0])) * 100:.0f}% of its mix.",
                steps=[f"Restore the June order level ({inr(jun)} a month)", f"Push {top_cat} at the {len(fs)} retailers on its beat", "Review the order rhythm in the weekly huddle"],
                source={"agent": "thermometer", "ref": f"{DIST_SHEET} · Jun–Aug sales", "at": sep1},
                outlets=[dist_outlet(name, r.get("Distributor Code"), t)] + top_outlets(fs, lambda f: f["sep"] - f["aug_mtd"], 2),
                pitch_line=f"Bring the order rhythm back to the June level ({inr(jun)} a month); {top_cat} first.")
        uni, mapped = int(_n(r.get("Retailer Universe of the Distributor"))), int(_n(r.get("# Retailers mapped currently")))
        if uni and mapped / uni < REACH_TARGET and fs:
            need = math.ceil(uni * REACH_TARGET) - mapped
            new_billing = sum(1 for f in fs if f["new"] and f["sep"] > 0)
            add(id=f"i-reach-{_slug(name)}", title=f"{name} · retail reach", lever="Retail reach", channel="Distributor", product="All categories", territory=t, owner=owner,
                unit="retailers", est=need, agreed=need, delivered=new_billing, big=need >= 10, pct=new_billing / need * 100 if need else None,
                description=f"{name} reaches {mapped} of {uni} retailers in its universe ({mapped / uni * 100:.0f}%). {need} more reach the {REACH_TARGET * 100:.0f}% norm.",
                steps=["Share the unmapped retailer list with the distributor", "Joint visits on two beats", "Track first bills of new retailers"],
                source={"agent": "thermometer", "ref": f"{DIST_SHEET} · retailer universe vs mapped", "at": sep1},
                outlets=[dist_outlet(name, r.get("Distributor Code"), t)] + top_outlets([f for f in fs if f["new"]] or fs, lambda f: -f["sep_t"], 2),
                pitch_line=f"Agree joint visits to the unmapped retailers; {need} more reach the {REACH_TARGET * 100:.0f}% norm.")

    for t in terrs:
        fs = [f for f in org.by_terr[t] if f["asm"] == A]
        gaps = {c: sum(f["tgt"][c][5] for f in fs) * AS_OF.day / MONTH_DAYS - sum(f["cy"][c][5] for f in fs) for c in CAT_ORDER}
        cat = max(gaps, key=gaps.get)
        tgt, act = sum(f["tgt"][cat][5] for f in fs), sum(f["cy"][cat][5] for f in fs)
        if tgt > 0:
            add(id=f"i-range-{_slug(t)}", title=f"{cat} range, {t}", lever="Range selling", channel="Retailer", product=cat, territory=t, owner=exec_for[t],
                unit="₹L", est=L(tgt), agreed=L(tgt), delivered=L(act), big=True, pct=act / tgt * 100,
                description=f"{cat} is {t}'s largest gap to the phased September target: {inr(act)} of {inr(tgt)} for the month, {inr(gaps[cat])} behind the 20th.",
                steps=[f"Add {cat} to every visit pitch in {t}", "Take orders at the retailers furthest behind", "Review weekly against the phased target"],
                source={"agent": "thermometer", "ref": "8. Actual vs 9. Target Sales Value · Sep", "at": sep1},
                outlets=top_outlets([f for f in fs if f["tgt"][cat][5] > 0], lambda f: -(f["tgt"][cat][5] - f["cy"][cat][5]), 3),
                pitch_line=f"Close the {cat} gap: the outlet is behind its September target for the category.")
        dormant = [f for f in fs if sum(f["cy"][c][m] for c in CAT_ORDER for m in (0, 1, 2)) > 0 and sum(f["cy"][c][m] for c in CAT_ORDER for m in (3, 4)) == 0]
        if dormant:
            q1 = sum(f["cy"][c][m] for f in dormant for c in CAT_ORDER for m in (0, 1, 2)) / 3
            back = sum(f["sep"] for f in dormant)
            add(id=f"i-dormant-{_slug(t)}", title=f"Dormant retailers, {t}", lever="Dealer revival", channel="Dealer", product="All categories", territory=t, owner=exec_for[t],
                unit="₹L", est=L(q1), agreed=L(q1), delivered=L(back), big=q1 >= 1e5, pct=back / q1 * 100 if q1 else None,
                description=f"{len(dormant)} retailers billed {inr(q1)} a month in Q1 and nothing in July or August.",
                steps=[f"Visit all {len(dormant)} with a reactivation offer", "One trial order each before month-end", "Hand repeat orders to the distributor's beat"],
                source={"agent": "thermometer", "ref": "8. Actual Sales Value · Q1 vs Jul–Aug", "at": sep1},
                outlets=top_outlets(dormant, lambda f: -sum(f["cy"][c][m] for c in CAT_ORDER for m in (0, 1, 2)), 3),
                pitch_line="Reactivate with one trial order this month; repeats move to the distributor's beat.")

    for i in INFLUENCERS:
        got, tgt = i["active"]
        if tgt and got < tgt and i["territory"] in terrs:
            add(id=f"i-infl-{_slug(i['territory'])}", title=f"Influencer activation, {i['territory']}", lever="Influencer engagement", channel="Influencer",
                product="Waterproofing Compound", territory=i["territory"], owner=exec_for.get(i["territory"], A), unit="applicators", est=tgt, agreed=tgt, delivered=got,
                big=False, pct=got / tgt * 100, description=f"{i['type']}: {got} of {tgt} influencers active this month (4,000+ points); onboarding at {i['onboarded'][0]} of {i['onboarded'][1]}.",
                steps=["Ask each counter for its top two applicators", "Enrol them in the influencer programme", "One demo day per cluster"],
                source={"agent": "map", "ref": "Data 12 - Influencer Data", "at": sep1}, outlets=[], pitch_line="Ask for the counter's top two applicators; enrol them in the programme.")

    # number by priority and value; High ones were pushed to Pitch when the plan was built
    for x in inits:
        x["priority"] = _priority(x.pop("pct"), x.pop("big"))
    rank = {"High": 0, "Medium": 1, "Low": 2}
    inits.sort(key=lambda x: (rank[x["priority"]], -(x["est"] if x["unit"] == "₹L" else 0)))
    inits = inits[:12]
    SEP_INITIATIVES, SUGGESTED_OUTLETS, PLAN_LINES = [], {}, {}
    for n, x in enumerate(inits, start=1):
        outlets, line = x.pop("outlets"), x.pop("pitch_line")
        done = x["delivered"] is not None and x["agreed"] and x["delivered"] >= x["agreed"]
        auto = x["priority"] == "High" and outlets
        vis = last_visit(outlets)
        SEP_INITIATIVES.append({
            **x, "n": n, "sector": "Trade", "status": "closed" if done else "in-pitch" if auto else "unassigned",
            "pitch": {"mode": "auto", "outlets": outlets, "at": sep1} if auto else None,
            "attachments": 0, "comments": [], **({"visit": vis, "tag": {"label": "1 visit on record", "tone": "ai"}} if vis else {}),
        })
        if not auto and outlets:
            SUGGESTED_OUTLETS[x["id"]] = outlets
        PLAN_LINES[x["id"]] = line

    # ---- since the plan, Studio context
    by_t_ach = {t: (sum(f["sep"] for f in org.by_terr[t] if f["asm"] == A), sum(f["sep_mtd_t"] for f in org.by_terr[t] if f["asm"] == A)) for t in terrs}
    worst = min(terrs, key=lambda t: by_t_ach[t][0] / by_t_ach[t][1] if by_t_ach[t][1] else 1) if terrs else None
    shorts = [f for f in my if f["short_sku"] and f["order_date"] and f["order_date"] >= dt.date(2026, 9, 1)]
    item_for = lambda t, lever=None: next((i["id"] for i in SEP_INITIATIVES if i["territory"] == t and (lever is None or i["lever"] == lever)), SEP_INITIATIVES[0]["id"] if SEP_INITIATIVES else "")
    signals = []
    if worst:
        a, b = by_t_ach[worst]
        signals.append({"agent": "thermometer", "when": "20 Sep", "text": f"{worst} is at {a / b * 100:.0f}% of its phased September target ({inr(a)} of {inr(b)} to the 20th), the lowest in {region}.", "item": item_for(worst, "Range selling")})
    if shorts:
        t = Counter(f["terr"] for f in shorts).most_common(1)[0][0]
        signals.append({"agent": "thermometer", "when": _dm(max(f["order_date"] for f in shorts)), "text": f"{len(shorts)} September orders were short-supplied by the distributor, most in {t} ({Counter(f['short_sku'] for f in shorts).most_common(1)[0][0]}).", "item": item_for(t)})
    SINCE_LOCKED = {"signals": signals, "feedback": []}

    CONSIDER = []
    for t in terrs:
        fs = [f for f in org.by_terr[t] if f["asm"] == A]
        a, b = by_t_ach[t]
        gaps = {c: sum(f["tgt"][c][5] for f in fs) * AS_OF.day / MONTH_DAYS - sum(f["cy"][c][5] for f in fs) for c in CAT_ORDER}
        cat = max(gaps, key=gaps.get)
        CONSIDER.append({"agent": "thermometer", "territory": t, "open": "thermometer",
                         "text": f"{t} is at {a / b * 100:.0f}% of its phased September target; {cat} is the largest gap ({inr(gaps[cat])})." if b else f"No September target in {t}."})
        od = [f for f in fs if f["overdue"] > 0]
        if od:
            CONSIDER.append({"agent": "thermometer", "territory": t, "open": "thermometer", "text": f"{inr(sum(f['overdue'] for f in od))} is overdue at {len(od)} retailers in {t}; the oldest is {max(f['ageing'] for f in od)} days."})

    def weak_text(t: Optional[str]) -> str:
        if t is None:
            w = min(terrs, key=lambda x: TERRITORY_SHARE[x]["share"])
            return (f"{w} holds an estimated {TERRITORY_SHARE[w]['share']}% of a ₹{TERRITORY_SHARE[w]['marketCr']} Cr market, the weakest of {region}'s territories. "
                    + next((c["text"] for c in CONSIDER if c["territory"] == w), ""))
        sh = TERRITORY_SHARE[t]
        return f"{t} holds an estimated {sh['share']}% of a ₹{sh['marketCr']} Cr market ({sh['band'].lower()}). " + " ".join(c["text"] for c in CONSIDER if c["territory"] == t)

    def dist_text(t: Optional[str]) -> str:
        rows = [r for r in drows if t is None or terr_of_dist[_key(r["Distributor Name"])] == t]
        if not rows:
            return f"No distributor in {t} is in the distributor assessment."
        parts = []
        for r in sorted(rows, key=lambda r: _n(r.get("Aug'26 sales")) - _n(r.get("June'26 sales"))):
            jun, aug = _n(r.get("June'26 sales")), _n(r.get("Aug'26 sales"))
            uni, mapped = _n(r.get("Retailer Universe of the Distributor")), _n(r.get("# Retailers mapped currently"))
            parts.append(f"{_clean_dist(r['Distributor Name'])} ({(aug - jun) / jun * 100:+.0f}% Jun→Aug, reaches {mapped / uni * 100:.0f}% of its universe)" if jun and uni else _clean_dist(r["Distributor Name"]))
        return "By sales trend: " + "; ".join(parts[:4]) + "."

    STUDIO = {"weakest": min(terrs, key=lambda x: TERRITORY_SHARE[x]["share"]) if terrs else "",
              "weak": {"*": weak_text(None), **{t: weak_text(t) for t in terrs}},
              "distributors": {"*": dist_text(None), **{t: dist_text(t) for t in terrs}}}

    # ---- October draft: what September leaves open, sized on what's left
    OCT_DRAFT = []
    for x in SEP_INITIATIVES:
        if x["status"] == "closed" or x["unit"] != "₹L":
            continue
        left = max(0.0, x["agreed"] - (x["delivered"] or 0))
        OCT_DRAFT.append({"id": f"d-{len(OCT_DRAFT) + 1}", "title": x["title"], "territory": x["territory"], "lever": x["lever"], "product": x["product"],
                          "priority": x["priority"], "owner": x["owner"], "estL": round(left, 1), "carried": True,
                          "why": f"{x['description'].split('. ')[0]}. {inr(left * 1e5)} of it is still open at the 20th.",
                          "from": {"agent": x["source"]["agent"], "label": x["source"]["ref"]}})
    for t in terrs:
        unv = [f for f in org.by_terr[t] if f["asm"] == A and (f["visit"] is None or (AS_OF - f["visit"]).days > 30)]
        if unv:
            est = sum(f["sep_t"] for f in unv) * 0.5
            OCT_DRAFT.append({"id": f"d-{len(OCT_DRAFT) + 1}", "title": f"Cover {len(unv)} retailers not visited in 30+ days, {t}", "territory": t, "lever": "Retail reach",
                              "product": "All categories", "priority": "Medium", "owner": exec_for[t], "estL": L(est),
                              "why": f"{sum(1 for f in unv if f['visit'] is None)} have never had an SO visit; together they carry {inr(sum(f['sep_t'] for f in unv))} of September target.",
                              "from": {"agent": "pitch", "label": "4. Retailer_Master · SO last visit"}})
    OCT_DRAFT = sorted(OCT_DRAFT, key=lambda d: (rank[d["priority"]], -d["estL"]))[:8]
    for k, d in enumerate(OCT_DRAFT, start=1):
        d["id"] = f"d-{k}"

    # ---- plan index extras: no plan history, so a month's "initiatives" is its under-target territory × category pairs
    counts = []
    for m in range(5):
        counts.append(sum(1 for t in terrs for c in CAT_ORDER
                          if (tg := sum(f["tgt"][c][m] for f in org.by_terr[t] if f["asm"] == A)) > 0 and sum(f["cy"][c][m] for f in org.by_terr[t] if f["asm"] == A) < 0.8 * tg))

    # ---- pitch
    def kpis(name: str) -> dict[str, str]:
        fs = my_by_dist.get(_key(name), []) if OUTLETS[name]["type"] == "Distributor" else ([by_name[name]] if name in by_name else [])
        sep, mtd = sum(f["sep"] for f in fs), sum(f["sep_mtd_t"] for f in fs)
        bought = sum(1 for sid, *_ in skus if any(_n((qty.get(f["rid"]) or {}).get(f"Sep-26 MTD (till 20th) / {sid}")) > 0 for f in fs))
        return {"value": inr(sep), "target": f"{sep / mtd * 100:.0f}%" if mtd else "—", "outstanding": inr(sum(f["outstanding"] for f in fs)),
                "skus": f"{bought} / {len(skus)}"}

    def points(name: str) -> list[dict[str, Any]]:
        o = OUTLETS[name]
        if o["type"] == "Distributor":
            fs = my_by_dist.get(_key(name), [])
            r = next((r for r in drows if _clean_dist(r["Distributor Name"]) == name), {})
            jun, aug = _n(r.get("June'26 sales")), _n(r.get("Aug'26 sales"))
            appt = str(r.get("Appt. Date") or "")[:4]
            od = sum(f["overdue"] for f in fs)
            top_col = max(DIST_CAT, key=lambda c: _n(r.get(c)))
            return [
                {"topic": "Company introduction", "point": "Skip the full introduction; confirm who places orders now.", "why": f"Appointed in {appt}." if appt else "Active distributor.",
                 "logic": "Active distributor.", "evidence": f"{DIST_SHEET} · {o['code']}", "conf": _conf(1)},
                {"topic": "Outstanding", "point": f"Ask for clearance of {inr(od)} overdue across its retailers before the next order." if od else "No overdue at its retailers; confirm the next payment date.",
                 "why": f"{sum(1 for f in fs if f['overdue'] > 0)} of its {len(fs)} retailers are past their credit period." if od else "Retailer credit is within terms.",
                 "logic": f"Overdue {inr(od)}.", "evidence": "5. Retailer Credit", "conf": _conf(2)},
                {"topic": "Sell top seller", "point": f"Hold the {DIST_CAT[top_col]} order rhythm; it's the largest share of its sales.",
                 "why": f"{_n(r.get(top_col)) * 100:.0f}% of its secondary sales.", "logic": "Category mix, last quarter.", "evidence": f"{DIST_SHEET} · category %", "conf": _conf(1)},
                {"topic": "Target", "point": "Agree this week's order to recover the June level.", "why": f"{inr(aug)} in August against {inr(jun)} in June.", "logic": f"{(aug - jun) / jun * 100:+.0f}% Jun→Aug." if jun else "—",
                 "evidence": f"{DIST_SHEET} · monthly sales", "conf": _conf(1)},
                {"topic": "Loyalty", "point": "No loyalty topic for a distributor.", "why": "The loyalty programme covers retailers only.", "logic": "Not applicable.", "evidence": "14a. Loyalty program structure", "conf": None},
            ]
        f = by_name.get(name)
        if not f:
            return []
        pr = proj.get(f["rid"]) or {}
        gaps = sorted(((n, pk, _n(pr.get(f"Gap / {sid}"))) for sid, n, pk, _ in skus if _n(pr.get(f"Gap / {sid}")) > 0), key=lambda x: -x[2])
        out = [{"topic": "Company introduction",
                "point": "Skip the full introduction; confirm who places orders now." if not f["new"] else "Introduce the company and the waterproofing range; leave the category brochure.",
                "why": f"Onboarded {f['onboarded'].strftime('%b %Y')}." if f["onboarded"] else ("New retailer." if f["new"] else "Active retailer."),
                "logic": "New account." if f["new"] else "Active account.", "evidence": f"4. Retailer_Master · {f['rid']}", "conf": _conf(1)},
               {"topic": "Outstanding",
                "point": f"Ask for clearance of {inr(f['overdue'])} overdue before booking a new order." if f["overdue"] > 0 else "No overdue; confirm the next payment date.",
                "why": f"{inr(f['overdue'])} is {f['ageing']} days past the credit period (risk: {f['risk'] or 'none'})." if f["overdue"] > 0 else f"{inr(f['outstanding'])} outstanding, within terms.",
                "logic": f"Outstanding {inr(f['outstanding'])}, limit {inr(f['limit'])}.", "evidence": "5. Retailer Credit", "conf": _conf(1)}]
        if gaps:
            n_, pk, g = gaps[0]
            out.append({"topic": "Sell top seller", "point": f"Push {n_} {pk}: {int(g)} units short of the September target.",
                        "why": f"The largest SKU gap at this counter; {len(gaps)} SKUs are behind.", "logic": f"Gap {int(g)} units.", "evidence": f"{PROJ} · Gap / SKU", "conf": _conf(1)})
        if f["ach"] is not None:
            rr = _n(pr.get("Sales qty RR required per day in remaning days of Sep to achieve target / Total"))
            out.append({"topic": "Target", "point": "Agree this week's order to stay on track for the monthly plan.", "why": f"{f['ach'] * 100:.0f}% of the September target to the 20th.",
                        "logic": f"{inr(f['sep'])} Sep MTD; {rr:.0f} units a day needed.", "evidence": f"{PROJ} · MTD achievement", "conf": _conf(1)})
        l2 = f["loy2"]
        if l2.get("Pitch statement"):
            out.append({"topic": "Loyalty", "point": str(l2["Pitch statement"]), "why": f"Current slab {l2.get('Current slab')}; next {l2.get('Next eligible slab')}.",
                        "logic": f"{int(_n(l2.get('Additional qty sale required in sep to reach next slab')))} more packs to the next slab.", "evidence": "14c Q2 loyalty performance", "conf": _conf(1)})
        else:
            out.append({"topic": "Loyalty", "point": "No loyalty step this month.", "why": "No slab move within reach.", "logic": "Not applicable.", "evidence": "14c Q2 loyalty performance", "conf": None})
        if f["short_sku"]:
            out.append({"topic": "Maintain & grow", "point": f"Confirm when the {int(f['short_qty'])} units of {f['short_sku']} short on {f['order_id']} will arrive.",
                        "why": f"The distributor short-supplied order {f['order_id']} on {_dm(f['order_date'])}.", "logic": "Short supply, Sep.", "evidence": "15. Logistics fulfilment", "conf": _conf(1)})
        return out

    # the Thermometer route: the Coverage recommendation's top unvisited retailer gets a pitch of its own
    thermo = None
    route_rec = next((r for r in ctx["recs"] if ctx["rec_route"].get(r["id"]) == "pitch"), None)
    if route_rec:
        cand = [f for f in org.by_terr.get(route_rec["territory"], []) if f["asm"] == A and (f["visit"] is None or (AS_OF - f["visit"]).days > 30)]
        if cand:
            f = max(cand, key=lambda f: f["sep_t"])
            thermo = {"outlet": outlet(f), "rec": route_rec["id"], "label": f"Thermometer recommendation #{route_rec['n']} · {route_rec['signal']}",
                      "point": {"topic": "Open issues", "point": "Book the first visit of the quarter and take an opening order.",
                                "why": f"No SO visit since {_dm(f['visit'])}." if f["visit"] else "Never visited by an SO.",
                                "logic": f"{inr(f['sep_t'])} September target.", "evidence": f"Thermometer · recommendation #{route_rec['n']} · 4. Retailer_Master", "conf": _conf(2)}}

    main_so = execs[0]["name"] if execs else ""
    route = sorted([f for f in my if f["so"] == main_so], key=lambda f: (f["visit"] or dt.date(2000, 1, 1)))[:3]
    TODAYS_ROUTE = [outlet(f) for f in route]
    for x in SEP_INITIATIVES:
        for o in (x["pitch"] or {}).get("outlets", []):
            outlet(by_name[o]) if o in by_name else None

    STATE = {}
    for name, o in OUTLETS.items():
        f = by_name.get(name)
        if f and f["visit"] and f["visit"] >= dt.date(2026, 9, 1):
            STATE[name] = {"visited": {"by": f["so"], "at": name, "when": _dm(f["visit"], f["vtime"])}}
    PITCH = {
        "OUTLETS": OUTLETS, "SUGGESTED_OUTLETS": SUGGESTED_OUTLETS, "STATE": STATE, "THERMO_ROUTE": thermo,
        "KPIS": {n: kpis(n) for n in OUTLETS}, "POINTS": {n: points(n) for n in OUTLETS}, "PLAN_LINES": PLAN_LINES,
        "TODAYS_ROUTE": TODAYS_ROUTE, "GENERATED_AT": sep1, "LANGUAGE": "Gujarati" if org.state == "Gujarat" else "Hindi",
    }

    # ---- tracker: ASM-level groups (Needs an owner) and the officers' own retailer actions (Team)
    head = org.rsm
    labels = {"asm": A, "region": region, "state": org.state, "head": head, "headScope": f"{org.state} · {len(org.asms)} ASMs",
              "month": "September 2026", "territories": terrs}
    sig_mine = [(f, s) for f, s in ctx["sig_rows"] if f["asm"] == A]

    def due(days: int) -> str:
        return _dm(AS_OF + dt.timedelta(days=days))

    def sla_for(delayed: bool, days: int) -> dict[str, Any]:
        left = (AS_OF + dt.timedelta(days=days) - TODAY).days
        if delayed:
            return {"label": "Breached · signal overdue", "breach": True}
        return {"label": "Due today" if left == 0 else f"{left} day{'s' if left != 1 else ''} left" if left > 0 else f"Breached {-left} day{'s' if left != -1 else ''}", **({"breach": True} if left < 0 else {})}

    def person(name: str, role: str, rel: str) -> dict[str, str]:
        return {"name": name, "role": role, "relation": rel}

    tickets = []
    groups: dict[tuple, list] = defaultdict(list)
    for f, s in sig_mine:
        groups[(f["terr"], s["kind"])].append((f, s))
    for k, ((t, kind), rows) in enumerate(sorted(groups.items(), key=lambda kv: -sum(s["value"] for _, s in kv[1]))[:6]):
        val = sum(s["value"] for _, s in rows)
        delayed = sum(1 for _, s in rows if s["delayed"]) > len(rows) / 2
        top = max(rows, key=lambda x: x[1]["value"])[0]
        tickets.append({
            "id": f"TKT-{2301 + k}", "ref": f"act-{_slug(t)}-{kind}", "title": f"{KIND_LABEL[kind]} · {len(rows)} retailer{'s' if len(rows) > 1 else ''} in {t}",
            "description": f"{len(rows)} retailers in {t} carry a {KIND_LABEL[kind].lower()} signal" + (f" worth {inr(val)}" if val else "") + f". The largest is {top['name']}. It needs an owner.",
            "source": rows[0][1]["agent"], "cls": KIND_CLASS[kind], "priority": "High" if delayed or k < 2 else "Medium", "column": "owner", "isNew": k == 0,
            "territory": t, "asm": A, "region": region, "assignee": None, "due": "—", "sla": {"label": "No SLA until owned"},
            "watchers": [person(head, f"Sales Head · {org.state}", "Escalation contact")],
            "provenance": {"screen": f"Thermometer · {t}", "evidence": {"collection": "5. Retailer Credit", "credit": "5. Retailer Credit", "gap": "11. Sep projections", "short": "15. Logistics fulfilment",
                                                                         "coverage": "4. Retailer_Master · SO last visit", "loyalty": "14c Q2 loyalty performance"}[kind], "raised": "Thermometer, 20 Sep, 08:00"},
            "entities": f"{t} · {len(rows)} retailers", **({"value": {"unit": "₹L", "est": L(val), "agreed": L(val), "delivered": None}} if val else {}),
            "age": "1 day", "relationships": {}, "activity": [{"who": "Thermometer", "what": f"raised this from the {t} signals", "when": "20 Sep, 08:00"}],
            "comments": [], "attachments": 0, "views": 1, "kind": kind,
        })
    for k, (f, s) in enumerate(sorted(sig_mine, key=lambda x: -x[1]["value"])[:10]):
        days = 0 if s["pri"] >= 3 else 3
        paid = f["paid"] if s["kind"] == "collection" and f["paid_on"] and f["paid_on"] >= dt.date(2026, 9, 1) else None
        tickets.append({
            "id": f"TKT-{2311 + k}", "ref": f"act-t{k + 1}", "title": f"{s['title']} · {f['name']}", "description": f"{s['title']} at {f['name']} ({f['terr']}). It's in {f['so']}'s app as a field action.",
            "source": s["agent"], "cls": KIND_CLASS[s["kind"]], "priority": "High" if s["pri"] >= 2 else "Medium", "column": "progress",
            "territory": f["terr"], "asm": A, "region": region, "assignee": f["so"], "due": due(days), "sla": sla_for(s["delayed"], days),
            "watchers": [person(f["so"], f"Sales Executive · {f['terr']}", "Assignee"), person(A, f"ASM · {region}", "Watching")],
            "provenance": {"screen": f"Thermometer · {f['name']}", "evidence": f"{f['rid']} · {s['signal']} signal", "raised": "Thermometer, 20 Sep, 08:00"},
            "entities": f"{f['rid']} {f['name']} · {f['terr']}",
            **({"value": {"unit": "₹L", "est": L(s["value"]), "agreed": L(s["value"]), "delivered": L(paid) if paid else None}} if s["value"] else {}),
            "age": "1 day", "relationships": {}, "activity": [{"who": "Thermometer", "what": "raised this from the workbook signals", "when": "20 Sep, 08:00"},
                                                              {"who": f["so"], "what": "has it in the SFA app", "when": "20 Sep, 08:05"}],
            "comments": [], "attachments": 0, "views": 1, "links": {"pitchOutlet": f["name"]} if f["name"] in OUTLETS else {},
            "retailerId": f["rid"], "soId": f["so_id"], "kind": s["kind"],
        })
    ticket_init = {}
    for x in SEP_INITIATIVES:
        t = next((t for t in tickets if t["column"] == "owner" and t["territory"] == x["territory"] and {"Range selling": "gap", "Distributor revival": "gap"}.get(x["lever"]) == t["kind"]), None)
        if t:
            t.setdefault("links", {})["initiative"] = x["id"]
            ticket_init[t["id"]] = x["id"]

    other = []
    for a in org.asms:
        if a == A:
            continue
        rows = [(f, s) for f, s in ctx["sig_rows"] if f["asm"] == a]
        g2: dict[tuple, list] = defaultdict(list)
        for f, s in rows:
            g2[(f["terr"], s["kind"])].append((f, s))
        for k, ((t, kind), v) in enumerate(sorted(g2.items(), key=lambda kv: -sum(s["value"] for _, s in kv[1]))[:2]):
            delayed = sum(1 for _, s in v if s["delayed"]) > len(v) / 2
            other.append({"id": f"TKT-{2101 + len(other)}", "title": f"{KIND_LABEL[kind]} · {len(v)} retailers in {t}", "asm": a, "region": org.region_of_asm[a],
                          "territory": t, "source": v[0][1]["agent"], "cls": KIND_CLASS[kind], "priority": "High" if delayed else "Medium",
                          "column": "progress" if k == 0 else "owner", "due": due(3), "sla": sla_for(delayed, 3) if k == 0 else {"label": "No SLA until owned"}, "age": "1 day"})

    TRACKER = {"LABELS": labels, "ASM_TICKETS": tickets, "OTHER_ASM_TICKETS": other, "HEAD_ASMS": list(org.asms),
               "SE_NAMES": sorted({f["so"] for f in org.facts}), "OCT_TICKET_BASE": 2410}

    # what MAP Studio reads before it drafts October: counted from the workbook and the tracker above
    month_start = AS_OF.replace(day=1)
    STUDIO["sources"] = {
        "huddleThemes": len(org.huddle),
        "visitsThisMonth": sum(1 for f in my if f["visit"] and f["visit"] >= month_start),
        "openTickets": sum(1 for t in tickets if t["column"] != "closed"),
        "openInitiatives": sum(1 for x in SEP_INITIATIVES if x["status"] != "closed"),
    }

    # ---- the Head of Sales orchestration story (latest sync on the data day)
    def story(fs: list[dict], where: str, sid: str, start: str, end: str, rescore: Optional[str], asm_name: Optional[str]) -> dict[str, Any]:
        week = AS_OF - dt.timedelta(days=6)
        vis = [f for f in fs if f["visit"] and week <= f["visit"] <= AS_OF]
        ords = [f for f in fs if f["order_date"] and week <= f["order_date"] <= AS_OF]
        rids = {f["rid"] for f in fs}
        sig = [(f, s) for f, s in ctx["sig_rows"] if f["rid"] in rids]
        groups_n = len({(f["terr"], s["kind"]) for f, s in sig})
        rs = ""
        if rescore:
            fr = [f for f in fs if f["terr"] == rescore]
            a_, m_ = sum(f["sep"] for f in fr), sum(f["sep_t"] for f in fr)
            proj_ = a_ * MONTH_DAYS / AS_OF.day / m_ * 100 if m_ else 0
            rs = f"{rescore} re-scored: {'Green' if proj_ >= 95 else 'Amber' if proj_ >= 75 else 'Red'}, projected {proj_:.0f}%"
        return {"id": sid, "what": "Workbook sync", "where": where, "startedAt": start, "finishedAt": end, "stages": [
            {"icon": "sfa", "actor": "SFA", "doing": f"Fetching {len(vis)} visits and {len(ords)} orders from the week to 20 Sep",
             "did": f"{len(vis)} visits and {len(ords)} orders synced, week to 20 Sep"},
            {"icon": "tracker-thermo", "actor": "Thermometer · Action Tracker", "doing": "Reading the signals; opening actions in the Tracker",
             "did": f"{len(sig)} signals read · {groups_n} actions opened in the Tracker"},
            {"icon": "map", "actor": "Market Action Plan", "doing": f"Carrying open gaps into {asm_name + chr(39) + 's' if asm_name else 'the'} October draft",
             "did": f"{len(OCT_DRAFT)} initiatives in {asm_name + chr(39) + 's' if asm_name else 'the'} October draft" if asm_name else f"October drafts updated in {len(org.asms)} regions"},
            {"icon": "thermometer", "actor": "Thermometer", "doing": f"Re-scoring {rescore or 'every region'} against the plan", "did": rs or f"{len(org.asms)} regions re-scored"},
            {"icon": "leadership", "actor": "Sales Leadership", "doing": "Reflecting it on your homepage", "did": "Territory Health and Priority Log updated"},
        ]}

    last_day = max((f["visit"] for f in my if f["visit"] and f["visit"] <= AS_OF), default=None)
    last_t = max(((f["vtime"] or "17:45")[:5] for f in my if f["visit"] == last_day), default="17:45")
    LIVE_STORY = story(my, region, "story-live", last_t, last_t, worst, A)
    LAST_STORY = story(org.facts, "All regions", "story-last", "08:00", "08:01", None, None)

    MAP = {
        "LABELS": labels, "TERRITORIES": terrs, "CATEGORIES": CAT_ORDER, "TERRITORY_SHARE": TERRITORY_SHARE, "REGION_SHARE": REGION_SHARE,
        "SALES_EXECS": [{"name": e["name"], "territories": e["territories"]} for e in execs],
        "EXEC_FOR": exec_for,
        "SEP_PLAN": {"id": "sep", "label": "September 2026", "scope": f"{region} · all {len(terrs)} territories", "version": "v1 of 1",
                     "locked": "Built from the workbook · data to 20 Sep", "lockedShort": "1 Sep", "agreedOn": "1 Sep",
                     "history": "v1 built from the workbook signals on the 20 Sep data. The workbook keeps no plan versions."},
        "SEP_INITIATIVES": SEP_INITIATIVES, "SINCE_LOCKED": SINCE_LOCKED, "PLAN_INITIATIVE_COUNTS": counts,
        "OCT_PLAN": {"label": "October 2026", "short": "October", "basis": "September actuals to 20 Sep · month-end lands 1 Oct"},
        "OCT_DRAFT": OCT_DRAFT, "CONSIDER": CONSIDER, "STUDIO": STUDIO,
        "MARKET_BY_CATEGORY": MARKET_BY_CATEGORY, "COMPETITORS": comp_label, "MARKET_SOURCE": f"Data 11 market shares for {micro}; ₹ size from company sales, Apr–Aug run-rate",
        "REACH": REACH, "REACH_TARGET": REACH_TARGET, "INFLUENCERS": INFLUENCERS, "data_gaps": PLAN_GAPS,
    }
    return {"map": MAP, "pitch": PITCH, "tracker": TRACKER, "story": {"LIVE_STORY": LIVE_STORY, "LAST_STORY": LAST_STORY}, "ticket_init": ticket_init}


# ---------------------------------------------------------------- per-request overlay of the app's own records

def _when(ms: int) -> str:
    d = dt.datetime.fromtimestamp(ms / 1000).astimezone()
    return f"{d.day} {d.strftime('%b')}, {d.strftime('%H:%M')}"


def overlay(data: dict[str, Any], wb: Optional[Workbook] = None) -> dict[str, Any]:
    """Return a copy of the cached payload with tracker.json applied: assignments become tickets, officers' starts /
    completions / updates move their tickets, verifications close them, and plan rows show their tickets."""
    tr = data["tracker"]
    A = tr["LABELS"]["asm"]
    state = tracker_store.get_store().snapshot()
    stored = [a for a in state["actions"] if a["assigned_by"]["name"] == A]
    if not stored and not state["overrides"]:
        return data
    out = dict(data)
    tr = out["tracker"] = copy.deepcopy(tr)
    mp = out["map"] = copy.deepcopy(data["map"])
    tickets = tr["ASM_TICKETS"]
    region = tr["LABELS"]["region"]

    def act_rows(acts: list[dict[str, Any]]) -> list[dict[str, str]]:
        verb = {"assigned": "assigned it", "started": "started it in SFA", "comment": "added an update", "complete": "marked it done in SFA",
                "verified": "verified and closed it", "sent_back": "sent it back"}
        return [{"who": e["by"], "what": verb.get(e["t"], e["t"]) + (f": {e['txt']}" if e.get("txt") and e["t"] != "comment" else ""), "when": _when(e["ts"])} for e in acts]

    def comments(acts: list[dict[str, Any]]) -> list[dict[str, str]]:
        return [{"who": e["by"], "when": _when(e["ts"]), "text": e["txt"]} for e in acts if e.get("txt") and e["t"] in ("comment", "assigned", "complete", "sent_back")]

    def column(st: str, verified: bool) -> str:
        return "closed" if verified else "verify" if st == "closed" else "progress"

    def sfa_done(acts: list[dict[str, Any]], outcome: Optional[dict]) -> Optional[dict[str, Any]]:
        e = next((e for e in reversed(acts) if e["t"] == "complete"), None)
        if not e:
            return None
        return {"by": e["by"], "when": _when(e["ts"]), "outcome": (outcome or {}).get("label") or e.get("txt") or "Marked done in SFA"}

    # tickets are found by what the web app assigns: the home page's item id (act-…, sug-…) or a plan row id
    by_source = {t.get("ref", t["id"]): t for t in tickets}
    plan_rows = {x["id"]: x for x in mp["SEP_INITIATIVES"]}

    def raised_in(src: str) -> str:
        if src in plan_rows:
            return f"Market Action Plan · {mp['SEP_PLAN']['label'].split()[0]} #{plan_rows[src]['n']} {plan_rows[src]['title']}"
        if src.startswith("oct-"):
            return "MAP Studio · October plan"
        if src.startswith("sug-"):
            return "Home · Suggested by Sales AI"
        if src.startswith("new-rec-"):
            return f"Home · Thermometer recommendation #{src.rsplit('-', 1)[-1]}"
        return "Home · Action Tracker"
    for a in sorted(stored, key=lambda a: a["created"]):
        so = a["assignee"]["type"] == "so"
        col = column(a["st"], a.get("verified", False))
        t = by_source.get(a["source_id"])
        base = {
            "id": a["id"], "title": a.get("web_title") or a["title"], "description": a["what"], "source": a.get("agent") or "thermometer",
            "cls": KIND_CLASS.get(a.get("kind") or "", "Channel"), "priority": a["pri"], "column": col, "isNew": a["st"] == "owner",
            "territory": a.get("territory") or "All territories", "asm": A, "region": region, "assignee": A,
            **({"delegatedTo": a["assignee"]["name"]} if so else {}),
            "due": _dm(dt.date.fromisoformat(a["due_date"])), "sla": _sla(a, col),
            "watchers": [{"name": A, "role": f"ASM · {region}", "relation": "Assignee"}] + ([{"name": a["assignee"]["name"], "role": "Sales Executive", "relation": "Delegated to"}] if so else []),
            "provenance": {"screen": raised_in(a["source_id"]), "evidence": a.get("det") or "—", "raised": f"{A}, {_when(a['created'])}"},
            "entities": f"{a['retailer_id']} {a['outlet']}" if a.get("retailer_id") else (a.get("outlet") or "—"),
            "age": f"{max(0, (dt.date.today() - dt.datetime.fromtimestamp(a['created'] / 1000).date()).days)} days",
            "relationships": {"related": raised_in(a["source_id"])}, "activity": act_rows(a["acts"]), "comments": comments(a["acts"]),
            "attachments": 0, "views": 1, "links": {**(t or {}).get("links", {}), **({"pitchOutlet": a["outlet"]} if a.get("outlet") in data["pitch"]["OUTLETS"] else {})},
            **({"sfaDone": s} if (s := sfa_done(a["acts"], a.get("outcome"))) and col == "verify" else {}),
            **({"closure": {"outcome": (a.get("outcome") or {}).get("label") or "Verified", "verifier": A, "ack": f"Closed {_when(next(e['ts'] for e in reversed(a['acts']) if e['t'] == 'verified'))}"}} if col == "closed" else {}),
            "stored": True,
        }
        if t:
            tickets.remove(t)
            base["value"] = t.get("value")
        # the officer's own field action for the same retailer and signal is this ticket now
        twin = next((x for x in tickets if a.get("retailer_id") and x.get("retailerId") == a["retailer_id"] and x.get("kind") == a.get("kind")), None)
        if twin:
            tickets.remove(twin)
            base["value"] = base.get("value") or twin.get("value")
        tickets.insert(0, base)
        by_source[a["source_id"]] = base
        # plan rows: the assignment is this initiative's ticket
        for x in mp["SEP_INITIATIVES"]:
            if x["id"] == a["source_id"] or (t and t.get("links", {}).get("initiative") == x["id"]):
                x["ticket"] = a["id"]
                x["status"] = "ticket-closed" if col == "closed" else "escalated" if x["status"] != "closed" else "closed"
                x["comments"] = x["comments"] + [{"who": c["who"], "at": c["when"], "text": c["text"], "ticket": f"{a['id']} · owner {a['assignee']['name']}"} for c in comments(a["acts"])]

    # the officers' own field actions: completions in the app wait for verification here
    shown: set[str] = set()
    for t in tickets:
        if not t.get("retailerId"):
            continue
        key = next((k for k, v in state["overrides"].items() if k.startswith(f"{t['soId']}|") and v.get("retailer_id") == t["retailerId"]
                    and v.get("signal") in (None, APP_KIND.get(t.get("kind") or ""))), None)
        if not key:
            continue
        ov = state["overrides"][key]
        shown.add(key)
        t["column"] = column(ov["st"], ov.get("verified", False))
        t["activity"] = t["activity"] + act_rows(ov["acts"])
        t["comments"] = comments(ov["acts"])
        if t["column"] == "verify" and (s := sfa_done(ov["acts"], ov.get("outcome"))):
            t["sfaDone"] = s
        if t["column"] == "closed":
            t["sla"] = {"label": "Met", "met": True}
            t["closure"] = {"outcome": (ov.get("outcome") or {}).get("label") or "Verified", "verifier": A, "ack": "Verified"}

    # the board lists only the largest field actions; one the officer worked on in the app gets its own ticket, so a
    # "done" on any of this ASM's retailers still reaches Awaiting Verification
    retailers = tracker_store._people(wb)["retailers"] if wb is not None else {}
    for key, ov in sorted(state["overrides"].items(), key=lambda kv: kv[1]["acts"][0]["ts"] if kv[1]["acts"] else 0):
        r = retailers.get(str(ov.get("retailer_id")))
        if key in shown or r is None or r["ASM Name"] != A or not any(e["role"] == "so" for e in ov["acts"]):
            continue
        so_id, app_id = key.split("|", 1)
        kind = WEB_KIND.get(ov.get("signal") or "")
        # an assignment for the same retailer and signal is this action's ticket already
        if any(a.get("retailer_id") == ov["retailer_id"] and a.get("kind") == kind for a in stored):
            continue
        col = column(ov["st"], ov.get("verified", False))
        so_name, terr = r["Sales officer name"], r["Territory"]
        started = ov["acts"][0]["ts"]
        tickets.insert(0, {
            "id": app_id, "title": f"{ov.get('title') or 'Field action'} · {ov['outlet']}",
            "description": f"{ov.get('title') or 'Field action'} at {ov['outlet']} ({terr}). {so_name} worked on it in the SFA app.",
            "source": "thermometer", "cls": KIND_CLASS.get(kind or "", "Channel"), "priority": "Medium", "column": col, "isNew": col == "verify",
            "territory": terr, "asm": A, "region": region, "assignee": so_name, "due": "—",
            "sla": {"label": "Met", "met": True} if col == "closed" else {"label": "Waiting on you"} if col == "verify" else {"label": "In the officer's app"},
            "watchers": [{"name": so_name, "role": f"Sales Executive · {terr}", "relation": "Assignee"}, {"name": A, "role": f"ASM · {region}", "relation": "Watching"}],
            "provenance": {"screen": f"SFA app · {ov['outlet']}", "evidence": f"{ov['retailer_id']} · {ov.get('signal') or 'field'} signal", "raised": f"{so_name}, {_when(started)}"},
            "entities": f"{ov['retailer_id']} {ov['outlet']} · {terr}",
            "age": f"{max(0, (dt.date.today() - dt.datetime.fromtimestamp(started / 1000).date()).days)} days",
            "relationships": {}, "activity": act_rows(ov["acts"]), "comments": comments(ov["acts"]), "attachments": 0, "views": 1, "links": {},
            **({"sfaDone": s} if col == "verify" and (s := sfa_done(ov["acts"], ov.get("outcome"))) else {}),
            **({"closure": {"outcome": (ov.get("outcome") or {}).get("label") or "Verified", "verifier": A, "ack": "Verified"}} if col == "closed" else {}),
            "retailerId": ov["retailer_id"], "soId": so_id, **({"kind": kind} if kind else {}),
        })

    # visit feedback the officers typed in the app, for "New since this plan"
    fb = []
    terr_of_rid = {t["retailerId"]: t["territory"] for t in data["tracker"]["ASM_TICKETS"] if t.get("retailerId")}
    for a in stored + [dict(v, territory=terr_of_rid.get(v.get("retailer_id"))) for v in state["overrides"].values()]:
        for e in a["acts"]:
            if e["role"] == "so" and e.get("txt"):
                item = next((x["id"] for x in mp["SEP_INITIATIVES"] if x.get("ticket") == a.get("id")), None)                     or next((x["id"] for x in mp["SEP_INITIATIVES"] if x["territory"] == a.get("territory")), None)
                if not item:
                    continue  # nothing in the plan for it
                fb.append({"by": e["by"], "at": a.get("outlet") or "", "when": _when(e["ts"]), "kind": "Completed" if e["t"] == "complete" else "Update", "text": e["txt"], "item": item})
    mp["SINCE_LOCKED"]["feedback"] = sorted(fb, key=lambda x: x["when"], reverse=True)[:4]
    return out


def _sla(a: dict[str, Any], col: str) -> dict[str, Any]:
    if col == "closed":
        return {"label": "Met", "met": True}
    if col == "verify":
        return {"label": "Waiting on you"}
    left = (dt.date.fromisoformat(a["due_date"]) - TODAY).days
    if left < 0:
        return {"label": f"Breached {-left} day{'s' if left != -1 else ''}", "breach": True}
    return {"label": "Due today" if left == 0 else f"{left} day{'s' if left != 1 else ''} left"}
