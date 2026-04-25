# Chapter 06 — Views and Routing

> **What you'll build in this chapter:** Understand how Taskflow's URL structure is declared in `routes.js`, how `registerRoutes()` wires everything together in `app.js`, and how the `data-view` / `data-hook` / `data-action` conventions connect your HTML views to controllers.

## What Is a View?

In NativeCoreJS a **view** is an HTML file. It is not a JavaScript module; it is not a template that gets compiled. It is a real `.html` file that the router fetches, parses, and injects into the `#app` outlet when the user navigates to the corresponding path.

This design has two useful consequences. First, views are fully inspectable without running any JavaScript — you can open the file and see exactly what the DOM will look like. Second, the framework can cache the parsed HTML and reuse it on subsequent visits without touching the network.

---

## Public vs Protected Views

Views live in one of two directories:

```
src/views/
├── public/       ← accessible without authentication
│   ├── home.html
│   └── login.html
└── protected/    ← require the user to be signed in
    ├── dashboard.html
    └── tasks.html
```

The `public/` and `protected/` directories are a **convention** that your `routes.js` enforces. The router does not automatically protect views in `protected/` — it is your `protectedRoutes` array (and the `authMiddleware` registered in `app.js`) that determines what requires authentication. The directory names exist to keep your file tree clear at a glance.

---

## The `routes.js` File

All routing configuration lives in `src/routes/routes.js`. The scaffold generates this pattern:

```javascript
import { createLazyController } from '@core/lazyController.js';
import router from '@core/router.js';

const lazyController = createLazyController(import.meta.url);

export function registerRoutes(r) {
    // @group:public
    r.group({}, (r) => {
        r.register('/', 'src/views/public/home.html', lazyController('homeController', '../controllers/home.controller.js'))
         .cache({ ttl: 300, revalidate: true });

        r.register('/login', 'src/views/public/login.html', lazyController('loginController', '../controllers/login.controller.js'));
    });

    // @group:protected
    r.group({ middleware: ['auth'] }, (r) => {
        r.register('/dashboard', 'src/views/protected/dashboard.html', lazyController('dashboardController', '../controllers/dashboard.controller.js'))
         .cache({ ttl: 30, revalidate: true });

        r.register('/tasks', 'src/views/protected/tasks.html', lazyController('tasksController', '../controllers/tasks.controller.js'));
    });
}

export const protectedRoutes = router.getPathsForMiddleware('auth');
```

### `lazyController(controllerName, controllerPath)`

`lazyController` lives in `.nativecore/core/lazyController.ts`. Because browser dynamic `import()` resolves paths relative to the module containing the call, moving this helper to `@core/` would break relative paths. The factory pattern solves this: `createLazyController(import.meta.url)` captures `routes.js`'s own URL as the base, so `'../controllers/home.controller.js'` always resolves correctly regardless of where the helper lives:

```javascript
// .nativecore/core/lazyController.ts
import { bustCache } from '../utils/cacheBuster.js';

export function createLazyController(base) {
    return function lazyController(controllerName, controllerPath) {
        return async (...args) => {
            const resolved = new URL(controllerPath, base).href;
            const module = await import(bustCache(resolved));
            return module[controllerName](...args);
        };
    };
}
```

| Argument         | Description                                                              |
|------------------|--------------------------------------------------------------------------|
| `controllerName` | The named export in the controller module (e.g. `'tasksController'`)     |
| `controllerPath` | Path to the compiled `.js` file relative to `dist/src/routes/routes.js` |

Note the path is `'../controllers/tasks.controller.js'` — a relative path from `dist/src/routes/` to `dist/src/controllers/`. Always use `.js` extensions even though the source files are `.ts`.

### `registerRoutes(r)`

Routes are registered inside a function called from `app.js`. Routes are organized into groups using `r.group()` — each group carries shared options like middleware tags. The `// @group:public` and `// @group:protected` comments are sentinel markers the `make:view` generator uses to find the right block to insert new routes into.

### `r.group(options, callback)`

```javascript
r.group({ middleware: ['auth'] }, (r) => {
    r.register('/dashboard', ...);
    r.register('/tasks', ...);
});
```

| Option       | Description                                                         |
|--------------|---------------------------------------------------------------------|
| `middleware` | Array of middleware name tags stamped onto every route in the group |
| `prefix`     | Optional path prefix prepended to every route path in the group     |

Groups can be nested. The innermost group inherits all ancestor middleware tags.

### `protectedRoutes` — derived, not manual

```javascript
export const protectedRoutes = router.getPathsForMiddleware('auth');
```

Rather than maintaining a separate array that must be kept in sync with `register()` calls, `protectedRoutes` is **derived** from the router itself. Any route registered inside a `group({ middleware: ['auth'] })` block is automatically included. When you run `make:view` and answer "protected", the route is inserted into the `// @group:protected` block and picked up here without any further changes.

