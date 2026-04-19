# NativeCoreJS Cheat Sheet

A single-page reference for the 20 most common patterns.

---

## Reactive State

```typescript
import { useState, computed, effect, batch, useSignal } from 'nativecorejs';

// Primitive state
const [count, setCount] = useState(0);
count.value;                       // read
setCount(5);                       // set by value
setCount(prev => prev + 1);        // set by updater

// Derived state (recomputes when dependencies change)
const doubled = computed(() => count.value * 2);

// Side effect (re-runs when dependencies change)
const stop = effect(() => {
    console.log(doubled.value);
});
stop(); // dispose

// Batch multiple state writes → single notification pass
batch(() => {
    count.set(10);
    doubled; // reads are also fine inside batch
});

// Signal (alias for useState, sugar for single-value)
const signal = useSignal('hello');
signal.value;
signal.set('world');
```

---

## Controllers

```typescript
import { effect, trackEvents } from 'nativecorejs';

export async function pageController(params, state, loaderData) {
    const disposers: Array<() => void> = [];
    const events = trackEvents();

    const [items, setItems] = useState([]);
    disposers.push(effect(() => render(items.value)));

    events.on(document, 'click', '#btn', () => setItems([]));

    return () => {
        disposers.forEach(d => d());
        events.cleanup();
    };
}
```

---

## Routing

```typescript
import router from '@core/router.js';

// Register routes
router.register('/path', 'src/views/page.html', controller);
router.register('/items/:id', 'src/views/item.html', controller);
router.register('/docs/*', 'src/views/docs.html', controller);

// With cache policy
router.register('/home', 'src/views/home.html', controller)
      .cache({ ttl: 300, revalidate: true });

// With data loader (runs before controller)
router.register('/dashboard', 'src/views/dashboard.html', controller, {
    loader: async (params, signal) => fetchData('/api/me', { signal })
});

// Navigate
router.navigate('/path');
router.navigate('/items/42', { from: 'list' });
router.replace('/login');
router.back();

// Middleware (return false to cancel navigation)
router.use((route, state) => {
    if (route.path !== '/login' && !auth.isAuthenticated()) {
        router.replace('/login');
        return false;
    }
});

// Prefetch
router.prefetch('/dashboard');
router.bustCache('/dashboard');

// Current route
const route = router.getCurrentRoute();
// route.path, route.params, route.config
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

    onAttributeChange(name: string, _old: string | null, value: string | null): void {
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
// In a Component subclass:
const [loading, setLoading] = useState(false);
const [label, setLabel] = useState('Submit');

this.bind(loading, '#spinner', 'hidden');   // elem.hidden = loading.value
this.bind(label, '#btn');                   // elem.textContent = label.value
this.bindAttr(loading, '#btn', 'disabled'); // elem.setAttribute('disabled', ...)
```

---

## Global Stores

```typescript
import { createStore, getStore } from 'nativecorejs';

// Define (module-level, runs once)
export const taskStore = createStore('tasks', {
    items: [] as Task[],
    filter: 'all' as 'all' | 'open' | 'done'
});

// Consume anywhere
const store = getStore<typeof taskStore extends ReturnType<typeof createStore<infer T>> ? T : never>('tasks');
store.get().items;          // read all
store.set({ filter: 'open' });  // partial update
store.watch(state => render(state.items));
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
// Emit (inside a Component)
this.emitEvent('nc-task-complete', { taskId: 42 });
this.emitEvent('nc-task-complete', { taskId: 42 }, { composed: true, bubbles: true });

// Listen
document.addEventListener('nc-task-complete', (e: CustomEvent<{ taskId: number }>) => {
    console.log(e.detail.taskId);
});
```

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
