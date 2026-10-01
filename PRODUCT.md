# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Area Sales Manager (Raman: Saurashtra, 6 territories).** Runs the month. He reviews what Sales AI has already routed, adds or removes routes, assigns actions to sales officers, and creates the monthly Market Action Plan. The ASM homepage (`/asm`, Option B) is finalized.
- **Head of Sales (Anil Menon: Gujarat, 7 ASMs, 38 territories).** Reviews the whole org from one read-only view. His screen (`/leadership`, plus `/logs/priority`, `/logs/activity` and `/configuration`) is still in progress. He can do four things:
  - answer decisions Sales AI escalates above his thresholds, or route them into the owning ASM's tools;
  - comment, which creates a delegation ticket the ASM owns;
  - assign an insight, but only to a named ASM, never directly to a sales executive;
  - set platform configuration and decision thresholds.
- **Sales Executive (Ajay Talukar).** Has no Sales AI screen. Sales AI reaches him inside the SFA app he already uses.

## Product Purpose

Sales AI, built by Covasant, turns the signals a field sales org already produces into actions. Those signals are SFA and DMS data, huddles and calls, retailer visits, and plan actuals. Sales AI routes each action to the right tool and tracks whether it worked.

- **ASM success:** knowing what Sales AI already did for him, and why, without re-doing it.
- **Head of Sales success:** seeing, in one uncluttered read, what the org delivered, what's at risk and which few calls need him personally. The full record is one click away in Logs.

## Positioning

Sales AI is a set of cooperating agents, not one dashboard: Huddle, Thermometer, Market Action Plan and Pitch, with Churn coming soon.

- Sales AI syncs their output across tools and acts on its own below configurable thresholds.
- It escalates above those thresholds, and shows how each action was routed.
- It learns from how past actions performed.

Making that orchestration visible, per action for the ASM and as a live log for the Head of Sales, is part of the product.

## Operating Context

- **Client:** Bondex Waterproofing Chemicals, a construction-chemicals maker selling through distributors, dealers and retailers. Applicators and contractors act as influencers. Markets: Gujarat, Rajasthan, MP.
- **Demo data:** regions, ASMs, outlets and every figure are demo data in `src/data/cortexHome.ts` and `src/data/leadership.ts`, not real results.
- **Monthly rhythm:** each ASM creates a Market Action Plan per month, and the financial year runs from April (FY 2026–27). Huddles run on a schedule, and a scheduled huddle ending triggers agent work automatically.
- **Product name:** "Cortex" is the former name. The UI says Sales AI everywhere; "Cortex" survives only in code identifiers and comments.
- **Feedback loop:** BCG review calls with Amit, Mohit and Raghavendra drive the corrections. The latest are the 30 September follow-up and Head of Sales correction passes 2–3, on 1 October 2026.

## Capabilities and Constraints

- **Agents:**
  - Huddle: meeting intelligence.
  - Thermometer: performance signals and recommendations.
  - Market Action Plan: territory planning.
  - Pitch: customer conversations.
  - Churn: not live yet.
- **Suggested actions are outcomes.** On the ASM view, Sales AI's suggested actions read as already done ("Send to Tracker ✓"), each with a "How it was decided" trace. Head of Sales decisions are the deliberate exception: they sit above his threshold, so they stay open questions with a Suggested answer.
- **Every AI-generated item** carries an "AI inferred" tag and a confidence score that explains itself on interaction.
- **Territory Health** is rule-based from SFA/DMS data and deliberately not AI-inferred.
- **Head of Sales scope:**
  - Read-only and org-wide.
  - No create, edit or plan generation.
  - Pitch is not on his homepage.
  - Insights are filtered to the items still waiting on him.
  - One top-bar date filter (today, this week, this month, FY) governs every date-scoped section.
- **Head of Sales homepage:** kept deliberately light. A compact Live indicator replaces any full activity view; the detail lives in Logs. Priority Log leads (attention and action), Activity Log follows (observation only).
- **Configuration** (platform settings and Decision Thresholds) is its own screen, reached from the sidebar. The thresholds decide what reaches "Needs your decision".
- **Stack:** Next.js 14 App Router, Tailwind, Lucide icons. A single-file HTML export is built with `npm run export:html`.

## Brand Commitments

- **Product name in the UI:** Sales AI. **Maker:** Covasant, with its logo at the base of the sidebar.
- **Visual system:** Option B, recorded in `DESIGN.md`. That file is the binding source for every token and wins over any other guidance. Gaps in it are flagged, not filled ad hoc.
- **Font:** IBM Plex Sans and IBM Plex Mono, as DESIGN.md documents. Correction pass 3 confirmed this; its "Geist" line was superseded by the narrower font correction in the same note.

## Evidence on Hand

- The demo dataset above. No real customer results, testimonials or benchmarks exist; don't fabricate any beyond clearly demo figures.
- Specs in `docs/`, the Leadership build prompt (30 Sep 2026) and correction passes 2–3.
- `docs/Pattern Reconciliation — ASM vs Head of Sales.md` lists where the two homepages currently diverge, and the gaps in DESIGN.md, each with a proposed direction.

## Product Principles

1. **One pattern language across personas.** The ASM and Head of Sales views differ in scope and permissions, not in how a pill, table, tooltip or trace looks. A visual divergence between them is drift to reconcile, unless it encodes a real permission difference.
2. **Outcomes, not asks.** What Sales AI has done reads as done. Only what genuinely needs a human, above a threshold, reads as a question.
3. **Show the reasoning on demand.** Every routed action can explain itself (input, agents, why, outcome), revealed when asked for, never dumped inline.
4. **Light homepage, full record in Logs.** The Head of Sales homepage shows where attention belongs; the chronological detail lives in the Activity Log.
5. **Synthesis before lists.** Summaries are specific and numbers-forward ("214 actions into 50 initiatives…"), not a dump of items.
6. **Learning, not scorekeeping.** Impact metrics read as the system revising its future actions.
