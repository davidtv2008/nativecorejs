# Chapter 11 — Global Stores

A reactive signal declared inside a controller lives and dies with that controller. Navigate away and back, and the signal is reset. Sometimes that is exactly right. But a task list that should survive a trip to `/settings` and back needs a different home.

**Global stores** are module-level signals wrapped so the router never tears them down. Import the same store from two controllers and both get the same data — no prop drilling, no event bus.

---

## Mental model

```
Page signals (this.state)          → torn down when controller destroys
Module-level signals (make:store)  → survive navigation, shared by all importers

tasks.controller.js ──┐
                       ├── import taskItems from task.store.js  →  same object
settings.controller.js─┘
```

The secret sauce is `pausePageCleanupCollection` / `resumePageCleanupCollection`. Signals declared between those two calls are invisible to the router's cleanup pass, so they persist across route changes.

The generator handles this boilerplate for you. You just use the exported signals.

---

## Shipped stores

Two stores exist in every fresh scaffold. Read their source in `src/stores/` before using them.

### `appStore`

```js
import { appStore } from '@stores/appStore.js';

// Fields (all are State<T> signals):
appStore.user          // State<User | null>
appStore.isLoading     // State<boolean>
appStore.error         // State<string | null>
appStore.count         // State<number>

// Setters:
appStore.setUser({ id: '1', email: 'me@example.com' });
appStore.setLoading(true);
appStore.setError('Something went wrong');
appStore.clearError();
appStore.incrementCount();
appStore.decrementCount();
appStore.resetCount();
```

### `uiStore`

```js
import { uiStore } from '@stores/uiStore.js';

// Fields:
uiStore.sidebarCollapsed   // State<boolean>   persisted to localStorage
uiStore.theme              // State<Theme>      'light' | 'dark', persisted
uiStore.notifications      // State<Notification[]>

// Methods:
uiStore.toggleSidebarCollapsed();
uiStore.setSidebarCollapsed(true);
uiStore.setTheme('dark');          // also sets data-theme on <html>
uiStore.addNotification({ id: 'n1', message: 'Saved', type: 'success' });
uiStore.removeNotification('n1');
```

Note: the field is `sidebarCollapsed`, not `sidebarOpen` or `sidebarVisible`.

For a single persisted cell without a full store class, use `persistState`:

```js
import { persistState } from '@core-utils/persist.js';

export const theme = persistState('theme', 'light');
export const draft = persistState('quiz-draft', null, { storage: 'session' });
```

That is `useState` plus JSON `localStorage` / `sessionStorage`. Quota and private-mode
failures are ignored. Prefer a `make:store` module when you have methods, several
fields, or page-cleanup wrapping.

---

## Generate a store for your own resource

Prefer a **singular** resource name. The generator pluralizes the API path for you:

**Windows (PowerShell):**

```bash
npm.cmd run make:store -- task
```

**macOS / Linux:**

```bash
npm run make:store -- task
```

This creates `src/stores/task.store.js` and adds it to the stores barrel export. The JS generator output looks like this (comments trimmed):

```js
import { useState, computed, batch } from '@core/state.js';
import { pausePageCleanupCollection, resumePageCleanupCollection } from '@core/pageCleanupRegistry.js';
import api from '@services/api.service.js';

pausePageCleanupCollection();

export const taskItems   = useState([]);
export const taskLoading = useState(false);
export const taskError   = useState(null);

resumePageCleanupCollection();

export const taskCount = computed(() => taskItems.value.length);

export async function loadTasks(force = false) {
    if (taskLoading.value) return;

    batch(() => {
        taskLoading.value = true;
        taskError.value   = null;
    });

    try {
        const data = await api.getCached('/tasks', {
            ttl:        60,
            revalidate: !force,
            queryKey:   ['tasks', 'list'],
            tags:       ['tasks'],
        });
        batch(() => {
            taskItems.value   = data;
            taskLoading.value = false;
        });
    } catch (err) {
        batch(() => {
            taskError.value   = err instanceof Error ? err.message : 'Failed to load tasks';
            taskLoading.value = false;
        });
    }
}

export async function addTask(item) {
    try {
        const created = await api.post('/tasks', item);
        taskItems.value = [...taskItems.value, created];
        api.invalidateTags(['tasks']);
    } catch (err) {
        taskError.value = err instanceof Error ? err.message : 'Failed to add task';
    }
}

export async function removeTask(id) {
    const previous = taskItems.value;
    taskItems.value = previous.filter(item => item.id !== id);

    try {
        await api.delete(`/tasks/${id}`);
        api.invalidateTags(['tasks']);
    } catch (err) {
        taskItems.value = previous;
        taskError.value = err instanceof Error ? err.message : 'Failed to remove task';
    }
}
```

