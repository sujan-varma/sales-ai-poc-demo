"use client";

// AI Assistant side drawer — shared by Option A and Option C.
// On desktop it pushes page content aside (see ASSISTANT_PUSH) rather than
// overlaying it; on phones it takes the full screen.

import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, Maximize2, Sparkles, X } from "lucide-react";
import { ASK_ANSWERS } from "@/data/cortexHome";
import { useHome } from "./HomeState";
import { ALL_SCOPE, ScopeSelect } from "./ask";
import { AskAnswerCard } from "./sections";
import { useBrand } from "./agentRun";

/** Page wrappers add this padding while the drawer is open, so content moves aside. */
export const ASSISTANT_PUSH = "md:pr-[400px]";

export function AssistantDrawer() {
  const { assistantOpen, setAssistantOpen, toast } = useHome();
  const brand = useBrand();
  const [scope, setScope] = useState(ALL_SCOPE);
  const [q, setQ] = useState("");
  const [thread, setThread] = useState<{ q: string; scope: string }[]>([]);
  const feed = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  // Lets fixed-position chrome (the review switcher) step out of the drawer's way.
  useEffect(() => {
    if (assistantOpen) document.body.dataset.assistant = "open";
    else delete document.body.dataset.assistant;
    if (assistantOpen) input.current?.focus();
    return () => {
      delete document.body.dataset.assistant;
    };
  }, [assistantOpen]);

  useEffect(() => {
    feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: "smooth" });
  }, [thread.length]);

  useEffect(() => {
    if (!assistantOpen) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setAssistantOpen(false);
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [assistantOpen, setAssistantOpen]);

  if (!assistantOpen) return null;

  const ask = (text: string) => {
    if (!text.trim()) return;
    setThread((t) => [...t, { q: text.trim(), scope }]);
    setQ("");
  };

  return (
    <aside id="ai-assistant" aria-label="AI Assistant" className="fixed right-0 top-0 z-50 flex h-screen w-full flex-col border-l border-cx-line bg-cx-bg md:w-[400px]">
      <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-cx-line px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Sparkles className="h-4 w-4 shrink-0 text-cx-muted" />
          <div className="min-w-0">
            <h2 className="text-[14px] font-medium text-cx-text">AI Assistant</h2>
            <p className="truncate text-[11px] text-cx-faint">Answers show their confidence and sources</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => toast("Expands into the full conversation view (not designed yet).")}
            aria-label="Expand to full conversation"
            title="Expand to full conversation"
            className="flex h-8 w-8 items-center justify-center rounded-md text-cx-faint hover:bg-cx-hover hover:text-cx-text"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setAssistantOpen(false)}
            aria-label="Close AI Assistant"
            className="flex h-8 w-8 items-center justify-center rounded-md text-cx-faint hover:bg-cx-hover hover:text-cx-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div ref={feed} className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
        {thread.length === 0 ? (
          <div className="pt-6 text-center">
            <p className="text-[14px] text-cx-text">Ask about your territories and plans</p>
            <p className="mx-auto mt-1.5 max-w-[280px] text-[12.5px] leading-relaxed text-cx-faint">
              {brand} answers from Huddle, Thermometer, Market Action Plan and Pitch, and links back to the evidence on this page.
            </p>
          </div>
        ) : (
          thread.map((m, i) => (
            <div key={i} className="space-y-2.5">
              <p className="ml-auto w-fit max-w-[85%] rounded-lg bg-cx-raised px-3 py-2 text-[13px] text-cx-text">{m.q}</p>
              <AskAnswerCard q={m.q} scope={m.scope} />
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-cx-line px-4 pb-4 pt-3">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {ASK_ANSWERS.map((a) => (
            <button
              key={a.q}
              onClick={() => ask(a.q)}
              className="rounded-full border border-cx-line bg-cx-panel px-3 py-1 text-left text-[12px] text-cx-muted hover:border-cx-strong hover:text-cx-text"
            >
              {a.q}
            </button>
          ))}
        </div>
        <form
          className="rounded-lg border border-cx-strong bg-cx-panel focus-within:border-[#4a4a52]"
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
        >
          <textarea
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(q);
              }
            }}
            rows={2}
            placeholder={`Ask ${brand} about your territories and plans`}
            className="block w-full resize-none bg-transparent px-3 pt-2.5 text-[13.5px] text-cx-text placeholder:text-cx-faint focus:outline-none"
          />
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <ScopeSelect value={scope} onChange={setScope} up />
            <button type="submit" aria-label="Send" className="flex h-8 w-8 items-center justify-center rounded-md bg-cx-text text-cx-bg hover:opacity-90 disabled:opacity-40" disabled={!q.trim()}>
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
}
