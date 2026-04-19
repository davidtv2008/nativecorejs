# Chapter 29 — Error Boundaries

An error boundary is a component that catches errors thrown by its descendants and displays a fallback UI instead of crashing the entire page. NativeCoreJS ships `<nc-error-boundary>`, a built-in component that catches synchronous errors from child component `onMount()` and `render()` lifecycles.

---

## Why Error Boundaries Matter

Without a boundary, an unhandled error in a deeply nested component can silently swallow the failure (the component renders nothing) or bubble up and break sibling components. React first popularized the error boundary concept; Vue has `onErrorCaptured`; Angular has global `ErrorHandler`. NativeCoreJS's `<nc-error-boundary>` provides the same protection at the component level.

---

## Quick Start

Wrap any component — or any section of your view — in `<nc-error-boundary>`:

```html
<!-- src/views/protected/dashboard.html -->
<nc-error-boundary>
    <sales-chart></sales-chart>
</nc-error-boundary>
```

If `<sales-chart>` throws during mount or render, `<nc-error-boundary>` replaces it with a user-facing fallback and fires an `nc-error` event. Everything outside the boundary keeps working normally.

---

## Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `fallback` | string | `'Something went wrong'` | Heading text shown in the fallback UI |
| `show-details` | boolean | absent | Appends the error message below the heading |

```html
<!-- Custom fallback message, with technical detail exposed -->
<nc-error-boundary fallback="Chart failed to load" show-details>
    <sales-chart></sales-chart>
</nc-error-boundary>
```

---

## Events

| Event | Detail | Description |
|---|---|---|
| `nc-error` | `{ error: unknown }` | Fires when a child error is caught |
| `nc-error-reset` | `{}` | Fires after `reset()` is called |

Listen to `nc-error` to log errors to your monitoring service:

```typescript
// In a controller or app shell
document.querySelectorAll('nc-error-boundary').forEach(el => {
    el.addEventListener('nc-error', (e: Event) => {
        const { error } = (e as CustomEvent<{ error: unknown }>).detail;
        console.error('[ErrorBoundary] caught:', error);
        // monitoring.captureException(error);
    });
});
```

---

## Programmatic Reset

The boundary shows a **"Try again"** button by default. Clicking it calls `reset()`, which restores the original child HTML and re-renders, giving the component another chance to mount cleanly.

You can also call `reset()` programmatically:

```typescript
const boundary = document.querySelector('nc-error-boundary') as any;
boundary.reset();
```

---

## Reporting Errors From Inside a Component

Child components can proactively report errors to the nearest boundary using the `catchError()` method — for example, when an async operation fails after mount:

```typescript
// src/components/ui/live-feed.ts
import { Component, defineComponent } from '@core/component.js';

export class LiveFeed extends Component {
    static useShadowDOM = true;

    async onMount(): Promise<void> {
        try {
            const data = await fetch('/api/feed').then(r => r.json());
            this.setState({ items: data });
        } catch (err) {
            // Walk up to find the nearest nc-error-boundary
            let el: Element | null = this.parentElement;
            while (el) {
                if (el.tagName === 'NC-ERROR-BOUNDARY') {
                    (el as any).catchError(err);
                    return;
                }
                el = el.parentElement;
            }
            console.error('No error boundary found', err);
        }
    }

    template(): string { return `<div class="feed">...</div>`; }
}

defineComponent('live-feed', LiveFeed);
```

---

## Multiple Boundaries

Use multiple boundaries to isolate independent page sections. A failure in the chart widget does not affect the task list, and vice versa:

```html
<div class="dashboard-grid">
    <nc-error-boundary fallback="Chart unavailable">
        <sales-chart></sales-chart>
    </nc-error-boundary>

    <nc-error-boundary fallback="Tasks could not be loaded">
        <task-list></task-list>
    </nc-error-boundary>

    <nc-error-boundary fallback="Activity feed unavailable" show-details>
        <live-feed></live-feed>
    </nc-error-boundary>
</div>
```

---

## Boundaries in Controllers

To monitor all boundaries on a page from a controller, query them after mount and attach listeners:

```typescript
// tasks.controller.ts
import { trackEvents } from '@core-utils/events.js';

export async function tasksController(): Promise<() => void> {
    const events = trackEvents();
    const disposers: Array<() => void> = [];

    // Attach error listeners to all boundaries in this view
    document.querySelectorAll('nc-error-boundary').forEach(el => {
        const handler = (e: Event) => {
            const { error } = (e as CustomEvent<{ error: unknown }>).detail;
            console.error('[TasksView] boundary caught:', error);
        };
        el.addEventListener('nc-error', handler);
        disposers.push(() => el.removeEventListener('nc-error', handler));
    });

    return () => {
        events.cleanup();
        disposers.forEach(d => d());
    };
}
```

---

## Styling the Fallback UI

The fallback renders with `role="alert"` and the CSS classes `.error-boundary`, `.error-boundary__title`, `.error-boundary__detail`, and `.error-boundary__reset`. Because `<nc-error-boundary>` uses Shadow DOM, you can override these via CSS custom properties on the host:

```css
/* src/styles/main.css */
nc-error-boundary {
    --danger: #b91c1c;       /* custom red for your design system */
    --radius-md: 0.75rem;
    --spacing-lg: 2rem;
}
```

---

## Limitations

`<nc-error-boundary>` catches:
- Synchronous errors thrown during `onMount()` and `render()` of **direct** child custom elements.
- Errors dispatched as `ErrorEvent` on the boundary element via `el.dispatchEvent(new ErrorEvent('error', { error }))`.
- Errors reported via `catchError()`.

It does **not** automatically catch:
- Async errors (rejected promises, `async onMount()` rejections) unless the component explicitly calls `catchError()`.
- Errors in grandchild or deeper descendants (unless an intermediate component re-throws or calls `catchError()`).

> **Tip:** For async errors, add a `try / catch` in the async method and call `this.closest('nc-error-boundary')?.catchError(err)`. This pattern is shown in the `<live-feed>` example above.

---

**What's Next:** This is the final chapter of the core framework reference. For a complete feature comparison and performance analysis vs React, Vue, Svelte, and SolidJS see the project README.
