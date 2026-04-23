# Chapter 02 — First Component

> **What you'll build in this chapter:** Generate `<task-card>` with the component generator, then evolve the scaffold into a real status-aware card that Taskflow uses to display each task — complete with `bind()` wiring, a status badge, and a named `actions` slot.

## The Component Base Class

Every NativeCoreJS component is a native Web Component — a class that extends `HTMLElement` and is registered with `customElements.define()`. The framework provides a `Component` base class that adds the reactive bindings API, lifecycle helpers, and Shadow DOM setup on top of the standard Web Component spec.

Generate the `<task-card>` component now:

```bash
npm run make:component task-card
```

> **Naming requirement:** Component names must be `kebab-case` with at least one hyphen. This is enforced by the browser's Custom Elements spec — a tag name without a hyphen is rejected at registration time. Pass `task-card`, not `TaskCard` or `taskcard`. The generator will error if the name does not meet this requirement.

The generator will ask one question:

```
Performance optimization:
   All components are lazy-loaded by default (loads on first use).
   For critical layout components (header, sidebar, footer), prefetching improves performance.

Would you like to prefetch this component? (y/N):
```

Answer **N** (or press Enter) for `task-card`. Prefetching is only worth enabling for layout-critical components that are needed on every page — things like `app-header` or `app-sidebar`. For feature components like `task-card`, lazy loading on first use is the right default.

This creates `src/components/ui/task-card.ts` and registers it in `src/components/appRegistry.ts`. Open it — it has the scaffold already in place. We will build it out together in this chapter.

---

## `static useShadowDOM = true`

The first thing to understand about `Component` is how it handles encapsulation:

```typescript
import { Component, defineComponent } from '@core/component.js';

export class TaskCard extends Component {
  static useShadowDOM = true;
}

defineComponent('task-card', TaskCard);
```

Setting `static useShadowDOM = true` tells the base class to call `this.attachShadow({ mode: 'open' })` in the constructor. Everything rendered by `template()` lives inside that shadow root. CSS rules from the page cannot bleed in; the component's own styles cannot bleed out.

If you need a component that participates in the page's normal style cascade — for layout wrappers, for example — set `static useShadowDOM = false`. The component still uses the `Component` API but renders into the light DOM.

---

## `template()` — Returning HTML

The `template()` method returns the HTML string that is stamped into the shadow root on first mount:

```typescript
import { Component, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';
import { useState, computed } from '@core/state.js';
import type { State } from '@core/state.js';
import '@components/core/nc-button.js';

export class TaskCard extends Component {
    static useShadowDOM = true;

  // Attributes listed here appear in the dev tools sidebar and trigger onAttributeChange.
  static observedAttributes = ['title', 'description'];

  // Internal state (not reflected as attributes) can be defined like this:
  titleState: State<string> = useState('');
  descriptionState: State<string> = useState('');
  titleDescComputed = computed(() => `${this.titleState.value} - ${this.descriptionState.value}`);

    constructor() {
        super();
    }

    template() {
        return html`
            <style>
                :host { display: block; }
        .task-card {}
        .task-card__header {}
        .task-card__title {}
        .task-card__description {}
            </style>
            <div class="task-card" data-view="task-card">
                <header class="task-card__header">
                    <h3 class="task-card__title" data-hook="title"></h3>
                </header>
                <p class="task-card__description" data-hook="description"></p>
        <p class="task-card__title-desc" data-hook="title-desc"></p> <!-- example of using a computed state -->
        <nc-button class="task-card__action" variant="outline" data-action="primary">Action</nc-button>
        <slot></slot>
            </div>
        `;
    }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue || !this._mounted) return;
    if (name === 'title') this.titleState.value = newValue ?? '';
    if (name === 'description') this.descriptionState.value = newValue ?? '';
  }

    onMount() {
    // Seed state from initial HTML attributes.
    this.titleState.value = this.getAttribute('title') ?? '';
    this.descriptionState.value = this.getAttribute('description') ?? '';

    // Wire up events and reactive bindings here.
    // this.component scopes element access to this component's shadow root:
    //   this.component.hook('title')    // [data-hook="title"]
    //   this.component.action('primary') // [data-action="primary"]
    //   this.component.view('nested').hook('row') // re-scope to a nested [data-view]
    // nc-button emits 'nc-button-click' on itself — e.target is the <nc-button> element.
    this.on('nc-button-click', (e) => {
      const action = (e.target as HTMLElement).getAttribute('data-action');
      if (action) this.emitEvent('task-card-action', { action });
    });

    this.bind(this.titleState, '[data-hook="title"]'); // surgically updates the element's textContent when state changes — no full re-render
    this.bind(this.descriptionState, '[data-hook="description"]'); // surgically updates the element's textContent when state changes — no full re-render
    this.bind(this.titleDescComputed, '[data-hook="title-desc"]'); // example of binding a computed state
    }

    onUnmount() {
    // Clean up after yourself — dispose any computed() instances here.
    // useState() is cleaned up automatically when this.bind() unsubscribes.
    this.titleDescComputed?.dispose();
    }
}

defineComponent('task-card', TaskCard);
```

