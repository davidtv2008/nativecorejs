# Chapter 07 — Controllers

> **What you'll build in this chapter:** Wire up Taskflow's `tasksController` — the brain of the tasks view — using `effect()`, `trackEvents()`, `dom.view()`, and the standard controller section structure.

## What Is a Controller?

A controller is an `async` function that is called when the router mounts a view. It receives route parameters, sets up reactive state and bindings, registers event listeners, and optionally returns a **cleanup function** that the router calls when the user navigates away.

```javascript
// The full type signature
async function myController(params) => void> {
  // Setup ...

  // Optional — the framework auto-cleans effect(), computed(), and trackEvents()
  return () => {
    // Explicit teardown for anything outside those primitives
    // (e.g. timers, manual observers)
  };
}

export default myController;
```

Controllers are plain TypeScript functions — no class, no decorator, no lifecycle hooks. The `async/await` pattern lets you fetch initial data before binding the UI. Returning a cleanup function is **optional** for standard reactive primitives: every call to `effect()`, `computed()`, and `trackEvents()` inside a controller is automatically tracked by the **Page Cleanup Registry** and torn down when the view unmounts, even if no cleanup function is returned.

---

## Generating a Controller

```bash
npm run make:controller tasks
```

This creates `src/controllers/tasks.controller.js` with the correct boilerplate. If you already generated it with `make:view`, open the existing file.

---

## The Controller Structure

A well-structured controller follows a consistent set of sections. The framework does not enforce this - it is a convention - and scaffolded controllers now default to a wire-first layout:

```javascript
import { dom }         from '@core-utils/dom.js';
import { trackEvents } from '@core-utils/events.js';
import { useState, computed, effect } from '@core/state.js';
import { apiService }  from '@services/api.service.js';

async function tasksController(params) => void> {

  // Setup

  // Wires

  // DOM refs

  // Local state / computed

  // Reactive bindings

  // Data loading

  // Events

  // Cleanup
  return () => {
    // wire*, effect(), computed(), and trackEvents() auto-dispose.
    // Keep explicit cleanup for custom resources only.
  };
}

export default tasksController;
```

> **Auto-Cleanup:** Even if you omit the `return () => { ... }` block entirely, the framework is still safe. Every `wire*`, `effect()`, `computed()`, and `trackEvents()` call auto-registers its teardown with the **Page Cleanup Registry**. The router flushes the registry on every navigation after calling the controller's explicit cleanup function.

---

## `dom.view('view-name')` — Scoped DOM Access

The `dom` utility provides scoped DOM queries that match the `data-view` / `data-hook` / `data-action` conventions from Chapter 05.

```javascript
const view = dom.view('tasks');
```

`dom.view('tasks')` returns a scope object whose methods query within `[data-view="tasks"]`.

### `.hook('name')` → `[data-hook="name"]`

```javascript
const taskList  = view.hook('task-list');   // → [data-hook="task-list"]
const stats     = view.hook('stats');       // → [data-hook="stats"]
const emptyMsg  = view.hook('empty-state'); // → [data-hook="empty-state"]
const taskCount = view.hook('task-count');  // → [data-hook="task-count"]
```

### `.actionSelector('name')` → CSS selector string

```javascript
view.actionSelector('new-task')  // → '[data-view="tasks"] [data-action="new-task"]'
view.actionSelector('filter')    // → '[data-view="tasks"] [data-action="filter"]'
```

`actionSelector()` returns a **string** rather than an element — it is designed for use with `trackEvents()`, which accepts CSS selectors.

### `dom.$()` — Global Query

For elements outside any view scope (navigation, modals, etc.), use the global helper:

```javascript
const navBadge = dom.$('#nav-task-count');
```

---

## `trackEvents()` — Event Registration with Auto-Cleanup

`trackEvents()` returns a tracker object whose methods wrap `addEventListener` and track every listener it registers. When the tracker's `cleanup()` method is called, it removes them all in one shot:

```javascript
const events = trackEvents();

events.onClick(view.actionSelector('new-task'), handleNewTask);
events.onClick(view.actionSelector('filter'),   handleFilter);
```

You no longer need to manually push `events.cleanup` into `disposers` — `trackEvents()` auto-registers its own teardown with the Page Cleanup Registry the moment it is called. On navigation the router flushes the registry, which calls `cleanup()` on every tracker that the controller created.

If you want to be explicit, you can still call `events.cleanup()` in the returned cleanup function:

```javascript
const events = trackEvents();
return () => events.cleanup(); // optional but self-documenting
```

Because `cleanup()` zeroes out its internal array after the first call, calling it a second time (once by the explicit cleanup path, once by the registry) is always safe.

---

## `effect()` — Reactive Bindings in Controllers

Inside a component you use `this.bind()`. Inside a controller there is no `this` — you use `effect()` instead. An effect is a function that re-runs automatically whenever the state it reads changes:

```javascript
import { effect } from '@core/state.js';

effect(() => {
  taskCount.textContent = String(tasks.value.length);
});
```

`effect()` returns a stop function, but you do not need to store it for normal controller flow. The framework auto-registers cleanup with the **Page Cleanup Registry** the moment `effect()` is called, so the effect is torn down when the router leaves the page.

> **Loop guard (default + override):** `effect()` includes a built-in loop guard to prevent runaway reactive cycles.
>
> - Default: max **1000** effect runs in a single notification flush
> - Override: `effect(fn, { maxRunsPerFlush: N })`
> - Disable intentionally: `effect(fn, { maxRunsPerFlush: 0 })`
>
> If the threshold is exceeded, NativeCore logs a `console.warn`, auto-disposes that effect, and reports the event in Dev Tools under **LOOP GUARD**.

```javascript
effect(() => {
  taskCount.textContent = String(tasks.value.length);
}, { maxRunsPerFlush: 1500 }); // optional override (default is 1000)
```

### How stop functions are idempotent

Whether the stop function runs via explicit cleanup or via the registry flush, the second call is a no-op: internal dependency maps are already cleared after the first call.

---

## Wire-First Best Practice

For scaffolded controllers (`home`, `login`, `dashboard`), prefer a wire-first style:

- `wireContents()` for display text
- `wireAttributes()` for HTML attributes
- `wireInputs()` for form values
- `wireClasses()` for state-driven class toggles
- `wireStyles()` for inline style properties

```javascript
import {
  wireContents,
  wireAttributes,
  wireInputs,
  wireClasses,
  wireStyles
} from '@core-utils/wires.js';

export async function reportsController() => void> {
  const events = trackEvents();

  const { title, total } = wireContents();
  const { busy } = wireAttributes();
  const { search } = wireInputs();
  const { loading } = wireClasses();
  const { progressWidth } = wireStyles();

  title.value = 'Reports';
  busy.value = 'false';
  loading.value = false;
  progressWidth.value = '0%';

  return () => {
    // wire* + reactive primitives auto-clean.
    // Keep explicit cleanup for tracked events, timers, observers, etc.
    events.cleanup();
  };
}
```

Use manual DOM lookups only for cases that wires cannot express cleanly (complex innerHTML surfaces, third-party imperative widgets, canvas charts, etc.).

---

## Route Parameters

The `params` argument carries URL parameters and query strings:

```javascript
// For route: /tasks/:projectId
async function tasksController(params) {
  const projectId = params.projectId;   // URL segment
  const sort      = params.query.sort;  // ?sort=due-date
}
```

---

## Building the Full `tasksController`

Let's build the complete controller for the tasks view. It:

1. Fetches tasks from the API on load.
2. Maintains a reactive `filter` state.
3. Derives a `filteredTasks` computed.
4. Binds the task count badge and the stats component.
5. Renders the task list.
6. Handles filter button clicks and the "new task" button.

