# Build log: ASM, Head of Sales, Thermometer, MAP Studio, Pitch and Action Tracker

*Logged 1 October 2026; updated the same day for MAP Studio, Pitch and the orchestration story.* This records everything built so far for the Sales AI prototype (client: **Bondex Waterproofing Chemicals**), the decisions behind it, and what is still open.

---

## 1. Standalone file

**File:** `dist/Sales AI - Option B.html` (about 675 KB, one file).

- **Open it:** double-click the file. No server, install or internet connection is needed.
- **What's inside:** all the JavaScript (React, components, icons), CSS and brand images.
- **Fonts:** the only external call is Google Fonts (IBM Plex Sans and Mono). Offline, it falls back to system fonts.
- **Last rebuilt:** 1 Oct 2026, 14:15.
  - Type-check passed.
  - All 7 pages rendered in headless Chrome.
- **Rebuild:** `npm run export:html`. The script is `scripts/build-standalone.mjs` and the entry is `src/standalone/optionB.tsx`.

### Page map

Pages switch by URL hash, so refresh and Back both work. You can also move between them from the persona menu, the top nav and the agent rail.

| Hash | Page | Persona | App route |
|---|---|---|---|
| `#asm` (default) | ASM dashboard | Raman, Area Sales Manager, Saurashtra | `/asm` |
| `#thermometer` | Thermometer agent, ASM view | Raman | `/thermometer` |
| `#leadership` | Head of Sales dashboard | Anil Menon, Sales Head | `/leadership` |
| `#thermometer-head` | Thermometer agent, Head of Sales view | Anil Menon | `/leadership/thermometer` |
| `#priority-log` | Logs: Priority Log | Head of Sales | `/logs/priority` |
| `#activity-log` | Logs: Activity Log | Head of Sales | `/logs/activity` |
| `#configuration` | Configuration | Head of Sales | `/configuration` |
| `#map-studio` | MAP Studio, October draft | Raman | `/map/studio` |
| `#map-plans` | Market Action Plans: monthly index; `?plan=sep` opens the September plan | Raman | `/map` |
| `#pitch` | Pitch, per Sales Executive | Raman | `/pitch` |
| `#pitch-detail` | One pitch; `?pitch=<id>` picks it (default Classic Kali Enterprises) | Raman | `/pitch/detail` |
| `#pitch-adhoc` | Ad hoc pitch (secondary path) | Raman | `/pitch/adhoc` |
| `#tracker` | Action Tracker: My Actions · Team; `?ticket=TKT-2342` opens a ticket | Raman | `/tracker` |
| `#tracker-head` | Action Tracker roll-up at ASM level, read-only | Anil Menon | `/leadership/tracker` |
| `#asm-priority-log` · `#asm-activity-log` | Logs for the ASM, scoped to Saurashtra | Raman | `/asm/logs/priority` · `/asm/logs/activity` |

Add `?story=idle` to `#leadership` to show the orchestration card's static "2 hours ago" state, for decks.

Every page has dark and light mode, switched with the sun icon in the top bar.

---

## 2. What is built

### 2.1 ASM dashboard (`#asm`)

Source: `OptionCHome.tsx`, `sections.tsx`, `data/cortexHome.ts`.

- **Shell.** Shared Option B shell (`shell.tsx`) with the agent rail, top nav (Home · Action Tracker · Logs), AI Assistant and persona menu.
- **Insights.** Each insight has an Actions menu and a suggested outcome.
- **Thermometer box.** Recommendations shown as done outcomes, for example "Send to Tracker ✓", which can be removed and restored.
- **Since this morning.** What Sales AI has done today.
- **What's actually working.**
- **Market Action Plan** and **Action Tracker** cards.
- **Outcome wording.** Suggested actions read as finished outcomes ("Push to Pitch engine ✓"), not as asks.
- **Per-action traces.** Each outcome has its own "How it was decided" trace (`actionTrace.tsx`, `data/actionTraces.ts`). It opens as a hover tooltip with a dimmed backdrop.

### 2.2 Head of Sales dashboard (`#leadership`)

Source: `LeadershipHome.tsx`, `leadership/*`, `data/leadership.ts`.

