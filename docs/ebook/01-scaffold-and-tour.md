# Chapter 01 — Scaffold and Tour

In this chapter you will create the Deskflow project, start the dev server, and
walk every generated file. By the end you will know exactly what lives where and
why — which makes every later chapter much less mysterious.

## Mental model

`create-nativecore` is a one-time scaffolder, not a package you keep installed.
It copies a full project tree into your target folder and then steps aside.
Everything under `.nativecore/` is **vendored runtime** — it belongs to your project,
not to an npm dependency. Generators (`make:*`) read this folder to produce
correctly-wired files. The dev server (`server.js`) is also yours — it is a plain
Node.js file you can read and extend.

## Lab: create Deskflow

Open a terminal in a working directory (not inside an existing project).

```bash
npx create-nativecore@latest deskflow --defaults
cd deskflow
npm run dev
```

The `--defaults` flag skips every prompt (JavaScript, no Capacitor).
If you want TypeScript instead:

```bash
npx create-nativecore@latest deskflow --ts --no-capacitor
```

> **Windows PowerShell:** `npx` works here without changes. The `npm.cmd` trick
> is only needed when passing extra flags to *generator scripts* later.

Open `http://localhost:8000/`. You should see the NativeCoreJS enterprise starter
home page. That page lives in `src/views/public/home.html` — you will replace
its content with Deskflow's home view in a later chapter.

## Tour of the generated layout

```
deskflow/
├── index.html                  # Single HTML shell; router swaps #main-content
├── server.js                   # Dev server, HMR websocket, mock /api routes
├── nativecore.config.json      # useTypeScript, feature flags
├── package.json                # All scripts — make:*, build:ssg, compile, etc.
├── vitest.config.*             # Test runner config
├── .nativecore/
│   ├── core/                   # Router, CoreController, CoreComponent, state
│   ├── utils/                  # html helper, dom utils, templates
│   ├── testing/                # mountComponent, waitFor for Vitest
│   ├── dev/                    # HMR, component overlay (localhost only)
│   └── scripts/                # make-view.mjs, make-component.mjs, ssg.mjs …
└── src/
    ├── app.js                  # Boot entry — keep it minimal
    ├── routes/routes.js        # All route definitions
    ├── controllers/            # One controller per view
    ├── views/
    │   ├── public/             # Unauthenticated views
    │   └── protected/          # Middleware-guarded views
    ├── components/
    │   ├── registry.js         # Lazy-loads all components
    │   ├── appRegistry.js      # Your app components (task-card, etc.)
    │   ├── frameworkRegistry.js# nc-* core components
    │   ├── preloadRegistry.js  # Eagerly loaded components
    │   └── core/               # Built-in nc-* elements
    ├── stores/                 # Shared reactive state modules
    ├── services/               # api.service, storage.service, logger.service
    ├── middleware/             # Empty until you run make:middleware
    └── styles/                 # CSS variables, core.css, main.css
```

> Do **not** hand-edit anything under `.nativecore/core/` or `.nativecore/utils/`.
> Those files are the vendored framework. If you need a framework fix, change
> `packages/nativecorejs` and run `npm run vendor-core` in `create-nativecore`.

## Path aliases

Every import in this project uses an alias. Always include the `.js` extension —
even in TypeScript files, because the runtime resolves ES modules by URL.

| Alias | Resolves to |
|-------|-------------|
| `@core/` | `.nativecore/core/` |
| `@core-utils/` | `.nativecore/utils/` |
| `@testing/` | `.nativecore/testing/` |
| `@components/` | `src/components/` |
| `@routes/` | `src/routes/` |
| `@services/` | `src/services/` |
| `@stores/` | `src/stores/` |
| `@middleware/` | `src/middleware/` |
| `@dev/` | `.nativecore/dev/` (localhost only) |

## How the app boots (`src/app.js`)

Open `src/app.js` and read the comment block at the top. The boot sequence is:

1. `initLazyComponents()` — registers all web components from the registry
2. Freeze a minimal `window.router` helper (navigate, replace, back, getCurrentRoute)
3. Register middleware (none ship by default — you add them with `make:middleware`)
4. `registerRoutes(router)` — wire up route table from `routes/routes.js`
5. `router.start()` wrapped in `pausePageCleanupCollection` / `resumePageCleanupCollection`
6. `initSidebar()` — no-op until you opt into the shell chrome
7. `initDevTools()` — loads HMR and the component overlay on localhost only

The golden rule: **business logic does not belong in `app.js`**. Routes go in
`routes/routes.js`. Component logic goes in controllers. `app.js` is just plumbing.

## Dev tools

After the dev server loads, look for a small pill in the bottom corner of the browser.
Toggle **DEV MODE** on to access:

- Component overlay and gear editor
- Outline panel (shows component tree)
- Drawing annotations
- Performance overlay (FPS, memory, DOM nodes, route timing)

The **Component Builder** is experimental and disabled by default
(`COMPONENT_BUILDER_ENABLED = false` in `server.js`). It is not required for any
part of this book.

## Apply to Deskflow

Your task for this chapter is simply to confirm the scaffold is healthy:

1. Open `nativecore.config.json`. Confirm `"useTypeScript": false` (for `--defaults`).
2. Open `src/app.js` (not `.ts`) and skim the boot sequence.
3. Open `src/routes/routes.js` and find the single `/` route — notice it uses
   `r.register` and `lazyController`.
4. Visit `http://localhost:8000/` and confirm the home page renders.
5. Open the browser console and confirm you see
   `[NativeCore] Dev tools loaded` (a `console.warn`).

## Verify

- [ ] Dev server running on port 8000
- [ ] Home view renders without errors
- [ ] `src/app.js` exists (not `app.ts`) for a `--defaults` project
- [ ] `nativecore.config.json` shows `"useTypeScript": false`
- [ ] `[NativeCore] Dev tools loaded` in the browser console

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Expecting a login page or dashboard | Not shipped — you build your views |
| Editing files inside `.nativecore/core/` | Treat that folder as a library you do not touch |
| Assuming TypeScript is the default | Only enabled with `--ts` |
| Running `npm run dev` from the wrong directory | `cd deskflow` first |
| Port 8000 already in use | Kill the other process or change `PORT` in `.env` |

## Challenges

**Bronze:** Open `server.js` and find the mock `/api` route handler. What does
`GET /api/ping` return? Make a note — you will use it in a later lab.

**Silver:** Add `"appName": "Deskflow"` to `nativecore.config.json`. Then open
`src/app.js` and add a single `console.log` that prints it on boot. Confirm it
appears in the browser console, then remove the log before moving on.

**Gold:** Read `.nativecore/core/router.ts`. Find the `pageloaded` event and
sketch (in plain English) what data is attached to its `detail` object. You will
use this event in a later chapter.

## Next

[Chapter 02 — Views and routes](./02-views-and-routes.md)
