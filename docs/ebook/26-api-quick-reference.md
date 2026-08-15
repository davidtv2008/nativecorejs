# Chapter 26 — API Quick Reference

All entries verified against `packages/create-nativecore/template/.nativecore/`
and `packages/nativecorejs/`. When in doubt, open the source file — it is the
canonical truth.

---

## CoreController (`@core/controller.js`)

```js
import { CoreController } from '@core/controller.js';
```

| Member | Signature | Notes |
|--------|-----------|-------|
| `constructor` | `(root?: HTMLElement)` | Defaults to `document.querySelector('[data-view]')` |
| `onMount` | `(): void` | Override; runs after the controller is bound to the view |
| `destroy` | `(): void` | Call from the factory cleanup; removes all `this.on` listeners |
| `this.state` | `<T>(initial: T): State<T>` | Creates a reactive `State` scoped to this controller (`{ value }`) |
| `this.signal` | `<T>(initial: T): [get, set]` | Returns a `[getter, setter]` tuple (not an alias of `this.state`) |
| `this.compute` | `<T>(fn: () => T): State<T>` | Derived reactive value |
| `this.effect` | `(fn: () => void \| (() => void)): void` | Runs immediately; re-runs on signal reads inside `fn` |
| `this.bind` | `(state, el, classOrAttr?)` | `textContent` bind, or class toggle / attribute bind when third arg is provided |
| `this.on` | `(target, type, handler)` | Adds an event listener; removed automatically on `destroy()` |
| `this.emit` | `(name, detail?, opts?)` | Dispatches `CustomEvent` with `bubbles: true, composed: true` |
| `this.assertRefs` | `(...names: string[])` | Throws if any `ref="name"` is not found in the root |
| `this.rebind` | `(root?: HTMLElement)` | Re-scans refs after dynamic DOM changes |
| `this[refName]` | `HTMLElement` | Auto-populated from `ref="refName"` attributes in the view |

### Factory pattern (required)

```js
export function myController(_params, _state, _loaderData, rootElement) {
    const ctrl = new MyController(rootElement);
    return () => ctrl.destroy();
}
```

The factory is what `lazyController` calls. It must return a cleanup function.

---

## CoreComponent (`@core/component.js`)

```js
import { CoreComponent, defineComponent } from '@core/component.js';
```

| Member | Notes |
|--------|-------|
| `static useShadowDOM` | `true` (default) → shadow root; `false` → light DOM |
| `static observedAttributes` | `string[]` — attributes the browser reports changes for |
| `template()` | Returns an HTML string (use `html\`...\`` tag) |
| `onMount()` | Runs after `connectedCallback` + template render |
| `onUnmount()` | Optional cleanup; `this.on` cleans up automatically |
| `_handleAttributeUpdate(name, value)` | Called when an observed attribute changes |
| `this.state`, `this.compute`, `this.effect`, `this.bind`, `this.on`, `this.emit`, `this.assertRefs`, `this.rebind` | Same surface as `CoreController` |
| `defineComponent(tag, Class)` | Calls `customElements.define`; idempotent |

### Shadow DOM access

```js
// Read from shadow inside onMount:
const inner = this.shadowRoot.querySelector('.inner');
// Refs are wired to this.refName directly — no manual querySelector for ref="…"
```

---

## State (`@core/state.js`)

```js
import { useState, computed, effect, batch, untrack, peek } from '@core/state.js';
```

| Export | Signature | Notes |
|--------|-----------|-------|
| `useState` | `<T>(initial: T): State<T>` | Creates a reactive state cell |
| `computed` | `<T>(fn: () => T, options?): ComputedState<T>` | Derived; `{ pageCleanup: false }` skips router flush |
| `effect` | `(fn, options?): () => void` | Runs immediately; `{ pageCleanup: false }` for instance scope |
| `batch` | `(fn: () => void): void` | Defers signal notifications until `fn` completes |
| `untrack` | `<T>(fn: () => T): T` | Run `fn` without registering signal reads as dependencies |
| `peek` | `<T>(state): T` | Read `state.value` without subscribing |

### `State<T>` interface

| Member | Notes |
|--------|-------|
| `.value` | Read or write |
| `.set(value \| updater)` | Write, or updater `(prev) => next` |
| `.watch(fn)` | Subscribe to later writes; returns an unsubscribe function |

