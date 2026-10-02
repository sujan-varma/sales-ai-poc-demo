"use client";

// Panels the series and meeting pages share: blockers (systemic / incomplete discussions, unresolved / resolved) and
// the action-item tabs. A blocker is resolved once the action raised on the same theme is closed in the Tracker.

import React, { useState } from "react";
import { HuddleAction, HuddleBlocker, Meeting, isOverdue } from "@/data/huddle";
import { ActionRow, Chip, Empty, LineTabs, Search, Select, btn, bucketOf, card, useAssign, useLiveAction, useOpen } from "./parts";

export type LiveBlocker = { b: HuddleBlocker; m: Meeting; a?: HuddleAction };

export function useBlockers(ms: Meeting[]): LiveBlocker[] {
  const live = useLiveAction();
  return ms.flatMap((m) =>
    m.blockers.map((b) => {
      const raw = m.actions.find((x) => x.theme === b.theme);
      const a = raw && live(raw);
      return { b: { ...b, resolved: b.resolved || a?.status === "completed" }, m, a };
    }),
  );
}

export function BlockerPanel({ items, showMeeting }: { items: LiveBlocker[]; showMeeting?: boolean }) {
  const open = useOpen();
  const assign = useAssign();
  const [type, setType] = useState<"systemic" | "gap">(items.some((x) => x.b.type === "systemic") || !items.length ? "systemic" : "gap");
  const [state, setState] = useState<"open" | "resolved">("open");
  const ofType = items.filter((x) => x.b.type === type);
  const shown = ofType.filter((x) => (state === "resolved") === x.b.resolved);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Select
          value={type}
          options={[
            { value: "systemic", label: "Systemic Blockers", count: items.filter((x) => x.b.type === "systemic").length },
            { value: "gap", label: "Incomplete Discussions", count: items.filter((x) => x.b.type === "gap").length },
          ]}
          onChange={(v) => setType(v as typeof type)}
          count={ofType.length}
        />
        <Select
          value={state}
          options={[
            { value: "open", label: "Unresolved", count: ofType.filter((x) => !x.b.resolved).length },
            { value: "resolved", label: "Resolved", count: ofType.filter((x) => x.b.resolved).length },
          ]}
          onChange={(v) => setState(v as typeof state)}
          count={shown.length}
        />
      </div>
      <div className="mt-3 space-y-3">
        {shown.map(({ b, m, a }) => (
          <div key={`${m.id}-${b.id}`} className={`${card} flex flex-wrap items-start justify-between gap-4 p-4`}>
            <div className="min-w-0 max-w-[820px]">
              <Chip tone={b.type === "systemic" ? "amber" : "gray"}>{b.type === "systemic" ? "Systemic Blocker" : "Incomplete Discussion"}</Chip>
              <p className="mt-2 text-[13px] leading-[1.5] text-cx-text">{b.description}</p>
              <p className="mt-1.5 text-[12px] text-cx-faint">
                Owner: {b.owner}
                {showMeeting && (
                  <>
                    {" · "}
                    <button onClick={() => open.meeting(m.id)} className="text-[#4f86f7] hover:underline">
                      {m.name}
                    </button>
                  </>
                )}
                {a?.ticket && ` · ${a.ticket}${a.assignee ? ` (${a.assignee})` : ""}`}
              </p>
              {b.evidence && <p className="mt-1.5 text-[12px] italic text-cx-faint">“{b.evidence}”</p>}
            </div>
            {!b.resolved && (
              <div className="flex gap-2">
                <button onClick={() => a && assign.open(a, m)} disabled={!a || !!a.assignee} title={a?.assignee ? `Already a task for ${a.assignee}` : undefined} className={`${btn} disabled:opacity-40`}>
                  {a?.assignee ? "Task created" : "Convert to task"}
                </button>
                <button disabled title="Resolves itself when its task is closed in the Action Tracker" className={`${btn} disabled:opacity-40`}>
                  Mark as resolved
                </button>
              </div>
            )}
          </div>
        ))}
        {!shown.length && (
          <div className={card}>
            <Empty>
              No {state === "open" ? "unresolved" : "resolved"} {type === "systemic" ? "systemic blockers" : "incomplete discussions"}.
            </Empty>
          </div>
        )}
      </div>
      {assign.modal}
    </div>
  );
}

/** an action raised again: the same issue (first five words) appeared in an earlier meeting */
const key5 = (s: string) => s.toLowerCase().split(/\s+/).slice(0, 5).join(" ");
export function repeatedIds(ms: Meeting[]) {
  const seen = new Set<string>();
  const rep = new Set<string>();
  for (const m of [...ms].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)))
    for (const a of m.actions) {
      const k = key5(a.description);
      if (seen.has(k)) rep.add(a.id);
      seen.add(k);
    }
  return rep;
}

type Bucket = "unassigned" | "assigned" | "progress" | "completed" | "overdue" | "repeated";

export function ActionTabs({ ms, withFilters }: { ms: Meeting[]; withFilters?: boolean }) {
  const live = useLiveAction();
  const open = useOpen();
  const assign = useAssign();
  const [q, setQ] = useState("");
  const [meeting, setMeeting] = useState("all");
  const all = ms.flatMap((m) => m.actions.map((a) => ({ a: live(a), m })));
  const rep = repeatedIds(ms);
  const scoped = all.filter((x) => (meeting === "all" || x.m.id === meeting) && (!q.trim() || `${x.m.name} ${x.a.description}`.toLowerCase().includes(q.trim().toLowerCase())));
  const inBucket = (b: Bucket) => scoped.filter((x) => (b === "overdue" ? isOverdue(x.a) : b === "repeated" ? rep.has(x.a.id) : bucketOf(x.a) === b));
  const [tab, setTab] = useState<Bucket>(inBucket("unassigned").length ? "unassigned" : "assigned");
  const rows = inBucket(tab);
  const tabs: { key: Bucket; label: string; hint?: string }[] = [
    { key: "unassigned", label: "Unassigned" },
    { key: "assigned", label: "Assigned" },
    { key: "progress", label: "In progress" },
    { key: "completed", label: "Completed" },
    { key: "overdue", label: "Overdue", hint: "Past due and not completed" },
    { key: "repeated", label: "Repeated", hint: "The same issue was raised in an earlier meeting" },
  ];
  const label = tabs.find((t) => t.key === tab)!.label.toLowerCase();
  return (
    <div>
      {withFilters && (
        <div className="mb-3 flex flex-wrap gap-2">
          <Search value={q} onChange={setQ} placeholder="Search by meeting..." className="w-full sm:w-[260px]" />
          <Select value={meeting} options={[{ value: "all", label: "All Meetings" }, ...ms.map((m) => ({ value: m.id, label: m.name }))]} onChange={setMeeting} />
        </div>
      )}
      <div className={card}>
        <LineTabs tabs={tabs.map((t) => ({ ...t, count: inBucket(t.key).length }))} value={tab} onChange={(k) => setTab(k as Bucket)} />
        {rows.map(({ a, m }) => (
          <ActionRow key={a.id} a={a} onAssign={() => assign.open(a, m)} meetingName={ms.length > 1 ? m.name : undefined} onMeeting={() => open.meeting(m.id)} />
        ))}
        {!rows.length && <Empty>No {label} tasks found.</Empty>}
      </div>
      {assign.modal}
    </div>
  );
}