- **Read-only and synthesis-first.** Pitch and the full Huddle stream stay off this page.
- **Top bar.** Home · Action Tracker · Logs, plus a date filter (Today / This week / This month / FY).
- **KPI row.**
- **Live four-block flow** (`liveFlow.tsx`), between the KPIs and Needs Your Decision. Pass 4 brought it back.
- **Needs your decision.** An accordion table. Its Action menu offers answers plus routes (Route to {ASM} → Tracker / Plan / Pitch).
- **Insights.** Each insight can be assigned to an ASM, plus Comment.
- **Territory Health.** 7 regions, expanding to 38 territories. Rule-based, so it carries no AI tag.
- **Also on the page:** Priority Log (capped at 7, equal height), Thermometer Scorecard (capped at 7), September in summary, Market Action Plans and Action Impact.
- **Product-wide changes.** Card subtitles are removed, and only morning huddles exist (the 17:30 Kutch entry is now a staffing call).

### 2.3 Logs (`#priority-log`, `#activity-log`)

- **Priority Log** comes first.
- **Activity Log** has a summary, a live timeline, today's totals and a column table grouped by day, with a trace tooltip on each row.

### 2.4 Configuration (`#configuration`)

Reached from the sidebar icon. It holds Platform settings, Decision thresholds and Change history.

### 2.5 Thermometer agent (`#thermometer`, `#thermometer-head`)

Source: `thermometer/*`. Data comes from the seeded generator in `data/thermometer.ts`; the scorecard, initiative and recommendation logic is in `thermometer/engine.ts`.

- **Reference.** Ported from MYK Laticrete's `index_v8.html`. Its upload, Data Quality and methodology cards were dropped.
- **Read-only.** A sync timestamp ("synced 29 Sep, 08:00") replaces the reference's upload controls. Read filters stay: period (MTD / YTD / Previous month / Quarter / Full year / Balance year), budget scenario (Plan / Stretch / RSTAB), sector, region, territory and category.
- **Performance tab.**
  - Headline tiles: Achievement with RAG, Growth over LY, and RSTAB run-rate.
  - Two charts: Actual against target, and Growth against achievement.
  - Sales Performance table with RSTAB columns.
  - A row opens a wide deep-dive sheet (`DeepDive.tsx`): Channel, Product, Sub-geography and Top channel partners for Trade rows, or Non-Trade.
- **Scorecard tab.**
  - Scored per Saurashtra territory (ASM) or per region (Head of Sales, a 7-column RAG matrix), with a weekly trend.
  - Initiative rows open their KPI tables in place (`Initiatives.tsx`).
  - Channel, product and Non-Trade rows open the matching Performance deep dive.
- **Recommendations tab.**
  - ASM: done chips that match the homepage's `REC_SUGGESTED` routes.
  - Head of Sales: Route to {ASM} plus Comment.

### 2.6 MAP Studio (`#map-studio`)

Source: `map/MapStudioPage.tsx`, `map/MarketSheet.tsx`, `data/map.ts`.

- **Layout carried over from the reference.** 30% conversation, 70% canvas, a territory scope selector, quick-prompt chips, and the Market Size, Market Share, Reach and Influencers toolbar. Each toolbar button opens a side sheet with tabs.
- **Things to consider.** A panel docked on the right lists Thermometer and Huddle signals, each with "Ask about this" and "Open in…".
- **Opens on the October draft, not generated yet.** This matches the homepage's "October not created". "Generate the October plan" runs the MAP agent and fills the canvas with 8 draft initiatives, each with its "How it was decided" trace.
- **Agreeing the plan.** "Agree October plan" locks v1. High-priority initiatives then show as "Pushed to Pitch ✓"; Medium and Low are suggested in Pitch.
- **Entry points.** The homepage "Create Market Action Plan" buttons and the MAP icon on the rail. The old Create-plan dialog is removed.

### 2.7 Market Action Plans (`#map-plans`)

Source: `map/MapPlansPage.tsx`.

- **Index.** One row per month, April to October, built from `PLAN_MONTHS`. Selecting October opens MAP Studio.
- **September plan.** Saurashtra · September 2026 · Locked · v2 of 2. The summary row reads Estimated ₹60.0 L · Agreed ₹55.0 L · Delivered ₹38.6 L (70%) · Closed 2 of 10 · Flagged. These tie exactly to the homepage figures.
- **New since this plan.** Shows signals, and Sales Executive visit feedback from SFA, each linked to the initiative it concerns.
- **Filters.** Territory, Channel, Product, Business sector, Lever, Priority, Status and Pushed to.
- **Expandable rows.** Description, "Why it's in the plan" and "How it reached Pitch" traces, action steps, visit feedback, attachments, and comments that create a ticket for the owner.
- **Actions menu.** Push to Pitch (or take it back), Send to / Open in Tracker, and Comment.

