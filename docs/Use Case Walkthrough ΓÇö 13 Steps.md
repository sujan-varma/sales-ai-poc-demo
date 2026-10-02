# Use case walkthrough: 13 steps, end to end

*Verified 1 October 2026 against the build in `dist/Sales AI - Option B.html`.* Each step names the screen and control it maps to, what it hands on to the next step, and how it was checked.

**Persona:** Raman, ASM, Saurashtra (six territories), unless a step says otherwise. Sales Executives (Ajay T., Mehul S., Kiran D., Neel P., Vipul M.) have no Sales AI screen; SFA is their interface.

**Status key:**
- **Verified:** works end to end in the build.
- **Built this pass:** new in the Action Tracker pass.
- **Deviation:** differs from the prompt, by a decision the user confirmed.

---

## The two threads used as evidence

| Thread | Path |
|---|---|
| **A · Classic Kali** (steps 3–5, 8–10) | Huddle HUD-437 → September plan #1 → its action step "Delegate to Ajay T." → TKT-2340 (Owner Raman → Ajay T.) → Pitch talking point "Open issues" → covered in SFA on 29 Sep → ticket closed |
| **B · Amreli Repair Polymer** (step 11) | Insight "September will close near 68%… Amreli's Repair Polymer is 70% of the gap" → September plan #10 → TKT-2342, delegated to Kiran D. → Kiran marks it done in SFA → Raman verifies in the Tracker → plan #10 and the insight close |

---

## Steps 1–6

### 1. The month opens; nothing exists yet. **Verified**

- **Home:** the MAP card reads "October · Not created · Sep month-end lands 1 Oct". Next to the hero CTA it says "October not created".
- **Market Action Plans** (`#map-plans`): the October row reads "Draft · not generated".
- The two agree.

### 2. Create Market Action Plan: one combined plan, initiatives tagged by territory. **Verified**

1. **Home → Create Market Action Plan** opens MAP Studio (`#map-studio`), scoped to "All 6 territories".
2. **Generate the October plan** fills the canvas with 8 initiatives. Each is tagged with its territory (Bhavnagar, Junagadh, Amreli, Rajkot, Jamnagar, Porbandar) and has a "How it was decided" trace.
3. **Agree October plan** locks v1.

**Fixed in this pass:** once agreed, the October row in Market Action Plans reads "Agreed · starts 1 Oct", with 8 initiatives and the estimate. Reopening MAP Studio shows the agreed plan. Before this fix the index still said "not generated".

### 3. Huddle runs daily and raises a new item. **Verified**

- Home → **Since this morning** lists the Huddle findings: "Credit terms pressure", "Beat disruption", the unverified competitor price, and "Stock-out risk".
- Home → **Insights** synthesises them, with the source agent and time on each.
- Huddle items also arrive in Action Tracker → Needs an Owner (for example TKT-2345, "Verify the Porbandar competitor pricing claim", from the 09:05 huddle).

### 4. Open the item, see the evidence, add it to the plan. **Verified**

- Each insight's **View more** and **confidence score** show the sources.
- The Amreli insight carries **Push to Market Action Plan ✓**, with its "How it was decided" trace.

**Fixed in this pass:** the result chip's link ("Added to the October plan draft") now opens MAP Studio, where the draft is. It used to open the plan list.

### 5. Adding it auto-generates action steps and names the responsible Sales Executive. **Verified, connected this pass**

This is thread A.

1. **Plan row:** Market Action Plans → September → **#1 Classic Kali Enterprises**, expanded, lists its action steps: "Delegate to Ajay T. with a comment; the comment becomes his Tracker ticket", then "Settle the credit note…", then "Close this row…".
2. **Ticket link:** the row's **Pushed to** names **TKT-2340**. **Connected this pass:** the ticket id, and the row's Actions → "Open TKT-2340 in Tracker", open the ticket in the Action Tracker.
3. **Drawer (Tracker, TKT-2340):**
   - Owner: Raman → Ajay T. (Delegated to).
   - Provenance: "Huddle · Saurashtra daily huddle 26 Sep, via the September plan" · Insight id HUD-437 · Evidence: call transcript 00:12:05.
   - Activity: raised → took ownership → delegated → marked done in SFA → verified and closed.

### 6. Configure Pitch; one press batch-generates for every distributor and retailer in scope. **Verified**

- **Pitch** (`#pitch`): High-priority plan initiatives arrive by the priority rule ("Auto-push · High priority", set in Configuration).
- **Create pitches · 4** generates every queued pitch (the Jamnagar dealers and Patel Hardware, Amreli) in one run. Each lands in its Sales Executive's row.
- Medium and Low initiatives wait under **Suggested for Pitch**, with Push and Dismiss.

---

## Steps 7–13

### 7. Thermometer recommendations, accepted individually, push to territory and SO. **Deviation (confirmed)**