```javascript
// src/controllers/tasks.controller.js
import { dom }         from '@core-utils/dom.js';
import { trackEvents } from '@core-utils/events.js';
import { useState, computed, effect } from '@core/state.js';
import { apiService }  from '@services/api.service.js';
import '@components/ui/task-card.ts';
import '@components/ui/task-stats.ts';

// Task shape: { id, title, description, status, projectId }

// Filter values: 'all' | 'pending' | 'in-progress' | 'done'

async function tasksController(params) => void> {

  // ─── Setup ──────────────────────────────────────────────────────────────
  const disposers = [];
  const { on, dispose: disposeEvents } = trackEvents();
  disposers.push(disposeEvents);

  // ─── DOM Refs ───────────────────────────────────────────────────────────
  const view      = dom.view('tasks');
  const taskList  = view.hook('task-list');
  const statsEl   = view.hook('stats');
  const emptyMsg  = view.hook('empty-state');
  const taskCount = view.hook('task-count');

  // ─── State ──────────────────────────────────────────────────────────────
  const tasks  = useState([]);
  const filter = useState('all');

  const filteredTasks = computed(() => {
    const f = filter.value;
    return f === 'all' ? tasks.value : tasks.value.filter(t => t.status === f);
  });
  disposers.push(() => filteredTasks.dispose());

  const completedCount = computed(() =>
    tasks.value.filter(t => t.status === 'done').length
  );
  disposers.push(() => completedCount.dispose());

  // ─── Data Fetch ─────────────────────────────────────────────────────────
  try {
    const data = await apiService.get('/tasks');
    tasks.value = data;
  } catch (err) {
    console.error('Failed to load tasks', err);
  }

  // ─── Reactive Bindings ──────────────────────────────────────────────────
  disposers.push(
    effect(() => {
      const visible = filteredTasks.value;

      // Update task count badge
      taskCount.textContent = String(visible.length);

      // Update stats component attributes
      statsEl.setAttribute('total',     String(tasks.value.length));
      statsEl.setAttribute('completed', String(completedCount.value));

      // Render task list
      taskList.innerHTML = '';
      for (const task of visible) {
        const li   = document.createElement('li');
        li.className = 'task-list__item';

        const card = document.createElement('task-card');
        card.setAttribute('title',       task.title);
        card.setAttribute('description', task.description);
        card.setAttribute('status',      task.status);
        card.dataset.taskId = task.id;

        li.appendChild(card);
        taskList.appendChild(li);
      }

      // Toggle empty state
      emptyMsg.hidden = visible.length > 0;
    })
  );

  // ─── Events ─────────────────────────────────────────────────────────────
  on(document, 'click', view.actionSelector('filter'), (e) => {
    const btn = (e.target).closest('[data-action="filter"]');
    if (!btn) return;

    // Update active button styling
    dom.$$(view.actionSelector('filter'))
      .forEach(b => b.classList.remove('filter-btn--active'));
    btn.classList.add('filter-btn--active');

    filter.value = (btn.dataset.filter ?? 'all');
  });

  on(document, 'click', view.actionSelector('new-task'), () => {
    // Navigation to new-task form — wired up in Chapter 10
    window.history.pushState({}, '', '/tasks/new');
  });

  on(document, 'click', '[data-action="delete-task"]', async (e) => {
    const card = (e.target).closest('[data-task-id]');
    if (!card) return;
    const id = card.dataset.taskId!;
    await apiService.delete(`/tasks/${id}`);
    tasks.value = tasks.value.filter(t => t.id !== id);
  });

  // ─── Cleanup ────────────────────────────────────────────────────────────
  return () => {
    disposers.forEach(d => d());
  };
}

export default tasksController;
```

---

## Walking Through the Controller

**Setup** — `disposers` is declared first. Every subscription and listener the controller creates is paired with an entry in this array.

**DOM Refs** — all `dom.view()` lookups happen before the async fetch. The DOM is already mounted when the controller runs.

**State** — `tasks` and `filter` are plain `useState` containers. `filteredTasks` and `completedCount` are computed values whose dispose functions are pushed into `disposers`.

**Data Fetch** — `await apiService.get()` loads tasks. If it throws, we log the error and leave `tasks` as an empty array rather than crashing the view.

