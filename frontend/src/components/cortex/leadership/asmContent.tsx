"use client";

// Rolled-up ASM content for the Head of Sales: the Thermometer Scorecard (a RAG snapshot),
// Insights (the ASM view's card, filtered to what still waits on leadership, assignable
// only to an ASM), and the seven Market Action Plans, each opening to its territories.

import { LBL } from "@/data/labels";
import React, { useState } from "react";
import { ChevronRight, Lock, Map as MapIcon, Sparkles, Ticket as TicketIcon, UserPlus } from "lucide-react";
import { AGENTS } from "@/data/cortexHome";
import { LEAD_INSIGHTS, LEAD_INSIGHTS_SUMMARY, LeadInsight, PLAN_REVIEWS, PlanReview, REGIONS, Rag, SCORECARD } from "@/data/leadership";
import { AiTag, ConfidenceScore } from "../ai";
import { AgentRunChip } from "../agentRun";
import { useHome } from "../HomeState";
import { AgentIcon, Avatar, StatusBadge } from "../primitives";
import { card, CardHeader, Dropdown } from "../kit";
import { DemoScopeChip, FeedEmpty, FeedSheet } from "../feedSheet";
import { DEMO_SCENARIO, useDemoScope } from "@/data/demo";
import { CommentBox, useLeadership } from "./common";
import { useCortexNav } from "../nav";

const L = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 1 })}L`;

// ---------------------------------------------------------------------------
// Thermometer Scorecard — a RAG snapshot, not the recommendation list
// ---------------------------------------------------------------------------

const RAG_META: Record<Rag, { label: string; color: string }> = {
  red: { label: "Red · off track", color: "#d64550" },
  amber: { label: "Amber · watch", color: "#e0b43a" },
  green: { label: "Green · on track", color: "#2fa85c" },
};

export function ThermoScorecard({ compact = false, max = 7 }: { compact?: boolean; max?: number }) {
  const go = useCortexNav();
  const th = "px-3 py-2.5 text-left text-[11px] font-normal text-cx-faint";
  const rows = SCORECARD.slice(0, max);
  return (
    <section id="scorecard" aria-labelledby="sc-title" className={`${card} flex h-full flex-col`}>
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-2.5">
          <AgentIcon agent="thermometer" />
          <h2 id="sc-title" className="flex flex-wrap items-center gap-2.5 text-[15px] font-medium text-cx-text">
            Thermometer scorecard <AiTag />
          </h2>
        </div>
        <button
          onClick={() => {
            try {
              sessionStorage.setItem("cx-thermo-tab", "scorecard");
            } catch {
              /* storage unavailable */
            }
            go("thermometer-head");
          }}
          className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] text-cx-muted hover:text-cx-text"
        >
          View all <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="flex-1 overflow-x-auto">
        <table className={`h-full w-full border-t border-cx-line ${compact ? "min-w-[520px]" : "min-w-[820px]"}`}>
          <thead>
            <tr className="border-b border-cx-line">
              <th className={`${th} pl-5`}>Region</th>
              <th className={`${th} ${compact ? "w-[132px]" : "w-[160px]"}`}>Status</th>
              <th className={`${th} w-[96px] text-right`}>Open signals</th>
              <th className={`${th} ${compact ? "w-[150px] pr-5" : "w-[190px]"}`}>Actioned within 48h</th>
              {!compact && <th className={`${th} w-[120px] text-right`}>Resolved in Sept</th>}
              {!compact && <th className={`${th} w-[260px] pr-5`}>Top open signal</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const m = RAG_META[r.rag];
              return (
                <tr key={r.region} className="border-b border-cx-line last:border-0">
                  <td className="py-3 pl-5 pr-3">
                    <span className="block text-[13px] text-cx-text">{r.region}</span>
                    <span className="block text-[11px] text-cx-faint">{r.asm}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-[11.5px] text-cx-text" style={{ borderColor: `${m.color}66`, background: `${m.color}1a` }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: m.color }} /> {compact ? m.label.split(" · ")[1].replace(/^./, (c) => c.toUpperCase()) : m.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-data text-[12.5px] text-cx-text">{r.open}</td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-3 flex-1 gap-[2px]" aria-hidden>
                        {Array.from({ length: 10 }, (_, i) => (
                          <span key={i} className="flex-1 rounded-[1px]" style={{ background: i < Math.round(r.actioned48 / 10) ? m.color : "rgb(var(--cx-line))" }} />
                        ))}
                      </span>
                      <span className="w-9 text-right font-data text-[12px] text-cx-muted">{r.actioned48}%</span>
                    </span>
                  </td>
                  {!compact && <td className="px-3 py-3 text-right font-data text-[12.5px] text-cx-muted">{r.resolved}</td>}
                  {!compact && <td className="py-3 pl-3 pr-5 text-[12.5px] text-cx-muted">{r.top}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Insights — the ASM card, filtered to what waits on leadership
// ---------------------------------------------------------------------------

function InsightItem({ ins, bare = false }: { ins: LeadInsight; bare?: boolean }) {
  const [assigned, setAssigned] = useState<{ asm: string; key: number } | null>(null);
  const others = REGIONS.map((r) => r.asm).filter((a) => !ins.asms.includes(a));
  const Row = bare ? "div" : "li";
  return (
    <Row className={bare ? "" : "border-t border-cx-line py-4"}>
      <div className="flex items-start gap-2.5">
        <AgentIcon agent={ins.agent} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-[13px] leading-snug text-cx-text [text-wrap:pretty]">{ins.headline}</p>
            <span className="shrink-0">
              <ConfidenceScore confidence={ins.confidence} align="right" />
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-cx-faint">
            {ins.region} · {ins.from} · {AGENTS[ins.agent].name} · {ins.when}
          </p>
          <div className="mt-2.5 flex flex-wrap items-start gap-2">
            {/* leadership assigns only to an ASM, who passes it on to their team */}
            <Dropdown
              label="Assign to"
              placeholder="an ASM"
              allOption={false}
              value={assigned?.asm ?? null}
              options={[...ins.asms, ...others]}
              onChange={(v) => v && setAssigned({ asm: v, key: Date.now() })}
            />
            <CommentBox asm={assigned?.asm ?? ins.asms[0]} subject={ins.id} compact />
          </div>
          {assigned && (
            <div className="mt-2">
              <AgentRunChip
                key={assigned.key}
                run={{ agent: ins.agent, steps: ["creating the action", `adding it to ${assigned.asm}'s Tracker`], result: `Assigned to ${assigned.asm}, in their Tracker`, link: "View in Tracker" }}
                block
              />
            </div>
          )}
        </div>
      </div>
    </Row>
  );
}

