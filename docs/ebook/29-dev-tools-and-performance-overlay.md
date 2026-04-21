# Chapter 29 — Dev Tools and the Performance Overlay

NativeCoreJS ships with a built-in developer tooling layer that is only ever active on `localhost` and is completely stripped from production builds. This chapter covers everything it provides: the component inspector, the outline panel, HMR, and — the focus of this chapter — the **Performance Overlay**, a live terminal-style HUD that helps you catch memory leaks, slow routes, long-running tasks, and API failures before they reach users.

In addition to the dev-overlay, the framework now ships a small **in-page DevTools panel** (`mountDevTools()`) that runs without any browser extension. It adds a floating panel with three tabs — **Stores**, **Components**, and **Router** — lets you inspect and mutate any `createStore()` value live, highlights mounted `nc-*` elements when you hover over them, and shows the current route/query. Because it lives inside a closed Shadow Root it never clashes with your app's styles, and because it is opt-in you decide when and how to load it.

```typescript
// src/app.ts — only during local development
if (isLocalhost()) {
    import('nativecorejs').then(({ mountDevTools }) => {
        mountDevTools({ hotkey: { ctrl: true, shift: true, key: 'D' } });
    });
}
```

Press `Ctrl+Shift+D` to toggle the panel. Use the JSON editor in the Stores tab to experiment with reducer-style mutations without reloading the app.

---

## 29.1 How Dev Tools Load

All developer tooling is imported dynamically inside `initDevTools()` in `src/app.ts`:

```typescript
function initDevTools(): void {
    if (!isLocalhost()) {
        return; // hard guard — nothing below runs in production
    }

    Promise.all([
        import('../.nativecore/hmr.js'),
        import('../.nativecore/denc-tools.js'),
        import('./utils/devOverlay.js'),
    ])
        .then(([, , { initDevOverlay }]) => {
            (window as any).__NATIVECORE_DEV__ = true;
            initDevOverlay();
        })
        .catch(() => {
            // Dev tools not available — production build or stripped bundle.
        });
}
```

Three things load together:

