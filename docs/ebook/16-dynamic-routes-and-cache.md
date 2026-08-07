# Chapter 16 — Dynamic Routes and Cache

Every task in Deskflow needs its own URL. `/tasks/42` should show exactly task 42, support a browser bookmark, and feel instant on repeated visits. This chapter covers the router's param syntax, how to pass params to a controller, optional loader functions, and the HTML cache + prefetch API that makes repeat navigation feel instant.

---

## Mental model

```
URL: /tasks/42
  ↓
router matches '/tasks/:id'  →  params = { id: '42' }
  ↓
loader (optional) runs first, fetches task data (loaderData)
  ↓
HTML file is fetched (from cache if warm)
  ↓
controller factory called: (params, state, loaderData)
  ↓
controller reads params.id → loads the task → renders
```

The router / `lazyController` forwards only three arguments. Generated stubs still
declare a 4th `rootElement` parameter, but it is usually `undefined` —
`CoreController` falls back to `document.querySelector('[data-view]')`.

The HTML cache is separate from the API cache. The router caches the raw HTML string so the browser never re-fetches the view file on repeat visits. The API cache in `api.service` is for data. They work together but are independent.

---

## Param syntax

| Segment | Meaning | Accessible as |
|---------|---------|---------------|
| `:id` | Required named param | `params.id` |
| `:id?` | Optional named param | `params.id` (may be `undefined`) |
| `*` | Rest / wildcard | `params.wildcard` |

Exact paths always win before dynamic matching. `/tasks/new` is matched before `/tasks/:id`.

---

## Lab — Build the task detail route

### Step 1 — Generate the view and controller

**Windows (PowerShell):**

```bash
npm.cmd run make:view -- task-detail --defaults
```

**macOS / Linux:**

```bash
npm run make:view -- task-detail --defaults
```

This creates:

- `src/views/public/task-detail.html`
- `src/controllers/task-detail.controller.js`

### Step 2 — Register the dynamic route

In `src/routes/routes.js`, inside the public group:

```js
r.register(
    '/tasks/:id',
    'src/views/public/task-detail.html',
    lazyController('taskDetailController', '../controllers/task-detail.controller.js')
).cache({ ttl: 60, revalidate: true });
```

The `.cache(...)` call is chained directly after `register`. It applies to the last registered route. Two modes:

```js
.cache({ ttl: 300 })                     // block until fresh on stale
.cache({ ttl: 60, revalidate: true })    // serve stale instantly, refresh in background
```

`ttl` is in seconds.

### Step 3 — Write the view

In `src/views/public/task-detail.html`:

```html
<div data-view="task-detail">
    <a href="/tasks">&larr; Back to tasks</a>
    <h1 ref="titleEl">Loading…</h1>
    <p ref="notesEl" class="notes"></p>
    <div ref="metaEl" class="meta"></div>
    <nc-button ref="doneBtn" variant="primary">Mark done</nc-button>
    <p ref="errorEl" class="error" hidden></p>
</div>
```

### Step 4 — Write the controller

```js
import { CoreController } from '@core/controller.js';
import { taskItems } from '@stores/task.store.js';
import api from '@services/api.service.js';

export class TaskDetailController extends CoreController {
    async onMount() {
        this.assertRefs('titleEl', 'notesEl', 'metaEl', 'doneBtn', 'errorEl');

        // Params arrive via the factory — stored as an instance property before onMount
        const id = this.taskId;

        if (!id) {
            this.showError('No task ID in URL.');
            return;
        }

        // Try the in-memory store first (fast path)
        let task = taskItems.value.find(t => t.id === id);

        // Fall back to a direct API call if the store is not yet populated
        if (!task) {
            try {
                task = await api.getCached(`/tasks/${id}`, { ttl: 60, tags: ['tasks'] });
            } catch {
                this.showError('Task not found.');
                return;
            }
        }

        if (!task) {
            this.showError('Task not found.');
            return;
        }

        this.currentTask = this.state(task);
        this.bind(this.currentTask, this.titleEl, null, t => t.title);
        this.titleEl.textContent = task.title;
        this.notesEl.textContent = task.notes ?? '';
        this.metaEl.textContent   = task.dueDate ? `Due: ${task.dueDate}` : '';

        this.on(this.doneBtn, 'click', () => this.markDone());
    }

    async markDone() {
        const id = this.taskId;
        await api.patch(`/tasks/${id}`, { done: true });
        api.invalidateTags(['tasks']);
        window.router.navigate('/tasks');
    }

    showError(msg) {
        this.errorEl.textContent = msg;
        this.errorEl.removeAttribute('hidden');
    }
}

export function taskDetailController(params, _state, _loaderData, rootElement) {
    const ctrl = new TaskDetailController(rootElement);
    ctrl.taskId = params?.id;         // pass the param before onMount runs
    return () => ctrl.destroy();
}
```

The factory sets `ctrl.taskId` before `onMount`. This is the standard pattern because `onMount` runs synchronously on the first tick after the element connects — you need the params stored before that happens.

