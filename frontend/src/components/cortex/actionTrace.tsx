"use client";

// A suggested action, shown as what Sales AI has already done ("Push to Pitch engine ✓"),
// with its own orchestration trace behind "How it was decided". That trace opens as a centred
// landscape modal: a header naming the item it belongs to, then the chain stepping left to
// right in the same icon sequence the Head of Sales Live indicator uses, with the highlighted
// step's evidence directly beneath it. It mounts in a portal, so a card's overflow or transform can't
// clip it, and every click stops at the modal, so the card that holds the trigger doesn't react.

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, CircleDot, CornerDownRight, GitBranch, Inbox, RotateCcw, Scale, SkipForward, Workflow, X } from "lucide-react";
import { AGENTS, AgentRun } from "@/data/cortexHome";
import { ActionTrace } from "@/data/actionTraces";
import { useConfirmedActions } from "@/data/demo";
import { AgentRunChip } from "./agentRun";
import { useHome } from "./HomeState";
import { linkPage, useCortexNav } from "./nav";
import { AgentIcon } from "./primitives";
import { SEQ_GRID, SeqState, SequenceConnector, SequenceTile, TRACE_TIMING, reduceMotion } from "./storySequence";

const DONE = "#2fa85c";
const STEPS = 4;
const SEEN_KEY = "cx-trace-seen";

/**
 * What the trace belongs to, named plainly in the modal header so the reasoning is never
 * detached from the item it explains.
 */
export type TraceSource =
  | "Insight"
  | "Huddle Finding"
  | "Action"
  | "Thermometer Recommendation"
  | "Market Action Plan Initiative"
  | "Pitch Talking Point"
  | "Pitch"
  | "Decision"
  | "Activity";

export interface TraceSubject {
  /** the kind of thing this reasoning explains */
  source: TraceSource;
  /** the item's full title or sentence, exactly as it reads on the card it was opened from */
  title: string;
}

/** A run plays through once per item per session; after that the modal opens already settled. */
function alreadySeen(k: string) {
  try {
    return sessionStorage.getItem(`${SEEN_KEY}:${k}`) === "1";
  } catch {
    return false;
  }
}
function markSeen(k: string) {
  try {
    sessionStorage.setItem(`${SEEN_KEY}:${k}`, "1");
  } catch {
    /* storage unavailable */
  }
}

/**
 * "How it was decided" — the trigger. Clicking it opens the trace modal; this is no longer a
 * hover tooltip, so the reasoning holds the centre of the screen for as long as it is read.
 */
export function TraceTrigger({
  trace,
  source,
  title,
  label = "How it was decided",
  compact = false,
}: TraceSubject & { trace: ActionTrace; label?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={compact ? `${label}: ${title}` : undefined}
        className={`inline-flex h-6 shrink-0 items-center gap-1 rounded px-1 text-[11.5px] ${open ? "bg-cx-hover text-cx-text" : "text-cx-muted hover:text-cx-text"}`}
      >
        <Workflow className="h-3 w-3" />
        {!compact && label}
      </button>
      {open && (
        <TraceModal
          trace={trace}
          source={source}
          title={title}
          label={label}
          onClose={() => {
            setOpen(false);
            trigger.current?.focus();
          }}
        />
      )}
    </>
  );
}

/** The four steps of a trace, as the sequence reads them. */
function steps(trace: ActionTrace) {
  const chosen = trace.evaluated.find((e) => e.chosen) ?? trace.evaluated[0];
  return [
    { icon: Inbox, actor: "Input", doing: "reading it in", did: trace.input.label, evidence: "Input received" },
    {
      icon: GitBranch,
      actor: "Evaluated",
      doing: `weighing ${trace.evaluated.length} agents`,
      did: `${AGENTS[chosen.agent].name} set the route`,
      evidence: "Evaluated against",
    },
    {
      icon: CornerDownRight,
      actor: "Routed",
      doing: "placing the action",
      did: trace.escalated ? "Routed, with one call above your authority" : "Routed on the evidence",
      evidence: "Why it landed here",
    },
    { icon: CircleDot, actor: "Outcome", doing: "confirming", did: trace.outcome, evidence: "Outcome" },
  ];
}

