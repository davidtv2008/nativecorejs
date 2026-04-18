# Chapter 11 — Advanced Patterns

The patterns covered so far — per-controller state, direct DOM bindings, and `api.service` calls — scale surprisingly far. But once the Taskflow app grows to multiple inter-dependent views you will want something more: state that lives outside any single controller, components that talk to each other, and computed values that derive from several sources at once. This chapter addresses all three, and finishes with a working `<project-filter>` component that drives the tasks list.

---

## Global Stores

A global store is just a plain TypeScript module that exports `useState` instances. Any controller or component that imports the module gets a reference to the **same** state object.

```typescript
// src/stores/taskflow.store.ts
import { useState } from '@core/state.js';

export interface ActiveProject {
  id:   number;
  name: string;
}

export const activeProject = useState<ActiveProject | null>(null);
export const sidebarOpen   = useState(true);
```

Import and use anywhere:

```typescript
// In dashboardController
import { activeProject } from '../stores/taskflow.store.js';

activeProject.value = { id: 3, name: 'Acme Launch' };
```

```typescript
// In a sidebar Component
import { sidebarOpen } from '../stores/taskflow.store.js';

bind(sidebarOpen, '.sidebar-label'); // updates when sidebarOpen changes
```

> **Tip:** Keep stores small and purpose-driven. A single fat store becomes a maintenance burden. Prefer several narrow stores (one for the active project, one for UI chrome, one for the current user's preferences) over one monolithic object.

---

## Cross-Component Communication with Custom Events

When two components do not share a parent–child relationship, the cleanest channel is a `CustomEvent` dispatched on the element with `composed: true` so it crosses Shadow DOM boundaries and bubbles up to `document`.

### Dispatching (inside a Component)

```typescript
// Inside ProjectFilterComponent
private emitFilterChange(projectId: string | null) {
  this.dispatchEvent(new CustomEvent('project-filter-change', {
    bubbles:  true,
    composed: true,           // escapes the shadow root
    detail:   { projectId },
  }));
}
```

### Listening (inside a controller)

```typescript
// Inside tasksController
const filterHandler = (e: Event) => {
  const { projectId } = (e as CustomEvent).detail;
  activeProjectId.value = projectId;
};

document.addEventListener('project-filter-change', filterHandler);

// Register for cleanup
disposers.push(() =>
  document.removeEventListener('project-filter-change', filterHandler)
);
```

---

## `patchState()` — Batch DOM Updates

Every Component instance exposes `patchState()` for applying multiple state changes that should be flushed as a single DOM update, avoiding intermediate renders.

```typescript
// In a Component method
this.patchState(() => {
  this.projectName.value  = 'New Name';
  this.taskCount.value    = 14;
  this.lastUpdated.value  = new Date().toISOString();
});
```

Without `patchState`, each `.value =` assignment would trigger its own synchronous DOM patch. Batching is especially important when three or more state values drive a single complex template fragment.

---

## `computed()` Across Multiple Sources

`computed()` auto-tracks every `useState` read inside its callback and re-evaluates lazily whenever any of them changes.

```typescript
import { useState, computed } from '@core/state.js';

const tasks       = useState<Task[]>([]);
const filterText  = useState('');
const showDone    = useState(false);

const filteredTasks = computed(() => {
  const term = filterText.value.toLowerCase();
  return tasks.value.filter(t => {
    const matchesText   = t.title.toLowerCase().includes(term);
    const matchesDone   = showDone.value || t.status !== 'done';
    return matchesText && matchesDone;
  });
});

// Bind the derived list to the DOM
bind(filteredTasks, '.task-count'); // automatically re-runs
```

Always call `filteredTasks.dispose()` in `onUnmount` (Components) or in the controller's cleanup function:

```typescript
return () => {
  filteredTasks.dispose();
  dispose(); // trackEvents cleanup
};
```

---

## Debouncing Effects

An `effect` that fires on every keystroke can flood the network with search requests. Debounce it by storing a timer reference in the effect body.

```typescript
import { effect } from '@core/state.js';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const stopEffect = effect(() => {
  const term = searchQuery.value; // tracked dep

  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(async () => {
    const { data } = await api.get(`/tasks?q=${encodeURIComponent(term)}`);
    tasks.value = data ?? [];
  }, 300);
});

// In cleanup:
disposers.push(() => {
  stopEffect();
  if (debounceTimer) clearTimeout(debounceTimer);
});
```

---

## Building `<project-filter>` and `tasksController`

### The Component

```bash
npm run make:component ProjectFilter
```

```typescript
// src/components/project-filter/project-filter.component.ts
import { Component }        from '@core/component.js';
import { defineComponent }  from '@core/define.js';
import { useState }         from '@core/state.js';
import { api }              from '@services/api.service.js';

class ProjectFilterComponent extends Component {
  static useShadowDOM = true;

  private projects = useState<{ id: number; name: string }[]>([]);
  private selected = useState<string>('all');

  template() {
    return /* html */`
      <label class="filter-label">Filter by project</label>
      <nc-select id="project-select" value="all"></nc-select>
    `;
  }

  async onMount() {
    const { data } = await api.getCached('/projects', { tags: ['projects'] });

    if (data) {
      this.projects.value = data as any[];
      const select = this.shadowRoot!.querySelector('#project-select') as any;
      select.options = [
        { label: 'All projects', value: 'all' },
        ...(data as any[]).map(p => ({ label: p.name, value: String(p.id) })),
      ];
    }

    this.on('change', '#project-select', (e: Event) => {
      const val = (e.target as any).value;
      this.selected.value = val;
      this.emitFilterChange(val === 'all' ? null : val);
    });
  }

  onUnmount() {
    this.projects.value = [];
  }

  private emitFilterChange(projectId: string | null) {
    this.dispatchEvent(new CustomEvent('project-filter-change', {
      bubbles:  true,
      composed: true,
      detail:   { projectId },
    }));
  }
}

defineComponent('project-filter', ProjectFilterComponent);
```

### `tasksController.ts` — listening for the filter

```typescript
import { dom }         from '@core-utils/dom.js';
import { api }         from '@services/api.service.js';
import { useState, computed, effect } from '@core/state.js';
import { trackEvents } from '@core-utils/events.js';

export async function tasksController(): Promise<() => void> {
  const scope     = dom.data('tasks');
  const { on, dispose } = trackEvents();
  const disposers: Array<() => void> = [];

  const allTasks        = useState<any[]>([]);
  const activeProjectId = useState<string | null>(null);
  const filterText      = useState('');

  // Derived list — re-computes whenever any dep changes
  const visibleTasks = computed(() => {
    const pid  = activeProjectId.value;
    const term = filterText.value.toLowerCase();
    return allTasks.value.filter(t => {
      const matchProject = !pid || String(t.projectId) === pid;
      const matchText    = !term || t.title.toLowerCase().includes(term);
      return matchProject && matchText;
    });
  });
  disposers.push(() => visibleTasks.dispose());

  // Re-render whenever the filtered list changes
  const stopEffect = effect(() => renderTasks(visibleTasks.value));
  disposers.push(stopEffect);

  // Listen for filter events from the <project-filter> component
  const filterHandler = (e: Event) => {
    activeProjectId.value = (e as CustomEvent).detail.projectId;
  };
  document.addEventListener('project-filter-change', filterHandler);
  disposers.push(() =>
    document.removeEventListener('project-filter-change', filterHandler)
  );

  // Debounced search
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  on('input', '#task-search', (e: Event) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      filterText.value = (e.target as HTMLInputElement).value;
    }, 300);
  });
  disposers.push(() => { if (debounceTimer) clearTimeout(debounceTimer); });

  // Initial fetch
  const { data } = await api.getCached('/tasks', { tags: ['tasks'] });
  allTasks.value = data ?? [];

  function renderTasks(tasks: any[]) {
    const table = scope.$('#tasks-table') as any;
    table.rows = tasks;
  }

  return () => {
    disposers.forEach(fn => fn());
    dispose();
  };
}
```

> **Tip:** Notice that `tasksController` never calls `renderTasks` directly after the initial fetch — it sets `allTasks.value` and lets the `effect` do the rendering. This single data-flow direction makes the controller much easier to reason about and test.

---

## What's Next

Chapter 12 takes the Taskflow app to production: the build pipeline, environment variables, static deployment to Netlify or Vercel, PWA/service worker basics, and performance tips like lazy controllers and component preloading.
