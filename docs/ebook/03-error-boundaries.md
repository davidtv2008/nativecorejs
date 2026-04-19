# Chapter 03 — Error Boundaries

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
│  component  sales-chart                               │
│  route      /dashboard                                │
│  url        /dashboard                                │
│                                                       │
│  at SalesChart.onMount (sales-chart.ts:42)            │
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
document.querySelector('nc-error-boundary')?.addEventListener('nc-error', (e: Event) => {
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
const boundary = document.querySelector('nc-error-boundary') as any;
boundary.reset();
```

---

## Reporting Errors From Inside a Component

Components can proactively report errors to the nearest boundary — useful for async failures that happen after `onMount()` returns:

```typescript
// src/components/ui/live-feed.ts
export class LiveFeed extends Component {
    static useShadowDOM = true;

    async onMount(): Promise<void> {
        try {
            const data = await fetch('/api/feed').then(r => r.json());
            this.setState({ items: data });
        } catch (err) {
            this.closest('nc-error-boundary')?.catchError(err, {
                component: 'live-feed',
                source: 'component',
            });
        }
    }

    template(): string { return `<div class="feed">...</div>`; }
}

defineComponent('live-feed', LiveFeed);
```

`catchError(error, meta?)` accepts an optional second argument that merges into the `NcErrorDetail` shown in the dev panel.

---

## Nested Boundaries

The root boundary is the catch-all. You can add nested boundaries to isolate individual widgets — a failure in `<sales-chart>` will be caught by the nearest boundary and will not propagate up to the root:

```html
<div class="dashboard-grid">
    <nc-error-boundary mode="dev" fallback="Chart unavailable">
        <sales-chart></sales-chart>
    </nc-error-boundary>

    <nc-error-boundary mode="dev" fallback="Tasks could not be loaded">
        <task-list></task-list>
    </nc-error-boundary>
</div>
```

> Nested boundaries only receive `nativecore:component-error` events that bubble up through the DOM. Only the root boundary (direct child of `<body>` or outermost boundary) also hooks `window.onerror` and `window.unhandledrejection`.

---

## Build-Time Mode Swap

`npm run build` automatically replaces `mode="dev"` with `mode="production"` in all output HTML files. This is handled by `.nativecore/scripts/strip-dev-blocks.mjs` — the same script that strips `<!-- DEnc-ONLY-START -->` dev-only blocks.

You never need to manually change the attribute — just leave `mode="dev"` in your source and the build handles it.

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

**Back:** [Chapter 02 — First Component](./02-first-component.md)
**Next:** [Chapter 04 — Reactive State](./04-reactive-state.md)

