"use client";

// Meeting Repository — every huddle series and ad-hoc call: search, scope, period, business segment and product
// filters; a table (or cards) of series with type, time zone, meeting count, date range and average Capability
// Building (ACB); a row expands to its meetings.

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Eye, Info, LayoutGrid, List, Package, RotateCcw, Tag } from "lucide-react";
import { HUDDLE_LABELS, Meeting, PRODUCTS, SEGMENTS, SERIES, Series, TIME_RANGES, inRange, meetingsOf } from "@/data/huddle";
import { AgentPageHeader } from "../agentPage";
import { Chip, Empty, HuddlePage, ScoreBadge, Search, Select, body, card, dateRange, day, useOpen, useTimeRange } from "./parts";

export function MeetingRepositoryPage() {
  return (
    <HuddlePage current="repository">
      <Repository />
    </HuddlePage>
  );
}

const avgScore = (ms: Meeting[]) => (ms.length ? Math.round(ms.reduce((s, m) => s + m.score, 0) / ms.length) : 0);
const typeChip = (s: Series) => (s.kind === "Recurring" ? <Chip tone="blue">{s.type}</Chip> : <Chip tone="green">Ad-hoc</Chip>);

function Tags({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {items.map((p) => (
        <Chip key={p} tone="blue" className="h-[20px] text-[11px]">
          <Tag className="h-2.5 w-2.5" /> {p}
        </Chip>
      ))}
    </span>
  );
}

const TH = "px-3 py-2.5 text-[11px] font-normal text-cx-faint";
const eye = "rounded-md p-1 text-cx-faint hover:bg-cx-hover hover:text-cx-text";

