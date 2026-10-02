"use client";

// The MAP toolbar's four sheets: Market Size · Market Share · Reach · Influencers
// (wireframe §5 "Overview"), in one side sheet with its own tabs, scoped like the page.

import React, { useState } from "react";
import { BarChart3, PieChart, Store, Users } from "lucide-react";
import { BAND_COLOR, COMPETITORS, INFLUENCERS, MAP_LABELS, MARKET_BY_CATEGORY, MARKET_SOURCE, REACH, REACH_TARGET, TERRITORIES, REGION_SHARE, TERRITORY_SHARE, Territory } from "@/data/map";
import { Drawer } from "../leadership/common";
import { Tabs } from "../thermometer/ui";

export type SheetId = "size" | "share" | "reach" | "influencers";
export const SHEETS: { id: SheetId; label: string }[] = [
  { id: "size", label: "Market Size" },
  { id: "share", label: "Market Share" },
  { id: "reach", label: "Reach" },
  { id: "influencers", label: "Influencers" },
];

const TH = "px-3 py-2.5 text-left text-[11px] font-normal text-cx-faint";
const TD = "px-3 py-3 align-top text-[12.5px]";
const NUM = "font-data tabular-nums";

export function MarketSheet({ open, scope, onClose }: { open: SheetId; scope: Territory | null; onClose: () => void }) {
  const [tab, setTab] = useState<SheetId>(open);
  const where = scope ?? MAP_LABELS.region;
  return (
    <Drawer label={`${SHEETS.find((s) => s.id === tab)!.label}, ${where}`} onClose={onClose} width="max-w-[860px]">
      <h2 className="pr-10 text-[20px] font-medium text-cx-text">{where}</h2>
      <p className="mt-1 text-[12px] text-cx-faint">
        {scope ? `One of ${MAP_LABELS.asm}'s ${TERRITORIES.length} territories` : `All ${TERRITORIES.length} territories`} · {MARKET_SOURCE}
      </p>
      <div className="mt-5">
        <Tabs value={tab} options={SHEETS} onChange={setTab} label="Market sheets" size="sm" />
      </div>
      <div className="mt-5 overflow-x-auto rounded-lg border border-cx-line bg-cx-panel">
        {tab === "size" && <SizeTable scope={scope} />}
        {tab === "share" && <ShareTable scope={scope} />}
        {tab === "reach" && <ReachTable scope={scope} />}
        {tab === "influencers" && <InfluencerTable scope={scope} />}
      </div>
    </Drawer>
  );
}

