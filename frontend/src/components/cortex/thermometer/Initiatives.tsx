"use client";

// Initiatives: the reference's lever drilldowns, reached from a Scorecard row (or the
// initiative grid under the Scorecard). Each opens in a side sheet, scoped to one region or
// territory, scrolled to the KPI that sent you there.

import { LBL } from "@/data/labels";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { CUR, ChannelPartner, EXPECTED_TODAY, FY_MONTHS, Group, LEVERS, Rag3, RAG_COLOR, VALUE_GUIDE, cpValue, fmtL, fmtN, fmtPct } from "@/data/thermometer";
import { AgentIcon } from "../primitives";
import { card } from "../kit";
import {
  INITIATIVES,
  INITIATIVE_SECTIONS,
  InitiativeId,
  RET_GUIDE,
  DEGROW_MAX,
  activeMonths,
  appOf,
  applOf,
  beatOf,
  clr,
  dealerExp,
  degrowOf,
  distExp,
  initiativeStatus,
  orderOf,
  recruitOf,
  retExp,
  schemeOf,
  tertiaryOf,
  trainingOf,
} from "./engine";
import { Col, Fig, NA, RagChip, Seg, TNode, TreeTable } from "./ui";

const pc = (n: number, d: number) => (d > 0 ? (n / d) * 100 : null);
const std = (p: number | null): Rag3 => (p == null ? "na" : p >= 100 ? "green" : p >= 90 ? "amber" : "red");
const chip = (p: number | null, rag: Rag3) => (p == null ? <NA /> : <RagChip rag={rag}>{fmtPct(p)}</RagChip>);

const KPI_COLS: Col[] = [
  { key: "t", label: "Target", width: 110 },
  { key: "a", label: "Achievement", width: 110 },
  { key: "p", label: "Achievement %", width: 120 },
];
const kpi = (id: string, label: string, target: React.ReactNode, ach: React.ReactNode, pct: number | null, rag: Rag3, o: { detail?: React.ReactNode; sub?: string; flash?: boolean; extra?: React.ReactNode[] } = {}): TNode => ({
  id,
  label,
  sub: o.sub,
  detail: o.detail,
  flash: o.flash,
  cells: [target, ach, chip(pct, rag), ...(o.extra ?? [])],
});

