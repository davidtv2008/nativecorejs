# AI Assistant Context - NativeCore Framework

## What is NativeCore
NativeCore is a zero-dependency TypeScript SPA framework. It uses native Web Components with
Shadow DOM, a custom History API router with middleware, reactive signals (useState/computed/effect),
lazy loading for both components and controllers, JWT auth with a single-shell architecture, and
Puppeteer-based bot HTML pre-rendering for SEO. No JSX, no virtual DOM.

## Critical Rule
NEVER use emojis in code, console.logs, comments, or documentation.

---

## 1. TypeScript & Import Rules

- Source in `src/**/*.ts` and `.nativecore/**/*.ts`, compiled to `dist/**/*.js`
- ALWAYS add `.js` to all imports (ES modules requirement — TypeScript compiles `.ts` to `.js`)
- Use path aliases for cross-cutting imports; always add `.js` extension

```typescript
// Correct
import { Component, defineComponent } from '@core/component.js';
import { useState, computed, effect, batch } from '@core/state.js';
import { trackEvents, trackSubscriptions } from '@core-utils/events.js';
import { html, css, escapeHtml, trusted, sanitizeURL } from '@core-utils/templates.js';
import { dom } from '@core-utils/dom.js';
import api from '@services/api.service.js';
import { store } from '@stores/appStore.js';
import type { State, ComputedState } from '@core/state.js';

// Wrong — missing .js
import { Component } from '@core/component';
```

Available aliases:
- `@core/` → `.nativecore/core/`
- `@core-utils/` → `.nativecore/utils/`
- `@core-types/` → `.nativecore/types/`
- `@dev/` → `.nativecore/dev/`
- `@components/` → `src/components/`
- `@services/` → `src/services/`
- `@utils/` → `src/utils/`
- `@stores/` → `src/stores/`
- `@middleware/` → `src/middleware/`
- `@config/` → `src/config/`
- `@routes/` → `src/routes/`
- `@types/` → `src/types/`
- `@constants/` → `src/constants/`

`@core-utils/` is for framework utilities (dom, events, templates, cacheBuster).
`@dev/` is for dev-only tooling (hmr, denc-tools, component overlays) — loaded dynamically in `initDevTools()` and excluded from production builds.
`@utils/` is for app-specific utilities only.

---

## 2. Component Pattern

All UI components MUST:
- Extend `Component` from `@core/component.js`
- Set `static useShadowDOM = true`
- Register with `defineComponent('tag-name', ClassName)`
- Use event delegation on `shadowRoot` (not direct element listeners)
- Clean up watchers in `onUnmount`, dispose computeds in `onUnmount`

```typescript
import { Component, defineComponent } from '@core/component.js';
import { useState, computed } from '@core/state.js';
import type { State, ComputedState } from '@core/state.js';

export class UserCard extends Component {
    static useShadowDOM = true; // REQUIRED

    name: State<string>;
    greeting: ComputedState<string>;
    private _unwatchName?: () => void;

    constructor() {
        super();
        this.name = useState('');
        this.greeting = computed(() => `Hello, ${this.name.value}`);
    }

    template() {
        return `
            <style>
                .card { padding: 1rem; border: 1px solid var(--border); }
            </style>
            <div class="card">
                <p id="greeting">${this.greeting.value}</p>
                <input class="name-input" type="text" placeholder="Enter name" />
            </div>
        `;
    }

    onMount() {
        // Event delegation on shadowRoot — survives re-renders
        this.shadowRoot.addEventListener('input', (e) => {
            if ((e.target as HTMLElement).matches('.name-input')) {
                this.name.value = (e.target as HTMLInputElement).value;
            }
        });

        // bind() — declarative reactive binding: auto-updates element property when state changes
        this.bind(this.name, '#greeting', 'textContent');
        // Or store the unsubscribe reference manually for cleanup
        this._unwatchName = this.name.watch(val => {
            this.$('#greeting')!.textContent = `Hello, ${val}`;
        });
    }

    onUnmount() {
        this._unwatchName?.();     // Unsubscribe watcher
        this.greeting.dispose();   // Release computed dependency subscriptions
    }
}

defineComponent('user-card', UserCard);
```

### Component API Quick Reference

