# Chapter 02 — Views and Routes

In this chapter you will add two new pages to Deskflow: a public tasks list and a
protected settings page. You will learn the shape of an HTML view, how the router
table works, and how the `make:view` generator wires everything together
so you do not have to do it manually.

## Mental model

Think of a **view** as a dumb HTML fragment. It holds markup and `ref` attributes
but has no logic. The router fetches it, injects it into `#main-content`, and then
calls a **controller factory** to boot the logic for that page.

A **route** is one line in `registerRoutes(r)` that connects three things:

```
path  →  view HTML file  →  controller factory (lazy-loaded)
```

The router only loads the controller module when the user first visits that path.
That is what `createLazyController` does: it returns a wrapper that imports the
module on demand and calls your factory.

## What a view file looks like

Views live under `src/views/public/` or `src/views/protected/`. They contain
**markup only** — no `<script>`, no `<style>`, no template literals.

A minimal tasks view:

```html
<div class="tasks-page" data-view="tasks">
    <header class="tasks-header">
        <h1>Tasks</h1>
        <span ref="countEl" class="tasks-badge">0</span>
    </header>
    <ul ref="listEl" class="tasks-list"></ul>
</div>
```

Three things to notice:

- `data-view="tasks"` — `CoreController` uses this to find its root element.
  Without it, the controller constructor will throw.
- `ref="countEl"` — after the controller boots, `this.countEl` is automatically
  set to that `<span>` element. No `querySelector` needed.
- No `<script>` or `<style>` tags — those belong in controllers and `src/styles/`.

## How routes work

Open `src/routes/routes.js`. The scaffold looks like this:

```js
import { createLazyController } from '@core/lazyController.js';

const lazyController = createLazyController(import.meta.url);

export function registerRoutes(r) {
    // @group:public
    r.group({}, (r) => {
        r.register('/', 'src/views/public/home.html',
            lazyController('homeController', '../controllers/home.controller.js'))
            .cache({ ttl: 300, revalidate: true });
    });

    // @group:protected
    r.group({ middleware: [] }, (r) => {
        // make:view (protected) inserts here
    });
}
```

Rules you must follow every time you add a route:

1. Use `r.register` — never `router.register` inside `registerRoutes`.
2. Never `import` a controller at the top of the routes file. Use `lazyController`.
3. The `lazyController` second argument is a **relative** path from `routes.js`
   to the controller file — typically `'../controllers/foo.controller.js'`.
4. Protected routes go inside the `r.group({ middleware: [] })` block. You will
   add real middleware tags in a later chapter.

## Generator: `make:view`

Rather than creating files by hand, use the generator. It creates the HTML view,
an optional controller, updates `routes.js`, and updates any view maps — all in
one command.

Interactive (prompts you for options):

```bash
npm.cmd run make:view -- tasks
```

Non-interactive (CI-friendly, or when you already know what you want):

```bash
# Public route at /tasks with a controller
npm.cmd run make:view -- tasks --defaults

# Protected route at /settings with a controller
npm.cmd run make:view -- settings --protected --defaults

# Dynamic route (no controller)
npm.cmd run make:view -- task-detail --route /tasks/:id --no-controller --defaults
```

`make:page` is an alias for `make:view`. Both do the same thing.

After each generator run, open `src/routes/routes.js` and confirm the new
`r.register` line was inserted in the right group.

## Lab: add the Deskflow pages

Make sure your dev server is running (`npm run dev`), then run:

```bash
npm.cmd run make:view -- tasks --defaults
npm.cmd run make:view -- settings --protected --defaults
```

You will see generator output listing the files created. Now open each one:

**`src/views/public/tasks.html`** — Replace the generated placeholder content
with the tasks markup from above (keep `data-view="tasks"`, add `ref="countEl"`
and `ref="listEl"`):

```html
<div class="tasks-page" data-view="tasks">
    <header class="tasks-header">
        <h1>My Tasks</h1>
        <span ref="countEl" class="tasks-badge">0</span>
    </header>
    <ul ref="listEl" class="tasks-list"></ul>
</div>
```

