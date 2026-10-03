"use client";

// The centred modal behind every "explain this" control: the confidence score's "Why this score", an action's
// "How it was decided", a huddle score's breakdown. Opens on click; Escape, the ✕ or the backdrop close it, and
// focus goes back to the control that opened it.

import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function CenterModal({
  title,
  meta,
  onClose,
  width = "max-w-[440px]",
  frame = "border-cx-strong bg-cx-bg",
  children,
}: {
  /** the heading, read out as the dialog's name */
  title: React.ReactNode;
  /** small text beside the ✕ (e.g. "re-scored 08:00") */
  meta?: React.ReactNode;
  onClose: () => void;
  width?: string;
  /** border + background classes */
  frame?: string;
  children: React.ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const closeFn = useRef(onClose);
  closeFn.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    // capture on window, so Escape closes only this modal and not a drawer it was opened from
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      closeFn.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  // in a portal, so a card's overflow or transform can't clip or trap it. React events still bubble to the card
  // that holds the trigger, so every click stops here.
  return createPortal(
    <div
      className="cx-modal-scrim fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`cx-modal-in relative max-h-[calc(100vh-32px)] w-full ${width} overflow-y-auto rounded-xl border p-5 text-left shadow-[0_24px_64px_rgba(0,0,0,0.6)] ${frame}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={titleId} className="min-w-0 text-[13px] font-medium text-cx-text">
            {title}
          </h2>
          <span className="flex shrink-0 items-center gap-2">
            {meta && <span className="font-data text-[10.5px] text-cx-faint">{meta}</span>}
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-cx-faint hover:bg-cx-hover hover:text-cx-text">
              <X className="h-4 w-4" />
            </button>
          </span>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
