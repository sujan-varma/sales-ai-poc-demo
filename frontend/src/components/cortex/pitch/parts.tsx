"use client";

// Pitch building blocks: the talking-points table in the confirmed format
// (# · Topic · Talking point · Logic · Confidence · Status from SFA · Comment),
// and the multi-select the Territory filter needs (an SE can cover more than one).

import React, { useState } from "react";
import { Check, ChevronDown, MessageSquare, Send } from "lucide-react";
import { Confidence } from "@/data/cortexHome";
import { Pitch, TalkingPoint, coveredTrace } from "@/data/pitch";
import { AgentRunChip } from "../agentRun";
import { TraceTooltip } from "../actionTrace";
import { ConfidenceScore, confidenceBand } from "../ai";
import { DotStatus } from "../agentPage";
import { useHome } from "../HomeState";
import { useOutside } from "../shell";

/** Selected values; an empty list means all. */
export function MultiSelect({ label, values, options, onChange, allLabel = "All" }: { label: string; values: string[]; options: string[]; onChange: (v: string[]) => void; allLabel?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside<HTMLDivElement>(open, () => setOpen(false));
  const shown = values.length === 0 ? allLabel : values.length <= 2 ? values.join(", ") : `${values.length} selected`;
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] ${values.length ? "border-cx-strong bg-cx-hover text-cx-text" : "border-cx-line bg-cx-panel text-cx-muted hover:text-cx-text"}`}
      >
        <span className="text-cx-faint">{label}</span>
        <span className="max-w-[200px] truncate">{shown}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div role="listbox" aria-multiselectable="true" aria-label={label} className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-lg border border-cx-strong bg-cx-raised p-1 shadow-2xl">
          {options.map((o) => {
            const on = values.includes(o);
            return (
              <button
                key={o}
                role="option"
                aria-selected={on}
                onClick={() => onChange(on ? values.filter((v) => v !== o) : [...values, o])}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12.5px] text-cx-muted hover:bg-cx-hover hover:text-cx-text"
              >
                <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border ${on ? "border-[#2f6fed] bg-[#2f6fed] text-white" : "border-cx-strong"}`} aria-hidden>
                  {on && <Check className="h-2.5 w-2.5" />}
                </span>
                {o}
              </button>
            );
          })}
          {values.length > 0 && (
            <button onClick={() => onChange([])} className="mt-1 w-full rounded-md border-t border-cx-line px-2 py-1.5 text-left text-[12px] text-cx-faint hover:text-cx-text">
              Clear · show {allLabel.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function confidenceOf(t: TalkingPoint, p: Pitch): Confidence {
  const s = t.conf ?? 0;
  return {
    score: s,
    rationale: `${confidenceBand(s)}: ${t.logic}`,
    factors: { corroboration: Math.min(1, s / 100 + 0.02), freshness: 0.9, reliability: Math.max(0.5, s / 100 - 0.04) },
    sources: [{ agent: t.fromPlan ? "map" : "pitch", title: t.evidence, detail: t.logic, when: p.generated ?? "Today", ageHours: 30, independent: true }],
    rescoredAt: "09:40",
  };
}

export function PointsTable({ p, points, commentable = true }: { p: Pitch; points: TalkingPoint[]; commentable?: boolean }) {
  const th = "px-3 py-2.5 text-left text-[11px] font-normal text-cx-faint";
  const [commenting, setCommenting] = useState<number | null>(null);
  return (
    <div className="overflow-x-auto rounded-lg border border-cx-line bg-cx-panel">
      <table className="w-full min-w-[1180px] table-fixed">
        <colgroup>
          <col className="w-[48px]" />
          <col className="w-[14%]" />
          <col />
          <col className="w-[21%]" />
          <col className="w-[150px]" />
          <col className="w-[15%]" />
          {commentable && <col className="w-[124px]" />}
        </colgroup>
        <thead className="border-b border-cx-line">
          <tr>
            <th className={`${th} pl-5`}>#</th>
            <th className={th}>Topic</th>
            <th className={th}>Talking point</th>
            <th className={th}>Logic</th>
            <th className={th}>Confidence</th>
            <th className={th}>Status · from SFA</th>
            {commentable && (
              <th className={`${th} pr-5`}>Actions</th>
            )}
          </tr>
        </thead>
        {points.map((t) => (
          <tbody key={t.n} className="border-b border-cx-line last:border-b-0">
            <tr className="align-top">
              <td className="py-3.5 pl-5 pr-2 font-data text-[12px] text-cx-faint">{t.n}</td>
              <td className="px-3 py-3.5">
                <p className="text-[13px] font-medium text-cx-text">{t.topic}</p>
                {t.fromPlan && <span className="mt-1 inline-flex h-5 items-center rounded-full border border-[#2f6fed]/40 bg-[#2f6fed]/10 px-1.5 text-[10.5px] text-[color:var(--ai-ink)]">From plan #{t.fromPlan}</span>}
              </td>
              <td className="bg-cx-raised/40 px-3 py-3.5">
                <p className="text-[13px] leading-snug text-cx-text">{t.point}</p>
                <p className="mt-1.5 text-[12px] leading-snug text-cx-faint">Why: {t.why}</p>
              </td>
              <td className="px-3 py-3.5">
                <p className="text-[12.5px] leading-snug text-cx-muted">{t.logic}</p>
                <EvidenceLink label={t.evidence} />
              </td>
              <td className="px-3 py-3.5">{t.conf != null ? <ConfidenceScore confidence={confidenceOf(t, p)} /> : <span className="text-[12px] text-cx-faint">—</span>}</td>
              <td className="px-3 py-3.5">
                <SfaStatus p={p} t={t} />
              </td>
              {commentable && (
                <td className="py-3.5 pl-3 pr-5">
                  <button
                    onClick={() => setCommenting((c) => (c === t.n ? null : t.n))}
                    aria-expanded={commenting === t.n}
                    className="inline-flex h-7 items-center gap-1.5 rounded-md border border-cx-line px-2.5 text-[12px] text-cx-muted hover:border-cx-strong hover:text-cx-text"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Comment
                  </button>
                </td>
              )}
            </tr>
            {commentable && commenting === t.n && (
              <tr>
                <td />
                <td colSpan={6} className="pb-4 pr-5">
                  <PointComment se={p.se} topic={t.topic} />
                </td>
              </tr>
            )}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function EvidenceLink({ label }: { label: string }) {
  const { toast } = useHome();
  return (
    <button onClick={() => toast(`Opens ${label}.`)} className="mt-1 block text-left text-[12px] text-[#4f86f7] hover:underline">
      {label}
    </button>
  );
}

/** Coverage is marked by the SE in SFA and arrives here with who, where and when (review 1.2). */
function SfaStatus({ p, t }: { p: Pitch; t: TalkingPoint }) {
  if (t.conf == null) return <span className="text-[12px] text-cx-faint">Not applicable</span>;
  if (t.covered)
    return (
      <div className="space-y-0.5">
        <DotStatus color="#2fa85c">Covered</DotStatus>
        <p className="text-[11.5px] leading-snug text-cx-faint">
          {t.covered.by} · {t.covered.when} · via SFA
        </p>
        <TraceTooltip trace={coveredTrace(p, t)} label="Evidence" />
      </div>
    );
  if (p.status === "queued") return <span className="text-[12px] text-cx-faint">Not generated</span>;
  return (
    <div className="space-y-0.5">
      <DotStatus color="#7c7f89">{p.status === "visited" ? "Not covered" : "Not yet covered"}</DotStatus>
      <p className="text-[11.5px] leading-snug text-cx-faint">{p.status === "visited" && p.visited ? `Visited ${p.visited.when} · no coverage recorded for this point` : `In ${p.se}'s SFA app`}</p>
    </div>
  );
}

function PointComment({ se, topic }: { se: string; topic: string }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState<{ text: string; key: number }[]>([]);
  return (
    <div className="space-y-2">
      {sent.map((c, i) => (
        <AgentRunChip key={c.key} run={{ agent: "pitch", steps: ["creating the ticket", `adding it to ${se}'s Tracker and SFA`], result: `TKT-${2350 + i} for ${se}: “${c.text}”`, link: "View in Tracker" }} block />
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          setSent((s) => [...s, { text: text.trim(), key: Date.now() }]);
          setText("");
        }}
        className="flex gap-2"
      >
        <label className="sr-only" htmlFor={`pc-${topic}`}>
          Comment on {topic} for {se}
        </label>
        <input
          id={`pc-${topic}`}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Comment on “${topic}” — creates a ticket for ${se}`}
          className="h-9 min-w-0 flex-1 rounded-md border border-cx-strong bg-cx-bg px-3 text-[12.5px] text-cx-text placeholder:text-cx-faint focus:border-[#2f6fed]/70 focus:outline-none"
        />
        <button type="submit" disabled={!text.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#2f6fed] px-3 text-[12.5px] font-medium text-white hover:bg-[#4f86f7] disabled:opacity-40">
          <Send className="h-3.5 w-3.5" /> Send to {se}
        </button>
      </form>
    </div>
  );
}

const OPEN_KEY = "cx-pitch-open";
export function setOpenPitch(id: string) {
  try {
    sessionStorage.setItem(OPEN_KEY, id);
  } catch {
    /* storage unavailable */
  }
}
export function getOpenPitch(): string | null {
  try {
    return new URLSearchParams(location.search).get("pitch") ?? sessionStorage.getItem(OPEN_KEY);
  } catch {
    return null;
  }
}
const ADHOC_KEY = "cx-pitch-adhoc";
export function setAdhocOutlet(outlet: string) {
  try {
    sessionStorage.setItem(ADHOC_KEY, outlet);
  } catch {
    /* storage unavailable */
  }
}
export function takeAdhocOutlet(): string | null {
  try {
    const v = sessionStorage.getItem(ADHOC_KEY);
    sessionStorage.removeItem(ADHOC_KEY);
    return v;
  } catch {
    return null;
  }
}
