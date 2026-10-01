"use client";

// What Sales AI has been doing: the live four-block flow on the Head of Sales homepage
// (correction pass 4 brings it back from the Activity Log). Inputs → Agents activated →
// Actions routed → Outcomes. Whatever is being worked right now travels through the blocks,
// lighting each one with cx-glow in turn; the agents doing the work pulse; when it lands the
// totals move. Inputs that arrive while the page is open play through the same way.

import { LBL } from "@/data/labels";
import React, { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowRight, Check, ChevronRight, Scale, UserMinus } from "lucide-react";
import { AGENTS, AGENT_ORDER, AgentId } from "@/data/cortexHome";
import { ActivityEntry, DECISIONS, Destination, LIVE_ENTRY_ID, LIVE_QUEUE, TODAY_ACTIVITY, entryActions } from "@/data/leadership";
import { card, Eyebrow } from "../kit";
import { useCortexNav } from "../nav";
import { AgentIcon } from "../primitives";
import { DEST_META } from "./activity";

const STAGE_MS = 1600;
const AGENT_MS = 1500;
const PAUSE_MS = 3200;

const where = (e: ActivityEntry) => e.territory ?? e.region;
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** How each input kind reads once it's done. */
const DONE_VERB: Record<AgentId, string> = { huddle: "held", pitch: "ingested", thermometer: "raised", map: "made" };
const KIND: Record<AgentId, string> = { huddle: "Huddles and calls", pitch: "Visit logs", thermometer: "Market signals", map: "Plan updates" };

type Phase = { idx: number; stage: 0 | 1 | 2 | 3; agent: number } | { idx: -1; stage: -1; agent: -1 };

