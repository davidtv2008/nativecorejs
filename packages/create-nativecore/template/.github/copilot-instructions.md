# GitHub Copilot Instructions - NativeCore Framework

## CRITICAL: No Emojis
NEVER use emojis in code, console.logs, comments, or documentation. Plain text only.

## CRITICAL: Views Contain Markup Only
NEVER add `<style>` or `<script>` tags inside view HTML files (`src/views/**/*.html`).
- HTML views contain markup only
- CSS belongs in `src/styles/` (app-wide) or inside component `template()` (Shadow DOM)
- JS/TS logic belongs in the corresponding controller
- Shadow DOM component styles are the only exception — they live inside the component `.ts` file

## CRITICAL: lazyController is Local
`lazyController` is ALWAYS defined locally in `src/routes/routes.ts`. It is NOT imported from the
router or from any external module.

## Framework Context
NativeCore is a zero-dependency TypeScript SPA framework with:
- Web Components with Shadow DOM
- Lazy loading (controllers + components + HTML views)
- Reactive signals (useState, computed, effect, batch, useSignal)
- Custom router with middleware, per-route caching, prefetch, and route loaders
- JWT auth with single-shell architecture (one `index.html`)
- Bot-optimized SEO via Puppeteer pre-rendering
- GPU-accelerated animation utilities
- Plugin API for router lifecycle hooks
- A11y utilities (trapFocus, announce, roving)
- Testing utilities (mountComponent, waitFor, fireEvent)
- 60+ built-in nc-* components

---

## Quick Reference

### Generator Commands
```bash
npm run make:component <name>    # Create component in src/components/ui/ + register in registry.ts
npm run make:view <name>         # Create view HTML + optional controller + update routes.ts
npm run remove:component <name>  # Remove component + clean registry
npm run remove:view <name>       # Remove view + controller + clean routes
npm run compile                  # TypeScript compile with tsc-alias path resolution
npm run build                    # Production build
npm run build:bots               # Generate bot pre-rendered HTML for SEO
```

### Naming
- Components: `kebab-case` with hyphen (Web Component requirement)
- Controllers: `camelCaseController` function
- Views: `kebab-case.html`
- TypeScript files: `.ts` extension

### Critical File Locations
| What                  | Where                                       |
|-----------------------|---------------------------------------------|
| Entry point           | `src/app.ts` — keep minimal                 |
| Route definitions     | `src/routes/routes.ts`                      |
| Custom component reg  | `src/components/registry.ts`                |
| Framework nc-* reg    | `src/components/frameworkRegistry.ts` (auto)|
| Controller exports    | `src/controllers/index.ts`                  |
| App HTML shell        | `index.html`                                |
| Framework core        | `.nativecore/core/` (do not modify)         |
| Framework utilities   | `.nativecore/utils/` (import via @core-utils/)|

### Path Aliases (always include `.js` extension)
```typescript
@core/         → .nativecore/core/
@core-utils/   → .nativecore/utils/
@core-types/   → .nativecore/types/
@dev/          → .nativecore/dev/       (dev tools only — excluded from prod build)
@components/   → src/components/
@services/     → src/services/
@utils/        → src/utils/
@stores/       → src/stores/
@middleware/   → src/middleware/
@config/       → src/config/
@routes/       → src/routes/
@types/        → src/types/
@constants/    → src/constants/
```

---

## Code Generation Rules

### New Component
1. Use generator: `npm run make:component <name>`
2. Hyphen required in tag name
3. Extend `Component` from `@core/component.js`
4. MUST set `static useShadowDOM = true`
5. Use `defineComponent()` to register
6. Auto-registered in `registry.ts` with `./ui/` prefix
7. Use event delegation on `shadowRoot`
8. Call `computed.dispose()` in `onUnmount`

### New View + Controller + Route
1. Use generator: `npm run make:view <name>`
2. Prompts for protected/public and whether to create a controller
3. Auto-updates `routes.ts`

### Manual: New Protected Route
1. Create view HTML in `src/views/protected/`
2. Create controller in `src/controllers/`
3. Export controller from `src/controllers/index.ts`
4. Add local `lazyController()` call in `src/routes/routes.ts`
5. Add path to `protectedRoutes` export in `routes.ts`