`this.state` / `this.compute` / `this.effect` on controllers and components use
this same engine. Instance compute/effect pass `{ pageCleanup: false }` and
dispose on `destroy()` / disconnect.

---

## Reconcile (`@core-utils/reconcile.js`)

```js
import { reconcile } from '@core-utils/reconcile.js';

reconcile(container, items, item => item.id, item => {
    const li = document.createElement('li');
    li.textContent = item.label;
    return li;
}, (el, item) => { el.textContent = item.label; });
```

Keyed list: reuse nodes for the same key, move to match order, remove leftovers.
`create` runs only for new keys. Optional `update` patches reused nodes.
Keys are stored on `data-nc-key`. After inserting nodes with `ref` attributes,
call `this.rebind(container)`.

---

## Context (`@core/context.js`)

```js
import { createContext, provide, inject } from '@core/context.js';

const Theme = createContext('theme');
const stop = provide(host, Theme, themeState); // State or static value
const value = inject(child, Theme);
const unsub = inject(child, Theme, next => { /* subscribe */ });
```

Web Components context-request protocol (`composed`, bubbles through Shadow DOM).
Use for theme, locale, or the current user — not as a global store.

---

## Resource (`@core/resource.js`)

```js
import { resource } from '@core/resource.js';

const box = resource(async (id, signal) => {
    const res = await fetch(`/api/items/${id}`, { signal });
    return res.json();
}, { source: itemId });

box.data.value;
box.loading.value;
box.error.value;
await box.refetch();
```

Aborts the in-flight request when `source` changes, on `refetch()`, and on
page navigation (`pageCleanup` defaults to true).

---

## Router (`@core/router.js`)

```js
import { router } from '@core/router.js';   // internal — use via app.js
// Public surface in userland:
window.router.navigate('/tasks');
window.router.replace('/tasks');
window.router.back();
window.router.getCurrentRoute();
```

### Registration (inside `registerRoutes(r)`)

```js
r.register(path, htmlFile, controller?, options?)
// returns r — chain .cache(...) on the route just registered
```

| Argument | Type | Required | Notes |
|----------|------|----------|-------|
| `path` | `string` | yes | URL pattern: `/tasks`, `/tasks/:id`, `/tasks/:id?`, `/files/*` |
| `htmlFile` | `string` | yes | Project-relative view path, e.g. `src/views/public/tasks.html` |
| `controller` | `ControllerFunction \| null` | no | Prefer `lazyController('exportName', '../controllers/….js')`; omit/`null` for HTML-only |
| `options` | `Partial<RouteConfig>` | no | See options table below |

**`ControllerFunction`:**

```js
(params: Record<string, string>, state?: any, loaderData?: unknown)
  => (() => void) | void | Promise<(() => void) | void>
```

Always return cleanup from factories: `() => ctrl.destroy()`.

**`options` / `RouteConfig` fields:**

| Key | Type | Notes |
|-----|------|-------|
| `loader` | `(params, signal: AbortSignal) => Promise<unknown>` | Runs before controller; result → `loaderData` |
| `layout` | `string` | Path of another registered route used as a layout. May nest: each layout can set `layout` too. Every layout file needs `#route-outlet` or `[data-route-outlet]`. Shared prefix is reused; layout controllers stay mounted until that frame leaves the chain. |
| `disableTransition` | `boolean` | Skip page transition for this route |
| `cachePolicy` | `{ ttl: number, revalidate?: boolean }` | Prefer `.cache()` chain instead |
| `title` | `string \| ((match) => string)` | Sets `document.title` after a successful load |
| `meta` | `Record<string, string> \| ((match) => Record<string, string>)` | Sets or creates `<meta name>` tags |

Failed loads dispatch `nativecore:route-error` on `window` (`ROUTE_ERROR_EVENT`).
Listen for a custom error UI; the router still shows its 404 fallback. The
event is for the failed page load, not each layout frame.

| Method | Signature | Notes |
|--------|-----------|-------|
| `r.register` | `(path, htmlFile, controller?, options?)` | Register a route; returns `this` |
| `.cache` | `({ ttl: number, revalidate?: boolean })` | Chain after `r.register`; `ttl` in **seconds** |
| `r.group` | `({ middleware?: string[]; prefix?: string }, fn)` | Shared middleware tags and/or path prefix |

