# Chapter 15 — Dynamic Routes and Cache

Task detail pages, params, HTML cache, and prefetch.

## Param syntax (router)

From `router.ts` `extractParams`:

| Segment | Meaning |
|---------|---------|
| `:id` | Required param → `params.id` |
| `:id?` | Optional param |
| `*` | Rest → `params.wildcard` |

Exact path matches win before dynamic matching.

## Register a detail route

```js
r.register(
    '/tasks/:id',
    'src/views/public/task-detail.html',
    lazyController('taskDetailController', '../controllers/task-detail.controller.js')
).cache({ ttl: 60, revalidate: true });
```

`make:view` can create the view; you may need to edit the registered path to
include `:id` if the generator used a static segment.

## Controller params

`lazyController('taskDetailController', …)` resolves the **factory function**
export (`taskDetailController`), not the class. The router calls it as
`(params, state, loaderData)`.

Generated factories ignore params by default (`_params`). Wire them through:

```js
export function taskDetailController(params, _state, _loaderData, rootElement) {
    const ctrl = new TaskDetailController(rootElement);
    ctrl.taskId = params?.id;
    return () => ctrl.destroy();
}

export class TaskDetailController extends CoreController {
    onMount() {
        const id = this.taskId;
        // load task by id from taskItems / api
    }
}
```

Alternatively read `window.router.getCurrentRoute()?.params` inside `onMount`
(frozen window API exposes `getCurrentRoute`).

## Optional loaders

`RouteConfig.loader` can prefetch data before the controller runs:

```js
r.register('/tasks/:id', 'src/views/public/task-detail.html', controller, {
    loader: async (params, signal) => {
        return api.get(`/tasks/${params.id}`, { signal }); // if your api supports signal
    },
});
```

Confirm `api.service` method signatures before copying the fetch line — use
whatever the service actually exposes (`get` / `getCached`).

## Cache + prefetch

```js
// After register — HTML cache policy for that route
.cache({ ttl: 300 })                      // block until fresh when stale
.cache({ ttl: 60, revalidate: true })     // stale-while-revalidate

router.prefetch('/tasks');                // warm HTML without navigating
router.bustCache('/tasks');               // one path
router.bustCache();                       // all
```

Dev overlay can show cache health via router debug helpers (`getCacheSnapshot`,
`getRouteDebugInfo`).

## Apply to Deskflow

> **Feature:** Click a task → `/tasks/:id` detail view.

1. Add `task-detail` view + controller.
2. Register `/tasks/:id`.
3. From the list, `window.router.navigate(\`/tasks/${id}\`)`.
4. Prefetch detail HTML on hover if you want snappier UX.

## Verify

- [ ] `/tasks/1` shows that task
- [ ] Bad id shows a friendly empty/error state (your code)
- [ ] Second visit with `.cache()` hits cached HTML (Network / overlay)

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Expecting SSG for `/tasks/:id` | Dynamic routes are skipped by `build:ssg` |
| Using only `window.location` | Prefer `window.router.navigate` |

## Next

[Chapter 16 — Wires](./16-wires.md)
