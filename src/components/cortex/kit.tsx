"use client";

// Small Option B building blocks shared by the ASM and Leadership pages:
// the card surface, the section label, the card header, the compact dropdown,
// and the KPI striped bar.

import React, { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useOutside } from "./shell";

export const card = "rounded-lg border border-cx-line bg-cx-panel";

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <h3 className="font-data text-[10.5px] uppercase tracking-[0.08em] text-cx-faint">{children}</h3>;
}

export function CardHeader({ icon, title, badge, right, id }: { icon: React.ReactNode; title: string; badge?: React.ReactNode; right?: React.ReactNode; id?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 id={id} className="flex items-center gap-2.5 text-[15px] font-medium text-cx-text">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cx-line bg-cx-raised text-cx-muted">{icon}</span>
        {title}
        {badge}
      </h2>
      {right}
    </div>
  );
}

/** Compact disclosure select used by the tracker officer filter and the Thermometer filter bar. */
export function Dropdown({
  label,
  value,
  options,
  onChange,
  placeholder = "All",
  allOption = true,
}: {
  label: string;
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
  placeholder?: string;
  allOption?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutside<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] ${value ? "border-cx-strong bg-cx-hover text-cx-text" : "border-cx-line bg-cx-panel text-cx-muted hover:text-cx-text"}`}
      >
        <span className="text-cx-faint">{label}</span>
        <span className="max-w-[160px] truncate">{value ?? placeholder}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <ul className="absolute left-0 top-full z-50 mt-1 max-h-72 min-w-[200px] overflow-y-auto rounded-lg border border-cx-strong bg-cx-raised p-1 shadow-2xl">
          {(allOption ? [null, ...options] : options).map((o) => (
            <li key={o ?? "__all"}>
              <button
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-[12.5px] text-cx-muted hover:bg-cx-hover hover:text-cx-text"
              >
                {o ?? "All"}
                {o === value && <Check className="h-3 w-3" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Row of 5% stripes that stretch to the cell width (the reference striped-bar visual).
 *  What each colour means is explained in a tooltip on hover, not in a caption. */
export function KpiStripes({ fills, projected, tip, height = 26 }: { fills: (string | null)[]; projected?: number; tip?: (i: number) => [string, string?]; height?: number }) {
  const [hi, setHi] = useState<number | null>(null);
  const t = hi != null && tip ? tip(hi) : null;
  return (
    <div className="relative" onMouseLeave={() => setHi(null)}>
      <div className="absolute inset-x-0 top-0 border-t border-dashed border-cx-strong" aria-hidden />
      <div className="flex gap-[3px] pt-1" style={{ height }}>
        {fills.map((f, i) => (
          <span
            key={i}
            onMouseEnter={() => setHi(i)}
            className="cx-stripe flex-1 rounded-[1px] transition-opacity"
            style={{
              animationDelay: `${0.25 + i * 0.022}s`,
              background: f ?? "rgb(var(--cx-line))",
              boxShadow: projected === i ? "inset 0 0 0 1px rgb(var(--cx-muted))" : undefined,
              opacity: hi != null && hi !== i ? 0.55 : 1,
            }}
          />
        ))}
      </div>
      {t && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full z-30 mb-2 whitespace-nowrap rounded-md border border-cx-strong bg-cx-raised px-2.5 py-1.5 text-[11.5px] shadow-xl"
          style={{ left: `${((hi! + 0.5) / fills.length) * 100}%`, transform: `translateX(${hi! < 4 ? "-15%" : hi! > fills.length - 5 ? "-85%" : "-50%"})` }}
        >
          <span className="block text-cx-text">{t[0]}</span>
          {t[1] && <span className="block text-[10.5px] text-cx-faint">{t[1]}</span>}
        </span>
      )}
    </div>
  );
}

/** Dull → bright primary blue across the filled stripes. */
export function blueRamp(filled: number) {
  return (i: number) => `rgb(47 111 237 / ${0.42 + (0.58 * (i + 1)) / Math.max(filled, 1)})`;
}
