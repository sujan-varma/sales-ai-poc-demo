"use client";

// One meeting series (a daily huddle, or an ad-hoc call): Overview & Analytics, Attendance, Meetings, Overall Action
// Items and Total Blockers, with the month calendar and the next meeting's prep pack alongside.

import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronDown, Clock, Flag, Globe, Info, RefreshCw } from "lucide-react";
import { Meeting, SERIES, Series, isOverdue, meetingsOf } from "@/data/huddle";
import { AgentPageHeader } from "../agentPage";
import { useHome } from "../HomeState";
import { ActionTabs, BlockerPanel, repeatedIds, useBlockers } from "./blocks";
import {
  AiInferred,
  Avatar,
  BarChart,
  Chip,
  ConfidenceChip,
  Empty,
  HuddlePage,
  Legend,
  LineChart,
  MonthCalendar,
  Pager,
  Search,
  SegTabs,
  UpcomingCard,
  body,
  btn,
  card,
  day,
  linkBlue,
  longDate,
  readOpen,
  shortDay,
  useFlags,
  useLiveAction,
  useOpen,
} from "./parts";

export function SeriesPage() {
  const [s, setS] = useState<Series | null>(null);
  const [tab, setTab] = useState("overview");
  useEffect(() => {
    const o = readOpen("series");
    setS(SERIES.find((x) => x.id === o.id) ?? SERIES[0]);
    if (o.tab) setTab(o.tab);
  }, []);
  return <HuddlePage current="repository">{s && <SeriesView s={s} tab={tab} setTab={setTab} />}</HuddlePage>;
}

function SeriesView({ s, tab, setTab }: { s: Series; tab: string; setTab: (t: string) => void }) {
  const { toast } = useHome();
  const flags = useFlags();
  const live = useLiveAction();
  const ms = useMemo(() => meetingsOf(s).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)), [s]);
  const blockers = useBlockers(ms);
  const actions = ms.flatMap((m) => m.actions.map(live));
  const confident = ms.filter((m) => m.confidence === "High").length * 2 >= ms.length;
  const flagged = flags.has(s.id);
  const tabs = [
    { key: "overview", label: "Overview & Analytics" },
    { key: "attendance", label: "Attendance" },
    { key: "meetings", label: "Meetings", count: ms.length },
    { key: "tasks", label: "Overall Action Items", count: actions.length },
    { key: "blockers", label: "Total Blockers", count: blockers.length },
  ];
  return (
    <>
      <AgentPageHeader
        agent="huddle"
        title={s.name}
        back={{ label: "Meeting Repository", page: "huddle-meetings" }}
        crumb={s.name}
        meta={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={s.organiser} size={18} /> {s.organiser} · ASM
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {s.duration} minutes{s.kind === "Recurring" ? ` · daily at ${s.time}` : ""}
            </span>
            <span className="inline-flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" /> Region · {s.zone}
            </span>
            <span className="inline-flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" /> Last updated {day(ms[0].date)} at {ms[0].time}
            </span>
            <AiInferred />
            <ConfidenceChip level={confident ? "High" : "Medium"} />
          </span>
        }
        right={
          <button onClick={() => (flags.toggle(s.id), toast(flagged ? "Series unflagged." : "Series flagged for review."))} aria-pressed={flagged} className={btn}>
            <Flag className="h-3.5 w-3.5" style={flagged ? { color: "#e85a70", fill: "#e85a70" } : undefined} /> {flagged ? "Flagged" : "Flag this series"}
          </button>
        }
      >
        <div className="mt-5">
          <SegTabs tabs={tabs} value={tab} onChange={setTab} />
        </div>
      </AgentPageHeader>
      <div className={body}>
        {tab === "overview" ? (
          <Overview s={s} ms={ms} onTab={setTab} />
        ) : (
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_296px]">
            <div className="min-w-0">
              {tab === "attendance" && <Attendance s={s} ms={ms} />}
              {tab === "meetings" && <Meetings ms={ms} />}
              {tab === "tasks" && <ActionTabs ms={ms} withFilters />}
              {tab === "blockers" && <BlockerPanel items={blockers} showMeeting />}
            </div>
            <SideRail s={s} ms={ms} />
          </div>
        )}
      </div>
    </>
  );
}

