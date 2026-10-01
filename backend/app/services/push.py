"""Push notifications + a tiny JSON-file device registry (data/tokens.json).

Two kinds of device:
  expo     a native app's Expo push token (ExponentPushToken[...]), sent through the Expo Push API
  webpush  a browser Push API subscription (the mobile web app at /app), sent with VAPID through the browser's
           push service; the entry's `token` is the subscription endpoint

Each device can carry a `user` (a sales officer id such as SO018, or "asm:<name>" for an ASM) so a notification can
go to one person's devices only.
"""

from __future__ import annotations

import asyncio
import datetime as dt
import json
import logging
import re
import threading
from pathlib import Path
from typing import Any, Optional

import httpx
from cryptography.hazmat.primitives import serialization
from py_vapid import Vapid, b64urlencode
from pywebpush import WebPushException, webpush

from app.config import get_settings

log = logging.getLogger(__name__)

EXPO_TOKEN_RE = re.compile(r"^Expo(nent)?PushToken\[.+\]$")
CHUNK = 100  # Expo accepts at most 100 messages per request
INVALID_TOKEN_ERRORS = {"DeviceNotRegistered"}  # Expo: token no longer valid -> remove it
GONE_STATUS = {404, 410}  # Web Push: subscription expired or revoked -> remove it


def is_expo_token(token: str) -> bool:
    return bool(EXPO_TOKEN_RE.match(token))


def _now() -> str:
    return dt.datetime.now().astimezone().isoformat()


def same_user(a: Optional[str], b: Optional[str]) -> bool:
    return bool(a and b and a.strip().lower() == b.strip().lower())


class TokenStore:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = threading.Lock()

    def _read(self) -> list[dict[str, Any]]:
        if not self.path.exists():
            return []
        try:
            data = json.loads(self.path.read_text(encoding="utf-8") or "[]")
            return data if isinstance(data, list) else []
        except json.JSONDecodeError:
            log.warning("tokens file %s is not valid JSON; starting empty", self.path)
            return []

    def _write(self, items: list[dict[str, Any]]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(items, indent=2), encoding="utf-8")
        tmp.replace(self.path)

    def all(self) -> list[dict[str, Any]]:
        with self._lock:
            return self._read()

    def for_users(self, users: list[str]) -> list[dict[str, Any]]:
        return [it for it in self.all() if any(same_user(it.get("user"), u) for u in users)]

    def register(
        self, token: str, platform: str, user: Optional[str], kind: str = "expo", subscription: Optional[dict[str, Any]] = None
    ) -> tuple[dict[str, Any], bool]:
        """Insert or update; returns (entry, created)."""
        with self._lock:
            items = self._read()
            for it in items:
                if it["token"] == token:
                    it.update(platform=platform, user=user, kind=kind, updated_at=_now())
                    if subscription:
                        it["subscription"] = subscription
                    self._write(items)
                    return it, False
            entry = {"token": token, "kind": kind, "platform": platform, "user": user, "registered_at": _now(), "updated_at": _now()}
            if subscription:
                entry["subscription"] = subscription
            items.append(entry)
            self._write(items)
            return entry, True

    def remove(self, tokens: list[str]) -> list[str]:
        if not tokens:
            return []
        with self._lock:
            items = self._read()
            drop = set(tokens)
            kept = [it for it in items if it["token"] not in drop]
            removed = [it["token"] for it in items if it["token"] in drop]
            if removed:
                self._write(kept)
            return removed


def get_token_store() -> TokenStore:
    s = get_settings()
    return TokenStore(s.resolve(s.tokens_path))


def _empty() -> dict[str, Any]:
    return {"sent": 0, "failed": 0, "removed_tokens": [], "errors": []}


def _merge(a: dict[str, Any], b: dict[str, Any]) -> dict[str, Any]:
    return {k: a[k] + b[k] for k in ("sent", "failed", "removed_tokens", "errors")}


# ---------------------------------------------------------------- Expo

