"use client";

// What Sales AI has been doing.
// Home: one compact Live indicator — processing is ongoing, what's being worked right now,
// today's totals at a glance — that opens the Activity Log.
// Logs → Activity Log: the detail. Today's totals (inputs from every source, the agents that
// ran, by name, and where actions went), the live timeline, and the full table, per day,
// morning to night, with a column for every piece of each row.

import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronRight, Clock, CornerUpRight, GitBranch, ListChecks, MessageSquareQuote, MousePointerClick, Scale, UserMinus, Workflow, Zap } from "lucide-react";
import { AGENTS, AgentId, AGENT_ORDER, PRIMARY_BLUE_SOFT, STATUS_META } from "@/data/cortexHome";
import { ActionTrace } from "@/data/actionTraces";
import { ACTIVITY, ACTIVITY_DAYS, ActivityEntry, DECISIONS, Destination, LIVE_ENTRY_ID, REGIONS, TODAY_ACTIVITY, TRIGGER_LABEL, TriggerKind, entryActions } from "@/data/leadership";
import { card, CardHeader, Dropdown, Eyebrow } from "../kit";
import { useCortexNav } from "../nav";
import { AgentIcon } from "../primitives";
import { TraceTrigger } from "../actionTrace";
import { useRange } from "./common";

export const DEST_META: Record<Destination, { color: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; short: string }> = {
  Tracker: { color: STATUS_META.done.color, icon: ListChecks, short: "Tracker" },
  "Market Action Plan": { color: PRIMARY_BLUE_SOFT, icon: CornerUpRight, short: "Plan" },
  Pitch: { color: AGENTS.pitch.color, icon: MessageSquareQuote, short: "Pitch" },
  Initiatives: { color: "rgb(var(--cx-muted))", icon: GitBranch, short: "Initiatives" },
};

const TRIGGER_ICON: Record<TriggerKind, React.ComponentType<{ className?: string }>> = { scheduled: Clock, event: Zap, explicit: MousePointerClick };

const where = (e: ActivityEntry) => e.territory ?? e.region;
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** What kind of input an entry came from — inputs aren't only huddles. */
const INPUT_KIND: Record<AgentId, string> = { huddle: "huddles & calls", pitch: "visit logs", thermometer: "market signals", map: "plan updates" };

/** Today's totals, all from the same activity data the timeline shows. */
function todayTotals(entries: ActivityEntry[]) {
  const inputs = (Object.keys(INPUT_KIND) as AgentId[]).map((a) => ({ agent: a, label: INPUT_KIND[a], n: entries.filter((e) => e.source === a).length })).filter((x) => x.n > 0);
  const active = new Set<AgentId>(entries.flatMap((e) => [e.source, ...e.chain.map((c) => c.agent)]));
  const routed = (["Tracker", "Market Action Plan", "Pitch"] as Destination[]).map((to) => ({ to, n: entries.reduce((k, e) => k + (e.routes.find((r) => r.to === to)?.n ?? 0), 0) }));
  const decisions = entries.filter((e) => e.decision).length;
  return { inputs, inputTotal: entries.length, active, routed, routedTotal: routed.reduce((k, r) => k + r.n, 0), decisions };
}

/** A rule-based trace for one log entry: what came in, which agents ran, why it landed where it did. */
const WHY: Record<Destination, string> = {
  Tracker: "Work with an owner and a date goes to Tracker.",
  "Market Action Plan": "Changes to targets or initiatives belong in the plan.",
  Pitch: "Things to say or do at the outlet go onto the next beat through Pitch.",
  Initiatives: "Actions repeated across tools are merged into state-level initiatives.",
};
function entryTrace(e: ActivityEntry): ActionTrace {
  const why = e.routes.map((r) => WHY[r.to]).join(" ");
  return {
    input: { label: e.what, detail: `Came in through ${AGENTS[e.source].name} · ${where(e)}`, at: e.at },
    evaluated: e.chain.map((c, i) => ({ agent: c.agent, verdict: c.did, chosen: i === e.chain.length - 1 })),
    why: why || "Nothing for the ASMs to do yet; it's kept as evidence.",
    outcome: [...e.routes.map((r) => `${r.n} to ${r.to}`), ...(e.decision ? [`Decision #${e.decision} to you`] : [])].join(" · ") || "Recorded, no action",
    link: e.routes[0] ? `View in ${e.routes[0].to}` : "View the record",
    escalated: e.decision ? `It sits above one of your thresholds, so Decision #${e.decision} came to you.` : undefined,
  };
}

