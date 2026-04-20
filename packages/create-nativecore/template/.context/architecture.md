# NativeCore Framework Architecture

## Core Philosophy
Zero-dependency TypeScript SPA framework built on native browser APIs:
- Web Components with Shadow DOM for encapsulation
- History API router with middleware, lazy loading, and route caching
- Reactive signals (useState, computed, effect, batch) — no virtual DOM
- Single-shell JWT auth architecture (one `index.html` for the whole app)
- Bot-optimized SEO via Puppeteer pre-rendering

## Tech Stack

| Concern         | Solution                                        |
|-----------------|-------------------------------------------------|
| Language        | TypeScript (src/ + .nativecore/) → JS (dist/)   |
| Components      | Native Custom Elements + Shadow DOM             |
| State           | Signals pattern (useState, computed, effect)    |
| Router          | History API + middleware chain + HTML caching   |
| Build           | tsc + tsc-alias for path aliases                |
| Dev Server      | Node.js with HMR                                |
| Testing         | Vitest + nativecorejs/testing utilities         |
| SEO             | Puppeteer headless pre-render to dist/bot/      |

## Project Structure

```
<project>/
├── src/                              # Application TypeScript source
│   ├── app.ts                        # Entry point — minimal boot sequence only
│   ├── routes/
│   │   └── routes.ts                 # All route definitions + protectedRoutes export
│   ├── components/
│   │   ├── core/                     # Layout components (app-header, app-sidebar, etc.)
│   │   ├── ui/                       # Custom reusable UI components
│   │   ├── registry.ts               # Custom component lazy-load registry
│   │   ├── frameworkRegistry.ts      # Framework nc-* component registrations (auto-managed)
│   │   ├── appRegistry.ts            # App layout component registrations
│   │   └── preloadRegistry.ts        # Critical components preloaded at startup
│   ├── controllers/
│   │   ├── index.ts                  # Named re-exports for all controllers
│   │   └── *.controller.ts           # Page-level logic
│   ├── views/
│   │   ├── public/                   # HTML templates — no auth required
│   │   └── protected/                # HTML templates — auth required
│   ├── services/
│   │   ├── api.service.ts            # HTTP client (fetch wrapper + auth headers)
│   │   ├── auth.service.ts           # JWT token management
│   │   └── logger.service.ts         # Structured logging
│   ├── stores/
│   │   ├── appStore.ts               # user, isLoading, error + helper methods
│   │   └── uiStore.ts                # sidebarOpen, theme, notifications + helpers
│   ├── middleware/
│   │   └── auth.middleware.ts        # Redirect unauthenticated users from protected routes
│   ├── utils/                        # App-specific utilities only
│   │   ├── form.ts                   # useForm helper
│   │   ├── formatters.ts             # formatCurrency, formatDate, formatNumber
│   │   ├── helpers.ts                # debounce, throttle, generateId
│   │   ├── sidebar.ts                # initSidebar
│   │   └── validation.ts             # validateForm, isValidEmail
│   ├── constants/
│   │   ├── apiEndpoints.ts
│   │   ├── routePaths.ts
│   │   ├── storageKeys.ts
│   │   └── errorMessages.ts
│   ├── types/
│   │   └── global.d.ts               # App-specific type augmentations
│   └── styles/
│       ├── main.css                  # App global styles
│       ├── core.css                  # Layout / shell styles
│       ├── core-variables.css        # CSS custom properties
│       └── variables.css             # App-specific variables
├── .nativecore/                      # Framework internals — DO NOT MODIFY
│   ├── core/
│   │   ├── component.ts              # Base Component class (Web Component + Shadow DOM)
│   │   ├── router.ts                 # SPA router with middleware, caching, prefetch
│   │   ├── state.ts                  # useState, computed, effect, batch, useSignal, createStore
│   │   ├── lazyComponents.ts         # Component registry + MutationObserver loader
│   │   ├── pageCleanupRegistry.ts    # Auto-cleanup safety net flushed by router on each nav
│   │   └── gpu-animation.ts          # GPU-accelerated animation utilities
│   ├── dev/                          # Dev-only tooling (alias: @dev/) — excluded from prod build
│   │   ├── hmr.ts                    # Hot module replacement
│   │   ├── denc-tools.ts             # Dev tools orchestrator
│   │   ├── component-overlay.ts      # Gear buttons on components
│   │   ├── component-editor.ts       # Component property editor panel
│   │   ├── outline-panel.ts          # DOM tree outline panel
│   │   ├── context-menu.ts           # Right-click context menu
│   │   └── drawing-overlay.ts        # Annotation drawing layer
│   ├── utils/
│   │   ├── cacheBuster.ts            # JS module cache busting
│   │   ├── dom.ts                    # dom.query, dom.listen, dom.create, etc.
│   │   ├── events.ts                 # trackEvents, trackSubscriptions, delegate, onClick, etc.
│   │   └── templates.ts              # html``, css``, escapeHTML, raw, sanitizeURL, unsafeHTML
│   ├── metrics-panel.ts              # Dev-only performance overlay (excluded from prod build)
│   └── types/
│       └── global.d.ts               # Window, HTMLElementTagNameMap augmentations
├── dist/                             # Compiled output (do not edit)
│   └── bot/                          # Pre-rendered HTML for crawlers
├── api/                              # Mock API server
├── tests/unit/                       # Vitest unit tests
├── index.html                        # Single HTML shell (public + protected routes)
├── manifest.json                     # PWA manifest
└── nativecore.config.json            # Framework configuration
```

