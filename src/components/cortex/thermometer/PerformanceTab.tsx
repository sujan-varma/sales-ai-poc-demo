"use client";

// Performance: the reference's Sales Performance view. Filters, the two headline figures,
// achievement / growth / RSTAB charts, the sales table by geography and sector, and the
// channel and product issues. Any row opens the deep dive; any figure opens its evidence.

import { LBL } from "@/data/labels";
import React, { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_NAMES,
  ChannelPartner,
  Group,
  PERIODS,
  PLANS,
  QuarterId,
  ThermoFilters,
  ThermoPersona,
  aggregate,
  achPct,
  EXPECTED_TODAY,
  achRag,
  bpRag,
  fmtL,
  fmtPct,
  groupsFor,
  growthMonths,
  periodLabel,
  periodMonths,
  rstabOf,
  scopeTerritories,
} from "@/data/thermometer";
import { REGIONS } from "@/data/leadership";
import { Dropdown, card } from "../kit";
import { cpsIn } from "./engine";
import { Ctx, SALES_COLS, categoryId, evAch, evGrowth, evRstab, salesCells } from "./perf";
import { DeepScope } from "./DeepDive";
import { BarsChart, Fig, RagChip, ScatterChart, Seg, TNode, TreeTable } from "./ui";

export function FilterBar({ persona, f, setF }: { persona: ThermoPersona; f: ThermoFilters; setF: (f: ThermoFilters) => void }) {
  const territories = scopeTerritories(persona, { region: f.region, territory: null });
  const any = f.sector || f.region || f.territory || f.category;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Seg
        label="Period"
        value={f.period}
        onChange={(period) => setF({ ...f, period })}
        options={PERIODS.map((p) => ({ id: p.id, label: p.label, title: p.detail }))}
      />
      {f.period === "q" && <Seg label="Quarter" value={f.quarter} onChange={(quarter) => setF({ ...f, quarter: quarter as QuarterId })} options={(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => ({ id: q, label: q }))} />}
      <Seg label="Plan scenario" value={f.plan} onChange={(plan) => setF({ ...f, plan })} options={PLANS.map((p) => ({ id: p.id, label: p.label, title: p.detail }))} />
      <span className="mx-1 hidden h-5 w-px bg-cx-line sm:block" aria-hidden />
      <Dropdown label="Sector" value={f.sector} options={["Trade", "Non-Trade"]} onChange={(v) => setF({ ...f, sector: v as ThermoFilters["sector"] })} />
      {persona === "head" && <Dropdown label="Region" value={f.region} options={REGIONS.map((r) => r.name)} onChange={(v) => setF({ ...f, region: v, territory: null })} />}
      <Dropdown label="Territory" value={f.territory} options={territories} onChange={(v) => setF({ ...f, territory: v })} />
      <Dropdown label="Category" value={f.category} options={CATEGORY_NAMES} onChange={(v) => setF({ ...f, category: v })} />
      {any && (
        <button onClick={() => setF({ ...f, sector: null, region: null, territory: null, category: null })} className="h-8 px-1.5 text-[12px] text-cx-muted hover:text-cx-text">
          Clear
        </button>
      )}
    </div>
  );
}

const sectorTypes = (s: ThermoFilters["sector"]): ChannelPartner["type"][] => (s === "Trade" ? ["distributor", "dealer"] : s === "Non-Trade" ? ["project"] : ["distributor", "dealer", "project"]);

/** the rows of the Sales Performance table: regions, a region's territories, or the ASM's territories */
function rowGroups(persona: ThermoPersona, f: ThermoFilters): Group[] {
  if (persona === "head" && f.region) {
    const r = REGIONS.find((x) => x.name === f.region)!;
    return r.territories.filter((t) => !f.territory || t === f.territory).map((t) => ({ name: t, sub: r.name, territories: [t] }));
  }
  return groupsFor(persona)
    .map((g) => ({ ...g, territories: g.territories.filter((t) => !f.territory || t === f.territory) }))
    .filter((g) => g.territories.length);
}