function RouteChip({ to, n }: { to: Destination; n: number }) {
  const m = DEST_META[to];
  const Icon = m.icon;
  return (
    <span className="inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-md border px-1.5 text-[11.5px] text-cx-text" style={{ borderColor: `color-mix(in srgb, ${m.color} 45%, transparent)` }}>
      <Icon className="h-3 w-3" style={{ color: m.color }} /> {m.short} <span className="font-data tabular-nums">{n}</span>
    </span>
  );
}

function DecisionChip({ n }: { n: number }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border border-[#2f6fed]/50 bg-[#2f6fed]/15 px-2 text-[11.5px] text-[color:var(--ai-ink)]">
      <Scale className="h-3 w-3" /> Decision #{n} · you
    </span>
  );
}

const Arrow = () => <ArrowRight className="h-3 w-3 shrink-0 text-cx-faint" aria-hidden />;

/** The live entry is still being worked when a page opens; it lands after a few seconds. */
function useLiveEntry() {
  const live = TODAY_ACTIVITY.find((e) => e.id === LIVE_ENTRY_ID)!;
  const [step, setStep] = useState(0);
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    if (reduceMotion()) {
      setLanded(true);
      return;
    }
    const timers = [...live.chain.map((_, i) => setTimeout(() => setStep(i), i * 1600)), setTimeout(() => setLanded(true), live.chain.length * 1600 + 600)];
    return () => timers.forEach(clearTimeout);
  }, [live.chain]);
  const entries = landed ? TODAY_ACTIVITY : TODAY_ACTIVITY.filter((e) => e.id !== LIVE_ENTRY_ID);
  return { live, step, landed, entries };
}

// ---------------------------------------------------------------------------
// Home: the compact Live indicator
// ---------------------------------------------------------------------------

export function LiveIndicator() {
  const go = useCortexNav();
  const { live, step, landed, entries } = useLiveEntry();
  const t = todayTotals(entries);
  const latest = landed ? live : [...entries].reverse()[0];
  const now = landed ? `${latest.what} · ${where(latest)} · routed` : `${live.what} · ${where(live)} · ${AGENTS[live.chain[step].agent].name} ${live.chain[step].did}`;
  return (
    <button
      onClick={() => go("activity-log")}
      aria-label="Live: Sales AI is processing. Open the Activity Log."
      className={`group flex w-full min-w-0 items-center gap-3 rounded-lg px-3.5 py-2.5 text-left md:w-auto md:max-w-[620px] ${landed ? "border border-cx-line bg-cx-panel hover:border-cx-strong" : "cx-glow"}`}
    >
      <span className="flex shrink-0 items-center gap-1.5 font-data text-[10.5px] uppercase tracking-[0.08em] text-ai">
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inset-0 rounded-full bg-ai opacity-60 motion-safe:animate-ping" />
          <span className="relative h-2 w-2 rounded-full bg-ai" />
        </span>
        Live
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] text-cx-text" aria-live="polite">
          {now}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-cx-faint">
          <span className="font-data tabular-nums text-cx-muted">{t.inputTotal}</span> inputs ·<span className="font-data tabular-nums text-cx-muted">{t.routedTotal}</span> routed ·
          <span className="font-data tabular-nums text-cx-muted">{t.decisions}</span> to you
          <span className="ml-1 hidden -space-x-1 sm:flex" title={AGENT_ORDER.filter((a) => t.active.has(a)).map((a) => AGENTS[a].name).join(", ")}>
            {AGENT_ORDER.filter((a) => t.active.has(a)).map((a) => (
              <span key={a} className="rounded-full ring-2 ring-[rgb(var(--cx-panel))]">
                <AgentIcon agent={a} size="sm" round />
              </span>
            ))}
          </span>
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-cx-faint group-hover:text-cx-text" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Activity Log: today's totals
// ---------------------------------------------------------------------------

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative z-10 flex min-w-0 flex-col rounded-lg border border-cx-line bg-cx-panel px-5 py-4">
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-3 flex flex-1 flex-col gap-2">{children}</div>
    </div>
  );
}

