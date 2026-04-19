# Chapter 30 — Framework API Quick Reference

Use this chapter as a fast lookup for NativeCoreJS framework APIs. Each entry includes a short signature, a one-line purpose, and a link to the chapter that explains it in depth.

---

## Component Authoring APIs

| API | Signature | Purpose | Deep dive |
|---|---|---|---|
| `Component` | `class Component extends HTMLElement` | Base class for all NativeCoreJS components | [02 — First Component](./02-first-component.md) |
| `defineComponent` | `defineComponent(tagName: string, componentClass: CustomElementConstructor): void` | Registers a custom element safely | [02 — First Component](./02-first-component.md) |
| `template` | `template(): string` | Returns component HTML | [02 — First Component](./02-first-component.md) |
| `onMount` | `onMount(): void` | Runs after initial render | [02 — First Component](./02-first-component.md) |
| `onUnmount` | `onUnmount(): void` | Runs when component detaches for cleanup | [02 — First Component](./02-first-component.md) |
| `onAttributeChange` | `onAttributeChange(name: string, oldValue: string \| null, newValue: string \| null): void` | Handles observed attribute updates | [02 — First Component](./02-first-component.md) |
| `$` | `$<E extends Element = Element>(selector: string): E \| null` | Scoped single-element query | [02 — First Component](./02-first-component.md) |
| `$$` | `$$<E extends Element = Element>(selector: string): NodeListOf<E>` | Scoped multi-element query | [02 — First Component](./02-first-component.md) |
| `emitEvent` | `emitEvent<T>(eventName: string, detail?: T, options?: Partial<CustomEventInit<T>>): boolean` | Emits typed custom events | [11 — Advanced Patterns](./11-advanced-patterns.md) |

---

## Bind API (Fine-Grained Updates)

| API | Signature | Purpose | Deep dive |
|---|---|---|---|
| `bind` | `bind<T>(state: State<T> \| ComputedState<T>, selector: string, property?: string): void` | Binds reactive value to element property/text | [04 — The Bind API](./04-bind-api.md) |
| `bindAttr` | `bindAttr<T>(state: State<T> \| ComputedState<T>, selector: string, attributeName: string): void` | Binds reactive value to HTML attribute | [04 — The Bind API](./04-bind-api.md) |
| `bindAll` | `bindAll(bindings: Record<string, State<any> \| ComputedState<any>>): void` | Declares multiple `bind()` mappings at once | [04 — The Bind API](./04-bind-api.md) |
| `Component.on` | `on(event, handler)` / `on(event, selector, handler)` | Attaches direct or delegated listeners | [04 — The Bind API](./04-bind-api.md) |

---

## Reactive State APIs

| API | Signature | Purpose | Deep dive |
|---|---|---|---|
| `useState` | `useState<T>(initialValue: T): State<T>` | Creates reactive state object (`.value`, `.set`, `.watch`) | [03 — Reactive State](./03-reactive-state.md) |
| `useSignal` | `useSignal<T>(initialValue: T): [() => T, (value: T \| ((prev: T) => T)) => void]` | Tuple-style getter/setter state | [03 — Reactive State](./03-reactive-state.md) |
| `createStates` | `createStates<T extends Record<string, any>>(initialStates: T): { [K in keyof T]: State<T[K]> }` | Creates multiple states from one object | [03 — Reactive State](./03-reactive-state.md) |
| `computed` | `computed<T>(computeFn: () => T): ComputedState<T>` | Creates derived reactive values | [03 — Reactive State](./03-reactive-state.md) |
| `effect` | `effect(effectFn: () => void \| (() => void)): () => void` | Runs side effects with auto dependency tracking | [06 — Controllers](./06-controllers.md) |
| `batch` | `batch(fn: () => void): void` | Coalesces multiple state writes into one notification flush | [11 — Advanced Patterns](./11-advanced-patterns.md) |

---

## Router APIs

