"use client";

// Status colours. Option A (Console) opts into its corrected legend:
// green = completed · white (ink on light) = in progress · yellow = delayed · gray = unassigned.

import React, { createContext, useContext } from "react";
import { ActionStatus, STATUS_META } from "@/data/cortexHome";

type Meta = Record<ActionStatus, { label: string; color: string }>;

export const STATUS_META_CONSOLE: Meta = {
  done: { label: "Completed", color: "#2fa85c" },
  progress: { label: "In progress", color: "rgb(var(--st-progress))" },
  delayed: { label: "Delayed", color: "#e0b43a" },
  unassigned: { label: "Unassigned", color: "#6b6b74" },
};

const Ctx = createContext<{ meta: Meta; hollowUnassigned: boolean }>({ meta: STATUS_META, hollowUnassigned: true });

export function ConsoleStatusPalette({ children }: { children: React.ReactNode }) {
  return <Ctx.Provider value={{ meta: STATUS_META_CONSOLE, hollowUnassigned: false }}>{children}</Ctx.Provider>;
}

export function useStatusMeta() {
  return useContext(Ctx);
}

/** Option B legend: green = completed · blue = in progress · yellow = delayed · grey = no owner. */
export const STATUS_META_B: Meta = {
  done: { label: "Completed", color: "#2fa85c" },
  progress: { label: "In progress", color: "#4f86f7" },
  delayed: { label: "Delayed", color: "#e0b43a" },
  unassigned: { label: "No owner", color: "#7c7f89" },
};

export function PulseStatusPalette({ children }: { children: React.ReactNode }) {
  return <Ctx.Provider value={{ meta: STATUS_META_B, hollowUnassigned: false }}>{children}</Ctx.Provider>;
}
