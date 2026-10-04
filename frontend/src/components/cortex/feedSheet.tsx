"use client";

// The "View all" drawer behind Insights and Since this morning, and the demo-scope chip the
// cards carry (1 Oct 2026 corrections). The cards stay narratively tight during a walkthrough;
// the drawer holds everything, narrowed by territory, agent or whatever facets the caller names.

import React, { useEffect, useMemo, useState } from "react";
import { Filter, X } from "lucide-react";
import { DEMO_SCENARIO, useDemoScope } from "@/data/demo";
import { Dropdown, NoDataCard } from "./kit";

/** One filter in the drawer: a label and how to read its value off an item. */
export interface Facet<T> {
  key: string;
  label: string;
  of: (x: T) => string | undefined;
  /** fixed option order; otherwise the values found, sorted */
  options?: string[];
}

export function FeedSheet<T>({
  title,
  subtitle,
  items,
  getId,
  inScenario,
  facets,
  renderRow,
  focusId,
  onClose,
}: {
  title: string;
  subtitle: React.ReactNode;
  items: T[];
  getId: (x: T) => string;
  /** whether an item belongs to the walkthrough thread */
  inScenario: (x: T) => boolean;
  facets: Facet<T>[];
  renderRow: (x: T, i: number, focused: boolean) => React.ReactNode;
  focusId?: string | null;
  onClose: () => void;
}) {
  const [scope, setScope] = useDemoScope();
  const [picked, setPicked] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);

  const rows = useMemo(
    () => items.filter((x) => (!scope || inScenario(x)) && facets.every((f) => !picked[f.key] || f.of(x) === picked[f.key])),
    [items, scope, picked, facets, inScenario]
  );
  const anyFilter = Object.values(picked).some(Boolean);
  const scenarioCount = items.filter(inScenario).length;

  // deep link: scroll to and flash the item that was clicked
  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`sheet-${focusId}`);
    if (!el) return;
    el.scrollIntoView({ block: "start" });
    el.classList.remove("cx-flash");
    void el.offsetWidth;
    el.classList.add("cx-flash");
  }, [focusId, rows]);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/50" onClick={onClose}>
      <aside
        role="dialog"
        aria-label={title}
        className="flex h-full w-full max-w-[min(860px,70vw)] flex-col border-l border-cx-strong bg-cx-bg max-md:max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-cx-line px-9 pb-4 pt-8 max-md:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[20px] font-medium leading-none tracking-[-0.01em] text-cx-text">{title}</h2>
              <p className="mt-1.5 text-[12px] text-cx-faint">{subtitle}</p>
            </div>
            <button onClick={onClose} className="rounded-md p-1 text-cx-faint hover:bg-cx-hover hover:text-cx-text" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <Filter className="mr-0.5 h-3.5 w-3.5 text-cx-faint" aria-hidden />
            {facets.map((f) => {
              const options = f.options ?? Array.from(new Set(items.map(f.of).filter(Boolean) as string[])).sort();
              return <Dropdown key={f.key} label={f.label} value={picked[f.key] ?? null} options={options} onChange={(v) => setPicked((p) => ({ ...p, [f.key]: v }))} />;
            })}
            <button
              onClick={() => setScope(!scope)}
              aria-pressed={scope}
              title={`${DEMO_SCENARIO.name} · ${scenarioCount} of ${items.length}`}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] ${scope ? "border-[#2f6fed]/60 bg-[#2f6fed]/15 text-cx-text" : "border-cx-line bg-cx-panel text-cx-muted hover:text-cx-text"}`}
            >
              {DEMO_SCENARIO.short} <span className="font-data text-[11px] text-cx-faint">{scenarioCount}</span>
            </button>
            <span className="ml-1 text-[12px] text-cx-faint">
              Showing <span className="font-data text-cx-muted">{rows.length}</span> of <span className="font-data text-cx-muted">{items.length}</span>
            </span>
            {(anyFilter || scope) && (
              <button
                onClick={() => {
                  setPicked({});
                  setScope(false);
                }}
                className="text-[12px] text-cx-muted hover:text-cx-text"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <ol className="min-h-0 flex-1 overflow-y-auto px-9 py-2 max-md:px-5">
          {items.length === 0 && (
            <li>
              <NoDataCard bare title="No data yet" detail="The backend sent nothing for this list on the current data date." />
            </li>
          )}
          {items.length > 0 && rows.length === 0 && (
            <li className="px-3 py-16 text-center text-[13px] text-cx-faint">
              Nothing matches these filters.{" "}
              <button
                onClick={() => {
                  setPicked({});
                  setScope(false);
                }}
                className="text-[#4f86f7] hover:underline"
              >
                Clear them
              </button>
              .
            </li>
          )}
          {rows.map((x, i) => (
            <li
              id={`sheet-${getId(x)}`}
              key={getId(x)}
              aria-current={focusId === getId(x) ? "true" : undefined}
              className={`scroll-mt-4 border-t px-3 py-7 first:border-t-0 ${focusId === getId(x) ? "rounded-lg border-transparent bg-[#2f6fed]/[0.09] shadow-[inset_3px_0_0_#4f86f7]" : "border-cx-line"}`}
            >
              {renderRow(x, i, focusId === getId(x))}
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

/**
 * What a feed card shows in place of its list: the "No data" card when the backend sent nothing, or — when there is
 * data but the walkthrough thread holds none of it — one line that turns the thread off.
 */
export function FeedEmpty({ total, what, source }: { total: number; what: string; source: string }) {
  const [, setScope] = useDemoScope();
  if (total === 0) return <NoDataCard bare title={`No ${what} yet`} detail={`The backend sent no ${what} for the current data date.`} source={source} />;
  return (
    <p className="border-t border-cx-line py-6 text-center text-[12.5px] text-cx-faint">
      Nothing in {DEMO_SCENARIO.short} ·{" "}
      <button onClick={() => setScope(false)} className="text-[#4f86f7] hover:underline">
        Show all {total}
      </button>
    </p>
  );
}

/** The chip a card carries while demo scope is trimming it; clicking shows everything. */
export function DemoScopeChip({ shown, total }: { shown: number; total: number }) {
  const [scope, setScope] = useDemoScope();
  return (
    <button
      onClick={() => setScope(!scope)}
      aria-pressed={scope}
      title={scope ? `Showing ${DEMO_SCENARIO.name}. Click to show all ${total}.` : `Showing all ${total}. Click to narrow to ${DEMO_SCENARIO.name}.`}
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-[11px] ${
        scope ? "border-[#2f6fed]/50 bg-[#2f6fed]/10 text-[color:var(--ai-ink)]" : "border-cx-line text-cx-faint hover:border-cx-strong hover:text-cx-text"
      }`}
    >
      {scope ? DEMO_SCENARIO.short : "All"} <span className="font-data text-cx-faint">{shown}/{total}</span>
    </button>
  );
}
