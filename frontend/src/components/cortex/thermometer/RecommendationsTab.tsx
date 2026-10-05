"use client";

// Recommendations: the reference's Action Plan, read-only. No owners, plan fields or export.
// ASM: each recommendation arrives already routed (done chip, remove / restore, "How it was
// decided"), the same as the homepage Thermometer box. Head of Sales: Route to {ASM} and
// Comment, as in Needs Your Decision.

import React, { useMemo, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, MoreHorizontal, Plus } from "lucide-react";
import { AgentRun, Confidence, RECOMMENDATIONS, RecRoute, SignalType, THERMO_SET_CONFIDENCE } from "@/data/cortexHome";
import { ACTION_TRACES, REC_SUGGESTED, ROUTE_DONE_LABEL } from "@/data/actionTraces";
import { RAG_COLOR, ThermoPersona, fmtL, regionOfTerr, asmOf } from "@/data/thermometer";
import { AiMeta, AiTag } from "../ai";
import { AgentRunChip } from "../agentRun";
import { SuggestedOutcome, TraceTrigger } from "../actionTrace";
import { useHome } from "../HomeState";
import { card } from "../kit";
import { useOutside } from "../shell";
import { CommentBox } from "../leadership/common";
import { ROUTES } from "../leadership/decisions";
import { Link, Priority, ThermoRec, buildRecs } from "./engine";
import { Seg } from "./ui";

const PRIORITY_RAG: Record<Priority, string> = { High: RAG_COLOR.red, Medium: RAG_COLOR.amber, Low: "rgb(var(--cx-faint))" };

/** The homepage recommendations, in the Action Plan shape. They keep their own traces and routes. */
const SIGNAL_LINK: Record<SignalType, { label: string; link: Link }> = {
  Collection: { label: "Channel deep dive", link: { kind: "deep", tab: "channel" } },
  Coverage: { label: "Beat-plan adherence", link: { kind: "initiative", id: "beat", kpi: "cp" } },
  Revenue: { label: "Product deep dive", link: { kind: "deep", tab: "product", cat: "rp" } },
  Stock: { label: "Distributor ordering app", link: { kind: "initiative", id: "app", kpi: "total" } },
  Pricing: { label: "Channel deep dive", link: { kind: "deep", tab: "channel" } },
};
function homeRecs(): ThermoRec[] {
  return RECOMMENDATIONS.map((r) => ({
    id: r.id,
    priority: (r.impactL >= 3 ? "High" : r.impactL >= 1.4 ? "Medium" : "Low") as Priority,
    title: r.title,
    evidence: `${r.why} ${r.impactLabel}.`,
    action: r.title,
    upliftL: r.impactL,
    territory: r.territory,
    region: regionOfTerr(r.territory),
    asm: asmOf(r.territory),
    lever: SIGNAL_LINK[r.signal],
    route: REC_SUGGESTED[r.id],
    confidence: r.confidence,
    trace: ACTION_TRACES[r.id],
  }));
}

const routeRun = (r: ThermoRec, k: RecRoute, forAsm?: string): AgentRun =>
  k === "tracker"
    ? { agent: "thermometer", steps: ["creating the action", forAsm ? `adding it to ${forAsm}'s Tracker` : "suggesting an owner"], result: forAsm ? `In ${forAsm}'s Tracker` : `Added to Tracker, ${r.territory} queue`, link: "View in Tracker" }
    : k === "map"
      ? { agent: "map", steps: [forAsm ? `opening ${forAsm}'s October draft` : "opening the October draft", "adding a suggested initiative"], result: `In the October plan as a suggested initiative`, link: "View plan" }
      : { agent: "pitch", steps: ["updating pitch priorities", "plan modified"], result: `On ${r.territory}'s next beats`, link: "View pitch" };

