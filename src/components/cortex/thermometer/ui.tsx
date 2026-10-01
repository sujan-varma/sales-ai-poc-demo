"use client";

// Thermometer building blocks: the expandable tree table every view uses, the evidence
// trail behind any figure, status chips, segmented controls and the small SVG charts.
// Table spec follows the reconciliation doc: table-fixed + colgroup, 11px faint headers,
// py-3 rows, pl-5 on the first column and pr-5 on the last.

import React, { useEffect, useRef, useState } from "react";
import { ChevronRight, Database, FileSearch, X } from "lucide-react";
import { AS_OF, DAY_CURVE_POINTS, EXPECTED_TODAY, Evidence, RAG_COLOR, RAG_LABEL, Rag3 } from "@/data/thermometer";

// ---------------------------------------------------------------------------
// Status chip
// ---------------------------------------------------------------------------

export function RagChip({ rag, children, title }: { rag: Rag3; children?: React.ReactNode; title?: string }) {
  if (rag === "na")
    return (
      <span className="inline-flex h-6 items-center rounded-full border border-dashed border-cx-strong px-2 font-data text-[11px] text-cx-faint" title={title}>
        {children ?? "NA"}
      </span>
    );
  const c = RAG_COLOR[rag];
  return (
    <span
      className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 font-data text-[11.5px] text-cx-text"
      style={{ borderColor: `${c}66`, background: `${c}1a` }}
      title={title ?? RAG_LABEL[rag]}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c }} aria-hidden />
      {children ?? RAG_LABEL[rag]}
      <span className="sr-only"> ({RAG_LABEL[rag]})</span>
    </span>
  );
}

export const NA = () => <span className="font-data text-[11.5px] text-cx-faint">NA</span>;

// ---------------------------------------------------------------------------
// Evidence trail: any figure opens where it came from
// ---------------------------------------------------------------------------

function CurveMini() {
  const W = 300;
  const H = 86;
  const pts = DAY_CURVE_POINTS;
  const x = (d: number) => 6 + ((d - 1) / (pts.length - 1)) * (W - 12);
  const y = (p: number) => 18 + (1 - p / 100) * (H - 34);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)} ${y(p.pct).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-1.5 w-full" role="img" aria-label={`Expected achievement curve: ${EXPECTED_TODAY}% by day ${AS_OF.day}`}>
      <path d={path} fill="none" stroke="rgb(var(--cx-muted))" strokeWidth="1.5" />
      <line x1={x(AS_OF.day)} x2={x(AS_OF.day)} y1={4} y2={H - 16} stroke="#4f86f7" strokeDasharray="3 3" />
      <circle cx={x(AS_OF.day)} cy={y(EXPECTED_TODAY)} r="3.5" fill="#4f86f7" />
      <text x={x(AS_OF.day) - 4} y={y(EXPECTED_TODAY) - 6} textAnchor="end" fontSize="10" fill="rgb(var(--cx-text))" className="font-data">
        day {AS_OF.day}: {EXPECTED_TODAY}%
      </text>
      <text x={6} y={H - 3} fontSize="9.5" fill="rgb(var(--cx-faint))">1 Sep</text>
      <text x={W - 6} y={H - 3} fontSize="9.5" textAnchor="end" fill="rgb(var(--cx-faint))">30 Sep</text>
    </svg>
  );
}

