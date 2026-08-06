# Chapter 04 — Reactive State

Instance state on controllers/components, and shared module state.

## Two layers

| Scope | Prefer | Import |
|-------|--------|--------|
| One page or one component | `this.state` / `this.signal` / `this.compute` / `this.effect` | Built into CoreController / CoreComponent |
| Shared across routes | `useState` / `computed` / `effect` / `batch` | `@core/state.js` |

There is **no** module-level `createStore` / `useSignal` / `getStore` API in the
vendored scaffold `state.ts`. Shared state is plain modules exporting `useState` fields
(see Chapter 10).

## Instance state (Deskflow pages)

```js
onMount() {
    this.count = this.state(0);
    this.label = this.compute(() => `${this.count.value} open`);

    this.bind(this.label, this.countEl);

    this.on(this.incBtn, 'click', () => {
        this.count.value++;
    });
}
```

Instance `this.compute` / `this.effect` are disposed when the controller
`destroy()`s or the component disconnects. You do **not** call `.dispose()` on
`this.compute()` results.

## Module state (`@core/state.js`)

```js
import { useState, computed, effect, batch } from '@core/state.js';

export const openCount = useState(0);
export const openLabel = computed(() => `${openCount.value} open`);

effect(() => {
    document.title = openLabel.value;
});

batch(() => {
    openCount.value++;
});

// If you created module-level computed() yourself and need to tear it down:
// openLabel.dispose();
```

## Apply to Deskflow

> **Feature:** Tasks header shows a live open-count.

In `tasks.controller.js`:

1. Keep a `this.tasks = this.state([])` (or start with a hard-coded demo array).
2. `this.openCount = this.compute(() => this.tasks.value.filter(t => !t.done).length)`.
3. Bind that number into a `ref="countEl"` span in `tasks.html`.

## Verify

- [ ] Changing state updates only the bound nodes you expect
- [ ] Leaving the route does not leave stray `effect` work behind for instance effects

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Calling `this.doubled.dispose()` | Instance compute cleans up automatically |
| Expecting `useSignal` from `@core/state.js` | Use `useState` or instance `this.signal` |
| Putting all UI state in a global store | Prefer instance state until multiple routes need it |

## Next

[Chapter 05 — First component](./05-first-component.md)