/** Four equal blocks of today's totals joined by a plain rule: related, not a sequence. Everything arrives together. */
export function TodayTotals() {
  const { entries } = useLiveEntry();
  const t = todayTotals(entries);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const big = "font-data text-[28px] leading-none tabular-nums text-cx-text";
  return (
    <section aria-labelledby="today-title">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 id="today-title" className="font-data text-[10.5px] uppercase tracking-[0.08em] text-cx-muted">
          Processed so far
        </h2>
        <span className="font-data text-[10.5px] text-cx-faint">today</span>
      </div>
      <div className="relative grid grid-cols-1 gap-4 md:grid-cols-4 md:gap-6">
        <span
          aria-hidden
          className="absolute bottom-6 left-6 top-6 w-px bg-cx-strong transition-transform duration-700 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] md:bottom-auto md:left-6 md:right-6 md:top-1/2 md:h-px md:w-auto"
          style={{ transform: drawn ? "scale(1)" : "scale(0)", transformOrigin: "center" }}
        />
        <Block label="Inputs">
          <span className={big}>{t.inputTotal}</span>
          <ul className="space-y-1">
            {t.inputs.map((x) => (
              <li key={x.agent} className="flex items-center justify-between gap-2 text-[12px] text-cx-muted">
                <span className="flex items-center gap-1.5">
                  <AgentIcon agent={x.agent} size="sm" round /> {x.label}
                </span>
                <span className="font-data tabular-nums text-cx-text">{x.n}</span>
              </li>
            ))}
          </ul>
        </Block>
        <Block label="Agents activated">
          <ul className="space-y-1.5">
            {AGENT_ORDER.map((a) => {
              const on = t.active.has(a);
              return (
                <li key={a} className={`flex items-center gap-2 text-[12.5px] ${on ? "text-cx-text" : "text-cx-faint"}`}>
                  <AgentIcon agent={a} size="sm" round /> {AGENTS[a].name}
                  {!on && <span className="text-[11px]">· idle</span>}
                </li>
              );
            })}
            <li className="flex items-center gap-2 text-[12.5px] text-cx-faint">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-cx-strong">
                <UserMinus className="h-3 w-3" />
              </span>
              Churn <span className="text-[11px]">· not live yet</span>
            </li>
          </ul>
        </Block>
        <Block label="Actions routed">
          <span className={big}>{t.routedTotal}</span>
          <ul className="space-y-1">
            {t.routed.map((r) => (
              <li key={r.to} className="flex items-center justify-between gap-2 text-[12px] text-cx-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: DEST_META[r.to].color }} aria-hidden /> {r.to}
                </span>
                <span className="font-data tabular-nums text-cx-text">{r.n}</span>
              </li>
            ))}
          </ul>
        </Block>
        <Block label="Outcomes">
          <p className="flex items-baseline gap-2">
            <span className={big}>{t.routedTotal}</span> <span className="text-[12.5px] text-cx-muted">in motion</span>
          </p>
          <p className="flex items-baseline gap-2">
            <span className={big}>{DECISIONS.length}</span> <span className="text-[12.5px] text-cx-muted">awaiting your decision</span>
          </p>
        </Block>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Activity Log: the live timeline (as built for the homepage, now here in full)
// ---------------------------------------------------------------------------

function FeedEntry({ e, working, step, fresh }: { e: ActivityEntry; working?: boolean; step?: number; fresh?: boolean }) {
  const key = e.chain[e.chain.length - 1];
  return (
    <li className={`grid grid-cols-[44px_minmax(0,1fr)] gap-x-3 ${fresh ? "cx-land-fade" : ""}`}>
      <span className="pt-[7px] text-right font-data text-[11.5px] text-cx-muted">{e.at}</span>
      <div className={`min-w-0 rounded-lg px-3 py-2 ${working ? "cx-glow" : "border border-transparent hover:border-cx-line"}`}>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[12.5px] leading-snug">
          <span className="inline-flex items-center gap-1.5 text-cx-text">
            <AgentIcon agent={e.source} size="sm" round />
            {AGENTS[e.source].name} <span className="text-cx-faint">({where(e)})</span>
          </span>
          <Arrow />
          {working ? (
            <span className="text-cx-muted" aria-live="polite">
              {AGENTS[e.chain[Math.min(step ?? 0, e.chain.length - 1)].agent].name} {e.chain[Math.min(step ?? 0, e.chain.length - 1)].did}
              <span className="motion-safe:animate-pulse">…</span>
            </span>
          ) : (
            <>
              <span className="text-cx-muted">
                {key.agent !== e.source && <span className="text-cx-text">{AGENTS[key.agent].name} </span>}
                {key.did}
              </span>
              {(e.routes.length > 0 || e.decision) && <Arrow />}
              {e.routes.map((r) => (
                <RouteChip key={r.to} {...r} />
              ))}
              {e.decision && <DecisionChip n={e.decision} />}
            </>
          )}
        </div>
        {working && <p className="mt-1 text-[11px] text-[color:var(--ai-ink)]">Working now · {e.what}</p>}
        {fresh && <p className="mt-1 font-data text-[10.5px] uppercase tracking-[0.06em] text-ai">Just now · {e.what}</p>}
      </div>
    </li>
  );
}

export function LiveTimeline() {
  const { live, step, landed } = useLiveEntry();
  const earlier = TODAY_ACTIVITY.filter((e) => e.id !== LIVE_ENTRY_ID).slice().reverse();
  return (
    <section aria-labelledby="timeline-title" className={`${card} flex h-full flex-col p-5`}>
      <CardHeader
        id="timeline-title"
        icon={<Workflow className="h-4 w-4" />}
        title="What Sales AI has been doing"
        badge={
          <span className="inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-full border border-ai/30 bg-ai/10 px-2 font-data text-[10px] uppercase tracking-[0.06em] text-ai">
            <span className="h-1.5 w-1.5 rounded-full bg-ai motion-safe:animate-pulse" /> Live
          </span>
        }
        right={<span className="text-[11.5px] text-cx-faint">Today, newest first</span>}
      />
      <ol className="mt-4 max-h-[460px] flex-1 space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin]" aria-label="Today's activity">
        {landed ? <FeedEntry e={live} fresh /> : <FeedEntry e={live} working step={step} />}
        {earlier.map((e) => (
          <FeedEntry key={e.id} e={e} />
        ))}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Activity Log: the table
// ---------------------------------------------------------------------------

const AGENT_NAMES = (Object.keys(AGENTS) as AgentId[]).map((a) => AGENTS[a].name);

export function ActivityLogTable({ fixedRegion, scopeLabel }: { fixedRegion?: string; scopeLabel?: string } = {}) {
  const range = useRange();
  const [agent, setAgent] = useState<string | null>(null);
  const [regionPick, setRegion] = useState<string | null>(null);
  const region = fixedRegion ?? regionPick;
  const [trigger, setTrigger] = useState<string | null>(null);
  const days = range.id === "today" ? ACTIVITY_DAYS.slice(0, 1) : ACTIVITY_DAYS;

  const rows = useMemo(
    () =>
      ACTIVITY.filter(
        (e) =>
          days.some((d) => d.key === e.day) &&
          (!agent || AGENTS[e.source].name === agent || e.chain.some((c) => AGENTS[c.agent].name === agent)) &&
          (!region || e.region === region || e.region === "All regions") &&
          (!trigger || TRIGGER_LABEL[e.trigger] === trigger)
      ),
    [days, agent, region, trigger]
  );
  const anyFilter = agent || regionPick || trigger;
  const th = "px-3 py-2.5 text-left text-[11px] font-normal text-cx-faint";
  const td = "px-3 py-3 align-top";

  return (
    <section aria-labelledby="alog-title" className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-4">
        <div>
          <h2 id="alog-title" className="flex flex-wrap items-baseline gap-x-2.5 text-[15px] font-medium text-cx-text">
            Every entry
            <span className="text-[11.5px] font-normal text-cx-faint">
              <span className="font-data text-cx-muted">{rows.length}</span> entries · <span className="font-data text-cx-muted">{rows.reduce((n, e) => n + entryActions(e), 0)}</span> routed · {scopeLabel ?? (range.id === "today" ? "today" : `${range.label} · the log keeps the last 7 days`)}
            </span>
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dropdown label="Agent" value={agent} options={AGENT_NAMES} onChange={setAgent} />
          {!fixedRegion && <Dropdown label="Region" value={region} options={REGIONS.map((r) => r.name)} onChange={setRegion} />}
          <Dropdown label="Trigger" value={trigger} options={Object.values(TRIGGER_LABEL)} onChange={setTrigger} />
          {anyFilter && (
            <button
              onClick={() => {
                setAgent(null);
                setRegion(null);
                setTrigger(null);
              }}
              className="h-8 px-1.5 text-[12px] text-cx-muted hover:text-cx-text"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] table-fixed border-t border-cx-line">
          <colgroup>
            <col className="w-[84px]" />
            <col className="w-[210px]" />
            <col />
            <col className="w-[330px]" />
            <col className="w-[210px]" />
            <col className="w-[56px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-cx-line">
              <th className={`${th} pl-5`}>Time</th>
              <th className={th}>Source</th>
              <th className={th}>What happened</th>
              <th className={th}>Agents triggered</th>
              <th className={th}>Routed to</th>
              <th className={`${th} pr-5`}>
                <span className="sr-only">How it was decided</span>
              </th>
            </tr>
          </thead>
          {days.map((d) => {
            const dayRows = rows.filter((e) => e.day === d.key);
            if (dayRows.length === 0) return null;
            return (
              <tbody key={d.key}>
                <tr className="border-b border-cx-line bg-cx-raised/50">
                  <td colSpan={6} className="px-5 py-2.5">
                    <span className="text-[12.5px] font-medium text-cx-text">{d.label}</span>
                    <span className="ml-2.5 font-data text-[11px] text-cx-faint">
                      {d.short === "Today" || d.short === "Yesterday" ? `${d.short} · ` : ""}
                      {dayRows.length} entries · {dayRows.reduce((n, e) => n + entryActions(e), 0)} actions · {dayRows[0].at}–{dayRows[dayRows.length - 1].at}
                    </span>
                  </td>
                </tr>
                {dayRows.map((e) => {
                  const TIcon = TRIGGER_ICON[e.trigger];
                  return (
                    <tr key={e.id} className="border-b border-cx-line hover:bg-cx-hover/40">
                      <td className={`${td} pl-5`}>
                        <span className="block font-data text-[12px] tabular-nums text-cx-text">{e.at}</span>
                        <span className="mt-1 inline-flex items-center gap-1 text-[10.5px] text-cx-faint" title={TRIGGER_LABEL[e.trigger]}>
                          <TIcon className="h-3 w-3" /> {e.trigger === "event" ? "Event" : e.trigger === "explicit" ? "Explicit" : "Scheduled"}
                        </span>
                      </td>
                      <td className={td}>
                        <span className="flex items-start gap-2">
                          <AgentIcon agent={e.source} size="sm" round />
                          <span className="min-w-0">
                            <span className="block truncate text-[12.5px] text-cx-text">{AGENTS[e.source].name}</span>
                            <span className="block truncate text-[11px] text-cx-faint">
                              {where(e)}
                              {e.territory && ` · ${e.region}`}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className={td}>
                        <span className="block text-[12.5px] text-cx-text">{e.what}</span>
                      </td>
                      <td className={td}>
                        <ul className="space-y-1">
                          {e.chain.map((c, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[12px] leading-snug text-cx-muted">
                              <AgentIcon agent={c.agent} size="sm" round />
                              <span className="min-w-0 pt-0.5">
                                <span className="text-cx-text">{AGENTS[c.agent].name}</span> {c.did}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className={td}>
                        <span className="flex flex-wrap gap-1.5">
                          {e.routes.map((r) => (
                            <RouteChip key={r.to} {...r} />
                          ))}
                          {e.decision && <DecisionChip n={e.decision} />}
                          {e.routes.length === 0 && !e.decision && <span className="text-[12px] text-cx-faint">No action needed</span>}
                        </span>
                      </td>
                      <td className={`${td} pr-5`}>
                        <TraceTrigger trace={entryTrace(e)} source="Activity" title={`${e.what} · ${e.territory ?? e.region}`} compact />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
        </table>
      </div>
    </section>
  );
}
