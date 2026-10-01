"use client";

// Deep dive: the reference's Channel, Product, Sub-geography, Top channel partner and
// Non-Trade views, opened as a wide sheet over Performance for one row's scope.

import { LBL } from "@/data/labels";
import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  AS_OF,
  Agg,
  BANDS,
  BDES,
  CATEGORIES,
  CP_LABEL,
  CUR,
  CategoryId,
  ChannelPartner,
  FY_MONTHS,
  LEADS,
  PLANS,
  RETAILER_BANDS,
  RETAILER_MARGIN,
  ThermoFilters,
  aggregate,
  achPct,
  achRag,
  calcGrowth,
  cpValue,
  fmtL,
  fmtN,
  fmtPct,
  growthMonths,
  periodLabel,
  periodMonths,
  regionOfTerr,
  retailerCategory,
  rstabOf,
  targetOf,
  Rag3,
} from "@/data/thermometer";
import { REGIONS } from "@/data/leadership";
import { AgentIcon } from "../primitives";
import { cpsIn } from "./engine";
import { BILL_COLS, CHANNEL_COLS, CHANNEL_GROUPS, Ctx, SALES_COLS, billCells, naCells, salesCells } from "./perf";
import { Col, Fig, NA, RagChip, Seg, TNode, Tabs, TreeTable } from "./ui";

export type DeepTab = "channel" | "product" | "geo" | "partners" | "nontrade";
export interface DeepScope {
  label: string;
  territories: string[];
  tab: DeepTab;
  cat?: CategoryId | null;
}

const TABS: { id: DeepTab; label: string }[] = [
  { id: "channel", label: "Channel" },
  { id: "product", label: "Product" },
  { id: "geo", label: "Sub-geography" },
  { id: "partners", label: "Top channel partners" },
  { id: "nontrade", label: "Non-Trade" },
];

/** Retailer target = linked distributor target × (1 + margin), split across categories (reference TGT_RET_SPLIT). */
const RET_SPLIT: Record<string, number> = { "Elite Plus": 0.3, Elite: 0.28, Premium: 0.21, Superior: 0.11, Classic: 0.05, Standard: 0.02, "< Standard": 0.03 };

export function DeepDive({ f, scope, onClose }: { f: ThermoFilters; scope: DeepScope; onClose: () => void }) {
  const [tab, setTab] = useState<DeepTab>(scope.tab);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
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
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/50" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Deep dive: ${scope.label}`}
        className="cx-slide-in relative flex h-full w-full max-w-[1280px] flex-col border-l border-cx-strong bg-cx-bg"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-cx-line px-5 pb-4 pt-5 sm:px-7">
          <button ref={closeRef} onClick={onClose} className="absolute right-5 top-5 rounded-md p-1 text-cx-faint hover:bg-cx-hover hover:text-cx-text" aria-label="Close deep dive">
            <X className="h-4 w-4" />
          </button>
          <p className="flex items-center gap-2 text-[12px] text-cx-faint">
            <AgentIcon agent="thermometer" size="sm" /> Deep dive · {periodLabel(f)} · {PLANS.find((p) => p.id === f.plan)!.label}
          </p>
          <h2 className="mt-1.5 pr-10 text-[20px] font-medium leading-tight text-cx-text">{scope.label}</h2>
          <div className="mt-4">
            <Tabs value={tab} options={TABS} onChange={setTab} label="Deep dive views" size="sm" />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto pb-10 pt-4" role="tabpanel">
          {tab === "channel" && <ChannelView f={f} t={scope.territories} label={scope.label} />}
          {tab === "product" && <ProductView f={f} t={scope.territories} label={scope.label} openCat={scope.cat ?? null} />}
          {tab === "geo" && <GeoView f={f} t={scope.territories} />}
          {tab === "partners" && <PartnersView f={f} t={scope.territories} />}
          {tab === "nontrade" && <NonTradeView f={f} t={scope.territories} label={scope.label} />}
        </div>
      </aside>
    </div>
  );
}

