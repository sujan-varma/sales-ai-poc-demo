// Standalone entry for the single-file HTML export (npm run export:html).
// Renders both layouts without Next.js routing: the layout lives in the URL
// hash (#option-a / #option-b), so the switcher and refresh work from a plain file.

import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { OptionAHome } from "@/components/cortex/OptionAHome";
import { OptionCHome } from "@/components/cortex/OptionCHome";

type Layout = "a" | "c";
const readHash = (): Layout => (location.hash === "#option-b" || location.hash === "#pulse" ? "c" : "a");

function App() {
  const [layout, setLayout] = useState<Layout>(readHash);

  useEffect(() => {
    const onHash = () => setLayout(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (l: Layout) => {
    history.replaceState(null, "", l === "c" ? "#option-b" : "#option-a");
    setLayout(l);
    window.scrollTo(0, 0);
  };

  const opts: { id: Layout; label: string }[] = [
    { id: "a", label: "Option A" },
    { id: "c", label: "Option B" },
  ];

  return (
    <div className="cx-root min-h-screen bg-cx-bg font-plex text-cx-text antialiased" style={{ colorScheme: "dark" }}>
      {/* keyed so each layout starts fresh, as it does when switching routes in the app */}
      {layout === "a" ? <OptionAHome key="a" /> : <OptionCHome key="c" />}
      <div className="cx-switcher fixed bottom-4 right-4 z-[55] flex items-center gap-0.5 rounded-lg border border-cx-strong bg-cx-raised/95 p-1 text-[12px] shadow-2xl backdrop-blur">
        <span className="px-2 font-data text-[10.5px] uppercase tracking-[0.08em] text-cx-faint">Layout</span>
        {opts.map((o) => (
          <button
            key={o.id}
            onClick={() => go(o.id)}
            aria-pressed={layout === o.id}
            className={`rounded-md px-2.5 py-1 ${layout === o.id ? "bg-cx-text text-cx-bg" : "text-cx-muted hover:text-cx-text"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
