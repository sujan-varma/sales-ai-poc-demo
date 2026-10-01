"use client";

// Needs Your Decision — an accordion table. Each row is one line: the decision, where it's
// from, Sales AI's Suggested answer (click for how it was arrived at) and an Action menu
// that both answers the decision and routes it to the ASM's tools. Only items above the
// Decision Thresholds (Configuration) arrive here.

import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, Check, ChevronDown, ChevronRight, CornerUpRight, ListChecks, MessageSquareQuote, MessageSquareText, MoreHorizontal, Scale, SlidersHorizontal, Sparkles, Undo2, Workflow } from "lucide-react";
import { AgentRun, AGENTS, PRIMARY_BLUE_SOFT, RecRoute, STATUS_META } from "@/data/cortexHome";
import { DECISIONS, DECISION_TRACES, Decision, TODAY_ACTIVITY } from "@/data/leadership";
import { ROUTE_DONE_LABEL } from "@/data/actionTraces";
import { AiTag, ConfidenceScore } from "../ai";
import { AgentRunChip } from "../agentRun";
import { ActionTraceSteps } from "../actionTrace";
import { card, CardHeader } from "../kit";
import { useCortexNav } from "../nav";
import { useOutside } from "../shell";
import { useLeadership } from "./common";

/** Route destinations, shared with Thermometer recommendations on the Head of Sales view. */
export const ROUTES: { id: RecRoute; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string }[] = [
  { id: "tracker", icon: ListChecks, color: STATUS_META.done.color },
  { id: "map", icon: CornerUpRight, color: PRIMARY_BLUE_SOFT },
  { id: "pitch", icon: MessageSquareQuote, color: AGENTS.pitch.color },
];

const routeRun = (d: Decision, r: RecRoute): AgentRun =>
  r === "tracker"
    ? { agent: "thermometer", steps: ["creating the action", `adding it to ${d.asm}'s Tracker`], result: `In ${d.asm}'s Tracker`, link: "View in Tracker" }
    : r === "map"
      ? { agent: "map", steps: [`opening ${d.asm}'s October draft`, "adding it as an initiative"], result: `In ${d.asm}'s October plan draft`, link: "View plan" }
      : { agent: "pitch", steps: ["updating pitch priorities", `sharing with ${d.asm}'s team`], result: `On ${d.asm}'s next beats`, link: "View pitch" };

/** Closest structured option to a free-text reply (word overlap), else the suggested one. */
function closestOption(d: Decision, text: string) {
  const words = new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  const scored = d.options.map((o) => ({ o, n: (o.label.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 2 && words.has(w)).length }));
  const best = scored.sort((a, b) => b.n - a.n)[0];
  return best.n > 0 ? best.o : d.options.find((o) => o.recommended)!;
}

