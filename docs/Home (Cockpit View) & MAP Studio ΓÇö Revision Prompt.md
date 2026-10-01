# Home (Cockpit View) & MAP Studio — Revision Prompt (standalone)

*This replaces the Home section (screen 2) of the main Cortex Wireframe Prompt, and renames one tab in the standalone Territory Plan IA prompt. Everything else in both documents stands unchanged. Written from direct leadership feedback on the first-cut wireframes.*

## The principle this is built on

**Home's job is not navigation — it's to give someone what they need without making them navigate.** Said directly in the feedback call: *“the primary purpose is not navigation, right? Primary purpose is to give me what I need without navigating... if required, if I want to double click, I navigate.”* Navigation is a side effect of something being surfaced, not the point of the page — clicking a needs-attention item takes you to its source because you chose to, not because Home is a menu.

This principle applies differently by role:

- **Leadership** should be able to open Home, get what they need, and leave — most sessions end there. *“I would be happy if I can come here, see this page and go off... the purpose should be met.”*
- **Action-oriented roles** (an ASM generating a plan, a sales officer starting a visit) still get quick-action shortcuts — that's legitimate navigation, because their job is to act, and a shortcut is just turning two clicks into one.

**Declutter, hard:** *“Don't clutter the page. Not too many. Just top 3, 4 maximum tiles to start with.”* This caps what the earlier Home spec had grown into (quick-start cards, module cards, and a needs-attention list, potentially eight-plus items) down to a strict default.

## Bondex context (repeated here so this document stands alone)

- **Company:** Bondex — waterproofing chemicals, four product categories, operating in Gujarat, Rajasthan, Madhya Pradesh.
- **Reference personas:** Raman (Area Sales Manager, Saurashtra) for the action-oriented view; Anil Menon (leadership) for the cockpit view.

## The revised Home — four fixed sections, top to bottom

Not everything on Home is a pinnable widget — **Needs Attention is a fixed, persistent section**, not something a user can unpin, because it's the one place the cross-module story surfaces without anyone having to go looking for it. Four sections, in this order, none of them optional:

**1. Command bar** — match the spacing and shape of the Google Cloud console's Agent Platform search bar exactly: a single pill-shaped input, generous internal padding, a small icon prefix (left) and a send arrow (right), sitting directly under the header as the visually dominant element on the page. Recolour it to Cortex's own light design system (per "Follow the Covasant design system" in the main brief) — match the shape and spacing of the reference, not its dark theme. Placeholder: “Ask Cortex anything, or tell it where to go.”

**Submitting redirects, it doesn't answer in place.** A destination-type input (“open my territory plan for Bhavnagar”) navigates straight there, same as clicking would. Anything conversational — a question, an open-ended ask — redirects to a dedicated **Conversation screen** (see the Assistant section of the main brief) where the exchange continues as a chat thread, the same pattern as Gemini Enterprise's home search bar. Home itself never grows a chat panel; it hands off.

**2. Quick start — three small cards.** Not large tiles — compact, text-forward cards, capped at three, persona-scoped action shortcuts (“Generate my Q3 plan” for an ASM). Small enough that they read as shortcuts, not as the page's main content.

**3. Needs Attention — a table, not a list, and not a widget.** Cross-module by definition: every row shows a signal that originated in one module and traces to what happened (or didn't) as a result elsewhere. Columns: **Issue** · **Raised in** (source module, when) · **Reflected in** (where else it shows up — or an explicit gap if it doesn't) · **Status**. **The Reflected in cell is the clickable one** — clicking it doesn't just jump to a destination screen, it opens the evidence trail itself: the originating item from Raised in (the Huddle excerpt, the Thermometer recommendation) shown alongside what it produced — the specific Pitch talking point, the Tracker ticket, or, for a gap row, the explicit confirmation that nothing downstream reflects it yet, with a control to act on that (e.g. "Add to MAP Studio"). Both ends of the trail are visible together in this one click, not two separate navigations. This section always exists, always in this position, and isn't something a user removes — it's the answer to “am I still going in the direction I set,” not a customisable preference.