### 2.8 Pitch (`#pitch`, `#pitch-detail`, `#pitch-adhoc`)

Source: `pitch/*`, `data/pitch.ts`.

- **Built around the MAP push.**
  - High-priority plan initiatives arrive on their own.
  - Medium and Low appear under "Suggested for Pitch", with Push and Dismiss. Nothing is pushed silently.
  - Thermometer recommendation #4 shows the second path: an agent route that arrives on its own.
- **Create pitches.** Generates every queued pitch in one batch. Each pitch then goes to its Sales Executive's SFA app with no manual step.
- **Per-SE table.** Mehul S., Ajay T., Kiran D., Neel P. and Vipul M., with pitches, not generated, in SFA, visited, points outstanding and last visit. Expanding a row lists that SE's pitches, each with its source and a trace.
- **Filters.** Territory (multi-select) and Product.
- **Pitch detail, in the confirmed format.**
  - Summary row with source links.
  - "What's new since this was generated", with "Accept as v2".
  - Talking points table: # · Topic · Talking point · Logic · Confidence · Status from SFA · Comment.
  - Coverage arrives from SFA with SE, time and an evidence trace. There is deliberately no manual "Mark covered".
- **Ad hoc pitch.** The old conversational studio, kept as a secondary path for visits the plan didn't anticipate.
- **Shared session state.** Pushes and created pitches carry across the Pitch, pitch detail and plan pages for the session.

### 2.9 Orchestration story (Head of Sales homepage)

Source: `leadership/orchestration.tsx`. It replaces the four-block flow at the top of the homepage.

- **A demo-weight chain.** SFA → Thermometer · Action Tracker → Market Action Plan → Thermometer → Sales Leadership. Each stage has one big icon and a concrete caption.
- **One stage at a time.** Only the live stage animates, with a glow and a gentle breathe. When it completes, a dot travels the arrow and the next stage starts.
- **Live and static.** The 17:45 SFA sync plays live when the page opens. Once it has been watched in the session, the card shows the last run statically, with Replay.
- **Show details.** Collapsed by default. It holds the earlier four-block flow, which remains the accurate, concurrent record.
- **New motion.** `cx-breathe`, `cx-travel` and `.cx-glow-round`, recorded in DESIGN.md.

### 2.10 Action Tracker (`#tracker`, `#tracker-head`)

Source: `tracker/TrackerPage.tsx`, `tracker/loop.ts`, `data/tracker.ts`.

- **Carried over from the reference, structurally unchanged.**
  - The four columns: Needs an Owner · In Progress · Awaiting Verification · Closed / Verified.
  - The filters: Scope, Source, Class, Priority, Territory and View.
  - Create ticket.
  - The full ticket drawer: Owner, SLA, Provenance, Watchers and collaborators, Attachments, the ticket-field groups, the Activity log and Comments.
- **Scoping.**
  - **ASM:** My Actions and Team.
  - **Sales Executive:** no tracker.
  - **Sales Head:** a per-ASM strip and a board at ASM level, read-only. Sales Executive names are folded away, and his comments become delegation tickets for the ASM.
- **Closing the loop (step 11).** In Awaiting Verification, Verify and close updates the linked plan row's Delivered and closes the originating insight on Home, so nothing is re-entered.
  - Example: TKT-2342 moves September from ₹38.6 L to ₹40.9 L (74%).
  - The close carries across pages for the session.
- **Connected entry points.**
  - The top-nav Action Tracker tab, for both personas.
  - Home's "View tracker".
  - Plan rows' ticket ids.
  - "View in Tracker" links in traces.
- **Walkthrough.** The 13-step check is in `docs/Use Case Walkthrough — 13 Steps.md`.

### 2.11 Platform-wide corrections (1 Oct 2026)

**Navigation**
- **One top nav for both personas:** Home · Action Tracker · Logs. Market Action Plan and Reports left the ASM's top bar; MAP is reached from the agent rail and the Home agent row.
- **Agent entry points land on their agent** (rail and Home row): Thermometer → Thermometer, Market Action Plan → Market Action Plans, Pitch → Pitch.
  - Huddle has no agent page in this prototype, so it says so instead of pretending to navigate.
- **Reset for demo** sits in the sidebar for both personas. It confirms, clears everything saved or started in the session, and lands on ASM Home.

