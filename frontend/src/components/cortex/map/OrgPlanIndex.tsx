"use client";

// Market Action Plans, org-wide — the Head of Sales's index (2 Oct 2026).
//
// The ASM opens one plan: their own, this month. The Head of Sales opens every ASM's plan for
// every month, so the page has to answer "where is the org" before it answers "which plan". A
// month band carries that: one row per ASM under one heading that already states the month's delivery, newest month
// first. Narrow by Region, ASM or Territory; the top-bar period filter still picks the
// months. Opening a row is the same plan detail the ASM reads, read-only.

import React, { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { ORG_PLANS, ORG_SE_COUNT, OWN_REGION, OrgPlan, execsOf, orgInitiatives, orgStats } from "@/data/org";
import { REGIONS, TERRITORY_COUNT } from "@/data/leadership";
import { AgentPageHeader, DotStatus } from "../agentPage";
import { card, Dropdown } from "../kit";
import { SummaryRow } from "./SummaryRow";
import { periodDetail, periodMonths, usePeriod } from "../period";
import { useOctPlan } from "./octPlan";

const MONTH_ORDER = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
const ASMS = REGIONS.map((r) => `${r.asm} · ${r.name}`);
const TERRITORIES = REGIONS.flatMap((r) => r.territories).sort();

function statusOf(p: OrgPlan) {
  if (!p.created) return { label: "Not created", color: "#7c7f89" };
  if (p.status === "progress") return { label: "Locked · live", color: "#4f86f7" };
  return { label: "Closed", color: "#2fa85c" };
}

export function OrgPlanIndex({ onOpen }: { onOpen: (plan: OrgPlan) => void }) {
  const [period] = usePeriod();
  const oct = useOctPlan();
  const [region, setRegion] = useState<string | null>(null);
  const [asm, setAsm] = useState<string | null>(null);
  const [exec, setExec] = useState<string | null>(null);
  const [territory, setTerritory] = useState<string | null>(null);

  // The Sales Executive filter only exists under one ASM: a flat list of every name tells you
  // nothing about who they report to.
  const asmRegion = REGIONS.find((r) => `${r.asm} · ${r.name}` === asm) ?? (region ? REGIONS.find((r) => r.name === region) : undefined);
  const team = asmRegion ? execsOf(asmRegion.name) : [];
  const pickAsm = (v: string | null) => {
    setAsm(v);
    setExec(null);
  };
  const pickRegion = (v: string | null) => {
    setRegion(v);
    setAsm(null);
    setExec(null);
  };

  // The viewing ASM's October plan appears across the org the moment it is saved in MAP Studio
  const plans = useMemo(
    () =>
      ORG_PLANS.map((p) =>
        p.region === OWN_REGION && p.month === "Oct" && oct?.saved
          ? { ...p, created: true, versions: 1, initiatives: oct.rows.length, estimateL: Math.round(oct.rows.reduce((n, d) => n + d.targetL, 0) * 10) / 10, achievedL: null, note: `Saved ${oct.savedAt} · starts 1 Oct` }
          : p
      ),
    [oct]
  );

  const inPeriod = new Set(periodMonths(period).map((m) => m.month as string));
  const rows = plans.filter((p) => {
    if (!inPeriod.has(p.month) && p.month !== "Oct") return false;
    if (region && p.region !== region) return false;
    if (asm && `${p.asm} · ${p.region}` !== asm) return false;
    if (territory && !p.territories.includes(territory)) return false;
    // a Sales Executive's plans are the ones carrying an initiative they own
    if (exec && !orgInitiatives(p.id).some((i) => i.owner === exec)) return false;
    return true;
  });

  const months = MONTH_ORDER.filter((m) => rows.some((p) => p.month === m)).reverse();
  const created = rows.filter((p) => p.created);

  // The KPI row counts only the months the period covers — October sits outside every past
  // period, and is accounted for by its own line below rather than by a zero in the figures.
  const inScope = (p: OrgPlan) => (!region || p.region === region) && (!asm || `${p.asm} · ${p.region}` === asm) && (!territory || p.territories.includes(territory)) && (!exec || orgInitiatives(p.id).some((i) => i.owner === exec));
  const periodScope = periodMonths(period).map((m) => m.month as string);
  const k = orgStats(periodScope, inScope);
  const scopeNote = asm ? asm : region ? `${region} · 1 ASM` : exec ? `${exec}'s initiatives` : `${REGIONS.length} ASMs`;
  // a flag only sits on an open row, so a multi-month period's flags are all in the live month
  const liveMonth = ORG_PLANS.find((p) => p.status === "progress")?.label;
  const clearable = region || asm || exec || territory;
  const clear = () => {
    setRegion(null);
    setAsm(null);
    setExec(null);
    setTerritory(null);
  };

  return (
    <div className="pb-24">
      <AgentPageHeader
        agent="map"
        title="Market Action Plans"
        meta={
          <>
            Every ASM's plan, every month · {REGIONS.length} regions · {TERRITORY_COUNT} territories · {ORG_SE_COUNT} Sales Executives · read-only
          </>
        }
      />
      <div className="space-y-5 px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <Dropdown label="Region" value={region} options={REGIONS.map((r) => r.name)} onChange={pickRegion} placeholder={`All ${REGIONS.length}`} />
          <Dropdown label="ASM" value={asm} options={ASMS} onChange={pickAsm} placeholder={`All ${REGIONS.length}`} />
          {team.length > 0 && (
            <Dropdown label="Sales Executive" value={exec} options={team.map((e) => e.name)} onChange={setExec} placeholder={`All ${team.length}`} />
          )}
          <Dropdown label="Territory" value={territory} options={asmRegion ? [...asmRegion.territories] : TERRITORIES} onChange={setTerritory} placeholder={`All ${asmRegion ? asmRegion.territories.length : TERRITORY_COUNT}`} />
          <span className="ml-1 text-[12px] text-cx-faint">
            <span className="font-data text-cx-muted">{created.length}</span> plan{created.length === 1 ? "" : "s"} in {periodDetail(period)}
          </span>
          {clearable && (
            <button onClick={clear} className="text-[12px] text-cx-muted hover:text-cx-text">
              Clear
            </button>
          )}
        </div>

        <SummaryRow
          label={`Market Action Plans, ${periodDetail(period)}`}
          cells={[
            {
              label: "Plans created",
              value: `${k.created} of ${k.possible}`,
              sub: k.created === k.possible ? <>Nothing missing across {scopeNote}</> : <>{k.possible - k.created} not created · {scopeNote}</>,
            },
            {
              label: "Plans closed",
              value: `${k.closed} of ${k.created}`,
              sub: k.closed === 0 ? <>All {k.live} still live · each closes on its month-end</> : k.live ? <>{k.live} still live · the rest closed on month-end</> : <>Every plan closed on month-end</>,
              live: k.live > 0,
            },
            {
              label: "Achieved vs target",
              value: `₹${k.achievedL.toFixed(1)} L · ${k.pct}%`,
              sub: <>of ₹{k.estimateL.toFixed(1)} L targeted · {periodDetail(period)}</>,
              live: k.live > 0,
            },
            {
              // only an open row counts, so a period of closed months reads zero and a
              // period that includes the live one says where its flags actually sit
              label: "Flagged",
              value: String(k.flagged),
              live: k.flagged > 0,
              sub: k.flagged ? (
                <>
                  {k.tracker} in Tracker · {k.pitch} in Pitch{k.both ? <> · {k.both} in both</> : null}
                  {liveMonth && periodScope.length > 1 ? <> · all in {liveMonth}</> : null}
                </>
              ) : (
                <>Nothing open · every plan in {periodDetail(period)} closed</>
              ),
            },
          ]}
        />
        {months.length === 0 && (
          <div className={`${card} px-6 py-12 text-center`}>
            <h2 className="text-[15px] font-medium text-cx-text">No plan matches these filters</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-cx-muted">
              {periodDetail(period)} holds no plan for this slice of the org.{" "}
              <button onClick={clear} className="text-[#4f86f7] hover:underline">
                Clear the filters
              </button>{" "}
              or widen the period in the top bar.
            </p>
          </div>
        )}

        {months.map((month) => (
          <MonthBand key={month} month={month} rows={rows.filter((p) => p.month === month)} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

/** One month: a heading that already states the month's delivery, then its ASM rows. */
function MonthBand({ month, rows, onOpen }: { month: string; rows: OrgPlan[]; onOpen: (p: OrgPlan) => void }) {
  const ordered = [...rows].sort((a, b) => REGIONS.findIndex((r) => r.name === a.region) - REGIONS.findIndex((r) => r.name === b.region));
  const made = ordered.filter((p) => p.created);
  const est = made.reduce((n, p) => n + (p.estimateL ?? 0), 0);
  const del = made.reduce((n, p) => n + (p.achievedL ?? 0), 0);
  const pct = est ? Math.round((del / est) * 100) : null;
  const label = ordered[0].label;
  const th = "px-3 py-2.5 text-left text-[11px] font-normal text-cx-faint";

  // nothing to open yet: one line, so the live month keeps the first viewport
  if (made.length === 0)
    return (
      <section aria-label={label} className={`${card} flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5`}>
        <h2 className="text-[14px] font-medium text-cx-text">{label}</h2>
        <p className="text-[12.5px] text-cx-muted">
          Not created yet · <span className="font-data">0</span> of {ordered.length} ASM plans. Each one opens here when its ASM saves it in MAP Studio.
        </p>
      </section>
    );

  return (
    <section aria-label={label} className={`${card} overflow-hidden`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-cx-line px-5 py-3.5">
        <h2 className="text-[14px] font-medium text-cx-text">{label}</h2>
        <p className="text-[12.5px] text-cx-muted">
          <span className="font-data text-cx-text">{made.length}</span> of {ordered.length} ASM plans ·{" "}
          {del > 0 ? (
            <>
              <span className="font-data text-cx-text">₹{del.toFixed(1)} L</span> delivered of <span className="font-data">₹{est.toFixed(1)} L</span>
              {pct != null && <span className="text-cx-faint"> · {pct}%</span>}
            </>
          ) : (
            <>
              <span className="font-data text-cx-text">₹{est.toFixed(1)} L</span> planned · delivery starts with the month
            </>
          )}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] table-fixed">
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[15%]" />
            <col className="w-[8%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[7%]" />
            <col className="w-[120px]" />
          </colgroup>
          <thead className="border-b border-cx-line">
            <tr>
              <th className={`${th} pl-5`}>ASM · region</th>
              <th className={th}>Status</th>
              <th className={th}>Version</th>
              <th className={`${th} text-right`}>Initiatives</th>
              <th className={`${th} text-right`}>Estimated</th>
              <th className={`${th} text-right`}>Delivered</th>
              <th className={`${th} text-right`}>%</th>
              <th className={`${th} pr-5`} />
            </tr>
          </thead>
          <tbody className="divide-y divide-cx-line">
            {ordered.map((p) => {
              const st = statusOf(p);
              const rowPct = p.estimateL && p.achievedL != null ? Math.round((p.achievedL / p.estimateL) * 100) : null;
              const open = () => p.created && onOpen(p);
              return (
                <tr key={p.id} className={p.created ? "cursor-pointer hover:bg-cx-hover/40" : ""} onClick={open}>
                  <td className="py-3 pl-5 pr-3">
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-cx-line bg-cx-raised font-data text-[10.5px] text-cx-muted">{p.initials}</span>
                      <span className="min-w-0">
                        <span className="block text-[13px] text-cx-text">{p.asm}</span>
                        <span className="block truncate text-[11.5px] text-cx-faint">
                          {p.region} · {p.territories.length} territories
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <DotStatus color={st.color}>{st.label}</DotStatus>
                  </td>
                  <td className="px-3 py-3 font-data text-[12px] text-cx-muted">{p.versions ? `v${p.versions}` : "—"}</td>
                  <td className="px-3 py-3 text-right font-data text-[12.5px] text-cx-text">{p.initiatives || "—"}</td>
                  <td className="px-3 py-3 text-right font-data text-[12.5px] text-cx-text">{p.estimateL != null ? `₹${p.estimateL.toFixed(1)} L` : "—"}</td>
                  <td className="px-3 py-3 text-right font-data text-[12.5px] text-cx-text">{p.achievedL != null ? `₹${p.achievedL.toFixed(1)} L` : p.created ? "Starts 1 Oct" : "—"}</td>
                  <td className="px-3 py-3 text-right font-data text-[12.5px] text-cx-text">{rowPct != null ? `${rowPct}%` : "—"}</td>
                  <td className="py-3 pl-3 pr-5 text-right">
                    {p.created ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          open();
                        }}
                        className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] text-[#4f86f7] hover:underline"
                      >
                        Open <ArrowRight className="h-3 w-3" />
                      </button>
                    ) : (
                      <span className="whitespace-nowrap text-[12px] text-cx-faint">Waiting on {p.asm}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
