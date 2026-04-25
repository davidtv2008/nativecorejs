# Chapter 21 — JavaScript Reliability Patterns in NativeCoreJS

> **What you'll build in this chapter:** Apply JavaScript-first patterns for API data shapes, state guards, controller contracts, custom events, and constants so DevHub remains reliable without TypeScript syntax.

JavaScript is the canonical language in this ebook. In a component-based framework where data flows through attributes, custom events, controllers, and reactive state, reliability comes from clear runtime guards, predictable object shapes, and small reusable helpers. This chapter collects those repeatable patterns.

---

## 21.1 Shape-First API Data

Document each API resource with lightweight shape comments near where data is consumed:

```javascript
// Task shape: { id, title, status, projectId, priority, dueDate, assigneeId }
// Project shape: { id, name, ownerId, createdAt }
// User shape: { id, name, email, avatarUrl }
```

Keep these comments close to fetch logic so the contract stays visible during maintenance.

---

## 21.2 Guarded `api.get()` Usage

```javascript
import api from '@services/api.service.js';

const task = await api.get(`/tasks/${id}`);
if (!task || !task.id) throw new Error('Invalid task payload');

const tasks = await api.get('/tasks');
if (!Array.isArray(tasks)) throw new Error('Expected tasks array');

const projects = await api.getCached('/projects');
if (!Array.isArray(projects)) throw new Error('Expected projects array');
```

Runtime guards are your contract enforcement in JavaScript.

---

## 21.3 `useState` with Null Guards

```javascript
import { useState } from '@core/state.js';

const currentTask = useState(null);
const tasks = useState([]);
const isLoading = useState(false);
const errorMsg = useState('');

if (currentTask.value != null) {
  console.log(currentTask.value.title);
}
```

Initialize with real values and guard nullable state before reading deep properties.

---

## 21.4 `computed` + Cleanup Discipline

```javascript
import { useState, computed } from '@core/state.js';

const tasks = useState([]);
const doneCount = computed(() => tasks.value.filter((t) => t.status === 'done').length);

const summaryLabel = computed(() => {
  const n = doneCount.value;
  return n === 1 ? '1 task done' : `${n} tasks done`;
});

onUnmount() {
  doneCount.dispose();
  summaryLabel.dispose();
}
```

If you create derived state, dispose it when the scope unmounts.

---

## 21.5 Controller Params and Cleanup Contract

```javascript
export async function taskDetailController(params = {}) {
  const { id } = params;
  if (!id) {
    router.navigate('/tasks');
    return () => {};
  }

  const task = useState(null);
  const disposers = [];

  const data = await api.get(`/tasks/${id}`);
  task.value = data;

  return () => {
    disposers.forEach((dispose) => dispose());
  };
}
```

Always return a cleanup function, even for early exits.

---

## 21.6 Safe Attribute Handling in Components

```javascript
const OBSERVED_ATTRS = ['status', 'priority', 'title', 'task-id'];

class TaskCard extends Component {
  static useShadowDOM = true;
  static observedAttributes = OBSERVED_ATTRS;

  attributeChangedCallback(name, _old, value) {
    switch (name) {
      case 'status':
        this.statusState.value = value;
        break;
      case 'priority':
        this.priorityState.value = value;
        break;
      case 'title':
        this.titleState.value = value;
        break;
      case 'task-id':
        this.taskIdState.value = value;
        break;
    }
  }
}
```

Prefer explicit switch branches for observed attributes so behavior stays readable and exhaustive.

---

## 21.7 Custom Event Detail Contracts

Dispatch:

```javascript
this.dispatchEvent(
  new CustomEvent('task-selected', {
    detail: { taskId: id, status: this.statusState.value },
    bubbles: true,
    composed: true,
  })
);
```

Listen:

```javascript
document.addEventListener('task-selected', (e) => {
  const detail = e.detail || {};
  const { taskId, status } = detail;
  if (!taskId) return;
  console.log(taskId, status);
});
```

Treat event detail as an external boundary and guard it the same way you guard API responses.

---

## 21.8 Reusable Store Factory Pattern

```javascript
import { useState } from '@core/state.js';

export function createStore(fetcher) {
  const items = useState([]);
  const loading = useState(false);
  const error = useState(null);

  async function load() {
    loading.value = true;
    error.value = null;
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

Use this pattern when multiple stores share the same lifecycle.

---

## 21.9 Path Aliases and Constants

```javascript
import { API_ENDPOINTS } from '@constants/apiEndpoints.js';
import { ROUTES } from '@constants/routePaths.js';

const tasks = await api.getCached(API_ENDPOINTS.TASKS.LIST, { tags: ['tasks'] });
router.navigate(ROUTES.TASK_DETAIL(newTask.id));
```

Centralized constants reduce typo-driven bugs and simplify refactors.

---

## 21.10 Done Criteria

- [ ] API responses are guarded at controller/service boundaries.
- [ ] Nullable state reads are protected with explicit checks.
- [ ] Controllers always return a cleanup function.
- [ ] Custom-event payloads are validated before use.
- [ ] Repeated store logic is extracted into a reusable factory.

---

**Back:** [Chapter 20 — Styling, Theming, and CSS Custom Properties](./20-styling-and-theming.md)  
**Next:** [Chapter 22 — Accessibility and ARIA](./22-accessibility.md)
