# Chapter 7 — Authentication

Almost every real application has protected pages. NativeCoreJS ships a first-class `auth.service` and a router middleware that together keep unauthenticated users away from sensitive routes. In this chapter you will wire up a full login flow for the Taskflow app and learn the exact pattern for adding new protected pages.

---

## The `auth.service` API

`auth.service.ts` is a thin wrapper that stores credentials and exposes a handful of synchronous helpers.

```typescript
import { auth } from '@services/auth.service.js';

auth.isAuthenticated();          // boolean — checks stored token
auth.getUser();                  // returns the decoded user object or null
auth.setTokens(access, refresh); // persist both JWTs (localStorage by default)
auth.setUser(userObject);        // cache the user profile
auth.logout();                   // wipes tokens + user, redirects to /login
```

`isAuthenticated()` inspects the stored access token and returns `false` when it is absent or expired. The router calls this before activating any protected route.

> **Tip:** You do not need to decode JWTs yourself. `auth.getUser()` returns the object that was last passed to `auth.setUser()`. Store a minimal profile (id, name, email, role) right after login to keep it available everywhere without an extra request.

---

## Protected Routes

Open `src/routes.ts`. You will see two things: the route registry and the `protectedRoutes` array.

```typescript
// src/routes.ts
import { router } from '@core/router.js';
import { lazyController } from '@core/lazy.js';

export const protectedRoutes: string[] = [
  '/dashboard',
  '/projects',
  '/projects/:id',
  '/tasks',
];

router.register('/login',     'login.html',     lazyController('loginController'));
router.register('/dashboard', 'dashboard.html', lazyController('dashboardController')).cache();
router.register('/projects',  'projects.html',  lazyController('projectsController')).cache();
router.register('/tasks',     'tasks.html',     lazyController('tasksController')).cache();
```

When the router is about to activate a route it checks whether the path is in `protectedRoutes`. If it is and `auth.isAuthenticated()` returns `false`, the user is redirected to `/login` automatically — no boilerplate needed in every controller.

### Adding a New Protected Route

1. Register the route as normal.
2. Append its path to `protectedRoutes`.

```typescript
// 1. Register
router.register('/settings', 'settings.html', lazyController('settingsController')).cache();

// 2. Protect
export const protectedRoutes: string[] = [
  // ...existing paths...
  '/settings',
];
```

That is all. The middleware handles the redirect.

---

## The Login Flow

The canonical login sequence is:

1. User submits the form.
2. Controller calls `api.post('/auth/login', { email, password })`.
3. On success, call `auth.setTokens(access, refresh)` and `auth.setUser(user)`.
4. Navigate to `/dashboard`.

On failure, surface the error message without leaving the page.

---

## Building the Taskflow Login Controller

Generate the scaffold with the CLI:

```bash
npm run make:controller login
npm run make:view       login
```

### `login.html`

```html
<div data-view="login">
  <nc-card class="login-card">
    <h1 class="login-title">Sign in to Taskflow</h1>

    <nc-alert type="error" class="login-error" hidden></nc-alert>

    <nc-input
      id="email"
      type="email"
      label="Email address"
      placeholder="you@example.com"
      clearable
    ></nc-input>

    <nc-input
      id="password"
      type="password"
      label="Password"
      show-password-toggle
    ></nc-input>

    <nc-button id="btn-login" variant="primary" full-width>
      Sign in
    </nc-button>
  </nc-card>
</div>
```

### `loginController.ts`

```typescript
import { dom }  from '@core-utils/dom.js';
import { auth } from '@services/auth.service.js';
import { api }  from '@services/api.service.js';
import { router } from '@core/router.js';
import { useState } from '@core/state.js';
import { trackEvents } from '@core-utils/events.js';

export async function loginController(): Promise<() => void> {
  const scope     = dom.data('login');
  const { on, dispose } = trackEvents();

  const isLoading = useState(false);

  // Reflect loading state on the button
  isLoading.subscribe(loading => {
    scope.$('#btn-login').toggleAttribute('loading', loading);
    scope.$('#btn-login').toggleAttribute('disabled', loading);
  });

  async function handleSubmit() {
    const email    = (scope.$('#email') as any).value?.trim();
    const password = (scope.$('#password') as any).value;

    // Basic client-side guard
    if (!email || !password) {
      showError('Please enter your email and password.');
      return;
    }

    hideError();
    isLoading.value = true;

    try {
      const { data, error } = await api.post('/auth/login', { email, password });

      if (error || !data) {
        showError(error?.message ?? 'Login failed. Please try again.');
        return;
      }

      auth.setTokens(data.accessToken, data.refreshToken);
      auth.setUser(data.user);
      router.navigate('/dashboard');
    } catch {
      showError('An unexpected error occurred.');
    } finally {
      isLoading.value = false;
    }
  }

  function showError(message: string) {
    const alert = scope.$('.login-error') as HTMLElement;
    alert.setAttribute('message', message);
    alert.removeAttribute('hidden');
  }

  function hideError() {
    scope.$('.login-error').setAttribute('hidden', '');
  }

  on('click', '#btn-login', handleSubmit);

  // Also submit on Enter inside the password field
  on('keydown', '#password', (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  });

  return dispose;
}
```

> **Warning:** Never log or store raw passwords. The `password` variable above is passed straight to the API and is otherwise discarded. Ensure your API endpoint uses HTTPS.

---

## Logout

Logout is a single call — typically wired to a button in the navigation component:

```typescript
on('click', '#btn-logout', () => auth.logout());
```

`auth.logout()` clears both tokens and the cached user, then redirects to `/login`. Any in-flight requests will fail with a 401, but because the user is already being redirected that is harmless.

---

## What's Next

Chapter 8 dives into the full async data layer — `api.get`, caching with `getCached`, invalidation, and loading/error state patterns you will use in every controller that touches the network.