| API | Signature | Purpose | Deep dive |
|---|---|---|---|
| `Router` | `new Router()` | Creates SPA router instance | [05 — Views and Routing](./05-views-and-routing.md) |
| `register` | `register(path: string, htmlFile: string, controller?: ControllerFunction \| null, options?: Partial<RouteConfig>): this` | Registers route + optional controller/layout/cache config | [05 — Views and Routing](./05-views-and-routing.md) |
| `start` | `start(): void` | Boots routing from current URL | [05 — Views and Routing](./05-views-and-routing.md) |
| `navigate` | `navigate(path: string, state?: any): void` | Push-navigation within SPA | [05 — Views and Routing](./05-views-and-routing.md) |
| `replace` | `replace(path: string, state?: any): void` | Replaces current history entry | [16 — Middleware](./16-middleware.md) |
| `use` | `use(middleware: MiddlewareFunction): this` | Registers route middleware/guards | [16 — Middleware](./16-middleware.md) |
| `prefetch` | `prefetch(path: string): Promise<void>` | Warms route/layout HTML cache | [14 — Route Caching](./14-route-caching.md) |
| `cache` | `cache(policy: { ttl: number; revalidate?: boolean }): this` | Sets cache policy for the last registered route | [14 — Route Caching](./14-route-caching.md) |
| `bustCache` | `bustCache(path?: string): void` | Clears cached route HTML (path-specific or global) | [14 — Route Caching](./14-route-caching.md) |
| `getCurrentRoute` | `getCurrentRoute(): RouteMatch \| null` | Reads current route + params | [13 — Dynamic Routes](./13-dynamic-routes.md) |
| `reload` / `back` | `reload(): void` / `back(): void` | Reloads current route or navigates browser history back | [05 — Views and Routing](./05-views-and-routing.md) |

---

## Controller + Event Utility APIs

| API | Signature | Purpose | Deep dive |
|---|---|---|---|
| `trackEvents` | `trackEvents(): { on, onClick, onChange, onInput, onSubmit, delegate, cleanup }` | Tracks DOM listeners and cleans them in one call | [06 — Controllers](./06-controllers.md) |
| `on` | `on<T = Event>(selector: string, eventName: string, handler: (event: T) => void): () => void` | Adds selector-based listener and returns cleanup | [06 — Controllers](./06-controllers.md) |
| `delegate` | `delegate<T = Event>(containerSelector: string, eventName: string, targetSelector: string, handler: (event: T, target: Element) => void): () => void` | Delegated events for dynamic child nodes | [06 — Controllers](./06-controllers.md) |
| `trackSubscriptions` | `trackSubscriptions(): { watch(unsubscribe: () => void): void; cleanup(): void }` | Collects unsubscribe callbacks for one-shot cleanup | [06 — Controllers](./06-controllers.md) |

---

## HTML/CSS Template APIs

| API | Signature | Purpose | Deep dive |
|---|---|---|---|
| `html` | `html(strings: TemplateStringsArray, ...values: unknown[]): string` | Tagged template that escapes interpolations by default | [02 — First Component](./02-first-component.md) |
| `raw` | `raw(value: string)` | Marks trusted HTML to bypass escaping in `html` | [02 — First Component](./02-first-component.md) |
| `unsafeHTML` | `unsafeHTML(strings: TemplateStringsArray, ...values: unknown[]): string` | Raw template helper without escaping | [02 — First Component](./02-first-component.md) |
| `escapeHTML` | `escapeHTML(value: unknown): string` | Escapes string values for safe HTML output | [21 — Accessibility](./21-accessibility.md) |
| `sanitizeURL` | `sanitizeURL(url: string \| null \| undefined): string` | Blocks unsafe URL protocols before rendering links/src | [21 — Accessibility](./21-accessibility.md) |
| `css` | `css(strings: TemplateStringsArray, ...values: unknown[]): string` | Tagged CSS helper for readable style blocks | [19 — Styling and Theming](./19-styling-and-theming.md) |

---

## Lazy Loading + Cache Helpers

| API | Signature | Purpose | Deep dive |
|---|---|---|---|
| `componentRegistry.register` | `register(tagName: string, modulePath: string): void` | Registers lazy component module by tag name | [05 — Views and Routing](./05-views-and-routing.md) |
| `initLazyComponents` | `initLazyComponents(): Promise<void>` | Scans DOM and starts lazy-component observer | [05 — Views and Routing](./05-views-and-routing.md) |
| `bustCache` (utils) | `bustCache(url: string): string` | Adds cache-busting query parameter to URL | [12 — Production](./12-production.md) |
| `importWithBust` | `importWithBust(modulePath: string): Promise<any>` | Dynamically imports local module with cache busting + safety checks | [12 — Production](./12-production.md) |

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

**Back:** [Chapter 29 — Error Boundaries](./29-error-boundaries.md)  
**Next:** [Ebook Index](./README.md)