---

## Component Pattern (complete example)

```typescript
import { Component, defineComponent } from '@core/component.js';
import { useState, computed } from '@core/state.js';
import type { State, ComputedState } from '@core/state.js';

export class MyWidget extends Component {
    static useShadowDOM = true;

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
            <style>.widget { padding: 1rem; }</style>
            <div class="widget">
                <span id="val">${this.count.value}</span>
                <button class="inc-btn">+</button>
            </div>
        `;
    }

    onMount() {
        // Event delegation on shadowRoot
        this.shadowRoot.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).matches('.inc-btn')) {
                this.count.value++;
            }
        });

        // Option A: declarative bind (auto-cleanup on disconnect)
        this.bind(this.count, '#val');

        // Option B: manual watch
        this._unwatchCount = this.count.watch(val => {
            this.$('#val')!.textContent = String(val);
        });
    }

    onUnmount() {
        this._unwatchCount?.();
        this.doubled.dispose();
    }
}

defineComponent('my-widget', MyWidget);
```

---

## Controller Pattern

Every controller MUST return a cleanup function. Use `trackEvents` + `trackSubscriptions`.
Use `html` tagged template for rendering user-sourced content (auto-escapes values).

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

    document.getElementById('content')!.innerHTML = html`
        <h1>Page</h1>
        <ul id="list"></ul>
        <button id="save-btn">Save</button>
    `;

    events.onClick('#save-btn', handleSave);
    events.delegate('#list', 'click', '.item', handleItemClick);
    subs.watch(store.isLoading.watch(v => toggleSpinner(v)));

    return () => {
        events.cleanup();
        subs.cleanup();
    };

    function handleSave() {}
    function handleItemClick(e: Event, target: Element) {}
    function toggleSpinner(v: boolean) {}
}
```

---

## Routing Pattern

```typescript
// src/routes/routes.ts
import { bustCache } from '@core-utils/cacheBuster.js';
import type { ControllerFunction } from '@core/router.js';

// Always define locally — NOT imported from router
function lazyController(name: string, path: string): ControllerFunction {
    return async (...args: any[]) => {
        const m = await import(bustCache(path));
        return m[name](...args);
    };
}

export function registerRoutes(router: any): void {
    router
        .register('/', 'src/views/public/home.html',
            lazyController('homeController', '../controllers/home.controller.js'))
        .cache({ ttl: 300, revalidate: true })

        .register('/login', 'src/views/public/login.html',
            lazyController('loginController', '../controllers/login.controller.js'))

        .register('/dashboard', 'src/views/protected/dashboard.html',
            lazyController('dashboardController', '../controllers/dashboard.controller.js'))
        .cache({ ttl: 30, revalidate: true });
}

export const protectedRoutes = ['/dashboard'];
```

---

## State API Reference

```typescript
// useState
const x = useState(0);
x.value = 5;
x.set(prev => prev + 1);
const unsub = x.watch(val => {}); // call unsub() to stop

// computed
const y = computed(() => x.value * 2);
y.value;          // read-only
y.watch(cb);
y.dispose();      // MUST call to prevent memory leak

// effect — re-runs when dependencies change
const stop = effect(() => {
    document.title = `Count: ${x.value}`;
});
stop(); // dispose

// batch — fire each subscriber once for multiple writes
batch(() => {
    store.user.value = fetchedUser;
    store.isLoading.value = false;
});

// useSignal — SolidJS tuple style
const [getCount, setCount] = useSignal(0);
getCount(); setCount(1);

// createStates — batch create
const { name, age } = createStates({ name: '', age: 0 });

// stores (appStore)
store.user.value
store.isLoading.value
store.setUser(user)
store.setLoading(true)
store.setError('msg')
store.clearError()

// stores (uiStore)
uiStore.sidebarOpen.value
uiStore.toggleSidebar()
uiStore.setTheme('dark')
uiStore.addNotification({ id, message, type })
uiStore.removeNotification(id)
```

---

## Architecture Guidelines