function FreeText({ d, onSend, onCancel }: { d: Decision; onSend: (optionId: string, note: string) => void; onCancel: () => void }) {
  const [text, setText] = useState("");
  const [thread, setThread] = useState<{ note: string; optionId: string; thinking: boolean } | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => input.current?.focus(), []);
  useEffect(() => {
    if (!thread?.thinking) return;
    const t = setTimeout(() => setThread((x) => x && { ...x, thinking: false }), 900);
    return () => clearTimeout(t);
  }, [thread?.thinking]);

  if (thread) {
    const o = d.options.find((x) => x.id === thread.optionId)!;
    return (
      <div className="space-y-2.5" aria-live="polite">
        <p className="ml-auto w-fit max-w-[92%] rounded-lg bg-cx-raised px-3 py-2 text-[13px] text-cx-text">{thread.note}</p>
        {thread.thinking ? (
          <p className="flex items-center gap-2 text-[12px] text-cx-faint">
            <Sparkles className="h-3.5 w-3.5 text-[color:var(--ai-ink)]" /> Sales AI is reading your reply<span className="motion-safe:animate-pulse">…</span>
          </p>
        ) : (
          <div className="rounded-lg border border-[#2f6fed]/40 bg-[rgb(var(--ai-card))] p-3">
            <p className="flex items-center gap-1.5 font-data text-[10px] uppercase tracking-[0.08em] text-[color:var(--ai-ink)]">
              <Sparkles className="h-3 w-3" /> Sales AI
            </p>
            <p className="mt-1.5 text-[13px] leading-snug text-cx-text">
              I'll send your note to {d.asm} as the decision, with the evidence attached. For tracking I've matched it to <span className="font-medium">“{o.label}”</span>. Send it?
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <button onClick={() => onSend(o.id, thread.note)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#2f6fed] px-3 text-[12.5px] font-medium text-white hover:bg-[#4f86f7]">
                Send to {d.asm} <ChevronRight className="h-3.5 w-3.5" />
              </button>
              {d.options
                .filter((x) => x.id !== o.id)
                .map((x) => (
                  <button key={x.id} onClick={() => setThread({ ...thread, optionId: x.id })} className="inline-flex h-8 items-center rounded-md border border-cx-line px-2.5 text-[12px] text-cx-muted hover:border-cx-strong hover:text-cx-text">
                    Match to “{x.label}”
                  </button>
                ))}
              <button onClick={() => setThread(null)} className="inline-flex h-8 items-center px-1.5 text-[12px] text-cx-faint hover:text-cx-text">
                Edit reply
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const submit = () => text.trim() && setThread({ note: text.trim(), optionId: closestOption(d, text).id, thinking: true });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rounded-lg border border-cx-strong bg-cx-panel focus-within:border-[#2f6fed]/70"
    >
      <label htmlFor={`ft-${d.id}`} className="sr-only">
        Reply to decision {d.n} in your own words
      </label>
      <textarea
        id={`ft-${d.id}`}
        ref={input}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") onCancel();
        }}
        rows={2}
        placeholder="e.g. “Approve it for the 6, but review again in November”"
        className="block w-full resize-none bg-transparent px-3 pt-2.5 text-[13px] text-cx-text placeholder:text-cx-faint focus:outline-none"
      />
      <div className="flex items-center justify-between gap-2 px-2 pb-2">
        <button type="button" onClick={onCancel} className="h-7 rounded-md px-1.5 text-[12px] text-cx-faint hover:text-cx-text">
          Cancel
        </button>
        <button type="submit" aria-label="Send reply" disabled={!text.trim()} className="flex h-7 w-7 items-center justify-center rounded-md bg-cx-text text-cx-bg hover:opacity-90 disabled:opacity-40">
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

/** One menu: answer the decision, or route it into the ASM's tools. */
function ActionMenu({ d, routes, onAnswer, onFreeText, onRoute }: { d: Decision; routes: RecRoute[]; onAnswer: (id: string) => void; onFreeText: () => void; onRoute: (r: RecRoute) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside<HTMLDivElement>(open, () => setOpen(false));
  const { replies } = useLeadership();
  const answered = replies[d.id]?.optionId;
  const item = "flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-cx-hover";
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 text-[12px] ${open ? "border-cx-strong bg-cx-hover text-cx-text" : "border-cx-line text-cx-muted hover:text-cx-text"}`}
      >
        <MoreHorizontal className="h-3.5 w-3.5" /> Action
        {routes.length > 0 && <span className="font-data text-[10.5px] text-cx-faint">· {routes.length}</span>}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-1 w-[300px] rounded-lg border border-cx-strong bg-cx-raised p-1 shadow-2xl">
          <p className="px-2 pb-1 pt-1.5 font-data text-[10px] uppercase tracking-[0.08em] text-cx-faint">Answer</p>
          {d.options.map((o) => (
            <button
              key={o.id}
              role="menuitemradio"
              aria-checked={answered === o.id}
              onClick={() => {
                onAnswer(o.id);
                setOpen(false);
              }}
              className={item}
            >
              <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${answered === o.id ? "text-cx-text" : "text-transparent"}`} />
              <span className="min-w-0 flex-1 text-[12.5px] text-cx-text">{o.label}</span>
              {o.recommended && <span className="shrink-0 rounded-full border border-[#2f6fed]/45 bg-[#2f6fed]/15 px-1.5 text-[10.5px] text-[color:var(--ai-ink)]">Suggested</span>}
            </button>
          ))}
          <button
            role="menuitem"
            onClick={() => {
              onFreeText();
              setOpen(false);
            }}
            className={item}
          >
            <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cx-muted" />
            <span className="text-[12.5px] text-cx-text">Reply in your own words</span>
          </button>
          <div className="my-1 border-t border-cx-line" />
          <p className="px-2 pb-1 pt-1.5 font-data text-[10px] uppercase tracking-[0.08em] text-cx-faint">Route to {d.asm}</p>
          {ROUTES.map((r) => {
            const on = routes.includes(r.id);
            const Icon = on ? Check : r.icon;
            return (
              <button
                key={r.id}
                role="menuitemcheckbox"
                aria-checked={on}
                onClick={() => {
                  onRoute(r.id);
                  setOpen(false);
                }}
                className={item}
              >
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: r.color }} />
                <span className="text-[12.5px] text-cx-text">{ROUTE_DONE_LABEL[r.id]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DecisionRow({ d }: { d: Decision }) {
  const { replies, reply } = useLeadership();
  const go = useCortexNav();
  const [expanded, setExpanded] = useState(false);
  const [trace, setTrace] = useState(false);
  const [freeText, setFreeText] = useState(false);
  const [routes, setRoutes] = useState<RecRoute[]>([]);
  const [runs, setRuns] = useState<{ run: AgentRun; key: number }[]>([]);
  const r = replies[d.id];
  const chosen = r && d.options.find((o) => o.id === r.optionId)!;
  const rec = d.options.find((o) => o.recommended)!;
  const from = TODAY_ACTIVITY.find((e) => e.decision === d.n);

  const answer = (optionId: string, note?: string) => {
    reply(d.id, { optionId, note });
    setFreeText(false);
    setExpanded(true);
    setRuns((x) => [...x, { run: d.run, key: Date.now() }]);
  };
  const route = (id: RecRoute) => {
    const on = routes.includes(id);
    setRoutes((x) => (on ? x.filter((y) => y !== id) : [...x, id]));
    if (!on) {
      setExpanded(true);
      setRuns((x) => [...x, { run: routeRun(d, id), key: Date.now() }]);
    }
  };
  const openFreeText = () => {
    setFreeText(true);
    setExpanded(true);
  };

  return (
    <li id={d.id} className={`border-b border-cx-line last:border-0 ${expanded ? "bg-cx-raised/30" : ""}`}>
      <div className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-5 py-3 md:grid-cols-[28px_minmax(0,1fr)_150px_minmax(0,300px)_auto]">
        <button onClick={() => setExpanded((e) => !e)} aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} decision ${d.n}`} className="flex h-7 w-7 items-center justify-center rounded-md text-cx-faint hover:bg-cx-hover hover:text-cx-text">
          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </button>
        <button onClick={() => setExpanded((e) => !e)} className="flex min-w-0 items-baseline gap-2.5 text-left">
          <span className="shrink-0 font-data text-[11px] text-[color:var(--ai-ink)]">#{d.n}</span>
          <span className={`min-w-0 text-[13.5px] leading-snug md:truncate ${chosen ? "text-cx-muted" : "text-cx-text"}`} title={d.question}>
            {d.question}
          </span>
        </button>
        <span className="col-start-2 truncate text-[12px] text-cx-faint md:col-start-auto">
          {d.region} · {d.asm}
        </span>
        {/* Suggested: Sales AI's pick (click for how it got there), or the answer once given */}
        <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-2 pl-[40px] md:col-span-1 md:flex-nowrap md:pl-0">
          {chosen ? (
            <span className="flex h-8 min-w-0 flex-1 basis-full items-center gap-1.5 rounded-md border border-cx-line bg-cx-raised px-2.5 text-[12.5px] text-cx-text md:basis-auto" title={chosen.label}>
              <span className="truncate">{chosen.label}</span>
              <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "#2fa85c" }} aria-label="decided" />
            </span>
          ) : (
            <button
              onClick={() => {
                setTrace(!(trace && expanded));
                setExpanded(true);
              }}
              aria-expanded={trace && expanded}
              title={`Suggested: ${rec.label}. Show how Sales AI arrived at it.`}
              className={`flex min-h-8 min-w-0 flex-1 basis-full items-center gap-2 rounded-md border px-2.5 py-1.5 md:basis-auto text-left text-[12.5px] leading-snug ${trace && expanded ? "border-[#2f6fed]/70 bg-[#2f6fed]/15" : "border-[#2f6fed]/40 bg-[#2f6fed]/10 hover:border-[#2f6fed]/70"}`}
            >
              <span className="shrink-0 font-data text-[10px] uppercase tracking-[0.06em] text-[color:var(--ai-ink)]">Suggested</span>
              <span className="min-w-0 text-cx-text md:truncate">{rec.label}</span>
              <Workflow className="ml-auto h-3.5 w-3.5 shrink-0 text-[color:var(--ai-ink)]" />
            </button>
          )}
          <span className="md:hidden">
            <ActionMenu d={d} routes={routes} onAnswer={(id) => answer(id)} onFreeText={openFreeText} onRoute={route} />
          </span>
        </div>
        <span className="hidden justify-end md:flex">
          <ActionMenu d={d} routes={routes} onAnswer={(id) => answer(id)} onFreeText={openFreeText} onRoute={route} />
        </span>
      </div>

      {expanded && (
        <div className="cx-land-fade grid gap-x-8 gap-y-5 px-5 pb-5 md:pl-[60px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="min-w-0">
            <p className="max-w-[68ch] text-[13px] leading-relaxed text-cx-muted">{d.context}</p>
            <p className="mt-2 font-data text-[11.5px] text-cx-text">{d.stake}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={() => go("configuration")} title="Change this threshold in Configuration" className="inline-flex h-7 items-center gap-1.5 rounded-full border border-cx-line bg-cx-raised pl-2 pr-2.5 text-[11.5px] text-cx-muted hover:border-cx-strong hover:text-cx-text">
                <SlidersHorizontal className="h-3 w-3" /> {d.thresholdLabel}
              </button>
              <span className="text-[11.5px] text-cx-faint">
                {d.raised}
                {from && ` · logged at ${from.at}: ${from.what}`}
              </span>
            </div>
            {chosen && (
              <div className="mt-4 flex items-start justify-between gap-3 rounded-lg border border-cx-line bg-cx-panel px-3.5 py-3">
                <div className="min-w-0">
                  <p className="text-[11.5px] text-cx-faint">You decided{chosen.recommended ? " · as suggested" : ""}</p>
                  <p className="mt-0.5 text-[13px] text-cx-text">{chosen.outcome}</p>
                  {r.note && <p className="mt-1 text-[12.5px] italic text-cx-muted">“{r.note}”</p>}
                </div>
                <button onClick={() => reply(d.id, null)} className="inline-flex shrink-0 items-center gap-1 text-[12px] text-cx-faint hover:text-cx-text">
                  <Undo2 className="h-3 w-3" /> Change
                </button>
              </div>
            )}
            {runs.length > 0 && (
              <div className="mt-3 space-y-2">
                {runs.map((x) => (
                  <AgentRunChip key={x.key} run={x.run} block />
                ))}
              </div>
            )}
          </div>
          <div className="min-w-0">
            {freeText ? (
              <FreeText d={d} onSend={(id, note) => answer(id, note)} onCancel={() => setFreeText(false)} />
            ) : trace ? (
              <ActionTraceSteps trace={DECISION_TRACES[d.id]} heading="How Sales AI arrived at this suggestion" />
            ) : (
              <div className="rounded-lg border border-cx-line bg-cx-panel px-3.5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-data text-[10.5px] uppercase tracking-[0.08em] text-cx-faint">Sales AI suggests</p>
                  <span className="-mt-0.5 shrink-0">
                    <ConfidenceScore confidence={d.confidence} align="right" />
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] leading-snug text-cx-text">{d.recommendation}</p>
                <button onClick={() => setTrace(true)} className="mt-2 inline-flex items-center gap-1 text-[12px] text-cx-muted hover:text-cx-text">
                  <Workflow className="h-3 w-3" /> How this was suggested <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export function DecisionsTable() {
  const { replies } = useLeadership();
  const go = useCortexNav();
  const open = DECISIONS.filter((d) => !replies[d.id]).length;
  return (
    <section id="decisions" aria-labelledby="decisions-title" className={card}>
      <div className="px-5 pt-5">
        <CardHeader
          id="decisions-title"
          icon={<Scale className="h-4 w-4" />}
          title="Needs your decision"
          badge={
            <>
              <AiTag />
              <span className={`inline-flex h-5 items-center whitespace-nowrap rounded-full px-2 font-data text-[11px] ${open ? "bg-[#2f6fed] text-white" : "border border-cx-line text-cx-faint"}`}>{open ? `${open} open` : "All answered"}</span>
            </>
          }
          right={
            <button onClick={() => go("configuration")} className="hidden items-center gap-1 whitespace-nowrap text-[12px] text-cx-muted hover:text-cx-text sm:inline-flex">
              Decision thresholds <ChevronRight className="h-3 w-3" />
            </button>
          }
        />
        <button onClick={() => go("configuration")} className="mt-1 inline-flex items-center gap-1 text-[12px] text-cx-muted hover:text-cx-text sm:hidden">
          Decision thresholds <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="mt-3 hidden grid-cols-[28px_minmax(0,1fr)_150px_minmax(0,300px)_auto] gap-x-3 border-y border-cx-line px-5 py-2 text-[11px] text-cx-faint md:grid">
        <span />
        <span>Decision</span>
        <span>Region · ASM</span>
        <span>Suggested</span>
        <span className="w-[92px] text-right">Action</span>
      </div>
      <ol className="mt-3 border-t border-cx-line md:mt-0 md:border-t-0">
        {DECISIONS.map((d) => (
          <DecisionRow key={d.id} d={d} />
        ))}
      </ol>
    </section>
  );
}
