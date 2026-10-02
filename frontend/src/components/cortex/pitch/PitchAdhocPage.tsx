"use client";

// Ad hoc pitch — the old conversational studio, kept as a secondary path for a visit the
// plan didn't anticipate (a walk-in, an outlet off the beat). Toolbar: Language · Tone ·
// Talking points · Scope type · who it's for. Generated pitches still route to SFA on their own.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Flag, Sparkles } from "lucide-react";
import { AGENTS, AgentRun } from "@/data/cortexHome";
import { CONSIDER, SEP_INITIATIVES, execFor } from "@/data/map";
import { ADHOC_TOPICS, LANGUAGES, OUTLETS, Pitch, TODAYS_ROUTE, TONES, pointsFor } from "@/data/pitch";
import { AgentRunChip } from "../agentRun";
import { AsmAgentPage, btnPrimary } from "../agentPage";
import { card, Dropdown } from "../kit";
import { useCortexNav } from "../nav";
import { AgentIcon } from "../primitives";
import { Seg } from "../thermometer/ui";
import { MultiSelect, PointsTable, takeAdhocOutlet } from "./parts";

type ScopeType = "internal" | "retailer" | "distributor";
const SCOPES: { id: ScopeType; label: string }[] = [
  { id: "internal", label: "Internal" },
  { id: "retailer", label: "Retailer" },
  { id: "distributor", label: "Distributor" },
];

export function PitchAdhocPage() {
  return (
    <AsmAgentPage agent="pitch" studio>
      <Adhoc />
    </AsmAgentPage>
  );
}

function outletsFor(scope: ScopeType) {
  const names = Object.keys(OUTLETS).filter((o) => (scope === "distributor" ? OUTLETS[o].type === "Distributor" : scope === "retailer" ? OUTLETS[o].type !== "Distributor" : false));
  // today's route first, as in the reference
  return [...TODAYS_ROUTE.filter((o) => names.includes(o)), ...names.filter((o) => !TODAYS_ROUTE.includes(o)).sort()];
}