function Lead({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 max-w-[78ch] px-5 text-[12px] leading-relaxed text-cx-faint sm:px-7">{children}</p>;
}

// ---------------------------------------------------------------------------
// Channel (reference viewChannel)
// ---------------------------------------------------------------------------

function ChannelView({ f, t, label }: { f: ThermoFilters; t: string[]; label: string }) {
  const nodes = useMemo(() => buildChannel(f, t, label), [f, t, label]);
  return (
    <>
      <Lead>
        Trade partners in {label}. Primary splits into distributors and dealers, each by size band (fixed from last year&apos;s average) and new partners (appointed from 1 Nov 2025). Retailers are secondary sales; their target is the distributor target × (1 + {Math.round(RETAILER_MARGIN * 100)}% margin, set in Configuration). Select any figure to see where it comes from.
      </Lead>
      <TreeTable cols={CHANNEL_COLS} groups={CHANNEL_GROUPS} first={{ label: "Channel", width: 236 }} nodes={nodes} openIds={["ch-prim"]} caption={`Channel performance, ${label}`} />
    </>
  );
}

function buildChannel(f: ThermoFilters, t: string[], label: string): TNode[] {
  const months = periodMonths(f);
  const gm = growthMonths(f);
  const cat = f.category ? CATEGORIES.find((c) => c.name === f.category)!.id : null;
  const A = (cps: ChannelPartner[], targetOverride?: number | null) => aggregate(cps, { months, gm, plan: f.plan, cat, targetOverride });
  const node = (id: string, lbl: string, cps: ChannelPartner[], partners: string, children?: TNode[], o: { growth?: "new" | "existing"; strong?: boolean; target?: number | null; rstab?: ReturnType<typeof rstabOf>; derived?: string } = {}): TNode => {
    const a = A(cps, o.target);
    const c: Ctx = { f, scope: `${label} · ${lbl}`, territories: t, partners, derivedTarget: o.derived };
    const r = o.rstab !== undefined ? o.rstab : rstabOf(cps, f.plan, cat);
    return { id, label: lbl, sub: `${fmtN(cps.length)} ${cps.length === 1 ? "partner" : "partners"}`, strong: o.strong, cells: [...salesCells(c, a, r, { growth: o.growth }), ...billCells(c, a)], children };
  };

  const prim = cpsIn(t, ["distributor", "dealer"]);
  const segNodes = (["distributor", "dealer"] as const).map((type) => {
    const all = cpsIn(t, type);
    const ex = all.filter((c) => !c.isNew);
    const nw = all.filter((c) => c.isNew);
    const bands = BANDS[type].map((b) => node(`ch-${type}-${b.key}`, b.label, ex.filter((c) => b.test(c.lyAvg)), `${CP_LABEL[type]}s, ${b.label}`, undefined, { growth: "existing" }));
    return node(`ch-${type}`, `${CP_LABEL[type]}s`, all, `${CP_LABEL[type]}s`, [
      node(`ch-${type}-ex`, "Existing", ex, `Existing ${CP_LABEL[type].toLowerCase()}s`, bands, { growth: "existing" }),
      node(`ch-${type}-new`, "New", nw, `New ${CP_LABEL[type].toLowerCase()}s (from 1 Nov 2025)`, undefined, { growth: "new" }),
    ]);
  });

  // retailers: target derived from the distributor target
  const dists = cpsIn(t, "distributor");
  const rets = cpsIn(t, "retailer");
  const retNew = rets.filter((c) => c.isNew);
  const retEx = rets.filter((c) => !c.isNew);
  const dT = targetOf(dists, months, f.plan, cat) * (1 + RETAILER_MARGIN);
  const newT = targetOf(retNew, months, f.plan, cat);
  const exT = Math.max(0, dT - newT);
  const dAnnual = targetOf(dists, Array.from({ length: 12 }, (_, i) => i), f.plan, cat) * (1 + RETAILER_MARGIN);
  const dRem = targetOf(dists, Array.from({ length: 12 }, (_, i) => i).slice(CUR), f.plan, cat) * (1 + RETAILER_MARGIN);
  const derived = `Distributor plan × (1 + ${Math.round(RETAILER_MARGIN * 100)}% margin)`;
  const catNodes = RETAILER_BANDS.map((b) =>
    node(`ch-ret-${b.label}`, b.label, retEx.filter((c) => b.test(c.lyAvg)), `Retailers, ${b.label}`, undefined, {
      growth: "existing",
      target: exT * RET_SPLIT[b.label],
      rstab: rstabOf(retEx.filter((c) => b.test(c.lyAvg)), f.plan, cat, null, { annual: dAnnual * RET_SPLIT[b.label], remaining: dRem * RET_SPLIT[b.label] }),
      derived: `${derived}, ${Math.round(RET_SPLIT[b.label] * 100)}% to ${b.label}`,
    })
  );
  const secondary = node("ch-sec", "Secondary: retailers", rets, "Retailers", [
    node("ch-ret-ex", "Existing", retEx, "Existing retailers", catNodes, { growth: "existing", target: exT, rstab: rstabOf(retEx, f.plan, cat, null, { annual: dAnnual, remaining: dRem }), derived }),
    node("ch-ret-new", "New", retNew, "New retailers (from 1 Oct 2025)", undefined, { growth: "new", target: newT }),
  ], { strong: true, target: dT, rstab: rstabOf(rets, f.plan, cat, null, { annual: dAnnual, remaining: dRem }), derived });

  // tertiary: BDE applicator sales; growth and billing don't apply
  const set = new Set(t);
  const bdes = BDES.filter((b) => set.has(b.territory));
  const sold = months.filter((m) => m <= CUR);
  const tTgt = bdes.reduce((a, b) => a + b.monthlyTarget * months.length, 0);
  const tAch = bdes.reduce((a, b) => a + sold.reduce((x, m) => x + b.months[m], 0), 0);
  const tAgg: Agg = { sales: tAch, target: tTgt || null, ly: null, cyG: 0, growth: null, active: 0, billing: 0, billTarget: 0, count: bdes.length };
  const tc: Ctx = { f, scope: `${label} · Tertiary`, territories: t, partners: "BDE and BDE – Applicator sales to applicators", derivedTarget: "BDE monthly target × months in the period" };
  const tertiary: TNode = {
    id: "ch-ter",
    label: "Tertiary: applicators",
    sub: `${bdes.length} BDEs`,
    strong: true,
    cells: [...salesCells(tc, tAgg, null, { growth: "na" }), ...naCells(4)],
    detail: (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed text-[12px]">
          <thead>
            <tr className="border-b border-cx-line text-[11px] text-cx-faint">
              <th className="w-[200px] py-2 text-left font-normal">BDE</th>
              <th className="w-[120px] py-2 text-left font-normal">Territory</th>
              <th className="py-2 text-right font-normal">Monthly target</th>
              <th className="py-2 text-right font-normal">Period target</th>
              <th className="py-2 text-right font-normal">Period sales</th>
              <th className="py-2 pr-1 text-right font-normal">Achievement</th>
            </tr>
          </thead>
          <tbody>
            {bdes.map((b) => {
              const pt = b.monthlyTarget * months.length;
              const ps = sold.reduce((x, m) => x + b.months[m], 0);
              const p = pt ? (ps / pt) * 100 : null;
              return (
                <tr key={b.code} className="border-b border-cx-line last:border-0">
                  <td className="py-2 text-cx-text">
                    {b.name} <span className="text-cx-faint">· {b.role}</span>
                  </td>
                  <td className="py-2 text-cx-muted">{b.territory}</td>
                  <td className="py-2 text-right font-data">{fmtL(b.monthlyTarget)}</td>
                  <td className="py-2 text-right font-data">{fmtL(pt)}</td>
                  <td className="py-2 text-right font-data">{fmtL(ps)}</td>
                  <td className="py-2 pr-1 text-right">{p == null ? <NA /> : <RagChip rag={achRag(p, f.period)}>{fmtPct(p)}</RagChip>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ),
  };

  return [node("ch-prim", "Primary: distributors and dealers", prim, "Distributors and dealers", segNodes, { strong: true }), secondary, tertiary];
}

// ---------------------------------------------------------------------------
// Product (reference viewTradeProduct): category → pack size, each split by channel
// ---------------------------------------------------------------------------

function ProductView({ f, t, label, openCat }: { f: ThermoFilters; t: string[]; label: string; openCat: CategoryId | null }) {
  const nodes = useMemo(() => buildProduct(f, t, label, openCat), [f, t, label, openCat]);
  return (
    <>
      <Lead>
        Each category splits into distributors and dealers (primary); retailers sit under distributors because their target is the distributor target × (1 + margin) and they don&apos;t add to the primary total. Open a category for its pack sizes.
      </Lead>
      <TreeTable cols={CHANNEL_COLS} groups={CHANNEL_GROUPS} first={{ label: "Product · channel", width: 236 }} nodes={nodes} openIds={openCat ? [`pr-${openCat}`] : []} caption={`Product performance, ${label}`} />
    </>
  );
}

function buildProduct(f: ThermoFilters, t: string[], label: string, openCat: CategoryId | null): TNode[] {
  const months = periodMonths(f);
  const gm = growthMonths(f);
  const all12 = Array.from({ length: 12 }, (_, i) => i);
  const dists = cpsIn(t, "distributor");
  const dealers = cpsIn(t, "dealer");
  const rets = cpsIn(t, "retailer");
  const cats = f.category ? CATEGORIES.filter((c) => c.name === f.category) : CATEGORIES;
  const forNode = (idp: string, name: string, cat: CategoryId, pack: number | null): TNode => {
    const A = (cps: ChannelPartner[], tgt?: number | null) => aggregate(cps, { months, gm, plan: f.plan, cat, pack, targetOverride: tgt });
    const ctx = (who: string, partners: string, derived?: string): Ctx => ({ f, scope: `${label} · ${name} · ${who}`, territories: t, partners, derivedTarget: derived });
    const dA = A(dists);
    const rT = (dA.target ?? 0) * (1 + RETAILER_MARGIN);
    const rA = A(rets, rT || null);
    const kA = A(dealers);
    const prim = A([...dists, ...dealers]);
    const retRstab = rstabOf(rets, f.plan, cat, pack, { annual: targetOf(dists, all12, f.plan, cat, pack) * (1 + RETAILER_MARGIN), remaining: targetOf(dists, all12.slice(CUR), f.plan, cat, pack) * (1 + RETAILER_MARGIN) });
    const derived = `Distributor plan for ${name} × (1 + ${Math.round(RETAILER_MARGIN * 100)}% margin)`;
    const retNode: TNode = { id: `${idp}-ret`, label: "Retailers (secondary)", cells: [...salesCells(ctx("retailers", "Retailers", derived), rA, retRstab), ...billCells(ctx("retailers", "Retailers"), rA)] };
    const distNode: TNode = { id: `${idp}-dist`, label: "Distributors", children: [retNode], cells: [...salesCells(ctx("distributors", "Distributors"), dA, rstabOf(dists, f.plan, cat, pack)), ...billCells(ctx("distributors", "Distributors"), dA)] };
    const dealerNode: TNode = { id: `${idp}-dealer`, label: "Dealers", cells: [...salesCells(ctx("dealers", "Dealers"), kA, rstabOf(dealers, f.plan, cat, pack)), ...billCells(ctx("dealers", "Dealers"), kA)] };
    return { id: idp, label: name, children: [distNode, dealerNode], cells: [...salesCells(ctx("primary", "Distributors and dealers"), prim, rstabOf([...dists, ...dealers], f.plan, cat, pack)), ...billCells(ctx("primary", "Distributors and dealers"), prim)] };
  };
  return cats.map((c) => {
    const n = forNode(`pr-${c.id}`, c.name, c.id, null);
    n.strong = true;
    n.sub = c.full !== c.name ? c.full : undefined;
    n.flash = openCat === c.id;
    n.children = [...(n.children ?? []), ...c.packs.map((p, i) => forNode(`pr-${c.id}-${i}`, `${c.name} ${p}`, c.id, i))];
    return n;
  });
}

// ---------------------------------------------------------------------------
// Sub-geography (reference viewSubGeo): territory → category → channel
// ---------------------------------------------------------------------------

const GEO_COLS: Col[] = [
  { key: "t", label: "Target", width: 100 },
  { key: "a", label: "Actual", width: 100 },
  { key: "p", label: "Achievement", width: 110 },
  { key: "ly", label: "LY avg / month", width: 110 },
  { key: "lys", label: "LY same period avg", width: 124 },
  { key: "cy", label: "CY avg", width: 100 },
  { key: "g", label: "Growth over LY", width: 108 },
];
function GeoView({ f, t }: { f: ThermoFilters; t: string[] }) {
  const nodes = useMemo(() => {
    const months = periodMonths(f);
    const ytd = Array.from({ length: CUR }, (_, i) => i);
    const all12 = Array.from({ length: 12 }, (_, i) => i);
    const row = (id: string, label: string, cps: ChannelPartner[], cat: CategoryId | null, children?: TNode[], strong?: boolean): TNode => {
      const actual = cps.reduce((a, c) => a + cpValue(c, "cy", months, cat), 0);
      const tgt = targetOf(cps, months, f.plan, cat);
      const lyAvg = cps.reduce((a, c) => a + cpValue(c, "ly", all12, cat), 0) / 12;
      const lys = cps.reduce((a, c) => a + cpValue(c, "ly", ytd, cat), 0) / ytd.length;
      const cy = cps.reduce((a, c) => a + cpValue(c, "cy", ytd, cat), 0) / ytd.length;
      const g = calcGrowth(lys, cy);
      const p = tgt ? (actual / tgt) * 100 : null;
      return {
        id,
        label,
        strong,
        children,
        cells: [
          tgt ? fmtL(tgt) : <NA />,
          fmtL(actual),
          p == null ? <NA /> : <RagChip rag={achRag(p, f.period)}>{fmtPct(p)}</RagChip>,
          fmtL(lyAvg),
          <Fig key="lys" ev={() => ({ title: `LY same-period average · ${label}`, value: fmtL(lys), source: "DMS invoices, last year", period: "Apr–Aug last year ÷ 5", included: ["Distributors and dealers"], excluded: ["Retailers", "Projects"] })}>{fmtL(lys)}</Fig>,
          fmtL(cy),
          g == null ? <NA /> : <span style={{ color: g < 0 ? "#d64550" : undefined }}>{g > 0 ? "+" : ""}{fmtPct(g)}</span>,
        ],
      };
    };
    return t.map((terr) => {
      const cps = cpsIn([terr], ["distributor", "dealer"]);
      const cats = CATEGORIES.filter((c) => !f.category || c.name === f.category).map((c) =>
        row(`geo-${terr}-${c.id}`, c.name, cps, c.id, [
          row(`geo-${terr}-${c.id}-d`, "Distributors", cps.filter((x) => x.type === "distributor"), c.id),
          row(`geo-${terr}-${c.id}-k`, "Dealers", cps.filter((x) => x.type === "dealer"), c.id),
        ])
      );
      return row(`geo-${terr}`, terr, cps, f.category ? CATEGORIES.find((c) => c.name === f.category)!.id : null, cats, true);
    });
  }, [f, t]);
  return (
    <>
      <Lead>Trade sales by territory, then category, then channel. Averages and growth compare Apr–Aug this year with the same months last year.</Lead>
      <TreeTable cols={GEO_COLS} first={{ label: "Territory · category · channel", width: 240 }} nodes={nodes} caption="Sub-geography and product view" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Top channel partners (reference viewTopCP)
// ---------------------------------------------------------------------------

const TOP_COLS: Col[] = [
  { key: "code", label: "Code", width: 84, align: "left" },
  { key: "terr", label: "Territory", width: 110, align: "left" },
  { key: "st", label: "Status", width: 86, align: "left" },
  { key: "s", label: "Sales", width: 92 },
  { key: "cy", label: "CY avg LPM", width: 92 },
  { key: "ly", label: "LY avg LPM", width: 92 },
  { key: "g", label: "Growth", width: 92 },
  { key: "b", label: "Billing", width: 100, align: "left" },
];
function PartnersView({ f, t }: { f: ThermoFilters; t: string[] }) {
  const [type, setType] = useState<"distributor" | "dealer" | "retailer">("distributor");
  const months = periodMonths(f);
  const gm = growthMonths(f);
  const nodes = useMemo(() => {
    const list = cpsIn(t, type)
      .map((c) => ({ c, s: cpValue(c, "cy", months) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 25);
    return list.map(({ c, s }, i): TNode => {
      const cy = gm ? cpValue(c, "cy", gm) / gm.length : null;
      const ly = gm ? cpValue(c, "ly", gm) / gm.length : null;
      const g = c.isNew || ly == null || cy == null ? null : calcGrowth(ly, cy);
      return {
        id: c.code,
        label: `${i + 1}. ${c.name}`,
        sub: type === "retailer" ? retailerCategory(c.lyAvg) : CP_LABEL[c.type],
        cells: [
          <span key="c" className="text-cx-muted">{c.code}</span>,
          <span key="t" className="font-plex text-[12.5px] text-cx-muted">{c.territory}</span>,
          <span key="st" className="font-plex text-[12px] text-cx-muted">{c.isNew ? "New" : "Existing"}</span>,
          fmtL(s),
          cy == null ? <NA key="cy" /> : fmtL(cy),
          ly == null || c.isNew ? <NA key="ly" /> : fmtL(ly),
          c.isNew ? <span key="g" className="font-plex text-[11.5px] text-cx-faint">New partner</span> : g == null ? <NA key="g" /> : <span key="g" style={{ color: g < 0 ? "#d64550" : undefined }}>{g > 0 ? "+" : ""}{fmtPct(g)}</span>,
          <RagChip key="b" rag={s > 0 ? "green" : "red"}>{s > 0 ? "Billing" : "Not billing"}</RagChip>,
        ],
      };
    });
  }, [t, type, months, gm]);
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3 px-5 sm:px-7">
        <Seg
          label="Partner type"
          value={type}
          onChange={setType}
          options={[
            { id: "distributor", label: "Distributors" },
            { id: "dealer", label: "Dealers" },
            { id: "retailer", label: "Retailers" },
          ]}
        />
        <span className="text-[12px] text-cx-faint">Top 25 by sales, {periodLabel(f)}. New partners have no last-year base, so their growth isn&apos;t shown.</span>
      </div>
      <TreeTable cols={TOP_COLS} first={{ label: "Partner", width: 260 }} nodes={nodes} caption="Top channel partners" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Non-Trade (reference viewNonTrade + LMS pipeline sufficiency)
// ---------------------------------------------------------------------------

const PIPE_COLS: Col[] = [
  { key: "t", label: "Sales target, Oct–Dec", width: 140 },
  { key: "p", label: "Target pipeline (6×)", width: 140 },
  { key: "h", label: "Hot leads", width: 110 },
  { key: "s", label: "Hot lead sufficiency", width: 140 },
];
const suffRag = (p: number | null): Rag3 => (p == null ? "na" : p > 100 ? "green" : p >= 90 ? "amber" : "red");

function NonTradeView({ f, t, label }: { f: ThermoFilters; t: string[]; label: string }) {
  const months = periodMonths(f);
  const gm = growthMonths(f);
  const next3 = [CUR + 1, CUR + 2, CUR + 3];
  const geo = useMemo(() => {
    const regionsIn = REGIONS.filter((r) => r.territories.some((x) => t.includes(x)));
    const mk = (id: string, lbl: string, terrs: string[], children?: TNode[], strong?: boolean): TNode => {
      const cps = cpsIn(terrs, "project");
      const a = aggregate(cps, { months, gm, plan: f.plan });
      const c: Ctx = { f, scope: `${lbl} · Non-Trade`, territories: terrs, partners: "Project customers" };
      return { id, label: lbl, strong, children, cells: [...salesCells(c, a, null).slice(0, 4), ...billCells(c, a)] };
    };
    const multi = regionsIn.length > 1 || t.length > 1;
    if (!multi) return [mk("nt-only", label, t)];
    return regionsIn.map((r) => {
      const ts = r.territories.filter((x) => t.includes(x));
      return mk(`nt-${r.name}`, r.name, ts, ts.length > 1 ? ts.map((x) => mk(`nt-${x}`, x, [x])) : undefined, true);
    });
  }, [f, t, label, months, gm]);

  const pipe = useMemo(() => {
    const row = (id: string, lbl: string, terrs: string[], children?: TNode[], strong?: boolean): TNode => {
      const set = new Set(terrs);
      const tgt = targetOf(cpsIn(terrs, "project"), next3, f.plan);
      const leads = LEADS.filter((l) => set.has(l.territory));
      const hot = leads.filter((l) => l.stage === "Open" && l.status === "Hot").reduce((a, l) => a + l.amount, 0);
      const suff = tgt > 0 ? (hot / (6 * tgt)) * 100 : null;
      const ev = () => ({
        title: `Hot lead sufficiency · ${lbl}`,
        value: fmtPct(suff, 0),
        source: "LMS lead pipeline (stage and status) and the Non-Trade plan",
        period: `Pipeline as of ${LBL.dataDate}; target for Oct–Dec`,
        formula: `${fmtL(hot)} hot ÷ (6 × ${fmtL(tgt)})`,
        included: ["Leads with stage Open and status Hot"],
        excluded: ["Warm and cold leads", "Closed leads", "Lead contacts (personal data stays in LMS)"],
      });
      return {
        id,
        label: lbl,
        sub: `${leads.length} leads`,
        strong,
        children,
        detail: children ? undefined : <LeadsTable territories={terrs} />,
        cells: [
          tgt ? fmtL(tgt) : <NA key="t" />,
          tgt ? fmtL(6 * tgt) : <NA key="p" />,
          fmtL(hot),
          <Fig key="s" ev={ev} className="no-underline">
            <RagChip rag={suffRag(suff)}>{fmtPct(suff, 0)}</RagChip>
          </Fig>,
        ],
      };
    };
    const regionsIn = REGIONS.filter((r) => r.territories.some((x) => t.includes(x)));
    if (t.length === 1) return [row("pl-only", t[0], t)];
    return regionsIn.map((r) => {
      const ts = r.territories.filter((x) => t.includes(x));
      return row(`pl-${r.name}`, r.name, ts, ts.map((x) => row(`pl-${x}`, x, [x])), true);
    });
  }, [f, t]);

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-2 px-5 text-[14px] font-medium text-cx-text sm:px-7">Non-Trade by geography</h3>
        <Lead>Project business (builders, contractors and institutions). Target from the Non-Trade plan.</Lead>
        <TreeTable cols={[...SALES_COLS.slice(0, 4), ...BILL_COLS]} groups={[{ label: "Sales performance", span: 4 }, { label: "Billing performance", span: 4 }]} first={{ label: "Geography", width: 220 }} nodes={geo} caption="Non-Trade by geography" />
      </section>
      <section>
        <h3 className="mb-2 px-5 text-[14px] font-medium text-cx-text sm:px-7">Pipeline sufficiency</h3>
        <Lead>
          Live project pipeline against the next three months&apos; target. The pipeline should hold six times the target in hot leads: green above 100%, amber 90–100%, red below 90%. Open a territory to see its leads.
        </Lead>
        <TreeTable cols={PIPE_COLS} first={{ label: "Geography", width: 220 }} nodes={pipe} caption="Non-Trade pipeline sufficiency" />
      </section>
    </div>
  );
}

function LeadsTable({ territories }: { territories: string[] }) {
  const set = new Set(territories);
  const leads = LEADS.filter((l) => set.has(l.territory)).sort((a, b) => b.amount - a.amount);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] table-fixed text-[12px]">
        <thead>
          <tr className="border-b border-cx-line text-[11px] text-cx-faint">
            <th className="w-[72px] py-2 text-left font-normal">Lead</th>
            <th className="w-[200px] py-2 text-left font-normal">Site</th>
            <th className="py-2 text-left font-normal">Type</th>
            <th className="py-2 text-left font-normal">Source</th>
            <th className="py-2 text-left font-normal">Stage</th>
            <th className="py-2 text-left font-normal">Status</th>
            <th className="py-2 text-right font-normal">Opportunity</th>
            <th className="py-2 pr-1 text-right font-normal">Created</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id} className="border-b border-cx-line last:border-0">
              <td className="py-1.5 font-data text-cx-muted">{l.id}</td>
              <td className="truncate py-1.5 text-cx-text">{l.site}</td>
              <td className="py-1.5 text-cx-muted">{l.projectType}</td>
              <td className="py-1.5 text-cx-muted">{l.source}</td>
              <td className="py-1.5 text-cx-muted">{l.stage}</td>
              <td className="py-1.5">
                <RagChip rag={l.status === "Hot" ? "green" : l.status === "Warm" ? "amber" : "na"}>{l.status}</RagChip>
              </td>
              <td className="py-1.5 text-right font-data">{fmtL(l.amount)}</td>
              <td className="py-1.5 pr-1 text-right font-data text-cx-faint">{l.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

