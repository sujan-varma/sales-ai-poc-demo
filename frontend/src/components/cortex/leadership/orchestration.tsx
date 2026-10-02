"use client";

// The orchestration story — the Head of Sales homepage's live animation (1 Oct 2026 brief,
// built for demo and presentation weight). One big icon per stage of a representative chain:
// SFA → Action Tracker + Thermometer → Market Action Plan → Thermometer → Sales Leadership.
// Only the live stage animates; when it completes, a dot travels the arrow and the next one
// starts. With nothing running it shows the last run, plainly, with no animation. The
// accurate, concurrent four-block flow sits behind "Show details".

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, Building2, Check, ChevronDown, ChevronRight, ListChecks, Map as MapIcon, RefreshCw, RotateCcw, Thermometer } from "lucide-react";
import { LAST_STORY, LIVE_STORY, StoryIcon, StoryRun } from "@/data/leadership";
import { card } from "../kit";
import { useCortexNav } from "../nav";
import { LiveFlow } from "./liveFlow";

// each stage holds for 10 s so a presenter can talk to it (1 Oct corrections)
const ACTIVE_MS = 10000;
const HANDOFF_MS = 700;
const START_MS = 700;
const DONE_KEY = "cx-story-done";

type St = "waiting" | "active" | "done";

/** live: stage `at` is running (or handing off to the next); idle: nothing running, show `run` as it last finished */
type Mode = { kind: "live"; at: number; handoff: boolean } | { kind: "idle"; run: StoryRun; finishedMs: number | null };

function useStory() {
  const [mode, setMode] = useState<Mode>({ kind: "live", at: -1, handoff: false });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const play = useCallback(() => {
    clear();
    const n = LIVE_STORY.stages.length;
    let t = START_MS;
    setMode({ kind: "live", at: -1, handoff: false });
    for (let i = 0; i < n; i++) {
      timers.current.push(setTimeout(() => setMode({ kind: "live", at: i, handoff: false }), t));
      t += ACTIVE_MS;
      if (i < n - 1) {
        timers.current.push(setTimeout(() => setMode({ kind: "live", at: i, handoff: true }), t));
        t += HANDOFF_MS;
      }
    }
    timers.current.push(
      setTimeout(() => {
        const ms = Date.now();
        setMode({ kind: "idle", run: LIVE_STORY, finishedMs: ms });
        try {
          sessionStorage.setItem(DONE_KEY, String(ms));
        } catch {
          /* storage unavailable */
        }
      }, t)
    );
  }, []);
  useEffect(() => {
    // ?story=idle: the plain fallback, for showing both states in a deck
    if (new URLSearchParams(location.search).get("story") === "idle") {
      setMode({ kind: "idle", run: LAST_STORY, finishedMs: null });
      return clear;
    }
    // already watched this session: nothing new is running, so show how the last run ended
    let done: string | null = null;
    try {
      done = sessionStorage.getItem(DONE_KEY);
    } catch {
      /* storage unavailable */
    }
    if (done) setMode({ kind: "idle", run: LIVE_STORY, finishedMs: Number(done) });
    // otherwise the 17:45 SFA sync is in progress when the page opens, so it plays live
    else play();
    return clear;
  }, [play]);
  return { mode, play };
}

function useAgo(ms: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (ms == null) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [ms]);
  if (ms == null) return "2 hours ago";
  const m = Math.floor((now - ms) / 60_000);
  return m < 1 ? "just now" : `${m} min ago`;
}

