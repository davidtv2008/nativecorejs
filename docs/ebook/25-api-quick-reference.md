# Chapter 25 — API Quick Reference

Verified against create-nativecore template sources. Prefer reading the cited
module when in doubt.

## CoreController (`@core/controller.js`)

| API | Notes |
|-----|-------|
| `constructor(root?)` | Defaults to `[data-view]` |
| `onMount()` | Lifecycle hook |
| `destroy()` | Cleanup |
| `this.state(v)` / `this.signal` / `this.compute` / `this.effect` | Instance reactivity |
| `this.bind` / `this.on` / `this.emit` | DOM helpers |
| `this.assertRefs(...)` | Throws if refs missing |
| `this.rebind(root?)` | Re-scan refs |

## CoreComponent (`@core/component.js`)

| API | Notes |
|-----|-------|
| `static useShadowDOM` | Shadow vs light |
| `static observedAttributes` | Attribute observation |
| `template()` | Return `html\`...\`` |
| `onMount` / state / bind / on / emit | Parallel to controllers |
| `defineComponent(tag, Class)` | Register CE |
| `Component` | Deprecated shim → prefer `CoreComponent` |

## State (`@core/state.js`)

`useState`, `computed`, `effect`, `batch`

## Router (`@core/router.js`)

| API | Notes |
|-----|-------|
| `register(path, html, controller?, options?)` | Chainable |
| `cache({ ttl, revalidate? })` | Last registered route |
| `prefetch(path)` / `bustCache(path?)` | HTML cache |
| `group({ middleware?, prefix? }, fn)` | Nested groups |
| `use(middlewareFn)` | Global middleware pipeline |
| `navigate` / `replace` / `back` / `start` | Navigation |
| `getCurrentRoute` / `getTagsForPath` / `getPathsForMiddleware` | Introspection |
| `getCacheSnapshot` / `getRouteDebugInfo` | Dev helpers |

Params: `:id`, `:id?`, `*` → `wildcard`.

**`window.router` (frozen):** `navigate`, `replace`, `back`, `getCurrentRoute` only.

## Lazy controller (`@core/lazyController.js`)

`createLazyController(import.meta.url)` → `lazyController(exportName, relativePath)`

## Middleware (`@core/createMiddleware.js`)

`createMiddleware(tag, fn)` — `fn(route, state?) → boolean | Promise<boolean>`

## Services (scaffold `src/services/`)

| Service | Highlights |
|---------|------------|
| `api` | `setBaseURL`, `get/post/put/patch/delete`, `getCached`, `invalidateTags`, `invalidateQuery`, `clearCache` |
| `storage` | strategies `memory` / `session` / `local` |
| `logger` | leveled logging |

## Stores (scaffold)

`appStore` (export `appStore`), `uiStore` (`sidebarCollapsed`, `theme`, `notifications`); plus `make:store` (e.g. `taskItems`, `loadTasks`).

## Wires (`@core-utils/wires.js`)

`wireContents`, `wireInputs`, `wireAttributes`, `wireClasses`, `wireStyles`, `wireActions`

## Events util (`@core-utils/events.js`)

`trackEvents()` — optional; CoreController `this.on` is the default Deskflow style.

## Testing (`@testing/index.js`)

`mountComponent`, `waitFor`, `fireEvent`

## Realtime / i18n / http (core)

| Module | Entry |
|--------|-------|
| `@core/ws.js` | `connectWebSocket` |
| `@core/sse.js` | `connectSSE` |
| `@core/i18n.js` | `configureI18n`, `i18n`, `t` |
| `@core/http.js` | default `http` client (interceptors/retries) — separate from `api.service` |

## CLI scripts

`make:component|core-component|controller|store|view|page|middleware`
`remove:component|core-component|view`
`build`, `build:client`, `build:ssg`, `build:full`, `test`, `cap:*` / `cap:init`

## Package-only (not in scaffold core)

Label clearly when teaching these — they live in the `nativecorejs` npm package:

- `registerPlugin` / `unregisterPlugin`
- `nativecorejs/a11y` (`trapFocus`, `announce`, `roving`)
- `useForm` (package `.nativecore/core/form`)

See [A-package-vs-scaffold.md](./A-package-vs-scaffold.md).

## Appendices

- [Framework comparison](./A-framework-comparison.md)
- [Package vs scaffold](./A-package-vs-scaffold.md)