---

## Architecture Layers

### 1. Framework Primitives (.nativecore/core/) — DO NOT MODIFY

**router.ts** — History API SPA router
- `router.register(path, htmlFile, controller?, options?)` — chainable route registration
- `router.use(middleware)` — middleware chain runs before every navigation
- `router.navigate(path)` / `router.replace(path)` / `router.back()` / `router.reload()`
- `router.prefetch(path)` — warm HTML + layout cache in advance
- `router.bustCache(path?)` — invalidate cached HTML for a route (or all routes)
- `router.cache({ ttl, revalidate })` — chained after `.register()` to set per-route caching
- Route `loader` option — async data fetch that runs before controller; result passed as `loaderData`
- Per-navigation `AbortController` cancels overlapping navigations
- `PageCleanupRegistry.flushPageCleanups()` called before each new route to auto-cleanup leaked subs
- DOM events: `pageloaded`, `nc-route-loading`, `nc-route-loaded`, `nativecore:route-error`
- Component errors bubble as `nativecore:component-error`

**component.ts** — Base Web Component class
- `static useShadowDOM = true` — required on all UI components
- `template()` — return HTML string; uses key-based DOM reconciliation when elements have `key=` attrs
- `onMount()` — after connected to DOM; set up events and watchers
- `onUnmount()` — cleanup watchers and dispose computeds
- `onAttributeChange(name, old, new)` — called when observed attributes change
- `$(sel)` / `$$(sel)` — scoped shadowRoot queries (fall back to `this.querySelector` when no shadow)
- `bind(state, selector, property?)` — reactive binding; auto-cleans on disconnect
- `bindAttr(state, selector, attrName)` — reactive attribute binding
- `bindAll(bindings)` — batch reactive bindings `{ '#selector': state }`
- `setState(partial)` — merge partial state + re-render
- `patchState(partial)` — merge without re-render
- `getState()` — returns a copy of current state

**state.ts** — Reactive signals
- `useState<T>(initial)` — `{ value, set(), watch() → unsub }`
- `computed<T>(fn)` — auto-tracks deps; `{ value, watch(), dispose() }` — MUST call `.dispose()`
- `effect(fn)` — re-runs when accessed states change; returns disposer; registered with PageCleanupRegistry
- `batch(fn)` — defer all notifications; each subscriber fires at most once
- `useSignal<T>(initial)` — `[getter, setter]` tuple (SolidJS style)
- `createStates<T>(record)` — batch-create multiple states from an object
- `createStore(name, initial)` — named global store, accessible by MetricsPanel devtools
- `getStore<T>(name)` — retrieve named global store from anywhere

**gpu-animation.ts** — GPU-accelerated animation utilities
- `animate(el, keyframes, options)` — Web Animations API wrapper, returns Promise
- `fadeIn`, `fadeOut`, `scaleIn`, `slideIn` — convenience animators
- `setGPUTransform(el, x, y, z, scale, rotate)` — translate3d to force GPU layer
- `prepareForAnimation(el, props)` / `cleanupAnimation(el)` — will-change management
- `createAnimationLoop(cb)` — RAF loop with delta time
- `rafThrottle(fn)` — throttle handler to one call per animation frame
- `addPassiveListener(el, event, handler)` — passive event listener helper

**pageCleanupRegistry.ts** — Auto-cleanup safety net
- `registerPageCleanup(fn)` — called automatically by `effect()`, `computed()`, `trackEvents()`
- `flushPageCleanups()` — called by router; disposes all registered cleanups before next route
- `pausePageCleanupCollection()` / `resumePageCleanupCollection()` — use in `app.ts` around long-lived effects

**lazyComponents.ts** — Component registry + MutationObserver
- `componentRegistry.register(tag, modulePath)` — register lazy-load path
- `initLazyComponents()` — starts MutationObserver; loads component JS when tag appears in DOM
- Framework nc-* components are pre-registered in `builtinRegistry.ts`

---

### 2. Route Configuration (src/routes/routes.ts)

Single source of truth for all routes.
- `lazyController(name, path)` — always defined locally in routes.ts; NOT imported from router
- `.cache({ ttl, revalidate })` — chained after `.register()` for per-route HTML caching
- `protectedRoutes` array consumed by `authMiddleware` and sidebar visibility logic

---

### 3. Application Layer

**Controllers (src/controllers/)** — Page logic
- Lazy loaded per route via `lazyController(name, path)` in routes.ts
- Signature: `async function myController(params, state?, loaderData?): Promise<() => void>`
- Must return a cleanup function: `() => { events.cleanup(); subs.cleanup(); }`
- Use `trackEvents()` + `trackSubscriptions()` for all events and state watchers
- Exported by name from `src/controllers/index.ts`