/** The live queue: the 17:30 call still being worked, then the inputs that arrive after it. */
function useFlow() {
  const queue = useMemo(() => [TODAY_ACTIVITY.find((e) => e.id === LIVE_ENTRY_ID)!, ...LIVE_QUEUE], []);
  const base = useMemo(() => TODAY_ACTIVITY.filter((e) => e.id !== LIVE_ENTRY_ID), []);
  const [landed, setLanded] = useState(0);
  const [phase, setPhase] = useState<Phase>({ idx: 0, stage: 0, agent: 0 });

  useEffect(() => {
    if (reduceMotion()) {
      // no travelling light: show where things stand once the call has landed
      setLanded(1);
      setPhase({ idx: -1, stage: -1, agent: -1 });
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = 400;
    queue.forEach((e, idx) => {
      if (idx > 0) t += PAUSE_MS;
      timers.push(setTimeout(() => setPhase({ idx, stage: 0, agent: 0 }), t));
      t += STAGE_MS;
      e.chain.forEach((_, a) => {
        timers.push(setTimeout(() => setPhase({ idx, stage: 1, agent: a }), t));
        t += AGENT_MS;
      });
      timers.push(setTimeout(() => setPhase({ idx, stage: 2, agent: 0 }), t));
      t += STAGE_MS;
      timers.push(setTimeout(() => setPhase({ idx, stage: 3, agent: 0 }), t));
      t += STAGE_MS;
      timers.push(
        setTimeout(() => {
          setLanded(idx + 1);
          setPhase({ idx: -1, stage: -1, agent: -1 });
        }, t)
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [queue]);

  const done = [...base, ...queue.slice(0, landed)];
  const current = phase.idx >= 0 ? queue[phase.idx] : null;
  return { done, current, phase, waiting: landed >= queue.length && !current };
}

export function LiveFlow() {
  const go = useCortexNav();
  const { done, current, phase } = useFlow();
  const stage = phase.stage;

  const inputs = [...done].reverse();
  const kinds = (Object.keys(KIND) as AgentId[]).map((a) => ({ a, n: done.filter((e) => e.source === a).length })).filter((k) => k.n);
  const runs = (a: AgentId) => done.filter((e) => e.source === a || e.chain.some((c) => c.agent === a)).length;
  const working = current && stage === 1 ? current.chain[phase.agent] : null;
  const routed = (["Tracker", "Market Action Plan", "Pitch"] as Destination[]).map((to) => ({ to, n: done.reduce((k, e) => k + (e.routes.find((r) => r.to === to)?.n ?? 0), 0) }));
  const routedTotal = done.reduce((k, e) => k + entryActions(e), 0);
  const pendingRoute = (to: Destination) => (current && stage >= 2 ? current.routes.find((r) => r.to === to)?.n ?? 0 : 0);

  const status = current
    ? stage === 0
      ? `${current.at} · ${current.what}, ${where(current)} · reading it in`
      : stage === 1 && working
        ? `${current.at} · ${current.what}, ${where(current)} · ${AGENTS[working.agent].name} ${working.did}`
        : stage === 2
          ? `${current.at} · ${current.what}, ${where(current)} · routing ${current.routes.map((r) => `${r.n} to ${DEST_META[r.to].short}`).join(", ")}`
          : `${current.at} · ${current.what}, ${where(current)} · ${current.decision ? `decision #${current.decision} to you` : "in motion"}`
    : `Up to date · Excel data as of ${LBL.dataDate}; the next workbook sync brings new data`;

  const glow = (s: number) => (current && stage === s ? "cx-glow" : "border border-cx-line bg-cx-panel");
  const Conn = ({ lit }: { lit: boolean }) => (
    <span aria-hidden className="flex items-center justify-center md:w-6">
      <ArrowRight className={`hidden h-4 w-4 transition-colors duration-500 md:block ${lit ? "text-[color:var(--ai-ink)]" : "text-cx-strong"}`} />
      <ArrowDown className={`h-4 w-4 transition-colors duration-500 md:hidden ${lit ? "text-[color:var(--ai-ink)]" : "text-cx-strong"}`} />
    </span>
  );

  return (
    <section aria-labelledby="flow-title" className={`${card} p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="flow-title" className="flex items-center gap-2.5 text-[15px] font-medium text-cx-text">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cx-line bg-cx-raised">
            <span className="relative flex h-2.5 w-2.5" aria-hidden>
              <span className="absolute inset-0 rounded-full bg-ai opacity-60 motion-safe:animate-ping" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-ai" />
            </span>
          </span>
          What Sales AI has been doing
          <span className="font-data text-[10.5px] font-normal uppercase tracking-[0.08em] text-ai">Live</span>
        </h2>
        <button onClick={() => go("activity-log")} className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] text-cx-muted hover:text-cx-text">
          Activity log <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 items-stretch gap-2 md:grid-cols-[minmax(0,1.25fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
        {/* 1 · Inputs: what has already happened, newest first */}
        <div className={`flex min-w-0 flex-col rounded-lg px-4 py-4 transition-colors ${glow(0)}`}>
          <div className="flex items-baseline justify-between gap-2">
            <Eyebrow>Inputs</Eyebrow>
            <span className="font-data text-[20px] leading-none tabular-nums text-cx-text">{done.length}</span>
          </div>
          <ul className="mt-3 space-y-1.5">
            {current && (
              <li className="flex items-center gap-2 text-[12.5px] text-cx-text">
                <span className="relative flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
                  <span className="absolute h-2 w-2 rounded-full bg-ai opacity-60 motion-safe:animate-ping" />
                  <span className="relative h-2 w-2 rounded-full bg-ai" />
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {current.what} · {where(current)}
                </span>
                <span className="font-data text-[11px] text-ai">{stage === 0 ? "now" : current.at}</span>
              </li>
            )}
            {inputs.slice(0, current ? 4 : 5).map((e) => (
              <li key={e.id} className="flex items-center gap-2 text-[12.5px] text-cx-muted">
                <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "#2fa85c" }} aria-label="done" />
                <span className="min-w-0 flex-1 truncate" title={`${e.what} · ${where(e)} · ${e.chain[0]?.did ?? ""}`}>
                  {e.what} · {where(e)}
                </span>
                <span className="font-data text-[11px] text-cx-faint">{e.at}</span>
              </li>
            ))}
          </ul>
          <p className="mt-auto pt-3 text-[11.5px] leading-snug text-cx-muted">
            {kinds.map((k, i) => (
              <span key={k.a}>
                {i > 0 && " · "}
                <span className="font-data tabular-nums text-cx-text">{k.n}</span> {KIND[k.a].toLowerCase()} {DONE_VERB[k.a]}
              </span>
            ))}
          </p>
        </div>
        <Conn lit={!!current && stage >= 1} />

        {/* 2 · Agents activated: whoever is working right now pulses */}
        <div className={`flex min-w-0 flex-col rounded-lg px-4 py-4 transition-colors ${glow(1)}`}>
          <Eyebrow>Agents activated</Eyebrow>
          <ul className="mt-3 space-y-1">
            {AGENT_ORDER.map((a) => {
              const active = working?.agent === a;
              const n = runs(a);
              return (
                <li key={a} className={`-mx-2 flex items-center gap-2.5 rounded-md px-2 py-1 ${active ? "cx-glow" : ""}`}>
                  <span className="flex shrink-0">
                    <AgentIcon agent={a} size="sm" round />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[12.5px] ${active ? "text-cx-text" : n ? "text-cx-muted" : "text-cx-faint"}`}>{AGENTS[a].name}</span>
                    {active && <span className="block truncate text-[11px] text-[color:var(--ai-ink)]">{working!.did}</span>}
                  </span>
                  <span className="font-data text-[11px] tabular-nums text-cx-faint">{active ? "working" : n ? `${n} runs` : "idle"}</span>
                </li>
              );
            })}
            <li className="-mx-2 flex items-center gap-2.5 px-2 py-1 text-cx-faint">
              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-dashed border-cx-strong">
                <UserMinus className="h-3 w-3" />
              </span>
              <span className="flex-1 text-[12.5px]">Churn</span>
              <span className="text-[11px]">not live yet</span>
            </li>
          </ul>
        </div>
        <Conn lit={!!current && stage >= 2} />

        {/* 3 · Actions routed (as built) */}
        <div className={`flex min-w-0 flex-col rounded-lg px-4 py-4 transition-colors ${glow(2)}`}>
          <Eyebrow>Actions routed</Eyebrow>
          <span className="mt-3 font-data text-[28px] leading-none tabular-nums text-cx-text">{routedTotal}</span>
          <ul className="mt-3 space-y-1">
            {routed.map((r) => {
              const add = pendingRoute(r.to);
              return (
                <li key={r.to} className="flex items-center justify-between gap-2 text-[12px] text-cx-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: DEST_META[r.to].color }} aria-hidden /> {r.to}
                  </span>
                  <span className="font-data tabular-nums text-cx-text">
                    {add > 0 && <span className="mr-1.5 text-[color:var(--ai-ink)]">+{add}</span>}
                    {r.n}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <Conn lit={!!current && stage >= 3} />

        {/* 4 · Outcomes (as built) */}
        <div className={`flex min-w-0 flex-col rounded-lg px-4 py-4 transition-colors ${glow(3)}`}>
          <Eyebrow>Outcomes</Eyebrow>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="font-data text-[28px] leading-none tabular-nums text-cx-text">{routedTotal}</span>
            <span className="text-[12.5px] text-cx-muted">in motion</span>
          </p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="font-data text-[28px] leading-none tabular-nums text-cx-text">{DECISIONS.length}</span>
            <span className="text-[12.5px] text-cx-muted">awaiting your decision</span>
          </p>
          {current && stage === 3 && current.decision && (
            <span className="mt-3 inline-flex h-6 w-fit items-center gap-1 rounded-full border border-[#2f6fed]/50 bg-[#2f6fed]/15 px-2 text-[11.5px] text-[color:var(--ai-ink)]">
              <Scale className="h-3 w-3" /> Decision #{current.decision} · you
            </span>
          )}
        </div>
      </div>

      <p className="mt-3 flex min-w-0 items-center gap-2 text-[12px] text-cx-muted" aria-live="polite">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${current ? "bg-ai" : "bg-cx-strong"}`} aria-hidden />
        <span className="truncate">{status}</span>
      </p>
    </section>
  );
}
