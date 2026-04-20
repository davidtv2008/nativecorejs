# Chapter 8 — APIs and Async Data

Controllers live and breathe asynchronous data. NativeCoreJS ships an `api.service` that wraps `fetch`, handles tokens, and provides a lightweight caching layer so you are not writing the same boilerplate in every controller. This chapter covers the full API surface and then builds the Taskflow `projectsController` from scratch.

---

## The `api.service` Methods

Import the singleton at the top of any controller:

```typescript
import { api } from '@services/api.service.js';
```

### Basic CRUD

```typescript
// GET  /projects
const { data, error } = await api.get('/projects');

// POST /projects  { name: 'Acme Launch' }
const { data, error } = await api.post('/projects', { name: 'Acme Launch' });

// PUT  /projects/42
const { data, error } = await api.put('/projects/42', { name: 'Updated Name' });

// DELETE /projects/42
const { data, error } = await api.delete('/projects/42');
```

Every method returns `{ data, error }`. When the request succeeds `error` is `null`; when it fails `data` is `null` and `error` carries a `{ message, status }` object. This lets you destructure without a try/catch for expected HTTP errors.

### Cached GET — `getCached`

`getCached` wraps a GET request in a memory cache keyed on the URL.

```typescript
const { data, error } = await api.getCached('/projects', {
  ttl:        30_000,  // cache lifetime in milliseconds (default: 60 000)
  revalidate: true,    // re-fetch in the background after TTL expires
  tags:       ['projects'],  // used with invalidateTags()
});
```

| Option | Type | Default | Purpose |
|---|---|---|---|
| `ttl` | `number` | `60000` | Milliseconds before the entry is stale |
| `revalidate` | `boolean` | `false` | Serve stale data instantly, refresh in background |
| `tags` | `string[]` | `[]` | Logical group for bulk invalidation |

### Invalidation

```typescript
// Invalidate one specific URL
api.invalidateQuery('/projects');

// Invalidate every entry that shares a tag
api.invalidateTags(['projects']);
```

Call these after a mutation (POST, PUT, DELETE) so the next `getCached` call fetches fresh data rather than returning the stale cached value.

> **Tip:** Use `invalidateTags` in combination with `revalidate: true` to build near-instant UI updates: the old data renders immediately, the fresh data replaces it silently in the background.

---

## Loading and Error State Pattern

Every controller that fetches data follows the same three-state pattern:

```typescript
const isLoading = useState(true);
const errorMsg  = useState('');
```

Wire them to the DOM **before** the first `await`:

```typescript
isLoading.subscribe(loading => {
  scope.$('.spinner').toggleAttribute('hidden', !loading);
  scope.$('.content').toggleAttribute('hidden', loading);
});

errorMsg.subscribe(msg => {
  const alert = scope.$('.error-alert') as HTMLElement;
  alert.toggleAttribute('hidden', !msg);
  if (msg) alert.setAttribute('message', msg);
});
```

Then wrap every fetch in try/catch/finally:

```typescript
try {
  const { data, error } = await api.getCached('/projects', { tags: ['projects'] });
  if (error) { errorMsg.value = error.message; return; }
  renderProjects(data);
} catch {
  errorMsg.value = 'Could not load projects. Check your connection.';
} finally {
  isLoading.value = false;
}
```

---

## Building `projectsController`

Generate the files:

```bash
npm run make:controller projects
npm run make:view       projects
```

### `projects.html` (excerpt)

```html
<div data-view="projects">
  <header class="page-header">
    <h1>Projects</h1>
    <nc-button id="btn-new-project" variant="primary" icon="plus">
      New Project
    </nc-button>
  </header>

  <nc-alert type="error" class="projects-error" hidden></nc-alert>

  <nc-spinner class="projects-spinner" size="lg"></nc-spinner>

  <div class="projects-content" hidden>
    <nc-table
      id="projects-table"
      sortable
    ></nc-table>
  </div>
</div>
```

### `projectsController.ts`

