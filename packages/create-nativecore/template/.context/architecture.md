# NativeCore Architecture

How a scaffolded NativeCore app is structured and how data flows through it.

## Philosophy

- Zero-dependency SPA: native Web Components, History API router, reactive signals
- No JSX, no virtual DOM, no React/Vue runtime
- **JavaScript by default**; TypeScript optional (`--ts`)
- **Auth is not shipped** — authors add middleware when needed
- **Single HTML shell** (`index.html`) — no separate public/protected HTML shells
- Default home is an enterprise starter surface, not a component showcase
  (showcase lives on nativecorejs.com)

## Tech stack

| Layer | Choice |
|-------|--------|
| Language | JS (default) or TS (`nativecore.config.json`) |
| Compile / aliases | esbuild via `.nativecore/scripts/watch-compile.mjs` |
| Dev server | `server.js` + HMR WebSocket |
| Tests | Vitest + happy-dom + `.nativecore/testing` |
| Lint | ESLint (+ typescript-eslint in TS mode), HTMLHint |
| SEO / bots | Puppeteer SSG (`npm run build:ssg`) |
| Native packaging | Optional Capacitor (`--capacitor` or later `cap:init`) |

## Project tree (canonical)

```
.
├── index.html                 # Single shell; #app.minimal-shell by default
├── server.js                  # Dev SPA server, mock API, HMR, DevTools APIs
├── nativecore.config.json     # useTypeScript, feature flags
├── package.json               # generated scripts (make:*, remove:*, build:*)
├── vitest.config.*
├── tsconfig.json              # TypeScript projects only
├── .context/                  # AI / human project guidance
├── .nativecore/
│   ├── core/                  # Framework runtime (router, CoreComponent, …)
│   ├── utils/                 # dom, events, templates, persist, timing, a11y, reconcile, observe, portal
│   ├── types/
│   ├── testing/               # mountComponent, mountController, navigateAndWait, waitFor, fireEvent
│   ├── dev/                   # HMR, denc-tools, overlays (dev-only)
│   └── scripts/               # compile, make:*, remove:*, build helpers
├── src/
│   ├── app.js|ts              # Boot only
│   ├── routes/routes.js|ts
│   ├── controllers/
│   ├── views/
│   │   ├── public/
│   │   └── protected/
│   ├── components/
│   │   ├── registry.js|ts     # calls framework + app registries
│   │   ├── frameworkRegistry.*# nc-* lazy registrations
│   │   ├── appRegistry.*      # app UI + shell chrome registrations
│   │   ├── preloadRegistry.*  # eager imports for first paint
│   │   ├── core/              # nc-* + shell chrome source
│   │   └── ui/                # app-authored components
│   ├── services/              # api, storage, logger (no auth service)
│   ├── config/                # env.js — public client config from .env
│   ├── stores/                # appStore, uiStore, make:store
│   ├── middleware/            # empty by default; make:middleware
│   ├── styles/
│   ├── utils/
│   ├── constants/
│   └── types/
├── .env.example               # copy to .env; PORT server-only; API_BASE_URL public
├── dist/                      # development compiled output (gitignored)
└── dist-prod/                 # isolated production compile output (gitignored)
```

What is **not** present by default:

- `auth.service`, `auth.middleware`, login/dashboard views
- Dual shells (`app.html`), `src/config/routes.*`, `src/core/`
- Capacitor config (unless `--capacitor`)
- Enabled Component Builder UI (code may exist; runtime flag is off)

## Boot sequence (`src/app.*`)

1. `initLazyComponents()` — prepare registries
2. Freeze a small `window.router` API for templates
3. Register middleware under `// @middleware` (generators append here)
4. `registerRoutes(router)`
5. `pausePageCleanupCollection()` → `router.start()` → `resumePageCleanupCollection()`
6. Sidebar helper (no-op while `minimal-shell` is active)
7. Localhost-only: dynamic import HMR, denc-tools, perf `devOverlay`

Keep business logic out of `app.*`.

## Framework core (`.nativecore/core`)

| Module | Role |
|--------|------|
| `component.ts` | `CoreComponent` (canonical); legacy `Component` / `defineComponent` shim |
| `controller.ts` | `CoreController` — refs, state/signal/compute/effect, bind, on, destroy |
| `router.ts` | History router: register, group, middleware, cache, prefetch, loaders, title/meta, nested layouts |
| `form.ts` | `useForm`, `useFieldArray`, `bindField` |
| `validators.ts` | `required`, `email`, `AsyncValidator`, … |
| `lazyController.ts` | `createLazyController(import.meta.url)` → lazy `lazyController(name, path)` |
| `createMiddleware.ts` | `createMiddleware(tag, fn)` for `router.use` / `r.group({ middleware })` |
| `state.ts` | Global `useState`, `computed`, `effect`, `batch`, `untrack`, `peek` |
| `context.ts` | `createContext`, `provide`, `inject` |
| `resource.ts` | Async `{ data, loading, error, refetch }` |
| `i18n.ts` | `configureI18n`, `t` (incl. `Intl.PluralRules` when `count` is set) |
| `lazyComponents.ts` | Lazy custom-element loading from registries |
| `pageCleanupRegistry.ts` | Track page-scoped cleanups across navigations |
| `gpu-animation.ts` | GPU-friendly WAAPI helpers used by `<nc-animation>` |

