"use client";

import { LBL } from "@/data/labels";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Check, Map as MapIcon, X } from "lucide-react";
import { PLAN_META, PLAN_RUN, PRIMARY_BLUE, RECOMMENDATIONS, RecDecision, RecRoute, ViewerRole } from "@/data/cortexHome";
import { AgentRunChip } from "./agentRun";
import { REC_SUGGESTED } from "@/data/actionTraces";

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
  const [planOpen, setPlanOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

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
      value={{ role, setRole, decisions, decide, routes, toggleRoute, hoveredRec, setHoveredRec, focus, toast, openPlan: () => setPlanOpen(true), assistantOpen, setAssistantOpen }}
    >
      {children}
      {planOpen && <CreatePlanDialog decisions={decisions} routes={routes} onClose={() => setPlanOpen(false)} onStart={() => {}} />}
      {toastMsg && (
        <div className="fixed bottom-16 left-1/2 z-[70] -translate-x-1/2 rounded-md border border-cx-strong bg-cx-raised px-3.5 py-2 text-[13px] text-cx-text shadow-2xl">
          {toastMsg}
        </div>
      )}
    </Ctx.Provider>
  );
}

function CreatePlanDialog({
  decisions,
  routes,
  onClose,
  onStart,
}: {
  decisions: Record<string, RecDecision>;
  routes: Record<string, RecRoute[]>;
  onClose: () => void;
  onStart: () => void;
}) {
  const escalated = RECOMMENDATIONS.filter((r) => decisions[r.id] === "escalated" || routes[r.id]?.includes("map"));
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Create October Market Action Plan"
        className="w-full max-w-md rounded-lg border border-cx-strong bg-cx-panel p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md" style={{ background: `${PRIMARY_BLUE}1f`, color: PRIMARY_BLUE }}>
              <MapIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[15px] font-medium text-cx-text">Create October plan</h2>
              <p className="text-xs text-cx-faint">{PLAN_META.scope}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-cx-faint hover:bg-cx-hover hover:text-cx-text" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-cx-line bg-cx-line text-xs">
          {[
            ["Data basis", `Actuals through ${LBL.dataDate}`],
            ["Refreshes on", "1 Oct, Sep month-end"],
            ["Territories", `All ${LBL.asmTerrCount}, one plan`],
            ["Escalated in", `${escalated.length} suggestion${escalated.length === 1 ? "" : "s"}`],
          ].map(([k, v]) => (
            <div key={k} className="bg-cx-raised px-3 py-2">
              <dt className="text-cx-faint">{k}</dt>
              <dd className="mt-0.5 font-data text-cx-text">{v}</dd>
            </div>
          ))}
        </dl>

        {escalated.length > 0 ? (
          <ul className="mt-4 space-y-1.5">
            {escalated.map((r) => (
              <li key={r.id} className="flex gap-2 text-[13px] text-cx-muted">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: PRIMARY_BLUE }} />
                <span>
                  <span className="text-cx-text">{r.territory}:</span> {r.title}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[13px] text-cx-faint">
            No Thermometer recommendations escalated yet. Escalated items arrive here as suggested initiatives.
          </p>
        )}

        {phase !== "idle" && (
          <div className="mt-4">
            {/* plan generation shows the agent at work, then what it produced */}
            <AgentRunChip run={PLAN_RUN} onDone={() => setPhase("done")} />
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-cx-strong px-3 py-1.5 text-[13px] text-cx-muted hover:bg-cx-hover hover:text-cx-text">
            {phase === "done" ? "Close" : "Cancel"}
          </button>
          {phase === "idle" && (
            <button
              onClick={() => {
                setPhase("running");
                onStart();
              }}
              className="rounded-md bg-[#2f6fed] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#4f86f7]"
            >
              Start draft
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
