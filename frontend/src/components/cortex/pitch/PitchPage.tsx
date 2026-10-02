"use client";

// Pitch — organised per Sales Executive. Pitches arrive from the Market Action Plan:
// High-priority initiatives are pushed by the priority rule, the rest are suggested here
// for the ASM to confirm (review D3 / 1.1). One "Create pitches" generates every pitch
// still missing; each one then routes to the SE's SFA app on its own. The conversational
// studio survives as "Ad hoc pitch", a secondary path.

import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronDown, ChevronRight, Lightbulb, Plus, Sparkles, X } from "lucide-react";
import { AgentRun, SYNC_LABEL } from "@/data/cortexHome";
import { CATEGORIES, MAP_LABELS, SALES_EXECS, TERRITORIES, SEP_INITIATIVES, fmtValue } from "@/data/map";
import { EMPTY_SESSION, LANGUAGES, PITCH_STATUS, Pitch, PitchSession, SUGGESTED_OUTLETS, outstandingCount, pitchTrace, pitchesFor, readSession, sourceLabel, suggestionsFor, writeSession } from "@/data/pitch";
import { AgentRunChip } from "../agentRun";
import { TraceTooltip } from "../actionTrace";
import { AgentPageHeader, AsmAgentPage, DotStatus, PriorityPill, btn, btnPrimary } from "../agentPage";
import { card, Dropdown } from "../kit";
import { useCortexNav } from "../nav";
import { MultiSelect, setOpenPitch } from "./parts";

export function PitchPage() {
  return (
    <AsmAgentPage agent="pitch">
      <Body />
    </AsmAgentPage>
  );
}

const productOf = (p: Pitch) => {
  const s = p.sources[0];
  if (s.kind === "thermometer") return "Acrylic Primer";
  return SEP_INITIATIVES.find((i) => i.id === s.initiative)!.product;
};

