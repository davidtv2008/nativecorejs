# Chapter 10 — Services and API

Controllers should not know how data arrives. A well-structured NativeCoreJS app routes every network call through `api.service`, which handles base URLs, response parsing, a built-in response cache, and tag-based invalidation. The controller calls a method, gets data, and moves on.

This chapter walks through the full `api.service` surface, shows how to wire up the mock dev server, and updates Deskflow's task list to load real (mock) data instead of a hard-coded array.

---

## Mental model

```
Controller
  ↓  api.getCached('/tasks', { ttl: 30, tags: ['tasks'] })
  ↓
api.service checks its in-memory response cache
  hit  → return cached data immediately (or stale-while-revalidate)
  miss → fetch '/api/tasks', store result, return it
  ↓
Later: api.invalidateTags(['tasks']) wipes that entry
  next getCached call hits the network again
```

The cache lives in memory for the page session. It is separate from the HTML cache the router manages (Chapter 16). Think of `api.service` as your own lightweight React Query, minus JSX.

---

## `api.service` — the full surface

Import once per file:

```js
import api from '@services/api.service.js';
```

### Base URL

On localhost the service resolves to `/api` automatically. Point it elsewhere for staging:

```js
api.setBaseURL('https://staging.example.com/api');
```

### HTTP verbs

```js
await api.get('/tasks');                          // GET /api/tasks
await api.get('/tasks', { done: false });         // GET /api/tasks?done=false
await api.post('/tasks', { title: 'Buy milk', done: false });
await api.put('/tasks/42', { title: 'Buy oat milk', done: false });
await api.patch('/tasks/42', { done: true });
await api.delete('/tasks/42');
```

All methods return the parsed response body. On a non-2xx status the service throws an `Error` with the message from the server body, so you can `catch` in the controller.

### Cached GET

```js
const tasks = await api.getCached('/tasks', {
    ttl: 30,           // seconds before stale (not milliseconds)
    tags: ['tasks'],   // invalidation group
    revalidate: true,  // true → stale-while-revalidate; false → block until fresh
});
```

`ttl` is **always in seconds**. This is the most common unit mistake.

### Invalidation

After a write, clear the relevant cache entries so the next read fetches fresh data:

```js
// By tag (most common)
api.invalidateTags(['tasks']);

// By query key (advanced, when you used the queryKey option)
api.invalidateQuery(['tasks', userId]);

// Nuclear option
api.clearCache();
```

---

## The mock dev server

The scaffold ships `server.js` and `api/mockApi.js` to simulate a backend on localhost. Open `api/mockApi.js` to see what routes exist and add your own.

A minimal tasks mock looks like this (add it to `mockApi.js` if it is not already there):

```js
// api/mockApi.js  (excerpt — check your file's actual structure first)
const tasks = [
    { id: '1', title: 'Scaffold Deskflow', done: true },
    { id: '2', title: 'Build task-card component', done: false },
];

export function registerMockRoutes(router) {
    router.get('/api/tasks', (_req, res) => res.json(tasks));

    router.post('/api/tasks', (req, res) => {
        const task = { id: String(Date.now()), ...req.body };
        tasks.push(task);
        res.status(201).json(task);
    });

    router.delete('/api/tasks/:id', (req, res) => {
        const idx = tasks.findIndex(t => t.id === req.params.id);
        if (idx !== -1) tasks.splice(idx, 1);
        res.json({ ok: true });
    });
}
```

The exact shape of `mockApi.js` is project-specific — read the file first, then add handlers that match its existing pattern.

---

## `storage.service`

For client-side persistence (theme preference, draft text, settings flags) use `storage.service`:

```js
import storage from '@services/storage.service.js';

storage.setStrategy('local');            // 'memory' | 'session' | 'local'
storage.set('deskflow.theme', 'dark');
const theme = storage.get('deskflow.theme');
storage.remove('deskflow.theme');
storage.has('deskflow.theme');           // → true / false
storage.clear();                         // clears ALL keys in the active strategy
```

Default strategy is `'session'`. Switch strategies by calling `setStrategy` before any reads or writes.

---

## `logger.service`

A thin wrapper around `console` that respects a log level and can be silenced in production:

```js
import logger from '@services/logger.service.js';

logger.setLevel('debug');                // 'debug' | 'info' | 'warn' | 'error'
logger.info('tasks loaded', { count: tasks.length });
logger.error('fetch failed', err);
```

