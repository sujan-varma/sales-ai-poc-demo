"use client";

// One meeting: Summary (overview, outline, sentiment, action snapshots, unassigned actions, strategic insights,
// signals), Attendance, Transcript, Blockers and the Capability Building score breakdown.

import React, { useEffect, useState } from "react";
import { CalendarDays, Clock, Download, Flag, Info, List, MapPin, Share2, WandSparkles } from "lucide-react";
import { INSIGHTS, MEETINGS, Meeting, allMeetings, seriesOf } from "@/data/huddle";
import { AgentPageHeader } from "../agentPage";
import { useHome } from "../HomeState";
import { BlockerPanel, useBlockers } from "./blocks";
import { ActionRow, AiInferred, Avatar, Chip, ConfidenceChip, Empty, HuddlePage, SegTabs, body, btn, card, day, readOpen, useAssign, useFlags, useLiveAction, useOpen } from "./parts";

export function MeetingPage() {
  const [m, setM] = useState<Meeting | null>(null);
  const [tab, setTab] = useState("summary");
  useEffect(() => {
    const o = readOpen("meeting");
    setM((o.id && MEETINGS[o.id]) || allMeetings()[0]);
    if (o.tab) setTab(o.tab);
  }, []);
  return <HuddlePage current="repository">{m && <MeetingView m={m} tab={tab} setTab={setTab} />}</HuddlePage>;
}