```typescript
// Query helpers (scoped to shadowRoot when useShadowDOM = true)
this.$<HTMLButtonElement>('.btn')       // querySelector shorthand
this.$$<HTMLLIElement>('.item')        // querySelectorAll shorthand

// Declarative wire binding (call once from onMount — auto-cleaned on disconnect)
this.wireContents();    // wires all [wire-content="key"] elements to this[key].value → textContent
this.wireInputs();      // wires all [wire-input="key"] elements to this[key] two-way
this.wireAttributes();  // wires all [wire-attribute="key:attr"] elements to this[key].value → attr

// Declarative reactive bindings (auto-cleanup on disconnect)
this.bind(state, '#selector', 'textContent')   // update element property
this.bindAttr(state, '#selector', 'disabled')  // update attribute
this.bindAll({ '#name': nameState, '#age': ageState }) // batch bindings

// State
this.setState({ count: 1 })   // merge + re-render
this.patchState({ count: 1 }) // merge without re-render
this.getState()               // read current state object
```

Component tag names MUST contain a hyphen (Web Component spec).

---

## 3. Controller Pattern

Controllers handle page-level logic. Every controller that touches the DOM or watches state
MUST return a cleanup function. Use `trackEvents()` + `trackSubscriptions()`.

```typescript
import { trackEvents, trackSubscriptions } from '@core-utils/events.js';
import { html } from '@core-utils/templates.js';
import api from '@services/api.service.js';
import { store } from '@stores/appStore.js';

export async function dashboardController(
    params: Record<string, string> = {},
    state?: any,
    loaderData?: unknown
): Promise<() => void> {
    const events = trackEvents();
    const subs = trackSubscriptions();

    // Load data (or use loaderData if a route loader was defined)
    const data = await api.get('/dashboard');

    // Render — use html`` tagged template to auto-escape user content
    document.getElementById('content')!.innerHTML = html`
        <h1>Dashboard</h1>
        <ul id="items">
            ${data.items.map((i: any) => html`<li class="item" data-id="${i.id}">${i.name}</li>`).join('')}
        </ul>
        <button id="refresh-btn">Refresh</button>
    `;

    // All event bindings go through trackEvents
    events.onClick('#refresh-btn', handleRefresh);
    events.delegate('#items', 'click', '.item', handleItemClick);
    events.on('#search-input', 'input', handleSearch);

    // All state watchers go through trackSubscriptions
    subs.watch(store.isLoading.watch(loading => {
        document.getElementById('refresh-btn')!.toggleAttribute('disabled', loading);
    }));

    // Always return cleanup
    return () => {
        events.cleanup();
        subs.cleanup();
    };

    function handleRefresh() { /* ... */ }
    function handleItemClick(e: Event, target: Element) { /* ... */ }
    function handleSearch(e: Event) { /* ... */ }
}
```

Controllers:
- Are named `camelCaseController`
- Are exported from `src/controllers/index.ts`
- Are lazy-loaded via `lazyController()` in `routes.ts` — never imported directly
- Receive `(params, state, loaderData)` — `loaderData` is populated when route has a `loader`

---

## 3b. Declarative View Binding (wires)

For scaffolded views, use the unified `wires.js` barrel instead of raw DOM manipulation.
Always import from the barrel — never from individual files.

```typescript
import { wireContents, wireInputs, wireAttributes } from '@core-utils/wires.js';

export async function tasksController(params = {}) {
    const events = trackEvents();
    void params;

    // wire-content="key" → state → el.textContent (auto-cleaned on nav)
    const { title, summary } = wireContents();
    title.value   = auth.getUser()?.name ? 'Tasks — ' + auth.getUser().name : 'Tasks';
    summary.value = 'Your controller is wired up and ready.';

    // wire-attribute="key:attr-name" → state → el.setAttribute (auto-cleaned on nav)
    const { cardStatus } = wireAttributes();
    cardStatus.value = 'ready';

    // wire-input="key" → state ↔ input value two-way (auto-cleaned on nav)
    const { email } = wireInputs();
    email.value = '';

    events.onClick(dom.view('tasks').actionSelector('primary-action'), () => {
        cardStatus.value = 'active';
    });
}
```

```html
<!-- View HTML — markup only, no scripts -->
<div class="tasks-page" data-view="tasks">
    <h1 wire-content="title">Tasks</h1>
    <p  wire-content="summary">Loading...</p>
    <article wire-attribute="cardStatus:data-status"></article>
    <nc-input type="email" wire-input="email" placeholder="you@example.com"></nc-input>
</div>
```

| Attribute                     | Utility            | Direction             |
|-------------------------------|--------------------|-----------------------|
| `wire-content="key"`          | `wireContents()`   | state → textContent   |
| `wire-input="key"`            | `wireInputs()`     | state ↔ input value   |
| `wire-attribute="key:attr"`   | `wireAttributes()` | state → setAttribute  |

