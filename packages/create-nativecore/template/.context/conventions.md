# NativeCore Framework Conventions

## When NOT to Create a Component

Custom `nc-*` components add overhead (Shadow DOM, lazy loading, JS bundle). Use plain HTML when:
- It is a static layout container (use `<div>`, `<section>`, `<article>`)
- It has no interactivity or reactive state
- It will only be used once on a single page
- A native element (`<button>`, `<a>`, `<input>`) already does the job

Reserve components for things that are **reusable**, **interactive**, or **stateful**.

Examples:
- Comparison card on home page → plain `<div class="comparison-card">`, not `<nc-card>`
- Page hero section → plain `<section class="hero">`, not `<nc-container>`
- A submit button used once → plain `<button>`, not `<nc-button>`
- A reusable data table used in 5 views → `<nc-table>` is appropriate

---

## File Naming

| Artifact         | Convention                         | Location                              |
|------------------|------------------------------------|---------------------------------------|
| UI Component     | kebab-case.ts (hyphen required)    | `src/components/ui/`                  |
| Core Component   | kebab-case.ts                      | `src/components/core/`                |
| Controller       | kebab-case.controller.ts           | `src/controllers/`                    |
| View             | kebab-case.html                    | `src/views/public/` or `protected/`  |
| Service          | kebab-case.service.ts              | `src/services/`                       |
| Utility          | camelCase.ts                       | `src/utils/`                          |
| Store            | camelCaseStore.ts                  | `src/stores/`                         |

Examples:
- `user-card.ts` → compiled to `dist/src/components/ui/user-card.js`
- `dashboard.controller.ts` → function named `dashboardController`

---

## Component Convention

```typescript
import { Component, defineComponent } from '@core/component.js';
import { useState, computed } from '@core/state.js';
import type { State, ComputedState } from '@core/state.js';

export class MyComponent extends Component {
    static useShadowDOM = true; // REQUIRED on all UI components

    count: State<number>;
    doubled: ComputedState<number>;
    private _unwatchCount?: () => void;

    constructor() {
        super();
        this.count = useState(0);
        this.doubled = computed(() => this.count.value * 2);
    }

    template() {
        return `
            <style>
                .container { padding: 1rem; }
            </style>
            <div class="container">
                <span id="display">${this.count.value}</span>
                <button class="increment-btn">Increment</button>
            </div>
        `;
    }

    onMount() {
        // Event delegation on shadowRoot — reliable across re-renders
        this.shadowRoot.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).matches('.increment-btn')) {
                this.count.value++;
            }
        });

        // Option A: declarative bind (auto-cleaned on disconnect)
        this.bind(this.count, '#display', 'textContent');

        // Option B: manual watch + cleanup
        this._unwatchCount = this.count.watch(val => {
            this.$('#display')!.textContent = String(val);
        });
    }

    onUnmount() {
        this._unwatchCount?.();    // Unsubscribe state watcher
        this.doubled.dispose();    // Release computed dependency subscriptions
    }
}

defineComponent('my-component', MyComponent);
```

### Component API

```typescript
// Scoped queries (use these instead of document.querySelector in components)
this.$<HTMLButtonElement>('.btn')         // shadowRoot.querySelector shorthand
this.$$<HTMLLIElement>('.item')          // shadowRoot.querySelectorAll shorthand

// Declarative reactive bindings (auto-cleanup on disconnect — no manual unsubscribe needed)
this.bind(state, '#selector')                          // updates textContent by default
this.bind(state, '#selector', 'innerHTML')             // update any property
this.bindAttr(state, '#selector', 'disabled')          // update attribute
this.bindAll({ '#name': nameState, '#age': ageState }) // batch multiple bindings

// State helpers
this.setState({ count: 1 })   // merge partial state + trigger re-render
this.patchState({ count: 1 }) // merge partial state — no re-render
this.getState()               // snapshot of current state object
```

---

## Controller Convention

```typescript
import { trackEvents, trackSubscriptions } from '@core-utils/events.js';
import { html } from '@core-utils/templates.js';
import api from '@services/api.service.js';
import { store } from '@stores/appStore.js';

export async function myPageController(
    params: Record<string, string> = {},
    _state?: any,
    loaderData?: unknown
): Promise<() => void> {
    const events = trackEvents();
    const subs = trackSubscriptions();

    const data = await api.get('/endpoint');

    document.getElementById('container')!.innerHTML = html`
        <h1>Title</h1>
        <ul id="list"></ul>
        <button id="action-btn">Action</button>
    `;

    // All DOM events through trackEvents
    events.onClick('#action-btn', handleAction);
    events.onInput('#search', handleSearch);
    events.delegate('#list', 'click', '.list-item', handleItemClick);
    events.on('#form', 'submit', handleSubmit);

    // All state watchers through trackSubscriptions
    subs.watch(store.isLoading.watch(loading => {
        document.getElementById('action-btn')!.toggleAttribute('disabled', loading);
    }));

    // Always return cleanup
    return () => {
        events.cleanup();
        subs.cleanup();
    };

    function handleAction() { /* logic */ }
    function handleSearch(e: Event) { /* logic */ }
    function handleItemClick(e: Event, target: Element) { /* logic */ }
    function handleSubmit(e: Event) { e.preventDefault(); }
}
```