function EvidenceBody({ ev }: { ev: Evidence }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="flex items-center gap-1.5 text-[11px] text-cx-faint">
          <FileSearch className="h-3 w-3" /> Where this number comes from
        </p>
        <p className="mt-1 text-[13px] text-cx-text">{ev.title}</p>
        <p className="mt-0.5 font-data text-[20px] leading-tight text-cx-text">{ev.value}</p>
      </div>
      <dl className="grid grid-cols-[76px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[12px]">
        <dt className="text-cx-faint">Source</dt>
        <dd className="flex items-start gap-1.5 text-cx-muted">
          <Database className="mt-0.5 h-3 w-3 shrink-0" /> {ev.source}
        </dd>
        <dt className="text-cx-faint">Period</dt>
        <dd className="text-cx-muted">{ev.period}</dd>
        {ev.formula && (
          <>
            <dt className="text-cx-faint">Calculated</dt>
            <dd className="font-data text-[11.5px] leading-snug text-cx-muted">{ev.formula}</dd>
          </>
        )}
      </dl>
      <div className="grid grid-cols-1 gap-3 border-t border-cx-line pt-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] text-cx-faint">Included</p>
          <ul className="mt-1 space-y-0.5 text-[12px] text-cx-muted">
            {ev.included.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] text-cx-faint">Excluded</p>
          <ul className="mt-1 space-y-0.5 text-[12px] text-cx-muted">
            {ev.excluded.length ? ev.excluded.map((x) => <li key={x}>{x}</li>) : <li>Nothing</li>}
          </ul>
        </div>
      </div>
      {ev.curve && (
        <div className="border-t border-cx-line pt-3">
          <p className="text-[11px] text-cx-faint">Colour judged against the September curve: green at {EXPECTED_TODAY}% or above, amber from {(EXPECTED_TODAY * 0.9).toFixed(1)}%.</p>
          <CurveMini />
        </div>
      )}
    </div>
  );
}