All three auto-register cleanup with `PageCleanupRegistry` — no `return () => { ... }` needed for wire utilities. You still return cleanup for `trackEvents()` / `trackSubscriptions()`.

In components, the same methods are on `this`:
```typescript
onMount() {
    this.wireContents();    // [wire-content] → same-named state properties
    this.wireInputs();      // [wire-input]   → same-named state properties
    this.wireAttributes();  // [wire-attribute] → same-named state properties
}
```

```typescript
// src/routes/routes.ts
import { bustCache } from '@core-utils/cacheBuster.js';
import type { ControllerFunction } from '@core/router.js';

// lazyController is always defined locally — NOT imported from an external module
function lazyController(name: string, path: string): ControllerFunction {
    return async (...args: any[]) => {
        const m = await import(bustCache(path));
        return m[name](...args);
    };
}

export function registerRoutes(router: any): void {
    router
        // Cache static pages for 5 min, revalidate in background when stale
        .register('/', 'src/views/public/home.html',
            lazyController('homeController', '../controllers/home.controller.js'))
        .cache({ ttl: 300, revalidate: true })

        // Never cache auth pages
        .register('/login', 'src/views/public/login.html',
            lazyController('loginController', '../controllers/login.controller.js'))

        // Protected pages — short cache
        .register('/dashboard', 'src/views/protected/dashboard.html',
            lazyController('dashboardController', '../controllers/dashboard.controller.js'))
        .cache({ ttl: 30, revalidate: true })

        // Dynamic route params (accessed via params.id in controller)
        .register('/user/:id', 'src/views/protected/user-detail.html',
            lazyController('userDetailController', '../controllers/user-detail.controller.js'));
}

export const protectedRoutes = ['/dashboard', '/user'];
```

Router advanced options:
```typescript
// Route with a data loader (runs before controller, result passed as loaderData)
.register('/posts', 'src/views/public/posts.html',
    lazyController('postsController', '../controllers/posts.controller.js'),
    {
        loader: async (params, signal) => {
            const res = await fetch('/api/posts', { signal });
            return res.json();
        }
    }
)

// Programmatic navigation
router.navigate('/dashboard');
router.replace('/login');
router.back();
router.reload();
router.prefetch('/dashboard'); // Warm the HTML cache

// Router events
window.addEventListener('pageloaded', (e) => { /* route rendered */ });
window.addEventListener('nc-route-loading', (e) => { /* loader started */ });
window.addEventListener('nc-route-loaded', (e) => { /* loader finished */ });
```

---

## 5. Component Registry

```typescript
// src/components/registry.ts
componentRegistry.register('user-card', './ui/user-card.js');
// All custom UI components use the './ui/' prefix
// Framework nc-* components are registered in frameworkRegistry.ts — do not touch
// Components are loaded lazily when their tag appears in the DOM
// Do NOT import component files directly
```

---

## 6. State Management

```typescript
// useState — mutable reactive value
const count = useState(0);
count.value = 5;               // direct set
count.set(n => n + 1);         // functional update
const unsub = count.watch(v => console.log(v)); // subscribe; call unsub() to stop

// computed — derived read-only value; auto-tracks dependencies
const doubled = computed(() => count.value * 2);
doubled.value;                 // read-only
doubled.watch(v => ...);       // subscribe to changes
doubled.dispose();             // MUST call in onUnmount to release subscriptions

// effect — side-effect that re-runs when dependencies change
const stop = effect(() => {
    document.title = `Count: ${count.value}`;
    return () => { /* optional cleanup per-run */ };
});
stop(); // dispose the effect

// useSignal — tuple-style (SolidJS pattern)
const [getCount, setCount] = useSignal(0);
getCount();           // read
setCount(5);          // write
setCount(n => n + 1); // functional update

// batch — defer notifications; each subscriber fires at most once
batch(() => {
    store.user.value = fetchedUser;
    store.isLoading.value = false;
    store.error.value = null;
});

// createStates — create multiple states from an object
const { name, age, role } = createStates({ name: '', age: 0, role: 'user' });

// createStore / getStore — named global store registry (accessible by MetricsPanel)
export const cartStore = createStore('cart', { items: [] });
const cart = getStore<CartState>('cart'); // retrieve by name from anywhere
```

---

## 7. Template Utilities (@core-utils/templates.js)