export function OrchestrationStory() {
  const go = useCortexNav();
  const { mode, play } = useStory();
  const [details, setDetails] = useState(false);
  const live = mode.kind === "live";
  const run = live ? LIVE_STORY : mode.run;
  const ago = useAgo(mode.kind === "idle" ? mode.finishedMs : null);

  const state = (i: number): St => {
    if (!live) return "done";
    if (mode.at < 0 || i > mode.at) return "waiting";
    if (i === mode.at && !mode.handoff) return "active";
    return "done";
  };
  const travelling = (i: number) => live && mode.handoff && mode.at === i;
  const lit = (i: number) => live && (mode.at > i || (mode.at === i && mode.handoff));

  const cur = live && mode.at >= 0 ? run.stages[mode.at] : null;
  const status = live
    ? cur
      ? `${run.startedAt} · ${run.what}, ${run.where} · ${cur.actor}: ${mode.handoff ? cur.did : `${cur.doing}…`}`
      : `${run.startedAt} · ${run.what}, ${run.where} · starting`
    : `Nothing running · last ${run.what} (${run.where}) finished ${run.finishedAt}, ${ago} · next sync 21:45`;

  return (
    <section aria-labelledby="story-title" className={`${card} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <h2 id="story-title" className="flex items-center gap-2.5 text-[15px] font-medium text-cx-text">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cx-line bg-cx-raised">
            <span className="relative flex h-2.5 w-2.5" aria-hidden>
              <span className={`relative h-2.5 w-2.5 rounded-full ${live ? "bg-ai" : "bg-cx-strong"}`} />
            </span>
          </span>
          What Sales AI is doing
          {live ? (
            <span className="font-data text-[10.5px] font-normal uppercase tracking-[0.08em] text-ai">Live</span>
          ) : (
            <span className="text-[12px] font-normal text-cx-faint">Last run · {ago}</span>
          )}
        </h2>
        <span className="flex items-center gap-3">
          {!live && (
            <button onClick={play} className="inline-flex items-center gap-1 text-[12px] text-cx-muted hover:text-cx-text">
              <RotateCcw className="h-3 w-3" /> Replay
            </button>
          )}
          <button onClick={() => go("activity-log")} className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] text-cx-muted hover:text-cx-text">
            Activity log <ChevronRight className="h-3 w-3" />
          </button>
        </span>
      </div>

      <p className="mt-1 px-5 text-[12.5px] text-cx-faint">
        <span className="font-data text-cx-muted">{live ? run.startedAt : run.finishedAt}</span> · {run.what}, {run.where} · one example of how a single input travels through Sales AI
      </p>

      {/* the chain: horizontal on desktop, a column on small screens */}
      <ol className="grid grid-cols-1 gap-1 px-5 pb-2 pt-6 md:grid-cols-[minmax(0,1fr)_minmax(28px,0.45fr)_minmax(0,1fr)_minmax(28px,0.45fr)_minmax(0,1fr)_minmax(28px,0.45fr)_minmax(0,1fr)_minmax(28px,0.45fr)_minmax(0,1fr)] md:gap-0">
        {run.stages.map((s, i) => (
          <React.Fragment key={s.icon + i}>
            <Stage stage={s} st={state(i)} idle={!live} />
            {i < run.stages.length - 1 && <Connector lit={lit(i)} travelling={travelling(i)} />}
          </React.Fragment>
        ))}
      </ol>

      {/* one row: the status line on the left, Show details at the far right */}
      <div className="mx-5 mt-2 flex min-w-0 items-center gap-3 border-t border-cx-line py-3">
        <p className="flex min-w-0 flex-1 items-center gap-2 text-[12px] text-cx-muted" aria-live="polite">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${live ? "bg-ai" : "bg-cx-strong"}`} aria-hidden />
          <span className="min-w-0 truncate">{status}</span>
        </p>
        <button onClick={() => setDetails((d) => !d)} aria-expanded={details} aria-controls="story-details" className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-cx-muted hover:text-cx-text">
          {details ? "Hide details" : "Show details"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${details ? "rotate-180" : ""}`} />
        </button>
      </div>

      <div>
        {details && (
          <div id="story-details" className="cx-land-fade border-t border-cx-line p-5">
            <p className="mb-3 text-[12px] text-cx-faint">Everything today, as it happens: agents work concurrently, so this view doesn't imply an order.</p>
            <LiveFlow embedded />
          </div>
        )}
      </div>
    </section>
  );
}

function StageIcon({ icon }: { icon: StoryIcon }) {
  const cls = "h-8 w-8 md:h-9 md:w-9";
  switch (icon) {
    case "sfa":
      return <RefreshCw className={cls} strokeWidth={1.6} />;
    case "tracker-thermo":
      return (
        <span className="flex items-center gap-0.5">
          <ListChecks className="h-6 w-6 md:h-7 md:w-7" strokeWidth={1.6} />
          <Thermometer className="h-6 w-6 md:h-7 md:w-7" strokeWidth={1.6} />
        </span>
      );
    case "map":
      return <MapIcon className={cls} strokeWidth={1.6} />;
    case "thermometer":
      return <Thermometer className={cls} strokeWidth={1.6} />;
    case "leadership":
      return <Building2 className={cls} strokeWidth={1.6} />;
  }
}

function Stage({ stage, st, idle }: { stage: StoryRun["stages"][number]; st: St; idle: boolean }) {
  const active = st === "active";
  const tile =
    st === "active"
      ? "cx-glow cx-glow-round text-[color:var(--ai-ink)]"
      : st === "done"
        ? `border border-cx-line bg-cx-raised ${idle ? "text-cx-muted" : "text-cx-text"}`
        : "border border-dashed border-cx-strong text-cx-faint opacity-60";
  return (
    <li className="flex min-w-0 items-center gap-4 py-2 md:flex-col md:gap-0 md:py-0 md:text-center" aria-current={active ? "step" : undefined}>
      <span className="relative flex shrink-0 justify-center">
        <span className={`relative flex h-16 w-16 items-center justify-center rounded-full transition-colors duration-500 md:h-[88px] md:w-[88px] ${tile}`}>
          <span className={active ? "cx-breathe" : ""}>
            <StageIcon icon={stage.icon} />
          </span>
        </span>
        {st === "done" && (
          <span className="absolute -bottom-0.5 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-cx-panel bg-[#2fa85c] md:right-1" aria-label="done">
            <Check className="h-3 w-3 text-white" strokeWidth={3} />
          </span>
        )}
      </span>
      <span className="min-w-0 md:mt-3 md:px-1">
        <span className={`block font-data text-[10.5px] uppercase tracking-[0.08em] ${active ? "text-[color:var(--ai-ink)]" : "text-cx-faint"}`}>{stage.actor}</span>
        <span className={`mt-1 block text-[12.5px] leading-snug ${active ? "text-cx-text" : st === "done" ? "text-cx-muted" : "text-cx-faint"}`}>
          {active ? (
            <>
              {stage.doing}…
            </>
          ) : st === "done" ? (
            stage.did
          ) : (
            "Waiting"
          )}
        </span>
      </span>
    </li>
  );
}

/** Arrow to the next stage; on hand-off a dot travels it once. */
function Connector({ lit, travelling }: { lit: boolean; travelling: boolean }) {
  return (
    <li aria-hidden className="flex justify-start pl-6 md:block md:pl-0 md:pt-[43px]">
      <ArrowDown className={`h-4 w-4 md:hidden ${lit ? "text-[color:var(--ai-ink)]" : "text-cx-strong"}`} />
      <span className="relative hidden h-px w-full md:block">
        <span className="absolute inset-0 bg-cx-line" />
        <span className={`absolute inset-y-0 left-0 w-full origin-left bg-[#4f86f7] transition-transform duration-700 motion-reduce:transition-none ${lit ? "scale-x-100" : "scale-x-0"}`} style={{ transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)" }} />
        <span className={`absolute -right-0.5 -top-[4.5px] h-0 w-0 border-y-[5px] border-l-[6px] border-y-transparent ${lit ? "border-l-[#4f86f7]" : "border-l-[rgb(var(--cx-strong))]"}`} />
        {travelling && <span className="cx-travel absolute -top-[3px] h-[7px] w-[7px] -translate-x-1/2 rounded-full bg-ai shadow-[0_0_10px_rgba(94,234,212,0.8)]" />}
      </span>
    </li>
  );
}
