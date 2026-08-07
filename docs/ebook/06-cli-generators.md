# Chapter 06 — CLI Generators

Every file in a NativeCoreJS project has a prescribed shape: the right extension
(`.js` or `.ts`), the right registry line, the right barrel export. Doing this
by hand is tedious and error-prone. The generator scripts do it correctly in under
a second. This chapter teaches you every generator, when to use each one, and what
to do on the rare occasion when a generator cannot help.

## Mental model

Generators are **opinionated file factories**. Each one reads two things:

1. `nativecore.config.json` — determines whether to emit `.js` or `.ts`
2. The existing file it needs to update (registry, routes, barrel index)

Run a generator, review the diff, and move on. You should almost never create a
component, controller, store, or view by hand.

> **Windows PowerShell:** When you pass flags after `--`, use `npm.cmd run` instead
> of `npm run`. PowerShell strips flags after `--` for `npm run` but not for
> `npm.cmd run`.

## The full generator surface

| Script | What it creates | What it updates |
|--------|----------------|-----------------|
| `make:component` | `src/components/ui/<name>.*` | `appRegistry.*` |
| `make:core-component` | `src/components/core/nc-<name>.*` | `frameworkRegistry.*`, `preloadRegistry.*` |
| `make:controller` | `src/controllers/<name>.controller.*` | `src/controllers/index.*` |
| `make:store` | `src/stores/<name>.store.*` | `src/stores/index.*` |
| `make:view` / `make:page` | View HTML + optional controller | `routes.*`, viewsMap |
| `make:middleware` | `src/middleware/<name>.middleware.*` | `app.*` `router.use(...)` |
| `remove:component` | — | Removes file, registry line, generated tests |
| `remove:core-component` | — | Removes file, preload entry, frameworkRegistry line |
| `remove:view` | — | Removes view HTML, controller, route line |
| `remove:store` | — | Removes store file, barrel line |
| `remove:middleware` | — | Removes middleware file, `app.*` import |

> There are **no** `delete:*` scripts. Always use `remove:*`.
> There is also no `remove:controller` — if you need to delete a controller,
> remove the file and its export line from `src/controllers/index.*` manually.

## Components

`make:component` creates a UI component under `src/components/ui/` and adds it
to `appRegistry.*` so it is lazy-loaded automatically.

```bash
# Interactive (prompts for name, shadow DOM, tests, etc.)
npm.cmd run make:component -- task-card

# Non-interactive defaults (Shadow DOM on, no tests)
npm.cmd run make:component -- task-card --defaults

# Include a Vitest test file
npm.cmd run make:component -- task-card --defaults --with-tests

# Mark as prefetchable (added to preloadRegistry instead of appRegistry)
npm.cmd run make:component -- task-card --prefetch --defaults
```

Generated stub (JS, Shadow DOM):

```js
import { CoreComponent, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';

export class TaskCard extends CoreComponent {
    static useShadowDOM = true;

    template() {
        return html`
            <slot></slot>
        `;
    }
}

defineComponent('task-card', TaskCard);
```

`make:core-component` creates an `nc-*` element under `src/components/core/` and
updates `frameworkRegistry.*`. Use this only for framework-level primitives, not
for app-specific UI.

## Controllers

`make:controller` creates a controller file and a matching barrel export.
Use it when you need a controller that is not paired with a new view:

```bash
npm.cmd run make:controller -- tasks
```

The generated factory already returns the cleanup function:

```js
import { CoreController } from '@core/controller.js';

export class TasksController extends CoreController {
    onMount() {}
}

export function tasksController(_params, _state, _loaderData, rootElement) {
    const ctrl = new TasksController(rootElement);
    return () => ctrl.destroy();
}
```

Notice the factory signature: `_params, _state, _loaderData, rootElement`.
Generators still emit four parameters, but the router / `lazyController` only
forwards three args — `(params, state, loaderData)`. The 4th `rootElement` is
usually `undefined`; `CoreController` resolves the view root itself via
`[data-view]`. Keep the generated stub as-is. If you do not need a param,
prefix it with `_` to signal intent.

## Stores

`make:store` creates a reactive state module under `src/stores/` and adds it to
the stores barrel:

```bash
npm.cmd run make:store -- task
```

Generated output wraps module-level state in `pausePageCleanupCollection` /
`resumePageCleanupCollection`, exports `taskItems` / `taskLoading` / `taskError`,
a `taskCount` computed, and `loadTasks` / `addTask` / `removeTask` against
`api.service`. See [Chapter 10](./10-global-stores.md) for the full shape —
always read the generated file before editing it.

## Views

`make:view` is the most commonly used generator. It creates the HTML view,
optionally a controller, and updates the route table.

```bash
# Public /tasks with a controller (interactive)
npm.cmd run make:view -- tasks

# Public /tasks, non-interactive defaults
npm.cmd run make:view -- tasks --defaults

# Protected /settings
npm.cmd run make:view -- settings --protected --defaults

# Dynamic route, no controller
npm.cmd run make:view -- task-detail --route /tasks/:id --no-controller --defaults
```

