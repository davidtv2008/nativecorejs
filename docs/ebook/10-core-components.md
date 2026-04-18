# Chapter 10 — Core Components

NativeCoreJS ships a suite of `nc-*` custom elements that cover the most common UI needs. They are registered globally when the framework boots, so you can drop them into any template without an import. This chapter tours every major component with its key attributes and a usage snippet drawn from the Taskflow app.

---

## `<nc-button>`

A fully accessible button element with built-in loading and icon support.

| Attribute | Type | Description |
|---|---|---|
| `variant` | `primary` \| `secondary` \| `ghost` \| `danger` | Visual style |
| `size` | `sm` \| `md` \| `lg` | Button size (default: `md`) |
| `loading` | boolean | Shows a spinner and disables interaction |
| `disabled` | boolean | Standard disabled state |
| `icon` | string | Icon name shown before the label |
| `full-width` | boolean | Stretches to the container width |

```html
<nc-button variant="primary" icon="plus" id="btn-new-task">New Task</nc-button>
```

---

## `<nc-badge>`

Small counters and status indicators — ideal for task counts in sidebar nav items.

| Attribute | Type | Description |
|---|---|---|
| `count` | number | Numeric label; hidden when `0` |
| `dot` | boolean | Render a plain dot instead of a number |
| `variant` | `default` \| `success` \| `warning` \| `danger` \| `info` | Colour |
| `max` | number | Cap display value (e.g., `99+`) |

```html
<nc-badge count="12" variant="danger" max="99"></nc-badge>
```

---

## `<nc-input>`

The primary text input. Covers plain text, email, password, search, and URL types.

| Attribute | Type | Description |
|---|---|---|
| `type` | string | Standard `<input>` type |
| `label` | string | Floating or static label |
| `placeholder` | string | Placeholder text |
| `clearable` | boolean | Shows a ✕ button when the field has content |
| `show-password-toggle` | boolean | Eye icon for password fields |
| `error` | string | Error text; empty string clears the error state |
| `hint` | string | Helper text shown when there is no error |
| `disabled` / `readonly` | boolean | Standard states |

```html
<nc-input id="email" type="email" label="Email" clearable error="Invalid address"></nc-input>
```

Access the current value in a controller:

```typescript
const value = (scope.$('#email') as any).value;
```

---

## `<nc-select>`

A styled, accessible drop-down built on top of a native `<select>`.

| Attribute | Type | Description |
|---|---|---|
| `label` | string | Label above the control |
| `options` | JSON string | `[{ "label": "…", "value": "…" }]` |
| `value` | string | Currently selected value |
| `placeholder` | string | Shown when nothing is selected |
| `error` | string | Validation error text |

```html
<nc-select id="status" label="Status"
  options='[{"label":"Open","value":"open"},{"label":"Done","value":"done"}]'>
</nc-select>
```

---

## `<nc-modal>`

A dialog overlay with focus trapping, Escape-to-close, and named slots.

| Attribute | Type | Description |
|---|---|---|
| `heading` | string | Title shown in the modal header |
| `size` | `sm` \| `md` \| `lg` \| `xl` \| `full` | Dialog width |
| `persistent` | boolean | Prevents closing on backdrop click |

**Slots:** `body`, `footer`

**Methods (via JS):** `.open()`, `.close()`, `.toggle()`

```html
<nc-modal id="confirm-delete" size="sm" heading="Delete project?">
  <div slot="body">This cannot be undone.</div>
  <div slot="footer">
    <nc-button variant="ghost"  id="btn-cancel">Cancel</nc-button>
    <nc-button variant="danger" id="btn-confirm">Delete</nc-button>
  </div>
</nc-modal>
```

```typescript
(scope.$('#confirm-delete') as any).open();
```

---

## `<nc-tabs>`

Tab navigation that manages panel visibility automatically.

| Attribute | Type | Description |
|---|---|---|
| `tabs` | JSON string | `[{ "label": "…", "key": "…" }]` |
| `active` | string | Key of the currently active tab |

```html
<nc-tabs
  id="detail-tabs"
  tabs='[{"label":"Overview","key":"overview"},{"label":"Activity","key":"activity"}]'
  active="overview"
></nc-tabs>
```

Listen for changes:

```typescript
on('nc-tab-change', '#detail-tabs', (e: CustomEvent) => {
  console.log(e.detail.key); // 'overview' | 'activity'
});
```

---

## `<nc-progress>`

A progress bar for upload/download feedback or task completion percentages.

| Attribute | Type | Description |
|---|---|---|
| `value` | number | 0–100 |
| `indeterminate` | boolean | Animated stripe when value is unknown |
| `striped` | boolean | Striped fill |
| `variant` | `default` \| `success` \| `warning` \| `danger` | Colour |

```html
<nc-progress value="65" striped variant="success"></nc-progress>
```

---

## `<nc-toast>`

A transient notification that appears at the edge of the viewport.

| Attribute | Type | Description |
|---|---|---|
| `type` | `info` \| `success` \| `warning` \| `error` | Icon and colour |
| `message` | string | Notification text |
| `duration` | number | Auto-dismiss after N ms (default: 4000) |
| `position` | `top-right` \| `bottom-center` \| … | Placement |

