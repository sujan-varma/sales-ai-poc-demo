"use client";

// Shared Home content sections and Ask Cortex pieces.

import { LBL } from "@/data/labels";
import React, { useLayoutEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, CornerUpRight, FileText, Lock, Plus, Undo2, X } from "lucide-react";
import {
  ACTION_ITEMS,
  AGENTS,
  AGENT_ORDER,
  ASK_ANSWERS,
  AgentId,
  OFFICERS,
  TEAM_TRACKER,
  TRACKER_MONTH,
  ActionStatus,
  AskAnswer,
  FINDINGS,
  HEAD_REC_STATUS,
  INSIGHTS,
  INSIGHTS_SUMMARY,
  PLAN_META,
  PLAN_MONTHS,
  PlanMonth,
  PlanMonthStatus,
  RECOMMENDATIONS,
  RecDecision,
  Recommendation,
  SIGNAL_COUNTS,
  STATUS_META,
  TRACKER,
  WHATS_WORKING,
} from "@/data/cortexHome";
import { AiMeta, AiTag } from "./ai";
import { MapNodeTimeline, StatusLineChart, StatusMark, pct } from "./charts";
import { useHome } from "./HomeState";
import { useCortexNav } from "./nav";
import { livePlanMonths, useLoop } from "./tracker/loop";
import { useOctPlan } from "./map/octPlan";
import { openOctoberPlan, openSeptemberPlan } from "./map/openPlan";
import { AgentIcon, ConnectChip, Panel, PanelHeader, SelectMenu, StatusBadge, TextLink } from "./primitives";
import { useStatusMeta } from "./statusPalette";

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <h3 className="font-data text-[10.5px] uppercase tracking-[0.08em] text-cx-faint">{children}</h3>
);

// ---------------------------------------------------------------------------
// Action Tracker
// ---------------------------------------------------------------------------

function agoLabel(h: number) {
  if (h < 1) return "just now";
  if (h < 24) return `${Math.round(h)}h ago`;
  if (h < 48) return "yesterday";
  return `${Math.round(h / 24)}d ago`;
}

