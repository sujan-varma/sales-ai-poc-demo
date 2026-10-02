"""Action assignment, status updates and the notification inbox, kept in a JSON file (data/tracker.json).

The Excel workbook stays read-only. What the workbook has no record of (who an action was assigned to, its status,
updates and notifications) is stored here, and every write is checked against the workbook first:

  assign        the ASM assigns an action in the web app (Suggested by Sales AI / Needs an owner). The assignee must
                be a sales officer in 4. Retailer_Master who serves this ASM's retailers, and the retailer (if any)
                must exist there. The action's details come from the same workbook signals the mobile app uses
                (field_app._signals), so both apps describe it the same way. The officer gets a notification + push.
  events        the officer starts / updates / completes an action in the mobile app. Works for assigned actions
                and for the ones the app derives from the workbook (stored as overrides). The ASM gets a notification.
  reminders     assigned actions due today or overdue send one reminder per action per day.
  bootstrap     GET /api/app/bootstrap merges all of the above into the officer's actions and notifications.

Users: a sales officer is their id (SO018); an ASM is "asm:<name>" (asm:Raman).
"""

from __future__ import annotations

import datetime as dt
import json
import logging
import re
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator, Optional

from app.config import get_settings
from app.services import field_app, push
from app.services.excel_data import Workbook

log = logging.getLogger(__name__)

SOURCE_LABEL = {"thermometer": "Thermometer", "map": "Market Action Plan", "pitch": "Pitch", "huddle": "Huddle"}
# web_data signal kinds -> field_app signal kinds (same workbook rule, two names)
APP_KIND = {"collection": "collection", "credit": "credit_limit", "gap": "target_gap", "short": "short_supply", "loyalty": "loyalty"}
PRI_DUE = {"High": 1, "Medium": 3, "Low": 5}
EVENT_STATUS = {"started": "progress", "complete": "closed"}
EVENT_VERB = {"started": "started", "comment": "added an update on", "complete": "completed"}
NOTIF_KIND = {"started": "started", "comment": "comment", "complete": "completed"}
MAX_NOTIFICATIONS = 2000  # oldest are dropped beyond this


class TrackerError(Exception):
    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status


def _ms(t: Optional[dt.datetime] = None) -> int:
    return int((t or dt.datetime.now().astimezone()).timestamp() * 1000)


def asm_user(name: str) -> str:
    return f"asm:{name}"


# ---------------------------------------------------------------- store

class TrackerStore:
    EMPTY = {"seq": 1000, "actions": [], "notifications": [], "overrides": {}, "read": {}, "reminders": {}}

    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = threading.RLock()

    def _read(self) -> dict[str, Any]:
        state = json.loads(json.dumps(self.EMPTY))
        if self.path.exists():
            try:
                data = json.loads(self.path.read_text(encoding="utf-8") or "{}")
                if isinstance(data, dict):
                    state.update(data)
            except json.JSONDecodeError:
                log.warning("tracker file %s is not valid JSON; starting empty", self.path)
        return state

    def _write(self, state: dict[str, Any]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        state["notifications"] = state["notifications"][-MAX_NOTIFICATIONS:]
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(state, indent=1, ensure_ascii=False), encoding="utf-8")
        tmp.replace(self.path)

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return self._read()

    @contextmanager
    def edit(self) -> Iterator[dict[str, Any]]:
        with self._lock:
            state = self._read()
            yield state
            self._write(state)


_store: Optional[TrackerStore] = None


def get_store() -> TrackerStore:
    global _store
    s = get_settings()
    path = s.resolve(s.tracker_path)
    if _store is None or _store.path != path:
        _store = TrackerStore(path)
    return _store


# ---------------------------------------------------------------- workbook lookups

def _people(wb: Workbook) -> dict[str, Any]:
    def make() -> dict[str, Any]:
        rows = wb.sheets[field_app.MASTER].rows
        officers: dict[str, dict[str, Any]] = {}
        retailers: dict[str, dict[str, Any]] = {}
        for r in rows:
            sid = str(r["Sales officer ID"])
            o = officers.setdefault(sid, {"id": sid, "name": r["Sales officer name"], "asms": {}, "territories": set()})
            o["asms"][r["ASM Name"]] = o["asms"].get(r["ASM Name"], 0) + 1
            o["territories"].add(r["Territory"])
            retailers.setdefault(str(r["retailer_id"]), r)
        for o in officers.values():
            o["asm"] = max(o["asms"], key=o["asms"].get)
        return {"officers": officers, "by_name": {o["name"].lower(): o for o in officers.values()},
                "retailers": retailers, "asms": {r["ASM Name"] for r in rows},
                "territories": {r["Territory"] for r in rows}}
    return field_app._cached(wb, "tracker:people", make)


