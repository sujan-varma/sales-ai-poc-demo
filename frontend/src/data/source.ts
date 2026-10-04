// Runtime data from the backend (GET /api/web/sections, then each section), built from the Excel workbook.
//
// DataGate fetches the payload and stores it on globalThis before any dashboard module is imported, so the
// data modules in this folder read real values while they evaluate — including the values they derive at load.

export type CortexData = Record<string, Record<string, unknown>> & { data_gaps?: { area: string; detail: string }[] };

declare global {
  // eslint-disable-next-line no-var
  var __CORTEX_DATA__: CortexData | undefined;
}

/** build-time fallback; at runtime the URL comes from /runtime-config (API_URL on the frontend server) */
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

let apiBase = API_BASE;
/** the backend URL in use (after /runtime-config was read) */
export const apiUrl = () => apiBase;

async function resolveApiBase(): Promise<string> {
  try {
    const r = await fetch("/runtime-config", { cache: "no-store" });
    if (r.ok) {
      const j = (await r.json()) as { apiUrl?: string };
      if (j.apiUrl) apiBase = j.apiUrl;
    }
  } catch {
    // no runtime config (e.g. a static export): keep the build-time default
  }
  return apiBase;
}

/** One export from the backend payload, e.g. D("leadership", "REGIONS"). */
export function D<T>(module: string, key: string): T {
  const data = globalThis.__CORTEX_DATA__;
  if (!data) throw new Error("Cortex data is not loaded yet — render pages through DataGate.");
  const mod = data[module];
  if (!mod || !(key in mod)) throw new Error(`Cortex data is missing ${module}.${key} — check the backend /api/web/bootstrap.`);
  return mod[key] as T;
}

/** When this page's data was loaded, and the backend workbook load it came from (for the Sync control). */
export const loadInfo: { at: number; workbookLoadedAt?: string } = { at: Date.now() };

/** The backend's current workbook load time, without fetching the data again. */
export async function fetchWorkbookLoadedAt(): Promise<string | undefined> {
  return (await getJson<{ loaded_at?: string }>("/api/web/sections")).loaded_at;
}

export function dataGaps() {
  return globalThis.__CORTEX_DATA__?.data_gaps ?? [];
}

async function getJson<T>(path: string): Promise<T> {
  const base = await resolveApiBase();
  const r = await fetch(`${base}${path}`, { cache: "no-store" });
  let j: { success?: boolean; data?: T; error?: string };
  try {
    j = await r.json();
  } catch {
    throw new Error(`HTTP ${r.status}`);
  }
  if (!j.success) throw new Error(j.error || `HTTP ${r.status}`);
  return j.data as T;
}

export interface LoadStep {
  key: string;
  label: string;
  records: number;
  state: "waiting" | "loading" | "done";
  ms?: number;
}
export type LoadProgress = { builtMs?: number; steps: LoadStep[] };

/** Each section's step lasts at least this long, so the loader reads as the backend processing each data set
 *  (the requests themselves take a few ms once the workbook is processed). */
const MIN_STEP_MS = 280;
const wait = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

let pending: Promise<CortexData> | null = null;
// everyone waiting on the load hears its progress, including a caller that joins a load already under way
// (React runs a page's effect twice in development; the second run must still see the steps)
const listeners = new Set<(p: LoadProgress) => void>();
let latest: LoadProgress | null = null;
const emit = (p: LoadProgress) => {
  latest = { ...p, steps: p.steps.map((x) => ({ ...x })) };
  listeners.forEach((f) => f(latest!));
};

/** The workbook-backed data, loaded one section at a time: the backend first builds it, then each section is fetched
 *  on its own and ticked off by the loader. Once per page load; later calls reuse it. */
export function loadCortexData(onProgress?: (p: LoadProgress) => void): Promise<CortexData> {
  if (globalThis.__CORTEX_DATA__) return Promise.resolve(globalThis.__CORTEX_DATA__);
  if (onProgress) {
    listeners.add(onProgress);
    if (latest) onProgress(latest);
  }
  if (!pending) {
    latest = null;
    pending = (async () => {
      const p: LoadProgress = { steps: [] };
      emit(p);
      const [info] = await Promise.all([
        getJson<{ built_ms: number; loaded_at?: string; sections: { key: string; label: string; records: number }[] }>("/api/web/sections"),
        wait(MIN_STEP_MS * 2),
      ]);
      loadInfo.workbookLoadedAt = info.loaded_at;
      Object.assign(p, { builtMs: info.built_ms, steps: info.sections.map((x) => ({ ...x, state: "waiting" })) });
      emit(p);
      const data = {} as CortexData;
      for (const step of p.steps) {
        step.state = "loading";
        emit(p);
        const t = performance.now();
        const [value] = await Promise.all([getJson(`/api/web/sections/${encodeURIComponent(step.key)}`), wait(MIN_STEP_MS)]);
        (data as Record<string, unknown>)[step.key] = value;
        Object.assign(step, { state: "done", ms: Math.round(performance.now() - t) });
        emit(p);
      }
      await wait(MIN_STEP_MS); // the finished checklist stays up a moment
      globalThis.__CORTEX_DATA__ = data;
      loadInfo.at = Date.now();
      return data;
    })().catch((e) => {
      pending = null;
      throw e;
    });
  }
  const done = () => onProgress && listeners.delete(onProgress);
  return pending.finally(done);
}
