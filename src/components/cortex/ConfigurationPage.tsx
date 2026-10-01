"use client";

// Configuration — the Head of Sales' own screen, reached from the sidebar's Configuration
// icon (not inline on the homepage). Two things live here: platform-wide settings, and the
// Decision Thresholds that decide what Sales AI settles itself and what reaches
// "Needs your decision".

import { LBL } from "@/data/labels";
import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronDown, History, Minus, Plus, Scale, Settings2, SlidersHorizontal } from "lucide-react";
import { SYNC_LABEL, VIEWER } from "@/data/cortexHome";
import { CONFIG_HISTORY, DECISIONS, PLATFORM_SETTINGS, PlatformSetting, THRESHOLDS, Threshold, TERRITORY_COUNT } from "@/data/leadership";
import { useHome } from "./HomeState";
import { card, CardHeader, Dropdown } from "./kit";
import { useCortexNav } from "./nav";
import { CortexPageRoot, PageFrame, Persona } from "./shell";
import { LeadershipProvider, useHeadNav } from "./leadership/common";

export function ConfigurationPage() {
  return (
    <CortexPageRoot>
      <LeadershipProvider>
        <Configuration />
      </LeadershipProvider>
    </CortexPageRoot>
  );
}

type Values = Record<string, number | boolean | string>;

const initialValues = (): Values => ({
  ...Object.fromEntries(PLATFORM_SETTINGS.map((s) => [s.id, s.value])),
  ...Object.fromEntries(THRESHOLDS.map((t) => [`t:${t.id}`, t.mode === "always" ? true : t.value])),
});

