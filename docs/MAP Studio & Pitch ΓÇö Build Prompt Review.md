# MAP Studio and Pitch: build prompt review

*Reviewed 1 October 2026.* This review checks the "MAP Studio & Pitch — Connected Build Prompt" against four sources:

- the six attached screenshots (MAP Studio, the Market Action Plans table and its expanded row, the "New since this plan" banner, the old Pitch studio, and a generated pitch);
- PRODUCT.md and DESIGN.md;
- what is already built: the ASM homepage, Thermometer and the route traces;
- the earlier specs in `docs/`.

**Scope:** ASM (Raman) only. SFA's own screens are out of scope; this build only shows what goes out to SFA and what comes back from it.

**Built 1 Oct 2026** with the defaults for 1.1–1.3 ("go ahead with build"). One change from 1.1: the cut-off is a choice, not a numeric threshold, so it was built under Configuration → Platform settings rather than Decision thresholds. See the Build Log, sections 2.6–2.10.

**Decided (1 Oct 2026):**

| # | Question | Decision |
|---|---|---|
| D1 | Visual language | **Option B restyle.** The screenshots come from an older light-mode app whose source isn't on this machine. Their layout, columns, copy and behaviour carry over exactly, on the Option B shell with DESIGN.md tokens, in dark and light. |
| D2 | Plan unit | **Monthly, combined.** One plan per ASM covering all six Saurashtra territories, filterable by territory. "Q3 FY27" becomes "September 2026" or "October 2026". |
| D3 | Auto-push to Pitch | **Two paths, plus auto-push by priority.** Agent recommendations (homepage, Thermometer) keep auto-routing to Pitch as done chips. Plan initiatives auto-push according to their priority. Initiatives below that cut-off are suggested with an explicit confirm. See 1.1 for the open details. |
| D4 | Process | Review first. The build, the standalone HTML rebuild and the Build Log update follow once this is read. |

---

## 1. Calls still needed

### 1.1 Auto-push by priority: which priorities, and who sets the rule? **Needs a call**

D3 overrides the prompt's "suggest, never auto-push" for part of the plan. Two details are open.

**Proposed:**
- **High** priority initiatives auto-push to Pitch as soon as the plan is agreed. They show as done ("Pushed to Pitch · Ajay T. ✓") with remove and restore, the same done-chip pattern as the homepage.
- **Medium and Low** initiatives are never pushed silently. Pitch lists them as gap suggestions ("High value in your plan, not in any pitch yet. Push to Pitch?"), each with Push and Dismiss.
- **The cut-off lives in Configuration → Decision thresholds** as a new row, "Auto-push plan initiatives to Pitch at: High / High + Medium / Never". The Head of Sales sets it org-wide, the same way as the other thresholds. The ASM sees the current rule as a one-line note in Pitch, with no control.

**Alternative:** the ASM sets the cut-off himself in Pitch. This adds a control to a page that is otherwise read-and-confirm.

### 1.2 The Pitch Actions column: Mark covered now comes from SFA. **Needs a call**

The screenshot gives every talking point "Mark covered" and "Add feedback" buttons. The prompt says coverage is marked in SFA by the Sales Executive and flows back with provenance. Leaving "Mark covered" in the ASM's view would give two sources for one status.

**Proposed:**
- Replace the "Mark covered" button with a **status cell** that reads from SFA: *Not yet covered*, or *Covered ✓*. Hovering *Covered ✓* opens the evidence trail: which SE, at which outlet, when, via SFA, and any note.
- Keep **Add feedback**, renamed **Comment**. Following the MAP pattern, a comment creates a Tracker ticket for the owning SE.
- The header's "Mark as visited · close pitch" also becomes SFA-driven: *Visited 29 Sep, 11:40 · via SFA*.

**Alternative:** keep Mark covered as a manual ASM override, labelled "Marked by Raman". The status then has two origins, and the evidence trail has to say which one applied.

### 1.3 Head of Sales access. **Default: none in this pass**

- RBAC (wireframe) gives Leadership "rollup only" for MAP and "full access" to review Pitch outcomes.
- PRODUCT.md says Pitch is not on his homepage, and the prompt names only the ASM flow.

**Default:** this build is ASM only. On the Head of Sales rail, MAP and Pitch keep showing their "Opens …" toast. A read-only rollup can follow as its own pass.

---

## 2. MAP Studio and the Market Action Plans table: carried forward

The prompt says to carry these forward unchanged. With D1 and D2 applied, that means the following.

### 2.1 Plan state matches the homepage

The ASM homepage says *"October plan not created · Sep month-end lands 1 Oct"*, and it has a **Create Market Action Plan** button.