### Path syntax

| Pattern | Matches |
|---------|---------|
| `/tasks` | Exact path |
| `/tasks/:id` | Dynamic segment → `params.id` |
| `/tasks/:id?` | Optional segment |
| `/*` | Wildcard → `params.wildcard` |

### Full router API (internal — use in `app.js`)

| Method | Notes |
|--------|-------|
| `router.use(fn)` | Global middleware; `fn(route, state?) → boolean \| Promise<boolean>` |
| `router.navigate(path, state?)` | Push history |
| `router.replace(path, state?)` | Replace history |
| `router.back()` | `history.back()` |
| `router.start()` | Begin listening; call once after `registerRoutes` |
| `router.prefetch(path)` | Pre-fetch route HTML into cache |
| `router.bustCache(path?)` | Invalidate one or all cache entries |
| `router.getCacheSnapshot()` | Returns `{ [path]: { html, expires, etag? } }` |
| `router.getRouteDebugInfo()` | Route table with middleware and controller metadata |
| `router.getCurrentRoute()` | `{ path, params, middleware, … } \| null` |
| `router.getTagsForPath(path)` | Middleware tags registered for a path |
| `router.getPathsForMiddleware(tag)` | Paths registered under a given middleware tag |

**`window.router` (frozen subset):** `navigate`, `replace`, `back`,
`getCurrentRoute` only. Do not rely on any other property of `window.router`
being present — it is a frozen proxy, not the full router. Advanced APIs
(`prefetch`, `bustCache`, `getPathsForMiddleware`, …) live on
`window.__NC_ROUTER__` or `import router from '@core/router.js'`.

---

## Lazy controller (`@core/lazyController.js`)

```js
import { createLazyController } from '@core/lazyController.js';

const lazyController = createLazyController(import.meta.url);

// Usage in registerRoutes:
r.register('/tasks', 'src/views/public/tasks.html',
    lazyController('tasksController', '../controllers/tasks.controller.js'));
```

- First argument: the **exported function name** in the controller module
- Second argument: path **relative to `routes.js`** (not to `app.js`)

---

## Middleware (`@core/createMiddleware.js`)

```js
import { createMiddleware } from '@core/createMiddleware.js';

const sessionMiddleware = createMiddleware('session', async (route, state) => {
    // Return true to allow navigation; false (or a redirect) to block
    return Boolean(localStorage.getItem('session'));
});

router.use(sessionMiddleware);
```

`fn(route, state?) → boolean | Promise<boolean>`

---

## HTTP client (`@core/http.js`)

```js
import http from '@core/http.js';

const data = await http.get('/api/tasks');
await http.post('/api/tasks', { title: 'New task' });
await http.put('/api/tasks/1', { done: true });
await http.patch('/api/tasks/1', { done: true });
await http.delete('/api/tasks/1');
```

This is the low-level HTTP primitive. For caching, tag invalidation, and the
full service layer used by Deskflow, use `src/services/api.service.js` instead.

---

## Services (`src/services/`)

### `api.service`

```js
import api from '@services/api.service.js';

api.setBaseURL('https://api.example.com');
await api.get('/tasks');
await api.post('/tasks', body);
await api.put('/tasks/1', body);
await api.patch('/tasks/1', body);
await api.delete('/tasks/1');
await api.getCached('/tasks', { ttl: 60 });
api.invalidateTags(['tasks']);
api.invalidateQuery(['tasks', 'list']);   // query key array, not a path string
api.clearCache();
```

### `storage.service`

```js
import storage from '@services/storage.service.js';

storage.setStrategy('local');    // 'memory' | 'session' | 'local'
storage.set('key', value);
storage.get('key');
storage.remove('key');
storage.clear();
```

### `logger.service`

```js
import logger from '@services/logger.service.js';

logger.debug('msg', data);
logger.info('msg', data);
logger.warn('msg', data);
logger.error('msg', data);
```

---

## Stores (`src/stores/`)

### Built-in stores

| Store | Exports |
|-------|---------|
| `appStore.js` / `.ts` | `appStore` — app-wide reactive state |
| `uiStore.js` / `.ts` | `uiStore` — `sidebarCollapsed`, `theme`, `notifications` |

### Generated stores (`make:store`)