Alternatively, read them from the router at any time:

```js
const { params } = window.router.getCurrentRoute() ?? {};
const id = params?.id;
```

---

## Optional loaders

A loader runs **before** the controller and fetches data while the HTML is being injected. Use it to guarantee data arrives before the first render:

```js
r.register(
    '/tasks/:id',
    'src/views/public/task-detail.html',
    lazyController('taskDetailController', '../controllers/task-detail.controller.js'),
    {
        loader: async (params, signal) => {
            return fetch(`/api/tasks/${params.id}`, { signal }).then(r => r.json());
        },
    }
).cache({ ttl: 60, revalidate: true });
```

The loader result arrives as `loaderData` in the factory:

```js
export function taskDetailController(params, _state, loaderData, rootElement) {
    const ctrl = new TaskDetailController(rootElement);
    ctrl.taskId    = params?.id;
    ctrl.loaderData = loaderData;   // already fetched
    return () => ctrl.destroy();
}
```

Loaders are optional. For simple cases, fetching in `onMount` is fine.

---

## Prefetch on hover

Warm the HTML cache for a route before the user clicks:

```js
// In tasks.controller.js, when rendering list items:
this.on(this.listEl, 'mouseover', (e) => {
    const card = e.target.closest('task-card');
    if (!card) return;
    const id = card.dataset.id;
    // prefetch is not on window.router — use the full instance
    if (id) window.__NC_ROUTER__.prefetch(`/tasks/${id}`);
});
```

`prefetch` fetches and caches the HTML file without navigating. When the user does click, the cached HTML is served instantly. (`window.router` only has navigate/replace/back/getCurrentRoute.)

---

## Navigating to a detail route

From the tasks list controller:

```js
this.on(this.listEl, 'task-card-click', (e) => {
    const id = e.target.closest('task-card')?.dataset.id;
    if (id) window.router.navigate(`/tasks/${id}`);
});
```

Or use a plain `<a href="/tasks/42">` — the router intercepts internal links automatically.

---

## Cache management API

```js
// On the route object (chained after register):
.cache({ ttl: 300 })                      // block on stale
.cache({ ttl: 60, revalidate: true })     // stale-while-revalidate

// On the full router instance (not the frozen window.router subset):
window.__NC_ROUTER__.bustCache('/tasks');  // bust HTML cache for one path
window.__NC_ROUTER__.bustCache();         // bust all HTML cache
window.__NC_ROUTER__.prefetch('/tasks');   // warm HTML without navigating
// Or: import router from '@core/router.js' and call router.prefetch / bustCache
```

Debug helpers (run in the browser console):

```js
window.__NC_ROUTER__.getCacheSnapshot();     // see all cached HTML entries
window.__NC_ROUTER__.getRouteDebugInfo();    // see all registered routes + cache state
```

---

## Apply to Deskflow

> **Feature:** Clicking a task navigates to `/tasks/:id`, which shows the task detail. The second visit is served from cache.

1. Generate the `task-detail` view and controller.
2. Register `/tasks/:id` in the public group with `.cache({ ttl: 60, revalidate: true })`.
3. Emit a `task-card-click` event (or use a plain link) from the tasks list.
4. In `taskDetailController`, set `ctrl.taskId` from `params.id`.
5. Look up the task from the store or API in `onMount`.
6. Add prefetch on hover for bonus points.

---

## Verify

- [ ] `/tasks/1` renders task 1; `/tasks/2` renders task 2
- [ ] An unknown ID shows a friendly error state (not a blank page)
- [ ] A second visit within 60 seconds does not make a new HTML network request (Network tab)
- [ ] Back navigation works via the browser back button
- [ ] Dynamic routes are **not** included in `build:ssg` output (expected behavior)

---

## Challenges

**Bronze** — Add an `<a href="/tasks">Back to list</a>` link to the detail view. Confirm it uses SPA navigation (no full page reload).

**Silver** — Add a `loader` function to the `/tasks/:id` route registration that fetches the task from `/api/tasks/:id` before the controller runs. Pass `loaderData` directly to the controller and skip the duplicate fetch in `onMount`.

**Gold** — On the tasks list page, prefetch the detail HTML for every task card on `mouseover`. Use `window.__NC_ROUTER__.prefetch` (or `import router from '@core/router.js'`) and debounce the calls so rapidly hovering over the list does not fire dozens of requests simultaneously.

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Expecting SSG to generate pages for `/tasks/:id` | Dynamic routes are intentionally skipped by `build:ssg` — serve them from the live server |
| Using `window.location.href = ...` instead of `router.navigate` | The router's history and middleware are bypassed; always use `window.router.navigate` |
| Setting `ctrl.taskId` inside `onMount` | Too late — set it in the factory before the constructor or before `onMount` fires |
| `ttl: 60000` (milliseconds) | `.cache({ ttl })` is in seconds; use `ttl: 60` |
| Calling `router.prefetch` without registering the route first | Prefetch is a no-op if the path has no matching route |

---

## Next

[Chapter 17 — Wires (legacy)](./17-wires.md)