function Body() {
  const go = useCortexNav();
  const [session, setSession] = useState<PitchSession>(EMPTY_SESSION);
  useEffect(() => setSession(readSession()), []);
  const save = (s: PitchSession) => {
    setSession(s);
    writeSession(s);
  };
  const [territories, setTerritories] = useState<string[]>([]);
  const [product, setProduct] = useState<string | null>(null);
  const [openSe, setOpenSe] = useState<string | null>(SALES_EXECS[0]?.name ?? null);
  const [batch, setBatch] = useState<{ run: AgentRun; key: number; ids: string[] } | null>(null);
  const [running, setRunning] = useState(false);
  const [pushRuns, setPushRuns] = useState<{ run: AgentRun; key: number }[]>([]);

  const all = useMemo(() => pitchesFor(session), [session]);
  const shown = all.filter((p) => (territories.length === 0 || territories.includes(p.territory)) && (!product || productOf(p) === product || productOf(p) === "All categories"));
  const queued = all.filter((p) => p.status === "queued");
  const suggestions = suggestionsFor(session).filter((i) => territories.length === 0 || territories.includes(i.territory));

  const create = () => {
    const ses = new Set(queued.map((p) => p.se));
    setBatch({
      run: { agent: "pitch", steps: ["reading pushed initiatives", `writing ${queued.length} pitches in ${LANGUAGES[0]}`, "routing each to its SE's SFA app"], result: `${queued.length} pitch${queued.length === 1 ? "" : "es"} created for ${ses.size} Sales Executive${ses.size === 1 ? "" : "s"} · in SFA now`, link: "View in Pitch" },
      key: Date.now(),
      ids: queued.map((p) => p.id),
    });
    setRunning(true);
  };

  const execs = SALES_EXECS.filter((s) => territories.length === 0 || s.territories.some((t) => territories.includes(t)));

  return (
    <div className="pb-24">
      <AgentPageHeader
        agent="pitch"
        title="Pitch"
        meta={
          <>
            {MAP_LABELS.region} · {SALES_EXECS.length} sales officers · every pitch goes to the SE's SFA app on its own · <span className="font-data">{SYNC_LABEL}</span>
          </>
        }
        right={
          <>
            <button onClick={() => go("pitch-adhoc")} className={btn}>
              <Plus className="h-3.5 w-3.5" /> Ad hoc pitch
            </button>
            <button onClick={create} disabled={queued.length === 0 || running} className={btnPrimary}>
              <Sparkles className="h-4 w-4" /> {queued.length ? `Create pitches · ${queued.length}` : "All pitches created"}
            </button>
          </>
        }
      >
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-cx-muted">
          <span className="inline-flex h-6 items-center rounded-full border border-cx-line bg-cx-panel px-2 text-[11.5px] text-cx-text">Auto-push · High priority</span>
          High-priority plan initiatives come here on their own when the plan is agreed. Medium and Low wait below for you. {MAP_LABELS.head} sets this rule in Configuration.
        </p>
        {batch && (
          <div className="mt-3">
            <AgentRunChip key={batch.key} run={batch.run} minMs={2400} onDone={() => {
                setRunning(false);
                const cur = readSession();
                save({ ...cur, created: [...cur.created, ...batch.ids] });
              }} />
          </div>
        )}
      </AgentPageHeader>

      <div className="space-y-6 px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <MultiSelect label="Territory" values={territories} options={[...TERRITORIES]} onChange={setTerritories} allLabel={`All ${TERRITORIES.length}`} />
          <Dropdown label="Product" value={product} options={[...CATEGORIES]} onChange={setProduct} />
          <span className="ml-1 text-[12px] text-cx-faint">
            <span className="font-data text-cx-muted">{shown.length}</span> pitches · <span className="font-data text-cx-muted">{shown.filter((p) => p.news?.length).length}</span> need an update
          </span>
        </div>

        {(suggestions.length > 0 || pushRuns.length > 0) && (
          <section aria-labelledby="sugg-title" className={card}>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-cx-line px-5 py-3.5">
              <Lightbulb className="h-4 w-4 text-cx-muted" />
              <h2 id="sugg-title" className="text-[14px] font-medium text-cx-text">
                Suggested for Pitch · <span className="font-data">{suggestions.length}</span>
              </h2>
              <span className="text-[12px] text-cx-faint">In your September plan, not in any pitch yet. Nothing goes until you push it.</span>
            </div>
            <ul className="divide-y divide-cx-line">
              {suggestions.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-cx-text">
                      <span className="mr-1.5 font-data text-[11px] text-cx-faint">#{i.n}</span>
                      {i.title}
                    </p>
                    <p className="mt-0.5 text-[12px] text-cx-faint">
                      {i.priority} priority in your plan · {fmtValue(i, i.agreed)} agreed · {SUGGESTED_OUTLETS[i.id].length} outlets on {i.owner}'s beats. Push it to Pitch?
                    </p>
                  </div>
                  <PriorityPill p={i.priority} />
                  <span className="flex gap-1.5">
                    <button
                      onClick={() => {
                        save({ ...session, pushed: [...session.pushed, i.id] });
                        setPushRuns((r) => [...r, { run: { agent: "pitch", steps: ["matching outlets on the beat", "queuing the talking point"], result: `#${i.n} pushed · ${SUGGESTED_OUTLETS[i.id].length} pitches queued for ${i.owner}`, link: "View in Pitch" }, key: Date.now() }]);
                        setOpenSe(i.owner);
                      }}
                      className="inline-flex h-8 items-center rounded-md bg-[#2f6fed] px-3 text-[12.5px] font-medium text-white hover:bg-[#4f86f7]"
                    >
                      Push to Pitch
                    </button>
                    <button onClick={() => save({ ...session, dismissed: [...session.dismissed, i.id] })} className="inline-flex h-8 items-center gap-1 rounded-md border border-cx-line px-2.5 text-[12.5px] text-cx-muted hover:border-cx-strong hover:text-cx-text">
                      <X className="h-3.5 w-3.5" /> Dismiss
                    </button>
                  </span>
                </li>
              ))}
              {pushRuns.map((r) => (
                <li key={r.key} className="px-5 py-3">
                  <AgentRunChip run={r.run} />
                </li>
              ))}
            </ul>
            {session.dismissed.length > 0 && (
              <p className="border-t border-cx-line px-5 py-2.5 text-[12px] text-cx-faint">
                {session.dismissed.length} dismissed ·{" "}
                <button onClick={() => save({ ...session, dismissed: [] })} className="text-cx-muted hover:text-cx-text">
                  Restore
                </button>
              </p>
            )}
          </section>
        )}

        <section aria-labelledby="se-title" className={`${card} overflow-x-auto`}>
          <h2 id="se-title" className="sr-only">
            Pitches by Sales Executive
          </h2>
          <table className="w-full min-w-[960px] table-fixed">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[9%]" />
              <col className="w-[11%]" />
              <col className="w-[9%]" />
              <col className="w-[9%]" />
              <col className="w-[15%]" />
              <col />
            </colgroup>
            <thead className="border-b border-cx-line">
              <tr>
                {["Sales Executive", "Pitches", "Not generated", "In SFA", "Visited", "Points outstanding", "Last from SFA"].map((h, i) => (
                  <th key={h} className={`px-3 py-2.5 text-[11px] font-normal text-cx-faint ${i === 0 ? "pl-5 text-left" : i === 6 ? "pr-5 text-left" : "text-right"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            {execs.map((s) => {
              const mine = shown.filter((p) => p.se === s.name);
              const n = (st: Pitch["status"]) => mine.filter((p) => p.status === st).length;
              const last = mine.map((p) => p.visited?.when).filter(Boolean)[0];
              const open = openSe === s.name;
              return (
                <tbody key={s.name} className="border-b border-cx-line last:border-b-0">
                  <tr className={`cursor-pointer ${open ? "bg-cx-hover/30" : "hover:bg-cx-hover/40"}`} onClick={() => setOpenSe(open ? null : s.name)}>
                    <td className="py-3 pl-5 pr-3">
                      <span className="flex items-center gap-2">
                        {open ? <ChevronDown className="h-3.5 w-3.5 text-cx-faint" /> : <ChevronRight className="h-3.5 w-3.5 text-cx-faint" />}
                        <span>
                          <span className="block text-[13px] text-cx-text">{s.name}</span>
                          <span className="block text-[11.5px] text-cx-faint">{s.territories.join(" · ")}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-data text-[12.5px] text-cx-text">{mine.length}</td>
                    <td className={`px-3 py-3 text-right font-data text-[12.5px] ${n("queued") ? "text-[#e0b43a]" : "text-cx-faint"}`}>{n("queued") || "—"}</td>
                    <td className="px-3 py-3 text-right font-data text-[12.5px] text-cx-text">{n("in-sfa")}</td>
                    <td className="px-3 py-3 text-right font-data text-[12.5px] text-cx-text">{n("visited")}</td>
                    <td className="px-3 py-3 text-right font-data text-[12.5px] text-cx-text">{mine.reduce((k, p) => k + outstandingCount(p), 0)}</td>
                    <td className="py-3 pl-3 pr-5 text-[12px] text-cx-muted">{last ? `Visit · ${last}` : mine.length ? "No visit yet" : "—"}</td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={7} className="bg-cx-hover/20 px-5 pb-4 pt-1">
                        <SePitches pitches={mine} onOpen={(p) => (setOpenPitch(p.id), go("pitch-detail"))} />
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}
          </table>
        </section>
      </div>
    </div>
  );
}

function SePitches({ pitches, onOpen }: { pitches: Pitch[]; onOpen: (p: Pitch) => void }) {
  if (!pitches.length) return <p className="py-3 pl-6 text-[12.5px] text-cx-faint">No pitch matches these filters for this Sales Executive.</p>;
  return (
    <div className="pl-6">
      <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_150px_120px_72px] gap-x-4 border-b border-cx-line py-2 text-[11px] text-cx-faint md:grid" aria-hidden>
        <span>Outlet</span>
        <span>Source · how it got here</span>
        <span>Status</span>
        <span>Points</span>
        <span />
      </div>
    <ul className="divide-y divide-cx-line">
      {pitches.map((p) => {
        const st = PITCH_STATUS[p.status];
        const src = p.sources.map(sourceLabel);
        const out = outstandingCount(p);
        return (
          <li key={p.id} className="grid items-start gap-x-4 gap-y-2 py-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_150px_120px_72px]">
            <div className="min-w-0">
              <p className="text-[13px] text-cx-text">
                {p.outlet}
                {p.news?.length ? <span className="ml-2 inline-flex h-5 items-center rounded-full border border-[#e0b43a]/40 bg-[#e0b43a]/10 px-1.5 align-middle text-[10.5px] text-[#e0b43a]">Needs update</span> : null}
              </p>
              <p className="text-[11.5px] text-cx-faint">
                {p.type} · {p.territory}
              </p>
            </div>
            <div className="min-w-0 text-[12px] leading-snug">
              {src.map((s, k) => (
                <p key={k} className="truncate text-cx-muted" title={s.text}>
                  {s.text} <span className="text-cx-faint">· {s.mode}</span>
                </p>
              ))}
              <TraceTooltip trace={pitchTrace(p)} />
            </div>
            <div>
              <DotStatus color={st.color}>{st.label}</DotStatus>
              <p className="mt-0.5 text-[11.5px] text-cx-faint">{p.status === "queued" ? "Next Create batch" : p.status === "visited" ? `${p.visited?.when} · via SFA` : `Since ${p.sfaAt}`}</p>
            </div>
            <p className="text-[12px] text-cx-muted">{p.status === "queued" ? "—" : out === 0 ? "All points covered" : `${out} point${out === 1 ? "" : "s"} outstanding`}</p>
            <button onClick={() => onOpen(p)} className="inline-flex items-center gap-1 justify-self-start text-[12.5px] text-[#4f86f7] hover:underline md:justify-self-end" aria-label={`Open the pitch for ${p.outlet}`}>
              Open <ArrowRight className="h-3 w-3" />
            </button>
          </li>
        );
      })}
    </ul>
    </div>
  );
}