```bash
npm.cmd run make:store -- task
# → src/stores/task.store.js
# Exports: taskItems, taskLoading, taskError, taskCount (computed),
#          loadTasks, addTask, removeTask
```

---

## Path aliases (all projects)

| Alias | Resolves to |
|-------|-------------|
| `@core/` | `.nativecore/core/` |
| `@core-utils/` | `.nativecore/utils/` |
| `@core-types/` | `.nativecore/types/` |
| `@dev/` | `.nativecore/dev/` (dev only) |
| `@testing/` | `.nativecore/testing/` |
| `@components/` | `src/components/` |
| `@services/` | `src/services/` |
| `@utils/` | `src/utils/` |
| `@stores/` | `src/stores/` |
| `@middleware/` | `src/middleware/` |
| `@routes/` | `src/routes/` |
| `@config/` | `src/config/` |
| `@types/` | `src/types/` |
| `@constants/` | `src/constants/` |

Always include the `.js` extension when importing through aliases.

---

## Realtime helpers

### WebSocket (`@core/ws.js`)

```js
import { connectWebSocket } from '@core/ws.js';

const socket = connectWebSocket(url, handlers, options);
socket.send(data);
socket.close();
socket.readyState;   // mirrors WebSocket.readyState
socket.isOpen;       // boolean
```

**Handlers:** `onOpen`, `onClose`, `onError`, `onMessage` (raw), `onJsonMessage`
(when `parseJson: true`), `onReconnect(attempt)`, `onReconnectFailed(lastEvent)`.

**Options:** `protocols`, `parseJson`, `reconnect: { maxRetries, baseDelay,
maxDelay } | false`, `heartbeat: { interval, message? }`, `signal`.

### SSE (`@core/sse.js`)

```js
import { connectSSE } from '@core/sse.js';

const disconnect = connectSSE(url, handlers, options);
disconnect();
```

**Handlers:** `onOpen`, `onMessage` (default event, raw string), `onJsonMessage`
(when `parseJson: true`), `onError`, `events: { eventName: fn }`,
`eventsJson: { eventName: fn }`, `onReconnect(attempt)`, `onReconnectFailed`.

**Options:** `parseJson`, `withCredentials`, `reconnect: { maxRetries,
baseDelay, maxDelay } | false`, `signal`.

---

## i18n (`@core/i18n.js`)

```js
import { configureI18n, i18n, t } from '@core/i18n.js';
```

| API | Notes |
|-----|-------|
| `configureI18n(options)` | Merges `messages`; applies `fallbackLocale`, `persist`, and `defaultLocale` (stored `nc:locale` wins over `defaultLocale`) |
| `t(key, params?)` | Translate; `{name}` placeholders. When `params.count` is a number, looks up `key.{plural}` via `Intl.PluralRules`, then `key.other`, then `key` |
| `i18n.setLocale(code)` | Switch active locale; constructor wires `localStorage` persist by default |
| `i18n.locale` | `State<string>` — watch inside `effect` to react to locale changes |
| `i18n.extend({ locale: { key: value } })` | Merge new keys; does not replace existing |
| `i18n.listLocales()` | Returns `string[]` of known locale codes |
| `i18n.has(key)` | `true` if the key exists in the active locale |
| `i18n.registerNamespace(name, loaderFn)` | Register an async loader |
| `i18n.loadNamespace(name, locale?)` | Load a namespace; idempotent |
| `i18n.isNamespaceLoaded(name, locale?)` | Boolean |
| `i18n.formatNumber(value, options?)` | `Intl.NumberFormat` wrapper |
| `i18n.formatCurrency(value, currency, options?)` | `Intl.NumberFormat` currency wrapper |
| `i18n.formatDate(value, options?)` | `Intl.DateTimeFormat` wrapper |
| `i18n.formatRelative(value, now?)` | `Intl.RelativeTimeFormat` wrapper |

---

## Testing (`@testing/index.js`)

```js
import { mountComponent, mountController, navigateAndWait, waitFor, fireEvent } from '@testing/index.js';
```