**`src/views/protected/settings.html`** — Replace with a simple shell:

```html
<div class="settings-page" data-view="settings">
    <h1>Settings</h1>
    <p>Preferences will go here.</p>
</div>
```

**`src/controllers/tasks.controller.js`** — The generator created a stub. Open
it and make sure the factory calls `ctrl.destroy()` on cleanup:

```js
import { CoreController } from '@core/controller.js';

export class TasksController extends CoreController {
    onMount() {
        this.assertRefs('countEl', 'listEl');
    }
}

export function tasksController(_params, _state, _loaderData, rootElement) {
    const ctrl = new TasksController(rootElement);
    return () => ctrl.destroy();
}
```

**`src/routes/routes.js`** — Confirm it now contains both new routes:

```js
r.register('/tasks', 'src/views/public/tasks.html',
    lazyController('tasksController', '../controllers/tasks.controller.js'));
```

```js
r.register('/settings', 'src/views/protected/settings.html',
    lazyController('settingsController', '../controllers/settings.controller.js'));
```

Visit `http://localhost:8000/tasks` — you should see "My Tasks".
Visit `http://localhost:8000/settings` — you should see "Settings".
The settings route is not guarded yet (the middleware array is empty), so it renders
for everyone. You will lock it down in a later chapter.

## How the router injects views

When you navigate to `/tasks`:

1. The router matches the path and fetches `src/views/public/tasks.html`.
2. It parses the HTML and injects it into `<div id="main-content">` in `index.html`.
3. It calls the `tasksController` factory (lazy-importing the module first if needed).
4. When you navigate away, the factory's cleanup function (`() => ctrl.destroy()`)
   runs to tear down listeners and reactive effects.

That cleanup step is the reason every factory must return `() => ctrl.destroy()`.
Forgetting it means listeners pile up across navigations.

## Apply to Deskflow

At the end of this chapter, Deskflow has:

- `src/views/public/home.html` — starter home (scaffold default)
- `src/views/public/tasks.html` — your new tasks shell
- `src/views/protected/settings.html` — your new settings shell
- Controllers for all three
- Three entries in `routes.js`

That is a three-page SPA. No framework config, no bundler plugins — just files
the router knows about.

## Verify

- [ ] `/tasks` renders "My Tasks" without console errors
- [ ] `/settings` renders "Settings" without console errors
- [ ] Both route registrations use `r.register` (not `router.register`)
- [ ] `tasks.html` has `data-view="tasks"`, `ref="countEl"`, `ref="listEl"`
- [ ] `settings.html` lives under `src/views/protected/`
- [ ] Both controller factories return `() => ctrl.destroy()`

## Common mistakes

| Mistake | Fix |
|---------|-----|
| `router.register(...)` inside `registerRoutes` | Use `r.register` — the parameter |
| Top-level `import HomeController from '../controllers/home.controller.js'` in routes | Only use `lazyController` for route controllers |
| `<script>` tag inside a view HTML file | Move logic to the controller |
| Missing `data-view` attribute | `CoreController` constructor will throw — add it |
| Forgetting `() => ctrl.destroy()` in the factory | Listeners leak across navigations |
| Running `npm run make:view` on Windows without `npm.cmd` | Flags get dropped — use `npm.cmd run make:view -- ...` |

## Challenges

**Bronze:** Add a third public route `/about` with no controller. Use
`--no-controller --defaults`. Confirm it renders and that no controller error
appears in the console.

**Silver:** Open `src/routes/routes.js` and add `.cache({ ttl: 60 })` to the
`/tasks` registration. Visit `/tasks`, navigate away to `/`, then come back.
Open the Network tab in DevTools. Does the tasks HTML file re-fetch? Why not?

**Gold:** Read `.nativecore/core/router.ts` and find the `prefetch` method.
Add a `.prefetch()` call to the `/tasks` route registration. Then open the
Network tab and hard-refresh. Do you see the tasks HTML requested before you
navigate to `/tasks`? Document what you observe.

## Next

[Chapter 03 — Controllers](./03-controllers.md)
