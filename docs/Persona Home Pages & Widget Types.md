# Persona Home Pages & Widget Types (standalone)

*Replaces the persona-differences part of the Home (Cockpit View) revision prompt — the fixed four-section layout (command bar, quick-start, Needs Attention table, widgets) stands unchanged; this document defines what each persona's Needs Attention and widgets actually contain.*

## Grounded per persona

- **Sales Officer (J1):** “Opens the queue... sees today's actions ranked by agreed value and due date... selects today's outlets.” Task-first; Today's Route (see the companion prompt) is the headline.
- **Area Sales Manager (J2):** “Reviews the territory portfolio: share against market size, which lever carries the opportunity”; mid-month, “sees from the projection that a lever is behind plan.”
- **Leadership (J3):** “Opens the comparative view — region against region on performance, risk and open commitment load... delegation is a normal ticket with an owner.”
- **Territory Executive:** no dedicated journey in the blueprint — inferred from the RBAC table: “Territory queue, assign, verify” (Action Tracker), “Receives territory actions” (Market Action Plan).

## Bondex context

- Raman (ASM), Anil Menon (leadership), Ajay Talukar (sales officer), Rakesh Verma (territory executive, Junagadh).

## Widget taxonomy — pick the type the data actually calls for

Widgets stop being text-only. Six types available to the gallery and to ask-and-pin; use whichever fits, not the same shape for everything:

| Type | Use for | Example |
| --- | --- | --- |
| **KPI tile** | One number that matters | “6 outlets on today's route” |
| **Trend line** | A value over time, especially against target | Projection vs. target for a lever |
| **Comparison bar** | Several things measured the same way, side by side | Region vs. region performance |
| **Status donut** | A count broken into categories | Ticket status breakdown for a territory |
| **Bubble / map** | Two dimensions plus a category | Market size vs. share, reused from Territory Plan Overview |
| **Text insight** | A synthesised read that isn't naturally numeric | “Are we still tracking the direction we set” |

A chart is not automatically better than a sentence — leadership's direction-vs-execution read stays text because that's genuinely what it is: a synthesis, not a series. Cross-module widgets (combining data from two or more modules in one visual) are explicitly in scope — not every widget has to come from a single source.

## Sales Officer — Ajay Talukar

**Needs Attention:** unchanged — cross-module evidence trail scoped to his own outlets. **Primary content:** Today's Route isn't a widget among widgets — it's the headline, above the default widget grid (see the companion Today's Route & Calendar prompt). **Default widgets:** KPI tiles only — “Pitches ready,” “Visits this week.” His day is task-first; a trend line would be noise here.

## Area Sales Manager — Raman

**Needs Attention:** unchanged — the cross-module table, plus plan-health flags from the Market Action Plan revision prompt. **Default widgets:** a **bubble chart** (share vs. market size, pulled from Territory Plan Overview — the same chart, pinned here for a faster read), a **trend line** (this month's projection vs. target for whichever lever is furthest behind), a **status donut** (this quarter's initiatives by status — agreed, in progress, delivered).

## Leadership — Anil Menon

**Needs Attention:** unchanged. **Default widgets:** a **comparison bar** (region vs. region, performance and risk together), a **trend line** (delivered vs. agreed, org-wide, across the quarter), and the existing **text insight** (direction vs. execution) — stays text, per the taxonomy above.

## Territory Executive — Rakesh Verma

**Needs Attention:** scoped to his own territory — same table shape, narrower data. **Default widgets:** a **status donut** (his territory's tickets by stage — Needs an Owner, In Progress, Awaiting Verification), a **KPI tile** (“4 new actions from Raman's Q3 plan this week”) linking straight to what's newly pushed to him from Market Action Plan.

## Worked example — Anil Menon's morning

Anil opens Home. The comparison bar shows Bhavnagar and Amreli both behind Junagadh on the quarter's headline metric. The text widget reads: “Q3 direction: grow Waterproofing Compound share. 22 of 24 territory plans generated against it. 3 territories drifting.” He doesn't open anything — he has what he needed, in a chart and a sentence, not four dashboards.
