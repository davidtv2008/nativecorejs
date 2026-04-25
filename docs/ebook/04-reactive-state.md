# Chapter 04 — Reactive State
> **What you'll build in this chapter:** Build `<task-stats>` — a live counter component for Taskflow's dashboard that tracks total tasks, completed tasks, and a reactive completion percentage using `useState()`, `computed()`, and `batch()`.
## Why Reactive State?

Plain JavaScript variables are invisible to the framework. Assign a new value to `let count = 0` and nothing in the DOM knows it changed. Reactive state solves this by wrapping a value in a container that can notify subscribers when it is written to.

NativeCoreJS provides three state primitives: `useState()`, `computed()`, and `effect()`. They all live in the same module:

```javascript
import { useState, computed, effect } from '@core/state.js';
```

---

## `useState(initialValue)` — Mutable State

`useState()` creates a `State<T>` object. Read the current value with `.value`. Write a new value by assigning to `.value`:

```javascript
const count = useState(0);

console.log(count.value); // 0
count.value = 5;
console.log(count.value); // 5
```

Any reactive binding (a `bind()` call, a `computed()`, or an `effect()`) that reads `count.value` is automatically subscribed. When `count.value` is assigned, all subscribers are notified synchronously.

### The `watch()` Method

`State<T>` also has a `watch(callback)` method that fires the callback each time the value changes:

```javascript
const unwatch = count.watch((next, prev) => {
  console.log(`changed from ${prev} to ${next}`);
});

// Later, to stop watching:
unwatch();
```

`watch()` is available and useful for one-off imperative subscriptions — for example, syncing a state value to `localStorage`. However, for updating the DOM, the preferred pattern in NativeCoreJS is `bind()` (Chapter 04) because it is more declarative and the framework handles cleanup automatically.

---

## `computed(fn)` — Derived State

`computed()` creates a read-only `ComputedState<T>` whose value is derived from other state containers. The function you pass is called lazily and re-evaluated whenever any state it reads changes:

```javascript
const total     = useState(10);
const completed = useState(4);

const percentage = computed(() =>
  total.value === 0 ? 0 : Math.round((completed.value / total.value) * 100)
);

console.log(percentage.value); // 40
completed.value = 8;
console.log(percentage.value); // 80
```

`computed()` **auto-tracks dependencies** by recording which `.value` reads happen during its execution. You do not declare dependencies explicitly.

### Disposing a Computed

Unlike `useState()`, a `computed()` holds a subscription to its upstream state. When you create a `computed()` inside a **controller**, you do not need to do anything — the framework's Page Cleanup Registry automatically calls `.dispose()` on every computed when the router navigates away from the current page (see Chapter 07 for details).

When you create a `computed()` inside a **component**, dispose it in `onUnmount()` because components can live across multiple page navigations:

```javascript
percentage: ComputedState<number>;

onMount() {
    this.percentage = computed(() => /* ... */);
    this.render();
}

onUnmount() {
    this.percentage?.dispose();
}
```
```

> **Tip:** In controllers, the Page Cleanup Registry makes forgetting to dispose impossible — every `computed()` call auto-registers its disposal. In components, always pair `computed()` with a `dispose()` in `onUnmount()`, because components live independently of page navigation.

---

## Building `<task-stats>`

Let's build a component that shows a live summary: total tasks, completed tasks, and the completion percentage. Generate it:

```bash
npm run make:component task-stats
```

Open `src/components/ui/task-stats.js`.

### State and Computed Values

```javascript
import { Component, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';
import { useState, computed } from '@core/state.js';

export class TaskStats extends Component {
    static useShadowDOM = true;

    static observedAttributes = ['total', 'completed'];

    total = useState(0);
    completed = useState(0);
    percentage = null;

    onMount() {
        // Seed state from initial HTML attributes.
        this.total.value = Number(this.getAttribute('total') ?? 0);
        this.completed.value = Number(this.getAttribute('completed') ?? 0);

        // Create a computed state that derives from other states.
        this.percentage = computed(() => {
            if (this.total.value === 0) return 0;
            return Math.round((this.completed.value / this.total.value) * 100);
        });

        // Re-render now that state is seeded and computed is ready.
        this.render();
    }

    onUnmount() {
        this.percentage?.dispose();
    }
```

We declare `total` and `completed` as reactive state properties, initialized to `useState(0)`. No constructor is needed. `onMount()` seeds their values from HTML attributes and creates the `computed()` — then calls `this.render()` to update the DOM with the correct values. This ordering matters: the base class calls `render()` then `onMount()`, so the first automatic render shows zeros; the explicit `this.render()` at the end of `onMount()` corrects that once state is properly seeded.

### Template

The `template()` method reads from state directly. When `this.render()` is called it re-evaluates `template()` and patches only the changed nodes:

```javascript
  template() {
    return html`
      <style>
        :host { display: block; }
        .stats {
          display: flex; gap: 1.5rem; padding: 1rem;
          background: #f8fafc; border-radius: 8px;
        }
        .stats__item { display: flex; flex-direction: column; align-items: center; }
        .stats__label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; }
        .stats__value { font-size: 1.5rem; font-weight: 700; color: #1e293b; }
      </style>
      <div class="stats">
        <div class="stats__item">
          <span class="stats__label">Total</span>
          <span class="stats__value stats__total">${this.total.value}</span>
        </div>
        <div class="stats__item">
          <span class="stats__label">Done</span>
          <span class="stats__value stats__completed">${this.completed.value}</span>
        </div>
        <div class="stats__item">
          <span class="stats__label">Progress</span>
          <span class="stats__value stats__percentage">${this.percentage?.value ?? 0}%</span>
        </div>
      </div>
    `;
  }
```

### Attribute Changes Drive State

```javascript
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue || !this._mounted) return;

        const n = Number(newValue ?? 0);
        if (name === 'total')     this.total.value     = isNaN(n) ? 0 : n;
        if (name === 'completed') this.completed.value = isNaN(n) ? 0 : n;

        this.render();
    }
}