function PartnerList({ list, cols }: { list: ChannelPartner[]; cols: { label: string; v: (c: ChannelPartner) => React.ReactNode; right?: boolean }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] table-fixed text-[12px]">
        <thead>
          <tr className="border-b border-cx-line text-[11px] text-cx-faint">
            <th className="w-[230px] py-2 text-left font-normal">Partner</th>
            <th className="w-[110px] py-2 text-left font-normal">Territory</th>
            <th className="w-[96px] py-2 text-left font-normal">Appointed</th>
            {cols.map((c) => (
              <th key={c.label} className={`py-2 font-normal ${c.right === false ? "text-left" : "text-right"}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.length === 0 && (
            <tr>
              <td colSpan={3 + cols.length} className="py-4 text-center text-cx-faint">
                No partners in this scope.
              </td>
            </tr>
          )}
          {list.map((c) => (
            <tr key={c.code} className="border-b border-cx-line last:border-0">
              <td className="truncate py-1.5 text-cx-text" title={c.name}>
                {c.name} <span className="font-data text-cx-faint">{c.code}</span>
              </td>
              <td className="py-1.5 text-cx-muted">{c.territory}</td>
              <td className="py-1.5 font-data text-cx-faint" title={c.appt ? undefined : "No appointment date in the workbook"}>{c.appt ?? "—"}</td>
              {cols.map((k) => (
                <td key={k.label} className={`py-1.5 ${k.right === false ? "text-left" : "text-right font-data"}`}>
                  {k.v(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const sepSales = (c: ChannelPartner) => cpValue(c, "cy", [CUR]);
const yn = (b: boolean) => <span className={b ? "text-cx-text" : "text-cx-faint"}>{b ? "Yes" : "No"}</span>;

/** columns + rows for one initiative in one scope */
function initiativeTable(id: InitiativeId, t: string[], focus?: string): { cols: Col[]; nodes: TNode[]; note: string; groups?: { label: string; span: number }[] } {
  const F = (k: string) => focus === k;
  switch (id) {
    case "dist-exp": {
      const d = distExp(t);
      return {
        cols: KPI_COLS,
        note: "New distributors are those appointed from 1 Nov 2025. Billing and throughput are for September to date, judged against the day curve; the >25 retailers rule counts retailers linked in DMS.",
        nodes: [
          kpi("add", "# Distributor addition", fmtN(d.addTarget), fmtN(d.add), pc(d.add, d.addTarget), std(pc(d.add, d.addTarget)), { flash: F("add") }),
          kpi("billing", "# Distributors billing", fmtN(d.add), fmtN(d.billed), pc(d.billed, d.add), clr("phased", pc(d.billed, d.add)), {
            flash: F("billing"),
            detail: <PartnerList list={d.list} cols={[{ label: "Sep sales", v: (c) => fmtL(sepSales(c)) }, { label: "Billing", v: (c) => yn(sepSales(c) > 0) }]} />,
          }),
          kpi("thru", "Avg. distributor throughput (LPM)", fmtL(d.thruTarget), fmtL(d.thru), d.thru == null ? null : (d.thru / d.thruTarget) * 100, clr("phased", d.thru == null ? null : (d.thru / d.thruTarget) * 100), { flash: F("thru") }),
          kpi("r25", "# Distributors with > 25 retailers", fmtN(d.add), fmtN(d.r25), pc(d.r25, d.add), clr("std", pc(d.r25, d.add)), {
            flash: F("r25"),
            detail: <PartnerList list={d.list} cols={[{ label: "Retailers linked", v: (c) => fmtN(c.linkedRetailers) }, { label: "Above 25", v: (c) => yn((c.linkedRetailers ?? 0) > 25) }]} />,
          }),
        ],
      };
    }
    case "dealer-exp": {
      const d = dealerExp(t);
      const ytdList = d.list.filter((c) => activeMonths(c).length > 0);
      return {
        cols: KPI_COLS,
        note: `New dealers are those appointed from 1 Nov 2025; the value guideline is ${fmtL(VALUE_GUIDE.dealer)} a month. The YTD guideline counts only dealers appointed through August, averaged over their active months.`,
        nodes: [
          kpi("add", "# Dealer addition", fmtN(d.addTarget), fmtN(d.add), pc(d.add, d.addTarget), std(pc(d.add, d.addTarget)), { flash: F("add") }),
          kpi("billing", "# Dealers billing (September)", fmtN(d.add), fmtN(d.billed), pc(d.billed, d.add), clr("phased", pc(d.billed, d.add)), { flash: F("billing") }),
          kpi("billing2", "# Dealers billing in 2 months", fmtN(d.add), fmtN(d.billed2), pc(d.billed2, d.add), std(pc(d.billed2, d.add)), {
            flash: F("billing2"),
            detail: <PartnerList list={d.list} cols={[{ label: "Aug sales", v: (c) => fmtL(cpValue(c, "cy", [CUR - 1])) }, { label: "Sep sales", v: (c) => fmtL(sepSales(c)) }, { label: "Billed", v: (c) => yn(sepSales(c) > 0 || cpValue(c, "cy", [CUR - 1]) > 0) }]} />,
          }),
          kpi("thru", "Avg. dealer throughput (LPM)", fmtL(d.thruTarget), fmtL(d.thru), d.thru == null ? null : (d.thru / d.thruTarget) * 100, std(d.thru == null ? null : (d.thru / d.thruTarget) * 100), { flash: F("thru") }),
          kpi("vg", "# Dealers above value guideline", fmtN(d.add), fmtN(d.vg), pc(d.vg, d.add), std(pc(d.vg, d.add)), { flash: F("vg") }),
          kpi("vgYtd", "# Dealers above value guideline, YTD", fmtN(d.ytdUniv), fmtN(d.vgYtd), pc(d.vgYtd, d.ytdUniv), clr("p7590", pc(d.vgYtd, d.ytdUniv)), {
            flash: F("vgYtd"),
            detail: (
              <PartnerList
                list={ytdList}
                cols={[
                  { label: "Active months", v: (c) => activeMonths(c).length },
                  { label: "YTD avg / month", v: (c) => fmtL(cpValue(c, "cy", activeMonths(c)) / activeMonths(c).length) },
                  { label: "Above", v: (c) => yn(cpValue(c, "cy", activeMonths(c)) / activeMonths(c).length >= VALUE_GUIDE.dealer) },
                ]}
              />
            ),
          }),
        ],
      };
    }
    case "ret-exp": {
      const r = retExp(t);
      return {
        cols: KPI_COLS,
        note: `New retailers are those appointed from 1 Oct 2025. Billing, throughput and value-guideline KPIs count retailers appointed through August, so this month's additions aren't held to a full month. Throughput guideline ${fmtL(RET_GUIDE)}; value guideline ${fmtL(VALUE_GUIDE.retailer)} a month.`,
        nodes: [
          kpi("addLast", "# Retailer addition through August", fmtN(r.tillLastTarget), fmtN(r.tillLast.length), pc(r.tillLast.length, r.tillLastTarget), std(pc(r.tillLast.length, r.tillLastTarget)), { flash: F("addLast") }),
          kpi("addCur", "# Retailer addition in September", fmtN(r.curTarget), fmtN(r.curMonth.length), pc(r.curMonth.length, r.curTarget), clr("phased", pc(r.curMonth.length, r.curTarget)), {
            flash: F("addCur"),
            detail: <PartnerList list={r.curMonth} cols={[{ label: "Sep sales", v: (c) => fmtL(sepSales(c)) }]} />,
          }),
          kpi("billedThis", "# Retailers billed this month", fmtN(r.tillLast.length), fmtN(r.billedThis), pc(r.billedThis, r.tillLast.length), std(pc(r.billedThis, r.tillLast.length)), { flash: F("billedThis") }),
          kpi("billed3", "# Retailers billed in the last 3 months", fmtN(r.tillLast.length), fmtN(r.billed3), pc(r.billed3, r.tillLast.length), clr("p7590", pc(r.billed3, r.tillLast.length)), {
            flash: F("billed3"),
            detail: <PartnerList list={r.tillLast} cols={[CUR - 2, CUR - 1, CUR].map((m) => ({ label: `${FY_MONTHS[m]} sales`, v: (c: ChannelPartner) => fmtL(cpValue(c, "cy", [m])) }))} />,
          }),
          kpi("thru", "Avg. retailer throughput (LPM)", fmtL(RET_GUIDE), fmtL(r.thru), r.thru == null ? null : (r.thru / RET_GUIDE) * 100, clr("phased", r.thru == null ? null : (r.thru / RET_GUIDE) * 100), { flash: F("thru") }),
          kpi("thruYtd", "Avg. retailer throughput, YTD (LPM)", fmtL(RET_GUIDE), fmtL(r.thruYtd), r.thruYtd == null ? null : (r.thruYtd / RET_GUIDE) * 100, std(r.thruYtd == null ? null : (r.thruYtd / RET_GUIDE) * 100), { flash: F("thruYtd") }),
          kpi("vg", "# Retailers above value guideline", fmtN(r.tillLast.length), fmtN(r.vg), pc(r.vg, r.tillLast.length), std(pc(r.vg, r.tillLast.length)), { flash: F("vg") }),
          kpi("vgYtd", "# Retailers above value guideline, YTD", fmtN(r.ytdUniv), fmtN(r.vgYtd), pc(r.vgYtd, r.ytdUniv), std(pc(r.vgYtd, r.ytdUniv)), { flash: F("vgYtd") }),
        ],
      };
    }
    case "degrow": {
      const thr = DEGROW_MAX[CUR - 1];
      const cols: Col[] = [
        { key: "a", label: "Active partners", width: 120 },
        { key: "c", label: "De-growing now", width: 120 },
        { key: "s", label: "Sep-end target", width: 120 },
        { key: "o", label: "Oct target", width: 110 },
      ];
      const tgt = (k: "dealer" | "retailer") => t.reduce((a, x) => [a[0] + (LEV(x).degrowTgt[k][0] ?? 0), a[1] + (LEV(x).degrowTgt[k][1] ?? 0)], [0, 0]);
      const row = (k: "dealer" | "retailer") => {
        const d = degrowOf(t, k);
        const [s, o] = tgt(k);
        const ratio = pc(d.count, d.active);
        return {
          id: k,
          label: `${k === "dealer" ? "Dealers" : "Retailers"} de-growing`,
          flash: F(k),
          cells: [
            fmtN(d.active),
            <Fig key="c" ev={() => ({ title: `De-growing ${k}s`, value: `${d.count} of ${d.active}`, source: "DMS sales, this year and last", period: "Apr–Aug average against last year ÷ 12", formula: "partner de-grows when its Apr–Aug monthly average is below last year's full-year average", included: ["Operating partners appointed before 1 Apr 2026"], excluded: ["Partners appointed this year", "Partners not operating"] })} className="no-underline">
              <RagChip rag={clr("degrow", ratio, thr)}>{`${d.count} · ${fmtPct(ratio, 0)}`}</RagChip>
            </Fig>,
            fmtN(s),
            fmtN(o),
          ],
          children: d.byCat
            .filter((c) => c.items.length)
            .map((c) => ({
              id: `${k}-${c.label}`,
              label: c.label,
              cells: [<span key="a" className="text-cx-faint">·</span>, fmtN(c.items.length), <span key="s" className="text-cx-faint">·</span>, <span key="o" className="text-cx-faint">·</span>],
              detail: <PartnerList list={c.items.map((x) => x.c)} cols={[{ label: "LY avg", v: (p) => fmtL(c.items.find((x) => x.c === p)!.lyAvg) }, { label: "CY avg", v: (p) => fmtL(c.items.find((x) => x.c === p)!.cyAvg) }, { label: "Change", v: (p) => fmtPct(c.items.find((x) => x.c === p)!.growth) }]} />,
            })),
        } as TNode;
      };
      return { cols, nodes: [row("dealer"), row("retailer")], note: `Always year-to-date through August. The maximum allowed for August is ${thr}% of active partners; lower is better. Open a row for the size bands, then a band for the partners.` };
    }
    case "app": {
      const a = appOf(t);
      const cols = [...KPI_COLS, { key: "o", label: "Billed at least once", width: 130 }];
      return {
        cols,
        note: `A distributor meets its cadence when it orders through the app on the required number of distinct days in the month, phased to the ${LBL.dataDayTh}. The ratio compares secondary billing with primary for distributors.`,
        nodes: [
          ...a.slabs.map((s, i) => kpi(`slab${i}`, `# Distributors ordering ${s.days} days / month`, fmtN(s.target), fmtN(s.met), pc(s.met, s.target), std(pc(s.met, s.target)), { sub: s.label, extra: [fmtN(s.billedOnce)] })),
          { ...kpi("total", "Total", fmtN(a.target), fmtN(a.met), pc(a.met, a.target), clr("p7590", pc(a.met, a.target)), { flash: F("total"), extra: [fmtN(a.billedOnce)] }), strong: true },
          kpi("ratio", "Secondary / primary ratio", "80–120%", a.ratio == null ? <NA /> : fmtPct(a.ratio), a.ratio, clr("ratio", a.ratio), { flash: F("ratio"), sub: `${fmtL(a.secondary)} secondary on ${fmtL(a.primary)} primary`, extra: [<span key="x" />] }),
        ],
      };
    }
    case "beat": {
      const b = beatOf(t);
      const cols = [...KPI_COLS, { key: "o", label: "Met at least once", width: 130 }];
      return {
        cols,
        note: `Working days to date: ${b.workingDays} (${LBL.dataDay} elapsed, less Sundays, the 2nd and 3rd Saturdays and 3 planning days). Partner visit norms are phased to the ${LBL.dataDayTh}.`,
        nodes: [
          {
            ...kpi("above6", "# Executives above 6 visits / day", fmtN(b.execCount), fmtN(b.above6), pc(b.above6, b.execCount), std(pc(b.above6, b.execCount)), { flash: F("above6"), extra: [<span key="x" />] }),
            children: Object.entries(b.execs).map(([role, e]) => kpi(`ex-${role}`, role, fmtN(e.count), fmtN(e.above6), pc(e.above6, e.count), std(pc(e.above6, e.count)), { extra: [<span key="x" />] })),
          },
          kpi("vpd", "Avg. visits / day per executive", "6.0", b.visitsPerDay == null ? <NA /> : b.visitsPerDay.toFixed(1), b.visitsPerDay == null ? null : (b.visitsPerDay / 6) * 100, std(b.visitsPerDay == null ? null : (b.visitsPerDay / 6) * 100), { extra: [<span key="x" />] }),
          {
            ...kpi("cp", "# Partners meeting visit norm", fmtN(b.cpTarget), fmtN(b.cpMet), pc(b.cpMet, b.cpTarget), clr("drcp", pc(b.cpMet, b.cpTarget)), { flash: F("cp"), extra: [fmtN(Object.values(b.cp).reduce((a, c) => a + c.metOnce, 0))] }),
            children: Object.entries(b.cp).map(([type, c]) => kpi(`cp-${type}`, `${type}s`, fmtN(c.target), fmtN(c.met), pc(c.met, c.target), std(pc(c.met, c.target)), { extra: [fmtN(c.metOnce)] })),
          },
        ],
      };
    }
    case "scheme": {
      const s = schemeOf(t);
      const cols: Col[] = [
        { key: "pt", label: "Target", width: 84, divide: true },
        { key: "pa", label: "Achieved", width: 84 },
        { key: "pp", label: "Achieved %", width: 106 },
        { key: "st", label: "Target", width: 96, divide: true },
        { key: "sa", label: "Achieved", width: 96 },
        { key: "sp", label: "Achieved %", width: 106 },
      ];
      const row = (id: string, label: string, r: { customers: number; achieved: number; salesTgt: number; salesAch: number }, strong = false): TNode => ({
        id,
        label,
        strong,
        cells: [fmtN(r.customers), fmtN(r.achieved), chip(pc(r.achieved, r.customers), std(pc(r.achieved, r.customers))), fmtL(r.salesTgt), fmtL(r.salesAch), chip(pc(r.salesAch, r.salesTgt), std(pc(r.salesAch, r.salesTgt)))],
      });
      return {
        cols,
        groups: [{ label: "Participation", span: 3 }, { label: "Sales", span: 3 }],
        note: "Always on a YTD basis (Apr–Aug). Each dealer's yearly scheme target is phased by its territory's plan; a dealer qualifies when YTD sales reach its phased target.",
        nodes: [...s.rows.map((r, i) => row(`r${i}`, r.reward, r)), row("total", "Total", s.tot, true)],
      };
    }
    case "order": {
      const o = orderOf(t);
      return {
        cols: KPI_COLS,
        note: "Month-to-date from SFA; this initiative doesn't follow the period filter. Percentages come from summed counts, never averaged.",
        nodes: [
          kpi("k1", "# Partners with an order collected", fmtN(o.k1Target), fmtN(o.ordered), o.k1Pct, std(o.k1Pct), { sub: `${o.visited} visited; target is half of them`, flash: F("k1") }),
          kpi("k2", "Order-taking sale to secondary sale", "30%", o.k2 == null ? <NA /> : fmtPct(o.k2 * 100), o.k2Pct, std(o.k2Pct), { flash: F("k2") }),
          kpi("k3", "Productivity (productive ÷ total visits)", "60%", o.k3 == null ? <NA /> : fmtPct(o.k3 * 100), o.k3Pct, std(o.k3Pct), { sub: `${fmtN(o.pv)} of ${fmtN(o.tv)} visits`, flash: F("k3") }),
        ],
      };
    }
    case "tertiary": {
      const x = tertiaryOf(t);
      return {
        cols: KPI_COLS,
        note: "FY to date (Apr–Sep) from the BDE tertiary register; fixed period, so it doesn't follow the period filter. Opportunity value per lead is against ₹50k; conversion against 25%.",
        nodes: [
          kpi("bde", "BDE tertiary sale", fmtL(x.bde.tgt), fmtL(x.bde.ach), x.bde.pct, std(x.bde.pct), { flash: F("bde") }),
          kpi("appl", "BDE – Applicator tertiary sale", fmtL(x.appl.tgt), fmtL(x.appl.ach), x.appl.pct, std(x.appl.pct), { flash: F("appl") }),
          kpi("leads", "# Leads", fmtN(x.leadTgt), fmtN(x.leadAch), pc(x.leadAch, x.leadTgt), std(pc(x.leadAch, x.leadTgt))),
          kpi("opp", "Opportunity value per lead", fmtL(0.5), fmtL(x.oppPerLead), x.oppPerLead == null ? null : (x.oppPerLead / 0.5) * 100, std(x.oppPerLead == null ? null : (x.oppPerLead / 0.5) * 100)),
          kpi("conv", "Conversion ratio", "25%", x.conv == null ? <NA /> : fmtPct(x.conv * 100), x.conv == null ? null : (x.conv / 0.25) * 100, std(x.conv == null ? null : (x.conv / 0.25) * 100)),
        ],
      };
    }
    case "applicator": {
      const a = applOf(t);
      return {
        cols: KPI_COLS,
        note: "FY to date, summed across BDEs; achievement is total achieved ÷ total target.",
        nodes: [...a.kpis.map((k, i) => kpi(`a${i}`, k.kpi, fmtN(k.target), fmtN(k.ach), pc(k.ach, k.target), std(pc(k.ach, k.target)))), { ...kpi("total", "Total", fmtN(a.target), fmtN(a.ach), pc(a.ach, a.target), std(pc(a.ach, a.target))), strong: true }],
      };
    }
    case "recruit": {
      const r = recruitOf(t);
      const cols: Col[] = [
        { key: "t", label: "Signed-off headcount", width: 130 },
        { key: "o", label: "On ground", width: 96 },
        { key: "f", label: "Offered, yet to join", width: 130 },
        { key: "p", label: "Pipeline", width: 90 },
        { key: "g", label: "On ground %", width: 110 },
      ];
      const row = (id: string, label: string, x: { total: number; onGround: number; offered: number; pipeline: number }, strong = false): TNode => ({
        id,
        label,
        strong,
        cells: [fmtN(x.total), fmtN(x.onGround), fmtN(x.offered), fmtN(x.pipeline), chip(pc(x.onGround, x.total), clr("recruit", pc(x.onGround, x.total)))],
      });
      return { cols, note: "From HR. All columns add up; the percentage is from totals.", nodes: [row("Trade", "Trade", r.d.Trade), row("Non-Trade", "Non-Trade", r.d["Non-Trade"]), row("total", "Total", r.total, true)] };
    }
    case "training": {
      const x = trainingOf(t);
      const cols: Col[] = [
        { key: "hc", label: "Headcount", width: 96 },
        { key: "bt", label: "Target (> 3 mo.)", width: 112, divide: true },
        { key: "bd", label: "Completed", width: 96 },
        { key: "bp", label: "% completed", width: 108 },
        { key: "it", label: "Target (> 6 mo.)", width: 112, divide: true },
        { key: "id", label: "Completed", width: 96 },
        { key: "ip", label: "% completed", width: 108 },
      ];
      const row = (id: string, label: string, r: { hc: number; basicTgt: number; basicDone: number; interTgt: number | null; interDone: number | null }, strong = false): TNode => ({
        id,
        label,
        strong,
        flash: strong && F("total"),
        cells: [
          fmtN(r.hc),
          fmtN(r.basicTgt),
          fmtN(r.basicDone),
          chip(pc(r.basicDone, r.basicTgt), clr("std", pc(r.basicDone, r.basicTgt))),
          r.interTgt == null ? <span className="text-cx-faint">n/a</span> : fmtN(r.interTgt),
          r.interDone == null ? <span className="text-cx-faint">n/a</span> : fmtN(r.interDone),
          r.interTgt == null ? <span className="text-cx-faint">n/a</span> : chip(pc(r.interDone ?? 0, r.interTgt), clr("std", pc(r.interDone ?? 0, r.interTgt))),
        ],
      });
      return {
        cols,
        groups: [{ label: "", span: 1 }, { label: "Basic proficiency", span: 3 }, { label: "Intermediate proficiency", span: 3 }],
        note: "Eligible for basic after 3 months in role, intermediate after 6. Sales officers and territory sales executives aren't assessed for intermediate.",
        nodes: [...x.roles.filter((r) => r.hc).map((r) => row(r.role, r.role, r)), row("total", "Total", { ...x.tot, interTgt: x.tot.interTgt, interDone: x.tot.interDone }, true)],
      };
    }
    default:
      return { cols: KPI_COLS, nodes: [], note: "" };
  }
}
const LEV = (t: string) => LEVERS[t];

