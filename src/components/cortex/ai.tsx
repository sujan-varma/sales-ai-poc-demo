"use client";

// The one visual language for "the AI concluded this, and here's why".
// Every AI-generated item renders <AiMeta confidence={...} /> — tag and score
// are always shown together, and the score always explains itself.
// Option A (Console) opts into a section-level tag and a blue pill score via
// <AiStyleProvider value="pill">; the explain-on-interaction popover is shared.

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { AGENTS, Confidence } from "@/data/cortexHome";

type AiStyle = "meter" | "pill" | "capsule";
const AiStyleCtx = createContext<AiStyle>("meter");

export function AiStyleProvider({ value, children }: { value: AiStyle; children: React.ReactNode }) {
  return <AiStyleCtx.Provider value={value}>{children}</AiStyleCtx.Provider>;
}

export function confidenceBand(score: number) {
  if (score >= 80) return "High";
  if (score >= 60) return "Medium";
  return "Low";
}

function ageLabel(h: number) {
  if (h < 1) return "<1h ago";
  if (h < 48) return `${Math.round(h)}h ago`;
  if (h < 24 * 60) return `${Math.round(h / 24)}d ago`;
  return `${Math.round(h / (24 * 30))}mo ago`;
}

/** Colour for the AI-provenance treatment: teal by default, primary blue in Option A ("pill"). */
const TONES = {
  teal: {
    text: "text-ai",
    dim: "text-ai/80",
    tag: "border-ai/30 bg-ai/10 text-ai",
    card: "border-ai/25 bg-[rgb(var(--ai-teal-card))]",
    cell: "bg-[rgb(var(--ai-teal-card))]",
    bar: "bg-ai",
  },
  blue: {
    text: "text-[color:var(--ai-ink)]",
    dim: "text-[color:var(--ai-ink)] opacity-80",
    tag: "border-[#2f6fed]/45 bg-[#2f6fed]/15 text-[color:var(--ai-ink)]",
    card: "border-[#2f6fed]/40 bg-[rgb(var(--ai-card))]",
    cell: "bg-[rgb(var(--ai-card))]",
    bar: "bg-[#4f86f7]",
  },
};
function useTone() {
  const st = useContext(AiStyleCtx);
  return st === "pill" || st === "capsule" ? TONES.blue : TONES.teal;
}

export function AiTag() {
  const st = useContext(AiStyleCtx);
  const tone = st === "pill" || st === "capsule" ? TONES.blue : TONES.teal;
  return (
    <span className={`inline-flex h-5 shrink-0 items-center gap-1 rounded border px-1.5 font-data text-[10px] font-medium uppercase tracking-[0.06em] ${tone.tag}`}>
      <Sparkles className="h-2.5 w-2.5" aria-hidden />
      AI inferred
    </span>
  );
}

function Meter({ score }: { score: number }) {
  const filled = Math.max(1, Math.ceil(score / 20));
  return (
    <span className="flex items-end gap-[2px]" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={i < filled ? "bg-ai" : "bg-cx-strong"}
          style={{ width: 2.5, height: 4 + i * 1.6, borderRadius: 1 }}
        />
      ))}
    </span>
  );
}

