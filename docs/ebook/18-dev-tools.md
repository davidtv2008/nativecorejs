# Chapter 18 — Dev Tools

Localhost-only tooling injected for development.

## What ships

During `npm run dev`, inject scripts add roughly:

- `/.nativecore/hmr.js` — hot reload client
- `/dist/.nativecore/denc-tools.js` — DEV MODE pill / overlay controls

Source lives under template `.nativecore/dev/` (`denc-tools`, `devOverlay`,
component overlay/editor helpers). Production builds strip / omit these.

## DEV MODE overlay

Toggle the **DEV MODE** control in the corner. The overlay surfaces route and
performance-oriented metrics (expand rows for detail). Some rows link to
open-in-editor via `/__open-in-editor?file=…` when the dev server supports it.

Also useful:

- Component outline / highlight helpers (component overlay)
- Router cache debug (`getCacheSnapshot` / `getRouteDebugInfo`) when exploring the Cache tab

Exact labels evolve — treat the overlay UI as the source of truth while running.

## Component Builder (disabled)

In shipped `denc-tools.ts`:

```js
const COMPONENT_BUILDER_ENABLED = false;
```

Files remain in the tree; the Build UI is not shown. Flip the flag only if you
intentionally restore the experimental builder.

## HMR notes

- Keep `npm run dev` running so compile + watch stay alive
- On Windows, orphaned `esbuild` / `watch-compile` processes can lock folders —
  stop them before deleting a project directory

## Apply to Deskflow

> **Feature:** Profile `/tasks` once with the overlay open.

1. `npm run dev`
2. Turn DEV MODE on
3. Navigate home → tasks → detail; note timing / cache rows
4. Confirm no Component Builder button (expected while disabled)

## Verify

- [ ] DEV MODE pill appears on localhost
- [ ] Overlay expands without console errors
- [ ] Production `npm run build` does not leave the pill in the deploy output

## Next

[Chapter 19 — TypeScript mode](./19-typescript-mode.md)
