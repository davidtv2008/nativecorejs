# Chapter 15 — API Data Caching and Invalidation

Chapter 14 covered the router's HTML cache — the mechanism that stores view template files in memory so back-navigation doesn't hit the network. This chapter covers something different: the **API data cache**, which stores the JSON responses from your backend so that repeated data fetches don't hit the network either.

The two caches work at different layers and serve different purposes. A route cache miss costs one HTML fetch. An API cache miss costs one JSON fetch for every piece of data on the page. Getting the API cache right pays much larger dividends.

---

## Route Cache vs API Cache

| | Route cache | API cache |
|---|---|---|
| Stores | HTML template strings | JSON response bodies |
| Configured via | `.cache()` on `router.register()` | options on `api.getCached()` |
| TTL unit | Seconds | Milliseconds |
| Invalidated by | `router.bustCache()` | `api.invalidateQuery()` / `api.invalidateTags()` |
| Scope | Per route path | Per query key / tag |

When a user navigates to `/tasks`, the router may serve the HTML from its cache. But the `tasksController` still runs, calls `api.getCached('/tasks', ...)`, and the *API cache* determines whether that data fetch hits the network.

---

## `api.getCached()` — Full Options

```typescript
api.getCached(path: string, options: {
    ttl?: number;           // milliseconds, default 60000
    revalidate?: boolean;   // stale-while-revalidate, default false
    queryKey?: string[];    // key for targeted invalidation
    tags?: string[];        // tag for group invalidation
}): Promise<unknown>
```

A complete call for fetching the task list looks like:

```typescript
const tasks = await api.getCached('/tasks', {
    ttl: 60_000,
    revalidate: true,
    queryKey: ['tasks', 'list'],
    tags: ['tasks'],
});
```

This stores the response under the key `['tasks', 'list']` with the tag `'tasks'`. Either handle can later be used to invalidate this entry.

> **Tip:** Always provide both a `queryKey` and `tags`. `queryKey` lets you invalidate a specific entry precisely; `tags` let you blast-invalidate a whole category of entries after mutations.

---

## `queryKey` Strategies

A query key is an array of strings that uniquely identifies a cached entry. Think of it like a namespace path.

### Flat list key

```typescript
api.getCached('/tasks', { queryKey: ['tasks'] })
```

Simple, but coarse — invalidating `['tasks']` invalidates every entry whose key starts with `'tasks'`.

### List with filter context

```typescript
api.getCached(`/tasks?projectId=${projectId}`, {
    queryKey: ['tasks', 'list', projectId],
    tags: ['tasks'],
})
```

The `projectId` in the key ensures that task lists for different projects are cached separately. Invalidating `['tasks', 'list']` (non-exact) clears all project task lists.

### Single-item key

```typescript
api.getCached(`/tasks/${id}`, {
    queryKey: ['tasks', id],
    tags: ['tasks'],
})
```

Granular — you can refresh just one task's data without touching the list.

---

## Invalidation Methods

### `api.invalidateQuery(queryKey, { exact })`

```typescript
// Invalidate exactly one cached entry
api.invalidateQuery(['tasks', taskId], { exact: true });

// Invalidate all entries whose key starts with ['tasks']
api.invalidateQuery(['tasks'], { exact: false });
```

`exact: true` — the key must match completely. Use after updating a single task.  
`exact: false` — prefix match. Use after an operation that affects many entries with a shared prefix.

### `api.invalidateTags(tag)`

```typescript
api.invalidateTags('tasks');
```

Invalidates every cached entry that was tagged with `'tasks'`, regardless of query key structure. This is the broadest invalidation tool — use it after operations that affect an unknown number of entries.

---

## The Full Taskflow Mutation Lifecycle

Every write operation needs a corresponding cache invalidation strategy. Here is the canonical pattern for each mutation in Taskflow:

### Creating a task

```typescript
async function handleCreateTask(data: CreateTaskPayload) {
    await api.post('/tasks', data);

    // The list of tasks has changed — invalidate all task list caches
    api.invalidateTags('tasks');
    // Also bust the route HTML cache so the list view re-renders fresh HTML
    router.bustCache('/tasks');
}
```

### Updating a single task

```typescript
async function handleUpdateTask(id: string, data: UpdateTaskPayload) {
    await api.put(`/tasks/${id}`, data);

    // Only this task's detail cache needs to refresh
    api.invalidateQuery(['tasks', id], { exact: true });
    // The list may show a title or status, so refresh it too
    api.invalidateQuery(['tasks', 'list'], { exact: false });
}
```

