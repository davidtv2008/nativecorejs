# Chapter 24 — Troubleshooting

Fixes for issues that show up most often with create-nativecore apps.

## PowerShell drops flags

**Symptom:** `npm run make:view -- tasks --defaults` ignores `--defaults`.

**Fix:** Use `npm.cmd`:

```bash
npm.cmd run make:view -- tasks --defaults
```

## Folder / port locked on Windows

**Symptom:** Cannot delete `demo-app` / project folder; port 8000 busy.

**Fix:** Stop `npm run dev`, then kill orphaned `esbuild` / `watch-compile` /
Node children that outlive the parent terminal.

## Middleware import stuck in a comment

**Symptom:** `createMiddleware` appears inside `// @middleware` comments; app fails.

**Fix:** Ensure a real top-level import and `router.use(createMiddleware(...))`
in `app.js` / `app.ts`. Re-run `make:middleware` or fix manually.

## Protected route does nothing

**Symptom:** `/settings` loads while “logged out”.

**Fix:** Protected group still has `middleware: []`. Attach your tag
(`['session']`) and register that tag with `createMiddleware` before
`registerRoutes`.

## Custom element not upgrading

**Symptom:** Literal `<task-card>` with no behavior.

**Fix:** Confirm `appRegistry` / `frameworkRegistry` registration and that
`initLazyComponents` / registry side-effect import ran from `app.js`.

## Lazy controller export mismatch

**Symptom:** `Controller export "x" is not a function`.

**Fix:** `lazyController('tasksController', …)` must match an exported
**function** named `tasksController` (generator pattern). Class-only exports
need the class name and a different wiring path — prefer the generated factory.

## Route params always undefined

**Symptom:** Detail page ignores `:id`.

**Fix:** Generated factories use `_params`. Pass `params.id` into the class
(see Chapter 15) or read `window.router.getCurrentRoute()?.params`.

## SSG pre-rendered a “protected” page

**Symptom:** `/settings` HTML appears under `_deploy`.

**Fix:** `ssg.mjs` only auto-skips `protectedRoutes` **array exports** and
dynamic segments. Middleware groups alone are not read. Export
`protectedRoutes` for the script and/or avoid putting secrets in static HTML
(Chapter 20).

## Tests cannot resolve `@testing`

**Symptom:** Vitest import fails.

**Fix:** Use `@testing/index.js` and confirm the Vitest/alias config from the
scaffold still maps `@testing`.

## Expecting shipped auth / Component Builder

**Symptom:** Looking for JWT helpers or a Build button.

**Fix:** Auth is BYO. Component Builder is disabled via
`COMPONENT_BUILDER_ENABLED = false`.

## Next

[Chapter 25 — API quick reference](./25-api-quick-reference.md)
