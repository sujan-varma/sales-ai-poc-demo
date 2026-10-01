"""Everything the field-sales mobile app shows, built from the Excel workbook only (GET /api/app/bootstrap).

Real values come straight from the sheets. Where the app needs a record the workbook does not have (a visit plan,
action tickets, notifications) it is *derived* from workbook signals with the rules below; every derived item says
which sheet / value it came from. What cannot be derived at all is listed in DATA_GAPS and returned with the payload.

  Visits         history  = each retailer's last SO visit (4. Retailer_Master: SO Last visit date / time)
                 plan     = this week's beat plan, ranked from workbook signals (days since last visit, overdue,
                            gap to Sep target, credit risk); 5 visits per working day
  Actions        one per signal per retailer: overdue payment / credit-limit breach / cheque bounce (5. Retailer
                 Credit), gap to Sep target (11. Sep projections), short supply (15. Logistics), loyalty next slab
                 (14c) and Q1 payout (14b)
  Pitch          the same signals as talking points, using the workbook's own pitch statements (14b/14c) and the
                 product push rule (Prod push logic + 2. Products "Premium version of product")
  Notifications  the high-priority actions
  Charts         visit counts per month / day and coverage per class, from the last-visit dates
"""

from __future__ import annotations

import datetime as dt
import re
from collections import Counter
from typing import Any, Optional

from app.services.excel_data import Workbook
from app.services.summary import compute_summary

MASTER = "4. Retailer_Master"
GEOGRAPHY = "1. Geography"
PRODUCTS = "2. Products"
CREDIT = "5. Retailer Credit"
ACTUAL_QTY = "6. Actual Sales qty"
ACTUAL_VALUE = "8. Actual Sales Value"
PROJECTION = "11. Sep projections on qty"
LOYALTY_Q1 = "14b Q1 loyalty payout"
LOYALTY_Q2 = "14c Q2 loyalty performance"
LOGISTICS = "15. Logistics fulfilment"

AS_OF = dt.date(2026, 9, 20)  # actuals in the workbook run to 20 Sep 2026
MONTH_END = dt.date(2026, 9, 30)
VISITS_PER_DAY = 5
SLOTS = [("10:00", "10:45"), ("11:30", "12:15"), ("13:00", "13:45"), ("15:00", "15:45"), ("16:30", "17:15")]

KIND = {
    "Hardware & Paint Store": "Hardware & Paint",
    "Tile & Sanitaryware Showroom": "Tile & Sanitaryware",
    "Cement-Steel Dealer": "Cement-Steel Dealer",
}
MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
WD3 = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

DATA_GAPS = [
    {"area": "Visit plan / beat schedule",
     "detail": "No planned visits, beat days or visit times in the workbook. This week's plan is ranked by the backend "
               "from workbook signals (days since last visit, overdue, target gap, credit risk)."},
    {"area": "Visit history",
     "detail": "Only each retailer's LAST SO visit (date + time) exists, so visit counts per month/day undercount real "
               "activity, and months before Aug 2026 show no visits."},
    {"area": "Check-in / check-out, visit duration, missed visits",
     "detail": "Not in the workbook. Recorded in the app session only."},
    {"area": "Action tickets",
     "detail": "No action tracker in the workbook. Actions are generated from workbook signals; there is no real "
               "status, assignee history, comments, outcomes or due dates (due dates are derived from priority)."},
    {"area": "Notifications",
     "detail": "None in the workbook; the app shows the high-priority generated actions."},
    {"area": "Sales AI / Huddle beat changes",
     "detail": "No record of plan changes. The 'Huddle' sheet has org-level themes (owner departments) that are not "
               "tied to a sales officer or retailer, so they are not shown as visit actions."},
    {"area": "Actions completed per month",
     "detail": "No history, so the 'Action Completion' analytics start from zero."},
    {"area": "Visits target (e.g. 30 / month) and beat targets",
     "detail": "No visit targets; 'Total Visits' shows retailers visited this month out of the officer's retailers."},
    {"area": "Product photos and store merchandise uploads",
     "detail": "No images in the workbook; the catalogue uses placeholder images."},
    {"area": "Order details",
     "detail": "No order types, plant/depot supply, street address or PIN codes. Order numbers continue from the "
               "highest Order ID in '15. Logistics fulfilment'."},
    {"area": "Retailer scheme (13. Retailer scheme)",
     "detail": "Covers only the Mehsana + Palanpur + Patan micro market; used when the officer has those retailers."},
    {"area": "Customer interaction notes",
     "detail": "No visit notes; 'Previous interaction' shows the last visit date, time and officer."},
]