**Default:**
- **MAP Studio opens on the October draft**, which is the screenshot's "Nothing generated yet" state. The homepage button and the agent rail's MAP icon both land there.
- **The quick prompts produce the plan.** "Generate the October plan" fills the canvas with initiatives through a visible agent run, and the conversation answers the two other chips.
- **September is the locked, live plan.** It is the one with Estimated / Agreed / Delivered figures, pushes to Pitch, and the "New since this plan" banner.

### 2.2 Scope and numbers

| Screenshot | This build |
|---|---|
| One territory per plan; Bhavnagar in Studio, Junagadh in the table | One Saurashtra plan. In Studio the scope selector picks a territory or "All 6"; in the table, Territory joins the existing filters |
| Junagadh · Q3 FY27 · v2 of 2 · Locked | Saurashtra · September 2026 · v2 of 2 · Locked 1 Sep |
| Estimated ₹24.2L · Agreed ₹21.0L · Delivered ₹14.2L (one territory) | Estimated ₹60L · Agreed ₹55L · Delivered ₹38.6L, matching `PLAN_MONTHS` (Sep: estimate 60, achieved 38.6), so the homepage and the plan agree |
| Signals dated 5–8 Oct, after a 30 Sep lock | Signals dated within September, before today (Tue 29 Sep) |
| Weak · 16.7% share (Bhavnagar) | Kept: the Head of Sales "furthest behind" example already uses it |

**Market Action Plans index.** The heading "Every plan by year, quarter and territory" becomes "Every plan by month, with its version history". It is a list of April to October, built from `PLAN_MONTHS`, and October shows as *Draft · not generated*.

### 2.3 Toolbar sheets

Market Size, Market Share, Reach and Influencers have no screenshot of what they open.

**Default:** each opens a side sheet with the matching wireframe §5 table:
- market size and share by Bondex category against Competitor 1–5, with an observation per category;
- reach per distributor (retailer universe, mapped, reach %, still needed);
- the influencer summary by contractor type.

These are demo figures in a new `src/data/map.ts`.

### 2.4 People

The screenshots name people who aren't in this repo: Pooja Rana and Harsh Patel (Territory Executives), and Meena Solanki.

**Default:** use the established Saurashtra roster in `OFFICERS`:

| Name | Territories |
|---|---|
| Ajay Talukar | Junagadh |
| Mehul S. | Bhavnagar, Rajkot |
| Kiran D. | Amreli |
| Neel P. | Jamnagar |
| Vipul M. | Porbandar |

Mehul is the natural example of an SE covering more than one territory, which the multi-select filter (4.2) needs. The distributors in the screenshots (Classic Kali, Anand Sales Corporation, New Vasundhara, Classic Sunitha) are already in the Bondex list and stay.

**Naming:** the prompt and PRODUCT.md say **Sales Executive**; the data and Huddle copy say "Sales Officer". The new screens use *Sales Executive*. The older copy is logged as drift (section 6), not changed in this pass.

---

## 3. The MAP → Pitch push

### 3.1 Where the push lives

**Default:**
- Each initiative row's existing **Actions** menu (screenshot) gains **Push to Pitch · {SE}**, with the SE pre-filled from the row's owner.
- The same menu also offers Send to Tracker and Comment. Its labels come from the one shared route definition (Pattern Reconciliation item 4), so this doesn't create a fourth copy of the wording.

### 3.2 What a push produces

A push creates or updates one **pitch per outlet** in that initiative's scope. For example, "A/B outlets, Junagadh · range selling" pushes into the pitches for those outlets, assigned to Ajay Talukar.

- **The initiative becomes a talking point.** It enters the pitch's talking-point table as a topic, with the plan as its Logic source ("Market Action Plan · September · initiative 3").
- **Pushed to** on the plan row reads *Pitch · Ajay Talukar · 4 outlets* and links to Pitch, filtered to that SE.

### 3.3 Batch create

The use case is "configure once, press Create, and get pitches for everyone in scope".

**Default:**
- Pitch's main page has one **Create pitches** action. It generates every pitch for the pushed initiatives that doesn't exist yet, across all SEs.
- It runs as one visible agent run (the existing `AgentRunChip` pattern), and the result reads "18 pitches created for 5 Sales Executives".
- Language and Tone defaults come from the toolbar settings, as in the screenshot.

---

## 4. Pitch's own view

### 4.1 Primary page: per Sales Executive

This page replaces the old blank-canvas studio as the entry point.

