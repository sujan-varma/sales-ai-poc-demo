# Option A — archived

Historical reference only. Option B (`/asm`) is the single build target; nothing
here is routed, type-checked (`archive/` is excluded in `tsconfig.json`) or bundled.

| File | Was |
|---|---|
| `components/OptionAHome.tsx` | `src/components/cortex/OptionAHome.tsx` — the Option A page (imports rewritten to `@/components/cortex/*`) |
| `components/LayoutSwitcher.tsx` | `src/components/cortex/LayoutSwitcher.tsx` — the A/B review toggle |
| `app-route-home-a/page.tsx` | `src/app/(cortex)/home-a/page.tsx` — the `/home-a` route |
| `standalone/main.tsx` | `src/standalone/main.tsx` — the A&B single-file export entry |
| `option-a.css` | the `.cx-a` theme blocks from `src/app/globals.css` |
| `dist/Sales AI - Option A&B.html` | the last A&B single-file build |

To view it again, move the route and component back and restore `option-a.css`
into `globals.css`. The Geist fonts were loaded in `src/app/(cortex)/layout.tsx`
and the `geist` package is still installed.