class NotFound(Exception):
    pass


# ---------------------------------------------------------------- helpers

def _first(name: str) -> str:
    return str(name).split()[0]


def _initials(name: str) -> str:
    p = str(name).split()
    return (p[0][:1] + (p[-1][:1] if len(p) > 1 else p[0][1:2])).upper()


def _num(v: Any) -> float:
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) and v == v else 0.0


def inr(v: float) -> str:
    """₹86,400 · ₹1.82L · ₹2.30Cr"""
    v = float(v)
    if abs(v) >= 1e7:
        return f"₹{v / 1e7:.2f}Cr"
    if abs(v) >= 1e5:
        return f"₹{v / 1e5:.2f}L"
    return f"₹{round(v):,}"


def _date(v: Any) -> Optional[dt.date]:
    if isinstance(v, str) and re.match(r"\d{4}-\d{2}-\d{2}", v):
        return dt.date.fromisoformat(v[:10])
    return None


def _dmon(d: Optional[dt.date]) -> str:
    return f"{d.day} {MON3[d.month - 1]}" if d else "—"


def _t12(hm: str) -> str:
    h, m = map(int, hm.split(":"))
    return f"{h % 12 or 12}:{m:02d} {'PM' if h >= 12 else 'AM'}"


def _ms(d: dt.datetime) -> int:
    return int(d.timestamp() * 1000)


def _pack(pack: Any) -> tuple[float, str]:
    m = re.match(r"([\d.]+)\s*(g|kg|ml|l)$", str(pack).strip().lower())
    if not m:
        return 0.0, ""
    q, u = float(m.group(1)), m.group(2)
    return {"g": (q / 1000, "Kgs"), "kg": (q, "Kgs"), "ml": (q / 1000, "Ltrs"), "l": (q, "Ltrs")}[u]


# ---------------------------------------------------------------- workbook lookups (cached per load)

class _Lookups:
    def __init__(self, wb: Workbook) -> None:
        by_id = lambda name: {r["retailer_id"]: r for r in reversed(wb.sheets[name].rows)}  # first row wins
        self.master = by_id(MASTER)
        self.credit = by_id(CREDIT)
        self.qty = by_id(ACTUAL_QTY)
        self.value = by_id(ACTUAL_VALUE)
        self.proj = by_id(PROJECTION)
        self.logistics = by_id(LOGISTICS)
        self.loy1 = by_id(LOYALTY_Q1)
        self.loy2 = by_id(LOYALTY_Q2)
        self.geo = wb.sheets[GEOGRAPHY].df
        self.products = [
            r for r in wb.sheets[PRODUCTS].rows
            if isinstance(r.get("sku_id"), str) and isinstance(r.get("Retailer price"), (int, float))
        ]
        ords = [int(m.group(1)) for r in wb.sheets[LOGISTICS].rows
                if (m := re.match(r"ORD(\d+)$", str(r.get("Order ID") or "")))]
        self.next_order_no = (max(ords) + 1) if ords else 1


_wb_cache: dict[str, Any] = {}


def _cached(wb: Workbook, key: str, make):
    if _wb_cache.get("_loaded_at") != wb.loaded_at:
        _wb_cache.clear()
        _wb_cache["_loaded_at"] = wb.loaded_at
    if key not in _wb_cache:
        _wb_cache[key] = make()
    return _wb_cache[key]


def list_sales_officers(wb: Workbook) -> list[dict[str, Any]]:
    m = wb.sheets[MASTER].df
    out = []
    for (sid, name), g in m.groupby(["Sales officer ID", "Sales officer name"]):
        out.append({"id": sid, "name": name, "retailers": int(len(g)),
                    "asm": Counter(g["ASM Name"]).most_common(1)[0][0],
                    "territory": Counter(g["Territory"]).most_common(1)[0][0]})
    return sorted(out, key=lambda x: x["id"])


# ---------------------------------------------------------------- per-retailer facts

