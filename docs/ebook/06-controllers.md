# Chapter 06 — Controllers

## What Is a Controller?

A controller is an `async` function that is called when the router mounts a view. It receives route parameters, sets up reactive state and bindings, registers event listeners, and returns a **cleanup function** that the router calls when the user navigates away.

```typescript
// The full type signature
async function myController(params: RouteParams): Promise<() => void> {
  // Setup ...

  return () => {
    // Cleanup ...
  };
}

export default myController;
```

Controllers are plain TypeScript functions — no class, no decorator, no lifecycle hooks. The `async/await` pattern lets you fetch initial data before binding the UI. The returned cleanup function ensures no memory leaks when the view is unmounted.

---

## Generating a Controller

```bash
npm run make:controller tasks
```

This creates `src/controllers/tasks.controller.ts` with the correct boilerplate. If you already generated it with `make:view`, open the existing file.

---

## The Controller Structure

A well-structured controller follows a consistent set of sections. The framework does not enforce this — it is a convention — but every generated controller includes these comment headers:

```typescript
import { dom }         from '@core-utils/dom.js';
import { trackEvents } from '@core-utils/events.js';
import { useState, computed, effect } from '@core/state.js';
import { apiService }  from '@services/api.service.js';
import type { RouteParams } from '@core/router.js';

async function tasksController(params: RouteParams): Promise<() => void> {

  // ─── Setup ──────────────────────────────────────────────────────────────
  const disposers: Array<() => void> = [];

  // ─── DOM Refs ───────────────────────────────────────────────────────────

  // ─── State ──────────────────────────────────────────────────────────────

  // ─── Data Fetch ─────────────────────────────────────────────────────────

  // ─── Reactive Bindings ──────────────────────────────────────────────────

  // ─── Events ─────────────────────────────────────────────────────────────

  // ─── Cleanup ────────────────────────────────────────────────────────────
  return () => {
    disposers.forEach(d => d());
  };
}

export default tasksController;
```

The `disposers` array collects every cleanup function the controller creates. The single returned cleanup function iterates it. You never forget to clean up a subscription because the pattern makes omission obvious.

---

## `dom.data('view-name')` — Scoped DOM Access

The `dom` utility provides scoped DOM queries that match the `data-view` / `data-hook` / `data-action` conventions from Chapter 05.

```typescript
const view = dom.data('tasks');
```

`dom.data('tasks')` returns a scope object whose methods query within `[data-view="tasks"]`.

### `.hook('name')` → `[data-hook="name"]`

```typescript
const taskList  = view.hook('task-list');   // → [data-hook="task-list"]
const stats     = view.hook('stats');       // → [data-hook="stats"]
const emptyMsg  = view.hook('empty-state'); // → [data-hook="empty-state"]
const taskCount = view.hook('task-count');  // → [data-hook="task-count"]
```

### `.actionSelector('name')` → CSS selector string

```typescript
view.actionSelector('new-task')  // → '[data-view="tasks"] [data-action="new-task"]'
view.actionSelector('filter')    // → '[data-view="tasks"] [data-action="filter"]'
```

`actionSelector()` returns a **string** rather than an element — it is designed for use with `trackEvents()`, which accepts CSS selectors.

### `dom.$()` — Global Query

For elements outside any view scope (navigation, modals, etc.), use the global helper:

```typescript
const navBadge = dom.$('#nav-task-count');
```

---

## `trackEvents()` — Event Registration with Auto-Cleanup

`trackEvents()` is a utility that wraps `document.addEventListener` (or an element's `addEventListener`) and returns a single cleanup function that removes all the listeners it registered:

```typescript
const { on, dispose } = trackEvents();
disposers.push(dispose);

on(document, 'click', view.actionSelector('new-task'), handleNewTask);
on(document, 'click', view.actionSelector('filter'),   handleFilter);
```

The first argument to `on()` is the element to attach the listener to. The third argument is an optional CSS selector for delegation — the handler only fires if `event.target` matches the selector or is a descendant of a matching element.

Pushing `dispose` into `disposers` means all these listeners are removed when the controller cleanup function runs.

---

## `effect()` — Reactive Bindings in Controllers

Inside a component you use `this.bind()`. Inside a controller there is no `this` — you use `effect()` instead. An effect is a function that re-runs automatically whenever the state it reads changes:

```typescript
import { effect } from '@core/state.js';

const stopEffect = effect(() => {
  taskCount.textContent = String(tasks.value.length);
});

disposers.push(stopEffect);
```

`effect()` returns a stop function. Push it into `disposers` so it is stopped when the controller cleans up.

---

## Route Parameters

The `params` argument carries URL parameters and query strings:

```typescript
// For route: /tasks/:projectId
async function tasksController(params: RouteParams) {
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

```typescript
// src/controllers/tasks.controller.ts
import { dom }         from '@core-utils/dom.js';
import { trackEvents } from '@core-utils/events.js';
import { useState, computed, effect } from '@core/state.js';
import { apiService }  from '@services/api.service.js';
import '@components/task-card/TaskCard.ts';
import '@components/task-stats/TaskStats.ts';
import type { RouteParams } from '@core/router.js';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'done';
  projectId: string;
}