```typescript
import { html, css, trusted, escapeHtml, sanitizeURL } from '@core-utils/templates.js';

// html`` — tagged template; auto-escapes all interpolated values (XSS safe)
const markup = html`<p>${userInput}</p>`;

// trusted() — opt out of escaping for developer-owned markup inside html``
// NEVER pass user input to trusted() — only strings you construct yourself
const safe = html`<ul>${trusted(itemsHtml)}</ul>`;

// escapeHtml(value) — standalone escape for use inside plain template literals
const item = `<li>${escapeHtml(userLabel)}</li>`;

// css`` — tagged template for CSS strings (no-op at runtime, enables syntax highlighting)
const styles = css`.card { color: ${brandColor}; }`;

// sanitizeURL(url) — blocks javascript:, vbscript:, dangerous data: URIs
const href = sanitizeURL(userProvidedUrl);
```

---

## 8. DOM Utilities (@core-utils/dom.js)

```typescript
import { dom } from '@core-utils/dom.js';
// Also available globally as window.dom

dom.query('#btn')                          // null-safe querySelector
dom.queryAll('.items')                     // querySelectorAll
dom.$('#el')                              // alias for query
dom.$$('.items')                          // alias for queryAll
dom.within(shadowRoot, '.child')          // scoped query in parent or ShadowRoot
dom.withinAll(parent, '.children')        // scoped querySelectorAll
dom.create('div', { class: 'card' }, 'Hello') // create element with attrs + children
dom.addClass('#el', 'active')
dom.removeClass('#el', 'active')
dom.toggleClass('#el', 'open', force?)
dom.show('#el')                           // removes display:none
dom.hide('#el')                           // sets display:none
const off = dom.listen('#btn', 'click', handler, options?); // returns unsubscribe
off();
```

---

## 9. Generator Commands

```bash
npm run make:component <name>    # Creates src/components/ui/<name>.ts + registers in registry.ts
npm run make:view <name>         # Creates view HTML + optional controller + updates routes.ts
npm run remove:component <name>  # Removes component + cleans registry
npm run remove:view <name>       # Removes view + controller + cleans routes
npm run compile                  # TypeScript compile with path alias resolution
npm run build                    # Production build
npm run build:bots               # Generate bot-optimized pre-rendered HTML for SEO
```

---

## 10. Accessibility Utilities (nativecorejs/a11y)

```typescript
import { trapFocus, announce, roving } from 'nativecorejs/a11y';
// Or inside the framework package:
import { trapFocus, announce, roving } from '@core/../src/a11y/index.js';

// trapFocus — trap keyboard Tab/Shift+Tab inside a container (e.g. modal)
const release = trapFocus(modalElement);
release(); // restore focus to previously focused element

// announce — ARIA live region announcement for screen readers
announce('Item saved successfully', 'polite');   // or 'assertive'

// roving — roving tabindex for keyboard navigation in a list/toolbar
const stop = roving(containerElement, '[role="option"]');
stop(); // remove roving behaviour
```

---

## 11. Testing Utilities (nativecorejs/testing)

```typescript
import { mountComponent, waitFor, fireEvent } from 'nativecorejs/testing';

const { element, cleanup } = mountComponent('nc-button', { label: 'Click me' });
await waitFor(() => element.shadowRoot !== null);
fireEvent(element, 'click');
cleanup();
```

---

## 12. Plugin API

```typescript
import { registerPlugin, unregisterPlugin, listPlugins } from 'nativecorejs';

registerPlugin({
    name: 'my-analytics',
    onInstall() {
        // called once on registration
        return () => { /* cleanup when unregistered */ };
    },
    onNavigate({ path, params, match }) {
        analytics.page(path, params);
    },
    onNavigated({ path, params, match }) {
        // called after controller runs + pageloaded fires
    },
});

unregisterPlugin('my-analytics');
listPlugins(); // ['my-analytics', ...]
```

---

## 13. PageCleanupRegistry (auto safety net)

`effect()`, `computed()`, and `trackEvents()` all auto-register with the PageCleanupRegistry.
The router flushes all registered cleanups before mounting the next route — even if a controller
forgets to return a cleanup function. For app-level primitives that must survive navigations:

```typescript
import { pausePageCleanupCollection, resumePageCleanupCollection } from '@core/pageCleanupRegistry.js';

pausePageCleanupCollection();
// create long-lived effects/trackers here (e.g. in app.ts)
resumePageCleanupCollection();
```

---

## 14. GPU Animation Utilities