export function RecommendationsTab({ persona, onLink }: { persona: ThermoPersona; onLink: (l: Link, territory: string) => void }) {
  const recs = useMemo(() => {
    const derived = buildRecs(persona);
    if (persona === "head") return derived;
    // the ASM also sees the homepage recommendations; skip a derived one that repeats a homepage signal
    const home = homeRecs();
    const dup = (d: ThermoRec) => d.id === "tr-prod" && RECOMMENDATIONS.some((r) => r.signal === "Revenue" && r.territory === d.territory);
    const P: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
    return [...home, ...derived.filter((d) => !dup(d))].sort((a, b) => P[a.priority] - P[b.priority] || (b.upliftL ?? -1) - (a.upliftL ?? -1));
  }, [persona]);
  const [pri, setPri] = useState<"all" | Priority>("all");
  const rows = recs.filter((r) => pri === "all" || r.priority === pri);
  const count = (p: Priority) => recs.filter((r) => r.priority === p).length;
  const uplift = recs.reduce((a, r) => a + (r.upliftL ?? 0), 0);

  return (
    <section aria-labelledby="rec-title" className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div>
          <h2 id="rec-title" className="flex flex-wrap items-center gap-2.5 text-[15px] font-medium text-cx-text">
            Recommendations <AiTag />
          </h2>
        </div>
        <AiMeta confidence={THERMO_SET_CONFIDENCE} align="right" tag={false} />
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-cx-line px-5 py-3">
        <Seg
          label="Priority"
          value={pri}
          onChange={setPri}
          options={[
            { id: "all", label: `All ${recs.length}` },
            { id: "High", label: `High ${count("High")}` },
            { id: "Medium", label: `Medium ${count("Medium")}` },
            { id: "Low", label: `Low ${count("Low")}` },
          ]}
        />
      </div>
      <ol className="divide-y divide-cx-line border-t border-cx-line">
        {rows.map((r) => (
          <RecItem key={r.id} r={r} persona={persona} onLink={onLink} />
        ))}
        {rows.length === 0 && <li className="px-5 py-8 text-center text-[12.5px] text-cx-faint">No {pri.toString().toLowerCase()} priority recommendations.</li>}
      </ol>
    </section>
  );
}

function RecItem({ r, persona, onLink }: { r: ThermoRec; persona: ThermoPersona; onLink: (l: Link, territory: string) => void }) {
  return (
    <li id={`trec-${r.id}`} className="grid grid-cols-1 gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-[11.5px] text-cx-faint">
          <span className="inline-flex h-5 items-center gap-1.5 rounded-full border px-2 text-[11px] text-cx-text" style={{ borderColor: `${PRIORITY_RAG[r.priority]}66` }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: PRIORITY_RAG[r.priority] }} aria-hidden /> {r.priority}
          </span>
          <span>
            {r.territory}
            {persona === "head" && ` · ${r.region} · ${r.asm}`}
          </span>
          {r.upliftL != null && <span className="font-data text-cx-muted">≈ {fmtL(r.upliftL)}</span>}
        </p>
        <h3 className="mt-1.5 text-[14px] leading-snug text-cx-text">{r.title}</h3>
        <p className="mt-1 max-w-[80ch] text-[12.5px] leading-relaxed text-cx-muted">{r.evidence}</p>
        {r.action !== r.title && <p className="mt-1.5 max-w-[80ch] text-[12.5px] leading-relaxed text-cx-text">{r.action}</p>}
        <button onClick={() => onLink(r.lever.link, r.territory)} className="mt-2 inline-flex items-center gap-1 text-[12px] text-cx-muted hover:text-cx-text">
          Evidence: {r.lever.label} <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
      <div className="flex flex-col gap-2.5">
        <AiMeta confidence={r.confidence as Confidence} />
        {persona === "asm" ? <AsmRouting r={r} /> : <HeadRouting r={r} />}
      </div>
    </li>
  );
}