### Deleting a task

```typescript
async function handleDeleteTask(id: string) {
    await api.delete(`/tasks/${id}`);

    // Blast-invalidate all task caches
    api.invalidateTags('tasks');
    // Bust the HTML cache too — the list page should re-fetch its template
    router.bustCache('/tasks');

    router.navigate('/tasks');
}
```

---

## Stale-While-Revalidate in Practice

When `revalidate: true` is set and the TTL has expired, `api.getCached()` resolves *immediately* with the stale data and fires a background fetch to refresh the cache. The controller's `effect()` binds this stale data to the DOM straight away, so the user sees content instantly.

When the background fetch completes, the cache is updated. The *next* call to `api.getCached()` will get fresh data — or if the controller is still mounted and the state it reads from is updated, the `effect()` will re-run automatically.

```typescript
const tasks = useState<Task[]>([]);

const data = await api.getCached('/tasks', {
    ttl: 60_000,
    revalidate: true,
    queryKey: ['tasks', 'list'],
    tags: ['tasks'],
});
tasks.value = data as Task[];

// This effect renders whatever is in `tasks` — stale or fresh
disposers.push(effect(() => {
    renderTaskList(tasks.value);
}));
```

---

## Optimistic UI Pattern

Waiting for the API to confirm a mutation before updating the UI feels sluggish for simple status toggles. The optimistic pattern updates local state *immediately*, then reconciles with the server result:

```typescript
export async function taskDetailController(
    params: Record<string, string> = {}
): Promise<() => void> {
    const events = trackEvents();
    const disposers: Array<() => void> = [];

    const taskId = params.id;
    const task = useState<Task | null>(null);

    const data = await api.getCached(`/tasks/${taskId}`, {
        ttl: 30_000,
        queryKey: ['tasks', taskId],
        tags: ['tasks'],
    });
    task.value = data as Task;

    events.onClick('toggle-complete', async () => {
        if (!task.value) return;

        // Save previous state for rollback
        const previous = task.value;

        // Optimistically flip the status
        task.value = {
            ...previous,
            status: previous.status === 'done' ? 'todo' : 'done',
        };

        try {
            await api.put(`/tasks/${taskId}`, { status: task.value.status });
            api.invalidateQuery(['tasks', taskId], { exact: true });
        } catch {
            // Server rejected — roll back
            task.value = previous;
        }
    });

    disposers.push(effect(() => {
        const t = task.value;
        if (!t) return;
        const statusEl = dom.data('task-detail').hook('status');
        if (statusEl) {
            statusEl.textContent = t.status;
            statusEl.dataset.status = t.status;
        }
    }));

    return () => {
        events.cleanup();
        disposers.forEach(d => d());
    };
}
```

The user sees the toggle update immediately. If the server returns an error, the state rolls back and the UI snaps back to the original value. No spinner, no delay on the happy path.

---

## Cache Key Collision Warning

URL query parameters produce distinct cache entries. These two calls are cached under *different* keys even though they query the same resource:

```typescript
api.getCached('/tasks?status=done')
api.getCached('/tasks?status=todo')
```

If you invalidate by query key using the path string, you must know all the query string variants in use. This is fragile. Use **tags** to group them:

```typescript
api.getCached('/tasks?status=done', { tags: ['tasks'] });
api.getCached('/tasks?status=todo', { tags: ['tasks'] });

// After a mutation, one call invalidates both
api.invalidateTags('tasks');
```

---

## Taskflow API Caching Map

| Endpoint | `queryKey` | `tags` | Invalidated after |
|---|---|---|---|
| `GET /tasks` | `['tasks', 'list']` | `['tasks']` | Create, delete any task |
| `GET /tasks?projectId=X` | `['tasks', 'list', projectId]` | `['tasks']` | Create, delete task in project |
| `GET /tasks/:id` | `['tasks', id]` | `['tasks']` | Update or delete that task |
| `GET /projects` | `['projects', 'list']` | `['projects']` | Create, delete any project |
| `GET /projects/:id` | `['projects', id]` | `['projects']` | Update or delete that project |
| `GET /profile` | `['profile']` | `['user']` | Profile update |

Keep this map updated as Taskflow grows. A missing entry means stale data will linger silently.

---

## What's Next

You now have two caching layers working in concert: route HTML and API data, each with targeted invalidation. Chapter 16 adds a third control mechanism: middleware. You'll build authentication guards that run before every navigation, logging middleware for debugging, and "save before leaving" guards that protect unsaved form data.
