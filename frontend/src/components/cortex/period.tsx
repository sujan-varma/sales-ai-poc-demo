"use client";

// The ASM's period filter (1 Oct 2026 corrections): presets for the common cases plus a
// calendar for a custom range, in one control. The choice persists across ASM Home and both
// Market Action Plans views for the session, so it's always clear which period is counted.

import React, { useEffect, useState } from "react";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { useOutside } from "./shell";
import { DATA_DAY } from "@/data/cortexHome";

export type PeriodKind = "fy" | "quarter" | "month" | "prev-month" | "prev-week" | "custom";
export interface Period {
  kind: PeriodKind;
  /** custom range, ISO dates */
  from?: string;
  to?: string;
}

const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"] as const;
export type MonthKey = (typeof MONTHS)[number];
const MONTH_NUM: Record<MonthKey, number> = { Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10 };

export const PRESETS: { kind: Exclude<PeriodKind, "custom">; label: string; detail: string }[] = [
  { kind: "fy", label: "Financial Year", detail: "FY 2026–27 · Apr – Sep to date" },
  { kind: "quarter", label: "Quarter", detail: "Q2 · Jul – Sep" },
  { kind: "month", label: "Month", detail: "September 2026" },
  { kind: "prev-month", label: "Previous Month", detail: "August 2026" },
  { kind: "prev-week", label: "Previous Week", detail: `${DATA_DAY - 6} – ${DATA_DAY} Sep` },
];

export const DEFAULT_PERIOD: Period = { kind: "month" };
const KEY = "cx-period";
const EVT = "cx-period";

const fmtDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export function periodLabel(p: Period) {
  if (p.kind === "custom" && p.from && p.to) return `${fmtDay(p.from)} – ${fmtDay(p.to)}`;
  return PRESETS.find((x) => x.kind === p.kind)?.label ?? "Month";
}
export function periodDetail(p: Period) {
  if (p.kind === "custom" && p.from && p.to) return `Custom range · ${fmtDay(p.from)} – ${fmtDay(p.to)} 2026`;
  return PRESETS.find((x) => x.kind === p.kind)!.detail;
}

/**
 * The plan months a period covers, each with the share of that month it includes
 * (Previous Week is about a quarter of September; a custom range counts the days it spans).
 */
export function periodMonths(p: Period, includeDraft = false): { month: MonthKey; share: number }[] {
  const all = (includeDraft ? MONTHS : MONTHS.slice(0, 6)) as readonly MonthKey[];
  switch (p.kind) {
    case "fy":
      return all.map((month) => ({ month, share: 1 }));
    case "quarter":
      return (["Jul", "Aug", "Sep"] as MonthKey[]).map((month) => ({ month, share: 1 }));
    case "month":
      return [{ month: "Sep", share: 1 }];
    case "prev-month":
      return [{ month: "Aug", share: 1 }];
    case "prev-week":
      return [{ month: "Sep", share: 7 / 30 }];
    case "custom": {
      if (!p.from || !p.to) return [{ month: "Sep", share: 1 }];
      const a = new Date(`${p.from}T00:00:00`);
      const b = new Date(`${p.to}T00:00:00`);
      return all
        .map((month) => {
          const start = new Date(2026, MONTH_NUM[month] - 1, 1);
          const end = new Date(2026, MONTH_NUM[month], 0);
          const lo = Math.max(start.getTime(), a.getTime());
          const hi = Math.min(end.getTime(), b.getTime());
          const days = hi >= lo ? Math.round((hi - lo) / 86_400_000) + 1 : 0;
          return { month, share: days / end.getDate() };
        })
        .filter((m) => m.share > 0);
    }
  }
}

function read(): Period {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Period) : DEFAULT_PERIOD;
  } catch {
    return DEFAULT_PERIOD;
  }
}

/** The session's period, kept in step across every control on the page. */
export function usePeriod(): [Period, (p: Period) => void] {
  const [p, setP] = useState<Period>(DEFAULT_PERIOD);
  useEffect(() => {
    setP(read());
    const on = () => setP(read());
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  const set = (next: Period) => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable: this page still updates */
    }
    setP(next);
    window.dispatchEvent(new Event(EVT));
  };
  return [p, set];
}

/** Presets for the common cases, a calendar for anything specific — one control. */
export function PeriodFilter({ align = "right" }: { align?: "left" | "right" }) {
  const [p, set] = usePeriod();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("2026-09-01");
  const [to, setTo] = useState("2026-09-29");
  const ref = useOutside<HTMLDivElement>(open, () => setOpen(false));
  const valid = from && to && from <= to;
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Period: ${periodDetail(p)}`}
        className="flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-cx-line bg-cx-panel px-2.5 text-[12.5px] text-cx-text hover:border-cx-strong"
      >
        <CalendarDays className="h-4 w-4 text-cx-muted" />
        <span className="hidden sm:inline">{periodLabel(p)}</span>
        <ChevronDown className="hidden h-3 w-3 text-cx-faint sm:block" />
      </button>
      {open && (
        <div role="dialog" aria-label="Period" className={`absolute top-full z-50 mt-1.5 w-[280px] rounded-lg border border-cx-strong bg-cx-raised p-1.5 shadow-2xl ${align === "right" ? "right-0" : "left-0"}`}>
          <p className="px-2 pb-1.5 pt-1 font-data text-[10.5px] uppercase tracking-[0.08em] text-cx-faint">Show figures for</p>
          <ul role="listbox" aria-label="Period presets">
            {PRESETS.map((x) => (
              <li key={x.kind}>
                <button
                  role="option"
                  aria-selected={p.kind === x.kind}
                  onClick={() => {
                    set({ kind: x.kind });
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left hover:bg-cx-hover"
                >
                  <span>
                    <span className="block text-[12.5px] text-cx-text">{x.label}</span>
                    <span className="block font-data text-[10.5px] text-cx-faint">{x.detail}</span>
                  </span>
                  {p.kind === x.kind && <Check className="h-3.5 w-3.5 text-cx-text" />}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-1 border-t border-cx-line px-2 pb-1.5 pt-2.5">
            <p className="flex items-center justify-between text-[12.5px] text-cx-text">
              Custom range {p.kind === "custom" && <Check className="h-3.5 w-3.5" />}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {[
                ["From", from, setFrom],
                ["To", to, setTo],
              ].map(([label, v, setV]) => (
                <label key={label as string} className="block">
                  <span className="text-[10.5px] text-cx-faint">{label as string}</span>
                  <input
                    type="date"
                    min="2026-04-01"
                    max="2026-09-29"
                    value={v as string}
                    onChange={(e) => (setV as (s: string) => void)(e.target.value)}
                    className="mt-0.5 h-8 w-full rounded-md border border-cx-strong bg-cx-bg px-1.5 font-data text-[11.5px] text-cx-text focus:border-[#2f6fed]/70 focus:outline-none"
                  />
                </label>
              ))}
            </div>
            <button
              disabled={!valid}
              onClick={() => {
                set({ kind: "custom", from, to });
                setOpen(false);
              }}
              className="mt-2 h-8 w-full rounded-md bg-[#2f6fed] text-[12.5px] font-medium text-white hover:bg-[#4f86f7] disabled:opacity-40"
            >
              Apply range
            </button>
            {!valid && <p className="mt-1 text-[11px] text-[#e85a70]">The start date has to come before the end date.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
