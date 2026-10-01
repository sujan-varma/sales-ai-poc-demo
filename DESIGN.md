# Cortex / Sales AI — Design System

*Extracted directly from the compiled Option B build (`Sales AI - Option B.html`). These are the actual tokens in production, not a fresh proposal — treat this file as the source of truth for every new page in this flow, in both dark and light mode.*

## Naming convention

Two theme families exist in the codebase, selected by a class on the root element:

- `.cx-b` — **Option B**, the primary/canonical experience. No suffix needed in code beyond this class; it's also the default `:root` token set.
- `.cx-a` — **Option A** (kept for reference only; Option B is now the single build target going forward).

Each family carries a `[data-theme=light]` variant. Dark is the default for both; light is opt-in via the `data-theme` attribute.

## Colour tokens — Option B (`.cx-b`), dark (default)

All values are space-separated RGB triples (for use with `rgb(var(--token) / <alpha>)`), except the hex-coded ones noted.

| Token | Value | Use |
|---|---|---|
| `--cx-bg` | `9 9 11` | Page background |
| `--cx-panel` | `17 17 19` | Card / panel background |
| `--cx-raised` | `24 24 27` | Elevated surface (dropdowns, popovers) |
| `--cx-hover` | `30 30 34` | Hover state background |
| `--cx-line` | `35 35 39` | Default border / divider |
| `--cx-strong` | `48 48 54` | Emphasised border |
| `--cx-text` | `237 237 239` | Primary text |
| `--cx-muted` | `161 161 170` | Secondary text |
| `--cx-faint` | `113 113 122` | Tertiary / placeholder text |
| `--st-progress` | `161 161 170` | Progress-bar track |
| `--hl-watch` | `58 58 65` | Highlight/watch state background |
| `--ai` | `94 234 212` | **AI accent (teal/mint)** — "AI Inferred" tags, sparkle icons, insight glow. *Not* the primary action colour. |
| `--ai-card` | `12 18 34` | Background for AI-tinted cards |
| `--ai-teal-card` | `13 20 19` | Background for teal-tinted AI cards |
| `--ai-ink` | `#8fb3ff` | AI-accent text on dark |

## Colour tokens — Option B, light (`[data-theme=light]`)

| Token | Value |
|---|---|
| `--cx-bg` | `246 247 249` |
| `--cx-panel` | `255 255 255` |
| `--cx-raised` | `241 242 245` |
| `--cx-hover` | `234 236 240` |
| `--cx-line` | `226 228 233` |
| `--cx-strong` | `204 208 216` |
| `--cx-text` | `17 18 22` |
| `--cx-muted` | `78 83 94` |
| `--cx-faint` | `118 123 135` |
| `--hl-watch` | `213 216 223` |
| `--ai` | `13 128 116` (teal darkens for contrast on light) |
| `--ai-teal-card` | `236 248 246` |
| `--ai-card` | `236 242 255` |
| `--ai-ink` | `#2456c9` |
| `--cx-glow-fill` | `#ffffff` — *added for Leadership:* the inner fill of the `cx-glow` ring. Dark keeps `#151a1d`; without a light value the ring showed a near-black centre in light mode. |

## Primary brand colour — Covasant blue

Used for every primary action, active state, and focus ring — **distinct from the `--ai` teal token above**. Not currently a CSS custom property; hard-coded as:

- **`#2f6fed`** — primary blue (buttons, active nav state, primary CTA, focus rings, confidence pills)
- **`#4f86f7`** — hover/lighter variant of the above
- **`#2456c9`** — darker variant, used as `--ai-ink` in light mode

**Rule going forward: confidence pills and any "this is the main action" element use `#2f6fed`, never the `--ai` teal.** The two accent colours mean different things — teal marks *AI-generated*, blue marks *do this*.

## Semantic status colours

| Status | Colour |
|---|---|
| Completed / Healthy | `#2fa85c` (green) |
| Critical / Delayed (strong) | `#d64550` |
| Critical / Delayed (alt) | `#e85a70` |
| Warning / Attention (strong) | `#c28a12` |
| Warning / Attention (alt) | `#e0b43a` |

## Typography

Two font families, switched by theme class:

- **Option B default:** `--font-plex-sans: "IBM Plex Sans"` (body), `--font-plex-mono: "IBM Plex Mono"` (data/numeric — always paired with `tabular-nums`), `--font-serif: "Instrument Serif"` (reserved for editorial/display moments).
- **Option A:** swaps to `--font-geist-sans: "Geist"` and `--font-geist-mono: "Geist Mono"` in place of the Plex pair. *(Reference only — not used going forward, Option B is the build target.)*

