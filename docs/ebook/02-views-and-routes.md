# Chapter 02 — Views and Routes

HTML views, the router table, and `make:view`.

## Views are markup only

Files under `src/views/**/*.html` contain **HTML only** — no `<script>`, no `<style>`.

Logic belongs in controllers. Styles belong in `src/styles/` or component Shadow DOM.

Recommended root:

```html
<div class="tasks-page" data-view="tasks">
    <h1 ref="titleEl">Tasks</h1>
</div>
```

- `data-view` helps `CoreController` find its root
- `ref="name"` becomes `this.name` on the controller after bootstrap
- The router injects HTML into `#main-content`

## Routes use `createLazyController`

Scaffold `src/routes/routes.js` looks like this (simplified):

```js
import { createLazyController } from '@core/lazyController.js';

const lazyController = createLazyController(import.meta.url);

export function registerRoutes(r) {
    // @group:public
    r.group({}, (r) => {
        r.register('/', 'src/views/public/home.html',
            lazyController('homeController', '../controllers/home.controller.js'))
         .cache({ ttl: 300, revalidate: true });
    });

    // @group:protected
    r.group({ middleware: [] }, (r) => {
        // make:view --protected inserts here
    });
}
```

Rules:

- Inside `registerRoutes(r)`, call **`r.register`** (not `router.register`)
- Controllers are never top-level-imported into the route file
- Protected group starts with `middleware: []` until you attach tags (Chapter 08)

## Generator: `make:view`

Interactive:

```bash
npm.cmd run make:view -- tasks
```

Prompts:

1. Should this route require login? `(y/n)` → chooses `public/` vs `protected/`
2. Route path (default `/tasks`)
3. Create a controller? `(y/n)`

Non-interactive (CI / PowerShell-friendly):

```bash
npm.cmd run make:view -- tasks --defaults
npm.cmd run make:view -- settings --protected --defaults
npm.cmd run make:view -- task-detail --route /tasks/:id --defaults
```

`make:page` is an alias of `make:view`. Dynamic `--route` values work; the
generator skips automatic nav-link updates for nested/dynamic paths.

## Apply to Deskflow

> **Feature:** Public `/tasks` and protected `/settings` shells.
> **Commands:**

```bash
npm.cmd run make:view -- tasks --defaults
npm.cmd run make:view -- settings --protected --defaults
```

1. Confirm files:
   - `src/views/public/tasks.html`
   - `src/views/protected/settings.html`
   - matching controllers if you accepted the default
2. Confirm `src/routes/routes.js` contains `r.register('/tasks', …)` and `r.register('/settings', …)`.
3. Visit `/tasks` and `/settings` in the browser (settings is not blocked yet).

## Verify

- [ ] Both routes render without console errors
- [ ] Route registrations use `r.register`
- [ ] Settings HTML lives under `views/protected/`

## Common mistakes

| Mistake | Fix |
|---------|-----|
| `router.register` in `registerRoutes` | Use `r.register` |
| Hand-rolled local `lazyController` | Import `createLazyController` |
| Putting JS in the HTML view | Use a controller |

## Next

[Chapter 03 — Controllers](./03-controllers.md)