export function ActionTrackerPanel() {
  const { role, decisions, routes, toast } = useHome();
  const go = useCortexNav();
  const { meta } = useStatusMeta();
  const [scope, setScope] = useState<"mine" | "team">("mine");
  const [person, setPerson] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showRecent, setShowRecent] = useState(false);

  // --- totals for the current scope
  const t = TRACKER[role];
  const share = person ? OFFICERS.find((o) => o.name === person)!.share / TEAM_TRACKER.total : 1;
  const added =
    role === "asm" && scope === "mine"
      ? RECOMMENDATIONS.filter((r) => decisions[r.id] === "tracked" || routes[r.id]?.includes("tracker")).length
      : 0;
  const counts: Record<ActionStatus, number> =
    role === "head" || scope === "mine"
      ? { ...t.counts, unassigned: t.counts.unassigned + added }
      : {
          done: Math.round(TEAM_TRACKER.counts.done * share),
          progress: Math.round(TEAM_TRACKER.counts.progress * share),
          delayed: Math.round(TEAM_TRACKER.counts.delayed * share),
          unassigned: 0,
        };
  const bySource: Record<AgentId, number> =
    role === "head" || scope === "mine"
      ? t.bySource
      : (Object.fromEntries(AGENT_ORDER.map((a) => [a, Math.round(TEAM_TRACKER.bySource[a] * share)])) as Record<AgentId, number>);
  const total = counts.done + counts.progress + counts.delayed + counts.unassigned;
  const open = total - counts.done;
  const complete = Math.round((counts.done / total) * 100);
  // A sales officer's own actions are, by definition, assigned — never show "Unassigned" for one person.
  const hideUnassigned = role === "asm" && scope === "team";
  const order: ActionStatus[] = (["done", "progress", "delayed", "unassigned"] as ActionStatus[]).filter((s) => !(hideUnassigned && s === "unassigned"));

  // --- week dots for the current scope
  // --- line graph: scale September's shape to this scope's month-end counts
  const last = (k: "done" | "progress" | "delayed") => TRACKER_MONTH[k][TRACKER_MONTH[k].length - 1];
  const scaled = (k: "done" | "progress" | "delayed", end: number) => TRACKER_MONTH[k].map((v) => Math.round((v * end) / last(k)));
  const lineSeries = [
    { status: "done" as const, label: "Completed", values: scaled("done", counts.done) },
    { status: "progress" as const, label: "In progress", values: scaled("progress", counts.progress) },
    { status: "delayed" as const, label: "Delayed", values: scaled("delayed", counts.delayed) },
  ];

  // --- recent actions (not completed), most recent first
  const rows =
    role === "head"
      ? TRACKER.head.attention.map((a, i) => ({ id: a.id, title: `${a.action} — ${a.detail}`, territory: a.where, owner: a.where.split(" · ")[0], status: a.status, source: a.source, hoursAgo: i * 6 + 2 }))
      : ACTION_ITEMS.filter((a) => (scope === "mine" ? a.owner === LBL.asmName : a.owner !== LBL.asmName && (!person || a.owner === person))).sort((a, b) => a.hoursAgo - b.hoursAgo);
  const visible = showAll ? rows : rows.slice(0, 6);
  const scopeLabel =
    role === "head" ? t.scopeLabel : scope === "mine" ? "My actions, from all four agents · September" : person ? `${person} · ${OFFICERS.find((o) => o.name === person)!.territories} · September` : `Team actions · ${OFFICERS.length} sales officers · September`;

  return (
    <Panel id="tracker-panel" className="flex h-full flex-col">
      <PanelHeader
        title="Action Tracker"
        badge={<AiTag />}
        right={
          <span className="flex items-center gap-3">
            <button
              onClick={() => setShowRecent((v) => !v)}
              aria-expanded={showRecent}
              className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] ${
                showRecent ? "border-cx-strong bg-cx-hover text-cx-text" : "border-cx-line text-cx-muted hover:text-cx-text"
              }`}
            >
              Recent actions <span className="font-data text-cx-text">{rows.length}</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${showRecent ? "rotate-180" : ""}`} />
            </button>
            <TextLink onClick={() => go(role === "head" ? "tracker-head" : "tracker")}>View tracker</TextLink>
          </span>
        }
      />
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        {role === "asm" && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <div className="flex h-8 items-center rounded-md border border-cx-line bg-cx-panel p-0.5 text-[12px]" role="group" aria-label="Whose actions">
              {(["mine", "team"] as const).map((k) => (
                <button
                  key={k}
                  aria-pressed={scope === k}
                  onClick={() => {
                    setScope(k);
                    setShowAll(false);
                    if (k === "mine") setPerson(null);
                  }}
                  className={`h-full rounded px-2.5 ${scope === k ? "bg-cx-hover text-cx-text" : "text-cx-faint hover:text-cx-muted"}`}
                >
                  {k === "mine" ? "My actions" : "Team actions"}
                </button>
              ))}
            </div>
            {scope === "team" && <SelectMenu label="Person" value={person} options={OFFICERS.map((o) => o.name)} onChange={setPerson} />}
          </div>
        )}

        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Eyebrow>Across September{added > 0 ? ` · +${added} added from Thermometer today` : ""}</Eyebrow>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-cx-faint">
            <span>From:</span>
            {AGENT_ORDER.map((a) => (
              <span key={a} className="inline-flex items-center gap-1.5" title={AGENTS[a].name}>
                <AgentIcon agent={a} size="sm" />
                <span className="font-data text-cx-muted">{bySource[a]}</span>
              </span>
            ))}
          </span>
        </div>
        <div className="mt-4">
          <StatusLineChart labels={TRACKER_MONTH.labels} series={lineSeries} height={300} />
        </div>
        <p className="mt-3 text-[11px] text-cx-faint">Completed is cumulative · in progress and delayed are what was open on each date · hover for any day</p>

        {showRecent && (
          <div className="mt-8 border-t border-cx-line pt-6">
        <div className="flex items-baseline justify-between">
          <Eyebrow>Recent actions</Eyebrow>
          <span className="font-data text-[10.5px] text-cx-faint">most recent first</span>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[560px] table-fixed text-left text-[12.5px]">
            <colgroup>
              <col />
              <col className="w-[120px]" />
              <col className="w-[110px]" />
              <col className="w-[112px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-cx-line text-[11px] text-cx-faint">
                <th className="py-2 pr-3 font-normal">Action</th>
                <th className="py-2 pr-3 font-normal">Territory</th>
                <th className="py-2 pr-3 font-normal">Delegated to</th>
                <th className="py-2 text-right font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a) => (
                <tr id={a.id} key={a.id} className="border-b border-cx-line last:border-0">
                  <td className="py-2.5 pr-3">
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-[2px]" style={{ background: AGENTS[a.source].color }} title={`From ${AGENTS[a.source].name}`} />
                      <span className="truncate text-cx-text" title={a.title}>
                        {a.title}
                      </span>
                    </span>
                    <span className="block pl-3.5 text-[11px] text-cx-faint">{agoLabel(a.hoursAgo)}</span>
                  </td>
                  <td className="truncate py-2.5 pr-3 align-top text-cx-muted">{a.territory}</td>
                  <td className="whitespace-nowrap py-2.5 pr-3 align-top text-cx-muted">
                    {a.status === "unassigned" ? <span className="text-cx-faint">No one yet</span> : a.owner === LBL.asmName ? "You" : a.owner}
                  </td>
                  <td className="py-2.5 text-right align-top">
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 6 && (
          <button onClick={() => setShowAll((v) => !v)} className="mt-3 self-start text-[12px] text-cx-muted hover:text-cx-text">
            {showAll ? "Show fewer" : `View all ${rows.length} →`}
          </button>
        )}
          </div>
        )}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Thermometer recommendations — two explicit destinations on every row.
