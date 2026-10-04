"use client";

// Market Action Plans — every plan by month, with its version history, and the locked
// September plan: summary row, "New since this plan", filters, and expandable initiative
// rows (action steps, visit feedback from SFA, attachments, comments that create a ticket
// for the owner). Each row's Actions menu pushes the initiative to Pitch (review §3.1).
//
// The Head of Sales (/leadership/map) reads every ASM's plans. Nothing is created, edited,
// pushed or taken back there; their one action is a comment on an initiative, which becomes
// a delegation ticket the ASM owns — the same rule as the Leadership page.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, ChevronRight, History, Sparkles, MessageSquare, MoreHorizontal, Paperclip, Pencil, Plus, Send, X } from "lucide-react";
import { AGENTS, AgentRun } from "@/data/cortexHome";
import {
  BAND_COLOR,
  CATEGORIES,
  INIT_STATUS,
  Initiative,
  MAP_LABELS,
  PLAN_INDEX,
  Priority,
  REGION_SHARE,
  SALES_EXECS,
  TERRITORIES,
  SEP_INITIATIVES,
  SEP_PLAN,
  SINCE_LOCKED,
  fmtValue,
  initiativeTrace,
  planSummary,
  pushTrace,
} from "@/data/map";
import { EMPTY_SESSION, SUGGESTED_OUTLETS, readSession, writeSession, PitchSession } from "@/data/pitch";
import { PitchOrigin, setOpenPitch } from "../pitch/parts";
import { AgentRunChip } from "../agentRun";
import { TraceTrigger } from "../actionTrace";
import { AgentPageHeader, AgentPersona, AsmAgentPage, DotStatus, PriorityPill, btnPrimary, useReadOnly } from "../agentPage";
import { CommentBox } from "../leadership/common";
import { useHome } from "../HomeState";
import { card, Dropdown } from "../kit";
import { useCortexNav } from "../nav";
import { AgentIcon } from "../primitives";
import { useOutside } from "../shell";
import { MarketSheet, SheetButtons, SheetId } from "./MarketSheet";
import { OrgPlanIndex } from "./OrgPlanIndex";
import { SummaryRow } from "./SummaryRow";
import { ORG_PLANS, OWN_REGION, OrgPlan, execsOf, flagsOf, orgInitiatives } from "@/data/org";
import { LBL } from "@/data/labels";
import { assignToast, useAssignments } from "../assignments";
import { initiativeOverrides, livePlanMonths, openTicket, useLoop } from "../tracker/loop";
import { takeAsmPlan, takeOrgPlan } from "./openPlan";
import { OctRow, freshRows, readOct, requestAutogen, useOctPlan, writeOct } from "./octPlan";
import { PeriodFilter, periodDetail, periodMonths, usePeriod } from "../period";
import { PlanTimeline } from "../sections";
import { OUTLETS } from "@/data/pitch";
import { octTicketId } from "@/data/tracker";

/** The one ASM on their own view; the Head of Sales picks from every ASM. */
const ASM_NAME = `${MAP_LABELS.asm} · ${OWN_REGION}`;

export function MapPlansPage({ persona = "asm" }: { persona?: AgentPersona }) {
  return (
    <AsmAgentPage agent="map" persona={persona} topBarExtra={<PeriodFilter />}>
      <Plans />
    </AsmAgentPage>
  );
}

function Plans() {
  return useReadOnly() ? <OrgPlans /> : <AsmPlans />;
}

