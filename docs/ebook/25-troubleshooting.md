# Chapter 25 — Troubleshooting

Use this chapter as a reference when something breaks. Each entry lists a
concrete symptom, the most likely cause, and the exact fix. Start with the
symptom — do not skim the causes first.

---

## PowerShell silently drops flags after `--`

**Symptom:** Running `npm run make:view -- tasks --defaults` produces a view
without the defaults applied, or the generator prompts you interactively when
you expected it to skip prompts.

**Cause:** PowerShell parses `--` differently from bash and sometimes swallows
arguments that follow it.

**Fix:** Use `npm.cmd` instead of `npm` on Windows:

```bash
npm.cmd run make:view -- tasks --defaults
npm.cmd run make:component -- task-card --defaults --with-tests
npm.cmd run make:store -- task
```

`npm.cmd` is the Windows-native command and passes the full argument string to
the script runner without reinterpretation.

---

## Port 8000 is already in use / project folder is locked

**Symptom:** `npm run dev` exits immediately with `EADDRINUSE :8000`, or you
cannot delete a project directory because a file inside it is locked.

**Cause:** Stopping `npm run dev` with Ctrl-C on Windows sometimes leaves
orphaned `esbuild` or `watch-compile.mjs` child processes running. They hold
open ports and file handles even after the parent terminal closes.

**Fix:**

Option A — kill the processes:

```bash
# Find the process on port 8000:
netstat -ano | findstr :8000
# Kill by PID shown in the last column:
taskkill /PID <pid> /F
```

Option B — use npx kill-port:

```bash
npx kill-port 8000
```

Then restart `npm run dev`.

---

## Middleware import stuck in a comment

**Symptom:** The settings route is supposed to be protected, but visiting
`/settings` without authentication loads the page normally. Console shows no
error. Inspecting `app.js`, you notice `createMiddleware` appears inside a
`// @middleware` comment but is never actually called.

**Cause:** `make:middleware` inserts a comment placeholder in `app.js` as a
reminder, but if you did not follow the comment instructions, the middleware
was never wired.

**Fix:** Open `src/app.js` (or `app.ts`) and confirm two things:

1. A real import at the top:

   ```js
   import { sessionMiddleware } from '@middleware/session.js';
   ```

2. A real `router.use(...)` call before `registerRoutes`:

   ```js
   router.use(sessionMiddleware);
   registerRoutes(router);
   router.start();
   ```

If either is missing, add it. You can also re-run `make:middleware` and
carefully follow its printed instructions.

---

## Protected route loads for unauthenticated users

**Symptom:** `/settings` renders even though the user has not "logged in".

**Cause (most common):** The protected group in `routes.js` still has
`middleware: []` — an empty array. SSG skips it correctly, but the router's
runtime guard does nothing because no middleware tag is registered.

**Fix:** Attach your middleware tag:

```js
// routes.js
r.group({ middleware: ['session'] }, (r) => {
    r.register('/settings', 'src/views/protected/settings.html', ...);
});
```

And confirm `createMiddleware('session', fn)` is registered with the router
**before** `registerRoutes` is called.

**Cause (secondary):** Your middleware factory function always returns `true`
during development. Make sure the guard logic is actually implemented, not just
stubbed.

---

## Custom element tag renders with no behavior

**Symptom:** `<task-card>` appears in the DOM as a plain unknown element.
Attributes are present, but no shadow DOM, no template, and no event response.

**Cause:** The custom element was never defined in the browser's registry.
`customElements.define` was not called before the tag appeared in the DOM.

**Fix steps:**

1. Confirm `task-card` is registered in `src/components/appRegistry.js` (or `.ts`):

   ```js
   componentRegistry.register('task-card', './ui/task-card.js');
   ```

2. Confirm `initLazyComponents()` (or the equivalent registry bootstrap) is
   called from `app.js` before the router starts.

3. Open the browser console. Run:

   ```js
   customElements.get('task-card')
   ```

   If this returns `undefined`, the module was not loaded. If it returns the
   class, the element is registered — the problem may be a missing `ref` or a
   template error.

---

## Lazy controller export mismatch

**Symptom:** The route loads the view HTML but the controller never runs. The
console shows something like: `Controller export "tasksController" is not a
function`.

**Cause:** `lazyController('tasksController', '../controllers/tasks.controller.js')`
expects the module at that path to export a **function** named `tasksController`.
If the export is a class (not a factory function), or if the name does not match,
the lazy loader cannot call it.

**Fix:** Follow the generated factory pattern:

```js
export class TasksController extends CoreController { ... }

// Required: a named factory function that matches the first argument to lazyController()
export function tasksController(_params, _state, _loaderData, rootElement) {
    const ctrl = new TasksController(rootElement);
    return () => ctrl.destroy();
}
```

The factory name must match exactly (case-sensitive) the string passed to
`lazyController(...)`.

---

## Route params are always undefined

**Symptom:** You defined `/tasks/:id` and the detail page renders, but
`params.id` is always `undefined` inside the controller.