**Reactive Bindings** — a single `effect()` re-renders the task list whenever `filteredTasks.value` or `completedCount.value` changes. Its stop function is pushed into `disposers`, but even if you omitted that push the Page Cleanup Registry would still tear down the effect on navigation. This is the "one effect for the list" pattern — efficient for moderate list sizes. For very large lists you would diff the previous and next arrays; Chapter 12 covers optimisation strategies.

**Events** — `trackEvents()` registers all delegated listeners. The filter click handler uses `dom.$$()` to query matching buttons and reads `btn.dataset.filter` and writes to `filter.value`, which triggers the computed, which triggers the effect — a clean reactive loop.

**Cleanup** — the returned function calls `disposers.forEach(d => d())`. For `effect()`, `computed()`, and `trackEvents()` the calls here overlap with what the Page Cleanup Registry will do — but all three primitives are idempotent, so the second invocation is always a no-op. The explicit cleanup block is most valuable for **custom teardown** that lives outside those primitives: timers, `MutationObserver`, manual `window.addEventListener` calls, etc.

---

## Auto-Cleanup Flow on Navigation

Understanding exactly what happens when the user leaves a page:

1. User navigates to `/settings`
2. Router calls the previous controller's explicit cleanup fn (if it returned one) — explicit teardown
3. Router calls `flushPageCleanups()` — tears down any `effect()`, `computed()`, and `trackEvents()` the previous controller created that were not already cleaned up
4. New HTML is rendered
5. `settingsController()` runs → all its `effect()`, `computed()`, `trackEvents()` calls auto-register with the now-empty registry
6. On the next navigation, steps 2–5 repeat — nothing leaks

This means the `return () => {}` block is your safety net for custom resources, not the sole line of defence against leaks. The framework holds the line regardless.

---

> **Tip:** Keep controller files focused. If a controller grows beyond ~150 lines, extract the data-fetching logic into a service and the complex rendering logic into a component.

---

## Formatting Data for Display

The template ships with `src/utils/formatters.js` and `src/utils/helpers.js` — ready-to-use utility functions you will reach for in almost every controller. Import them with the `@utils/` alias:

```javascript
import { formatDate, formatRelativeTime, formatCurrency, truncate } from '@utils/formatters.js';
import { debounce, throttle, generateId, copyToClipboard } from '@utils/helpers.js';
```

### Key Formatter Functions

| Function | Example output |
|---|---|
| `formatDate(date)` | `"Apr 18, 2026"` |
| `formatDate(date, 'long')` | `"April 18, 2026"` |
| `formatDate(date, 'short')` | `"4/18/26"` |
| `formatDateTime(date)` | `"Apr 18, 2026 at 3:45 PM"` |
| `formatRelativeTime(date)` | `"2 hours ago"` |
| `formatCurrency(4999)` | `"$4,999.00"` |
| `formatNumber(1234567)` | `"1,234,567"` |
| `formatFileSize(2048000)` | `"1.95 MB"` |
| `formatPercentage(0.75)` | `"75%"` |
| `truncate(longString, 50)` | `"This string gets cut at fifty chara..."` |
| `capitalize('hello')` | `"Hello"` |

### Key Helper Functions

| Function | Purpose |
|---|---|
| `debounce(fn, ms)` | Delay fn until ms of silence (search boxes) |
| `throttle(fn, ms)` | Limit fn to at most once per ms (scroll handlers) |
| `generateId()` | Collision-resistant ID string for optimistic UI |
| `deepClone(obj)` | JSON round-trip copy of a plain object |
| `sanitizeHTML(str)` | Strips tags via a temporary DOM node |
| `parseQueryString('?q=hello')` | `{ q: 'hello' }` |
| `buildQueryString({ q: 'hello' })` | `"q=hello"` |
| `copyToClipboard(text)` | Async clipboard write, returns `boolean` |
| `isInViewport(element)` | Checks bounding box against the viewport |
| `sleep(ms)` | `await sleep(500)` — deferred continuation |

### Using Formatters in Taskflow

