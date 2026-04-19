# Chapter 04 — The Bind API

## Why `bind()` Exists

The `render()` method from Chapter 03 works, but it has a significant flaw: it re-queries and re-writes *every* stat node every time *any* attribute changes. If `total` changes, we still re-write the `completed` and `percentage` nodes even though their state is unchanged. In a component with dozens of bindings, this waste adds up — and it makes the update logic tangled with DOM queries.

The `bind()` API decouples state from DOM. You declare, once, which DOM node each piece of state drives. After that, when state changes, only the node tied to that state is touched. The framework wires up and tears down the subscription automatically.

---

## `this.bind(state, '.selector')`

`bind()` subscribes a selector to a `State<T>` (or `ComputedState<T>`) and updates the matched element's `textContent` whenever the state changes:

```typescript
// basic bind — writes String(state.value) to textContent
this.bind(this.total, '.stats__total');

// with optional formatter — transforms the value before writing
this.bind(this.percentage, '.stats__percentage', v => `${v}%`);
```

- The selector is scoped to `this.shadowRoot` (or `this` if Shadow DOM is off).
- When `this.total.value` changes, `.stats__total` gets `textContent = String(newValue)`.
- The optional **third argument** is a formatter function — a pure function that transforms the raw state value into the string written to `textContent`. Here `v => \`${v}%\`` appends a percent sign without requiring a separate computed.
- The subscription is **automatically disposed** when the component is unmounted. You do not need to call anything in `onUnmount()`.

You must call `bind()` from `onMount()`, after the shadow root has been stamped:

```typescript
onMount(): void {
  this.percentage = computed(() => {
    const t = this.total.value;
    const c = this.completed.value;
    return t === 0 ? 0 : Math.round((c / t) * 100);
  });

  this.bind(this.total,      '.stats__total');
  this.bind(this.completed,  '.stats__completed');
  this.bind(this.percentage, '.stats__percentage', v => `${v}%`);
}

---

## `this.bindAttr(state, '.selector', 'attr-name')`

`bindAttr()` works like `bind()`, but instead of updating `textContent` it updates an HTML attribute:

```typescript
this.bindAttr(this.status, '.task-card__status', 'data-status');
```

Whenever `this.status.value` changes, the element matching `.task-card__status` gets `setAttribute('data-status', newValue)`. Combined with CSS attribute selectors (`[data-status="done"] { color: green; }`), this is a clean, zero-JS way to drive visual state.

> **Tip:** `bindAttr()` is the right tool whenever a CSS attribute selector or ARIA attribute (`aria-disabled`, `aria-expanded`, etc.) needs to reflect a piece of state.

---

## `this.bindAll({ '.selector': state })`

When you have several bindings to set up at once, `bindAll()` lets you declare them as a single object literal:

```typescript
this.bindAll({
  '.stats__total':      this.total,
  '.stats__completed':  this.completed,
});
```

Each key is a selector; each value is a state or computed. All subscriptions are auto-disposed together on unmount. `bindAll()` does not support formatter functions — use individual `bind()` calls when you need formatting.

---

## `this.on('event', '.selector', handler)`

`on()` registers an event listener via scoped event delegation. Instead of calling `addEventListener` on a specific node, `on()` attaches a single delegated listener to the shadow root (or the component element itself if Shadow DOM is off) and filters events by the provided selector:

```typescript
this.on('click', '.stats__reset', () => {
  this.total.value     = 0;
  this.completed.value = 0;
});
```

**Scoped delegation** means the selector is matched against `event.target` and its ancestors within the shadow root. This makes `on()` safe to use with dynamically rendered content — even if the matched element is added to the DOM after `on()` is called, the listener will catch its events.

Like `bind()`, the listener registered by `on()` is **automatically removed** when the component unmounts. You never call `removeEventListener` for listeners set up with `on()`.

---

## Updating `<task-stats>`: Before and After

### Before — Manual `render()`

```typescript
// ❌ Queries and writes all nodes on every attribute change
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
```

Every call to `render()` runs three `querySelector` calls and writes three `textContent` assignments, regardless of what changed.

### After — `bind()` API

```typescript
// ✅ Each node is updated only when its own state changes
onMount(): void {
  this.percentage = computed(() => {
    const t = this.total.value;
    const c = this.completed.value;
    return t === 0 ? 0 : Math.round((c / t) * 100);
  });

  this.bind(this.total,      '.stats__total');
  this.bind(this.completed,  '.stats__completed');
  this.bind(this.percentage, '.stats__percentage', v => `${v}%`);

  this.on('click', '.stats__reset', () => {
    this.total.value     = 0;
    this.completed.value = 0;
  });
}
```

If `completed.value` changes, only `.stats__completed` and `.stats__percentage` are updated (because `percentage` depends on `completed`). `.stats__total` is not touched.

`attributeChangedCallback` is now simpler too — it just writes to state and lets the bindings do the rest:

```typescript
attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
  const n = Number(value ?? 0);
  if (name === 'total')     this.total.value     = isNaN(n) ? 0 : n;
  if (name === 'completed') this.completed.value = isNaN(n) ? 0 : n;
  // No render() call needed. Bindings fire automatically.
}
```

---

## The Complete Refactored `<task-stats>`

```typescript
// src/components/ui/task-stats.ts
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

  template(): string {
    return `
      <div class="stats">
        <div class="stats__item">
          <span class="stats__label">Total</span>
          <span class="stats__value stats__total">0</span>
        </div>
        <div class="stats__item">
          <span class="stats__label">Done</span>
          <span class="stats__value stats__completed">0</span>
        </div>
        <div class="stats__item">
          <span class="stats__label">Progress</span>
          <span class="stats__value stats__percentage">0%</span>
        </div>
        <button class="stats__reset">Reset</button>
      </div>
      <style>
        :host { display: block; }
        .stats {
          display: flex; align-items: center; gap: 1.5rem;
          padding: 1rem; background: #f8fafc; border-radius: 8px;
        }
        .stats__item { display: flex; flex-direction: column; align-items: center; }
        .stats__label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; }
        .stats__value { font-size: 1.5rem; font-weight: 700; color: #1e293b; }
        .stats__reset {
          margin-left: auto; padding: 0.25rem 0.75rem;
          border: 1px solid #e2e8f0; border-radius: 6px;
          background: #fff; cursor: pointer; font-size: 0.875rem;
        }
        .stats__reset:hover { background: #f1f5f9; }
      </style>
    `;
  }

  onMount(): void {
    this.percentage = computed(() => {
      const t = this.total.value;
      const c = this.completed.value;
      return t === 0 ? 0 : Math.round((c / t) * 100);
    });

    this.bind(this.total,      '.stats__total');
    this.bind(this.completed,  '.stats__completed');
    this.bind(this.percentage, '.stats__percentage', v => `${v}%`);

    this.on('click', '.stats__reset', () => {
      this.total.value     = 0;
      this.completed.value = 0;
    });
  }

  onUnmount(): void {
    this.percentage.dispose();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    const n = Number(value ?? 0);
    if (name === 'total')     this.total.value     = isNaN(n) ? 0 : n;
    if (name === 'completed') this.completed.value = isNaN(n) ? 0 : n;
  }
}

