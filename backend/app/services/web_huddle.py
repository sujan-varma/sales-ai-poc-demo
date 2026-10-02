"""Huddle agent pages (Intel Hub, Meeting Repository, series and meeting detail) for the web app: the `huddle`
module of GET /api/web/bootstrap, built from the workbook's 'Huddle' sheet for one ASM's team.

What the sheet has, per theme: owner department and designation, the theme, the number of action items, the huddle
session (Morning / Evening), a verbatim from the conversation and its urgency. It has no dates, attendance, durations
or decisions. So:

  Meetings      themes owned by Sales are the team's recurring Morning and Evening huddles; themes owned by other
                departments are ad-hoc cross-functional calls, one per department. Both are laid out across the
                last seven working days to the data date, in sheet order (HUDDLE_GAPS says so on the page).
  Actions       one per theme, owned by its designation, carrying the sheet's action-item count; due by urgency
                (High 2 days, Medium 5, Low 10). Assigning one in the app makes it a Tracker ticket (tracker.json),
                and its status comes from there.
  Blockers      High urgency = systemic blocker; Medium owned outside the meeting's department = incomplete
                discussion (it needs another team). Resolved when its action is completed.
  Evidence      each theme is checked against the region's workbook signals (credit, Sep targets, short supply,
                market share, distributor trend, loyalty): a match is shown as evidence and raises confidence.
  Quality score rule-based, from the sheet: issue clarity, ownership, action coverage, urgency handling and evidence.
"""

from __future__ import annotations

import copy
import datetime as dt
import re
from collections import Counter, defaultdict
from typing import Any, Optional

from app.services import tracker as tracker_store
from app.services.excel_data import Workbook

AS_OF = dt.date(2026, 9, 20)
TODAY = dt.date(2026, 9, 21)
CAT_ORDER = ["IWC", "Repair Polymer", "Acrylic Primer", "Waterproofing Compound"]
DUE_DAYS = {"High": 2, "Medium": 5, "Low": 10}
SESSION = {"Morning": ("09:30", 30), "Evening": ("18:30", 30)}
ADHOC_TIME = ("15:00", 45)

HUDDLE_GAPS = [
    {"area": "Huddle meetings, dates and attendance",
     "detail": "The 'Huddle' sheet lists themes with owner, urgency, session, verbatim and action count, but no meeting dates, "
               "attendance, durations or decisions. Sales themes are shown as the team's Morning and Evening huddles and other "
               "departments' themes as ad-hoc calls, laid out over the last seven working days to 20 Sep. Durations are the "
               "scheduled slot; attendance and hygiene are not recorded."},
    {"area": "Huddle quality score and tone",
     "detail": "Rule-based from the sheet: issue clarity, ownership, action coverage, urgency handling and workbook evidence. "
               "Tone follows the urgency mix of the themes discussed; there is no transcript sentiment."},
]

TEAM_OF = [("Sales", "Sales Team"), ("Supply chain", "Supply Chain"), ("Customer Service", "Customer Service"),
           ("Trade Marketing", "Marketing Team"), ("Marketing", "Marketing Team"), ("Innovation", "Marketing Team"),
           ("HR", "People & Systems"), ("IT", "People & Systems")]