After running any `make:view`, open `src/routes/routes.js` and confirm the new
`r.register` line landed in the correct group (`// @group:public` or
`// @group:protected`).

## Middleware

`make:middleware` creates a middleware file and registers it in `app.*` automatically:

```bash
npm.cmd run make:middleware -- session
```

It produces `src/middleware/session.middleware.*` and adds the `router.use(...)` call
to `app.*`. You then edit the middleware body to implement your guard logic.
Once it is registered, add its tag to the protected route group in `routes.*`:

```js
r.group({ middleware: ['session'] }, (r) => {
    r.register('/settings', ...);
});
```

Auth is not included in the scaffold. `make:middleware` gives you the wiring;
you write the guard.

## Removing things

When you remove a component, view, store, or middleware, always use the `remove:*`
script. It cleans up registry lines that a plain file delete would leave behind.

```bash
# Remove a UI component
npm.cmd run remove:component -- task-card

# Remove a view (and its controller and route line)
npm.cmd run remove:view -- tasks --yes

# Remove a store
npm.cmd run remove:store -- task

# Remove middleware
npm.cmd run remove:middleware -- session
```

The `--yes` flag skips the "are you sure?" confirmation prompt.

## Language mode

Generators read `nativecore.config.json` to decide the file extension:

```json
{ "useTypeScript": false }   →   .js files
{ "useTypeScript": true  }   →   .ts files
```

You do not pass a language flag to the generator — it picks up the project setting
automatically. If you scaffold with `--defaults`, you get `.js`. If you scaffold
with `--ts`, you get `.ts`.

## After every generator run

Run `npm run compile` (or let the dev server watcher pick it up) to ensure the
new file is compiled into `dist/`:

```bash
npm run compile
```

If you are already running `npm run dev`, the file watcher handles this automatically.
You only need to run `compile` manually if the dev server is not running.

## Lab: generate the remaining Deskflow scaffolding

At the end of Chapter 05 you have a `task-card` component. Let us make sure
everything was generated correctly and add the task store:

```bash
# If you have not already generated task-card:
npm.cmd run make:component -- task-card --defaults

# Generate the task store
npm.cmd run make:store -- task

# Confirm the dev server still compiles
npm run compile
```

Open `src/stores/task.store.js`. Keep the generated pause/resume + API actions.
Add a computed for the open count alongside the generated `taskCount`:

```js
export const openCount = computed(() =>
    taskItems.value.filter(t => !t.done).length
);
```

Then update `TasksController` to import from the store instead of using
local instance state (the Gold challenge from Chapter 04 — do it now if you have
not already).

## Apply to Deskflow

From this chapter forward, use a generator for every new file. When you find
yourself typing `import { CoreComponent }` in a fresh file, stop — run the
generator instead.

Audit your project against the rule: every component in `src/components/ui/`
should have a line in `appRegistry.*`; every route in `routes.*` should have
been created by `make:view`. If something is out of alignment, the easiest
fix is `remove:*` followed by `make:*`.

## Verify

- [ ] `npm run compile` succeeds after each generator run
- [ ] `src/stores/task.store.js` exists and exports `taskItems`, `openCount`, `loadTasks`
- [ ] `src/components/ui/task-card.js` exists and has a registry line in `appRegistry.js`
- [ ] No orphaned files: every component has a registry entry; every route has a route line
- [ ] On Windows: `npm.cmd run make:component -- task-card --defaults` passes `--defaults` correctly

## Common mistakes

| Mistake | Fix |
|---------|-----|
| `npm run make:component -- task-card --defaults` on PowerShell drops `--defaults` | Use `npm.cmd run make:component -- task-card --defaults` |
| Using `delete:component` or `delete:view` | Those scripts do not exist — use `remove:*` |
| `remove:controller` | Not available — delete file + barrel line manually |
| Hand-creating a component and forgetting the registry line | Run `remove:component` then `make:component` to re-generate cleanly |
| Generator runs but file extension is wrong | Check `nativecore.config.json` — `"useTypeScript"` must be set correctly |
| Forgetting `npm run compile` after generating in a stopped dev server | The watcher is off — run `npm run compile` manually |

## Challenges

**Bronze:** Run `npm.cmd run make:controller -- home` and compare the generated
output to `src/controllers/home.controller.js`. What is different? Which pattern
matches this book's factory signature?

**Silver:** Generate a `make:store -- ui` store. Add a `useState(false)` for
`darkMode` and a setter `toggleDark`. Import it in `TasksController` and wire
a button click to `toggleDark()`. Confirm the value changes in the store (add a
temporary `console.log` inside `effect(() => { ... })` to verify).

**Gold:** Run `npm.cmd run make:middleware -- auth`. Read the generated file.
Then update `routes.js` to add `middleware: ['auth']` to the protected group.
Open the browser and navigate to `/settings`. Observe what happens. Then
implement a minimal `authMiddleware` that redirects to `/` when
`sessionStorage.getItem('authed')` is falsy. Test it by setting the key in
DevTools console and navigating again.

## Next

[Chapter 07 — Deskflow tasks](./07-deskflow-tasks.md)
