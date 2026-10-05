"use client";

// Page-to-page navigation for the Sales AI flow. The components never import
// next/navigation directly, so the same pages run in the Next app (router push)
// and in the single-file HTML export (hash switch). Without a provider it falls
// back to a plain location change.

import React, { createContext, useContext } from "react";

export type CortexPage =
  | "asm"
  | "leadership"
  | "configuration"
  | "activity-log"
  | "priority-log"
  | "thermometer"
  | "thermometer-head"
  | "map-studio"
  | "map-plans"
  | "map-head"
  | "pitch"
  | "pitch-head"
  | "pitch-detail"
  | "pitch-detail-head"
  | "pitch-adhoc"
  | "tracker"
  | "tracker-head"
  | "asm-priority-log"
  | "asm-activity-log"
  | "huddle"
  | "huddle-meetings"
  | "huddle-series"
  | "huddle-meeting";

export const PAGE_HREF: Record<CortexPage, string> = {
  asm: "/asm",
  leadership: "/leadership",
  configuration: "/configuration",
  "activity-log": "/logs/activity",
  "priority-log": "/logs/priority",
  thermometer: "/thermometer",
  "thermometer-head": "/leadership/thermometer",
  "map-studio": "/map/studio",
  "map-plans": "/map",
  "map-head": "/leadership/map",
  pitch: "/pitch",
  "pitch-head": "/leadership/pitch",
  "pitch-detail": "/pitch/detail",
  "pitch-detail-head": "/leadership/pitch/detail",
  "pitch-adhoc": "/pitch/adhoc",
  tracker: "/tracker",
  "tracker-head": "/leadership/tracker",
  "asm-priority-log": "/asm/logs/priority",
  "asm-activity-log": "/asm/logs/activity",
  huddle: "/huddle",
  "huddle-meetings": "/huddle/meetings",
  "huddle-series": "/huddle/series",
  "huddle-meeting": "/huddle/meeting",
};

/** Where a result link ("View in Pitch", "View plan") leads, when that page is built. */
export function linkPage(link: string, role: "asm" | "head" = "asm"): CortexPage | null {
  if (/tracker|ticket/i.test(link)) return role === "head" ? "tracker-head" : "tracker";
  // MAP and Pitch have a Head of Sales view too: the same pages, read-only, comments only
  if (/pitch/i.test(link)) return role === "head" ? "pitch-head" : "pitch";
  if (/plan/i.test(link)) return role === "head" ? "map-head" : "map-plans";
  return null;
}

const NavCtx = createContext<(page: CortexPage) => void>((page) => {
  window.location.assign(PAGE_HREF[page]);
});

export function CortexNavProvider({ go, children }: { go: (page: CortexPage) => void; children: React.ReactNode }) {
  return <NavCtx.Provider value={go}>{children}</NavCtx.Provider>;
}

export function useCortexNav() {
  return useContext(NavCtx);
}