CATEGORY_RULES = [
    ("competition", r"competitor"),
    ("pricing", r"price|pricing|rate|scheme|credit|bundle|promo"),
    ("supply", r"stock|dispatch|delivery|depot|transporter|shipment|pickup|pre-position"),
    ("product", r"product|sku|pack|primer|compound|polymer|quality|complaint|crack|coating"),
    ("channel_feedback", r"distributor|contractor|mason|retailer|dealer|applicator"),
    ("people", r"resign|vacant|morale|headcount|joiner|training|exits|backfill|asm position"),
    ("systems", r"crm|app|system|sync"),
]
# SalesPulze's Capability Building criteria (name, weight %, what in a huddle theme covers it)
CB_CRITERIA = [
    ("Action Item Quality and Decisions Made", 15, None),
    ("BDE Performance Effectiveness", 25, r"applicator|mason|contractor|influencer|loyalty|bde|training|demo|new joiner"),
    ("Beat Plan Adherence", 25, r"beat|visit|coverage|target|plan|offtake|stock|range"),
    ("Reach Expansion Review", 25, r"new distributor|appointment|under-served|reach|headcount|territory|festive|stock build|pre-position"),
    ("Throughput & Revenue", 5, r"target|sales|order|sell-through|price|scheme|competitor|demand|campaign"),
    ("Throughput & Revenue Recovery", 5, r"credit|payment|pip|dead stock|complaint|switch|retention|short-shipment|delay|discrepancy"),
]
PRODUCT_RULES = [("IWC", r"\biwc\b|integral waterproof"), ("Repair Polymer", r"polymer"), ("Acrylic Primer", r"primer"),
                 ("Waterproofing Compound", r"waterproofing compound|compound|coating|crack")]
SEGMENT_RULES = [("Distributor", r"distributor"), ("Contractor", r"contractor"), ("Mason / Applicator", r"mason|applicator"),
                 ("Retailer", r"retailer|dealer|shop|counter"), ("Depot & Logistics", r"depot|transporter|dispatch|delivery|shipment")]
FUNCTION_OF = [("Sales", "Sales"), ("HR", "HR"), ("Marketing", "Marketing"), ("Trade Marketing", "Marketing"), ("Innovation", "Marketing"),
               ("Supply chain", "Supply Chain Management"), ("Finance", "Finance")]
FUNCTIONS = ["Sales", "Finance", "HR", "Marketing", "Supply Chain Management", "Others"]


def _function(dept: str) -> str:
    return next((f for k, f in FUNCTION_OF if dept.lower().startswith(k.lower())), "Others")


def _band(score: Optional[float]) -> str:
    if score is None:
        return "nodata"
    return "healthy" if score >= 80 else "moderate" if score >= 60 else "attention" if score >= 40 else "critical"


CATEGORY_LABEL = {"pricing": "Pricing", "product": "Product", "competition": "Competition", "channel_feedback": "Channel Feedback",
                  "supply": "Supply", "people": "People", "systems": "Systems"}


def _n(v: Any) -> float:
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) and v == v else 0.0


def inr(v: float) -> str:
    if abs(v) >= 1e7:
        return f"₹{v / 1e7:.2f} Cr"
    if abs(v) >= 1e5:
        return f"₹{v / 1e5:.1f} L"
    return f"₹{round(v):,}"


def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def _team(dept: str) -> str:
    return next((t for k, t in TEAM_OF if dept.lower().startswith(k.lower())), "Sales Team")


def _category(theme: str) -> str:
    t = theme.lower()
    return next((c for c, rx in CATEGORY_RULES if re.search(rx, t)), "channel_feedback")


def _dm(d: dt.date) -> str:
    return f"{d.day} {d.strftime('%b')}"