### `.cache(options?)`

`.cache()` instructs the router to keep the parsed HTML document in memory after the first load. Subsequent navigations reuse the cached fragment — no network fetch, no HTML parse.

```javascript
.cache({ ttl: 300, revalidate: true })  // cache for 300 seconds, revalidate in background
.cache()                                 // cache indefinitely
```

Use it on routes the user visits frequently. Avoid it on routes where the HTML structure itself changes dynamically.

---

## How `app.js` Wires It Together

`registerRoutes()` is called from `app.js` during the boot sequence:

```javascript
// src/app.js (simplified)
// @middleware — registered middleware (auto-updated by make:middleware)
router.use(createMiddleware('auth', authMiddleware));  // only runs on 'auth'-tagged routes
registerRoutes(router);                                // all routes registered
router.start();                                        // begin listening, render first view
```

`router.start()` is called **exactly once**, at the end of `init()` in `app.js`. Never call it inside a controller or component.

Each `router.use(createMiddleware(...))` call wraps a middleware function so it **only fires when the navigated route carries that tag**. `authMiddleware` doesn't need to know which routes require auth — `createMiddleware('auth', ...)` handles that check automatically using `router.getTagsForPath()`.

---

## `data-view`, `data-hook`, and `data-action`

HTML views use three `data-*` attribute conventions that allow controllers to query the DOM safely and readably.

### `data-view="name"`

Every protected view wraps its content in a root element with `data-view`:

```html
<div class="tasks-page" data-view="tasks">
  ...
</div>
```

`data-view` is the controller's root scope. The `dom.view('tasks')` helper (Chapter 07) targets this element and scopes all subsequent queries within it.

### `data-hook="name"`

`data-hook` marks elements that a controller needs to read from or write to. They are structural anchors — "here is where the task list goes", "here is the stats widget". Hook names should be semantic rather than visual.

### `data-action="name"`

`data-action` marks interactive elements — buttons, links, form submits — that a controller handles. Using `data-action` instead of CSS class names or IDs means your action handlers survive style refactors.

---

## The Taskflow `tasks` View

Here is the current state of `tasks.html` after the previous chapters. It has hardcoded task cards to demonstrate the components we built — the controller will replace this with dynamic data in Chapter 07:

```html
<!-- src/views/protected/tasks.html -->
<div class="tasks-page" data-view="tasks">
    <h1>My Tasks</h1>

    <task-stats id="stats" total="10" completed="4"></task-stats>

    <nc-error-boundary mode="dev" fallback="Task could not be loaded">
        <task-card
            title="Set up NativeCoreJS project"
            description="Scaffold the Taskflow app using the CLI."
            status="done"
        >
            <div slot="actions">
                <nc-button variant="outline" data-action="delete-task">Delete</nc-button>
            </div>
        </task-card>
    </nc-error-boundary>

    <nc-error-boundary mode="dev" fallback="Task could not be loaded">
        <task-card
            title="Build task-card component"
            description="Implement the component with Shadow DOM and attributes."
            status="in-progress"
        ></task-card>
    </nc-error-boundary>
</div>
```

The `<task-stats>` component is already wired up with `total` and `completed` attributes — those will be driven by controller state once we wire in the API in Chapter 07. For now, they are hardcoded to verify the component renders correctly.

---

## Route Parameters

Register a parameterised route with a colon prefix:

```javascript
.register(
    '/tasks/:id',
    'src/views/protected/task-detail.html',
    lazyController('taskDetailController', '../controllers/task-detail.controller.js')
)
```

The `id` segment is extracted and passed to the controller as `params.id`. You will see how to read it in Chapter 07.

---

## Using `npm run make:view`

The generator asks a few questions and writes both the HTML file and the controller, then updates `routes.js` automatically:

```bash
npm run make:view task-detail
```

```
? Route path: /tasks/:id
? Public or protected? protected
? Create a controller for this view? Yes
? Cache this route? No

✔ Created src/views/protected/task-detail.html
✔ Created src/controllers/task-detail.controller.js
✔ Updated src/routes/routes.js
```

---

> **Tip:** Keep views as semantic and layout-focused as possible. Avoid JavaScript logic in `data-*` attributes. The view's job is to declare structure; the controller's job is to bring it to life.

---

## Done Criteria

- [ ] Navigating to `/tasks` loads `src/views/protected/tasks.html` with the hardcoded task cards visible.
- [ ] Navigating to `/dashboard` loads `src/views/protected/dashboard.html`.
- [ ] `registerRoutes()` is called once from `app.js`.
- [ ] `router.start()` is called exactly once, in `src/app.js`.
- [ ] `<task-stats>` is visible on the tasks view showing 10 total / 4 completed.

---

**Back:** [Chapter 05 — The Bind API](./05-bind-api.md)  
**Next:** [Chapter 07 — Controllers](./07-controllers.md)