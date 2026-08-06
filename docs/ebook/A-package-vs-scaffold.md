# Appendix B — Package vs Scaffold

NativeCore has one **canonical** runtime and a scaffold that vendors it.

## Source of truth: `nativecorejs` package

Edit Core under `packages/nativecorejs/.nativecore/` (and package exports in
`packages/nativecorejs/src/index.ts`). Then vendor into the CLI template:

```bash
npm run vendor-core -w create-nativecore
# or: node packages/create-nativecore/scripts/vendor-core.mjs
```

That copies `core/`, `utils/`, and `testing/` into
`packages/create-nativecore/template/.nativecore/`.

**Do not hand-edit** vendored `core/` / `utils/` in the template or in apps —
change the package and re-vendor.

## `create-nativecore` scaffold (what apps get)

Copied into each app:

- `.nativecore/core/*` — **vendored** from the package (router, CoreController,
  CoreComponent, state, lazyController, createMiddleware, http, …)
- `.nativecore/utils/*` — **vendored** (events, templates, dom, …). Wires utils
  are **removed**.
- `.nativecore/dev/*` — scaffold-owned (HMR, overlays, experimental Builder)
- `.nativecore/scripts/*` — scaffold-owned (`make:*` / `remove:*`, compile, ssg)
- `.nativecore/testing/` — vendored helpers
- App tree: `src/`, `server.js`, styles, registries, services, stores

## Package-only extras

Still primarily consumed via `import … from 'nativecorejs'`:

| API | Notes |
|-----|--------|
| `registerPlugin` / `unregisterPlugin` | Observability hooks |
| `useForm` + validators | Forms |
| `nativecorejs/a11y` | `trapFocus`, `announce`, `roving` (also used by `nc-modal` / `nc-drawer`) |
| Builtin component manifest helpers | Scaffold uses local `frameworkRegistry` |

## Rule for contributors

- Core changes → package first → `vendor-core` → ship CLI/template.
- If a feature is package-only, chapters must say **package-only**.