---

## Import Conventions

```typescript
// Always include .js extension — ES module requirement
import { Component } from '@core/component.js';      // correct
import { Component } from '@core/component';          // wrong

// Type imports use 'import type'
import type { State, ComputedState } from '@core/state.js';
import type { User } from '@stores/appStore.js';

// Never import controllers at top level — use lazyController() in routes
// Never import component files — register them in components/registry.ts
// lazyController is always defined locally in routes.ts — never imported from @core/router.js
```

---

## State Conventions

```typescript
// Local state (in components and controllers)
const count = useState(0);
count.value++;                               // direct set
count.set(prev => prev + 1);                 // functional update
const unsub = count.watch(val => { ... });   // subscribe; call unsub() to stop

// Computed — MUST call .dispose() in onUnmount
const total = computed(() => price.value * qty.value);
total.value;          // read-only
total.dispose();      // call in onUnmount

// effect — runs immediately, re-runs when dependencies change
const stop = effect(() => {
    document.title = `Items: ${count.value}`;
});
stop(); // dispose

// batch — multiple writes fire each subscriber only once
batch(() => {
    store.user.value = fetchedUser;
    store.isLoading.value = false;
});

// useSignal — SolidJS-style tuple
const [getCount, setCount] = useSignal(0);
getCount();       // read
setCount(1);      // write

// createStates — batch create
const { name, email } = createStates({ name: '', email: '' });

// Global state
import { store } from '@stores/appStore.js';
store.user.value = userData;
store.setLoading(true);
store.setError('Something went wrong');
store.clearError();
```

---

## Naming Patterns

```typescript
// Variables: camelCase
const userName = 'Alice';
const isLoading = true;

// Classes: PascalCase
class UserCard extends Component {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;

// Event handlers: handle prefix
function handleClick(e: Event) {}
function handleSubmit(e: SubmitEvent) {}

// Controllers: camelCase + Controller
export async function dashboardController() {}

// Stores: camelCase + Store
export const appStore = createStore('app', { user: null });
```

---

## CSS Naming (inside Shadow DOM)

```css
/* Match the component name as block */
.user-card { }
.user-card__title { }
.user-card--highlighted { }

/* Use CSS custom properties from global scope */
.container {
    padding: var(--spacing-md);
    color: var(--text-primary);
    border: 1px solid var(--border);
}
```

---

## Route Conventions

```typescript
// src/routes/routes.ts
import { bustCache } from '@core-utils/cacheBuster.js';
import type { ControllerFunction } from '@core/router.js';

// Always define locally in routes.ts — NOT imported from router
function lazyController(name: string, path: string): ControllerFunction {
    return async (...args: any[]) => {
        const m = await import(bustCache(path));
        return m[name](...args);
    };
}

export function registerRoutes(router: any): void {
    router
        // Cache static pages
        .register('/', 'src/views/public/home.html',
            lazyController('homeController', '../controllers/home.controller.js'))
        .cache({ ttl: 300, revalidate: true })

        // Never cache auth pages
        .register('/login', 'src/views/public/login.html',
            lazyController('loginController', '../controllers/login.controller.js'))

        // Protected pages with short cache
        .register('/dashboard', 'src/views/protected/dashboard.html',
            lazyController('dashboardController', '../controllers/dashboard.controller.js'))
        .cache({ ttl: 30, revalidate: true })

        // Dynamic route param
        .register('/user/:id', 'src/views/protected/user-detail.html',
            lazyController('userDetailController', '../controllers/user-detail.controller.js'));
}

export const protectedRoutes = ['/dashboard', '/user'];
```

---

## HTML Templates (Views)

- View HTML files contain **markup only** — NO `<style>` or `<script>` tags
- CSS belongs in `src/styles/` (app-wide) or inside component `template()` (Shadow DOM)
- JS/TS logic belongs in the corresponding controller
- Shadow DOM component styles are the only exception — they are inside the `.ts` file

---

## API Conventions

```typescript
// api.service.ts wraps fetch with auth headers
await api.get('/endpoint');
await api.post('/endpoint', { body });
await api.put('/endpoint', { body });
await api.delete('/endpoint');

// Endpoint constants
import { API_ENDPOINTS } from '@constants/apiEndpoints.js';
await api.get(API_ENDPOINTS.USERS);

// Use html`` tagged template to escape user-sourced data in rendered HTML
import { html } from '@core-utils/templates.js';
container.innerHTML = html`<p>${userData.name}</p>`;  // auto-escaped

// Use sanitizeURL for user-provided URLs
import { sanitizeURL } from '@core-utils/templates.js';
link.href = sanitizeURL(userProvidedUrl); // blocks javascript:, vbscript:
```

---

## Testing Conventions

- Unit tests in `tests/unit/`
- File name: `*.test.ts`
- Run: `npm test`
- Test pure utilities, formatters, validators
- Component tests use jsdom + `mountComponent` from `nativecorejs/testing`

```typescript
import { mountComponent, waitFor, fireEvent } from 'nativecorejs/testing';

const { element, cleanup } = mountComponent('nc-button', { label: 'Click' });
await waitFor(() => element.shadowRoot !== null);
fireEvent(element, 'click');
cleanup();
```