export function ConfidenceScore({ confidence, align = "left" }: { confidence: Confidence; align?: "left" | "right" }) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const open = hover || pinned;

  useEffect(() => {
    if (!pinned) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPinned(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPinned(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pinned]);

  const band = confidenceBand(confidence.score);
  const style = useContext(AiStyleCtx);

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Confidence ${confidence.score} of 100, ${band}. Show why.`}
        onClick={(e) => {
          e.stopPropagation();
          setPinned((p) => !p);
        }}
        className={
          style === "capsule"
            ? `inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 font-data text-[11px] tabular-nums transition-colors ${
                open ? "border-[#2f6fed]/70 bg-[#2f6fed]/20 text-[color:var(--ai-ink)]" : "border-[#2f6fed]/45 bg-[#2f6fed]/10 text-[color:var(--ai-ink)] hover:border-[#2f6fed]/70"
              }`
            : style === "pill"
            ? `inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2.5 font-data text-[11px] text-white tabular-nums transition-colors ${
                open ? "bg-[#4f86f7] ring-2 ring-[#2f6fed]/40" : "bg-[#2f6fed] hover:bg-[#4f86f7]"
              }`
            : `inline-flex h-5 items-center gap-1.5 rounded border px-1.5 font-data text-[11px] transition-colors ${
                open ? "border-ai/60 bg-ai/15 text-ai" : "border-ai/30 bg-transparent text-ai/90 hover:border-ai/60"
              }`
        }
      >
        {style === "capsule" ? (
          <>
            {confidence.score}% <span className="opacity-75">confidence</span>
          </>
        ) : style === "pill" ? (
          <>
            {confidence.score}% <span className="text-white/75">confidence</span>
          </>
        ) : (
          <>
            <Meter score={confidence.score} />
            <span className="tabular-nums">{confidence.score}</span>
            <span className="text-ai/60">{band}</span>
          </>
        )}
      </button>
      {open && <ConfidencePopover confidence={confidence} align={align} />}
    </span>
  );
}

function ConfidencePopover({ confidence, align }: { confidence: Confidence; align: "left" | "right" }) {
  const { score, rationale, factors, sources, rescoredAt } = confidence;
  const independent = sources.filter((s) => s.independent).length;
  const ages = sources.map((s) => s.ageHours);
  const tone = useTone();
  const factorRows: [string, number][] = [
    ["Corroboration", factors.corroboration],
    ["Freshness", factors.freshness],
    ["Source reliability", factors.reliability],
  ];

  return (
    <span
      className={`absolute top-full z-50 block pt-1.5 ${align === "right" ? "right-0" : "left-0"}`}
      onClick={(e) => e.stopPropagation()}
    >
      <span role="dialog" className={`block w-[320px] max-w-[calc(100vw-32px)] rounded-lg border p-3.5 text-left shadow-[0_16px_48px_rgba(0,0,0,0.6)] ${tone.card}`}>
        <span className="flex items-baseline justify-between">
          <span className={`flex items-center gap-1.5 font-data text-[10px] uppercase tracking-[0.08em] ${tone.text}`}>
            <Sparkles className="h-3 w-3" /> Why this score
          </span>
          <span className="font-data text-[10px] text-cx-faint">re-scored {rescoredAt}</span>
        </span>

        <span className="mt-2 flex items-baseline gap-2">
          <span className="font-data text-[26px] leading-none text-cx-text tabular-nums">{score}%</span>
          <span className="font-data text-xs text-cx-faint">confidence</span>
        </span>
        <span className="mt-2 block text-[12.5px] leading-snug text-cx-muted">{rationale}</span>

        <span className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded border border-cx-line bg-cx-line">
          {[
            ["Sources", String(sources.length)],
            ["Independent", `${independent} of ${sources.length}`],
            ["Freshest", ageLabel(Math.min(...ages))],
          ].map(([k, v]) => (
            <span key={k} className={`block px-2 py-1.5 ${tone.cell}`}>
              <span className="block text-[10px] text-cx-faint">{k}</span>
              <span className="block font-data text-[12px] text-cx-text">{v}</span>
            </span>
          ))}
        </span>

        <span className="mt-3 block space-y-1.5">
          {factorRows.map(([label, v]) => (
            <span key={label} className="flex items-center gap-2">
              <span className="w-[110px] shrink-0 text-[11px] text-cx-faint">{label}</span>
              <span className="relative h-1 flex-1 rounded-sm bg-cx-strong">
                <span className={`absolute inset-y-0 left-0 rounded-sm ${tone.bar}`} style={{ width: `${v * 100}%`, opacity: 0.4 + v * 0.6 }} />
              </span>
              <span className="w-7 text-right font-data text-[10.5px] text-cx-muted tabular-nums">{Math.round(v * 100)}</span>
            </span>
          ))}
        </span>

        <span className="mt-3 block border-t border-cx-line pt-2.5">
          <span className="mb-1.5 block font-data text-[10px] uppercase tracking-[0.08em] text-cx-faint">Fed by</span>
          <span className="block space-y-2">
            {sources.map((s, i) => (
              <span key={i} className="flex gap-2">
                <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-[2px]" style={{ background: AGENTS[s.agent].color }} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[12px] text-cx-text">
                      <span style={{ color: AGENTS[s.agent].color }}>{AGENTS[s.agent].name}</span> · {s.title}
                    </span>
                    <span className="shrink-0 font-data text-[10px] text-cx-faint">{ageLabel(s.ageHours)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2 text-[11px] text-cx-faint">
                    <span className="truncate">{s.detail}</span>
                    {s.independent ? (
                      <span className={`flex shrink-0 items-center gap-0.5 ${tone.dim}`}>
                        <Check className="h-3 w-3" /> independent
                      </span>
                    ) : (
                      <span className="shrink-0">context only</span>
                    )}
                  </span>
                </span>
              </span>
            ))}
          </span>
        </span>
      </span>
    </span>
  );
}

/** Tag + score, always together. */
export function AiMeta({ confidence, align, tag = true }: { confidence: Confidence; align?: "left" | "right"; tag?: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      {tag && <AiTag />}
      <ConfidenceScore confidence={confidence} align={align} />
    </span>
  );
}
