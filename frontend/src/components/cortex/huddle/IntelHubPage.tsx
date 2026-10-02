"use client";

// Intel Hub — the Huddle agent's home: Field Insights by team, Field Operations Health (every region, territory and
// sales officer scored on the workbook), the Capability Building trend, business dimensions, performance analytics,
// action execution by function and product discussion coverage. Built from the workbook's Huddle sheet and sales data
// for the ASM (GET /api/web/bootstrap → `huddle`).

import React, { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, ChartColumn, ChevronsRight, CircleCheck, Info, LayoutGrid, List, Maximize2, Minimize2, Package, ShieldCheck, Star, Tag, Target } from "lucide-react";
import { CATEGORY_LABEL, CB_CRITERIA, ENTITIES, Entity, FUNCTIONS, HUDDLE_LABELS, INSIGHTS, MEETINGS, Meeting, PRODUCTS, SEGMENTS, STATE, TIME_RANGES, TREND, allMeetings, inRange } from "@/data/huddle";
import { AgentPageHeader } from "../agentPage";
import { useCortexNav } from "../nav";
import { AiInferred, BAND, CardHead, Chip, Empty, HuddlePage, LineChart, Legend, SegTabs, Select, body, btn, bucketOf, card, shortDay, useLiveAction, useOpen, useTimeRange } from "./parts";

export function IntelHubPage() {
  return (
    <HuddlePage current="hub">
      <Hub />
    </HuddlePage>
  );
}