Render task due dates with relative and absolute formatting side by side:

```javascript
import { formatRelativeTime, formatDate } from '@utils/formatters.js';

function renderTaskRow(task) {
    const rel = task.dueDate ? formatRelativeTime(task.dueDate) : '—';
    const abs = task.dueDate ? formatDate(task.dueDate) : '';
    return `
        <tr data-task-id="${task.id}">
            <td>${task.title}</td>
            <td title="${abs}">${rel}</td>
        </tr>
    `;
}
```

> **Tip:** Both `debounce` and `throttle` are also exported directly from the `nativecorejs` package itself (`import { debounce, throttle } from 'nativecorejs'`), but importing from `@utils/helpers.js` keeps your source portable and easy to customise.

---

## Route Data Loaders

A common pattern is to fetch API data inside a controller — but this means the DOM is initially empty while the request is in flight. **Route data loaders** let you co-locate the data-fetch with the route definition so data is ready *before* the controller runs.

### Defining a loader

Add a `loader` function to any `router.register()` call. It receives the same route `params` as the controller, plus an `AbortSignal` tied to the navigation's cancellation token — so in-flight requests are automatically cancelled if the user navigates away mid-load:

```javascript
// src/routes/routes.js
import router from '@core/router.js';
import { tasksController } from '@controllers/index.js';
import api from '@services/api.service.js';

router.register('/tasks', 'src/views/protected/tasks.html', tasksController, {
    loader: async (params, signal) => {
        return api.get('/tasks', { signal });
    },
});
```

### Receiving loader data in the controller

The resolved loader value is passed as the **third argument** to the controller function:

```javascript
// src/controllers/tasks.controller.js

export async function tasksController(
    params: Record<string, string>,
    state: any = {},
    loaderData?: unknown
) {
    const tasks = (loaderData) ?? [];

    // DOM is already populated; render immediately without a loading state
    renderTasks(tasks);

    return () => { /* cleanup */ };
}
```

### Skeleton loading with events

The router emits two window events around the loader lifecycle that you can hook into from the app shell to show a skeleton or progress indicator:

| Event | When | `event.detail` |
|---|---|---|
| `nc-route-loading` | Loader starts | `{ path, params }` |
| `nc-route-loaded` | Loader resolves | `{ path, params, data }` |

```javascript
// In app.js — show/hide a skeleton strip
window.addEventListener('nc-route-loading', () => {
    document.getElementById('page-skeleton')?.removeAttribute('hidden');
});

window.addEventListener('nc-route-loaded', () => {
    document.getElementById('page-skeleton')?.setAttribute('hidden', '');
});
```

> **Note:** If a navigation is cancelled (rapid back/forward, concurrent navigation) the loader's `AbortSignal` fires and the `nc-route-loaded` event is never emitted. Design your skeleton dismissal defensively — also hide it on `pageloaded`.

### Loader vs controller fetching — when to use which

| Situation | Recommendation |
|---|---|
| Data is **required** to render the page | Use a loader — avoids empty-state flicker |
| Data depends on user interaction (filters, search) | Fetch inside the controller |
| Multiple parallel data needs | Use `Promise.all` inside the loader |
| You need a loading skeleton per-component | Use controller fetching with `nc-skeleton` |

---

## Done Criteria

- [ ] `tasks.controller.js` follows the standard section structure (Setup, Wires, DOM Refs, Local State, Reactive Bindings, Data Loading, Events, Cleanup).
- [ ] An `effect()` renders the task list DOM whenever `tasks.value` changes.
- [ ] Controller bindings prefer `wire*` utilities where possible, with manual DOM refs only for complex rendering surfaces.
- [ ] Returned cleanup includes explicit resources (events/timers) and documents that reactive cleanup is automatic.
- [ ] Navigating away from `/tasks` and back does not produce duplicate event listeners (verify in DevTools).

---

**Back:** [Chapter 06 — Views and Routing](./06-views-and-routing.md)  
**Next:** [Chapter 08 — Authentication](./08-authentication.md)