"use client";

// Leadership page state and the pieces its sections share: the delegation-ticket
// comment box (the only way leadership changes anything an ASM owns), the side
// drawer, and decision replies.

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, MessageSquare, X } from "lucide-react";
import { RANGES, RangeId } from "@/data/leadership";
import { useHome } from "../HomeState";
import { useCortexNav } from "../nav";
import { useOutside } from "../shell";
import { AgentRunChip } from "../agentRun";

export interface Ticket {
  id: string;
  asm: string;
  subject: string;
  text: string;
}

export interface DecisionReply {
  optionId: string;
  /** free-text note, when Anil replied in his own words */
  note?: string;
}

interface LeadershipCtx {
  /** the top-bar date filter: governs KPIs, logs and impact metrics */
  range: RangeId;
  setRange: (r: RangeId) => void;
  tickets: Ticket[];
  raiseTicket: (asm: string, subject: string, text: string) => Ticket;
  replies: Record<string, DecisionReply>;
  reply: (decisionId: string, r: DecisionReply | null) => void;
}

const Ctx = createContext<LeadershipCtx | null>(null);

export function useLeadership() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLeadership must be used inside <LeadershipProvider>");
  return c;
}

export function LeadershipProvider({ children }: { children: React.ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [replies, setReplies] = useState<Record<string, DecisionReply>>({});
  const [range, setRangeState] = useState<RangeId>("fy");
  // the range carries across Leadership pages in this tab
  useEffect(() => {
    try {
      const r = sessionStorage.getItem("cx-lead-range") as RangeId | null;
      if (r && RANGES.some((x) => x.id === r)) setRangeState(r);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const setRange = useCallback((r: RangeId) => {
    setRangeState(r);
    try {
      sessionStorage.setItem("cx-lead-range", r);
    } catch {
      /* ignore */
    }
  }, []);
  const next = useRef(2042);
  const raiseTicket = useCallback((asm: string, subject: string, text: string) => {
    const t = { id: `DL-${next.current++}`, asm, subject, text };
    setTickets((ts) => [...ts, t]);
    return t;
  }, []);
  const reply = useCallback((id: string, r: DecisionReply | null) => {
    setReplies((prev) => {
      const n = { ...prev };
      if (r) n[id] = r;
      else delete n[id];
      return n;
    });
  }, []);
  return <Ctx.Provider value={{ range, setRange, tickets, raiseTicket, replies, reply }}>{children}</Ctx.Provider>;
}

/** Comment on something an ASM owns. Sending creates a delegation ticket in that ASM's Tracker. */
export function CommentBox({ asm, subject, compact = false }: { asm: string; subject: string; compact?: boolean }) {
  const { raiseTicket } = useLeadership();
  const [open, setOpen] = useState(!compact);
  const [text, setText] = useState("");
  const [sent, setSent] = useState<{ ticket: Ticket; key: number }[]>([]);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (open && compact) input.current?.focus();
  }, [open, compact]);

  const send = () => {
    if (!text.trim()) return;
    const ticket = raiseTicket(asm, subject, text.trim());
    setSent((s) => [...s, { ticket, key: Date.now() }]);
    setText("");
    if (compact) setOpen(false);
  };

  return (
    <div className="space-y-2">
      {sent.map(({ ticket, key }) => (
        <div key={key} className="space-y-1.5">
          <p className="rounded-md border border-cx-line bg-cx-raised px-2.5 py-2 text-[12px] text-cx-muted">
            <span className="font-data text-[10.5px] text-cx-faint">{ticket.id} · you</span>
            <span className="mt-0.5 block text-cx-text">“{ticket.text}”</span>
          </p>
          <AgentRunChip
            run={{ agent: "map", steps: ["creating the delegation ticket", `adding it to ${asm}'s Tracker`], result: `${ticket.id} is in ${asm}'s Tracker, owned by ${asm}`, link: "View ticket" }}
            block
          />
        </div>
      ))}
      {open ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="rounded-lg border border-cx-strong bg-cx-panel focus-within:border-[#2f6fed]/70"
        >
          <label className="sr-only" htmlFor={`c-${subject}`}>
            Comment for {asm}
          </label>
          <textarea
            id={`c-${subject}`}
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
              if (e.key === "Escape" && compact) setOpen(false);
            }}
            rows={2}
            placeholder={`Comment for ${asm}. It becomes a delegation ticket they own.`}
            className="block w-full resize-none bg-transparent px-3 pt-2.5 text-[13px] text-cx-text placeholder:text-cx-faint focus:outline-none"
          />
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <span className="pl-1 text-[11px] text-cx-faint">You can't edit it here; {asm} acts on the ticket.</span>
            <span className="flex items-center gap-1.5">
              {compact && (
                <button type="button" onClick={() => setOpen(false)} className="h-7 rounded-md px-2 text-[12px] text-cx-faint hover:text-cx-text">
                  Cancel
                </button>
              )}
              <button type="submit" disabled={!text.trim()} className="inline-flex h-7 items-center rounded-md bg-[#2f6fed] px-2.5 text-[12px] font-medium text-white hover:bg-[#4f86f7] disabled:opacity-40">
                Send to {asm}
              </button>
            </span>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-cx-line px-2.5 text-[12px] text-cx-muted hover:border-cx-strong hover:text-cx-text"
        >
          <MessageSquare className="h-3.5 w-3.5" /> Comment
        </button>
      )}
    </div>
  );
}

