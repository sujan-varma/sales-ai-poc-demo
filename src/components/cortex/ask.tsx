"use client";

import { LBL } from "@/data/labels";
import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { TERRITORIES } from "@/data/cortexHome";

export const ALL_SCOPE = `All ${LBL.asmTerritories}`;

export function ScopeSelect({ value, onChange, up = false }: { value: string; onChange: (v: string) => void; up?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-cx-line bg-cx-raised px-2.5 text-[12px] text-cx-muted hover:text-cx-text"
      >
        <span className="text-cx-faint">Scope</span> {value}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <ul className={`absolute left-0 z-50 w-48 ${up ? "bottom-full mb-1" : "top-full mt-1"} rounded-md border border-cx-strong bg-cx-raised p-1 shadow-2xl`}>
          {[ALL_SCOPE, ...TERRITORIES].map((t) => (
            <li key={t}>
              <button
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[12.5px] text-cx-muted hover:bg-cx-hover hover:text-cx-text"
              >
                {t}
                {t === value && <Check className="h-3 w-3" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
