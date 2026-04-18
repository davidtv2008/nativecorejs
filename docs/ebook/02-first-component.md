# Chapter 02 — First Component

## The Component Base Class

Every NativeCoreJS component is a native Web Component — a class that extends `HTMLElement` and is registered with `customElements.define()`. The framework provides a `Component` base class that adds the reactive bindings API, lifecycle helpers, and Shadow DOM setup on top of the standard Web Component spec.

Generate the `<task-card>` component now:

```bash
npm run make:component TaskCard
```

This creates `src/components/task-card/TaskCard.ts`. Open it — it has the scaffold already in place. We will build it out together in this chapter.

---

## `static useShadowDOM = true`

The first thing to understand about `Component` is how it handles encapsulation:

```typescript
import { Component } from '@core/component.js';
import { defineComponent } from '@core/define.js';

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
template(): string {
  return `
    <article class="task-card">
      <header class="task-card__header">
        <span class="task-card__status"></span>
        <h3 class="task-card__title"></h3>
      </header>
      <p class="task-card__description"></p>
    </article>
    <style>
      :host { display: block; }
      .task-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; }
      .task-card__header { display: flex; align-items: center; gap: 0.5rem; }
      .task-card__title { margin: 0; font-size: 1rem; }
      .task-card__description { color: #64748b; font-size: 0.875rem; margin-top: 0.5rem; }
      .task-card__status[data-status="done"] { color: #16a34a; }
      .task-card__status[data-status="pending"] { color: #d97706; }
    </style>
  `;
}
```

`template()` is called exactly once per component instance. After the shadow root is populated, NativeCoreJS uses the `bind()` API (Chapter 04) to update individual nodes in place — it does not re-call `template()` on state changes. This is an important distinction from frameworks that re-render on each update.

---

## `static observedAttributes` and `attributeChangedCallback()`

Web Components receive data from the outside world through HTML attributes. Declare which attributes you want to observe, and the browser will call `attributeChangedCallback` whenever one of them changes:

```typescript
static observedAttributes = ['title', 'description', 'status'];

attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
  if (name === 'title') {
    const el = this.shadowRoot?.querySelector('.task-card__title');
    if (el) el.textContent = value ?? '';
  }
  if (name === 'description') {
    const el = this.shadowRoot?.querySelector('.task-card__description');
    if (el) el.textContent = value ?? '';
  }
  if (name === 'status') {
    const el = this.shadowRoot?.querySelector('.task-card__status');
    if (el) {
      el.textContent = value === 'done' ? '✓ Done' : '● Pending';
      el.setAttribute('data-status', value ?? 'pending');
    }
  }
}
```

> **Note:** `attributeChangedCallback` fires for the initial attribute values when the element is first parsed, so you do not need a separate "initial render" pass — just set the attribute and the callback handles both the initial value and future updates.

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

Listen for the event in a controller:

```typescript
events.on(document, 'task-status-changed', (e: CustomEvent<{ taskId: string; status: string }>) => {
    console.log(e.detail.taskId, e.detail.status);
});
```

> **Tip:** Always use `this.emitEvent()` for component events rather than wiring up inter-component logic inside `onMount()`. It keeps components loosely coupled and testable in isolation.

---

## Slotted Content

Shadow DOM's `<slot>` element lets consumers project light-DOM children into specific positions in your component's template. Add a slot to `<task-card>` for optional action buttons:

```typescript
template(): string {
  return `
    <article class="task-card">
      <header class="task-card__header">
        <span class="task-card__status"></span>
        <h3 class="task-card__title"></h3>
      </header>
      <p class="task-card__description"></p>
      <footer class="task-card__footer">
        <slot name="actions"></slot>
      </footer>
    </article>
    <!-- styles omitted for brevity -->
  `;
}
```

---

## The Complete `<task-card>` Component

Here is the full file with everything assembled:

```typescript
// src/components/task-card/TaskCard.ts
import { Component } from '@core/component.js';
import { defineComponent } from '@core/define.js';

export class TaskCard extends Component {
  static useShadowDOM = true;

  static observedAttributes = ['title', 'description', 'status'];

  static attributeOptions = {
    status: ['pending', 'in-progress', 'done'],
  };

  template(): string {
    return `
      <article class="task-card">
        <header class="task-card__header">
          <span class="task-card__status" data-status="pending">● Pending</span>
          <h3 class="task-card__title"></h3>
        </header>
        <p class="task-card__description"></p>
        <footer class="task-card__footer">
          <slot name="actions"></slot>
        </footer>
      </article>
      <style>
        :host { display: block; }
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
    `;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name === 'title') {
      const el = this.shadowRoot?.querySelector('.task-card__title');
      if (el) el.textContent = value ?? '';
    }

    if (name === 'description') {
      const el = this.shadowRoot?.querySelector('.task-card__description');
      if (el) el.textContent = value ?? '';
    }

    if (name === 'status') {
      const el = this.shadowRoot?.querySelector('.task-card__status');
      if (!el) return;
      const labels: Record<string, string> = {
        'done':        '✓ Done',
        'in-progress': '↻ In Progress',
        'pending':     '● Pending',
      };
      el.textContent = labels[value ?? 'pending'] ?? '● Pending';
      el.setAttribute('data-status', value ?? 'pending');
    }
  }
}

defineComponent('task-card', TaskCard);
```

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
      <button data-action="delete-task">Delete</button>
    </div>
  </task-card>

  <task-card
    title="Build task-card component"
    description="Implement the component with Shadow DOM and attributes."
    status="in-progress"
  ></task-card>
</div>
```

Import the component in your controller (or in a shared `components.ts` barrel file) so the custom element is registered before the view renders:

```typescript
import '@components/task-card/TaskCard.ts';
```

Save and check the browser — you should see two styled task cards with correct status badges.

---

> **Tip:** The `data-view`, `data-hook`, and `data-action` attributes are NativeCoreJS conventions used by the `dom` utility to scope DOM queries. You will see them explained in detail in Chapter 06.

---

**What's Next:** [Chapter 03 — Reactive State](./03-reactive-state.md) — introduce `useState()`, `computed()`, and `useSignal()` by building the `<task-stats>` component with live counters.