**Type scale in active use** (do not introduce sizes outside this set without reason): `9px · 9.5px · 10px · 10.5px · 11px · 11.5px · 12px · 12.5px · 13px · 13.5px · 14px · 15px · 16px · 20px · 22px · 26px · 28px · 36px · 40px · 42px`. This is a deliberately fine-grained scale — half-pixel steps are intentional, not a rounding artifact.

Weights: `400` (normal), `500` (medium), `600` (semibold) — no bold (700) in use.

## Corner radius

Not a single flat value — a small scale, used contextually:

| Token | Value | Use |
|---|---|---|
| `rounded-[1px]` / `[2px]` / `[3px]` | 1–3px | Tiny elements (status dots, stripe bars) |
| `rounded-sm` | 2px | Small chips |
| `rounded-md` | 6px | Standard controls, inputs |
| `rounded-lg` | 8px | Cards, panels |
| `rounded-full` | pill | Badges, pills, avatars, tabs |

## Motion

Custom keyframes already defined and in use — reuse these rather than inventing new ones:

- `cx-land` — element rises + fades in (used for hero/page-load moments)
- `cx-fade` — plain opacity fade
- `cx-rail` — slides in from the left (sidebar/rail items)
- `cx-stripe` — scales up from the bottom (bar-chart stripes filling in)
- `cx-stagger` — applies `cx-land` to children with incrementing delay (0.14s → 0.7s, capped at 8 children) — use for any list/grid that should animate in sequentially
- `cx-glow` — the animated conic-gradient "agent at work" ring (blue → teal → transparent, 3.6s rotation) — this is the visual implementation of the "agent at work" pattern already specced elsewhere
- `cx-flash` — a brief highlight pulse on an element (1.6s), for drawing attention to something just updated
- `cx-slide-in` — drawer/panel entrance (translateX, 0.28s)

*Leadership additions (no new keyframes):* the live orchestration run reuses `cx-glow` on the active stage and fills its connectors with a plain CSS transform transition. The Configuration threshold slider is `.cx-range`, a transparent native range input whose thumb uses `--cx-text` / `--cx-panel` / `--cx-strong` and a primary-blue focus ring.

All animations respect `prefers-reduced-motion: reduce` and fall back to a static state — preserve this.

## Icon library

**Lucide** (confirmed from the build, via the `lucide` import) — not raw Untitled UI SVGs. Untitled UI is the Figma reference for component *patterns*; Lucide is the actual icon set wired into the code. Use Lucide for every new icon; don't mix in a second icon set.

## Layout primitives confirmed in use

- Two-column content grids at `minmax(0,1fr) minmax(0,2fr)` and similar ratios (see `lg:grid-cols-[...]`, `xl:grid-cols-[...]` in the build) for the Action-Tracker/Territory-Health and Insights/Action-Tracker row pairings already specced.
- A slide-in side panel/drawer pattern (`cx-slide-in`), used for the AI Assistant drawer and the Insights "View all" drawer.
- `divide-y` / `divide-cx-line` for list rows with hairline dividers (Since This Morning, action lists) rather than individual card borders per row.

## Build workflow — Impeccable skill

Every UI build in this flow runs through the **Impeccable** skill ([pbakaus/impeccable](https://github.com/pbakaus/impeccable), skill v4.4.0 / engine 0.1.8), installed project-local at `.claude/skills/impeccable/` with its helper agents in `.claude/agents/impeccable-*.md`.

- **Before building:** run the skill's setup (`.claude/skills/impeccable/scripts/impeccable context --target <file>`), which loads this file and `PRODUCT.md`. New pages (e.g. Leadership) are *extensions* of the Option B world, not redesigns — use Impeccable's Operate mode (dashboards) and its new-work flow in "preserve and extend" mode.
- **Before shipping:** run `/impeccable audit` and `/impeccable polish` on the changed page, in both dark and light.
- **This file wins.** Where Impeccable's guidance conflicts with a token, rule or pattern here (e.g. its craft floor bans uppercase eyebrow labels, which Option B uses deliberately for section labels), follow this file. Impeccable must not rewrite or replace this DESIGN.md (`/impeccable document` / `extract` output goes to a separate draft for review, never over this file). New tokens still go through "How to use this file" below.
- **To update the skill:** re-copy `.claude/` from a fresh clone of the repo (or `npx impeccable update`). The detector hooks (auto-check after every edit) are not enabled; turn them on with `/impeccable hooks on` if wanted.

## How to use this file

Every new page in this flow inherits these tokens exactly — don't introduce new colours, font sizes, radii, or animations outside what's listed here. If a new component genuinely needs something not covered, extend this file explicitly (add a new token with a comment explaining why) rather than hard-coding a one-off value. Both dark and light mode must be implemented for every new page using the token pairs above, not dark-only with light deferred.