```typescript
import {
    animate, fadeIn, fadeOut, scaleIn, slideIn,
    setGPUTransform, prepareForAnimation, cleanupAnimation,
    createAnimationLoop, rafThrottle, addPassiveListener, GPUAnimation
} from 'nativecorejs';

// Animate via Web Animations API (GPU accelerated)
await animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });

// Convenience wrappers
await fadeIn(el, 200);
await fadeOut(el, 200);
await scaleIn(el, 300);
await slideIn(el, 'left', 300);

// GPU transform via translate3d (forces GPU layer)
setGPUTransform(el, x, y, z, scale, rotate);

// Prepare element with will-change + contain hints
prepareForAnimation(el, ['transform', 'opacity']);
cleanupAnimation(el); // remove hints after animation

// RAF loop with delta time
const stop = createAnimationLoop((deltaMs) => { /* update */ });
stop();

// Throttle handler to once per animation frame
const throttled = rafThrottle((e) => handleScroll(e));
```

---

## Common Mistakes to Avoid

- Writing `import M from './my.controller.js'` — use `lazyController()` in routes.ts
- Using `document.querySelector` inside a component — use `this.$()` or `this.shadowRoot.querySelector()`
- Forgetting `computed.dispose()` in `onUnmount` — memory leak
- Not returning cleanup from a controller — listeners accumulate across navigations
- Writing `import { X } from '@core/component'` without `.js` — module not found at runtime
- Adding UI component to `registry.ts` with wrong prefix — all UI components use `'./ui/'`
- Importing `lazyController` from router — it is always defined locally in `routes.ts`
- Adding logic to `app.ts` — routes go in `src/routes/routes.ts`
- Putting `<style>` or `<script>` tags inside view HTML files — markup only in views


### Local (in components)
```typescript
this.count = useState(0);
this.count.value++;                              // Direct assignment
this.count.set(prev => prev + 1);               // Functional update
const unsub = this.count.watch(val => {...});   // Returns () => void unsubscribe
```

### Computed (derived, read-only)
```typescript
this.total = computed(() => this.price.value * this.qty.value);
// Auto-tracks dependencies, recomputes when they change
// MUST call .dispose() in onUnmount to prevent memory leaks
```

### Global (stores)
```typescript
import { store } from '@stores/appStore.js';
// appStore: user, isLoading, error
// Methods: setUser(), setLoading(), setError(), clearError()

import { uiStore } from '@stores/uiStore.js';
// uiStore: sidebarOpen, theme, notifications
// Methods: toggleSidebar(), setTheme(), addNotification(), removeNotification(id)
```

---

## 7. DOM Utilities (.nativecore/utils/dom.ts)

```typescript
import dom from '@core-utils/dom.js';

// Query
dom.query('#btn')                              // document.querySelector (typed)
dom.queryAll('.items')                         // document.querySelectorAll (typed)
dom.within(parentEl, '.child')                 // scoped querySelector on a parent or shadowRoot
dom.withinAll(parentEl, '.items')              // scoped querySelectorAll

// Create
dom.create('button', { class: 'btn', type: 'button' }, 'Click me')

// Classes
dom.addClass('#el', 'active', 'visible')
dom.removeClass('#el', 'active')
dom.toggleClass('#el', 'open')

// Visibility
dom.show('#el')    // removes display:none
dom.hide('#el')    // sets display:none

// Events — listen() returns an unsubscribe function
const off = dom.listen('#btn', 'click', handler);
off(); // removes the listener
```

---

## 8. Event & Subscription Tracking (.nativecore/utils/events.ts)

For controllers, use these instead of raw `addEventListener`:

```typescript
import { trackEvents, trackSubscriptions } from '@core-utils/events.js';

// trackEvents — tracks DOM event listeners
const events = trackEvents();
events.on(selector, eventName, handler)   // generic event — selector or Element
events.add(selector, eventName, handler)  // alias for on() — same signature
events.onClick(selector, handler)
events.onChange(selector, handler)
events.onInput(selector, handler)
events.onSubmit(selector, handler)
events.delegate(containerSelector, eventName, targetSelector, handler)
events.cleanup()   // removes all registered listeners at once

// trackSubscriptions — tracks state watcher unsubscribes
const subs = trackSubscriptions();
subs.watch(someState.watch(val => doSomething(val)));
subs.cleanup()   // calls all unsubscribes at once
```

---

## 9. Project File Structure