function Repository() {
  const open = useOpen();
  const range = useTimeRange();
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState("all");
  const [prod, setProd] = useState("all");
  const [grid, setGrid] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return SERIES.map((s) => {
      const ms = meetingsOf(s)
        .filter((m) => inRange(m, range.days))
        .filter((m) => (seg === "all" || m.segments.includes(seg)) && (prod === "all" || m.products.includes(prod)))
        .filter((m) => !needle || `${s.name} ${m.name} ${m.id} ${m.topics.join(" ")} ${m.department}`.toLowerCase().includes(needle))
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
      return { s, ms };
    })
      .filter((r) => r.ms.length)
      .sort((a, b) => (b.ms[0].date + b.ms[0].time).localeCompare(a.ms[0].date + a.ms[0].time));
  }, [q, range.days, seg, prod]);

  const reset = () => (setQ(""), setSeg("all"), setProd("all"), range.set(TIME_RANGES[0].label));
  const toggle = (on: boolean) => `px-2.5 py-1.5 ${on ? "bg-cx-hover text-cx-text" : "text-cx-faint hover:text-cx-text"}`;

  return (
    <>
      <AgentPageHeader
        agent="huddle"
        title="Meeting Repository"
        meta={<>Every huddle and cross-functional call for {HUDDLE_LABELS.region} · from the workbook's Huddle sheet</>}
        right={
          <span className="inline-flex overflow-hidden rounded-md border border-cx-line">
            <button onClick={() => setGrid(false)} aria-label="List view" aria-pressed={!grid} className={toggle(!grid)}>
              <List className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setGrid(true)} aria-label="Grid view" aria-pressed={grid} className={`border-l border-cx-line ${toggle(grid)}`}>
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </span>
        }
      />
      <div className={body}>
        <div className="flex flex-wrap items-center gap-2">
          <Search value={q} onChange={setQ} placeholder="Search meetings..." className="w-full sm:w-[260px]" />
          <Select prefix="Scope" value={HUDDLE_LABELS.region} options={[HUDDLE_LABELS.region]} onChange={() => {}} />
          <Select prefix="Period" value={range.label} options={TIME_RANGES.map((r) => r.label)} onChange={range.set} />
          <Select icon={<Tag className="h-3.5 w-3.5 text-cx-faint" />} value={seg} label={seg === "all" ? "Business Segment" : undefined} options={[{ value: "all", label: "All segments" }, ...SEGMENTS]} onChange={setSeg} />
          <Select icon={<Package className="h-3.5 w-3.5 text-cx-faint" />} value={prod} label={prod === "all" ? "Product" : undefined} options={[{ value: "all", label: "All products" }, ...PRODUCTS]} onChange={setProd} />
          <button onClick={reset} className="ml-auto inline-flex items-center gap-1.5 px-2 text-[12.5px] text-cx-muted hover:text-cx-text">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>

        {!rows.length ? (
          <div className={card}>
            <Empty>No meetings match these filters.</Empty>
          </div>
        ) : grid ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map(({ s, ms }) => (
              <button key={s.id} onClick={() => open.series(s.id)} className={`${card} p-4 text-left hover:border-cx-strong`}>
                <p className="flex items-start justify-between gap-2">
                  <span className="text-[13px] text-cx-text">{s.name}</span>
                  {typeChip(s)}
                </p>
                <Tags items={Array.from(new Set(ms.flatMap((m) => m.products)))} />
                <p className="mt-3 text-[12px] text-cx-muted">
                  {ms.length} meeting{ms.length === 1 ? "" : "s"} · {dateRange(ms.map((m) => m.date))}
                </p>
                <p className="mt-3 flex items-center justify-between text-[12px] text-cx-faint">
                  <span className="inline-flex items-center gap-1.5">
                    ACB <ScoreBadge score={avgScore(ms)} />
                  </span>
                  <span>Updated {day(ms[0].date)}</span>
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className={`${card} overflow-x-auto`}>
            <table className="w-full min-w-[1000px] text-left text-[12.5px]">
              <thead className="border-b border-cx-line">
                <tr>
                  <th className="w-10" />
                  <th className={TH}>Meeting</th>
                  <th className={TH}>Meeting Type</th>
                  <th className={TH}>Time Zone</th>
                  <th className={TH}>No. of Meetings</th>
                  <th className={TH}>Date Range</th>
                  <th className={TH}>
                    <span className="inline-flex items-center gap-1" title="Average Capability Building of the meetings shown">
                      ACB <Info className="h-3 w-3" />
                    </span>
                  </th>
                  <th className={TH}>Last Updated</th>
                  <th className={`${TH} pr-4 text-right`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ s, ms }) => {
                  const expanded = openRow === s.id;
                  return (
                    <React.Fragment key={s.id}>
                      <tr className="border-b border-cx-line last:border-b-0 hover:bg-cx-hover/40">
                        <td className="py-3 text-center align-top">
                          <button onClick={() => setOpenRow(expanded ? null : s.id)} aria-label={expanded ? "Collapse" : "Expand"} aria-expanded={expanded} className={eye}>
                            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <button onClick={() => open.series(s.id)} className="text-left text-cx-text hover:text-[#4f86f7]">
                            {s.name}
                          </button>
                          <Tags items={Array.from(new Set(ms.flatMap((m) => m.products)))} />
                        </td>
                        <td className="px-3 py-3 align-top">{typeChip(s)}</td>
                        <td className="px-3 py-3 align-top text-cx-muted">IST</td>
                        <td className="px-3 py-3 align-top font-data text-cx-muted">{ms.length}</td>
                        <td className="px-3 py-3 align-top text-cx-muted">{dateRange(ms.map((m) => m.date))}</td>
                        <td className="px-3 py-3 align-top">
                          <ScoreBadge score={avgScore(ms)} />
                        </td>
                        <td className="px-3 py-3 align-top text-cx-muted">
                          {day(ms[0].date)}
                          <p className="font-data text-[11.5px] text-cx-faint">{ms[0].time}</p>
                        </td>
                        <td className="px-3 py-3 pr-4 text-right align-top">
                          <button onClick={() => open.series(s.id)} aria-label={`Open ${s.name}`} className={eye}>
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                      {expanded &&
                        ms.map((m) => (
                          <tr key={m.id} className="border-b border-cx-line bg-cx-raised/50">
                            <td />
                            <td className="px-3 py-3 pl-6 align-top" colSpan={4}>
                              <button onClick={() => open.meeting(m.id)} className="text-left text-cx-text hover:text-[#4f86f7]">
                                {m.name}
                              </button>
                              <p className="mt-0.5 text-[11.5px] text-cx-faint">{m.duration} min</p>
                              <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-cx-muted" title="Processed from the workbook's huddle notes">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#2fa85c]" /> Fully Processed
                              </p>
                              <Tags items={[...m.products, ...m.segments]} />
                            </td>
                            <td className="px-3 py-3 align-middle text-cx-muted">{day(m.date)}</td>
                            <td className="px-3 py-3 align-middle">
                              <ScoreBadge score={m.score} />
                            </td>
                            <td />
                            <td className="px-3 py-3 pr-4 text-right align-middle">
                              <button onClick={() => open.meeting(m.id)} aria-label={`Open ${m.name}`} className={eye}>
                                <Eye className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