export function PerformanceTab({ persona, f, setF, openDeep }: { persona: ThermoPersona; f: ThermoFilters; setF: (f: ThermoFilters) => void; openDeep: (s: DeepScope) => void }) {
  const months = periodMonths(f);
  const gm = growthMonths(f);
  const cat = categoryId(f.category);
  const groups = rowGroups(persona, f);
  const allT = groups.flatMap((g) => g.territories);
  const scopeName = persona === "head" ? (f.region ?? LBL.state) : LBL.asmRegion;

  const agg = (t: string[], s: ThermoFilters["sector"]) => aggregate(cpsIn(t, sectorTypes(s)), { months, gm, plan: f.plan, cat });
  const total = useMemo(() => agg(allT, f.sector), [allT.join(), f]); // eslint-disable-line react-hooks/exhaustive-deps
  const totalCtx: Ctx = { f, scope: `${f.territory ?? scopeName} · ${f.sector ?? "Trade + Non-Trade"}`, territories: allT, partners: f.sector === "Non-Trade" ? "Project customers" : f.sector === "Trade" ? "Distributors and dealers" : "Distributors, dealers and project customers" };
  const totalP = achPct(total);

  const nodes = useMemo((): TNode[] => {
    const sectors: ThermoFilters["sector"][] = f.sector ? [f.sector] : ["Trade", "Non-Trade"];
    const mk = (id: string, label: string, sub: string | undefined, t: string[], s: ThermoFilters["sector"], strong: boolean, children?: TNode[]): TNode => {
      const cps = cpsIn(t, sectorTypes(s));
      const a = aggregate(cps, { months, gm, plan: f.plan, cat });
      const c: Ctx = { f, scope: `${label}${s ? ` · ${s}` : ""}`, territories: t, partners: s === "Non-Trade" ? "Project customers" : s === "Trade" ? "Distributors and dealers" : "Distributors, dealers and project customers" };
      return {
        id,
        label,
        sub,
        strong,
        children,
        cells: salesCells(c, a, rstabOf(cps, f.plan, cat)),
        open: () => openDeep({ label: s && sub && label === s ? `${sub} · ${s}` : s ? `${label} · ${s}` : label, territories: t, tab: s === "Non-Trade" ? "nontrade" : "channel", cat }),
        openLabel: "Open the deep dive",
      };
    };
    const rows = groups.map((g) =>
      sectors.length > 1
        ? mk(`sp-${g.name}`, g.name, g.sub, g.territories, null, true, sectors.map((s) => ({ ...mk(`sp-${g.name}-${s}`, s!, g.name, g.territories, s, false), open: () => openDeep({ label: `${g.name} · ${s}`, territories: g.territories, tab: s === "Non-Trade" ? "nontrade" : "channel", cat }) })))
        : { ...mk(`sp-${g.name}`, g.name, g.sub, g.territories, sectors[0], false), open: () => openDeep({ label: `${g.name} · ${sectors[0]}`, territories: g.territories, tab: sectors[0] === "Non-Trade" ? "nontrade" : "channel", cat }) }
    );
    const tot = mk("sp-total", `Total, ${f.territory ?? scopeName}`, undefined, allT, f.sector, true, sectors.length > 1 ? sectors.map((s) => mk(`sp-total-${s}`, s!, "All", allT, s, false)) : undefined);
    tot.open = () => openDeep({ label: `${f.territory ?? scopeName}${f.sector ? ` · ${f.sector}` : ""}`, territories: allT, tab: f.sector === "Non-Trade" ? "nontrade" : "channel", cat });
    return [...rows, tot];
  }, [groups.map((g) => g.name).join(), f]); // eslint-disable-line react-hooks/exhaustive-deps

  const bars = groups.map((g) => {
    const a = agg(g.territories, f.sector);
    return { label: g.name, actual: a.sales, target: a.target, rag: achRag(achPct(a), f.period), growth: a.growth };
  });
  const rTot = rstabOf(cpsIn(allT, sectorTypes(f.sector)), f.plan, cat);

  return (
    <div className="space-y-6">
      <div className={`${card} p-4`}>
        <FilterBar persona={persona} f={f} setF={setF} />
      </div>

      {/* headline figures, each with its evidence */}
      <section aria-label="Headline" className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-cx-line bg-cx-line sm:grid-cols-3">
        <div className="bg-cx-panel p-5">
          <p className="text-[12px] text-cx-faint">Achievement · {periodLabel(f)}</p>
          <p className="mt-2 flex items-center gap-3">
            <Fig ev={() => evAch(totalCtx, total)} align="left" className="font-data text-[28px] leading-none text-cx-text">
              {fmtPct(totalP)}
            </Fig>
            <RagChip rag={achRag(totalP, f.period)} />
          </p>
          <p className="mt-2 text-[12px] text-cx-faint">
            <span className="font-data text-cx-muted">{fmtL(total.sales)}</span> of <span className="font-data text-cx-muted">{fmtL(total.target)}</span>
            {f.period === "mtd" && <span> · {`${EXPECTED_TODAY}% expected by the ${LBL.dataDayTh}`}</span>}
          </p>
        </div>
        <div className="bg-cx-panel p-5">
          <p className="text-[12px] text-cx-faint">Growth over last year</p>
          <p className="mt-2">
            <Fig ev={() => evGrowth(totalCtx, total)} align="left" className="font-data text-[28px] leading-none text-cx-text">
              {total.growth == null ? "NA" : `${total.growth > 0 ? "+" : ""}${fmtPct(total.growth)}`}
            </Fig>
          </p>
          <p className="mt-2 text-[12px] text-cx-faint">
            {gm ? (
              <>
                <span className="font-data text-cx-muted">{fmtL(total.cyG)}</span> vs <span className="font-data text-cx-muted">{fmtL(total.ly)}</span> · {f.period === "mtd" || f.period === "prev" ? "YTD basis, Apr–Aug" : "same months"}
              </>
            ) : (
              "No completed months in this period"
            )}
          </p>
        </div>
        <div className="bg-cx-panel p-5">
          <p className="text-[12px] text-cx-faint">RSTAB · run-rate needed to finish the year</p>
          {rTot ? (
            <>
              <p className="mt-2 flex items-baseline gap-2">
                <Fig ev={() => evRstab(totalCtx, rTot, "current")} align="left" className="font-data text-[28px] leading-none text-cx-text">
                  {fmtL(rTot.current)}
                </Fig>
                <span className="text-[12px] text-cx-faint">/ month</span>
              </p>
              <p className="mt-2 text-[12px] text-cx-faint">
                Plan needed <span className="font-data text-cx-muted">{fmtL(rTot.planned)}</span>,{" "}
                <span className="font-data" style={{ color: (rTot.incPct ?? 0) > 10 ? "#d64550" : (rTot.incPct ?? 0) > 0 ? "#c28a12" : "#2fa85c" }}>
                  {rTot.incPct == null ? "NA" : `${rTot.incPct > 0 ? "+" : ""}${rTot.incPct.toFixed(1)}%`}
                </span>{" "}
                over it
              </p>
            </>
          ) : (
            <p className="mt-2 text-[13px] text-cx-faint">No plan for this selection.</p>
          )}
        </div>
      </section>

      <section aria-label="Charts" className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className={`${card} p-5`}>
          <h2 className="text-[14px] font-medium text-cx-text">Actual against target</h2>
          <div className="mt-4">
            <BarsChart items={bars} fmt={fmtL} />
          </div>
        </div>
        <div className={`${card} p-5`}>
          <h2 className="text-[14px] font-medium text-cx-text">Growth against achievement</h2>
          <div className="mt-2">
            <ScatterChart points={bars.filter((b) => b.target).map((b) => ({ label: b.label, x: (b.actual / b.target!) * 100, y: b.growth ?? 0, size: b.actual, rag: b.rag }))} />
          </div>
        </div>
      </section>

      <section aria-labelledby="sp-title" className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
          <div>
            <h2 id="sp-title" className="text-[15px] font-medium text-cx-text">
              Sales performance · {periodLabel(f)}
            </h2>
          </div>
        </div>
        <TreeTable cols={SALES_COLS} first={{ label: persona === "head" ? (f.region ? "Territory · sector" : "Region · sector") : "Territory · sector", width: 232 }} nodes={nodes} caption="Sales performance" />
      </section>

      <Issues persona={persona} f={f} territories={allT} openDeep={openDeep} />
    </div>
  );
}

