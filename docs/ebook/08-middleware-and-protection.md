# Chapter 08 — Middleware and Protection

Author-owned guards. The scaffold does **not** ship JWT login.

## Accuracy note

There is no `auth.service` and no login page in create-nativecore.
Protected routing is:

1. A route group with middleware tags
2. A middleware function you register with `createMiddleware`
3. Your own definition of “signed in” (cookie, token, sessionStorage flag, …)

## Generate middleware

```bash
npm.cmd run make:middleware -- session
```

This creates `src/middleware/session.middleware.js` (or `.ts`) and wires
`app.js`:

```js
import { createMiddleware } from '@core/createMiddleware.js';
import { sessionMiddleware } from '@middleware/session.middleware.js';

// @middleware
router.use(createMiddleware('session', sessionMiddleware));
```

## Implement a simple session check

Example only — replace with your real auth:

```js
export async function sessionMiddleware(route) {
    const ok = window.sessionStorage.getItem('deskflowSession') === '1';
    if (ok) return true;

    // Block navigation and send the user somewhere public
    window.router.navigate('/?signin=1');
    return false;
}
```

## Attach the tag to the protected group

In `src/routes/routes.js`:

```js
// @group:protected
r.group({ middleware: ['session'] }, (r) => {
    r.register('/settings', 'src/views/protected/settings.html',
        lazyController('settingsController', '../controllers/settings.controller.js'));
});
```

Discover paths for a tag at runtime:

```js
router.getPathsForMiddleware('session');
```

## Sign-in / sign-out for Deskflow demo

On home (or settings), add buttons that set/clear the flag:

```js
sessionStorage.setItem('deskflowSession', '1');
sessionStorage.removeItem('deskflowSession');
```

This is intentionally naive so the middleware pipeline is learnable.
Production apps should use your backend’s session/JWT model inside the same
middleware shape.

## Apply to Deskflow

> **Feature:** `/settings` requires a session flag.

1. `make:middleware session` (if not done).
2. Implement the check.
3. Set `middleware: ['session']` on the protected group.
4. Confirm `/settings` redirects when logged out and works when logged in.

## Verify

- [ ] Logged out → cannot stay on `/settings`
- [ ] Logged in → settings renders
- [ ] `createMiddleware` import is a real top-level import in `app.js` (not stuck inside a comment)

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Expecting scaffold JWT helpers | Bring your own |
| Leaving `middleware: []` | Attach your tag name |
| Middleware import injected into a comment | Re-run / fix `app.js` imports (top-level only) |

## Next

[Chapter 09 — Services and API](./09-services-and-api.md)
