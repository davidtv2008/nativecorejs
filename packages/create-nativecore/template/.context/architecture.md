# NativeCore Framework Architecture

## Core Philosophy
Zero-dependency TypeScript SPA framework built on native browser APIs:
- Web Components with Shadow DOM for encapsulation
- History API router with middleware and lazy loading
- Reactive signals (useState, computed) — no virtual DOM
- Single-shell JWT auth architecture
- Bot-optimized SEO via Puppeteer pre-rendering

## Tech Stack

| Concern         | Solution                                     |
|-----------------|----------------------------------------------|
| Language        | TypeScript (src/) compiled to JS (dist/)     |
| Components      | Native Custom Elements + Shadow DOM          |
| State           | Signals pattern (useState, computed)         |
| Router          | History API + middleware chain               |
| Build           | tsc + tsc-alias for path aliases             |
| Dev Server      | Node.js with HMR                             |
| Testing         | Vitest                                       |
| SEO             | Puppeteer headless pre-render to dist/bot/   |

## Project Structure

```
nfbs/
├── src/                          # TypeScript source
│   ├── app.ts                    # Entry point — minimal
│   ├── config/routes.ts          # All route definitions
│   ├── core/                     # Framework primitives (do not modify)
│   │   ├── component.ts          # Base Component class
│   │   ├── router.ts             # SPA router
│   │   ├── state.ts              # useState + computed
│   │   ├── http.ts               # Fetch wrapper with interceptors
│   │   └── lazyComponents.ts     # Component registry + MutationObserver
│   ├── components/
│   │   ├── core/                 # Layout components (app-header, app-sidebar)
│   │   ├── ui/                   # All nc-* reusable UI components
│   │   ├── registry.ts           # Lazy loading registry
│   │   └── preloadRegistry.ts    # Critical components to preload
│   ├── controllers/
│   │   ├── index.ts              # Named re-exports for all controllers
│   │   └── *.controller.ts       # Page-level logic
│   ├── views/
│   │   ├── public/               # HTML templates, no auth required
│   │   └── protected/            # HTML templates, auth required
│   ├── services/
│   │   ├── api.service.ts        # HTTP client
│   │   ├── auth.service.ts       # JWT token management
│   │   └── logger.service.ts     # Logging
│   ├── stores/
│   │   ├── appStore.ts           # user, isLoading, error
│   │   └── uiStore.ts            # sidebarOpen, theme, notifications
│   ├── middleware/
│   │   └── auth.middleware.ts    # Protects routes before controller load
│   ├── utils/
│   │   ├── events.ts             # trackEvents, trackSubscriptions, delegate
│   │   ├── dom.ts                # dom helpers (query, create, listen, etc.)
│   │   ├── formatters.ts         # formatCurrency, formatDate, etc.
│   │   ├── helpers.ts            # debounce, throttle, sanitizeHTML, etc.
│   │   └── validation.ts         # validateForm, isValidEmail, etc.
│   ├── constants/
│   │   ├── apiEndpoints.ts
│   │   ├── routePaths.ts
│   │   ├── storageKeys.ts
│   │   └── errorMessages.ts
│   └── types/global.d.ts
├── dist/                         # Compiled output (do not edit directly)
│   └── bot/                      # Pre-rendered HTML for crawlers
├── api/                          # Mock API server
├── scripts/                      # Build and generator scripts
├── tests/unit/                   # Vitest unit tests
├── index.html                    # Public shell
└── app.html                      # Protected shell
```

## Architecture Layers

### 1. Core Layer (.nativecore/core/) — Framework Primitives

**router.ts** — History API SPA router
- `register(path, htmlFile, controller?)` — chainable route registration
- `use(middleware)` — middleware chain
- `navigate(path)` / `replace(path)` / `back()`
- Per-route `AbortController` cancels overlapping navigations
- Calls controller cleanup before loading the next route
- Detects shell switches (public ↔ protected) and triggers full reload
- HTML caching per file

