# Chapter 05 — Views and Routing

## What Is a View?

In NativeCoreJS a **view** is an HTML file. It is not a JavaScript module; it is not a template that gets compiled. It is a real `.html` file that the router fetches, parses, and injects into the `#app` outlet when the user navigates to the corresponding path.

This design has two useful consequences. First, views are fully inspectable without running any JavaScript — you can open the file and see exactly what the DOM will look like. Second, the framework can cache the parsed HTML and reuse it on subsequent visits without touching the network.

---

## Public vs Protected Views

Views live in one of two directories:

```
src/views/
├── public/       ← accessible without authentication
│   ├── login.html
│   └── not-found.html
└── protected/    ← require the user to be signed in
    ├── dashboard.html
    └── tasks.html
```

The `public/` and `protected/` directories are a **convention** that your `routes.ts` enforces. The router does not automatically protect views in `protected/` — it is your `protectedRoutes` array (and the auth check in `router.start()`) that determines what requires authentication. The directory names exist to keep your file tree clear at a glance.

---

## The `routes.ts` File

All routing configuration lives in `src/routes/routes.ts`. Here is the full pattern:

```typescript
import { router } from '@core/router.js';
import { lazyController } from '@core/lazy.js';

// Public routes
router.register('/login', 'src/views/public/login.html');

router.register('/404', 'src/views/public/not-found.html');

// Protected routes
router.register(
  '/',
  'src/views/protected/dashboard.html',
  lazyController(() => import('../controllers/dashboard.controller.ts'))
).cache();

router.register(
  '/tasks',
  'src/views/protected/tasks.html',
  lazyController(() => import('../controllers/tasks.controller.ts'))
).cache();

export const protectedRoutes = ['/', '/tasks'];

router.start({ fallback: '/404' });
```

### `router.register(path, htmlFile, controller?)`

| Argument    | Description                                                                          |
|-------------|--------------------------------------------------------------------------------------|
| `path`      | The URL path. Supports params: `'/tasks/:id'`                                        |
| `htmlFile`  | Path to the view HTML file, relative to the project root                             |
| `controller`| Optional. An async controller function (or a `lazyController()` wrapper)             |

`register()` returns a route builder object. You can chain methods on it.

### `.cache()`

`.cache()` instructs the router to keep the parsed HTML document in memory after the first load. Subsequent navigations to this route reuse the cached DOM fragment — no network fetch, no HTML parse. Use this on all routes the user visits frequently (dashboards, list views). Avoid it on routes where the HTML structure itself changes (unusual).

### `lazyController(fn)`

```typescript
lazyController(() => import('../controllers/tasks.controller.ts'))
```

`lazyController()` wraps a dynamic import in a way the router understands. The controller module is not loaded until the user first navigates to the route. This keeps the initial JS bundle small. The returned module must export a default function that matches the controller signature.

---

## `data-view`, `data-hook`, and `data-action`

HTML views use three `data-*` attribute conventions that allow controllers to query the DOM safely and readably.

### `data-view="name"`

Every view HTML file wraps its content in a root element with `data-view`:

```html
<!-- src/views/protected/tasks.html -->
<div data-view="tasks">
  <header class="tasks__header">
    <h1>Tasks</h1>
    <button data-action="new-task">+ New Task</button>
  </header>

  <task-stats data-hook="stats"></task-stats>

  <ul class="task-list" data-hook="task-list"></ul>
</div>
```

`data-view` is the controller's root scope. The `dom.data('tasks')` helper (Chapter 06) targets this element and scopes all subsequent queries within it.

### `data-hook="name"`

`data-hook` marks elements that a controller needs to read from or write to. They are structural anchors — "here is where the task list goes", "here is the stats widget". Hook names should be semantic rather than visual.

### `data-action="name"`

`data-action` marks interactive elements — buttons, links, form submits — that a controller handles. Using `data-action` instead of CSS class names or IDs means your action handlers survive style refactors.

---

## Route Parameters

Register a parameterised route with a colon prefix:

```typescript
router.register(
  '/tasks/:id',
  'src/views/protected/task-detail.html',
  lazyController(() => import('../controllers/task-detail.controller.ts'))
);
```

The `id` segment is extracted and passed to the controller. You will see how to read it in Chapter 06.

