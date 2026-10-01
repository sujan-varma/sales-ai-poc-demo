# Cortex Homepages

Interactive cockpit prototype and wireframe execution for **Cortex** (Sales AI platform), built using **Untitled UI** open-source components, Tailwind CSS, and React/Next.js, tailored to the Bondex demo dataset and leadership feedback.

---

## Routes (Option B is the single build target)

| Route | Page | Source |
|---|---|---|
| `/` → `/asm` | Area Sales Manager dashboard — entry point | `src/components/cortex/OptionCHome.tsx` |
| `/leadership` | Head of Sales dashboard — org-wide, read-only (decisions, orchestration, roll-ups) | `src/components/cortex/LeadershipHome.tsx` + `leadership/` |
| `/thermometer` | Thermometer agent, ASM view — Performance · Scorecard · Recommendations (read-only; from the agent rail) | `src/components/cortex/thermometer/` + `src/data/thermometer.ts` |
| `/leadership/thermometer` | Thermometer agent, Head of Sales view (org-wide, scored per region) | same |
| `/configuration` | Head of Sales Configuration — platform settings and decision thresholds (sidebar icon) | `src/components/cortex/ConfigurationPage.tsx` |
| `/home-c` → `/asm` | old Option B URL, kept as a redirect | — |

Both pages sit on the shared Option B shell (`src/components/cortex/shell.tsx`) and use only the tokens in [`DESIGN.md`](../DESIGN.md), in dark and light. The persona menu moves between pages. Option A is archived in `archive/option-a/` as reference only.

`npm run export:html` writes `dist/Sales AI - Option B.html` (all pages, switched by `#asm` / `#leadership` / `#configuration` / `#thermometer` / `#thermometer-head` and the log pages).

---

## Project Structure & Setup

### 1. Open in Antigravity
Open this folder as your active workspace in Antigravity:
`File` > `Open Folder...` > `/Users/rashisaxena/Desktop/cortex-homepages`

### 2. Stack Recommendation
- **Framework**: Next.js (App Router) or Vite + React
- **Styling**: Tailwind CSS
- **Component Foundation**: Untitled UI React (`@untitleduico/react` / `untitleduico/react` components & icons)
- **Runtime**: Node v20 (installed)

---

## Core Specs & Feedback Included

1. **Four Fixed Sections**:
   - **Command Bar**: Google Cloud Agent Platform style pill search bar ("Ask Cortex anything, or tell it where to go").
   - **Quick Start**: Max 3 concise action shortcut cards (e.g., "Generate Q3 Plan").
   - **Needs Attention Table**: Persistent cross-module signal/issue tracking (`Issue`, `Raised in`, `Reflected in`, `Status`) with clickable evidence drill-downs.
   - **Dynamic Widget Grid**: 3–4 focused KPI/insight tiles with "+ Add widget" side drawer & ask-and-pin support.

2. **Persona Switcher**:
   - **Sales Officer (Ajay Talukar)**: Task-first, today's route, outlet pitches, KPI tiles.
   - **Area Sales Manager (Raman)**: Saurashtra territory portfolio, bubble chart, trend line, status donut.
   - **Leadership (Anil Menon)**: Regional comparison bar, cross-module synthesis, high-level text insights.
   - **Territory Executive (Rakesh Verma)**: Territory ticket status donut, newly delegated actions.

3. **Demo Dataset**:
   - Bondex Waterproofing Chemicals (Gujarat, Rajasthan, MP; ASMs Raman, Sudeep; Outlets: Sai Ashirwad Tiles Galaxy, etc.).

---

## Data source: backend + Excel

The dashboard's data comes from the FastAPI backend ([`../backend`](../backend)), which reads `backend/data/Master data_Sales GenAI.xlsx`. It does not use hardcoded data.

1. Start the backend from the repo root:
   `cd backend && .venv\Scripts\activate && uvicorn app.main:app --port 8000`
2. Start the web app from `frontend/`:
   ```
   npm ci
   copy .env.example .env.local
   npm run dev
   ```
   It reads the backend URL from `API_URL` at runtime (served by `/runtime-config`), then fetches `/api/web/bootstrap` before it renders.
3. `npm run export:html` embeds the same data in the single-file export, so the backend must be running. It uses `NEXT_PUBLIC_API_URL`, defaulting to `http://localhost:8000`.

How the data loads:
- `src/data/*.ts` hold the types and UI configuration, and read their values from the payload (`src/data/source.ts`).
- `src/components/cortex/DataGate.tsx` loads the payload before any page module is imported.
- The original hardcoded files are kept for reference in `archive/static-data/`.
- What the workbook doesn't contain is listed at `GET /api/web/data-gaps`.

## Troubleshooting

- **`Module parse failed: Unexpected character '@'` in `globals.css`, or `Cannot find module 'tailwindcss'`.** Your shell has `NODE_ENV=production` set. Unset it, then run `npm ci --include=dev` and `npm run dev` again.

## Environment and deployment

- Variables: [`.env.example`](.env.example). The full reference is [`../ENVIRONMENT.md`](../ENVIRONMENT.md).
- Docker image: [`Dockerfile`](Dockerfile), with `frontend/` as the build context. The guide is [`../DEPLOYMENT.md`](../DEPLOYMENT.md).
