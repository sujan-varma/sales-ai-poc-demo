"use client";

// Territory health heat map — one row per territory, one column per metric.
// Shared by Option A and Option B.
// Rule-based from SFA data: deliberately not tagged as AI inferred.

import { LBL } from "@/data/labels";
import React, { useEffect, useState } from "react";
import { ChevronRight, Grid3x3, X } from "lucide-react";
import { ACTION_ITEMS, AgentId, FINDINGS, HEALTH_LEVELS, HealthGrid, INSIGHTS, RECOMMENDATIONS, TERRITORIES, TERRITORY_HEALTH } from "@/data/cortexHome";
import { useHome } from "./HomeState";
import { ConfidenceScore } from "./ai";
import { AgentIcon, StatusBadge } from "./primitives";

/** Where each health dimension's rating comes from. */
const DIM_SOURCE: Record<string, { agent: AgentId; source: string }> = {
  Revenue: { agent: "map", source: "SFA secondary sales vs the Market Action Plan estimate · updated 08:00" },
  Coverage: { agent: "thermometer", source: "SFA retailer billing and beat check-ins · updated 08:00" },
  Collection: { agent: "thermometer", source: "Distributor ledger (DMS), overdue ageing · updated 07:30" },
  Stock: { agent: "thermometer", source: "Outlet stock cover from DMS · updated 08:00" },
  Pricing: { agent: "huddle", source: "Competitor mentions in Huddle calls and Pitch visit logs" },
};

