"use client";

// The icon-sequence animation, shared by the two places that show a chain stepping through:
// the Head of Sales "What Sales AI is doing" indicator (OrchestrationStory) and the
// "How it was decided" trace modal. One step is live at a time inside a round cx-glow ring
// with its icon breathing; when it completes, the connector fills and a dot travels it once
// before the next step lights. Extracted so the two surfaces share the timing and the motion
// rather than each carrying its own copy of it (PRODUCT.md: one pattern language).

import React from "react";
import { ArrowDown, Check } from "lucide-react";

/**
 * Two paces for the same motion. The Live indicator narrates work happening now, so each
 * stage holds for 10 s and a presenter can talk to it (1 Oct corrections). The trace modal
 * replays a chain that already ran, so it moves at reading pace instead.
 */
export const LIVE_TIMING = { start: 700, active: 10000, handoff: 700 };
export const TRACE_TIMING = { start: 300, active: 2200, handoff: 400 };

export type SeqState = "waiting" | "active" | "done";

export const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Column templates for a step row: a stage, a narrow connector, a stage… Stages share the
 * space evenly; connectors stay slim. Applied at `md` and up, where the chain is horizontal.
 * Written out per step count because Tailwind compiles these classes ahead of time and
 * cannot see a string built at runtime.
 */
export const SEQ_GRID: Record<number, string> = {
  4: "md:grid-cols-[minmax(0,1fr)_minmax(28px,0.45fr)_minmax(0,1fr)_minmax(28px,0.45fr)_minmax(0,1fr)_minmax(28px,0.45fr)_minmax(0,1fr)]",
  5: "md:grid-cols-[minmax(0,1fr)_minmax(28px,0.45fr)_minmax(0,1fr)_minmax(28px,0.45fr)_minmax(0,1fr)_minmax(28px,0.45fr)_minmax(0,1fr)_minmax(28px,0.45fr)_minmax(0,1fr)]",
};

/**
 * One step: the round icon tile, its actor label and its one-line state.
 * `onSelect` makes the tile a button — used once a run has settled and every step is
 * re-selectable; without it the tile is inert, as it is while a run plays.
 */
export function SequenceTile({
  icon,
  actor,
  line,
  state,
  dim = false,
  selected = false,
  onSelect,
  selectLabel,
}: {
  icon: React.ReactNode;
  actor: string;
  line: React.ReactNode;
  state: SeqState;
  /** the run is over and nothing is live: done steps read quieter */
  dim?: boolean;
  /** this is the step whose evidence is showing */
  selected?: boolean;
  onSelect?: () => void;
  selectLabel?: string;
}) {
  const active = state === "active";
  const tile = active
    ? "cx-glow cx-glow-round text-[color:var(--ai-ink)]"
    : state === "done"
      ? `border bg-cx-raised ${selected ? "border-[#4f86f7] text-cx-text" : `border-cx-line ${dim ? "text-cx-muted" : "text-cx-text"}`}`
      : "border border-dashed border-cx-strong text-cx-faint opacity-60";

  const inner = (
    <>
      <span className="relative flex shrink-0 justify-center">
        <span className={`relative flex h-16 w-16 items-center justify-center rounded-full transition-colors duration-500 md:h-[88px] md:w-[88px] ${tile}`}>
          <span className={active ? "cx-breathe" : ""}>{icon}</span>
        </span>
        {state === "done" && (
          <span className="absolute -bottom-0.5 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-cx-panel bg-[#2fa85c] md:right-1" aria-label="done">
            <Check className="h-3 w-3 text-white" strokeWidth={3} />
          </span>
        )}
      </span>
      <span className="min-w-0 md:mt-3 md:px-1">
        <span className={`block font-data text-[10.5px] uppercase tracking-[0.08em] ${active || selected ? "text-[color:var(--ai-ink)]" : "text-cx-faint"}`}>{actor}</span>
        <span className={`mt-1 block text-[12.5px] leading-snug ${active ? "text-cx-text" : state === "done" ? "text-cx-muted" : "text-cx-faint"}`}>{line}</span>
      </span>
    </>
  );

  const shape = "flex min-w-0 items-center gap-4 py-2 text-left md:flex-col md:gap-0 md:py-0 md:text-center";

  return (
    <li className="min-w-0" aria-current={active ? "step" : undefined}>
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={selectLabel}
          className={`${shape} w-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f6fed] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--cx-panel))] md:py-1`}
        >
          {inner}
        </button>
      ) : (
        <span className={shape}>{inner}</span>
      )}
    </li>
  );
}

/** Arrow to the next step; on hand-off a dot travels it once. */
export function SequenceConnector({ lit, travelling }: { lit: boolean; travelling: boolean }) {
  return (
    <li aria-hidden className="flex justify-start pl-6 md:block md:pl-0 md:pt-[43px]">
      <ArrowDown className={`h-4 w-4 md:hidden ${lit ? "text-[color:var(--ai-ink)]" : "text-cx-strong"}`} />
      <span className="relative hidden h-px w-full md:block">
        <span className="absolute inset-0 bg-cx-line" />
        <span
          className={`absolute inset-y-0 left-0 w-full origin-left bg-[#4f86f7] transition-transform duration-700 motion-reduce:transition-none ${lit ? "scale-x-100" : "scale-x-0"}`}
          style={{ transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)" }}
        />
        <span className={`absolute -right-0.5 -top-[4.5px] h-0 w-0 border-y-[5px] border-l-[6px] border-y-transparent ${lit ? "border-l-[#4f86f7]" : "border-l-[rgb(var(--cx-strong))]"}`} />
        {travelling && <span className="cx-travel absolute -top-[3px] h-[7px] w-[7px] -translate-x-1/2 rounded-full bg-ai shadow-[0_0_10px_rgba(94,234,212,0.8)]" />}
      </span>
    </li>
  );
}
