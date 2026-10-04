"use client";

// The Market Action Plan summary stripe: one hairline-divided row of figures.
//
// Two scopes use it. A single plan shows Estimated · Agreed · Delivered · Closed · Flagged.
// The Head of Sales's index shows the same language rolled up across every ASM's plan in the
// period, so the org figure and the plan figure read as the same measurement at two
// altitudes — and the Flagged count he sees here is the sum of the ones he finds inside.

import React from "react";

export interface SummaryCell {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  /** marks a figure that is still moving, so it reads as live rather than final */
  live?: boolean;
}

/** Two up on a phone; one row from md. Tailwind needs the column count written out. */
const COLS: Record<number, string> = { 3: "md:grid-cols-3", 4: "md:grid-cols-4", 5: "md:grid-cols-5" };

export function SummaryRow({ cells, label }: { cells: SummaryCell[]; label?: string }) {
  return (
    <div role={label ? "group" : undefined} aria-label={label} className={`grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-cx-line bg-cx-line ${COLS[cells.length] ?? "md:grid-cols-4"}`}>
      {cells.map((c) => (
        <div key={c.label} className="bg-cx-panel px-5 py-4">
          <p className="flex items-center gap-1.5 text-[12px] text-cx-faint">
            {c.live && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#4f86f7]" aria-hidden />}
            {c.label}
          </p>
          <p className="mt-1 font-data text-[20px] leading-7 text-cx-text">{c.value}</p>
          {c.sub && <p className="mt-0.5 text-[11.5px] leading-[16px] text-cx-faint">{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}
