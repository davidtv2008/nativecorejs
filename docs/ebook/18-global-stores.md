# Chapter 17 — Global Stores and Cross-Route State

Every controller you have written so far creates its state locally — `useState()` inside the controller function. When the controller is cleaned up (because the user navigated away), that state is released. The tasks you fetched are gone. The next time the user visits the same route, the controller runs again and fetches the tasks again.

For some data that's fine. For data that is expensive to fetch, shared across multiple views, or needs to persist across navigation, you want something that lives longer than a single controller.

That something is a global store.

---

## The Problem With Controller-Local State

Imagine the user opens `/tasks`, which fetches 50 tasks from the API. They click on one, navigating to `/tasks/42`. The tasks controller is cleaned up. They press back. The tasks controller runs again, fetches the same 50 tasks again.

Or: the dashboard shows a task count badge and the task list shows the same tasks. They are rendered by two different controllers. When the user creates a task in the task list, how does the dashboard badge update?

Controller-local state can't solve either of these problems. Global stores can.

---

## Module-Level `useState()` — How Global Stores Work

The key insight is simple: `useState()` called at **module scope** creates a state value that is initialised once when the module is first imported, and lives for the entire app session.

```typescript
// src/stores/task.store.ts
import { useState } from '@core/state.js';

export const tasks = useState<Task[]>([]);
export const loadingTasks = useState(false);
```

Every controller that imports `task.store.ts` gets references to the *same* `tasks` and `loadingTasks` objects. An `effect()` in the dashboard controller that reads `tasks.value` will re-run whenever the tasks list controller writes to `tasks.value` — because they are the same state object.

This is the store pattern. There is no special "store API" in NativeCoreJS — stores are just modules that export module-level state.

---

## Building `task.store.ts`

Stores are plain TypeScript modules. There is no scaffold command for them — create the `src/stores/` directory and the file manually:

```typescript
// src/stores/task.store.ts
import { useState, computed } from '@core/state.js';
import { api } from '@services/api.service.js';
import { router } from '@core/router.js';

export interface Task {
    id: string;
    title: string;
    description: string;
    status: 'todo' | 'in-progress' | 'done';
    projectId: string | null;
    dueDate: string | null;
    completed: boolean;
}

// --- State ---
export const tasks = useState<Task[]>([]);
export const activeProjectId = useState<string | null>(null);
export const loadingTasks = useState(false);

// --- Actions ---

export async function loadTasks(projectId?: string): Promise<void> {
    loadingTasks.value = true;
    try {
        const path = projectId ? `/tasks?projectId=${projectId}` : '/tasks';
        const data = await api.getCached(path, {
            ttl: 60_000,
            revalidate: true,
            queryKey: projectId ? ['tasks', 'list', projectId] : ['tasks', 'list'],
            tags: ['tasks'],
        });
        tasks.value = data as Task[];
    } finally {
        loadingTasks.value = false;
    }
}

export async function createTask(payload: Omit<Task, 'id'>): Promise<Task> {
    const created = await api.post('/tasks', payload) as Task;
    tasks.value = [...tasks.value, created];
    api.invalidateTags('tasks');
    router.bustCache('/tasks');
    return created;
}

export async function updateTask(id: string, payload: Partial<Task>): Promise<void> {
    await api.put(`/tasks/${id}`, payload);
    tasks.value = tasks.value.map(t =>
        t.id === id ? { ...t, ...payload } : t
    );
    api.invalidateQuery(['tasks', id], { exact: true });
}

export async function deleteTask(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`);
    tasks.value = tasks.value.filter(t => t.id !== id);
    api.invalidateTags('tasks');
    router.bustCache('/tasks');
}

export function reset(): void {
    tasks.value = [];
    activeProjectId.value = null;
    loadingTasks.value = false;
}
```

Actions live alongside state in the same module. They mutate the store state *and* call the API — keeping both in sync. Notice how `createTask` appends the new task to `tasks.value` immediately without waiting for a re-fetch. The list updates instantly.

---

## Building `project.store.ts`

```typescript
// src/stores/project.store.ts
import { useState } from '@core/state.js';
import { api } from '@services/api.service.js';

export interface Project {
    id: string;
    name: string;
    color: string;
}

export const projects = useState<Project[]>([]);
export const loadingProjects = useState(false);

export async function loadProjects(): Promise<void> {
    loadingProjects.value = true;
    try {
        const data = await api.getCached('/projects', {
            ttl: 120_000,
            revalidate: true,
            queryKey: ['projects', 'list'],
            tags: ['projects'],
        });
        projects.value = data as Project[];
    } finally {
        loadingProjects.value = false;
    }
}

export async function createProject(payload: Omit<Project, 'id'>): Promise<Project> {
    const created = await api.post('/projects', payload) as Project;
    projects.value = [...projects.value, created];
    api.invalidateTags('projects');
    return created;
}

export function reset(): void {
    projects.value = [];
}
```

---

## Consuming a Store in a Controller

The tasks list controller now becomes lean — it delegates data management to the store:

```typescript
// src/controllers/tasks.controller.ts
import { effect } from '@core/state.js';
import { dom } from '@core-utils/dom.js';
import { trackEvents } from '@core-utils/events.js';
import { escapeHTML } from '@core-utils/templates.js';
import { router } from '@core/router.js';
import {
    tasks,
    loadingTasks,
    loadTasks,
    createTask,
} from '../stores/task.store.js';

