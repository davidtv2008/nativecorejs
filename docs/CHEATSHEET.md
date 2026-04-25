# NativeCoreJS Cheat Sheet

A single-page reference for the 20 most common patterns.

---

## Reactive State

```typescript
import { useState, computed, effect, batch } from 'nativecorejs';

// Primitive state
const count = useState(0);
count.value;                       // read
count.value = 5;                   // set by assignment
count.set(prev => prev + 1);       // set by updater

// Derived state (recomputes when dependencies change)
const doubled = computed(() => count.value * 2);

// Side effect (re-runs when dependencies change)
const stop = effect(() => {
    console.log(doubled.value);
});
stop(); // dispose

// Batch multiple state writes → single notification pass
batch(() => {
    count.value = 10;
    // other state writes…
});
```

---

## Controllers

```typescript
import { effect, trackEvents } from 'nativecorejs';

export async function pageController(params, state, loaderData) {
    const disposers: Array<() => void> = [];
    const events = trackEvents();

    const items = useState([]);
    disposers.push(effect(() => render(items.value)));

    events.on(document, 'click', '#btn', () => { items.value = []; });

    return () => {
        disposers.forEach(d => d());
        events.cleanup();
    };
}
```

---

## Routing

### `routes.ts` — declaring routes

```typescript
import { createLazyController } from '@core/lazyController.js';
import router from '@core/router.js';
import type { Router } from '@core/router.js';

const lazy = createLazyController(import.meta.url);

export function registerRoutes(r: Router): void {
    // @group:public
    r.group({}, (r) => {
        r.register('/', 'src/views/public/home.html',
            lazy('homeController', '../controllers/home.controller.js'))
         .cache({ ttl: 300, revalidate: true });

        r.register('/login', 'src/views/public/login.html',
            lazy('loginController', '../controllers/login.controller.js'));
    });

    // @group:protected
    r.group({ middleware: ['auth'] }, (r) => {
        r.register('/dashboard', 'src/views/protected/dashboard.html',
            lazy('dashboardController', '../controllers/dashboard.controller.js'))
         .cache({ ttl: 30, revalidate: true });

        r.register('/tasks/:id', 'src/views/protected/task.html',
            lazy('taskController', '../controllers/task.controller.js'));

        // With data loader (runs before controller)
        r.register('/profile', 'src/views/protected/profile.html',
            lazy('profileController', '../controllers/profile.controller.js'), {
                loader: async (params, signal) => fetchData('/api/me', { signal })
            });
    });
}

export const protectedRoutes = router.getPathsForMiddleware('auth');
```

`r.group({ middleware: ['auth'] }, cb)` stamps every route in the callback with the `auth` tag. Groups can be nested; inner groups inherit ancestor tags. The optional `prefix` option prepends a path segment to every route in the group.

### `app.ts` — middleware and boot

```typescript
import { createMiddleware } from '@core/router.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { registerRoutes } from './routes/routes.js';

// @middleware — registered middleware (auto-updated by make:middleware)
router.use(createMiddleware('auth', authMiddleware)); // only fires on 'auth'-tagged routes
router.use(loggingMiddleware);                        // no tag → fires on every navigation

registerRoutes(router);
router.start(); // call exactly once
```

`createMiddleware('tag', fn)` wraps `fn` so it **only runs** when the navigated route carries that tag (checked via `router.getTagsForPath()`).

### Middleware signature

```typescript
// src/middleware/auth.middleware.ts
import type { RouteMatch } from '@core/router.js';

export async function authMiddleware(route: RouteMatch, state?: unknown): Promise<boolean> {
    if (!auth.isAuthenticated()) {
        router.replace('/login', { redirect: route.path }); // return false to cancel
        return false;
    }
    return true; // allow navigation
}
```

Return `true` to allow, `false` to cancel. Async middleware is supported — return `Promise<boolean>`.

### Navigation helpers