| Helper | Signature | Notes |
|--------|-----------|-------|
| `mountComponent` | `(tag, attrs?) → { element, cleanup }` | Appends to `document.body`; call `cleanup()` after every test |
| `mountController` | `(html, factory) → { root, cleanup }` | Mounts a `[data-view]` root, runs the factory, cleans controller + DOM |
| `navigateAndWait` | `(router, path, timeout?) → Promise` | Resolves on `pageloaded`; rejects on `nativecore:route-error` or timeout |
| `waitFor` | `(predicate, timeout?) → Promise<void>` | Polls until truthy; default timeout 1000 ms |
| `fireEvent` | `(element, eventName, detail?)` | Dispatches `CustomEvent` with `bubbles: true, composed: true` |

---

## CLI scripts

### Generators

```bash
npm.cmd run make:component -- <name> [--defaults] [--with-tests]
npm.cmd run make:core-component -- <name> [--defaults]
npm.cmd run make:controller -- <name> [--defaults]
npm.cmd run make:store -- <name>
npm.cmd run make:view -- <name> [--defaults]
npm.cmd run make:page -- <name> [--defaults]
npm.cmd run make:middleware -- <name>
```

### Removers

```bash
npm.cmd run remove:component -- <name>
npm.cmd run remove:core-component -- <name>
npm.cmd run remove:view -- <name> [--yes]
npm.cmd run remove:store -- <name>
npm.cmd run remove:middleware -- <name>
```

### Build and test

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server + HMR |
| `npm run build` | Production compile + dev-strip |
| `npm run build:client` | Client bundle without strip |
| `npm run build:ssg` | Pre-render public routes to `_deploy/` |
| `npm run build:full` | `build` then `build:ssg` |
| `npm test` | Vitest (watch mode) |
| `npm.cmd test -- --run` | Vitest single pass |
| `npm run test:coverage` | Coverage report |
| `npm run typecheck` | `tsc --noEmit` (TypeScript projects only) |
| `npm run compile` | esbuild via `.nativecore/scripts/watch-compile.mjs --once` (JS + TS scaffolds) |

### Capacitor

| Script | Requires |
|--------|---------|
| `npm run cap:init` | Always available (even without `--capacitor`) |
| `npm run cap:sync` | `--capacitor` flag at scaffold time |
| `npm run cap:android` / `cap:ios` | `--capacitor` + IDE installed |
| `npm run cap:add:android` / `cap:add:ios` | `--capacitor` |
| `npm run cap:run:android` / `cap:run:ios` | `--capacitor` + device/emulator |

---

## Events utility (`@core-utils/events.js`)

```js
import { on, delegate, trackEvents, onClick, onKeydown, onFocus } from '@core-utils/events.js';
```

Prefer `this.on(target, type, handler)` inside controllers. Standalone helpers
return a disposer. Shorthands: `onClick`, `onChange`, `onInput`, `onSubmit`,
`onKeydown`, `onKeyup`, `onFocus`, `onBlur`, `onFocusin`, `onFocusout`,
`onScroll`, `onMouseenter`, `onMouseleave`, `onDblclick`.

---

## DOM utilities (`@core-utils/dom.js`)

```js
import { dom } from '@core-utils/dom.js';
```

| API | Notes |
|-----|-------|
| `dom.create(tag, attrs?, ...children)` | Flat map = HTML attributes. Options bag `{ attrs, props, dataset, ns, class }` when `attrs` / `props` / `ns` is present |
| `dom.setAttrs(el, map)` | `setAttribute` writes |
| `dom.removeAttrs(el, ...names)` | Remove attributes |
| `dom.setProps(el, map)` | Assign IDL / custom-element properties |
| `dom.assign(el, { attrs, props, dataset, class })` | Mutate an existing node |
| `dom.query` / `dom.$` / `dom.queryAll` / `dom.$$` | Document queries |
| `dom.within` / `dom.withinAll` | Scoped queries |
| `dom.view(name)` | `[data-view]` / `[data-hook]` / `[data-action]` helpers |
| `dom.listen(el, type, handler)` | Listener + disposer; prefer `this.on` in controllers |

Flat maps are HTML attributes. Objects, arrays, and IDL booleans belong in
`props`. Do not attach listeners in `create()`.

```js
const frame = dom.create('iframe', {
    attrs: { title: 'Preview', allowfullscreen: '' },
    props: { src: url, allowFullscreen: true },
});
dom.setProps(player, { questions, open: true });
```

---

## Persist and timing

