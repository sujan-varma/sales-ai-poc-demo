"use client";

// A suggested action, shown as what Sales AI has already done ("Push to Pitch engine ✓"),
// with its own orchestration trace in a "How it was decided" tooltip. Same visual language as the
// Leadership orchestration view (rail, cx-glow on the active step, trace chips),
// scoped to this one action — never a day-wide log.

import React, { useEffect, useRef, useState } from "react";
import { Check, CircleDot, CornerDownRight, GitBranch, Inbox, Scale, Workflow } from "lucide-react";
import { AGENTS } from "@/data/cortexHome";
import { ActionTrace } from "@/data/actionTraces";
import { useHome } from "./HomeState";
import { AgentIcon } from "./primitives";

const STEP_MS = 650;
const DONE = "#2fa85c";

/**
 * "How it was decided" — a hover tooltip (also opens on focus or tap) holding one action's
 * trace, over a slightly dimmed page so it reads as its own layer. Fixed-positioned beside
 * the trigger and kept inside the viewport; stays open while the pointer is over it.
 */
export function TraceTooltip({ trace, heading, label = "How it was decided", compact = false }: { trace: ActionTrace; heading?: string; label?: string; compact?: boolean }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const show = () => {
    clearTimeout(closeTimer.current);
    if (trigger.current) setRect(trigger.current.getBoundingClientRect());
  };
  const hide = () => {
    closeTimer.current = setTimeout(() => setRect(null), 140);
  };
  useEffect(() => {
    if (!rect) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setRect(null);
    const s = () => setRect(null);
    document.addEventListener("keydown", k);
    window.addEventListener("scroll", s, { passive: true });
    return () => {
      document.removeEventListener("keydown", k);
      window.removeEventListener("scroll", s);
    };
  }, [rect]);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const W = 420;
  let pos: React.CSSProperties = {};
  if (rect && typeof window !== "undefined") {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(W, vw - 24);
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - w / 2), vw - w - 12);
    const below = rect.bottom + 8;
    const roomBelow = vh - below;
    pos = roomBelow > 360 || rect.top < vh / 2 ? { left, top: below, width: w, maxHeight: vh - below - 12 } : { left, bottom: vh - rect.top + 8, width: w, maxHeight: rect.top - 20 };
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={() => (rect ? setRect(null) : show())}
        aria-expanded={!!rect}
        aria-label={compact ? label : undefined}
        className={`inline-flex h-6 shrink-0 items-center gap-1 rounded px-1 text-[11.5px] ${rect ? "bg-cx-hover text-cx-text" : "text-cx-muted hover:text-cx-text"}`}
      >
        <Workflow className="h-3 w-3" />
        {!compact && label}
      </button>
      {rect && (
        <>
          {/* the dim keeps the trace visually apart from the page beneath */}
          <div aria-hidden className="cx-land-fade pointer-events-none fixed inset-0 z-[65] bg-black/40" />
          <div
            role="tooltip"
            onMouseEnter={show}
            onMouseLeave={hide}
            className="cx-land-fade fixed z-[66] overflow-y-auto rounded-lg border border-cx-strong bg-cx-bg p-3.5 shadow-[0_16px_48px_rgba(0,0,0,0.5)]"
            style={pos}
          >
            <ActionTraceSteps trace={trace} heading={heading} />
          </div>
        </>
      )}
    </>
  );
}