**Components (src/components/)** — Reusable UI
- Extend `Component`, register with `defineComponent()`
- Lazy loaded from `dist/src/components/ui/` via registry
- Shadow DOM required for all UI components
- Framework nc-* components (60+) are in `.nativecore/../src/components/` and auto-registered

**Views (src/views/)** — HTML templates
- Plain HTML files, no `<style>` or `<script>` tags
- Fetched by router on route access and cached per `cachePolicy`
- Public: `src/views/public/` — accessed without auth
- Protected: `src/views/protected/` — auth-guarded by middleware

---

### 4. Services Layer (src/services/)

| Service           | Responsibility                                  |
|-------------------|-------------------------------------------------|
| api.service.ts    | fetch wrapper, base URL, JWT auth headers       |
| auth.service.ts   | JWT read/write/verify, isAuthenticated, getUser |
| logger.service.ts | Structured logging                              |

---

### 5. State Layer (src/stores/)

**appStore.ts** — `user`, `isLoading`, `error` + `setUser()`, `setLoading()`, `setError()`, `clearError()`
**uiStore.ts** — `sidebarOpen`, `theme`, `notifications` + `toggleSidebar()`, `setTheme()`, `addNotification()`, `removeNotification()`
Both use `useState` from `state.ts`. All state is reactive.

---

### 6. Framework Utilities (.nativecore/utils/) — import via `@core-utils/`

| File          | Key Exports                                                                     |
|---------------|---------------------------------------------------------------------------------|
| events.ts     | `trackEvents()`, `trackSubscriptions()`, `delegate()`, `onClick()`, `on()`, etc.|
| dom.ts        | `dom.query`, `dom.$`, `dom.$$`, `dom.within`, `dom.withinAll`, `dom.create`,    |
|               | `dom.listen`, `dom.show`, `dom.hide`, `dom.addClass`, `dom.removeClass`         |
| templates.ts  | `html``, `css``, `raw()`, `unsafeHTML``, `escapeHTML()`, `sanitizeURL()`        |
| cacheBuster.ts| `bustCache(path)`, `cacheVersion`, `importWithBust(path)`                       |

---

### 7. App Utilities (src/utils/) — import via `@utils/`

| File          | Key Exports                                                          |
|---------------|----------------------------------------------------------------------|
| formatters.ts | `formatCurrency`, `formatDate`, `formatNumber`, `truncate`           |
| validation.ts | `validateForm`, `isValidEmail`, `minLength`, `maxLength`             |
| form.ts       | `useForm` helper                                                     |
| helpers.ts    | `debounce`, `throttle`, `generateId`                                 |
| sidebar.ts    | `initSidebar()`                                                      |

---

## Data Flow

```
User Action
    |
    v
router.navigate(path)
    |
    v
Middleware chain (authMiddleware checks JWT)
    |  [redirect to /login if not authenticated on protected route]
    v
Previous controller cleanup()      <-- events.cleanup() + subs.cleanup()
PageCleanupRegistry.flush()        <-- auto-disposes any leaked subs/effects
    |
    v
Fetch HTML view (cached per cachePolicy)
    |
    v
Render HTML to #main-content
    |
    v
Route loader (if defined) — async data fetch with AbortSignal
    |  fires nc-route-loading / nc-route-loaded events
    v
lazyController() dynamic import + run controller
    |
    v
trackEvents / trackSubscriptions attach DOM events and state watchers
    |
    v
State changes --> .watch() callbacks --> targeted DOM updates
    |
    v
window.dispatchEvent('pageloaded')
```

---

## Lazy Loading Strategy

**Controllers** — loaded on route access:
```typescript
lazyController('dashboardController', '../controllers/dashboard.controller.js')
```

**Components** — loaded when tag appears in DOM:
```typescript
componentRegistry.register('user-card', './ui/user-card.js');
```

**Views** — fetched over HTTP on route access (cached by router)

**Critical components** — preloaded at startup:
```typescript
// src/components/preloadRegistry.ts
componentRegistry.loadComponent('app-header');
```

---

## Plugin API

Plugins integrate with the router lifecycle without modifying routing code:
```typescript
registerPlugin({ name, onInstall?, onNavigate?, onNavigated? })
```
`onInstall` runs once; `onNavigate` runs before the controller; `onNavigated` runs after `pageloaded`.

---

## SEO Strategy

- `npm run build:bots` runs Puppeteer to visit every registered route
- Pre-rendered HTML saved to `dist/bot/`
- Node.js server detects bot user-agents and returns pre-rendered HTML instead of the SPA shell
- Human users get the full SPA with client-side routing

---

## Auth Architecture

- Single HTML shell: `index.html` for all routes
- JWT stored in `sessionStorage` (cleared on browser close)
- `authMiddleware` reads `protectedRoutes` from routes.ts; redirects to `/login` if not authenticated
- `auth.isAuthenticated()` and `auth.getUser()` available anywhere
- Sidebar visibility toggled via CSS class `.sidebar-enabled` on `<body>` based on auth + route


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


