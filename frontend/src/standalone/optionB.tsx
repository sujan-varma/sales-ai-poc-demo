// Standalone entry for the single-file HTML export (npm run export:html).
// Option B flow without Next.js routing: the page lives in the URL hash
// (#asm / #leadership / #configuration / #activity-log / #priority-log / #thermometer / #thermometer-head), so page switches and refresh work from a plain file.

import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { OptionCHome } from "@/components/cortex/OptionCHome";
import { LeadershipHome } from "@/components/cortex/LeadershipHome";
import { ConfigurationPage } from "@/components/cortex/ConfigurationPage";
import { LogsPage } from "@/components/cortex/LogsPage";
import { ThermometerPage } from "@/components/cortex/thermometer/ThermometerPage";
import { CortexNavProvider, CortexPage } from "@/components/cortex/nav";

const PAGES: CortexPage[] = ["asm", "leadership", "configuration", "activity-log", "priority-log", "thermometer", "thermometer-head"];
const readHash = (): CortexPage => PAGES.find((p) => location.hash === `#${p}`) ?? "asm";

function App() {
  const [page, setPage] = useState<CortexPage>(readHash);

  useEffect(() => {
    const onHash = () => setPage(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (p: CortexPage) => {
    history.pushState(null, "", `#${p}`);
    setPage(p);
    window.scrollTo(0, 0);
  };

  return (
    <div className="cx-root min-h-screen bg-cx-bg font-plex text-cx-text antialiased" style={{ colorScheme: "dark" }}>
      <CortexNavProvider go={go}>
        {/* keyed so each page starts fresh, as it does when switching routes in the app */}
        {page === "leadership" ? (
          <LeadershipHome key="leadership" />
        ) : page === "configuration" ? (
          <ConfigurationPage key="configuration" />
        ) : page === "activity-log" ? (
          <LogsPage key="activity" view="activity" />
        ) : page === "priority-log" ? (
          <LogsPage key="priority" view="priority" />
        ) : page === "thermometer" ? (
          <ThermometerPage key="thermo-asm" persona="asm" />
        ) : page === "thermometer-head" ? (
          <ThermometerPage key="thermo-head" persona="head" />
        ) : (
          <OptionCHome key="asm" />
        )}
      </CortexNavProvider>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
