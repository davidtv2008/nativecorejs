# Chapter 13 — Dynamic Routes, URL Parameters, and Wildcards

So far, Taskflow's routes have been static strings: `/dashboard`, `/tasks`, `/login`. But a real task management app needs pages that are *parameterized* — a task detail page that knows *which* task to show, a project page that can load any project by its ID. That's exactly what dynamic routes provide.

This chapter covers all three dynamic route patterns NativeCoreJS supports, shows you how to wire them into Taskflow, and walks through a complete task-detail controller that reads a URL parameter, fetches the right data, and handles edge cases like 404s.

---

## What Are Dynamic Routes?

A dynamic route is any route whose path contains a variable segment. Instead of registering `/tasks/123` and `/tasks/456` as separate routes, you register `/tasks/:id` once and let the router extract `id` from the URL for you.

Dynamic routes are the right choice whenever the page's *content* depends on something in the URL:

- **Task detail** — `/tasks/:id` → show one specific task
- **Project task list** — `/projects/:id/tasks` → show tasks for one project
- **Contextual task detail** — `/projects/:id/tasks/:taskId?` → show a project, optionally focused on one task
- **Catch-all 404** — `/*` → handle any path the router doesn't recognise

---

## The Three Pattern Types

NativeCoreJS supports three kinds of dynamic segments:

| Pattern | Example | Behavior |
|---|---|---|
| `:param` | `/tasks/:id` | Required named segment |
| `:param?` | `/tasks/:taskId?` | Optional named segment |
| `*` | `/*` | Wildcard — matches everything, captured as `params.wildcard` |

You can combine them in one path. The router resolves them in registration order, so register more-specific routes before catch-alls.

---

## Creating the Task Detail View

**Always start with the scaffold command.** Never create view files by hand.

```bash
npm run make:view task-detail
```

The CLI will ask you a series of questions:

```
? Is this a protected route? › Yes
? Route path › /tasks/:id
? Generate a controller? › Yes
```

After answering, the tool creates:

- `src/views/task-detail/task-detail.view.html`
- `src/controllers/task-detail.controller.ts`

And registers the route stub in your `routes.ts`.

---

## How Params Reach the Controller

Every controller receives a `params` object as its first argument. This is a plain `Record<string, string>` populated by the router from the URL at the moment of navigation.

For a route registered as `/tasks/:id`, navigating to `/tasks/42` will call your controller with:

```typescript
params = { id: "42" }
```

The controller signature:

```typescript
export async function taskDetailController(
    params: Record<string, string> = {}
): Promise<() => void> {
    const taskId = params.id;
    // ...
}
```

All param values are strings — convert to a number if your API expects one.

---

## Full `taskDetailController` Implementation

Here is a complete implementation. It reads `params.id`, fetches the task from the API, renders the task to the DOM, and handles the case where the task doesn't exist.

```typescript
import { useState, effect } from '@core/state.js';
import { dom } from '@core-utils/dom.js';
import { trackEvents } from '@core-utils/events.js';
import { api } from '@services/api.service.js';
import { router } from '@core/router.js';

interface Task {
    id: number;
    title: string;
    description: string;
    status: 'todo' | 'in-progress' | 'done';
}

export async function taskDetailController(
    params: Record<string, string> = {}
): Promise<() => void> {
    const events = trackEvents();
    const disposers: Array<() => void> = [];

    const scope = dom.data('task-detail');
    const taskId = params.id;

    const task = useState<Task | null>(null);
    const loading = useState(true);
    const notFound = useState(false);

    // Fetch the task
    try {
        const data = await api.get(`/tasks/${taskId}`);
        if (!data) {
            notFound.value = true;
        } else {
            task.value = data as Task;
        }
    } catch {
        notFound.value = true;
    } finally {
        loading.value = false;
    }

    // Render loading state
    disposers.push(effect(() => {
        const loadingEl = scope.hook('loading');
        if (loadingEl) loadingEl.style.display = loading.value ? 'block' : 'none';
    }));

    // Render 404 state
    disposers.push(effect(() => {
        const notFoundEl = scope.hook('not-found');
        if (notFoundEl) notFoundEl.style.display = notFound.value ? 'block' : 'none';
    }));

    // Render task content
    disposers.push(effect(() => {
        const t = task.value;
        if (!t) return;

        const titleEl = scope.hook('title');
        const descEl = scope.hook('description');
        const statusEl = scope.hook('status');

        if (titleEl) titleEl.textContent = t.title;
        if (descEl) descEl.textContent = t.description;
        if (statusEl) {
            statusEl.textContent = t.status;
            statusEl.dataset.status = t.status;
        }
    }));

    // Back button
    events.onClick('back', () => router.back());

    return () => {
        events.cleanup();
        disposers.forEach(d => d());
    };
}
```

And the matching view HTML:

```html
<div data-view="task-detail">
    <button data-action="back">← Back</button>

    <div data-hook="loading">Loading task…</div>
    <div data-hook="not-found" style="display:none">
        <h2>Task not found</h2>
        <p>This task may have been deleted or you don't have access to it.</p>
    </div>

    <article data-hook="task-content">
        <h1 data-hook="title"></h1>
        <p data-hook="description"></p>
        <span data-hook="status"></span>
    </article>
</div>
```

