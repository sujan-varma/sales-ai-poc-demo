"use client";

// "Agent at work" — one pattern for anywhere an action triggers real agent work.
// A small chip at the point of action names the agent, steps through a short,
// honest sequence of what it's doing, then resolves into a concrete confirmation
// with a link to the result. A few seconds, never a long wait.

import React, { createContext, useContext, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { AGENTS, AgentRun } from "@/data/cortexHome";
import { useHome } from "./HomeState";
import { AgentIcon } from "./primitives";

const STEP_MS = 850;

/** Product name shown in copy (Option B is branded "Sales AI"). */
const BrandCtx = createContext("Cortex");
export function BrandProvider({ name, children }: { name: string; children: React.ReactNode }) {
  return <BrandCtx.Provider value={name}>{children}</BrandCtx.Provider>;
}
export function useBrand() {
  return useContext(BrandCtx);
}

/** Mount it to start the run; re-key it to run again. */
export function AgentRunChip({ run, onDone, minMs = 0, block = false }: { run: AgentRun; onDone?: () => void; minMs?: number; block?: boolean }) {
  const { toast } = useHome();
  const [step, setStep] = useState(0);
  const done = step >= run.steps.length;

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // a minimum run time (if given) is honoured even with reduced motion — only the animation is dropped
    const ms = Math.max(reduce ? 300 : STEP_MS, minMs / run.steps.length);
    const timers = run.steps.map((_, i) => setTimeout(() => setStep(i + 1), (i + 1) * ms));
    return () => timers.forEach(clearTimeout);
  }, [run, minMs]);

  useEffect(() => {
    if (done) onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const agent = AGENTS[run.agent].name;

  if (!done) {
    return (
      <span role="status" aria-live="polite" className={`${block ? "flex w-full rounded-md" : "inline-flex max-w-full rounded-full"} h-8 items-center gap-2 border border-cx-line bg-cx-raised pl-1.5 pr-3 text-[12px] text-cx-muted`}>
        <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-cx-strong border-t-cx-text motion-safe:animate-spin" />
          <AgentIcon agent={run.agent} size="sm" round />
        </span>
        <span className="truncate">
          <span className="text-cx-text">{agent} agent</span> · {run.steps[Math.min(step, run.steps.length - 1)]}
          <span className="motion-safe:animate-pulse">…</span>
        </span>
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-live="polite"
      title={run.result}
      className={`${block ? "flex w-full rounded-md" : "inline-flex max-w-full rounded-full"} h-8 min-w-0 flex-nowrap items-center gap-2 border border-cx-line bg-cx-raised pl-2 pr-3 text-[12px]`}
    >
      <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "#2fa85c" }} />
      {/* always one line: long results end in "…", the full text is in the tooltip */}
      <span className="min-w-0 truncate text-cx-text">{run.result}</span>
      <button onClick={() => toast(`Opens: ${run.link.replace("View ", "")}.`)} className="shrink-0 whitespace-nowrap text-[#4f86f7] hover:underline">
        {run.link} →
      </button>
    </span>
  );
}