**component.ts** — Base Web Component class
- `static useShadowDOM = true` — required on all UI components
- `template()` — return HTML string, called on render
- `onMount()` — after inserted to DOM, set up events and watchers here
- `onUnmount()` — cleanup watchers and dispose computeds here
- `$(sel)` / `$$(sel)` — scoped shadowRoot queries
- `on(event, handler)` — delegate-style listener on `this`
- `emitEvent(name, detail)` — fire CustomEvent (bubbles + composed)
- `setState(partial)` — merge and re-render

**state.ts** — Reactive signals
- `useState<T>(initial)` — returns `{ value, set(), watch() → unsubscribe }`
- `computed<T>(fn)` — auto-tracks dependencies; returns `{ value, watch(), dispose() }`
  - IMPORTANT: call `.dispose()` when done — holds live dep subscriptions
- `createStates<T>(record)` — batch create multiple states

**lazyComponents.ts** — Component registry
- `componentRegistry.register(tag, path)` — registers lazy loading path
- MutationObserver watches DOM — loads component JS when tag appears
- Loaded from `dist/components/`

### 2. Configuration Layer (src/config/)

**routes.ts** — Single source of truth for all routes
- Uses `lazyController()` for dynamic controller imports
- Exports `protectedRoutes` array consumed by auth middleware

### 3. Application Layer

**Controllers (src/controllers/)** — Page logic
- Lazy loaded per route via `lazyController(name, path)`
- Receive `(params, state)` arguments  
- Must return a cleanup function
- Use `trackEvents()` + `trackSubscriptions()` for all event/watcher binding
- Exported by name from `controllers/index.ts`

**Components (src/components/)** — Reusable UI
- Extend `Component`, register with `defineComponent()`
- Lazy loaded from `dist/components/` via registry
- Shadow DOM required — provides style encapsulation
- Critical ones preloaded in `preloadRegistry.ts`

**Views (src/views/)** — HTML templates
- Plain HTML files, never compiled
- Fetched by router on route access and cached
- Public routes: `views/pages/public/`
- Protected routes: `views/pages/protected/`

### 4. Services Layer (src/services/)

| Service          | Responsibility                                |
|------------------|-----------------------------------------------|
| api.service.ts   | fetch wrapper, base URL, auth headers         |
| auth.service.ts  | JWT read/write, isAuthenticated, getUser      |
| logger.service.ts| Structured logging                            |

### 5. State Layer (src/stores/)

**appStore.ts** — `user`, `isLoading`, `error` + helper methods  
**uiStore.ts** — `sidebarOpen`, `theme`, `notifications` + helper methods  
Both use `useState` from `state.ts`. All state is reactive.

### 6. Utilities Layer (src/utils/)

| File             | Key Exports                                                    |
|------------------|----------------------------------------------------------------|
| events.ts        | `trackEvents()`, `trackSubscriptions()`, `delegate()`          |
| dom.ts           | `dom.query`, `dom.create`, `dom.within`, `dom.listen`, `dom.show/hide`, `dom.addClass/removeClass` |
| formatters.ts    | `formatCurrency`, `formatDate`, `formatNumber`, `truncate`     |
| helpers.ts       | `debounce`, `throttle`, `sanitizeHTML`, `generateId`, `deepClone` |
| validation.ts    | `validateForm`, `isValidEmail`, `minLength`, `maxLength`       |

## Data Flow

```
User Action
    |
    v
Router.navigate(path)
    |
    v
Middleware chain (authMiddleware)
    |
    v
Previous controller cleanup()     <-- trackEvents + trackSubscriptions
    |
    v
Fetch HTML view (cached)
    |
    v
Render to #main-content
    |
    v
lazyController() dynamic import
    |
    v
Controller runs (API calls, DOM setup)
    |
    v
trackEvents / trackSubscriptions attach
    |
    v
State changes --> .watch() callbacks --> targeted DOM updates
```

## Lazy Loading Strategy

**Controllers** — loaded on route access:
```typescript
lazyController('dashboardController', '../controllers/dashboard.controller.js')
// Dynamic import at navigation time — not bundled eagerly
```

**Components** — loaded when tag appears in DOM:
```typescript
componentRegistry.register('user-card', './ui/user-card.js');
// MutationObserver fires → loads dist/components/ui/user-card.js
```