async def send_push(
    tokens: list[str], title: str, body: str, data: Optional[dict[str, Any]] = None
) -> dict[str, Any]:
    """Send one notification to each Expo token through the Expo Push API; drop tokens Expo reports invalid."""
    settings = get_settings()
    store = get_token_store()
    sent, failed = 0, 0
    errors: list[str] = []
    invalid: list[str] = []

    bad_format = [t for t in tokens if not is_expo_token(t)]
    for t in bad_format:
        failed += 1
        errors.append(f"{t}: not an Expo push token")
    invalid.extend(bad_format)
    tokens = [t for t in tokens if is_expo_token(t)]

    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if settings.expo_access_token:
        headers["Authorization"] = f"Bearer {settings.expo_access_token}"

    async with httpx.AsyncClient(timeout=20) as client:
        for i in range(0, len(tokens), CHUNK):
            chunk = tokens[i : i + CHUNK]
            messages = [
                {"to": t, "title": title, "body": body, "data": data or {}, "sound": "default", "priority": "high"}
                for t in chunk
            ]
            try:
                r = await client.post(settings.expo_push_url, json=messages, headers=headers)
                payload = r.json()
            except (httpx.HTTPError, ValueError) as e:
                failed += len(chunk)
                errors.append(f"Expo request failed: {e}")
                continue

            if r.status_code >= 400 or ("errors" in payload and not payload.get("data")):
                failed += len(chunk)
                errors.extend(f"Expo error: {e.get('code')}: {e.get('message')}" for e in payload.get("errors", []))
                if r.status_code >= 400 and not payload.get("errors"):
                    errors.append(f"Expo HTTP {r.status_code}")
                continue

            for token, ticket in zip(chunk, payload.get("data", [])):
                if ticket.get("status") == "ok":
                    sent += 1
                    continue
                failed += 1
                code = (ticket.get("details") or {}).get("error")
                errors.append(f"{token}: {code or ''} {ticket.get('message', '')}".strip())
                if code in INVALID_TOKEN_ERRORS:
                    invalid.append(token)

    removed = store.remove(invalid)
    if removed:
        log.info("Removed %d invalid push tokens", len(removed))
    return {"sent": sent, "failed": failed, "removed_tokens": removed, "errors": errors}


# ---------------------------------------------------------------- Web Push (VAPID)

_vapid: Optional[Vapid] = None
_vapid_lock = threading.Lock()


def get_vapid() -> Vapid:
    """The server's VAPID key: VAPID_PRIVATE_KEY if set, else a key generated once and kept in VAPID_PATH."""
    global _vapid
    with _vapid_lock:
        if _vapid is None:
            s = get_settings()
            if s.vapid_private_key.strip():
                _vapid = Vapid.from_pem(s.vapid_private_key.strip().replace("\\n", "\n").encode())
            else:
                path = s.resolve(s.vapid_path)
                if path.exists():
                    _vapid = Vapid.from_pem(path.read_bytes())
                else:
                    v = Vapid()
                    v.generate_keys()
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(v.private_pem())
                    log.info("Generated a new VAPID key in %s", path)
                    _vapid = v
        return _vapid


def vapid_public_key() -> str:
    """applicationServerKey for PushManager.subscribe(): the uncompressed P-256 point, base64url."""
    raw = get_vapid().public_key.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    return b64urlencode(raw)


def _webpush_one(sub: dict[str, Any], payload: str) -> Optional[int]:
    """Returns None on success, else the push service's HTTP status (0 if there was no response)."""
    try:
        webpush(subscription_info=sub, data=payload, vapid_private_key=get_vapid(),
                vapid_claims={"sub": get_settings().vapid_subject}, ttl=86400, timeout=15)
        return None
    except WebPushException as e:
        return e.response.status_code if e.response is not None else 0


async def send_webpush(entries: list[dict[str, Any]], title: str, body: str, data: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    payload = json.dumps({"title": title, "body": body, "data": data or {}})
    res = _empty()
    gone: list[str] = []
    codes = await asyncio.gather(*(asyncio.to_thread(_webpush_one, e["subscription"], payload) for e in entries if e.get("subscription")))
    for e, code in zip([e for e in entries if e.get("subscription")], codes):
        if code is None:
            res["sent"] += 1
            continue
        res["failed"] += 1
        res["errors"].append(f"web push to {e['token'][:60]}…: HTTP {code}")
        if code in GONE_STATUS:
            gone.append(e["token"])
    res["removed_tokens"] = get_token_store().remove(gone)
    return res


# ---------------------------------------------------------------- routing

async def send_to_entries(entries: list[dict[str, Any]], title: str, body: str, data: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    web = [e for e in entries if e.get("kind") == "webpush"]
    expo = [e["token"] for e in entries if e.get("kind", "expo") == "expo"]
    res = _empty()
    if expo:
        res = _merge(res, await send_push(expo, title, body, data))
    if web:
        res = _merge(res, await send_webpush(web, title, body, data))
    return res


async def send_to_users(users: list[str], title: str, body: str, data: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    """Every registered device of these users (sales officer ids, or "asm:<name>")."""
    entries = get_token_store().for_users(users)
    res = await send_to_entries(entries, title, body, data) if entries else _empty()
    return {**res, "devices": len(entries)}


async def broadcast(title: str, body: str, data: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    entries = get_token_store().all()
    if not entries:
        return _empty()
    return await send_to_entries(entries, title, body, data)
