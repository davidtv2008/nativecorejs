# Performance budget

NativeCoreJS differentiates on **low overhead** and web-standard rendering (no virtual DOM).

## Published targets

| Budget | Value | How to measure |
|--------|-------|----------------|
| Production npm runtime deps | **0** | App uses vendored `.nativecore/`; optional `nativecorejs` for library imports |
| Warm route navigation (local) | **&lt; 100ms** HTML+controller path when caches are warm | DevTools Network + router memory cache |
| Critical JS for shell | Prefer import-map + lazy controllers | Controllers never top-level imported in routes |
| SSG pages | HTML pre-rendered; hydrate with same `app.js` | `npm run build:ssg` → `_deploy/` |

## What we optimize

1. Router HTML memory cache + SWR (see `router.ts` `cache` / prefetch).
2. Lazy controllers (`createLazyController`) so unused pages stay unloaded.
3. `this.bind` / signals — surgical DOM updates, not full re-renders.
4. Shadow DOM components with attribute-driven updates.

## Showcase

Capability demos live on the showcase site at **`/performance`** (surgical updates, fan-out, in-browser micro-bench, and a lab snapshot from `npm run bench`). Re-run the monorepo suite after major Core changes and refresh `src/content/benchSnapshot.js` in the showcase.
