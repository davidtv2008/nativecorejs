# Chapter 01 — Project Setup

## Scaffolding with the CLI

NativeCoreJS ships a zero-config project scaffolder. Open a terminal, navigate to wherever you keep your projects, and run:

```bash
npm create nativecore@latest taskflow
```

The CLI will walk you through a short series of prompts:

```
Auth strategy note:
  The included auth flow uses JWT tokens stored in sessionStorage with
  automatic refresh token rotation. Tokens are cleared when the browser
  tab closes. If your project requires a different strategy, replace
  auth.service.ts and api.service.ts accordingly.

Include auth flow? (y):
Include dashboard route? (y):
Install dependencies now? (y):
```

> **Note:** TypeScript is always enabled — it is not configurable. There is no CSS preprocessor option (plain CSS only) and no package manager choice (always npm).

For Taskflow, accept all defaults. When the prompts complete, the CLI installs dev dependencies and prints:

```
Project ready.

  cd taskflow
  npm run dev

Your project has no runtime dependencies — only the dev tools listed above.
```

---

## The Generated File Structure

Change into the new directory and open it in your editor:

```bash
cd taskflow
```

Here is what the scaffold produces:

```
taskflow/
├── .nativecore/              # Framework internals: core, scripts, HMR, component overlay
├── api/                      # Local mock API (dev only)
├── public/                   # Static assets copied as-is to the build output
├── src/
│   ├── app.ts                # Application entry point
│   ├── components/           # Web Components
│   │   ├── registry.ts       # Lazy component registry
│   │   ├── preloadRegistry.ts
│   │   ├── core/             # Layout components (app-header, app-sidebar, etc.)
│   │   └── ui/               # Reusable nc-* UI components
│   ├── constants/            # App-wide constants (routes, endpoints, storage keys)
│   ├── controllers/          # Route controllers
│   │   └── index.ts          # Named re-exports for all controllers
│   ├── middleware/           # Router middleware (e.g. auth guard)
│   ├── routes/
│   │   └── routes.ts         # Central route registry
│   ├── services/             # API, auth, logger, storage services
│   ├── stores/               # Global reactive stores
│   ├── styles/               # Global CSS (core.css, main.css, variables.css)
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Helper utilities
│   └── views/
│       ├── public/           # Views accessible without authentication
│       └── protected/        # Views that require authentication
├── tests/                    # Unit tests (Vitest + happy-dom)
├── index.html                # App shell
├── server.js                 # Dev server (port 8000) with HMR and mock API
├── tsconfig.json
├── tsconfig.build.json
└── vitest.config.ts
```

### `index.html` — The App Shell

The generated `index.html` is production-ready from day one. It includes SEO meta tags, Open Graph tags, a JSON-LD structured data block, and a FOUC-prevention inline script. The key parts to understand at this stage are in the `<body>`:

```html
<body>
  <div id="page-progress"></div>

  <div id="app" class="no-sidebar">
    <app-header class="app-header"></app-header>
    <app-sidebar></app-sidebar>

    <main class="main-content">
      <div id="main-content" class="page">
        <loading-spinner message="Loading page..."></loading-spinner>
      </div>
      <app-footer></app-footer>
    </main>

    <nc-scroll-top to="top"></nc-scroll-top>
  </div>

  <nc-snackbar position="bottom-right"></nc-snackbar>

  <script type="module">
    (function() {
      const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      const version = isDev ? Date.now() : '__VERSION__';
      import(`/dist/src/app.js?v=${version}`);
    })();
  </script>
</body>
```

The router renders views into `#main-content` — not directly into `#app`. The outer `#app` wrapper holds the persistent layout shell (header, sidebar, footer) that stays mounted across navigations. The single `<script type="module">` at the bottom loads the compiled entry point from `dist/`.

### `src/app.ts` — The Entry Point

`app.ts` boots everything in the correct order:

```typescript
import router from '@core/router.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { registerRoutes } from './routes/routes.js';
import './components/registry.js';

async function init() {
    // verify any existing session token with the server
    await verifyExistingSession();
    // lazy-load components registered in registry.ts
    await initLazyComponents();

    router.use(authMiddleware);
    registerRoutes(router);
    router.start();
}

init();
```

Keep `app.ts` minimal. Routes belong in `routes/routes.ts`, components in `components/registry.ts`, and auth logic in `services/auth.service.ts`.

### `src/routes/routes.ts`