export function LeadershipInsights() {
  const [more, setMore] = useState(false);
  const [sheet, setSheet] = useState<string | null | false>(false);
  // a walkthrough stays on its own thread; the rest is under View all
  const [scope] = useDemoScope();
  const rows = scope ? LEAD_INSIGHTS.filter((i) => DEMO_SCENARIO.leadInsights.includes(i.id)) : LEAD_INSIGHTS;
  return (
    <section id="insights" aria-labelledby="ins-title" className={`${card} flex h-full flex-col p-5`}>
      <CardHeader
        id="ins-title"
        icon={<Sparkles className="h-4 w-4" />}
        title="Insights"
        badge={<AiTag />}
        right={
          <span className="flex items-center gap-2">
            <DemoScopeChip shown={rows.length} total={LEAD_INSIGHTS.length} />
            <button onClick={() => setSheet(null)} className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] text-cx-muted hover:text-cx-text">
              View all <ChevronRight className="h-3 w-3" />
            </button>
          </span>
        }
      />
      <p className={`mt-3 text-[13.5px] leading-relaxed text-cx-text ${more ? "" : "line-clamp-2"}`}>{LEAD_INSIGHTS_SUMMARY}</p>
      <button onClick={() => setMore((m) => !m)} className="mt-0.5 self-start text-[11.5px] text-cx-muted hover:text-cx-text">
        {more ? "View less" : "View more"}
      </button>
      {rows.length === 0 && <FeedEmpty total={LEAD_INSIGHTS.length} what="insights waiting on you" source="GET /api/web/sections/leadership · LEAD_INSIGHTS" />}
      <ul className="mt-3">
        {rows.map((ins) => (
          <InsightItem key={ins.id} ins={ins} />
        ))}
      </ul>
      <p className="mt-auto flex items-center gap-2 border-t border-cx-line pt-3 text-[11.5px] text-cx-faint">
        <UserPlus className="h-3.5 w-3.5" /> You assign to an ASM; they pass it on to their sales officers.
      </p>
      {sheet !== false && (
        <FeedSheet
          title="All insights waiting on you"
          subtitle={`Across ${LBL.regions} · ${LEAD_INSIGHTS.length} open · what the ASMs already closed isn't shown`}
          items={LEAD_INSIGHTS}
          getId={(ins) => ins.id}
          inScenario={(ins) => DEMO_SCENARIO.leadInsights.includes(ins.id)}
          facets={[
            { key: "region", label: "Region", of: (ins) => ins.region },
            { key: "agent", label: "Raised by", of: (ins) => AGENTS[ins.agent].name },
          ]}
          focusId={sheet}
          onClose={() => setSheet(false)}
          renderRow={(ins) => <InsightItem ins={ins} bare />}
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Market Action Plans — 7 region plans, each opening to its territories
// ---------------------------------------------------------------------------

function PlanRow({ p }: { p: PlanReview }) {
  const { tickets } = useLeadership();
  const [open, setOpen] = useState(false);
  const region = REGIONS.find((r) => r.name === p.region)!;
  const pc = Math.round((p.achievedL / p.estimateL) * 100);
  const mine = tickets.filter((t) => t.subject === `plan-${p.region}`);
  const nTickets = p.tickets.length + mine.length;
  const delayed = p.initiatives.filter((x) => x.status === "delayed").length;
  const withPlan = region.territories.filter((t) => p.initiatives.some((x) => x.territory === t));
  const without = region.territories.filter((t) => !withPlan.includes(t));
  return (
    <li className="border-b border-cx-line last:border-0">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="grid w-full grid-cols-[20px_32px_minmax(0,1fr)_auto] items-center gap-x-3 px-5 py-3 text-left hover:bg-cx-hover/40 md:grid-cols-[20px_32px_minmax(0,1fr)_minmax(0,260px)_140px]">
        <ChevronRight className={`h-3.5 w-3.5 text-cx-faint transition-transform ${open ? "rotate-90" : ""}`} />
        <Avatar initials={p.asm.slice(0, 2).toUpperCase()} />
        <span className="min-w-0">
          <span className="block truncate text-[13px] text-cx-text">{p.region}</span>
          <span className="block truncate text-[11px] text-cx-faint">
            {p.asm} · {region.territories.length} territories · {p.initiatives.length} initiatives{delayed ? ` · ${delayed} delayed` : ""}
            {nTickets ? ` · ${nTickets} ticket${nTickets > 1 ? "s" : ""}` : ""}
          </span>
        </span>
        <span className="hidden min-w-0 md:block">
          <span className="flex items-baseline justify-between gap-2 font-data text-[11.5px]">
            <span className="text-cx-text">
              {L(p.achievedL)} <span className="text-cx-faint">/ {L(p.estimateL)}</span>
            </span>
            <span className="text-cx-muted">{pc}%</span>
          </span>
          <span className="relative mt-1 block h-1.5 rounded-sm bg-cx-line">
            <span className="absolute inset-y-0 left-0 rounded-sm bg-[#4f86f7]" style={{ width: `${pc}%`, opacity: 0.45 + 0.55 * (pc / 100) }} />
          </span>
        </span>
        <span className="text-right font-data text-[12px] text-cx-muted md:hidden">{pc}%</span>
        <span className="hidden text-right text-[11.5px] text-cx-faint md:block">
          {withPlan.length} of {region.territories.length} with initiatives
        </span>
      </button>
      {open && (
        <div className="cx-land-fade grid gap-x-8 gap-y-5 px-5 pb-5 md:pl-[77px] lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <ul className="divide-y divide-cx-line rounded-lg border border-cx-line">
              {withPlan.map((t) => (
                <li key={t} className="grid gap-2 px-3.5 py-3 sm:grid-cols-[130px_minmax(0,1fr)]">
                  <span className="text-[12.5px] text-cx-text">{t}</span>
                  <ul className="space-y-1.5">
                    {p.initiatives
                      .filter((x) => x.territory === t)
                      .map((x) => (
                        <li key={x.title + x.detail} className="flex flex-wrap items-center justify-between gap-2">
                          <span className="min-w-0 text-[12.5px] text-cx-muted">
                            {x.title} <span className="text-cx-faint">· {x.detail}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            {x.valueL > 0 && <span className="font-data text-[11.5px] text-cx-text">{L(x.valueL)}</span>}
                            <StatusBadge status={x.status} />
                          </span>
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
              {without.length > 0 && (
                <li className="px-3.5 py-2.5 text-[12px] text-cx-faint">
                  {without.join(", ")}: no initiative this month
                </li>
              )}
            </ul>
          </div>
          <div className="min-w-0 space-y-3">
            {[...p.tickets, ...mine.map((t) => ({ id: t.id, text: t.text, state: `Open · ${t.asm}` }))].map((t) => (
              <p key={t.id} className="flex items-start gap-2.5 rounded-md border border-cx-line bg-cx-raised px-3 py-2 text-[12.5px]">
                <TicketIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cx-faint" />
                <span className="min-w-0">
                  <span className="block text-cx-text">“{t.text}”</span>
                  <span className="block font-data text-[10.5px] text-cx-faint">
                    {t.id} · {t.state}
                  </span>
                </span>
              </p>
            ))}
            <CommentBox asm={p.asm} subject={`plan-${p.region}`} />
          </div>
        </div>
      )}
    </li>
  );
}

export function PlanReviewPanel() {
  const { toast } = useHome();
  const total = PLAN_REVIEWS.reduce((a, p) => ({ e: a.e + p.estimateL, x: a.x + p.achievedL }), { e: 0, x: 0 });
  return (
    <section id="plan-review" aria-labelledby="plan-title" className={card}>
      <div className="p-5 pb-3">
        <CardHeader
          id="plan-title"
          icon={<MapIcon className="h-4 w-4" />}
          title="Market Action Plans"
          badge={
            <span className="inline-flex h-5 items-center gap-1 whitespace-nowrap rounded border border-cx-line px-1.5 text-[10.5px] text-cx-faint">
              <Lock className="h-2.5 w-2.5" /> Review only
            </span>
          }
          right={
            <button onClick={() => toast(`Opens the Market Action Plan agent, all ${LBL.regions}.`)} className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] text-cx-muted hover:text-cx-text">
              View all <ChevronRight className="h-3 w-3" />
            </button>
          }
        />
      </div>
      <ul className="border-t border-cx-line">
        {PLAN_REVIEWS.map((p) => (
          <PlanRow key={p.region} p={p} />
        ))}
      </ul>
    </section>
  );
}

