# Chapter 05 — The Bind API

> **What you'll build in this chapter:** Refactor `<task-stats>` to replace its manual `render()` call with `bind()`, and update `<task-card>` to use `bindAttr()` so the CSS status badge is driven purely by reactive state.

The `render()` approach from Chapter 04 works, but it has one limitation: it re-evaluates `template()` and re-writes *every* node every time *any* state changes. If `total` changes, the `completed` and `percentage` nodes are still rewritten even though their values didn't change. In a simple component like `<task-stats>` this is negligible — but it also means update logic stays tangled with DOM queries, and calling `this.render()` manually in `attributeChangedCallback` is something you have to remember every time.

The `bind()` API solves this cleanly. You declare once which DOM node each piece of state drives. After that, when a state changes only the node tied to *that* state is touched — nothing else. The framework wires up and tears down the subscription automatically.

---

## `this.bind(state, selector)`

`bind()` subscribes a selector (or element reference) to a `State<T>` (or `ComputedState<T>`) and updates the matched element's `textContent` whenever the state changes:

```typescript
// selector string — scoped to this component's shadow root
this.bind(this.total, '.stats__total');

// element reference — when you already have the element from this.component.hook()
const titleEl = this.component.hook('title');
this.bind(this.titleState, titleEl);

// optional third argument — a DOM property name (default is 'textContent')
this.bind(this.isVisible, '.panel', 'hidden');
this.bind(this.inputValue, 'input.search', 'value');
```

- When a selector string is passed, it is scoped to `this.shadowRoot` (or `this` if Shadow DOM is off).
- When an `Element` reference is passed, it is used directly — useful when you already have the element from `this.component.hook()` and want to avoid a second DOM lookup.
- The optional **third argument** is a DOM property name. It defaults to `'textContent'`. Pass `'value'` to drive an input, `'hidden'` to drive visibility, etc.
- The subscription is **automatically disposed** when the component is unmounted. You do not need to call anything in `onUnmount()` for `bind()` subscriptions.

When you need to **format** a value before writing it — for example, appending a `%` sign — create a `computed()` that produces the display string and bind that instead:

```typescript
const pctDisplay = computed(() => `${this.percentage.value}%`);
this.bind(pctDisplay, '.stats__percentage');
```

You must call `bind()` from `onMount()`, after the shadow root has been stamped.

---

## `this.bindAttr(state, selector, 'attr-name')`

`bindAttr()` works like `bind()`, but instead of updating a DOM property it calls `setAttribute()` on the target element. It accepts either a selector string or an element reference:

```typescript
// selector string
this.bindAttr(this.statusState, '.task-card__status', 'data-status');

// element reference
const statusEl = this.component.hook('status');
this.bindAttr(this.statusState, statusEl, 'data-status');
```

Whenever `this.statusState.value` changes, the target element gets `setAttribute('data-status', newValue)`. Combined with CSS attribute selectors (`[data-status="done"] { color: green; }`), this is a clean way to drive visual state.

> **Tip:** `bindAttr()` is best suited for attributes that map 1-to-1 with a state value — like `data-status`, `aria-disabled`, or `aria-expanded`. When changing an attribute also requires changing `textContent` (like a status label), it is cleaner to handle both in `attributeChangedCallback` together, as `<task-card>` does.

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

Each key is a **selector string**; each value is a state or computed. All subscriptions are auto-disposed together on unmount. `bindAll()` only accepts selector strings — use individual `bind()` calls when you need element references or formatter functions.

---

## `this.model(state, selector)` — two-way binding

`model()` wires a **writable** `State<T>` to a form element in both directions at once:

- **State → DOM** (read): a reactive `effect()` updates the element's property whenever the state changes.
- **DOM → State** (write): an event listener writes the element's current value back to the state on every user interaction.

Both directions are **auto-disposed** on component unmount — no cleanup needed in `onUnmount()`.

```typescript
// Text input — listens for 'input', reads/writes .value
this.model(this.username, 'input[name="username"]');

// Checkbox — auto-detected; listens for 'change', reads/writes .checked
this.model(this.agreed, 'input[type="checkbox"]');

// Element reference instead of a selector string
const emailEl = this.component.hook('email');
this.model(this.email, emailEl);

// Custom event/prop for nc-* or third-party components
this.model(this.rating, 'nc-rating', { event: 'nc-change', prop: 'value' });
```