```typescript
router.navigate('/path');
router.navigate('/items/42', { from: 'list' }); // state passed to middleware + controller
router.replace('/login');                        // swap history entry (no back-stack entry)
router.back();

router.prefetch('/dashboard');
router.bustCache('/dashboard');

const route = router.getCurrentRoute(); // { path, params, config }
```

---

## Components

```typescript
import { Component, defineComponent } from 'nativecorejs';

class MyCard extends Component {
    static useShadowDOM = true;
    static get observedAttributes() { return ['title', 'variant']; }

    template(): string {
        const title = this.getAttribute('title') ?? '';
        return `<div class="card">${escapeHTML(title)}</div>`;
    }

    onMount(): void {
        this.on('click', '.card', () => this.emitEvent('nc-click'));
    }

    onAttributeChange(name: string, oldValue: string | null, newValue: string | null): void {
        if (name === 'title') this.render();
    }

    onUnmount(): void {
        // event listeners added via this.on() are auto-removed
    }
}

defineComponent('my-card', MyCard);
```

---

## Bind API (Fine-Grained Updates)

```typescript
// In a Component subclass — all subscriptions auto-disposed on unmount:
const loading = useState(false);
const label   = useState('Submit');

this.bind(loading, '#spinner', 'hidden');    // elem.hidden = loading.value
this.bind(label, '#btn');                    // elem.textContent = label.value
this.bindAttr(loading, '#btn', 'disabled'); // elem.setAttribute('disabled', ...)

// Multiple bindings at once
this.bindAll({
    '.stats__total':     this.total,
    '.stats__completed': this.completed,
});

// Two-way binding (State ↔ DOM) — auto-detects checkbox/radio
this.model(this.username, 'input[name="username"]');        // input event + .value
this.model(this.agreed, 'input[type="checkbox"]');          // change event + .checked
this.model(this.rating, 'nc-rating', { event: 'nc-change', prop: 'value' }); // custom
```

---

## Wires — Declarative Controller Bindings

Standalone utilities from `@core-utils/wires.js` that auto-register cleanup via the Page Cleanup Registry (no return value needed):

```typescript
import { wireInputs, wireContents, wireAttributes } from '@core-utils/wires.js';

export async function tasksController() {
    // Two-way: [wire-input="key"] ↔ State<T>
    const { title, done } = wireInputs();

    // Display: [wire-content="key"] → State<string> (textContent)
    const { heading, count } = wireContents();

    // Attribute: [wire-attribute="key:attr-name"] → State<string> (setAttribute)
    const { status, busy } = wireAttributes();

    heading.value = 'My Tasks';         // → <h1 wire-content="heading"> updates
    count.value   = String(items.length);
    status.value  = 'active';           // → setAttribute('data-status', 'active')
    // title.value reflects user input two-way
}
```

**HTML counterparts:**

```html
<div data-view="tasks">
    <h1     wire-content="heading">Loading…</h1>
    <span   wire-content="count">0</span>
    <input  wire-input="title"  placeholder="Task title" />
    <input  wire-input="done"   type="checkbox" />
    <div    wire-attribute="status:data-status">…</div>
    <button wire-attribute="busy:aria-busy">Save</button>
</div>
```

Optional overrides (non-standard events or an explicit root):

```typescript
const { rating } = wireInputs({ overrides: { rating: { event: 'nc-change', prop: 'value' } } });
const { title }  = wireInputs({ root: document.querySelector('[data-view="tasks"]') });
```

---

## Wires — In Components (`this.wire*()`)

Same pattern inside a `Component` subclass — state property names must match attribute values:

```typescript
class TaskForm extends Component {
    static useShadowDOM = true;

    title  = useState('');
    done   = useState(false);
    status = useState('pending');
    count  = computed(() => `${this.items.value.length} tasks`);

    template() {
        return `
            <input  wire-input="title" />
            <input  wire-input="done" type="checkbox" />
            <span   wire-content="count">0 tasks</span>
            <article wire-attribute="status:data-status">…</article>
        `;
    }

    onMount() {
        this.wireInputs();      // wires all [wire-input] to same-named State<T> props
        this.wireContents();    // wires all [wire-content] to same-named state/computed props
        this.wireAttributes();  // wires all [wire-attribute] to same-named state props
    }
}
```

