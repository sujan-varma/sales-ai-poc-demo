# Route Tab & Draggable Home Widgets (standalone)

*Two corrections: merges the Today's Route & Calendar prompt's two screens into one — Route — and replaces the Home revision prompt's widget-sizing model. Everything else in both stands.*

## Bondex context

- Reference persona: Ajay Talukar, sales officer under Raman, Saurashtra.

## One tab: Route

Today's Route and Calendar merge into a single tab, **Route**. A date switcher at the top defaults to today; picking another date shows that date's planned outlets in the same list — one screen, not two destinations for what's really one underlying question ("what's my route, and when"). Everything else about the list is unchanged: outlet, type, class, scheduled time, and a Ready/Generate status per row.

## Route on Home — inline, and a widget, at once

For a sales officer, Route doesn't wait behind a click. It's shown directly on Home as an inline table — today's first 3–4 outlets, Ready/Generate status visible — with a "View full route" link only for going past what's shown or picking another date. **Zero clicks to see today's route.**

It's also, technically, one of Home's widgets — living in the same draggable grid as everything else (below), so it can be resized larger to show more rows, or repositioned. The difference from an ordinary widget: it's **default-present and not removable** for a sales officer, the same way Needs Attention is fixed for everyone — it can be resized and moved, never unpinned.

**Remove the old "See Today's Route" quick-start card.** It's redundant now — the whole point was reducing clicks to see the route, and a card that still required a click to see it worked against that. The route is just there.

## Widgets — free-form drag to resize and reposition

The widget grid (Home's fourth section) becomes a real dashboard-builder surface, not fixed small/medium tiles:

- **Drag a corner or edge** to resize a widget — continuous, not stepped; it can go as large as most of the grid or as small as a compact tile
- **Drag the body** to reposition — other widgets reflow around it, snapping to an underlying grid so nothing overlaps, the same interaction model as a standard dashboard builder (e.g. a masonry grid with drag-and-resize handles)
- **Layout persists per user** — whatever size and position someone leaves their widgets in is what they see next time; this is personal customisation, not a shared layout

**What stays fixed, not draggable:** the command bar, the three quick-start cards, and the Needs Attention table — these keep their position and size exactly as already specified. Only the widget grid itself is the free-form canvas; the accountability and navigation anchors above it don't move.

## Worked example — Ajay's Home

Ajay opens Home. Route sits inline near the top, showing four outlets — he drags its corner to expand it to six, since that's his full day. Below it, he's resized his "Pitches ready" KPI tile smaller and dragged a pinned Thermometer widget up next to Route, so his two most-used things sit side by side. Next time he opens Home, it's exactly as he left it.