function Configuration() {
  const { setRole, toast } = useHome();
  const go = useCortexNav();
  useEffect(() => setRole("head"), [setRole]);
  const changePersona = (p: Persona) => p === "asm" && go("asm");
  const nav = useHeadNav("none");

  const [saved, setSaved] = useState<Values>(initialValues);
  const [draft, setDraft] = useState<Values>(initialValues);
  const [history, setHistory] = useState(CONFIG_HISTORY);
  const set = (id: string, v: number | boolean | string) => setDraft((d) => ({ ...d, [id]: v }));
  const changed = useMemo(() => Object.keys(draft).filter((k) => draft[k] !== saved[k]), [draft, saved]);

  const describe = (k: string) => {
    if (k.startsWith("t:")) {
      const t = THRESHOLDS.find((x) => `t:${x.id}` === k)!;
      return t.mode === "always" ? `${t.metric}: ${draft[k] ? "always comes to you" : "Sales AI may decide within one ASM"}` : `${t.metric} threshold ${t.fmt(saved[k] as number)} → ${t.fmt(draft[k] as number)}`;
    }
    const s = PLATFORM_SETTINGS.find((x) => x.id === k)!;
    if (s.kind === "toggle") return `${s.label}: ${draft[k] ? "on" : "off"}`;
    if (s.kind === "choice") return `${s.label}: ${draft[k]}`;
    return `${s.label} ${saved[k]} → ${draft[k]} ${s.unit}`;
  };

  const save = () => {
    setHistory((h) => [...changed.map((k) => ({ when: "Today, just now", who: VIEWER.head.name, what: describe(k) })), ...h]);
    setSaved(draft);
    toast(`Saved. Applies to all ${LBL.regions} and ${TERRITORY_COUNT} territories from the next sync.`);
  };

  return (
    <PageFrame
      persona="head"
      personaOptions={["asm", "head"]}
      onPersona={changePersona}
      {...nav}
      configActive
    >
      <div className="pb-32">
        <section className="cx-land-hero px-4 pb-8 pt-16 sm:px-6">
          <button onClick={() => go("leadership")} className="inline-flex items-center gap-1.5 text-[12px] text-cx-muted hover:text-cx-text">
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </button>
          <h1 className="mt-3 text-[28px] font-medium leading-tight tracking-tight text-cx-text">Configuration</h1>
          <p className="mt-1 max-w-[80ch] text-[12px] text-cx-faint">
            Platform-wide settings and the thresholds that decide what reaches you · all {LBL.regions} · {TERRITORY_COUNT} territories · <span className="font-data">{SYNC_LABEL}</span>
          </p>
        </section>

        <div className="cx-stagger grid gap-8 px-4 sm:px-6 lg:grid-cols-[200px_minmax(0,1fr)]">
          <nav aria-label="Configuration sections" className="hidden lg:block">
            <ul className="sticky top-6 space-y-0.5 text-[12.5px]">
              {[
                ["thresholds", "Decision thresholds", Scale],
                ["platform", "Platform settings", Settings2],
                ["history", "Change history", History],
              ].map(([id, label, Icon]) => {
                const I = Icon as React.ComponentType<{ className?: string }>;
                return (
                  <li key={id as string}>
                    <a href={`#${id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-cx-muted hover:bg-cx-hover hover:text-cx-text">
                      <I className="h-3.5 w-3.5" /> {label as string}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="min-w-0 space-y-8">
            <ThresholdsCard draft={draft} saved={saved} set={set} />
            <PlatformCard draft={draft} saved={saved} set={set} />
            <section id="history" aria-labelledby="hist-title" className={`${card} p-5`}>
              <CardHeader id="hist-title" icon={<History className="h-4 w-4" />} title="Change history" />
              <ul className="mt-4 divide-y divide-cx-line">
                {history.map((h, i) => (
                  <li key={`${h.when}-${i}`} className="grid gap-1 py-2.5 text-[12.5px] sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:gap-4">
                    <span className="font-data text-[11.5px] text-cx-faint">{h.when}</span>
                    <span className="text-cx-text">{h.what}</span>
                    <span className="text-[11.5px] text-cx-faint">{h.who}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>

      {/* pending changes: nothing applies until saved */}
      {changed.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-cx-strong bg-cx-raised/95 backdrop-blur md:left-14">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="min-w-0 text-[12.5px] text-cx-muted">
              <span className="font-data text-cx-text">{changed.length}</span> unsaved change{changed.length > 1 ? "s" : ""} · <span className="text-cx-text">{describe(changed[changed.length - 1])}</span>
              {changed.length > 1 && <span className="text-cx-faint"> and {changed.length - 1} more</span>}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setDraft(saved)} className="h-8 rounded-md border border-cx-strong px-3 text-[12.5px] text-cx-muted hover:bg-cx-hover hover:text-cx-text">
                Discard
              </button>
              <button onClick={save} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#2f6fed] px-3.5 text-[12.5px] font-medium text-white hover:bg-[#4f86f7]">
                <Check className="h-3.5 w-3.5" /> Save for all regions
              </button>
            </div>
          </div>
        </div>
      )}
    </PageFrame>
  );
}

// ---------------------------------------------------------------------------
// Decision thresholds
// ---------------------------------------------------------------------------

/** The scale: the teal part is where Sales AI decides alone (AI), the blue part comes to you. */
function ZoneTrack({ t, value }: { t: Threshold; value: number }) {
  const at = (v: number) => ((v - t.min) / (t.max - t.min)) * 100;
  const cut = at(value);
  const aiLeft = t.mode === "below";
  return (
    <div className="relative pt-5" aria-hidden>
      <div className="flex h-2 overflow-hidden rounded-full">
        <span className={aiLeft ? "bg-ai/60" : "bg-[#2f6fed]/70"} style={{ width: `${cut}%` }} />
        <span className={aiLeft ? "bg-[#2f6fed]/70" : "bg-ai/60"} style={{ width: `${100 - cut}%` }} />
      </div>
      {t.pending && (
        <span className="absolute top-0 inline-flex -translate-x-1/2 items-center whitespace-nowrap font-data text-[10px] text-cx-muted" style={{ left: `${Math.min(96, Math.max(4, at(t.pending.at)))}%` }}>
          #{t.pending.decision}
          <ChevronDown className="h-3 w-3" />
        </span>
      )}
      <div className="mt-1.5 flex justify-between font-data text-[10px] text-cx-faint">
        <span>{t.fmt(t.min)}</span>
        <span>{t.fmt(t.max)}</span>
      </div>
    </div>
  );
}

function ThresholdRow({ t, value, savedValue, onChange }: { t: Threshold; value: number | boolean; savedValue: number | boolean; onChange: (v: number | boolean) => void }) {
  const go = useCortexNav();
  const dec = t.pending && DECISIONS.find((d) => d.n === t.pending!.decision);
  const dirty = value !== savedValue;

  // what the current value would mean for today's open decision
  let preview: string | null = null;
  if (dec && t.mode === "below" && typeof value === "number") {
    preview = t.pending!.at <= value ? `At ${t.fmt(value)}, Decision #${dec.n} (${t.pending!.label}) would have been settled by Sales AI without reaching you.` : `Decision #${dec.n} (${t.pending!.label}) is above ${value === 0 ? "zero" : t.fmt(value)}, so it still comes to you.`;
  }

  return (
    <li className="grid gap-x-8 gap-y-3 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="min-w-0">
        <p className="font-data text-[10.5px] uppercase tracking-[0.08em] text-cx-faint">{t.area}</p>
        <h3 className="mt-1 text-[14px] font-medium text-cx-text">{t.metric}</h3>
        <p className="mt-1 text-[12px] text-cx-faint">
          Last 30 days: <span className="font-data text-cx-muted">{t.last30.auto}</span> settled by Sales AI · <span className="font-data text-cx-muted">{t.last30.escalated}</span> sent to you
        </p>
        {dec && (
          <button onClick={() => go("leadership")} className="mt-2 inline-flex h-6 items-center gap-1.5 rounded-full border border-[#2f6fed]/50 bg-[#2f6fed]/10 px-2 text-[11.5px] text-[color:var(--ai-ink)] hover:border-[#2f6fed]">
            <Scale className="h-3 w-3" /> Open now: Decision #{dec.n}
          </button>
        )}
      </div>

      <div className="min-w-0">
        {t.mode === "always" ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cx-line bg-cx-raised/60 px-3.5 py-3">
            <span className="text-[12.5px] text-cx-muted">{value ? "Always comes to you. Sales AI never moves people between ASMs on its own." : "Sales AI may move officers within one ASM's team; moves across ASMs still come to you."}</span>
            <Switch on={!!value} onChange={(v) => onChange(v)} label="Always escalate" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[12.5px] text-cx-muted">
                {t.mode === "below" ? (
                  <>
                    Sales AI decides up to <span className="font-data text-[15px] text-cx-text">{t.fmt(value as number)}</span>, above that it comes to you
                  </>
                ) : (
                  <>
                    Sales AI acts alone at <span className="font-data text-[15px] text-cx-text">{t.fmt(value as number)}</span> confidence or more, below that it comes to you
                  </>
                )}
              </p>
              {dirty && <span className="font-data text-[10.5px] text-[color:var(--ai-ink)]">was {t.fmt(savedValue as number)}</span>}
            </div>
            <div className="relative mt-1">
              <ZoneTrack t={t} value={value as number} />
              {/* the real control sits over the track */}
              <input
                type="range"
                min={t.min}
                max={t.max}
                step={t.step}
                value={value as number}
                onChange={(e) => onChange(Number(e.target.value))}
                aria-label={`${t.metric} threshold`}
                aria-valuetext={t.fmt(value as number)}
                className="cx-range absolute inset-x-0 top-3.5 h-5 w-full cursor-pointer"
              />
            </div>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-cx-faint">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-ai/60" /> Sales AI decides
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#2f6fed]/70" /> Comes to you
              </span>
            </p>
            {preview && <p className="mt-2 text-[12px] text-cx-muted">{preview}</p>}
          </>
        )}
      </div>
    </li>
  );
}

function ThresholdsCard({ draft, saved, set }: { draft: Values; saved: Values; set: (id: string, v: number | boolean) => void }) {
  return (
    <section id="thresholds" aria-labelledby="thr-title" className={card}>
      <div className="p-5">
        <CardHeader id="thr-title" icon={<SlidersHorizontal className="h-4 w-4" />} title="Decision thresholds" />
      </div>
      <ul className="divide-y divide-cx-line border-t border-cx-line">
        {THRESHOLDS.map((t) => (
          <ThresholdRow key={t.id} t={t} value={draft[`t:${t.id}`] as number | boolean} savedValue={saved[`t:${t.id}`] as number | boolean} onChange={(v) => set(`t:${t.id}`, v)} />
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Platform settings
// ---------------------------------------------------------------------------

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors ${on ? "border-[#2f6fed] bg-[#2f6fed]" : "border-cx-strong bg-cx-hover"}`}
    >
      <span className={`absolute h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[19px]" : "translate-x-[3px]"}`} />
    </button>
  );
}

function Stepper({ s, value, onChange }: { s: Extract<PlatformSetting, { kind: "number" }>; value: number; onChange: (v: number) => void }) {
  const btn = "flex h-8 w-8 items-center justify-center text-cx-muted hover:bg-cx-hover hover:text-cx-text disabled:opacity-30";
  return (
    <span className="inline-flex h-8 items-center rounded-lg border border-cx-strong bg-cx-panel">
      <button onClick={() => onChange(Math.max(s.min, value - s.step))} disabled={value <= s.min} className={`${btn} rounded-l-lg`} aria-label={`Decrease ${s.label}`}>
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[88px] border-x border-cx-line px-2 text-center font-data text-[13px] text-cx-text" aria-live="polite">
        {value} <span className="text-[11px] text-cx-faint">{s.unit}</span>
      </span>
      <button onClick={() => onChange(Math.min(s.max, value + s.step))} disabled={value >= s.max} className={`${btn} rounded-r-lg`} aria-label={`Increase ${s.label}`}>
        <Plus className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

function PlatformCard({ draft, saved, set }: { draft: Values; saved: Values; set: (id: string, v: number | boolean | string) => void }) {
  return (
    <section id="platform" aria-labelledby="plat-title" className={card}>
      <div className="p-5">
        <CardHeader id="plat-title" icon={<Settings2 className="h-4 w-4" />} title="Platform settings" />
      </div>
      <ul className="divide-y divide-cx-line border-t border-cx-line">
        {PLATFORM_SETTINGS.map((s) => {
          const dirty = draft[s.id] !== saved[s.id];
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-5 py-4">
              <div className="min-w-0 max-w-[60ch]">
                <p className="flex items-center gap-2 text-[13.5px] text-cx-text">
                  {s.label}
                  {dirty && <span className="h-1.5 w-1.5 rounded-full bg-[#4f86f7]" aria-label="changed" />}
                </p>
                <p className="mt-0.5 text-[12px] text-cx-faint">{s.help}</p>
              </div>
              {s.kind === "number" && <Stepper s={s} value={draft[s.id] as number} onChange={(v) => set(s.id, v)} />}
              {s.kind === "toggle" && <Switch on={!!draft[s.id]} onChange={(v) => set(s.id, v)} label={s.label} />}
              {s.kind === "choice" && <Dropdown label="" value={draft[s.id] as string} options={s.options} allOption={false} onChange={(v) => v && set(s.id, v)} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
