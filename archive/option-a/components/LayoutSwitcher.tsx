"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Review aid: flip between the two layouts. Not part of either design. */
export function LayoutSwitcher() {
  const path = usePathname();
  const opts = [
    { href: "/home-a", label: "Option A" },
    { href: "/home-c", label: "Option B" },
  ];
  return (
    <div className="cx-switcher fixed bottom-4 right-4 z-[55] flex items-center gap-0.5 rounded-lg border border-cx-strong bg-cx-raised/95 p-1 text-[12px] shadow-2xl backdrop-blur">
      <span className="px-2 font-data text-[10.5px] uppercase tracking-[0.08em] text-cx-faint">Layout</span>
      {opts.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          className={`rounded-md px-2.5 py-1 ${path === o.href ? "bg-cx-text text-cx-bg" : "text-cx-muted hover:text-cx-text"}`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