function SizeTable({ scope }: { scope: Territory | null }) {
  const k = scope ? TERRITORY_SHARE[scope].marketCr / REGION_SHARE.marketCr : 1;
  return (
    <>
      <table className="w-full min-w-[760px] table-fixed">
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[11%]" />
          <col className="w-[10%]" />
          {COMPETITORS.map((c) => (
            <col key={c} className="w-[7%]" />
          ))}
          <col />
        </colgroup>
        <thead className="border-b border-cx-line">
          <tr>
            <th className={`${TH} pl-5`}>Category</th>
            <th className={`${TH} text-right`}>Market / yr</th>
            <th className={`${TH} text-right`}>Company</th>
            {COMPETITORS.map((c) => (
              <th key={c} className={`${TH} text-right`}>
                {c}
              </th>
            ))}
            <th className={`${TH} pr-5`}>Observation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cx-line">
          {MARKET_BY_CATEGORY.map((m) => {
            const lead = Math.max(...m.comp) > m.bondex;
            return (
              <tr key={m.cat}>
                <td className={`${TD} pl-5 text-cx-text`}>{m.cat}</td>
                <td className={`${TD} ${NUM} text-right text-cx-text`}>₹{(m.sizeCr * k).toFixed(1)} Cr</td>
                <td className={`${TD} ${NUM} text-right text-cx-text`}>{m.bondex.toFixed(1)}%</td>
                {m.comp.map((c, i) => (
                  <td key={i} className={`${TD} ${NUM} text-right ${c > m.bondex ? "text-[#e85a70]" : "text-cx-muted"}`}>
                    {c.toFixed(1)}%
                  </td>
                ))}
                <td className={`${TD} pr-5 text-cx-muted`}>
                  {lead && <span className="sr-only">A competitor leads. </span>}
                  {m.note}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-cx-line px-5 py-3 text-[11.5px] text-cx-faint">
        The five largest competitors in {MAP_LABELS.region}, numbered as in the workbook. A red share is a competitor ahead of the company in that category. Shares are region-wide; the ₹ size is estimated.
      </p>
    </>
  );
}

function ShareTable({ scope }: { scope: Territory | null }) {
  const rows = TERRITORIES.filter((t) => !scope || t === scope);
  return (
    <table className="w-full min-w-[620px] table-fixed">
      <colgroup>
        <col className="w-[24%]" />
        <col className="w-[16%]" />
        <col className="w-[14%]" />
        <col className="w-[16%]" />
        <col />
      </colgroup>
      <thead className="border-b border-cx-line">
        <tr>
          <th className={`${TH} pl-5`}>Territory</th>
          <th className={`${TH} text-right`}>Market / yr</th>
          <th className={`${TH} text-right`}>Share</th>
          <th className={TH}>Band</th>
          <th className={`${TH} pr-5`}>Against the 25% floor</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-cx-line">
        {rows.map((t) => {
          const s = TERRITORY_SHARE[t];
          return (
            <tr key={t}>
              <td className={`${TD} pl-5 text-cx-text`}>{t}</td>
              <td className={`${TD} ${NUM} text-right text-cx-text`}>₹{s.marketCr.toFixed(1)} Cr</td>
              <td className={`${TD} ${NUM} text-right text-cx-text`}>{s.share.toFixed(1)}%</td>
              <td className={TD}>
                <span className="inline-flex items-center gap-1.5 text-cx-text">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: BAND_COLOR[s.band] }} aria-hidden /> {s.band}
                </span>
              </td>
              <td className={`${TD} pr-5`}>
                <span className="relative block h-2 rounded-full bg-cx-line" aria-hidden>
                  <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(s.share / 35) * 100}%`, background: BAND_COLOR[s.band] }} />
                  <span className="absolute -top-1 bottom-[-4px] w-px bg-cx-muted" style={{ left: `${(25 / 35) * 100}%` }} />
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ReachTable({ scope }: { scope: Territory | null }) {
  const rows = REACH.filter((r) => !scope || r.territory === scope);
  return (
    <table className="w-full min-w-[680px] table-fixed">
      <colgroup>
        <col className="w-[30%]" />
        <col className="w-[16%]" />
        <col className="w-[13%]" />
        <col className="w-[13%]" />
        <col className="w-[12%]" />
        <col />
      </colgroup>
      <thead className="border-b border-cx-line">
        <tr>
          <th className={`${TH} pl-5`}>Distributor</th>
          <th className={TH}>Territory</th>
          <th className={`${TH} text-right`}>Retailer universe</th>
          <th className={`${TH} text-right`}>Mapped</th>
          <th className={`${TH} text-right`}>Reach</th>
          <th className={`${TH} pr-5 text-right`}>Needed for {REACH_TARGET * 100}%</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-cx-line">
        {rows.length === 0 && (
          <tr>
            <td colSpan={6} className="px-5 py-6 text-[12.5px] text-cx-faint">
              No distributor in this territory is in the reach model yet.
            </td>
          </tr>
        )}
        {rows.map((r) => {
          const reach = r.mapped / r.universe;
          const need = Math.max(0, Math.ceil(r.universe * REACH_TARGET - r.mapped));
          return (
            <tr key={r.distributor}>
              <td className={`${TD} pl-5 text-cx-text`}>{r.distributor}</td>
              <td className={`${TD} text-cx-muted`}>{r.territory}</td>
              <td className={`${TD} ${NUM} text-right text-cx-text`}>{r.universe}</td>
              <td className={`${TD} ${NUM} text-right text-cx-text`}>{r.mapped}</td>
              <td className={`${TD} ${NUM} text-right ${reach < 0.5 ? "text-[#e85a70]" : "text-cx-text"}`}>{Math.round(reach * 100)}%</td>
              <td className={`${TD} ${NUM} pr-5 text-right text-cx-text`}>{need === 0 ? "—" : `+${need}`}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function InfluencerTable({ scope }: { scope: Territory | null }) {
  const rows = INFLUENCERS.filter((r) => !scope || r.territory === scope);
  const cell = ([a, b]: number[]) => {
    return (
      <span className={NUM}>
        <span className="text-cx-text">{a}</span>
        <span className="text-cx-faint"> / {b}</span>
        <span className={`ml-2 ${a / b < 0.6 ? "text-[#e85a70]" : "text-cx-muted"}`}>{Math.round((a / Math.max(b, 1)) * 100)}%</span>
      </span>
    );
  };
  return (
    <>
      <table className="w-full min-w-[620px] table-fixed">
        <colgroup>
          <col className="w-[31%]" />
          <col />
          <col />
          <col />
        </colgroup>
        <thead className="border-b border-cx-line">
          <tr>
            <th className={`${TH} pl-5`}>BDE territory</th>
            <th className={`${TH} text-right`}>Onboarded vs target</th>
            <th className={`${TH} text-right`}>Active</th>
            <th className={`${TH} pr-5 text-right`}>Retained</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cx-line">
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-5 py-6 text-[12.5px] text-cx-faint">
                No influencer targets for this territory in the workbook.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.type}>
              <td className={`${TD} pl-5 text-cx-text`}>{r.type}</td>
              <td className={`${TD} text-right`}>{cell(r.onboarded)}</td>
              <td className={`${TD} text-right`}>{cell(r.active)}</td>
              <td className={`${TD} pr-5 text-right`}>{cell(r.retained)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-cx-line px-5 py-3 text-[11.5px] text-cx-faint">Active = 4,000+ points a month; retained = 12,000+ points in the year. From Data 12, per BDE territory.</p>
    </>
  );
}

/** The four toolbar buttons; each opens the sheet on its own tab. */
export function SheetButtons({ onOpen }: { onOpen: (id: SheetId) => void }) {
  return (
    <>
      {SHEETS.map((s) => (
        <button key={s.id} onClick={() => onOpen(s.id)} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-cx-line bg-cx-panel px-2.5 text-[12.5px] text-cx-muted hover:border-cx-strong hover:text-cx-text">
          <SheetIcon id={s.id} /> {s.label}
        </button>
      ))}
    </>
  );
}

function SheetIcon({ id }: { id: SheetId }) {
  const I = { size: PieChart, share: BarChart3, reach: Store, influencers: Users }[id];
  return <I className="h-3.5 w-3.5" />;
}
