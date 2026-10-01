// Runtime data from the backend (GET /api/web/bootstrap), built from the Excel workbook.
//
// DataGate fetches the payload and stores it on globalThis before any dashboard module is imported, so the
// data modules in this folder read real values while they evaluate — including the values they derive at load.

export type CortexData = Record<string, Record<string, unknown>> & { data_gaps?: { area: string; detail: string }[] };

declare global {
  // eslint-disable-next-line no-var
  var __CORTEX_DATA__: CortexData | undefined;
}

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

/** One export from the backend payload, e.g. D("leadership", "REGIONS"). */
export function D<T>(module: string, key: string): T {
  const data = globalThis.__CORTEX_DATA__;
  if (!data) throw new Error("Cortex data is not loaded yet — render pages through DataGate.");
  const mod = data[module];
  if (!mod || !(key in mod)) throw new Error(`Cortex data is missing ${module}.${key} — check the backend /api/web/bootstrap.`);
  return mod[key] as T;
}

export function dataGaps() {
  return globalThis.__CORTEX_DATA__?.data_gaps ?? [];
}

let pending: Promise<CortexData> | null = null;

/** Fetch the payload once per page load; later calls reuse it. */
export function loadCortexData(): Promise<CortexData> {
  if (globalThis.__CORTEX_DATA__) return Promise.resolve(globalThis.__CORTEX_DATA__);
  if (!pending) {
    pending = fetch(`${API_BASE}/api/web/bootstrap`, { cache: "no-store" })
      .then(async (r) => {
        let j: { success?: boolean; data?: CortexData; error?: string };
        try {
          j = await r.json();
        } catch {
          throw new Error(`HTTP ${r.status}`);
        }
        if (!j.success || !j.data) throw new Error(j.error || `HTTP ${r.status}`);
        globalThis.__CORTEX_DATA__ = j.data;
        return j.data;
      })
      .catch((e) => {
        pending = null;
        throw e;
      });
  }
  return pending;
}
