"use client";

// Shared pieces for the Huddle agent pages, in the Sales AI frame and dark theme like Thermometer, MAP and Pitch:
// the frame (Intel Hub · Meeting Repository · Action Center tabs), chips, tabs, the select, the month calendar, the
// upcoming-meeting card, small SVG charts, and Assign Action, which sends a huddle action to a team member through
// the backend (it becomes their Tracker ticket, with a push).

import React, { useEffect, useState } from "react";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, Clock, Lightbulb, Search as SearchIcon, User, Users, WandSparkles, X } from "lucide-react";
import { HUDDLE_LABELS, HuddleAction, MEETINGS, Meeting, NEXT_MEETING, Series, TIME_RANGES, isOverdue, meetingsOf } from "@/data/huddle";
import { assignToast, useAssignments } from "../assignments";
import { useHome } from "../HomeState";
import { CortexPage, useCortexNav } from "../nav";
import { CortexPageRoot, PageFrame, Persona, useOutside } from "../shell";
import { Drawer } from "../leadership/common";
import { btnPrimary } from "../agentPage";

export { card } from "../kit";
export { btn } from "../agentPage";

// ---------------------------------------------------------------------------
// Frame
// ---------------------------------------------------------------------------

export type HuddleTab = "hub" | "repository";
const TAB_PAGES: CortexPage[] = ["huddle", "huddle-meetings", "tracker"];

export function HuddlePage({ current, children }: { current: HuddleTab; children: React.ReactNode }) {
  return (
    <CortexPageRoot>
      <Frame current={current}>{children}</Frame>
    </CortexPageRoot>
  );
}

function Frame({ current, children }: { current: HuddleTab; children: React.ReactNode }) {
  const { setRole } = useHome();
  const go = useCortexNav();
  useEffect(() => setRole("asm"), [setRole]);
  return (
    <PageFrame
      persona="asm"
      personaOptions={["asm", "head"]}
      onPersona={(p: Persona) => p === "head" && go("leadership")}
      tabs={["Intel Hub", "Meeting Repository", "Action Center"]}
      currentTab={current === "hub" ? 0 : 1}
      onTab={(i) => (go(TAB_PAGES[i]), true)}
      activeAgent="huddle"
    >
      <div className="pb-24">{children}</div>
    </PageFrame>
  );
}

/** the page body under the header */
export const body = "space-y-5 px-4 sm:px-6";

// ---------------------------------------------------------------------------
// Marks
// ---------------------------------------------------------------------------

export const BLUE = "#4f86f7";
export type Tone = "blue" | "green" | "amber" | "orange" | "red" | "gray";
const TONE: Record<Tone, string | null> = { blue: BLUE, green: "#2fa85c", amber: "#e0b43a", orange: "#f97316", red: "#e85a70", gray: null };

export function Chip({ tone = "gray", children, className = "", title }: { tone?: Tone; children: React.ReactNode; className?: string; title?: string }) {
  const c = TONE[tone];
  return (
    <span
      title={title}
      className={`inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[11.5px] ${c ? "" : "border-cx-line bg-cx-raised text-cx-muted"} ${className}`}
      style={c ? { borderColor: `${c}55`, background: `${c}1a`, color: c } : undefined}
    >
      {children}
    </span>
  );
}
export const AiInferred = () => (
  <Chip tone="blue" title="Inferred from the huddle notes in the workbook">
    <WandSparkles className="h-3 w-3" /> AI Inferred
  </Chip>
);
export const ConfidenceChip = ({ level }: { level: "High" | "Medium" | "Low" }) => <Chip tone={level === "High" ? "green" : level === "Medium" ? "amber" : "gray"}>{level} Confidence</Chip>;

