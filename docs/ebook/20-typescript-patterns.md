# Chapter 20 — TypeScript Patterns in NativeCoreJS

JavaScript is perfectly capable of running a NativeCoreJS application, but TypeScript transforms it. In a component-based framework where data flows through attributes, custom events, controllers, and reactive state, the compiler becomes a second reviewer that catches whole classes of bugs before the browser ever runs a line of code. This chapter collects the TypeScript patterns you will use repeatedly as Taskflow grows.

---

## 20.1 Why TypeScript Matters More in a Component-Based Framework

Consider what can go wrong without types:

- You mistype an attribute name (`task-id` vs `taskId`) — discovered at runtime.
- An API response changes shape — discovered when a `.title` read returns `undefined`.
- A controller receives params with the wrong key — discovered by a user filing a bug.

TypeScript catches all three at compile time. The patterns below are specifically shaped for NativeCoreJS's architecture.

---

## 20.2 Typing API Responses

Define an interface for every API resource in `src/types/`:

```typescript
// src/types/task.ts
export interface Task {
    id: string;
    title: string;
    status: 'todo' | 'in-progress' | 'done';
    projectId: string;
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;           // ISO 8601, optional
    assigneeId?: string;
}

export interface Project {
    id: string;
    name: string;
    ownerId: string;
    createdAt: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
}
```

Group related types in the same file. Re-export them all from `src/types/index.ts` so consumers have a single import point.

---

## 20.3 Typed `api.get()`

The `api` service ships with generic method signatures. Always pass the expected return type:

```typescript
import api from '@services/api.service.js';
import type { Task, Project } from '../types/index.js';

// Single resource
const task = await api.get<Task>(`/tasks/${id}`);
console.log(task.title);   // ✅ TypeScript knows this is a string

// Collection
const tasks = await api.get<Task[]>('/tasks');
tasks.forEach(t => console.log(t.status)); // ✅ 'todo' | 'in-progress' | 'done'

// Cached collection (used in controllers)
const projects = await api.getCached<Project[]>('/projects');
```

Without the type parameter, `api.get()` returns `unknown` and every property access requires a type assertion. The generic is free insurance.

---

## 20.4 Typed `useState`

`useState` infers the type from its initial value in most cases, but being explicit prevents accidents with `null` initial values:

```typescript
import { useState } from '@core/state.js';
import type { Task } from '../types/index.js';

// Explicit generic — State<Task | null>
const currentTask = useState<Task | null>(null);

// TypeScript now narrows correctly
if (currentTask.value !== null) {
    console.log(currentTask.value.title); // ✅
}

// Collection
const tasks = useState<Task[]>([]);

// Primitive — inferred automatically
const isLoading = useState(false); // State<boolean>
const errorMsg  = useState('');    // State<string>
```

> **Tip:** For `useState<Task | null>(null)`, always guard with `!= null` before accessing task properties. TypeScript will enforce this automatically.

---

## 20.5 Typed `computed`

`computed` also supports a generic type parameter for cases where TypeScript cannot infer the return type:

```typescript
import { useState, computed } from '@core/state.js';
import type { Task } from '../types/index.js';

const tasks = useState<Task[]>([]);

// Inferred: ComputedState<number>
const doneCount = computed(() => tasks.value.filter(t => t.status === 'done').length);

// Explicit generic when the inferred type is too wide
const summaryLabel = computed<string>(() => {
    const n = doneCount.value;
    return n === 1 ? '1 task done' : `${n} tasks done`;
});

// Always dispose computed in onUnmount
onUnmount(): void {
    doneCount.dispose();
    summaryLabel.dispose();
}
```

---

## 20.6 Typed Controller Params

The router passes route params as `Record<string, string>`. Always destructure and guard at the top of the controller:

```typescript
export async function taskDetailController(params: Record<string, string> = {}): Promise<() => void> {
    const { id } = params;

    // Runtime guard — never trust that the param exists
    if (!id) {
        router.navigate('/tasks');
        return () => {};
    }

    const task = useState<Task | null>(null);
    const disposers: Array<() => void> = [];

    // id is confirmed string here
    const data = await api.get<Task>(`/tasks/${id}`);
    task.value = data;

    // ... bind to DOM ...

    return () => { disposers.forEach(d => d()); };
}
```

