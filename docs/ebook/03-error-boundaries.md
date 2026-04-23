# Chapter 03 — Error Boundaries

> **What you'll build in this chapter:** Add a root error boundary to Taskflow's `index.html` and a nested boundary around the dashboard stats area, so that component failures show a developer-friendly debug panel in dev mode and a clean fallback message in production.

NativeCoreJS ships `<nc-error-boundary>` as a first-class, zero-config safety net. Every new project scaffolds one at the root of the shell HTML automatically. It catches component lifecycle failures, router/controller errors, global JS exceptions, and unhandled promise rejections — then renders a developer-friendly debug panel in dev mode or a graceful fallback in production.

---

## How It Works

Unlike React's error boundaries (which rely on a reconciler), NativeCoreJS wires errors through the framework itself:

- **Component failures** — `connectedCallback` in the base `Component` class wraps `render()` + `onMount()` in a try/catch and dispatches `nativecore:component-error` (bubbles + composed) on the failing element.
- **Router/controller failures** — the router's `loadPage` catch block dispatches `nativecore:route-error` on `window`.
- **Global errors** — `window.onerror` and `window.unhandledrejection` are hooked when the boundary is placed at the root of the page.

`<nc-error-boundary>` listens for all three event types and renders accordingly. You don't need to do anything in your components or controllers — it's automatic.

---

## Root Boundary (Default Setup)

Every new project gets a root boundary in `index.html` wrapping `#main-content`:

```html
<!-- index.html (scaffolded automatically) -->
<main class="main-content">
    <nc-error-boundary mode="dev">
        <div id="main-content" class="page">
            <loading-spinner message="Loading page..."></loading-spinner>
        </div>
    </nc-error-boundary>
    <app-footer></app-footer>
</main>
```

The `mode="dev"` attribute is stripped and replaced with `mode="production"` automatically when you run `npm run build`.

> **Apply to Taskflow — check `index.html`**
> Open `index.html` in the Taskflow project and confirm the root boundary is present. Because the CLI scaffolds it automatically, it should already be there wrapping `#main-content`. If you scaffolded without auth flow and the boundary is missing, add the `<nc-error-boundary mode="dev">` wrapper now.

---

## The `mode` Attribute

| Value | Behavior |
|---|---|
| `"dev"` | Full debug panel: error message, source badge, component name, route, current URL, and up to 12 lines of stack trace |
| `"production"` | Clean centered fallback with a "Try again" button — no technical details exposed to end users |

### Dev mode output

When an error is caught in dev mode, the boundary renders a dark terminal-style panel:

```
╔─ Runtime Error ─────────────────────── [component] ─╗
│                                                       │
│  Cannot read properties of undefined (reading 'map') │
│                                                       │
│  component  task-card                                 │
│  route      /tasks                                    │
│  url        /tasks                                    │
│                                                       │
│  at TaskCard.onMount (task-card.ts:42)                │
│  at Component.connectedCallback (component.ts:41)     │
│  ...                                                  │
│                                                       │
│  This panel is only visible in dev mode.  [Try again] │
╚───────────────────────────────────────────────────────╝
```

Source badge colors: purple = `component`, blue = `route`, red = `global`, amber = `promise`.

### Production mode output

A minimal, user-friendly fallback — no stack trace, no internal paths:

```
        Something went wrong

  Please try again. If the problem persists,
  contact support.

           [ Try again ]
```

---

## Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `mode` | `"dev"` \| `"production"` | `"dev"` | Controls the error UI rendered |
| `fallback` | string | `"Something went wrong"` | Heading text shown in production mode |

```html
<!-- Custom production fallback message -->
<nc-error-boundary mode="production" fallback="Dashboard failed to load">
    <div id="main-content"></div>
</nc-error-boundary>
```

---

## Events

| Event | Detail type | Description |
|---|---|---|
| `nc-error` | `NcErrorDetail` | Fires when any error is caught |
| `nc-error-reset` | `{}` | Fires after `reset()` is called |

The `NcErrorDetail` shape:

```typescript
interface NcErrorDetail {
    error: unknown;
    message: string;
    stack?: string;
    component?: string;   // tag name, when error came from a component
    route?: string;       // pathname, when error came from the router
    source?: 'component' | 'route' | 'global' | 'promise';
}
```

Listen to `nc-error` to forward errors to a monitoring service:

```typescript
// In a controller or app shell setup
import { trackEvents } from '@core-utils/events.js';

const events = trackEvents();
events.on('nc-error-boundary', 'nc-error', (e: Event) => {
    const detail = (e as CustomEvent<NcErrorDetail>).detail;
    monitoring.captureException(detail.error, {
        tags: { source: detail.source, route: detail.route }
    });
});
```

---

## Programmatic Reset

The boundary renders a **"Try again"** button in both modes. Clicking it calls `reset()`, which restores the original child HTML and attempts to re-mount.

You can also call `reset()` from a controller:

```typescript
import { dom } from '@core-utils/dom.js';

const boundary = dom.query<HTMLElement & { reset(): void }>('nc-error-boundary');
boundary?.reset();
```

---

## Reporting Errors From Inside a Component

Components can proactively report errors to the nearest boundary — useful for async failures that happen after `onMount()` returns:

> **Apply to Taskflow — trigger a test error**
> Open `src/components/ui/task-card.ts` and temporarily add `throw new Error('test boundary')` as the first line of `onMount()`. Save, and navigate to a route that renders `<task-card>`. You should see the dev panel appear with the error message and component name. Remove the throw when you're done — this is just a smoke test to confirm your boundaries are wired correctly.

If `task-card` were loading its own data asynchronously (e.g. fetching task details by `task-id` attribute), you would catch async failures and forward them to the boundary manually, since `async onMount()` rejections are not caught automatically:

```typescript
// src/components/ui/task-card.ts
async onMount(): Promise<void> {
    const taskId = this.getAttribute('task-id');
    try {
        const task = await api.get(`/tasks/${taskId}`);
        this.titleState.value = task.title;
        this.descriptionState.value = task.description;
        this.statusState.value = task.status;
    } catch (err) {
        this.closest('nc-error-boundary')?.catchError(err, {
            component: 'task-card',
            source: 'component',
        });
    }
}
```

`catchError(error, meta?)` accepts an optional second argument that merges into the `NcErrorDetail` shown in the dev panel.

---

## Nested Boundaries

The root boundary is the catch-all. You can add nested boundaries to isolate individual sections — a failure in one `<task-card>` will be caught by the nearest boundary and will not propagate up to the root:

```html
<!-- src/views/protected/tasks.html -->
<div class="tasks-page" data-view="tasks">
    <h1>My Tasks</h1>

    <nc-error-boundary mode="dev" fallback="Task could not be loaded">
        <task-card
            title="Set up NativeCoreJS project"
            description="Scaffold the Taskflow app using the CLI."
            status="done"
        >
            <div slot="actions">
                <nc-button variant="outline" data-action="delete-task">Delete</nc-button>
            </div>
        </task-card>
    </nc-error-boundary>

    <nc-error-boundary mode="dev" fallback="Task could not be loaded">
        <task-card
            title="Build task-card component"
            description="Implement the component with Shadow DOM and attributes."
            status="in-progress"
        ></task-card>
    </nc-error-boundary>
</div>
```

> Nested boundaries only receive `nativecore:component-error` events that bubble up through the DOM. Only the root boundary (direct child of `<body>` or outermost boundary) also hooks `window.onerror` and `window.unhandledrejection`.

> **Apply to Taskflow — add a nested boundary in `tasks.html`**
> Open `src/views/protected/tasks.html`. Wrap each `<task-card>` in its own boundary so a failure in one card doesn't take down the entire task list:
>
> ```html
> <nc-error-boundary mode="dev" fallback="Task could not be loaded">
>   <task-card title="..." description="..." status="..."></task-card>
> </nc-error-boundary>
> ```
>
> This isolates each card — if one throws, the others continue rendering normally.

---

## Build-Time Mode Swap

`npm run build` automatically replaces `mode="dev"` with `mode="production"` in all output HTML files. This is handled by `.nativecore/scripts/strip-dev-blocks.mjs` — the same script that strips `<!-- DEnc-ONLY-START -->` dev-only blocks.

You never need to manually change the attribute — just leave `mode="dev"` in your source and the build handles it.

> **Apply to Taskflow — verify the build swap**
> Run `npm run build` in the Taskflow project. Then open `dist/index.html` and confirm that `mode="dev"` has been replaced with `mode="production"`. This is the only place in Taskflow where you need to verify the build swap — all other error boundary instances get the same treatment.

---

## What Is and Isn't Caught Automatically

| Scenario | Caught automatically? |
|---|---|
| `onMount()` throws synchronously | Yes — via `connectedCallback` try/catch |
| `template()` throws synchronously | Yes — via `connectedCallback` try/catch |
| Controller throws during route load | Yes — via router `loadPage` catch |
| `async onMount()` rejects | No — call `catchError()` manually |
| Fetch inside a controller rejects | Yes — if it propagates to router catch |
| Random `setTimeout` callback throws | Yes — via `window.onerror` (root boundary only) |
| Unhandled promise rejection | Yes — via `unhandledrejection` (root boundary only) |

---

## Done Criteria

- [ ] `<nc-error-boundary mode="dev">` wraps `#main-content` in `index.html`.
- [ ] Nested boundaries wrap each `<task-card>` in `tasks.html`.
- [ ] Adding `throw new Error('test')` in `<task-card>.onMount()` shows the debug panel.
- [ ] `npm run build` swaps `mode="dev"` to `mode="production"` in the compiled HTML output.

---

**Back:** [Chapter 02 — First Component](./02-first-component.md)
**Next:** [Chapter 04 — Reactive State](./04-reactive-state.md)