```typescript
import { dom }       from '@core-utils/dom.js';
import { api }       from '@services/api.service.js';
import { useState }  from '@core/state.js';
import { trackEvents } from '@core-utils/events.js';
import { router }    from '@core/router.js';
import { escapeHTML } from '@core-utils/templates.js';

interface Project {
  id:        number;
  name:      string;
  taskCount: number;
  status:    'active' | 'archived';
  updatedAt: string;
}

export async function projectsController(): Promise<() => void> {
  const scope     = dom.data('projects');
  const { on, dispose } = trackEvents();

  const isLoading = useState(true);
  const errorMsg  = useState('');

  // --- Reactive DOM bindings ---
  isLoading.subscribe(loading => {
    scope.$('.projects-spinner').toggleAttribute('hidden', !loading);
    scope.$('.projects-content').toggleAttribute('hidden', loading);
  });

  errorMsg.subscribe(msg => {
    const alert = scope.$('.projects-error') as HTMLElement;
    alert.toggleAttribute('hidden', !msg);
    if (msg) alert.setAttribute('message', msg);
  });

  // --- Fetch data ---
  try {
    const { data, error } = await api.getCached('/projects', {
      ttl:        60_000,
      revalidate: true,
      tags:       ['projects'],
    });

    if (error) {
      errorMsg.value = error.message ?? 'Failed to load projects.';
      return dispose;
    }

    renderTable(data as Project[]);
  } catch {
    errorMsg.value = 'Unexpected error — please refresh the page.';
  } finally {
    isLoading.value = false;
  }

  // --- Table renderer ---
  function renderTable(projects: Project[]) {
    const table = scope.$('#projects-table') as any;

    table.columns = [
      { key: 'name',      label: 'Project',      sortable: true },
      { key: 'taskCount', label: 'Tasks',         sortable: true },
      { key: 'status',    label: 'Status' },
      { key: 'updatedAt', label: 'Last Updated',  sortable: true },
      { key: '_actions',  label: '' },
    ];

    table.rows = projects.map(p => ({
      ...p,
      name:      escapeHTML(p.name),
      updatedAt: new Date(p.updatedAt).toLocaleDateString(),
      _actions:  `<nc-button size="sm" data-id="${p.id}" class="btn-view">View</nc-button>`,
    }));
  }

  // --- Navigation ---
  on('click', '.btn-view', (e: Event) => {
    const id = (e.target as HTMLElement).dataset.id;
    router.navigate(`/projects/${id}`);
  });

  on('click', '#btn-new-project', () => router.navigate('/projects/new'));

  return dispose;
}
```

> **Warning:** `getCached` uses the request URL as the cache key. If you pass query parameters (`/projects?status=active`), each unique URL gets its own cache entry. Call `api.invalidateTags(['projects'])` after any mutation to clear all of them at once.

---

## After a Mutation — Refresh the List

When the user creates a new project and returns to the list, you want fresh data:

```typescript
// Inside newProjectController, after a successful POST:
api.invalidateTags(['projects']);
router.navigate('/projects');
```

Because the projects route uses `.cache()` on the router registration, the controller re-runs only when its data cache is also stale — `invalidateTags` ensures that happens.

---

## HTTP Retry and Exponential Back-Off

Transient network failures (momentary disconnections, server cold-starts, load-balancer hiccups) are common in real-world deployments. The `http` client supports automatic retries with configurable back-off so your controllers stay clean:

### `retries`, `backoff`, `retryDelay`

Add these three options to any request config:

| Option | Type | Default | Description |
|---|---|---|---|
| `retries` | `number` | `0` | Maximum number of retry attempts after the first failure |
| `backoff` | `'exponential' \| 'linear'` | none (fixed) | Delay growth strategy |
| `retryDelay` | `number` (ms) | `200` | Base delay for the first retry |

```typescript
import http from '@core/http.js';

// Retry up to 3 times with exponential back-off:
// attempt 1 → 200 ms, attempt 2 → 400 ms, attempt 3 → 800 ms
const data = await http.get('/api/tasks', {
    retries: 3,
    backoff: 'exponential',
    retryDelay: 200,
});
```

```typescript
// Linear back-off: 300 ms, 600 ms, 900 ms
const projects = await http.post('/api/projects', payload, {
    retries: 2,
    backoff: 'linear',
    retryDelay: 300,
});
```

### When to use retries

| Scenario | Recommendation |
|---|---|
| Background data sync | `retries: 3, backoff: 'exponential'` |
| User-triggered action (form submit) | 1–2 retries with `linear` back-off |
| Real-time mutation (drag-and-drop) | 0 retries — fail fast, show feedback immediately |
| Auth token refresh | 0 retries — a 401 is intentional |

> **Note:** All retry semantics are opt-in per request. Retries are **not** enabled globally because some request types (delete, payment) must never be silently retried.

---

## Apply This Chapter to Project 1 — Taskflow

> **Project:** Taskflow — Personal Task Manager  
> **Feature:** Load tasks from the mock API with loading and error states.

Update `tasks.controller.ts` to call `api.getCached('/tasks', { ttl: 60_000, tags: ['tasks'] })` on mount. Show a loading skeleton while the request is in flight and an error message if it fails. Add a call to `api.post('/tasks', body)` in the create-task handler and confirm the task list updates without a page refresh.

### Done Criteria

- [ ] `api.getCached('/tasks')` populates the `tasks` state on controller mount.
- [ ] A loading indicator is visible while the API request is in flight.
- [ ] An inline error message renders if the fetch fails (simulate with a network error in DevTools).
- [ ] `api.post('/tasks', body)` creates a new task and the task list updates reactively.

---

**Back:** [Chapter 08 — Authentication](./08-authentication.md)  
**Next:** [Chapter 10 — Forms and Validation](./10-forms-and-validation.md)