The early return of `() => {}` (an empty cleanup function) satisfies the `Promise<() => void>` return type without extra branching.

---

## 20.7 The `ControllerFunction` Type

Import the canonical type from `@core/router.js` so all controllers have a consistent signature across the project:

```typescript
import type { ControllerFunction } from '@core/router.js';
import { effect } from '@core/state.js';
import api from '@services/api.service.js';
import type { Task } from '../types/index.js';

export const tasksController: ControllerFunction = async (params = {}) => {
    const disposers: Array<() => void> = [];

    const tasks = await api.getCached<Task[]>('/tasks');
    // ... DOM updates ...

    disposers.push(effect(() => { /* reactive DOM update */ }));

    return () => { disposers.forEach(d => d()); };
};
```

Using `ControllerFunction` means TypeScript enforces the correct `(params?: Record<string, string>) => Promise<() => void>` signature everywhere. If you accidentally return `void` instead of a cleanup function, the compiler tells you immediately.

---

## 20.8 Typed Component Attributes

Use `as const` on `observedAttributes` and derive a union type for attribute names:

```typescript
const OBSERVED_ATTRS = ['status', 'priority', 'title', 'task-id'] as const;
type TaskCardAttr = typeof OBSERVED_ATTRS[number];
// → 'status' | 'priority' | 'title' | 'task-id'

class TaskCard extends Component {
    static useShadowDOM = true;
    static observedAttributes = OBSERVED_ATTRS;

    attributeChangedCallback(name: TaskCardAttr, _old: string, value: string) {
        switch (name) {
            case 'status':   this.statusState.value = value as Task['status']; break;
            case 'priority': this.priorityState.value = value as Task['priority']; break;
            case 'title':    this.titleState.value = value; break;
            case 'task-id':  this.taskIdState.value = value; break;
        }
    }
}
```

The `switch` statement now exhaustively covers every observed attribute. Add a new string to `OBSERVED_ATTRS` and TypeScript will flag every switch block that doesn't handle it.

---

## 20.9 Custom Events with Typed Detail

Dispatching:

```typescript
this.dispatchEvent(
    new CustomEvent<{ taskId: string; status: Task['status'] }>('task-selected', {
        detail: { taskId: id, status: this.statusState.value as Task['status'] },
        bubbles: true,
        composed: true,   // must escape shadow boundary
    })
);
```

Listening:

```typescript
document.addEventListener('task-selected', (e: Event) => {
    const { taskId, status } = (e as CustomEvent<{ taskId: string; status: Task['status'] }>).detail;
    console.log(taskId, status);
});
```

> **Tip:** Define a `TaskSelectedEvent` type alias near the component file so both the dispatcher and all listeners share the same shape, eliminating copy-paste drift.

---

## 20.10 Generic Store Pattern

When several stores share the same shape (list of items, loading flag, error), extract a generic factory:

```typescript
// src/stores/create-store.ts
import { useState } from '@core/state.js';

export function createStore<T>(fetcher: () => Promise<T[]>) {
    const items    = useState<T[]>([]);
    const loading  = useState(false);
    const error    = useState<string | null>(null);

    async function load() {
        loading.value = true;
        error.value   = null;
        try {
            items.value = await fetcher();
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Unknown error';
        } finally {
            loading.value = false;
        }
    }

    return { items, loading, error, load };
}
```

Usage in Taskflow:

```typescript
// src/stores/task.store.ts
import api from '@services/api.service.js';
import type { Task } from '../types/index.js';
import { createStore } from './create-store.js';

export const taskStore = createStore<Task>(() => api.getCached<Task[]>('/tasks'));
```

TypeScript infers `taskStore.items` as `State<Task[]>` automatically.

---

## 20.11 Path Aliases in `tsconfig`

