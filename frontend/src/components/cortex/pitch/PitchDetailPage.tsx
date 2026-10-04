"use client";

// One pitch, in the confirmed format: summary row with source links, "What's new since this
// was generated", then the talking-points table. It's a record: the SE runs the pitch in
// SFA, and coverage and visits flow back from there with who, where and when.

import React, { useEffect, useMemo, useState } from "react";
import { ChevronRight, Download, History, Pencil, X } from "lucide-react";
import { AGENTS } from "@/data/cortexHome";
import { LBL } from "@/data/labels";
import { EMPTY_SESSION, PITCH_STATUS, Pitch, kpisFor, pitchTrace, pitchesFor, pointsFor, readSession, sourceLabel } from "@/data/pitch";
import { MAP_LABELS } from "@/data/map";
import { ORG_PITCHES } from "@/data/org";
import { TraceTrigger } from "../actionTrace";
import { AgentPageHeader, AgentPersona, AsmAgentPage, DotStatus, PriorityPill, btn, btnPrimary, useReadOnly } from "../agentPage";
import { useHome } from "../HomeState";
import { NoDataCard, card, Dropdown } from "../kit";
import { useCortexNav } from "../nav";
import { AgentIcon } from "../primitives";
import { PitchOrigin, PointsTable, getOpenPitch, getPitchOrigin, setAdhocOutlet } from "./parts";
import { openOrgPlan, openSeptemberPlan } from "../map/openPlan";

export function PitchDetailPage({ persona = "asm" }: { persona?: AgentPersona }) {
  return (
    <AsmAgentPage agent="pitch" persona={persona}>
      <Detail />
    </AsmAgentPage>
  );
}

function Crumb() {
  return (
    <span className="text-cx-faint" aria-hidden>
      /
    </span>
  );
}

function Detail() {
  const go = useCortexNav();
  const { toast } = useHome();
  const head = useReadOnly();
  // the Head of Sales reaches pitches from every region; the ASM only their own
  const [pitches, setPitches] = useState<Pitch[]>(() => pitchesFor(EMPTY_SESSION));
  const [id, setId] = useState<string | null>(null);
  // set when the pitch was opened from a plan initiative, so the trail names that row
  const [origin, setOrigin] = useState<PitchOrigin | null>(null);
  useEffect(() => {
    setPitches([...pitchesFor(readSession()), ...(head ? ORG_PITCHES : [])]);
    setId(getOpenPitch());
    setOrigin(getPitchOrigin());
  }, [head]);
  const p = pitches.find((x) => x.id === id) ?? pitches[0];
  if (!p)
    return (
      <div className="pb-24">
        <AgentPageHeader agent="pitch" title="Pitch" meta="One pitch, as the Sales Executive runs it in SFA" back={{ label: "Pitch", page: head ? "pitch-head" : "pitch" }} />
        <div className="px-4 sm:px-6">
          <NoDataCard
            title="No pitch to show"
            detail="The backend sent no pitches: no plan initiative has reached an outlet yet. A pitch appears once a plan pushes an initiative to an outlet."
            source={head ? "GET /api/web/sections/org · ORG_PITCHES" : "GET /api/web/sections/pitch"}
          />
        </div>
      </div>
    );
  return <PitchView p={p} origin={origin} />;
}

