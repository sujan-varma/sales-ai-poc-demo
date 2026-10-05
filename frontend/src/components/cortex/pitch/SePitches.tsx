"use client";

// The pitch list under one Sales Executive: outlet, how it got here, SFA status, points
// outstanding. Shared by the ASM's Pitch board and the Head of Sales's org-wide one, so a
// row reads the same whichever page opened it.

import React from "react";
import { ArrowRight } from "lucide-react";
import { PITCH_STATUS, Pitch, outstandingCount, pitchTrace, sourceLabel } from "@/data/pitch";
import { TraceTrigger } from "../actionTrace";
import { DotStatus } from "../agentPage";

export function SePitches({ pitches, onOpen }: { pitches: Pitch[]; onOpen: (p: Pitch) => void }) {
  if (!pitches.length) return <p className="py-3 pl-6 text-[12.5px] text-cx-faint">No pitch matches these filters for this Sales Executive.</p>;
  return (
    <div className="pl-6">
      <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_150px_120px_72px] gap-x-4 border-b border-cx-line py-2 text-[11px] text-cx-faint md:grid" aria-hidden>
        <span>Outlet</span>
        <span>Source · how it got here</span>
        <span>Status</span>
        <span>Points</span>
        <span />
      </div>
    <ul className="divide-y divide-cx-line">
      {pitches.map((p) => {
        const st = PITCH_STATUS[p.status];
        const src = p.sources.map(sourceLabel);
        const out = outstandingCount(p);
        return (
          <li key={p.id} className="grid items-start gap-x-4 gap-y-2 py-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_150px_120px_72px]">
            <div className="min-w-0">
              <p className="text-[13px] text-cx-text">
                {p.outlet}
                {p.news?.length ? <span className="ml-2 inline-flex h-5 items-center rounded-full border border-[#e0b43a]/40 bg-[#e0b43a]/10 px-1.5 align-middle text-[10.5px] text-[#e0b43a]">Needs update</span> : null}
              </p>
              <p className="text-[11.5px] text-cx-faint">
                {p.type} · {p.territory}
              </p>
            </div>
            <div className="min-w-0 text-[12px] leading-snug">
              {src.map((s, k) => (
                <p key={k} className="truncate text-cx-muted" title={s.text}>
                  {s.text} <span className="text-cx-faint">· {s.mode}</span>
                </p>
              ))}
              <TraceTrigger trace={pitchTrace(p)} source="Pitch" title={`${p.outlet} · ${p.type}, ${p.territory}`} compact />
            </div>
            <div>
              <DotStatus color={st.color}>{st.label}</DotStatus>
              <p className="mt-0.5 text-[11.5px] text-cx-faint">{p.status === "queued" ? "Next Create batch" : p.status === "visited" ? `${p.visited?.when} · via SFA` : `Since ${p.sfaAt}`}</p>
            </div>
            <p className="text-[12px] text-cx-muted">{p.status === "queued" ? "—" : out === 0 ? "All points covered" : `${out} point${out === 1 ? "" : "s"} outstanding`}</p>
            <button onClick={() => onOpen(p)} className="inline-flex items-center gap-1 justify-self-start text-[12.5px] text-[#4f86f7] hover:underline md:justify-self-end" aria-label={`Open the pitch for ${p.outlet}`}>
              Open <ArrowRight className="h-3 w-3" />
            </button>
          </li>
        );
      })}
    </ul>
    </div>
  );
}
