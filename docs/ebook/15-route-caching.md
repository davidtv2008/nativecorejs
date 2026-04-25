# Chapter 15 — Route Caching and Prefetching

> **What you'll build in this chapter:** Apply a caching strategy to ShopBoard's product catalog and product detail routes so that back-navigation never hits the network, and verify that `router.bustCache()` works from the browser console.

Every time a user navigates to a route, NativeCoreJS fetches the route's HTML file from the server. For most SPAs that fetch is tiny — a few kilobytes of template markup — but it still costs a round trip. On a slow connection or a high-traffic server, those round trips add up. Route caching eliminates them.

This chapter covers the router's built-in HTML cache: how to configure it, the two caching modes, when to bust it, and how prefetching can make navigation feel instant.

---

## What the Route Cache Actually Stores

The route cache is distinct from the API data cache you'll meet in Chapter 16. It stores the **raw HTML content of the view's template file** — the `.view.html` string — in memory. Once the router has fetched and cached a view's HTML, it can switch to that route without touching the network at all.

This makes back-navigation essentially free. If a user opens a task, returns to the list, opens another task, and hits back again, the task list HTML is served from memory every time after the first visit.

> **Important:** The route cache stores the *template document*, not the rendered page. The controller always runs on navigation — it reads state, fetches API data, and populates the DOM. The cache only saves the HTML fetch.

---

## `.cache()` — Configuration API

Chain `.cache()` immediately after `.register()`:

```javascript
router
    .register('/dashboard', 'views/dashboard/dashboard.view.html', dashboardController)
    .cache({ ttl: 30, revalidate: true });
```

`ttl` is measured in **seconds**. When the TTL expires, the cache entry is considered stale.

### Block-on-Stale: `revalidate: false`

```javascript
.cache({ ttl: 300, revalidate: false })
```

When the cached entry is stale, the router **blocks navigation** and fetches fresh HTML before showing the view. The user experiences a brief loading pause, but always sees up-to-date markup. Use this for views whose HTML structure changes on deploy and must never be stale.

### Stale-While-Revalidate: `revalidate: true`

```javascript
.cache({ ttl: 30, revalidate: true })
```

When the cached entry is stale, the router **immediately shows the stale HTML** and starts a background fetch to refresh the cache. The user sees the view instantly; the next navigation to the same route will get the fresher copy. Use this for views that change rarely and where a short window of staleness is acceptable.

> **Tip:** For most protected app views, `revalidate: true` with a short TTL (30–60 seconds) gives the best user experience — fast navigation with background freshness.

---

## Comprehensive Taskflow `routes.js`

Here is the full route registration for Taskflow, with cache policies chosen to match each page's characteristics:

```javascript
import { router } from '@core/router.js';
import { homeController } from './controllers/home.controller.js';
import { loginController } from './controllers/login.controller.js';
import { dashboardController } from './controllers/dashboard.controller.js';
import { tasksController } from './controllers/tasks.controller.js';
import { taskDetailController } from './controllers/task-detail.controller.js';
import { projectsController } from './controllers/projects.controller.js';
import { projectTasksController } from './controllers/project-tasks.controller.js';
import { settingsController } from './controllers/settings.controller.js';
import { notFoundController } from './controllers/not-found.controller.js';

// Public marketing page — rarely changes, long TTL, block on stale
router
    .register('/', 'views/home/home.view.html', homeController)
    .cache({ ttl: 300, revalidate: false });

// Auth pages — never cache; content must always be fresh
router.register('/login', 'views/login/login.view.html', loginController);
router.register('/register', 'views/register/register.view.html');

// Protected dashboard — short TTL, serve stale instantly
router
    .register('/dashboard', 'views/dashboard/dashboard.view.html', dashboardController)
    .cache({ ttl: 30, revalidate: true });

// Task list — 60-second revalidate; gets busted after mutations
router
    .register('/tasks', 'views/tasks/tasks.view.html', tasksController)
    .cache({ ttl: 60, revalidate: true });

// Task detail — no cache; HTML is param-specific and always needs fresh data
router.register(
    '/tasks/:id',
    'views/task-detail/task-detail.view.html',
    taskDetailController
);

// Project list — 60-second revalidate
router
    .register('/projects', 'views/projects/projects.view.html', projectsController)
    .cache({ ttl: 60, revalidate: true });

// Project task view with optional task param — no cache
router.register(
    '/projects/:id/tasks/:taskId?',
    'views/project-tasks/project-tasks.view.html',
    projectTasksController
);

// Settings — rarely changes, medium TTL
router
    .register('/settings', 'views/settings/settings.view.html', settingsController)
    .cache({ ttl: 120, revalidate: true });

// Catch-all 404 — always last, no cache
router.register('/*', 'views/not-found/not-found.view.html', notFoundController);
```