/** score bands, in the app's status colours */
export const BAND = {
  healthy: { label: "Healthy", range: "80 - 100", tone: "green" as Tone, color: "#16a34a" },
  moderate: { label: "Moderate", range: "60 - 80", tone: "amber" as Tone, color: "#eab308" },
  attention: { label: "Attention", range: "40 - 60", tone: "orange" as Tone, color: "#f97316" },
  critical: { label: "Critical", range: "0 - 40", tone: "red" as Tone, color: "#dc2626" },
  nodata: { label: "No data", range: "", tone: "gray" as Tone, color: "#7c7f89" },
};
export function ScoreBadge({ score }: { score: number }) {
  return <Chip tone={score >= 80 ? "green" : score >= 60 ? "amber" : "red"}>{score}/100</Chip>;
}

export function Avatar({ name, size = 26 }: { name: string; size?: number }) {
  const ini = name
    .replace(/[^A-Za-z ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <span title={name} className="inline-flex shrink-0 items-center justify-center rounded-full border border-cx-line bg-cx-raised font-data text-cx-muted" style={{ width: size, height: size, fontSize: Math.max(9, size * 0.36) }}>
      {ini || "–"}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-8 text-center text-[12.5px] text-cx-faint">{children}</p>;
}

export function CardHead({ title, sub, right }: { title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex flex-wrap items-center gap-2 text-[15px] font-medium text-cx-text">{title}</h2>
        {sub && <p className="mt-0.5 text-[12.5px] text-cx-faint">{sub}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

export type Opt = string | { value: string; label: string; count?: number };
const optV = (o: Opt) => (typeof o === "string" ? o : o.value);
const optL = (o: Opt) => (typeof o === "string" ? o : o.label);

/** the app's compact select: a bordered button with a label and a chevron */
export function Select({ value, options, onChange, icon, label, prefix, count, className = "", menuRight }: {
  value: string;
  options: Opt[];
  onChange: (v: string) => void;
  icon?: React.ReactNode;
  /** shown instead of the selected option's label (e.g. "Business Segment" when nothing is picked) */
  label?: string;
  /** a faint caption before the value, as the kit dropdown has */
  prefix?: string;
  count?: number;
  className?: string;
  menuRight?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutside<HTMLDivElement>(open, () => setOpen(false));
  const cur = options.find((o) => optV(o) === value);
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-8 max-w-[240px] items-center gap-1.5 rounded-lg border border-cx-line bg-cx-panel px-2.5 text-[12px] text-cx-muted hover:border-cx-strong hover:text-cx-text"
      >
        {icon}
        {prefix && <span className="text-cx-faint">{prefix}</span>}
        <span className="truncate text-cx-text">{label ?? (cur ? optL(cur) : value)}</span>
        {count != null && <span className="rounded-full bg-cx-hover px-1.5 font-data text-[11px] text-cx-muted">{count}</span>}
        <ChevronDown className="h-3 w-3 shrink-0" />
      </button>
      {open && (
        <ul role="listbox" className={`absolute top-full z-50 mt-1 max-h-72 min-w-[200px] overflow-y-auto rounded-lg border border-cx-strong bg-cx-raised p-1 shadow-2xl ${menuRight ? "right-0" : "left-0"}`}>
          {options.map((o) => (
            <li key={optV(o)}>
              <button
                role="option"
                aria-selected={optV(o) === value}
                onClick={() => (onChange(optV(o)), setOpen(false))}
                className="flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-md px-2 py-1.5 text-left text-[12.5px] text-cx-muted hover:bg-cx-hover hover:text-cx-text"
              >
                {optL(o)}
                <span className="flex items-center gap-2">
                  {typeof o !== "string" && o.count != null && <span className="font-data text-[11px] text-cx-faint">{o.count}</span>}
                  {optV(o) === value && <Check className="h-3 w-3" />}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Search({ value, onChange, placeholder, className = "" }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <label className={`flex h-8 items-center gap-2 rounded-lg border border-cx-line bg-cx-panel px-2.5 focus-within:border-cx-strong ${className}`}>
      <SearchIcon className="h-3.5 w-3.5 text-cx-faint" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-[12.5px] text-cx-text outline-none placeholder:text-cx-faint" />
      {value && (
        <button onClick={() => onChange("")} aria-label="Clear search" className="text-cx-faint hover:text-cx-text">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </label>
  );
}

export type TabDef = { key: string; label: string; count?: number; hint?: string };

/** the segmented tab bar (Thermometer's), with counts */
export function SegTabs({ tabs, value, onChange, size = "md" }: { tabs: TabDef[]; value: string; onChange: (k: string) => void; size?: "md" | "sm" }) {
  return (
    <div role="tablist" className={`flex w-fit max-w-full items-center overflow-x-auto rounded-lg border border-cx-line bg-cx-panel p-1 ${size === "md" ? "h-9 text-[13px]" : "h-8 text-[12.5px]"}`}>
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={value === t.key}
          title={t.hint}
          onClick={() => onChange(t.key)}
          className={`inline-flex h-full items-center gap-1.5 whitespace-nowrap rounded-md px-3.5 ${value === t.key ? "bg-cx-text text-cx-bg" : "text-cx-muted hover:bg-cx-hover hover:text-cx-text"}`}
        >
          {t.label}
          {t.count != null && <span className={`rounded-full px-1.5 font-data text-[11px] ${value === t.key ? "bg-cx-bg/15" : "bg-cx-hover"}`}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** underline tabs inside a card (action-item states) */
export function LineTabs({ tabs, value, onChange }: { tabs: TabDef[]; value: string; onChange: (k: string) => void }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-cx-line px-3">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          title={t.hint}
          className={`-mb-px inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-[13px] ${value === t.key ? "border-[#4f86f7] text-cx-text" : "border-transparent text-cx-muted hover:text-cx-text"}`}
        >
          {t.label}
          {t.count != null && <span className="rounded-full bg-cx-hover px-1.5 font-data text-[11px] text-cx-muted">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export const linkBlue = "inline-flex items-center gap-1 text-[12.5px] text-[#4f86f7] hover:underline";

export function Pager({ page, pages, onPage, perPage, onPerPage }: { page: number; pages: number; onPage: (p: number) => void; perPage: number; onPerPage: (n: number) => void }) {
  const nav = "flex h-7 w-7 items-center justify-center rounded-md border border-cx-line text-cx-muted hover:text-cx-text disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cx-line px-4 py-2.5 text-[12px] text-cx-faint">
      <span>
        Showing page {page} of {pages}
      </span>
      <span className="flex items-center gap-2">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page" className={nav}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cx-hover font-data text-cx-text">{page}</span>
        <button onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page" className={nav}>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </span>
      <Select prefix="Rows" value={String(perPage)} options={["5", "10", "20"]} onChange={(v) => onPerPage(Number(v))} menuRight />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const at = (iso: string) => new Date(`${iso}T00:00:00`);
/** "16 Sep 2026" */
export const day = (iso: string) => `${at(iso).getDate()} ${MON[at(iso).getMonth()]} ${at(iso).getFullYear()}`;
/** "16 Sep" */
export const shortDay = (iso: string) => `${at(iso).getDate()} ${MON[at(iso).getMonth()]}`;
/** "Wednesday, 16 Sep 2026" */
export const longDate = (iso: string) => `${WEEKDAY[at(iso).getDay()]}, ${day(iso)}`;
export const dateRange = (dates: string[]) => {
  if (!dates.length) return "—";
  const s = [...dates].sort();
  return s[0] === s[s.length - 1] ? day(s[0]) : `${shortDay(s[0])} – ${day(s[s.length - 1])}`;
};

/** the series' month calendar: meeting days are dotted, today is ringed; a click opens that day's meeting */
export function MonthCalendar({ marked, onPick }: { marked: string[]; onPick: (iso: string) => void }) {
  const today = HUDDLE_LABELS.today;
  const [ym, setYm] = useState(() => {
    const d = at(marked.length ? [...marked].sort()[marked.length - 1] : today);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const first = new Date(ym.y, ym.m, 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { iso, n: d.getDate(), inMonth: d.getMonth() === ym.m };
  });
  const shift = (k: number) => setYm(({ y, m }) => ({ y: m + k < 0 ? y - 1 : m + k > 11 ? y + 1 : y, m: (m + k + 12) % 12 }));
  return (
    <div className="rounded-lg border border-cx-line bg-cx-panel p-4">
      <div className="flex items-center justify-between">
        <button onClick={() => shift(-1)} aria-label="Previous month" className="rounded p-1 text-cx-muted hover:bg-cx-hover hover:text-cx-text">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] text-cx-text">
          {MONTH[ym.m]} {ym.y}
        </span>
        <button onClick={() => shift(1)} aria-label="Next month" className="rounded p-1 text-cx-muted hover:bg-cx-hover hover:text-cx-text">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-[12px]">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <span key={d} className="py-1 text-cx-faint">
            {d}
          </span>
        ))}
        {days.map((d) => {
          const has = marked.includes(d.iso);
          return (
            <button
              key={d.iso}
              disabled={!has}
              onClick={() => onPick(d.iso)}
              title={has ? "Open this day's meeting" : undefined}
              className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-md font-data ${d.iso === today ? "border border-[#4f86f7]/60 text-cx-text" : d.inMonth ? "text-cx-muted" : "text-cx-faint/50"} ${has ? "text-cx-text hover:bg-cx-hover" : "cursor-default"}`}
            >
              {d.n}
              {has && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#4f86f7]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upcoming meeting + prep pack
// ---------------------------------------------------------------------------

export function UpcomingCard({ series }: { series: Series }) {
  const live = useLiveAction();
  const next = NEXT_MEETING[series.id];
  const ms = meetingsOf(series);
  const open = ms.flatMap((m) => m.actions).map(live).filter((a) => a.status !== "completed");
  const byOwner = new Map<string, HuddleAction[]>();
  for (const a of open) {
    const k = a.assignee ?? a.owner;
    byOwner.set(k, [...(byOwner.get(k) ?? []), a]);
  }
  const avg = ms.length ? Math.round(ms.reduce((s, m) => s + m.score, 0) / ms.length) : 0;
  return (
    <div className="rounded-lg border border-[#4f86f7]/30 bg-[#4f86f7]/[0.06] p-4">
      <Chip tone="blue">
        <CalendarDays className="h-3 w-3" /> Upcoming Meeting
      </Chip>
      <h3 className="mt-2 text-[14px] font-medium text-cx-text">{series.name}</h3>
      <p className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-cx-muted">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" /> {next ? `${day(next.date)} · ${next.time}` : "One-time meeting"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" /> {next?.attendees ?? series.attendees.length} attendees
        </span>
      </p>
      <p className="mt-4 text-[11.5px] text-cx-faint">Meeting Prep Pack</p>
      <div className="mt-2 max-h-[300px] space-y-2 overflow-y-auto pr-1">
        {Array.from(byOwner.entries())
          .slice(0, 6)
          .map(([who, as]) => (
            <div key={who} className="rounded-lg border border-cx-line bg-cx-panel p-3">
              <p className="flex items-center gap-1.5 text-[12px] text-cx-text">
                <User className="h-3 w-3 text-cx-faint" /> {who}
              </p>
              {as.slice(0, 3).map((a) => (
                <p key={a.id} className="mt-1.5 flex gap-1.5 text-[12px] leading-[1.45] text-cx-muted">
                  <CircleCheck className="mt-0.5 h-3 w-3 shrink-0 text-[#4f86f7]" /> {a.description}
                </p>
              ))}
            </div>
          ))}
        {!byOwner.size && <p className="rounded-lg border border-cx-line bg-cx-panel p-3 text-[12px] text-cx-faint">No open actions to carry into the next meeting.</p>}
      </div>
      <p className="mt-3 flex gap-2 rounded-lg border border-cx-line bg-cx-panel p-3 text-[12px] leading-[1.5] text-cx-muted">
        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4f86f7]" />
        <span>
          <span className="text-[#4f86f7]">Focus:</span> This series has an average execution score of {avg}. {avg < 60 ? "Ensure decisions have clear owners and due dates." : "Keep closing actions before the next huddle."}
        </span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Charts (SVG, tokens only)
// ---------------------------------------------------------------------------

const W = 760;
const H = 230;
const PAD = { l: 44, r: 16, t: 12, b: 34 };
const FAINT = "rgb(var(--cx-faint))";
const LINE = "rgb(var(--cx-line))";

/** a 0–100 line chart, one dashed line per series */
export function LineChart({ x, lines, yLabel = "Score", height = H }: { x: string[]; lines: { label: string; color: string; values: (number | null)[] }[]; yLabel?: string; height?: number }) {
  const iw = W - PAD.l - PAD.r;
  const ih = height - PAD.t - PAD.b;
  const px = (i: number) => PAD.l + (x.length <= 1 ? iw / 2 : (i / (x.length - 1)) * iw);
  const py = (v: number) => PAD.t + ih - (v / 100) * ih;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label={`${yLabel} over time`}>
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={py(v)} y2={py(v)} stroke={LINE} />
          <text x={PAD.l - 10} y={py(v) + 4} textAnchor="end" fontSize="10" fill={FAINT} className="font-data">
            {v}
          </text>
        </g>
      ))}
      <text x={12} y={PAD.t + ih / 2} fontSize="10" fill={FAINT} transform={`rotate(-90 12 ${PAD.t + ih / 2})`} textAnchor="middle">
        {yLabel}
      </text>
      {x.map((d, i) => (
        <text key={d + i} x={px(i)} y={height - 12} textAnchor="middle" fontSize="10" fill={FAINT}>
          {d}
        </text>
      ))}
      {lines.map((l) => {
        const pts = l.values.map((v, i) => (v == null ? null : { x: px(i), y: py(v), v })).filter(Boolean) as { x: number; y: number; v: number }[];
        return (
          <g key={l.label}>
            {pts.length > 1 && <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={l.color} strokeWidth="1.75" strokeDasharray="6 4" />}
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="rgb(var(--cx-panel))" stroke={l.color} strokeWidth="1.75">
                <title>
                  {l.label}: {Math.round(p.v)}
                </title>
              </circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/** grouped bars per x value (Blocker & Action Flow) */
export function BarChart({ x, bars, height = H }: { x: string[]; bars: { label: string; color: string; values: number[] }[]; height?: number }) {
  const max = Math.max(4, ...bars.flatMap((b) => b.values));
  const top = Math.ceil(max / 4) * 4;
  const iw = W - PAD.l - PAD.r;
  const ih = height - PAD.t - PAD.b;
  const slot = iw / Math.max(1, x.length);
  const bw = Math.min(22, (slot * 0.7) / bars.length);
  const py = (v: number) => PAD.t + ih - (v / top) * ih;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label="Blockers and actions per meeting">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={PAD.l} x2={W - PAD.r} y1={py(top * f)} y2={py(top * f)} stroke={LINE} />
          <text x={PAD.l - 10} y={py(top * f) + 4} textAnchor="end" fontSize="10" fill={FAINT} className="font-data">
            {Math.round(top * f)}
          </text>
        </g>
      ))}
      <text x={12} y={PAD.t + ih / 2} fontSize="10" fill={FAINT} transform={`rotate(-90 12 ${PAD.t + ih / 2})`} textAnchor="middle">
        Count
      </text>
      {x.map((d, i) => {
        const cx = PAD.l + slot * i + slot / 2;
        const x0 = cx - (bw * bars.length) / 2;
        return (
          <g key={d + i}>
            {bars.map((b, j) =>
              b.values[i] ? (
                <rect key={b.label} x={x0 + j * bw + 1} y={py(b.values[i])} width={bw - 2} height={py(0) - py(b.values[i])} rx="2" fill={b.color}>
                  <title>
                    {d} · {b.label}: {b.values[i]}
                  </title>
                </rect>
              ) : null,
            )}
            <text x={cx} y={height - 12} textAnchor="middle" fontSize="10" fill={FAINT}>
              {d}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[12px] text-cx-muted">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: i.color }} /> {i.label}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Navigation between huddle pages: the id travels in the URL (?id=) and, for in-app links, sessionStorage
// ---------------------------------------------------------------------------

const KEY = { series: "cx-huddle-series", meeting: "cx-huddle-meeting" };
export function useOpen() {
  const go = useCortexNav();
  const put = (k: string, v: string) => {
    try {
      sessionStorage.setItem(k, v);
    } catch {
      /* storage unavailable */
    }
  };
  return {
    series: (id: string, tab?: string) => (put(KEY.series, JSON.stringify({ id, tab })), go("huddle-series")),
    meeting: (id: string, tab?: string) => (put(KEY.meeting, JSON.stringify({ id, tab })), go("huddle-meeting")),
  };
}
export function readOpen(kind: "series" | "meeting"): { id?: string; tab?: string } {
  try {
    const q = new URLSearchParams(location.search);
    if (q.get("id")) return { id: q.get("id")!, tab: q.get("tab") ?? undefined };
    const raw = sessionStorage.getItem(KEY[kind]);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const RANGE_KEY = "cx-huddle-range";
/** the time range, shared by Intel Hub and the repository for the session (default Last 7 days) */
export function useTimeRange() {
  const [label, setLabel] = useState(TIME_RANGES[0].label);
  useEffect(() => {
    try {
      const v = sessionStorage.getItem(RANGE_KEY);
      if (v && TIME_RANGES.some((r) => r.label === v)) setLabel(v);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const set = (v: string) => {
    setLabel(v);
    try {
      sessionStorage.setItem(RANGE_KEY, v);
    } catch {
      /* storage unavailable */
    }
  };
  return { label, days: TIME_RANGES.find((r) => r.label === label)!.days, set };
}

/** flagged series and meetings, kept in this browser */
export function useFlags() {
  const [flags, setFlags] = useState<string[]>([]);
  useEffect(() => {
    try {
      setFlags(JSON.parse(localStorage.getItem("cx-huddle-flags") ?? "[]"));
    } catch {
      /* storage unavailable */
    }
  }, []);
  const toggle = (id: string) =>
    setFlags((f) => {
      const next = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
      try {
        localStorage.setItem("cx-huddle-flags", JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  return { has: (id: string) => flags.includes(id), toggle };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** Live view of an action: what was assigned in this session (or before) overrides the payload's state. */
export function useLiveAction() {
  const { assigned } = useAssignments();
  return (a: HuddleAction): HuddleAction => {
    const x = assigned[a.id];
    if (!x) return a;
    return { ...a, assignee: x.assignee.name, ticket: x.id, status: x.st === "closed" ? "completed" : x.st === "progress" ? "in_progress" : "pending" };
  };
}

export type ActionBucket = "unassigned" | "assigned" | "progress" | "completed";
export function bucketOf(a: HuddleAction): ActionBucket {
  if (a.status === "completed") return "completed";
  if (a.status === "in_progress") return "progress";
  return a.assignee ? "assigned" : "unassigned";
}
export function StatusChip({ a }: { a: HuddleAction }) {
  if (a.status === "completed") return <Chip tone="green">Completed</Chip>;
  if (isOverdue(a)) return <Chip tone="red">Overdue</Chip>;
  if (a.status === "in_progress") return <Chip tone="blue">In progress</Chip>;
  return <Chip>{a.assignee ? "Assigned" : "Pending"}</Chip>;
}
export const PriorityChip = ({ p }: { p: HuddleAction["priority"] }) => <Chip tone={p === "High" ? "red" : p === "Medium" ? "amber" : "gray"}>{p}</Chip>;

/** one action row (the Action Snapshot layout) */
export function ActionRow({ a, onAssign, meetingName, onMeeting }: { a: HuddleAction; onAssign?: () => void; meetingName?: string; onMeeting?: () => void }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-cx-line px-4 py-3.5 last:border-b-0">
      <div className="min-w-0 max-w-[720px]">
        <p className="text-[13px] leading-[1.5] text-cx-text">{a.description}</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-cx-faint">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" /> Due <span className={isOverdue(a) ? "text-[#e85a70]" : "text-cx-muted"}>{day(a.due)}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <User className="h-3.5 w-3.5" /> Owner <span className="text-cx-muted">{a.assignee ?? a.owner}</span>
          </span>
          {a.ticket && <span className="font-data">{a.ticket}</span>}
          {meetingName && (
            <button onClick={onMeeting} className="text-[#4f86f7] hover:underline">
              {meetingName}
            </button>
          )}
        </p>
        <p className="mt-2 flex flex-wrap gap-1.5">
          <PriorityChip p={a.priority} />
          <StatusChip a={a} />
          <Chip>{a.count} action items</Chip>
        </p>
      </div>
      {onAssign && !a.assignee && a.status !== "completed" && (
        <button onClick={onAssign} className={btnPrimary}>
          Assign
        </button>
      )}
    </div>
  );
}

/** Assign Action: the backend files it as a Tracker ticket and notifies the assignee's phone */
export function AssignAction({ a, meeting, onClose }: { a: HuddleAction; meeting: Meeting; onClose: () => void }) {
  const { toast } = useHome();
  const nt = useAssignments();
  const people = ["Me", ...HUDDLE_LABELS.team];
  const [who, setWho] = useState(HUDDLE_LABELS.team[0] ?? "Me");
  const [prio, setPrio] = useState<string>(a.priority);
  const dueDays = Math.max(0, Math.round((at(a.due).getTime() - at(HUDDLE_LABELS.today).getTime()) / 864e5));
  const [days, setDays] = useState(String([1, 2, 3, 5, 7, 14, 30].find((d) => d >= dueDays) ?? 30));
  const [busy, setBusy] = useState(false);
  const save = () => {
    setBusy(true);
    nt.assign({ source_id: a.id, title: a.description, agent: "huddle", assignee: who, priority: prio as HuddleAction["priority"], due_days: Number(days), note: `${a.description}. Raised in ${meeting.name} (owner ${a.owner}); ${a.count} action items.` })
      .then((r) => (toast(`${r.action.id}: ${assignToast(who, r)}`), onClose()))
      .catch((e: Error) => toast(`Couldn't assign: ${e.message}`))
      .finally(() => setBusy(false));
  };
  return (
    <Drawer label="Assign action" onClose={onClose} width="max-w-[520px]">
      <h2 className="text-[20px] font-medium text-cx-text">Assign action</h2>
      <p className="mt-1 text-[12.5px] text-cx-faint">It becomes a ticket in the Action Tracker; a sales officer also gets it in the mobile app, with a push.</p>
      <div className="mt-5 space-y-4 text-[12.5px]">
        <div>
          <p className="text-[11.5px] text-cx-faint">Action</p>
          <p className="mt-1 text-cx-text">{a.description}</p>
          <p className="mt-1 text-cx-faint">
            Owner in the huddle: {a.owner} · {a.count} action items · raised in {meeting.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Select prefix="Assign to" value={who} options={people} onChange={setWho} />
          <Select prefix="Priority" value={prio} options={["High", "Medium", "Low"]} onChange={setPrio} />
          <Select prefix="Due in" value={days} options={["1", "2", "3", "5", "7", "14", "30"].map((d) => ({ value: d, label: `${d} day${d === "1" ? "" : "s"}` }))} onChange={setDays} />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="inline-flex h-9 items-center rounded-md border border-cx-line px-3 text-[13px] text-cx-muted hover:border-cx-strong hover:text-cx-text">
          Cancel
        </button>
        <button onClick={save} disabled={busy} className={btnPrimary}>
          <Check className="h-4 w-4" /> {busy ? "Assigning…" : "Save task"}
        </button>
      </div>
    </Drawer>
  );
}

/** the meeting an action came from */
export const meetingOfAction = (id: string) => Object.values(MEETINGS).find((m) => m.actions.some((a) => a.id === id));

export function useAssign() {
  const [target, setTarget] = useState<{ a: HuddleAction; m: Meeting } | null>(null);
  const modal = target ? <AssignAction a={target.a} meeting={target.m} onClose={() => setTarget(null)} /> : null;
  return { open: (a: HuddleAction, m: Meeting) => setTarget({ a, m }), modal };
}
