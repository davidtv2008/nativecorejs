# Chapter 19 — Component Composition and Slots

> **What you'll build in this chapter:** Build ShopBoard's `<product-card>` with default and named slots, and `<product-grid>` that lays out slotted cards with `::slotted()` CSS.

By this point in the Taskflow project you have individual components — `<task-card>`, `<task-stats>`, `<priority-badge>` — that each manage their own state and styles. Now comes the natural next question: how do you *compose* those pieces into larger structures? How does a `<task-list>` hold multiple `<task-card>` elements? How does a `<project-panel>` embed a `<task-list>` without those two components being tightly coupled?

The answer is **slots** — the Shadow DOM's built-in content projection mechanism — combined with thoughtful component hierarchy.

---

## 18.1 The Composition Problem

Imagine naively writing a `<task-list>` like this:

```typescript
template(): string {
    return `
      <div class="list">
        <task-card title="Buy milk"></task-card>
        <task-card title="Ship feature"></task-card>
      </div>
    `;
}
```

This works, but it hard-codes the children. The parent that uses `<task-list>` has no way to inject *which* task cards appear, or to pass in a heading, or to add a footer. You have created a closed box instead of a reusable component.

The fix is to let the **consumer** supply the children and let the component define *where* those children land — via slots.

---

## 18.2 Generating the Component

Always start with the generator:

```bash
npm run make:component task-list
```

This creates `src/components/ui/task-list.ts` with a shadow DOM template stub, `onMount`, and `onUnmount` already wired up. Open that file and work from there.

---

## 18.3 The Default Slot

The simplest slot is an unnamed `<slot>` element placed inside the shadow template. Any light DOM children of the host element are projected into that slot at render time.

```typescript
template(): string {
    return `
      <style>
        :host { display: block; }
        .list-body { padding: var(--spacing-md); }
      </style>
      <div class="list-body">
        <slot></slot>
      </div>
    `;
}
```

Consumer usage:

```html
<task-list>
  <task-card title="Buy milk" status="todo"></task-card>
  <task-card title="Ship feature" status="in-progress"></task-card>
</task-list>
```

The two `<task-card>` elements live in the **light DOM** of `<task-list>` but are visually rendered inside `.list-body` through the slot. They keep their own shadow roots, styles, and state — `<task-list>` is just a frame.

> **Tip:** Light DOM children are NOT accessible via `this.$()`, which queries inside the shadow root. To interact with projected children use `this.querySelectorAll('task-card')` on the host element itself.

---

## 18.4 Named Slots

A single default slot is often not enough. `<task-list>` needs a header and optionally a footer. Add named slots:

```typescript
template(): string {
    return `
      <style>
        :host { display: block; }
        .list-header { padding: var(--spacing-sm) var(--spacing-md); border-bottom: 1px solid var(--border); }
        .list-body   { padding: var(--spacing-md); }
        .list-footer { padding: var(--spacing-sm) var(--spacing-md); border-top: 1px solid var(--border); }
        .badge { background: var(--primary); color: #fff; border-radius: var(--radius-sm); padding: 2px 8px; font-size: 0.75rem; margin-left: var(--spacing-xs); }
      </style>
      <div class="list-header" part="header">
        <slot name="header">Tasks</slot>
        <span class="badge" data-hook="count">0</span>
      </div>
      <div class="list-body">
        <slot></slot>
      </div>
      <div class="list-footer">
        <slot name="footer"></slot>
      </div>
    `;
}
```

Consumer:

```html
<task-list count="4">
  <h2 slot="header">My Tasks</h2>

  <task-card title="Buy milk" status="todo"></task-card>
  <task-card title="Ship feature" status="in-progress"></task-card>

  <span slot="footer">Last updated: today</span>
</task-list>
```

The `slot="header"` attribute tells the browser *which* named slot to project that element into. Content without a `slot` attribute falls into the default slot.

---

## 18.5 Accepting a `count` Attribute

Update `TaskList` to accept a `count` attribute and display it in the badge:

```typescript
class TaskList extends Component {
    static useShadowDOM = true;
    static observedAttributes = ['count'];

    private countState = useState('0');

    template(): string { /* ... as above ... */ }

    onMount(): void {
        this.bind(this.countState, '[data-hook="count"]');
        this.on('click', 'task-card', this.handleTaskClick.bind(this));
    }

    attributeChangedCallback(name: string, _old: string, value: string) {
        if (name === 'count') this.countState.value = value;
    }

    private handleTaskClick(e: Event) {
        const card = (e.target as HTMLElement).closest('task-card');
        const taskId = card?.getAttribute('task-id') ?? '';
        this.dispatchEvent(new CustomEvent('task-selected', {
            detail: { taskId },
            bubbles: true,
            composed: true,   // escapes shadow boundary
        }));
    }
}
defineComponent('task-list', TaskList);
```

The `composed: true` flag is critical — without it, custom events stop at the shadow boundary and the parent document never sees them.

---

## 18.6 Styling Projected Content with `::slotted()`

Styles inside a shadow root normally cannot reach light DOM children. The one exception is the `::slotted()` pseudo-element, which targets direct children that are projected into a slot:

```css
::slotted(task-card) {
    margin-bottom: 0.5rem;
    display: block;
}
::slotted(task-card:last-child) {
    margin-bottom: 0;
}
```

> **Warning:** `::slotted()` only matches **direct** slotted children. `::slotted(task-card .title)` will not work — you cannot reach inside a projected element's own shadow root from here.

---

## 18.7 Nesting: `<project-panel>` Uses `<task-list>`

Generate the outer component:

```bash
npm run make:component project-panel
```

`ProjectPanel` uses `<task-list>` as a sub-component, demonstrating that slot composition nests naturally:

```typescript
template(): string {
    return `
      <style>
        :host { display: block; border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; box-shadow: var(--shadow-sm); }
      </style>
      <task-list data-hook="list">
        <span slot="header" data-hook="project-name">Project</span>
        <slot></slot>
        <slot name="actions" slot="footer"></slot>
      </task-list>
    `;
}
```

The consumer of `<project-panel>` places `<task-card>` elements as direct children, which then pass through the default slot chain:

```html
<project-panel project-name="Taskflow v2" count="3">
  <task-card title="Set up repo" status="done"></task-card>
  <task-card title="Write chapter 18" status="in-progress"></task-card>
  <button slot="actions">+ New Task</button>
</project-panel>
```

---

## 18.8 `::part()` — Exposing Shadow DOM Parts for External Theming

Notice the `part="header"` attribute on the `.list-header` div earlier. This exposes that element as a **CSS part** that external stylesheets can target:

```css
/* In src/styles/overrides.css or a page-level stylesheet */
task-list::part(header) {
    background: var(--primary);
    color: #fff;
}
```

You can expose multiple parts from the same component:

```html
<div class="list-header" part="header"> … </div>
<div class="list-body"   part="body">   … </div>
```

Combined with CSS custom properties, `::part()` gives consumers two layers of theming control without breaking encapsulation.

---

## 18.9 When NOT to Use Shadow DOM

Sometimes you want a layout-only wrapper component that *intentionally* inherits global styles — grid containers, page sections, utility wrappers. In those cases, opt out:

```typescript
class PageSection extends Component {
    static useShadowDOM = false;

    template(): string {
        return `<section class="page-section"><slot></slot></section>`;
    }
}
```

With `useShadowDOM = false`, the component renders into the regular DOM and global CSS applies normally. Use this sparingly — it removes encapsulation guarantees.

---

## 18.10 Rendering Dynamic Children with `effect()`

When you receive an array of task objects from a store and need to render them programmatically — rather than via static slot markup — use `effect()` combined with `innerHTML`:

```typescript
import { effect } from '@core/state.js';
import { taskStore } from '@stores/task.store.js';
import { escapeHTML } from '@core-utils/templates.js';

onMount(): void {
    const listEl = this.$('.list-body');
    const disposer = effect(() => {
        const tasks = taskStore.tasks.value;
        if (!listEl) return;
        listEl.innerHTML = tasks
            .map(t => `<task-card task-id="${escapeHTML(t.id)}" title="${escapeHTML(t.title)}" status="${escapeHTML(t.status)}"></task-card>`)
            .join('');
    });
    // store disposer for cleanup
    this._disposers = [disposer];
}

onUnmount(): void {
    this._disposers?.forEach(d => d());
}
```

> **Best Practice:** Prefer static slots and consumer-supplied children whenever possible. Dynamic `innerHTML` inside `effect()` is powerful but resets child component state on every render. Use it when the data source is a reactive store and the children are stateless display components.

---

## Done Criteria

- [ ] `<product-card>` has a default slot and an `actions` named slot.
- [ ] `<product-grid>` styles its slotted children with CSS Grid via `::slotted(product-card)`.
- [ ] `<nc-button slot="actions">Add to Cart</nc-button>` renders in the card footer without coupling.
- [ ] A `<product-card>` with no `slot="actions"` content renders cleanly without a broken layout.

---

**Back:** [Chapter 18 — Global Stores and Cross-Route State](./18-global-stores.md)  
**Next:** [Chapter 20 — Styling, Theming, and CSS Custom Properties](./20-styling-and-theming.md)