def find_officer(wb: Workbook, who: str) -> Optional[dict[str, Any]]:
    P = _people(wb)
    who = (who or "").strip()
    return P["officers"].get(who.upper()) or P["by_name"].get(who.lower())


def _find_retailer(wb: Workbook, retailer_id: Optional[str], title: str, territory: Optional[str]) -> Optional[dict[str, Any]]:
    P = _people(wb)
    if retailer_id:
        r = P["retailers"].get(str(retailer_id))
        if not r:
            raise TrackerError(404, f"Retailer '{retailer_id}' is not in 4. Retailer_Master")
        return r
    # web titles end with " · <retailer name>"
    tail = title.rsplit(" · ", 1)[-1].strip().lower() if " · " in title else ""
    if not tail:
        return None
    hits = [r for r in P["retailers"].values() if str(r["retailer_name"]).lower() == tail]
    if territory:
        hits = [r for r in hits if r["Territory"] == territory] or hits
    return hits[0] if len(hits) == 1 else None


def _signal_details(wb: Workbook, row: dict[str, Any], kind: Optional[str], today: dt.date) -> Optional[dict[str, Any]]:
    """The mobile app's own description of this retailer's signal (same rules as GET /api/app/bootstrap)."""
    L = field_app._cached(wb, "lookups", lambda: field_app._Lookups(wb))
    sigs = field_app._signals(field_app._facts(L, row, today))
    want = APP_KIND.get(kind or "")
    return next((s for s in sigs if s["kind"] == want), None) if want else None


# ---------------------------------------------------------------- notifications

