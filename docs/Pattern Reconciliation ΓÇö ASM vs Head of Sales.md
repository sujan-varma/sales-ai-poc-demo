# Pattern Reconciliation — ASM vs Head of Sales

*Recorded at `/impeccable init`, 1 October 2026. Nothing here has been changed in code. Each item names both patterns, where they live, and a proposed direction for you to confirm. DESIGN.md is untouched: its gaps are listed at the end, without proposed values.*

**Rule of thumb (PRODUCT.md principle 1):** the two views may differ in scope and permissions, never in how the same kind of thing looks. Two deliberate exceptions are marked below; everything else is drift.

---

## A. Pattern divergences

### 1. Reasoning views: how an action explains itself

| | Pattern | Where |
|---|---|---|
| ASM suggested actions | **Hover tooltip with a dimmed backdrop** ("How it was decided") | `actionTrace.tsx` → `TraceTooltip`, used by `SuggestedOutcome` |
| Head of Sales Activity Log | Same tooltip, icon-only trigger per row | `leadership/activity.tsx` |
| Head of Sales "Needs your decision" | **Inline**: clicking Suggested expands the row and plays the trace inside it | `leadership/decisions.tsx` |
| Confidence score (both views) | **Third style**: an anchored popover with no dim, tinted `--ai-card` | `ai.tsx` → `ConfidencePopover` |

**Proposed:** use one treatment for any "why / how was this decided" explanation, the dimmed tooltip, which the latest feedback (pass 3) chose. Then:
- **Decisions** move their trace to the tooltip.
- **Confidence "Why this score"** adopts the same surface and dim.
- **Small factual hovers** (KPI stripes, Territory Health cells) stay plain tooltips; they're labels, not reasoning.

**Confirm first:** pass 3 said "Needs your decision is confirmed fine", so the decisions change needs your go-ahead.

### 2. Confidence-pill placement

- **ASM:** every AI item shows its pill in its own row (insights, findings, Thermometer rows, Tracker suggestions).
- **Head of Sales:**
  - Decisions show the pill only after a row is expanded.
  - Priority Log items, Activity Log entries and the September summary carry the "AI inferred" tag but no score.
  - Insights and Action Impact do show it.

**Proposed:**
- Collapsed decision rows show the pill beside Suggested.
- Where items aren't scored one by one (Priority Log, September summary, Activity Log), use the card-level tag + score pair (`AiMeta`). The ASM Thermometer box already does this with a set-level confidence.

### 3. Table formatting

| Table | Layout | Row padding | Notes |
|---|---|---|---|
| ASM Thermometer recommendations | auto layout, `min-w-[1120px]` | `py-4` | actions revealed on hover |
| HoS Activity Log | `table-fixed` + `<colgroup>` | `py-3` | day group rows `bg-cx-raised/50` |
| HoS Action Impact | auto layout, `min-w-[920px]` | `py-3.5` | |
| HoS Thermometer Scorecard | auto layout, compact variant | `py-3` | |
| HoS Needs your decision | **CSS grid, not a `<table>`**; header row is a `div` | `py-3` | accordion |
| HoS Priority Log (home and full) | grid list | `py-2.5` / `py-3` | |

**Proposed:** one table spec, the Activity Log's, applied to every tabular view on both pages:
- `table-fixed` with a `<colgroup>`;
- 11px faint headers;
- `py-3` rows, `pl-5` on the first column and `pr-5` on the last;
- one group-header style.

Decisions can stay an accordion grid, but should take the same header styling and paddings, with a `role="table"` or a true `<table>` so it reads as one to assistive tech.

### 4. Route / destination vocabulary, defined three times

| Definition | Labels | File |
|---|---|---|
| `ROUTE_META` | "Send to Tracker" / "In Tracker", "Escalate to Market Action Plan" / "In October plan (suggested)", "Send to Pitch · …" / "Prioritised for …" | `OptionCHome.tsx` |
| `DEST_META` | "Tracker", "Plan", "Pitch", "Initiatives" | `leadership/activity.tsx` |
| `ROUTES` + `ROUTE_DONE_LABEL` | "Send to Tracker", "Escalate to Market Action Plan", "Push to Pitch engine" | `leadership/decisions.tsx`, `data/actionTraces.ts` |

The colours and icons agree; the wording doesn't ("Plan" vs "Market Action Plan", "Send to Pitch" vs "Push to Pitch engine").

**Proposed:** one shared module holding colour, icon and three label forms per destination: action, done and short.

### 5. Status vocabulary and colours

Three palettes exist:

| Palette | "Unassigned" | "Delayed" | "In progress" |
|---|---|---|---|
| `STATUS_META` (`data/cortexHome.ts`) | "Unassigned" `#52525b` | `#c28a12` | grey `#a1a1aa` |
| Console (`statusPalette.tsx`) | "Unassigned" `#6b6b74` | — | — |
| Option B `STATUS_META_B` | **"No owner"** `#7c7f89` | `#e0b43a` | **blue** `#4f86f7` |

Badges on both pages read Option B through context. But several Option B components still import the raw `STATUS_META` for colours:
- the ASM "Agreed" chip;
- `ROUTE_META`'s Tracker colour;
- `DEST_META`;
- the Head of Sales route colours.

**Proposed:** Option B files use `STATUS_META_B` only. Retire direct `STATUS_META` imports outside Option A.

### 6. Suggested-action wording

- **ASM:**
  - Insights, Thermometer and Since this morning use outcome wording ("Push to Pitch engine ✓").
  - Action Tracker's "Suggested by Sales AI" tab still uses an ask ("Assign & Add to Tracker").