---

## Nested Routes

NativeCoreJS supports a flat route list. "Nesting" is achieved by composing views: your parent view includes a named outlet element, and the child controller renders into it. This is intentionally explicit — there is no hidden routing hierarchy to debug.

---

## Using `npm run make:view`

The generator asks a few questions and writes both the HTML file and the controller:

```bash
npm run make:view task-detail
```

```
? Create a controller for this view? Yes
? Route path: /tasks/:id
? Public or protected? protected
? Cache this route? No

✔ Created src/views/protected/task-detail.html
✔ Created src/controllers/task-detail.controller.ts
✔ Updated src/routes/routes.ts
```

---

## The Taskflow `tasks` View

Let's flesh out the tasks view we created in Chapter 01:

```html
<!-- src/views/protected/tasks.html -->
<div data-view="tasks">
  <header class="tasks-header">
    <div class="tasks-header__left">
      <h1 class="tasks-header__title">Tasks</h1>
      <span class="tasks-header__count" data-hook="task-count">0</span>
    </div>
    <button class="btn btn--primary" data-action="new-task">+ New Task</button>
  </header>

  <nav class="tasks-filters" aria-label="Filter tasks">
    <button class="filter-btn filter-btn--active" data-action="filter" data-filter="all">All</button>
    <button class="filter-btn" data-action="filter" data-filter="pending">Pending</button>
    <button class="filter-btn" data-action="filter" data-filter="in-progress">In Progress</button>
    <button class="filter-btn" data-action="filter" data-filter="done">Done</button>
  </nav>

  <task-stats data-hook="stats" total="0" completed="0"></task-stats>

  <section class="task-list-section">
    <ul class="task-list" data-hook="task-list" aria-label="Task list">
      <!-- Tasks are rendered here by the controller -->
    </ul>
    <p class="task-list__empty" data-hook="empty-state" hidden>
      No tasks yet. Click <strong>+ New Task</strong> to get started.
    </p>
  </section>
</div>
```

And update `routes.ts` to make the tasks route explicit with caching:

```typescript
router.register(
  '/tasks',
  'src/views/protected/tasks.html',
  lazyController(() => import('../controllers/tasks.controller.ts'))
).cache();
```

---

> **Tip:** Keep views as semantic and layout-focused as possible. Avoid JavaScript logic in `data-*` attributes. The view's job is to declare structure; the controller's job is to bring it to life.

---

## Keyed List Reconciliation (`key=`)

When a controller re-renders a list — for example updating `innerHTML` of a `<ul>` — NativeCore's default reconciler matches DOM nodes **positionally** (first new item → first existing node, etc.). This is efficient for most cases, but can cause subtle bugs when items are reordered, inserted, or removed from the middle: a node might retain event handlers or state from a previous item.

Add a `key=` attribute to every child element in a repeated list, and NativeCore will switch to **keyed reconciliation**: it identifies each node by its key, reuses existing nodes when the key matches, and only creates/removes the nodes that actually changed.

```html
<!-- Without keys: positional matching (fine for simple, append-only lists) -->
<ul id="tasks">
  <li>Task A</li>
  <li>Task B</li>
</ul>

<!-- With keys: stable node identity across re-renders -->
<ul id="tasks">
  <li key="task-1">Task A</li>
  <li key="task-2">Task B</li>
</ul>
```

### Generating keyed markup in a controller

```typescript
function renderTasks(tasks: Task[]) {
    const list = dom.$('#tasks')!;
    list.innerHTML = tasks
        .map(t => `<li key="${t.id}" class="task-item">${escapeHTML(t.title)}</li>`)
        .join('');
}
```

### When to use keys

| Situation | Use keys? |
|-----------|-----------|
| Simple append-only list | Optional |
| Items can be reordered | **Yes** |
| Items have interactive state (checkbox, input) | **Yes** |
| Items are added/removed from the middle | **Yes** |
| Static, never-updated list | No |

Keys must be **unique within their parent container** and **stable** across re-renders (a database ID is ideal; avoid array indices when the list can be reordered).

---

**Back:** [Chapter 04 — The Bind API](./04-bind-api.md)  
**Next:** [Chapter 06 — Controllers](./06-controllers.md)