function Hub() {
  const range = useTimeRange();
  const shown = useMemo(() => allMeetings().filter((m) => inRange(m, range.days)), [range.days]);
  return (
    <>
      <AgentPageHeader
        agent="huddle"
        title="Intel Hub"
        meta={
          <span className="inline-flex flex-wrap items-center gap-2">
            Monitor meeting effectiveness, uncover risks, and track execution outcomes · {HUDDLE_LABELS.region} · data to {HUDDLE_LABELS.dataDate} <AiInferred />
          </span>
        }
        right={
          <>
            <Select prefix="Scope" value={HUDDLE_LABELS.region} options={[HUDDLE_LABELS.region]} onChange={() => {}} menuRight />
            <Select prefix="Period" value={range.label} options={TIME_RANGES.map((r) => r.label)} onChange={range.set} menuRight />
          </>
        }
      />
      <div className={body}>
        <FieldInsights shown={shown} />
        <FieldOpsHealth />
        <PerformanceMetrics shown={shown} />
        <div className={`${card} space-y-6 p-5`}>
          <BusinessDimensions shown={shown} />
          <PerformanceAnalytics shown={shown} />
        </div>
        <ActionExecution shown={shown} />
        <ProductCoverage shown={shown} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Field Insights — what each team's themes say, by category
// ---------------------------------------------------------------------------

function FieldInsights({ shown }: { shown: Meeting[] }) {
  const open = useOpen();
  const teams = Object.keys(INSIGHTS);
  const label = (t: string) => `${t.replace(/ Team$/, "")} Insights`;
  const [team, setTeam] = useState(teams.find((t) => /sales/i.test(t)) ?? teams[0]);
  const ids = new Set(shown.map((m) => m.id));
  const items = Object.entries(INSIGHTS[team] ?? {}).flatMap(([cat, xs]) => xs.filter((x) => ids.has(x.meetingId)).map((x) => ({ ...x, cat })));
  return (
    <section className={`${card} p-5`}>
      <CardHead title="Field Insights" sub="What the huddles raised, by team and category" right={<Select value={team} options={teams.map((t) => ({ value: t, label: label(t) }))} onChange={setTeam} menuRight />} />
      {items.length ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.slice(0, 9).map((x, i) => (
            <button key={i} onClick={() => open.meeting(x.meetingId)} className="rounded-lg border border-cx-line bg-cx-raised p-4 text-left hover:border-cx-strong">
              <p className="flex flex-wrap items-center gap-1.5">
                <Chip tone="blue">{CATEGORY_LABEL[x.cat] ?? x.cat}</Chip>
                <Chip tone={x.urgency === "High" ? "red" : x.urgency === "Medium" ? "amber" : "gray"}>{x.urgency}</Chip>
              </p>
              <p className="mt-2 text-[13px] leading-[1.45] text-cx-text">{x.title}</p>
              <p className="mt-1 line-clamp-2 text-[12px] leading-[1.5] text-cx-muted">{x.description}</p>
              <p className="mt-2 text-[11.5px] text-cx-faint">
                {MEETINGS[x.meetingId]?.name ?? x.meetingId} · {Math.round(x.confidence * 100)}% confidence
              </p>
            </button>
          ))}
        </div>
      ) : (
        <Empty>No insights for {label(team)}.</Empty>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Field Operations Health — one cell per entity at the selected level
// ---------------------------------------------------------------------------

const LEVELS = [
  { key: "2", label: "Level 2 · Regions" },
  { key: "3", label: "Level 3 · Territories" },
  { key: "4", label: "Level 4 · Sales Officers" },
];
const BANDS = ["critical", "attention", "moderate", "healthy"] as const;

function FieldOpsHealth() {
  const regions = ENTITIES.filter((e) => e.level === 2);
  const [level, setLevel] = useState<2 | 3 | 4>(2);
  const [scope, setScope] = useState("all");
  const [show, setShow] = useState("All");
  const [grid, setGrid] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const inScope = ENTITIES.filter((e) => e.level === level && (scope === "all" || (level === 2 ? e.id === scope : e.parent === scope)));
  const cells = inScope.filter((e) => show === "All" || BAND[e.band].label === show).sort((a, b) => (a.score ?? 999) - (b.score ?? 999));
  const scored = inScope.filter((e) => e.score != null);
  const avg = scored.length ? Math.round(scored.reduce((s, e) => s + e.score!, 0) / scored.length) : null;
  const drill = (e: Entity) => {
    if (e.level === 4) return;
    setScope(e.level === 2 ? e.id : e.parent!);
    setLevel(e.level === 2 ? 3 : 4);
  };
  const viewing = scope === "all" ? `Area Sales Manager · ${STATE}` : regions.find((r) => r.id === scope)?.name;
  const visible = expanded ? cells : cells.slice(0, 9);
  const toggle = (on: boolean) => `px-2.5 py-1.5 ${on ? "bg-cx-hover text-cx-text" : "text-cx-faint hover:text-cx-text"}`;
  return (
    <section className={`${card} p-5`}>
      <CardHead
        title="Field Operations Health"
        sub="One cell = one entity at the selected level. Color = current status. Hover for full hierarchy and details."
        right={
          <>
            <button onClick={() => setExpanded((x) => !x)} className={`${btn} disabled:opacity-40`} disabled={cells.length <= 9}>
              {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />} {expanded ? "Collapse" : "Expand"}
            </button>
            <span className="inline-flex overflow-hidden rounded-md border border-cx-line">
              <button onClick={() => setGrid(false)} aria-label="List view" aria-pressed={!grid} className={toggle(!grid)}>
                <List className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setGrid(true)} aria-label="Grid view" aria-pressed={grid} className={`border-l border-cx-line ${toggle(grid)}`}>
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </span>
          </>
        }
      />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SegTabs tabs={LEVELS} value={String(level)} onChange={(k) => setLevel(Number(k) as 2 | 3 | 4)} size="sm" />
        <Select prefix="Scope" value={scope} options={[{ value: "all", label: STATE }, ...regions.map((r) => ({ value: r.id, label: r.name }))]} onChange={setScope} />
        <Select prefix="Show" value={show} options={["All", ...BANDS.map((b) => BAND[b].label)]} onChange={setShow} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md bg-cx-raised px-3 py-2 text-[12px] text-cx-faint">
        <span>
          You are viewing <span className="text-cx-text">{viewing}</span>
        </span>
        <span className="flex flex-wrap gap-1.5">
          {BANDS.map((b) => (
            <Chip key={b} tone={BAND[b].tone}>
              {inScope.filter((e) => e.band === b).length} {BAND[b].label}
            </Chip>
          ))}
        </span>
      </div>
      <div className="mt-4 flex gap-8">
        <div>
          <p className="font-data text-[24px] text-cx-text">{avg ?? "—"}</p>
          <p className="flex items-center gap-1 text-[12px] text-cx-faint">
            Avg Capability Building <Info className="h-3 w-3" aria-label="Weighted on the Capability Building criteria, from the workbook" />
          </p>
        </div>
        <div className="border-l border-cx-line pl-8">
          <p className="font-data text-[24px] text-cx-faint">—</p>
          <p className="flex items-center gap-1 text-[12px] text-cx-faint" title="Hygiene needs meeting attendance and punctuality, which the workbook doesn't record">
            Avg Hygiene <Info className="h-3 w-3" />
          </p>
        </div>
      </div>
      <div className="mt-4">
        {!cells.length ? (
          <Empty>No entities match this filter.</Empty>
        ) : grid ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((e) => (
              <EntityCell key={e.id} e={e} onDrill={() => drill(e)} />
            ))}
          </div>
        ) : (
          <EntityTable rows={visible} onDrill={drill} />
        )}
        {!expanded && cells.length > 9 && (
          <button onClick={() => setExpanded(true)} className="mt-3 text-[12.5px] text-[#4f86f7] hover:underline">
            Show all {cells.length}
          </button>
        )}
        <div className="mt-4">
          <Legend items={BANDS.slice().reverse().map((b) => ({ label: `${BAND[b].label} (${BAND[b].range})`, color: BAND[b].color }))} />
        </div>
      </div>
    </section>
  );
}

const overall = (e: Entity) => (e.band === "attention" ? "Needs Attention" : BAND[e.band].label);
const parentName = (e: Entity) => ENTITIES.find((x) => x.id === e.parent)?.name;

function EntityCell({ e, onDrill }: { e: Entity; onDrill: () => void }) {
  const c = BAND[e.band].color;
  return (
    <div className="group relative rounded-lg border p-4" style={{ background: `${c}12`, borderColor: `${c}55` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] text-cx-text">{e.name}</p>
          <p className="mt-0.5 text-[11.5px] text-cx-faint">
            {e.meetings} meetings · Overall : {overall(e)}
          </p>
        </div>
        {e.level < 4 && (
          <button onClick={onDrill} aria-label={`Drill into ${e.name}`} className="rounded p-0.5 text-cx-faint hover:bg-cx-hover hover:text-cx-text">
            <ChevronsRight className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mt-2 font-data text-[24px]" style={{ color: c }}>
        {e.score ?? "—"}
      </p>
      {/* hover: the hierarchy and how the score is made */}
      <div className="pointer-events-none absolute left-3 right-3 top-full z-20 mt-1 hidden rounded-lg border border-cx-strong bg-cx-raised p-3 shadow-2xl group-hover:block">
        <p className="text-[11.5px] text-cx-faint">
          {STATE}
          {parentName(e) ? ` › ${parentName(e)}` : ""} › <span className="text-cx-text">{e.name}</span>
        </p>
        <p className="mt-1 text-[11.5px] text-cx-faint">{e.retailers} retailers</p>
        <div className="mt-2 space-y-1">
          {CB_CRITERIA.map((cr) => (
            <p key={cr.name} className="flex justify-between gap-3 text-[11.5px]">
              <span className="text-cx-muted">
                {cr.name} <span className="text-cx-faint">{cr.weight}%</span>
              </span>
              <span className="font-data text-cx-text">{e.parts[cr.name] ?? "—"}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function EntityTable({ rows, onDrill }: { rows: Entity[]; onDrill: (e: Entity) => void }) {
  const th = "px-3 py-2.5 text-[11px] font-normal text-cx-faint";
  return (
    <div className="overflow-x-auto rounded-lg border border-cx-line">
      <table className="w-full min-w-[860px] text-left text-[12.5px]">
        <thead className="bg-cx-raised">
          <tr>
            <th className={th}>Entity</th>
            <th className={th}>Retailers</th>
            <th className={th}>Meetings</th>
            {CB_CRITERIA.map((c) => (
              <th key={c.name} className={th} title={c.name}>
                {c.name.replace("Throughput & ", "T&").split(" ").slice(0, 2).join(" ")}
              </th>
            ))}
            <th className={th}>Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} className="border-t border-cx-line">
              <td className="px-3 py-2.5">
                <button onClick={() => onDrill(e)} disabled={e.level === 4} className="text-left text-cx-text enabled:hover:text-[#4f86f7]">
                  {e.name}
                </button>
                {parentName(e) && <p className="text-[11.5px] text-cx-faint">{parentName(e)}</p>}
              </td>
              <td className="px-3 py-2.5 font-data text-cx-muted">{e.retailers}</td>
              <td className="px-3 py-2.5 font-data text-cx-muted">{e.meetings}</td>
              {CB_CRITERIA.map((c) => (
                <td key={c.name} className="px-3 py-2.5 font-data text-cx-muted">
                  {e.parts[c.name] ?? "—"}
                </td>
              ))}
              <td className="px-3 py-2.5">
                <Chip tone={BAND[e.band].tone}>{e.score ?? "—"}</Chip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Performance Metrics — Capability Building per day
// ---------------------------------------------------------------------------

const SERIES_PICK = [
  { value: "all", label: "All meetings" },
  { value: "ser-morning", label: "Morning huddle" },
  { value: "ser-evening", label: "Evening huddle" },
  { value: "adhoc", label: "Ad-hoc calls" },
];

function PerformanceMetrics({ shown }: { shown: Meeting[] }) {
  const [pick, setPick] = useState("all");
  const ms = shown.filter((m) => pick === "all" || (pick === "adhoc" ? m.kind === "Ad-hoc" : m.seriesId === pick));
  const days = Array.from(new Set(shown.map((m) => m.date))).sort();
  const values = days.map((d) => {
    if (pick === "all") return TREND.find((t) => t.date === d)?.capability ?? null;
    const xs = ms.filter((m) => m.date === d);
    return xs.length ? xs.reduce((s, m) => s + m.score, 0) / xs.length : null;
  });
  return (
    <section className={`${card} p-5`}>
      <CardHead
        title="Performance Metrics"
        sub="Capability Building trend per meeting day"
        right={
          <>
            <Select prefix="Meetings" value={pick} options={SERIES_PICK} onChange={setPick} menuRight />
            {days.length > 0 && (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-cx-line px-2.5 text-[12px] text-cx-muted">
                <CalendarDays className="h-3.5 w-3.5 text-cx-faint" /> {shortDay(days[0])} – {shortDay(days[days.length - 1])}
              </span>
            )}
          </>
        }
      />
      <div className="mt-4">{days.length ? <LineChart x={days.map(shortDay)} lines={[{ label: "Capability Building Score", color: "#a78bfa", values }]} yLabel="Performance Score (%)" /> : <Empty>No meetings in this period.</Empty>}</div>
      <div className="mt-2">
        <Legend items={[{ label: "Capability Building Score", color: "#a78bfa" }]} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Business Dimensions + Performance Analytics
// ---------------------------------------------------------------------------

function BusinessDimensions({ shown }: { shown: Meeting[] }) {
  const live = useLiveAction();
  // a dimension is picked from the start: with none, every meeting matches and talk time reads 100%
  const [seg, setSeg] = useState(SEGMENTS[0] ?? "all");
  const [prod, setProd] = useState("all");
  const hit = shown.filter((m) => (seg === "all" || m.segments.includes(seg)) && (prod === "all" || m.products.includes(prod)));
  const lines = (ms: Meeting[]) => ms.reduce((s, m) => s + m.transcript.length, 0);
  const talk = lines(shown) ? (lines(hit) / lines(shown)) * 100 : 0;
  const avgMin = hit.length ? hit.reduce((s, m) => s + m.duration, 0) / hit.length : 0;
  const acts = hit.flatMap((m) => m.actions.map(live));
  const aligned = acts.length ? (acts.filter((a) => a.assignee || a.status !== "pending").length / acts.length) * 100 : 0;
  const tile = "rounded-lg border border-cx-line bg-cx-raised p-4";
  const icon = "flex h-8 w-8 items-center justify-center rounded-lg border border-cx-line bg-cx-panel text-cx-muted";
  return (
    <div>
      <CardHead
        title="Business Dimensions"
        sub="Track discussion coverage across key business dimensions."
        right={
          <>
            <Select icon={<Tag className="h-3.5 w-3.5 text-cx-faint" />} value={seg} label={seg === "all" ? "Business Segment" : undefined} options={[{ value: "all", label: "All segments" }, ...SEGMENTS]} onChange={setSeg} menuRight />
            <Select icon={<Package className="h-3.5 w-3.5 text-cx-faint" />} value={prod} label={prod === "all" ? "Product" : undefined} options={[{ value: "all", label: "All products" }, ...PRODUCTS]} onChange={setProd} menuRight />
          </>
        }
      />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className={tile}>
          <span className={icon}>
            <CircleCheck className="h-4 w-4" />
          </span>
          <p className="mt-3 text-[12.5px] text-cx-muted">Capability Building</p>
          <p className="mt-0.5 text-[12px] text-cx-faint">
            <span className="font-data text-[14px] text-cx-text">{talk.toFixed(1)}%</span> Talk Time | <span className="font-data text-[14px] text-cx-text">{avgMin.toFixed(1)} min</span> Avg Time
          </p>
        </div>
        <div className={tile}>
          <span className={icon}>
            <Target className="h-4 w-4" />
          </span>
          <p className="mt-3 text-[12.5px] text-cx-muted">Execution Alignment</p>
          <p className="mt-0.5 font-data text-[14px] text-cx-text" title="Share of these meetings' actions that have been assigned or moved">
            {aligned.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}

function PerformanceAnalytics({ shown }: { shown: Meeting[] }) {
  const go = useCortexNav();
  const live = useLiveAction();
  const sales = shown.flatMap((m) => m.actions.filter((a) => m.functions[a.id] === "Sales").map(live));
  const closed = sales.filter((a) => a.status === "completed").length;
  const avg = shown.length ? Math.round(shown.reduce((s, m) => s + m.score, 0) / shown.length) : 0;
  const cards: { icon: React.ElementType; head: string; title: string; body: string; on?: () => void; info?: string }[] = [
    { icon: CalendarDays, head: String(shown.length), title: "Overall Meetings", body: "View meeting performance and participation trends.", on: () => go("huddle-meetings") },
    { icon: ChartColumn, head: `${sales.length - closed} open | ${closed} closed`, title: "Overall Sales Action Items", body: "View detailed analytics and performance trends.", on: () => go("tracker") },
    { icon: ShieldCheck, head: "Not tracked", title: "Hygiene Score", body: "Monitor participation, punctuality, and engagement.", info: "The workbook has no meeting attendance or punctuality, so hygiene can't be scored." },
    { icon: Star, head: `${avg}% average score`, title: "Overall Capability Building", body: "Assess meeting quality, coaching effectiveness, and team capability development.", on: () => go("huddle-meetings") },
  ];
  return (
    <div>
      <CardHead title="Performance Analytics" sub="Navigate to detailed reports for meetings, tasks, hygiene, and capability building performance." />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.title} className="flex flex-col overflow-hidden rounded-lg border border-cx-line bg-cx-raised">
            <div className="flex-1 p-4">
              <p className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2.5 font-data text-[13px] text-cx-text">
                  <c.icon className="h-4 w-4 text-[#4f86f7]" /> {c.head}
                </span>
                {c.info && <Info className="h-3.5 w-3.5 text-cx-faint" aria-label={c.info} />}
              </p>
              <p className="mt-3 text-[13px] text-cx-text">{c.title}</p>
              <p className="mt-1 text-[12px] leading-[1.5] text-cx-faint">{c.body}</p>
            </div>
            <div className="flex justify-end border-t border-cx-line px-4 py-2.5">
              <button onClick={c.on} disabled={!c.on} title={c.info} className={`${btn} disabled:opacity-40`}>
                Open Analytics <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action Execution Overview — by business function
// ---------------------------------------------------------------------------

function ActionExecution({ shown }: { shown: Meeting[] }) {
  const live = useLiveAction();
  const [fn, setFn] = useState("All");
  const acts = shown.flatMap((m) => m.actions.filter((a) => fn === "All" || m.functions[a.id] === fn).map(live));
  const n = (b: ReturnType<typeof bucketOf>) => acts.filter((a) => bucketOf(a) === b).length;
  const stats = [
    { v: acts.length, l: "Total Actions" },
    { v: n("unassigned"), l: "Pending – Unassigned" },
    { v: n("assigned"), l: "Pending – Assigned" },
    { v: n("progress"), l: "In Progress" },
    { v: n("completed"), l: "Completed" },
  ];
  return (
    <section className={`${card} p-5`}>
      <CardHead title="Action Execution Overview" sub="Track action volume, ownership, and execution progress across business functions." />
      <div className="mt-4">
        <SegTabs tabs={["All", ...FUNCTIONS].map((f) => ({ key: f, label: f }))} value={fn} onChange={setFn} size="sm" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.l} className="rounded-lg border border-cx-line bg-cx-raised p-4">
            <p className="font-data text-[20px] text-[#4f86f7]">{s.v}</p>
            <p className="mt-1 text-[12px] text-cx-muted">{s.l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Product Discussion Coverage
// ---------------------------------------------------------------------------

const coverColor = (p: number) => (p >= 80 ? "#2f6fed" : p >= 50 ? "#4f86f7" : p >= 25 ? "#84adff" : "#4f86f755");

function ProductCoverage({ shown }: { shown: Meeting[] }) {
  const rows = [...PRODUCTS.map((p) => ({ name: p, n: shown.filter((m) => m.products.includes(p)).length })), { name: "Others", n: shown.filter((m) => !m.products.length).length }]
    .map((r) => ({ ...r, pct: shown.length ? Math.round((r.n / shown.length) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct);
  const grid = "grid grid-cols-[150px_1fr_90px_110px] items-center gap-2";
  return (
    <section className={`${card} p-5`}>
      <CardHead title="Product Discussion Coverage" sub="Meetings in which each product category was discussed, and its coverage across the meetings shown. One meeting can cover several products." />
      <div className="mt-4 overflow-hidden rounded-lg border border-cx-line">
        <div className={`${grid} bg-cx-raised px-3 py-2 text-[11px] text-cx-faint`}>
          <span>Product category — by coverage</span>
          <span />
          <span>% of meetings</span>
          <span>No. of meetings</span>
        </div>
        {rows.map((r) => (
          <div key={r.name} className={`${grid} border-t border-cx-line px-3 py-2.5 text-[12.5px]`}>
            <span className="text-cx-text">{r.name}</span>
            <span className="mr-4 h-2.5 overflow-hidden rounded bg-cx-hover">
              <span className="block h-full rounded" style={{ width: `${Math.max(r.pct, 1)}%`, background: coverColor(r.pct) }} />
            </span>
            <span className="font-data text-cx-muted">{r.pct}%</span>
            <span className="text-cx-muted">
              {r.n} meeting{r.n === 1 ? "" : "s"}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Legend
          items={[
            { label: "High Coverage (≥ 80%)", color: coverColor(80) },
            { label: "Moderate Coverage (50–79%)", color: coverColor(50) },
            { label: "Low Coverage (25–49%)", color: coverColor(25) },
            { label: "Very Low Coverage (< 25%)", color: coverColor(0) },
          ]}
        />
      </div>
    </section>
  );
}