**HTML Views** — fetched on route access, cached thereafter

## Auth Architecture

Two separate HTML shells prevent auth state leakage:
- `index.html` — public shell (landing, login, register)
- `app.html` — protected shell (dashboard, user pages)

When navigating between shells, router detects the mismatch via
`<meta name="app-shell" content="public|protected">` and triggers a full page reload
so the correct shell loads. Within a shell, navigation is SPA.

## TypeScript Compilation

```
src/**/*.ts  -->  tsc + tsc-alias  -->  dist/**/*.js
```

Path aliases (`@core/`, `@services/`, etc.) are resolved at compile time by tsc-alias.
The browser always loads `.js` files from `dist/`. Imports in source must use `.js` extension.

## SEO / Bot Pre-rendering

```bash
npm run build:bots
```

Puppeteer headlessly visits each public route, waits for network idle, and outputs
full HTML to `dist/bot/<route>/index.html`. A reverse proxy (Nginx/Netlify/Vercel)
detects bot user-agents and serves the pre-rendered HTML instead of the SPA shell.

## Core Philosophy
Build a modern SPA framework using TypeScript with:
- Zero runtime dependencies
- Native Web Components with Shadow DOM
- Lazy loading by default (components + controllers)
- Reactive state management (useState, computed)
- Clean separation of concerns
- Type safety throughout
- Bot-optimized SEO without SSR complexity
- Path aliases for cleaner imports

## Tech Stack
- **Language**: TypeScript (compiled to JavaScript)
- **Components**: Web Components (Custom Elements + Shadow DOM)
- **State**: Signals pattern (useState, computed)
- **Router**: History API-based SPA router with middleware
- **Build**: TypeScript compiler (tsc) + tsc-alias
- **Dev Server**: Node.js with HMR
- **Testing**: Vitest
- **SEO**: Puppeteer for pre-rendering bot HTML

## Project Structure

```
nfbs/
├── src/                    # TypeScript source files
│   ├── core/              # Framework primitives (router, component, state)
│   ├── components/        
│   │   ├── core/          # Layout components (app-header, app-sidebar)
│   │   ├── ui/            # All nc-* UI components
│   │   ├── registry.ts    # Component lazy loading registry
│   │   └── preloadRegistry.ts
│   ├── controllers/       # Page controllers
│   ├── views/            
│   │   ├── public/        # Public routes (login, landing)
│   │   └── protected/     # Protected routes (dashboard, etc.)
│   ├── services/         # API, auth, logger services
│   ├── stores/           # Global state stores
│   ├── middleware/       # Route middleware
│   ├── utils/            # Helper functions
│   ├── constants/        # App constants (endpoints, routes, errors)
│   ├── config/           # Configuration
│   │   └── routes.ts     # Route definitions
│   └── types/            # TypeScript type definitions
├── dist/                  # Compiled JavaScript output
│   └── bot/              # Pre-rendered HTML for search engines
├── api/                   # Mock API server
├── scripts/              # Build & generator scripts
└── tests/                # Unit tests
```

## Architecture Layers

### 1. Core Layer (`.nativecore/core/`)
Framework primitives that power everything:

- **router.ts** - History API-based SPA router with middleware
- **component.ts** - Base class for Web Components with Shadow DOM
- **state.ts** - Reactive state primitives (useState, computed)
- **lazyComponents.ts** - Component registry and lazy loading system
- **state.ts** - useState + computed hooks (Signals + Computed pattern)
- **http.ts** - Fetch wrapper with interceptors
- **lazyComponents.ts** - Component lazy loading with MutationObserver
- **errorHandler.ts** - Centralized error handling

### 2. Configuration Layer (`src/config/`)
- **routes.ts** - All route definitions with lazy controllers
- Uses `lazyController()` helper for dynamic imports
- Exports `protectedRoutes` array for auth middleware

### 3. Application Layer

#### Controllers (`src/controllers/`)
- Page-specific business logic
- Lazy loaded per route
- Return cleanup functions
- Export from `index.ts`
- TypeScript files compiled to `dist/controllers/`