```
.nativecore/                         # Framework internals — DO NOT MODIFY
├── core/                            # Framework primitives
│   ├── component.ts                 # Base Component class
│   ├── router.ts                    # SPA router
│   ├── state.ts                     # useState, computed
│   ├── lazyComponents.ts            # Component lazy loading
│   └── http.ts                      # Fetch wrapper
├── utils/                           # Framework utilities (import via @core-utils/)
│   ├── cacheBuster.ts               # Cache busting
│   ├── dom.ts                       # DOM helpers
│   ├── events.ts                    # trackEvents, trackSubscriptions
│   └── templates.ts                 # html``, css``, escapeHtml, trusted, sanitizeURL
└── types/
    └── global.d.ts                  # Window, HTMLElementTagNameMap augmentations

src/
├── app.ts                           # Entry point — minimal, no logic
├── routes/
│   └── routes.ts                    # All route definitions
├── components/
│   ├── core/                        # Layout + all nc-* components
│   ├── ui/                          # Your custom nc-* components
│   ├── registry.ts                  # Lazy registry for custom components
│   ├── frameworkRegistry.ts         # Framework nc-* registrations (auto-managed)
│   ├── appRegistry.ts               # App layout component registrations
│   └── preloadRegistry.ts           # Critical components preloaded on startup
├── controllers/
│   ├── index.ts                     # Named re-exports for all controllers
│   └── *.controller.ts
├── views/
│   ├── public/                      # HTML templates, no auth
│   └── protected/                   # HTML templates, auth required
├── services/
│   ├── api.service.ts
│   ├── auth.service.ts
│   └── logger.service.ts
├── stores/
│   ├── appStore.ts                  # user, isLoading, error
│   └── uiStore.ts                   # sidebarOpen, theme, notifications
├── middleware/
│   └── auth.middleware.ts
├── utils/                           # App-specific utilities only
│   ├── form.ts                      # useForm helper
│   ├── formatters.ts                # formatCurrency, formatDate, formatNumber, etc.
│   ├── helpers.ts                   # debounce, throttle, generateId, etc.
│   ├── markdown.ts                  # renderMarkdown, renderMarkdownToc
│   └── validation.ts                # validateForm, isValidEmail, etc.
├── constants/
│   ├── apiEndpoints.ts
│   ├── routePaths.ts
│   ├── storageKeys.ts
│   └── errorMessages.ts
├── types/
│   └── global.d.ts                  # App-specific type augmentations
└── styles/
```

---

## 10. Generator Commands

```bash
npm run make:component <name>   # Creates src/components/ui/<name>.ts + registers in registry.ts
npm run make:view <name>        # Creates HTML view + optional controller + updates routes.ts
npm run remove:component <name> # Removes component + registry entry
npm run remove:view <name>      # Removes view + controller + route
npm run compile                 # Compile TypeScript
npm run build                   # Production build
npm run build:bots              # Generate pre-rendered HTML for SEO bots
```

Always use generators when available instead of creating files manually.

---

## 11. Naming Conventions

| Artifact         | Convention                       | Example                             |
|------------------|----------------------------------|-------------------------------------|
| Component file   | kebab-case.ts (hyphen required)  | `user-card.ts`                      |
| Component class  | PascalCase                       | `UserCard`                          |
| Component tag    | kebab-case (hyphen required)     | `<user-card>`                       |
| Controller file  | kebab-case.controller.ts         | `dashboard.controller.ts`           |
| Controller func  | camelCase + Controller           | `dashboardController`               |
| View file        | kebab-case.html                  | `user-profile.html`                 |
| Service file     | kebab-case.service.ts            | `auth.service.ts`                   |
| Utility file     | camelCase.ts                     | `formatters.ts`                     |
| Event handlers   | handle prefix                    | `handleClick`, `handleSubmit`       |

---

## 12. Auth Pattern

- JWT tokens stored in `sessionStorage` (auto-cleared on browser close)
- Single HTML shell: `index.html`
- `authMiddleware` guards protected routes before loading controllers
- `auth.isAuthenticated()` — boolean
- `auth.getUser()` — returns current user or null
- `auth.logout()` — clears tokens and redirects

---

## 13. DO / DON'T

**DO:**
- Return cleanup from every controller
- Use `trackEvents()` + `trackSubscriptions()` in controllers
- Call `computed.dispose()` in `onUnmount`
- Store `.watch()` unsubscribes and call them in `onUnmount`
- Use event delegation on `this.shadowRoot` in components
- Add `.js` to all imports
- Use generators to create files

**DON'T:**
- Import controllers directly — always use `lazyController()`
- Use `document.querySelector` inside components (use `this.shadowRoot.querySelector` or `this.$()`)
- Add logic or routes to `app.ts`
- Forget `static useShadowDOM = true`
- Skip cleanup — leaks accumulate across navigations
- Use emojis

---

## 14. Common Debugging

