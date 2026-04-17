# AI Assistant Context - NativeCore Framework

## What is NativeCore
NativeCore is a zero-dependency TypeScript SPA framework (~15KB). It uses native Web Components
with Shadow DOM, a custom History API router with middleware, reactive signals (useState/computed),
lazy loading for both components and controllers, JWT auth with a dual-shell architecture, and
Puppeteer-based bot HTML pre-rendering for SEO. No JSX, no virtual DOM.

## Critical Rule
NEVER use emojis in code, console.logs, comments, or documentation.

---

## 1. TypeScript & Import Rules

- Source in `src/**/*.ts`, compiled to `dist/**/*.js`
- ALWAYS add `.js` to all imports (ES modules requirement — TypeScript compiles `.ts` to `.js`)
- Use path aliases for cross-cutting imports; always add `.js` extension

```typescript
// Correct
import { Component, defineComponent } from '@core/component.js';
import { useState, computed } from '@core/state.js';
import { trackEvents, trackSubscriptions } from '@utils/events.js';
import api from '@services/api.service.js';
import { store } from '@stores/appStore.js';
import type { State, ComputedState } from '@core/state.js';

// Wrong — missing .js
import { Component } from '@core/component';
```

Available aliases: `@core/`, `@components/`, `@services/`, `@utils/`, `@stores/`, `@middleware/`, `@config/`, `@types/`

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

        // Store unsubscribe reference for cleanup
        this._unwatchName = this.name.watch(val => {
            this.shadowRoot.querySelector('#greeting')!.textContent = `Hello, ${val}`;
        });
    }

    onUnmount() {
        this._unwatchName?.();     // Unsubscribe watcher
        this.greeting.dispose();   // Release computed dependency subscriptions
    }
}

defineComponent('user-card', UserCard);
```

Component tag names MUST contain a hyphen (Web Component spec).

---

## 3. Controller Pattern

Controllers handle page-level logic. Every controller that touches the DOM or watches state
MUST return a cleanup function. Use `trackEvents()` + `trackSubscriptions()`.

```typescript
import { trackEvents, trackSubscriptions } from '@utils/events.js';
import api from '@services/api.service.js';
import { store } from '@stores/appStore.js';

export async function dashboardController(params: Record<string, string> = {}): Promise<() => void> {
    const events = trackEvents();
    const subs = trackSubscriptions();

    // Load data
    const data = await api.get('/dashboard');

    // Render
    document.getElementById('content')!.innerHTML = `
        <h1>Dashboard</h1>
        <ul id="items">${data.items.map((i: any) => `<li class="item" data-id="${i.id}">${i.name}</li>`).join('')}</ul>
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

---

## 4. Routing Pattern

```typescript
// src/config/routes.ts
import { router, lazyController } from '@core/router.js';
import { authMiddleware } from '@middleware/auth.middleware.js';

router
    .use(authMiddleware)
    .register('/', 'views/pages/public/home.html')
    .register('/about', 'views/pages/public/about.html')
    .register('/login', 'views/pages/public/login.html',
        lazyController('loginController', '../controllers/login.controller.js'))
    .register('/dashboard', 'views/pages/protected/dashboard.html',
        lazyController('dashboardController', '../controllers/dashboard.controller.js'))
    .register('/user/:id', 'views/pages/protected/user-detail.html',
        lazyController('userDetailController', '../controllers/user-detail.controller.js'));

export const protectedRoutes = ['/dashboard', '/user'];
```

---

## 5. Component Registry

```typescript
// src/components/registry.ts
componentRegistry.register('user-card', './ui/user-card.js');
componentRegistry.register('nc-button', './ui/nc-button.js');
// All UI components use the './ui/' prefix
// Components are loaded lazily when their tag appears in the DOM
// Do NOT import component files directly
```

---

## 6. State Management

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

## 7. DOM Utilities (src/utils/dom.ts)

```typescript
import dom from '@utils/dom.js';

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

## 8. Event & Subscription Tracking (src/utils/events.ts)

For controllers, use these instead of raw `addEventListener`:

```typescript
import { trackEvents, trackSubscriptions } from '@utils/events.js';

// trackEvents — tracks DOM event listeners
const events = trackEvents();
events.on(selector, eventName, handler)
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
src/
├── app.ts                       # Entry point — minimal, no logic
├── config/routes.ts             # All route definitions
├── core/                        # Framework primitives (do not modify)
│   ├── component.ts             # Base Component class
│   ├── router.ts                # SPA router
│   ├── state.ts                 # useState, computed
│   ├── http.ts                  # Fetch wrapper
│   └── lazyComponents.ts        # Component lazy loading
├── components/
│   ├── core/                    # Layout (app-header, app-sidebar, app-footer)
│   ├── ui/                      # All nc-* reusable components
│   ├── registry.ts              # Lazy registry (componentRegistry.register)
│   └── preloadRegistry.ts       # Critical components to preload
├── controllers/
│   ├── index.ts                 # Named re-exports for all controllers
│   └── *.controller.ts
├── views/
│   ├── public/                  # HTML templates, no auth
│   └── protected/               # HTML templates, auth required
├── services/
│   ├── api.service.ts
│   ├── auth.service.ts
│   └── logger.service.ts
├── stores/
│   ├── appStore.ts              # user, isLoading, error
│   └── uiStore.ts               # sidebarOpen, theme, notifications
├── middleware/auth.middleware.ts
├── utils/
│   ├── events.ts                # trackEvents, trackSubscriptions, delegate
│   ├── dom.ts                   # dom helpers
│   ├── formatters.ts            # formatCurrency, formatDate, formatNumber, etc.
│   ├── helpers.ts               # debounce, throttle, generateId, sanitizeHTML, etc.
│   └── validation.ts            # validateForm, isValidEmail, etc.
├── constants/
│   ├── apiEndpoints.ts
│   ├── routePaths.ts
│   ├── storageKeys.ts
│   └── errorMessages.ts
└── types/global.d.ts
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
- Two HTML shells: `index.html` (public) and `app.html` (protected)
- Shell mismatch → router triggers full page reload automatically
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
| Route not found                 | Missing route in `config/routes.ts`                   |
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
- **Path aliases** with tsc-alias (`@core/`, `@components/`, etc.)
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