// ---------------------------------------------------------------------------

const DECISION_COPY: Record<RecDecision, (r: Recommendation) => string> = {
  tracked: (r) => `Added to Tracker · ${r.territory} queue, awaiting an owner`,
  escalated: () => "Escalated to the October plan as a suggested initiative",
  dismissed: () => "Dismissed · kept in Thermometer history",
};

export function RecControls({ r, compact = false }: { r: Recommendation; compact?: boolean }) {
  const { role, decisions, decide, toast } = useHome();
  const d = decisions[r.id];

  if (role === "head") {
    const s = HEAD_REC_STATUS[r.id];
    return (
      <p className="flex items-center gap-1.5 text-[12px] text-cx-faint">
        <Lock className="h-3 w-3" /> {s.owner} (ASM) · <span className="text-cx-muted">{s.state}</span>
      </p>
    );
  }

  if (d) {
    const Icon = d === "tracked" ? Check : d === "escalated" ? CornerUpRight : X;
    const color = d === "tracked" ? STATUS_META.done.color : d === "escalated" ? AGENTS.map.color : "#71717a";
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-[12px] text-cx-muted">
          <Icon className="h-3.5 w-3.5" style={{ color }} />
          {DECISION_COPY[d](r)}
        </span>
        <button onClick={() => decide(r.id, null)} className="flex items-center gap-1 text-[12px] text-cx-faint hover:text-cx-text">
          <Undo2 className="h-3 w-3" /> Undo
        </button>
      </div>
    );
  }

  const btn = "inline-flex h-7 items-center gap-1.5 rounded-md border border-cx-strong bg-cx-raised px-2.5 text-[12px] text-cx-text hover:border-[#4a4a52] hover:bg-cx-hover";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        className={btn}
        onClick={() => {
          decide(r.id, "tracked");
          toast(`#${r.n} added to Action Tracker.`);
        }}
      >
        <Plus className="h-3.5 w-3.5" style={{ color: STATUS_META.done.color }} /> Add to Tracker
      </button>
      <button
        className={btn}
        onClick={() => {
          decide(r.id, "escalated");
          toast(`#${r.n} sent to the October plan as a suggested initiative.`);
        }}
      >
        <CornerUpRight className="h-3.5 w-3.5" style={{ color: AGENTS.map.color }} /> Escalate to Market Action Plan
      </button>
      <button
        className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] text-cx-faint hover:bg-cx-hover hover:text-cx-muted"
        onClick={() => decide(r.id, "dismissed")}
        aria-label="Dismiss"
        title="Dismiss"
      >
        <X className="h-3.5 w-3.5" /> {!compact && "Dismiss"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Market Action Plan — monthly, one plan across every territory.
// ---------------------------------------------------------------------------

/** Option A plan timeline: delivered months in primary blue; the live month stays green. */
const DELIVERED_BLUE = "#4f86f7";

const MONTH_STATUS: Record<PlanMonthStatus, { label: string; mark: ActionStatus }> = {
  delivered: { label: "Delivered", mark: "done" },
  progress: { label: "In progress", mark: "progress" },
  "not-started": { label: "Not created", mark: "unassigned" },
};

function MonthLabels({ months = PLAN_MONTHS, active }: { months?: PlanMonth[]; active?: Set<string> }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}>
      {months.map((m) =>
        m.created ? (
          // months outside the selected period dim, so the filter shows on the timeline too
          <div key={m.month} className={`px-0.5 py-2 text-center transition-opacity ${active && !active.has(m.month) ? "opacity-35" : ""}`}>
            <p className="text-[13px] text-cx-text">{m.month}</p>
            <p className="mt-0.5 font-data text-[11px] text-cx-muted">{m.achievedL == null ? `₹${m.estimateL}L target` : `₹${m.achievedL}/${m.estimateL}L`}</p>
            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-cx-faint">
              {m.achievedL == null ? (
                <span className="hidden sm:inline">Saved · starts 1 Oct</span>
              ) : m.status === "delivered" ? (
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: DELIVERED_BLUE }} aria-hidden />
              ) : (
                <svg width="8" height="8" aria-hidden>
                  <StatusMark status={MONTH_STATUS[m.status].mark} x={4} y={4} r={3} />
                </svg>
              )}
              {m.achievedL != null && <span className="hidden sm:inline">{MONTH_STATUS[m.status].label}</span>}
            </p>
          </div>
        ) : (
          <div key={m.month} className="px-0.5 py-2 text-center">
            <p className="text-[13px] text-cx-text">{m.month}</p>
            <p className="mt-0.5 text-[11px] text-cx-faint">
              Not created
            </p>
          </div>
        )
      )}
    </div>
  );
}

function MonthTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-[12px]">
        <thead>
          <tr className="border-b border-cx-line text-[11px] text-cx-faint">
            <th className="py-1.5 pr-3 font-normal">Month</th>
            <th className="py-1.5 pr-3 font-normal">Plan</th>
            <th className="py-1.5 pr-3 text-right font-normal">Estimated</th>
            <th className="py-1.5 pr-3 text-right font-normal">Achieved</th>
            <th className="py-1.5 pr-3 text-right font-normal">Delivered</th>
            <th className="py-1.5 font-normal">Status</th>
          </tr>
        </thead>
        <tbody>
          {PLAN_MONTHS.map((m) => (
            <tr key={m.month} className="border-b border-cx-line last:border-0">
              <td className="py-1.5 pr-3 text-cx-text">{m.month}</td>
              <td className="py-1.5 pr-3 text-cx-muted">{m.created ? "Created" : "Not created"}</td>
              <td className="py-1.5 pr-3 text-right font-data text-cx-muted">{m.estimateL != null ? `₹${m.estimateL}L` : "—"}</td>
              <td className="py-1.5 pr-3 text-right font-data text-cx-text">{m.achievedL != null ? `₹${m.achievedL}L` : "—"}</td>
              <td className="py-1.5 pr-3 text-right font-data text-cx-text">{pct(m) != null ? `${pct(m)}%` : "—"}</td>
              <td className="py-1.5">
                <span className="inline-flex items-center gap-1.5 text-cx-faint">
                  <svg width="8" height="8" aria-hidden>
                    <StatusMark status={MONTH_STATUS[m.status].mark} x={4} y={4} r={3} />
                  </svg>
                  {MONTH_STATUS[m.status].label}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The connected-node month timeline (Home's MAP card), shared with the Market Action Plans list. */
export function PlanTimeline({ months, active }: { months: PlanMonth[]; active?: Set<string> }) {
  return (
    <>
      <MapNodeTimeline months={months} deliveredColor={DELIVERED_BLUE} pendingColor="rgb(var(--cx-faint))" />
      <div className="mt-2">
        <MonthLabels months={months} active={active} />
      </div>
    </>
  );
}

export function MapPanel() {
  const { role, decisions, routes, openPlan } = useHome();
  const go = useCortexNav();
  const escalated = RECOMMENDATIONS.filter((r) => decisions[r.id] === "escalated" || routes[r.id]?.includes("map"));
  const sep = livePlanMonths(useLoop()).find((m) => m.month === "Sep")!;
  const oct = useOctPlan();
  const ytd = Math.round((PLAN_META.ytdAchievedL / PLAN_META.ytdEstimateL) * 100);
  const [showTable, setShowTable] = useState(false);

  return (
    <Panel id="map-panel">
      <PanelHeader
        agent="map"
        title="Market Action Plan"
        right={<TextLink onClick={() => (openSeptemberPlan(), go(role === "head" ? "map-head" : "map-plans"))}>Open plan</TextLink>}
      />
      <div className="px-5 pb-6 pt-5">
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-cx-line bg-cx-line">
          {[
            ["Apr–Sep", `₹${PLAN_META.ytdAchievedL}L`, `of ₹${PLAN_META.ytdEstimateL}L estimated · ${ytd}%`],
            ["September", `${pct(sep)}%`, `₹${sep.achievedL}L of ₹${sep.estimateL}L · ${LBL.daysLeft}`],
            ["October", "Not created", "Sep month-end lands 1 Oct"],
          ].map(([k, v, s]) => (
            <div key={k} className={`px-4 py-4 ${k === "October" ? "" : "bg-cx-panel"}`} style={k === "October" ? { background: `${DELIVERED_BLUE}14` } : undefined}>
              <p className="text-[11.5px] text-cx-faint">{k}</p>
              <p className="mt-1 font-data text-[20px] text-cx-text" style={k === "October" ? { color: DELIVERED_BLUE } : undefined}>
                {v}
              </p>
              <p className="mt-0.5 text-[11.5px] text-cx-faint">{s}</p>
            </div>
          ))}
        </div>

        <div className="mt-7">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <Eyebrow>Delivered, month by month</Eyebrow>
            <button onClick={() => setShowTable((s) => !s)} className="text-[11px] text-cx-faint hover:text-cx-text">
              {showTable ? "Show chart" : "Show as table"}
            </button>
          </div>
          {showTable ? (
            <MonthTable />
          ) : (
            <>
              <MapNodeTimeline months={PLAN_MONTHS} deliveredColor={DELIVERED_BLUE} pendingColor="rgb(var(--cx-faint))" />
              <div className="mt-2">
                <MonthLabels />
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-cx-line pt-5">
          <div className="min-w-0">
            <p className="text-[13px] text-cx-text">{oct?.saved ? `October plan saved ${oct.savedAt}` : "October plan not created yet"}</p>
            <p className="text-[12px] text-cx-faint">
              {escalated.length > 0
                ? `${escalated.length} suggested initiative${escalated.length > 1 ? "s" : ""} escalated from Thermometer: ${escalated.map((r) => r.territory).join(", ")}`
                : "Escalated Thermometer recommendations will wait here as suggested initiatives."}
            </p>
          </div>
          {role === "asm" ? (
            oct?.saved ? (
              <button onClick={() => (openOctoberPlan(), go("map-plans"))} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-cx-strong px-3 text-[12.5px] text-cx-text hover:bg-cx-hover">
                Open October MAP
              </button>
            ) : (
              <button onClick={openPlan} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#2f6fed] px-3 text-[12.5px] font-medium text-white hover:bg-[#4f86f7]">
                <Plus className="h-3.5 w-3.5" /> Create October MAP
              </button>
            )
          ) : (
            <span className="flex items-center gap-1.5 text-[12px] text-cx-faint">
              <Lock className="h-3 w-3" /> {LBL.asmName} creates
            </span>
          )}
        </div>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Sales head: "what's actually working" — concept layer.
// ---------------------------------------------------------------------------

export function WhatsWorkingPanel() {
  return (
    <Panel id="whats-working">
      <PanelHeader
        title="What's actually working"
        right={<span className="rounded border border-dashed border-cx-strong px-1.5 py-0.5 font-data text-[10px] uppercase tracking-[0.06em] text-cx-faint">Concept</span>}
      />
      <div className="border-b border-cx-line bg-ai/[0.035] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Eyebrow>Read</Eyebrow>
          <AiMeta confidence={WHATS_WORKING.confidence} align="right" />
        </div>
        <p className="mt-1.5 text-[13.5px] text-cx-text">{WHATS_WORKING.takeaway}</p>
      </div>
      <div className="overflow-x-auto px-4 py-2">
        <table className="w-full min-w-[520px] text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-cx-line text-[11px] text-cx-faint">
              <th className="py-2 pr-3 font-normal">Action type</th>
              <th className="py-2 pr-3 text-right font-normal">Actioned</th>
              <th className="py-2 pr-3 font-normal">Delivered</th>
              <th className="py-2 pr-3 font-normal">Result</th>
              <th className="py-2 font-normal">Best region</th>
            </tr>
          </thead>
          <tbody>
            {WHATS_WORKING.rows.map((r) => {
              const rate = Math.round((r.delivered / r.actioned) * 100);
              return (
                <tr key={r.type} className="border-b border-cx-line last:border-0">
                  <td className="py-2 pr-3 text-cx-text">{r.type}</td>
                  <td className="py-2 pr-3 text-right font-data text-cx-muted">{r.actioned}</td>
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-2">
                      <span className="relative h-1.5 w-20 rounded-sm bg-cx-strong">
                        <span className="absolute inset-y-0 left-0 rounded-sm" style={{ width: `${rate}%`, background: STATUS_META.done.color }} />
                      </span>
                      <span className="font-data text-cx-text">{rate}%</span>
                    </span>
                  </td>
                  <td className="py-2 pr-3 font-data text-cx-muted">{r.value}</td>
                  <td className="py-2 text-cx-muted">{r.best}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Ask Cortex
// ---------------------------------------------------------------------------

export function matchAnswer(q: string): AskAnswer {
  const s = q.toLowerCase();
  const exact = ASK_ANSWERS.find((a) => a.q.toLowerCase() === s);
  if (exact) return exact;
  if (/amreli|behind|september|pace|gap/.test(s)) return ASK_ANSWERS[1];
  if (/october|next month|plan/.test(s)) return ASK_ANSWERS[2];
  return ASK_ANSWERS[0];
}

export function AskSuggestions({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ASK_ANSWERS.map((a) => (
        <button
          key={a.q}
          onClick={() => onPick(a.q)}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-cx-line bg-cx-panel px-2.5 text-[12px] text-cx-muted hover:border-cx-strong hover:text-cx-text"
        >
          {a.q}
          <ArrowUpRight className="h-3 w-3 text-cx-faint" />
        </button>
      ))}
    </div>
  );
}

export function AskAnswerCard({ q, scope, onClose }: { q: string; scope: string; onClose?: () => void }) {
  const a = matchAnswer(q);
  return (
    <div className="rounded-lg border border-cx-line bg-cx-panel p-3.5 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[11.5px] text-cx-faint">
          You asked · <span className="text-cx-muted">“{q}”</span> · {scope}
        </span>
        <span className="flex items-center gap-2">
          <AiMeta confidence={a.confidence} align="right" />
          {onClose && (
            <button onClick={onClose} className="rounded p-0.5 text-cx-faint hover:text-cx-text" aria-label="Close answer">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </span>
      </div>
      <p className="mt-2 text-[13.5px] leading-relaxed text-cx-text">{a.answer}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-[11px] text-cx-faint">Evidence on this page</span>
        {a.links.map((l) => (
          <ConnectChip key={l.target} {...l} />
        ))}
      </div>
    </div>
  );
}