**Cause:** The generated factory signature uses `_params` (unused) as the
first argument. The actual params object is only meaningful if you read and
pass it into the controller.

**Fix:** Read `_params` in the factory and pass `params.id` into the
controller:

```js
export function taskDetailController(params, _state, _loaderData, rootElement) {
    const ctrl = new TaskDetailController(rootElement, params.id);
    return () => ctrl.destroy();
}
```

Or read the current route from the global router inside `onMount`:

```js
const currentRoute = window.router.getCurrentRoute();
const id = currentRoute?.params?.id;
```

---

## SSG pre-rendered a protected page

**Symptom:** After running `build:ssg`, you find `_deploy/settings/index.html`
in the output — but `/settings` is supposed to be protected.

**Cause:** `ssg.mjs` detects protected routes by looking for `r.group({
middleware: [...] }, ...)` with a **non-empty** middleware array. An empty
array (`middleware: []`) is treated as public.

**Fix (preferred):** Ensure the protected group uses a non-empty middleware
array:

```js
r.group({ middleware: ['session'] }, (r) => {
    r.register('/settings', ...);
});
```

**Fix (alternative):** Export a `protectedRoutes` array from your routes file:

```js
export const protectedRoutes = ['/settings', '/dashboard'];
```

SSG also reads this legacy export and skips the listed paths.

---

## Tests cannot resolve `@testing`

**Symptom:** Vitest fails with `Cannot find module '@testing/index.js'`.

**Cause:** The `@testing` alias is not configured in Vitest's resolve config,
or the alias was removed from `vite.config.js` / `vitest.config.js`.

**Fix:** Open `vite.config.js` (or `vitest.config.js`) and confirm the alias
mapping:

```js
resolve: {
    alias: {
        '@testing': path.resolve(__dirname, '.nativecore/testing'),
        // ... other aliases
    },
}
```

The alias must point at `.nativecore/testing` (the directory), not at the
index file itself. Then import as:

```js
import { mountComponent, waitFor, fireEvent } from '@testing/index.js';
```

---

## Expecting shipped auth or a login flow

**Symptom:** You are looking for a `login.controller.js`, JWT helpers, or
session management utilities in the scaffold but cannot find them.

**Cause:** Auth is not shipped. NativeCoreJS provides the middleware plumbing
(`createMiddleware`) and protected route groups, but the auth logic is
author-owned.

**Fix:** Use `make:middleware` to generate a session middleware stub:

```bash
npm.cmd run make:middleware -- session
```

Then implement the guard function to match your backend (cookie check, JWT
validation, OAuth callback, or a simple in-memory flag for demos). See
[Chapter 09](./09-middleware-and-protection.md).

---

## Expecting a Component Builder UI

**Symptom:** You read about a visual component builder but cannot find a Build
button or a drag-and-drop panel in the DEV MODE overlay.

**Cause:** Component Builder is experimental and disabled by default.

**Fix:** This is working as intended. `COMPONENT_BUILDER_ENABLED = false` in
`.nativecore/dev/denc-tools.ts`. Do not enable it for day-to-day development
or for learning exercises in this ebook. See [Chapter 19](./19-dev-tools.md).

---

## `r.register` vs `router.register`

**Symptom:** Calling `router.register(...)` inside `registerRoutes(r)` results
in a route not being found, or routes registered twice.

**Cause:** Inside the `registerRoutes(r)` callback, the parameter `r` is the
group-scoped registration context. Calling `router.register` bypasses grouping
and middleware.

**Fix:** Always use `r.register` inside `registerRoutes`:

```js
export function registerRoutes(r) {
    r.group({}, (r) => {
        r.register('/', 'src/views/public/home.html', ...);
    });
}
```

---

## `build:ssg` fails with "server did not become ready"

**Symptom:** `npm run build:ssg` starts but then prints:

```
Server did not become ready within 30 seconds
```

**Cause:** `ssg.mjs` starts `node server.js` and waits for it to serve a valid
HTML response on port 8000. If the server takes too long, returns JSON, or
errors before becoming ready, SSG aborts.

**Fix steps:**

1. Confirm `npm run build` has been run first — `ssg.mjs` requires `_deploy/`
   to exist.
2. Start the server manually and check it serves HTML on port 8000:
   ```bash
   node server.js
   curl http://localhost:8000
   ```
3. If another process is already on port 8000, stop it before running SSG.
4. On CI, ensure Chromium is available for Puppeteer (the `puppeteer` package
   handles this automatically if `PUPPETEER_SKIP_DOWNLOAD` is not set).

---

## What's next

- [Chapter 26 — API quick reference](./26-api-quick-reference.md) — lookup
  tables for every major API in the framework

Keep this chapter bookmarked. The most time-consuming bugs in NativeCoreJS
apps trace back to three root causes: a missing `.js` extension in an import,
a middleware array that stayed empty, or a custom element that was never
registered. Check those three things first.