All subscriptions are auto-disposed on unmount. Call each `wire*()` method **once from `onMount()`** only.

---

## Global Stores

```typescript
// src/stores/task.store.ts
import { useState } from 'nativecorejs';

export const taskStore = useState({
    items: [] as Task[],
    filter: 'all' as 'all' | 'open' | 'done'
});

// In any controller or component:
import { taskStore } from '@stores/task.store.js';

taskStore.value.items;                                    // read
taskStore.value = { ...taskStore.value, filter: 'open' }; // write
taskStore.watch(state => render(state.items));             // subscribe
```

---

## API Calls and Caching

```typescript
import api from '@services/api.service.js';

// Plain fetch (no cache)
const data = await api.get<User[]>('/api/users');
await api.post('/api/users', { name: 'Alice' });
await api.put('/api/users/1', { name: 'Alice B.' });
await api.delete('/api/users/1');

// Cached GET (ttl in seconds, tag-based invalidation)
const tasks = await api.getCached<Task[]>('/api/tasks', {
    ttl: 60,
    tags: ['tasks']
});

// Invalidate cache by tag after a mutation
await api.post('/api/tasks', newTask);
api.invalidateTags(['tasks']);
```

---

## Events

```typescript
import { trackEvents, on, delegate } from 'nativecorejs';

// Inside a controller (auto-cleans up on navigation)
const events = trackEvents();
events.on(window, 'resize', handler);
events.on(document, 'keydown', '#modal', handler);  // delegated
// cleanup fires automatically via Page Cleanup Registry

// Standalone (manual cleanup)
const off = on(button, 'click', handler);
off(); // remove listener
```

---

## Custom Events

```typescript
// Emit from inside a Component — bubbles + composed are true by default
this.emitEvent('nc-task-complete', { taskId: 42 });
// Override defaults only when needed
this.emitEvent('nc-task-complete', { taskId: 42 }, { composed: false });

// Listen anywhere in the tree
document.addEventListener('nc-task-complete', (e: CustomEvent<{ taskId: number }>) => {
    console.log(e.detail.taskId);
});
```

> **Naming convention:** use `nc-{component}-{action}` for custom element events (e.g. `nc-modal-open`, `nc-table-row-click`). Form-input elements (`nc-input`, `nc-select`, etc.) keep the standard `change` / `input` names.

---

## Built-in Component Events

Quick reference for events emitted by the framework's built-in `nc-*` elements.

| Component | Event | Detail |
|---|---|---|
| `nc-accordion-item` | `nc-accordion-toggle` | `{ open: boolean }` |
| `nc-alert` | `nc-alert-dismiss` | `{}` |
| `nc-animation` | `nc-animation-start` / `nc-animation-finish` / `nc-animation-cancel` | `{}` |
| `nc-bottom-nav` | `nc-bottom-nav-change` | `{ value: string }` |
| `nc-canvas` | `nc-canvas-ready` | `{ canvas, ctx }` |
| `nc-canvas` | `nc-canvas-draw-start` / `nc-canvas-draw-move` | `{ x: number, y: number }` |
| `nc-canvas` | `nc-canvas-draw-end` | `{ dataURL: string }` |
| `nc-canvas` | `nc-canvas-clear` | `{}` |
| `nc-chip` | `nc-chip-dismiss` | `{}` |
| `nc-collapsible` | `nc-collapsible-toggle` | `{ open: boolean }` |
| `nc-collapsible` | `nc-collapsible-open` / `nc-collapsible-close` | `{}` |
| `nc-copy-button` | `nc-copy-button-copy` | `{ value: string }` |
| `nc-copy-button` | `nc-copy-button-error` | `{ error: unknown }` |
| `nc-drawer` | `nc-drawer-open` / `nc-drawer-close` | `{}` |
| `nc-dropdown` | `nc-dropdown-open` / `nc-dropdown-close` | `{}` |
| `nc-dropdown` | `nc-dropdown-select` | `{ value: string, label: string }` |
| `nc-menu` | `nc-menu-select` | `{ item: HTMLElement, label: string }` |
| `nc-modal` | `nc-modal-open` / `nc-modal-close` | `{}` |
| `nc-nav-item` | `nc-nav-item-click` | `{ href: string }` |
| `nc-pagination` | `nc-pagination-change` | `{ page: number }` |
| `nc-popover` | `nc-popover-open` / `nc-popover-close` | `{}` |
| `nc-splash` | `nc-splash-complete` | `{}` |
| `nc-stepper` | `nc-stepper-change` | `{ step: number, prev: number }` |
| `nc-table` | `nc-table-sort` | `{ key: string, direction: 'asc' \| 'desc' }` |
| `nc-table` | `nc-table-row-click` | `{ row: object, index: number }` |
| `nc-tabs` | `nc-tab-change` | `{ index: number, label: string \| null }` |
| **Form inputs** | `change` | component-specific `{ value, name }` |
| **Form inputs** | `input` | `{ value: string, name: string }` |

