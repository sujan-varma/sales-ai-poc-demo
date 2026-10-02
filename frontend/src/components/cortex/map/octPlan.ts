"use client";

// The October plan as saved from MAP Studio (1 Oct corrections): the ASM's own targets, owners
// and priorities per initiative. Saving closes it in Studio and lands on the plan's detail view;
// "Edit in MAP Studio" is the way back in. Session state; Reset for demo clears it.

import { useEffect, useState } from "react";
import { DraftInitiative, OCT_DRAFT, Priority } from "@/data/map";

export interface OctRow extends DraftInitiative {
  /** the ASM's own target; starts at the AI estimate */
  targetL: number;
}
export interface OctPlan {
  saved: boolean;
  savedAt?: string;
  /** reopened from the plan with Edit in MAP Studio */
  editing?: boolean;
  rows: OctRow[];
}

const KEY = "cx-oct-plan";
export const AUTOGEN_KEY = "cx-map-autogen";
export const freshRows = (): OctRow[] => OCT_DRAFT.map((d) => ({ ...d, targetL: d.estL }));

export function readOct(): OctPlan | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OctPlan) : null;
  } catch {
    return null;
  }
}
export function writeOct(p: OctPlan) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}

export function useOctPlan(): OctPlan | null {
  const [p, setP] = useState<OctPlan | null>(null);
  useEffect(() => setP(readOct()), []);
  return p;
}

/** "Create October MAP" asks Studio to run the full generation sequence on arrival. */
export function requestAutogen() {
  try {
    sessionStorage.setItem(AUTOGEN_KEY, "1");
  } catch {
    /* storage unavailable */
  }
}
export function takeAutogen() {
  try {
    const v = sessionStorage.getItem(AUTOGEN_KEY) === "1";
    sessionStorage.removeItem(AUTOGEN_KEY);
    return v;
  } catch {
    return false;
  }
}

export const PRIORITIES: Priority[] = ["High", "Medium", "Low"];