- **Head of Sales:** decisions use "Suggested: …" as an open ask. **Deliberate:** these sit above his threshold.

**Proposed:** decide whether Tracker suggestions are also "done", which would mean auto-assigned to a suggested owner. Keep the Head of Sales decision asks as they are.

### 7. "Agent at work" treatments

- **`cx-glow` ring:** used on the Head of Sales Live indicator, the live timeline entry and active trace steps.
- **`AgentRunChip`:** a small spinner chip, used on the ASM after a click (routing, assigning) and on Head of Sales comments and assignments.

DESIGN.md names `cx-glow` as *the* agent-at-work pattern and doesn't mention the chip.

**Proposed:** keep both, with a written split, and add that split to DESIGN.md:
- `cx-glow` when an item itself is being worked;
- `AgentRunChip` for the inline result of a user's own click.

### 8. Section headers

Two header shapes are in use on both pages:
- **`CardHeader`:** icon tile + title, with the subtitle below the row.
- **Thermometer header:** `AgentIcon` + `h2` with the subtitle indented under the title (ASM `ThermoBox`, HoS Scorecard).

**Proposed:** use `CardHeader` everywhere, and show an agent icon in the tile when a card belongs to one agent.

### 9. Popover and menu surfaces

| Surface | Background | Border |
|---|---|---|
| Dropdowns and menus | `bg-cx-raised` | `border-cx-strong` |
| Trace tooltip | `bg-cx-bg` | `border-cx-strong` |
| Confidence popover | `--ai-card` / `--ai-teal-card` | tinted |
| Territory Health cell tooltip | `bg-cx-raised` | no dim |

**Proposed:** follow item 1. Menus and plain tooltips use `cx-raised`. "Why" explanations use one surface and the dim; pick `cx-raised` or the AI-tinted card for it.

### 10. Insights card: one design, two implementations

The Head of Sales Insights card copies the ASM card's layout in a separate component (`leadership/asmContent.tsx` → `LeadershipInsights`).

- **Deliberate difference:** its actions are "Assign to an ASM" plus Comment, instead of the Actions menu plus suggested outcome.
- **Drift risk:** any future change to the ASM card won't reach it.

**Proposed:** extract the shared card shell; pass the actions slot per persona.

---

## B. DESIGN.md gaps (flagged; no values proposed)

These are values or patterns in the shipped build that DESIGN.md doesn't record.

1. **Primary blue is not a token.** `#2f6fed` is hard-coded 52 times and `#4f86f7` 24 times across the two pages, as DESIGN.md itself notes.
2. **Territory Health levels.** "At risk" `#8c3a40` and "Stable" `#2d6a45` aren't in the semantic status table. "Watch" uses `--hl-watch`, which is recorded.
3. **Status greys.** "No owner" `#7c7f89` (Option B), `#52525b` and `#6b6b74` are unlisted. In-progress grey `#a1a1aa` is hard-coded rather than read from `--st-progress`.
4. **Agent colours.** Huddle `#4f96ef`, Thermometer `#e85a70`, Market Action Plan `#9a7cf0` and Pitch `#7ca324` live in the data file. Agent icons render mono in Option B, but Pitch green `#7ca324` is used as the Pitch destination colour on both pages.
5. **`cx-glow` internals.**
   - The ring gradient's `#3d7bf5` and `#5eead4` are hard-coded; the latter equals `--ai`.
   - The dark `--cx-glow-fill` (`#151a1d`) is missing from the dark colour table; only its light value is listed.
6. **Scrollbar thumb.** `#303036` applies in both themes, so light mode gets a dark thumb.
7. **Radius.** Plain `rounded` (4px) is used about 24 times: status badges, the AI-inferred tag, small chips. It isn't in the radius scale.
8. **Motion beyond the keyframe list.** In use but unrecorded:
   - Tailwind's `animate-spin`, `animate-pulse` and `animate-ping` (live dots, spinners);
   - the Processed-so-far rule draw-in: a 700ms transform with `cubic-bezier(0.22,1,0.36,1)`;
   - the count-up tween: exponential ease-out, 900ms;
   - the trace step timing (650ms per step) and the live entry's 1.6s steps.
9. **Overlays and elevation.**
   - Scrims at `bg-black/40`, `/50` and `/70` are not tokens.
   - Shadows (`shadow-2xl`, `0 16px 48px …`) have no elevation section, though `tailwind.config.ts` defines `card` / `elevated` / `drawer` shadows that Option B doesn't use.
10. **Instrument Serif** is still listed as reserved for editorial moments. After pass 3 it isn't used anywhere in Option B. Confirm it's still wanted, or retire it.
11. **Font direction.** Correction pass 3 said both "keep IBM Plex Sans" and "Geist as the sole font". PRODUCT.md records Plex, per the narrower correction. If Geist is intended, DESIGN.md needs that decision first.
12. **Patterns with no DESIGN.md entry:**
    - the trace tooltip with its dimmed backdrop;
    - the done-state outcome chip ("… ✓");
    - the accordion table;
    - the top-bar date filter;
    - the Live indicator.

    Each is now used on more than one screen or meant to be.

---

## C. Not drift (deliberate, keep)

- **Head of Sales is read-only.** Comments become delegation tickets, insights are assigned only to ASMs, and there is no create or edit.
- **Decisions stay asks** on the Head of Sales view, because they sit above his threshold.
- **Territory Health carries no AI tag**, on both pages, because it's rule-based.
