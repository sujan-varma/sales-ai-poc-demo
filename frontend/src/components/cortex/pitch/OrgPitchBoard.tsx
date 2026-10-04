"use client";

// Pitch, org-wide — the Head of Sales's board (2 Oct 2026).
//
// The ASM opens their own Sales Executives. The Head of Sales opens every ASM's, so the board
// nests one level deeper than the ASM's: an ASM row rolls up the region, expands to the
// per-Sales-Executive table the ASM already reads, and that expands to the pitches. The
// columns are identical at both levels, so a count means the same thing wherever it sits.
// Narrow by Region, ASM or Territory. Read-only: the Head comments on a talking point, and
// the comment becomes a delegation ticket the ASM owns.
//
// Each pitch carries the ASM and region it was built for: in the workbook some officers serve
// more than one ASM, so a pitch is grouped by where it came from, never by the officer's name.

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SYNC_LABEL } from "@/data/cortexHome";
import { REGIONS, TERRITORY_COUNT } from "@/data/leadership";
import { MAP_LABELS } from "@/data/map";
import { ORG_EXECS, ORG_PITCHES, ORG_SE_COUNT, OWN_REGION, OrgExec } from "@/data/org";
import { EMPTY_SESSION, Pitch, outstandingCount, pitchesFor } from "@/data/pitch";
import { AgentPageHeader } from "../agentPage";
import { card, Dropdown } from "../kit";
import { SePitches } from "./SePitches";

const ASMS = REGIONS.map((r) => `${r.asm} · ${r.name}`);
const TERRITORIES = REGIONS.flatMap((r) => r.territories).sort();

type OrgPitch = Pitch & { asm: string; region: string };

/** Every pitch in the org: the viewing ASM's own (live, from `pitch`) plus every other ASM's. */
function allPitches(): OrgPitch[] {
  return [...pitchesFor(EMPTY_SESSION).map((p) => ({ ...p, asm: MAP_LABELS.asm, region: OWN_REGION })), ...ORG_PITCHES];
}

interface Counts {
  total: number;
  queued: number;
  inSfa: number;
  visited: number;
  outstanding: number;
  last: string | null;
}
function count(list: Pitch[]): Counts {
  const n = (st: Pitch["status"]) => list.filter((p) => p.status === st).length;
  return {
    total: list.length,
    queued: n("queued"),
    inSfa: n("in-sfa"),
    visited: n("visited"),
    outstanding: list.reduce((k, p) => k + outstandingCount(p), 0),
    last: list.map((p) => p.visited?.when).filter(Boolean)[0] ?? null,
  };
}

const COLS = ["Pitches", "Not generated", "In SFA", "Visited", "Points outstanding"];

/** Both levels share these widths, so a number sits under its heading however deep it is. */
function Columns() {
  return (
    <colgroup>
      <col className="w-[26%]" />
      <col className="w-[9%]" />
      <col className="w-[12%]" />
      <col className="w-[9%]" />
      <col className="w-[9%]" />
      <col className="w-[15%]" />
      <col />
    </colgroup>
  );
}

