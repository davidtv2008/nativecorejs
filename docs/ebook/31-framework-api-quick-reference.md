# Chapter 31 — Framework API Quick Reference

> **What you'll build in this chapter:** Use this reference to verify every API used across Projects 1–4 is documented here, and flag any gaps as documentation contributions.

Use this chapter as a fast lookup for NativeCoreJS framework APIs. Each entry includes a short signature, a one-line purpose, and a link to the chapter that explains it in depth.

---

## Component Authoring APIs

| API | Signature | Purpose | Deep dive |
|---|---|---|---|
| `Component` | `class Component extends Element` | Base class for all NativeCoreJS components | [02 — First Component](./02-first-component.md) |
| `defineComponent` | `defineComponent(tagName, componentClass)` | Registers a custom element safely | [02 — First Component](./02-first-component.md) |
| `template` | `template()` | Returns component HTML | [02 — First Component](./02-first-component.md) |
| `onMount` | `onMount()` | Runs after initial render | [02 — First Component](./02-first-component.md) |
| `onUnmount` | `onUnmount()` | Runs when component detaches for cleanup | [02 — First Component](./02-first-component.md) |
| `onAttributeChange` | `onAttributeChange(name, oldValue, newValue)` | Handles observed attribute updates | [02 — First Component](./02-first-component.md) |
| `$` | `$(selector)` | Scoped single-element query | [02 — First Component](./02-first-component.md) |
| `$$` | `$$(selector)` | Scoped multi-element query | [02 — First Component](./02-first-component.md) |
| `emitEvent` | `emitEvent(eventName, detail?, options?)` | Emits typed custom events | [11 — Advanced Patterns](./11-advanced-patterns.md) |

---

## Bind API (Fine-Grained Updates)

| API | Signature | Purpose | Deep dive |
|---|---|---|---|
| `bind` | `bind(state, selector, property?)` | Binds reactive value to element property/text | [04 — The Bind API](./04-bind-api.md) |
| `bindAttr` | `bindAttr(state, selector, attributeName)` | Binds reactive value to HTML attribute | [04 — The Bind API](./04-bind-api.md) |
| `bindAll` | `bindAll(bindings)` | Declares multiple `bind()` mappings at once | [04 — The Bind API](./04-bind-api.md) |
| `Component.on` | `on(event, handler)` / `on(event, selector, handler)` | Attaches direct or delegated listeners | [04 — The Bind API](./04-bind-api.md) |

---

## Reactive State APIs

| API | Signature | Purpose | Deep dive |
|---|---|---|---|
| `useState` | `useState(initialValue)` | Creates reactive state object (`.value`, `.set`, `.watch`) | [03 — Reactive State](./03-reactive-state.md) |
| `computed` | `computed(computeFn)` | Creates derived reactive values | [03 — Reactive State](./03-reactive-state.md) |
| `effect` | `effect(effectFn, options?)` | Runs side effects with auto dependency tracking; default loop guard is `1000` runs/flush (`0` disables) | [06 — Controllers](./06-controllers.md) |
| `batch` | `batch(fn)` | Coalesces multiple state writes into one notification flush | [11 — Advanced Patterns](./11-advanced-patterns.md) |

---

## Router APIs

| API | Signature | Purpose | Deep dive |
|---|---|---|---|
| `Router` | `new Router()` | Creates SPA router instance | [05 — Views and Routing](./05-views-and-routing.md) |
| `register` | `register(path, htmlFile, controller?, options?)` | Registers route + optional controller/layout/cache config | [05 — Views and Routing](./05-views-and-routing.md) |
| `loader` *(RouteConfig)* | `(params, signal) => Promise` | Pre-fetches data before the controller runs; result passed as 3rd controller arg | [06 — Controllers](./07-controllers.md) |
| `start` | `start()` | Boots routing from current URL | [05 — Views and Routing](./05-views-and-routing.md) |
| `navigate` | `navigate(path, state?)` | Push-navigation within SPA | [05 — Views and Routing](./05-views-and-routing.md) |
| `replace` | `replace(path, state?)` | Replaces current history entry | [16 — Middleware](./16-middleware.md) |
| `use` | `use(middleware)` | Registers route middleware/guards | [16 — Middleware](./16-middleware.md) |
| `prefetch` | `prefetch(path)` | Warms route/layout HTML cache | [14 — Route Caching](./14-route-caching.md) |
| `cache` | `cache(policy)` | Sets cache policy for the last registered route | [14 — Route Caching](./14-route-caching.md) |
| `bustCache` | `bustCache(path?)` | Clears cached route HTML (path-specific or global) | [14 — Route Caching](./14-route-caching.md) |
| `getCurrentRoute` | `getCurrentRoute()` | Reads current route + params | [13 — Dynamic Routes](./13-dynamic-routes.md) |
| `reload` / `back` | `reload()` / `back()` | Reloads current route or navigates browser history back | [05 — Views and Routing](./05-views-and-routing.md) |

**Router lifecycle events** (dispatched on `window`):

| Event | When |
|---|---|
| `nc-route-loading` | Loader function starts; `detail` includes path and params |
| `nc-route-loaded` | Loader resolves; `detail` includes path, params, and data |
| `pageloaded` | Full navigation complete; `detail` includes current route data |

---

## Controller + Event Utility APIs

