# Appendix B — Package vs Scaffold

NativeCore has two related surfaces.

## `create-nativecore` scaffold (what Deskflow uses)

Copied into each app:

- `.nativecore/core/*` — router, CoreController, CoreComponent, state, lazy
  controllers/components, middleware helper, ws, sse, i18n, http, errorHandler,
  pageCleanup, gpu-animation, mountDevTools helper, …
- `.nativecore/utils/*` — wires, events, templates, dom, …
- `.nativecore/dev/*` — HMR/denc/overlay (dev only)
- `.nativecore/scripts/*` — make/remove, compile, ssg, minify, …
- `.nativecore/testing/index.js`
- App tree: `src/`, `server.js`, styles, registries, services, stores

This is the source of truth for **this ebook**.

## `nativecorejs` npm package

Published library used when you import from `nativecorejs` instead of (or in
addition to) a full scaffold. It may include extras not copied into every
create-nativecore app, notably:

| API | Package | Typical scaffold |
|-----|---------|------------------|
| `registerPlugin` / `unregisterPlugin` | Yes | Not the primary app path |
| `useForm` + validators | Yes (`form` module) | Not vendored in scaffold core |
| `nativecorejs/a11y` | Yes | Components may inline a11y; package export is separate |
| Builtin component manifest helpers | Yes | Scaffold uses local `frameworkRegistry` + files under `src/components/core` |

Component counts can differ slightly between package builtins and the template’s
`nc-*` set.

## Rule for contributors

If a feature is package-only, chapters must say **package-only** and must not
imply `npm create nativecore` apps already have it.