Notice that parameterized routes (`/tasks/:id`, `/projects/:id/tasks/:taskId?`) have **no cache**. The HTML file for these routes is the same template regardless of which `id` is in the URL, but the router matches on the *registered path pattern*, not the literal URL. If you cached `/tasks/:id`, every task detail navigation would reuse the same cached HTML — which is fine for the template, but the cache TTL logic isn't aware that `/tasks/1` and `/tasks/99` are semantically different pages. Skipping cache for detail pages and letting the API cache (Chapter 15) handle data freshness is the safer, cleaner approach.

---

## Creating New Views — Always Use the CLI

Before adding a new entry to `routes.js`, always scaffold the view with:

```bash
npm run make:view settings
```

```
? Is this a protected route? › Yes
? Route path › /settings
? Generate a controller? › Yes
```

The command creates `src/views/settings/settings.view.html` and `src/controllers/settings.controller.js` with the correct boilerplate. Never create these files by hand — the scaffolder wires up the `data-view` attribute, imports, and controller signature for you.

---

## `router.prefetch(path)` — Warming the Cache Early

Prefetching fetches a route's HTML and stores it in the cache *before* the user navigates there. The user never waits for the network — the view loads from memory instantly.

A natural place to prefetch is when a page is likely to be the user's next destination. In Taskflow, the login page knows the user is about to go to the dashboard after a successful login:

```javascript
// login.controller.js
export async function loginController(
    params: Record<string, string> = {}
) {
    const events = trackEvents();
    const disposers = [];

    // Warm the dashboard cache while the user fills the form
    router.prefetch('/dashboard');
    router.prefetch('/tasks');

    events.onClick('submit', async () => {
        const form = dom.view('login').hook('form');
        const data = new FormData(form);

        try {
            await auth.login(
                data.get('email')
                data.get('password')
            );
            router.navigate('/dashboard');
        } catch (err) {
            // show error
        }
    });

    return () => {
        events.cleanup();
        disposers.forEach(d => d());
    };
}
```

By the time the user finishes typing their password and clicks Submit, `/dashboard` and `/tasks` are already in the cache.

You can also prefetch on hover — when the user's mouse enters a nav link, start prefetching its destination:

```javascript
events.onMouseEnter('nav-tasks', () => router.prefetch('/tasks'));
```

---

## `router.bustCache(path)` — Manual Invalidation

When your app mutates data in a way that changes what the view *should* look like, you need to tell the cache to discard its stored copy. `router.bustCache()` does this.

```javascript
// After creating a new task
await api.post('/tasks', newTask);
router.bustCache('/tasks');
```

The *next* navigation to `/tasks` will fetch fresh HTML from the server.

You can also bust all cached routes at once by calling `router.bustCache()` with no arguments — useful after a user logs out or switches accounts.

> **Warning:** `router.bustCache()` only invalidates the **HTML template cache**. It does not clear API response data. After a mutation you typically want both:
> ```javascript
> router.bustCache('/tasks');
> api.invalidateTags('tasks');   // also clear the API data cache
> ```
> Chapter 16 covers `api.invalidateTags()` in detail.

---

## Smart Caching Strategy for Taskflow

Here is the complete caching philosophy distilled into one table:

| Page type | Route example | TTL | Mode | Rationale |
|---|---|---|---|---|
| Static marketing | `/` | 300s | block | Changes only on deploy |
| Auth | `/login` | none | — | Must always be fresh |
| Protected dashboard | `/dashboard` | 30s | revalidate | Fast nav, short staleness window |
| List views | `/tasks`, `/projects` | 60s | revalidate | Busted after mutations anyway |
| Detail with params | `/tasks/:id` | none | — | Template is shared; skip cache |
| Settings | `/settings` | 120s | revalidate | Changes rarely |
| 404 | `/*` | none | — | No point caching an error page |

---

## Performance Impact

Without caching, every back-navigation fetches the HTML again — even if the user was just on that page two seconds ago. With caching:

- `/dashboard` on first visit: network fetch (~10–50ms)
- `/tasks` on first visit: network fetch
- User opens a task, presses back: `/tasks` served from memory in **< 1ms**
- User presses back again: `/dashboard` served from memory in **< 1ms**

On repeated navigation patterns — which are extremely common in task management apps — the cumulative saving is significant.

> **Warning:** Omitting `.cache()` entirely means no caching — the HTML is fetched on every navigation. This is the safe default, but you should be *deliberate* about it. Don't leave routes without a cache policy by accident; decide consciously whether caching is appropriate.

---

## Done Criteria

- [ ] `/products` uses `.cache({ ttl: 300, revalidate: true })`.
- [ ] `/products/:id` uses `.cache({ ttl: 60, revalidate: true })`.
- [ ] The Network tab confirms no HTML re-fetch on back navigation after the first visit.
- [ ] `router.bustCache('/products')` in the console clears the cache and the next navigation re-fetches.

---

**Back:** [Chapter 14 — Dynamic Routes, URL Parameters, and Wildcards](./14-dynamic-routes.md)  
**Next:** [Chapter 16 — API Data Caching and Invalidation](./16-api-caching.md)