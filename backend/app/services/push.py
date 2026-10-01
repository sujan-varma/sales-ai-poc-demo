"""Expo push notifications + a tiny JSON-file token registry (data/tokens.json)."""

from __future__ import annotations

import datetime as dt
import json
import logging
import re
import threading
from pathlib import Path
from typing import Any, Optional

import httpx

from app.config import get_settings

log = logging.getLogger(__name__)

EXPO_TOKEN_RE = re.compile(r"^Expo(nent)?PushToken\[.+\]$")
CHUNK = 100  # Expo accepts at most 100 messages per request
INVALID_TOKEN_ERRORS = {"DeviceNotRegistered"}  # Expo: token no longer valid -> remove it


def is_expo_token(token: str) -> bool:
    return bool(EXPO_TOKEN_RE.match(token))


def _now() -> str:
    return dt.datetime.now().astimezone().isoformat()


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

    def register(self, token: str, platform: str, user: Optional[str]) -> tuple[dict[str, Any], bool]:
        """Insert or update; returns (entry, created)."""
        with self._lock:
            items = self._read()
            for it in items:
                if it["token"] == token:
                    it.update(platform=platform, user=user, updated_at=_now())
                    self._write(items)
                    return it, False
            entry = {"token": token, "platform": platform, "user": user, "registered_at": _now(), "updated_at": _now()}
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


async def send_push(
    tokens: list[str], title: str, body: str, data: Optional[dict[str, Any]] = None
) -> dict[str, Any]:
    """Send one notification to each token through the Expo Push API; drop tokens Expo reports invalid."""
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


async def broadcast(title: str, body: str, data: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    tokens = [t["token"] for t in get_token_store().all()]
    if not tokens:
        return {"sent": 0, "failed": 0, "removed_tokens": [], "errors": []}
    return await send_push(tokens, title, body, data)