def build(wb: Workbook, org: Any, ctx: dict[str, Any]) -> dict[str, Any]:
    A: str = ctx["A"]
    region = org.region_of_asm[A]
    terrs = [t for t in org.terr_by_asm[A] if org.by_terr.get(t)]
    my = org.by_asm[A]
    team = [so for so, _ in Counter(f["so"] for f in my).most_common()]
    rows = [r for r in org.huddle]  # rows with a number and a theme

    # ---- the region's workbook signals, to check each theme against
    od = [f for f in my if f["overdue"] > 0]
    shorts = [f for f in my if f["short_sku"] and f["order_date"] and f["order_date"] >= dt.date(2026, 9, 1)]
    ach = {t: (sum(f["sep"] for f in my if f["terr"] == t), sum(f["sep_mtd_t"] for f in my if f["terr"] == t)) for t in terrs}
    worst = min(terrs, key=lambda t: ach[t][0] / ach[t][1] if ach[t][1] else 1) if terrs else None
    mk = org.market.get((org.micro_of_asm[A], "Overall"))
    comp = None
    if mk and _n(mk.get("Market Size (LPM)")):
        cols = {k: _n(v) for k, v in mk.items() if k.startswith("Competitor")}
        name, val = max(cols.items(), key=lambda kv: kv[1])
        comp = (name.replace(" (LPM)", "").replace("_", " "), val / _n(mk["Market Size (LPM)"]) * 100, _n(mk["Client (LPM)"]) / _n(mk["Market Size (LPM)"]) * 100)
    cat_ach = {c: (sum(f["cy"][c][5] for f in my), sum(f["tgt"][c][5] for f in my) * AS_OF.day / 30) for c in CAT_ORDER}
    loyal = [f for f in my if isinstance(f["loy2"].get("Additional qty sale required in sep to reach next slab"), (int, float))
             and f["loy2"]["Additional qty sale required in sep to reach next slab"] > 0]
    falling = []
    for r in wb.sheets["MAP_Distributor Assessment"].rows:
        if r.get("ASM Name") == A and _n(r.get("Aug'26 sales")) < _n(r.get("June'26 sales")):
            falling.append((re.sub(r"\s*-\s*BSD$", "", str(r["Distributor Name"])), _n(r.get("June'26 sales")), _n(r.get("Aug'26 sales"))))

    def evidence(theme: str) -> Optional[dict[str, str]]:
        t = theme.lower()
        if "competitor" in t and comp:
            return {"text": f"{comp[0]} holds {comp[1]:.0f}% of the {org.micro_of_asm[A]} market against the company's {comp[2]:.0f}%.", "source": "Data 11 - Market Size"}
        if re.search(r"stock-out|stock out|short|delivery|dispatch|depot|transporter", t) and shorts:
            top = Counter(f["short_sku"] for f in shorts).most_common(1)[0][0]
            return {"text": f"{len(shorts)} September orders in {region} were short-supplied, most often {top}.", "source": "15. Logistics fulfilment"}
        if "target" in t and worst:
            a, b = ach[worst]
            return {"text": f"{worst} is at {a / b * 100:.0f}% of its phased September target ({inr(a)} of {inr(b)}).", "source": "8. Actual vs 9. Target Sales Value"}
        if re.search(r"credit terms|credit period|payment|overdue", t) and od:
            return {"text": f"{inr(sum(f['overdue'] for f in od))} is overdue at {len(od)} retailers in {region}; the oldest is {max(f['ageing'] for f in od)} days.", "source": "5. Retailer Credit"}
        if re.search(r"pip|sub-target|offtake", t) and falling:
            n_, j, a = max(falling, key=lambda x: x[1] - x[2])
            return {"text": f"{n_}'s sales fell from {inr(j)} in June to {inr(a)} in August.", "source": "MAP_Distributor Assessment"}
        if "primer" in t and cat_ach["Acrylic Primer"][1]:
            a, b = cat_ach["Acrylic Primer"]
            return {"text": f"Acrylic Primer is at {a / b * 100:.0f}% of its phased September target in {region}.", "source": "8. Actual vs 9. Target Sales Value"}
        if re.search(r"loyalty|slab|current scheme", t) and loyal:
            return {"text": f"{len(loyal)} retailers in {region} are within reach of their next loyalty slab this month.", "source": "14c Q2 loyalty performance"}
        if re.search(r"headcount|understaffed|vacant|resign", t) and team:
            return {"text": f"{len(team)} sales officers cover {len(my)} retailers in {region} ({len(my) // max(1, len(team))} each on average).", "source": "4. Retailer_Master"}
        return None

    # ---- themes → meetings
    # the last seven working days (Mon–Sat) up to the data date
    days, d = [], AS_OF
    while len(days) < 7:
        if d.weekday() != 6:
            days.append(d)
        d -= dt.timedelta(days=1)
    days.sort()

    themes = []
    for r in rows:
        num = int(_n(r.get("#")))
        dept = str(r.get("Owner department") or "Sales").strip()
        theme = str(r["Theme"]).strip()
        urg = str(r.get("Urgency") or "Medium").strip()
        themes.append({"n": num, "dept": dept, "owner": str(r.get("Owner department designation") or dept).strip(), "theme": theme,
                       "actions": int(_n(r.get("# of action items"))), "session": str(r.get("Huddle") or "Morning"),
                       "quote": str(r.get("Convo verbatim") or "").strip().strip('"“”'), "urgency": urg if urg in DUE_DAYS else "Medium",
                       "team": _team(dept), "category": _category(theme), "evidence": evidence(theme), "function": _function(dept),
                       "products": [p for p, rx in PRODUCT_RULES if re.search(rx, theme.lower())],
                       "segments": [g for g, rx in SEGMENT_RULES if re.search(rx, theme.lower())]})

    recurring = {"Morning": [], "Evening": []}
    adhoc: dict[str, list] = defaultdict(list)
    for t in themes:
        if t["dept"].lower().startswith("sales"):
            recurring["Evening" if t["session"].startswith("Evening") else "Morning"].append(t)
        else:
            adhoc[t["team"] if t["team"] != "Marketing Team" else t["dept"].split("/")[0]].append(t)

    meetings: dict[str, dict[str, Any]] = {}
    series: list[dict[str, Any]] = []

    def blockers_for(ts: list[dict], dept: str) -> list[dict[str, Any]]:
        out = []
        for t in ts:
            if t["urgency"] == "High":
                out.append({"id": f"blk-{t['n']}", "theme": t["n"], "description": t["theme"], "type": "systemic", "severity": "high", "resolved": False,
                            "owner": t["owner"], "evidence": t["quote"]})
            elif t["urgency"] == "Medium" and not t["dept"].lower().startswith(dept.lower()[:5]):
                out.append({"id": f"blk-{t['n']}", "theme": t["n"], "description": t["theme"], "type": "gap", "severity": "medium", "resolved": False,
                            "owner": t["owner"], "evidence": t["quote"]})
        return out

    def quality(ts: list[dict]) -> dict[str, Any]:
        """Capability Building: how well the meeting's themes cover each area (0, 6, 8 or 10 by how many themes do)."""
        rows = []
        for name, w, rx in CB_CRITERIA:
            if rx is None:
                hit = [t for t in ts if t["owner"] and t["actions"] >= 3]
                ev = [f"{t['owner']} owns {t['actions']} action items: {t['theme']}" for t in hit]
            else:
                hit = [t for t in ts if re.search(rx, t["theme"].lower())]
                ev = [t["theme"] for t in hit]
            sc = 0 if not hit else 6 if len(hit) == 1 else 8 if len(hit) == 2 else 10
            rows.append({"criteria": name, "weight": w, "score": sc * 10, "contribution": round(w * sc / 10, 1), "evidence": ev or ["No evidence"]})
        return {"final": round(sum(r["contribution"] for r in rows)), "rows": rows}

    def tone(ts: list[dict]) -> dict[str, Any]:
        high = sum(1 for t in ts if t["urgency"] == "High") / max(1, len(ts))
        score = round((1 - high) * 70 + 15)
        return {"label": "negative" if high >= 0.5 else "neutral" if high >= 0.2 else "positive", "score": score}

    def make_meeting(mid: str, sid: str, name: str, day: dt.date, time: str, dur: int, ts: list[dict], kind: str, dept: str, attendees: list[dict]) -> dict[str, Any]:
        q = quality(ts)
        bl = blockers_for(ts, dept)
        actions = [{"id": f"hud-{t['n']}", "theme": t["n"], "description": t["theme"], "owner": t["owner"], "count": t["actions"],
                    "priority": t["urgency"], "due": (day + dt.timedelta(days=DUE_DAYS[t["urgency"]])).isoformat(), "status": "pending",
                    "assignee": None, "ticket": None, "evidence": t["quote"]} for t in ts]
        highs = sum(1 for b in bl if b["type"] == "systemic")
        m = {
            "id": mid, "seriesId": sid, "name": name, "date": day.isoformat(), "time": time, "duration": dur, "kind": kind,
            "organiser": A, "zone": region, "department": dept, "attendees": attendees,
            "topics": [t["theme"] for t in ts], "themes": [t["n"] for t in ts],
            "summary": (f"{len(ts)} theme{'s' if len(ts) != 1 else ''} raised: " + "; ".join(t["theme"].split(" — ")[0] for t in ts) + ". "
                        + (f"{highs} need{'s' if highs == 1 else ''} urgent follow-up." if highs else "None is urgent.")) if ts else "No themes recorded for this huddle.",
            "transcript": [{"t": f"{time[:2]}:{int(time[3:]) + 3 * i:02d}", "speaker": "Field team" if kind == "Recurring" else t["owner"], "text": t["quote"],
                            "gist": t["theme"], "theme": t["n"]} for i, t in enumerate(ts)],
            "actions": actions, "blockers": bl, "quality": q, "score": q["final"], "tone": tone(ts),
            "signals": [{"title": t["theme"], "description": t["evidence"]["text"], "source": t["evidence"]["source"], "theme": t["n"],
                         "confidence": 0.85 if t["urgency"] != "Low" else 0.7} for t in ts if t["evidence"]],
            "health": "critical" if highs >= 2 else "attention" if highs == 1 else "warning" if bl else "healthy",
            "products": sorted({p for t in ts for p in t["products"]}), "segments": sorted({g for t in ts for g in t["segments"]}),
            "functions": {f"hud-{t['n']}": t["function"] for t in ts},
            # share of the meeting's themes the workbook's sales data corroborates
            "confidencePct": round(100 * sum(1 for t in ts if t["evidence"]) / len(ts)) if ts else 0,
            "confidence": "High" if sum(1 for t in ts if t["evidence"]) * 2 >= len(ts) and ts else "Medium",
        }
        meetings[mid] = m
        return m

    def visits_on(so: str, day: dt.date) -> int:
        return sum(1 for f in my if f["so"] == so and f["visit"] == day)

    roster = lambda day: [{"name": A, "role": f"ASM · {region}", "visits": None}] + [{"name": so, "role": "Sales Officer", "visits": visits_on(so, day)} for so in team]
    for sess, ts in recurring.items():
        sid = f"ser-{sess.lower()}"
        time, dur = SESSION[sess]
        ms = []
        for k, day in enumerate(days):
            mine = [t for i, t in enumerate(ts) if i % len(days) == k]
            ms.append(make_meeting(f"HUD-{day.strftime('%m%d')}-{'AM' if sess == 'Morning' else 'PM'}", sid, f"{sess} huddle · {_dm(day)}", day, time, dur,
                                   mine, "Recurring", "Sales", roster(day))["id"])
        series.append({"id": sid, "name": f"{sess} huddle · {region}", "type": "Daily", "kind": "Recurring", "level": "Area", "zone": region,
                       "area": "All territories", "organiser": A, "department": "Sales", "duration": dur, "time": time,
                       "attendees": [A] + team, "meetings": ms})
    for k, (dept, ts) in enumerate(sorted(adhoc.items(), key=lambda kv: -len(kv[1]))):
        day = days[(k * 2 + 1) % len(days)]
        sid = f"adhoc-{_slug(dept)}"
        owners = list(dict.fromkeys(t["owner"] for t in ts))
        m = make_meeting(f"XFN-{day.strftime('%m%d')}-{_slug(dept)[:4].upper()}", sid, f"{dept} escalation call", day, ADHOC_TIME[0], ADHOC_TIME[1], ts, "Ad-hoc", dept,
                         [{"name": A, "role": f"ASM · {region}", "visits": None}] + [{"name": o, "role": dept, "visits": None} for o in owners])
        series.append({"id": sid, "name": m["name"], "type": "Ad-hoc", "kind": "Ad-hoc", "level": "Area", "zone": region, "area": dept,
                       "organiser": A, "department": dept, "duration": ADHOC_TIME[1], "time": ADHOC_TIME[0], "attendees": [a["name"] for a in m["attendees"]], "meetings": [m["id"]]})

    # ---- next meetings: the recurring cadence continues on the next working day
    nxt = TODAY if TODAY.weekday() != 6 else TODAY + dt.timedelta(days=1)
    upcoming = [nxt + dt.timedelta(days=i) for i in range(7) if (nxt + dt.timedelta(days=i)).weekday() != 6][:6]
    NEXT = {s["id"]: {"date": nxt.isoformat(), "time": s["time"], "attendees": len(s["attendees"])} for s in series if s["kind"] == "Recurring"}
    COMPLIANCE = {"happened": len(meetings), "future": 2 * len(upcoming), "cancelled": 0}

    # ---- Intel Hub: cross-functional insights by team and category
    INSIGHTS: dict[str, dict[str, list]] = defaultdict(lambda: defaultdict(list))
    meeting_of = {n: m["id"] for m in meetings.values() for n in m["themes"]}
    for t in themes:
        conf = 0.85 if t["evidence"] else 0.6 if t["urgency"] == "High" else 0.4
        INSIGHTS[t["team"]][t["category"]].append({
            "title": t["theme"], "description": (t["evidence"]["text"] + " " if t["evidence"] else "") + f"Raised in {meetings[meeting_of[t['n']]]['name']}; owner {t['owner']}.",
            "confidence": conf, "meetingId": meeting_of[t["n"]], "urgency": t["urgency"], "source": t["evidence"]["source"] if t["evidence"] else "Huddle sheet"})
    INSIGHTS = {k: dict(v) for k, v in INSIGHTS.items()}

    TERRITORIES = []
    for t in terrs:
        fs = [f for f in my if f["terr"] == t]
        a, b = ach[t]
        odt = [f for f in fs if f["overdue"] > 0]
        issue = f"{a / b * 100:.0f}% of phased Sep target" + (f" · {inr(sum(f['overdue'] for f in odt))} overdue" if odt else "") if b else "No Sep target"
        TERRITORIES.append({"name": t, "retailers": len(fs), "issue": issue, "officers": sorted({f["so"] for f in fs})})

    # ---- Field Operations Health: every region (level 2), territory (3) and sales officer (4), scored on the workbook
    huddle_quality = sum(1 for t in themes if t["owner"] and t["actions"] >= 3) / max(1, len(themes)) * 100
    so_meetings = sum(1 for m in meetings.values() if m["kind"] == "Recurring")

    def infl(asm: str, terr: Optional[str]) -> Optional[float]:
        rows_ = [i for i in org.influencer if i["asm"] == asm and (terr is None or str(i["pos"]).replace("BDE-", "") == terr)]
        tgt = sum(_n((i["nums"] + [0] * 6)[3]) for i in rows_)
        return min(100.0, sum(_n((i["nums"] + [0] * 6)[4]) for i in rows_) / tgt * 100) if tgt else None

    def entity(eid: str, level: int, name: str, parent: Optional[str], fs: list[dict], asm: str, terr: Optional[str], meetings_n: int) -> dict[str, Any]:
        n = len(fs) or 1
        mtd = sum(f["sep_mtd_t"] for f in fs)
        outs = sum(f["outstanding"] for f in fs)
        parts = {
            "Action Item Quality and Decisions Made": huddle_quality if meetings_n else None,
            "BDE Performance Effectiveness": infl(asm, terr) if level < 4 else None,
            "Beat Plan Adherence": sum(1 for f in fs if f["visit"] and (AS_OF - f["visit"]).days <= 30) / n * 100,
            "Reach Expansion Review": sum(1 for f in fs if f["sep"] > 0) / n * 100,
            "Throughput & Revenue": min(100.0, sum(f["sep"] for f in fs) / mtd * 100) if mtd else None,
            "Throughput & Revenue Recovery": (1 - sum(f["overdue"] for f in fs) / outs) * 100 if outs else 100.0,
        }
        w = {c: wt for c, wt, _ in CB_CRITERIA}
        have = {c: v for c, v in parts.items() if v is not None}
        score = round(sum(v * w[c] for c, v in have.items()) / sum(w[c] for c in have)) if have else None
        return {"id": eid, "level": level, "name": name, "parent": parent, "asm": asm, "retailers": len(fs), "meetings": meetings_n,
                "score": score, "band": _band(score), "parts": {c: (round(v) if v is not None else None) for c, v in parts.items()}}

    ENTITIES = []
    for a in org.asms:
        fs_a = org.by_asm[a]
        rid = f"r-{_slug(a)}"
        ENTITIES.append(entity(rid, 2, org.region_of_asm[a], None, fs_a, a, None, len(meetings) if a == A else 0))
        for t in [t for t in org.terr_by_asm[a] if org.by_terr.get(t)]:
            fs_t = [f for f in org.by_terr[t] if f["asm"] == a]
            if not fs_t:
                continue
            ENTITIES.append(entity(f"t-{_slug(a)}-{_slug(t)}", 3, t, rid, fs_t, a, t, len(meetings) if a == A else 0))
        for so in sorted({f["so"] for f in fs_a}):
            fs_s = [f for f in fs_a if f["so"] == so]
            ENTITIES.append(entity(f"s-{_slug(a)}-{_slug(so)}", 4, so, rid, fs_s, a, None, so_meetings if a == A and so in team else 0))

    days_series = sorted({m["date"] for m in meetings.values()})
    TREND = [{"date": d, "capability": round(sum(m["score"] for m in meetings.values() if m["date"] == d) / max(1, sum(1 for m in meetings.values() if m["date"] == d)))} for d in days_series]

    return {"huddle": {
        "ENTITIES": ENTITIES, "CB_CRITERIA": [{"name": c, "weight": w} for c, w, _ in CB_CRITERIA], "TREND": TREND,
        "PRODUCTS": [p for p, _ in PRODUCT_RULES], "SEGMENTS": [g for g, _ in SEGMENT_RULES], "FUNCTIONS": FUNCTIONS,
        "STATE": org.state, "HOME_REGION": f"r-{_slug(A)}",
        "LABELS": {"asm": A, "region": region, "head": org.rsm, "team": team, "territories": terrs, "dataDate": _dm(AS_OF), "today": TODAY.isoformat()},
        "SERIES": series, "MEETINGS": meetings, "NEXT": NEXT, "COMPLIANCE": COMPLIANCE, "INSIGHTS": INSIGHTS,
        "CATEGORY_LABEL": CATEGORY_LABEL, "TERRITORIES": TERRITORIES, "data_gaps": HUDDLE_GAPS,
    }}


def overlay(data: dict[str, Any]) -> dict[str, Any]:
    """Actions assigned from the huddle pages (tracker.json, source_id = the action id) carry their real owner and status;
    a completed action resolves its blocker."""
    hd = data.get("huddle")
    if not hd:
        return data
    A = hd["LABELS"]["asm"]
    stored = {a["source_id"]: a for a in tracker_store.get_store().snapshot()["actions"] if a["assigned_by"]["name"] == A and a["source_id"].startswith("hud-")}
    if not stored:
        return data
    out = dict(data)
    hd = out["huddle"] = dict(hd)
    hd["MEETINGS"] = copy.deepcopy(hd["MEETINGS"])
    for m in hd["MEETINGS"].values():
        for x in m["actions"]:
            a = stored.get(x["id"])
            if not a:
                continue
            x["assignee"] = a["assignee"]["name"]
            x["ticket"] = a["id"]
            x["status"] = "completed" if a["st"] == "closed" else "in_progress" if a["st"] == "progress" else "pending"
            x["due"] = a["due_date"]
        done = {x["theme"] for x in m["actions"] if x["status"] == "completed"}
        for b in m["blockers"]:
            b["resolved"] = b["theme"] in done
    return out