### File Placement
- Controllers → `src/controllers/`
- Custom UI Components → `src/components/ui/`
- Core/Layout Components → `src/components/core/`
- Views → `src/views/public/` or `src/views/protected/`
- Middleware → `src/middleware/`
- App utilities → `src/utils/` (formatters, validation, form helpers)
- Framework utilities → `.nativecore/utils/` via `@core-utils/` (dom, events, templates)
- Framework core → `.nativecore/core/` (do not modify)
- Routes → `src/routes/routes.ts`

### Project Structure Summary
```
src/
├── app.ts                    # Entry point — boot sequence only
├── routes/routes.ts          # All route definitions
├── components/
│   ├── core/                 # Layout components
│   ├── ui/                   # Custom reusable components
│   ├── registry.ts           # Custom lazy registry — add your components here
│   ├── frameworkRegistry.ts  # nc-* framework registrations (auto-managed)
│   ├── appRegistry.ts        # App layout registrations
│   └── preloadRegistry.ts    # Critical components preloaded on startup
├── controllers/              # Page controllers (lazy loaded per route)
├── views/                    # HTML templates (public/ + protected/)
├── services/                 # api, auth, logger
├── stores/                   # appStore, uiStore
├── middleware/               # authMiddleware
├── utils/                    # App-specific helpers
├── constants/                # apiEndpoints, routePaths, storageKeys
├── types/global.d.ts
└── styles/
.nativecore/                  # Framework internals — DO NOT MODIFY
├── core/                     # component, router, state, lazyComponents, gpu-animation, pageCleanupRegistry
└── utils/                    # dom, events, templates, cacheBuster
```

---

## Common Mistakes to Avoid
- Missing `.js` in imports — `import { X } from '@core/component'` fails at runtime
- Importing controllers directly — use `lazyController()` in routes.ts
- Using `document.querySelector` in components — use `this.$()` or `this.shadowRoot.querySelector()`
- Forgetting `computed.dispose()` in `onUnmount` — memory leak
- Not returning cleanup from controller — listeners accumulate across navigations
- Adding `<style>` or `<script>` tags to view HTML files
- Adding logic to `app.ts` — routes go in `src/routes/routes.ts`
- Using emojis anywhere in code, logs, comments, or docs


## Quick Reference

### Commands
- `npm run make:component <name>` - Generate component in ui/ folder
- `npm run make:view <name>` - Generate view (with prompts)
- `npm run remove:component <name>` - Remove component
- `npm run remove:view <name>` - Remove view
- `npm run compile` - Compile TypeScript with path alias resolution
- `npm run build` - Build for production (prompts for bot HTML)
- `npm run build:bots` - Generate bot-optimized HTML for SEO

### Naming
- Components: `kebab-case-required` (must have hyphen)
- Controllers: `camelCaseController`
- Views: `kebab-case.html`
- TypeScript files: `.ts` extension

### Critical Files
- `src/app.ts` - Entry point (keep minimal!)
- `src/routes/routes.ts` - Route definitions
- `src/components/registry.ts` - Custom component lazy registry
- `src/controllers/index.ts` - Controller exports
- `index.html` - App HTML shell

### Path Aliases (use sparingly)
```typescript
import { Component } from '@core/component.js';
import { useState } from '@core/state.js';
import api from '@services/api.service.js';
import { store } from '@stores/appStore.js';
```

Available aliases: `@core/`, `@core-utils/`, `@core-types/`, `@components/`, `@services/`, `@utils/`, `@stores/`, `@middleware/`, `@types/`, `@config/`

### Lazy Loading Pattern

#### Controllers (routes.ts):
```typescript
.register('/path', 'views/pages/public/page.html', 
    lazyController('pageController', '../controllers/page.controller.js'))
```

#### Components (components/registry.ts):
```typescript
componentRegistry.register('my-component', './ui/my-component.js');
```
**Note:** All UI components are in `src/components/ui/` folder

## Code Generation Rules