/** One pitch that exists — split from <Detail> so its hooks never run on an empty list. */
function PitchView({ p, origin }: { p: Pitch; origin: PitchOrigin | null }) {
  const go = useCortexNav();
  const { toast } = useHome();
  const head = useReadOnly();
  const asm = p.asm ?? MAP_LABELS.asm;
  const [accepted, setAccepted] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const points = useMemo(() => pointsFor(p), [p]);
  const k = kpisFor(p);
  const news = (p.news ?? []).filter((n) => !accepted.includes(n.text));
  const version = 1 + accepted.length;
  const st = PITCH_STATUS[p.status];

  return (
    <div className="pb-24">
      <section className="cx-land-hero px-4 pb-5 pt-14 sm:px-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px]">
          {origin ? (
            // reached from a plan row: the trail says which plan and which initiative sent it
            <>
              <button
                onClick={() => {
                  if (origin.planId) openOrgPlan(origin.planId);
                  go(head ? "map-head" : "map-plans");
                }}
                className="text-[#4f86f7] hover:underline"
              >
                Market Action Plan
              </button>
              <Crumb />
              <button
                onClick={() => {
                  if (origin.planId) openOrgPlan(origin.planId);
                  else openSeptemberPlan();
                  go(head ? "map-head" : "map-plans");
                }}
                className="text-[#4f86f7] hover:underline"
              >
                {origin.plan}
              </button>
              {/* an initiative named after its outlet would repeat the tail crumb */}
              {origin.initiative !== p.outlet && (
                <>
                  <Crumb />
                  <span className="text-cx-muted">
                    #{origin.n} {origin.initiative}
                  </span>
                </>
              )}
            </>
          ) : (
            <>
              <button onClick={() => go(head ? "pitch-head" : "pitch")} className="text-[#4f86f7] hover:underline">
                Pitch
              </button>
              <Crumb />
              <span className="text-cx-muted">{p.se}</span>
            </>
          )}
          <Crumb />
          <span className="text-cx-text" aria-current="page">
            {p.outlet}
          </span>
        </nav>
      </section>

      <div className="space-y-5 px-4 sm:px-6">
        <div className={`${card} flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4`}>
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2.5 text-[20px] font-medium text-cx-text">
              <AgentIcon agent="pitch" /> {p.outlet}
              <span className="inline-flex h-6 items-center rounded-full border border-cx-line bg-cx-raised px-2 text-[11.5px] font-normal text-cx-muted">Read-only</span>
            </h1>
            <p className="mt-1 text-[12.5px] text-cx-faint">
              {p.type} · {p.territory} · {p.language} · {p.generated ? `generated ${p.generated}` : "not generated yet"} · Sales Executive {p.se}
              {head && <> · ASM {asm}</>}
            </p>
          </div>
          <span className="ml-auto flex flex-wrap items-center gap-1.5">
            <span className="mr-1 hidden text-[12px] text-cx-faint sm:inline">Style</span>
            <Dropdown label="" value="Table" options={["Table"]} onChange={() => toast("Cards and script styles come later; SFA shows the table.")} allOption={false} />
            <button onClick={() => toast(version > 1 ? `v1 generated ${p.generated} · v${version} accepted today with the new signal.` : `v1 generated ${p.generated ?? "—"}. No edits since.`)} className={btn}>
              <History className="h-3.5 w-3.5" /> <span className="font-data">v{version} of {version}</span>
            </button>
            <button onClick={() => toast(`Exports the pitch as a PDF in ${p.language} and English.`)} className={btn}>
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <span className="inline-flex h-8 items-center rounded-md border border-cx-line bg-cx-raised px-2.5" title="Visits and coverage come from SFA; nobody marks them here">
              <DotStatus color={st.color}>
                {p.status === "visited" ? `Visited ${p.visited?.when} · via SFA` : p.status === "in-sfa" ? `In ${p.se}'s SFA app` : "Not generated"}
              </DotStatus>
            </span>
            {!head && (
              <button
                onClick={() => {
                  setAdhocOutlet(p.outlet);
                  go("pitch-adhoc");
                }}
                className={btnPrimary}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit in canvas
              </button>
            )}
          </span>
        </div>

        {/* where it came from */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px]">
          <span className="text-cx-faint">Pushed from</span>
          {p.sources.map((s, i) => {
            const l = sourceLabel(s);
            return (
              <span key={i} className="inline-flex items-center gap-2 text-cx-text">
                {s.kind === "plan" ? (
                  <button onClick={() => go(head ? "map-head" : "map-plans")} className="hover:underline">
                    {l.text}
                  </button>
                ) : (
                  <button onClick={() => go(head ? "thermometer-head" : "thermometer")} className="hover:underline">
                    {l.text}
                  </button>
                )}
                {l.priority && <PriorityPill p={l.priority} />}
                <span className="text-cx-faint">{l.mode}</span>
              </span>
            );
          })}
          <TraceTrigger trace={pitchTrace(p)} source="Pitch" title={`${p.outlet} · ${p.type}, ${p.territory}`} compact />
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-cx-line bg-cx-line lg:grid-cols-4">
          {[
            ["Value to date", k.value, "Sep MTD · 8. Actual Sales Value"],
            ["Target progress", k.target, `Phased Sep target, to the ${LBL.dataDayTh}`],
            ["Outstanding", k.outstanding, "5. Retailer Credit"],
            ["SKUs bought in Sep", k.skus, "Bought in Sep · 6. Actual Sales qty"],
          ].map(([label, v, src]) => (
            <div key={label} className="bg-cx-panel px-5 py-4">
              <p className="text-[12px] text-cx-faint">{label}</p>
              <p className="mt-1 font-data text-[20px] text-cx-text">{v}</p>
              <button onClick={() => toast(`Opens ${src} for ${p.outlet}.`)} className="mt-0.5 inline-flex items-center gap-0.5 text-[11.5px] text-[#4f86f7] hover:underline">
                {src} <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {!dismissed && (
          <section aria-label="What's new since this was generated" className="overflow-hidden rounded-lg border border-[#e0b43a]/35 bg-[#e0b43a]/[0.05]">
            <div className="flex items-start justify-between gap-3 border-b border-[#e0b43a]/25 px-5 py-3">
              <div>
                <h2 className="text-[13.5px] font-medium text-cx-text">What's new since this was generated</h2>
                <p className="mt-0.5 text-[12px] text-cx-faint">Checked against v{version}. Huddle, Thermometer, Market Action Plan and Tracker signals touching this outlet.</p>
              </div>
              <button onClick={() => setDismissed(true)} className="rounded-md p-1 text-cx-faint hover:bg-cx-hover hover:text-cx-text" aria-label="Dismiss">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {news.length === 0 ? (
              <p className="px-5 py-3 text-[12.5px] text-cx-muted">Nothing new since v{version}. Checked against the workbook data to {LBL.dataDate}.</p>
            ) : (
              <ul className="divide-y divide-[#e0b43a]/20">
                {news.map((n) => (
                  <li key={n.text} className="flex flex-wrap items-start gap-3 px-5 py-3">
                    <AgentIcon agent={n.agent} size="sm" round />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] text-cx-faint">
                        <span className="text-cx-text">{AGENTS[n.agent].name}</span> · {n.when}
                      </p>
                      <p className="mt-0.5 text-[12.5px] leading-snug text-cx-text">{n.text}</p>
                    </div>
                    {head ? (
                      <span className="text-[12px] text-cx-faint">{asm} decides whether this goes into v{version + 1}</span>
                    ) : (
                    <span className="flex gap-1.5">
                      <button
                        onClick={() => {
                          setAccepted((a) => [...a, n.text]);
                          toast(`Accepted into v${version + 1}. ${p.se}'s SFA app gets the update at the next sync.`);
                        }}
                        className="inline-flex h-7 items-center rounded-md bg-[#2f6fed] px-2.5 text-[12px] font-medium text-white hover:bg-[#4f86f7]"
                      >
                        Accept as v{version + 1}
                      </button>
                      <button onClick={() => setDismissed(true)} className="inline-flex h-7 items-center rounded-md border border-cx-line px-2.5 text-[12px] text-cx-muted hover:border-cx-strong hover:text-cx-text">
                        Dismiss
                      </button>
                    </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {p.status === "queued" ? (
          <div className={`${card} px-6 py-12 text-center`}>
            <h2 className="text-[15px] font-medium text-cx-text">Not generated yet</h2>
            <p className="mx-auto mt-1.5 max-w-md text-[13px] text-cx-muted">
              This pitch is queued from the plan. {head ? `${asm}'s next Create pitches batch generates it, then it goes to ${p.se}'s SFA app.` : `Create pitches on the Pitch page generates it with the rest of the batch, then it goes to ${p.se}'s SFA app.`}
            </p>
            {!head && (
              <button onClick={() => go("pitch")} className={`${btnPrimary} mt-5`}>
                Go to Create pitches
              </button>
            )}
          </div>
        ) : (
          <PointsTable p={p} points={points} asm={asm} />
        )}
        <p className="text-[12px] text-cx-faint">Capture market intelligence and feedback on the visit in SFA; anything new comes back here and to the plan.</p>
      </div>
    </div>
  );
}
