"use client";

// ASM top nav: Home · Action Tracker · Logs — the same three tabs as the Head of Sales.
// Market Action Plan and Pitch are reached from the agent rail and the Home agent row.

import { useCortexNav } from "./nav";

export function useAsmNav(current: "home" | "tracker" | "logs" | "none") {
  const go = useCortexNav();
  return {
    tabs: ["Home", "Action Tracker", "Logs"],
    currentTab: current === "home" ? 0 : current === "tracker" ? 1 : current === "logs" ? 2 : -1,
    onTab: (i: number) => {
      if (i === 0) go("asm");
      else if (i === 1) go("tracker");
      else if (i === 2) go("asm-priority-log");
      return true;
    },
  };
}
