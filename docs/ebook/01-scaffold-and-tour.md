# Chapter 01 — Scaffold and Tour

Create Deskflow and learn the generated layout.

## Create the project

From a working directory:

```bash
# JavaScript (default) — recommended for this book
npx create-nativecore@latest deskflow --defaults

cd deskflow
npm run dev
```

TypeScript instead:

```bash
npx create-nativecore@latest deskflow-ts --ts --no-capacitor
```

Optional Capacitor at create time: add `--capacitor`.

Open `http://localhost:8000/`. You should see the enterprise starter home.

> **Windows:** When passing flags through npm scripts later, prefer `npm.cmd run … -- <args>`.

## What was generated (important paths)

```
deskflow/
├── index.html                 # Single shell; #main-content outlet
├── server.js                  # Dev server + HMR + mock /api
├── nativecore.config.json     # useTypeScript, feature flags
├── package.json
├── vitest.config.*
├── .nativecore/
│   ├── core/                  # Framework runtime (vendored)
│   ├── utils/
│   ├── testing/
│   ├── dev/                   # localhost tools
│   └── scripts/               # compile, make:*, remove:*, ssg
├── src/
│   ├── app.js                 # Boot only (or app.ts)
│   ├── routes/routes.js
│   ├── controllers/
│   ├── views/public|protected/
│   ├── components/            # registries + core/ + ui/
│   ├── services/              # api, storage, logger (no auth)
│   ├── stores/
│   ├── middleware/            # empty until you generate
│   └── styles/
└── dist/                      # compile output
```

## Path aliases

Imports always use a `.js` extension, even in TypeScript projects:

```
@core/         → .nativecore/core/
@core-utils/   → .nativecore/utils/
@testing/      → .nativecore/testing/
@components/   → src/components/
@routes/       → src/routes/
@services/     → src/services/
@stores/       → src/stores/
@middleware/   → src/middleware/
@dev/          → .nativecore/dev/   (localhost only)
```

## Boot sequence (`src/app.js`)

1. `initLazyComponents()`
2. Freeze a small `window.router` helper
3. Register middleware under `// @middleware` (generators append here)
4. `registerRoutes(router)`
5. Start router inside `pausePageCleanupCollection` / `resumePageCleanupCollection`
6. On localhost: load HMR, denc-tools, performance overlay

Keep business logic out of `app.js`.

## Dev tools (localhost)

After `npm run dev`, turn **DEV MODE** on via the bottom pill:

- Component overlay / gear editor
- Outline panel
- Drawing annotations
- Performance overlay (FPS, MEM, DOM, route timing, …)

The Component Builder is **experimental** and **disabled by default** (`COMPONENT_BUILDER_ENABLED = false`). It is not a required feature.

## Apply to Deskflow

> **Feature:** Project exists and runs.
> **Commands:** `npx create-nativecore@latest deskflow --defaults` then `npm run dev`

1. Confirm home loads.
2. Confirm console shows `[NativeCore] Dev tools loaded` on localhost (or a clear error if something failed).
3. Skim `nativecore.config.json` — `"useTypeScript": false` for this book’s default path.

## Verify

- [ ] Dev server on port 8000
- [ ] Home view renders
- [ ] `src/app.js` (not `.ts`) for `--defaults`

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Expecting login/dashboard routes | Not shipped — you will add views |
| Editing `.nativecore/` casually | Prefer app `src/`; treat core as framework |
| Assuming TypeScript | Only with `--ts` |

## Next

[Chapter 02 — Views and routes](./02-views-and-routes.md)