> **Tip:** Use `scope.hook('name')` to find elements by `data-hook` within the view's scope. This keeps selectors isolated — two views can both have a `data-hook="title"` without colliding.

---

## Optional Params with `:param?`

Optional params let one route handle multiple URL shapes. Taskflow uses this for the project context view — you can land on a project's full task list, or navigate directly to a specific task *within* that project without leaving the project layout.

```bash
npm run make:view project-tasks
```

```
? Is this a protected route? › Yes
? Route path › /projects/:id/tasks/:taskId?
? Generate a controller? › Yes
```

In the controller, check whether `taskId` is present:

```typescript
export async function projectTasksController(
    params: Record<string, string> = {}
): Promise<() => void> {
    const events = trackEvents();
    const disposers: Array<() => void> = [];

    const projectId = params.id;          // always present
    const taskId = params.taskId;         // may be undefined

    if (taskId) {
        // Show project layout + focused task detail panel
        await loadTaskDetail(taskId);
    } else {
        // Show project layout + full task list
        await loadProjectTasks(projectId);
    }

    return () => {
        events.cleanup();
        disposers.forEach(d => d());
    };
}
```

Optional params make it easy to keep context visible in the URL without needing separate routes for every combination.

---

## Wildcard Routes and Custom 404 Pages

The `*` wildcard matches *everything* that no other route has claimed. Use it to render a friendly 404 page rather than a blank screen.

```bash
npm run make:view not-found
```

```
? Is this a protected route? › No
? Route path › /*
? Generate a controller? › Yes
```

When a user hits `/*`, the router captures the unmatched portion of the URL as `params.wildcard`:

```typescript
export async function notFoundController(
    params: Record<string, string> = {}
): Promise<() => void> {
    const events = trackEvents();
    const disposers: Array<() => void> = [];

    const scope = dom.data('not-found');
    const attempted = params.wildcard ?? '/';

    disposers.push(effect(() => {
        const pathEl = scope.hook('attempted-path');
        if (pathEl) pathEl.textContent = attempted;
    }));

    events.onClick('go-home', () => router.navigate('/'));

    return () => {
        events.cleanup();
        disposers.forEach(d => d());
    };
}
```

> **Warning:** Register `/*` *last* in your `routes.ts`. The router matches routes in registration order, and a wildcard registered first will swallow every navigation.

---

## Route Registration in `routes.ts`

Here is how all three patterns look together in Taskflow's route file:

```typescript
import { router } from '@core/router.js';
import { taskDetailController } from './controllers/task-detail.controller.js';
import { projectTasksController } from './controllers/project-tasks.controller.js';
import { notFoundController } from './controllers/not-found.controller.js';

// Required param
router.register('/tasks/:id', 'views/task-detail/task-detail.view.html', taskDetailController);

// Optional param
router.register(
    '/projects/:id/tasks/:taskId?',
    'views/project-tasks/project-tasks.view.html',
    projectTasksController
);

// Wildcard catch-all — always last
router.register('/*', 'views/not-found/not-found.view.html', notFoundController);
```

---

## Navigating to a Dynamic Route

From the task list controller, navigate to a task's detail page by composing the path string:

```typescript
events.onClick('task-item', (e) => {
    const el = (e.target as HTMLElement).closest('[data-task-id]');
    if (!el) return;
    const taskId = (el as HTMLElement).dataset.taskId;
    router.navigate('/tasks/' + taskId);
});
```

The router pushes the full path to browser history, and `taskDetailController` receives `{ id: taskId }` as its params.

---

## History State

Beyond URL params and query strings, the router lets you attach an arbitrary state object to a navigation entry. This state survives back/forward clicks and is available instantly on arrival — without encoding anything in the URL.

```typescript
// Push navigation with attached state
router.navigate('/tasks/' + taskId, {
    fromView: 'kanban',
    scrollPosition: window.scrollY,
});

// In the receiving controller — state is on window.history.state
const navState = (window.history.state ?? {}) as { fromView?: string; scrollPosition?: number };
if (navState.fromView === 'kanban') {
    // Show a "Back to Board" link instead of the default breadcrumb
}
```

**Good uses for history state:**
- Which tab or panel should be pre-selected on arrival
- Scroll position to restore when navigating back
- Whether the user came from a compact flow (e.g. quick-add dialog) or the full list view
- A notification message to flash once ("Task created successfully")

**Do not use history state for:**
- Durable application state — if the user refreshes, `window.history.state` may be `null`
- Data that other controllers or components need — use a store for shared state
- Large objects — keep it small; it is serialized by the browser as JSON

> **Tip:** Always guard against `null`: `const state = (window.history.state ?? {}) as MyStateType`. First-load navigations, hard refreshes, and external links will all have a `null` state object.

---

## Built-in 404 Behaviour

If no route matches and you haven't registered a `/*` wildcard, the router simply does nothing — the current view stays visible and the URL does not change. Registering a `/*` wildcard is the idiomatic way to show a proper 404 experience. The router itself does not render a built-in error page; the wildcard route *is* your 404 page.

---

**Back:** [Chapter 12 — Going to Production](./12-production.md)  
**Next:** [Chapter 14 — Route Caching and Prefetching](./14-route-caching.md)