export interface InitiativeOpen {
  id: InitiativeId;
  group: string | null;
  kpi?: string;
}

export function InitiativeDrawer({ open, groups, allLabel, onClose }: { open: InitiativeOpen; groups: Group[]; allLabel: string; onClose: () => void }) {
  const [group, setGroup] = useState<string | null>(open.group);
  const def = INITIATIVES[open.id];
  const t = group ? groups.find((g) => g.name === group)!.territories : groups.flatMap((g) => g.territories);
  const table = useMemo(() => (def.live ? initiativeTable(open.id, t, open.kpi) : null), [open.id, t.join(), open.kpi]); // eslint-disable-line react-hooks/exhaustive-deps
  const st = def.live ? initiativeStatus(open.id, t) : null;
  const body = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  useEffect(() => {
    if (!open.kpi) return;
    const el = body.current?.querySelector(`#row-${CSS.escape(open.kpi)}`);
    if (el) setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 120);
  }, [open.kpi]);
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/50" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={def.name} className="cx-slide-in relative flex h-full w-full max-w-[960px] flex-col border-l border-cx-strong bg-cx-bg" onClick={(e) => e.stopPropagation()}>
        <header className="border-b border-cx-line px-5 pb-4 pt-5 sm:px-7">
          <button ref={closeRef} onClick={onClose} className="absolute right-5 top-5 rounded-md p-1 text-cx-faint hover:bg-cx-hover hover:text-cx-text" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
          <p className="flex items-center gap-2 text-[12px] text-cx-faint">
            <AgentIcon agent="thermometer" size="sm" /> Initiative
          </p>
          <h2 className="mt-1.5 flex flex-wrap items-center gap-2.5 pr-10 text-[20px] font-medium leading-tight text-cx-text">
            {def.name} {st && <RagChip rag={st.rag} />}
          </h2>
          {st && <p className="mt-1 text-[12.5px] text-cx-muted">{st.line}</p>}
          {def.live && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-cx-faint">Scope</span>
              <div className="max-w-full overflow-x-auto">
                <Seg label="Scope" value={group ?? "__all"} onChange={(v) => setGroup(v === "__all" ? null : v)} options={[{ id: "__all", label: allLabel }, ...groups.map((g) => ({ id: g.name, label: g.name }))]} />
              </div>
            </div>
          )}
        </header>
        <div ref={body} className="flex-1 overflow-y-auto pb-10 pt-4">
          {table ? (
            <>
              <p className="mb-3 max-w-[78ch] px-5 text-[12px] leading-relaxed text-cx-faint sm:px-7">{table.note}</p>
              <TreeTable cols={table.cols} groups={table.groups} first={{ label: "KPI", width: 300 }} nodes={table.nodes} openIds={open.kpi && open.id === "degrow" ? [open.kpi] : []} caption={def.name} />
            </>
          ) : (
            <div className="px-5 sm:px-7">
              <p className="text-[13px] text-cx-text">Data not available yet.</p>
              <p className="mt-1 text-[12.5px] text-cx-muted">Sales AI will start reading this once {def.needs?.toLowerCase()} is connected. It will track:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[12.5px] text-cx-muted">
                {def.kpis?.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export function InitiativesGrid({ groups, onOpen }: { groups: Group[]; onOpen: (o: InitiativeOpen) => void }) {
  const [view, setView] = useState<"live" | "na">("live");
  const t = groups.flatMap((g) => g.territories);
  return (
    <section aria-labelledby="init-title" className={`${card} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="init-title" className="text-[15px] font-medium text-cx-text">
            Initiatives
          </h2>
        </div>
        <Seg label="Initiative view" value={view} onChange={setView} options={[{ id: "live", label: "Live" }, { id: "na", label: "Data not available" }]} />
      </div>
      <div className="mt-5 space-y-6">
        {INITIATIVE_SECTIONS.map((s) => {
          const items = s.groups.map((g) => ({ ...g, ids: g.ids.filter((id) => (view === "live" ? INITIATIVES[id].live : !INITIATIVES[id].live)) })).filter((g) => g.ids.length);
          if (!items.length) return null;
          return (
            <div key={s.title}>
              <h3 className="text-[13px] font-medium text-cx-text">{s.title}</h3>
              <div className="mt-2 space-y-3">
                {items.map((g) => (
                  <div key={g.title}>
                    <p className="mb-1.5 text-[11.5px] text-cx-faint">{g.title}</p>
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {g.ids.map((id) => {
                        const def = INITIATIVES[id];
                        const st = def.live ? initiativeStatus(id, t) : null;
                        const c = st && st.rag !== "na" ? RAG_COLOR[st.rag] : null;
                        return (
                          <li key={id}>
                            <button
                              onClick={() => onOpen({ id, group: null })}
                              className={`flex h-full w-full items-start justify-between gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors hover:border-cx-faint ${def.live ? "border-cx-line bg-cx-panel" : "border-dashed border-cx-strong bg-transparent"}`}
                              style={c ? { borderColor: `${c}55`, background: `${c}0d` } : undefined}
                            >
                              <span className="min-w-0">
                                <span className={`block text-[13px] ${def.live ? "text-cx-text" : "text-cx-muted"}`}>{def.name}</span>
                                <span className="mt-0.5 block text-[11.5px] leading-snug text-cx-faint">{st ? st.line : `Needs ${def.needs?.toLowerCase()}`}</span>
                              </span>
                              {st ? <RagChip rag={st.rag} /> : <RagChip rag="na">No data</RagChip>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-[11.5px] text-cx-faint">
        Initiative cards: green at 100% of target, amber from 90%. Day-phased KPIs expect {EXPECTED_TODAY}% by the {LBL.dataDayTh}.
      </p>
    </section>
  );
}