Always read the generated file before editing it. The key pattern is always: pause → declare module-level state → resume; derived state (`taskCount`) lives outside the pause/resume block.

---

## Use a store in a controller

```js
import { CoreController } from '@core/controller.js';
import { taskItems, taskCount, loadTasks, addTask, removeTask } from '@stores/task.store.js';

export class TasksController extends CoreController {
    onMount() {
        this.assertRefs('listEl', 'countEl');

        loadTasks();

        this.effect(() => {
            this.renderList(taskItems.value);
        });

        this.bind(taskCount, this.countEl);
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

Two things to notice:

1. `loadTasks()` is called without `await` in `onMount`. This lets the page paint immediately while data loads in the background. The `effect` re-renders automatically when `taskItems.value` changes.
2. `this.bind(taskCount, this.countEl)` keeps the DOM in sync with the signal with zero boilerplate.

---

## Two controllers, one store

The power of global stores becomes obvious when two controllers read the same data. If you read `taskCount` in a sidebar badge and the tasks list updates, the badge updates too — automatically, because both are subscribing to the same signal.

```js
// sidebar.controller.js
import { taskCount } from '@stores/task.store.js';

onMount() {
    this.assertRefs('badgeEl');
    this.bind(taskCount, this.badgeEl);
}
```

No message passing. No shared parent state. Just two importers watching the same signal.

---

## Naming gotcha

| Generator arg | Exported names (examples) | API path |
|---------------|--------------------------|----------|
| `task` | `taskItems`, `loadTasks`, `addTask`, `removeTask` | `/tasks` |
| `tasks` | `tasksItems`, `loadTasks`, `addTasks`, `removeTasks` | `/tasks` |

Use the **singular** form (`task`) to avoid double-plural names like `tasksItems`.

---

## Lab — Wire the task store

1. Run `make:store task`.
2. Open the generated `task.store.js` and confirm the API path is `/tasks`. Edit if needed.
3. Update `tasks.controller.js` to import from the store instead of calling `api.service` directly.
4. Call `addTask(...)` from the form save handler (Chapter 12 covers the form — for now you can call it from a button).
5. Navigate to `/settings` and back. Confirm the task list is still populated.

---

## Apply to Deskflow

> **Feature:** Task list state survives navigation between `/tasks` and `/settings`.

1. Generate `task.store.js` if not already done.
2. Replace any `this.state([])` task arrays in the controller with `taskItems` from the store.
3. Optionally display `taskCount.value` somewhere on the page (a badge, a header subtitle).
4. Confirm a second controller (or a future sidebar component) can read `taskCount` without any extra wiring.

---

## Verify

- [ ] Navigate away from `/tasks` and back — the list still shows (store survived)
- [ ] Two different controllers see the same `taskItems` signal
- [ ] `taskCount` updates when `taskItems` changes
- [ ] `ttl` values in the generated store use seconds, not milliseconds

---

## Challenges

**Bronze** — Display the open-task count (tasks where `done === false`) in a `<span>` on the page. Use `this.compute(() => taskItems.value.filter(t => !t.done).length)` to derive it from the store.

**Silver** — Add a `clearDoneTasks()` action to `task.store.js` that removes all completed tasks from the array and calls the API delete endpoint for each. Call it from a button in the controller.

**Gold** — Import `appStore` and set `appStore.isLoading` to `true` before `loadTasks()` and `false` after. Bind `appStore.isLoading` to a `<loading-spinner>` visible while data is in flight.

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Declaring module-level state without `pause/resumePageCleanupCollection` | The router tears it down on navigation — always wrap global state |
| Using singular `make:store task` but expecting `tasksItems` | Singular input produces `taskItems`. Double-check the generated file |
| Calling `this.state(...)` for cross-route data | `this.state` is controller-scoped; use the store for shared or persistent data |
| Mutating `taskItems.value` directly (e.g. `.push(...)`) | Always replace: `taskItems.value = [...taskItems.value, newTask]` |
| Forgetting to call `loadTasks()` on mount | The store starts empty — you must trigger the initial load |

---

## Next

[Chapter 12 — Forms and nc-inputs](./12-forms-and-nc-inputs.md)
