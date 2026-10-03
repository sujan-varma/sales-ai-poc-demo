"use client";

// A suggested action, shown as what Sales AI has already done ("Push to Pitch engine ✓"),
// with its own orchestration trace behind a "How it was decided" button (a modal). Same visual language as the
// Leadership orchestration view (rail, cx-glow on the active step, trace chips),
// scoped to this one action — never a day-wide log.

import React, { useEffect, useState } from "react";
import { Check, CircleDot, CornerDownRight, GitBranch, Inbox, Scale, Workflow } from "lucide-react";
import { AGENTS } from "@/data/cortexHome";
import { ActionTrace } from "@/data/actionTraces";
import { useHome } from "./HomeState";
import { linkPage, useCortexNav } from "./nav";
import { AgentIcon } from "./primitives";
import { CenterModal } from "./modal";

const STEP_MS = 650;
const DONE = "#2fa85c";

/**
 * "How it was decided" — a button that opens one action's trace in a centred modal (the same frame as the
 * confidence score's "Why this score"). The label varies by place: "Why it's in the plan", "Evidence", …
 */
export function TraceTooltip({ trace, heading, label = "How it was decided", compact = false }: { trace: ActionTrace; heading?: string; label?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={compact ? label : undefined}
        className={`inline-flex h-6 shrink-0 items-center gap-1 rounded px-1 text-[11.5px] ${open ? "bg-cx-hover text-cx-text" : "text-cx-muted hover:text-cx-text"}`}
      >
        <Workflow className="h-3 w-3" />
        {!compact && label}
      </button>
      {open && (
        <CenterModal title={label} onClose={() => setOpen(false)} width="max-w-[480px]">
          <ActionTraceSteps trace={trace} heading={heading} />
        </CenterModal>
      )}
    </>
  );
}

/** The done-state control; "How it was decided" opens the action's trace in a modal. */
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
  const { toast, role } = useHome();
  const go = useCortexNav();
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
          <button
            onClick={() => {
              // MAP and Pitch are the ASM's pages; on the Head of Sales view these links stay previews
              const to = linkPage(trace.link, role);
              if (to) go(to);
              else toast(`Opens: ${trace.link.replace("View ", "")}.`);
            }}
            className="mt-1 text-[12px] text-[#4f86f7] hover:underline"
          >
            {trace.link} →
          </button>
        </Step>
      </ol>
    </div>
  );
}
