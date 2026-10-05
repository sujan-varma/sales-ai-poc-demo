"use client";

// Thermometer's Sync control. At rest it says how long ago this page's data was loaded and keeps counting. Running,
// it names what it is reading — the workbook sheets behind Thermometer, then the agents whose output feeds it (both
// from the backend, thermometer.SYNC_FEEDS) — in the same agent-at-work language the rest of the product uses: a
// spinner chip at the point of action, cx-glow on whatever is live, a tick once it lands. While it steps it asks the
// backend whether the workbook was reloaded since this page loaded; if so it offers to reload the page.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import { SYNC_FEEDS } from "@/data/thermometer";
import { fetchWorkbookLoadedAt, loadInfo } from "@/data/source";
import { AgentIcon } from "../primitives";

const STEP_MS = 850;

const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** "just now" → "4 minutes ago" → "1 hour ago", recomputed while the page stays open. */
function useAgo(since: number) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const m = Math.floor((Date.now() - since) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  return `${h} hour${h === 1 ? "" : "s"} ago`;
}

export function SyncControl() {
  const [since, setSince] = useState(() => loadInfo.at);
  /** index of the feed being read, or -1 at rest */
  const [at, setAt] = useState(-1);
  /** the backend has a newer workbook load than the one on screen */
  const [stale, setStale] = useState(false);
  const [failed, setFailed] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ago = useAgo(since);
  const running = at >= 0;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const run = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setFailed(false);
    const ms = reduceMotion() ? 260 : STEP_MS;
    setAt(0);
    SYNC_FEEDS.forEach((_, i) => {
      if (i > 0) timers.current.push(setTimeout(() => setAt(i), i * ms));
    });
    const check = fetchWorkbookLoadedAt().then(
      (v) => setStale(!!v && !!loadInfo.workbookLoadedAt && v !== loadInfo.workbookLoadedAt),
      () => setFailed(true)
    );
    timers.current.push(
      setTimeout(() => {
        void check.finally(() => {
          setAt(-1);
          setSince(Date.now());
        });
      }, SYNC_FEEDS.length * ms)
    );
  }, []);

  if (!SYNC_FEEDS.length) return null;

  return (
    <div className="flex min-w-0 flex-col items-start gap-2 sm:items-end">
      {running ? (
        <span role="status" aria-live="polite" className="inline-flex h-8 max-w-full items-center gap-2 rounded-full border border-cx-line bg-cx-raised pl-2 pr-3 text-[12px] text-cx-muted">
          <span className="relative flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
            <span className="absolute inset-0 rounded-full border border-cx-strong border-t-cx-text motion-safe:animate-spin" />
          </span>
          <span className="truncate">
            <span className="text-cx-text">Syncing with {SYNC_FEEDS[at].label}</span> · {SYNC_FEEDS[at].doing}
            <span className="motion-safe:animate-pulse">…</span>
          </span>
        </span>
      ) : stale ? (
        <button
          onClick={() => location.reload()}
          className="inline-flex h-8 items-center gap-2 rounded-full border border-[#2f6fed]/50 bg-[#2f6fed]/10 pl-2.5 pr-3 text-[12px] text-cx-text hover:border-[#2f6fed]/80"
        >
          <RefreshCw className="h-3.5 w-3.5 shrink-0" />
          Newer workbook data on the server · Reload
        </button>
      ) : (
        <button
          onClick={run}
          title={failed ? "The backend didn't answer; the data on screen is unchanged." : "Re-check the backend for newer workbook data"}
          className="inline-flex h-8 items-center gap-2 rounded-full border border-cx-line bg-cx-panel pl-2.5 pr-3 text-[12px] text-cx-muted hover:border-cx-strong hover:text-cx-text"
        >
          <RefreshCw className="h-3.5 w-3.5 shrink-0" />
          {failed ? "Couldn't reach the backend · retry" : <>Synced <span className="font-data">{ago}</span></>}
        </button>
      )}

      {/* what it is reading, in order: lit while live, ticked once it has landed */}
      {running && (
        <ul className="flex flex-wrap gap-1 sm:justify-end">
          {SYNC_FEEDS.map((f, i) => {
            const done = i < at;
            const live = i === at;
            return (
              <li
                key={f.label}
                aria-current={live ? "step" : undefined}
                className={`inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 font-data text-[10.5px] uppercase tracking-[0.06em] transition-colors ${
                  live ? "cx-glow text-[color:var(--ai-ink)]" : done ? "border border-cx-line bg-cx-raised text-cx-muted" : "border border-dashed border-cx-strong text-cx-faint"
                }`}
              >
                {f.agent ? <AgentIcon agent={f.agent} size="sm" round /> : <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-ai" : done ? "bg-[#2fa85c]" : "bg-cx-strong"}`} aria-hidden />}
                {f.label}
                {done && <Check className="h-2.5 w-2.5" style={{ color: "#2fa85c" }} aria-label="done" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
