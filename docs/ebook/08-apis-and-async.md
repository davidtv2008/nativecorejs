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
import { escapeHTML } from '@core-utils/sanitize.js';

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

## What's Next

Chapter 9 covers forms in depth: reading values from `nc-*` input components, client-side validation, surfacing per-field errors, and using `<nc-modal>` for confirmation dialogs — all demonstrated with the Taskflow "create task" form.