def _facts(L: _Lookups, r: dict[str, Any], today: dt.date) -> dict[str, Any]:
    rid = r["retailer_id"]
    cr, pj, lg = L.credit.get(rid, {}), L.proj.get(rid, {}), L.logistics.get(rid, {})
    qty, val = L.qty.get(rid, {}), L.value.get(rid, {})
    visit = _date(r.get("SO Last visit date"))
    vtime = r.get("SO Last visit time") if isinstance(r.get("SO Last visit time"), str) else None
    ach = pj.get("MTD achiev % / Total")
    skus = []
    for p in L.products:
        sid = p["sku_id"]
        skus.append({
            "sku_id": sid, "name": p["sku_name"], "category": p["category"], "pack": p.get("pack"),
            "price": p["Retailer price"], "focus": p.get("is_focus") == "Yes",
            "last_month_qty": _num(qty.get(f"Aug-26 / {sid}")),
            "sep_mtd_qty": _num(qty.get(f"Sep-26 MTD (till 20th) / {sid}")),
            "sep_target_qty": _num(pj.get(f"Sep-26 target / {sid}")),
            "gap_qty": _num(pj.get(f"Gap / {sid}")),
        })
    return {
        "rid": rid, "name": r["retailer_name"], "row": r,
        "visit": visit, "vtime": vtime,
        "days_since": (today - visit).days if visit else None,
        "outstanding": _num(cr.get("Outstanding as on 20th Sep (Due+ Overdue)")),
        "overdue": _num(cr.get("Outstanding as on 20th Sep (Overdue outside credit period)")),
        "ageing": int(_num(cr.get("Ageing (days) of Outstanding overdue outside credit limit period "))),
        "limit": _num(cr.get("Credit limit value")),
        "util": _num(cr.get("Credit limit utilisation %")),
        "bounces": int(_num(cr.get("Cheque bounces in last 6 months"))),
        "trigger": cr.get("Trigger"),
        "risk": cr.get("Risk category (High medium low no)"),
        "ach": ach if isinstance(ach, (int, float)) else None,
        "gap_total": _num(pj.get("Gap / Total")),
        "target_total": _num(pj.get("Sep-26 target / Total")),
        "rr": _num(pj.get("Sales qty RR required per day in remaning days of Sep to achieve target / Total")),
        "wd_left": int(_num(pj.get("# of working remaining"))),
        "short_sku": lg.get("SKU short supplied by distributor to retailer"),
        "short_qty": _num(lg.get("SKU order qty short supplied by distributor to retailer")),
        "order_id": lg.get("Order ID"), "order_date": _date(lg.get("Order date")), "order_qty": _num(lg.get("Total")),
        "sep_value": _num(val.get("Sep-26 MTD (till 20th) / Total")), "aug_value": _num(val.get("Aug-26 / Total")),
        "loy2": L.loy2.get(rid, {}), "loy1": L.loy1.get(rid, {}),
        "skus": skus,
    }


def _customer(f: dict[str, Any], so_name: str) -> dict[str, Any]:
    r = f["row"]
    if f["order_id"]:
        last_order = f"{f['order_id']} · {_dmon(f['order_date'])} · {int(f['order_qty'])} units"
    elif f["sep_value"]:
        last_order = f"{inr(f['sep_value'])} · Sep MTD"
    elif f["aug_value"]:
        last_order = f"{inr(f['aug_value'])} · Aug"
    else:
        last_order = "—"
    if f["overdue"] > 0:
        out_txt = f"{inr(f['overdue'])} overdue · {f['ageing']} days"
    elif f["outstanding"] > 0:
        out_txt = f"{inr(f['outstanding'])} · within credit period"
    else:
        out_txt = "—"
    lv = _dmon(f["visit"]) + (f" · {f['vtime'][:5]}" if f["visit"] and f["vtime"] else "")
    city, dist = r.get("City"), r.get("District")
    return {
        "retailer_id": f["rid"],
        "type": KIND.get(r.get("Type of Outlet"), r.get("Type of Outlet")),
        "outlet_type": r.get("Type of Outlet"), "class": r.get("Outlet Class"),
        "loc": city if not dist or dist == city else f"{city}, {dist}",
        "beat": r.get("Micro Market"), "territory": r.get("Territory"),
        "owner": r.get("Owner"), "mobile": r.get("Mobile"), "distributor": r.get("Distributor Name"),
        "new_or_old": r.get("New/old"),
        "lastOrder": last_order, "outstanding": out_txt, "lastVisit": lv,
        "prev": (f"Last visited by {so_name} on {_dmon(f['visit'])}" + (f" at {_t12(f['vtime'][:5])}" if f["vtime"] else "") + "."
                 if f["visit"] else "No SO visit recorded yet (new retailer)."),
        "credit": {"limit": f["limit"], "outstanding": f["outstanding"], "overdue": f["overdue"],
                   "ageing_days": f["ageing"], "utilisation": f["util"], "risk": f["risk"], "trigger": f["trigger"]},
        "sales": {"sep_mtd_value": f["sep_value"], "aug_value": f["aug_value"],
                  "sep_achievement": f["ach"], "sep_gap_qty": f["gap_total"]},
        "skus": f["skus"],
    }