This is the exact shape the generator starts from (including `nc-button`, `slot`, and the initial `title`/`description` attributes). In the rest of this chapter, we evolve it into the richer `status`-aware version used by Taskflow.

`template()` is called by `render()`, which the framework invokes on first mount and again whenever an observed attribute changes (unless you override `attributeChangedCallback` directly, which suppresses the automatic re-render). For high-frequency updates driven by reactive state, use the `bind()` API (Chapter 04) to surgically update individual DOM nodes without triggering a full re-render.

> **Security — XSS protection:** The `html` tag auto-escapes every interpolated value by default. Numbers, strings, and booleans you interpolate directly are safe:
>
> ```typescript
> return html`<div class="${variant}">${title}</div>`;
> // variant and title are both escaped — XSS-safe
> ```
>
> When you intentionally interpolate a developer-authored HTML string (icon markup, a `map().join('')` result, a sub-template), wrap it in `trusted()` to bypass escaping:
>
> ```typescript
> import { html, trusted, escapeHtml } from '@core-utils/templates.js';
>
> // Build HTML sub-strings safely: escape user data inside, then mark the result as safe
> const itemsHtml = items.map(i => `<li>${escapeHtml(i.label)}</li>`).join('');
> return html`<ul>${trusted(itemsHtml)}</ul>`;
> ```
>
> Rule: static structure (tags, class names) in `template()` is safe. User-supplied values (API responses, attribute values from external sources) belong in `textContent` assignments or are auto-escaped by the `html` tag. Use `trusted()` only for HTML you construct yourself in component code — never pass user input through `trusted()`.

---

## `this.component` — Scoped DOM Access

Every component gets a built-in `this.component` getter. It returns a scoped accessor pre-bound to the component's own tag name, so you never have to repeat the name yourself. All queries are scoped inside the component's shadow root.

```typescript
// All of these query within [data-view="task-card"] inside this shadow root:
this.component.hook('title')            // → [data-hook="title"]
this.component.action('primary')        // → [data-action="primary"]
this.component.query('.task-card__footer') // → arbitrary CSS selector
this.component.input('search')          // → [data-hook="search"] typed as HTMLInputElement
this.component.button('submit')         // → [data-action="submit"] typed as HTMLButtonElement
this.component.form('checkout')         // → [data-hook="checkout"] typed as HTMLFormElement

// Re-scope to a nested [data-view] within the same shadow root:
this.component.view('nested-panel').hook('row')
```

Use `this.component` any time you need a direct DOM reference in `onMount()`, `attributeChangedCallback()`, or event handlers. It is equivalent to the controller's `dom.view()` pattern — the same ergonomics, scoped to your shadow DOM.

> **Tip:** `this.component` is a getter, not a cached property, so it always reflects the live DOM. You do not need to store it.

---

## `static observedAttributes` and `attributeChangedCallback()`

Web Components receive data from the outside world through HTML attributes. Declare which attributes you want to observe, and the browser will call `attributeChangedCallback` whenever one of them changes:

```typescript
static observedAttributes = ['title', 'description', 'status'];

statusState: State<string> = useState('');

attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
  if (oldValue === newValue || !this._mounted) return;
  if (name === 'title') this.titleState.value = newValue ?? '';
  if (name === 'description') this.descriptionState.value = newValue ?? '';
  if (name === 'status') this.statusState.value = newValue ?? '';
}
```

> **Note:** The browser does fire `attributeChangedCallback` for initial attributes, but the scaffold uses `if (oldValue === newValue || !this._mounted) return;` to ignore pre-mount calls. That is why the generated file seeds state from `getAttribute(...)` in `onMount()`, then relies on `attributeChangedCallback` for post-mount updates.

---

## `static attributeOptions`

For attributes that only accept a fixed set of values, declare `static attributeOptions` to get validation warnings in development:

```typescript
static attributeOptions = {
  status: ['pending', 'in-progress', 'done'],
};
```

In dev mode the framework will log a warning if a value outside this set is passed. In production builds the check is stripped.

---

## `onMount()` and `onUnmount()`

`onMount()` runs after the shadow root has been populated and the element has been connected to the document. Use it to set up subscriptions, fetch initial data, or register event listeners that need a real DOM reference:

```typescript
onMount(): void {
  // The shadow root is ready; DOM queries will succeed here.
  console.log('task-card mounted');
}
```

`onUnmount()` runs when the element is removed from the document. Use it to dispose of anything that the framework cannot clean up automatically (raw `addEventListener` calls, timers, etc.). Bindings registered through `this.bind()` and `this.on()` are auto-disposed — you do not need to clean those up manually.

### Lifecycle Execution Order

The full sequence for a NativeCoreJS component is:

1. **`constructor()`** — initialise properties and call `super()`. No DOM access yet.
2. **Shadow DOM attaches** — if `static useShadowDOM = true`, an open shadow root is created.
3. **`connectedCallback()`** — browser fires this when the element enters the DOM.
4. **`render()`** — the framework calls `template()` and patches the shadow root.
5. **`onMount()`** — your hook, called after the render. Shadow root queries are safe here.
6. **`attributeChangedCallback()`** — fires for attribute mutations after mount. The base class implementation calls `this.onAttributeChange()` then `this.render()`. If you override `attributeChangedCallback` directly (as the scaffold does), you take full control of that step and must call `this.render()` yourself if you want a full re-render, or perform surgical DOM updates instead.
7. **`disconnectedCallback()`** → **`onUnmount()`** — cleanup runs when the element leaves the DOM.

The key rules that flow from this order:

- Never query the shadow root in `constructor()` — it is not rendered yet.
- If you need to read an attribute value on first render, do it in `onMount()` or in `attributeChangedCallback()`.
- Every watcher, timer, observer, or computed you create should be cleaned up in `onUnmount()`.

### Component Cleanup Rules

Any resource you open in a component must be explicitly closed. The framework auto-disposes bindings created via `this.bind()` and listeners created via `this.on()`. Everything else is your responsibility:

| Resource | How to clean up in `onUnmount()` |
|---|---|
| `state.watch()` call | Store the returned `unsubscribe` fn; call it |
| `computed()` value | Call `.dispose()` |
| `setTimeout` / `setInterval` | Store the ID; call `clearTimeout` / `clearInterval` |
| `addEventListener` on `window`/`document` | Store the handler reference; call `removeEventListener` |
| `ResizeObserver` / `IntersectionObserver` | Call `.disconnect()` |

```typescript
private _unwatch?: () => void;
private _timer?: ReturnType<typeof setInterval>;

onMount(): void {
    this._unwatch = this.count.watch(v => this.render());
    this._timer   = setInterval(() => this.tick(), 1000);
}

onUnmount(): void {
    this._unwatch?.();
    if (this._timer !== undefined) clearInterval(this._timer);
}
```

### Component Public API Design

A well-designed NativeCoreJS component has a small, explicit public surface. For every reusable component, document these five things:

| Surface | Example |
|---|---|
| Tag name | `task-card` |
| Observed attributes | `task-id`, `status`, `priority` |
| Emitted events | `task-status-changed` (detail: `{ taskId, status }`) |
| Slots | `default` (card body), `actions` (footer buttons) |
| Keyboard behaviour | `Enter`/`Space` activate; `Escape` dismisses |

**Attribute design rules:**
- Attributes describe configuration, not implementation details (`status="done"` not `is-completed="true"`)
- Event names describe intent, not DOM mechanics (`row-select`, not `clicked`)
- Default values should be safe and visually stable

**Variant attributes** give components predictable visual modes without exposing internals. Treat `variant` as a short, closed list of semantic names:

```typescript
// Good variant list — semantic, maintainable
// variant="primary" | "secondary" | "danger" | "ghost" | "compact"

// Bad variant list — too many, or too implementation-specific
// variant="blue-filled" | "gray-outline-with-shadow" | ...
```

The variant value drives only CSS custom property choices or class toggles — not branching logic in `template()`. Keep the default variant safe and accessible.

---

## Firing Custom Events with `this.emitEvent()`

Components communicate outward by dispatching custom events. The `Component` base class provides `this.emitEvent<T>(name, detail, options?)` as a typed shorthand over the native `dispatchEvent(new CustomEvent(...))`:

```typescript
// Preferred shorthand — typed, bubbles + composed by default
this.emitEvent<{ taskId: string; status: string }>(
    'task-status-changed',
    { taskId: this.getAttribute('task-id')!, status: newStatus }
);

// Equivalent manual form — more verbose, same result
this.dispatchEvent(new CustomEvent<{ taskId: string; status: string }>(
    'task-status-changed',
    {
        detail: { taskId: this.getAttribute('task-id')!, status: newStatus },
        bubbles: true,
        composed: true,   // crosses the shadow boundary
    }
));
```

`bubbles: true` lets the event travel up the DOM tree. `composed: true` lets it cross the shadow boundary so a controller listening on `document` can receive it. Both are set automatically by `this.emitEvent()`.

Listen for the event in a controller (the `trackEvents` helper is covered in Chapter 07, but the plain form works today):

```typescript
document.addEventListener('task-status-changed', (e: Event) => {
    const { taskId, status } = (e as CustomEvent<{ taskId: string; status: string }>).detail;
    console.log(taskId, status);
});
```

> **Tip:** Always use `this.emitEvent()` for component events rather than wiring up inter-component logic inside `onMount()`. It keeps components loosely coupled and testable in isolation.

---

## Slotted Content

Shadow DOM's `<slot>` element lets consumers project light-DOM children into specific positions in your component's template. Add a slot to `<task-card>` for optional action buttons:

```typescript
template(): string {
  return html`
    <style>
      :host { display: block; margin-bottom: 1rem; }
      .task-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; }
      .task-card__header { display: flex; align-items: center; gap: 0.5rem; }
      .task-card__title { margin: 0; font-size: 1rem; }
      .task-card__description { color: #64748b; font-size: 0.875rem; margin-top: 0.5rem; }
    </style>
    <div class="task-card" data-view="task-card">
      <header class="task-card__header">
        <h3 class="task-card__title" data-hook="title"></h3>
      </header>
      <p class="task-card__description" data-hook="description"></p>
      <footer class="task-card__footer">
        <slot name="actions"></slot>
      </footer>
    </div>
    <!-- styles omitted for brevity -->
  `;
}
```

---

## The Complete `<task-card>` Component

Here is the full file with everything assembled. Starting from the scaffold, we:

- Add `status` to `observedAttributes` and seed its badge in `onMount()`
- Handle `status` changes with a direct `this.$()` update in `attributeChangedCallback()` — appropriate here because status needs a label map, not just text binding
- Keep `bind()` for `title` and `description` — they map directly to text content
- Remove the `titleDescComputed` example from the scaffold (it was illustrative noise for this use-case)
- Swap the default `<slot>` for a named `slot name="actions"` to separate action buttons from body content

```typescript
// src/components/ui/task-card.ts
import { Component, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';
import { useState } from '@core/state.js';
import type { State } from '@core/state.js';
import '@components/core/nc-button.js';

export class TaskCard extends Component {
  static useShadowDOM = true;

  static observedAttributes = ['title', 'description', 'status'];

  static attributeOptions = {
    status: ['pending', 'in-progress', 'done'],
  };

  titleState: State<string> = useState('');
  descriptionState: State<string> = useState('');
  statusState: State<string> = useState('');

  constructor() {
    super();
  }

  template() {
    return html`
      <style>
        :host { display: block; margin-bottom: 1rem; }
        .task-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1rem;
          background: #fff;
        }
        .task-card__header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }
        .task-card__title { margin: 0; font-size: 1rem; font-weight: 600; }
        .task-card__description { color: #64748b; font-size: 0.875rem; margin: 0.5rem 0 0; }
        .task-card__footer { margin-top: 0.75rem; }
        .task-card__status { font-size: 0.75rem; font-weight: 700; }
        .task-card__status[data-status="done"]        { color: #16a34a; }
        .task-card__status[data-status="in-progress"] { color: #2563eb; }
        .task-card__status[data-status="pending"]     { color: #d97706; }
      </style>
      <div class="task-card" data-view="task-card">
        <header class="task-card__header">
          <span class="task-card__status" data-hook="status">● Pending</span>
          <h3 class="task-card__title" data-hook="title"></h3>
        </header>
        <p class="task-card__description" data-hook="description"></p>
        <footer class="task-card__footer">
          <slot name="actions"></slot>
        </footer>
      </div>
    `;
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue || !this._mounted) return;
    if (name === 'title') this.titleState.value = newValue ?? '';
    if (name === 'description') this.descriptionState.value = newValue ?? '';
    if (name === 'status') {
      const el = this.component.hook('status');
      if (!el) return;
      const labels: Record<string, string> = {
        'done':        '✓ Done',
        'in-progress': '↻ In Progress',
        'pending':     '● Pending',
      };
      el.textContent = labels[newValue ?? 'pending'] ?? '● Pending';
      el.setAttribute('data-status', newValue ?? 'pending');
    }
  }

  onMount() {
    // Seed state from initial HTML attributes.
    this.titleState.value = this.getAttribute('title') ?? '';
    this.descriptionState.value = this.getAttribute('description') ?? '';

    // Seed the status badge — attributeChangedCallback only fires for
    // post-mount changes, so initial attribute values must be applied here.
    const initialStatus = this.getAttribute('status') ?? 'pending';
    const statusEl = this.component.hook('status');
    if (statusEl) {
      const labels: Record<string, string> = {
        'done':        '✓ Done',
        'in-progress': '↻ In Progress',
        'pending':     '● Pending',
      };
      statusEl.textContent = labels[initialStatus] ?? '● Pending';
      statusEl.setAttribute('data-status', initialStatus);
    }

    // nc-button emits 'nc-button-click' on itself (composed: true).
    // e.target is the <nc-button> element — read data-action directly from it.
    this.on('nc-button-click', (e) => {
      const action = (e.target as HTMLElement).getAttribute('data-action');
      if (action) this.emitEvent('task-card-action', { action });
    });

    this.bind(this.titleState, '[data-hook="title"]');
    this.bind(this.descriptionState, '[data-hook="description"]');
  }

  onUnmount() {
    // bind() subscriptions are auto-disposed — nothing to clean up here.
  }
}

defineComponent('task-card', TaskCard);
```

> **Why `this.component.hook()` for status but `bind()` for title/description?**
> `bind()` maps a reactive state directly to an element's `textContent`. That is a perfect fit for `title` and `description` — change the state, the text updates. `status` is different: you need to map three possible string values to human-readable labels **and** set a `data-status` attribute for CSS targeting. `this.component.hook('status')` retrieves the element by name so you can perform both updates explicitly — cleaner and more readable than building a computed just to handle two concerns at once.

---

## Using `<task-card>` in a View

With the component registered, you can drop it into any HTML view. Open `src/views/protected/tasks.html` and add:

```html
<div data-view="tasks">
  <h1>My Tasks</h1>

  <task-card
    title="Set up NativeCoreJS project"
    description="Scaffold the Taskflow app using the CLI."
    status="done"
  >
    <div slot="actions">
      <nc-button variant="outline" data-action="delete-task">Delete</nc-button>
    </div>
  </task-card>

  <task-card
    title="Build task-card component"
    description="Implement the component with Shadow DOM and attributes."
    status="in-progress"
  ></task-card>
</div>
```

You do not need to import the component in your controller or view. Because you registered it in `src/components/appRegistry.ts` when you ran `make:component`, the framework's lazy loader will fetch and define the custom element automatically the first time it appears in a rendered view.

Save and check the browser — you should see two styled task cards with correct status badges.

---

## Using Components Inside Other Components

The lazy loader watches `document.body` with a `MutationObserver`. It sees every custom element that lands in the **light DOM** (your view HTML) and loads it on demand. However, elements inside a **Shadow DOM** are hidden from `document.body` — the browser enforces this as a security and encapsulation boundary.

This means: if your component's `template()` uses another custom element (e.g. `<nc-button>`), the lazy loader will never see it. You must import it explicitly at the top of your component file:

```typescript
import { Component, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';
import '@components/core/nc-button.js'; // ← explicit import required

export class TaskCard extends Component {
    template() {
        return html`
            <nc-button variant="outline" data-action="primary">Action</nc-button>
        `;
    }
}
```

The rule is simple:

| Where is the custom element placed? | How is it loaded? |
|---|---|
| In a view HTML file (`home.html`, etc.) | Lazy loader — no import needed |
| Inside another component's `template()` | Explicit `import` in the component file |

### Listening for Events from Nested Components

`nc-button` emits an `nc-button-click` custom event (not a plain `click`) so the parent component can respond without using inline `onclick` handlers:

```typescript
onMount() {
    // nc-button emits 'nc-button-click' on itself (composed: true), so
    // e.target is the <nc-button> element — read data-action from it directly.
    this.on('nc-button-click', (e) => {
        const action = (e.target as HTMLElement).getAttribute('data-action');
        if (action) this.emitEvent('task-card-action', { action });
    });
}
```

The chain keeps each layer decoupled: `nc-button` → `nc-button-click` → caught by `task-card` → re-emitted as `task-card-action` → handled by the controller.

> **Why not use `this.on('nc-button-click', '[data-action]', handler)`?**
> The selector overload of `this.on()` does event delegation — it checks `e.target.matches(selector)`. Because `nc-button-click` is emitted by the `<nc-button>` element itself (`composed: true`), `e.target` is the `<nc-button>` element. Since `data-action` is placed directly on `<nc-button>`, `getAttribute('data-action')` on the target is both correct and simpler.

### Dev Tools: Inspecting Nested Components

Because nested custom elements live inside a shadow root, the dev tools overlay gear icon won't appear on them directly. Instead, open the gear on the **root component** (`task-card`) and look for the **Nested Components** section at the bottom of the editor sidebar. Each nested custom element found in the shadow root is listed there — click one to drill into its attributes and styles.

---

> **Tip:** The `data-view`, `data-hook`, and `data-action` attributes are NativeCoreJS conventions used by the `dom` utility to scope DOM queries. You will see them explained in detail in Chapter 07.

---

## Done Criteria

- [ ] `src/components/ui/task-card.ts` exists and is registered in `src/components/appRegistry.ts`.
- [ ] The component renders with `title`, `description`, and `status` attributes set from HTML.
- [ ] Two static task cards appear in `src/views/protected/tasks.html`.
- [ ] Each status badge shows the correct color (`done` = green, `in-progress` = blue, `pending` = amber).

---

**Back:** [Chapter 01 — Project Setup](./01-project-setup.md)  
**Next:** [Chapter 03 — Error Boundaries](./03-error-boundaries.md)
