# Chapter 03 — Reactive State

## Why Reactive State?

Plain JavaScript variables are invisible to the framework. Assign a new value to `let count = 0` and nothing in the DOM knows it changed. Reactive state solves this by wrapping a value in a container that can notify subscribers when it is written to.

NativeCoreJS provides three state primitives: `useState()`, `computed()`, and `useSignal()`. They all live in the same module:

```typescript
import { useState, computed, useSignal } from '@core/state.js';
```

---

## `useState(initialValue)` — Mutable State

`useState()` creates a `State<T>` object. Read the current value with `.value`. Write a new value by assigning to `.value`:

```typescript
const count = useState(0);

console.log(count.value); // 0
count.value = 5;
console.log(count.value); // 5
```

Any reactive binding (a `bind()` call, a `computed()`, or an `effect()`) that reads `count.value` is automatically subscribed. When `count.value` is assigned, all subscribers are notified synchronously.

### The `watch()` Method

`State<T>` also has a `watch(callback)` method that fires the callback each time the value changes:

```typescript
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

```typescript
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

Unlike `useState()`, a `computed()` holds a subscription to its upstream state. If you create a computed inside a component, dispose it in `onUnmount()` to release that subscription:

```typescript
private pct!: ComputedState<number>;

onMount(): void {
  this.pct = computed(() => /* ... */);
}

onUnmount(): void {
  this.pct.dispose();
}
```

> **Important:** Forgetting to dispose a computed created inside a long-lived component is the most common source of memory leaks in NativeCoreJS apps. Get in the habit of always pairing `computed()` with a `dispose()` in `onUnmount()`.

---

## `useSignal(initialValue)` — Tuple API

`useSignal()` is a convenience wrapper over `useState()` that returns a two-element tuple: a getter function and a setter function. This style will feel familiar if you have used React hooks:

```typescript
const [getCount, setCount] = useSignal(0);

console.log(getCount()); // 0
setCount(1);
console.log(getCount()); // 1
```

The underlying `State<T>` object is the same; `useSignal()` is purely a style preference. Both `useState()` and `useSignal()` produce state containers that the bind API and `computed()` can subscribe to. In components, `useState()` is more common because you often need to pass the state object to `bind()`. In controllers, `useSignal()` is sometimes preferred for its conciseness.

---

## Building `<task-stats>`

Let's build a component that shows a live summary: total tasks, completed tasks, and the completion percentage. Generate it:

```bash
npm run make:component TaskStats
```

Open `src/components/task-stats/TaskStats.ts`.

### State and Computed Values

```typescript
import { Component } from '@core/component.js';
import { defineComponent } from '@core/define.js';
import { useState, computed } from '@core/state.js';
import type { ComputedState } from '@core/state.js';

export class TaskStats extends Component {
  static useShadowDOM = true;

  static observedAttributes = ['total', 'completed'];

  private total     = useState(0);
  private completed = useState(0);
  private percentage!: ComputedState<number>;

  onMount(): void {
    this.percentage = computed(() => {
      const t = this.total.value;
      const c = this.completed.value;
      return t === 0 ? 0 : Math.round((c / t) * 100);
    });
  }

  onUnmount(): void {
    this.percentage.dispose();
  }
```

We declare `total` and `completed` as `useState()` on the class. When an attribute is set on the element (`<task-stats total="10" completed="4">`), `attributeChangedCallback` writes the parsed value into the appropriate state container.

### Template

```typescript
  template(): string {
    return `
      <div class="stats">
        <div class="stats__item">
          <span class="stats__label">Total</span>
          <span class="stats__value stats__total"></span>
        </div>
        <div class="stats__item">
          <span class="stats__label">Done</span>
          <span class="stats__value stats__completed"></span>
        </div>
        <div class="stats__item">
          <span class="stats__label">Progress</span>
          <span class="stats__value stats__percentage"></span>
        </div>
      </div>
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
    `;
  }
```

### Attribute Changes Drive State

```typescript
  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    const n = Number(value ?? 0);
    if (name === 'total')     this.total.value     = isNaN(n) ? 0 : n;
    if (name === 'completed') this.completed.value = isNaN(n) ? 0 : n;
    this.render();
  }
```

### A Simple `render()` Method

For now we write a manual `render()` helper. In the next chapter we will replace this with the `bind()` API, which is more efficient and removes the need for manual renders entirely:

```typescript
  private render(): void {
    const root = this.shadowRoot;
    if (!root) return;

    const total     = root.querySelector('.stats__total');
    const completed = root.querySelector('.stats__completed');
    const pct       = root.querySelector('.stats__percentage');

    if (total)     total.textContent     = String(this.total.value);
    if (completed) completed.textContent = String(this.completed.value);
    if (pct)       pct.textContent       = `${this.percentage?.value ?? 0}%`;
  }
}

defineComponent('task-stats', TaskStats);
```

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

The `attributeChangedCallback` fires, writes the new value into `this.completed`, which causes `this.percentage` to recompute, and then `render()` updates the text nodes.

---

> **Note:** The `render()` pattern is straightforward but has a cost: it touches every stat node on every attribute change, even the ones that did not change. Chapter 04 introduces `bind()`, which eliminates this waste by patching only the DOM node tied to the state that actually changed.

---

**What's Next:** [Chapter 04 — The Bind API](./04-bind-api.md) — replace the manual `render()` method with fine-grained `bind()`, `bindAttr()`, and `bindAll()` calls that patch only the nodes that changed.
