# Chapter 12 — Advanced Patterns

> **What you'll build in this chapter:** Extract Taskflow's state into a global `taskStore`, build a `<project-filter>` component with custom events, and wire cross-view reactivity so the dashboard badge updates whenever the task list changes.

The patterns covered so far — per-controller state, direct DOM bindings, and `api.service` calls — scale surprisingly far. But once the Taskflow app grows to multiple inter-dependent views you will want something more: state that lives outside any single controller, components that talk to each other, and computed values that derive from several sources at once. This chapter addresses all three, and finishes with a working `<project-filter>` component that drives the tasks list.

---

## Global Stores

A global store is just a plain TypeScript module that exports `useState` instances. Any controller or component that imports the module gets a reference to the **same** state object.

```javascript
// src/stores/taskflow.store.js
import { useState } from '@core/state.js';

// ActiveProject shape: { id, name }

export const activeProject = useState(null);
export const sidebarOpen   = useState(true);
```

Import and use anywhere:

```javascript
// In dashboardController
import { activeProject } from '../stores/taskflow.store.js';

activeProject.value = { id: 3, name: 'Acme Launch' };
```

```javascript
// In a sidebar Component
import { sidebarOpen } from '../stores/taskflow.store.js';

bind(sidebarOpen, '.sidebar-label'); // updates when sidebarOpen changes
```

> **Tip:** Keep stores small and purpose-driven. A single fat store becomes a maintenance burden. Prefer several narrow stores (one for the active project, one for UI chrome, one for the current user's preferences) over one monolithic object.

---

## Cross-Component Communication with Custom Events

When two components do not share a parent–child relationship, the cleanest channel is a `CustomEvent` dispatched on the element with `composed: true` so it crosses Shadow DOM boundaries and bubbles up to `document`.

### Dispatching (inside a Component)

```javascript
// Inside ProjectFilterComponent
emitFilterChange(projectId) {
  this.dispatchEvent(new CustomEvent('project-filter-change', {
    bubbles:  true,
    composed: true,           // escapes the shadow root
    detail:   { projectId },
  }));
}
```

### Listening (inside a controller)

```javascript
// Inside tasksController
const filterHandler = (e) => {
  const { projectId } = (e).detail;
  activeProjectId.value = projectId;
};

document.addEventListener('project-filter-change', filterHandler);

// Register for cleanup
disposers.push(() =>
  document.removeEventListener('project-filter-change', filterHandler)
);
```

---

## `patchState()` — Silent State Updates

Every Component instance exposes `patchState()` for merging new values into `this.state` without triggering a full re-render. This is useful when your component drives all DOM updates through `bind()` bindings exclusively.

```javascript
// In a Component method — merges into this.state, no re-render
this.patchState({
    projectName: 'New Name',
    taskCount:   14,
    lastUpdated: new Date().toISOString(),
});
```

Because `bind()` bindings react to their own `State<T>` objects — not `this.state` — `patchState()` is best paired with a component that stores plain serializable values in `this.state` for external tooling access while driving the UI through separate `useState()` instances and `bind()`.

---

## `computed()` Across Multiple Sources

`computed()` auto-tracks every `useState` read inside its callback and re-evaluates lazily whenever any of them changes.

```javascript
import { useState, computed } from '@core/state.js';

const tasks       = useState([]);
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

```javascript
return () => {
  filteredTasks.dispose();
  dispose(); // trackEvents cleanup
};
```

---

## Debouncing and Throttling Effects

### Debounce

An `effect` that fires on every keystroke can flood the network with search requests. Debounce it by using the `debounce` helper from `@utils/helpers.js`:

```javascript
import { debounce } from '@utils/helpers.js';
import { effect } from '@core/state.js';

const debouncedSearch = debounce(async (term) => {
    const { data } = await api.get(`/tasks?q=${encodeURIComponent(term)}`);
    tasks.value = data ?? [];
}, 300);

const stopEffect = effect(() => {
    debouncedSearch(searchQuery.value); // called on every change, fires network after 300ms quiet
});

disposers.push(stopEffect);
```

`effect()` has a built-in loop guard: default max **1000** runs per notification flush. You can override it per effect when needed:

```javascript
const stopEffect = effect(() => {
  debouncedSearch(searchQuery.value);
}, { maxRunsPerFlush: 1500 });
```

Use `maxRunsPerFlush: 0` only when you deliberately want to disable the guard for a specific effect.

If you prefer not to import the helper, you can manage the timer manually:

```javascript
const value = null;

const stopEffect = effect(() => {
  const term = searchQuery.value;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const { data } = await api.get(`/tasks?q=${encodeURIComponent(term)}`);
    tasks.value = data ?? [];
  }, 300);
});