Show a toast programmatically:

```typescript
const toast = document.querySelector('nc-toast') as any;
toast.show({ type: 'success', message: 'Task created!' });
```

---

## `<nc-table>`

A data table with column definitions, sorting, and row click events.

| Property | Type | Description |
|---|---|---|
| `columns` | `Column[]` | `{ key, label, sortable? }` — set via JS |
| `rows` | `Row[]` | Array of plain objects — set via JS |
| `sortable` | boolean attr | Enables column-header sort arrows |
| `loading` | boolean attr | Overlays a spinner on the table body |

```typescript
const table = scope.$('#projects-table') as any;
table.columns = [{ key: 'name', label: 'Project', sortable: true }];
table.rows    = projects;
```

Listen for row clicks:

```typescript
on('nc-row-click', '#projects-table', (e: CustomEvent) => {
  router.navigate(`/projects/${e.detail.row.id}`);
});
```

---

## `<nc-alert>`

An inline status banner for page-level feedback (see login and projects chapters).

| Attribute | Type | Description |
|---|---|---|
| `type` | `info` \| `success` \| `warning` \| `error` | Icon and colour |
| `message` | string | Alert body text |
| `dismissible` | boolean | Shows a close button |

```html
<nc-alert type="error" message="Could not load projects." dismissible></nc-alert>
```

---

## `<nc-spinner>`

A loading indicator — used in `projectsController` while data is in flight.

| Attribute | Type | Description |
|---|---|---|
| `size` | `sm` \| `md` \| `lg` | Spinner diameter |
| `label` | string | Accessible screen-reader text |

```html
<nc-spinner size="lg" label="Loading projects…"></nc-spinner>
```

---

## `<nc-timeline>` and `<nc-timeline-item>`

An ordered list of events — useful for task activity feeds.

```html
<nc-timeline>
  <nc-timeline-item
    label="Created by Alice"
    timestamp="2025-06-01T09:00:00Z"
    icon="plus-circle"
  ></nc-timeline-item>
  <nc-timeline-item
    label="Status changed to In Progress"
    timestamp="2025-06-02T14:30:00Z"
    icon="refresh"
    variant="info"
  ></nc-timeline-item>
</nc-timeline>
```

`<nc-timeline-item>` key attributes: `label`, `timestamp` (ISO string — auto-formatted), `icon`, `variant` (`default` | `success` | `warning` | `danger` | `info`).

---

## Additional Components

| Component | One-liner |
|---|---|
| `<nc-switch>` | Toggle boolean settings (see Chapter 9) |
| `<nc-number-input>` | Numeric field with min/max/step and stepper buttons |
| `<nc-slider>` | Range selector for numeric values |
| `<nc-rating>` | Star rating input (0–5, supports half stars) |
| `<nc-autocomplete>` | Text input with a live-filtered suggestion dropdown |
| `<nc-popover>` | Floating contextual panel anchored to a trigger element |
| `<nc-tooltip>` | Hover tooltip — wraps any element via a `trigger` slot |
| `<nc-card>` | Simple content container with optional header/footer slots |

---

## How Component Lazy Loading Works

All `nc-*` components are lazy-loaded — the browser only downloads a component's JavaScript the first time a tag appears in the DOM. Understanding this mechanism helps when you build your own components and want the same behaviour.

### The Registry

`src/components/frameworkRegistry.ts` maps every `nc-*` tag name to a module path using `componentRegistry.register()`:

```typescript
import { componentRegistry } from '@core/lazyComponents.js';

componentRegistry.register('nc-button',  './core/nc-button.js');
componentRegistry.register('nc-badge',   './core/nc-badge.js');
componentRegistry.register('nc-modal',   './core/nc-modal.js');
// ... and all other nc-* components
```

A `MutationObserver` watches the entire document. When a new element is added whose tag name is in the registry, the framework dynamically imports the corresponding module, which defines and registers the custom element. From that point on the browser handles all future instances natively.

### Your Own Components

When you run `npm run make:component task-card`, the generator creates the component file **and** adds a `componentRegistry.register()` call to `src/components/registry.ts`:

```typescript
// src/components/registry.ts — auto-updated by the generator
import { componentRegistry } from '@core/lazyComponents.js';

componentRegistry.register('task-card', './ui/task-card.js');
```

This means your component is available in every view without an explicit import. You never need to call `customElements.define()` manually or import the component file in your controllers.

> **Tip:** If you ever need a component to be available *instantly* on first paint — before the MutationObserver fires — add it to `src/components/preloadRegistry.ts`. The preload list is imported in `app.ts` and downloads eagerly. Use this sparingly (typically just `<app-header>`, `<app-sidebar>`, and `<loading-spinner>`).

### The `remove:component` Generator

To remove a component cleanly — unregistering it from `registry.ts` and deleting its file — use the companion command rather than deleting files manually:

```bash
npm run remove:component task-card
```

---

## What's Next

Chapter 11 moves beyond individual components and controllers to explore advanced patterns: global stores, cross-component communication with custom events, `patchState`, debounced effects, and a real `<project-filter>` component that drives the tasks list.