| API | Signature | Purpose | Deep dive |
|---|---|---|---|
| `trackEvents` | `trackEvents()` | Tracks DOM listeners and cleans them in one call | [06 — Controllers](./06-controllers.md) |
| `on` | `on(selector, eventName, handler)` | Adds selector-based listener and returns cleanup | [06 — Controllers](./06-controllers.md) |
| `delegate` | `delegate(containerSelector, eventName, targetSelector, handler)` | Delegated events for dynamic child nodes | [06 — Controllers](./06-controllers.md) |
| `trackSubscriptions` | `trackSubscriptions()` | Collects unsubscribe callbacks for one-shot cleanup | [06 — Controllers](./06-controllers.md) |

---

## HTML/CSS Template APIs

| API | Signature | Purpose | Deep dive |
|---|---|---|---|
| `html` | `html(strings, ...values)` | Tagged template that escapes interpolations by default | [02 — First Component](./02-first-component.md) |
| `raw` | `raw(value)` | Marks trusted HTML to bypass escaping in `html` | [02 — First Component](./02-first-component.md) |
| `unsafeHTML` | `unsafeHTML(strings, ...values)` | Raw template helper without escaping | [02 — First Component](./02-first-component.md) |
| `escapeHTML` | `escapeHTML(value)` | Escapes string values for safe HTML output | [21 — Accessibility](./21-accessibility.md) |
| `sanitizeURL` | `sanitizeURL(url)` | Blocks unsafe URL protocols before rendering links/src | [21 — Accessibility](./21-accessibility.md) |
| `css` | `css(strings, ...values)` | Tagged CSS helper for readable style blocks | [19 — Styling and Theming](./19-styling-and-theming.md) |

---

## Lazy Loading + Cache Helpers

| API | Signature | Purpose | Deep dive |
|---|---|---|---|
| `componentRegistry.register` | `register(tagName, modulePath)` | Registers lazy component module by tag name | [05 — Views and Routing](./05-views-and-routing.md) |
| `initLazyComponents` | `initLazyComponents()` | Scans DOM and starts lazy-component observer | [05 — Views and Routing](./05-views-and-routing.md) |
| `bustCache` (utils) | `bustCache(url)` | Adds cache-busting query parameter to URL | [12 — Production](./12-production.md) |
| `importWithBust` | `importWithBust(modulePath)` | Dynamically imports local module with cache busting + safety checks | [12 — Production](./12-production.md) |

---

## Accessibility Utilities (`nativecorejs/a11y`)

| API | Signature | Purpose | Deep dive |
|---|---|---|---|
| `trapFocus` | `trapFocus(container)` | Constrains keyboard focus within container; returns disposer that releases trap and restores prior focus | [21 — Accessibility](./22-accessibility.md) |
| `announce` | `announce(message, politeness?)` | Posts message to an ARIA live region for screen-reader announcement | [21 — Accessibility](./22-accessibility.md) |
| `roving` | `roving(container, selector)` | Implements roving-tabindex for widget groups (menus, toolbars); Arrow/Home/End navigation; returns disposer | [21 — Accessibility](./22-accessibility.md) |

---

## Test Utilities (`nativecorejs/testing`)

| API | Signature | Purpose | Deep dive |
|---|---|---|---|
| `mountComponent` | `mountComponent(tagName, attrs?)` | Appends a custom element to `document.body`; returns element and cleanup fn | [22 — Testing](./23-testing.md) |
| `waitFor` | `waitFor(predicate, timeout?)` | Polls predicate until truthy or timeout; flushes microtasks between checks | [22 — Testing](./23-testing.md) |
| `fireEvent` | `fireEvent(element, eventName, detail?)` | Dispatches a `CustomEvent` with `bubbles: true, composed: true` | [22 — Testing](./23-testing.md) |

---

## HTTP Client Options (`@core/http`)

| Option | Type | Default | Description |
|---|---|---|---|
| `retries` | `number` | `0` | Max retry attempts after first failure |
| `backoff` | `'exponential' or 'linear'` | *(none)* | Delay growth strategy between retries |
| `retryDelay` | `number` (ms) | `200` | Base delay for first retry |

These options extend the standard `RequestInit` config and are available on all `http.get`, `http.post`, `http.put`, and `http.delete` calls. See [08 — APIs and Async](./09-apis-and-async.md) for full usage.

---

## Built-in Components

For built-in `nc-*` components and their attributes/events, use:

- [10 — Core Components](./10-core-components.md) for the broad component catalog
- [29 — Error Boundaries](./29-error-boundaries.md) for `<nc-error-boundary>` details

---

## How to Use This Chapter Fast

1. Find the API name in the tables.
2. Copy the signature as your starting point.
3. Jump to the linked deep-dive chapter for full usage, patterns, and caveats.

---

## Done Criteria

- [ ] All NativeCoreJS APIs used in Projects 1–4 are found in this reference chapter.
- [ ] Any undocumented helpers are listed in a `// TODO: document` comment in your project's README.
- [ ] Path aliases in `tsconfig.json` match every `@core/*` import listed in the Router APIs table.
- [ ] `tsc --noEmit` in all four projects still passes after your review.

---

**Back:** [Chapter 30 — Migration Guide](./30-migration-guide.md)  
**Next:** [Chapter 33 — SSG and Static Deployment](./33-ssg-and-deployment.md)