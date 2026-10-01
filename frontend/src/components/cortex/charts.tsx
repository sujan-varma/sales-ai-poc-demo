"use client";

// Lightweight inline-SVG charts. Datasets are a handful of points each, so no
// charting library — each chart measures its container and draws crisply.

import React, { useLayoutEffect, useRef, useState } from "react";
import {
  AGENTS,
  AGENT_ORDER,
  ActionStatus,
  PlanMonth,
  RecDecision,
  Recommendation,
  STATUS_META,
  WEEK_DAYS,
  WeekDot,
} from "@/data/cortexHome";
import { useStatusMeta } from "./statusPalette";

// Theme-aware colours (CSS variables; defaults equal the original dark values).
// Applied through `style`, which is reliable for SVG in every browser.
const SURFACE = "rgb(var(--cx-panel))";
const GRID = "rgb(var(--cx-line))";
const AXIS_TEXT = "rgb(var(--cx-faint))";
const TEXT = "rgb(var(--cx-text))";
const MUTED = "rgb(var(--cx-muted))";
const STRONG = "rgb(var(--cx-strong))";
const AI = "#5eead4";
const MAP = AGENTS.map.color;

export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function fmtHour(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Status marks: shape is a second encoding next to color (done/delayed are
// close for protan readers), so delayed is a diamond and unassigned is hollow.
// ---------------------------------------------------------------------------

export function StatusMark({ status, x, y, r = 4 }: { status: ActionStatus; x: number; y: number; r?: number }) {
  const { meta, hollowUnassigned } = useStatusMeta();
  const c = meta[status].color;
  if (status === "delayed") {
    const s = r * 1.25;
    return <rect x={x - s} y={y - s} width={s * 2} height={s * 2} transform={`rotate(45 ${x} ${y})`} style={{ fill: c, stroke: SURFACE }} strokeWidth={1.5} />;
  }
  if (status === "unassigned" && hollowUnassigned) return <circle cx={x} cy={y} r={r - 0.5} style={{ fill: SURFACE, stroke: MUTED }} strokeWidth={1.5} />;
  return <circle cx={x} cy={y} r={r} style={{ fill: c, stroke: SURFACE }} strokeWidth={1.5} />;
}

export function StatusLegend({ hide = [] }: { hide?: ActionStatus[] }) {
  const { meta } = useStatusMeta();
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-cx-faint">
      {(Object.keys(meta) as ActionStatus[]).filter((s) => !hide.includes(s)).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <svg width="10" height="10" aria-hidden>
            <StatusMark status={s} x={5} y={5} r={3.5} />
          </svg>
          {meta[s].label}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action Tracker — dot timeline: one row per source agent, across the week.
// ---------------------------------------------------------------------------

export function ActionDotTimeline({
  dots,
  rowH = 28,
  hideStatuses = [],
  iconLabels,
  legendGap = 8,
}: {
  dots: WeekDot[];
  rowH?: number;
  hideStatuses?: ActionStatus[];
  /** render each row's label as the agent's own icon + name (HTML), instead of a coloured square */
  iconLabels?: (agent: WeekDot["agent"]) => React.ReactNode;
  legendGap?: number;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<WeekDot | null>(null);
  const labelW = iconLabels ? 140 : 92;
  const countW = 30;
  const top = 22;
  const h = top + rowH * AGENT_ORDER.length + 2;
  const colW = Math.max(0, (w - labelW - countW) / 7);
  const dense = dots.length > 30;
  const x = (d: WeekDot) => labelW + (d.day + d.hour / 24) * colW;

  return (
    <div>
      <div ref={ref} className="relative w-full">
        {w > 0 && (
          <svg width={w} height={h} role="img" aria-label="Actions originated this week, by source agent">
            {/* today band */}
            <rect x={labelW + 6 * colW} y={0} width={colW} height={h} style={{ fill: TEXT }} opacity={0.035} />
            {WEEK_DAYS.map((d, i) => (
              <g key={d}>
                <line x1={labelW + i * colW} x2={labelW + i * colW} y1={top - 4} y2={h} style={{ stroke: GRID }} strokeDasharray="2 3" />
                <text x={labelW + i * colW + colW / 2} y={11} textAnchor="middle" fontSize={10} style={{ fill: i === 6 ? TEXT : AXIS_TEXT }} fontFamily="var(--font-plex-mono)">
                  {i === 6 ? "Today" : d}
                </text>
              </g>
            ))}
            {AGENT_ORDER.map((a, r) => {
              const cy = top + r * rowH + rowH / 2;
              const rowDots = dots.filter((d) => d.agent === a);
              return (
                <g key={a}>
                  <line x1={labelW} x2={w - countW} y1={cy} y2={cy} style={{ stroke: GRID }} />
                  {!iconLabels && (
                    <>
                      <rect x={0} y={cy - 3} width={6} height={6} rx={1.5} fill={AGENTS[a].color} />
                      <text x={12} y={cy + 3.5} fontSize={11} style={{ fill: MUTED }}>
                        {a === "map" ? "MAP" : AGENTS[a].name}
                      </text>
                    </>
                  )}
                  <text x={w - 2} y={cy + 3.5} textAnchor="end" fontSize={11} style={{ fill: TEXT }} fontFamily="var(--font-plex-mono)">
                    {rowDots.length}
                  </text>
                  {rowDots.map((d, i) => (
                    <g key={i} onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(null)} style={{ cursor: "default" }}>
                      <circle cx={x(d)} cy={cy} r={9} fill="transparent" />
                      <StatusMark status={d.status} x={x(d)} y={cy} r={hover === d ? 5.5 : dense ? 3.2 : 4.2} />
                    </g>
                  ))}
                </g>
              );
            })}
          </svg>
        )}
        {w > 0 &&
          iconLabels &&
          AGENT_ORDER.map((a, r) => (
            <div key={a} className="pointer-events-none absolute left-0 flex -translate-y-1/2 items-center" style={{ top: top + r * rowH + rowH / 2, width: labelW - 8 }}>
              {iconLabels(a)}
            </div>
          ))}
      </div>
      <div className="flex min-h-[18px] flex-wrap items-center justify-between gap-2" style={{ marginTop: legendGap }}>
        {hover ? (
          <p className="truncate text-[11.5px] text-cx-muted">
            <span style={{ color: AGENTS[hover.agent].color }}>{AGENTS[hover.agent].name}</span>
            <span className="font-data text-cx-faint"> · {WEEK_DAYS[hover.day]} {fmtHour(hover.hour)} · </span>
            {hover.label} <span className="text-cx-faint">· {STATUS_META[hover.status].label}</span>
          </p>
        ) : (
          <StatusLegend hide={hideStatuses} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thermometer — confidence vs impact scatter. Top-right = act first.
// ---------------------------------------------------------------------------

const DECISION_COLOR: Record<RecDecision, string> = {
  tracked: STATUS_META.done.color,
  escalated: MAP,
  dismissed: "#7c796e",
};

export function ConfidenceImpactScatter({
  recs,
  hovered,
  onHover,
  decisions,
  height = 210,
  accent = AI,
}: {
  recs: Recommendation[];
  hovered: string | null;
  onHover: (id: string | null) => void;
  decisions: Record<string, RecDecision>;
  height?: number;
  accent?: string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const m = { l: 40, r: 14, t: 14, b: 30 };
  const iw = Math.max(0, w - m.l - m.r);
  const ih = height - m.t - m.b;
  const X = (c: number) => m.l + ((c - 30) / 70) * iw;
  const Y = (v: number) => m.t + ih - (v / 5) * ih;
  const hov = recs.find((r) => r.id === hovered);

  return (
    <div ref={ref} className="relative w-full">
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label="Recommendations by confidence and impact">
          <rect x={X(70)} y={Y(5)} width={X(100) - X(70)} height={Y(2) - Y(5)} fill={accent} opacity={0.06} />
          <text x={X(100) - 6} y={Y(5) + 13} textAnchor="end" fontSize={10} fill={accent} opacity={0.85} fontFamily="var(--font-plex-mono)">
            ACT FIRST
          </text>
          <text x={X(30) + 6} y={Y(0) - 8} fontSize={10} style={{ fill: AXIS_TEXT }} fontFamily="var(--font-plex-mono)">
            VERIFY BEFORE ACTING
          </text>
          {[0, 1, 2, 3, 4, 5].map((v) => (
            <g key={v}>
              <line x1={m.l} x2={w - m.r} y1={Y(v)} y2={Y(v)} style={{ stroke: GRID }} />
              <text x={m.l - 8} y={Y(v) + 3.5} textAnchor="end" fontSize={10} style={{ fill: AXIS_TEXT }} fontFamily="var(--font-plex-mono)">
                ₹{v}L
              </text>
            </g>
          ))}
          {[30, 50, 70, 90, 100].map((c) => (
            <text key={c} x={X(c)} y={height - 12} textAnchor="middle" fontSize={10} style={{ fill: AXIS_TEXT }} fontFamily="var(--font-plex-mono)">
              {c}
            </text>
          ))}
          <line x1={X(70)} x2={X(70)} y1={m.t} y2={m.t + ih} style={{ stroke: GRID }} strokeDasharray="3 3" />
          <text x={w - m.r} y={height - 1} textAnchor="end" fontSize={10} style={{ fill: AXIS_TEXT }}>
            Confidence →
          </text>
          {recs.map((r) => {
            const d = decisions[r.id];
            const color = d ? DECISION_COLOR[d] : accent;
            const on = hovered === r.id;
            return (
              <g
                key={r.id}
                onMouseEnter={() => onHover(r.id)}
                onMouseLeave={() => onHover(null)}
                opacity={d === "dismissed" ? 0.5 : 1}
                style={{ cursor: "default" }}
              >
                <circle cx={X(r.confidence.score)} cy={Y(r.impactL)} r={16} fill="transparent" />
                <circle
                  cx={X(r.confidence.score)}
                  cy={Y(r.impactL)}
                  r={on ? 12 : 10}
                  fill={color}
                  fillOpacity={on ? 0.3 : 0.16}
                  stroke={color}
                  strokeWidth={on ? 2 : 1.5}
                  strokeDasharray={d === "dismissed" ? "2 2" : undefined}
                />
                <text x={X(r.confidence.score)} y={Y(r.impactL) + 3.5} textAnchor="middle" fontSize={10.5} fill={color} fontFamily="var(--font-plex-mono)">
                  {r.n}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {hov && w > 0 && (
        <div
          className="pointer-events-none absolute z-20 w-max max-w-[220px] rounded-md border border-cx-strong bg-cx-raised px-2.5 py-1.5 text-[11.5px] shadow-xl"
          style={{
            left: Math.min(X(hov.confidence.score) + 16, w - 230),
            top: Math.max(0, Y(hov.impactL) - 20),
          }}
        >
          <p className="text-cx-text">
            #{hov.n} {hov.territory} · {hov.signal}
          </p>
          <p className="font-data text-cx-faint">
            conf {hov.confidence.score} · {hov.impactLabel}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Market Action Plan — connected node timeline.
// ---------------------------------------------------------------------------

export function pct(m: PlanMonth) {
  return m.estimateL && m.achievedL != null ? Math.round((m.achievedL / m.estimateL) * 100) : null;
}

/** The live (in-progress) month's ring is green so it reads as "happening now". */
const IN_PROGRESS_RING = "#2fa85c";

export function MapNodeTimeline({
  months,
  deliveredColor = MAP,
  pendingColor = MAP,
}: {
  months: PlanMonth[];
  deliveredColor?: string;
  /** colour of the not-yet-created month's node */
  pendingColor?: string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const n = months.length;
  const h = 84;
  const cy = 42;
  const r = 25;
  const cx = (i: number) => (i + 0.5) * (w / n);
  const C = 2 * Math.PI * r;

  return (
    <div ref={ref} className="w-full">
      {w > 0 && (
        <svg width={w} height={h} role="img" aria-label="Delivered percentage by plan month">
          {months.slice(1).map((mo, i) => (
            <line
              key={mo.month}
              x1={cx(i) + r + 3}
              x2={cx(i + 1) - r - 3}
              y1={cy}
              y2={cy}
              style={{ stroke: STRONG }}
              strokeWidth={1.5}
              strokeDasharray={mo.created ? undefined : "3 4"}
            />
          ))}
          {months.map((mo, i) => {
            const p = pct(mo);
            return (
              <g key={mo.month}>
                {!mo.created && <circle cx={cx(i)} cy={cy} r={r + 7} style={{ fill: pendingColor }} opacity={0.1} />}
                <circle cx={cx(i)} cy={cy} r={r} style={{ fill: SURFACE, stroke: mo.created ? GRID : pendingColor }} strokeOpacity={mo.created ? 1 : 0.8} strokeWidth={mo.created ? 3 : 1.5} strokeDasharray={mo.created ? undefined : "4 3"} />
                {p != null && (
                  <circle
                    cx={cx(i)}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke={mo.status === "progress" ? IN_PROGRESS_RING : deliveredColor}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeDasharray={`${(Math.min(p, 100) / 100) * C} ${C}`}
                    strokeOpacity={1}
                    transform={`rotate(-90 ${cx(i)} ${cy})`}
                  />
                )}
                <text x={cx(i)} y={cy + (p != null ? 4.5 : 6)} textAnchor="middle" fontSize={p != null ? 12.5 : 18} style={{ fill: p != null ? TEXT : pendingColor }} fontFamily="var(--font-plex-mono)">
                  {p != null ? `${p}%` : "+"}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Option A — Action Tracker line graph: Completed / In progress / Delayed.
// ---------------------------------------------------------------------------

export function StatusLineChart({
  labels,
  series,
  height = 260,
}: {
  labels: string[];
  series: { status: ActionStatus; label: string; values: number[] }[];
  height?: number;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const { meta } = useStatusMeta();
  const [hi, setHi] = useState<number | null>(null);
  const m = { l: 34, r: 96, t: 14, b: 26 };
  const iw = Math.max(0, w - m.l - m.r);
  const ih = Math.max(0, height - m.t - m.b);
  const n = labels.length;
  const rawMax = Math.max(1, ...series.flatMap((s) => s.values));
  const step = rawMax <= 10 ? 2 : rawMax <= 40 ? 10 : rawMax <= 100 ? 20 : 50;
  const max = Math.ceil(rawMax / step) * step;
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  const X = (i: number) => m.l + (i / (n - 1)) * iw;
  const Y = (v: number) => m.t + ih - (v / max) * ih;
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${X(i)},${Y(v)}`).join(" ");

  // keep end labels from colliding
  const ends = series.map((s) => ({ s, y: Y(s.values[n - 1]) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;

  return (
    <div ref={ref} className="relative h-full w-full">
      {w > 0 && (
        <svg
          width={w}
          height={height}
          role="img"
          aria-label="Actions this month: completed, in progress and delayed"
          onMouseMove={(e) => {
            const i = Math.round(((e.clientX - e.currentTarget.getBoundingClientRect().left - m.l) / iw) * (n - 1));
            setHi(i >= 0 && i < n ? i : null);
          }}
          onMouseLeave={() => setHi(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={m.l + iw} y1={Y(t)} y2={Y(t)} style={{ stroke: GRID }} />
              <text x={m.l - 8} y={Y(t) + 3.5} textAnchor="end" fontSize={10} style={{ fill: AXIS_TEXT }} fontFamily="var(--font-plex-mono)">
                {t}
              </text>
            </g>
          ))}
          {labels.map((l, i) =>
            // narrow charts show first / middle / last only, so dates never collide
            (iw < 420 ? i === 0 || i === Math.floor((n - 1) / 2) || i === n - 1 : i % 2 === 0 || i === n - 1) ? (
              <text key={l} x={X(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize={10} style={{ fill: hi === i ? TEXT : AXIS_TEXT }} fontFamily="var(--font-plex-mono)">
                {l}
              </text>
            ) : null
          )}
          {hi != null && <line x1={X(hi)} x2={X(hi)} y1={m.t} y2={m.t + ih} style={{ stroke: STRONG }} strokeDasharray="2 3" />}
          {series.map((s) => (
            <path key={s.status} d={path(s.values)} fill="none" style={{ stroke: meta[s.status].color }} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {series.map((s) => (
            <g key={`m-${s.status}`}>
              <StatusMark status={s.status} x={X(n - 1)} y={Y(s.values[n - 1])} r={4} />
              {hi != null && <StatusMark status={s.status} x={X(hi)} y={Y(s.values[hi])} r={4.5} />}
            </g>
          ))}
          {ends.map(({ s, y }) => (
            <text key={`l-${s.status}`} x={X(n - 1) + 10} y={y + 3.5} fontSize={11} style={{ fill: MUTED }}>
              <tspan fontFamily="var(--font-plex-mono)" style={{ fill: TEXT }}>
                {s.values[n - 1]}
              </tspan>{" "}
              {s.label}
            </text>
          ))}
        </svg>
      )}
      {hi != null && w > 0 && (
        <div className="pointer-events-none absolute top-0 z-10 rounded-md border border-cx-strong bg-cx-raised px-2.5 py-1.5 text-[11.5px] shadow-xl" style={{ left: Math.min(X(hi) + 10, w - 170) }}>
          <p className="font-data text-cx-text">{labels[hi]}</p>
          {series.map((s) => (
            <p key={s.status} className="flex items-center gap-1.5 text-cx-muted">
              <svg width="9" height="9" aria-hidden>
                <StatusMark status={s.status} x={4.5} y={4.5} r={3.2} />
              </svg>
              {s.label} <span className="font-data text-cx-text">{s.values[hi]}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