The project's `tsconfig.json` maps short aliases to source directories so imports never use deep relative paths like `../../../../core/state.js`:

```json
{
  "compilerOptions": {
    "paths": {
      "@core/*":        ["./src/core/*"],
      "@core-utils/*":  ["./src/core-utils/*"],
      "@services/*":    ["./src/services/*"],
      "@stores/*":      ["./src/stores/*"],
      "@components/*":  ["./src/components/*"],
      "@utils/*":       ["./src/utils/*"],
      "@constants/*":   ["./src/constants/*"],
      "@views/*":       ["./src/views/*"]
    }
  }
}
```

Always use these aliases in import statements:

```typescript
// ✅ Correct
import { useState } from '@core/state.js';
import api from '@services/api.service.js';

// ❌ Avoid — fragile, breaks on file moves
import { useState } from '../../core/state.js';
```

Never import from `node_modules` directly using a relative path.

---

## 20.12 Constants — API Endpoints, Routes, and Storage Keys

The `src/constants/` folder centralises every magic string in the app. The template generates three files:

### `src/constants/apiEndpoints.ts`

```typescript
export const API_ENDPOINTS = {
    AUTH: {
        LOGIN:   '/auth/login',
        LOGOUT:  '/auth/logout',
        REFRESH: '/auth/refresh',
    },
    TASKS: {
        LIST:   '/tasks',
        DETAIL: (id: string) => `/tasks/${id}`,
        CREATE: '/tasks',
        UPDATE: (id: string) => `/tasks/${id}`,
        DELETE: (id: string) => `/tasks/${id}`,
    },
    PROJECTS: {
        LIST:   '/projects',
        DETAIL: (id: string) => `/projects/${id}`,
    },
    DASHBOARD: {
        STATS:    '/dashboard/stats',
        ACTIVITY: '/dashboard/activity',
    },
} as const;
```

Use it instead of inline strings so a backend path change requires a single edit:

```typescript
import { API_ENDPOINTS } from '@constants/apiEndpoints.js';

// ✅ Type-safe, centralised
const tasks = await api.getCached(API_ENDPOINTS.TASKS.LIST, { tags: ['tasks'] });
const task  = await api.get(API_ENDPOINTS.TASKS.DETAIL(params.id));

// ❌ Scattered strings — easy to mistype, hard to refactor
const tasks = await api.getCached('/tasks', { tags: ['tasks'] });
```

### `src/constants/routePaths.ts`

```typescript
export const ROUTES = {
    HOME:        '/',
    LOGIN:       '/login',
    DASHBOARD:   '/dashboard',
    TASKS:       '/tasks',
    TASK_DETAIL: (id: string) => `/tasks/${id}`,
    PROJECTS:    '/projects',
    PROFILE:     '/profile',
} as const;
```

Use it in `router.navigate()` calls and in `routes.ts` registrations:

```typescript
import { ROUTES } from '@constants/routePaths.js';

router.navigate(ROUTES.TASK_DETAIL(newTask.id));
router.register(ROUTES.TASKS, 'src/views/protected/tasks.html', lazyController(…));
```

### `src/constants/storageKeys.ts`

```typescript
export const STORAGE_KEYS = {
    ACCESS_TOKEN:    'access_token',
    REFRESH_TOKEN:   'refresh_token',
    USER_DATA:       'user_data',
    SIDEBAR_COLLAPSED: 'sidebar-collapsed',
    THEME:           'theme',
} as const;
```

Use in `auth.service.ts` and any component that reads `localStorage`:

```typescript
import { STORAGE_KEYS } from '@constants/storageKeys.js';

localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
```

> **Tip:** Adding `as const` to the constants object gives TypeScript narrowed literal types for every value. `ROUTES.LOGIN` has type `'/login'` rather than `string`, which lets the compiler catch invalid route strings at compile time.

---

## What's Next

Chapter 21 tackles **Accessibility and ARIA** — how ARIA attributes behave inside shadow roots, building keyboard-navigable task cards, managing focus when modals open and close, and testing the Taskflow UI with the axe DevTools extension.