Use `logger` instead of raw `console.log` — you can turn off all logging with one call in `app.js`.

---

## Lab — Load tasks from the mock API

### Step 1 — Confirm the mock route exists

Start the dev server (`npm run dev`) and open the Network tab. If `/api/tasks` already returns JSON, skip ahead. If not, add the mock handler from the snippet above.

### Step 2 — Update the tasks controller

In `src/controllers/tasks.controller.js`:

```js
import { CoreController } from '@core/controller.js';
import api from '@services/api.service.js';
import logger from '@services/logger.service.js';

export class TasksController extends CoreController {
    async onMount() {
        this.assertRefs('listEl');
        this.tasks = this.state([]);

        try {
            const data = await api.getCached('/tasks', {
                ttl: 30,
                tags: ['tasks'],
                revalidate: true,
            });
            this.tasks.value = data;
        } catch (err) {
            logger.error('Could not load tasks', err);
        }

        this.effect(() => {
            this.renderList(this.tasks.value);
        });
    }

    renderList(tasks) {
        this.listEl.innerHTML = '';
        for (const task of tasks) {
            const card = document.createElement('task-card');
            card.setAttribute('title', task.title);
            card.dataset.id = task.id;
            if (task.done) card.setAttribute('done', '');
            this.listEl.appendChild(card);
        }
    }
}

export function tasksController(_params, _state, _loaderData, rootElement) {
    const ctrl = new TasksController(rootElement);
    return () => ctrl.destroy();
}
```

Key points:

- `onMount` may be `async`, but the constructor does **not** await it — it is fire-and-forget. Handle loading / error state yourself (a signal, a spinner, etc.).
- `this.tasks = this.state([])` gives you a reactive signal. `this.effect(...)` re-runs `renderList` any time `tasks.value` changes.
- `revalidate: true` means the first visit returns cached data instantly; the cache refreshes in the background so the next visit is always up to date.

### Step 3 — Invalidate after a write

When the user adds or deletes a task:

```js
async addTask(title) {
    await api.post('/tasks', { id: String(Date.now()), title, done: false });
    api.invalidateTags(['tasks']);

    // Reload from cache (will hit network because tag was just invalidated)
    const data = await api.getCached('/tasks', { ttl: 30, tags: ['tasks'] });
    this.tasks.value = data;
}
```

---

## Apply to Deskflow

> **Feature:** Load the task list from the mock API; invalidate after add and delete.

1. Confirm `/api/tasks` returns JSON (check Network tab in DevTools).
2. Replace the in-memory array in `tasks.controller.js` with `api.getCached`.
3. Call `api.invalidateTags(['tasks'])` after any write operation, then reload.
4. If no mock route exists yet, keep the in-memory approach but structure the controller as if the API call were present — then add the mock handler.

---

## Verify

- [ ] Network tab shows a request to `/api/tasks` on the first visit
- [ ] A second visit within 30 seconds does not make a new network request (cache hit)
- [ ] Adding a task calls `invalidateTags`, and the next `getCached` fetches fresh data
- [ ] `logger.error` (not `console.log`) is used for fetch failures

---

## Challenges

**Bronze** — Add a `GET /api/tasks/:id` mock route and fetch a single task by ID from the controller.

**Silver** — Wire the `PATCH /api/tasks/:id` route to update a task's `done` field when the toggle fires. Invalidate the cache afterward.

**Gold** — Add a loading indicator: set an `isLoading` signal to `true` before the `getCached` call and `false` after. Bind it to a `loading-spinner` component (already registered via `frameworkRegistry`) so the user sees a spinner on slow networks.

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| `ttl: 30000` (milliseconds) | `ttl` is **seconds** — use `ttl: 30` for 30 seconds |
| Calling `api.getCached` without `tags` | You will not be able to invalidate by tag later — always supply `tags` |
| Expecting auth headers to be set automatically | Wire your own `Authorization` header inside `api.service.request()` |
| Using `fetch` directly in a controller | Route it through `api.service` so caching and error handling work consistently |
| Expecting the router to wait for `async onMount` | `onMount` is not awaited — paint immediately, then update signals when the fetch resolves |

---

## Next

[Chapter 11 — Global Stores](./11-global-stores.md)