| Symptom                         | Likely Cause                                          |
|---------------------------------|-------------------------------------------------------|
| Module not found                | Missing `.js` extension on import                     |
| Component not rendering         | Not registered in `components/registry.ts`            |
| Route not found                 | Missing route in `src/routes/routes.ts`               |
| State not updating DOM          | Using `.set()` but not watching — call `.watch()`     |
| Old controller still running    | Controller did not return a cleanup function          |
| Computed keeps recomputing      | Mutating state inside computed — computed must be pure|
| Memory growing across pages     | `computed.dispose()` not called in `onUnmount`        |

## Quick Overview
NativeCore (formerly NFBS) is a TypeScript-based SPA framework using:
- **Web Components** (Custom Elements + Shadow DOM)
- **Signals** (reactive state: useState, computed)
- **TypeScript** (100% migrated, compiles to dist/)
- **Zero runtime dependencies** (~15-20KB framework core)
- **Built-in**: Router, Auth, State Management, 40+ UI components
- **Path aliases** resolved by esbuild at compile time (`@core/`, `@components/`, etc.)
- **Bot-optimized SEO** (pre-rendered HTML without SSR)

## Critical Information for AI Assistants

### 1. TypeScript Setup with Path Aliases
- **Source**: `src/**/*.ts`
- **Output**: `dist/**/*.js`
- **Imports**: MUST use `.js` extension (ES modules requirement)
- **Path Aliases**: Use sparingly for core imports
  ```typescript
  // ✅ Correct - Path alias
  import { Component } from '@core/component.js';
  import api from '@services/api.service.js';
  
  // ✅ Also correct - Relative path
  import { Component } from '../core/component.js';
  
  // ❌ Wrong - Missing .js extension
  import { Component } from '@core/component';
  ```

### 2. Component Pattern (MUST use Shadow DOM)
```typescript
import { Component, defineComponent } from '@core/component.js';
import { useState } from '@core/state.js';
import type { State } from '@core/state.js';

export class MyComponent extends Component {
    // REQUIRED: Enable Shadow DOM for encapsulation
    static useShadowDOM = true;
    
    // 1. Declare properties with types
    count: State<number>;
    
    constructor() {
        super();
        // 2. Initialize state
        this.count = useState(0);
    }
    
    template() {
        // 3. Return HTML with Shadow DOM styles
        return `
            <style>
                /* Scoped to this component - won't leak out */
                .container { padding: 1rem; }
            </style>
            <div class="container">
                <div id="count">${this.count.value}</div>
                <button class="increment-btn">Increment</button>
            </div>
        `;
    }
    
    onMount() {
        // 4. Use event delegation on shadowRoot (more reliable)
        this.shadowRoot.addEventListener('click', (e) => {
            if (e.target.matches('.increment-btn')) {
                this.count.value++;
            }
        });
        
        // 5. Watch state changes
        this.count.watch(val => {
            this.shadowRoot.querySelector('#count').textContent = val;
        });
    }
}

defineComponent('my-component', MyComponent);
```
    onMount() {
        // 4. Use event delegation on shadowRoot
        this.shadowRoot.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).matches('.btn')) {
                this.count.value++;
            }
        });
        
        // 5. Watch state changes
        this.count.watch(val => {
            this.$('#display').textContent = val.toString();
        });
    }
}

defineComponent('my-component', MyComponent);
```

### 3. State Management

**Local State:**
```typescript
const count = useState(0);
count.value++;                    // Update
count.set(prev => prev + 1);      // Functional update
count.watch(val => {...});        // Watch changes
```

**Computed Values:**
```typescript
const total = computed(() => 
    price.value * quantity.value
);
// Automatically recomputes when dependencies change
```

**Global State:**
```typescript
import { store } from './stores/appStore.js';

store.user.value = {...};
store.incrementCount(10);
```

### 4. Controller Pattern
```typescript
export async function myController(params?: Record<string, string>): Promise<(() => void) | void> {
    // Get DOM elements with type assertions
    const element = document.getElementById('id') as HTMLElement;
    
    // Load data
    const data = await api.get('/endpoint');
    
    // Render
    element.innerHTML = `...`;
    
    // Event listeners
    const button = element.querySelector('button') as HTMLButtonElement;
    const handleClick = () => { ... };
    button?.addEventListener('click', handleClick);
    
    // Return cleanup function
    return () => {
        button?.removeEventListener('click', handleClick);
    };
}
```

### 5. Routing
```typescript
// routes.ts
router
    .register('/', 'src/views/public/home.html')
    .register('/about', 'src/views/public/about.html')
    .register('/dashboard', 'src/views/protected/dashboard.html', 
        lazyController('dashboardController', '../controllers/dashboard.controller.js'));