**Studio mode**
- MAP Studio and the ad hoc Pitch studio run full-screen. The standard top bar is replaced by a strip holding only the AI Assistant and the persona menu, at the far right. The rail stays and there are no side gutters (DESIGN.md "Studio mode").

**MAP Studio**
- **Create October MAP.** The button label names the month. Clicking it runs a 13-second generation stepper (Huddle → Thermometer → Pitch → Action Tracker → Market Action Plan) before the plan appears.
- **Initiative fields:** Initiative → Estimated (AI) / Target (yours, editable) → Owner → Priority.
- **Hover-to-edit:** a pencil on each row opens inline Target, Owner and Priority fields.
- **Priority calculation:** the two-field formula is **TBD**, pending reconfirmation of the early screenshots. The header tooltip says so.
- **Save** (relabelled from "Agree") keeps the same push behaviour.
  - Saving locks v1, sends High priorities to Pitch, opens a Tracker ticket per initiative (TKT-2410…2417), and lands on the October plan's own page.
  - Studio then shows the plan as closed. **Edit in MAP Studio** is the way back in.

**Market Action Plans**
- **List view:** a "MAP Studio" button, plus the Home month timeline mirrored at the top.
- **Period filter:** persistent on the list and the detail; the list counts the plans in the chosen period.
- **October plan:** a real detail view from the saved plan.
- **Plan table cleanup:** fixed column widths, the attachment and comment counts moved into the meta line, and an Actions header.

**ASM Home**
- "+ Add widget" removed.
- **Period filter:** Financial Year · Quarter · Month · Previous Month · Previous Week, plus a custom calendar range, in one control (`period.tsx`).
  - It reconfigures the hero line and the Achieved and Open-action KPI cards.
  - Other sections stay today- or September-scoped.

**Head of Sales**
- **Orchestration:** each stage holds 10 s, and "Show details" sits at the far right of the status row.
- **Priority Log:** severities are colour-coded on bars and tabs (DESIGN.md "Severity ramp", existing hues only).
- **Activity Log:** reduced to the entry table. Its label inherits the top-bar filter and says the log keeps the last 7 days.

**Also fixed:** element ids equal to page hashes (`#priority-log`) made the standalone file jump on load.

### 2.12 Configuration addition

Platform settings gains "Auto-push plan initiatives to Pitch", with the options High priority only (the default), High and Medium, and Never, always ask.

---

## 3. Decision log

