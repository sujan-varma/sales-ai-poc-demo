"use client";

// Two logs, deliberately different.
// Roll-up Action Log: the month in a paragraph, with the numbers one click away — never the 50 items.
// Priority log: the 83 open actions, ranked by Sales AI into tiers 1–6, a tier at a time.

import { LBL } from "@/data/labels";
import React, { useState } from "react";
import { ChevronDown, ChevronRight, ListOrdered, ScrollText, UserMinus } from "lucide-react";
import { useCortexNav } from "../nav";
import { ROLLUP, ROLLUP_THEMES, TIER_ITEMS, TIERS, TOOL_COUNTS, REGIONS } from "@/data/leadership";
import { AiTag } from "../ai";
import { AgentIcon, StatusBadge } from "../primitives";
import { card, CardHeader, Dropdown, Eyebrow, KpiStripes, blueRamp } from "../kit";
import { useStatusMeta } from "../statusPalette";

const L = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 1 })}L`;
const Num = ({ children }: { children: React.ReactNode }) => <span className="font-data text-cx-text">{children}</span>;

// ---------------------------------------------------------------------------
// Roll-up Action Log
// ---------------------------------------------------------------------------

/** A labelled horizontal split, e.g. accepted vs rejected. */
function Split({ label, parts }: { label: string; parts: { label: string; n: number; color: string }[] }) {
  const total = parts.reduce((a, p) => a + p.n, 0);
  return (
    <div>
      <p className="flex items-baseline justify-between gap-2 text-[12px] text-cx-muted">
        {label} <span className="font-data text-cx-text">{total}</span>
      </p>
      <div className="mt-1.5 flex h-2 gap-[2px] overflow-hidden rounded-sm">
        {parts.map((p) => (
          <span key={p.label} style={{ flex: p.n, background: p.color }} title={`${p.label}: ${p.n}`} />
        ))}
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] text-cx-faint">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} /> {p.label} <span className="font-data text-cx-text">{p.n}</span>
          </span>
        ))}
      </p>
    </div>
  );
}

export function RollupLog() {
  const { meta } = useStatusMeta();
  const [open, setOpen] = useState(false);
  const r = ROLLUP;
  const p = Math.round((r.achievedL / r.plannedL) * 100);
  const filled = Math.round(p / 5);
  const ramp = blueRamp(filled);
  const [lead, second] = [...ROLLUP_THEMES].sort((a, b) => b.initiatives - a.initiatives);
  const best = ROLLUP_THEMES.reduce((a, t) => (t.achievedL / t.plannedL > a.achievedL / a.plannedL ? t : a));
  const maxTool = Math.max(...TOOL_COUNTS.map((t) => t.n));

  return (
    <section id="rollup" aria-labelledby="rollup-title" className={`${card} flex h-full flex-col p-5`}>
      <CardHeader
        id="rollup-title"
        icon={<ScrollText className="h-4 w-4" />}
        title="September in summary"
        badge={<AiTag />}
        right={<span className="text-[11.5px] text-cx-faint">{r.month} · all {LBL.regions}</span>}
      />

      <div className="mt-4 grid gap-y-5">
        {/* the month in a paragraph: lead with the sentence, the numbers wait below */}
        <div>
          <p className="text-[20px] font-medium leading-[1.3] tracking-[-0.01em] text-cx-text [text-wrap:balance]">
            {L(r.achievedL)} of {L(r.plannedL)} planned impact landed in {r.month}, with a day to go.
          </p>
          <p className="mt-3 max-w-[72ch] text-[13.5px] leading-relaxed text-cx-muted">
            Sales AI synced <Num>{r.actions}</Num> actions from four tools into <Num>{r.initiatives}</Num> initiatives. ASMs accepted <Num>{r.accepted}</Num>, and <Num>{r.completed}</Num> are done. {lead.theme} carried
            the month: <Num>{lead.initiatives}</Num> initiatives delivered <Num>{L(lead.achievedL)}</Num> of {L(lead.plannedL)}. {second.theme} is the lag, <Num>{second.initiatives}</Num> initiatives at{" "}
            <Num>{L(second.achievedL)}</Num> of {L(second.plannedL)}, most still in progress. {best.theme} came closest to plan, <Num>{L(best.achievedL)}</Num> of {L(best.plannedL)}.
          </p>
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <Eyebrow>Planned impact landed</Eyebrow>
            <span className="font-data text-[20px] leading-none text-cx-text">{p}%</span>
          </div>
          <div className="mt-3">
            <KpiStripes
              fills={Array.from({ length: 20 }, (_, i) => (i < filled ? ramp(i) : null))}
              tip={(i) => [i < filled ? `Achieved · ${i * 5}–${(i + 1) * 5}% of planned impact` : `Not yet · ${i * 5}–${(i + 1) * 5}%`, `Each stripe = 5% · dashed line = ${L(r.plannedL)} planned`]}
            />
          </div>
          <p className="mt-2 text-[11.5px] text-cx-faint">
            {L(r.achievedL)} achieved · {L(r.plannedL - r.achievedL)} still to land from {r.wip} initiatives in progress
          </p>
        </div>
      </div>

      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-auto inline-flex items-center gap-1 self-start pt-4 text-[12px] text-cx-muted hover:text-cx-text">
        {open ? "Hide the numbers" : "Show the numbers"} <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="cx-land-fade mt-4 grid gap-y-7 border-t border-cx-line pt-5">
          <div>
            <Eyebrow>Actions each tool created</Eyebrow>
            <ul className="mt-3 space-y-2.5">
              {TOOL_COUNTS.map((t) => (
                <li key={t.tool} className="grid grid-cols-[20px_minmax(0,1fr)_40px] items-center gap-2.5">
                  {t.agent === "churn" ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-md border border-dashed border-cx-strong text-cx-faint">
                      <UserMinus className="h-3 w-3" />
                    </span>
                  ) : (
                    <AgentIcon agent={t.agent} size="sm" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] text-cx-text">{t.tool}</span>
                    {t.n ? (
                      <span className="mt-1 block h-1 rounded-sm bg-[#4f86f7]" style={{ width: `${(t.n / maxTool) * 100}%`, opacity: 0.45 + 0.55 * (t.n / maxTool) }} />
                    ) : (
                      <span className="block text-[11px] text-cx-faint">Not live yet</span>
                    )}
                  </span>
                  <span className="text-right font-data text-[12.5px] text-cx-text">{t.n || "–"}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-md border border-cx-line bg-cx-raised px-3 py-2.5 text-[12px] leading-snug text-cx-muted">
              After syncing across tools at state level, Sales AI merged <Num>{r.duplicatesMerged}</Num> duplicates and generated <Num>{r.initiatives}</Num> initiatives from the <Num>{r.actions}</Num> actions.
            </p>
          </div>
          <div className="space-y-5">
            <Eyebrow>What happened to the {r.initiatives} initiatives</Eyebrow>
            <Split
              label="Accepted vs rejected by ASMs"
              parts={[
                { label: "Accepted", n: r.accepted, color: "#4f86f7" },
                { label: "Rejected", n: r.rejected, color: "rgb(var(--cx-strong))" },
              ]}
            />
            <Split
              label="Of the accepted"
              parts={[
                { label: "Completed", n: r.completed, color: meta.done.color },
                { label: "Still in progress", n: r.wip, color: meta.progress.color },
              ]}
            />
            <p className="text-[11.5px] leading-snug text-cx-faint">Rejected: {r.rejectedWhy}.</p>
          </div>
          <div>
            <Eyebrow>By theme · impact planned → achieved</Eyebrow>
            <ul className="mt-3 space-y-3">
              {ROLLUP_THEMES.map((t) => {
                const tp = t.achievedL / t.plannedL;
                return (
                  <li key={t.theme}>
                    <p className="flex items-baseline justify-between gap-2 text-[12.5px]">
                      <span className="min-w-0 truncate text-cx-text">
                        {t.theme} <span className="font-data text-[11px] text-cx-faint">· {t.initiatives}</span>
                      </span>
                      <span className="shrink-0 font-data text-[11.5px] text-cx-muted">
                        {L(t.achievedL)} <span className="text-cx-faint">/ {L(t.plannedL)}</span>
                      </span>
                    </p>
                    <span className="relative mt-1 block h-1.5 rounded-sm bg-cx-line">
                      <span className="absolute inset-y-0 left-0 rounded-sm bg-[#4f86f7]" style={{ width: `${tp * 100}%`, opacity: 0.45 + 0.55 * tp }} />
                    </span>
                    <p className="mt-1 text-[11px] text-cx-faint">
                      {t.accepted} accepted · {t.completed} done · {t.note}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Priority-tiered log
// ---------------------------------------------------------------------------

/** Severity colours (DESIGN.md "Severity ramp"): existing status hues, one per tier. */
export const TIER_COLOR: Record<number, string> = {
  1: "#d64550", // Critical
  2: "#e85a70", // High
  3: "#e0b43a", // Elevated
  4: "#7c7f89", // Standard
  5: "#7c7f89", // Low (lighter, see TIER_OPACITY)
  6: "#7c7f89", // Watch (lightest)
};
/** 4–6 share the neutral grey and step down in strength, so the ramp reads as declining. */
export const TIER_OPACITY: Record<number, number> = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 0.7, 6: 0.45 };

/** Signal-strength glyph: priority 1 fills all six bars, priority 6 fills one, in the tier's colour. */
function TierGlyph({ n, on }: { n: number; on: boolean }) {
  return (
    <span className="flex items-end gap-[2px]" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="w-[2px] rounded-[1px]" style={{ height: 4 + i * 1.4, background: i < 7 - n ? TIER_COLOR[n] : "rgb(var(--cx-strong))", opacity: i < 7 - n ? TIER_OPACITY[n] : 1 }} />
      ))}
    </span>
  );
}

const PAGE = 12;

export function PriorityLog({ fixedRegion }: { fixedRegion?: string } = {}) {
  const [tier, setTier] = useState(1);
  const [regionPick, setRegion] = useState<string | null>(null);
  const region = fixedRegion ?? regionPick;
  const [status, setStatus] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const statusLabel: Record<string, string> = { delayed: "Delayed", progress: "In progress", unassigned: "No owner" };
  const pool = (n: number) => TIER_ITEMS[n].filter((x) => !fixedRegion || x.region === fixedRegion);
  const items = TIER_ITEMS[tier]
    .filter((x) => (!region || x.region === region) && (!status || statusLabel[x.status] === status))
    .sort((a, b) => ["delayed", "unassigned", "progress"].indexOf(a.status) - ["delayed", "unassigned", "progress"].indexOf(b.status));
  const shown = all ? items : items.slice(0, PAGE);
  const t = TIERS[tier - 1];
  const total = TIERS.reduce((n, x) => n + pool(x.n).length, 0);
  const delayed = pool(tier).filter((x) => x.status === "delayed").length;

  return (
    <section id="priority-log-full" aria-labelledby="prio-title" className={card}>
      <div className="p-5 pb-4">
        <CardHeader
          id="prio-title"
          icon={<ListOrdered className="h-4 w-4" />}
          title="Priority log"
          badge={<AiTag />}
          right={<span className="text-[11.5px] text-cx-faint">{total} open actions, ranked by Sales AI into 6 tiers</span>}
        />
        <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Priority tier">
          {TIERS.map((x) => {
            const on = tier === x.n;
            return (
              <button
                key={x.n}
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setTier(x.n);
                  setAll(false);
                }}
                className={`inline-flex h-8 items-center gap-2 rounded-full border pl-2.5 pr-3 text-[12px] transition-colors ${on ? "text-cx-text" : "border-cx-line text-cx-muted hover:border-cx-strong hover:text-cx-text"}`}
                style={on ? { borderColor: `${TIER_COLOR[x.n]}99`, background: `${TIER_COLOR[x.n]}1f` } : undefined}
              >
                <TierGlyph n={x.n} on={on} />
                <span>
                  Priority {x.n} <span className="hidden text-cx-faint sm:inline">· {x.label}</span>
                </span>
                <span className="font-data text-[11px] text-cx-faint">{pool(x.n).length}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-cx-line px-5 py-3">
        <p className="text-[12.5px] text-cx-muted">
          <span className="inline-flex items-center gap-1.5 text-cx-text">
            <span className="h-2 w-2 rounded-full" style={{ background: TIER_COLOR[t.n], opacity: TIER_OPACITY[t.n] }} aria-hidden /> Priority {t.n} · {t.label}
          </span>{" "}
          · {t.desc} · <span className="font-data text-cx-text">{pool(tier).length}</span> actions
          {delayed > 0 && (
            <>
              , <span className="font-data text-cx-text">{delayed}</span> delayed
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {!fixedRegion && <Dropdown label="Region" value={region} options={REGIONS.map((r) => r.name)} onChange={setRegion} />}
          <Dropdown label="Status" value={status} options={["Delayed", "In progress", "No owner"]} onChange={setStatus} />
        </div>
      </div>
      <ol className="divide-y divide-cx-line" role="tabpanel">
        {shown.length === 0 && <li className="px-5 py-8 text-center text-[12.5px] text-cx-faint">Nothing in priority {tier} matches these filters.</li>}
        {shown.map((x, i) => (
          <li key={x.id} className="grid grid-cols-[28px_20px_minmax(0,1fr)] items-start gap-x-3 px-5 py-3 hover:bg-cx-hover/40 md:grid-cols-[28px_20px_minmax(0,1fr)_88px_120px_104px] md:items-center">
            <span className="pt-0.5 font-data text-[11px] text-cx-faint md:pt-0">{String(i + 1).padStart(2, "0")}</span>
            <AgentIcon agent={x.source} size="sm" />
            <span className="min-w-0">
              <span className="block text-[13px] leading-snug text-cx-text md:truncate" title={x.title}>
                {x.title}
              </span>
              <span className="block truncate text-[11px] text-cx-faint">
                {x.territory} · {x.region} · {x.owner === "No owner" ? "no owner yet" : x.owner}
              </span>
              {/* on phones the right-hand columns fold under the title */}
              <span className="mt-1.5 flex flex-wrap items-center gap-2 md:hidden">
                <StatusBadge status={x.status} />
                <span className="font-data text-[11px] text-cx-muted">{x.impact}</span>
                <span className="text-[11px] text-cx-faint">{x.due}</span>
              </span>
            </span>
            <span className="hidden text-right font-data text-[12px] text-cx-text md:block">{x.impact}</span>
            <span className="hidden truncate text-[11.5px] text-cx-muted md:block">{x.due}</span>
            <span className="hidden justify-end md:flex">
              <StatusBadge status={x.status} />
            </span>
          </li>
        ))}
      </ol>
      {items.length > PAGE && (
        <div className="border-t border-cx-line px-5 py-3">
          <button onClick={() => setAll((a) => !a)} className="inline-flex items-center gap-1 text-[12px] text-cx-muted hover:text-cx-text">
            {all ? `Show the top ${PAGE}` : `Show all ${items.length} in priority ${tier}`} <ChevronDown className={`h-3 w-3 ${all ? "rotate-180" : ""}`} />
          </button>
        </div>
      )}
    </section>
  );
}

/** Home: the top 7 of the priority log, with the full list one click away. */
export function PriorityTop({ n = 7 }: { n?: number }) {
  const go = useCortexNav();
  const order = ["delayed", "unassigned", "progress"];
  const top = TIERS.flatMap((t) => [...TIER_ITEMS[t.n]].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status)).map((x) => ({ ...x, tier: t.n }))).slice(0, n);
  const total = Object.values(TIER_ITEMS).reduce((k, xs) => k + xs.length, 0);
  return (
    <section id="priority-log-top" aria-labelledby="ptop-title" className={`${card} flex h-full flex-col`}>
      <div className="p-5 pb-3">
        <CardHeader
          id="ptop-title"
          icon={<ListOrdered className="h-4 w-4" />}
          title="Priority log"
          badge={<AiTag />}
          right={
            <button onClick={() => go("priority-log")} className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] text-cx-muted hover:text-cx-text">
              View all {total} <ChevronRight className="h-3 w-3" />
            </button>
          }
        />
      </div>
      <ol className="grid flex-1 auto-rows-fr divide-y divide-cx-line border-t border-cx-line">
        {top.map((x, i) => (
          <li key={x.id} className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-x-3 px-5 py-2.5 hover:bg-cx-hover/40">
            <span className="font-data text-[11px] text-cx-faint">{String(i + 1).padStart(2, "0")}</span>
            <span className="min-w-0">
              <span className="block text-[13px] leading-snug text-cx-text md:truncate" title={x.title}>
                {x.title}
              </span>
              <span className="mt-0.5 flex items-center gap-2 text-[11px] text-cx-faint">
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <TierGlyph n={x.tier} on={false} /> <span style={{ color: TIER_COLOR[x.tier], opacity: TIER_OPACITY[x.tier] }}>P{x.tier}</span> {TIERS[x.tier - 1].label}
                </span>
                <span className="truncate">
                  {x.territory} · {x.owner === "No owner" ? "no owner yet" : x.owner} · {x.due}
                </span>
              </span>
            </span>
            <StatusBadge status={x.status} />
          </li>
        ))}
      </ol>
    </section>
  );
}
