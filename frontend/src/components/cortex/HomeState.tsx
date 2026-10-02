"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { RecDecision, RecRoute, ViewerRole } from "@/data/cortexHome";
import { REC_SUGGESTED } from "@/data/actionTraces";
import { useCortexNav } from "./nav";
import { requestAutogen } from "./map/octPlan";

interface HomeCtx {
  role: ViewerRole;
  setRole: (r: ViewerRole) => void;
  decisions: Record<string, RecDecision>;
  decide: (id: string, d: RecDecision | null) => void;
  /** Pulse layout: a recommendation can be routed to several destinations at once. */
  routes: Record<string, RecRoute[]>;
  toggleRoute: (id: string, r: RecRoute) => void;
  hoveredRec: string | null;
  setHoveredRec: (id: string | null) => void;
  focus: (target: string) => void;
  toast: (msg: string) => void;
  /** Create Market Action Plan: opens MAP Studio on the October draft */
  openPlan: () => void;
  /** AI Assistant side drawer (pushes page content aside on desktop) */
  assistantOpen: boolean;
  setAssistantOpen: (v: boolean | ((o: boolean) => boolean)) => void;
}

const Ctx = createContext<HomeCtx | null>(null);

export function useHome() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useHome must be used inside <HomeProvider>");
  return c;
}

export function HomeProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<ViewerRole>("asm");
  const [decisions, setDecisions] = useState<Record<string, RecDecision>>({});
  // Thermometer recommendations arrive already routed by Sales AI (the ASM can add or remove routes)
  const [routes, setRoutes] = useState<Record<string, RecRoute[]>>(() => Object.fromEntries(Object.entries(REC_SUGGESTED).map(([id, r]) => [id, [r]])));
  const [hoveredRec, setHoveredRec] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const go = useCortexNav();

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3200);
  }, []);

  const decide = useCallback((id: string, d: RecDecision | null) => {
    setDecisions((prev) => {
      const next = { ...prev };
      if (d) next[id] = d;
      else delete next[id];
      return next;
    });
  }, []);

  const toggleRoute = useCallback((id: string, r: RecRoute) => {
    setRoutes((prev) => {
      const cur = prev[id] ?? [];
      return { ...prev, [id]: cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r] };
    });
  }, []);

  const focus = useCallback((target: string) => {
    const el = document.getElementById(target);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("cx-flash");
    void el.offsetWidth; // restart the animation
    el.classList.add("cx-flash");
  }, []);

  return (
    <Ctx.Provider
      value={{ role, setRole, decisions, decide, routes, toggleRoute, hoveredRec, setHoveredRec, focus, toast, openPlan: () => (requestAutogen(), go("map-studio")), assistantOpen, setAssistantOpen }}
    >
      {children}
      {toastMsg && (
        <div className="fixed bottom-16 left-1/2 z-[70] -translate-x-1/2 rounded-md border border-cx-strong bg-cx-raised px-3.5 py-2 text-[13px] text-cx-text shadow-2xl">
          {toastMsg}
        </div>
      )}
    </Ctx.Provider>
  );
}