/** Right-hand drawer, same frame as the territory brief. */
export function Drawer({ label, onClose, children, width = "max-w-[600px]" }: { label: string; onClose: () => void; children: React.ReactNode; width?: string }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/50" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={label} className={`relative h-full w-full ${width} overflow-y-auto border-l border-cx-strong bg-cx-bg px-6 py-7 sm:px-8`} onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} onClick={onClose} className="absolute right-5 top-6 rounded-md p-1 text-cx-faint hover:bg-cx-hover hover:text-cx-text" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
        {children}
      </aside>
    </div>
  );
}

/** Mono label + value, the small stat used across the leadership sections. */
export function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 text-[12px] text-cx-faint">
      {tone && <span className="h-1.5 w-1.5 self-center rounded-full" style={{ background: tone }} />}
      {label} <span className="font-data text-cx-text">{value}</span>
    </span>
  );
}

export function useRange() {
  const { range } = useLeadership();
  return RANGES.find((r) => r.id === range)!;
}

/** One date filter for the whole Leadership view, in the top bar beside the persona menu. */
export function DateFilter() {
  const { range, setRange } = useLeadership();
  const [open, setOpen] = useState(false);
  const ref = useOutside<HTMLDivElement>(open, () => setOpen(false));
  const cur = RANGES.find((r) => r.id === range)!;
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Date range: ${cur.label}`}
        className="flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-cx-line bg-cx-panel px-2.5 text-[12.5px] text-cx-text hover:border-cx-strong"
      >
        <CalendarDays className="h-4 w-4 text-cx-muted" />
        <span className="hidden sm:inline">{cur.label}</span>
        <ChevronDown className="hidden h-3 w-3 text-cx-faint sm:block" />
      </button>
      {open && (
        <ul role="listbox" aria-label="Date range" className="absolute right-0 top-full z-50 mt-1.5 w-60 rounded-lg border border-cx-strong bg-cx-raised p-1.5 shadow-2xl">
          <li className="px-2 pb-1.5 pt-1 font-data text-[10.5px] uppercase tracking-[0.08em] text-cx-faint">Show figures for</li>
          {RANGES.map((r) => (
            <li key={r.id}>
              <button
                role="option"
                aria-selected={r.id === range}
                onClick={() => {
                  setRange(r.id);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left hover:bg-cx-hover"
              >
                <span>
                  <span className="block text-[12.5px] text-cx-text">{r.label}</span>
                  <span className="block font-data text-[10.5px] text-cx-faint">{r.detail}</span>
                </span>
                {r.id === range && <Check className="h-3.5 w-3.5 text-cx-text" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Head of Sales top nav: Home · Action Tracker · Logs. */
export function useHeadNav(current: "home" | "logs" | "none") {
  const go = useCortexNav();
  const { toast } = useHome();
  return {
    tabs: ["Home", "Action Tracker", "Logs"],
    currentTab: current === "home" ? 0 : current === "logs" ? 2 : -1,
    onTab: (i: number) => {
      if (i === 0) go("leadership");
      else if (i === 2) go("priority-log");
      else go("tracker-head");
      return true;
    },
  };
}
