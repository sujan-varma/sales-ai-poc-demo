# Thermometer: build prompt review

*Reviewed 1 October 2026.* This review checks the Thermometer build prompt against three sources:

- the reference build `index_v8.html` (the MYK Laticrete sales-review tool);
- PRODUCT.md and DESIGN.md;
- what this repo already records about Thermometer.

**Scope (decided):** port every business-facing view and column. Drop the reference's uploads, its Data Quality & Validation cards and its methodology cards, because no files are uploaded here and there is nothing to reconcile.

**Decisions (confirmed 1 Oct 2026):**
- 1.1: the three tabs win.
- 2.1: Bondex categories, with Stone dropped.
- 1.4: ASM recommendations show done chips.
- 1.3: Head of Sales gets Route to {ASM} plus Comment.

Every other item follows its default.

---

## 1. Conflicts with what the repo already records

### 1.1 The tab structure isn't "already established". The repo records a different one. **Needs a call**

The prompt says Performance · Scorecard · Recommendations is "already established elsewhere in this project". In this repo, the only Thermometer spec is §4 of `docs/Cortex Wireframe Prompt — for Design Execution.md`, and it says something else:

- **Performance** (a sidebar item) holds Sales Performance · Scorecard · Channel · Product · Non-Trade · Stone.
- **Actions** (a sidebar item) holds Action Plan · Initiatives · Data Quality & Validation.
- Action Plan rows keep an editable plan field and a "Send to Tracker" control.

The new prompt changes that spec in four ways:

| Change | Old (wireframe §4) | New (prompt) |
|---|---|---|
| Top level | Two sidebar items | Three tabs |
| Initiatives | A tab under Actions | A drill-down from Scorecard |
| Deep dives | Tabs under Performance | A modal opened from Performance |
| Plan field | Editable | Removed |

**Proposed:** follow the new prompt and mark wireframe §4 as superseded, so the next builder doesn't follow the stale spec.

### 1.2 "No interaction, ever" contradicts "filters stay functionally identical"

The reference has three kinds of control:

| Kind | Examples | Proposed handling |
|---|---|---|
| Read controls (they change the view, not the data) | Current month, period, geography, sector, product filters, the FTS segment toggle, the Initiatives Live / Data-not-available toggle, Current review week | **Keep** |
| Data entry | Upload, the Distribution-to-retailer margin % box, action-note textareas, the editable Action Plan cell, both CSV exports | **Remove** |
| Data as of (day) dropdown | — | Replace with the connected-source sync timestamp |

The margin % is still an input to the retailer-target maths. **Default:** treat it as a platform setting and read it from Configuration (Head of Sales → Platform settings). It is not a control on the Thermometer page.

### 1.3 Leadership can't use the three routing controls as written. **Needs a call**

The prompt gives every recommendation card Send to Tracker · Escalate to Market Action Plan · Send to Pitch, "for both ASM and Leadership".

PRODUCT.md conflicts with that:

- The Head of Sales view is read-only.
- He routes only *into an ASM's* tools.
- Pitch isn't on his homepage.

The pattern he already uses is in Needs Your Decision: **Route to {ASM}**, then Tracker / Plan / Pitch.

**Proposed:**
- **Leadership cards** use that same Route-to-ASM menu, plus Comment.
- **ASM cards** keep the three destinations as they are today.

### 1.4 On the ASM view, recommendations arrive already routed. **Needs a call**

PRODUCT.md principle 2 ("outcomes, not asks") applies to the ASM view. The ASM homepage's Thermometer box already shows each recommendation as done, for example "Send to Tracker ✓", with remove and restore and a "How it was decided" trace.

The prompt describes open controls instead.

**Proposed:**
- The Recommendations tab uses the same done-state outcome chips and the same `REC_SUGGESTED` routes.
- The homepage and the agent page then agree on what has happened to rec-1 to rec-6.

### 1.5 Deep dives don't map one-to-one to Sales Performance rows

The Sales Performance table is organised by geography × sector, but the deep dives are organised by channel, product, sub-geography and top channel partner.

**Default mapping:**

| Row clicked | Opens |
|---|---|
| A Trade row | Channel, Product, Sub-geography and Top channel partners, as tabs inside one overlay, scoped to that row's geography |
| A Non-Trade row | Non-Trade |
| A Stone row (if Stone survives; see 2.1) | Stone |

The deep-dive tables are wide: up to 13 columns, with drill-down rows nested three levels deep. **Default:** make the overlay a wide, full-height sheet with its own scroll, not a centred dialog.

### 1.6 Scorecard rows don't all lead to an initiative

Of the reference scorecard's 26 rows:

- 20 link to an initiative.
- 6 link to deep-dive tabs: channel participation, the 5 product rows and Non-Trade.

**Default:**
- Initiative rows open the initiative drill-down on the Scorecard tab, scrolled to the right KPI table.
- The other rows switch to Performance and open the matching deep-dive overlay.

### 1.7 Reference views the prompt doesn't place

The prompt maps five reference tabs, but index_v8 has 13 sidebar views.

**Defaults:**