function SideRail({ s, ms }: { s: Series; ms: Meeting[] }) {
  const open = useOpen();
  return (
    <div className="space-y-5">
      <MonthCalendar marked={ms.map((m) => m.date)} onPick={(d) => open.meeting(ms.find((m) => m.date === d)!.id)} />
      <UpcomingCard series={s} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview & Analytics
// ---------------------------------------------------------------------------

const TH = "px-4 py-2.5 text-[11px] font-normal text-cx-faint";

function Overview({ s, ms, onTab }: { s: Series; ms: Meeting[]; onTab: (t: string) => void }) {
  const live = useLiveAction();
  const open = useOpen();
  const blockers = useBlockers(ms);
  const actions = ms.flatMap((m) => m.actions.map(live));
  const overdue = actions.filter(isOverdue).length;
  const avg = Math.round(ms.reduce((t, m) => t + m.score, 0) / ms.length);
  const closed = actions.filter((a) => a.status === "completed").length;
  const asc = [...ms].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const rep = repeatedIds(ms);
  const repBlock = (m: Meeting) => m.blockers.filter((b) => rep.has(m.actions.find((a) => a.theme === b.theme)?.id ?? "")).length;
  const labels = asc.map((m) => shortDay(m.date));
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(5);
  const pages = Math.max(1, Math.ceil(ms.length / per));
  const kpis = [
    { v: `${avg}/100`, l: "Series Capability Building" },
    { v: ms.length, l: "Total Meetings", tab: "meetings" },
    { v: overdue, l: "Overdue tasks detected", tab: "tasks" },
    { v: blockers.filter((b) => !b.b.resolved).length, l: "Blockers", tab: "blockers" },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.l} className={`${card} p-4`}>
            <p className="font-data text-[22px] text-cx-text">{k.v}</p>
            <p className="mt-1 flex items-center justify-between gap-2 text-[12.5px] text-cx-muted">
              {k.l}
              {k.tab && (
                <button onClick={() => onTab(k.tab!)} className={linkBlue}>
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_296px]">
        <div className={card}>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-cx-line p-4">
            <div>
              <h2 className="flex flex-wrap items-center gap-2 text-[15px] font-medium text-cx-text">
                Blocker & Action Flow <Chip>Task Closure Rate : {actions.length ? Math.round((closed / actions.length) * 100) : 0}%</Chip>
              </h2>
              <p className="mt-0.5 text-[12.5px] text-cx-faint">Tracks new blockers against action items closed per meeting</p>
            </div>
            <span className="inline-flex h-8 items-center rounded-lg border border-cx-line px-2.5 text-[12px] text-cx-muted">
              {shortDay(asc[0].date)} – {day(asc[asc.length - 1].date)}
            </span>
          </div>
          <div className="p-4">
            <div className="flex justify-end">
              <Legend
                items={[
                  { label: "New Blockers", color: "#7c7f89" },
                  { label: "Repeated Blockers", color: "#e0b43a" },
                  { label: "Actions Closed", color: "#4f86f7" },
                ]}
              />
            </div>
            <BarChart
              x={labels}
              bars={[
                { label: "New Blockers", color: "#7c7f89", values: asc.map((m) => m.blockers.length - repBlock(m)) },
                { label: "Repeated Blockers", color: "#e0b43a", values: asc.map(repBlock) },
                { label: "Actions Closed", color: "#4f86f7", values: asc.map((m) => m.actions.map(live).filter((a) => a.status === "completed").length) },
              ]}
            />
          </div>
        </div>
        <MonthCalendar marked={ms.map((m) => m.date)} onPick={(d) => open.meeting(ms.find((m) => m.date === d)!.id)} />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_296px]">
        <div className={card}>
          <div className="border-b border-cx-line p-4">
            <h2 className="text-[15px] font-medium text-cx-text">Execution Health Over Time</h2>
            <p className="mt-0.5 text-[12.5px] text-cx-faint">Capability Building per meeting</p>
          </div>
          <div className="p-4">
            <LineChart x={labels} lines={[{ label: "Capability Building", color: "#a78bfa", values: asc.map((m) => m.score) }]} />
            <div className="mt-2 flex justify-center">
              <Legend items={[{ label: "Capability Building", color: "#a78bfa" }]} />
            </div>
          </div>
        </div>
        <UpcomingCard series={s} />
      </div>

      <div className={card}>
        <div className="p-4">
          <h2 className="text-[15px] font-medium text-cx-text">Recent Meetings Snapshot</h2>
          <p className="mt-0.5 text-[12.5px] text-cx-faint">Open actions across recent meetings</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[12.5px]">
            <thead className="border-y border-cx-line">
              <tr>
                <th className={TH}>Meeting</th>
                <th className={TH}>Date & Time</th>
                <th className={TH}>Attendees</th>
                <th className={TH}>Tasks</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {ms.slice((page - 1) * per, page * per).map((m) => {
                const openN = m.actions.map(live).filter((a) => a.status !== "completed").length;
                return (
                  <tr key={m.id} className="border-b border-cx-line last:border-b-0">
                    <td className="px-4 py-3">
                      <p className="text-cx-text">
                        Meeting ID <span className="font-data">{m.id}</span>
                      </p>
                      <p className="flex items-center gap-1 text-[11.5px] text-cx-faint">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#2fa85c]" /> Fully processed
                      </p>
                    </td>
                    <td className="px-4 py-3 text-cx-muted">
                      {day(m.date)}
                      <p className="font-data text-[11.5px] text-cx-faint">{m.time}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex -space-x-1.5">
                        {m.attendees.slice(0, 5).map((a) => (
                          <Avatar key={a.name} name={a.name} size={24} />
                        ))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-cx-muted">
                      {openN} open action{openN === 1 ? "" : "s"}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => open.meeting(m.id)} className={linkBlue}>
                        View details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pager page={page} pages={pages} onPage={(p) => setPage(Math.min(pages, Math.max(1, p)))} perPage={per} onPerPage={(n) => (setPer(n), setPage(1))} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attendance — who came, from each meeting's attendee list
// ---------------------------------------------------------------------------

/** the share of a meeting's remarks a person made, as minutes of its duration */
const speakMin = (m: Meeting, name: string) => (m.transcript.length ? (m.transcript.filter((t) => t.speaker === name).length / m.transcript.length) * m.duration : 0);

function Kpis({ items }: { items: { l: string; v: React.ReactNode; n: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((k) => (
        <div key={k.l} className={`${card} p-4`}>
          <p className="text-[12.5px] text-cx-muted">{k.l}</p>
          <p className="mt-1 font-data text-[20px] text-cx-text">{k.v}</p>
          <span className="mt-2 inline-block">
            <Chip>{k.n}</Chip>
          </span>
        </div>
      ))}
    </div>
  );
}

function Attendance({ s, ms }: { s: Series; ms: Meeting[] }) {
  const expected = s.attendees.length;
  const present = ms.map((m) => m.attendees.length);
  const ratio = ms.length ? present.reduce((a, b) => a + b, 0) / (ms.length * expected) : 0;
  const noShows = ms.length ? ms.reduce((t, m) => t + Math.max(0, expected - m.attendees.length), 0) / ms.length : 0;
  const remarks = ms.length ? ms.reduce((t, m) => t + m.transcript.length / Math.max(1, m.attendees.length), 0) / ms.length : 0;
  const asc = [...ms].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const people = s.attendees.map((name) => {
    const att = asc.filter((m) => m.attendees.some((a) => a.name === name));
    const absent = asc.filter((m) => !m.attendees.some((a) => a.name === name));
    const spoke = att.reduce((t, m) => t + speakMin(m, name), 0);
    const role = asc.flatMap((m) => m.attendees).find((a) => a.name === name)?.role ?? "";
    return { name, role, n: att.length, pct: ms.length ? Math.round((att.length / ms.length) * 100) : 0, speak: att.length && spoke ? spoke / att.length : null, absent, trend: asc.map((m) => m.attendees.some((a) => a.name === name)) };
  });
  const th = "px-3 py-2.5 text-[11px] font-normal text-cx-faint";
  return (
    <div className="space-y-5">
      <Kpis
        items={[
          { l: "Avg Attendance Ratio", v: `${Math.round(ratio * 100)}%`, n: `${(ratio * expected).toFixed(1)}/${expected} avg per meeting` },
          { l: "Avg No-shows", v: noShows.toFixed(noShows % 1 ? 1 : 0), n: "per meeting" },
          { l: "Scheduled Duration", v: `${s.duration} min`, n: "actual time isn't recorded" },
          { l: "Avg Engagement / Person", v: `${remarks.toFixed(1)} remarks`, n: "across all meetings" },
        ]}
      />
      <div className={card}>
        <div className="flex items-center justify-between p-4">
          <h2 className="text-[15px] font-medium text-cx-text">Individual Attendance</h2>
          <span className="text-[12px] text-cx-faint">
            {ms.length} meeting{ms.length === 1 ? "" : "s"} in series
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[12.5px]">
            <thead className="border-y border-cx-line">
              <tr>
                <th className={`${th} pl-4`}>Attendees</th>
                <th className={th}>Attendance</th>
                <th className={th}>Attendance %</th>
                <th className={th}>Avg Speak Duration</th>
                <th className={th}>Absences</th>
                <th className={th}>Last Absent</th>
                <th className={th}>Status</th>
                <th className={th}>Daily Trend</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.name} className="border-b border-cx-line last:border-b-0">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={p.name} size={26} />
                      <span>
                        <span className="block text-cx-text">{p.name}</span>
                        <span className="block text-[11.5px] text-cx-faint">{p.role}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-cx-muted">
                    {p.n}/{ms.length} meetings
                  </td>
                  <td className="px-3 py-3">
                    <Chip tone={p.pct >= 75 ? "green" : "red"}>{p.pct}%</Chip>
                  </td>
                  <td className="px-3 py-3 font-data text-cx-muted">{p.speak != null ? `${p.speak.toFixed(1)} min` : "—"}</td>
                  <td className={`px-3 py-3 font-data ${p.absent.length ? "text-[#e85a70]" : "text-cx-muted"}`}>{p.absent.length}</td>
                  <td className="px-3 py-3 text-cx-muted">{p.absent.length ? day(p.absent[p.absent.length - 1].date) : "—"}</td>
                  <td className="px-3 py-3">
                    <Chip tone={p.pct >= 75 ? "green" : "red"}>{p.pct >= 75 ? "Regular" : "At risk"}</Chip>
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex gap-0.5" title="Present / absent, oldest first">
                      {p.trend.map((x, i) => (
                        <span key={i} className="h-3 w-1.5 rounded-sm" style={{ background: x ? "#2fa85c" : "#e85a70" }} />
                      ))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="flex items-center gap-1.5 border-t border-cx-line px-4 py-2.5 text-[11.5px] text-cx-faint">
          <Info className="h-3.5 w-3.5" /> Speak duration counts named remarks in the huddle notes; most are logged as the field team.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meetings — one card per meeting day
// ---------------------------------------------------------------------------

function Meetings({ ms }: { ms: Meeting[] }) {
  const open = useOpen();
  const flags = useFlags();
  const [q, setQ] = useState("");
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const shown = ms.filter((m) => (!onlyFlagged || flags.has(m.id)) && (!q.trim() || `${m.id} ${m.name} ${m.topics.join(" ")}`.toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Search value={q} onChange={setQ} placeholder="Search by meeting..." className="w-full sm:w-[260px]" />
        <button onClick={() => setOnlyFlagged((f) => !f)} aria-pressed={onlyFlagged} className={`${btn} ${onlyFlagged ? "border-cx-strong text-cx-text" : ""}`}>
          <Flag className="h-3.5 w-3.5" /> Flagged only
        </button>
      </div>
      <div className="mt-3 space-y-3">
        {shown.map((m) => {
          const isOpen = expanded === m.id;
          return (
            <div key={m.id} className={card}>
              <button onClick={() => setExpanded(isOpen ? null : m.id)} aria-expanded={isOpen} className="flex w-full items-start justify-between gap-3 p-4 text-left">
                <span>
                  <span className="block text-[13px] text-cx-text">{longDate(m.date)}</span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px] text-cx-muted">
                    <Chip>
                      Meeting ID <span className="font-data">{m.id}</span>
                    </Chip>
                    <span className="text-cx-faint">•</span>
                    {m.name}
                    <span className="text-cx-faint">•</span>
                    <Chip>
                      <span className="h-1.5 w-1.5 rounded-full bg-[#2fa85c]" /> Fully Processed
                    </Chip>
                    {flags.has(m.id) && <Flag className="h-3.5 w-3.5" style={{ color: "#e85a70", fill: "#e85a70" }} />}
                  </span>
                </span>
                <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-cx-faint transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="border-t border-cx-line p-4">
                  <p className="text-[12.5px] leading-[1.6] text-cx-muted">{m.summary}</p>
                  <p className="mt-2 text-[12px] text-cx-faint">
                    {m.time} · {m.duration} min · {m.attendees.length} attendees · {m.actions.length} actions · {m.blockers.length} blockers · Capability Building {m.score}/100
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => open.meeting(m.id)} className={btn}>
                      View insights <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => flags.toggle(m.id)} className={btn}>
                      <Flag className="h-3.5 w-3.5" /> {flags.has(m.id) ? "Unflag" : "Flag"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!shown.length && (
          <div className={card}>
            <Empty>{onlyFlagged ? "No flagged meetings." : "No meetings match your search."}</Empty>
          </div>
        )}
      </div>
    </div>
  );
}