#### Components (`src/components/`)
- Reusable UI elements
- Web Components (Custom Elements with Shadow DOM)
- Lazy loaded via registry from `dist/components/`
- Critical components preloaded (app-header, app-footer, loading-spinner)
- TypeScript classes extending `Component` base class

#### Views (`src/views/`)
- HTML templates (not compiled, served as-is)
- `public/` - No auth required
- `protected/` - Auth required
- Fetched on route access

### 4. Services Layer (`src/services/`)
Shared business logic:

- **auth.service.ts** - JWT token management
- **api.service.ts** - HTTP API wrapper
- **storage.service.ts** - localStorage/sessionStorage abstraction
- **logger.service.ts** - Logging utility

### 5. Middleware Layer (`src/middleware/`)
- **auth.middleware.ts** - Route protection
- Runs before route handlers
- Can block navigation

### 6. State Layer (`src/stores/`)
Global reactive state:

- **appStore.ts** - Application state (user, loading, error, count)
- **uiStore.ts** - UI state (modals, loading, toasts)
- Uses signals for reactivity
- TypeScript interfaces for type safety

### 7. Utilities Layer (`src/utils/`)
Pure helper functions:

- **sidebar.ts** - Sidebar initialization
- **formatters.ts** - Data formatting
- **helpers.ts** - General utilities
- **validation.ts** - Input validation
- **dom.ts** - DOM helper utilities
- **cacheBuster.ts** - Cache busting for imports

### 8. Constants Layer (`src/constants/`)
Application constants:

- **routePaths.ts** - Route path constants
- **apiEndpoints.ts** - API endpoint URLs
- **storageKeys.ts** - LocalStorage keys
- **errorMessages.ts** - Error message templates

## Data Flow

```
User Action
    ↓
Router (navigation)
    ↓
Middleware (auth check)
    ↓
Lazy Load Controller
    ↓
Fetch HTML View
    ↓
Lazy Load Components (if needed)
    ↓
Controller Logic (API calls, state updates)
    ↓
Render to DOM
    ↓
Component onMount (event listeners)
    ↓
State Changes → UI Updates (via signals)
```

## Lazy Loading Strategy

### Controllers
```typescript
// Dynamic import wrapper with .js extension (required for ES modules)
lazyController('dashboardController', '../controllers/dashboard.controller.js')

// Loaded only when route is accessed
// TypeScript compiled to dist/controllers/, imported as .js
```

### Components
```typescript
// Registration in components/index.ts
componentRegistry.register('user-card', './user-card.js');

// Loaded from dist/components/ when:
1. Component appears in DOM (MutationObserver)
2. After page load (initial scan)
3. Manually preloaded (critical components)
```

### HTML Views
```typescript
// Fetched via router.fetchHTML() from src/views/
const html = await fetch('src/views/public/home.html');
```

## Component Lifecycle

```typescript
import { Component, defineComponent } from '../core/component.js';
import { useState } from '../core/state.js';
import type { State } from '../core/state.js';

class MyComponent extends Component {
    count: State<number>;  // Type declaration
    
    constructor() {
        // 1. Initialize state
        super();
        this.count = useState(0);
    }
    
    template() {
        // 2. Return HTML template
        return `
            <style>
                /* Shadow DOM scoped styles */
            </style>
            <div>${this.count.value}</div>
        `;
    }
    
    onMount() {
        // 3. After inserted into DOM
        // - Use event delegation on shadowRoot
        // - Subscribe to state changes
        // - Setup watchers
        this.shadowRoot.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).matches('.button')) {
                this.count.value++;
            }
        });
        
        this.count.watch(val => {
            this.$('#display').textContent = val.toString();
        });
    }
    
    // Optional cleanup
    disconnectedCallback() {
        // 4. When removed from DOM
    }
}

defineComponent('my-component', MyComponent);
```

## Routing System

### Route Registration
```javascript
router
    .register('/path', 'view.html')           // Static
    .register('/path', 'view.html', controller) // With controller
    .register('/user/:id', 'view.html', controller); // With params
```

### Middleware
```javascript
router.use(async (route) => {
    // Can modify route
    // Return false to block
    return true; // Allow
});
```

