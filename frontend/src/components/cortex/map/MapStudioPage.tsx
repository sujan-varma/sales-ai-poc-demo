"use client";

// MAP Studio — where the ASM builds the October Market Action Plan conversationally, in
// full-screen Studio mode (no standard top bar, no page gutters; the agent rail stays).
// 30% conversation, 70% canvas, scoped by territory, with the Market Size / Share / Reach /
// Influencers sheets and a docked "Things to consider" panel. "Create October MAP" arrives
// here and runs the generation sequence across the agents before the plan appears. Each
// initiative carries the AI's Estimated figure and the ASM's own Target, editable in the row.
// Save locks v1, pushes as before, and lands on the plan's own page.

import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Flag, Info, ListChecks, MessageSquare, Pencil, Share2, Sparkles, UserPlus, X } from "lucide-react";
import { AGENTS, AgentId } from "@/data/cortexHome";
import { BAND_COLOR, CATEGORIES, CONSIDER, OCT_DRAFT, OCT_PLAN, Priority, SALES_EXECS, TERRITORIES, REGION_SHARE, TERRITORY_SHARE, Territory, draftTrace, studioAnswer, MAP_LABELS, WEAKEST_TERRITORY, STUDIO_SOURCES } from "@/data/map";
import { AgentRunChip } from "../agentRun";
import { TraceTrigger } from "../actionTrace";
import { AiTag } from "../ai";
import { AsmAgentPage, PriorityPill, btnPrimary } from "../agentPage";
import { useHome } from "../HomeState";
import { card, Dropdown } from "../kit";
import { useCortexNav } from "../nav";
import { AgentIcon } from "../primitives";
import { MarketSheet, SheetButtons, SheetId } from "./MarketSheet";
import { OctRow, PRIORITIES, freshRows, readOct, takeAutogen, writeOct } from "./octPlan";
import { openOctoberPlan } from "./openPlan";
import { useAssignments } from "../assignments";

type Msg = { id: number; from: "you" | "ai"; text: string };
type Canvas = "empty" | "generating" | "draft" | "saving" | "closed";

/** The generation sequence: visibly collating across the agents, ~13 s, before the plan appears. */
const plural = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;
const GEN_STEPS: { agent: AgentId | "tracker"; label: string; detail: string }[] = [
  { agent: "huddle", label: "Huddle", detail: `Reading ${plural(STUDIO_SOURCES.huddleThemes, "huddle theme")} from the Huddle sheet` },
  { agent: "thermometer", label: "Thermometer", detail: `Pulling scorecard and category signals for ${TERRITORIES.length} territories` },
  { agent: "pitch", label: "Pitch", detail: `Reading SO visits: ${plural(STUDIO_SOURCES.visitsThisMonth, "retailer")} visited this month` },
  { agent: "tracker", label: "Action Tracker", detail: `Carrying ${plural(STUDIO_SOURCES.openTickets, "open ticket")} and ${plural(STUDIO_SOURCES.openInitiatives, "unfinished initiative")}` },
  { agent: "map", label: "Market Action Plan", detail: `Sizing impact and drafting ${OCT_DRAFT.length} initiatives across ${TERRITORIES.length} territories` },
];
const GEN_STEP_MS = 2600;

const OWNERS = [MAP_LABELS.asm, ...SALES_EXECS.map((s) => s.name)];

export function MapStudioPage() {
  return (
    <AsmAgentPage agent="map" studio>
      <Studio />
    </AsmAgentPage>
  );
}