/** A figure that opens its evidence trail on click or Enter. Same dimmed surface as "How it was decided". */
export function Fig({ children, ev, className = "", align = "right" }: { children: React.ReactNode; ev: () => Evidence; className?: string; align?: "left" | "right" }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!rect) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRect(null);
        trigger.current?.focus();
      }
    };
    const s = () => setRect(null);
    const m = (e: MouseEvent) => !panel.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node) && setRect(null);
    document.addEventListener("keydown", k);
    document.addEventListener("mousedown", m);
    window.addEventListener("scroll", s, { passive: true, capture: true });
    return () => {
      document.removeEventListener("keydown", k);
      document.removeEventListener("mousedown", m);
      window.removeEventListener("scroll", s, { capture: true });
    };
  }, [rect]);

  let pos: React.CSSProperties = {};
  if (rect && typeof window !== "undefined") {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(380, vw - 24);
    const left = Math.min(Math.max(12, align === "right" ? rect.right - w : rect.left), vw - w - 12);
    const below = rect.bottom + 8;
    pos = vh - below > 340 || rect.top < vh / 2 ? { left, top: below, width: w, maxHeight: vh - below - 12 } : { left, bottom: vh - rect.top + 8, width: w, maxHeight: rect.top - 20 };
  }
  const ev0 = rect ? ev() : null;
  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setRect((r) => (r ? null : trigger.current!.getBoundingClientRect()))}
        aria-expanded={!!rect}
        aria-haspopup="dialog"
        title="Where this number comes from"
        className={`rounded-sm underline decoration-cx-strong decoration-dotted underline-offset-[3px] hover:decoration-cx-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2f6fed] ${rect ? "bg-cx-hover" : ""} ${className}`}
      >
        {children}
      </button>
      {rect && ev0 && (
        <>
          <div aria-hidden className="cx-land-fade pointer-events-none fixed inset-0 z-[75] bg-black/40" />
          <div ref={panel} role="dialog" aria-label={`Evidence: ${ev0.title}`} className="cx-land-fade fixed z-[76] overflow-y-auto rounded-lg border border-cx-strong bg-cx-bg p-4 text-left shadow-[0_16px_48px_rgba(0,0,0,0.5)]" style={pos}>
            <button onClick={() => setRect(null)} className="absolute right-2.5 top-2.5 rounded-md p-1 text-cx-faint hover:bg-cx-hover hover:text-cx-text" aria-label="Close">
              <X className="h-3.5 w-3.5" />
            </button>
            <EvidenceBody ev={ev0} />
          </div>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Tree table
// ---------------------------------------------------------------------------

export interface Col {
  key: string;
  label: React.ReactNode;
  width: number;
  align?: "left" | "right" | "center";
  /** draws a hairline before this column (start of a column group) */
  divide?: boolean;
}
export interface TNode {
  id: string;
  label: React.ReactNode;
  sub?: React.ReactNode;
  cells: React.ReactNode[];
  children?: TNode[];
  strong?: boolean;
  /** a row-level action: opens the deep dive / detail. Rendered as the label link. */
  open?: () => void;
  openLabel?: string;
  /** full-width content shown under the row when expanded (detail tables) */
  detail?: React.ReactNode;
  flash?: boolean;
}

export const TH = "px-3 py-2.5 text-[11px] font-normal text-cx-faint";

export function TreeTable({
  cols,
  first,
  nodes,
  groups,
  openIds,
  empty = "Nothing in this selection.",
  caption,
}: {
  cols: Col[];
  first: { label: React.ReactNode; width: number };
  nodes: TNode[];
  groups?: { label: string; span: number }[];
  openIds?: string[];
  empty?: string;
  caption?: string;
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(openIds ?? []));
  useEffect(() => {
    if (openIds?.length) setOpen((s) => new Set(Array.from(s).concat(openIds)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIds?.join("|")]);
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const total = first.width + cols.reduce((a, c) => a + c.width, 0);
  const rows: React.ReactNode[] = [];
  const walk = (ns: TNode[], depth: number) => {
    for (const n of ns) {
      const has = !!(n.children?.length || n.detail);
      const isOpen = open.has(n.id);
      rows.push(
        <tr key={n.id} id={`row-${n.id}`} className={`border-b border-cx-line align-middle ${n.strong ? "bg-cx-raised/50" : ""} ${n.flash ? "cx-flash" : ""} hover:bg-cx-hover/40`}>
          <td className="py-3 pl-5 pr-3" style={{ paddingLeft: 20 + depth * 18 }}>
            <span className="flex min-w-0 items-start gap-1.5">
              {has ? (
                <button
                  onClick={() => toggle(n.id)}
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? "Collapse" : "Expand"} ${typeof n.label === "string" ? n.label : "row"}`}
                  className="-ml-1 mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded text-cx-faint hover:bg-cx-hover hover:text-cx-text"
                >
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </button>
              ) : (
                <span className="w-4 shrink-0" />
              )}
              <span className="min-w-0">
                {n.open ? (
                  <button onClick={n.open} className={`text-left text-[13px] leading-snug underline-offset-2 hover:underline ${n.strong ? "font-medium text-cx-text" : "text-cx-text"}`} title={n.openLabel}>
                    {n.label}
                  </button>
                ) : (
                  <span className={`block text-[13px] leading-snug ${n.strong ? "font-medium text-cx-text" : depth > 1 ? "text-cx-muted" : "text-cx-text"}`}>{n.label}</span>
                )}
                {n.sub && <span className="block text-[11px] text-cx-faint">{n.sub}</span>}
              </span>
            </span>
          </td>
          {n.cells.map((c, i) => (
            <td
              key={i}
              className={`py-3 ${i === n.cells.length - 1 ? "pl-3 pr-5" : "px-3"} ${cols[i]?.align === "left" ? "text-left" : cols[i]?.align === "center" ? "text-center" : "text-right"} font-data text-[12.5px] tabular-nums text-cx-text ${cols[i]?.divide ? "border-l border-cx-line" : ""}`}
            >
              {c}
            </td>
          ))}
        </tr>
      );
      if (has && isOpen) {
        if (n.detail)
          rows.push(
            <tr key={`${n.id}:detail`} className="border-b border-cx-line">
              <td colSpan={cols.length + 1} className="bg-cx-bg/60 py-3 pr-5" style={{ paddingLeft: 38 + depth * 18 }}>
                {n.detail}
              </td>
            </tr>
          );
        if (n.children) walk(n.children, depth + 1);
      }
    }
  };
  walk(nodes, 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-t border-cx-line" style={{ minWidth: total }}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <colgroup>
          <col style={{ width: first.width }} />
          {cols.map((c) => (
            <col key={c.key} style={{ width: c.width }} />
          ))}
        </colgroup>
        <thead>
          {groups && (
            <tr className="border-b border-cx-line">
              <th className={`${TH} pl-5`} />
              {groups.map((g, i) => (
                <th key={g.label + i} colSpan={g.span} scope="colgroup" className={`${TH} border-l border-cx-line text-center font-data uppercase tracking-[0.08em] text-[10px]`}>
                  {g.label}
                </th>
              ))}
            </tr>
          )}
          <tr className="border-b border-cx-line">
            <th scope="col" className={`${TH} pl-5 text-left`}>
              {first.label}
            </th>
            {cols.map((c, i) => (
              <th
                key={c.key}
                scope="col"
                className={`${TH} ${i === cols.length - 1 ? "pr-5" : ""} ${c.align === "left" ? "text-left" : c.align === "center" ? "text-center" : "text-right"} ${c.divide ? "border-l border-cx-line" : ""}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows
          ) : (
            <tr>
              <td colSpan={cols.length + 1} className="px-5 py-8 text-center text-[12.5px] text-cx-faint">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Segmented control + tabs
// ---------------------------------------------------------------------------

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string; title?: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="flex h-8 max-w-full items-center overflow-x-auto rounded-lg border border-cx-line bg-cx-panel p-0.5 text-[12px]" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          aria-pressed={value === o.id}
          title={o.title}
          onClick={() => onChange(o.id)}
          className={`h-full whitespace-nowrap rounded-md px-2.5 ${value === o.id ? "bg-cx-hover text-cx-text" : "text-cx-faint hover:text-cx-muted"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ value, options, onChange, label, size = "md" }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string; size?: "md" | "sm" }) {
  return (
    <div className={`flex w-fit max-w-full items-center overflow-x-auto rounded-lg border border-cx-line bg-cx-panel p-1 ${size === "md" ? "h-9 text-[13px]" : "h-8 text-[12.5px]"}`} role="tablist" aria-label={label}>
      {options.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`h-full whitespace-nowrap rounded-md px-3.5 ${value === t.id ? "bg-cx-text text-cx-bg" : "text-cx-muted hover:bg-cx-hover hover:text-cx-text"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Charts (SVG, tokens only)
// ---------------------------------------------------------------------------

export function BarsChart({ items, fmt }: { items: { label: string; actual: number; target: number | null; rag: Rag3 }[]; fmt: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => Math.max(i.actual, i.target ?? 0)));
  return (
    <ul className="space-y-2.5" aria-label="Actual against target">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[84px_minmax(0,1fr)_auto] items-center gap-2.5 sm:grid-cols-[104px_minmax(0,1fr)_128px] sm:gap-3">
          <span className="truncate text-[12px] text-cx-muted" title={i.label}>
            {i.label}
          </span>
          <span className="relative block h-5">
            {i.target != null && <span className="absolute inset-y-0 left-0 rounded-[3px] border border-dashed border-cx-strong" style={{ width: `${(i.target / max) * 100}%` }} aria-hidden />}
            <span className="cx-stripe absolute inset-y-[3px] left-0 rounded-[2px]" style={{ width: `${(i.actual / max) * 100}%`, background: i.rag === "na" ? "rgb(var(--cx-strong))" : RAG_COLOR[i.rag] }} aria-hidden />
          </span>
          <span className="text-right font-data text-[11px] text-cx-faint">
            <span className="text-cx-muted">{fmt(i.actual)}</span>
            {i.target != null && <> / {fmt(i.target)}</>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ScatterChart({ points }: { points: { label: string; x: number; y: number; size: number; rag: Rag3 }[] }) {
  const W = 460;
  const H = 230;
  const pl = 40;
  const pb = 26;
  const pt = 10;
  const pr = 14;
  const xMax = Math.max(120, ...points.map((p) => p.x)) + 6;
  const yMax = Math.max(20, ...points.map((p) => p.y)) + 8;
  const yMin = Math.min(-20, ...points.map((p) => p.y)) - 6;
  const px = (v: number) => pl + (v / xMax) * (W - pl - pr);
  const py = (v: number) => pt + ((yMax - v) / (yMax - yMin)) * (H - pt - pb);
  const smax = Math.max(1, ...points.map((p) => p.size));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Growth against achievement, bubble size is sales">
      <line x1={pl} x2={W - pr} y1={py(0)} y2={py(0)} stroke="rgb(var(--cx-line))" />
      <line x1={px(100)} x2={px(100)} y1={pt} y2={H - pb} stroke="rgb(var(--cx-line))" strokeDasharray="3 3" />
      <text x={px(100) + 4} y={pt + 9} fontSize="9.5" fill="rgb(var(--cx-faint))">100% of target</text>
      <text x={pl - 6} y={py(0) + 3} fontSize="9.5" textAnchor="end" fill="rgb(var(--cx-faint))">0%</text>
      {[...points].sort((a, b) => a.x - b.x).map((p, i) => {
        const r = Math.max(5, Math.min(20, Math.sqrt(p.size / smax) * 20));
        const below = i % 2 === 1;
        return (
          <g key={p.label}>
            <circle cx={px(p.x)} cy={py(p.y)} r={r} fill={p.rag === "na" ? "rgb(var(--cx-strong))" : RAG_COLOR[p.rag]} fillOpacity="0.55" stroke="rgb(var(--cx-bg))" />
            <text x={px(p.x)} y={below ? py(p.y) + r + 11 : py(p.y) - r - 3} fontSize="10" textAnchor="middle" fill="rgb(var(--cx-muted))">
              {p.label}
            </text>
          </g>
        );
      })}
      <text x={(W + pl) / 2} y={H - 4} fontSize="10" textAnchor="middle" fill="rgb(var(--cx-faint))">Achievement % →</text>
      <text x={4} y={pt + 8} fontSize="10" fill="rgb(var(--cx-faint))">Growth %</text>
    </svg>
  );
}

export function TrendChart({ points, max, currentLabel }: { points: { label: string; value: number | null; current?: boolean }[]; max: number; currentLabel: string }) {
  const W = 560;
  const H = 230;
  const pl = 30;
  const pr = 30;
  const pt = 18;
  const pb = 34;
  const n = points.length;
  const x = (i: number) => pl + (n <= 1 ? 0 : (i / (n - 1)) * (W - pl - pr));
  const y = (v: number) => pt + (1 - v / max) * (H - pt - pb);
  const hist = points.filter((p) => !p.current && p.value != null);
  const d = points
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => !p.current && p.value != null)
    .map(({ p, i }, k) => `${k ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value!).toFixed(1)}`)
    .join(" ");
  const ci = points.findIndex((p) => p.current);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Weekly score trend, ${hist.length} weeks of history and the current review`}>
      {[0, Math.round(max / 2), max].map((g) => (
        <g key={g}>
          <line x1={pl} x2={W - pr} y1={y(g)} y2={y(g)} stroke="rgb(var(--cx-line))" />
          <text x={pl - 5} y={y(g) + 3} fontSize="9.5" textAnchor="end" fill="rgb(var(--cx-faint))" className="font-data">
            {g}
          </text>
        </g>
      ))}
      <path d={d} fill="none" stroke="rgb(var(--cx-muted))" strokeWidth="1.75" />
      {ci > 0 && <line x1={(x(ci - 1) + x(ci)) / 2} x2={(x(ci - 1) + x(ci)) / 2} y1={pt - 6} y2={H - pb} stroke="rgb(var(--cx-strong))" strokeDasharray="4 3" />}
      {points.map((p, i) =>
        p.value == null ? null : (
          <g key={p.label}>
            <circle cx={x(i)} cy={y(p.value)} r={p.current ? 5.5 : 2.75} fill={p.current ? "#2f6fed" : "rgb(var(--cx-muted))"} stroke="rgb(var(--cx-panel))" strokeWidth="1.5" />
            {(p.current || i === 0 || i % 3 === 0) && (
              <text x={x(i)} y={y(p.value) - 8} fontSize="10" textAnchor="middle" fill={p.current ? "rgb(var(--cx-text))" : "rgb(var(--cx-faint))"} className="font-data">
                {p.value}
              </text>
            )}
          </g>
        )
      )}
      {points.map((p, i) =>
        i % 2 === 0 || p.current ? (
          <text key={`l${p.label}`} x={x(i)} y={H - pb + 16} fontSize="9.5" textAnchor="middle" fill={p.current ? "rgb(var(--cx-text))" : "rgb(var(--cx-faint))"}>
            {p.current ? currentLabel : p.label}
          </text>
        ) : null
      )}
    </svg>
  );
}