Form inputs that keep standard event names: `nc-input`, `nc-checkbox`, `nc-radio`, `nc-select`, `nc-textarea`, `nc-slider`, `nc-number-input`, `nc-otp-input`, `nc-switch`, `nc-rating`, `nc-date-picker`, `nc-time-picker`, `nc-color-picker`, `nc-rich-text`, `nc-file-upload`, `nc-autocomplete`.

---

## Auth Service

```typescript
import auth from '@services/auth.service.js';

auth.isAuthenticated();             // boolean
auth.getUser();                     // User | null
auth.getToken();                    // string | null
await auth.login(email, password);  // fetches token, stores user
auth.logout();                      // clears session, emits 'auth-change'

window.addEventListener('auth-change', () => updateUI());
```

---

## Slots and Composition

```html
<!-- In a component template (Shadow DOM) -->
<slot></slot>                         <!-- default slot -->
<slot name="header"></slot>           <!-- named slot -->

<!-- In HTML usage -->
<my-card>
    <h2 slot="header">Title</h2>
    <p>Default slot content</p>
</my-card>
```

---

## Accessibility Utilities

```typescript
import { trapFocus, announce, roving } from 'nativecorejs';

trapFocus(modalEl);           // trap Tab/Shift+Tab inside el
trapFocus(null);              // release trap

announce('3 results found');  // polite aria-live announcement
announce('Error!', 'assertive');

const release = roving(listEl, '[role=option]'); // arrow-key roving tabindex
release(); // restore original tabindexes
```

---

## Error Boundaries

```html
<nc-error-boundary fallback="Something went wrong" show-details>
    <my-widget></my-widget>
</nc-error-boundary>
```

```typescript
// Catch async errors manually
const boundary = document.querySelector('nc-error-boundary');
try {
    await riskyOperation();
} catch (err) {
    boundary?.catchError(err);
}
```

---

## CLI Generators

```bash
npm run make:component <name>         # src/components/ui/<name>.ts
npm run make:view <path>              # src/views/<path>.html + optional controller
npm run make:controller <name>        # src/controllers/<name>.controller.ts
npm run make:store <name>             # src/stores/<name>.store.ts
npm run make:middleware <name>        # src/middleware/<name>.middleware.ts + wires app.ts
npm run remove:component <name>       # removes component + registry entry
npm run remove:view <path>            # removes view + controller + route entry
```

---

## Build Commands

```bash
npm run dev          # TypeScript watch + dev server + HMR
npm run build        # production build → _deploy/
npm run build:ssg    # pre-render public routes → _deploy/<route>/index.html
npm run build:full   # build + build:ssg (recommended for deployment)
npm test             # Vitest unit tests
npm run lint         # ESLint + HTMLHint
npm run typecheck    # tsc --noEmit
```

---

See the full [ebook](./ebook/README.md) for deep-dive explanations of every pattern above.
