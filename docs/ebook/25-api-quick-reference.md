# Chapter 25 — API Quick Reference

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
import { useState, computed, effect, batch } from '@core/state.js';
```

| Export | Signature | Notes |
|--------|-----------|-------|
| `useState` | `<T>(initial: T): State<T>` | Creates a reactive state cell |
| `computed` | `<T>(fn: () => T): State<T>` | Derived; re-evaluates when dependencies change |
| `effect` | `(fn: () => void \| (() => void)): void` | Runs immediately; re-runs on dependency change |
| `batch` | `(fn: () => void): void` | Defers signal notifications until `fn` completes |

### `State<T>` interface

| Member | Notes |
|--------|-------|
| `.value` | Read or write |
| `.watch(fn)` | Runs `fn(value)` immediately and on every change |

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

| Method | Signature | Notes |
|--------|-----------|-------|
| `r.register` | `(path, htmlFile, controller?, options?)` | Register a route |
| `.cache` | `({ ttl: number, revalidate?: boolean })` | Chain after `r.register` |
| `r.group` | `({ middleware?, prefix? }, fn)` | Group routes under shared options |

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
| `configureI18n({ messages })` | Mainly merges catalogs via `i18n.extend`; `defaultLocale` / `fallbackLocale` / `persist` on this call are largely ignored (constructor already ran) |
| `t(key, params?)` | Translate; params use `{name}` placeholder syntax |
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
import { mountComponent, waitFor, fireEvent } from '@testing/index.js';
```

| Helper | Signature | Notes |
|--------|-----------|-------|
| `mountComponent` | `(tag, attrs?) → { element, cleanup }` | Appends to `document.body`; call `cleanup()` after every test |
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
import { trackEvents } from '@core-utils/events.js';
```

`trackEvents()` is an optional helper. Inside Deskflow, prefer `this.on(target,
type, handler)` — it handles cleanup automatically and is the pattern all
chapters teach. `trackEvents` is available for cases outside a controller
context.

---

## Package-only APIs (not in scaffold core)

These symbols are exported by the `nativecorejs` npm package when you import
from it directly. They are **not** available through the `.nativecore/core/`
vendored copy inside a scaffolded app.

| API | Import |
|-----|--------|
| `registerPlugin` / `unregisterPlugin` | `import { registerPlugin } from 'nativecorejs'` |
| `useForm` + validators | `import { useForm } from 'nativecorejs'` |
| `trapFocus` / `announce` / `roving` | `import { trapFocus } from 'nativecorejs/a11y'` |

See [Appendix B — Package vs Scaffold](./A-package-vs-scaffold.md) for the
full breakdown.

---

## Appendices

- [Appendix A — Framework comparison](./A-framework-comparison.md)
- [Appendix B — Package vs scaffold](./A-package-vs-scaffold.md)