### When creating components:
1. Use generator: `npm run make:component`
2. Must have hyphen in name
3. Extend `Component` class from `@core/component.js`
4. **MUST enable Shadow DOM:** `static useShadowDOM = true;`
5. Use `defineComponent()` to register
6. Auto-registered in `components/registry.ts` with `./ui/` prefix
7. Use event delegation on shadowRoot for reliability

### When creating views:
1. Use generator: `npm run make:view`
2. Prompts for protected/public
3. Prompts for controller
4. Auto-updates `routes.ts`
5. Auto-adds to protected routes if needed

### When creating controllers:
1. Export named function with "Controller" suffix
2. Export from `controllers/index.ts`
3. Use in routes with `lazyController()`
4. **Always return a cleanup function using `trackEvents` + `trackSubscriptions`**

## Cleanup Patterns

### Controller cleanup (ALWAYS do this)
Every controller that attaches events or watches state **must** return a cleanup function.
Use `trackEvents()` and `trackSubscriptions()` from `@core-utils/events.js`:

```typescript
import { trackEvents, trackSubscriptions } from '@core-utils/events.js';

export async function myPageController() {
    const events = trackEvents();
    const subs = trackSubscriptions();

    // Attach DOM events through trackEvents — all removed on cleanup
    events.onClick('#submit-btn', handleSubmit);
    events.delegate('#list', 'click', '.item', handleItemClick);

    // Watch reactive state through trackSubscriptions — all unsubscribed on cleanup
    subs.watch(store.isLoading.watch(loading => toggleSpinner(loading)));
    subs.watch(store.user.watch(user => renderUser(user)));

    return () => {
        events.cleanup();
        subs.cleanup();
    };
}
```

### Component state watcher cleanup
Store unsubscribe references in properties and call them in `onUnmount`:

```typescript
onMount() {
    this._unwatchCount = this.count.watch(val => {
        this.shadowRoot.querySelector('#count').textContent = val;
    });
}

onUnmount() {
    this._unwatchCount?.();
}
```

### computed() — dispose when done
`computed()` holds live subscriptions to all its dependency states. Call `.dispose()` when the
computed is no longer needed to prevent memory leaks:

```typescript
this.total = computed(() => this.subtotal.value + this.taxAmount.value);

onUnmount() {
    this.total.dispose();
}
```

## Architecture Guidelines

### Project Structure:
```
src/
├── components/
│   ├── core/              ← Layout components (app-header, app-sidebar)
│   ├── ui/                ← All nc-* reusable UI components
│   ├── registry.ts        ← Component lazy loading registry
│   └── preloadRegistry.ts ← Components to preload
├── controllers/           ← Route controllers
├── core/                  ← Framework core (router, component, signals)
├── services/              ← API, auth, logger services
├── stores/                ← Global state (appStore, uiStore)
├── utils/                 ← Helper functions
├── constants/             ← App constants (API endpoints, routes, etc.)
├── middleware/            ← Route middleware
├── config/                ← Configuration
│   └── routes.ts          ← Route definitions
├── types/                 ← TypeScript definitions
├── views/                 ← HTML view templates
│   ├── public/            ← Public routes
│   └── protected/         ← Protected routes
└── styles/                ← Global CSS
```

### File Placement:
- Controllers → `src/controllers/`
- Custom UI Components → `src/components/ui/`
- Core/Layout Components → `src/components/core/`
- Views → `src/views/public/` or `protected/`
- Middleware → `src/middleware/`
- App utilities → `src/utils/` (formatters, validation, form helpers, etc.)
- Framework utilities → `.nativecore/utils/` via `@core-utils/` (dom, events, templates)
- Framework core → `.nativecore/core/` (do not modify)
- Routes → `src/routes/routes.ts`

### Imports:
- Never import controllers at top level
- Use `lazyController()` in routes
- Components registered, not imported
- Use path aliases: `@core/`, `@services/`, etc.
- Always add `.js` extension to imports

### State:
- Local: `useState()` from `@core/state.js`
- Global: `store` from `@stores/appStore.js`
- Both use `.value` and `.watch()`

### Auth:
- Check: `auth.isAuthenticated()`
- User: `auth.getUser()`
- Tokens in `sessionStorage`
- Protected routes in `protectedRoutes` array in `src/routes/routes.ts`
- Single HTML shell: `index.html`

