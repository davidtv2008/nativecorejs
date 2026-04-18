# Chapter 16 — Router Middleware and Navigation Guards

Controllers run *after* navigation completes. Sometimes you need code that runs *before* — to check permissions, log the event, or ask the user if they're sure they want to leave. That's middleware.

NativeCoreJS middleware is a chain of functions the router invokes before every navigation. Each function can allow the navigation to proceed, redirect the user somewhere else, or cancel entirely.

---

## What Middleware Is

You register middleware with `router.use()`:

```typescript
router.use(middlewareFn);
```

Every registered middleware runs sequentially before the router loads the target view. If any middleware returns `false`, the navigation is cancelled and the current view stays on screen.

---

## The Middleware Signature

```typescript
type Middleware = (
    route: RouteMatch,
    state?: unknown
) => Promise<boolean> | boolean;
```

`RouteMatch` gives you everything you need to make a decision:

```typescript
type RouteMatch = {
    path: string;                      // the matched registered path, e.g. '/tasks/:id'
    params: Record<string, string>;    // extracted URL params, e.g. { id: '42' }
    config: RouteConfig;               // the full route registration object
};
```

Use `route.path` to check which route is being navigated to, and `route.params` to inspect dynamic segments. Return `true` (or just don't return `false`) to allow navigation. Return `false` to cancel it.

Middleware can be async — return a `Promise<boolean>` if you need to call an API or check something asynchronous before deciding.

---

## Building an Auth Guard for Taskflow

Authentication is the most common middleware use case. The goal: redirect unauthenticated users to `/login` if they try to access a protected route, and preserve the URL they were trying to reach so you can send them there after login.

```typescript
// src/middleware/auth.middleware.ts
import { router } from '@core/router.js';
import { auth } from '@services/auth.service.js';

const protectedRoutes = [
    '/dashboard',
    '/tasks',
    '/tasks/:id',
    '/projects',
    '/projects/:id/tasks/:taskId?',
    '/settings',
];

export function authMiddleware(route: RouteMatch): boolean {
    const isProtected = protectedRoutes.includes(route.path);

    if (isProtected && !auth.isAuthenticated()) {
        // Redirect to login, pass the intended destination as state
        router.replace('/login', { redirect: route.path });
        return false;
    }

    return true;
}
```

Register it once in your app entry point, before any route configuration:

```typescript
// src/main.ts
import { router } from '@core/router.js';
import { authMiddleware } from './middleware/auth.middleware.js';

router.use(authMiddleware);

// ... register routes ...
```

> **Tip:** `router.replace()` is the right call inside an auth redirect, not `router.navigate()`. `replace()` swaps the current history entry rather than pushing a new one, so the user doesn't see `/login` in their back stack when they eventually reach the dashboard.

---

## Completing the Loop — Redirecting After Login

The auth middleware stores the originally-intended path as navigation state. Read it in the login controller to redirect the user to the right place after a successful login:

```typescript
// src/controllers/login.controller.ts
import { useState, effect } from '@core/state.js';
import { dom } from '@core-utils/dom.js';
import { trackEvents } from '@core-utils/events.js';
import { auth } from '@services/auth.service.js';
import { router } from '@core/router.js';

export async function loginController(
    params: Record<string, string> = {},
    state?: { redirect?: string }
): Promise<() => void> {
    const events = trackEvents();
    const disposers: Array<() => void> = [];
    const scope = dom.data('login');

    const errorMsg = useState('');

    disposers.push(effect(() => {
        const el = scope.hook('error');
        if (el) el.textContent = errorMsg.value;
    }));

    events.onClick('submit', async () => {
        const form = scope.hook('form') as HTMLFormElement;
        const data = new FormData(form);

        try {
            await auth.login(
                data.get('email') as string,
                data.get('password') as string
            );

            // Go where the user originally wanted to go, or fall back to dashboard
            const destination = state?.redirect ?? '/dashboard';
            router.navigate(destination);
        } catch (err) {
            errorMsg.value = 'Invalid email or password.';
        }
    });

    return () => {
        events.cleanup();
        disposers.forEach(d => d());
    };
}
```

The `state` parameter is passed by the router automatically when you used `router.replace('/login', { redirect: route.path })` in the middleware. No query string manipulation needed.

---

## `router.replace()` vs `router.navigate()`

| Method | History effect | Use for |
|---|---|---|
| `router.navigate(path, state?)` | Pushes a new entry | User-initiated navigation, links |
| `router.replace(path, state?)` | Replaces current entry | Redirects, login flows, correcting URLs |
| `router.back()` | Goes to previous entry | Back buttons |

When you are *redirecting* the user (not responding to a click), use `router.replace()`. This ensures that pressing the browser's back button doesn't loop the user back through the redirect.

---

## Building a Logging Middleware

A logging middleware is invaluable during development. It logs every navigation event to the console with the route, params, and any state:

```typescript
// src/middleware/logging.middleware.ts
export function loggingMiddleware(
    route: RouteMatch,
    state?: unknown
): boolean {
    console.log('[Router]', route.path, {
        params: route.params,
        state,
    });
    return true;   // always allow navigation
}
```

Register it after the auth guard:

```typescript
router.use(authMiddleware);
router.use(loggingMiddleware);
```

---

## Building an Analytics Middleware

Report page views to a hypothetical analytics endpoint without touching any controller:

```typescript
// src/middleware/analytics.middleware.ts
import { api } from '@services/api.service.js';

export async function analyticsMiddleware(
    route: RouteMatch
): Promise<boolean> {
    // Fire-and-forget — don't await, don't block navigation
    api.post('/analytics/pageview', {
        path: route.path,
        params: route.params,
        timestamp: Date.now(),
    }).catch(() => {
        // Analytics failures must never break navigation
    });

    return true;
}
```

Because the `api.post()` promise is not awaited, navigation is never delayed by the analytics call. The fire-and-forget pattern is appropriate here — a failed analytics event should not prevent the user from reaching their destination.

---

## Middleware Ordering

Middleware runs in **registration order**. This ordering is significant:

```typescript
router.use(authMiddleware);      // 1st — check auth before anything else
router.use(analyticsMiddleware); // 2nd — only fires for navigations that pass auth
router.use(loggingMiddleware);   // 3rd — logs what actually happens
```

If `authMiddleware` returns `false`, neither `analyticsMiddleware` nor `loggingMiddleware` will run for that navigation. This is usually what you want — don't log or report navigations that were blocked.

> **Warning:** A slow async middleware will delay every navigation. Keep async middleware lightweight. For operations like analytics that don't need to block, fire-and-forget and return `true` immediately.

---

## Building a "Save on Navigate" Guard

If a user has unsaved changes in a form, you want to warn them before navigating away. Middleware is the right place for this guard.

In the controller, expose a shared flag indicating whether there are unsaved changes:

```typescript
// src/stores/form-dirty.store.ts
import { useState } from '@core/state.js';

export const formDirty = useState(false);
```

In the middleware, check the flag and ask the user:

```typescript
// src/middleware/unsaved-changes.middleware.ts
import { formDirty } from '../stores/form-dirty.store.js';

export function unsavedChangesMiddleware(route: RouteMatch): boolean {
    if (!formDirty.value) return true;

    const confirmed = window.confirm(
        'You have unsaved changes. Leave anyway?'
    );

    if (confirmed) {
        formDirty.value = false;   // reset for the next page
        return true;
    }

    return false;   // cancel navigation
}
```

In the form controller, set `formDirty.value = true` when the user starts editing, and `false` when they save or cancel:

```typescript
events.onInput('task-form', () => {
    formDirty.value = true;
});

events.onClick('save', async () => {
    await handleSave();
    formDirty.value = false;
    router.navigate('/tasks');
});
```

Register this middleware selectively or globally depending on how many forms need the protection. Because it reads from a module-level store, it works across all routes without any per-route configuration.

---

## The `state` Param in Middleware

Navigation state flows through the entire middleware chain. When you call:

```typescript
router.navigate('/tasks', { from: 'dashboard', filter: 'overdue' });
```

Every middleware receives that state object as its second argument:

```typescript
export function analyticsMiddleware(
    route: RouteMatch,
    state?: { from?: string; filter?: string }
): boolean {
    if (state?.from) {
        console.log(`Navigated to ${route.path} from ${state.from}`);
    }
    return true;
}
```

State is also available in controllers (as a second argument after `params`), and it persists through `router.replace()` calls — so the auth redirect pattern that stores `{ redirect: '/dashboard' }` in state survives the login middleware chain intact.

---

## What's Next

Middleware gives you full control over what happens before and during navigation. The next architectural challenge is state that needs to survive navigation — data fetched in one controller that should still be available when you come back. Chapter 17 covers global stores: module-level `useState()` that lives for the entire app session, shared read/write access from multiple controllers, and the store patterns that keep Taskflow's state coherent.
