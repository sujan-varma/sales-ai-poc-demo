"use client";

// The closed loop (use-case step 11), read after mount so server and client render the same
// first frame. Tickets verified in the Action Tracker this session update the plan, the
// homepage figures and the originating insight.

import { useEffect, useState } from "react";
import { PLAN_MONTHS, PlanMonth } from "@/data/cortexHome";
import { LBL } from "@/data/labels";
import { LoopState, closedInsights, deliveredAfter, initiativeOverrides, readLoop } from "@/data/tracker";

export function useLoop(): LoopState {
  const [loop, setLoop] = useState<LoopState>({ closed: {} });
  useEffect(() => setLoop(readLoop()), []);
  return loop;
}

/** PLAN_MONTHS with September's achieved figure as delivered after this session's closes. */
export function livePlanMonths(loop: LoopState): PlanMonth[] {
  if (!Object.keys(loop.closed).length) return PLAN_MONTHS;
  const sep = Math.round(deliveredAfter(loop) * 10) / 10;
  return PLAN_MONTHS.map((m) => {
    if (m.month !== "Sep" || m.estimateL == null) return m;
    const pct = Math.round((sep / m.estimateL) * 100);
    // the month-end projection moves with the close, staying a few points ahead of achieved
    return { ...m, achievedL: sep, note: `${LBL.daysLeft} · projected ~${pct + 3}%` };
  });
}

export { closedInsights, initiativeOverrides };

export const TRACKER_OPEN_KEY = "cx-tracker-open";
/** Open the Action Tracker on one ticket (from a plan row, a trace link…). */
export function openTicket(id: string) {
  try {
    sessionStorage.setItem(TRACKER_OPEN_KEY, id);
  } catch {
    /* storage unavailable */
  }
}

/** MAP Studio's October draft was agreed this session (shows in the plan index). */
export const OCT_AGREED_KEY = "cx-oct-agreed";
export function useOctAgreed() {
  const [v, setV] = useState(false);
  useEffect(() => {
    try {
      setV(sessionStorage.getItem(OCT_AGREED_KEY) === "1");
    } catch {
      /* storage unavailable */
    }
  }, []);
  return v;
}