defineComponent('task-stats', TaskStats);
```

---

## `key=` Attribute — Keyed List Reconciliation

When a component renders a **list** whose items can be reordered, inserted, or removed by position, the default positional diffing algorithm replaces list items in place. This is fine for append-only lists but creates unnecessary DOM churn — and can lose scroll position or component state — when items are shuffled.

Add a `key=` attribute to each repeated element and NativeCoreJS switches to a **key-map algorithm** (the same approach used by React, Vue, and Svelte): it finds the existing DOM node by key, patches it in place, and moves it to the correct position rather than replacing it.

### Rules

- `key=` must be **unique** within the parent element.
- The keying algorithm is activated only when **every** element child of a container carries a `key=` attribute. A mixture of keyed and unkeyed children falls back to positional reconciliation.
- Use a stable, unique identifier — typically a record `id` from the API. Do not use the array index as the key unless the list never reorders.

### Example

```typescript
template(): string {
    const itemsHtml = this.tasks.value.map(task => `
        <li key="${task.id}" class="task-item ${task.status}">
            <span class="task-title">${escapeHTML(task.title)}</span>
            <span class="task-status">${escapeHTML(task.status)}</span>
        </li>
    `).join('');
    return html`
        <ul class="task-list">
            ${raw(itemsHtml)}
        </ul>
    `;
}
```

With `key="${task.id}"`, when `tasks.value` is updated:

| Operation | Without `key=` | With `key=` |
|---|---|---|
| Append item | Patch last position, add new node | Add new node at tail |
| Prepend item | Replace every node (positional shift) | Move existing nodes, insert new at head |
| Remove middle item | Replace all nodes from that position | Remove exactly that node, rest unchanged |
| Reorder (drag-and-drop) | Replace every node | Move DOM nodes to new positions |

> **Tip:** `key=` also preserves focus and form state inside list items across re-renders. Without it, an `<input>` inside a repositioned list item would lose its current value.

---

## Auto-Cleanup Summary

| API                  | What it registers         | When it is cleaned up        |
|----------------------|---------------------------|------------------------------|
| `bind()`             | State subscription        | On component unmount         |
| `bindAttr()`         | State subscription        | On component unmount         |
| `bindAll()`          | Multiple subscriptions    | On component unmount         |
| `on()`               | Delegated event listener  | On component unmount         |
| `computed()`         | Upstream state listener   | Must call `.dispose()` manually |
| `watch()` on `State` | Imperative callback       | Must call returned disposer manually |

The rule is simple: if you call it on `this` (bind/on), the framework disposes it. If you hold the reference yourself (computed, watch), you dispose it.

---

**Back:** [Chapter 03 — Reactive State](./03-reactive-state.md)  
**Next:** [Chapter 05 — Views and Routing](./05-views-and-routing.md)
