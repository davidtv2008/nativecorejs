# Chapter 34 — Building Plugins

> **What you'll build in this chapter:** Build an analytics plugin and a feature-flags plugin for EnterpriseKit, register them before `router.start()`, and verify that `unregisterPlugin('analytics')` cleanly removes the plugin.

The NativeCoreJS plugin system lets you extend the framework with cross-cutting behaviour — analytics, error monitoring, performance tracing, feature flags, A/B testing, and more — without modifying the router or state source code, and without coupling that behaviour to any individual controller.

A plugin is a plain object. It has a name and one or more optional lifecycle hooks. You install it with one function call before the router starts.

---

## Why Plugins Instead of Middleware?

Router middleware is great for *navigation control* — blocking, redirecting, or conditionally loading data. But middleware runs per-navigation as a pipeline step, which makes it awkward for:

- Initialising a third-party SDK once at app startup.
- Sending analytics events *after* the controller has run and the page has rendered.
- Reacting to state changes across all routes without touching individual controllers.
- Providing a clean uninstall path (for testing or dynamic feature flags).

Plugins solve all of these cleanly.

---

## The NCPlugin Interface

```typescript
export interface NCPlugin {
    /** Unique name — registering two plugins with the same name throws. */
    name: string;

    /**
     * Called once immediately after registerPlugin() is called.
     * Return a cleanup function to be called by unregisterPlugin().
     */
    onInstall?: () => (() => void) | void;

    /**
     * Called on every navigation, before the page controller runs.
     * Read-only — cannot cancel navigation (use router middleware for that).
     */
    onNavigate?: (ctx: NCPluginNavigateContext) => void;

    /**
     * Called on every navigation, after the controller has run
     * and the pageloaded event has fired.
     */
    onNavigated?: (ctx: NCPluginNavigateContext) => void;
}

export interface NCPluginNavigateContext {
    path: string;                        // matched route pattern, e.g. '/tasks/:id'
    params: Record<string, string>;      // extracted URL params, e.g. { id: '42' }
    match: RouteMatch;                   // full router match object
}
```

---

## Registering a Plugin

Call `registerPlugin()` in `src/app.ts`, before `router.start()`.

```typescript
// src/app.ts
import { registerPlugin } from 'nativecorejs';
import { analyticsPlugin } from './plugins/analytics.plugin.js';
import { errorMonitorPlugin } from './plugins/error-monitor.plugin.js';

registerPlugin(analyticsPlugin);
registerPlugin(errorMonitorPlugin);

// ... router setup ...
router.start();
```

Attempting to register two plugins with the same `name` throws immediately:

```
Error: NCPlugin "analytics" is already registered. Use a unique name.
```

---

## A Complete Example: Analytics Plugin

```typescript
// src/plugins/analytics.plugin.ts
import type { NCPlugin } from 'nativecorejs';
import analytics from 'your-analytics-sdk';

export const analyticsPlugin: NCPlugin = {
    name: 'analytics',

    onInstall() {
        // Replace 'your-analytics-sdk' with your actual SDK package,
        // e.g. '@segment/analytics-next', 'posthog-js', or 'mixpanel-browser'.
        analytics.init({ key: import.meta.env.ANALYTICS_KEY });
        // Return a cleanup function — called by unregisterPlugin('analytics')
        return () => analytics.reset();
    },

    onNavigated({ path, params }) {
        analytics.page(path, { params });
    },
};
```

---

## A Complete Example: Performance Tracing Plugin

```typescript
// src/plugins/perf-trace.plugin.ts
import type { NCPlugin } from 'nativecorejs';

const navigationStartTimes = new Map<string, number>();

export const perfTracePlugin: NCPlugin = {
    name: 'perf-trace',

    onNavigate({ path }) {
        navigationStartTimes.set(path, performance.now());
    },

    onNavigated({ path }) {
        const start = navigationStartTimes.get(path);
        if (start !== undefined) {
            const duration = performance.now() - start;
            console.debug(`[perf] ${path} rendered in ${duration.toFixed(1)}ms`);
            navigationStartTimes.delete(path);
        }
    },
};
```

---

## A Complete Example: Feature Flags Plugin

```typescript
// src/plugins/feature-flags.plugin.ts
import type { NCPlugin } from 'nativecorejs';

interface FeatureFlags {
    newDashboard: boolean;
    betaExport: boolean;
}

let flags: FeatureFlags = { newDashboard: false, betaExport: false };

export function isEnabled(flag: keyof FeatureFlags): boolean {
    return flags[flag] ?? false;
}

export const featureFlagsPlugin: NCPlugin = {
    name: 'feature-flags',

    async onInstall() {
        // Fetch flags once at startup; re-fetch on navigation if you need fresh flags.
        flags = await fetch('/api/feature-flags').then(r => r.json());
    },
};
```

Using the flag in a controller:

```typescript
// src/controllers/dashboard.controller.ts
import { isEnabled } from '../plugins/feature-flags.plugin.js';

export async function dashboardController() {
    if (isEnabled('newDashboard')) {
        // render new dashboard
    } else {
        // render classic dashboard
    }
}
```

---

## Unregistering a Plugin

Call `unregisterPlugin(name)` to remove a plugin and run its cleanup:

```typescript
import { unregisterPlugin } from 'nativecorejs';

unregisterPlugin('analytics'); // runs the cleanup function returned by onInstall()
```

Useful in tests when you want to reset plugin state between test cases:

```typescript
beforeEach(() => {
    registerPlugin(myPlugin);
});

afterEach(() => {
    unregisterPlugin(myPlugin.name);
});
```

---

## Listing Registered Plugins

```typescript
import { listPlugins } from 'nativecorejs';
console.log(listPlugins()); // ['analytics', 'perf-trace', 'feature-flags']
```

Useful for dev-tools diagnostics and CI assertions.

---

## Publishing a Plugin to npm

The recommended naming convention is `nativecorejs-plugin-<name>`.

A minimal `package.json` for a plugin package:

```json
{
  "name": "nativecorejs-plugin-analytics",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "peerDependencies": {
    "nativecorejs": ">=0.1.0"
  }
}
```

Declare `nativecorejs` as a peer dependency so that consumers only have one copy of the runtime in their bundle.

---

## Hook Execution Order

1. `router.use(middleware)` — middleware fires first (can cancel navigation).
2. Route loader (`loader` in `RouteConfig`) — fetches data.
3. `onNavigate` on all plugins — fires before the controller.
4. Page controller runs.
5. `pageloaded` event fires.
6. `onNavigated` on all plugins — fires after the controller.

---

## Error Isolation

Each plugin hook is wrapped in a `try/catch`. If a plugin's hook throws, the error is logged as a warning (`console.warn`) and the next plugin's hook runs. A misbehaving plugin cannot break navigation.

---

## Plugin Hooks Are Read-Only

Plugin hooks cannot modify route behaviour. If you need to *block* navigation (e.g. for an unsaved-changes guard), use `router.use()` middleware instead. Plugins observe; middleware controls.

---

## Done Criteria

- [ ] `analyticsPlugin` calls `console.log('pageview:', ctx.path)` (or a real analytics endpoint) on every `onNavigated`.
- [ ] `featureFlagPlugin` fetches flags in `onInstall` and exposes `isEnabled(flag)` globally.
- [ ] Both plugins are registered in `src/app.ts` before `router.start()`.
- [ ] `unregisterPlugin('analytics')` removes the plugin and no further pageview events are logged.

---

**Back:** [Chapter 33 — SSG and Static Deployment](./33-ssg-and-deployment.md)  
**Next:** [Chapter 35 — Enterprise Architecture](./35-enterprise-architecture.md)