| Date | Decision | Source |
|---|---|---|
| 30 Sep | Option B is the single build target; Option A is archived in `archive/option-a/` | user |
| 30 Sep | DESIGN.md is the only source of tokens; every page ships in dark and light | user |
| 30 Sep | Every UI build runs the Impeccable skill; DESIGN.md wins on conflict | user |
| 1 Oct | PRODUCT.md drafted from the brief; Configuration gets its own route; Territory Health is 7 regions expanding to 38 territories | Leadership build |
| 1 Oct | Bondex is the real client (construction chemicals, not FMCG) | `/impeccable init` |
| 1 Oct | ASM/HoS differences are treated as drift and logged, not fixed ad hoc | Pattern Reconciliation doc |
| 1 Oct, pass 2 | Activity feed replaces the pipeline; Needs Your Decision becomes an accordion; "Cortex" is renamed "Sales AI" in all UI copy | correction pass 2 |
| 1 Oct, pass 3 | Logs move to their own pages (Priority first); "How it was decided" becomes a dimmed hover tooltip on both personas; the font stays IBM Plex; the serif is removed from the summary | correction pass 3 |
| 1 Oct, pass 4 | Live four-block flow returns to the homepage; card subtitles removed product-wide; Scorecard and Priority Log capped at 7; morning huddles only | correction pass 4 |
| 1 Oct | Thermometer uses three tabs; wireframe §4 is superseded | Thermometer review 1.1 |
| 1 Oct | Bondex categories (IWC, Repair Polymer, Acrylic Primer, Waterproofing Compound); Stone dropped | Thermometer review 2.1 |
| 1 Oct | ASM Thermometer recommendations show done chips | Thermometer review 1.4 |
| 1 Oct | Head of Sales Thermometer recommendations get Route to {ASM} plus Comment | Thermometer review 1.3 |
| 1 Oct | Money scale rescaled to Bondex (about 1/8 of MYK): distributors >₹5L / ₹2–5L / <₹2L, dealers >₹60k, retailer value guideline ₹10k. This keeps Saurashtra's September plan near the homepage's ~₹60–75L | Thermometer build |
| 1 Oct | MAP Studio and Pitch: Option B restyle that keeps the reference layout and copy (D1); one monthly plan per ASM across all 6 territories (D2) | MAP & Pitch review |
| 1 Oct | Two paths to Pitch: agent recommendations keep auto-routing; plan initiatives auto-push at High priority, while Medium and Low are suggested with a confirm (D3, plus the user's "auto push … as per priority") | MAP & Pitch review |
| 1 Oct | Defaults accepted ("go ahead with build"): the cut-off lives in Configuration (built as a platform setting, not a numeric threshold, since it's a choice); SFA status replaces manual "Mark covered"; no Head of Sales MAP or Pitch view in this pass | MAP & Pitch review 1.1–1.3 |
| 1 Oct | The Saurashtra roster (Mehul S., Ajay T., Kiran D., Neel P., Vipul M.) replaces the reference's people; new screens say "Sales Executive" | MAP & Pitch review 2.4 |
| 1 Oct | Platform corrections: shared top nav, Studio mode, Create [Month] MAP with generation stepper, Estimated/Target/Owner/Priority with hover-to-edit, Save → plan view, period filter (ASM Home + both MAP views), Reset for demo, orchestration 10 s/stage, severity colours, Activity Log de-duplicated | corrections brief |
| 1 Oct | Priority score's two-field calculation left TBD until the early screenshots are reconfirmed | corrections brief |
| 1 Oct | Action Tracker rebuilt in Option B, structure unchanged. Scoping: ASM My Actions + Team; no Sales Executive view; Sales Head at ASM level only. Step 11's close-the-loop propagation built. | Tracker alignment brief |
| 1 Oct | Step 7: Thermometer recommendations keep D3 auto-routing (removable), not "nothing pushes automatically" | user, Tracker pass |
| 1 Oct | Tracker period is September 2026 (monthly), not Q3; Territory is a filter, not a scope tab; Awaiting Verification uses a hollow blue ring (no purple token) | Tracker pass defaults |
| 1 Oct | The orchestration story replaces the four-block flow on the Head of Sales home; the four blocks move behind "Show details" | Live orchestration brief |
| 1 Oct | MYK programme names replaced with descriptive ones (for example Bandhan → Distributor ordering app adoption); Huddle.ai dropped | Thermometer review 2.3 |

---

## 4. Open items

- **Priority calculation** (two fields): TBD; the early screenshots need to be shared again.
- **Huddle agent page:** not built, so the rail and Home row say so.
- **Period filter reach:** it reshapes the hero and the KPI cards; the Tracker card, Insights and Since this morning stay today- or September-scoped.
- **October in Pitch:** October's Medium and Low initiatives aren't yet listed under Pitch's "Suggested for Pitch" (that list is September's).
- **Head of Sales MAP and Pitch roll-up.** Deferred to its own pass (review 1.3).
- **Naming drift.** "Sales Officer" is still used in older Huddle copy; the new screens say "Sales Executive".
- **Route wording drift.** The homepage says "Push to Pitch engine"; the plan says "Push to Pitch" (Pattern Reconciliation item 4).
- **Priority pill colours.** High, Medium and Low reuse the status colours. DESIGN.md has no priority tokens yet.

- **Action Impact** (Head of Sales) is left as-is, pending a decision.
- **Pattern reconciliation items 1–10** are proposed, not applied. They are in `docs/Pattern Reconciliation — ASM vs Head of Sales.md`. Item 1 (moving the Decisions trace into the tooltip) needs an explicit go-ahead, because pass 3 confirmed Decisions as fine.
- **DESIGN.md gaps 1–12** are flagged and have no values yet. For example, primary blue `#2f6fed` is hard-coded rather than a token, and the trace tooltip and done chip have no DESIGN.md entry.
- **Tracker suggestions.** Still to decide: should Action Tracker's "Suggested by Sales AI" tab also use done-state wording?

---

## 5. Related documents

- `PRODUCT.md`: personas and principles.
- `DESIGN.md`: tokens and the build workflow.
- `docs/Thermometer — Build Prompt Review.md`
- `docs/Pattern Reconciliation — ASM vs Head of Sales.md`
- `docs/Cortex Wireframe Prompt — for Design Execution.md`: §4 is superseded by the Thermometer build.