- **Header:** "Pitch", with the auto-push rule as a one-line note (1.1) and **Create pitches** (3.3).
- **Gap suggestions** sit above the table: initiatives that are in the plan but haven't been pushed, each with Push and Dismiss (D3, 1.1).
- **Table, one row per SE:**
  - SE and territories;
  - pitches added;
  - status split: Generated · Sent to SFA · Visited · Covered;
  - talking points still outstanding;
  - the last SFA sync.
- **Expanding an SE** lists their outlets' pitches: outlet, source initiative, status, and a "Needs update" flag when something new has arrived.

### 4.2 Filters

| Filter | Type | Why |
|---|---|---|
| Territory | Multi-select | An SE can cover more than one territory (Mehul: Bhavnagar + Rajkot) |
| Product | Single-select | The four Bondex categories |

The filters persist when you open a pitch and come back.

### 4.3 Pitch detail: the confirmed table

The format is carried over from the Classic Kali screenshot, with the changes in 1.2.

- **Summary row:** Value to date, Target progress, Outstanding and SKUs carried, each with its source link (DMS, Annual plan → *Monthly plan*, ERP ledger, DMS).
- **"What's new since this was generated" banner**, as shown.
- **Talking-points table:** # · Topic · Talking point (with its "Why") · Logic (with an evidence link) · Confidence · **Status (from SFA)** · Comment.
- **Header:** Style (Table) · version history · Export · SFA status · **Edit in canvas**. Edit in canvas opens the secondary studio, scoped to this outlet.
- **"Read-only"** stays, because this view is a record.

### 4.4 Secondary path: ad hoc pitch

The old studio survives, reached from **"+ Ad hoc pitch"** on the Pitch page. It is not the landing state.

- It keeps the screenshot's toolbar (Language · Tone · Talking points · Scope type · who it's for), the conversation panel and the signals panel.
- Its empty state copy changes to explain the role, for example "For a visit the plan didn't anticipate".

---

## 5. SFA and orchestration

### 5.1 Routing out

There is no manual step. Each pitch row shows **Sent to SFA · 29 Sep, 08:12** as soon as it's generated, and the SE status column reads *In Ajay's SFA app*. There is deliberately no "Send to SFA" button.

### 5.2 Status flowing back

When an SE marks a talking point covered or logs a visit in SFA, the pitch updates. Every update carries:
- who (SE);
- where (outlet);
- when;
- the channel ("via SFA");
- any note.

It is shown in the status cell's evidence trail (1.2). The screenshot's "Covered on the visit" visit-feedback card on the MAP row is the same event, seen from the plan.

### 5.3 "How it was decided"

The prompt makes this required in both MAP Studio and Pitch. Every one of these reuses `TraceTooltip` with an `ActionTrace` entry (input → agents evaluated → why → outcome), with no new pattern:

- an initiative in the plan, for example "raised in the Saurashtra daily huddle (HUD-437)";
- an auto-push;
- a confirmed or suggested push;
- a generated pitch;
- each SFA status update.

The trace trigger sits beside the item it explains, the same as on the homepage.

---

## 6. Patterns and drift to watch

- **Tables** follow the Activity Log spec (Pattern Reconciliation item 3). This applies to the plan table, the SE table and the talking-points table.
- **Expandable plan rows** use the accordion pattern from Needs Your Decision. They expand below the row, never replacing the screen.
- **Status pills.** "Escalated to Tracker", "Closed" and "Unassigned" use `STATUS_META_B` only (item 5).
- **Priority pills.** High, Medium and Low have no tokens in DESIGN.md. These are flagged; until values are added, they map onto the existing status tokens (danger / watch / neutral).
- **"Things to consider" and "New since this plan"** reuse the Thermometer and Huddle source colours already in `AGENTS`.
- **Logged as drift, not fixed now:**
  - "Sales Officer" vs "Sales Executive" naming;
  - the homepage's "Push to Pitch engine" vs the plan's "Push to Pitch" (item 4 again).

---

## 7. Pages added to the build

| Hash | App route | Page |
|---|---|---|
| `#map-studio` | `/map/studio` | MAP Studio, October draft |
| `#map-plans` | `/map` | Market Action Plans: monthly index, then the September plan detail |
| `#pitch` | `/pitch` | Pitch: per-SE view, gap suggestions, Create pitches |
| `#pitch-detail` | `/pitch/detail` | One pitch: the confirmed table format |
| `#pitch-adhoc` | `/pitch/adhoc` | Ad hoc pitch studio (secondary) |

**Entry points:**
- the ASM rail's MAP and Pitch icons;
- the homepage's **Create Market Action Plan** button;
- the homepage and Thermometer "Push to Pitch engine ✓" chips, which open Pitch filtered to that SE.