# ---------------------------------------------------------------- signals -> actions + pitch

def _signals(f: dict[str, Any]) -> list[dict[str, Any]]:
    """Each signal becomes one action and (most) one pitch topic."""
    out: list[dict[str, Any]] = []
    risk = f["risk"] or "No risk"

    if f["overdue"] > 0:
        pri = "High" if risk == "High" else "Medium" if (risk == "Medium" or f["ageing"] > 30) else "Low"
        out.append(dict(
            kind="collection", src="Sales Intelligence", pri=pri, due=0 if pri == "High" else 2,
            title="Collect overdue payment",
            what=f"Collect {inr(f['overdue'])} overdue for {f['ageing']} days (total outstanding {inr(f['outstanding'])}, "
                 f"credit limit {inr(f['limit'])}).",
            why=f"5. Retailer Credit: {f['trigger']}. Risk category: {risk}.",
            det=f"{inr(f['overdue'])} overdue · {f['ageing']} days ageing", rec="Collect the overdue amount before the next order",
            outcome="Overdue collected, so the account can keep ordering on credit.",
            steps=["Share the outstanding statement", "Agree the payment amount", "Collect cheque / UPI reference"],
            pitch=dict(topic="Collection", why=f"{inr(f['overdue'])} is overdue for {f['ageing']} days.",
                       say="Discuss clearing the overdue amount before the next order.", sig="Collection",
                       data=f"{inr(f['overdue'])} overdue · {f['ageing']} days"),
        ))
    elif f["util"] > 1:
        out.append(dict(
            kind="credit_limit", src="Sales Intelligence", pri="Medium", due=3,
            title="Credit limit exceeded",
            what=f"Credit limit utilised {f['util'] * 100:.0f}% ({inr(f['outstanding'])} against {inr(f['limit'])}). "
                 "Collect part payment before booking new credit orders.",
            why=f"5. Retailer Credit: {f['trigger']}.", det=f"Utilisation {f['util'] * 100:.0f}%",
            rec="Collect a part payment to bring utilisation under 100%",
            outcome="Utilisation back under the credit limit.",
            steps=["Share the outstanding statement", "Collect part payment"],
            pitch=dict(topic="Credit limit", why=f"Utilisation is {f['util'] * 100:.0f}% of the limit.",
                       say="Ask for a part payment before the next credit order.", sig="Collection",
                       data=f"{inr(f['outstanding'])} of {inr(f['limit'])} limit"),
        ))
    if f["bounces"] > 0:
        out.append(dict(
            kind="bounce", src="Sales Intelligence", pri="Medium", due=3,
            title="Discuss cheque bounce",
            what=f"{f['bounces']} cheque bounce(s) in the last 6 months. Agree a safer payment mode (UPI / RTGS).",
            why="5. Retailer Credit: Cheque bounces in last 6 months.", det=f"{f['bounces']} bounce(s) in 6 months",
            rec="Move the retailer to UPI / RTGS payments", outcome="Payment mode agreed; no further bounces.",
            steps=["Discuss the bounced cheque", "Agree the payment mode"], pitch=None,
        ))

    gaps = sorted((s for s in f["skus"] if s["gap_qty"] > 0), key=lambda s: -s["gap_qty"] * s["price"])
    if f["ach"] is not None and f["ach"] < 0.8 and gaps:
        pri = "High" if f["ach"] < 0.5 else "Medium"
        top = gaps[:3]
        lst = ", ".join(f"{s['name']} {s['pack']} ({int(s['gap_qty'])})" for s in top)
        out.append(dict(
            kind="target_gap", src="Thermometer", pri=pri, due=(MONTH_END - AS_OF).days - 1,
            title=f"Close Sep target gap · {top[0]['category']}",
            what=f"{int(f['gap_total'])} units short of the Sep target. Push {lst}.",
            why=f"11. Sep projections: Sep MTD achievement {f['ach'] * 100:.0f}% of target with {f['wd_left']} working days left.",
            det=f"MTD {f['ach'] * 100:.0f}% of target · gap {int(f['gap_total'])} units",
            rec=f"Needs {f['rr']:.0f} units/day for the remaining {f['wd_left']} working days",
            outcome="Sep target reached for this retailer.",
            steps=[f"Pitch {s['name']} {s['pack']}" for s in top] + ["Take the order"],
            pitch=dict(topic=f"{top[0]['category']} · Sep target",
                       why=f"Sep MTD is {f['ach'] * 100:.0f}% of target.",
                       say=f"Recommend {int(top[0]['gap_qty'])} units of {top[0]['name']} {top[0]['pack']} to close the gap.",
                       sig="Thermometer", data=f"Gap {int(f['gap_total'])} units · {f['rr']:.0f}/day needed"),
        ))

    focus = [s for s in f["skus"] if s["focus"]]
    if focus and sum(s["sep_target_qty"] for s in focus) > 0 and sum(s["sep_mtd_qty"] for s in focus) == 0:
        out.append(dict(
            kind="product_push", src="Sales Intelligence", pri="Medium", due=5,
            title="Introduce premium Waterproofing variant",
            what="Waterproofing Compound has a Sep target here but no sales this month. Introduce the premium variant with the trial pack.",
            why="Prod push logic: Waterproofing Compound target exists for the retailer → topic 'Introduce Premium Variant'.",
            det="Focus SKU target with zero Sep MTD sales", rec="Offer the trial pack and the per-pack scheme",
            outcome="Trial order placed for the premium variant.",
            steps=["Explain the premium variant", "Offer the trial pack", "Take the trial order"],
            pitch=dict(topic="Introduce Premium Variant", why="Waterproofing Compound target exists but nothing sold in Sep.",
                       say=focus[0].get("premium") or "Pitch the premium waterproofing variant with the trial pack.",
                       sig="Product push", data=f"Sep target {int(sum(s['sep_target_qty'] for s in focus))} units · 0 sold"),
        ))

    if f["short_sku"]:
        out.append(dict(
            kind="short_supply", src="Assistant", pri="Medium", due=2,
            title=f"Resolve short supply · {f['short_sku']}",
            what=f"The distributor short-supplied {int(f['short_qty'])} units of {f['short_sku']} on order {f['order_id']} "
                 f"({_dmon(f['order_date'])}). Confirm the balance delivery date.",
            why="15. Logistics fulfilment: SKU short supplied by distributor to retailer.",
            det=f"{int(f['short_qty'])} × {f['short_sku']} short on {f['order_id']}", rec="Get the balance delivered",
            outcome="Balance quantity delivered to the retailer.",
            steps=["Call the distributor", "Confirm the delivery date", "Inform the retailer"],
            pitch=dict(topic=f"Short supply · {f['short_sku']}", why=f"{int(f['short_qty'])} units were not delivered on {f['order_id']}.",
                       say="Confirm when the balance will reach the store.", sig="Logistics",
                       data=f"{int(f['short_qty'])} units short · {_dmon(f['order_date'])}"),
        ))

    l2 = f["loy2"]
    add = l2.get("Additional qty sale required in sep to reach next slab")
    if isinstance(add, (int, float)) and add > 0 and l2.get("Pitch statement"):
        out.append(dict(
            kind="loyalty", src="Sales Intelligence", pri="Low", due=(MONTH_END - AS_OF).days - 1,
            title=f"Loyalty: push to {l2.get('Next eligible slab')} slab",
            what=f"{int(add)} more packs in Sep reach the {l2.get('Next eligible slab')} slab (reward ₹{int(_num(l2.get('Reward in next slab'))):,}). "
                 f"Q2 so far: {int(_num(l2.get('Q2 MTD packs sold actual (qty)')))} packs.",
            why=f"14c Q2 loyalty: current slab {l2.get('Current slab')}.",
            det=f"{int(add)} packs to {l2.get('Next eligible slab')}", rec="Share the loyalty pitch and take a top-up order",
            outcome=f"Retailer reaches the {l2.get('Next eligible slab')} slab.",
            steps=["Share the loyalty pitch", "Take the top-up order"],
            pitch=dict(topic=f"Loyalty · {l2.get('Next eligible slab')} slab", why=f"{int(add)} more packs needed this month.",
                       say=l2["Pitch statement"], sig="Loyalty", data=f"Reward ₹{int(_num(l2.get('Reward in next slab'))):,}"),
        ))
    l1 = f["loy1"]
    if l1.get("Payout status") in ("Approved", "Processed") and l1.get("Pitch"):
        out.append(dict(
            kind="payout", src="Sales Intelligence", pri="Low", due=5,
            title="Inform Q1 loyalty payout",
            what=l1["Pitch"], why=f"14b Q1 loyalty payout: {l1.get('Final slab')} slab, payout {l1.get('Payout status')}.",
            det=f"₹{int(_num(l1.get('Reward in final slab'))):,} · {l1.get('Payout status')}", rec="Tell the retailer when it will be settled",
            outcome="Retailer informed about the Q1 payout.", steps=["Inform the retailer"], pitch=None,
        ))
    return out