defineComponent('task-stats', TaskStats);
```

The `if (oldValue === newValue || !this._mounted) return;` guard prevents unnecessary work — the base class `attributeChangedCallback` fires this before the element is connected, so `!this._mounted` skips the call until `onMount()` has run. Writing to `this.total.value` or `this.completed.value` updates the state, and `this.render()` re-evaluates `template()` and patches only the changed nodes. In the next chapter we replace this call with the `bind()` API, which removes the need to call `this.render()` at all.

---

## Watching State Changes Propagate

Add the component to `tasks.html` and change the attributes in the browser console to verify reactivity:

```html
<task-stats id="stats" total="10" completed="4"></task-stats>
```

```javascript
// In the browser console:
const el = document.querySelector('#stats');
el.setAttribute('completed', '8');
// → stats update to 8 / 10 = 80%
```

The `attributeChangedCallback` fires, writes the new value into `this.completed`, which causes `this.percentage` to recompute, and then `this.render()` re-evaluates `template()` and patches the updated text nodes.

---

## `batch(fn)` — Coalesced State Updates

By default, every write to a state immediately notifies all subscribers synchronously. For simple cases this is ideal. But when you need to update several states at once — say, setting `total`, `completed`, and an `error` flag all in a single API response handler — each write would trigger a separate round of DOM updates. `batch()` defers all notifications until the function completes, so subscribers are called at most once per state, once the batch exits.

```javascript
import { batch } from '@core/state.js';

const total     = useState(0);
const completed = useState(0);
const error     = useState(null);

// Without batch: three separate re-renders
total.value     = 12;
completed.value = 5;
error.value     = null;

// With batch: a single re-render
batch(() => {
    total.value     = 12;
    completed.value = 5;
    error.value     = null;
});
```

### When to use `batch()`

- **Async handlers**: after `await fetch(...)`, update all related states in one batch so the UI does not flicker between half-applied states.
- **Store actions**: any action that writes more than one state belongs in a `batch()` — use the generated store template for a ready-made example.
- **Optimistic UI rollbacks**: when reverting a failed mutation, batch the rollback writes so the UI jumps back atomically.

```javascript
// tasks.controller.js — batch the success and failure paths
// (You'll build this controller fully in Chapter 07 — this snippet shows
// where batch() fits inside a real controller's data-loading section.)
export async function tasksController() => void> {
    const total     = useState(0);
    const completed = useState(0);
    const loading   = useState(true);
    const error     = useState(null);

    batch(() => { loading.value = true; error.value = null; });
    try {
        const data = await api.getCached('/api/tasks', { ttl: 60_000 });
        batch(() => {
            total.value     = data.length;
            completed.value = data.filter(t => t.status === 'done').length;
            loading.value   = false;
        });
    } catch (err) {
        batch(() => {
            error.value   = err instanceof Error ? err.message : 'Failed to load tasks';
            loading.value = false;
        });
    }

    return () => { /* cleanup */ };
}
```

### Nesting

`batch()` calls can be nested. Notifications are deferred until the **outermost** batch exits:

```javascript
batch(() => {
    a.value = 1;
    batch(() => {
        b.value = 2; // still inside the outer batch
    });
    // no notifications yet
}); // all notifications fire here
```

---

## Done Criteria

- [ ] `src/components/ui/task-stats.js` exists and shows total, completed, and percentage.
- [ ] Setting the `total` and `completed` attributes from the browser console updates all three stats.
- [ ] `batch()` is used whenever two or more state values are set together (e.g. in the data loader).
- [ ] `this.percentage?.dispose()` is called in `onUnmount()` to release the computed subscription.

---

**Back:** [Chapter 03 — Error Boundaries](./03-error-boundaries.md)  
**Next:** [Chapter 05 — The Bind API](./05-bind-api.md)