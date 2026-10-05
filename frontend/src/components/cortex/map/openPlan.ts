"use client";

// Which plan the Market Action Plans page should open on, handed over through session
// storage so a link from anywhere — the homepage, the Tracker, a pitch's breadcrumb —
// lands on the plan itself rather than the index. Kept apart from MapPlansPage so a page
// that only needs the link doesn't pull the whole plans view into its bundle.

const OPEN_KEY = "cx-map-open";
const ORG_OPEN_KEY = "cx-map-org-open";

function write(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}
function take(key: string): string | null {
  try {
    const v = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    return v;
  } catch {
    return null;
  }
}

/** The ASM's own plans, by month. */
export const openSeptemberPlan = () => write(OPEN_KEY, "sep");
/** Saving in MAP Studio lands here, on the October plan's own page. */
export const openOctoberPlan = () => write(OPEN_KEY, "oct");
export function takeAsmPlan(): "sep" | "oct" | null {
  let want: string | null = null;
  try {
    want = new URLSearchParams(location.search).get("plan");
  } catch {
    /* no location */
  }
  const v = take(OPEN_KEY) ?? want;
  return v === "sep" || v === "oct" ? v : null;
}

/** One ASM's plan on the org-wide index, so the Head of Sales lands back on that plan. */
export const openOrgPlan = (id: string) => write(ORG_OPEN_KEY, id);
export const takeOrgPlan = () => take(ORG_OPEN_KEY);