/** The done-state control; "How it was decided" opens the action's trace as a tooltip. */
export function SuggestedOutcome({
  label,
  trace,
  removed,
  onRestore,
}: {
  label: string;
  trace?: ActionTrace;
  /** the ASM took the action back out */
  removed?: boolean;
  onRestore?: () => void;
}) {
  if (removed) {
    return (
      <div className="flex h-8 w-full items-center justify-between gap-2 rounded-md border border-dashed border-cx-strong px-2.5 text-[12px] text-cx-faint">
        <span className="truncate">Removed · {label}</span>
        {onRestore && (
          <button onClick={onRestore} className="shrink-0 text-cx-muted hover:text-cx-text">
            Restore
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <div className="flex min-h-8 w-full min-w-0 items-center gap-1.5 rounded-md border border-cx-line bg-cx-raised px-2.5 py-1.5 text-[12.5px] leading-snug text-cx-text" title={`Done by Sales AI: ${label}`}>
        <span>{label}</span>
        <Check className="h-3.5 w-3.5 shrink-0" style={{ color: DONE }} aria-label="done" />
      </div>
      {trace && (
        <div className="mt-1">
          <TraceTooltip trace={trace} />
        </div>
      )}
    </div>
  );
}

type St = "waiting" | "active" | "done";

function Step({ icon: Icon, title, state, last, children }: { icon: React.ComponentType<{ className?: string }>; title: string; state: St; last?: boolean; children: React.ReactNode }) {
  return (
    <li className="relative grid grid-cols-[18px_minmax(0,1fr)] gap-x-2.5 pb-2.5 last:pb-0">
      <span className="relative flex justify-center" aria-hidden>
        {!last && <span className={`absolute bottom-[-10px] top-5 w-px transition-colors duration-500 ${state === "done" ? "bg-[#4f86f7]" : "bg-cx-line"}`} />}
        <span
          className={`relative mt-3 h-2.5 w-2.5 rounded-full border-2 transition-colors duration-300 ${
            state === "done" ? "border-[#4f86f7] bg-[#4f86f7]" : state === "active" ? "border-[#4f86f7] bg-cx-bg" : "border-cx-strong bg-cx-bg"
          }`}
        />
      </span>
      <div
        className={`rounded-lg px-3 py-2.5 transition-opacity duration-300 ${state === "active" ? "cx-glow" : state === "done" ? "border border-cx-line bg-cx-panel" : "border border-dashed border-cx-strong opacity-40"}`}
        aria-current={state === "active" ? "step" : undefined}
      >
        <p className="flex items-center justify-between gap-2 font-data text-[10px] uppercase tracking-[0.08em] text-cx-faint">
          <span className="flex items-center gap-1.5">
            <Icon className="h-3 w-3" /> {title}
          </span>
          {state === "done" && <Check className="h-3 w-3" style={{ color: DONE }} />}
          {state === "active" && <span className="normal-case tracking-normal text-[color:var(--ai-ink)]">working</span>}
        </p>
        <div className="mt-1.5">{children}</div>
      </div>
    </li>
  );
}

/** The trace for one action. It plays through once when opened, then stays as a record. */
export function ActionTraceSteps({ trace, heading = "How Sales AI routed this one action" }: { trace: ActionTrace; heading?: string }) {
  const { toast } = useHome();
  const [step, setStep] = useState(0);
  const total = 4;
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setStep(total);
      return;
    }
    const timers = Array.from({ length: total }, (_, i) => setTimeout(() => setStep(i + 1), (i + 1) * STEP_MS));
    return () => timers.forEach(clearTimeout);
  }, []);
  const st = (i: number): St => (step > i ? "done" : step === i ? "active" : "waiting");

  return (
    <div className="cx-land-fade" role="region" aria-label="How this action was decided">
      <p className="mb-2.5 flex items-center gap-1.5 text-[11px] text-cx-faint">
        <Workflow className="h-3 w-3" /> {heading} · {trace.input.at}
      </p>
      <ol aria-live="polite">
        <Step icon={Inbox} title="Input received" state={st(0)}>
          <p className="text-[12.5px] text-cx-text">{trace.input.label}</p>
          <p className="text-[11.5px] text-cx-faint">{trace.input.detail}</p>
        </Step>
        <Step icon={GitBranch} title="Evaluated against" state={st(1)}>
          <ul className="space-y-1.5">
            {trace.evaluated.map((e) => (
              <li key={e.agent} className="flex items-start gap-2">
                <AgentIcon agent={e.agent} size="sm" round />
                <span className="min-w-0 text-[12px] leading-snug">
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
        </Step>
        <Step icon={CornerDownRight} title="Why it landed here" state={st(2)}>
          <p className="text-[12.5px] leading-snug text-cx-muted">{trace.why}</p>
          {trace.escalated && (
            <p className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-snug text-[color:var(--ai-ink)]">
              <Scale className="mt-0.5 h-3 w-3 shrink-0" /> {trace.escalated}
            </p>
          )}
        </Step>
        <Step icon={CircleDot} title="Outcome" state={st(3)} last>
          <p className="flex items-start gap-1.5 text-[12.5px] text-cx-text">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: DONE }} /> {trace.outcome}
          </p>
          <button onClick={() => toast(`Opens: ${trace.link.replace("View ", "")}.`)} className="mt-1 text-[12px] text-[#4f86f7] hover:underline">
            {trace.link} →
          </button>
        </Step>
      </ol>
    </div>
  );
}