def _notify(state: dict[str, Any], to: str, kind: str, title: str, body: str, action: Optional[dict[str, Any]] = None,
            data: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    state["seq"] += 1
    n = {"id": f"NTF-{state['seq']}", "to": to, "kind": kind, "title": title, "body": body,
         "aid": action["id"] if action else None, "ts": _ms(), "read": False,
         "data": {"type": kind, "aid": action["id"] if action else None, **(data or {})}, "delivery": None}
    state["notifications"].append(n)
    return n


async def _deliver(notifs: list[dict[str, Any]]) -> None:
    """Push each notification to its user's devices, then record the result on it."""
    results = {}
    for n in notifs:
        try:
            r = await push.send_to_users([n["to"]], n["title"], n["body"], n["data"])
        except Exception as e:  # a push failure never undoes the assignment
            log.exception("push failed for %s", n["id"])
            r = {"sent": 0, "failed": 1, "removed_tokens": [], "errors": [str(e)], "devices": 0}
        n["delivery"] = {"devices": r["devices"], "sent": r["sent"], "failed": r["failed"], "errors": r["errors"][:3]}
        results[n["id"]] = n["delivery"]
    with get_store().edit() as state:
        for n in state["notifications"]:
            if n["id"] in results:
                n["delivery"] = results[n["id"]]


def inbox(user: str, since: Optional[int] = None, limit: int = 50) -> dict[str, Any]:
    state = get_store().snapshot()
    mine = [n for n in state["notifications"] if push.same_user(n["to"], user)]
    unread = sum(1 for n in mine if not n["read"])
    if since:
        mine = [n for n in mine if n["ts"] > since]
    mine.sort(key=lambda n: -n["ts"])
    return {"items": mine[:limit], "unread": unread}


def mark_read(user: str, ids: Optional[list[str]] = None) -> int:
    """Mark these (or all) of the user's notifications read. Ids the store doesn't hold (the app's derived
    notifications, N-<action id>) are remembered too, so they stay read on the next bootstrap."""
    n_read = 0
    with get_store().edit() as state:
        own = {n["id"]: n for n in state["notifications"] if push.same_user(n["to"], user)}
        for n in own.values():
            if not n["read"] and (ids is None or n["id"] in ids):
                n["read"] = True
                n_read += 1
        extra = [i for i in (ids or []) if i not in own]
        if extra:
            key = user.lower()
            state["read"][key] = sorted(set(state["read"].get(key, [])) | set(extra))
            n_read += len(extra)
    return n_read


# ---------------------------------------------------------------- assign

async def assign(wb: Workbook, req: dict[str, Any], today: dt.date) -> dict[str, Any]:
    P = _people(wb)
    by = (req.get("assigned_by") or "").strip()
    if by not in P["asms"]:
        raise TrackerError(404, f"ASM '{by}' is not in 4. Retailer_Master")
    territory = req.get("territory")
    if territory and territory not in P["territories"]:
        raise TrackerError(404, f"Territory '{territory}' is not in 4. Retailer_Master")

    who = (req.get("assignee") or "").strip()
    if who.lower() in ("me", by.lower()):
        assignee = {"type": "asm", "id": None, "name": by}
    else:
        o = find_officer(wb, who)
        if not o:
            raise TrackerError(404, f"Sales officer '{who}' is not in 4. Retailer_Master")
        if by not in o["asms"]:
            raise TrackerError(422, f"{o['name']} ({o['id']}) has no retailers under ASM {by}")
        assignee = {"type": "so", "id": o["id"], "name": o["name"]}

    row = _find_retailer(wb, req.get("retailer_id"), req["title"], territory)
    if row is not None and territory and row["Territory"] != territory:
        raise TrackerError(422, f"Retailer {row['retailer_id']} is in {row['Territory']}, not {territory}")
    sig = _signal_details(wb, row, req.get("kind"), today) if row is not None else None
    agent = req.get("agent") or "thermometer"
    pri = req.get("priority") or (sig["pri"] if sig else "Medium")
    due_days = req.get("due_days")
    if due_days is None:
        due_days = max(0, sig["due"]) if sig else PRI_DUE.get(pri, 3)

    with get_store().edit() as state:
        dup = next((a for a in state["actions"] if a["source_id"] == req["source_id"] and a["st"] != "closed"
                    and a["assignee"]["name"] == assignee["name"]), None)
        if dup:
            return {"action": dup, "notification": None, "created": False}
        state["seq"] += 1
        now = _ms()
        a = {
            "id": f"ACT-{state['seq']}", "source_id": req["source_id"], "title": sig["title"] if sig else req["title"],
            "web_title": req["title"], "outlet": row["retailer_name"] if row is not None else (territory or ""),
            "retailer_id": row["retailer_id"] if row is not None else None, "territory": row["Territory"] if row is not None else territory,
            "agent": agent, "src": SOURCE_LABEL.get(agent, agent.title()), "kind": req.get("kind"), "pri": pri,
            "due_date": (today + dt.timedelta(days=int(due_days))).isoformat(), "st": "owner",
            "assignee": assignee, "assigned_by": {"name": by, "role": "ASM"}, "created": now,
            "what": sig["what"] if sig else req.get("note") or req["title"],
            "why": (sig["why"] if sig else f"Raised by {SOURCE_LABEL.get(agent, agent)}") + (f" Note from {by}: {req['note']}" if req.get("note") and sig else ""),
            "det": sig["det"] if sig else req["title"], "rec": sig["rec"] if sig else req["title"],
            "outcomeExp": sig["outcome"] if sig else None, "steps": [{"t": t, "done": False} for t in (sig["steps"] if sig else [])],
            "acts": [{"by": by, "role": "asm", "t": "assigned", "ts": now, "txt": req.get("note")}], "outcome": None,
        }
        state["actions"].append(a)
        n = None
        if assignee["type"] == "so":
            n = _notify(state, assignee["id"], "assigned", f"{by} assigned you an action",
                        f"{a['title']} · {a['outlet']}" if a["outlet"] else a["title"], a, {"so": assignee["id"], "pri": pri})
    if n:
        await _deliver([n])
        n = next((x for x in get_store().snapshot()["notifications"] if x["id"] == n["id"]), n)
    return {"action": a, "notification": n, "created": True}


def list_actions(assigned_by: Optional[str] = None, so: Optional[str] = None) -> list[dict[str, Any]]:
    acts = get_store().snapshot()["actions"]
    if assigned_by:
        acts = [a for a in acts if push.same_user(a["assigned_by"]["name"], assigned_by)]
    if so:
        acts = [a for a in acts if push.same_user(a["assignee"].get("id"), so)]
    return sorted(acts, key=lambda a: -a["created"])


# ---------------------------------------------------------------- events from the app

async def apply_event(wb: Workbook, action_id: str, ev: dict[str, Any]) -> dict[str, Any]:
    """started / comment / complete, from the officer's app. Returns the new status."""
    o = find_officer(wb, ev["so"])
    if not o:
        raise TrackerError(404, f"Sales officer '{ev['so']}' is not in 4. Retailer_Master")
    t, txt = ev["type"], (ev.get("text") or None)
    now = _ms()
    with get_store().edit() as state:
        a = next((x for x in state["actions"] if x["id"] == action_id), None)
        if a:
            if a["assignee"].get("id") != o["id"]:
                raise TrackerError(403, f"{action_id} is assigned to {a['assignee']['name']}, not {o['name']}")
            asm, title, outlet = a["assigned_by"]["name"], a["title"], a["outlet"]
            target = a
        else:
            # an action the app derived from the workbook: check the retailer is this officer's, keep an override
            rid = ev.get("retailer_id")
            r = _people(wb)["retailers"].get(str(rid)) if rid else None
            if r is None or str(r["Sales officer ID"]) != o["id"]:
                raise TrackerError(404, f"{action_id}: retailer '{rid}' is not served by {o['id']}")
            key = f"{o['id']}|{action_id}"
            target = state["overrides"].setdefault(key, {"retailer_id": r["retailer_id"], "signal": ev.get("signal"),
                                                         "title": ev.get("title"), "outlet": r["retailer_name"], "st": "owner", "acts": []})
            asm, title, outlet = o["asm"], target["title"] or action_id, target["outlet"]
        if t in EVENT_STATUS:
            target["st"] = EVENT_STATUS[t]
        if t == "complete" and ev.get("outcome"):
            target["outcome"] = ev["outcome"]
        target["acts"].append({"by": o["name"], "role": "so", "t": t, "ts": now, "txt": txt})
        n = _notify(state, asm_user(asm), NOTIF_KIND[t], f"{o['name']} {EVENT_VERB[t]} an action",
                    f"{title} · {outlet}" + (f" — {txt}" if txt else ""), {"id": action_id},
                    {"so": o["id"], "status": target["st"]})
        st = target["st"]
    await _deliver([n])
    return {"id": action_id, "st": st, "notified": asm_user(asm)}


# ---------------------------------------------------------------- the ASM's side: verify, send back, comment

def _find_target(state: dict[str, Any], wb: Workbook, action_id: str, body: dict[str, Any], create: bool) -> tuple[dict[str, Any], dict[str, Any]]:
    """(record, officer) for a stored action, or for an officer's field action (an override keyed by retailer)."""
    a = next((x for x in state["actions"] if x["id"] == action_id), None)
    if a:
        if a["assignee"]["type"] != "so":
            raise TrackerError(409, f"{action_id} is the ASM's own action; there is no officer to verify")
        o = find_officer(wb, a["assignee"]["id"])
        if a["assigned_by"]["name"] != body["by"] and (not o or o["asm"] != body["by"]):
            raise TrackerError(403, f"{action_id} was assigned by {a['assigned_by']['name']}")
        return a, o
    o = find_officer(wb, body.get("so") or "")
    rid = body.get("retailer_id")
    if not o or not rid:
        raise TrackerError(404, f"Action {action_id} not found; for an officer's field action pass so and retailer_id")
    r = _people(wb)["retailers"].get(str(rid))
    if r is None or str(r["Sales officer ID"]) != o["id"]:
        raise TrackerError(404, f"Retailer '{rid}' is not served by {o['id']}")
    if r["ASM Name"] != body["by"]:
        raise TrackerError(403, f"Retailer '{rid}' is under ASM {r['ASM Name']}, not {body['by']}")
    sig = body.get("signal")
    key = next((k for k, v in state["overrides"].items()
                if k.startswith(f"{o['id']}|") and v.get("retailer_id") == r["retailer_id"] and v.get("signal") in (None, sig)), None)
    if key is None:
        if not create:
            raise TrackerError(404, f"{o['name']} has not updated this action yet")
        # keyed by the app's own id for this retailer + signal, so the officer's app finds it
        mid, title = _app_action_id(wb, o["id"], r["retailer_id"], sig)
        key = f"{o['id']}|{mid or action_id}"
        state["overrides"][key] = {"retailer_id": r["retailer_id"], "signal": sig, "title": title or body.get("title"), "outlet": r["retailer_name"], "st": "owner", "acts": []}
    return state["overrides"][key], o


def _app_action_id(wb: Workbook, so_id: str, retailer_id: str, signal: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    """The id (and title) the officer's app gives the action for this retailer and signal."""
    try:
        data = field_app.build_bootstrap(wb, so_id, get_settings().app_today)
    except field_app.NotFound:
        return None, None
    a = next((a for a in data["actions"] if a.get("retailer_id") == retailer_id and (signal is None or a.get("signal") == signal)), None)
    return (a["id"], a["title"]) if a else (None, None)


def _app_id(state: dict[str, Any], t: dict[str, Any], so_id: str, fallback: str) -> str:
    """The id the officer's app knows a record by: a stored action's own id, or an override's key suffix."""
    if "id" in t:
        return t["id"]
    key = next((k for k, v in state["overrides"].items() if v is t), None)
    return key.split("|", 1)[1] if key and key.startswith(f"{so_id}|") else fallback


async def review(wb: Workbook, action_id: str, body: dict[str, Any]) -> dict[str, Any]:
    """The ASM verifies (closes) or sends back an action the officer marked done; the officer is notified."""
    now = _ms()
    verify = body["decision"] == "verify"
    with get_store().edit() as state:
        t, o = _find_target(state, wb, action_id, body, create=verify)
        t["st"], t["verified"] = ("closed", True) if verify else ("progress", False)
        t["acts"].append({"by": body["by"], "role": "asm", "t": "verified" if verify else "sent_back", "ts": now, "txt": body.get("note") or None})
        what = f"{t.get('title') or action_id}" + (f" · {t['outlet']}" if t.get("outlet") else "")
        n = _notify(state, o["id"], "verified" if verify else "sent_back",
                    f"{body['by']} verified and closed your action" if verify else f"{body['by']} sent an action back to you",
                    what + (f" — {body['note']}" if body.get("note") else ""), {"id": _app_id(state, t, o["id"], action_id)}, {"so": o["id"], "status": t["st"]})
        st = t["st"]
    await _deliver([n])
    return {"id": action_id, "st": st, "verified": verify, "notified": o["id"]}


async def asm_comment(wb: Workbook, action_id: str, body: dict[str, Any]) -> dict[str, Any]:
    now = _ms()
    with get_store().edit() as state:
        t, o = _find_target(state, wb, action_id, body, create=True)
        t["acts"].append({"by": body["by"], "role": "asm", "t": "comment", "ts": now, "txt": body["text"]})
        n = _notify(state, o["id"], "comment", f"{body['by']} commented on an action", f"{t.get('title') or action_id} — {body['text']}",
                    {"id": _app_id(state, t, o["id"], action_id)}, {"so": o["id"], "status": t["st"]})
    await _deliver([n])
    return {"id": action_id, "notified": o["id"]}


# ---------------------------------------------------------------- reminders

async def run_reminders(today: dt.date) -> list[dict[str, Any]]:
    out = []
    with get_store().edit() as state:
        for a in state["actions"]:
            if a["assignee"]["type"] != "so" or a["st"] == "closed":
                continue
            due = dt.date.fromisoformat(a["due_date"])
            kind = "due" if due == today else "overdue" if due < today else None
            key = f"{a['id']}|{kind}|{today.isoformat()}"
            if not kind or key in state["reminders"]:
                continue
            state["reminders"][key] = _ms()
            late = (today - due).days
            title = "Action due today" if kind == "due" else f"Action overdue by {late} day{'s' if late > 1 else ''}"
            out.append(_notify(state, a["assignee"]["id"], kind, title, f"{a['title']} · {a['outlet']}", a, {"so": a["assignee"]["id"]}))
    if out:
        await _deliver(out)
    return out


# ---------------------------------------------------------------- mobile app shape

APP_KIND_OF_NOTIF = {"assigned": "new"}


def _app_act(users: dict[str, Any], e: dict[str, Any]) -> dict[str, Any]:
    """One activity entry in the app's shape; the ASM's verify / send back read as updates there."""
    t, txt = e["t"], e.get("txt")
    if t in ("verified", "sent_back"):
        txt = ("Verified and closed" if t == "verified" else "Sent back") + (f": {txt}" if txt else "")
        t = "comment"
    return {"a": _user_key(users, e["by"], e["role"]), "t": t, "ts": e["ts"], **({"txt": txt} if txt else {})}


def _user_key(users: dict[str, Any], name: str, role: str) -> str:
    for k, u in users.items():
        if u.get("n") == name and (role != "so" or u.get("r") == "Sales Officer"):
            return k
    k = "u_" + re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
    users[k] = {"n": name, "f": name.split()[0], "r": "ASM" if role == "asm" else "Sales Officer", "ini": "".join(p[0] for p in name.split()[:2]).upper()}
    return k


def app_action(a: dict[str, Any], users: dict[str, Any], today: dt.date, visits: Optional[list[dict[str, Any]]] = None) -> dict[str, Any]:
    acts = [_app_act(users, e) for e in a["acts"]]
    out = {
        "id": a["id"], "tk": a["id"], "title": a["title"], "outlet": a["outlet"], "retailer_id": a["retailer_id"],
        "terr": a["territory"], "src": a["src"], "pri": a["pri"], "due": (dt.date.fromisoformat(a["due_date"]) - today).days,
        "st": a["st"], "to": "ajay", "by": _user_key(users, a["assigned_by"]["name"], "asm"), "created": a["created"],
        "isNew": a["st"] == "owner" and len(a["acts"]) == 1, "what": a["what"], "why": a["why"], "det": a["det"], "rec": a["rec"],
        "reason": a["det"], "outcomeExp": a.get("outcomeExp"), "signal": a.get("kind"), "assigned": True, "acts": acts,
    }
    if a["steps"]:
        out["steps"] = [dict(s, done=s["done"] or a["st"] == "closed") for s in a["steps"]]
    if a.get("outcome"):
        out["outcome"] = a["outcome"]
    v = next((v for v in (visits or []) if v.get("retailer_id") == a["retailer_id"] and v["state"] == "scheduled"), None) if a["retailer_id"] else None
    if v:
        out["visitId"] = v["id"]
    return out


def app_notification(n: dict[str, Any]) -> dict[str, Any]:
    return {"id": n["id"], "to": "ajay", "k": APP_KIND_OF_NOTIF.get(n["kind"], n["kind"]), "aid": n["aid"], "ts": n["ts"],
            "read": n["read"], "title": n["title"], "body": n["body"]}


def merge_into_bootstrap(data: dict[str, Any], today: dt.date) -> dict[str, Any]:
    """Overlay the stored state on GET /api/app/bootstrap for one officer."""
    so = data["sales_officer"]["id"]
    users = data["users"]
    state = get_store().snapshot()

    for a in data["actions"]:
        ov = state["overrides"].get(f"{so}|{a['id']}")
        if ov and ov["retailer_id"] == a["retailer_id"] and ov.get("signal") in (None, a.get("signal")):
            a["st"] = ov["st"]
            a["acts"] = a["acts"] + [_app_act(users, e) for e in ov["acts"]]
            if ov.get("outcome"):
                a["outcome"] = ov["outcome"]
            if a["st"] == "closed" and a.get("steps"):
                for s in a["steps"]:
                    s["done"] = True

    mine = [app_action(a, users, today, data["visits"]) for a in state["actions"] if a["assignee"].get("id") == so]
    data["actions"] = mine + data["actions"]

    read = set(state["read"].get(so.lower(), []))
    derived = []
    for n in data["notifications"]:
        n["id"] = f"N-{n['aid']}"
        n["read"] = n["id"] in read
        derived.append(n)
    stored = [app_notification(n) for n in state["notifications"] if push.same_user(n["to"], so)]
    data["notifications"] = sorted(stored + derived, key=lambda n: -n["ts"])
    data["inbox_since"] = max((n["ts"] for n in stored), default=0)
    return data


def app_inbox(wb: Workbook, so: str, since: int, today: dt.date) -> dict[str, Any]:
    """New notifications for the officer's app since `since`, with the assigned actions they point to."""
    o = find_officer(wb, so)
    if not o:
        raise TrackerError(404, f"Sales officer '{so}' is not in 4. Retailer_Master")
    state = get_store().snapshot()
    users = {"ajay": {"n": o["name"], "r": "Sales Officer"}, "rajesh": {"n": o["asm"], "r": "ASM"}}
    base = set(users)
    new = sorted((n for n in state["notifications"] if push.same_user(n["to"], o["id"]) and n["ts"] > since), key=lambda n: n["ts"])
    aids = {n["aid"] for n in new}
    actions = [app_action(a, users, today) for a in state["actions"] if a["id"] in aids and a["assignee"].get("id") == o["id"]]
    stored_ids = {a["id"] for a in state["actions"]}
    patches = []
    for n in new:
        ov = state["overrides"].get(f"{o['id']}|{n['aid']}") if n["aid"] and n["aid"] not in stored_ids else None
        if ov:
            patches.append({"id": n["aid"], "st": ov["st"], "acts": [_app_act(users, e) for e in ov["acts"] if e["role"] == "asm"]})
    return {"notifications": [app_notification(n) for n in new], "actions": actions, "patches": patches,
            "users": {k: v for k, v in users.items() if k not in base},
            "unread": sum(1 for n in state["notifications"] if push.same_user(n["to"], o["id"]) and not n["read"]),
            "since": max([since] + [n["ts"] for n in new])}