### Navigation
```javascript
router.navigate('/path');      // Push to history
router.replace('/path');        // Replace history
router.back();                  // Go back
```

## State Management

### Local State (Component)
```typescript
import { useState } from '../core/state.js';
import type { State } from '../core/state.js';

const count: State<number> = useState(0);
count.value++;                     // Update
count.watch(val => console.log(val)); // Watch changes
count.set(prev => prev + 1);       // Functional update
```

### Computed Values (Derived State)
```typescript
import { computed } from '../core/state.js';
import type { Computed } from '../core/state.js';

const subtotal: State<number> = useState(100);
const tax: State<number> = useState(0.08);

// Automatically recomputes when dependencies change
const total: Computed<number> = computed(() => 
    subtotal.value + (subtotal.value * tax.value)
);

total.watch(val => console.log('Total:', val));
```

### Global State (Store)
```typescript
import { store } from './stores/appStore.js';

store.user.value = {...};          // Update
store.user.watch(val => {...});    // Watch globally
store.incrementCount(10);          // Call store methods
```

## TypeScript Integration

### Compilation Flow
```
src/*.ts  →  tsc  →  dist/*.js  →  Browser
```

### Import Rules
- Write imports with `.js` extension (required for ES modules)
- TypeScript source: `import { Component } from '../core/component.js';`
- Compiled output: JavaScript file in dist/
- Browser loads from `dist/` directory

### Type Definitions
- Component properties must be declared with types
- Use `type` imports for interfaces: `import type { State } from '../core/state.js';`
- Global types in `.nativecore/types/global.d.ts`

### Build Commands
- `npm start` - Auto-compiles TypeScript, starts dev server
- `npm run compile` - Compile TypeScript only
- `npm run build` - Lint, typecheck, compile

## Authentication Flow

1. **Login** → `auth.setTokens()` + `auth.setUser()`
2. **Storage** → `sessionStorage` (cleared on browser close)
3. **Check** → `auth.isAuthenticated()` in middleware
4. **Protect** → Routes in `protectedRoutes` array
5. **Redirect** → Unauthorized → `/login`

## Error Handling

```javascript
try {
    const data = await api.get('/endpoint');
} catch (error) {
    // Auto-handled by errorHandler
    // Shows user-friendly message
}
```

## Code Generation

### Generators
- `make:component` → Creates component + registers
- `make:view` → Creates view + controller + route
- `remove:component` → Deletes + cleans up
- `remove:view` → Deletes + cleans up

### Auto-updates
- Component registry (`components/index.js`)
- Controller exports (`controllers/index.js`)
- Route definitions (`config/routes.js`)
- Protected routes array

## Performance Optimizations

1. **Code Splitting** - Each controller/component is separate chunk
2. **Lazy Loading** - Load on demand, not on init
3. **Preloading** - Critical components preloaded
4. **Caching** - HTML views cached after first load
5. **Signals** - Efficient reactivity (no virtual DOM diffing)
6. **Shadow DOM** - Scoped styles, no CSS conflicts
7. **Native ES Modules** - Browser-native code splitting
8. **TypeScript Compilation** - Type safety with zero runtime cost

## Router Features

### Navigation
- Automatic scroll to top on page change
- Professional 404 error page
- Loading progress bar
- Page transition animations
- History API integration

### Route Protection
- Middleware-based authentication
- Protected routes array
- Auto-redirect to login
- JWT token validation

## Development Workflow

1. **Write TypeScript** - Edit files in `src/`
2. **Auto-compile** - `npm start` watches and compiles
3. **HMR** - Changes reload automatically
4. **Test** - `npm test` runs unit tests
5. **Build** - `npm run build` for production

## Browser Support
- Modern browsers (ES6+ modules)
- TypeScript compiled to ES2020
- No polyfills needed for core
- Web Components supported natively

## Build Process
- TypeScript compilation required
- Outputs to `dist/` directory
- Source maps generated
- Can add bundler (Vite/Rollup) for production optimization

## Testing Strategy
- Unit tests for utilities/formatters
- Component tests with Vitest + happy-dom
- Integration tests for flows
- TypeScript ensures type correctness