function Studio() {
  const { toast } = useHome();
  const go = useCortexNav();
  const [scope, setScope] = useState<Territory | null>(null);
  const [product, setProduct] = useState<string | null>(null);
  // the owning Sales Executive, matching the filter the saved plans already carry
  const [exec, setExec] = useState<string | null>(null);
  const [canvas, setCanvas] = useState<Canvas>("empty");
  const [genStep, setGenStep] = useState(0);
  const [rows, setRows] = useState<OctRow[]>(freshRows);
  const [sheet, setSheet] = useState<SheetId | null>(null);
  const [considerOpen, setConsiderOpen] = useState(true);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [saveKey, setSaveKey] = useState<number | null>(null);
  const nt = useAssignments();
  const nextId = useRef(1);
  const thread = useRef<HTMLDivElement>(null);

  const where = scope ?? MAP_LABELS.region;
  const share = scope ? TERRITORY_SHARE[scope] : REGION_SHARE;
  const consider = CONSIDER.filter((c) => !scope || c.territory === scope);
  const shown = rows.filter((d) => (!scope || d.territory === scope) && (!product || d.product === product || d.product === "All categories") && (!exec || d.owner === exec));
  const add = (m: Omit<Msg, "id">) => setMsgs((xs) => [...xs, { ...m, id: nextId.current++ }]);

  const generate = () => {
    setGenStep(0);
    setCanvas("generating");
    add({ from: "ai", text: "Collating across the agents for the October plan: September month-end, every huddle and visit, open tickets. This takes a moment; each initiative is sized before it lands." });
  };

  // the sequence is driven from state, one step at a time, so a remount (React Strict Mode,
  // a fast refresh) picks it up where it was instead of freezing on the first agent
  useEffect(() => {
    if (canvas !== "generating") return;
    if (genStep < GEN_STEPS.length) {
      const t = setTimeout(() => setGenStep((n) => n + 1), GEN_STEP_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setCanvas("draft");
      // give the plan the canvas: the flags fold to a strip and reopen with one click
      setConsiderOpen(false);
      add({ from: "ai", text: `October draft ready: ${OCT_DRAFT.length} initiatives across ${TERRITORIES.length} territories. Set your own Target on any row (hover to edit), then Save.` });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, genStep]);

  // arrival: a saved plan stays closed here unless reopened with Edit in MAP Studio;
  // "Create October MAP" starts the generation sequence on its own
  useEffect(() => {
    const saved = readOct();
    if (saved?.editing) {
      setRows(saved.rows);
      setCanvas("draft");
      setConsiderOpen(false);
    } else if (saved?.saved) setCanvas("closed");
    else if (saved?.rows) {
      setRows(saved.rows);
      setCanvas("draft");
      setConsiderOpen(false);
    } else if (takeAutogen()) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const updateRow = (r: OctRow) => {
    const next = rows.map((x) => (x.id === r.id ? r : x));
    setRows(next);
    const prev = readOct();
    writeOct({ saved: false, editing: prev?.editing, rows: next });
  };

  const save = () => {
    setCanvas("saving");
    setSaveKey(Date.now());
  };
  const afterSave = () => {
    writeOct({ saved: true, savedAt: `today, ${new Date().toTimeString().slice(0, 5)}`, rows });
    // each initiative an officer owns becomes a ticket in their app (Oct 31 = due date)
    const days = Math.max(0, Math.round((Date.UTC(2026, 9, 31) - Date.UTC(2026, 8, 21)) / 864e5));
    Promise.allSettled(
      rows
        .filter((d) => d.owner !== MAP_LABELS.asm)
        .map((d) => nt.assign({ source_id: `oct-${d.id}`, title: d.title, territory: d.territory, agent: d.from.agent, assignee: d.owner, priority: d.priority, due_days: Math.min(days, 60), note: d.why })),
    ).then((rs) => {
      const ok = rs.filter((r) => r.status === "fulfilled").length;
      if (ok) toast(`October plan saved · ${ok} ticket${ok === 1 ? "" : "s"} sent to the officers' apps.`);
    });
    openOctoberPlan();
    go("map-plans");
  };

  const ask = (q: string) => {
    const t = q.trim();
    if (!t) return;
    add({ from: "you", text: t });
    setText("");
    if (/generate|create|build/i.test(t) && /plan|october|draft|map/i.test(t)) {
      if (canvas === "empty") return generate();
      add({ from: "ai", text: canvas === "generating" ? "Still collating; the draft lands when every agent has reported in." : "The October draft is already on the canvas. Hover a row to change its Target, owner or priority, then Save." });
      return;
    }
    const flag = CONSIDER.find((c) => t.endsWith(c.text));
    if (flag) {
      const d = rows.find((x) => x.territory === flag.territory);
      add({
        from: "ai",
        text: `${AGENTS[flag.agent].name} raised this for ${flag.territory}. ${canvas === "draft" && d ? `It's covered in the draft by “${d.title}”, ${d.priority.toLowerCase()} priority, owner ${d.owner}.` : "Generating the plan will size an initiative for it."}`,
      });
      return;
    }
    add({ from: "ai", text: studioAnswer(t, scope) });
  };

  const prompts = [`Why is ${scope ?? WEAKEST_TERRITORY} weak?`, "Which distributors need attention?", ...(canvas === "empty" ? ["Generate the October plan"] : [])];

  return (
    <div className="px-3 pb-3">
      <div className="grid gap-3 lg:h-[calc(100vh-60px)] lg:min-h-[600px] lg:grid-cols-[minmax(320px,3fr)_minmax(0,7fr)]">
        {/* conversation */}
        <section aria-label="Conversation" className={`${card} flex min-h-[520px] min-w-0 flex-col overflow-hidden lg:min-h-0`}>
          <header className="flex items-center gap-3 border-b border-cx-line px-4 py-3.5">
            <button onClick={() => go("map-plans")} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-cx-line text-cx-muted hover:border-cx-strong hover:text-cx-text" aria-label="Back to Market Action Plans">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-[15px] font-medium text-cx-text">
                <AgentIcon agent="map" size="sm" /> MAP Studio
              </h1>
              <p className="truncate text-[11.5px] text-cx-faint">Market Action Plans · {OCT_PLAN.label}</p>
            </div>
          </header>
          <div ref={thread} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            <p className="text-[13px] leading-relaxed text-cx-muted">
              Scoped to <span className="text-cx-text">{where}</span> · {OCT_PLAN.label}. Ask about the territory, or ask me to generate the plan.
            </p>
            {msgs.map((m) =>
              m.from === "you" ? (
                <p key={m.id} className="ml-auto w-fit max-w-[88%] rounded-lg rounded-br-sm bg-cx-hover px-3 py-2 text-[13px] text-cx-text">
                  {m.text}
                </p>
              ) : (
                <div key={m.id} className="max-w-[94%] rounded-lg rounded-bl-sm border border-cx-line bg-cx-raised px-3 py-2.5">
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] text-cx-faint">
                    <Sparkles className="h-3 w-3 text-[color:var(--ai-ink)]" /> MAP agent
                  </p>
                  <p className="text-[13px] leading-relaxed text-cx-text">{m.text}</p>
                </div>
              )
            )}
          </div>
          <div className="border-t border-cx-line px-4 pb-4 pt-3">
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {prompts.map((p) => (
                <button key={p} onClick={() => ask(p)} className="h-7 rounded-full border border-cx-line px-2.5 text-[12px] text-cx-muted hover:border-cx-strong hover:text-cx-text">
                  {p}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(text);
              }}
              className="flex items-center gap-2"
            >
              <label htmlFor="studio-input" className="sr-only">
                Ask about {where}
              </label>
              <input
                id="studio-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Ask about ${where}…`}
                className="h-10 min-w-0 flex-1 rounded-lg border border-cx-strong bg-cx-bg px-3 text-[13px] text-cx-text placeholder:text-cx-faint focus:border-[#2f6fed]/70 focus:outline-none"
              />
              <button type="submit" disabled={!text.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2f6fed] text-white hover:bg-[#4f86f7] disabled:opacity-40" aria-label="Send">
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>

        {/* canvas */}
        <section aria-label="Plan canvas" className={`${card} flex min-h-[640px] min-w-0 flex-col overflow-hidden lg:min-h-0`}>
          <div className="flex flex-wrap items-center gap-1 border-b border-cx-line px-3 py-2.5">
            <Dropdown label="Scope" value={scope} options={[...TERRITORIES]} onChange={(v) => setScope(v as Territory | null)} placeholder={`All ${TERRITORIES.length}`} />
            <Dropdown label="Product" value={product} options={[...CATEGORIES]} onChange={setProduct} placeholder="All" />
            <Dropdown label="Sales Executive" value={exec} options={SALES_EXECS.map((e) => e.name)} onChange={setExec} placeholder={`All ${SALES_EXECS.length}`} />
            <span className="inline-flex h-8 items-center rounded-lg border border-cx-line px-2.5 font-data text-[12px] text-cx-muted">{OCT_PLAN.label}</span>
            <span className="mx-1 hidden h-5 w-px bg-cx-line sm:block" aria-hidden />
            <SheetButtons onOpen={setSheet} />
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-5 pt-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-[20px] font-medium text-cx-text">Building: {where}</h2>
                <span className="inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-[11.5px] text-cx-text" style={{ borderColor: `${BAND_COLOR[share.band]}66`, background: `${BAND_COLOR[share.band]}1a` }}>
                  {share.band} · <span className="font-data">{share.share}%</span> share
                </span>
                {(canvas === "draft" || canvas === "saving") && <span className="font-data text-[11.5px] text-cx-faint">Draft v1 · not saved</span>}
                <span className="ml-auto flex items-center gap-1.5">
                  <button onClick={() => toast("Comments on the October draft: none yet.")} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-cx-line text-cx-muted hover:border-cx-strong hover:text-cx-text" aria-label="Comments" title="Comments">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => toast("Only you are editing this draft. Invite a territory executive to review it.")} className="inline-flex h-8 items-center gap-1 rounded-md border border-cx-line px-2 text-[12.5px] text-cx-muted hover:border-cx-strong hover:text-cx-text" aria-label="Collaborators: 1">
                    <UserPlus className="h-3.5 w-3.5" /> <span className="font-data">1</span>
                  </button>
                  <button onClick={() => toast(`Share a read-only link to the October draft with ${MAP_LABELS.head} or your sales officers.`)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-cx-line text-cx-muted hover:border-cx-strong hover:text-cx-text" aria-label="Share" title="Share">
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
              {canvas === "empty" && <EmptyCanvas onGenerate={generate} />}
              {canvas === "generating" && <GenerationStepper step={genStep} />}
              {canvas === "closed" && <ClosedCanvas />}
              {(canvas === "draft" || canvas === "saving") && <DraftCanvas all={rows} rows={shown} scope={scope} saving={canvas === "saving"} saveKey={saveKey} onSave={save} onSaved={afterSave} onRow={updateRow} panelOpen={considerOpen} />}
              {canvas !== "draft" && canvas !== "saving" && <div className="h-5 shrink-0" aria-hidden />}
            </div>

            <ConsiderPanel open={considerOpen} setOpen={setConsiderOpen} items={consider} onAsk={(t) => ask(`Tell me more: ${t}`)} overlay={canvas === "draft" || canvas === "saving"} />
          </div>
        </section>
      </div>
      {sheet && <MarketSheet key={sheet} open={sheet} scope={scope} onClose={() => setSheet(null)} />}
    </div>
  );
}

function EmptyCanvas({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="mt-4 flex flex-1 items-center justify-center rounded-lg border border-dashed border-cx-strong px-6 py-16">
      <div className="max-w-md text-center">
        <h3 className="text-[15px] font-medium text-cx-text">Nothing generated yet</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-cx-muted">Ask about the territory in the conversation, check the flags on the right, then ask MAP to generate the plan.</p>
        <button onClick={onGenerate} className={`${btnPrimary} mt-5`}>
          <Sparkles className="h-4 w-4" /> Generate the October plan
        </button>
        <p className="mt-2 text-[11.5px] text-cx-faint">{OCT_PLAN.basis}</p>
      </div>
    </div>
  );
}

/** The agent-at-work sequence, one agent at a time, before the plan appears. */
function GenerationStepper({ step }: { step: number }) {
  return (
    <div className="mt-4 flex flex-1 items-center justify-center rounded-lg border border-dashed border-cx-strong px-6 py-10">
      <div className="w-full max-w-[520px]">
        <p className="text-center text-[15px] font-medium text-cx-text">Creating the October MAP</p>
        <p className="mt-1 text-center text-[12.5px] text-cx-faint">Collating across the agents · {Math.min(step, GEN_STEPS.length)} of {GEN_STEPS.length}</p>
        <ol className="mt-6 space-y-2" aria-live="polite">
          {GEN_STEPS.map((g, i) => {
            const st = step > i ? "done" : step === i ? "active" : "waiting";
            return (
              <li
                key={g.label}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-3 transition-opacity duration-300 ${st === "active" ? "cx-glow" : st === "done" ? "border border-cx-line bg-cx-panel" : "border border-dashed border-cx-strong opacity-50"}`}
                aria-current={st === "active" ? "step" : undefined}
              >
                {g.agent === "tracker" ? (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cx-line bg-cx-raised text-cx-muted">
                    <ListChecks className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <AgentIcon agent={g.agent} round />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-cx-text">{g.label}</span>
                  <span className={`block text-[12px] ${st === "active" ? "text-[color:var(--ai-ink)]" : "text-cx-faint"}`}>
                    {g.detail}
                    {st === "active" && "…"}
                  </span>
                </span>
                {st === "done" && <Check className="h-4 w-4 shrink-0 text-[#2fa85c]" aria-label="done" />}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function ClosedCanvas() {
  const go = useCortexNav();
  return (
    <div className="mt-4 flex flex-1 items-center justify-center rounded-lg border border-dashed border-cx-strong px-6 py-16">
      <div className="max-w-md text-center">
        <h3 className="text-[15px] font-medium text-cx-text">The October MAP is saved and closed in Studio</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-cx-muted">Open it to see what went to Pitch and to the Action Tracker. To change it, use Edit in MAP Studio from the plan.</p>
        <button
          onClick={() => {
            openOctoberPlan();
            go("map-plans");
          }}
          className={`${btnPrimary} mt-5`}
        >
          Open the October MAP
        </button>
      </div>
    </div>
  );
}

function DraftCanvas({
  all,
  rows,
  scope,
  saving,
  saveKey,
  onSave,
  onSaved,
  onRow,
  panelOpen,
}: {
  all: OctRow[];
  rows: OctRow[];
  scope: Territory | null;
  saving: boolean;
  saveKey: number | null;
  onSave: () => void;
  onSaved: () => void;
  onRow: (r: OctRow) => void;
  /** Things to consider is open over the canvas; the Save bar ends at its edge */
  panelOpen: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const est = rows.reduce((n, r) => n + r.estL, 0);
  const target = rows.reduce((n, r) => n + r.targetL, 0);
  const high = all.filter((r) => r.priority === "High").length;
  const th = "px-3 py-2.5 text-left text-[11px] font-normal text-cx-faint";
  const stats = [
    ["Estimated · AI", `₹${est.toFixed(1)} L`, scope ? `${scope} · of ₹${all.reduce((n, r) => n + r.estL, 0).toFixed(1)} L` : `All ${TERRITORIES.length} territories`],
    ["Your target", `₹${target.toFixed(1)} L`, target === est ? "Same as the estimate so far" : `${target > est ? "+" : "−"}₹${Math.abs(target - est).toFixed(1)} L against the estimate`],
    ["Initiatives", String(rows.length), `${rows.filter((r) => r.carried).length} carried from September`],
    ["High priority", String(rows.filter((r) => r.priority === "High").length), "Go to Pitch on saving"],
  ];

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-cx-line bg-cx-line lg:grid-cols-4">
        {stats.map(([k, v, s]) => (
          <div key={k} className="bg-cx-panel px-4 py-3.5">
            <p className="text-[11.5px] text-cx-faint">{k}</p>
            <p className="mt-1 font-data text-[20px] text-cx-text">{v}</p>
            <p className="mt-0.5 truncate text-[11.5px] text-cx-faint">{s}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-cx-line">
        <table className="w-full min-w-[660px] table-fixed">
          <colgroup>
            <col />
            <col className="w-[96px]" />
            <col className="w-[112px]" />
            <col className="w-[116px]" />
            <col className="w-[96px]" />
            <col className="w-[84px]" />
          </colgroup>
          <thead className="border-b border-cx-line">
            <tr>
              <th className={`${th} pl-5`}>Initiative</th>
              <th className={`${th} text-right`}>Estimated · AI</th>
              <th className={`${th} text-right`}>Target · yours</th>
              <th className={th}>Owner</th>
              <th className={th}>
                <span className="inline-flex items-center gap-1" title="How the priority score is calculated is pending confirmation (TBD). Until then it's set by the MAP agent and editable here.">
                  Priority <Info className="h-3 w-3" />
                </span>
              </th>
              <th className={`${th} pr-4`}>
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cx-line">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-[12.5px] text-cx-faint">
                  No draft initiative matches these filters. Clear one to see the rest of the plan.
                </td>
              </tr>
            )}
            {rows.map((r) =>
              editing === r.id ? (
                <EditRow key={r.id} r={r} onDone={(next) => (next && onRow(next), setEditing(null))} />
              ) : (
                <tr key={r.id} className="group align-top hover:bg-cx-hover/40">
                  <td className="py-3 pl-5 pr-3">
                    <p className="text-[13px] leading-snug text-cx-text">
                      {r.title}
                      {r.carried && <span className="ml-2 inline-flex h-5 items-center rounded-full border border-[#e0b43a]/40 px-1.5 align-middle text-[10.5px] text-[#e0b43a]">Carried</span>}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-cx-faint">
                      {r.territory} · {r.lever} · {r.product}
                    </p>
                    <p className="mt-1.5 text-[12px] leading-snug text-cx-muted">{r.why}</p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-cx-faint">
                      <span className="inline-flex items-center gap-1.5">
                        <AgentIcon agent={r.from.agent} size="sm" round /> {AGENTS[r.from.agent].name} · {r.from.label}
                      </span>
                      <TraceTrigger trace={draftTrace(r)} source="Market Action Plan Initiative" title={r.title} compact />
                    </p>
                  </td>
                  <td className="px-3 py-3 text-right font-data text-[12.5px] text-cx-muted">₹{r.estL.toFixed(1)} L</td>
                  <td className="px-3 py-3 text-right font-data text-[12.5px] text-cx-text">
                    ₹{r.targetL.toFixed(1)} L{r.targetL !== r.estL && <span className="block text-[10.5px] text-[color:var(--ai-ink)]">edited</span>}
                  </td>
                  <td className="px-3 py-3 text-[12.5px] text-cx-text">{r.owner}</td>
                  <td className="px-3 py-3">
                    <PriorityPill p={r.priority} />
                  </td>
                  <td className="py-3 pl-1 pr-4">
                    <div className="flex justify-end">
                      {!saving && (
                        <button
                          onClick={() => setEditing(r.id)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-cx-line text-cx-muted opacity-0 transition-opacity hover:border-cx-strong hover:text-cx-text focus:opacity-100 group-hover:opacity-100"
                          aria-label={`Edit ${r.title}`}
                          title="Edit this row"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* opaque strip to the scroller's bottom edge, so no row shows beneath the bar */}
      <div className={`sticky bottom-0 z-[11] -mx-5 bg-cx-panel px-5 pb-5 pt-2 ${panelOpen ? "md:mr-[280px]" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cx-strong bg-cx-raised px-4 py-3 shadow-[0_-12px_24px_rgba(0,0,0,0.35)]">
        {saving && saveKey ? (
          <AgentRunChip
            key={saveKey}
            run={{ agent: "map", steps: ["locking v1", `pushing ${high} High-priority initiatives to Pitch`, `opening ${all.length} Tracker tickets for their owners`], result: "October MAP saved", link: "View plan" }}
            minMs={3000}
            onDone={onSaved}
          />
        ) : (
          <>
            <p className="flex min-w-0 items-center gap-2 text-[12.5px] text-cx-muted">
              <AiTag /> Saving locks v1: {high} High-priority initiatives go to Pitch, and all {all.length} open Tracker tickets for their owners.
            </p>
            <button onClick={onSave} className={btnPrimary}>
              Save
            </button>
          </>
        )}
      </div>
      </div>
    </div>
  );
}

/** Inline edit, straight in the table: Target, owner, priority. */
function EditRow({ r, onDone }: { r: OctRow; onDone: (next: OctRow | null) => void }) {
  const [target, setTarget] = useState(String(r.targetL));
  const [owner, setOwner] = useState(r.owner);
  const [priority, setPriority] = useState<Priority>(r.priority);
  const t = Number(target);
  const valid = target.trim() !== "" && !Number.isNaN(t) && t >= 0;
  const field = "h-8 w-full rounded-md border border-cx-strong bg-cx-bg px-2 text-[12.5px] text-cx-text focus:border-[#2f6fed]/70 focus:outline-none";
  return (
    <tr className="bg-cx-hover/40 align-top">
      <td className="py-3 pl-5 pr-3">
        <p className="text-[13px] leading-snug text-cx-text">{r.title}</p>
        <p className="mt-0.5 text-[11.5px] text-cx-faint">Editing · Esc to cancel</p>
      </td>
      <td className="px-3 py-3 text-right font-data text-[12.5px] text-cx-muted">₹{r.estL.toFixed(1)} L</td>
      <td className="px-3 py-3">
        <label className="sr-only" htmlFor={`t-${r.id}`}>
          Target in lakh
        </label>
        <span className="relative block">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 font-data text-[11.5px] text-cx-faint">₹</span>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-data text-[11.5px] text-cx-faint">L</span>
        <input
          id={`t-${r.id}`}
          autoFocus
          inputMode="decimal"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onDone(null)}
          className={`${field} px-5 text-right font-data`}
          aria-invalid={!valid}
        />
        </span>
        {!valid && <span className="mt-1 block text-[10.5px] text-[#e85a70]">Enter a ₹ lakh figure</span>}
      </td>
      <td className="px-3 py-3">
        <label className="sr-only" htmlFor={`o-${r.id}`}>
          Owner
        </label>
        <select id={`o-${r.id}`} value={owner} onChange={(e) => setOwner(e.target.value)} className={field}>
          {OWNERS.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <label className="sr-only" htmlFor={`p-${r.id}`}>
          Priority
        </label>
        <select id={`p-${r.id}`} value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={field}>
          {PRIORITIES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </td>
      <td className="py-3 pl-1 pr-4">
        <span className="flex justify-end gap-1.5">
          <button disabled={!valid} onClick={() => onDone({ ...r, targetL: Math.round(t * 10) / 10, owner, priority })} className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#2f6fed] text-white hover:bg-[#4f86f7] disabled:opacity-40" aria-label="Save this row" title="Done">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDone(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-cx-line text-cx-muted hover:border-cx-strong hover:text-cx-text" aria-label="Cancel">
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      </td>
    </tr>
  );
}

function ConsiderPanel({ open, setOpen, items, onAsk, overlay }: { open: boolean; setOpen: (v: boolean) => void; items: typeof CONSIDER; onAsk: (t: string) => void; overlay: boolean }) {
  const go = useCortexNav();
  const { toast } = useHome();
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="flex shrink-0 items-center gap-2 border-t border-cx-line px-4 py-3 text-[12.5px] text-cx-muted hover:text-cx-text md:w-12 md:flex-col md:border-l md:border-t-0 md:px-0 md:py-4" aria-label={`Things to consider · ${items.length}`}>
        <Flag className="h-4 w-4" />
        <span className="font-data text-[11px]">{items.length}</span>
        <ChevronLeft className="hidden h-3.5 w-3.5 md:block" />
      </button>
    );
  return (
    // with a plan on the canvas it lays over it (the table keeps every column); before that it takes its own width
    <aside aria-label="Things to consider" className={`flex shrink-0 flex-col border-t border-cx-line bg-cx-panel md:w-[300px] md:border-l md:border-t-0 ${overlay ? "md:absolute md:inset-y-0 md:right-0 md:z-10 md:shadow-[-16px_0_32px_rgba(0,0,0,0.35)]" : ""}`}>
      <button onClick={() => setOpen(false)} className="flex items-center gap-2 border-b border-cx-line px-4 py-3 text-left hover:bg-cx-hover/50">
        <Flag className="h-4 w-4 text-cx-muted" />
        <span className="flex-1 text-[13px] font-medium text-cx-text">
          Things to consider · <span className="font-data">{items.length}</span>
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-cx-faint" />
      </button>
      <ul className="flex-1 space-y-2 overflow-y-auto p-3">
        {items.length === 0 && <li className="px-1 py-4 text-[12.5px] text-cx-faint">No open Thermometer or Huddle signal for this territory.</li>}
        {items.map((c, i) => (
          <li key={i} className="rounded-lg border border-cx-line bg-cx-panel p-3">
            <p className="flex items-center gap-1.5 text-[11px] text-cx-faint">
              <AgentIcon agent={c.agent} size="sm" round /> <span className="text-cx-muted">{AGENTS[c.agent].name}</span> · {c.territory}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-snug text-cx-text">{c.text}</p>
            <p className="mt-2 flex gap-3 text-[12px]">
              <button onClick={() => onAsk(c.text)} className="text-[#4f86f7] hover:underline">
                Ask about this
              </button>
              <button onClick={() => (c.open === "thermometer" ? go("thermometer") : go("huddle"))} className="text-cx-muted hover:text-cx-text">
                Open in {c.open === "thermometer" ? "Thermometer" : "Huddle"}
              </button>
            </p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
