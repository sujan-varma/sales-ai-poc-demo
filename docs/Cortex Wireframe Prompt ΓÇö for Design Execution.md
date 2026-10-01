# Cortex Wireframe Prompt — for Design Execution

*Hand this document to Claude (Design) as the brief for wireframing the Sales AI / Cortex platform. It carries the product context, the persona model, the full screen inventory, and the UI rules to hold to. Where something is left open, use judgement and flag the assumption rather than guessing silently.*

## Design tooling — use Impeccable

Build this with **[Impeccable](https://impeccable.style/)** in the loop, not just as a one-off wireframe pass. Impeccable is a design skill for coding agents (Claude Code, Cursor, Codex CLI and others) — it is not a chatbot and it doesn't run inside this chat or this artifact; it works against a live codebase, so it applies once these wireframes move into actual built screens (in Claude Code or an equivalent coding agent).

What it adds to this brief:

- **A `PRODUCT.md`** — capture Cortex's users and purpose once (field officers on a handset, often outdoors; area managers planning quarterly; leadership reviewing) so every module's design work reads from the same context instead of reinventing it per screen.
- **A `DESIGN.md`** — once a visual direction is chosen, Impeccable records it (colour, type, spacing, component set) and holds every subsequent screen — Huddle, Insights, MAP, Pitch, Tracker — to the same system, rather than each module drifting into its own look.
- **AI-slop detection** — Impeccable's detector specifically flags the generic AI-agent patterns Cortex should avoid: a pulsing "AI is thinking" indicator on the Assistant, italic-serif hero text, beige/gradient "AI" tiles, side-tab navigation, cards nested inside cards (worth watching in MAP.AI's territory panel and Pitch.AI's outlet card, which already layer several panels), generic CTA copy, icon-tile stacks and numbered section labels used as decoration.
- **`/impeccable polish` or `/impeccable audit`** — run once screens are built, before they're reviewed, so the output is judged as a real enterprise interface rather than an obviously AI-generated one.

Install with `npx impeccable install` inside the coding agent's project, or via the Claude Code plugin marketplace (`/plugin` → Discover → Impeccable).

## Demo use case — Bondex

Every screen you wireframe, across all four modules and the tracker, runs on **one fictional demo company: Bondex.** Don't invent separate placeholder names per screen — use these consistently everywhere, the same way the real Pitch.AI and MAP.AI prototypes already do, so a name that appears in Huddle also appears in Insights.AI, MAP.AI and Pitch.AI for the same entity.

**Bondex, at a glance**

| Element | Bondex demo data |
| --- | --- |
| Business | Waterproofing chemicals; positioned as the 2nd-largest player, 15+ years, with GMC (Germany) as global partner |
| Product categories | IWC, Repair Polymer, Acrylic Primer, Waterproofing Compound |
| States | Gujarat, Rajasthan, Madhya Pradesh |
| Scale per state | 6–7 micro-markets, 8 ASMs, 24 sales territories, 37–39 distributors, \~1,800 profiled retail outlets, 103–112 dealers |
| Channels | Distributor, dealer, retailer, influencer (general and tile contractors) |
| Outlet types | Hardware & Paint Store, Cement-Steel Dealer, Tile & Sanitaryware Showroom; classed A/B/C and New/Old |
| Competitors | Five unnamed competitors (Competitor 1–5) in market size/share tables |

**Names to reuse across every module:**

- **ASMs (Gujarat):** Raman, Sudeep, Aman, Rohit, Pranay, Mohit, Srinath, Sandeep — Raman is the ASM used in the existing MAP.AI prototype; default to him wherever the wireframe needs one worked example
- **Territory executives:** Rakesh Verma (Junagadh), Suresh Yadav (Bhavnagar)
- **Sales officer:** Ajay Talukar, with 10 retailers under him — the default Pitch.AI persona for wireframes
- **Territories:** Junagadh, Bhavnagar, Amreli (Raman's micro-market), plus Surat and Tapi for Pitch.AI examples
- **Distributors:** Anand Sales Corporation, Classic Kali Enterprises, Shree Pavan Marketing, United Vinay Enterprises, New Vasundhara Marketing, Classic Sunitha Enterprises, New Vaibhav Trading Co, G H Enterprises
- **Sample outlets:** Sai Ashirwad Tiles Galaxy (Class C, new Tile & Sanitaryware Showroom), National Nikhil Cement and Hardware (Class B, existing Cement-Steel Dealer)

**How this ties the modules together in the wireframe:** use Raman + Junagadh/Bhavnagar as the running example through the whole funnel — a Huddle action item raised in a review Raman attends, surfacing as a territory priority in his MAP.AI plan, narrowing into a Pitch.AI talking point for Ajay Talukar at one of Raman's outlets (e.g. Sai Ashirwad Tiles Galaxy), and an objection from that visit becoming a ticket back in the Action Tracker against the same outlet. That single thread, reused across every screen, is what should make the cross-module handoffs demonstrable rather than illustrative.

This reuses exactly the same Bondex data already established for the Pitch.AI/MAP.AI prototypes — don't extend or rename it without checking back.

## Follow the Covasant design system

This is not a from-scratch visual direction — build inside the existing Covasant design system rather than proposing a new one.

- **Component package:** `@cams/design-system` (scope `@cams`), published to Covasant's GCP Artifact Registry. Install it into the project and build screens from its components rather than hand-rolling new ones.
- **Reference before building:** the Storybook at [design-system.covasant.io](https://design-system.covasant.io/) for the live component set, and `CLAUDE.md` (currently v1.2.0) for token tables, disabled-state patterns, icon usage rules, Button colour variants and transition standards. Read both before wireframing a single screen.
- **Where this brief and the design system disagree**, the design system wins on anything visual (colour, spacing, component choice); this brief governs structure, flow and content (which screens, what each one contains, how they connect).
- **Environment note:** the project runs on Node 20 for ES module compatibility with the package.
- If a screen in this brief needs a component the design system doesn't have yet (e.g. the bubble chart in MAP.AI's territory summary, or Pitch.AI's evidence-beside-claim talking-points table), flag it rather than inventing an ad hoc pattern — it likely needs to be added to `@cams/design-system` itself, not one-offed in Cortex.

## What Cortex is

Cortex is a sales platform built on two ideas held together by one shared component. First, a **funnel**: guidance narrows as it descends the sales hierarchy — a leadership decision becomes a territory priority, which becomes an outlet-level talking point — while evidence widens as it climbs back up. Second, a **loop**: Insight → Action → Outcome, where a gap is surfaced, a person decides what to do, the commitment is tracked to closure, and the outcome sharpens the next cycle.

Four capability modules sit on the funnel, each serving one level of the hierarchy on its own clock:

| Module | Persona | Cadence | Produces |
| --- | --- | --- | --- |
| Huddle.AI | Senior leadership | Per review meeting | Structured meeting record — issues, owners, action items |
| Insights.AI | Leadership & managers | Ongoing | Cross-functional read of sales health, gaps, projections |
| MAP.AI | Area sales manager | Quarterly | Territory prioritisation and a quantified action plan |
| Pitch.AI | Sales officer | Daily, per outlet visit | An outlet-specific talking sequence with reasoning per point |

The fifth piece, the **Action Tracker**, is not a capability module — it's a single centralised ticketing system every module writes into and every persona works out of. It is what makes this one product rather than four dashboards.

Navigation is **persona-routed**: one login, role detected from the reporting hierarchy, and the user lands on the tool built for their level rather than choosing one. Modules above a person's level appear as a rollup or not at all.

## Personas and landing views

Everyone lands on **Home** first (see screen 2 below) — no persona is routed straight into a tool. "Lands on" here means what Home is built to get that persona into fastest, via its quick-start cards.

| Persona | Lands on | Can drill into | Locked (tab visible, no access) |
| --- | --- | --- | --- |
| Leadership | Home → Huddle + Thermometer | Any territory or person, org-wide comparative | — |
| Area sales manager | Home → Territory Plan | Own micro-market, any territory/person beneath | Other micro-markets show a locked state beyond the rollup |
| Territory executive | Home → Territory queue | Own officers | Other territories and the Territory Plan tab show a locked state |
| Sales officer | Home → Visit Pitch | Own outlet list only | Comparative overview, Territory Plan, and team/territory queues show a locked state |

The Action Tracker and the Assistant are reachable from anywhere, scoped to whoever is asking.

## Navigation — left sidebar, matching SalesPulze exactly

Cortex is not a new shell — it's the existing SalesPulze application, extended. Keep its left sidebar, its top bar, and its visual system exactly as built; add new items to the sidebar for the new modules, in the same style as what's already there.

**1. Primary navigation is a persistent left sidebar, not a tab bar.** Same sidebar for every persona — nobody gets a custom set of items. Order, top to bottom, under a "Platform" group:

| Sidebar item | Maps to | Sub-menu (nested beneath it in the sidebar, not a content-area tab strip) |
| --- | --- | --- |
| **Home** | New landing screen (section 2) | None — single page |
| **Huddle** | Huddle.AI | **Intel Hub** · **Meeting Repository** · **Action Center** — exactly the three items already built (see the reference screenshots); Intel Hub is where the funnel/gap-and-recommendation content lives |
| **Thermometer** | Insights.AI — sidebar label is "Thermometer", not "Insights" (see the naming note in section 4) | **Performance** · **Actions** — two sidebar items only. Each opens to an in-page tab strip for its finer views (see section 4) — the nine underlying screens still exist, but as tabs inside one of these two pages, not as nine separate sidebar entries. |
| **Territory Plan** | MAP.AI | Territory Summary · Focus Areas · ASM Overview |
| **Visit Pitch** | Pitch.AI | Generate Pitch · Pitch History |
| **Tracker** | Action Tracker | My Actions · Team Queue · Territory Queue · Needs an Owner · Breaching SLA · Awaiting Verification · Channel-facing Tickets · Review Agenda |

Thermometer sitting right after Huddle, and Tracker last, is my placement, not something specified — flag it if a different order is wanted. Everything below this "Platform" group — **Administration** (Admin Dashboard, Meeting Board, Users & Roles, Scopes & Structure, Cost Insights, Business Segments), **Settings** (System Configuration), and **Info** (Setup Requirements) — carries over completely unchanged from the existing build. Don't redesign, rename, or reorganise any of it; it's out of scope for this wireframe pass.

**2. A sub-menu expands under its parent item in the sidebar** (the way Huddle's three items already do), not as a horizontal tab strip in the content area — this corrects the "secondary tab strip" language used earlier in this brief for Insights, Territory Plan, Visit Pitch and Tracker: wherever this document says "tab" or "tab strip" for those, read it as "sidebar sub-menu item" instead. The one exception already established and fine to keep: ASM Overview's own internal Overview/Action Plan/Tracker switcher, which is a content-area tab strip inside that one screen, matching how the real MAP.AI prototype is already built.

**3. A module a person isn't entitled to stays in the sidebar, not hidden**, exactly as established before — clicking it shows the shell (same sidebar, same top bar) with a locked-state panel in place of content.

**4. Design language — match the reference screenshots exactly, not just the structure:**

- **Sidebar:** white background, grouped section labels in small uppercase grey text ("Platform", "Administration", "Settings", "Info"), each item as icon + label, active item highlighted with a light blue background and blue text/icon, a collapse control at the top of the sidebar, "Powered by Covasant" wordmark pinned at the bottom
- **Top bar:** large bold page title, an "AI Inferred" pill badge next to it where content is AI-generated, a one-line grey description beneath the title, a scope selector and a time-range selector on the right, then a notification bell (red count badge) and the signed-in user's name/initial avatar
- **Content cards:** white rounded-corner cards on a light grey page background; each card has a bold title, a one-line grey description, and right-aligned filter dropdowns where relevant
- **Status pills:** the four-band colour system — green Healthy (80–100), amber/orange Moderate (60–80), orange Attention (40–60), red Critical (0–40) — reuse these exact bands and colours anywhere Cortex shows a status, not just in Thermometer
- **Stat tiles:** icon in a circle, a large number, a label, a one-line description, and an "Open Analytics →" button pinned to the bottom of the card
- **Segmented filters:** a horizontal row of plain-text pills (e.g. All / Sales / Finance / HR / IT / Marketing / Others) for cutting a view by function or category
- **Empty states:** a plain sentence ("No insights for Sales Insights.", "No product discussion data available for the selected period.") — no illustrations, no empty-state graphics

Apply this visual system to the new modules (Home, Territory Plan, Visit Pitch) as well as the existing ones — Cortex should look like one more section of the same product, not a different product bolted on.

## Screens to wireframe

Wireframe the following, grouped by module. Each screen list below is a checklist, not prose to summarise — build each one.

### 1 · Persona routing

- **Match the reference login screen exactly** — same split-screen layout, same soft gradient-tile background on the left, same white panel and form layout on the right, same spacing, type sizes and button styling. Only the content listed below changes; nothing else about the design.
- **Left panel:** Covasant logo stays top-left, unchanged. Below it, a small kicker line — **"Sales AI · by BCG"** — above a large bold headline reading **"Cortex"** (replacing "Covasant Agent Management Suite"). Below that, a one-line value-prop paragraph in the same style as the reference (replacing "Unified platform to build, deploy..."): something like *"One connected platform across Huddle, Thermometer, Territory Plan and Visit Pitch — from a meeting, to a territory plan, to what a sales officer says at the next visit."* Footer contact links stay in the same position and style, content TBD.
- **Right panel heading and subtext:** keep “Welcome!” and “Sign in to your account securely.” unchanged.
- **Replace “Organisation / Tenant” with “Role Type.”** This is the actual mechanism for persona routing in the demo — no real auth, so the dropdown lists the four demo personas as static options: **Leadership, Area Sales Manager, Territory Executive, Sales Officer** (matching the Personas and landing views table above). Whichever role is selected is what routes the person to Home, scoped to that persona, on Sign in.
- **Email and Password fields, the Sign in button, the “or continue with” divider, and the AWS/Microsoft/Google buttons** all stay, visually identical to the reference — but they're cosmetic for this demo, not wired to real authentication. Role Type is the only field that actually does anything.
- Sign in routes straight to **Home** (not directly into a module — see screen 2), scoped to whichever role was selected. No module chooser at any point.

### 2 · Home

Home replaces a generic "Overview" — it's the universal landing screen for every persona (content is scoped to the person, the screen itself is the same for everyone), and it's where the platform's chat-first navigation lives. Take inspiration from the Google Cloud console home page: a context header, one-click action cards, quick access to what you actually use, and surfaced alerts — rather than a dashboard of charts to read.

- **Header:** a plain greeting with role and scope (e.g. “Good morning, Raman — Gujarat ASM”), so it's obvious whose Home this is
- **Command bar** (the dominant element, not a small icon): “Ask Cortex anything, or tell it where to go.” This is the Assistant's primary surface — typing a question answers it; typing a destination navigates there directly (“open my territory plan for Bhavnagar”, “start a pitch for Sai Ashirwad Tiles Galaxy”, “show tickets breaching SLA”). Wireframe both behaviours from this one input.
- **Quick-start cards:** 3–4 one-click cards, persona-scoped, each landing directly on a pre-scoped screen rather than a blank one — e.g. for a sales officer: “Make a pitch” (opens Visit Pitch, scoped to the next outlet on today's route) and “See today's route”; for an ASM: “Open my territory plan” and “See open action items for \[region\]”; for leadership: “Review today's Huddle summary” and “Open flagged initiatives.”
- **Module quick-access:** one small card per module the person can actually open (locked modules per the RBAC table don't get a card here at all — Home never advertises what's locked), each showing one live figure and an “Open” link — e.g. Thermometer: “Scorecard: 2 red areas,” Tracker: “2 tickets breaching SLA,” Visit Pitch: “6 outlets on today's route.”
- **Needs attention:** a compact, cross-module list of the most urgent items — a breaching-SLA ticket, a red scorecard row, a de-growing account, a Huddle action item close to due — each one click to its source screen. This is Cortex's equivalent of the Google Cloud home page's recommendations/at-risk cards, and it's where Home earns its place: it's the one screen that reads across every module at once.

Everything past Home — every module, every secondary tab — should be reachable by typing into that same command bar, not only by clicking. The assistant is a navigator for the whole platform, not a panel that lives only on Home; keep it reachable from every other screen too (see section 8), but Home is where it's the headline, not an add-on.

### 3 · Huddle.AI

*Build these as Huddle's three sidebar sub-items — Intel Hub, Meeting Repository, Action Center — matching the existing build exactly (see reference screenshots): Intel Hub carries Field Insights, Field Operations Health, Performance Metrics, Business Dimensions, Performance Analytics and Action Execution Overview; Meeting Repository and Action Center are the call list and action items below.*

- **Meeting Repository** — call list
- Call detail (opened from Meeting Repository) — summary, action items (each with an owner and deadline), flagged issues, competitor-mention tracking
- **Action Center** — action items across meetings, including ones whose outlet reference couldn't be confidently resolved, held for manual assignment

  **Intel Hub** — the funnel/gap-and-recommendation view for meetings: Field Insights (AI-inferred), Field Operations Health (a matrix, one cell per entity, colour = status, drillable by level), Performance Metrics (a trend chart), Business Dimensions (Capability Building / Revenue Seeking / Governance Signal / Execution Alignment), Performance Analytics (stat tiles linking to detailed reports), Action Execution Overview (segmented by function, with an open/pending/in-progress/completed breakdown), Product Discussion Coverage

### 4 · Thermometer (Insights.AI)

> **Superseded (1 Oct 2026).** Thermometer is now three tabs: Performance · Scorecard · Recommendations. The deep dives open as an overlay from Performance, and Initiatives drill down from the Scorecard. There is no editing UI and no Data Quality screen. See `docs/Thermometer — Build Prompt Review.md`.

Insights.AI already exists as a working build (internally called **Sales Thermometer**). This section explains what it's actually doing, in Bondex terms, and how to fold its nine views into the two sidebar items the sidebar table above calls for — **Performance** and **Actions** — instead of nine.

### The journey, in plain terms

Where MAP.AI plans a quarter forward and Pitch.AI runs one visit today, Insights.AI looks backward: how did Bondex actually do, where's the gap, and what should happen about it. It's a review someone runs through in order, narrowing from broad to specific — not nine unrelated destinations:

1. **How's the business doing** — broad performance against target
2. **Where, specifically** — a red/amber/green diagnostic across every area Bondex tracks
3. **Why** — drill into whichever area is red, by channel, product, or business line
4. **By what lever** — the same gaps, viewed by the initiative meant to close them
5. **So do what** — specific, assigned, prioritised actions

Data Quality & Validation runs alongside all of this, quietly — it's not a step in the review, it's the reconciliation report confirming every number above is trustworthy.

### What each screen means, for Raman's Saurashtra micro-market

- **Sales Performance** (entry screen) — achievement against this quarter's target and growth over last year, by territory and product category. Reads like: *"Junagadh is at 78% of target, driven by a shortfall in Waterproofing Compound."*
- **Scorecard** — the same story as a scannable checklist. Every area Bondex tracks (billing growth, channel expansion, product placement, visit adherence, influencer activity) gets a red/amber/green mark, split by region. A manager reads this in seconds to see what needs attention — this is where the colour-band system from the Follow the Covasant design system section applies.
- **Channel / Product / Non-Trade / Stone Performance** (the deep dives) — the "why" behind a red scorecard row. Channel breaks down distributor → dealer → retailer; Product breaks down by category (IWC, Repair Polymer, Acrylic Primer, Waterproofing Compound); Non-Trade covers institutional/project business; Stone is a specific line. Rows expand in place for detail, without leaving the screen.
- **Initiatives** — the same gaps, viewed by the lever being pulled to fix them (onboarding more dealers, expanding retailer reach, recovering a de-growing account), each with its own progress-to-target.
- **Action Plan** (the payoff screen) — a generated, prioritised list of specific actions: *"Sai Ashirwad Tiles Galaxy hasn't ordered Waterproofing Compound in 60 days — recommend a trial-pack visit, estimated uplift ₹7.4 L."* Each row has a priority, the evidence behind it, a suggested action, and an editable plan field — the same estimated/agreed/delivered shape as MAP.AI's action plan, and it should read consistently with it.
- **Data Quality & Validation** — not reviewer-facing in the usual sense; confirms every number above ties back to a real source. Keep it, but as a low-emphasis screen, not a primary destination.

### The consolidation: two sidebar items, not nine

The build today exposes all nine as flat, equal sidebar entries, *and* separately shows them again as a "Review flow" tracker inside the page — the same nine destinations navigable two different ways in two different places. Fix this by keeping one navigation layer, not two:

- **Performance** (sidebar item) — opens to an in-page tab strip: Sales Performance (default) · Scorecard · Channel · Product · Non-Trade · Stone. This is the "how are we doing and where" half of the review.
- **Actions** (sidebar item) — opens to an in-page tab strip: Action Plan (default) · Initiatives · Data Quality & Validation. This is the "so what do we do about it" half.

Use the same in-page tab-strip pattern MAP.AI's ASM Overview already uses for its Overview/Action Plan/Tracker switch — it's a proven pattern in this build, just applied here too. The two sidebar items map to the funnel's two halves (diagnose, then decide); the finer views live as tabs within whichever half they belong to, once, not twice.

### Naming — "Thermometer", not "Insights"

Use **Thermometer** as the sidebar label, not "Insights". "Insights" is the generic label every analytics tab in every product uses — it says nothing. "Thermometer" is the name the client and BCG already use for this exact module (the engagement blueprint is literally titled *Sales Thermometer*), it carries a real metaphor (temperature = health, hot/cold performance) that the red/amber/green scorecard pays off visually, and it's memorable in a way "Insights" never is. Keep **Insights.AI** as the internal/reference name only (consistent with Huddle.AI, MAP.AI, Pitch.AI elsewhere in this brief) — it never appears as UI copy.

### Does Actions belong here, or in the Action Tracker?

**Keep it here, as Thermometer's second sidebar item** — don't fold Action Plan and Initiatives into the Action Tracker. Reasoning:

- **Evidence has to sit beside the claim it supports** (a rule this brief already sets for every screen). Action Plan's rows only make sense next to the Performance data that justifies them — "Sai Ashirwad Tiles Galaxy hasn't ordered Waterproofing Compound in 60 days" needs the Scorecard and Channel Performance context right there, not a click away in a different module.
- **This is the same pattern MAP.AI already uses**, and Thermometer should stay consistent with it: MAP.AI keeps its own Action Plan tab (estimated / agreed / delivered) inside MAP.AI, not inside the Tracker — the Tracker only gets a ticket once someone sends one, via the explicit "Send top N to \[territory executive\]" action on MAP.AI's Territory Summary screen.
- **The Action Tracker is the destination for a decision, not the surface for making one.** Its own engagement blueprint draws this line explicitly: a Thermometer gap or recommendation becomes a **Performance action** ticket only once it's "taken up" — accepted, not merely generated. Before that, it's a proposal under review, sitting inside the module that generated it.

So: **Action Plan and Initiatives stay inside Thermometer**, under the Actions sidebar item, exactly as MAP.AI's Action Plan stays inside Territory Plan. What changes is the handoff — give each Action Plan row an explicit **"Send to Tracker"** control (the same pattern as MAP.AI's "Send top N to \[TE\]"), which is what actually creates the ticket with a real owner, deadline and SLA clock. Wireframe that control on the Action Plan screen.

### What changes for Cortex — remove the manual upload

The current build's Upload tab takes nine separate file uploads before anything renders. In Cortex, nobody uploads a file — the platform fetches this data itself from connected sources, the same way Pitch.AI and MAP.AI assume live or scheduled ingestion. Wireframe Thermometer with no upload screen: replace it with a lightweight data-status indicator (which sources are connected, last refresh — the same lineage-first pattern as MAP.AI's Data Connection Bridge), reachable from settings rather than blocking entry.

### 5 · MAP.AI — five surfaces

*Build these six as the Territory Plan tab's secondary strip — Territory Summary · Focus Areas · ASM Overview (with its own Overview · Action Plan · Tracker tertiary strip) — per the Navigation section above, not as six sequential full-page steps.*

1. **Data connection bridge** — the entry screen. Shows which source systems are feeding the plan and whether each is synced; user picks a geography and generates. Lineage is the first thing shown, before any number.
2. **Territory summary** — each territory plotted by market size against share, banded strong/moderate/weak, filtered per manager. Selecting one opens a panel: market size, share, status, assigned territory executive, count and value of open actionables, top actionables ranked by value uplift (each with a concrete next step), and a control to send them to the territory executive.
3. **Focus areas** — actionables grouped into themes (dealer revival, retail reach & activation, product range selling, influencer engagement), each with an item count and value.
4. **Overview** — micro-market summary; market size/share by product category against named competitors with an observation per category; territory summary; reach summary per distributor (universe of retailers, retailers mapped, reach %, additional retailers needed, dealers to open); influencer summary (onboarding/activation/retention vs target, by contractor type).
5. **Action plan** — one row per issue, grouped by activity type: territory, issue, action steps, plan, and four impact columns (**estimated** / **agreed**, editable by the manager / **delivered** / **% delivered**, against agreed not estimated). Control to add an initiative manually.
6. **Tracker** — rolls the plan up into master value levers, showing which are actually delivering.

### 6 · Pitch.AI — three-step flow

*Build these as the Visit Pitch tab's secondary strip — Generate Pitch · Pitch History — per the Navigation section above.*

1. **Pitch and data rules** — language, a tone preset (e.g. balanced / new-product push), include/exclude specific talking points, visibility into which data points feed the pitch.
2. **Select scope** — geography, area manager, location, sales officer, with a preview of outlet count and what's at stake.
3. **Generated pitch** — one card per outlet:
   - Header: outlet code/name, outlet type, class, new/established
   - Meta line: location, owner, mapped distributor, area manager, rep
   - KPI strip: value to date and growth, average bill, bills/month, SKUs carried vs available
   - Talking-points table: nine topics (company introduction, outstanding, new product, sell top seller, target, loyalty, maintain & grow, open issues, upsell/competition), each with topic, talking point script, and the logic/evidence behind it
   - Footer prompt: capture market intelligence and feedback, discuss with the area manager
   - A download control

- Also wireframe: **visit feedback capture** (post-visit — what landed, objections, next order, a competitor signal)

* **Pitch History** (new secondary tab) — previous pitches delivered to this retailer: what was said each visit, what changed since, and any feedback captured, so an ASM or SO can see a retailer's pitch history over time rather than only today's

### 7 · Action Tracker (cross-cutting, reachable from anywhere)

- My actions
- Team queue (manager/leadership)
- Territory queue (territory executive)
- Needs an owner
- Breaching SLA
- Awaiting verification
- Channel-facing tickets
- Review agenda (auto-assembled per meeting, from open tickets)
- Ticket detail — identity (reference, title, description, class), provenance (originating module, insight id, evidence pointer, raised by/when), subject (entities involved), ownership (assignee, watchers, escalation contact), value (estimated/agreed/delivered/% impact, priority with override), timing (due date, SLA clock), state (lifecycle, blocked reason, age, breach flag), decision (accept/modify/reject with reason code), closure (outcome, evidence, verifying party, acknowledgement), relationships (parent/child/duplicate-of/blocks)

### 8 · Assistant

- One persistent entry point, reachable from anywhere
- Its primary, full-width surface is Home's command bar (screen 2); everywhere else it's a smaller persistent entry point, reachable from any screen. Opening it inside a module pre-scopes it to that context; from Home it's platform-wide.
  - Navigation, not just Q&A: it can take a destination ("open my territory plan for Bhavnagar", "start a pitch for Sai Ashirwad Tiles Galaxy") and go straight there, the same as clicking through the shell would.

    A conversational question, from anywhere, opens the **Conversation screen** — a dedicated chat thread, not an inline answer on the page it was opened from. Wireframe this as its own screen: the exchange so far, an input to continue it, and a "Pin to Home" control on each answer (see the Home revision prompt). Opening it from inside a module still pre-scopes the first question to that context, but the thread itself lives on this one screen regardless of where it was opened from.
- Any answer can become a ticket without leaving the conversation
- Sample queries to design for: *executive* — "Which region is furthest behind target right now?"; *area manager* — "Which lever is furthest below its agreed impact?"; *sales officer* — "Which outlets on today's route have an overdue balance?"; *cross-functional* — "Give me one summary of my week: performance, risk, open initiatives and commitments."

### 9 · Locked module state

- One reusable screen: same shell chrome (header, tab strip) as every other screen, with a locked-state panel in place of content — short explanation ("You don't have access to this feature") and who to ask if there's a natural next step
- Show it applied at least twice: inside a restricted tab for a sales officer (e.g. opening Territory Plan) and for leadership (e.g. opening Visit Pitch), per the RBAC table above

* Avoid the generic AI-chatbot look — no pulsing "AI is thinking" indicator, no bolted-on widget that looks like a different product; the Assistant panel should read as part of the same shell and design system as every module, not a chat plugin dropped on top

## Cross-module handoffs to show explicitly

These are the moments that prove it's one platform, not four tools — wireframe at least these:

- **Huddle → Pitch.AI**: a meeting action item pre-loads as a topic into the next pitch for that outlet
- **MAP.AI → Pitch.AI**: a territory priority pre-loads a topic into pitches for outlets in that territory
- **Pitch.AI → Action Tracker**: an objection or competitor signal raised on a visit becomes a ticket against that outlet
- **Insights.AI → MAP.AI**: a gap for a territory links to related initiatives for the same territory
- **Any module → Action Tracker**: every ticket is one click from its source screen and links back to it

## UI rules to hold on every screen

- AI-generated content (gap narratives, recommendations, risk scores) is always visually distinguishable from deterministic facts (actual vs target)
- Evidence sits beside the claim it supports, not behind a disclosure control
- Drill-down expands *below* the summary view — it never replaces the whole screen
- Filters persist across tabs within a module
- A cross-module jump carries context — pre-applied filters, not a blank landing
- One ticket model everywhere: a ticket looks the same regardless of which module raised it
- Low-confidence AI output is flagged as such, never shown with false certainty
- A person's open high-priority ticket count is always visible somewhere in the shell
- A ticket excluded as a duplicate stays visible with a pointer to the item that absorbed it, rather than disappearingRBAC — what changes per persona

## RBAC — what changes per persona

|  | Leadership | Area sales manager | Territory executive | Sales officer |
| --- | --- | --- | --- | --- |
| Huddle.AI | Primary — runs the review | Runs the daily huddle | Attends, receives actions | Attends, receives actions |
| Insights.AI | Primary — compare & drill | Drill in, comment | Territory view | Own performance only |
| MAP.AI | Rollup only | Primary — plan, agree, send | Receives territory actions | Tab visible, locked ("You don't have access to this feature") |
| Pitch.AI | Full access — reviews pitch outcomes, talking points and visit feedback across every officer | Set strategy, topic order, language | Set or inherit strategy | Primary — generate, run, capture |
| Action Tracker | Org status & ageing | Team queue, reassign, escalate | Territory queue, assign, verify | Personal queue, act, close |

**Two things to get right here:**

- **Leadership has no locked modules at all.** Full access to every sidebar item, Visit Pitch included — they review pitch outcomes and talking points the same way they review everything else.
- **Area sales managers are unlocked everywhere, not just Territory Plan.** Huddle and Thermometer matter just as much to an ASM as MAP.AI: Raman runs or attends the morning huddle himself, and needs that meeting's outcomes — and the Thermometer scorecard — before he plans or adjusts the quarter's territory priorities. Don't treat Territory Plan as the ASM's only real surface; it's their primary landing tab, not their only unlocked one.

## Fidelity and scope for this pass

- **Fidelity:** low-to-mid — structure, hierarchy, content and flow over visual polish. A neutral/greyscale palette is fine for this round.
- **Priority order**, if it can't all be done in one pass: (1) persona routing + shared shell, (2) Pitch.AI's three-step flow and outlet card, (3) MAP.AI's five surfaces, (4) Action Tracker (My actions + ticket detail), (5) Huddle.AI call detail, (6) Insights.AI summary + gaps. Insights.AI and Huddle.AI can be a lighter pass than Pitch/MAP/Tracker this round.
- **Placeholder data:** use the Bondex names and figures given in "Demo use case — Bondex" above, consistently across every screen — no real customer data, and no per-screen invented names.
- If any screen in this brief is underspecified, flag the assumption made rather than resolving it silently.

* Once screens are built in a coding agent, run them through Impeccable (`/impeccable audit`) before review — see "Design tooling" above