/** One step's evidence: its source data, the agents weighed, the reasoning, or the result. */
function StepEvidence({ trace, i, onLink }: { trace: ActionTrace; i: number; onLink: () => void }) {
  if (i === 0)
    return (
      <>
        <p className="text-[13.5px] leading-snug text-cx-text">{trace.input.label}</p>
        <p className="mt-1 text-[12.5px] leading-snug text-cx-muted">{trace.input.detail}</p>
        <p className="mt-1.5 font-data text-[11.5px] text-cx-faint">Arrived {trace.input.at}</p>
      </>
    );
  if (i === 1)
    return (
      <ul className="grid gap-2 sm:grid-cols-2">
        {trace.evaluated.map((e) => (
          <li key={e.agent} className="flex items-start gap-2">
            <AgentIcon agent={e.agent} size="sm" round />
            <span className="min-w-0 text-[12.5px] leading-snug">
              <span className={e.chosen ? "text-cx-text" : "text-cx-muted"}>{AGENTS[e.agent].name}</span>{" "}
              <span className={e.chosen ? "text-cx-muted" : "text-cx-faint"}>{e.verdict}</span>
              {e.chosen && (
                <span className="ml-1.5 inline-flex h-[18px] items-center gap-1 whitespace-nowrap rounded-full border border-[#2f6fed]/50 bg-[#2f6fed]/15 px-1.5 align-middle text-[10.5px] text-[color:var(--ai-ink)]">
                  <CornerDownRight className="h-2.5 w-2.5" /> set the route
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    );
  if (i === 2)
    return (
      <>
        <p className="max-w-[72ch] text-[13.5px] leading-relaxed text-cx-text">{trace.why}</p>
        {trace.escalated && (
          <p className="mt-2.5 flex max-w-[72ch] items-start gap-1.5 text-[12.5px] leading-snug text-[color:var(--ai-ink)]">
            <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {trace.escalated}
          </p>
        )}
      </>
    );
  return (
    <>
      <p className="flex max-w-[72ch] items-start gap-2 text-[13.5px] leading-snug text-cx-text">
        <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: DONE }} /> {trace.outcome}
      </p>
      <button onClick={onLink} className="mt-2.5 text-[12.5px] text-[#4f86f7] hover:underline">
        {trace.link} →
      </button>
    </>
  );
}

/**
 * The trace itself: centred and landscape, so the chain has room to run left to right.
 * The header never moves as the sequence steps; the evidence beneath the timeline does.
 */
function TraceModal({ trace, source, title, label, onClose }: TraceSubject & { trace: ActionTrace; label: string; onClose: () => void }) {
  const { toast, role } = useHome();
  const go = useCortexNav();
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const closeFn = useRef(onClose);
  closeFn.current = onClose;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const seenKey = `${source}|${title}`;
  const S = steps(trace);

  // `at` is the step holding the light; `settled` means the run is over and any step is re-selectable
  const [at, setAt] = useState(0);
  const [handoff, setHandoff] = useState(false);
  const [settled, setSettled] = useState(false);
  /** 0 until the reader picks a step; bumped per pick so the same block can pulse twice running */
  const [pick, setPick] = useState(0);
  const blocks = useRef<(HTMLDivElement | null)[]>([]);

  /** picking a step from the finished chain brings its block into view and pulses it */
  const choose = (i: number) => {
    setAt(i);
    setPick((n) => n + 1);
    blocks.current[i]?.scrollIntoView({ block: "nearest", behavior: reduceMotion() ? "auto" : "smooth" });
  };

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  /** land on the last step with every step done — where a finished run ends up */
  const settle = useCallback(() => {
    clear();
    setSettled(true);
    setHandoff(false);
    setAt(STEPS - 1);
    setPick(0);
    markSeen(seenKey);
  }, [seenKey]);

  const play = useCallback(() => {
    clear();
    setSettled(false);
    setHandoff(false);
    setAt(-1);
    setPick(0);
    let t = TRACE_TIMING.start;
    for (let i = 0; i < STEPS; i++) {
      timers.current.push(
        setTimeout(() => {
          setAt(i);
          setHandoff(false);
        }, t)
      );
      t += TRACE_TIMING.active;
      if (i < STEPS - 1) {
        timers.current.push(setTimeout(() => setHandoff(true), t));
        t += TRACE_TIMING.handoff;
      }
    }
    timers.current.push(setTimeout(settle, t));
  }, [settle]);

  useEffect(() => {
    // watched already, or motion is turned down: show where the run ended rather than replaying it
    if (reduceMotion() || alreadySeen(seenKey)) settle();
    else play();
    return clear;
  }, [play, settle, seenKey]);

  useEffect(() => {
    closeRef.current?.focus();
    // capture on window, so Escape closes only this modal and not a drawer it was opened from
    const k = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      closeFn.current();
    };
    window.addEventListener("keydown", k, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k, true);
      document.body.style.overflow = prev;
    };
  }, []);

  const state = (i: number): SeqState => {
    if (settled) return "done";
    if (at < 0 || i > at) return "waiting";
    if (i === at && !handoff) return "active";
    return "done";
  };
  // MAP and Pitch are the ASM's pages; on the Head of Sales view these links stay previews
  const openLink = () => {
    const to = linkPage(trace.link, role);
    if (to) go(to);
    else toast(`Opens: ${trace.link.replace("View ", "")}.`);
  };

  /** the step the reader has singled out, or none while the chain plays or has just landed */
  const picked = settled && pick > 0 ? at : -1;

  const cur = at >= 0 ? S[at] : null;
  const status = settled
    ? `${trace.input.at} · routed in ${STEPS} steps · select a step to jump to it`
    : cur
      ? `${trace.input.at} · ${cur.actor}: ${handoff ? cur.did : `${cur.doing}…`}`
      : `${trace.input.at} · starting`;

  return createPortal(
    <div
      className="cx-modal-scrim fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 sm:p-6"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="cx-land-fade flex max-h-[calc(100vh-32px)] w-[min(1080px,100%)] flex-col overflow-hidden rounded-lg border border-cx-strong bg-cx-panel shadow-[0_24px_64px_rgba(0,0,0,0.55)]"
      >
        {/* Header — which item this reasoning is for. Fixed; the timeline below moves, this does not. */}
        <header className="shrink-0 border-b border-cx-line px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="inline-flex h-[22px] items-center rounded-full border border-cx-strong bg-cx-raised px-2 font-data text-[10.5px] uppercase tracking-[0.08em] text-cx-muted">{source}</span>
                <span className="inline-flex items-center gap-1.5 font-data text-[11px] text-cx-faint">
                  <Workflow className="h-3 w-3" /> {label} · {trace.input.at}
                </span>
              </p>
              <h2 id={titleId} className="mt-2 text-[16px] font-medium leading-snug text-cx-text [text-wrap:pretty]">
                {title}
              </h2>
            </div>
            <button ref={closeRef} onClick={onClose} className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-cx-faint hover:bg-cx-hover hover:text-cx-text" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-6 sm:px-7">
          {/* The chain, left to right: one step lit at a time, then a dot travels to the next. */}
          <ol className={`grid grid-cols-1 gap-1 md:gap-0 ${SEQ_GRID[STEPS]}`}>
            {S.map((s, i) => (
              <React.Fragment key={s.actor}>
                <SequenceTile
                  icon={<s.icon className="h-8 w-8 md:h-9 md:w-9" strokeWidth={1.6} />}
                  actor={s.actor}
                  line={state(i) === "active" ? `${s.doing}…` : state(i) === "done" ? s.did : "Waiting"}
                  state={state(i)}
                  selected={picked === i}
                  onSelect={settled ? () => choose(i) : undefined}
                  selectLabel={settled ? `Jump to the evidence for ${s.evidence}` : undefined}
                />
                {i < STEPS - 1 && <SequenceConnector lit={settled || at > i || (at === i && handoff)} travelling={!settled && handoff && at === i} />}
              </React.Fragment>
            ))}
          </ol>

          {/* While the chain plays, the evidence follows the light. Once every step is done the
              whole record is on screen at once, each step's text under its own heading. */}
          {settled ? (
            <div className="mt-6 divide-y divide-cx-line overflow-hidden rounded-lg border border-cx-line bg-cx-raised">
              {S.map((s, i) => (
                <div
                  key={`${s.actor}-${picked === i ? pick : 0}`}
                  ref={(el) => {
                    blocks.current[i] = el;
                  }}
                  className={`px-4 py-3.5 sm:px-5 ${picked === i ? "cx-flash" : ""}`}
                >
                  <p className="font-data text-[10.5px] uppercase tracking-[0.08em] text-cx-faint">
                    {i + 1} · {s.evidence}
                  </p>
                  <div className="mt-2.5">
                    <StepEvidence trace={trace} i={i} onLink={openLink} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 min-h-[132px] rounded-lg border border-cx-line bg-cx-raised px-4 py-3.5 sm:px-5">
              {cur ? (
                <div key={at} className="cx-land-fade">
                  <p className="font-data text-[10.5px] uppercase tracking-[0.08em] text-cx-faint">Evidence · {cur.evidence}</p>
                  <div className="mt-2.5">
                    <StepEvidence trace={trace} i={at} onLink={openLink} />
                  </div>
                </div>
              ) : (
                <p className="text-[12.5px] text-cx-faint">Replaying how Sales AI decided this…</p>
              )}
            </div>
          )}
        </div>

        <footer className="flex shrink-0 items-center gap-3 border-t border-cx-line px-5 py-3 sm:px-7">
          <p className="flex min-w-0 flex-1 items-center gap-2 text-[12px] text-cx-muted" aria-live="polite">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${settled ? "bg-cx-strong" : "bg-ai"}`} aria-hidden />
            <span className="min-w-0 truncate">{status}</span>
          </p>
          {settled ? (
            <button onClick={play} className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-cx-muted hover:text-cx-text">
              <RotateCcw className="h-3.5 w-3.5" /> Replay
            </button>
          ) : (
            <button onClick={settle} className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-cx-muted hover:text-cx-text">
              <SkipForward className="h-3.5 w-3.5" /> Show all steps
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body
  );
}

/** The run an action kicks off, taken from its own trace when the caller has no richer one. */
function runFromTrace(label: string, trace?: ActionTrace): AgentRun {
  const chosen = trace?.evaluated.find((e) => e.chosen) ?? trace?.evaluated[0];
  return {
    agent: chosen?.agent ?? "map",
    steps: ["re-checking the evidence", `${label.replace(/^[A-Z]/, (c) => c.toLowerCase())}`],
    result: trace?.outcome ?? `${label} · done`,
    link: trace?.link ?? "View in Tracker",
  };
}

/**
 * A suggested action: Sales AI proposes it, the ASM confirms, the agent works, and only then
 * does the tick appear — the tick means finished, never "available to click" (1 Oct corrections).
 * The trace sits in the same row as an icon; it carries its name for screen readers only.
 */
export function SuggestedOutcome({
  id,
  label,
  trace,
  source,
  title,
  run,
  removed,
  onRestore,
}: TraceSubject & {
  /** unique per action, so a confirmation survives moving between pages */
  id: string;
  label: string;
  trace?: ActionTrace;
  /** the agent's own run, when the caller has one */
  run?: AgentRun;
  /** the ASM took the action back out */
  removed?: boolean;
  onRestore?: () => void;
}) {
  const [confirmed, confirm] = useConfirmedActions();
  const [running, setRunning] = useState<number | null>(null);
  const done = confirmed.includes(id);

  if (removed) {
    return (
      <div className="flex h-8 w-full items-center gap-2 rounded-md border border-dashed border-cx-strong px-2.5 text-[12px] text-cx-faint">
        <span className="min-w-0 flex-1 truncate">Removed · {label}</span>
        {trace && <TraceTrigger trace={trace} source={source} title={title} compact />}
        {onRestore && (
          <button onClick={onRestore} className="shrink-0 text-cx-muted hover:text-cx-text">
            Restore
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-start gap-1.5">
      {done ? (
        <div className="flex min-h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md border border-cx-line bg-cx-raised px-2.5 py-1.5 text-[12.5px] leading-snug text-cx-text" title={`Done by Sales AI: ${label}`}>
          <span className="min-w-0">{label}</span>
          <Check className="h-3.5 w-3.5 shrink-0" style={{ color: DONE }} aria-label="done" />
        </div>
      ) : running ? (
        <div className="min-w-0 flex-1">
          <AgentRunChip key={running} run={run ?? runFromTrace(label, trace)} block onDone={() => confirm(id)} />
        </div>
      ) : (
        <button
          onClick={() => setRunning(Date.now())}
          title={`Suggested by Sales AI: ${label}. Confirm to run it.`}
          className="flex min-h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-[#2f6fed]/40 bg-[#2f6fed]/10 px-2.5 py-1.5 text-left text-[12.5px] leading-snug hover:border-[#2f6fed]/70"
        >
          <span className="shrink-0 font-data text-[10px] uppercase tracking-[0.06em] text-[color:var(--ai-ink)]">Suggested</span>
          <span className="min-w-0 text-cx-text">{label}</span>
        </button>
      )}
      {trace && <TraceTrigger trace={trace} source={source} title={title} compact />}
    </div>
  );
}
