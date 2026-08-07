# Chapter 08 — Middleware and Protection

Every real app has pages that should not be reachable unless something is true — a session exists, a feature flag is on, a role is present. NativeCoreJS puts that decision in a **middleware function** you own. The scaffold gives you the wiring; you supply the rule.

This chapter teaches you to generate a middleware, write a guard, attach it to a route group, and test it by locking `/settings` in Deskflow.

---

## Mental model

```
User navigates to /settings
  ↓
router runs all registered middlewares in order
  ↓
createMiddleware('session', fn) checks route tags
  ↓  route has tag 'session'?  →  call fn(route)
  ↓  fn returns false?         →  abort + redirect
  ↓  fn returns true?          →  render the page
```

Three moving parts:

| Part | Where it lives | What it does |
|------|----------------|--------------|
| Tag name (`'session'`) | `routes.js`, inside `r.group({ middleware: [...] })` | Labels which routes need checking |
| Guard function | `src/middleware/session.middleware.js` | Contains your actual rule |
| Registration | `src/app.js` via `router.use(createMiddleware(...))` | Wires the two together |

You define "signed in" — cookie, `sessionStorage` flag, a server check, anything. The scaffold does **not** ship a JWT package or login endpoint. That is intentional.

---

## Lab — Generate and implement the session guard

### Step 1 — Generate the middleware file

**Windows (PowerShell):**

```bash
npm.cmd run make:middleware -- session
```

**macOS / Linux:**

```bash
npm run make:middleware -- session
```

Two things appear on disk:

- `src/middleware/session.middleware.js` — the function stub
- An import and `router.use(...)` line injected into `src/app.js`

Open `src/app.js` and confirm you see a real import at the top (not buried in a comment):

```js
import { createMiddleware } from '@core/createMiddleware.js';
import { sessionMiddleware } from '@middleware/session.middleware.js';

// ...
router.use(createMiddleware('session', sessionMiddleware));
```

If the generator placed the import inside a comment block, move it to the top-level yourself. Imports inside comments are never executed.

---

### Step 2 — Implement the guard

Open `src/middleware/session.middleware.js` and replace the stub:

```js
export async function sessionMiddleware(route) {
    const active = window.sessionStorage.getItem('deskflowSession') === '1';

    if (active) return true;

    // Block and send the user to the home page with a hint
    window.router.navigate('/?signin=required');
    return false;
}
```

What each line does:

| Line | Purpose |
|------|---------|
| `sessionStorage.getItem(...)` | Your definition of "signed in" — swap for a cookie check, a server ping, anything |
| `return true` | Allow navigation to continue |
| `router.navigate(...)` | Abort and redirect before the protected view renders |
| `return false` | Signal the router to stop processing the current navigation |

Production note: replace `sessionStorage` with whatever your backend session mechanism is. The middleware shape stays identical.

---

### Step 3 — Tag the protected route group

In `src/routes/routes.js`:

```js
import { createLazyController } from '@core/lazyController.js';
const lazyController = createLazyController(import.meta.url);

export function registerRoutes(r) {
    // @group:public
    r.group({}, (r) => {
        r.register('/', 'src/views/public/home.html',
            lazyController('homeController', '../controllers/home.controller.js'));
    });

    // @group:protected
    r.group({ middleware: ['session'] }, (r) => {
        r.register('/settings', 'src/views/protected/settings.html',
            lazyController('settingsController', '../controllers/settings.controller.js'));
    });
}
```

The string `'session'` inside `middleware: [...]` must match the first argument you passed to `createMiddleware` in `app.js`. If they do not match, the guard never runs and every route passes silently.

---

### Step 4 — Add sign-in / sign-out buttons for Deskflow

Because Deskflow is a learning scaffold, a simple flag is enough. On the home view, add buttons that set and clear the flag:

In `src/views/public/home.html`:

```html
<nc-button ref="signInBtn" variant="primary">Sign in (demo)</nc-button>
<nc-button ref="signOutBtn" variant="ghost">Sign out</nc-button>
<a href="/settings">Go to Settings</a>
```

In `home.controller.js`:

```js
onMount() {
    this.assertRefs('signInBtn', 'signOutBtn');

    this.on(this.signInBtn, 'click', () => {
        sessionStorage.setItem('deskflowSession', '1');
    });

    this.on(this.signOutBtn, 'click', () => {
        sessionStorage.removeItem('deskflowSession');
    });
}
```

Now test: click sign in, navigate to `/settings` — you should land there. Click sign out, try again — you should bounce to `/?signin=required`.

---

### Step 5 — Inspect which paths carry a tag (optional)

`window.router` only exposes `navigate`, `replace`, `back`, and `getCurrentRoute`.
Introspection helpers live on the full router instance (`window.__NC_ROUTER__`).
Call these from the browser console while the dev server is running:

```js
// Which paths carry the 'session' tag?
window.__NC_ROUTER__.getPathsForMiddleware('session');
// → ['/settings']

// Which tags does /settings carry?
window.__NC_ROUTER__.getTagsForPath('/settings');
// → ['session']
```

These are useful when debugging unexpected access behavior.

---

## Apply to Deskflow

> **Feature:** `/settings` requires a session flag. Unauthenticated visitors are redirected.

Checklist:

1. Run `make:middleware session` (or confirm the file already exists).
2. Implement the `sessionStorage` check in the middleware function.
3. Confirm the `router.use(createMiddleware(...))` call is in `app.js` at the top level.
4. Set `middleware: ['session']` on the protected group in `routes.js`.
5. Add sign-in / sign-out buttons to the home page.
6. Test both paths manually.

---

## Verify

- [ ] Logged out → navigating to `/settings` redirects to home
- [ ] Logged in → `/settings` renders normally
- [ ] `createMiddleware` and the middleware import are at the top level of `app.js` (not in a comment)
- [ ] The tag string in `routes.js` matches the tag string in `app.js`
- [ ] `getPathsForMiddleware('session')` returns `['/settings']` in the console

---

## Challenges

**Bronze** — Add a second protected route `/profile` to the same middleware group and confirm the guard covers both paths.

**Silver** — Make the guard check `localStorage` instead of `sessionStorage` so the sign-in persists across browser tabs. Update the sign-in / sign-out buttons to match.

**Gold** — Write a second middleware (`verified`) that checks a separate flag (`deskflowVerified`). Attach it only to `/settings` (not `/profile`) using a nested group. Confirm that `/profile` passes the `session` guard but the `verified` guard does not run for it.

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Expecting the scaffold to ship a JWT login flow | Bring your own. The scaffold gives you the wiring, not the auth logic |
| `middleware: []` on the group | An empty array means no tags — the guard never runs |
| Middleware import inside a comment in `app.js` | Re-run the generator or move the import to the top-level manually |
| Tag in `routes.js` does not match tag in `createMiddleware(...)` | Both strings must be identical, including case |
| Calling `return false` without redirecting first | The router stops, but the user sees a blank page — always call `router.navigate(...)` before returning false |

---

## Next

[Chapter 09 — Services and API](./09-services-and-api.md)
