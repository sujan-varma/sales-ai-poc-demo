"use client";

// Action assignment, backed by the backend's /api/tracker endpoints. Assigning stores the action and sends it
// to the sales officer's mobile app (push notification + the app's notification bell). The web app only shows
// what became of each assignment; notifications themselves live in the mobile app.

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiUrl } from "@/data/source";
import { LBL } from "@/data/labels";

const POLL_MS = 30000;

export interface Delivery {
  devices: number;
  sent: number;
  failed: number;
  errors: string[];
}

export interface AssignedAction {
  id: string;
  source_id: string;
  title: string;
  outlet: string;
  territory: string | null;
  st: "owner" | "progress" | "closed";
  assignee: { type: "so" | "asm"; id: string | null; name: string };
  created: number;
}

export interface AssignInput {
  source_id: string;
  title: string;
  assignee: string;
  territory?: string;
  agent?: string;
  kind?: string;
  retailer_id?: string;
}

export interface AssignResult {
  action: AssignedAction;
  notification: { delivery: Delivery | null } | null;
  created: boolean;
}

interface Ctx {
  /** assigned actions by the web item they came from (sug-1, new-rec-3, …) */
  assigned: Record<string, AssignedAction>;
  /** push delivery of the "assigned" notification, by action id (this session only) */
  delivery: Record<string, Delivery | null>;
  assign: (x: AssignInput) => Promise<AssignResult>;
}

const AssignCtx = createContext<Ctx | null>(null);

export function useAssignments() {
  const c = useContext(AssignCtx);
  if (!c) throw new Error("useAssignments must be used inside <AssignmentsProvider>");
  return c;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${apiUrl()}${path}`, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  let j: { success?: boolean; data?: T; error?: string };
  try {
    j = await r.json();
  } catch {
    throw new Error(`HTTP ${r.status}`);
  }
  if (!j.success) throw new Error(j.error || `HTTP ${r.status}`);
  return j.data as T;
}

export function AssignmentsProvider({ children }: { children: React.ReactNode }) {
  const asm = LBL.asmName;
  const [actions, setActions] = useState<AssignedAction[]>([]);
  const [delivery, setDelivery] = useState<Record<string, Delivery | null>>({});

  // statuses change in the officer's app, so re-read them now and then
  useEffect(() => {
    const load = () => api<AssignedAction[]>(`/api/tracker/actions?assigned_by=${encodeURIComponent(asm)}`).then(setActions).catch(() => {});
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), POLL_MS);
    return () => clearInterval(t);
  }, [asm]);

  const assign = useCallback(
    async (x: AssignInput) => {
      const r = await api<AssignResult>("/api/tracker/assign", { method: "POST", body: JSON.stringify({ ...x, assigned_by: asm }) });
      setActions((a) => [r.action, ...a.filter((y) => y.id !== r.action.id)]);
      if (r.notification) setDelivery((d) => ({ ...d, [r.action.id]: r.notification!.delivery }));
      return r;
    },
    [asm],
  );

  // newest assignment per source wins (an item can be re-assigned once the earlier one is closed)
  const assigned: Record<string, AssignedAction> = {};
  for (const a of [...actions].sort((p, q) => p.created - q.created)) assigned[a.source_id] = a;

  return <AssignCtx.Provider value={{ assigned, delivery, assign }}>{children}</AssignCtx.Provider>;
}

/** What became of an assignment, in one line: "Pushed to Paresh Patel's phone", "In progress · …". */
export function assignmentLine(a: AssignedAction | undefined, d: Delivery | null | undefined): string | null {
  if (!a || a.assignee.type === "asm") return null;
  const who = a.assignee.name;
  if (a.st === "closed") return `Completed by ${who}`;
  if (a.st === "progress") return `In progress · ${who}`;
  if (!d) return `In ${who}'s mobile app`;
  if (d.sent) return `Pushed to ${who}'s phone`;
  return `In ${who}'s mobile app · push not turned on yet`;
}

/** Toast after assigning. */
export function assignToast(who: string, r: AssignResult): string {
  if (who === "Me") return r.created ? "Added to your Tracker." : "Already in your Tracker.";
  if (!r.created) return `Already assigned to ${who}.`;
  if (r.notification?.delivery?.sent) return `Assigned to ${who}. Push notification sent to their phone.`;
  return `Assigned to ${who}. It's in their mobile app; they'll get a push once they turn notifications on.`;
}