function Adhoc() {
  const go = useCortexNav();
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [tone, setTone] = useState("Balanced");
  const [topics, setTopics] = useState<string[]>([]);
  const [scope, setScope] = useState<ScopeType>("retailer");
  const [outlet, setOutlet] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [runKey, setRunKey] = useState(0);
  const [signalsOpen, setSignalsOpen] = useState(true);
  const [msgs, setMsgs] = useState<{ from: "you" | "ai"; text: string }[]>([]);
  const [text, setText] = useState("");
  const thread = useRef<HTMLDivElement>(null);

  // "Edit in canvas" on a pitch opens this page scoped to that outlet
  useEffect(() => {
    const o = takeAdhocOutlet();
    if (o && OUTLETS[o]) {
      setScope(OUTLETS[o].type === "Distributor" ? "distributor" : "retailer");
      setOutlet(o);
    }
  }, []);
  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const info = outlet ? OUTLETS[outlet] : null;
  const se = info ? execFor(info.territory) : null;
  const signals = info
    ? [
        ...CONSIDER.filter((c) => c.territory === info.territory).map((c) => ({ agent: c.agent, text: c.text })),
        ...SEP_INITIATIVES.filter((i) => i.territory === info.territory && i.status !== "closed").map((i) => ({ agent: "map" as const, text: `Plan #${i.n}: ${i.title} · ${i.priority}` })),
      ]
    : [];

  const pitch: Pitch | null = useMemo(
    () => (info && outlet ? { id: "adhoc", outlet, type: info.type, territory: info.territory, code: info.code, se: se!, sources: [], status: "in-sfa", generated: "Today, just now", sfaAt: "Today, just now", language, tone } : null),
    [info, outlet, se, language, tone]
  );
  const points = useMemo(() => (pitch ? pointsFor(pitch).filter((t) => topics.length === 0 || topics.includes(t.topic)).map((t, i) => ({ ...t, n: i + 1 })) : []), [pitch, topics]);

  const run: AgentRun | null = outlet && se ? { agent: "pitch", steps: [`reading ${outlet}'s ledger and DMS history`, `writing talking points in ${language}`, `sending to ${se}'s SFA app`], result: `Ad hoc pitch for ${outlet} · in ${se}'s SFA app`, link: "View in Pitch" } : null;
  const generate = () => {
    if (!run) return;
    setPhase("running");
    setRunKey(Date.now());
  };

  const ask = (q: string) => {
    const t = q.trim();
    if (!t) return;
    setText("");
    const hit = Object.keys(OUTLETS).find((o) => t.toLowerCase().includes(o.toLowerCase().split(",")[0]));
    const reply = hit
      ? `Scoped to ${hit}, a ${OUTLETS[hit].type.toLowerCase()} in ${OUTLETS[hit].territory}. Press Generate when the toolbar reads right.`
      : /signal/i.test(t)
        ? outlet
          ? `${signals.length} signal${signals.length === 1 ? "" : "s"} touch ${outlet}'s territory; they're on the right.`
          : "Pick who the pitch is for first; signals follow the outlet's territory."
        : `Tell me who the pitch is for, for example “build me a pitch for ${TODAYS_ROUTE[0] ?? "an outlet"}, new-product focus”.`;
    setMsgs((m) => [...m, { from: "you", text: t }, { from: "ai", text: reply }]);
    if (hit) {
      setScope(OUTLETS[hit].type === "Distributor" ? "distributor" : "retailer");
      setOutlet(hit);
      if (/new.product/i.test(t)) setTone("New-product push");
      setPhase("idle");
    }
  };

  return (
    <div className="space-y-3 px-3 pb-3">
      {/* toolbar */}
      <div className={`${card} flex flex-wrap items-end gap-3 px-4 py-3`}>
        <Field label="Language">
          <Dropdown label="" value={language} options={LANGUAGES} onChange={(v) => v && setLanguage(v)} allOption={false} />
        </Field>
        <Field label="Tone">
          <Dropdown label="" value={tone} options={TONES} onChange={(v) => v && setTone(v)} allOption={false} />
        </Field>
        <Field label="Talking points">
          <MultiSelect label="" values={topics} options={ADHOC_TOPICS} onChange={setTopics} allLabel={`${ADHOC_TOPICS.length} of ${ADHOC_TOPICS.length} topics`} />
        </Field>
        <Field label="Scope type">
          <Seg
            value={scope}
            options={SCOPES}
            onChange={(v) => {
              setScope(v);
              setOutlet(null);
              setPhase("idle");
            }}
            label="Scope type"
          />
        </Field>
        <Field label={scope === "distributor" ? "Distributor" : scope === "retailer" ? "Retailer · today's route listed first" : "Meeting"}>
          {scope === "internal" ? (
            <span className="inline-flex h-8 items-center text-[12px] text-cx-faint">Internal pitches are built from a huddle; open one from Huddle.</span>
          ) : (
            <Dropdown
              label=""
              value={outlet}
              options={outletsFor(scope)}
              onChange={(v) => {
                setOutlet(v);
                setPhase("idle");
              }}
              placeholder={`Choose ${scope === "distributor" ? "a distributor" : "a retailer"}…`}
              allOption={false}
            />
          )}
        </Field>
        <button onClick={generate} disabled={!outlet || phase === "running"} className={`${btnPrimary} ml-auto`}>
          <Sparkles className="h-4 w-4" /> Generate
        </button>
      </div>

      <div className="grid gap-3 lg:h-[calc(100vh-140px)] lg:min-h-[560px] lg:grid-cols-[minmax(300px,3fr)_minmax(0,7fr)]">
        <section aria-label="Conversation" className={`${card} flex min-w-0 min-h-[420px] flex-col overflow-hidden lg:min-h-0`}>
          <header className="flex items-center gap-3 border-b border-cx-line px-4 py-3">
            <button onClick={() => go("pitch")} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-cx-line text-cx-muted hover:border-cx-strong hover:text-cx-text" aria-label="Back to Pitch">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 text-[15px] font-medium text-cx-text">
                <AgentIcon agent="pitch" size="sm" /> Ad hoc pitch
              </h1>
              <p className="truncate text-[11.5px] text-cx-faint">{outlet ? `${OUTLETS[outlet].type} · ${se}` : "For a visit the plan didn't anticipate"}</p>
            </div>
            <button onClick={() => go("pitch")} className="h-7 shrink-0 rounded-md border border-cx-line px-2.5 text-[12px] text-cx-muted hover:border-cx-strong hover:text-cx-text">
              All pitches
            </button>
          </header>
          <div ref={thread} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            <p className="rounded-lg border border-cx-line bg-cx-raised px-3 py-2.5 text-[13px] leading-relaxed text-cx-muted">
              Most pitches come from your plan. Use this for a visit the plan didn't anticipate: choose a scope type and who it's for in the toolbar (today's route is listed first), or tell me, for example “build me a pitch for {TODAYS_ROUTE[0] ?? "an outlet"}, new-product focus”.
            </p>
            {msgs.map((m, i) =>
              m.from === "you" ? (
                <p key={i} className="ml-auto w-fit max-w-[88%] rounded-lg rounded-br-sm bg-cx-hover px-3 py-2 text-[13px] text-cx-text">
                  {m.text}
                </p>
              ) : (
                <p key={i} className="max-w-[94%] rounded-lg rounded-bl-sm border border-cx-line bg-cx-raised px-3 py-2.5 text-[13px] leading-relaxed text-cx-text">
                  {m.text}
                </p>
              )
            )}
          </div>
          <div className="border-t border-cx-line px-4 pb-4 pt-3">
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {[`Build me a pitch for ${TODAYS_ROUTE[0] ?? "an outlet"}, new-product focus`, "What signals are in scope?"].map((p) => (
                <button key={p} onClick={() => ask(p)} className="rounded-full border border-cx-line px-2.5 py-1 text-left text-[12px] text-cx-muted hover:border-cx-strong hover:text-cx-text">
                  {p}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(text);
              }}
              className="flex gap-2"
            >
              <label htmlFor="adhoc-input" className="sr-only">
                Build me a pitch for
              </label>
              <input
                id="adhoc-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Build me a pitch for…"
                className="h-10 min-w-0 flex-1 rounded-lg border border-cx-strong bg-cx-bg px-3 text-[13px] text-cx-text placeholder:text-cx-faint focus:border-[#2f6fed]/70 focus:outline-none"
              />
              <button type="submit" disabled={!text.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2f6fed] text-white hover:bg-[#4f86f7] disabled:opacity-40" aria-label="Send">
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>

        <section aria-label="Pitch canvas" className={`${card} flex min-w-0 min-h-[560px] flex-col overflow-hidden md:flex-row lg:min-h-0`}>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-5">
            <h2 className="text-[20px] font-medium text-cx-text">{outlet ?? "New pitch"}</h2>
            <p className="mt-0.5 text-[12.5px] text-cx-faint">{outlet && info ? `${info.type} · ${info.territory} · ${language} · ${tone}` : "No scope chosen yet."}</p>
            {phase === "idle" && (
              <div className="mt-4 flex flex-1 items-center justify-center rounded-lg border border-dashed border-cx-strong px-6 py-16 text-center">
                <div className="max-w-md">
                  <h3 className="text-[15px] font-medium text-cx-text">{outlet ? "Ready to generate" : "Nothing to generate yet — choose who this pitch is for"}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-cx-muted">
                    {outlet ? `Generate writes the talking points and sends them to ${se}'s SFA app. It won't change the plan.` : "Set the scope type in the toolbar above, then pick the retailer or distributor. Nothing is pre-picked for you."}
                  </p>
                </div>
              </div>
            )}
            {phase !== "idle" && run && (
              <div className="mt-4 space-y-4">
                <AgentRunChip key={runKey} run={run} onDone={() => setPhase("done")} />
                {phase === "done" && pitch && <PointsTable p={pitch} points={points} commentable={false} />}
              </div>
            )}
          </div>
          <SignalsPanel open={signalsOpen} setOpen={setSignalsOpen} signals={signals} scoped={!!outlet} />
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[11px] text-cx-faint">{label}</p>
      {children}
    </div>
  );
}

function SignalsPanel({ open, setOpen, signals, scoped }: { open: boolean; setOpen: (v: boolean) => void; signals: { agent: keyof typeof AGENTS; text: string }[]; scoped: boolean }) {
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="flex shrink-0 items-center gap-2 border-t border-cx-line px-4 py-3 text-[12.5px] text-cx-muted hover:text-cx-text md:w-12 md:flex-col md:border-l md:border-t-0 md:px-0 md:py-4" aria-label={`Signals for this scope · ${signals.length}`}>
        <Flag className="h-4 w-4" />
        <span className="font-data text-[11px]">{signals.length}</span>
        <ChevronLeft className="hidden h-3.5 w-3.5 md:block" />
      </button>
    );
  return (
    <aside aria-label="Signals for this scope" className="flex shrink-0 flex-col border-t border-cx-line md:w-[290px] md:border-l md:border-t-0">
      <button onClick={() => setOpen(false)} className="flex items-start gap-2 border-b border-cx-line px-4 py-3 text-left hover:bg-cx-hover/50">
        <Flag className="mt-0.5 h-4 w-4 text-cx-muted" />
        <span className="flex-1">
          <span className="block text-[13px] font-medium text-cx-text">
            Signals for this scope · <span className="font-data">{signals.length}</span>
          </span>
          <span className="block text-[11px] text-cx-faint">Huddle · Market Action Plan · Thermometer · Tracker</span>
        </span>
        <ChevronRight className="mt-0.5 h-3.5 w-3.5 text-cx-faint" />
      </button>
      <ul className="flex-1 space-y-2 overflow-y-auto p-3">
        {!scoped && <li className="px-1 py-3 text-[12.5px] text-cx-faint">No Huddle, Market Action Plan, Thermometer or Tracker items until you choose who the pitch is for.</li>}
        {signals.map((s, i) => (
          <li key={i} className="rounded-lg border border-cx-line bg-cx-panel p-3">
            <p className="flex items-center gap-1.5 text-[11px] text-cx-muted">
              <AgentIcon agent={s.agent} size="sm" round /> {AGENTS[s.agent].name}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-snug text-cx-text">{s.text}</p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
