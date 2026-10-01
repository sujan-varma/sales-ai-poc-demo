---
version: 1
slug: "src-components-cortex-leadershiphome-tsx"
primary_target: "src/components/cortex/LeadershipHome.tsx"
related_targets: ["src/components/cortex/ConfigurationPage.tsx"]
---

# Leadership (Head of Sales) homepage

Scope: `/leadership` (LeadershipHome + leadership/*) and its Configuration screen (`/configuration`). Mode: **Operate** (a read-only review cockpit; one actionable section).

Audience & job: Anil Menon, Head of Sales, Gujarat (7 ASMs, 38 territories). One read of the org: what needs him, what Cortex did, what it delivered, where it's weak. Responds to decisions, comments (creates a delegation ticket to the owning ASM), configures. Never creates or edits.

Constraints: section order is pinned by the 30 Sep build prompt. Pitch is excluded (optional deep-dive only). Huddle shows only items raised to leadership. Every rollup is narrative first, numbers on expand. DESIGN.md tokens only, dark and light.

## Direction contract

THESIS: A briefing, not a report. The page reads top-down as "what needs you, what the machine did, what it achieved", in sentences with numbers inside them. It refuses the table of 50 initiatives, and refuses the ASM screen with the labels changed.

OWN-WORLD: Option B unchanged. Near-black panels on hairlines, IBM Plex Sans with Plex Mono figures, primary blue for "do this" and teal only for AI provenance. The KPI stripe language, pill filters, mono uppercase section labels and the Lucide mono agent icons carry over.

STORY: Anil sees his FY-to-date number, answers 4 numbered decisions, watches Cortex route an evening huddle live, reads one paragraph on the month, and drills into tiers, regions and scores only if he wants.

FIRST VIEWPORT: Greeting left with a read-only chip right. A three-cell KPI stripe row (FY cumulative, org-wide open actions, weakest territory org-wide). Decision #1 starts above the fold, its reply buttons in primary blue.

FORM: extension of an established world; no concept roll (precisely specified surface). Signature interaction: the live orchestration pipeline (input → agents → routed → outcome) steps through with the cx-glow ring on the active stage, then lands as the newest trace in the retrospective log. Motion grammar: cx-land stagger on arrival, one authored live run, no scattered hovers.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