export function OrgPitchBoard({ onOpen }: { onOpen: (p: Pitch) => void }) {
  const pitches = useMemo(allPitches, []);
  const [region, setRegion] = useState<string | null>(null);
  const [asm, setAsm] = useState<string | null>(null);
  const [territory, setTerritory] = useState<string | null>(null);
  const [openAsm, setOpenAsm] = useState<string | null>(MAP_LABELS.asm);
  const [openSe, setOpenSe] = useState<string | null>(null);

  const shown = pitches.filter((p) => {
    if (region && p.region !== region) return false;
    if (asm && `${p.asm} · ${p.region}` !== asm) return false;
    if (territory && p.territory !== territory) return false;
    return true;
  });
  const regions = REGIONS.filter((r) => {
    if (region && r.name !== region) return false;
    if (asm && `${r.asm} · ${r.name}` !== asm) return false;
    if (territory && !r.territories.includes(territory)) return false;
    return true;
  });

  const org = count(shown);
  const clearable = region || asm || territory;
  const clear = () => {
    setRegion(null);
    setAsm(null);
    setTerritory(null);
  };

  return (
    <div className="pb-24">
      <AgentPageHeader
        agent="pitch"
        title="Pitch"
        meta={
          <>
            Every pitch across {REGIONS.length} regions · {TERRITORY_COUNT} territories · {ORG_SE_COUNT} Sales Executives · read-only · <span className="font-data">{SYNC_LABEL}</span>
          </>
        }
        right={
          <span className="inline-flex h-9 items-center rounded-lg border border-cx-line bg-cx-raised px-3 text-[12.5px] text-cx-muted" title="The ASMs create and push pitches. Comment on a talking point to raise a ticket the ASM owns.">
            Read-only · the ASMs create the pitches
          </span>
        }
      >
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-cx-muted">
          <span className="inline-flex h-6 items-center rounded-full border border-cx-line bg-cx-panel px-2 text-[11.5px] text-cx-text">Auto-push · High priority</span>
          High-priority plan initiatives reach Pitch on their own when an ASM's plan is agreed. Medium and Low wait for that ASM. You set this rule in Configuration.
        </p>
      </AgentPageHeader>

      <div className="space-y-6 px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <Dropdown label="Region" value={region} options={REGIONS.map((r) => r.name)} onChange={setRegion} placeholder={`All ${REGIONS.length}`} />
          <Dropdown label="ASM" value={asm} options={ASMS} onChange={setAsm} placeholder={`All ${REGIONS.length}`} />
          <Dropdown label="Territory" value={territory} options={TERRITORIES} onChange={setTerritory} placeholder={`All ${TERRITORY_COUNT}`} />
          <span className="ml-1 text-[12px] text-cx-faint">
            <span className="font-data text-cx-muted">{org.total}</span> pitches · <span className="font-data text-cx-muted">{org.visited}</span> visited · <span className="font-data text-cx-muted">{org.outstanding}</span> points outstanding
          </span>
          {clearable && (
            <button onClick={clear} className="text-[12px] text-cx-muted hover:text-cx-text">
              Clear
            </button>
          )}
        </div>

        <section aria-labelledby="org-pitch-title" className={`${card} overflow-x-auto`}>
          <h2 id="org-pitch-title" className="sr-only">
            Pitches by ASM and Sales Executive
          </h2>
          <table className="w-full min-w-[1000px] table-fixed">
            <Columns />
            <thead className="border-b border-cx-line">
              <tr>
                <th className="px-3 py-2.5 pl-5 text-left text-[11px] font-normal text-cx-faint">ASM · region</th>
                {COLS.map((h) => (
                  <th key={h} className="px-3 py-2.5 text-right text-[11px] font-normal text-cx-faint">
                    {h}
                  </th>
                ))}
                <th className="px-3 py-2.5 pr-5 text-left text-[11px] font-normal text-cx-faint">Last from SFA</th>
              </tr>
            </thead>
            {regions.map((r) => {
              const mine = shown.filter((p) => p.region === r.name);
              const c = count(mine);
              const open = openAsm === r.asm;
              return (
                <tbody key={r.name} className="border-b border-cx-line last:border-b-0">
                  <tr className={`cursor-pointer ${open ? "bg-cx-hover/30" : "hover:bg-cx-hover/40"}`} onClick={() => setOpenAsm(open ? null : r.asm)}>
                    <td className="py-3 pl-5 pr-3">
                      <span className="flex items-center gap-2.5">
                        {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-cx-faint" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-cx-faint" />}
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-cx-line bg-cx-raised font-data text-[10.5px] text-cx-muted">{r.initials}</span>
                        <span className="min-w-0">
                          <span className="block text-[13px] text-cx-text">{r.asm}</span>
                          <span className="block truncate text-[11.5px] text-cx-faint">
                            {r.name} · {r.territories.length} territories · {ORG_EXECS.filter((e) => e.region === r.name).length} Sales Executives
                          </span>
                        </span>
                      </span>
                    </td>
                    <Cells c={c} />
                    <td className="py-3 pl-3 pr-5 text-[12px] text-cx-muted">{c.last ? `Visit · ${c.last}` : c.total ? "No visit yet" : "—"}</td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={7} className="bg-cx-hover/20 pb-4 pt-1">
                        <ExecList
                          execs={ORG_EXECS.filter((e) => e.region === r.name && (!territory || e.territories.includes(territory)))}
                          pitches={mine}
                          openSe={openSe}
                          setOpenSe={setOpenSe}
                          onOpen={onOpen}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}
          </table>
          {regions.length === 0 && <p className="px-5 py-10 text-center text-[12.5px] text-cx-faint">No ASM matches these filters.</p>}
        </section>
      </div>
    </div>
  );
}

function Cells({ c }: { c: Counts }) {
  const td = "px-3 py-3 text-right font-data text-[12.5px]";
  return (
    <>
      <td className={`${td} text-cx-text`}>{c.total}</td>
      <td className={`${td} ${c.queued ? "text-[#e0b43a]" : "text-cx-faint"}`}>{c.queued || "—"}</td>
      <td className={`${td} text-cx-text`}>{c.inSfa}</td>
      <td className={`${td} text-cx-text`}>{c.visited}</td>
      <td className={`${td} text-cx-text`}>{c.outstanding}</td>
    </>
  );
}

/** The ASM's own per-Sales-Executive table, one level in. */
function ExecList({
  execs,
  pitches,
  openSe,
  setOpenSe,
  onOpen,
}: {
  execs: OrgExec[];
  pitches: Pitch[];
  openSe: string | null;
  setOpenSe: (v: string | null) => void;
  onOpen: (p: Pitch) => void;
}) {
  if (!execs.length) return <p className="py-3 pl-[72px] text-[12.5px] text-cx-faint">No Sales Executive matches these filters under this ASM.</p>;
  return (
    <table className="w-full table-fixed">
      <Columns />
      <thead>
        <tr className="border-b border-cx-line">
          <th className="py-2 pl-[72px] pr-3 text-left text-[11px] font-normal text-cx-faint">Sales Executive</th>
          {COLS.map((h) => (
            <th key={h} className="px-3 py-2 text-right text-[11px] font-normal text-cx-faint">
              {h}
            </th>
          ))}
          <th className="px-3 py-2 pr-5 text-left text-[11px] font-normal text-cx-faint">Last from SFA</th>
        </tr>
      </thead>
        {execs.map((e) => {
          const mine = pitches.filter((p) => p.se === e.name);
          const c = count(mine);
          const open = openSe === e.name;
          return (
            <tbody key={e.name} className="border-b border-cx-line last:border-b-0">
              <tr className={`cursor-pointer ${open ? "bg-cx-hover/40" : "hover:bg-cx-hover/40"}`} onClick={() => setOpenSe(open ? null : e.name)}>
                <td className="py-2.5 pl-[52px] pr-3">
                  <span className="flex items-center gap-2">
                    {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-cx-faint" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-cx-faint" />}
                    <span className="min-w-0">
                      <span className="block text-[13px] text-cx-text">{e.name}</span>
                      <span className="block truncate text-[11.5px] text-cx-faint">{e.territories.join(" · ")}</span>
                    </span>
                  </span>
                </td>
                <Cells c={c} />
                <td className="px-3 py-2.5 pr-5 text-[12px] text-cx-muted">{c.last ? `Visit · ${c.last}` : c.total ? "No visit yet" : "—"}</td>
              </tr>
              {open && (
                <tr>
                  <td colSpan={7} className="bg-cx-hover/30 px-5 pb-3 pt-1">
                    <SePitches pitches={mine} onOpen={onOpen} />
                  </td>
                </tr>
              )}
            </tbody>
          );
        })}
    </table>
  );
}