| Module | Responsibility |
|---|---|
| `hmr.js` | Hot Module Replacement — reloads changed files without a full page refresh |
| `denc-tools.js` | Component inspector, outline panel, and the DEV MODE toggle button |
| `devOverlay.js` | Performance overlay HUD (this chapter's focus) |

`isLocalhost()` checks the hostname against `localhost`, `127.0.0.1`, `192.168.*`, and `*.local`. If the check fails the function returns immediately and none of the three imports are even attempted. The production build script additionally strips the entire `.nativecore/` import block from the compiled output via `tsconfig.build.json`, which excludes the entire `.nativecore/` directory.

---

## 29.2 The DEV MODE Toggle

When dev tools load you will see a small pill button at the bottom of the screen:

```
DEV MODE: OFF
```

Clicking it toggles the entire dev tooling layer on or off and saves the preference to `localStorage` under the key `nativecore-devtools-visible`. The preference survives page refreshes and persists across navigations.

**Default state is OFF.** This is intentional — a freshly scaffolded project starts with dev tools silent so you are not interrupted during initial setup. Enable it once and it stays on for that project on that machine.

When toggled ON:

- The component overlay activates (hover over any component to see its edit icon)
- The outline panel tab appears on the left side
- The **Performance Overlay** appears in the bottom-left corner

When toggled OFF, all three disappear cleanly.

---

## 29.3 The Performance Overlay

The overlay is a small semi-transparent dark panel fixed to the bottom-left corner of the viewport. It displays ten live metrics and is always visible while DEV MODE is on — you never have to open a separate tool or remember a keyboard shortcut.

It is draggable. Hold and drag anywhere on the panel to reposition it.

Every metric row is clickable. Clicking opens a detail modal with historical data, sparkline charts, and context-specific guidance.

### The Ten Metrics

#### FPS — Frame Rate

```
FPS    60
```

Updated every 500 ms. Color coded:
- Green: ≥ 55 fps — smooth
- Yellow: ≥ 30 fps — acceptable
- Red: < 30 fps — janky, investigate

**Detail modal** shows average, min, and max over the last 30 seconds, the count of samples that dropped below 30 fps, and a sparkline chart of the full 30-second history.

#### MEM — JS Heap (Chrome only)

```
MEM    24.3 / 4096 MB
```

Shows `used / limit` from the `performance.memory` API. Color coded by heap pressure (green < 50%, yellow < 75%, red ≥ 75%). Not available in Firefox or Safari — the row is hidden if the API is absent.

**Detail modal** shows used, allocated, limit, and usage percentage, plus a sparkline trend over the last 30 seconds.

> **Tip:** Watch the MEM trend while navigating between routes. If memory climbs after each navigation without dropping back, you have a controller or component that is not cleaning up properly.

#### DOM — Node Count

```
DOM    1,842 (+34)
```

Total number of DOM nodes currently on the page. The number in parentheses is the delta since the last route change. Color coded:
- Muted: no change or small delta
- Yellow: delta > 20
- Red: delta > 100

**Detail modal** shows the current count, the delta, and a guidance section explaining common causes of DOM growth (missing controller cleanup, components not calling `onUnmount`).

> **The most practical leak detector in the overlay.** If DOM count grows after every navigation without returning to the baseline from the previous route, something is not cleaning up injected HTML.

#### COMPONENTS — Mounted Web Components

```
COMPONENTS    12
```

Count of all currently mounted custom elements (tags containing a hyphen) found in the live document.

**Detail modal** lists every component tag currently on the page with a count if multiple instances are mounted — for example `nc-button ×4`, `task-card ×8`.

#### FCP / LCP — Paint Timing

```
FCP    420ms
LCP    810ms
```

First Contentful Paint and Largest Contentful Paint from the `PerformanceObserver` API. LCP updates on each navigation as the browser identifies a new largest element. Color coded against Core Web Vitals thresholds:

| Metric | Good | Needs Improvement | Poor |
|---|---|---|---|
| FCP | < 1.8s | 1.8s – 3s | > 3s |
| LCP | < 2.5s | 2.5s – 4s | > 4s |

**Detail modal** shows the raw time and the Core Web Vitals rating for each metric.

#### ROUTE — Last Navigation Duration

```
ROUTE    38ms
```

Time elapsed between the `popstate` event and the `pageloaded` event dispatched by the router at the end of each navigation. This covers the full round trip: fetching the HTML view template, running the controller, and rendering.

**Detail modal** shows the full navigation history for the session — path, duration, and timestamp for each navigation — newest first.

#### LONG TASKS — Main Thread Blocking

```
LONG TASKS    3
```

Count of tasks that took longer than 50 ms on the main thread, measured by the `PerformanceObserver` `longtask` entry type. The count blinks red for 2 seconds after a new long task is detected. Not available in Firefox or Safari.

**Detail modal** shows every recorded long task with its duration and timestamp, plus a note about common causes (heavy loops, large DOM mutations, synchronous operations in controllers).

#### NET — Fetch Activity

```
NET    200  12ms
```

Shows the HTTP status and duration of the most recent `fetch` call. The overlay patches `window.fetch` on startup so every request made anywhere in the app is captured automatically — your `api.service.ts` calls, auth verify calls, everything.

**Detail modal** shows:
- Pending fetch count (how many requests are currently in-flight)
- Total failed request count (non-2xx responses)
- A log of the last 20 API calls: method, URL, status, and duration

#### ERRORS — Console & Unhandled Rejections

```
ERRORS    0 / 0w
```

Format is `errors / warnings`. The overlay patches `console.error` and `console.warn` on startup and also listens for `unhandledrejection` events. All three sources feed the same log.

The error count turns red (and blinks) if any errors are present. The warning count turns yellow if warnings are present.

**Detail modal** shows a breakdown by type and a timestamped log of the last 50 messages.

> **This is the single most useful metric for catching silent failures.** An API call can fail, a component can throw an internal error, and a promise can reject — all without any visible UI change. The error counter catches all three.

#### CONN — Network Connection (Chrome/Edge only)

```
CONN    4g
```

The effective connection type from the `navigator.connection` API (`4g`, `3g`, `2g`, `slow-2g`). Reminds you that you are developing on fast local WiFi while your users may be on a mobile connection.

**Detail modal** shows effective type, downlink speed in Mbps, round-trip time, and whether the user has the `Save-Data` header preference enabled.

---

## 29.4 Reading the Overlay in Practice

### Diagnosing a memory leak

1. Enable DEV MODE and navigate to any route
2. Note the **DOM** node count
3. Navigate away to another route — count should drop back close to the previous baseline
4. If it keeps climbing: open the DOM detail modal — the delta will show you the magnitude
5. Check your controller's cleanup function — is it removing all injected HTML?
6. Check any components that mount on that route — are they calling `onUnmount()` and cleaning up state watchers?

### Diagnosing a slow route

1. Navigate to the page in question
2. Check **ROUTE** — a fast route should be under 100ms; anything over 300ms warrants investigation  
3. Check **NET** detail modal — is there a slow API call on that route?
4. Check **LONG TASKS** — is a heavy render loop or data transformation blocking the main thread?

### Diagnosing a paint regression

1. Do a hard reload (Ctrl+Shift+R / Cmd+Shift+R to clear cache)
2. Check **FCP** and **LCP** — compare against the Core Web Vitals thresholds
3. A slow FCP usually means a large synchronous script or render-blocking resource
4. A slow LCP on a page with a hero image usually means the image is not preloaded or is too large

### Catching silent API failures

1. Perform the user action that should trigger a request
2. Check **NET** — the last call's status code is visible directly on the overlay
3. If you see a 4xx or 5xx, click NET to open the detail modal and inspect the full URL and duration
4. Check **ERRORS** — if the failure triggered an unhandled promise rejection it will appear there too

---

## 29.5 The Detail Modals

Every metric row in the overlay is clickable. Clicking opens a focused modal panel in the center of the screen with deeper information.

**Closing modals:**
- Click anywhere outside the modal box
- Press `Escape`
- Click the × in the top-right corner of the modal

The overlay remains visible behind the open modal and continues updating live. Closing the modal returns you to the overlay without resetting any state.

---

## 29.6 The Component Inspector

While the Performance Overlay focuses on runtime metrics, the component inspector (part of `denc-tools.ts`) focuses on editing component markup and styles visually. It is activated by the same DEV MODE toggle.

When active, hovering over any custom element in the browser renders a subtle highlight with an edit icon. Clicking the icon opens the component editor modal, which provides:

- A live attribute editor for every declared attribute
- CSS variable overrides that apply in real time
- A save button that writes changes back to the source `.ts` file via the dev server API

This is covered in detail in Chapter 24 (CLI Mastery and the Generator Workflow).

---

## 29.7 The Outline Panel

The outline panel is a collapsible left-side drawer that shows the full DOM tree of the current page. It highlights custom elements, shows their nesting, and lets you click into the component editor from the tree view.

It opens and closes via the tab on the left edge of the screen (visible only when DEV MODE is on). It is also activated automatically when you click the edit icon on a component — the tree expands to the selected element.

---

## 29.8 Production Safety

The dev tooling layer has multiple layers of protection against leaking into production:

**Runtime guard** — `isLocalhost()` in `app.ts` must return `true` for dev tools to load. A deployed app on any real domain never reaches the dynamic imports.

**Build-time exclusion** — `tsconfig.build.json` excludes the `.nativecore/` directory entirely. The `denc-tools.ts`, `hmr.ts`, `outline-panel.ts`, and `component-overlay.ts` files are not compiled and do not appear in the production bundle.

**Strip-dev script** — The `npm run build` pipeline runs `remove-dev.mjs` after compilation, which removes any remaining dev-only blocks from the output.

**Dynamic import** — Even if the hostname check were somehow bypassed, the dev modules are loaded with `import()` — they are separate files that the browser only fetches if the code path is reached. A production bundle has no reference to them.

You do not need to do anything special to keep the overlay out of production. It is excluded automatically.

---

## 29.9 Architecture Reference

| File | Location | Purpose |
|---|---|---|
| `devOverlay.ts` | `src/utils/devOverlay.ts` | Performance overlay — HUD, modals, all instrumentation |
| `denc-tools.ts` | `.nativecore/denc-tools.ts` | Component inspector, outline panel, DEV MODE toggle |
| `hmr.ts` | `.nativecore/hmr.ts` | Hot Module Replacement via WebSocket |
| `outline-panel.ts` | `.nativecore/outline-panel.ts` | Left-side DOM tree panel |
| `component-overlay.ts` | `.nativecore/component-overlay.ts` | Hover-to-inspect highlight layer |
| `component-editor.ts` | `.nativecore/component-editor.ts` | Attribute and CSS variable editor modal |

The overlay communicates with the denc-tools toggle via a custom DOM event:

```typescript
// denc-tools.ts dispatches when the DEV MODE button is clicked:
document.dispatchEvent(new CustomEvent('nc-devtools-visibility', {
    detail: { visible: true | false }
}));

// devOverlay.ts listens and shows/hides accordingly:
document.addEventListener('nc-devtools-visibility', (e) => {
    const visible = (e as CustomEvent<{ visible: boolean }>).detail.visible;
    if (visible) showOverlay();
    else hideOverlay();
});
```

The localStorage key `nativecore-devtools-visible` is the shared source of truth for the toggle state. Both modules read from it on startup. The denc-tools module writes to it on every toggle.

---

## Summary

- Dev tools are localhost-only and load via dynamic imports — they never reach production
- The DEV MODE toggle is off by default; enable it once and the preference is saved
- The Performance Overlay provides ten live metrics: FPS, MEM, DOM, COMPONENTS, FCP, LCP, ROUTE, LONG TASKS, NET, and ERRORS
- Every metric row is clickable and opens a detail modal with historical data and guidance
- The DOM node delta is the fastest way to detect controller and component cleanup failures
- The ERRORS counter catches silent failures that produce no visible UI change
- The NET log captures every `fetch` call transparently — no changes to your service code required

---

## Apply This Chapter to Project 4 — EnterpriseKit

> **Project:** EnterpriseKit — Internal Tools Platform  
> **Feature:** Profile EnterpriseKit routes with the performance overlay and optimize a slow route.

Enable DEV MODE in the performance overlay on the EnterpriseKit dashboard. Identify the route with the highest ROUTE time. Open its controller and reduce the initialization time by either using a `loader` for mandatory data or deferring a non-critical fetch to after first paint. Confirm the overlay is absent in `npm run build` output.

### Done Criteria

- [ ] DEV MODE is toggled on and the overlay is visible on the EnterpriseKit dashboard route.
- [ ] At least one route's ROUTE time is visible in the overlay and logged to the console.
- [ ] The slowest route's controller is optimized and the ROUTE time measurably decreases.
- [ ] `npm run build` output has no reference to dev tools (confirm by inspecting `dist/app.js`).

---

**Back:** [Chapter 28 — Troubleshooting Guide](./28-troubleshooting.md)  
**Next:** [Chapter 30 — Migration Guide](./30-migration-guide.md)
