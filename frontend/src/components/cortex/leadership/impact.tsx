"use client";

// Action Impact Metrics — framed as Sales AI learning, not a scoreboard. Each action type shows
// impact desired, impact achieved and one Impact Score. How the score is calculated is not shown.

import React from "react";
import { ArrowDownRight, ArrowUpRight, Minus, TrendingUp } from "lucide-react";
import { IMPACT_CONFIDENCE, IMPACT_ROWS, ORG_ACTIONS, RANGE_DATA } from "@/data/leadership";
import { useRange } from "./common";
import { AiTag, ConfidenceScore } from "../ai";
import { card, CardHeader } from "../kit";

/** Ten stripes, the page's bar language, for a 0–100 score. */
function ScoreStripes({ score }: { score: number }) {
  const filled = Math.round(score / 10);
  return (
    <span className="flex h-3 gap-[2px]" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className="w-[3px] rounded-[1px]" style={{ background: i < filled ? `rgb(47 111 237 / ${0.42 + (0.58 * (i + 1)) / filled})` : "rgb(var(--cx-line))" }} />
      ))}
    </span>
  );
}

function Delta({ now, before }: { now: number; before: number }) {
  const d = now - before;
  if (Math.abs(d) < 2)
    return (
      <span className="inline-flex items-center gap-1 font-data text-[11.5px] text-cx-faint">
        <Minus className="h-3 w-3" /> {d > 0 ? `+${d}` : d}
      </span>
    );
  const up = d > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1 font-data text-[11.5px]" style={{ color: up ? "#2fa85c" : "#e85a70" }}>
      <Icon className="h-3 w-3" /> {up ? `+${d}` : d}
      <span className="font-plex text-cx-faint">from {before}</span>
    </span>
  );
}

export function ImpactMetrics() {
  const range = useRange();
  const done = RANGE_DATA[range.id].actions.done;
  // action counts follow the date filter; the scores are Sales AI's current learning
  // no completed actions in the data yet: show the counts as they are
  const k = ORG_ACTIONS.counts.done ? done / ORG_ACTIONS.counts.done : 1;
  const up = IMPACT_ROWS.filter((r) => r.score - r.lastMonth >= 2).length;
  const down = IMPACT_ROWS.filter((r) => r.lastMonth - r.score >= 2).length;
  const th = "px-3 py-2.5 text-left text-[11px] font-normal text-cx-faint";
  return (
    <section id="impact" aria-labelledby="impact-title" className={card}>
      <div className="p-5">
        <CardHeader
          id="impact-title"
          icon={<TrendingUp className="h-4 w-4" />}
          title="Action impact"
          badge={<AiTag />}
          right={
            <span className="flex items-center gap-3">
              <span className="text-[11.5px] text-cx-faint">Re-scored 16:45</span>
              <ConfidenceScore confidence={IMPACT_CONFIDENCE} align="right" />
            </span>
          }
        />
        <p className="mt-3 max-w-[78ch] text-[13.5px] leading-relaxed text-cx-muted">
          Sales AI scores each kind of action once its actions complete, then uses the score when it drafts the next round. From{" "}
          <span className="font-data text-cx-text">{done}</span> actions completed {range.phrase}, <span className="font-data text-cx-text">{up}</span> action types moved up and{" "}
          <span className="font-data text-cx-text">{down}</span> moved down. The right-hand column is what it changed as a result.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-t border-cx-line">
          <thead>
            <tr className="border-b border-cx-line">
              <th className={`${th} pl-5`}>Action</th>
              <th className={`${th} w-[72px] text-right`}>Actions</th>
              <th className={`${th} w-[150px] text-right`}>Impact desired</th>
              <th className={`${th} w-[132px] text-right`}>Impact achieved</th>
              <th className={`${th} w-[150px]`}>Impact score</th>
              <th className={`${th} w-[120px]`}>Since August</th>
              <th className={`${th} w-[300px] pr-5`}>What Sales AI changed</th>
            </tr>
          </thead>
          <tbody>
            {IMPACT_ROWS.map((r) => {
              const changed = r.change !== "No change";
              return (
                <tr key={r.action} className="border-b border-cx-line last:border-0 hover:bg-cx-hover/40">
                  <td className="py-3.5 pl-5 pr-3 text-[13px] text-cx-text">{r.action}</td>
                  <td className="px-3 py-3.5 text-right font-data text-[12px] text-cx-muted">{Math.max(1, Math.round(r.count * k))}</td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-right font-data text-[12.5px] text-cx-muted">{r.desired}</td>
                  <td className="px-3 py-3.5 text-right font-data text-[12.5px] text-cx-text">{r.achieved}</td>
                  <td className="px-3 py-3.5">
                    <span className="flex items-center gap-2.5">
                      <span className="w-7 font-data text-[16px] leading-none text-cx-text">{r.score}</span>
                      <ScoreStripes score={r.score} />
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <Delta now={r.score} before={r.lastMonth} />
                  </td>
                  <td className={`py-3.5 pl-3 pr-5 text-[12.5px] ${changed ? "text-cx-text" : "text-cx-faint"}`}>{r.change}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-cx-line px-5 py-3 text-[11.5px] text-cx-faint">Impact score runs 0–100. It's re-scored whenever an action of that kind completes.</p>
    </section>
  );
}