disposers.push(() => {
  stopEffect();
  if (debounceTimer) clearTimeout(debounceTimer);
});
```

### Throttle

`throttle` is the complement to `debounce`: instead of waiting for silence, it lets a function run at most once per interval. Use it for high-frequency events like `scroll` or `mousemove` that should trigger periodic updates but not on every tick:

```javascript
import { throttle } from '@utils/helpers.js';

const updateScrollIndicator = throttle((scrollY) => {
    const indicator = scope.$('[data-hook="scroll-indicator"]');
    if (indicator) indicator.style.width = `${Math.min(100, scrollY / 10)}%`;
}, 100); // at most once every 100ms

const handleScroll = () => updateScrollIndicator(window.scrollY);
window.addEventListener('scroll', handleScroll);
disposers.push(() => window.removeEventListener('scroll', handleScroll));
```

> **When to use which:** Debounce when you only care about the *final* value after the user stops acting (search, autocomplete, resize). Throttle when you want *regular* updates during a continuous action but not every frame (scroll position, drag, live chart updates).

---

## Building `<project-filter>` and `tasksController`

### The Component

```bash
npm run make:component project-filter
```

```javascript
// src/components/ui/project-filter.js
import { Component }        from '@core/component.js';
import { defineComponent }  from '@core/define.js';
import { useState }         from '@core/state.js';
import { api }              from '@services/api.service.js';

class ProjectFilterComponent extends Component {
  static useShadowDOM = true;

  private projects = useState([]);
  private selected = useState('all');

  template() {
    return /* html */`
      <label class="filter-label">Filter by project</label>
      <nc-select id="project-select" value="all"></nc-select>
    `;
  }

  async onMount() {
    const { data } = await api.getCached('/projects', { tags: ['projects'] });

    if (data) {
      this.projects.value = data;
      const select = this.shadowRoot.querySelector('#project-select');
      select.options = [
        { label: 'All projects', value: 'all' },
        ...data.map((p) => ({ label: p.name, value: String(p.id) })),
      ];
    }

    this.on('change', '#project-select', (e) => {
      const val = (e.target).value;
      this.selected.value = val;
      this.emitFilterChange(val === 'all' ? null : val);
    });
  }

  onUnmount() {
    this.projects.value = [];
  }

  emitFilterChange(projectId) {
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

```javascript
import { dom }         from '@core-utils/dom.js';
import { api }         from '@services/api.service.js';
import { useState, computed, effect } from '@core/state.js';
import { trackEvents } from '@core-utils/events.js';

export async function tasksController() => void> {
  const scope     = dom.view('tasks');
  const { on, dispose } = trackEvents();
  const disposers = [];

  const allTasks        = useState([]);
  const activeProjectId = useState(null);
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
  const filterHandler = (e) => {
    activeProjectId.value = (e).detail.projectId;
  };
  document.addEventListener('project-filter-change', filterHandler);
  disposers.push(() =>
    document.removeEventListener('project-filter-change', filterHandler)
  );

  // Debounced search
  const value = null;
  on('input', '#task-search', (e) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      filterText.value = (e.target).value;
    }, 300);
  });
  disposers.push(() => { if (debounceTimer) clearTimeout(debounceTimer); });

  // Initial fetch
  const { data } = await api.getCached('/tasks', { tags: ['tasks'] });
  allTasks.value = data ?? [];

  function renderTasks(tasks) {
    const table = scope.$('#tasks-table');
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

## Done Criteria

- [ ] `src/stores/task.store.js` exports `tasks`, `loadingTasks`, and derived computeds (`taskCount`, `doneTasks`).
- [ ] The dashboard badge reacts to `taskStore.tasks.value` changes made by the tasks controller.
- [ ] `<project-filter>` emits `project-filter-change` with `{ projectId }` in the event detail.
- [ ] `batch()` wraps the store's API response handler to coalesce `tasks` and `loading` updates.

---

**Back:** [Chapter 11 — Core Components](./11-core-components.md)  
**Next:** [Chapter 13 — Production](./13-production.md)