/** Full evidence brief for one territory (or region): why it has the status it has. */
function TerritoryBrief({ role, name, dim, onClose, grid, unit }: { role: "asm" | "head"; name: string; dim: number | null; onClose: () => void; grid: HealthGrid; unit: string }) {
  const { focus } = useHome();
  const g = grid;
  const row = g.rows.find((r) => r.name === name)!;
  const worst = Math.min(...row.cells.map((c) => c.level));
  // Health score: the five dimensions' levels (0 critical … 4 healthy), averaged onto 0–100
  const score = Math.round((row.cells.reduce((n, c) => n + c.level, 0) / (row.cells.length * 4)) * 100);
  const dimName = dim != null ? g.columns[dim] : null;
  useEffect(() => {
    if (dim == null) return;
    const t = setTimeout(() => document.getElementById(`brief-dim-${dim}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 60);
    return () => clearTimeout(t);
  }, [dim]);
  const flagged = row.cells.map((c, i) => ({ c, dim: g.columns[i] })).filter((x) => x.c.level <= 2).sort((a, b) => a.c.level - b.c.level);
  // Evidence from the modules. Regions (sales-head view) roll up Saurashtra's territories for Raman's region.
  // a Saurashtra territory opened from the sales-head view matches like the ASM view
  const byName = role === "asm" || TERRITORIES.includes(name);
  const inScope = (t: string) => (byName ? t === name : name === LBL.asmRegion);
  const mentions = (text: string) => (byName ? text.includes(name) : name === LBL.asmRegion);
  const recs = RECOMMENDATIONS.filter((r) => inScope(r.territory)).sort((a, b) => Number(b.signal === dimName) - Number(a.signal === dimName));
  const insights = INSIGHTS.filter((i) => mentions(i.headline + i.body));
  const finds = FINDINGS.filter((f) => mentions(f.quote + f.speakerRole));
  const actions = ACTION_ITEMS.filter((a) => inScope(a.territory));

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);

  const go = (target: string) => {
    onClose();
    setTimeout(() => focus(target), 50);
  };
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="mt-7">
      <h3 className="font-data text-[10.5px] uppercase tracking-[0.08em] text-cx-faint">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
  const Link = ({ target, children }: { target: string; children: React.ReactNode }) => (
    // a div, not a button: rows contain the (interactive) confidence pill
    <div
      role="link"
      tabIndex={0}
      onClick={() => go(target)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), go(target))}
      className="flex w-full cursor-pointer items-start gap-3 border-b border-cx-line py-2.5 text-left last:border-0 hover:bg-cx-hover/40"
    >
      {children}
      <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-cx-faint" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/50" onClick={onClose}>
      <aside role="dialog" aria-label={`${name} brief`} className="h-full w-full max-w-[640px] overflow-y-auto border-l border-cx-strong bg-cx-bg px-8 py-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-data text-[10.5px] uppercase tracking-[0.08em] text-cx-faint">{unit} brief · today</p>
            <h2 className="mt-1 flex items-center gap-2.5 text-[22px] font-medium tracking-tight text-cx-text">
              {name}
              <span className="rounded px-2 py-0.5 text-[11px] font-medium" style={{ background: HEALTH_LEVELS[worst].color, color: worst === 2 ? "rgb(var(--cx-text))" : "white" }}>
                {HEALTH_LEVELS[worst].label}
              </span>
            </h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-cx-faint hover:bg-cx-hover hover:text-cx-text" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-4 rounded-lg border border-cx-line bg-cx-panel px-4 py-3">
          <div>
            <p className="text-[11px] text-cx-faint">Health score</p>
            <p className="font-data text-[26px] leading-none text-cx-text">
              {score}
              <span className="text-[13px] text-cx-faint"> / 100</span>
            </p>
          </div>
          <div className="min-w-0 flex-1">
            {/* the per-dimension bars, as on the weakest-territory card */}
            <div className="grid grid-cols-5 gap-1.5">
              {row.cells.map((c, i) => (
                <span key={i} className="flex flex-col gap-1" style={{ opacity: dim == null || dim === i ? 1 : 0.45 }}>
                  <span className="truncate text-center text-[10px] leading-[12px] text-cx-faint">{g.columns[i]}</span>
                  <span
                    className="flex h-[22px] items-center justify-center rounded-[3px] font-data text-[10.5px]"
                    style={{ background: HEALTH_LEVELS[c.level].color, color: c.level === 2 ? "rgb(var(--cx-text))" : "rgba(255,255,255,0.92)" }}
                    title={`${g.columns[i]}: ${HEALTH_LEVELS[c.level].label}`}
                  >
                    {c.value}
                  </span>
                </span>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-cx-faint">Average of five dimensions · 0 = all critical, 100 = all healthy · rule-based, not AI inferred</p>
          </div>
        </div>
        <p className="mt-3 text-[13.5px] leading-relaxed text-cx-muted">
          {flagged.length === 0 ? (
            <>Every dimension is Stable or Healthy.</>
          ) : (
            <>
              Rated <span className="text-cx-text">{HEALTH_LEVELS[worst].label.toLowerCase()}</span> because of{" "}
              {flagged.map((x, i) => (
                <span key={x.dim}>
                  <span className="text-cx-text">
                    {x.dim.toLowerCase()} ({x.c.value})
                  </span>
                  {i < flagged.length - 2 ? ", " : i === flagged.length - 2 ? " and " : ""}
                </span>
              ))}
              . The rating is rule-based from the Excel workbook data; the evidence below comes from the agents.
            </>
          )}
        </p>

        <Section title="By dimension">
          {row.cells.map((c, i) => {
            const dim = g.columns[i];
            return (
              <div
                id={`brief-dim-${i}`}
                key={dim}
                className={`flex items-start gap-3 border-b py-3 last:border-0 ${i === (dimName ? g.columns.indexOf(dimName) : -1) ? "-mx-3 rounded-lg border-transparent bg-[#2f6fed]/10 px-3 shadow-[inset_3px_0_0_#4f86f7]" : "border-cx-line"}`}
              >
                <span className="mt-0.5 w-[92px] shrink-0 rounded px-2 py-1 text-center font-data text-[11px]" style={{ background: HEALTH_LEVELS[c.level].color, color: c.level === 2 ? "rgb(var(--cx-text))" : "rgba(255,255,255,0.92)" }}>
                  {c.value}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-cx-text">
                    {dim} · <span className="text-cx-muted">{HEALTH_LEVELS[c.level].label}</span>
                  </span>
                  <span className="block text-[12px] text-cx-muted">{c.detail}</span>
                  <span className="mt-1 flex items-center gap-1.5 text-[11px] text-cx-faint">
                    <AgentIcon agent={DIM_SOURCE[dim].agent} size="sm" /> {DIM_SOURCE[dim].source}
                  </span>
                </span>
              </div>
            );
          })}
        </Section>

        {recs.length > 0 && (
          <Section title="Thermometer recommendations">
            {recs.map((r) => (
              <Link key={r.id} target={r.id}>
                <AgentIcon agent="thermometer" size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-cx-text">{r.title}</span>
                  <span className="block text-[11px] text-cx-faint">
                    {r.signal === dimName && <span className="mr-1.5 rounded bg-[#2f6fed]/20 px-1 text-[10px] text-[color:var(--ai-ink)]">Behind this rating</span>}
                    {r.territory} · {r.signal} · {r.impactLabel}
                  </span>
                </span>
                <ConfidenceScore confidence={r.confidence} align="right" />
              </Link>
            ))}
          </Section>
        )}
        {insights.length > 0 && (
          <Section title="Insights">
            {insights.map((i) => (
              <Link key={i.id} target={i.id}>
                <AgentIcon agent={i.origin.agent} size="sm" />
                <span className="min-w-0 flex-1 text-[13px] text-cx-text">{i.headline}</span>
                <ConfidenceScore confidence={i.confidence} align="right" />
              </Link>
            ))}
          </Section>
        )}
        {finds.length > 0 && (
          <Section title="From conversations">
            {finds.map((f) => (
              <Link key={f.id} target={f.id}>
                <AgentIcon agent="huddle" size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-cx-text">“{f.quote}”</span>
                  <span className="block text-[11px] text-cx-faint">
                    {f.speaker} · {f.session} · {f.when}
                  </span>
                </span>
                <ConfidenceScore confidence={f.confidence} align="right" />
              </Link>
            ))}
          </Section>
        )}
        {actions.length > 0 && (
          <Section title="In the Action Tracker">
            {actions.map((a) => (
              <Link key={a.id} target="tracker-panel">
                <AgentIcon agent={a.source} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-cx-text">{a.title}</span>
                  <span className="block text-[11px] text-cx-faint">{a.owner === LBL.asmName ? "You" : a.owner}</span>
                </span>
                <StatusBadge status={a.status} />
              </Link>
            ))}
          </Section>
        )}
      </aside>
    </div>
  );
}

export function TerritoryHealthCard({
  role,
  borderClass = "rounded-lg border-cx-line",
  id,
  header,
  grid,
  groups,
}: {
  role: "asm" | "head";
  borderClass?: string;
  id?: string;
  header?: React.ReactNode;
  /** rows to show; defaults to the role's grid */
  grid?: HealthGrid;
  /** optional territory rows under each region row (Leadership: 7 regions open to 38 territories) */
  groups?: Record<string, HealthGrid["rows"]>;
}) {
  const g = grid ?? TERRITORY_HEALTH[role];
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  // the rows on screen: each region, then its territories when opened
  const vis = g.rows.flatMap((row) => [
    { row, sub: false },
    ...(groups && openGroups.includes(row.name) ? (groups[row.name] ?? []).map((t) => ({ row: t, sub: true })) : []),
  ]);
  const allRows: HealthGrid = { ...g, rows: [...g.rows, ...Object.values(groups ?? {}).flat()] };
  const unitOf = (name: string) => (groups && !g.rows.some((r) => r.name === name) ? "Territory" : role === "asm" ? "Territory" : "Region");
  const unitWord = role === "asm" ? "territory" : "region";
  const toggleGroup = (name: string) => setOpenGroups((o) => (o.includes(name) ? o.filter((x) => x !== name) : [...o, name]));
  const allOpen = !!groups && openGroups.length === g.rows.length;
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const hc = hover ? vis[hover.r].row.cells[hover.c] : null;
  const recN = (id?: string) => RECOMMENDATIONS.find((r) => r.id === id)?.n;
  const [brief, setBrief] = useState<{ name: string; dim: number | null } | null>(null);
  const [tipRect, setTipRect] = useState<DOMRect | null>(null);

  return (
    <section id={id} className={`flex h-full flex-col border bg-cx-panel p-5 ${borderClass}`}>
      {header ?? (
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2.5 text-[15px] font-medium text-cx-text">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cx-line bg-cx-raised text-cx-muted">
            <Grid3x3 className="h-4 w-4" />
          </span>
          Territory health
        </h2>
        <span className="text-[11.5px] text-cx-faint">{role === "asm" ? LBL.asmTerritories : LBL.regions} · today</span>
      </div>
      )}
      {/* CSS grid, not a table: rows share the card's spare height, so the heat map
          fills the card edge to edge whatever height the row gives it. */}
      {groups && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-cx-faint">
          <span>
            Open a region to see its territories
          </span>
          <button onClick={() => setOpenGroups(allOpen ? [] : g.rows.map((r) => r.name))} className="text-cx-muted hover:text-cx-text" aria-pressed={allOpen}>
            {allOpen ? "Collapse all" : `Show all ${Object.values(groups).flat().length} territories`}
          </button>
        </div>
      )}
      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-x-auto">
        <div
          className="grid min-w-[460px] flex-1 gap-1"
          style={{
            gridTemplateColumns: `max-content repeat(${g.columns.length}, minmax(0, 1fr))`,
            gridTemplateRows: groups
              ? `auto ${vis.map((v) => (v.sub ? "minmax(34px, auto)" : "minmax(44px, 1fr)")).join(" ")}`
              : `auto repeat(${g.rows.length}, minmax(48px, 1fr))`,
          }}
        >
          <span className="pr-2 text-left text-[11px] text-cx-faint">{g.rowLabel}</span>
          {g.columns.map((c) => (
            <span key={c} className="text-center text-[11px] text-cx-faint">
              {c}
            </span>
          ))}
          {vis.map(({ row, sub }, r) => (
            <React.Fragment key={`${sub ? "t" : "r"}-${row.name}`}>
              {groups && !sub ? (
                <span className="flex items-center gap-1 whitespace-nowrap pr-2">
                  <button
                    onClick={() => toggleGroup(row.name)}
                    aria-expanded={openGroups.includes(row.name)}
                    aria-label={`${openGroups.includes(row.name) ? "Hide" : "Show"} ${row.name} territories`}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-cx-faint hover:bg-cx-hover hover:text-cx-text"
                  >
                    <ChevronRight className={`h-3.5 w-3.5 transition-transform ${openGroups.includes(row.name) ? "rotate-90" : ""}`} />
                  </button>
                  <button
                    onClick={() => setBrief({ name: row.name, dim: null })}
                    title={`Open the ${row.name} brief`}
                    className="text-left text-[12px] text-cx-muted underline-offset-2 hover:text-cx-text hover:underline"
                  >
                    {row.name}
                  </button>
                  <span className="font-data text-[10.5px] text-cx-faint">{groups[row.name]?.length}</span>
                </span>
              ) : (
              <button
                onClick={() => setBrief({ name: row.name, dim: null })}
                title={`Open the ${row.name} brief`}
                className={`flex items-center gap-1 whitespace-nowrap pr-2 text-left underline-offset-2 hover:text-cx-text hover:underline ${sub ? "pl-7 text-[11.5px] text-cx-faint" : "text-[12px] text-cx-muted"}`}
              >
                {row.name}
                <ChevronRight className="h-3 w-3 text-cx-faint" />
              </button>
              )}
              {row.cells.map((cell, c) => {
                const lvl = HEALTH_LEVELS[cell.level];
                const on = hover?.r === r && hover?.c === c;
                return (
                  // hover (or focus) shows this dimension's evidence; the territory name opens the full brief
                  <div
                    key={c}
                    tabIndex={0}
                    onMouseEnter={(e) => {
                      setHover({ r, c });
                      setTipRect(e.currentTarget.getBoundingClientRect());
                    }}
                    onMouseLeave={() => {
                      setHover(null);
                      setTipRect(null);
                    }}
                    onFocus={(e) => {
                      setHover({ r, c });
                      setTipRect(e.currentTarget.getBoundingClientRect());
                    }}
                    onBlur={() => {
                      setHover(null);
                      setTipRect(null);
                    }}
                    aria-label={`${row.name}, ${g.columns[c]}: ${lvl.label}, ${cell.value}. ${cell.detail}`}
                    className={`flex h-full w-full cursor-default items-center justify-center rounded-md font-data outline-none transition-[box-shadow] ${sub ? "text-[10.5px]" : "text-[11px]"}`}
                    style={{
                      background: lvl.color,
                      color: cell.level === 2 ? "rgb(var(--cx-text))" : "rgba(255,255,255,0.92)",
                      boxShadow: on ? "0 0 0 2px rgb(var(--cx-text))" : undefined,
                    }}
                  >
                    {cell.value}
                    {cell.target && <span className="ml-1 opacity-70">↗</span>}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3 pt-3">
        <p className="min-h-[32px] max-w-[60%] text-[11.5px] text-cx-muted">
          {hc && hover ? (
            <>
              <span className="text-cx-text">
                {vis[hover.r].row.name} · {g.columns[hover.c]}
              </span>{" "}
              · {HEALTH_LEVELS[hc.level].label}. {hc.detail}
              <span className="text-cx-faint"> · click the {groups ? "name" : `${unitWord} name`} for the full brief</span>
            </>
          ) : (
            <span className="text-cx-faint">Rule-based from SFA data, not AI inferred. Hover a cell for its evidence · click a {groups ? "region or territory" : unitWord} name for the full brief · ↗ = has a recommendation.</span>
          )}
        </p>
        <span className="flex items-center gap-1.5 text-[11px] text-cx-faint">
          Critical
          {HEALTH_LEVELS.map((l) => (
            <span key={l.label} className="h-3 w-4 rounded-[2px]" style={{ background: l.color }} title={l.label} />
          ))}
          Healthy
        </span>
      </div>
      {hc && hover && tipRect && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-[70] w-[280px] rounded-lg border border-cx-strong bg-cx-raised px-3 py-2.5 text-left shadow-2xl"
          style={{
            left: Math.min(Math.max(8, tipRect.left + tipRect.width / 2 - 140), window.innerWidth - 288),
            top: tipRect.top > 150 ? tipRect.top - 8 : tipRect.bottom + 8,
            transform: tipRect.top > 150 ? "translateY(-100%)" : undefined,
          }}
        >
          <p className="flex items-center justify-between gap-2 text-[12.5px] text-cx-text">
            <span>
              {vis[hover.r].row.name} · {g.columns[hover.c]}
            </span>
            <span className="rounded px-1.5 font-data text-[10.5px]" style={{ background: HEALTH_LEVELS[hc.level].color, color: hc.level === 2 ? "rgb(var(--cx-text))" : "white" }}>
              {hc.value}
            </span>
          </p>
          <p className="mt-1 text-[12px] text-cx-muted">
            <span className="text-cx-text">{HEALTH_LEVELS[hc.level].label}</span> — {hc.detail}
          </p>
          <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-cx-faint">
            <AgentIcon agent={DIM_SOURCE[g.columns[hover.c]].agent} size="sm" />
            <span>{DIM_SOURCE[g.columns[hover.c]].source}</span>
          </p>
          {hc.target && (
            <p className="mt-1.5 text-[11px] text-[color:var(--ai-ink)]">
              ↗ Recommendation #{recN(hc.target)} addresses this
            </p>
          )}
          <p className="mt-2 border-t border-cx-line pt-1.5 text-[10.5px] text-cx-faint">Click {vis[hover.r].row.name} for the full evidence brief</p>
        </div>
      )}
      {brief && <TerritoryBrief role={role} name={brief.name} dim={brief.dim} grid={allRows} unit={unitOf(brief.name)} onClose={() => setBrief(null)} />}
    </section>
  );
}