/** The Head of Sales: every ASM's plans, then the same detail the ASM reads. */
function OrgPlans() {
  const [open, setOpen] = useState<OrgPlan | null>(null);
  // coming back from a pitch opened on one of these rows reopens that plan, not the index
  useEffect(() => {
    const id = takeOrgPlan();
    if (id) setOpen(ORG_PLANS.find((p) => p.id === id) ?? null);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [open]);
  return open ? <PlanDetail key={open.id} planId="sep" org={open} onBack={() => setOpen(null)} /> : <OrgPlanIndex onOpen={setOpen} />;
}

function AsmPlans() {
  const [view, setView] = useState<"index" | "sep" | "oct">("index");
  // deep link (?plan=sep|oct), a homepage "Open plan", or a Save in MAP Studio
  useEffect(() => {
    const want = takeAsmPlan();
    if (want) setView(want);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);
  return view === "index" ? <PlanIndex onOpen={setView} /> : <PlanDetail key={view} planId={view} onBack={() => setView("index")} />;
}

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

function PlanIndex({ onOpen }: { onOpen: (id: "sep" | "oct") => void }) {
  const go = useCortexNav();
  const { toast } = useHome();
  const head = useReadOnly();
  // The ASM owns one region, so their ASM filter holds one name; picking it reveals their team,
  // the same two-level move the Head of Sales makes across every ASM.
  const [asm, setAsm] = useState<string | null>(null);
  const [exec, setExec] = useState<string | null>(null);
  const live = livePlanMonths(useLoop());
  const oct = useOctPlan();
  const [period] = usePeriod();
  const octTarget = (oct?.rows ?? []).reduce((n, d) => n + d.targetL, 0);
  const all = [...PLAN_INDEX]
    .map((m) => ({ ...m, achievedL: live.find((x) => x.month === m.month)?.achievedL ?? m.achievedL }))
    .map((m) => (m.month === "Oct" && oct?.saved ? { ...m, created: true, estimateL: Math.round(octTarget * 10) / 10, versions: 1, initiatives: oct.rows.length, note: `Saved ${oct.savedAt} · starts 1 Oct` } : m));
  // the period filter decides which months are counted; upcoming October always shows, so it can be built
  const inPeriod = new Set(periodMonths(period).map((m) => m.month as string));
  const rows = all.filter((m) => inPeriod.has(m.month) || m.month === "Oct").reverse();
  const counted = all.filter((m) => inPeriod.has(m.month) && m.created).length;
  const timeline = all.map((m) => ({ ...m, achievedL: m.month === "Oct" ? null : m.achievedL }));
  // a Sales Executive's months are the ones whose plan carries an initiative they own
  const execMonths = exec ? new Set(ORG_PLANS.filter((p) => p.region === OWN_REGION && orgInitiatives(p.id).some((i) => i.owner === exec)).map((p) => p.month)) : null;
  const shown = execMonths ? rows.filter((m) => execMonths.has(m.month)) : rows;
  const th = "px-3 py-2.5 text-left text-[11px] font-normal text-cx-faint";
  return (
    <div className="pb-24">
      <AgentPageHeader
        agent="map"
        title="Market Action Plans"
        meta={
          head ? (
            <>
              {MAP_LABELS.asm} · {MAP_LABELS.region} · every plan by month, with its version history · read-only
            </>
          ) : (
            <>
              Every plan by month, with its version history · {MAP_LABELS.region} · one plan across all {TERRITORIES.length} territories
            </>
          )
        }
        right={
          head ? undefined : (
            <button onClick={() => go("map-studio")} className={btnPrimary}>
              <Sparkles className="h-4 w-4" /> MAP Studio
            </button>
          )
        }
      />
      <div className="space-y-5 px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <Dropdown
            label="ASM"
            value={asm}
            options={[ASM_NAME]}
            onChange={(v) => {
              setAsm(v);
              setExec(null);
            }}
            placeholder="You"
          />
          {asm && <Dropdown label="Sales Executive" value={exec} options={SALES_EXECS.map((e) => e.name)} onChange={setExec} placeholder={`All ${SALES_EXECS.length}`} />}
          {exec && (
            <span className="text-[12px] text-cx-faint">
              Months carrying one of {exec}'s initiatives · <span className="font-data text-cx-muted">{shown.filter((m) => m.created).length}</span>
            </span>
          )}
          {(asm || exec) && (
            <button
              onClick={() => {
                setAsm(null);
                setExec(null);
              }}
              className="text-[12px] text-cx-muted hover:text-cx-text"
            >
              Clear
            </button>
          )}
        </div>
        <section aria-label="Plans by month" className={`${card} px-5 pb-4 pt-5`}>
          <p className="mb-3 text-[12.5px] text-cx-muted">
            <span className="font-data text-cx-text">{counted}</span> plan{counted === 1 ? "" : "s"} in {periodDetail(period)}
            <span className="text-cx-faint"> · October {oct?.saved ? "saved" : "not created yet"}</span>
          </p>
          <PlanTimeline months={timeline} active={inPeriod} />
        </section>
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[860px] table-fixed">
            <colgroup>
              <col className="w-[19%]" />
              <col className="w-[19%]" />
              <col className="w-[10%]" />
              <col className="w-[11%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[180px]" />
            </colgroup>
            <thead className="border-b border-cx-line">
              <tr>
                <th className={`${th} pl-5`}>Plan</th>
                <th className={th}>Status</th>
                <th className={th}>Version</th>
                <th className={`${th} text-right`}>Initiatives</th>
                <th className={`${th} text-right`}>Estimated</th>
                <th className={`${th} text-right`}>Delivered</th>
                <th className={`${th} text-right`}>%</th>
                <th className={`${th} pr-5`} />
              </tr>
            </thead>
            <tbody className="divide-y divide-cx-line">
              {shown.map((m) => {
                const pct = m.estimateL && m.achievedL != null ? Math.round((m.achievedL / m.estimateL) * 100) : null;
                const status = !m.created ? { label: "Draft · not generated", color: "#7c7f89" } : m.month === "Oct" ? { label: "Saved · starts 1 Oct", color: "#4f86f7" } : m.status === "progress" ? { label: "Locked · live", color: "#4f86f7" } : { label: "Closed", color: "#2fa85c" };
                const open = () =>
                  m.month === "Oct"
                    ? oct?.saved
                      ? onOpen("oct")
                      : head
                        ? toast(`${MAP_LABELS.asm} hasn't created the October plan yet. It appears here once it's saved.`)
                        : (requestAutogen(), go("map-studio"))
                    : m.month === "Sep"
                      ? onOpen("sep")
                      : toast(`Opens the ${m.label} plan, read-only.`);
                return (
                  <tr key={m.month} className="cursor-pointer hover:bg-cx-hover/40" onClick={open}>
                    <td className="py-3 pl-5 pr-3">
                      <span className="text-[13px] text-cx-text">{m.label}</span>
                      <span className="block text-[11.5px] text-cx-faint">{m.note}</span>
                    </td>
                    <td className="px-3 py-3">
                      <DotStatus color={status.color}>{status.label}</DotStatus>
                    </td>
                    <td className="px-3 py-3 font-data text-[12px] text-cx-muted">{m.versions ? `v${m.versions}` : "—"}</td>
                    <td className="px-3 py-3 text-right font-data text-[12.5px] text-cx-text">{m.initiatives || "—"}</td>
                    <td className="px-3 py-3 text-right font-data text-[12.5px] text-cx-text">{m.estimateL != null ? `₹${m.estimateL.toFixed(1)} L` : "—"}</td>
                    <td className="px-3 py-3 text-right font-data text-[12.5px] text-cx-text">{m.achievedL != null ? `₹${m.achievedL.toFixed(1)} L` : "—"}</td>
                    <td className="px-3 py-3 text-right font-data text-[12.5px] text-cx-text">{pct != null ? `${pct}%` : "—"}</td>
                    <td className="py-3 pl-3 pr-5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          open();
                        }}
                        className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] text-[#4f86f7] hover:underline"
                      >
                        {m.month === "Oct" && !oct?.saved ? (head ? "Not created yet" : "Create October MAP") : "Open"} <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The September plan
// ---------------------------------------------------------------------------

const FILTERS = [
  { key: "territory", label: "Territory", options: [] as readonly string[] },
  { key: "owner", label: "Sales Executive", options: [] as readonly string[] },
  { key: "channel", label: "Channel", options: ["Distributor", "Dealer", "Retailer", "Influencer"] },
  { key: "product", label: "Product", options: ["All categories", ...CATEGORIES] },
  { key: "sector", label: "Business sector", options: ["Trade", "Non-Trade"] },
  { key: "lever", label: "Lever", options: ["Distributor revival", "Dealer revival", "Retail reach", "Range selling", "Influencer engagement"] },
  { key: "priority", label: "Priority", options: ["High", "Medium", "Low"] },
  { key: "status", label: "Status", options: Object.values(INIT_STATUS).map((s) => s.label) },
  { key: "pushed", label: "Pushed to", options: ["Tracker", "Pitch", "Not pushed"] },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];
const NO_FILTERS: Record<FilterKey, string | null> = { territory: null, owner: null, channel: null, product: null, sector: null, lever: null, priority: null, status: null, pushed: null };

/** The saved October plan as plan rows: every initiative has a Tracker ticket for its owner; High ones went to Pitch. */
function octInitiatives(rows: OctRow[]): Initiative[] {
  return rows.map((d, k) => ({
    id: `oct-${d.id}`,
    n: k + 1,
    title: d.title,
    lever: d.lever,
    channel: d.lever === "Influencer engagement" ? "Influencer" : d.lever === "Dealer revival" ? "Dealer" : d.lever === "Distributor revival" ? "Distributor" : "Retailer",
    product: d.product,
    sector: "Trade",
    territory: d.territory,
    owner: d.owner,
    priority: d.priority,
    status: d.priority === "High" ? "in-pitch" : "escalated",
    ticket: octTicketId(k),
    unit: "₹L",
    est: d.estL,
    agreed: d.targetL,
    delivered: null,
    description: d.why,
    steps: [`Delegated to ${d.owner} as ${octTicketId(k)} in the Action Tracker`, d.priority === "High" ? `Talking point added to the pitches on ${d.owner}'s beats, in SFA` : "Suggested in Pitch; push it when you're ready", "Delivered counts from 1 Oct"],
    source: { agent: d.from.agent, ref: d.from.label, at: "Generated today" },
    pitch: d.priority === "High" ? { mode: "auto", outlets: Object.keys(OUTLETS).filter((o) => OUTLETS[o].territory === d.territory).slice(0, 2), at: "Today, 18:20" } : null,
    attachments: 0,
    comments: [],
  }));
}

function PlanDetail({ planId, org, onBack }: { planId: "sep" | "oct"; org?: OrgPlan; onBack: () => void }) {
  const { toast } = useHome();
  const go = useCortexNav();
  const head = useReadOnly();
  const octSaved = useOctPlan();
  const [period] = usePeriod();
  const isOct = !org && planId === "oct";
  // the ASM's own September plan is the live one (tickets applied), whichever page opened it
  const ownSep = !org || (org.region === OWN_REGION && org.month === "Sep");
  const meta = org
    ? {
        label: org.label,
        version: `v${org.versions} of ${org.versions}`,
        pill: org.status === "progress" ? "Locked" : org.month === "Oct" ? "Saved" : "Closed",
        pillTitle: org.note,
        history: ownSep ? SEP_PLAN.history : org.created ? `v${org.versions} · ${org.asm} · ${org.note}. The workbook keeps no plan versions.` : org.note,
      }
    : isOct
      ? { label: "October 2026", version: "v1 of 1", pill: "Saved", pillTitle: `Saved ${octSaved?.savedAt ?? ""}`, history: `v1 saved ${octSaved?.savedAt ?? "today"} in MAP Studio.` }
      : { label: SEP_PLAN.label, version: SEP_PLAN.version, pill: "Locked", pillTitle: SEP_PLAN.locked, history: SEP_PLAN.history };
  const scope = org
    ? { owner: org.asm, place: org.region, territories: org.territories as readonly string[], execs: execsOf(org.region).map((e) => e.name) }
    : { owner: MAP_LABELS.asm, place: OWN_REGION, territories: TERRITORIES as readonly string[], execs: SALES_EXECS.map((e) => e.name) };
  // upcoming October isn't counted in any past period, so only a past plan gets the note
  const outside = !isOct && !org && !periodMonths(period).some((m) => m.month === "Sep");
  const [session, setSession] = useState<PitchSession>(EMPTY_SESSION);
  useEffect(() => setSession(readSession()), []);
  const [removed, setRemoved] = useState<string[]>([]);
  // tickets verified in the Action Tracker carry their outcome into the plan (use-case step 11)
  const overrides = initiativeOverrides(useLoop());
  // actions assigned from the plan live in the backend, so they survive a reload and show on every device
  const { assigned } = useAssignments();
  const withTicket = (i: Initiative): Initiative => {
    const a = assigned[i.id];
    return a && !i.ticket ? { ...i, ticket: a.id, status: a.st === "closed" ? "ticket-closed" : i.status === "closed" ? "closed" : "escalated" } : i;
  };
  const base: Initiative[] = org ? orgInitiatives(org.id) : isOct ? octInitiatives(octSaved?.rows ?? freshRows()).map((i) => (assigned[i.id] ? { ...i, ticket: assigned[i.id].id } : i)) : SEP_INITIATIVES;
  // tickets verified in the Action Tracker carry their outcome into the ASM's own September plan
  const PLAN: Initiative[] =
    ownSep && !isOct ? base.map((i) => (overrides[i.id] ? { ...i, delivered: overrides[i.id].delivered ?? i.delivered, status: "closed" as const, ticket: overrides[i.id].ticket } : withTicket(i))) : base;
  const [open, setOpen] = useState<string | null>(null);
  // "New since this plan" is built against the ASM's own September; other plans have no feed
  const [banner, setBanner] = useState(ownSep && !isOct);
  const [sheet, setSheet] = useState<SheetId | null>(null);
  const [f, setF] = useState<Record<FilterKey, string | null>>(NO_FILTERS);

  const pitchOf = (i: Initiative) => {
    if (removed.includes(i.id)) return null;
    if (i.pitch) return i.pitch;
    if (session.pushed.includes(i.id)) return { mode: "confirmed" as const, outlets: SUGGESTED_OUTLETS[i.id] ?? [], at: "Today" };
    return null;
  };
  const pushedTo = (i: Initiative) => {
    const f = flagsOf({ ...i, pitch: pitchOf(i) });
    return [f.tracker ? "Tracker" : null, f.pitch ? "Pitch" : null].filter(Boolean) as string[];
  };

  const rows = PLAN.filter((i) => {
    if (f.territory && i.territory !== f.territory) return false;
    if (f.owner && i.owner !== f.owner) return false;
    if (f.channel && i.channel !== f.channel) return false;
    if (f.product && i.product !== f.product) return false;
    if (f.sector && i.sector !== f.sector) return false;
    if (f.lever && i.lever !== f.lever) return false;
    if (f.priority && i.priority !== f.priority) return false;
    if (f.status && INIT_STATUS[i.status].label !== f.status) return false;
    if (f.pushed) {
      const p = pushedTo(i);
      if (f.pushed === "Not pushed" ? p.length > 0 : !p.includes(f.pushed)) return false;
    }
    return true;
  });

  const sum = planSummary(PLAN);
  const flaggedTracker = PLAN.filter((i) => pushedTo(i).includes("Tracker")).length;
  const flaggedPitch = PLAN.filter((i) => pushedTo(i).includes("Pitch")).length;
  const flagged = PLAN.filter((i) => pushedTo(i).length > 0).length;
  const flaggedBoth = PLAN.filter((i) => pushedTo(i).length === 2).length;

  const push = (i: Initiative) => {
    if (i.pitch) {
      setRemoved((r) => r.filter((x) => x !== i.id));
      return;
    }
    const next = { ...session, pushed: [...session.pushed, i.id], dismissed: session.dismissed.filter((x) => x !== i.id) };
    setSession(next);
    writeSession(next);
  };
  const takeBack = (i: Initiative) => {
    if (i.pitch) setRemoved((r) => [...r, i.id]);
    else {
      const next = { ...session, pushed: session.pushed.filter((x) => x !== i.id) };
      setSession(next);
      writeSession(next);
    }
    toast(`#${i.n} taken back out of Pitch. ${i.owner}'s SFA app drops the talking point at the next sync.`);
  };

  const jump = (id: string) => {
    setF(NO_FILTERS);
    setOpen(id);
    setTimeout(() => document.getElementById(`row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  const th = "px-3 py-2.5 text-left text-[11px] font-normal text-cx-faint";

  return (
    <div className="pb-24">
      <section className="cx-land-hero px-4 pb-5 pt-14 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px]">
            <button onClick={onBack} className="text-[#4f86f7] hover:underline">
              Market Action Plans
            </button>
            <span className="text-cx-faint" aria-hidden>
              /
            </span>
            <span className="text-cx-text" aria-current="page">
              {head ? `${scope.owner} · ` : ""}
              {scope.place} · {meta.label}
            </span>
          </nav>
        </div>
        {outside && (
          <p className="mt-3 text-[12px] text-cx-muted">
            {meta.label} sits outside {periodDetail(period)}; it's shown because you opened it.{" "}
            <button onClick={onBack} className="text-[#4f86f7] hover:underline">
              See the plans in this period
            </button>
          </p>
        )}
      </section>

      <div className="space-y-5 px-4 sm:px-6">
        {/* plan header */}
        <div className={`${card} flex flex-wrap items-center gap-3 px-5 py-4`}>
          <h1 className="flex items-center gap-2.5 text-[20px] font-medium text-cx-text">
            <AgentIcon agent="map" /> {head ? `${scope.owner} · ` : ""}
            {scope.place} · {meta.label}
          </h1>
          <span className="inline-flex h-6 items-center rounded-full border border-[#2fa85c]/40 bg-[#2fa85c]/10 px-2 text-[11.5px] text-cx-text" title={meta.pillTitle}>
            {meta.pill}
          </span>
          {scope.place === OWN_REGION && (
            <span className="inline-flex h-6 items-center rounded-full border px-2 text-[11.5px] text-cx-text" style={{ borderColor: `${BAND_COLOR[REGION_SHARE.band]}66`, background: `${BAND_COLOR[REGION_SHARE.band]}1a` }}>
              {REGION_SHARE.band} · <span className="ml-1 font-data">{REGION_SHARE.share}%</span>&nbsp;share
            </span>
          )}
          <span className="mx-1 hidden h-5 w-px bg-cx-line md:block" aria-hidden />
          {scope.place === OWN_REGION && (
            <div className="flex flex-wrap gap-1.5">
              <SheetButtons onOpen={setSheet} />
            </div>
          )}
          <span className="ml-auto flex flex-wrap items-center gap-1.5">
            <button onClick={() => toast(meta.history)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-cx-line px-2.5 text-[12.5px] text-cx-muted hover:border-cx-strong hover:text-cx-text">
              <History className="h-3.5 w-3.5" /> <span className="font-data">{meta.version}</span>
            </button>
            {PLAN.some((x) => x.comments.length) && (
              <button onClick={() => jump(PLAN.find((x) => x.comments.length)!.id)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-cx-line px-2.5 text-[12.5px] text-cx-muted hover:border-cx-strong hover:text-cx-text">
                <MessageSquare className="h-3.5 w-3.5" /> Comments
              </button>
            )}
            {head ? (
              <span className="inline-flex h-8 items-center rounded-md border border-cx-line bg-cx-raised px-2.5 text-[12.5px] text-cx-muted" title={`${scope.owner} owns this plan. Comment on an initiative to raise a ticket they own.`}>
                Read-only · {scope.owner} owns this plan
              </span>
            ) : (
              <button
                onClick={() => {
                  if (isOct) {
                    // the explicit way back in: reopen the saved plan for editing
                    const cur = readOct();
                    if (cur) writeOct({ ...cur, editing: true });
                  } else toast("September is locked. Changes go into October's draft in MAP Studio.");
                  go("map-studio");
                }}
                className={btnPrimary}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit in MAP Studio
              </button>
            )}
          </span>
        </div>

        {/* summary row — the same stripe the Head of Sales reads org-wide on the index */}
        <SummaryRow
          label={`${meta.label} summary`}
          cells={[
            { label: "Estimated impact", value: `₹${sum.est.toFixed(1)} L` },
            { label: isOct ? "Your target" : "Agreed impact", value: `₹${sum.agreed.toFixed(1)} L`, sub: isOct ? "Set in MAP Studio" : org ? `Agreed by ${scope.owner}` : undefined },
            isOct
              ? { label: "Delivered", value: "Starts 1 Oct", sub: "Counts from the first October bill" }
              : {
                  label: "Delivered",
                  value: `₹${sum.delivered.toFixed(1)} L · ${sum.pct}%`,
                  sub: org && org.status !== "progress" ? "of agreed, month closed" : `of agreed, ${LBL.daysLeft}`,
                  live: !org || org.status === "progress",
                },
            { label: "Closed", value: `${sum.closed} of ${sum.total}` },
            {
              label: "Flagged",
              value: String(flagged),
              sub: flagged ? `${flaggedTracker} in Tracker · ${flaggedPitch} in Pitch${flaggedBoth ? ` · ${flaggedBoth} in both` : ""}` : "Nothing waiting on an owner",
            },
          ]}
        />

        {banner && <SinceLocked onClose={() => setBanner(false)} onItem={jump} />}

        {/* filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((x) => (
            <Dropdown
              key={x.key}
              label={x.label}
              value={f[x.key]}
              options={x.key === "territory" ? [...scope.territories] : x.key === "owner" ? scope.execs : [...x.options]}
              onChange={(v) => setF((s) => ({ ...s, [x.key]: v }))}
            />
          ))}
          <span className="ml-1 text-[12px] text-cx-faint">
            Showing <span className="font-data text-cx-muted">{rows.length}</span> of <span className="font-data text-cx-muted">{PLAN.length}</span>
          </span>
          {Object.values(f).some(Boolean) && (
            <button onClick={() => setF(NO_FILTERS)} className="text-[12px] text-cx-muted hover:text-cx-text">
              Clear
            </button>
          )}
        </div>

        {/* initiatives */}
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[1240px] table-fixed">
            <colgroup>
              <col />
              <col className="w-[96px]" />
              <col className="w-[176px]" />
              <col className="w-[248px]" />
              <col className="w-[104px]" />
              <col className="w-[104px]" />
              <col className="w-[104px]" />
              <col className="w-[64px]" />
              <col className="w-[128px]" />
            </colgroup>
            <thead className="border-b border-cx-line">
              <tr>
                <th className={`${th} pl-5`}>Initiative</th>
                <th className={th}>Priority</th>
                <th className={th}>Status</th>
                <th className={th}>Pushed to</th>
                <th className={`${th} text-right`}>Estimated</th>
                <th className={`${th} text-right`}>{isOct ? "Target" : "Agreed"}</th>
                <th className={`${th} text-right`}>Delivered</th>
                <th className={`${th} text-right`}>%</th>
                <th className={`${th} pr-5 text-right`}>Actions</th>
              </tr>
            </thead>
            {rows.length === 0 && (
              <tbody>
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-[12.5px] text-cx-faint">
                    No initiative matches these filters.
                  </td>
                </tr>
              </tbody>
            )}
            {rows.map((i) => (
              <InitiativeRow
                key={i.id}
                i={i}
                asm={scope.owner}
                plan={{ label: `${head ? `${scope.owner} · ` : ""}${scope.place} · ${meta.label}`, id: org?.id }}
                open={open === i.id}
                onToggle={() => setOpen((o) => (o === i.id ? null : i.id))}
                pitch={pitchOf(i)}
                removed={removed.includes(i.id)}
                onPush={() => push(i)}
                onTakeBack={() => takeBack(i)}
              />
            ))}
          </table>
        </div>
      </div>
      {sheet && <MarketSheet key={sheet} open={sheet} scope={null} onClose={() => setSheet(null)} />}
    </div>
  );
}

function SinceLocked({ onClose, onItem }: { onClose: () => void; onItem: (id: string) => void }) {
  const go = useCortexNav();
  const { toast } = useHome();
  const head = useReadOnly();
  const n = SINCE_LOCKED.signals.length + SINCE_LOCKED.feedback.length;
  const title = (id: string) => SEP_INITIATIVES.find((i) => i.id === id)!.title;
  return (
    <section aria-label="New since this plan" className="overflow-hidden rounded-lg border border-[#e0b43a]/35 bg-[#e0b43a]/[0.05]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#e0b43a]/25 px-5 py-3">
        <h2 className="text-[13.5px] font-medium text-cx-text">New since this plan</h2>
        <span className="font-data text-[12px] text-[#e0b43a]">{n}</span>
        <span className="text-[12px] text-cx-faint">Since locked · {SEP_PLAN.lockedShort}</span>
        <span className="ml-auto text-[11.5px] text-cx-faint">Thermometer · Huddle · Visit feedback</span>
        <button onClick={onClose} className="rounded-md p-1 text-cx-faint hover:bg-cx-hover hover:text-cx-text" aria-label="Dismiss">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid md:grid-cols-2">
        <div className="px-5 py-4">
          <p className="mb-2.5 text-[11.5px] text-cx-faint">Signals</p>
          <ul className="space-y-3">
            {SINCE_LOCKED.signals.map((s) => (
              <li key={s.text} className="flex gap-3">
                <AgentIcon agent={s.agent} size="sm" round />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline justify-between gap-2 text-[12px]">
                    <span>
                      <span className="text-cx-text">{AGENTS[s.agent].name}</span> <span className="text-cx-faint">· {s.when}</span>
                    </span>
                    <button onClick={() => (s.agent === "thermometer" ? go(head ? "thermometer-head" : "thermometer") : go("huddle"))} className="text-[#4f86f7] hover:underline">
                      Open in {AGENTS[s.agent].name}
                    </button>
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-cx-muted">{s.text}</p>
                  <button onClick={() => onItem(s.item)} className="mt-0.5 text-[12px] text-[#4f86f7] hover:underline">
                    On item: {title(s.item)}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-[#e0b43a]/25 px-5 py-4 md:border-l md:border-t-0">
          <p className="mb-2.5 text-[11.5px] text-cx-faint">Sales Executive visit feedback · from SFA</p>
          <ul className="space-y-3">
            {SINCE_LOCKED.feedback.map((s) => (
              <li key={s.text}>
                <p className="text-[12px]">
                  <span className="text-cx-text">{s.by}</span> <span className="text-cx-faint">at {s.at} · {s.when} · {s.kind}</span>
                </p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-cx-muted">{s.text}</p>
                <button onClick={() => onItem(s.item)} className="mt-0.5 text-[12px] text-[#4f86f7] hover:underline">
                  On item: {title(s.item)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function InitiativeRow({
  i,
  asm,
  plan,
  open,
  onToggle,
  pitch,
  removed,
  onPush,
  onTakeBack,
}: {
  i: Initiative;
  /** the ASM who owns this plan; a Head of Sales comment becomes their delegation ticket */
  asm: string;
  /** the plan this row sits in, carried into Pitch as the breadcrumb trail */
  plan: { label: string; id?: string };
  open: boolean;
  onToggle: () => void;
  pitch: Initiative["pitch"];
  removed: boolean;
  onPush: () => void;
  onTakeBack: () => void;
}) {
  const head = useReadOnly();
  const st = INIT_STATUS[i.status];
  const origin: PitchOrigin = { plan: plan.label, planId: plan.id, n: i.n, initiative: i.title };
  const [escalate, setEscalate] = useState(false);
  const pct = i.delivered != null && i.agreed ? Math.round((i.delivered / i.agreed) * 100) : null;
  const pctColor = pct == null ? "text-cx-faint" : pct >= 95 ? "text-[#2fa85c]" : pct < 50 ? "text-[#e85a70]" : "text-[#e0b43a]";
  const [run, setRun] = useState<{ run: AgentRun; key: number } | null>(null);
  const td = "px-3 py-3 align-top";
  return (
    <tbody id={`row-${i.id}`} className="border-b border-cx-line last:border-b-0">
      <tr className={`cursor-pointer ${open ? "bg-cx-hover/30" : "hover:bg-cx-hover/40"}`} onClick={onToggle}>
        <td className="py-3 pl-5 pr-3 align-top">
          <div className="flex gap-2">
            <button onClick={(e) => (e.stopPropagation(), onToggle())} className="mt-0.5 text-cx-faint hover:text-cx-text" aria-expanded={open} aria-label={`${open ? "Collapse" : "Expand"} ${i.title}`}>
              {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            <div className="min-w-0">
              <p className={`text-[13px] leading-snug ${i.status === "closed" ? "text-cx-muted" : "text-cx-text"}`}>
                <span className="mr-1.5 font-data text-[11px] text-cx-faint">#{i.n}</span>
                {i.title}
                {i.tag && (
                  <span className={`ml-2 inline-flex h-5 items-center rounded-full border px-1.5 align-middle text-[10.5px] ${i.tag.tone === "ai" ? "border-[#2f6fed]/40 bg-[#2f6fed]/10 text-[color:var(--ai-ink)]" : "border-[#e0b43a]/40 text-[#e0b43a]"}`}>{i.tag.label}</span>
                )}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-cx-faint">
                <span>
                  {i.territory} · {i.lever} · owner {i.owner}
                </span>
                <span className="inline-flex items-center gap-2.5 font-data text-[11px]">
                  <span className="inline-flex items-center gap-1" title="Attachments">
                    <Paperclip className="h-3 w-3" /> {i.attachments}
                  </span>
                  <span className="inline-flex items-center gap-1" title="Comments">
                    <MessageSquare className="h-3 w-3" /> {i.comments.length}
                  </span>
                </span>
              </p>
            </div>
          </div>
        </td>
        <td className={td}>
          <PriorityPill p={i.priority as Priority} />
        </td>
        <td className={td}>
          <DotStatus color={st.color}>{st.label}</DotStatus>
        </td>
        <td className={`${td} text-[12px] leading-snug text-cx-text`}>
          <PushedTo i={i} pitch={pitch} removed={removed} origin={origin} />
        </td>
        <td className={`${td} text-right`}>
          <Value i={i} v={i.est} />
        </td>
        <td className={`${td} text-right`}>
          <Value i={i} v={i.agreed} />
        </td>
        <td className={`${td} text-right`}>
          <Value i={i} v={i.delivered} />
        </td>
        <td className={`${td} text-right font-data text-[12.5px] ${pctColor}`}>{pct != null ? `${pct}%` : "—"}</td>
        <td className="py-3 pl-3 pr-5 align-top" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-end">
            {head ? (
              <button
                onClick={() => !open && onToggle()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-cx-line px-2.5 text-[12px] text-cx-muted hover:border-cx-strong hover:text-cx-text"
                title={`Comment for ${asm}. It becomes a delegation ticket they own.`}
              >
                <MessageSquare className="h-3.5 w-3.5" /> Comment
              </button>
            ) : (
              <RowActions
                i={i}
                inPitch={!!pitch}
                pitch={pitch}
                origin={origin}
                onPush={() => {
                  onPush();
                  setRun({ run: { agent: "pitch", steps: ["matching outlets on the beat", "adding the talking point", "routing to SFA"], result: `Pushed to Pitch · ${i.owner} · ${(SUGGESTED_OUTLETS[i.id] ?? i.pitch?.outlets ?? []).length} outlets`, link: "View in Pitch" }, key: Date.now() });
                }}
                onTakeBack={onTakeBack}
                onComment={() => (setEscalate(false), !open && onToggle())}
                onEscalate={() => (setEscalate(true), !open && onToggle())}
              />
            )}
          </div>
          {run && (
            <div className="mt-2 flex justify-end">
              <AgentRunChip key={run.key} run={run.run} />
            </div>
          )}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={9} className="bg-cx-hover/20 px-5 pb-5 pt-1">
            <Expanded i={i} asm={asm} plan={plan} pitch={pitch} origin={origin} escalate={escalate} onEscalated={() => setEscalate(false)} />
          </td>
        </tr>
      )}
    </tbody>
  );
}

/**
 * Escalate to Sales Head — the ASM's way out of a call they can't make on their own. Everything
 * else in the Actions menu stays inside their own authority: a push, a ticket, a comment to
 * someone who reports to them. This one goes the other way, and arrives on the Head of Sales's
 * homepage as a numbered item in "Needs your decision", with the plan row as its context.
 */
function Escalate({ i, plan, open, onSent }: { i: Initiative; plan: { label: string }; open: boolean; onSent: () => void }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState<{ text: string; id: string; key: number } | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (open && !sent) box.current?.focus();
  }, [open, sent]);
  if (!open && !sent) return null;

  const send = () => {
    if (!text.trim()) return;
    setSent({ text: text.trim(), id: `DEC-${118 + i.n}`, key: Date.now() });
    setText("");
    onSent();
  };

  return (
    <div>
      <p className="text-[11.5px] text-cx-faint">Escalate to Sales Head</p>
      {sent ? (
        <div className="mt-1.5 space-y-1.5">
          <div className="rounded-lg border border-cx-line bg-cx-panel px-3.5 py-2.5">
            <p className="text-[12px]">
              <span className="text-cx-text">You</span> <span className="text-cx-faint">· just now · to {LBL.headName}</span>
              <span className="ml-2 font-data text-[11px] text-[#4f86f7]">{sent.id}</span>
            </p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-cx-text">{sent.text}</p>
          </div>
          <AgentRunChip
            key={sent.key}
            run={{
              agent: "map",
              steps: ["attaching the plan row and its evidence", "checking it against the decision thresholds", `placing it in ${LBL.headName}'s queue`],
              // no link: the decision sits on the Sales Head's homepage, which the ASM can't open
              result: `${sent.id} is in ${LBL.headName}'s Needs your decision · ${i.priority} priority`,
            }}
            block
          />
          <p className="text-[11.5px] text-cx-faint">#{i.n} stays yours until they answer. The answer lands back on this row.</p>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="mt-1.5 rounded-lg border border-cx-strong bg-cx-panel focus-within:border-[#2f6fed]/70"
        >
          <label className="sr-only" htmlFor={`esc-${i.id}`}>
            What do you need {LBL.headName} to decide on #{i.n}?
          </label>
          <textarea
            id={`esc-${i.id}`}
            ref={box}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder={`What do you need ${LBL.headName} to decide on #${i.n}?`}
            className="block w-full resize-none bg-transparent px-3 pt-2.5 text-[13px] text-cx-text placeholder:text-cx-faint focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2">
            <span className="pl-1 text-[11px] text-cx-faint">Goes with {plan.label} · #{i.n}</span>
            <button type="submit" disabled={!text.trim()} className="inline-flex h-7 items-center rounded-md bg-[#2f6fed] px-2.5 text-[12px] font-medium text-white hover:bg-[#4f86f7] disabled:opacity-40">
              Escalate
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** A plan figure: ₹ on one line; counts with their unit on a second line so columns stay narrow. */
function Value({ i, v }: { i: Initiative; v: number | null }) {
  if (v == null) return <span className="font-data text-[12.5px] text-cx-faint">—</span>;
  if (i.unit === "₹L") return <span className="whitespace-nowrap font-data text-[12.5px] text-cx-text">{fmtValue(i, v)}</span>;
  return (
    <span className="block">
      <span className="block font-data text-[12.5px] text-cx-text">{v}</span>
      <span className="block text-[11px] text-cx-faint">{i.unit}</span>
    </span>
  );
}

/** Open the pitch this initiative reached, carrying the plan row it came from. An initiative
 *  already links to its Tracker ticket; this is the same move for the other destination. */
function PitchLink({ outlet, origin, children }: { outlet: string; origin: PitchOrigin; children?: React.ReactNode }) {
  const go = useCortexNav();
  const head = useReadOnly();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setOpenPitch(`p-${outlet.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, origin);
        go(head ? "pitch-detail-head" : "pitch-detail");
      }}
      className="text-left text-[#4f86f7] hover:underline"
      aria-label={`Open the pitch for ${outlet}${head ? ", read-only" : ""}`}
      title={`Open the pitch for ${outlet}${head ? " · read-only" : ""}`}
    >
      {children ?? outlet}
    </button>
  );
}

function TicketLink({ id }: { id: string }) {
  const go = useCortexNav();
  const head = useReadOnly();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        openTicket(id);
        go(head ? "tracker-head" : "tracker");
      }}
      className="font-data text-[#4f86f7] hover:underline"
    >
      {id}
    </button>
  );
}

function PushedTo({ i, pitch, removed, origin }: { i: Initiative; pitch: Initiative["pitch"]; removed: boolean; origin: PitchOrigin }) {
  const lines: React.ReactNode[] = [];
  if (i.ticket)
    lines.push(
      <span key="t">
        {i.owner === MAP_LABELS.asm ? `${i.owner} (ASM)` : `${i.owner} (Sales Executive)`} ·{" "}
        <TicketLink id={i.ticket} />

      </span>
    );
  if (pitch)
    lines.push(
      <span key="p" className="block">
        Pitch · {i.owner}
        <span className="block">
          {pitch.outlets.map((o, k) => (
            <React.Fragment key={o}>
              {k > 0 && <span className="text-cx-faint">, </span>}
              <PitchLink outlet={o} origin={origin} />
            </React.Fragment>
          ))}
        </span>
        <span className="block text-[11px] text-cx-faint">{pitch.mode === "auto" ? `Auto-pushed · ${i.priority} · ${pitch.at}` : "Pushed by you"}</span>
      </span>
    );
  if (!lines.length)
    return (
      <span className="text-cx-faint">
        {removed ? "Taken back from Pitch" : "Not pushed yet"}
        {!removed && i.priority !== "High" && <span className="block text-[11px]">Suggested in Pitch · below the auto-push cut-off</span>}
      </span>
    );
  return <span className="space-y-1">{lines}</span>;
}

function RowActions({
  i,
  inPitch,
  pitch,
  origin,
  onPush,
  onTakeBack,
  onComment,
  onEscalate,
}: {
  i: Initiative;
  inPitch: boolean;
  pitch: Initiative["pitch"];
  origin: PitchOrigin;
  onPush: () => void;
  onTakeBack: () => void;
  onComment: () => void;
  onEscalate: () => void;
}) {
  const go = useCortexNav();
  const [open, setOpen] = useState(false);
  const { toast } = useHome();
  const nt = useAssignments();
  /** a real ticket in the owner's queue: the officer gets it in the app, with a push */
  const send = () =>
    nt
      .assign({ source_id: i.id, title: i.title, territory: i.territory, agent: i.source.agent, assignee: i.owner, priority: i.priority, note: i.steps[0] })
      .then((r) => toast(`${r.action.id}: ${assignToast(i.owner === MAP_LABELS.asm ? "Me" : i.owner, r)}`))
      .catch((e: Error) => toast(`Couldn't create the ticket: ${e.message}`));
  const ref = useOutside<HTMLDivElement>(open, () => setOpen(false));
  const first = pitch?.outlets[0];
  const items = [
    // an initiative in Pitch opens its pitch, the way one with a ticket opens its ticket
    ...(inPitch && first
      ? [
          {
            label: `Open the pitch · ${first}`,
            sub: pitch!.outlets.length > 1 ? `First of ${pitch!.outlets.length} on ${i.owner}'s beats` : `On ${i.owner}'s beat`,
            run: () => {
              setOpenPitch(`p-${first.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, origin);
              go("pitch-detail");
            },
          },
        ]
      : []),
    inPitch
      ? { label: "Take back from Pitch", sub: `Removes the talking point from ${i.owner}'s pitch`, run: onTakeBack }
      : { label: `Push to Pitch · ${i.owner}`, sub: `${(SUGGESTED_OUTLETS[i.id] ?? i.pitch?.outlets ?? []).length} outlets on ${i.owner}'s beats`, run: onPush },
    i.ticket
      ? { label: `Open ${i.ticket} in Tracker`, sub: `Owned by ${i.owner}`, run: () => (openTicket(i.ticket!), go("tracker")) }
      : { label: "Send to Tracker", sub: `Creates a ticket for ${i.owner}`, run: send },
    { label: "Comment", sub: `Creates a ticket for ${i.owner}`, run: onComment },
    // the one call that leaves the ASM's hands: above their authority, or theirs to escalate
    { label: "Escalate to Sales Head", sub: `Raises it to ${LBL.headName} as a decision`, run: onEscalate },
  ];
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12px] ${open ? "border-cx-strong bg-cx-hover text-cx-text" : "border-cx-line text-cx-muted hover:text-cx-text"}`}
      >
        <MoreHorizontal className="h-3.5 w-3.5" /> Actions <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-1 w-[260px] rounded-lg border border-cx-strong bg-cx-raised p-1 shadow-2xl">
          {items.map((it) => (
            <button
              key={it.label}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                it.run();
              }}
              className="block w-full rounded-md px-2.5 py-2 text-left hover:bg-cx-hover"
            >
              <span className="block text-[12.5px] text-cx-text">{it.label}</span>
              <span className="block text-[11px] text-cx-faint">{it.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Expanded({
  i,
  asm,
  plan,
  pitch,
  origin,
  escalate,
  onEscalated,
}: {
  i: Initiative;
  asm: string;
  plan: { label: string; id?: string };
  pitch: Initiative["pitch"];
  origin: PitchOrigin;
  escalate: boolean;
  onEscalated: () => void;
}) {
  const { toast } = useHome();
  const head = useReadOnly();
  const nt = useAssignments();
  const [text, setText] = useState("");
  const [sent, setSent] = useState<{ text: string; key: number; ticket: string }[]>([]);
  const trace = useMemo(() => initiativeTrace(i), [i]);
  const ptrace = useMemo(() => (pitch ? pushTrace({ ...i, pitch }) : null), [i, pitch]);
  const label = "text-[11.5px] text-cx-faint";
  const send = () => {
    const note = text.trim();
    if (!note) return;
    setText("");
    const done = (ticket: string) => setSent((s) => [...s, { text: note, key: Date.now(), ticket }]);
    const fail = (e: Error) => (toast(`Couldn't send the comment: ${e.message}`), setText(note));
    if (i.ticket) nt.comment(i.ticket, note).then(() => done(i.ticket!)).catch(fail);
    else
      nt.assign({ source_id: i.id, title: i.title, territory: i.territory, agent: i.source.agent, assignee: i.owner, priority: i.priority, note })
        .then((r) => done(r.action.id))
        .catch(fail);
  };
  return (
    <div className="grid gap-6 pl-6 pt-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <p className="text-[13px] leading-relaxed text-cx-text">{i.description}</p>
        <div className="flex flex-wrap gap-3">
          <TraceTrigger trace={trace} source="Market Action Plan Initiative" title={i.title} label="Why it's in the plan" />
          {ptrace && <TraceTrigger trace={ptrace} source="Market Action Plan Initiative" title={i.title} label="How it reached Pitch" />}
        </div>
        <div>
          <p className={label}>Action steps</p>
          <ul className="mt-1.5 space-y-1">
            {i.steps.map((s) => (
              <li key={s} className="flex gap-2.5 text-[12.5px] text-cx-muted">
                <span className="text-cx-faint">—</span> {s}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[12.5px] text-cx-muted">
          Pushed to:{" "}
          {!i.ticket && !pitch ? (
            <span className="text-cx-text">Not pushed yet</span>
          ) : (
            <span className="text-cx-text">
              {i.ticket && (
                <>
                  {i.owner} (Sales Executive) · <TicketLink id={i.ticket} />
                </>
              )}
              {i.ticket && pitch && " · "}
              {pitch && (
                <>
                  Pitch ·{" "}
                  {pitch.outlets.map((o, k) => (
                    <React.Fragment key={o}>
                      {k > 0 && ", "}
                      <PitchLink outlet={o} origin={origin} />
                    </React.Fragment>
                  ))}
                </>
              )}
            </span>
          )}
        </p>
        <p className="text-[12px] text-cx-faint">
          {i.channel} · {i.product} · {i.sector} · {i.lever}
        </p>
        {i.visit && (
          <div>
            <p className={label}>Visit feedback · from SFA</p>
            <div className="mt-1.5 rounded-lg border border-cx-line bg-cx-panel px-3.5 py-2.5">
              <p className="text-[12px] text-cx-faint">
                <span className="text-cx-text">{i.visit.by}</span> at {i.visit.at} · {i.visit.when} · {i.visit.state}
              </p>
              <p className="mt-0.5 text-[12.5px] text-cx-text">{i.visit.note}</p>
            </div>
          </div>
        )}
      </div>
      <div className="min-w-0 space-y-4">
        <div>
          <p className={label}>Attachments</p>
          <p className="mt-1 text-[12.5px] text-cx-muted">{i.attachments ? `${i.attachments} document${i.attachments === 1 ? "" : "s"}` : "None on this item."}</p>
          {!head && (
            <button onClick={() => toast("Attach an invoice, photo or PDF to this initiative.")} className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-md border border-cx-line px-2.5 text-[12px] text-cx-muted hover:border-cx-strong hover:text-cx-text">
              <Paperclip className="h-3.5 w-3.5" /> Attach a document
            </button>
          )}
        </div>
        {!head && <Escalate i={i} plan={plan} open={escalate} onSent={onEscalated} />}
        <div>
          <p className={label}>Comments</p>
          <div className="mt-1.5 space-y-2">
            {i.comments.length === 0 && sent.length === 0 && <p className="text-[12.5px] text-cx-faint">No comments yet.</p>}
            {i.comments.map((c) => (
              <div key={c.at} className="rounded-lg border border-cx-line bg-cx-panel px-3.5 py-2.5">
                <p className="flex flex-wrap justify-between gap-2 text-[12px]">
                  <span>
                    <span className="text-cx-text">{c.who}</span> <span className="text-cx-faint">· {c.at}</span>
                  </span>
                  {c.ticket && <span className="font-data text-[11px] text-[#4f86f7]">{c.ticket}</span>}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-cx-text">{c.text}</p>
              </div>
            ))}
            {sent.map((c) => (
              <div key={c.key} className="space-y-1.5">
                <div className="rounded-lg border border-cx-line bg-cx-panel px-3.5 py-2.5">
                  <p className="text-[12px]">
                    <span className="text-cx-text">{MAP_LABELS.asm}</span> <span className="text-cx-faint">· just now</span>
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-cx-text">{c.text}</p>
                </div>
                <AgentRunChip run={{ agent: "map", steps: ["creating the ticket", `adding it to ${i.owner}'s Tracker`], result: `${c.ticket} is in ${i.owner}'s Tracker`, link: "View in Tracker" }} block />
              </div>
            ))}
          </div>
          {head ? (
            // the Head of Sales comments on the ASM's plan; the comment becomes a ticket the ASM owns
            <div className="mt-2">
              <CommentBox asm={asm} subject={`MAP #${i.n} · ${i.title}`} />
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="mt-2 flex gap-2"
            >
              <label htmlFor={`cm-${i.id}`} className="sr-only">
                Comment for {i.owner}
              </label>
              <input
                id={`cm-${i.id}`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Comment — creates a ticket for ${i.owner}`}
                className="h-9 min-w-0 flex-1 rounded-md border border-cx-strong bg-cx-bg px-3 text-[12.5px] text-cx-text placeholder:text-cx-faint focus:border-[#2f6fed]/70 focus:outline-none"
              />
              <button type="submit" disabled={!text.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#2f6fed] px-3 text-[12.5px] font-medium text-white hover:bg-[#4f86f7] disabled:opacity-40">
                <Send className="h-3.5 w-3.5" /> Comment
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