| Reference view | Goes to |
|---|---|
| Trade · Channel, Trade · Product, Sub-Geography / Product, Top Channel Partner, Non-Trade, Stone | The Performance deep-dive overlay |
| Month Phasing (the expected MTD curve) | The evidence trail for any MTD-coloured figure |
| RSTAB | Columns in the Sales Performance table, as in v8 |

### 1.8 The period filter overlaps the Head of Sales top-bar date filter

The Head of Sales top-bar filter offers Today / This week / This month / FY. Thermometer's own period control offers MTD / YTD / Previous month / Quarter / Full year / Balance year, plus a current-month selector.

**Default:**
- Thermometer pages show Thermometer's own period control in the page.
- The top-bar date filter is hidden there, so two date controls never disagree on one screen.

---

## 2. Rebranding to Bondex is a remapping, not a rename

### 2.1 Product, channel and segment structure. **Needs a call**

The reference's structure is MYK-specific and has no Bondex equivalent:

- **Products:** Adhesive Types 1–4 → series 303…345, SP 100, Latapoxy, Speciality Adhesive.
- **Segments:** Trade, Projects and Stone.

What Bondex has, on record in this repo:

- **Product categories:** IWC, Repair Polymer, Acrylic Primer, Waterproofing Compound.
- **Channel:** distributor → dealer → retailer.
- **Influencers:** applicators and contractors.

There is no Bondex "Stone" line on record. Wireframe §4 keeps Stone without explaining what it is for Bondex.

**Proposed:**

| Reference | Bondex mapping |
|---|---|
| DBA / RBA / Retailer | Distributor / Dealer / Retailer, with the size bands kept |
| Main products | The four Bondex categories |
| Adhesive Type → Series drill-down | Category → SKU pack sizes, e.g. Waterproofing Compound 1 kg / 5 kg / 20 kg |
| Trade / Non-Trade (Projects) | Kept |
| Stone | Dropped, unless Bondex has a third business line |

### 2.2 Geography

| Reference | Bondex |
|---|---|
| India-1 / India-2 / Exports | Gujarat / Rajasthan / MP |
| Zones and regions | The seven Gujarat regions already in `leadership.ts` |

**Scorecard columns:**
- **Leadership:** one column per region, so a 7-column RAG matrix where the reference had two.
- **ASM:** one column per Saurashtra territory.

### 2.3 MYK programme names

The reference names MYK's own programmes and systems: Bandhan, FTS, DRCP, Rishta, MYK One, ReachMYKL, AskMYKL, and Huddle.ai. Huddle.ai also collides with our Huddle agent.

**Default:** use descriptive names.

| MYK name | Bondex name |
|---|---|
| Bandhan | Distributor ordering app adoption |
| FTS | Dealer scheme |
| DRCP | Beat-plan adherence |
| Rishta | Applicator programme |
| MYK One | SFA order taking |
| ReachMYKL / AskMYKL | Grievance desk |

Huddle.ai is dropped, because the Huddle agent already covers it.

**Budget scenarios:** the 2600 / 2800 / 3000 / RSTAB toggle becomes Plan / Stretch / RSTAB.

---

## 3. Patterns this build has to use (from the reconciliation doc)

- **Evidence trails.** These answer "where this number came from": the source system, the period, and what is included and excluded. They are a third kind of explanation, besides the reasoning trace and the confidence "why".
  - **Default:** use the dimmed tooltip surface the reconciliation doc proposes for every "why" view, extending Territory Health's `source` captions.
  - Recommendation reasoning reuses `TraceTooltip` and `ActionTraceSteps` unchanged.
- **Tables** follow the Activity Log spec (reconciliation item 3).
- **Route labels** come from one shared definition (item 4), not a fourth copy.
- **Headers** use `CardHeader` (item 8).
- **No new tokens.** RAG colours reuse the status tokens. Where the reference relies on colours DESIGN.md doesn't have (Orange as a separate band, the bubble-chart palette), they are flagged, not added.

---

## 4. Tightened prompt (once the four calls are made)

> Build Thermometer as the Thermometer agent page for the ASM (`/thermometer`) and Head of Sales (`/leadership/thermometer`). It has three tabs: Performance · Scorecard · Recommendations.
>
> - **Data.** It reads from connected systems only. A sync timestamp replaces the reference's upload and "data as of" controls. Read controls (period, current month, geography, sector, product, segment toggles) stay. Nothing can be entered or exported.
> - **Performance** ports v8's Sales Performance table with its RSTAB columns.
>   - A row opens a wide overlay holding Channel, Product, Sub-geography and Top channel partners (Trade rows), or Non-Trade.
>   - Every figure opens an evidence trail: source, period, inclusions and exclusions, plus the day-curve for MTD colouring.
> - **Scorecard** ports v8's scorecard, scored by region (Head of Sales) or territory (ASM), with the weekly trend.
>   - Initiative rows open that initiative's KPI tables in place.
>   - Channel, product and Non-Trade rows open the matching Performance overlay.
> - **Recommendations** are v8's Action Plan items as read-only cards with a confidence score and the "How it was decided" trace.
>   - **ASM:** shown as already routed (done chips with remove and restore).
>   - **Head of Sales:** Route to {ASM} → Tracker / Plan / Pitch, plus Comment.
> - **Bondex mapping** follows section 2. **Visual language** follows DESIGN.md (Option B) and the reconciliation directions. Use no new tokens.
