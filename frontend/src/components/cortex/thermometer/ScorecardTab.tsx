"use client";

// Scorecard: the reference's India-1 / India-2 scorecard, scored here per region (Head of
// Sales) or per territory (ASM). Green and amber score a point; red and NA don't. A cell opens
// the initiative behind it for that column; product, channel and Non-Trade rows open the
// matching Performance deep dive. The initiative grid sits underneath.

import { LBL } from "@/data/labels";
import React, { useMemo, useState } from "react";
import { EXPECTED_TODAY, Group, RAG_COLOR, Rag3, SCORE_WEEKS, ThermoPersona, fmtL, fmtN, fmtPct, groupsFor, scoreHistory } from "@/data/thermometer";
import { card } from "../kit";
import { Area, SC_AREAS, SC_TOPICS, THRESH_LABEL, evalGroup, statusOf, Metric } from "./engine";
import { InitiativeOpen, InitiativesGrid } from "./Initiatives";
import { DeepScope } from "./DeepDive";
import { Fig, RagChip, Seg, TH, TrendChart } from "./ui";

const N = SC_AREAS.length;

function metricEv(a: Area, m: Metric | undefined, group: string) {
  const v = m?.pct == null ? "NA" : fmtPct(m.pct);
  const fmt = (n: number | undefined) => (n == null ? "–" : m?.fmt === "lakh" ? fmtL(n) : fmtN(n));
  return {
    title: `${a.label.replace(/^# /, "")} · ${group}`,
    value: v,
    source: a.link.kind === "deep" ? "DMS invoices and billing against the operating plan" : "The initiative's own feed (SFA, DMS, HR or LMS)",
    period: a.type === "phased" ? `September to date, expected ${EXPECTED_TODAY}% by the ${LBL.dataDayTh}` : a.type === "degrow" ? "Apr–Aug against last year" : "As the initiative defines it",
    formula: m?.num != null && m?.den != null ? `${fmt(m.num)} ÷ ${fmt(m.den)}${m.thr != null ? ` · maximum ${m.thr}%` : ""}` : undefined,
    included: [group],
    excluded: m?.pct == null ? ["No denominator in this scope, so no score"] : [],
    curve: a.type === "phased",
  };
}