type Filter = 'all' | 'pending' | 'in-progress' | 'done';

async function tasksController(params: RouteParams): Promise<() => void> {

  // ─── Setup ──────────────────────────────────────────────────────────────
  const disposers: Array<() => void> = [];
  const { on, dispose: disposeEvents } = trackEvents();
  disposers.push(disposeEvents);

  // ─── DOM Refs ───────────────────────────────────────────────────────────
  const view      = dom.data('tasks');
  const taskList  = view.hook('task-list')  as HTMLUListElement;
  const statsEl   = view.hook('stats')      as HTMLElement;
  const emptyMsg  = view.hook('empty-state') as HTMLElement;
  const taskCount = view.hook('task-count') as HTMLElement;

  // ─── State ──────────────────────────────────────────────────────────────
  const tasks  = useState<Task[]>([]);
  const filter = useState<Filter>('all');

  const filteredTasks = computed<Task[]>(() => {
    const f = filter.value;
    return f === 'all' ? tasks.value : tasks.value.filter(t => t.status === f);
  });
  disposers.push(() => filteredTasks.dispose());

  const completedCount = computed<number>(() =>
    tasks.value.filter(t => t.status === 'done').length
  );
  disposers.push(() => completedCount.dispose());

  // ─── Data Fetch ─────────────────────────────────────────────────────────
  try {
    const data = await apiService.get<Task[]>('/tasks');
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

        const card = document.createElement('task-card') as HTMLElement;
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
  on(document, 'click', view.actionSelector('filter'), (e: Event) => {
    const btn = (e.target as HTMLElement).closest('[data-action="filter"]') as HTMLElement;
    if (!btn) return;

    // Update active button styling
    document.querySelectorAll(view.actionSelector('filter'))
      .forEach(b => b.classList.remove('filter-btn--active'));
    btn.classList.add('filter-btn--active');

    filter.value = (btn.dataset.filter ?? 'all') as Filter;
  });

  on(document, 'click', view.actionSelector('new-task'), () => {
    // Navigation to new-task form — wired up in Chapter 09
    window.history.pushState({}, '', '/tasks/new');
  });

  on(document, 'click', '[data-action="delete-task"]', async (e: Event) => {
    const card = (e.target as HTMLElement).closest('[data-task-id]') as HTMLElement | null;
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

**DOM Refs** — all `dom.data()` lookups happen before the async fetch. The DOM is already mounted when the controller runs.

**State** — `tasks` and `filter` are plain `useState` containers. `filteredTasks` and `completedCount` are computed values whose dispose functions are pushed into `disposers`.

**Data Fetch** — `await apiService.get()` loads tasks. If it throws, we log the error and leave `tasks` as an empty array rather than crashing the view.

**Reactive Bindings** — a single `effect()` re-renders the task list whenever `filteredTasks.value` or `completedCount.value` changes. This is the "one effect for the list" pattern — efficient for moderate list sizes. For very large lists you would diff the previous and next arrays; Chapter 11 covers optimisation strategies.

**Events** — `trackEvents().on()` registers all delegated listeners. The filter click handler reads `btn.dataset.filter` and writes to `filter.value`, which triggers the computed, which triggers the effect — a clean reactive loop.

**Cleanup** — the returned function runs every disposer. The router calls this function before mounting the next view.

---

> **Tip:** Keep controller files focused. If a controller grows beyond ~150 lines, extract the data-fetching logic into a service and the complex rendering logic into a component.

---

## Formatting Data for Display

The template ships with `src/utils/formatters.ts` and `src/utils/helpers.ts` — ready-to-use utility functions you will reach for in almost every controller. Import them with the `@utils/` alias:

```typescript
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

```typescript
import { formatRelativeTime, formatDate } from '@utils/formatters.js';

function renderTaskRow(task: Task): string {
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

**What's Next:** [Chapter 07 — Authentication](./07-authentication.md) — protect routes, handle login/logout, and guard your Taskflow pages with the auth service.
