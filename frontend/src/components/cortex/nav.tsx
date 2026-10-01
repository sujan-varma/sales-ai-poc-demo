"use client";

// Page-to-page navigation for the Sales AI flow. The components never import
// next/navigation directly, so the same pages run in the Next app (router push)
// and in the single-file HTML export (hash switch). Without a provider it falls
// back to a plain location change.

import React, { createContext, useContext } from "react";

export type CortexPage = "asm" | "leadership" | "configuration" | "activity-log" | "priority-log" | "thermometer" | "thermometer-head";

export const PAGE_HREF: Record<CortexPage, string> = {
  asm: "/asm",
  leadership: "/leadership",
  configuration: "/configuration",
  "activity-log": "/logs/activity",
  "priority-log": "/logs/priority",
  thermometer: "/thermometer",
  "thermometer-head": "/leadership/thermometer",
};

const NavCtx = createContext<(page: CortexPage) => void>((page) => {
  window.location.assign(PAGE_HREF[page]);
});

export function CortexNavProvider({ go, children }: { go: (page: CortexPage) => void; children: React.ReactNode }) {
  return <NavCtx.Provider value={go}>{children}</NavCtx.Provider>;
}

export function useCortexNav() {
  return useContext(NavCtx);
}