NativeCoreJS auto-detects checkboxes and radios: when the target element is an `<input type="checkbox">` or `<input type="radio">`, `model()` defaults to the `change` event and the `checked` property. For every other element it defaults to the `input` event and the `value` property.

You can override both defaults via the `options` argument:

| Option  | Type     | Default (non-checkbox) | Default (checkbox / radio) |
|---------|----------|------------------------|----------------------------|
| `event` | `string` | `'input'`              | `'change'`                 |
| `prop`  | `string` | `'value'`              | `'checked'`                |

`model()` only accepts a **writable** `State<T>` (created with `useState()`). Passing a `computed()` value produces a runtime warning because computed values are read-only.

---

## `this.wireInputs()` — Livewire-style auto-wiring

`wireInputs()` is a declarative shorthand built on top of `model()`. Instead of calling `model()` once per field, you annotate your template elements with an `wire-input` attribute and call `this.wireInputs()` once from `onMount()`. The method scans the component tree for every `[wire-input]` element and automatically calls `model()` for each one, resolving the attribute value as a property name on `this`.

### Usage

```typescript
class SignupForm extends Component {
    static useShadowDOM = true;

    // State properties — names must match the wire-input attribute values
    username = useState('');
    email    = useState('');
    agreed   = useState(false);

    template() {
        return `
            <input name="username" wire-input="username" placeholder="Username" />
            <input name="email"    wire-input="email"    placeholder="Email" />
            <input type="checkbox" wire-input="agreed" />
            <label>I agree to the terms</label>
            <p>Preview: <strong id="preview"></strong></p>
        `;
    }

    onMount() {
        this.wireInputs();                          // one call wires all three fields
        this.bind(this.username, '#preview');       // read-only preview still works
    }
}

defineComponent('signup-form', SignupForm);
```

```html
<signup-form></signup-form>
```

That is the complete component. As the user types in the username field, `this.username.value` updates automatically. The `#preview` paragraph updates via `bind()` because it reads the same state.

### How it works

1. `wireInputs()` queries the shadow root (or component element) for `[wire-input]`.
2. For each element it reads `el.getAttribute('wire-input')` to get the state property name.
3. It looks up `this[propName]` and verifies it is a writable `State` (has both `.watch()` and `.set()`).
4. It delegates to `model(this[propName], el)`, which sets up the effect and the event listener.

The reconciler **reuses** existing DOM nodes across re-renders, so the wired listeners remain attached as long as the component is mounted. Call `wireInputs()` **once** from `onMount()` — not from `attributeChangedCallback` or `render()`.

### Rules

- The `wire-input` value must exactly match a `useState()` property name on the component class.
- Computed values cannot be wired — `wireInputs()` skips them with a warning.
- Call `wireInputs()` from `onMount()` only.
- Use `model()` directly (with `options`) for components that fire non-standard events (e.g., `nc-rating`, `nc-color-picker`).

---

## `wireInputs()` in Controllers

Controllers are plain functions — they don't have `this.wireInputs()`. Use the standalone `wireInputs` utility from `@core-utils/wireInputs.js` instead.

It works the same way as the component version: **no arguments, no cleanup needed**. It scans the active `[data-view]`, creates a `useState()` for every `[wire-input]` element it finds, wires both directions, and auto-registers cleanup with the page cleanup registry so the router disposes everything on navigation:

```typescript
import { wireContents, wireInputs, wireAttributes } from '@core-utils/wires.js';

export async function tasksController() {
    const { title, priority, done } = wireInputs();
    // That's it — no cleanup needed
}
```

```html
<!-- src/views/public/tasks.html -->
<div data-view="tasks">
    <input wire-input="title"    placeholder="Task title" />
    <input wire-input="priority" />
    <input wire-input="done" type="checkbox" />
</div>
```

The states are live and two-way bound immediately. Use them anywhere in the controller:

```typescript
export async function tasksController() {
    const { title, done } = wireInputs();

    const events = trackEvents();

    events.onClick('submit-btn', async () => {
        await api.post('/tasks', { title: title.value, done: done.value });
        title.value = '';   // clears the input automatically
    });
}
```

Initial values are inferred from the element type — no need to declare defaults in the controller:
- `checkbox` / `radio` → `boolean` (`el.checked`)
- `number` input → `number` (`el.value || 0`)
- everything else → `string` (`el.value || ''`)

Optional config for non-standard elements or an explicit root:

```typescript
// Custom event/prop for a third-party component
const { rating } = wireInputs({
    overrides: { rating: { event: 'nc-change', prop: 'value' } }
});

// Explicit root (defaults to the active [data-view])
const { title } = wireInputs({
    root: document.querySelector('[data-view="tasks"]')
});
```

---

## `wireContents()` — declarative text binding

`wireContents()` is the display counterpart to `wireInputs()`. It scans the active `[data-view]` for every `[wire-content="key"]` element, creates a `useState<string>()` seeded from the element's current `textContent`, and wires an `effect()` that writes `state.value` back to `el.textContent` whenever it changes.

Use it for **display-only elements**: headings, paragraphs, spans, badges, labels — anything the user reads but doesn't type into.

### In a controller

```typescript


export async function tasksController() {
    const { title, count } = wireContents();

    title.value = 'My Tasks';   // → <h1 wire-content="title"> updates instantly
    count.value = String(42);   // → <span wire-content="count"> updates instantly
}
```

```html
<h1  wire-content="title">Loading...</h1>
<span wire-content="count">0</span>
```

Cleanup is auto-registered — no return value needed.

### In a component

```typescript
class TaskHeader extends Component {
    static useShadowDOM = true;

    title = useState('Tasks');
    count = computed(() => `${this.items.value.length} tasks`);

    template() {
        return `
            <h1 wire-content="title">Tasks</h1>
            <span wire-content="count">0 tasks</span>
        `;
    }

    onMount() {
        this.wireContents();   // wires all [wire-content] to same-named class properties
    }
}
```

`this.wireContents()` looks up `this["title"]` and `this["count"]` — same reflection pattern as `this.wireInputs()`.

---

## `wireAttributes()` — declarative attribute binding

`wireAttributes()` scans for `[wire-attribute="key:attribute-name"]` elements and wires `state.value` → `el.setAttribute(attr, value)` via an `effect()`. Use it to drive CSS state attributes, ARIA attributes, `src`, `href`, `disabled`, or any other HTML attribute reactively.

The format is always `wire-attribute="stateKey:html-attribute-name"`.

### In a controller

```typescript


export async function tasksController() {
    const { status, busy } = wireAttributes();

    status.value = 'active';  // → setAttribute('data-status', 'active')
    busy.value   = 'true';    // → setAttribute('aria-busy', 'true')
}
```

```html
<div    wire-attribute="status:data-status">...</div>
<button wire-attribute="busy:aria-busy">Save</button>
```

Paired with CSS:
```css
[data-status="active"] { border-color: green; }
[data-status="error"]  { border-color: red;   }
```

### In a component

```typescript
class TaskCard extends Component {
    static useShadowDOM = true;

    status = useState('pending');

    template() {
        return `<article wire-attribute="status:data-status">...</article>`;
    }

    onMount() {
        this.wireAttributes();  // wires all [wire-attribute] to same-named class properties
    }
}
```

### Combining all three

```html
<div data-view="tasks">
    <h1     wire-content="title">Tasks</h1>
    <span   wire-content="count">0</span>
    <div    wire-attribute="filter:data-filter">...</div>
    <input  wire-input="search" placeholder="Search..." />
</div>
```

```typescript
const { title, count  } = wireContents();    // text display
const { filter        } = wireAttributes();  // HTML attribute
const { search        } = wireInputs();      // two-way input

title.value  = 'My Tasks';
count.value  = '42';
filter.value = 'active';
// search.value reflects whatever the user has typed, two-way
```

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

### Before — Chapter 04 state

At the end of Chapter 04, `<task-stats>` calls `this.render()` in both `onMount()` and `attributeChangedCallback`. Every time any attribute changes, `template()` re-runs and the DOM patcher rewrites all three stat nodes:

```typescript
onMount() {
    this.total.value     = Number(this.getAttribute('total') ?? 0);
    this.completed.value = Number(this.getAttribute('completed') ?? 0);

    this.percentage = computed(() => {
        if (this.total.value === 0) return 0;
        return Math.round((this.completed.value / this.total.value) * 100);
    });

    this.render(); // renders all three nodes
}

attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this._mounted) return;
    const n = Number(newValue ?? 0);
    if (name === 'total')     this.total.value     = isNaN(n) ? 0 : n;
    if (name === 'completed') this.completed.value = isNaN(n) ? 0 : n;
    this.render(); // re-renders all three nodes every time
}
```