export const protectedRoutes = ['/dashboard'];
```

### 6. Component Registration
```typescript
// components/index.ts
componentRegistry.register('my-component', './my-component.js');
// Loads from dist/components/my-component.js when component appears in DOM
```

### 7. File Structure
```
src/
├── app.ts                    # Entry point
├── core/                     # Framework primitives
│   ├── component.ts         # Base Component class
│   ├── router.ts            # SPA router
│   ├── state.ts             # useState + computed
│   ├── http.ts              # Fetch wrapper
│   └── lazyComponents.ts    # Lazy loading
├── components/              # Web Components
│   ├── index.ts            # Component registry
│   └── *.ts                # Individual components
├── controllers/             # Page controllers
│   ├── index.ts            # Exports
│   └── *.controller.ts     # Individual controllers
├── views/                   # HTML templates
│   ├── public/             # No auth
│   └── protected/          # Requires auth
├── services/               # Business logic
├── stores/                 # Global state
├── middleware/             # Route middleware
├── utils/                  # Helpers
└── constants/              # App constants

dist/                       # Compiled JavaScript
```

### 8. Common Patterns

**Event Delegation (Recommended):**
```typescript
onMount() {
    // ✅ Survives re-renders
    this.shadowRoot.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.matches('.btn')) { ... }
    });
}
```

**Direct Listeners (Avoid):**
```typescript
onMount() {
    // ❌ Can break on re-render
    this.$('.btn').addEventListener('click', () => { ... });
}
```

**Type Assertions:**
```typescript
// DOM elements
const btn = this.$('#btn') as HTMLButtonElement;
const input = document.getElementById('name') as HTMLInputElement;

// Event targets
(e.target as HTMLInputElement).value
(e.target as HTMLElement).matches('.class')
```

### 9. Development Workflow
```bash
npm start        # Auto-compiles TS, starts dev server with HMR
npm run compile  # Compile TypeScript only
npm run build    # Lint + typecheck + compile
npm test         # Run tests with Vitest
```

### 10. Important Conventions

**DO:**
- ✅ Declare component properties with types
- ✅ Use `.js` extension in imports
- ✅ Use event delegation on shadowRoot
- ✅ Type all function parameters
- ✅ Use `type` imports for interfaces
- ✅ Load components from `dist/components/`
- ✅ Routes point to `src/views/`
- ✅ Scroll to top on navigation (built-in)
- ✅ Show 404 page for missing routes

**DON'T:**
- ❌ Import controllers directly
- ❌ Import components in views
- ❌ Use direct element listeners
- ❌ Forget cleanup functions in controllers
- ❌ Use `any` type (use proper types)
- ❌ Forget `.js` in imports

### 11. Key Features

- **No Build Step for HTML** - Views served directly
- **TypeScript Compilation** - Required for TS files
- **Hot Module Reload** - Changes reload automatically  
- **Shadow DOM** - True CSS encapsulation
- **Lazy Loading** - Components/controllers on-demand
- **Auth Built-in** - JWT + protected routes
- **Signals** - Reactive state with auto-tracking
- **Computed** - Derived state with dependency tracking

### 12. Component Library (Built-in)
- `nc-button` - 8 variants with loading state
- `nc-input` - Form input with validation
- `nc-card` - Card container with slots
- `nc-modal` - Modal dialog with backdrop
- `nc-alert` - Toast/alert notifications
- `app-header` - Main navigation
- `app-footer` - Footer
- `loading-spinner` - Loading indicator

### 13. When Helping Users

**Creating Components:**
```bash
npm run make:component <name>
# Auto-creates file + registers in index.ts
```

**Creating Views:**
```bash
npm run make:view <name>
# Prompts for protected/public, creates controller, updates routes
```

**Debugging:**
- Check `dist/` for compiled output
- Browser loads from `dist/`, not `src/`
- Components load from `dist/components/`
- Views load from `src/views/`

**Common Issues:**
1. Import without `.js` → Module not found
2. Component not loading → Check registry in `components/index.ts`
3. Route not working → Check `config/routes.ts` and view path
4. State not updating → Make sure using `.value` or `.set()`
5. TypeScript errors → Missing type declarations on properties

### 14. Framework Strengths
- **Small**: ~15KB total (vs React 40KB+)
- **Simple**: Just JavaScript/TypeScript, no JSX
- **Complete**: Router + Auth + State built-in
- **Fast**: No virtual DOM, native Web Components
- **Type-safe**: Full TypeScript support
- **Standards-based**: Web Components, ES modules

This context should help AI assistants understand the framework architecture and provide accurate assistance!