function MeetingView({ m, tab, setTab }: { m: Meeting; tab: string; setTab: (t: string) => void }) {
  const { toast } = useHome();
  const open = useOpen();
  const flags = useFlags();
  const blockers = useBlockers([m]);
  const s = seriesOf(m.seriesId);
  const share = () => {
    const url = `${location.origin}${location.pathname}?id=${encodeURIComponent(m.id)}`;
    navigator.clipboard?.writeText(url).then(
      () => toast("Link to this meeting copied."),
      () => toast(url),
    );
  };
  const download = () => {
    const text = [
      `${m.name} (${m.id})`,
      `${day(m.date)} ${m.time} · ${m.duration} min · ${m.zone}`,
      "",
      "SUMMARY",
      m.summary,
      "",
      "ACTIONS",
      ...m.actions.map((a) => `- [${a.priority}] ${a.description} (owner ${a.owner}, due ${a.due})`),
      "",
      "TRANSCRIPT",
      ...m.transcript.map((t) => `${t.t} ${t.speaker}: ${t.text}\n      → ${t.gist}`),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `${m.id}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const flagged = flags.has(m.id);
  return (
    <>
      <AgentPageHeader
        agent="huddle"
        title={m.name}
        back={{ label: "Meeting Repository", page: "huddle-meetings" }}
        crumb={`Meeting ID ${m.id}`}
        meta={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            {s && (
              <button onClick={() => open.series(s.id)} className="text-[#4f86f7] hover:underline">
                {s.name}
              </button>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={m.organiser} size={18} /> {m.organiser}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {day(m.date)} · {m.time}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {m.duration} mins
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Area · {m.zone}
            </span>
            <AiInferred />
            <ConfidenceChip level={m.confidence} />
          </span>
        }
        right={
          <>
            <button onClick={() => (flags.toggle(m.id), toast(flagged ? "Meeting unflagged." : "Meeting flagged for review."))} aria-pressed={flagged} className={btn}>
              <Flag className="h-3.5 w-3.5" style={flagged ? { color: "#e85a70", fill: "#e85a70" } : undefined} /> {flagged ? "Flagged" : "Flag"}
            </button>
            <button onClick={share} className={btn}>
              <Share2 className="h-3.5 w-3.5" /> Copy link
            </button>
            <button onClick={download} className={btn}>
              <Download className="h-3.5 w-3.5" /> Download
            </button>
          </>
        }
      >
        <div className="mt-5">
          <SegTabs
            tabs={[
              { key: "summary", label: "Summary" },
              { key: "attendance", label: "Attendance" },
              { key: "transcript", label: "Transcript" },
              { key: "blockers", label: "Blockers", count: blockers.length },
              { key: "score", label: "Score Breakdown" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
      </AgentPageHeader>
      <div className={body}>
        {tab === "summary" && <Summary m={m} onTab={setTab} />}
        {tab === "attendance" && <Attendance m={m} />}
        {tab === "transcript" && <Transcript m={m} />}
        {tab === "blockers" && <BlockerPanel items={blockers} />}
        {tab === "score" && <Score m={m} />}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const h2 = "text-[15px] font-medium text-cx-text";

function Summary({ m, onTab }: { m: Meeting; onTab: (t: string) => void }) {
  const live = useLiveAction();
  const assign = useAssign();
  const acts = m.actions.map(live);
  const unassigned = acts.filter((a) => !a.assignee && a.status !== "completed");
  const insights = Object.values(INSIGHTS)
    .flatMap((cs) => Object.values(cs).flat())
    .filter((x) => x.meetingId === m.id);
  const tone = { positive: "green", neutral: "gray", negative: "red" } as const;
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-5">
        <section className={`${card} p-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={h2}>Overview</h2>
            <span className="flex items-center gap-1.5">
              <Chip title="Share of this meeting's themes the workbook's sales data corroborates">
                <Info className="h-3 w-3" /> Confidence : {m.confidencePct}%
              </Chip>
              <button onClick={() => onTab("transcript")}>
                <Chip tone="blue">
                  <WandSparkles className="h-3 w-3" /> Review AI
                </Chip>
              </button>
            </span>
          </div>
          <p className="mt-3 text-[13px] leading-[1.6] text-cx-muted">{m.summary}</p>
        </section>

        <section className={`${card} p-4`}>
          <h2 className={`flex items-center gap-2 ${h2}`}>
            <List className="h-4 w-4 text-cx-faint" /> Outline
          </h2>
          <p className="mt-1 text-[12.5px] text-[#4f86f7]">Key discussion points and outcomes from the meeting</p>
          <ul className="mt-2">
            {m.topics.map((t, i) => (
              <li key={i} className="flex gap-2.5 border-b border-cx-line py-2.5 text-[13px] text-cx-muted last:border-b-0">
                <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-[#4f86f7]" /> {t}
              </li>
            ))}
          </ul>
        </section>

        <section className={`${card} flex items-center justify-between gap-3 p-4`}>
          <h2 className={h2}>Meeting Sentiment</h2>
          <span className="flex items-center gap-2">
            <Chip tone={tone[m.tone.label]} className="capitalize">
              {m.tone.label}
            </Chip>
            <span className="font-data text-[15px] text-cx-text">{m.tone.score}%</span>
            <Info className="h-3.5 w-3.5 text-cx-faint" aria-label="From the urgency of the themes raised" />
          </span>
        </section>

        <section className={card}>
          <div className="px-4 pt-4">
            <h2 className={h2}>Action Snapshots</h2>
          </div>
          {acts.map((a) => (
            <ActionRow key={a.id} a={a} onAssign={() => assign.open(a, m)} />
          ))}
          {!acts.length && <Empty>No actions in this meeting.</Empty>}
        </section>
      </div>

      <div className="space-y-5">
        <section className={`${card} p-4`}>
          <h2 className={h2}>Unassigned Actions</h2>
          {unassigned.length ? (
            <ul className="mt-3 space-y-2">
              {unassigned.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-cx-line bg-cx-raised p-3">
                  <span className="text-[12.5px] leading-[1.5] text-cx-text">{a.description}</span>
                  <button onClick={() => assign.open(a, m)} className={`${btn} shrink-0`}>
                    Assign
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No unassigned tasks.</Empty>
          )}
        </section>
        <section className={`${card} p-4`}>
          <h2 className={h2}>Strategic Insights</h2>
          {insights.length ? (
            <ul className="mt-3 space-y-3">
              {insights.map((x, i) => (
                <li key={i} className="border-b border-cx-line pb-3 last:border-b-0 last:pb-0">
                  <p className="text-[13px] text-cx-text">{x.title}</p>
                  <p className="mt-0.5 text-[12px] leading-[1.5] text-cx-muted">{x.description}</p>
                  <p className="mt-1 text-[11.5px] text-cx-faint">{Math.round(x.confidence * 100)}% confidence</p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No sales insights found for this meeting.</Empty>
          )}
        </section>
        <section className={`${card} p-4`}>
          <h2 className={h2}>Identified Signals</h2>
          {m.signals.length ? (
            <ul className="mt-3 space-y-3">
              {m.signals.map((x, i) => (
                <li key={i} className="border-b border-cx-line pb-3 last:border-b-0 last:pb-0">
                  <p className="text-[13px] text-cx-text">{x.title}</p>
                  <p className="mt-0.5 text-[12px] leading-[1.5] text-cx-muted">{x.description}</p>
                  <p className="mt-1 text-[11.5px] text-cx-faint">
                    {x.source} · {Math.round(x.confidence * 100)}% confidence
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No signals identified.</Empty>
          )}
        </section>
      </div>
      {assign.modal}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

const TH = "px-3 py-2.5 text-[11px] font-normal text-cx-faint";

function Attendance({ m }: { m: Meeting }) {
  const s = seriesOf(m.seriesId);
  const expected = s?.attendees ?? m.attendees.map((a) => a.name);
  const remarks = (n: string) => m.transcript.filter((t) => t.speaker === n).length;
  const rows = expected.map((name) => {
    const a = m.attendees.find((x) => x.name === name);
    const r = remarks(name);
    return { name, role: a?.role ?? "", present: !!a, visits: a?.visits ?? null, speak: m.transcript.length ? (r / m.transcript.length) * m.duration : 0, level: r >= 2 ? "High" : r === 1 ? "Medium" : "Low" };
  });
  const present = rows.filter((r) => r.present).length;
  const kpis = [
    { l: "Attendance Ratio", v: `${Math.round((present / Math.max(1, expected.length)) * 100)}%`, n: `${present}/${expected.length} attended` },
    { l: "No-shows", v: expected.length - present, n: "this meeting" },
    { l: "Scheduled Duration", v: `${m.duration} min`, n: "actual time isn't recorded" },
    { l: "Engagement / Person", v: `${(m.transcript.length / Math.max(1, present)).toFixed(1)} remarks`, n: `${m.transcript.length} remarks in all` },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.l} className={`${card} p-4`}>
            <p className="text-[12.5px] text-cx-muted">{k.l}</p>
            <p className="mt-1 font-data text-[20px] text-cx-text">{k.v}</p>
            <span className="mt-2 inline-block">
              <Chip>{k.n}</Chip>
            </span>
          </div>
        ))}
      </div>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[760px] text-left text-[12.5px]">
          <thead className="border-b border-cx-line">
            <tr>
              <th className={`${TH} pl-4`}>Attendees</th>
              <th className={TH}>Attendance</th>
              <th className={TH}>Speak Duration</th>
              <th className={TH}>Attended Time</th>
              <th className={TH}>Field Visits That Day</th>
              <th className={TH}>Interaction Level</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-cx-line last:border-b-0">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2.5">
                    <Avatar name={r.name} size={26} />
                    <span>
                      <span className="block text-cx-text">{r.name}</span>
                      <span className="block text-[11.5px] text-cx-faint">{r.role}</span>
                    </span>
                  </span>
                </td>
                <td className="px-3 py-3">
                  <Chip tone={r.present ? "green" : "red"}>{r.present ? "Present" : "Absent"}</Chip>
                </td>
                <td className="px-3 py-3 font-data text-cx-muted">{r.speak ? `${r.speak.toFixed(1)} min` : "—"}</td>
                <td className="px-3 py-3 font-data text-cx-muted">{r.present ? `${m.duration} min` : "—"}</td>
                <td className="px-3 py-3 font-data text-cx-muted">{r.visits ?? "—"}</td>
                <td className="px-3 py-3">
                  <Chip tone={r.level === "High" ? "green" : r.level === "Medium" ? "amber" : "gray"}>{r.level}</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transcript — the verbatim remark, and its English gist
// ---------------------------------------------------------------------------

function Transcript({ m }: { m: Meeting }) {
  return (
    <section className={`${card} p-4`}>
      <Chip>
        <Info className="h-3 w-3" /> AI meeting processing · {m.transcript.length} remark{m.transcript.length === 1 ? "" : "s"}
      </Chip>
      <div className="mt-4 space-y-5">
        {m.transcript.map((t, i) => (
          <div key={i} className="flex gap-3">
            <Avatar name={t.speaker} size={26} />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px]">
                <span className="text-cx-text">{t.speaker}</span> <span className="ml-1 font-data text-[11.5px] text-[#4f86f7]">{t.t}</span>
              </p>
              <p className="mt-1 rounded-md bg-cx-raised px-2.5 py-1.5 text-[12.5px] leading-[1.55] text-cx-text">{t.text}</p>
              <p className="mt-1 text-[12.5px] leading-[1.55] text-cx-muted">
                <span className="text-[#4f86f7]">Translation:</span> {t.gist}
              </p>
            </div>
          </div>
        ))}
        {!m.transcript.length && <Empty>No transcript for this meeting.</Empty>}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Score Breakdown — Capability Building
// ---------------------------------------------------------------------------

function Score({ m }: { m: Meeting }) {
  const head = (l: string, hint: string) => (
    <span className="inline-flex items-center gap-1 whitespace-nowrap" title={hint}>
      {l} <Info className="h-3 w-3" />
    </span>
  );
  return (
    <section className={`${card} overflow-x-auto`}>
      <h2 className="p-4 text-[15px] font-medium text-cx-text">
        Capability Building Breakdown <span className="font-data text-[#4f86f7]">({m.quality.final}/100)</span>
      </h2>
      <table className="w-full min-w-[760px] text-left text-[12.5px]">
        <thead className="border-y border-cx-line bg-cx-raised">
          <tr>
            <th className={`${TH} pl-4`}>Criteria</th>
            <th className={TH}>{head("Total Weight", "How much this criterion counts toward the total")}</th>
            <th className={TH}>{head("Score", "0–100: how many of the meeting's themes covered it (none, one, two, three or more)")}</th>
            <th className={TH}>{head("Contribution", "Weight × score")}</th>
            <th className={TH}>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {m.quality.rows.map((r) => (
            <tr key={r.criteria} className="border-b border-cx-line align-top">
              <td className="max-w-[240px] px-4 py-3 text-cx-text">{r.criteria}</td>
              <td className="px-3 py-3 font-data text-cx-muted">{r.weight}%</td>
              <td className="px-3 py-3 font-data text-cx-muted">{r.score}</td>
              <td className="px-3 py-3 font-data text-cx-muted">{r.contribution}</td>
              <td className="px-3 py-3">
                <ul className="list-disc space-y-1 pl-4 text-[12px] text-cx-muted">
                  {r.evidence.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
          <tr className="bg-cx-raised">
            <td className="px-4 py-3 text-cx-muted">Total Capability Building</td>
            <td />
            <td />
            <td className="px-3 py-3 font-data text-[#4f86f7]">{m.quality.final}%</td>
            <td />
          </tr>
        </tbody>
      </table>
    </section>
  );
}