Every `render()` call re-evaluates `template()` and runs the DOM patcher across all nodes — even those whose state didn't change.

### After — `bind()` API

```typescript
// ✅ Each node is updated only when its own state changes
onMount() {
    this.total.value     = Number(this.getAttribute('total') ?? 0);
    this.completed.value = Number(this.getAttribute('completed') ?? 0);

    this.percentage = computed(() => {
        if (this.total.value === 0) return 0;
        return Math.round((this.completed.value / this.total.value) * 100);
    });

    // A display computed that formats the number with a % sign.
    const pctDisplay = computed(() => `${this.percentage.value}%`);

    this.bind(this.total,     '.stats__total');
    this.bind(this.completed, '.stats__completed');
    this.bind(pctDisplay,     '.stats__percentage');
}

attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue || !this._mounted) return;
    const n = Number(newValue ?? 0);
    if (name === 'total')     this.total.value     = isNaN(n) ? 0 : n;
    if (name === 'completed') this.completed.value = isNaN(n) ? 0 : n;
    // No render() call needed — bindings fire automatically.
}
```

If `completed.value` changes, only `.stats__completed` and `.stats__percentage` are updated (because `pctDisplay` depends on `percentage` which depends on `completed`). `.stats__total` is not touched.

---

## The Complete Refactored `<task-stats>`

```typescript
import { Component, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';
import { useState, computed } from '@core/state.js';
import type { State, ComputedState } from '@core/state.js';
import '@components/core/nc-button.js';

export class TaskStats extends Component {
    static useShadowDOM = true;
    static observedAttributes = ['total', 'completed'];

    total: State<number> = useState(0);
    completed: State<number> = useState(0);
    percentage: ComputedState<number>;

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
        </div>
        `;
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
        if (oldValue === newValue || !this._mounted) return;
        const n = Number(newValue ?? 0);
        if (name === 'total')     this.total.value     = isNaN(n) ? 0 : n;
        if (name === 'completed') this.completed.value = isNaN(n) ? 0 : n;
        // No render() call — bindings update automatically.
    }

    onMount() {
        this.total.value     = Number(this.getAttribute('total') ?? 0);
        this.completed.value = Number(this.getAttribute('completed') ?? 0);

        this.percentage = computed(() => {
            if (this.total.value === 0) return 0;
            return Math.round((this.completed.value / this.total.value) * 100);
        });

        const pctDisplay = computed(() => `${this.percentage.value}%`);

        this.bind(this.total,     '.stats__total');
        this.bind(this.completed, '.stats__completed');
        this.bind(pctDisplay,     '.stats__percentage');
    }

    onUnmount() {
        this.percentage?.dispose();
    }
}

defineComponent('task-stats', TaskStats);
```

Notice the template now has static `0` / `0%` placeholders — `bind()` overwrites them immediately in `onMount()`. The `template()` method itself is no longer responsible for reading state values; it only defines the structure.

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

| API                  | What it registers              | When it is cleaned up           |
|----------------------|--------------------------------|---------------------------------|
| `bind()`             | State subscription             | On component unmount            |
| `bindAttr()`         | State subscription             | On component unmount            |
| `bindAll()`          | Multiple subscriptions         | On component unmount            |
| `model()`            | Effect + event listener        | On component unmount            |
| `wireInputs()`       | Effect + event listener × N    | On component unmount            |
| `on()`               | Delegated event listener       | On component unmount            |
| `computed()`         | Upstream state listener        | Must call `.dispose()` manually |
| `watch()` on `State` | Imperative callback            | Must call returned disposer manually |

The rule is simple: if you call it on `this` (bind/on), the framework disposes it. If you hold the reference yourself (computed, watch), you dispose it.

---

## Done Criteria

- [ ] `this.bind()` drives `.stats__total`, `.stats__completed`, and `.stats__percentage` in `task-stats.ts`.
- [ ] `this.render()` is removed from `attributeChangedCallback` in `task-stats.ts` — bindings fire automatically.
- [ ] The `template()` method in `task-stats.ts` has static `0` / `0%` placeholders instead of `${this.total.value}` expressions.
- [ ] Opening DevTools Elements panel shows only the changed node updating when a single attribute changes.

---

**Back:** [Chapter 04 — Reactive State](./04-reactive-state.md)  
**Next:** [Chapter 06 — Views and Routing](./06-views-and-routing.md)