```js
import { persistState } from '@core-utils/persist.js';
import { debounce } from '@core-utils/timing.js';
```

| API | Notes |
|-----|-------|
| `persistState(key, initial, { storage? })` | `useState` hydrated from `localStorage` (or `session`). JSON + quota-safe |
| `debounce(fn, wait?)` | Delayed call; `.cancel()` clears a pending invocation |

`throttle` / `rafThrottle` remain on `@core/gpu-animation.js`.

---

## Observe and portal

```js
import { clickOutside, mediaQuery, observe } from '@core-utils/observe.js';
import { portal } from '@core-utils/portal.js';
```

| API | Notes |
|-----|-------|
| `clickOutside(el, fn)` | `pointerdown` outside `el`; returns disposer |
| `mediaQuery(query)` | `{ matches: State<boolean>, dispose() }` |
| `observe(el, { resize?, intersect?, threshold?, root?, rootMargin? })` | ResizeObserver and/or IntersectionObserver; returns disposer |
| `portal(node, target)` | Move `node` into `target` (element or selector); disposer restores original position |

---

## Forms (`@core/form.js`)

```js
import { useForm, useFieldArray } from '@core/form.js';
import { required, email } from '@core/validators.js';
```

| API | Notes |
|-----|-------|
| `useForm({ initialValues, rules?, asyncRules?, onSubmit? })` | Reactive fields, `errors`, `asyncErrors`, `bindField`, `handleSubmit` |
| `form.bindField(name, el)` | Syncs value via `on()` (`input` / `change` + `blur`); returns disposer |
| `form.validateAsync()` | Runs `asyncRules`; first message string wins per field |
| `form.handleSubmit(fn?)` | Returns `(event?) => Promise<boolean>` — sync errors, then async, then `fn` |
| `useFieldArray(initial)` | `{ items, append, remove, move, replace }` |

`handleSubmit` is a factory: `await form.handleSubmit(onSave)()`.

---

## Accessibility (`@core-utils/a11y.js`)

```js
import { lockBodyScroll } from '@core-utils/a11y.js';
```

`lockBodyScroll()` is reference-counted and restores overflow + scrollbar
compensation. Also exported from `nativecorejs` and `nativecorejs/a11y`.

---

## Package-only APIs (not in scaffold core)

These symbols are exported by the `nativecorejs` npm package when you import
from it directly. They are **not** available through the `.nativecore/core/`
vendored copy inside a scaffolded app.

| API | Import |
|-----|--------|
| `registerPlugin` / `unregisterPlugin` | `import { registerPlugin } from 'nativecorejs'` |
| `useForm` + validators | Scaffold: `@core/form.js` / `@core/validators.js`. Also `nativecorejs` |
| `onError` / `handleError` | `import { onError, handleError } from 'nativecorejs'` — lazy; does not install window listeners until first call |
| `trapFocus` / `announce` / `roving` | `import { trapFocus } from 'nativecorejs/a11y'` |
| `lockBodyScroll` | Scaffold: `@core-utils/a11y.js`. Also `nativecorejs` / `nativecorejs/a11y` |

See [Appendix B — Package vs Scaffold](./A-package-vs-scaffold.md) for the
full breakdown.

---

## `nc-animation` (path-picking component)

You choose a **preset name**. The component chooses CSS compositor, Web
Animations API (GPU `transform` / `opacity`), or a canvas particle overlay —
whichever is cheapest for that preset. See [Chapter 13](./13-core-components.md).

| Path | Presets | Engine |
|------|---------|--------|
| `css` | `spin`, `ping`, `float`, `glow` | Compositor `@keyframes`, no JS after start |
| `waapi` | `fade-in`, `slide-*`, `pulse`, `shake`, … | `gpu-animation.ts` / Web Animations API |
| `particle` | `confetti`, `sparkles`, `firework`, … | canvas2d overlay (CPU). Generic WebGL lives in `gpu-animation.ts` |

Triggers: `mount` \| `visible` \| `hover` \| `click` \| `manual`. Methods:
`play()`, `pause()` (WAAPI only), `cancel()`. Events: `start`, `finish`, `cancel`.

---

## Appendices

- [Appendix A — Framework comparison](./A-framework-comparison.md)
- [Appendix B — Package vs scaffold](./A-package-vs-scaffold.md)