The prompt says nothing pushes automatically. The user's decision D3 (1 Oct) keeps agent recommendations **auto-routed**: on Home and Thermometer → Recommendations they show as done chips ("Send to Tracker ✓", "Push to Pitch engine ✓"), each with **remove** and **restore**. Raman can still take back any single route, so individual control is preserved; what differs is the default. Plan initiatives follow the priority rule from step 6.

### 8. Appears in the Sales Executive's existing field app. **Verified (integration only)**

- Every generated pitch reads **In SFA**, with "In Ajay's SFA app since …" on its detail page.
- The trace says it was routed automatically. There is deliberately no "Send to SFA" button.
- Tracker tickets delegated to a Sales Executive are accepted "in SFA" (see the TKT-2288 activity).

### 9. The pitch is already generated, waiting at the visit. **Verified**

- Pitch detail for Classic Kali Enterprises: generated 26 Sep, 17:11, from plan #1 (auto-pushed, High). The visit on 29 Sep, 11:40 shows **Visited · via SFA**.

### 10. Most fields auto-update; only non-capturable items need explicit confirmation. **Verified**

- In the talking-points table, the **Status · from SFA** column reads "Covered · Ajay T. · 29 Sep, 11:40 · via SFA", with an **Evidence** trace (who, outlet, when, channel).
- Points not covered say so ("Not covered · Skipped on the 29 Sep visit").
- Nobody marks coverage in this portal.

### 11. Closing the loop upward. **Built this pass**

This is thread B. Open Action Tracker → **TKT-2342** (Awaiting Verification), or use `?ticket=TKT-2342#tracker`.

1. **The SE's done is waiting.** The drawer shows "Marked done in SFA by Kiran D. · 29 Sep, 16:20 · 11 of 12 dealers reordered on the post-scheme slab". It also states what verifying will do: "Closes plan #10 at ₹11.2 L delivered (now ₹8.9 L of ₹12.0 L agreed)".
2. **Raman presses Verify and close.** The MAP agent closes TKT-2342, updates plan #10's Delivered, and closes the originating insight. The result appears in the drawer: "September Delivered ₹38.6 L → ₹40.9 L (74%) · insight closed", with **View plan** and **View on Home** links.
3. **Plan.** Market Action Plans → September: #10 reads Closed and delivers ₹11.2 L. The summary reads Delivered ₹40.9 L · 74% of agreed, Closed 3 of 10 (Classic Kali #1 was already closed by its verified ticket TKT-2340).
4. **Home.**
   - The Amreli insight's action reads "Closed · 11 of 12 dealers reordered on the post-scheme slab · TKT-2342".
   - The September figures in the plan KPI and the MAP card read ₹40.9 L.
   - Raman re-enters nothing.
5. **Within the session**, the close holds across pages (session state). Choosing **Closed / Verified** in the Status menu runs the same close. **Send back** returns the ticket to In Progress.

### 12. Leadership sees the roll-up, read-only. **Verified, with a roll-up board built this pass**

- **Head of Sales homepage:** decisions, the orchestration story, the Priority Log and Territory Health, as built across the earlier passes.
- **Action Tracker for the Sales Head** (`#tracker-head`, the top-nav Action Tracker tab):
  - A strip with one cell per ASM (open · breaching · to verify), and a board filterable by ASM.
  - Tickets show the ASM as owner. Sales Executive names are folded away: they don't appear in titles, descriptions, watchers or activity.
  - The drawer is read-only. A comment creates a delegation ticket that the ASM owns.

### 13. Impact scoring by region and type. **Parked**

Action Impact stays as built, pending a decision (Build Log, open items).

---

## Scoping rules (Action Tracker)

| Persona | What they see | Where |
|---|---|---|
| ASM (Raman) | **My Actions** (what he owns, including what he delegated, plus unowned items in his region) and **Team** (what his Sales Executives own directly) | `#tracker` |
| Sales Executive | No tracker. Tickets reach them in SFA. | — |
| Sales Head (Anil Menon) | Every ASM's tickets at ASM level; one level above the ASM's own view, read-only | `#tracker-head` |

---

## What changed from the reference Action Tracker

These are visual-alignment changes only. The board columns, filters and drawer sections are kept.

- **Look.** Rebuilt in Option B tokens, dark and light.
- **Awaiting Verification** uses a hollow blue ring instead of a purple dot. DESIGN.md has no token for that purple.
- **Period.** "Q3 · Aug–Oct 2026" becomes "September 2026", because plans are monthly (D2).
- **Territory** moved from the Scope tabs to a filter, since the prompt names only My Actions and Team as scopes.
- **"Rakesh Verma, Territory Executive"** stays as a watcher on TKT-2340, as in the reference. Elsewhere the Saurashtra roster is used.
- **Product name.** "AquaSeal 2K" isn't a Bondex category; it became IWC 20 kg.