export async function tasksController(
    params: Record<string, string> = {}
): Promise<() => void> {
    const events = trackEvents();
    const disposers: Array<() => void> = [];
    const scope = dom.data('tasks');

    // Load tasks — if they are already in the store from a previous visit,
    // the stale-while-revalidate fetch happens in the background
    await loadTasks();

    disposers.push(effect(() => {
        const listEl = scope.hook('list');
        if (!listEl) return;

        if (loadingTasks.value && tasks.value.length === 0) {
            listEl.innerHTML = '<li>Loading…</li>';
            return;
        }

        listEl.innerHTML = tasks.value
            .map(t => `
                <li data-task-id="${escapeHTML(t.id)}" data-action="open-task">
                    <span>${escapeHTML(t.title)}</span>
                    <span data-status="${escapeHTML(t.status)}">${escapeHTML(t.status)}</span>
                </li>
            `)
            .join('');
    }));

    events.onClick('open-task', (e) => {
        const li = (e.target as HTMLElement).closest('[data-task-id]') as HTMLElement;
        if (!li) return;
        router.navigate('/tasks/' + li.dataset.taskId);
    });

    return () => {
        events.cleanup();
        disposers.forEach(d => d());
    };
}
```

The `effect()` reads both `loadingTasks.value` and `tasks.value`. Whenever either changes — from this controller or any other — the list re-renders.

---

## Multiple Controllers, One Store

The dashboard also shows task data — a count badge and an "overdue tasks" section. It imports the same store:

```typescript
// src/controllers/dashboard.controller.ts
import { effect, computed } from '@core/state.js';
import { dom } from '@core-utils/dom.js';
import { trackEvents } from '@core-utils/events.js';
import { tasks, loadTasks } from '../stores/task.store.js';

export async function dashboardController(
    params: Record<string, string> = {}
): Promise<() => void> {
    const events = trackEvents();
    const disposers: Array<() => void> = [];
    const scope = dom.data('dashboard');

    await loadTasks();

    const overdueTasks = computed(() => {
        const now = Date.now();
        return tasks.value.filter(t =>
            t.dueDate !== null &&
            new Date(t.dueDate).getTime() < now &&
            !t.completed
        );
    });
    disposers.push(() => overdueTasks.dispose());

    disposers.push(effect(() => {
        const badge = scope.hook('task-count');
        if (badge) badge.textContent = String(tasks.value.length);

        const overdueEl = scope.hook('overdue-count');
        if (overdueEl) overdueEl.textContent = String(overdueTasks.value.length);
    }));

    return () => {
        events.cleanup();
        disposers.forEach(d => d());
    };
}
```

If the user creates a task while on the task list page, `tasks.value` is updated in the store. If the user then navigates to the dashboard, `loadTasks()` will run again — but the `effect()` *immediately* renders the already-updated store data while the background revalidation happens. The badge is always current.

> **Tip:** Always call `computed().dispose()` in cleanup. Computed values register reactive subscriptions. If you skip disposal, the subscription leaks even after the controller is cleaned up.

---

## Resetting the Store on Logout

Module-level state persists for the app session — including across logout. If user A logs out and user B logs in on the same session, user B should not see user A's tasks.

Call each store's `reset()` function in the logout handler:

```typescript
// src/controllers/settings.controller.ts (or wherever logout lives)
import { taskStore } from '../stores/task.store.js';
import { projectStore } from '../stores/project.store.js';
import { auth } from '@services/auth.service.js';
import { router } from '@core/router.js';

async function handleLogout() {
    await auth.logout();
    taskStore.reset();
    projectStore.reset();
    router.navigate('/login');
}
```

---

## Global Search with a Search Store

A search bar that lives in the app shell can filter content on multiple views. A search store makes this wiring trivial:

```typescript
// src/stores/search.store.ts
import { useState } from '@core/state.js';

export const searchQuery = useState('');
```

The app shell controller updates `searchQuery.value` on every keystroke. Any controller that wants to respond to the search just reads `searchQuery.value` inside an `effect()`.

---

## When NOT to Use a Store

Stores are for data that needs to survive navigation or be shared across views. For data that only matters to a single route, local controller state is simpler and cleaner.

| Data | Where to put it |
|---|---|
| Task list shared by dashboard + tasks page | Store |
| Current user profile | Store |
| Form field values on a create-task page | Local controller state |
| Whether a modal is open on the current page | Local controller state |
| Search query used in the app shell | Store |
| Pagination cursor for a list | Local controller state (reset on each visit) |

The guideline: if the cleanup function in your controller throws the data away and that's fine, use local state. If losing it on navigation would cause a worse experience, use a store.

---

## Store vs Service

It's easy to conflate stores and services. They play different roles:

- **Services** (e.g. `auth.service.ts`) perform operations — they call APIs, manage tokens, handle sessions. They expose *methods*, not reactive state.
- **Stores** hold reactive state. They export `useState()` values and functions that mutate them.

The auth service calls the API to log in. The user store holds the current user object as reactive state. Controllers read from the store; they call the service to trigger changes.

---

**Back:** [Chapter 16 — Router Middleware and Navigation Guards](./16-middleware.md)  
**Next:** [Chapter 18 — Component Composition and Slots](./18-slots-and-composition.md)