function AsmRouting({ r }: { r: ThermoRec }) {
  const { routes, toggleRoute, toast } = useHome();
  const active = routes[r.id] ?? [];
  const [run, setRun] = useState<{ run: AgentRun; key: number } | null>(null);
  const others = ROUTES.filter((x) => x.id !== r.route);
  return (
    <div className="space-y-2">
      <SuggestedOutcome id={`${r.id}:${r.route}`} label={ROUTE_DONE_LABEL[r.route]} trace={r.trace} source="Thermometer Recommendation" title={r.title} removed={!active.includes(r.route)} onRestore={() => toggleRoute(r.id, r.route)} />
      <div className="flex flex-wrap items-center gap-1.5">
        {active.includes(r.route) && (
          <button onClick={() => (toggleRoute(r.id, r.route), toast(`Removed: ${ROUTE_DONE_LABEL[r.route]}.`))} className="inline-flex h-7 items-center rounded-md px-1.5 text-[12px] text-cx-faint hover:bg-cx-hover hover:text-cx-text">
            Remove
          </button>
        )}
        {others.map((o) => {
          const on = active.includes(o.id);
          const Icon = on ? Check : Plus;
          return (
            <button
              key={o.id}
              aria-pressed={on}
              onClick={() => {
                toggleRoute(r.id, o.id);
                if (!on) setRun({ run: routeRun(r, o.id), key: Date.now() });
                else toast(`Removed: ${ROUTE_DONE_LABEL[o.id]}.`);
              }}
              className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12px] ${on ? "text-cx-text" : "border-cx-line text-cx-muted hover:border-cx-strong hover:text-cx-text"}`}
              style={on ? { borderColor: `${o.color}80`, background: `${o.color}14` } : undefined}
            >
              <Icon className="h-3.5 w-3.5" style={{ color: o.color }} /> {o.id === "tracker" ? "Tracker" : o.id === "map" ? "Plan" : "Pitch"}
            </button>
          );
        })}
      </div>
      {run && <AgentRunChip key={run.key} run={run.run} />}
    </div>
  );
}

function HeadRouting({ r }: { r: ThermoRec }) {
  const [routed, setRouted] = useState<RecRoute[]>([]);
  const [open, setOpen] = useState(false);
  const [run, setRun] = useState<{ run: AgentRun; key: number } | null>(null);
  const ref = useOutside<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-haspopup="menu"
            className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 text-[12px] ${open ? "border-cx-strong bg-cx-hover text-cx-text" : "border-cx-line text-cx-muted hover:text-cx-text"}`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" /> Route to {r.asm}
            {routed.length > 0 && <span className="font-data text-[10.5px] text-cx-faint">· {routed.length}</span>}
            <ChevronDown className="h-3 w-3" />
          </button>
          {open && (
            <div role="menu" className="absolute left-0 top-full z-40 mt-1 w-[280px] rounded-lg border border-cx-strong bg-cx-raised p-1 shadow-2xl">
              <p className="px-2 pb-1 pt-1.5 font-data text-[10px] uppercase tracking-[0.08em] text-cx-faint">Into {r.asm}&apos;s tools</p>
              {ROUTES.map((x) => {
                const on = routed.includes(x.id);
                const Icon = on ? Check : x.icon;
                return (
                  <button
                    key={x.id}
                    role="menuitemcheckbox"
                    aria-checked={on}
                    onClick={() => {
                      setRouted((rs) => (on ? rs.filter((y) => y !== x.id) : [...rs, x.id]));
                      setOpen(false);
                      if (!on) setRun({ run: routeRun(r, x.id, r.asm), key: Date.now() });
                    }}
                    className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-cx-hover"
                  >
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: x.color }} />
                    <span className="min-w-0 flex-1 text-[12.5px] text-cx-text">{ROUTE_DONE_LABEL[x.id]}</span>
                    {x.id === r.route && <span className="shrink-0 rounded-full border border-[#2f6fed]/45 bg-[#2f6fed]/15 px-1.5 text-[10.5px] text-[color:var(--ai-ink)]">Suggested</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <TraceTrigger trace={r.trace} source="Thermometer Recommendation" title={r.title} compact />
      </div>
      {routed.length > 0 && (
        <p className="flex flex-wrap gap-1.5">
          {routed.map((k) => {
            const def = ROUTES.find((x) => x.id === k)!;
            return (
              <span key={k} className="inline-flex h-6 items-center gap-1 rounded border px-1.5 text-[11px] text-cx-muted" style={{ borderColor: `${def.color}66` }}>
                <Check className="h-3 w-3" style={{ color: def.color }} /> {ROUTE_DONE_LABEL[k]}
              </span>
            );
          })}
        </p>
      )}
      {run && <AgentRunChip key={run.key} run={run.run} />}
      <CommentBox asm={r.asm} subject={`thermo-${r.id}`} compact />
    </div>
  );
}
