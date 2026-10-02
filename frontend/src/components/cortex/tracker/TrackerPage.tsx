"use client";

// Action Tracker — the board (Needs an Owner · In Progress · Awaiting Verification ·
// Closed / Verified) and the ticket record drawer, carried over from the reference build in
// Option B's language. ASM: My Actions + Team. Sales Head: the roll-up at ASM level, read-only.
// Verifying a ticket closes the loop upward (use-case step 11): the plan row's Delivered and
// the originating insight update, with nothing re-entered.

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Flag, MessageSquare, Paperclip, Plus, Undo2 } from "lucide-react";
import { AgentRun } from "@/data/cortexHome";
import { PRIORITY_COLOR, Priority, TERRITORIES, SEP_INITIATIVES } from "@/data/map";
import {
  ASM_TICKETS,
  COLUMNS,
  Column,
  HEAD_ASMS,
  HEAD_TICKETS,
  SOURCE_LABEL,
  Ticket,
  TicketClass,
  deliveredAfter,
  isMine,
  nowLabel,
  octTickets,
  TRACKER_LABELS,
  readLoop,
  ticketTrace,
  writeLoop,
} from "@/data/tracker";
import { pitchesFor, readSession } from "@/data/pitch";
import { AgentRunChip } from "../agentRun";
import { TraceTooltip } from "../actionTrace";
import { btnPrimary } from "../agentPage";
import { useHome } from "../HomeState";
import { card, Dropdown } from "../kit";
import { useCortexNav } from "../nav";
import { useAsmNav } from "../asmNav";
import { CortexPageRoot, PageFrame, Persona } from "../shell";
import { CommentBox, Drawer, LeadershipProvider, useHeadNav } from "../leadership/common";
import { Seg } from "../thermometer/ui";
import { openSeptemberPlan } from "../map/MapPlansPage";
import { setOpenPitch } from "../pitch/parts";
import { TRACKER_OPEN_KEY } from "./loop";
import { readOct } from "../map/octPlan";
import { useAssignments } from "../assignments";

type Who = "asm" | "head";
const AGREED_TOTAL = SEP_INITIATIVES.filter((i) => i.unit === "₹L").reduce((n, i) => n + i.agreed, 0);
export function TrackerPage({ persona }: { persona: Who }) {
  return (
    <CortexPageRoot>
      <LeadershipProvider>{persona === "head" ? <HeadFrame /> : <AsmFrame />}</LeadershipProvider>
    </CortexPageRoot>
  );
}

function AsmFrame() {
  const { setRole } = useHome();
  const go = useCortexNav();
  const asmNav = useAsmNav("tracker");
  useEffect(() => {
    setRole("asm");
  }, [setRole]);
  return (
    <PageFrame
      persona="asm"
      personaOptions={["asm", "head"]}
      onPersona={(p: Persona) => p === "head" && go("tracker-head")}
      {...asmNav}
    >
      <Board who="asm" />
    </PageFrame>
  );
}