export function ScorecardTab({ persona, onInitiative, onDeep }: { persona: ThermoPersona; onInitiative: (o: InitiativeOpen) => void; onDeep: (s: DeepScope) => void }) {
  const groups = groupsFor(persona);
  const evals = useMemo(() => Object.fromEntries(groups.map((g) => [g.name, evalGroup(g.territories)])), [persona]); // eslint-disable-line react-hooks/exhaustive-deps
  const scores = groups.map((g) => {
    const st = SC_AREAS.map((a) => statusOf(a, evals[g.name][a.key]));
    const count = (r: Rag3) => st.filter((x) => x === r).length;
    return { g, green: count("green"), amber: count("amber"), red: count("red"), na: count("na"), score: count("green") + count("amber") };
  });
  const [sel, setSel] = useState(groups[0].name);
  const [week, setWeek] = useState<"W1" | "W2" | "W3" | "W4">("W4");
  const cur = scores.find((s) => s.g.name === sel)!;
  const hist = scoreHistory(sel, cur.score, N);
  const prevWeek = hist[hist.length - 1];
  const points = [...hist.map((h) => ({ label: h.label, value: h.value })), { label: `${week} Sep`, value: cur.score, current: true }];
  const scoreTone = (n: number) => (n >= Math.ceil(N * 0.7) ? "green" : n >= Math.ceil(N * 0.5) ? "amber" : "red");

  const cellOpen = (a: Area, g: Group | null) => {
    if (a.link.kind === "initiative") onInitiative({ id: a.link.id, group: g?.name ?? null, kpi: a.link.kpi });
    else onDeep({ label: g ? g.name : persona === "head" ? LBL.state : LBL.asmRegion, territories: g ? g.territories : groups.flatMap((x) => x.territories), tab: a.link.tab, cat: a.link.cat ?? null });
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="sc-sum" className={`${card} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="sc-sum" className="text-[15px] font-medium text-cx-text">
              Score out of {N}
            </h2>
          </div>
          <span className="flex items-center gap-2 text-[12px] text-cx-faint">
            Current review
            <Seg label="Current review week" value={week} onChange={setWeek} options={(["W1", "W2", "W3", "W4"] as const).map((w) => ({ id: w, label: w }))} />
          </span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <ul className="grid grid-cols-2 content-start gap-2 sm:grid-cols-3 xl:grid-cols-2">
          {scores.map((s) => (
            <li key={s.g.name}>
              <button
                onClick={() => setSel(s.g.name)}
                aria-pressed={sel === s.g.name}
                className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${sel === s.g.name ? "border-cx-faint bg-cx-hover" : "border-cx-line hover:border-cx-strong"}`}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[12.5px] text-cx-text">{s.g.name}</span>
                  <span className="font-data text-[15px] text-cx-text">
                    {s.score}
                    <span className="text-[11px] text-cx-faint">/{N}</span>
                  </span>
                </span>
                <span className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-cx-line" aria-hidden>
                  {(["green", "amber", "red"] as const).map((r) => (
                    <span key={r} style={{ width: `${(s[r] / N) * 100}%`, background: RAG_COLOR[r] }} />
                  ))}
                </span>
                <span className="mt-1.5 block font-data text-[10.5px] text-cx-faint">
                  {s.green} G · {s.amber} A · {s.red} R · {s.na} NA
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-cx-line pt-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[13px] font-medium text-cx-text">
              {sel} · weekly score <span className="font-normal text-cx-faint">({cur.g.sub})</span>
            </h3>
            <span className="flex items-center gap-2 text-[12px] text-cx-faint">
              <RagChip rag={scoreTone(cur.score)}>{`${cur.score} / ${N}`}</RagChip>
              {cur.score - prevWeek.value >= 0 ? "+" : ""}
              {cur.score - prevWeek.value} on {prevWeek.label}
            </span>
          </div>
          <div className="mt-2">
            <TrendChart points={points} max={N} currentLabel={`${week} Sep`} />
          </div>
          <p className="mt-1 text-[11px] text-cx-faint">Weeks {SCORE_WEEKS[0]} to {SCORE_WEEKS[SCORE_WEEKS.length - 1]} are past reviews; the blue point is this review, calculated now.</p>
        </div>
        </div>
      </section>

      <section aria-labelledby="sc-table" className={card}>
        <div className="px-5 py-4">
          <h2 id="sc-table" className="text-[15px] font-medium text-cx-text">
            Scorecard
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-t border-cx-line" style={{ minWidth: 180 + 260 + groups.length * 112 }}>
            <caption className="sr-only">Scorecard by {persona === "head" ? "region" : "territory"}</caption>
            <colgroup>
              <col style={{ width: 180 }} />
              <col style={{ width: 260 }} />
              {groups.map((g) => (
                <col key={g.name} style={{ width: 112 }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-cx-line">
                <th scope="col" className={`${TH} pl-5 text-left`}>Topic</th>
                <th scope="col" className={`${TH} text-left`}>Performance area</th>
                {groups.map((g, i) => (
                  <th key={g.name} scope="col" className={`${TH} text-center ${i === groups.length - 1 ? "pr-5" : ""}`}>
                    <span className="block truncate text-cx-muted">{g.name}</span>
                    <span className="block truncate text-[10.5px]">{g.sub}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SC_TOPICS.map((tp) =>
                tp.areas.map((a, ai) => (
                  <tr key={a.key} className="border-b border-cx-line align-middle hover:bg-cx-hover/30">
                    {ai === 0 && (
                      <th scope="rowgroup" rowSpan={tp.areas.length} className="border-r border-cx-line py-3 pl-5 pr-3 text-left align-top text-[12.5px] font-medium text-cx-text">
                        {tp.topic}
                      </th>
                    )}
                    <th scope="row" className="px-3 py-3 text-left font-normal">
                      <button onClick={() => cellOpen(a, null)} className="text-left text-[13px] leading-snug text-cx-text underline-offset-2 hover:underline" title={`Open ${a.link.kind === "initiative" ? "the initiative" : "the deep dive"} for all`}>
                        {a.label}
                      </button>
                      <span className="mt-0.5 block text-[11px] text-cx-faint">{THRESH_LABEL[a.type]}</span>
                    </th>
                    {groups.map((g, i) => {
                      const m = evals[g.name][a.key];
                      const rag = statusOf(a, m);
                      return (
                        <td key={g.name} className={`px-2 py-3 text-center ${i === groups.length - 1 ? "pr-5" : ""}`}>
                          <span className="flex flex-col items-center gap-1">
                            <button onClick={() => cellOpen(a, g)} className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2f6fed]" aria-label={`${a.label}, ${g.name}: ${rag === "na" ? "no data" : rag}${m?.pct != null ? `, ${fmtPct(m.pct)}` : ""}. Open the detail.`}>
                              <RagChip rag={rag}>{rag === "na" ? "NA" : rag === "green" ? "Green" : rag === "amber" ? "Amber" : "Red"}</RagChip>
                            </button>
                            {m?.pct != null && (
                              <Fig ev={() => metricEv(a, m, g.name)} className="font-data text-[11px] text-cx-faint">
                                {fmtPct(m.pct)}
                              </Fig>
                            )}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <InitiativesGrid groups={groups} onOpen={onInitiative} />
    </div>
  );
}