function Issues({ persona, f, territories, openDeep }: { persona: ThermoPersona; f: ThermoFilters; territories: string[]; openDeep: (s: DeepScope) => void }) {
  const months = periodMonths(f);
  const gm = growthMonths(f);
  const chan = (["distributor", "dealer"] as const).map((type) => {
    const a = aggregate(cpsIn(territories, type), { months, gm, plan: f.plan });
    const bp = a.billTarget ? (a.billing / a.billTarget) * 100 : null;
    const flags: string[] = [];
    if (a.growth != null && a.growth < 0) flags.push(`de-growing ${fmtPct(a.growth)}`);
    else if (a.growth != null && a.growth < 10) flags.push(`low growth ${fmtPct(a.growth)}`);
    if (bp != null && bp < 85) flags.push(`billing at ${fmtPct(bp, 0)} of target`);
    return { type, a, bp, flags };
  });
  const prods = CATEGORIES.map((c) => {
    const a = aggregate(cpsIn(territories, ["distributor", "dealer"]), { months, gm, plan: f.plan, cat: c.id });
    return { c, a, p: achPct(a) };
  }).filter((x) => (x.a.growth != null && x.a.growth < 0) || (x.p != null && x.p < 90));
  const scopeLabel = f.territory ?? f.region ?? (persona === "head" ? LBL.state : LBL.asmRegion);
  return (
    <section aria-label="Issues" className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className={`${card} p-5`}>
        <h2 className="text-[14px] font-medium text-cx-text">Channel issues</h2>
        <ul className="mt-3 divide-y divide-cx-line">
          {chan.map((x) => (
            <li key={x.type} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <span className="min-w-0">
                <span className="block text-[13px] text-cx-text">{x.type === "distributor" ? "Distributors" : "Dealers"}</span>
                <span className="block text-[12px] text-cx-faint">{x.flags.length ? x.flags.join(", ") : "No issue flagged"}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <RagChip rag={x.bp == null ? "na" : bpRag(x.a.billing, x.a.billTarget, f.period)} title="Billing against target participation">{x.bp == null ? "NA" : `Billing ${fmtPct(x.bp, 0)}`}</RagChip>
                <button onClick={() => openDeep({ label: `${scopeLabel} · Trade`, territories, tab: "channel" })} className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[12px] text-cx-muted hover:bg-cx-hover hover:text-cx-text">
                  Channel <ArrowUpRight className="h-3 w-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className={`${card} p-5`}>
        <h2 className="text-[14px] font-medium text-cx-text">Product issues</h2>
        {prods.length ? (
          <ul className="mt-3 divide-y divide-cx-line">
            {prods.map(({ c, a, p }) => (
              <li key={c.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <span className="min-w-0">
                  <span className="block text-[13px] text-cx-text">{c.name}</span>
                  <span className="block text-[12px] text-cx-faint">
                    {fmtL(a.sales)} of {fmtL(a.target)}
                    {a.growth != null && `, ${a.growth > 0 ? "+" : ""}${fmtPct(a.growth)} on last year`}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <RagChip rag={achRag(p, f.period)}>{fmtPct(p)}</RagChip>
                  <button onClick={() => openDeep({ label: `${scopeLabel} · ${c.name}`, territories, tab: "product", cat: c.id })} className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[12px] text-cx-muted hover:bg-cx-hover hover:text-cx-text">
                    Product <ArrowUpRight className="h-3 w-3" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[12.5px] text-cx-faint">No category behind plan or last year for this selection.</p>
        )}
      </div>
    </section>
  );
}
