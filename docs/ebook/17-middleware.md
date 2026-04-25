# Chapter 17 — Router Middleware and Navigation Guards

> **What you'll build in this chapter:** Wire up a tag-based middleware system, add a second middleware with `make:middleware`, and build a "save-on-navigate" guard that prevents leaving a form with unsaved changes.

Controllers run *after* navigation completes. Sometimes you need code that runs *before* — to check permissions, log analytics, or ask the user if they're sure they want to leave. That's middleware.

NativeCoreJS middleware is a chain of functions the router invokes before every navigation. Each function can allow the navigation to proceed, redirect the user somewhere else, or cancel entirely.

---

## The Middleware Signature

```javascript
// MiddlewareFunction shape:
// (route, state?) => Promise | boolean
```

`RouteMatch` gives you everything you need to make a decision:

```javascript
// RouteMatch shape:
// { path, params, config }
```

Return `true` to allow navigation. Return `false` to cancel it. Middleware can be async — return a `Promise` if you need to call an API before deciding.

---

## `createMiddleware` — Tag-Based Dispatch

Rather than checking which route is protected inside every middleware function, NativeCoreJS uses a tag dispatch pattern. Routes declare which middleware tags apply to them in `routes.js`:

```javascript
r.group({ middleware: ['auth'] }, (r) => {
    r.register('/dashboard', ...);
    r.register('/tasks', ...);
});
```

And in `app.js`, each middleware function is wrapped with `createMiddleware(tag, fn)`:

```javascript
// @middleware — registered middleware (auto-updated by make:middleware)
router.use(createMiddleware('auth', authMiddleware));
```

`createMiddleware('auth', authMiddleware)` returns a new `MiddlewareFunction` that:
1. Calls `router.getTagsForPath(route.path)` to get the tags on the target route
2. If `'auth'` is not in those tags — returns `true` immediately (not this middleware's concern)
3. If `'auth'` is present — calls `authMiddleware(route, state)` and returns its result

This means `authMiddleware` itself doesn't need to know which routes require auth. It just implements the logic:

```javascript
// src/middleware/auth.middleware.js
import auth from '@services/auth.service.js';
import router from '@core/router.js';

export async function authMiddleware(route) {
    if (!auth.isAuthenticated()) {
        router.replace('/login', { redirect: route.path });
        return false;
    }
    return true;
}
```

> **Tip:** `router.replace()` is right for auth redirects, not `router.navigate()`. `replace()` swaps the current history entry so the user doesn't see `/login` in their back stack when they reach the dashboard.

---

## `npm run make:middleware`

To add a new middleware, use the generator:

```bash
npm run make:middleware verified
```

This:
1. Creates `src/middleware/verified.middleware.js` with the correct signature
2. Adds the import to `src/app.js`
3. Inserts `router.use(createMiddleware('verified', verifiedMiddleware))` after the `// @middleware` sentinel in `app.js`

```
✔ Created: src/middleware/verified.middleware.js
✔ Added import to src/app.js
✔ Added router.use(createMiddleware('verified', verifiedMiddleware)) to src/app.js
```

Then apply the tag in `routes.js`:

```javascript
r.group({ middleware: ['auth'] }, (r) => {
    r.register('/settings/billing', ...);
});
```

Or combine multiple tags on one group:

```javascript
r.group({ middleware: ['auth', 'verified'] }, (r) => {
    r.register('/settings/billing', ...);
});
```

Both `authMiddleware` and `verifiedMiddleware` will run for that route — in registration order.

---

## Completing the Loop — Redirecting After Login

The auth middleware stores the intended path in navigation state. The login controller reads it after a successful login:

```javascript
// src/controllers/login.controller.js
export async function loginController(
    params: Record<string, string> = {},
    state?: { redirect?: string }
) {
    // ...
    events.onClick('submit', async () => {
        await auth.login(email, password);
        router.navigate(state?.redirect ?? '/dashboard');
    });
    // ...
}
```

The `state` parameter is passed by the router automatically — no query string manipulation needed.

---

## Middleware Ordering

Middleware runs in **registration order**:

```javascript
// @middleware — registered middleware (auto-updated by make:middleware)
router.use(createMiddleware('auth',      authMiddleware));
router.use(createMiddleware('analytics', analyticsMiddleware));
router.use(createMiddleware('logging',   loggingMiddleware));
```

If `authMiddleware` returns `false`, neither `analyticsMiddleware` nor `loggingMiddleware` will run. This is usually what you want — don't log or report navigations that were blocked.

> **Warning:** A slow async middleware delays every navigation it matches. Keep async middleware lightweight. For analytics that don't need to block, fire-and-forget and return `true` immediately.

---

## Building a Logging Middleware

```javascript
// src/middleware/logging.middleware.js

export function loggingMiddleware(route, state) {
    console.log('[Router]', route.path, { params: route.params, state });
    return true;
}
```

Logging middleware doesn't need a tag — it should run on every route. Register it without `createMiddleware`:

```javascript
router.use(loggingMiddleware); // no tag — runs on every navigation
```

---

## Building a "Save on Navigate" Guard

Prevent users from accidentally leaving a form with unsaved changes:

```javascript
// src/stores/form-dirty.store.js
import { useState } from '@core/state.js';
export const formDirty = useState(false);
```

```javascript
// src/middleware/unsaved-changes.middleware.js
import { formDirty } from '../stores/form-dirty.store.js';

export function unsavedChangesMiddleware(route) {
    if (!formDirty.value) return true;

    const confirmed = window.confirm('You have unsaved changes. Leave anyway?');
    if (confirmed) {
        formDirty.value = false;
        return true;
    }
    return false;
}
```

Apply it to any form route by tagging it:

```javascript
r.group({ middleware: ['auth'] }, (r) => {
    r.register('/tasks/:id/edit', ...);
});
```

And in the controller set the flag:

```javascript
events.onInput('task-form', () => { formDirty.value = true; });
events.onClick('save', async () => {
    await handleSave();
    formDirty.value = false;
    router.navigate('/tasks');
});
```

---

## The `state` Param in Middleware

Navigation state flows through the entire middleware chain. When you call:

```javascript
router.navigate('/tasks', { filter: 'overdue' });
```

Every middleware receives that state as its second argument, and it's also available in the controller. State persists through `router.replace()` calls — so the auth redirect pattern that stores `{ redirect: '/dashboard' }` survives the login middleware chain intact.

---

## Done Criteria

- [ ] `npm run make:middleware verified` creates the file and wires app.js correctly.
- [ ] Navigating to a route tagged `['auth']` without a token redirects to `/login`.
- [ ] The "save-on-navigate" guard fires a `confirm()` when `formDirty` is true.
- [ ] Auth redirect restores the user to the originally-intended path after login.

---

**Back:** [Chapter 16 — API Data Caching and Invalidation](./16-api-caching.md)
**Next:** [Chapter 18 — Global Stores and Cross-Route State](./18-global-stores.md)