```typescript
import { bustCache } from '@core-utils/cacheBuster.js';
import type { ControllerFunction } from '@core/router.js';

function lazyController(controllerName: string, controllerPath: string): ControllerFunction {
    return async (...args: any[]) => {
        const module = await import(bustCache(controllerPath));
        return module[controllerName](...args);
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

`lazyController` is defined locally in this file — it is not imported from the framework. It wraps a dynamic `import()` so the controller module is only fetched when its route is first visited. `.cache()` takes a `{ ttl, revalidate }` options object. `router.start()` is called from `app.ts`, not here.

The `protectedRoutes` export is the authoritative list of paths that require authentication. The auth middleware in `app.ts` uses this list to redirect unauthenticated users to `/login`. We wire up that logic in Chapter 07.

### `tsconfig.json` — Path Aliases

```json
{
  "compilerOptions": {
    "paths": {
      "@core/*":        [".nativecore/core/*"],
      "@core-utils/*":  [".nativecore/utils/*"],
      "@core-types/*":  [".nativecore/types/*"],
      "@components/*":  ["src/components/*"],
      "@services/*":    ["src/services/*"],
      "@utils/*":       ["src/utils/*"],
      "@stores/*":      ["src/stores/*"],
      "@middleware/*":  ["src/middleware/*"],
      "@constants/*":   ["src/constants/*"],
      "@config/*":      ["src/config/*"],
      "@routes/*":      ["src/routes/*"],
      "@types/*":       ["src/types/*"]
    }
  }
}
```

`@core/*` and `@core-utils/*` resolve into the `.nativecore/` folder — the framework internals that ship with the scaffolder. Everything else resolves into `src/`. Always include the `.js` extension on every import even in TypeScript files, because the compiled output is plain ES modules.

---

## Starting the Dev Server

```bash
npm run dev
```

This compiles TypeScript, resolves path aliases, and starts `server.js`. The terminal prints:

```
Server running at http://localhost:8000/
```

The dev server runs on port **8000**. It serves the compiled `dist/` files, handles SPA fallback routing, serves the mock API under `/api/`, and opens a WebSocket connection on port 8001 for HMR. When you save a `.ts` or `.html` file the TypeScript watcher recompiles it and the browser reloads the affected module automatically.

---

## Generator Commands

The scaffolded project includes generator scripts for the three things you create most often:

```bash
npm run make:component <name>   # creates src/components/ui/<name>.ts, registers in registry.ts
npm run make:view <name>        # interactive: creates view HTML + optional controller + route entry
npm run make:controller <name>  # creates src/controllers/<name>.controller.ts + index.ts export
```

> **Web Component naming rule:** The name passed to `make:component` must be in `kebab-case` and **must contain at least one hyphen** (e.g. `task-card`, not `TaskCard` or `taskcard`). This is a browser requirement — the Custom Elements spec rejects any tag name without a hyphen. The generator enforces this and will error if the name is invalid.

`make:view` prompts in this order:

```
Should this route require login? (y/n):
Route path (/name):
Create a controller for this view? (y/n):
```

It writes the view HTML, optionally writes a controller, adds the export to `controllers/index.ts`, and inserts the route registration into `routes.ts` — all in one step.

`make:component` always creates the file at `src/components/ui/<name>.ts` and appends the registration line to `src/components/registry.ts`.

---

## Setting Up the Taskflow Views

Let's create the three views we will build into over the coming chapters:

> **Note:** If you accepted the default "Include auth flow?" prompt when scaffolding the project, a `/login` route and its controller were already generated. You can skip the first command below and go straight to `npm run make:view tasks`.

> **Note:** If you accepted the default "Include dashboard route?" prompt when scaffolding, `/dashboard` was also generated automatically. Skip that last command if it already exists in your `routes.ts`.

```bash
npm run make:view login
# Should this route require login? n
# Route path (/login):
# Create a controller for this view? n

npm run make:view tasks
# Should this route require login? y
# Route path (/tasks):
# Create a controller for this view? y

npm run make:view dashboard
# Should this route require login? y
# Route path (/dashboard):
# Create a controller for this view? y
```

After running these, `src/routes/routes.ts` will have the new routes appended inside `registerRoutes`. Open it and confirm the three new registrations are present alongside the defaults before moving on.

---

## Apply This Chapter to Project 1 — Taskflow

> **Project:** Taskflow — Personal Task Manager  
> **Feature:** Scaffold the project, start the dev server, and create the three core views.

Run the CLI scaffolder for Taskflow, start the dev server, and use `make:view` to create the `/login`, `/tasks`, and `/dashboard` routes. Confirm all three routes load in the browser before moving to Chapter 02.

### Done Criteria

- [ ] `npm create nativecore@latest taskflow` completes without errors.
- [ ] `npm run dev` opens the app at `http://localhost:8000`.
- [ ] `/login`, `/tasks`, and `/dashboard` routes are registered in `src/routes/routes.ts`.
- [ ] The NativeCoreJS dev tools panel is visible in the browser on `localhost`.

---

**Back:** [Chapter 00 — Introduction](./00-introduction.md)  
**Next:** [Chapter 02 — First Component](./02-first-component.md)