# ---------------------------------------------------------------- main builder

def build_bootstrap(wb: Workbook, so_id: str, today: dt.date) -> dict[str, Any]:
    L: _Lookups = _cached(wb, "lookups", lambda: _Lookups(wb))
    premium = next((p.get("Premium version of product") for p in L.products if p.get("Premium version of product")), None)

    master = wb.sheets[MASTER].df
    mine = master[master["Sales officer ID"].astype(str).str.upper() == so_id.upper()]
    if mine.empty:
        mine = master[master["Sales officer name"].astype(str).str.lower() == so_id.lower()]
    if mine.empty:
        raise NotFound(f"Sales officer '{so_id}' not found. See GET /api/app/sales-officers")
    so_name, so_code = mine["Sales officer name"].iloc[0], mine["Sales officer ID"].iloc[0]
    asm = Counter(mine["ASM Name"]).most_common(1)[0][0]
    terr_counts = Counter(mine["Territory"])
    home_terr = terr_counts.most_common(1)[0][0]
    geo = L.geo
    asm_terrs = sorted(set(geo.loc[geo["ASM Name"] == asm, "Territory"]), key=lambda t: (-terr_counts.get(t, 0), t))
    territories = [home_terr] + [t for t in asm_terrs if t != home_terr] + sorted(t for t in terr_counts if t not in asm_terrs)

    # team under the same ASM
    team = [(sid, nm) for (sid, nm, a), _ in Counter(zip(master["Sales officer ID"], master["Sales officer name"], master["ASM Name"])).most_common()
            if a == asm and sid != so_code]
    users = {
        "ajay": {"n": so_name, "f": _first(so_name), "r": "Sales Officer", "ini": _initials(so_name), "id": so_code},
        "rajesh": {"n": asm, "f": _first(asm), "r": "ASM", "ini": _initials(asm)},
        "si": {"n": "Sales Intelligence", "f": "Sales Intelligence", "r": "Sales Intelligence"},
        "cortex": {"n": "Sales AI", "f": "Sales AI", "r": "Sales AI"},
    }
    for key, (sid, nm) in zip(["vikram", "neha"], dict.fromkeys(team)):
        users[key] = {"n": nm, "f": _first(nm), "r": "Sales Officer", "ini": _initials(nm), "id": sid}

    rows = [r for r in wb.sheets[MASTER].rows if str(r["Sales officer ID"]) == str(so_code)]
    seen_ids: set[str] = set()
    facts = []
    for r in rows:  # the master has a few duplicated ids; keep the first
        if r["retailer_id"] in seen_ids:
            continue
        seen_ids.add(r["retailer_id"])
        facts.append(_facts(L, r, today))

    # unique display names
    names: Counter = Counter()
    for f in facts:
        names[f["name"]] += 1
        if names[f["name"]] > 1:
            f["name"] = f"{f['name']} ({f['row'].get('City')})"

    customers = {f["name"]: _customer(f, so_name) for f in facts}
    sig_by = {f["rid"]: _signals(f) for f in facts}
    for sigs in sig_by.values():
        for s in sigs:
            if s["kind"] == "product_push" and premium and s.get("pitch"):
                s["pitch"]["say"] = premium

    # ---- visits: history (last SO visit per retailer)
    visits: list[dict[str, Any]] = []
    for f in facts:
        if not f["visit"]:
            continue
        s = (f["vtime"] or "11:00:00")[:5]
        h, m = map(int, s.split(":"))
        e_dt = dt.datetime.combine(f["visit"], dt.time(h, m)) + dt.timedelta(minutes=30)
        c = customers[f["name"]]
        visits.append({
            "id": f"VH-{f['rid']}", "n": f["name"], "retailer_id": f["rid"], "kind": c["type"], "loc": c["loc"],
            "terr": c["territory"], "y": f["visit"].year, "m": f["visit"].month - 1, "d": f["visit"].day,
            "t": _t12(s), "s": s, "e": e_dt.strftime("%H:%M"), "state": "completed",
            "cin": dt.datetime.combine(f["visit"], dt.time(h, m)).strftime("%Y-%m-%dT%H:%M:%S"),
            "pitch": [], "steps": {},
        })

    # ---- visits: this week's plan, ranked from workbook signals
    def score(f: dict[str, Any]) -> float:
        ds = f["days_since"] if f["days_since"] is not None else 60
        return (ds + (30 if f["overdue"] > 0 else 0) + (20 if f["risk"] == "High" else 0)
                + min(40, f["gap_total"] * 0.3) + 5 * len(sig_by[f["rid"]]))

    def reason(f: dict[str, Any]) -> str:
        bits = [f"Not visited for {f['days_since']} days" if f["days_since"] is not None else "Never visited by SO"]
        if f["overdue"] > 0:
            bits.append(f"{inr(f['overdue'])} overdue ({f['ageing']} days)")
        if f["ach"] is not None and f["ach"] < 0.8:
            bits.append(f"Sep MTD {f['ach'] * 100:.0f}% of target")
        return " · ".join(bits[:3])

    # working days from today to Saturday of this week (on a Sunday, plan next week)
    start = today + dt.timedelta(days=1) if today.weekday() == 6 else today
    days = [start + dt.timedelta(days=i) for i in range(6 - start.weekday())]
    ranked = sorted(facts, key=lambda f: -score(f))
    planned: dict[str, str] = {}
    for i, f in enumerate(ranked[: VISITS_PER_DAY * len(days)]):
        day, (s, e) = days[i // VISITS_PER_DAY], SLOTS[i % VISITS_PER_DAY]
        c = customers[f["name"]]
        vid = f"VST-{day.strftime('%m%d')}-{i % VISITS_PER_DAY + 1}"
        planned[f["rid"]] = vid
        pitch = [dict(p["pitch"], done=False) for p in sig_by[f["rid"]] if p.get("pitch")][:4]
        visits.append({
            "id": vid, "n": f["name"], "retailer_id": f["rid"], "kind": c["type"], "loc": c["loc"],
            "terr": c["territory"], "y": day.year, "m": day.month - 1, "d": day.day, "t": _t12(s), "s": s, "e": e,
            "state": "scheduled", "pitch": pitch, "steps": {},
            "cx": {"type": "added", "why": f"Planned from workbook signals: {reason(f)}."},
        })

    # ---- actions
    created = _ms(dt.datetime.combine(AS_OF, dt.time(18, 0)))
    order = {"High": 0, "Medium": 1, "Low": 2}
    all_sigs = sorted(((f, s) for f in facts for s in sig_by[f["rid"]]), key=lambda x: (order[x[1]["pri"]], x[1]["due"], x[0]["name"]))
    actions = []
    for n, (f, s) in enumerate(all_sigs, start=1):
        tk = f"TKT-{3000 + n}"
        a = {
            "id": tk, "tk": tk, "title": s["title"], "outlet": f["name"], "retailer_id": f["rid"],
            "terr": f["row"].get("Territory"), "src": s["src"], "pri": s["pri"], "due": s["due"], "st": "owner",
            "to": "ajay", "by": "si", "created": created, "isNew": False, "what": s["what"], "why": s["why"],
            "det": s["det"], "rec": s["rec"], "reason": s["det"], "outcomeExp": s["outcome"], "signal": s["kind"],
            "steps": [{"t": t, "done": False} for t in s["steps"]],
            "acts": [{"a": "si", "t": "assigned", "ts": created}],
        }
        if f["rid"] in planned:
            a["visitId"] = planned[f["rid"]]
        actions.append(a)

    notifications = [{"to": "ajay", "k": "new", "aid": a["id"], "ts": a["created"], "read": False}
                     for a in actions if a["pri"] == "High"][:3]

    # ---- KPIs
    my_sum = _cached(wb, f"sum:{so_name}", lambda: compute_summary(wb, {"sales_officer": so_name}))
    all_sum = _cached(wb, "sum:all", lambda: compute_summary(wb))
    ranked_so = sorted((x for x in all_sum["by_sales_officer"] if x["sep_achievement_pct"] is not None),
                       key=lambda x: -x["sep_achievement_pct"])
    rank = next((i + 1 for i, x in enumerate(ranked_so) if x["name"] == so_name), None)
    s = my_sum["sales"]
    this_month = [f for f in facts if f["visit"] and f["visit"].month == today.month and f["visit"].year == today.year]
    home = {
        "visits_done": len(this_month), "visits_target": len(facts),
        "achievement_value": s["sep_mtd_actual_value"], "target_value": s["sep_target_value"],
        "achievement_pct": s["sep_achievement_pct"], "mtd_target_value": s["sep_mtd_target_value"],
        "rank": rank, "rank_of": len(ranked_so),
    }
    cats = sorted(my_sum["by_category"], key=lambda c: -c["sep_target_value"])
    dashboard = {"categories": [{"name": c["category"], "actual_value": c["sep_mtd_actual_value"],
                                 "target_value": c["sep_target_value"], "achievement_pct": c["sep_achievement_pct"]}
                                for c in cats[:3]]}

    acc: dict[str, list[int]] = {"All Outlets": [int((mine["Outlet Class"] == k).sum()) for k in "ABC"]}
    for t, g in mine.groupby("Type of Outlet"):
        acc[KIND.get(t, t)] = [int((g["Outlet Class"] == k).sum()) for k in "ABC"]

    # ---- charts from last-visit dates
    hist = [v for v in visits if v["state"] == "completed"]
    months = list(range(0, today.month))
    MON = [[MON3[m].upper(), sum(1 for v in hist if v["m"] == m and v["y"] == today.year)] for m in months]
    DAYS = {}
    for m in months:
        n_days = (dt.date(today.year, m + 2, 1) - dt.timedelta(days=1)).day if m < 11 else 31
        cnt = Counter(v["d"] for v in hist if v["m"] == m and v["y"] == today.year)
        if cnt:
            DAYS[str(m)] = [cnt.get(d, 0) for d in range(1, n_days + 1)]
    MT, VCB = [], []
    vmonth = {v["id"]: v["m"] for v in visits}
    for m in months:
        l = [a for a in actions if a.get("visitId") and vmonth.get(a["visitId"]) == m]
        MT.append([len(l), 0, 0, len(l)])
        VCB.append(0)
    cls = {f["rid"]: f["row"].get("Outlet Class") for f in facts}
    COV = []
    for m in months:
        vis = {v["retailer_id"] for v in hist if v["m"] == m and v["y"] == today.year}
        if vis:
            COV.append([MON3[m].upper(), [len(facts) - len(vis)] + [sum(1 for r in vis if cls[r] == k) for k in "ABC"] + [0]])
    uncovered = sum(1 for f in facts if f["days_since"] is None or f["days_since"] > 30)
    coverage = {"chips": [["Class A", acc["All Outlets"][0]], ["Class B", acc["All Outlets"][1]],
                          ["Class C", acc["All Outlets"][2]], ["Not visited 30d", uncovered]],
                "months": COV}

    wdays = Counter(f["visit"].weekday() for f in facts if f["visit"])
    beat = {"name": f"{home_terr} · {Counter(mine['Micro Market']).most_common(1)[0][0]}",
            "days": " · ".join(WD3[d] for d in sorted(d for d, _ in wdays.most_common(3))),
            "retailers": len(facts), "planned": len(facts), "doneBase": 0, "missedBase": 0}

    geo_tree: dict[str, dict[str, list[str]]] = {}
    for r in geo.to_dict("records"):
        lst = geo_tree.setdefault(r["state"], {}).setdefault(r["District"], [])
        if r["City"] not in lst:
            lst.append(r["City"])

    catalogue: dict[str, list[dict[str, Any]]] = {}
    products = []
    for p in L.products:
        q, unit = _pack(p.get("pack"))
        catalogue.setdefault(p["category"], []).append({"sku_id": p["sku_id"], "name": p["sku_name"], "pack": p.get("pack"),
                                                        "price": p["Retailer price"], "usp": p.get("USP"),
                                                        "focus": p.get("is_focus") == "Yes"})
        products.append([f"{p['sku_name']} · {p.get('pack')}", p["Retailer price"], q, unit])

    return {
        "today": today.isoformat(),
        "data_as_of": AS_OF.isoformat(),
        "sales_officer": {"id": so_code, "name": so_name, "asm": asm, "home_territory": home_terr},
        "users": users,
        "territories": territories,
        "home_territory": home_terr,
        "home": home,
        "beat": beat,
        "visits": visits,
        "actions": actions,
        "notifications": notifications,
        "customers": customers,
        "ai_visit": None,
        "products": products,
        "catalogue": [{"category": k, "items": v} for k, v in catalogue.items()],
        "accounts": sorted(customers),
        "accounts_chart": {"tiers": ["Class A", "Class B", "Class C"], "by_type": acc},
        "coverage": coverage,
        "dashboard": dashboard,
        "charts": {"MON": MON, "DAILY": [], "DAYS": DAYS, "MT": MT, "VCB": VCB},
        "geo": geo_tree,
        "next_order_no": L.next_order_no,
        "data_gaps": DATA_GAPS,
    }