function HeadFrame() {
  const { setRole } = useHome();
  const go = useCortexNav();
  const nav = useHeadNav("none");
  useEffect(() => {
    setRole("head");
  }, [setRole]);
  return (
    <PageFrame persona="head" personaOptions={["asm", "head"]} onPersona={(p: Persona) => p === "asm" && go("tracker")} {...nav} currentTab={1}>
      <Board who="head" />
    </PageFrame>
  );
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

const VIEWS = ["Board · all tickets", "Breaching SLA", "Awaiting verification"];

function Board({ who }: { who: Who }) {
  const go = useCortexNav();
  const head = who === "head";
  const [tickets, setTickets] = useState<Ticket[]>(() => (head ? HEAD_TICKETS : ASM_TICKETS));
  const [scope, setScope] = useState<"mine" | "team">("mine");
  const [asm, setAsm] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [cls, setCls] = useState<string | null>(null);
  const [priority, setPriority] = useState<string | null>(null);
  const [territory, setTerritory] = useState<string | null>(null);
  const [view, setView] = useState(VIEWS[0]);
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // tickets verified earlier in the session stay closed; a deep link can open one
  useEffect(() => {
    const loop = readLoop();
    const oct = readOct();
    // a saved October plan opens one ticket per initiative for its owner
    const fresh = (oct?.saved ? octTickets(oct.rows, oct.savedAt ?? "today") : []).filter((f) => !ASM_TICKETS.some((t) => t.stored && t.title === f.title)).map((t) => (head ? { ...t, delegatedTo: undefined, watchers: t.watchers.filter((w) => !w.role.startsWith("Sales Executive")) } : t));
    setTickets((ts) => [...fresh, ...ts.filter((t) => !fresh.some((f) => f.id === t.id))].map((t) => (loop.closed[t.id] ? closeTicket(t, loop.closed[t.id].outcome, loop.closed[t.id].at, head) : t)));
    try {
      const id = new URLSearchParams(location.search).get("ticket") ?? sessionStorage.getItem(TRACKER_OPEN_KEY);
      sessionStorage.removeItem(TRACKER_OPEN_KEY);
      if (id) setOpen(id);
    } catch {
      /* storage unavailable */
    }
  }, [head]);

  const shown = tickets.filter(
    (t) =>
      (head ? !asm || t.asm === asm : scope === "mine" ? isMine(t) : !isMine(t)) &&
      (!source || SOURCE_LABEL[t.source] === source) &&
      (!cls || t.cls === cls) &&
      (!priority || t.priority === priority) &&
      (!territory || t.territory === territory) &&
      (view === VIEWS[1] ? !!t.sla.breach : view === VIEWS[2] ? t.column === "verify" : true)
  );
  const ticket = tickets.find((t) => t.id === open) ?? null;
  const update = (t: Ticket) => setTickets((ts) => ts.map((x) => (x.id === t.id ? t : x)));

  return (
    <div className="pb-24">
      <section className="cx-land-hero px-4 pb-6 pt-14 sm:px-6">
        <button onClick={() => go(head ? "leadership" : "asm")} className="inline-flex items-center gap-1.5 text-[12px] text-cx-muted hover:text-cx-text">
          <ArrowLeft className="h-3.5 w-3.5" /> Home
        </button>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[28px] font-medium leading-tight tracking-tight text-cx-text">Action Tracker</h1>
            <p className="mt-1.5 text-[12.5px] text-cx-faint">
              {head
                ? "Every ASM's tickets on one board, at ASM level · read-only · open a card for its record"
                : "Every ticket from every module on one board. Filter by scope and source; open a card for its full record."}
            </p>
          </div>
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex h-8 items-center rounded-lg border border-cx-line bg-cx-panel px-2.5 text-[12px] text-cx-text">{head ? TRACKER_LABELS.headScope : TRACKER_LABELS.region}</span>
            <Dropdown label="" value={TRACKER_LABELS.month} options={[TRACKER_LABELS.month]} onChange={() => {}} allOption={false} />
          </span>
        </div>
      </section>

      <div className="space-y-5 px-4 sm:px-6">
        {head && <AsmStrip tickets={tickets} active={asm} onPick={setAsm} />}

        <div className="flex flex-wrap items-center gap-1.5">
          {head ? (
            <Dropdown label="ASM" value={asm} options={HEAD_ASMS} onChange={setAsm} placeholder="All ASMs" />
          ) : (
            <Seg
              value={scope}
              options={[
                { id: "mine", label: "My Actions" },
                { id: "team", label: "Team" },
              ]}
              onChange={setScope}
              label="Scope"
            />
          )}
          <Dropdown label="Source" value={source} options={Object.values(SOURCE_LABEL)} onChange={setSource} placeholder="All sources" />
          <Dropdown label="Class" value={cls} options={["Channel", "Collection", "Coverage", "Range", "Pricing", "Internal"]} onChange={setCls} placeholder="All classes" />
          <Dropdown label="Priority" value={priority} options={["High", "Medium", "Low"]} onChange={setPriority} placeholder="All priorities" />
          {!head && <Dropdown label="Territory" value={territory} options={["All territories", ...TERRITORIES]} onChange={setTerritory} />}
          <span className="ml-auto flex items-center gap-1.5">
            {!head && (
              <button onClick={() => setCreating(true)} className={btnPrimary}>
                <Plus className="h-4 w-4" /> Create ticket
              </button>
            )}
            <Dropdown label="View" value={view} options={VIEWS} onChange={(v) => setView(v ?? VIEWS[0])} allOption={false} />
          </span>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((c) => {
            const items = shown.filter((t) => t.column === c.id);
            return (
              <section key={c.id} aria-label={c.label} className="rounded-lg border border-cx-line bg-cx-panel/50 p-3">
                <h2 className="flex items-center gap-2 px-1 pb-3 pt-1 text-[13.5px] font-medium text-cx-text">
                  <span className="h-2 w-2 rounded-full" style={c.hollow ? { boxShadow: `inset 0 0 0 1.5px ${c.color}` } : { background: c.color }} aria-hidden />
                  {c.label}
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-cx-line px-1.5 font-data text-[11px] text-cx-muted">{items.length}</span>
                </h2>
                <ul className="space-y-2">
                  {items.length === 0 && <li className="px-1 py-6 text-center text-[12.5px] text-cx-faint">No tickets</li>}
                  {items.map((t) => (
                    <li key={t.id}>
                      <TicketCard t={t} head={head} onOpen={() => setOpen(t.id)} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      {ticket && <TicketDrawer key={ticket.id} t={ticket} who={who} onClose={() => setOpen(null)} onChange={update} />}
      {creating && (
        <CreateTicket
          onClose={() => setCreating(false)}
          onCreate={(t) => {
            setTickets((ts) => [t, ...ts]);
            setScope("mine");
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

/** Sales Head only: one cell per ASM. It stops at the ASM; Sales Executives are a level below. */
function AsmStrip({ tickets, active, onPick }: { tickets: Ticket[]; active: string | null; onPick: (a: string | null) => void }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-cx-line bg-cx-line sm:grid-cols-4 xl:grid-cols-7">
      {HEAD_ASMS.map((a) => {
        const mine = tickets.filter((t) => t.asm === a);
        const open = mine.filter((t) => t.column !== "closed").length;
        const breach = mine.filter((t) => t.sla.breach && t.column !== "closed").length;
        const verify = mine.filter((t) => t.column === "verify").length;
        const on = active === a;
        return (
          <button key={a} onClick={() => onPick(on ? null : a)} aria-pressed={on} className={`px-4 py-3 text-left ${on ? "bg-cx-hover" : "bg-cx-panel hover:bg-cx-hover/60"}`}>
            <span className="block text-[12.5px] text-cx-text">{a}</span>
            <span className="block truncate text-[11px] text-cx-faint">{mine[0]?.region}</span>
            <span className="mt-2 block font-data text-[18px] leading-none text-cx-text">{open}</span>
            <span className="mt-1 block text-[11px] text-cx-faint">
              open{breach ? <span className="text-[#e85a70]"> · {breach} breaching</span> : null}
              {verify ? ` · ${verify} to verify` : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const initials = (n: string) =>
  n
    .replace(/\./g, "")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function TicketCard({ t, head, onOpen }: { t: Ticket; head: boolean; onOpen: () => void }) {
  const owner = head ? t.assignee : t.delegatedTo ?? t.assignee;
  return (
    <button onClick={onOpen} className={`block w-full rounded-lg border bg-cx-panel p-3.5 text-left transition-colors hover:border-cx-strong ${t.sla.breach && t.column !== "closed" ? "border-[#e85a70]/50" : "border-cx-line"}`}>
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex h-5 items-center rounded-md border border-cx-line bg-cx-raised px-1.5 text-[11px] text-cx-muted">{SOURCE_LABEL[t.source]}</span>
        {t.isNew && <span className="inline-flex h-5 items-center rounded-full bg-[#2f6fed] px-1.5 font-data text-[10px] uppercase tracking-[0.06em] text-white">New</span>}
        {t.sla.breach && t.column !== "closed" && <span className="inline-flex h-5 items-center rounded-md bg-[#d64550] px-1.5 text-[11px] text-white">Breaching SLA</span>}
        <span className="ml-auto font-data text-[11px] text-cx-faint">{t.id}</span>
      </span>
      <span className="mt-2 block text-[13.5px] font-medium leading-snug text-cx-text">{t.title}</span>
      {head && <span className="mt-1 block text-[11.5px] text-cx-faint">{t.asm} · {t.region}</span>}
      <span className="mt-3 flex items-center gap-2 text-[12px]">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-data text-[10px] ${owner ? "border border-cx-line bg-cx-raised text-cx-muted" : "border border-dashed border-cx-strong text-cx-faint"}`} title={owner ?? "No owner"}>
          {owner ? initials(owner) : "–"}
        </span>
        <PriorityFlag p={t.priority} />
        <span className={`truncate ${t.sla.breach && t.column !== "closed" ? "text-[#e85a70]" : t.column === "closed" ? "text-cx-faint" : "text-cx-muted"}`}>{t.column === "closed" ? `Due ${t.due}` : t.sla.label}</span>
        <span className="ml-auto flex shrink-0 items-center gap-2 font-data text-[11px] text-cx-faint">
          <span className="inline-flex items-center gap-1" title="Watchers">
            <Eye className="h-3 w-3" /> {t.views}
          </span>
          <span className="inline-flex items-center gap-1" title="Comments">
            <MessageSquare className="h-3 w-3" /> {t.comments.length}
          </span>
        </span>
      </span>
    </button>
  );
}

function PriorityFlag({ p }: { p: Priority }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-[12px]" style={{ color: PRIORITY_COLOR[p] === "#7c7f89" ? "rgb(var(--cx-muted))" : PRIORITY_COLOR[p] }}>
      <Flag className="h-3 w-3" /> {p}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Drawer: the ticket record
// ---------------------------------------------------------------------------

function closeTicket(t: Ticket, outcome: string, at: string, head: boolean): Ticket {
  return {
    ...t,
    column: "closed",
    sla: { label: "Met", met: true },
    closure: { outcome, verifier: t.asm, ack: `Closed ${at}` },
    activity: [...t.activity, { who: t.asm, what: "verified and closed it", when: at }],
    sfaDone: head ? undefined : t.sfaDone,
  };
}

function TicketDrawer({ t, who, onClose, onChange }: { t: Ticket; who: Who; onClose: () => void; onChange: (t: Ticket) => void }) {
  const go = useCortexNav();
  const { toast } = useHome();
  const nt = useAssignments();
  const ASM = TRACKER_LABELS.asm;
  /** assignments and the officers' field actions live in the backend; the officer is notified there */
  const remote = t.stored || !!(t.soId && t.retailerId);
  const head = who === "head";
  const [watching, setWatching] = useState(false);
  const [run, setRun] = useState<{ run: AgentRun; key: number } | null>(null);
  const [runDone, setRunDone] = useState(false);
  const [result, setResult] = useState<{ before: number; after: number; initiative?: number; insight?: string } | null>(null);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState(t.comments);
  const col = COLUMNS.find((c) => c.id === t.column)!;
  const pitchId = useMemo(() => (t.links?.pitchOutlet ? pitchesFor(readSession()).find((p) => p.outlet === t.links!.pitchOutlet)?.id : undefined), [t.links]);
  const init = t.links?.initiative ? SEP_INITIATIVES.find((i) => i.id === t.links!.initiative) : undefined;

  /** use-case step 11: verifying closes the ticket and carries the result up to the plan and the insight */
  const verify = () => {
    const loop = readLoop();
    const before = deliveredAfter(loop);
    const at = nowLabel();
    const outcome = t.sfaDone?.outcome ?? `Closed by ${ASM}`;
    if (remote) nt.review(t, "verify").catch((e: Error) => toast(`Not saved: ${e.message}`));
    loop.closed[t.id] = { delivered: t.sfaDone?.delivered, outcome, at };
    writeLoop(loop);
    const after = deliveredAfter(loop);
    setRun({
      run: {
        agent: "map",
        steps: [`closing ${t.id}`, ...(init ? [`updating plan #${init.n} Delivered`] : []), ...(t.links?.insight ? ["closing the originating insight"] : [])],
        result: init ? `September Delivered ₹${before.toFixed(1)} L → ₹${after.toFixed(1)} L · insight closed` : `${t.id} closed`,
        link: init ? "View plan" : "View in Tracker",
      },
      key: Date.now(),
    });
    setResult({ before, after, initiative: init?.n, insight: t.links?.insight });
    onChange(closeTicket(t, outcome, at, head));
  };

  const sendBack = () => {
    const to = t.delegatedTo ?? t.assignee ?? "the owner";
    onChange({ ...t, column: "progress", activity: [...t.activity, { who: ASM, what: `sent it back to ${to}`, when: nowLabel() }] });
    if (remote)
      nt.review(t, "send_back")
        .then(() => toast(`Sent back to ${to}. It's open again in the officer's app, with a notification.`))
        .catch((e: Error) => toast(`Not saved: ${e.message}`));
    else toast(`Sent back to ${to}.`);
  };

  const setColumn = (v: string | null) => {
    const c = COLUMNS.find((x) => x.label === v);
    if (!c || c.id === t.column) return;
    if (c.id === "closed") return verify();
    onChange({ ...t, column: c.id, assignee: c.id !== "owner" && !t.assignee ? ASM : t.assignee, activity: [...t.activity, { who: ASM, what: c.id === "progress" && !t.assignee ? "took ownership" : `moved it to ${c.label}`, when: nowLabel() }] });
  };

  const sourceLink = (): { label: string; act: () => void } | null => {
    if (t.source === "thermometer") return { label: "Open in Thermometer", act: () => go("thermometer") };
    if (t.source === "huddle") return { label: "Open in Huddle", act: () => go("huddle") };
    if (t.source === "map" && !head) return { label: "Open the plan row", act: () => (openSeptemberPlan(), go("map-plans")) };
    return null;
  };
  const src = sourceLink();
  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 py-1.5 text-[12.5px] sm:grid-cols-[180px_minmax(0,1fr)]">
      <dt className="text-cx-faint">{k}</dt>
      <dd className="text-cx-text">{v ?? "—"}</dd>
    </div>
  );
  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="pt-3">
      <p className="text-[11.5px] text-cx-faint">{title}</p>
      <dl className="mt-1">{children}</dl>
    </div>
  );

  return (
    <Drawer label={`${t.id} ${t.title}`} onClose={onClose} width="max-w-[680px]">
      <div className="flex flex-wrap items-center gap-2 pr-24">
        <span className="font-data text-[12px] text-cx-faint">{t.id}</span>
        <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-cx-line bg-cx-raised px-2 text-[11.5px] text-cx-text">
          <span className="h-1.5 w-1.5 rounded-full" style={col.hollow ? { boxShadow: `inset 0 0 0 1.5px ${col.color}` } : { background: col.color }} aria-hidden />
          {col.label}
        </span>
        {t.sla.breach && t.column !== "closed" && <span className="inline-flex h-6 items-center rounded-md bg-[#d64550] px-2 text-[11.5px] text-white">Breaching SLA</span>}
      </div>
      <button onClick={() => setWatching((w) => !w)} aria-pressed={watching} className="absolute right-14 top-6 inline-flex h-7 items-center gap-1.5 rounded-md border border-cx-line px-2.5 text-[12px] text-cx-muted hover:border-cx-strong hover:text-cx-text">
        {watching ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {watching ? "Unwatch" : "Watch"}
      </button>
      <h2 className="mt-3 text-[20px] font-medium leading-snug text-cx-text">{t.title}</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-cx-muted">{t.description}</p>
      <div className="mt-2">
        <TraceTooltip trace={ticketTrace(t)} />
      </div>

      {/* controls */}
      {head ? (
        <div className="mt-4 rounded-lg border border-cx-line bg-cx-raised/50 px-4 py-3">
          <p className="text-[12.5px] text-cx-muted">Read-only. {t.asm} owns this; the Sales Executive detail stays in his Tracker. A comment becomes a delegation ticket he owns.</p>
          <div className="mt-3">
            <CommentBox asm={t.asm} subject={t.id} compact />
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <Dropdown label="Status" value={col.label} options={COLUMNS.map((c) => c.label)} onChange={setColumn} allOption={false} />
          {(t.column === "owner" || t.column === "progress") && (["Accept", "Modify", "Reject"] as const).map((d) => (
            <button
              key={d}
              onClick={() => {
                onChange({ ...t, decision: d === "Accept" ? `Accepted by ${ASM}` : d === "Modify" ? `Modified by ${ASM}` : `Rejected by ${ASM} · reason: not this month`, activity: [...t.activity, { who: ASM, what: d === "Accept" ? "accepted it" : d === "Modify" ? "modified it" : "rejected it", when: nowLabel() }] });
                toast(`${t.id}: ${d === "Accept" ? "accepted" : d === "Modify" ? "marked modified; edit the fields below" : "rejected, with reason code \"not this month\""}.`);
              }}
              className={`inline-flex h-8 items-center rounded-md border px-2.5 text-[12.5px] ${t.decision?.startsWith(d === "Accept" ? "Accepted" : d === "Modify" ? "Modified" : "Rejected") ? "border-cx-strong bg-cx-hover text-cx-text" : "border-cx-line text-cx-muted hover:border-cx-strong hover:text-cx-text"}`}
            >
              {d}
            </button>
          ))}
          {pitchId && (
            <button onClick={() => (setOpenPitch(pitchId), go("pitch-detail"))} className="inline-flex h-8 items-center rounded-md border border-cx-line px-2.5 text-[12.5px] text-cx-muted hover:border-cx-strong hover:text-cx-text">
              View in Pitch
            </button>
          )}
          {src && (
            <button onClick={src.act} className="ml-auto text-[12.5px] text-[#4f86f7] hover:underline">
              {src.label}
            </button>
          )}
        </div>
      )}

      {/* awaiting verification: the SE's done, from SFA, waits for the ASM */}
      {!head && t.column === "verify" && t.sfaDone && (
        <div className="mt-4 rounded-lg border border-[#4f86f7]/40 bg-[#2f6fed]/[0.07] px-4 py-3.5">
          <p className="text-[12px] text-cx-faint">
            Marked done in SFA by <span className="text-cx-text">{t.sfaDone.by}</span> · {t.sfaDone.when}
          </p>
          <p className="mt-1 text-[13px] text-cx-text">{t.sfaDone.outcome}</p>
          {init && t.sfaDone.delivered != null && (
            <p className="mt-1 text-[12px] text-cx-muted">
              Closes plan #{init.n} at <span className="font-data text-cx-text">₹{t.sfaDone.delivered.toFixed(1)}L</span> delivered (now <span className="font-data">₹{(init.delivered ?? 0).toFixed(1)}L</span> of <span className="font-data">₹{init.agreed.toFixed(1)}L</span> agreed).
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button onClick={verify} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#2f6fed] px-3 text-[12.5px] font-medium text-white hover:bg-[#4f86f7]">
              <Check className="h-3.5 w-3.5" /> Verify and close
            </button>
            <button onClick={sendBack} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-cx-line px-2.5 text-[12.5px] text-cx-muted hover:border-cx-strong hover:text-cx-text">
              <Undo2 className="h-3.5 w-3.5" /> Send back
            </button>
          </div>
        </div>
      )}

      {run && (
        <div className="mt-4 space-y-2">
          {!runDone && <AgentRunChip key={run.key} run={run.run} block onDone={() => setRunDone(true)} />}
          {runDone && !result?.initiative && <p className="text-[12.5px] text-cx-muted">{run.run.result}.</p>}
          {runDone && result && result.initiative && (
            <div className="cx-land-fade rounded-lg border border-cx-line bg-cx-panel px-4 py-3 text-[12.5px]">
              <p className="text-cx-text">Loop closed, nothing re-entered:</p>
              <ul className="mt-1.5 space-y-1 text-cx-muted">
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2fa85c]" /> Plan #{result.initiative} closed · September Delivered <span className="font-data text-cx-text">₹{result.before.toFixed(1)} L → ₹{result.after.toFixed(1)} L ({Math.round((result.after / AGREED_TOTAL) * 100)}% of agreed)</span>
                </li>
                {result.insight && (
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2fa85c]" /> The originating insight on Home now reads Closed
                  </li>
                )}
              </ul>
              <p className="mt-2 flex gap-4">
                <button onClick={() => (openSeptemberPlan(), go("map-plans"))} className="inline-flex items-center gap-1 text-[#4f86f7] hover:underline">
                  View plan <ArrowRight className="h-3 w-3" />
                </button>
                <button onClick={() => go("asm")} className="inline-flex items-center gap-1 text-[#4f86f7] hover:underline">
                  View on Home <ArrowRight className="h-3 w-3" />
                </button>
              </p>
            </div>
          )}
        </div>
      )}

      {/* summary grid */}
      <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-cx-line bg-cx-line sm:grid-cols-3">
        {[
          ["Owner", t.assignee ? (head ? t.assignee : t.delegatedTo ? `${t.assignee} → ${t.delegatedTo}` : t.assignee) : "Needs an owner"],
          ["Priority", t.priority],
          ["Due", t.due],
          ["SLA", t.sla.label],
          ["Source", SOURCE_LABEL[t.source]],
          ["Class", t.cls],
        ].map(([k, v]) => (
          <div key={k} className="bg-cx-panel px-4 py-3">
            <p className="text-[11.5px] text-cx-faint">{k}</p>
            <p className={`mt-0.5 text-[13px] ${k === "SLA" && t.sla.breach && t.column !== "closed" ? "text-[#e85a70]" : "text-cx-text"}`}>{v}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-6 text-[14px] font-medium text-cx-text">Watchers and collaborators</h3>
      <ul className="mt-2 divide-y divide-cx-line rounded-lg border border-cx-line">
        {t.watchers.map((w) => (
          <li key={w.name} className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-cx-line bg-cx-raised font-data text-[10px] text-cx-muted">{initials(w.name)}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] text-cx-text">{w.name}</span>
              <span className="block text-[11px] text-cx-faint">{w.role}</span>
            </span>
            <span className="text-[12px] text-cx-muted">{w.relation}</span>
          </li>
        ))}
        {head && t.delegatedTo === undefined && t.asm === TRACKER_LABELS.asm && <li className="px-4 py-2.5 text-[12px] text-cx-faint">Sales Executives in {t.asm}'s team are not shown at Sales Head level.</li>}
      </ul>

      <div className="mt-6 flex items-center justify-between">
        <h3 className="text-[14px] font-medium text-cx-text">
          Attachments · <span className="font-data">{t.attachments}</span>
        </h3>
        {!head && (
          <button onClick={() => toast("Attach an invoice, photo or PDF to this ticket.")} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-cx-line px-2.5 text-[12px] text-cx-muted hover:border-cx-strong hover:text-cx-text">
            <Paperclip className="h-3.5 w-3.5" /> Attach
          </button>
        )}
      </div>
      <p className="mt-1 text-[12.5px] text-cx-faint">{t.attachments ? `${t.attachments} document on this ticket.` : "No attachments."}</p>

      <h3 className="mt-6 text-[14px] font-medium text-cx-text">Ticket fields</h3>
      <div className="divide-y divide-cx-line">
        <Group title="Provenance">
          <Row k="Source screen" v={t.provenance.screen} />
          <Row k="Insight id" v={t.provenance.insightId} />
          <Row k="Evidence" v={t.provenance.evidence} />
          <Row k="Raised" v={t.provenance.raised} />
        </Group>
        <Group title="Subject">
          <Row k="Entities" v={t.entities} />
        </Group>
        <Group title="Ownership">
          <Row k="Assignee" v={t.assignee ? (head ? t.assignee : t.delegatedTo ? `${t.assignee} → ${t.delegatedTo}` : t.assignee) : "—"} />
          <Row k="Escalation contact" v={TRACKER_LABELS.head} />
        </Group>
        {t.value && (
          <Group title="Value">
            <Row k="Estimated" v={t.value.unit === "₹L" ? `₹${t.value.est.toFixed(1)} L` : `${t.value.est} ${t.value.unit}`} />
            <Row k="Agreed" v={t.value.unit === "₹L" ? `₹${t.value.agreed.toFixed(1)} L` : `${t.value.agreed} ${t.value.unit}`} />
            <Row k="Delivered" v={t.value.delivered == null ? "—" : t.value.unit === "₹L" ? `₹${t.value.delivered.toFixed(1)} L` : `${t.value.delivered} ${t.value.unit}`} />
          </Group>
        )}
        <Group title="State">
          <Row k="Lifecycle" v={col.label} />
          <Row k="Age" v={t.age} />
          <Row k="Breach" v={t.sla.breach && t.column !== "closed" ? "Yes" : "No"} />
        </Group>
        <Group title="Decision">
          <Row k="Decision" v={t.decision} />
        </Group>
        <Group title="Closure">
          <Row k="Outcome" v={t.closure?.outcome} />
          <Row k="Verifying party" v={t.closure?.verifier} />
          <Row k="Acknowledgement" v={t.closure?.ack} />
        </Group>
        <Group title="Relationships">
          <Row k="Parent" v={t.relationships.parent} />
          <Row k="Children" v={t.relationships.children} />
          <Row k="Duplicate" v={t.relationships.duplicate} />
          <Row k="Blocks" v={t.relationships.blocks} />
          <Row k="Related" v={t.relationships.related} />
        </Group>
      </div>

      <h3 className="mt-6 text-[14px] font-medium text-cx-text">Activity</h3>
      <ol className="mt-2 border-l border-cx-line pl-4">
        {[...t.activity].reverse().map((a, i) => (
          <li key={i} className="relative pb-3 text-[12.5px] last:pb-0">
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-cx-strong bg-cx-bg" aria-hidden />
            <span className="text-cx-text">{a.who}</span> <span className="text-cx-muted">{a.what}</span> <span className="text-cx-faint">· {a.when}</span>
          </li>
        ))}
      </ol>

      {!head && (
        <>
          <h3 className="mt-6 text-[14px] font-medium text-cx-text">
            Comments · <span className="font-data">{comments.length}</span>
          </h3>
          <ul className="mt-2 space-y-2">
            {comments.map((c, i) => (
              <li key={i} className="rounded-lg border border-cx-line bg-cx-panel px-3.5 py-2.5">
                <p className="text-[12px]">
                  <span className="text-cx-text">{c.who}</span> <span className="text-cx-faint">· {c.when}</span>
                </p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-cx-text">{c.text}</p>
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!comment.trim()) return;
              const text = comment.trim();
              setComments((c) => [...c, { who: ASM, when: "Just now", text }]);
              setComment("");
              if (remote) nt.comment(t.id, text, t).catch((e: Error) => toast(`Not saved: ${e.message}`));
            }}
            className="mt-2 flex gap-2"
          >
            <label htmlFor={`tc-${t.id}`} className="sr-only">
              Add a comment
            </label>
            <input id={`tc-${t.id}`} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" className="h-9 min-w-0 flex-1 rounded-md border border-cx-strong bg-cx-bg px-3 text-[12.5px] text-cx-text placeholder:text-cx-faint focus:border-[#2f6fed]/70 focus:outline-none" />
            <button type="submit" disabled={!comment.trim()} className="inline-flex h-9 items-center rounded-md bg-[#2f6fed] px-3 text-[12.5px] font-medium text-white hover:bg-[#4f86f7] disabled:opacity-40">
              Comment
            </button>
          </form>
        </>
      )}
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Create ticket
// ---------------------------------------------------------------------------

function CreateTicket({ onClose, onCreate }: { onClose: () => void; onCreate: (t: Ticket) => void }) {
  const [title, setTitle] = useState("");
  const [territory, setTerritory] = useState<string | null>(TRACKER_LABELS.territories[0] ?? null);
  const [priority, setPriority] = useState<string | null>("Medium");
  const [cls, setCls] = useState<string | null>("Channel");
  const create = () => {
    if (!title.trim()) return;
    onCreate({
      id: `TKT-${Date.now() % 100000}`,
      title: title.trim(),
      description: `Created by ${TRACKER_LABELS.asm} in the Action Tracker.`,
      source: "assistant",
      cls: (cls ?? "Channel") as TicketClass,
      priority: (priority ?? "Medium") as Priority,
      column: "owner",
      isNew: true,
      territory: territory ?? "All territories",
      asm: TRACKER_LABELS.asm,
      region: TRACKER_LABELS.region,
      assignee: null,
      due: "—",
      sla: { label: "No SLA until owned" },
      watchers: [{ name: TRACKER_LABELS.asm, role: `ASM · ${TRACKER_LABELS.region}`, relation: "Watching" }],
      provenance: { screen: "Action Tracker · created by hand", evidence: "—", raised: `${TRACKER_LABELS.asm}, just now` },
      entities: territory ?? "—",
      age: "0 days",
      relationships: {},
      activity: [{ who: TRACKER_LABELS.asm, what: "created this ticket", when: "Just now" }],
      comments: [],
      attachments: 0,
      views: 1,
    });
  };
  return (
    <Drawer label="Create ticket" onClose={onClose} width="max-w-[520px]">
      <h2 className="text-[20px] font-medium text-cx-text">Create ticket</h2>
      <p className="mt-1 text-[12.5px] text-cx-faint">It lands in Needs an Owner. Taking ownership starts its SLA.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
        className="mt-5 space-y-4"
      >
        <div>
          <label htmlFor="nt-title" className="text-[12px] text-cx-faint">
            Title
          </label>
          <input id="nt-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing, and where" className="mt-1 h-10 w-full rounded-md border border-cx-strong bg-cx-bg px-3 text-[13px] text-cx-text placeholder:text-cx-faint focus:border-[#2f6fed]/70 focus:outline-none" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Dropdown label="Territory" value={territory} options={["All territories", ...TERRITORIES]} onChange={setTerritory} allOption={false} />
          <Dropdown label="Priority" value={priority} options={["High", "Medium", "Low"]} onChange={setPriority} allOption={false} />
          <Dropdown label="Class" value={cls} options={["Channel", "Collection", "Coverage", "Range", "Pricing", "Internal"]} onChange={setCls} allOption={false} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-md border border-cx-line px-3 text-[13px] text-cx-muted hover:border-cx-strong hover:text-cx-text">
            Cancel
          </button>
          <button type="submit" disabled={!title.trim()} className={btnPrimary}>
            Create ticket
          </button>
        </div>
      </form>
    </Drawer>
  );
}