*Worked example (Raman's Home):*

| Issue | Raised in | Reflected in | Status |
| --- | --- | --- | --- |
| Junagadh Waterproofing Compound shortfall | Huddle · this morning's review | Thermometer Scorecard (Amber) · already a talking point in 2 of Ajay Talukar's pitches today | On track — visibility only |
| Shree Pavan Marketing de-growth | Thermometer Recommendations · sent to Tracker 2 days ago | **Not yet in this quarter's territory plan** | Needs decision — add to MAP Studio |
| Pricing-scheme objection at a retailer | Visit Pitch feedback · Ajay Talukar, yesterday | Escalated to Action Tracker, awaiting response | Breaching SLA in 4 hours |

The middle row is the important pattern to wireframe explicitly: a row whose “Reflected in” is a **gap**, not a destination — the table's job is to catch drift, not just relay good news.

**4. Widgets — below Needs Attention, genuinely optional and user-controlled.**

- Header: greeting, role and scope (“Good morning, Raman — Gujarat ASM”)
- Command bar (unchanged from the main brief) — “Ask Cortex anything, or tell it where to go”
- **The widget grid — 3–4 tiles by default, no more.** Each tile answers something on its face: a number, a name, a short insight — not a card that just says “Open Thermometer.” Example widget content, pulled straight from the feedback: *“Which region is furthest behind target right now?”* answered with the actual region name and the gap, not a link.

**Two ways a widget gets onto Home:**

1. **Browse and pin.** A “+ Add widget” control opens the widget library as a \*\*side drawer\*\* — slides in from the edge of the screen, page content stays in place behind it — not a bottom sheet and not a modal that covers the page. The drawer lists 10–20 available widgets, each a short preview of what it shows and which module it draws from. Selecting one and confirming pins it to Home; the drawer stays open for adding more, and closes only when dismissed.
2. **Ask and pin.** A conversational question redirects to the Conversation screen and gets answered there — every answer carries a “Pin to Home” (or “Add to favourites”) control next to it, right in the chat thread. Pinning turns that exact question into a live, recurring widget back on Home — not a one-off answer, something that keeps updating. “That itself, maybe I want to create a widget and add to favourite... that sort of ability will be required.”

Both paths land in the same widget grid, and the grid is where the 3–4 cap is enforced — pinning a fifth means removing one, or the gallery/pin flow should prompt for that trade-off rather than silently growing the grid.

## Persona differences — same mechanism, different defaults

- **Leadership's default widgets** lean toward the cockpit view: cross-module status, not links. At least one should carry the “stitching” insight leadership specifically asked for — not just “is this module healthy” but “is execution still tracking the direction we set” (see the worked example in the next section). Text is a fine answer here — *“it could be text also, no problem... that doesn't mean whole page should be typed, but you get my point.”* Where leadership does need to act on something, that's still reachable — through the widget itself, once, when they choose to click, not through a separate navigation-first layer.
- **Action-oriented roles' default widgets** can include a quick-action shortcut (“Generate my territory plan”) alongside their cockpit widgets — legitimate, because generating a plan is their job, and the shortcut collapses what would be two clicks into one.

## Worked example — Anil Menon (leadership)

Anil opens Home. Three widgets, no more:

1. **“Furthest behind target”** — “Bhavnagar, Gujarat — 16.7% share vs. a 25% floor.” No link needed; he has what he came for.
2. **“Direction vs. execution”** (the stitching widget) — a short text read-out: *“Q3 direction: grow Waterproofing Compound share. 22 of 24 territory plans generated against it. 340 pitches this week reflect it. 3 territories drifting — Bhavnagar, Amreli, Tapi.”* This is the module-to-module story leadership explicitly asked to see — built from real cross-links already established (Huddle → Thermometer → Territory Plan → Visit Pitch), summarised as one sentence, not four dashboards.
3. **Needs attention** — the highest-priority open ticket, one line, clickable through to the Tracker.

He reads all three, doesn't click anything, closes the tab. That's a successful session.

## Worked example — Raman (ASM)

Raman's Home keeps a similar cockpit widget or two (e.g. “My territories furthest behind”), plus one quick-action widget: **“Generate my Q3 plan”**, landing him in MAP Studio (below), already scoped. He also has a pinned widget from an earlier ask-and-pin: “Retailer reach, Junagadh”, which he pinned last month after asking the command bar the same question twice.

## Rename — MAP tab becomes MAP Studio

In the standalone Territory Plan (MAP.AI) IA prompt, rename the third tab from **MAP** to **MAP Studio** — everywhere it's referenced (the tab itself, the sidebar sub-menu list in the main brief's Navigation section, the worked flow, the leadership “review mode” description). The name should read as a workspace — where a plan actually gets built, conversationally — distinct from “Territory Plan,” which is the module as a whole. Overview and Territory Plans keep their names and behaviour exactly as already specified; only this one tab's name changes.

## What changes from the earlier plan

- Home's three separate sections (quick-start cards / module cards / needs-attention) become one capped widget grid (3–4 by default)
- New: a widget gallery (“+ Add widget”, browse and pin)
- New: every command-bar answer gets a “Pin to Home” control
- New: a leadership-specific “direction vs. execution” widget, text-based, summarising the cross-module story explicitly
- Rename: MAP → **MAP Studio** in the Territory Plan tab structure
- **Open item, not a design change:** whether Cortex's visual look and feel needs to reconcile with a separate design BCG showed — flagged in the call, not resolved; raise with Raghu before the next review rather than guessing at it here.