## Suggestions Priority

1. **Use generators first** - Don't manually create files
2. **Keep app.ts clean** - No routes, no logic
3. **Lazy load everything** - Except critical components
4. **Follow conventions** - Naming, structure, patterns
5. **Separation of concerns** - Controllers ≠ Components
6. **Enable Shadow DOM** - All UI components must have `static useShadowDOM = true`
7. **Don't over-engineer** - If a plain `div`, `section`, or `button` will do the job, use it. Custom components (`nc-*`) are for reusable, interactive, or stateful UI. Static layout boxes, page sections, and one-off containers should be plain HTML.

## Auto-complete Context

When suggesting:
- Route registration → Use `lazyController()`
- Component creation → Suggest `npm run make:component`
- View creation → Suggest `npm run make:view`
- State → Suggest signals pattern
- API calls → Use `api.service.ts`
- Auth → Use `auth.service.ts`

## Common Patterns

### Component with Shadow DOM (Required):
```typescript
import { Component, defineComponent } from '@core/component.js';
import { useState, computed } from '@core/state.js';

export class ShoppingCart extends Component {
    static useShadowDOM = true; // REQUIRED
    
    constructor() {
        super();
        this.items = useState([]);
        this.tax = useState(0.08);
        
        // Computed values automatically update when dependencies change
        this.subtotal = computed(() => 
            this.items.value.reduce((sum, item) => sum + item.price, 0)
        );
        this.taxAmount = computed(() => 
            this.subtotal.value * this.tax.value
        );
        this.total = computed(() => 
            this.subtotal.value + this.taxAmount.value
        );
    }
    
    template() {
        return `
            <style>
                .cart { padding: 1rem; }
            </style>
            <div class="cart">
                <div>Subtotal: $${this.subtotal.value.toFixed(2)}</div>
                <div>Tax: $${this.taxAmount.value.toFixed(2)}</div>
                <div>Total: $${this.total.value.toFixed(2)}</div>
            </div>
        `;
    }
    
    onMount() {
        // Watch computed values for side effects
        this.total.watch(val => {
            this.shadowRoot.querySelector('.total').textContent = `$${val.toFixed(2)}`;
        });
    }
}

defineComponent('shopping-cart', ShoppingCart);
```

### Component with Event Delegation (Recommended):
```typescript
import { Component, defineComponent } from '@core/component.js';
import { useState } from '@core/state.js';

export class MyComponent extends Component {
    static useShadowDOM = true; // REQUIRED
    
    constructor() {
        super();
        this.count = useState(0);
    }
    
    template() {
        return `
            <style>
                .container { padding: 1rem; }
                .button { padding: 0.5rem 1rem; }
            </style>
            <div class="container">
                <div id="count">${this.count.value}</div>
                <button class="increment-btn">Increment</button>
            </div>
        `;
    }
    
    onMount() {
        // Use event delegation on shadowRoot for reliability
        this.shadowRoot.addEventListener('click', (e) => {
            if (e.target.matches('.increment-btn')) {
                this.count.value++;
            }
        });
        
        // Watch state changes
        this.count.watch(val => {
            this.shadowRoot.querySelector('#count').textContent = val;
        });
    }
}

defineComponent('my-component', MyComponent);
```

### Controller with API:
```typescript
import { trackEvents, trackSubscriptions } from '@core-utils/events.js';
import api from '@services/api.service.js';

export async function myController() {
    const events = trackEvents();
    const subs = trackSubscriptions();

    const data = await api.get('/endpoint');
    // render logic
    events.onClick('#btn', handler);

    return () => {
        events.cleanup();
        subs.cleanup();
    };
}
```

### Protected Route:
```typescript
// In routes.ts
.register('/admin', 'views/pages/protected/admin.html',
    lazyController('adminController', '../controllers/admin.controller.js'))

// In protectedRoutes array
export const protectedRoutes = ['/dashboard', '/admin'];
```

Remember: This is vanilla JS with modern patterns. No JSX, no virtual DOM, just clean TypeScript + Web Components!


