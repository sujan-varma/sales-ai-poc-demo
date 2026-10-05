// Demo scoping. A walkthrough should stay narratively tight: while demo scope is on, Insights and Since this morning
// show only the thread being walked through, so the item that just arrived isn't buried among unrelated ones.
// Everything else is one click away under "View all", which filters across the whole set.
// The thread itself comes from the backend (cortexHome.DEMO_SCENARIO): the ASM's items still waiting on them or new,
// and the Huddle findings that corroborate them. Session state, so "Reset for demo" (it clears every cx-* key) puts it back.

import { useEffect, useState } from "react";
import { DEMO_SCENARIO_DATA } from "./cortexHome";

export const DEMO_SCENARIO = DEMO_SCENARIO_DATA;

const KEY = "cx-demo-scope";

/** On by default: this build is a demo. Off shows everything the system holds. */
export function useDemoScope(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(true);
  useEffect(() => {
    try {
      setOn(sessionStorage.getItem(KEY) !== "off");
    } catch {
      /* storage unavailable: stays on */
    }
  }, []);
  const set = (v: boolean) => {
    try {
      sessionStorage.setItem(KEY, v ? "on" : "off");
    } catch {
      /* storage unavailable: this page still updates */
    }
    setOn(v);
  };
  return [on, set];
}

// ---------------------------------------------------------------------------
// Suggested actions: suggest → the agent works → confirmed
// ---------------------------------------------------------------------------

const DONE_KEY = "cx-suggested-done";

function readDone(): string[] {
  try {
    const raw = sessionStorage.getItem(DONE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Which suggested actions the ASM has confirmed this session. */
export function useConfirmedActions(): [string[], (id: string) => void] {
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => setDone(readDone()), []);
  const confirm = (id: string) => {
    const next = Array.from(new Set([...readDone(), id]));
    try {
      sessionStorage.setItem(DONE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable: it still reads as done on this page */
    }
    setDone(next);
  };
  return [done, confirm];
}
