# Chapter 10 — Global Stores

Cross-route state with modules and `make:store`.

## Generate

Prefer a **singular** resource name (the generator pluralizes the API path):

```bash
npm.cmd run make:store -- task
```

Creates `src/stores/task.store.js` (or `.ts`) plus a stores barrel export.

Naming notes (verified):

| Store arg | Exports (examples) | API path |
|-----------|--------------------|----------|
| `task` | `taskItems`, `loadTasks`, `addTask` | `/tasks` |
| `tasks` | `tasksItems`, `loadTasks`, `addTasks` | `/tasks` |

`api.getCached` **ttl is in seconds**. Generated stores use `ttl: 60`.

## What the generator emits

Module-level `useState` fields wrapped in `pausePageCleanupCollection` /
`resumePageCleanupCollection` so navigation does not tear them down, plus
`load*` / `add*` / `remove*` actions that call `api.service`.

```js
import { taskItems, taskCount, loadTasks, addTask } from '@stores/task.store.js';

onMount() {
    loadTasks();
    this.effect(() => {
        const items = taskItems.value;
        // render from shared store
    });
}
```

Edit the generated endpoints/tags if your mock API uses different paths.

## Shipped store examples (do not invent)

**`appStore`** (`src/stores/appStore.*`): export name is **`appStore`**
(fields: `user`, `isLoading`, `error`, `count` + setters).

**`uiStore`**: `sidebarCollapsed`, `theme`, `notifications` (+ helpers).

Note: the field is `sidebarCollapsed`, not `sidebarOpen`.

Class-style stores (like `uiStore`) and export-style stores (like `make:store`)
are both valid — match whichever file you are editing.

## Apply to Deskflow

> **Feature:** Task list state survives navigation.

1. `npm.cmd run make:store -- task` (if you previously used `tasks`, rename
   endpoints away from doubled plurals or regenerate).
2. Point the tasks controller at `taskItems` / `addTask` / `removeTask`
   (or keep an in-memory `this.state` until Chapter 09’s API is ready).
3. Optionally read `taskCount.value` on the home view.

## Verify

- [ ] Navigate away and back — store data still present
- [ ] Two consumers see the same updates
- [ ] Cached calls use second-based `ttl` values

## Next

[Chapter 11 — Forms and nc-inputs](./11-forms-and-nc-inputs.md)