### Lazy controllers

```js
import { createLazyController } from '@core/lazyController.js';
const lazyController = createLazyController(import.meta.url);

r.register('/profile', 'src/views/public/profile.html',
    lazyController('profileController', '../controllers/profile.controller.js'));
```

- Controllers are never top-level-imported into the route table.
- Factory exports are preferred; class exports are also supported.
- View HTML is fetched and rendered into `#main-content`.

### Middleware

```js
// app.*
import { createMiddleware } from '@core/createMiddleware.js';
import { verifiedMiddleware } from '@middleware/verified.middleware.js';
router.use(createMiddleware('verified', verifiedMiddleware));

// routes.*
r.group({ middleware: ['verified'] }, (r) => { /* … */ });
```

Empty protected group ships as `middleware: []` until authors attach tags.

## Application layer

### Routes (`src/routes/routes.*`)

- Public group marker: `// @group:public`
- Protected group marker: `// @group:protected`
- Generators insert `r.register(...)` into the matching group
- Optional `.cache({ ttl, revalidate })` on routes

### Controllers

- One controller per view when logic is needed
- Exported factory name must match `lazyController('name', ...)`
- Barrel: `src/controllers/index.*` (updated by generators)

### Components

| Registry | Contents |
|----------|----------|
| `frameworkRegistry` | Built-in `nc-*` (+ `make:core-component`) |
| `appRegistry` | App UI + shell chrome tags |
| `preloadRegistry` | Eager side-effect imports for critical first paint |

Default preload is small (e.g. `loading-spinner`, `nc-snackbar`). Shell chrome is registered for lazy use but not preloaded until opted into the DOM.

### Services

- `api.service` — fetch wrapper; **no auth headers by default**
- `storage.service` — local/session helpers
- `logger.service` — logging

### Stores

- `appStore` / `uiStore` ship as examples
- `make:store` creates additional stores and a `stores/index.*` barrel when needed

### Views

- `src/views/public/**` — open routes
- `src/views/protected/**` — routes intended for middleware-gated groups
- Markup only

## Shell model

```html
<div id="app" class="minimal-shell">
  <main class="main-content">
    <div id="main-content" class="page">…</div>
  </main>
</div>
```

To opt into chrome, mount `app-header` / `app-sidebar` / `app-footer` and stop using `minimal-shell` so sidebar visibility helpers can run.

## Data flow

```
URL change
  → router match
  → middleware tags (if any) via createMiddleware handlers
  → fetch view HTML → inject #main-content
  → lazyController import → factory → CoreController
  → refs / bind / on / effect
  → services / stores as needed
  → navigation cleanup via controller.destroy + PageCleanupRegistry
```

No JWT gate exists until the author adds one.

## Dev tooling (localhost only)

Loaded from `app.*` on localhost:

| Module | Purpose |
|--------|---------|
| `@dev/hmr.js` | Hot reload |
| `@dev/denc-tools.js` | Component overlay, editor, outline, drawing, DEV pill |
| `@dev/devOverlay.js` | Performance / SEO / diagnostics overlay |

Component Builder source may exist under `.nativecore/dev/component-builder*`, but it is **experimental** and **`COMPONENT_BUILDER_ENABLED` is false** by default — Build button and shortcut stay off until re-enabled intentionally.

Production builds strip / omit `.nativecore/dev` usage.

## Build and SEO

| Script | Role |
|--------|------|
| `npm run env:sync` | Bake public `.env` keys into `index.html` |
| `npm run compile` | Public env + dev compile + CSS bundle + import map |
| `npm run build` / `build:client` | Production client assets |
| `npm run build:ssg` | Puppeteer pre-render for bots |
| `npm run build:full` | build + SSG |
| `npm run validate` | typecheck (TS) + build:client + tests |

## Environment (`.env`)

Copy `.env.example` → `.env`. The Node server loads the Vite-style cascade
(`.env` → `.env.[mode]` → `.env.local` → `.env.[mode].local`). Only public keys
reach the browser (`NC_PUBLIC_*`, allowlisted `API_*` / `APP_*`, `FEATURE_*`),
injected as `globalThis.__NC_PUBLIC_ENV__` in `index.html`. App code reads
`import { env } from '@config/env.js'` (`env.apiBaseUrl`, etc.). Never put
secrets in public keys. `PORT` / `HMR_PORT` stay server-only.

## Optional Capacitor

Only when scaffolded with `--capacitor` (or added later). JS apps use `capacitor.config.cjs`; TS apps use `capacitor.config.ts`. Not part of the default web scaffold.

## Performance notes

- Controllers and most components are lazy-loaded
- Route HTML/controller modules can use cache + prefetch
- `PageCleanupRegistry` prevents bootstrap effects from being flushed on later navigations
- Prefer instance reactivity (`this.state`) for page-local UI; global stores for shared data
- Keep first-paint preload list small

## Related docs

- `.context/conventions.md` — coding rules and generator usage
- `.context/ai-context.md` — API reference for agents
- `AGENTS.md` — short agent entrypoint (keep aligned with these files)
