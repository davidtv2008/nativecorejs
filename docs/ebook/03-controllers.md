# Chapter 03 — Controllers

Page logic with `CoreController`.

## What a controller is

A controller runs after the router injects a view into `#main-content`.
It wires refs, state, events, and returns a **cleanup function**.

Canonical pattern (what `make:view` / `make:controller` generate):

```js
import { CoreController } from '@core/controller.js';

export class TasksController extends CoreController {
    onMount() {
        this.assertRefs('titleEl');
        this.title = this.state('Tasks');
        this.bind(this.title, this.titleEl);
    }

    onUnmount() {
        // this.on() listeners auto-clean via destroy()
    }
}

export function tasksController(_params, _state, _loaderData, rootElement) {
    const ctrl = new TasksController(rootElement);
    return () => ctrl.destroy();
}
```

The export name (`tasksController`) must match the first argument to
`lazyController('tasksController', '…')`.

## CoreController API (verified)

| API | Purpose |
|-----|---------|
| `this.el` | View root |
| `this.assertRefs(...names)` | Throw if refs missing |
| `this.state(initial)` | Local reactive `{ value }` |
| `this.signal(initial)` | `[get, set]` tuple |
| `this.compute(fn)` / `this.memo(fn)` | Derived state |
| `this.effect(fn)` | Reactive side effect |
| `this.bind(state, el)` | textContent |
| `this.bind(state, el, 'attr')` | attribute |
| `this.bind(state, el, '?disabled')` | boolean attribute |
| `this.bind(state, el, '.class')` | class toggle |
| `this.on(target, type, handler)` | Listener with auto-cleanup |
| `this.$` / `this.$$` | Query inside `this.el` |
| `this.rebind(root?)` | Rescan refs after dynamic HTML |
| `destroy()` | Cleanup + `onUnmount` |

Important: `this.on` requires an **EventTarget** first argument:

```js
this.on(this.saveBtn, 'click', () => { /* … */ });
// not: this.on('click', handler)
```

`this.bind(state, string)` assigns an **instance property** named by that string
(legacy overload). Prefer binding to a ref element: `this.bind(state, this.titleEl)`.

## Route params and loaders

The router calls the lazy controller as `(params, state, loaderData)`.

Generated factories look like:

```js
export function tasksController(_params, _state, _loaderData, rootElement) {
    const ctrl = new TasksController(rootElement);
    return () => ctrl.destroy();
}
```

`createLazyController` forwards only those three router args into the **function**
export, so `rootElement` is usually `undefined`. `CoreController` then falls
back to the active `[data-view]` root (which is correct for normal page views).

Example loader (optional) — signature is `(params, signal)`, not an options object:

```js
r.register('/tasks/:id', 'src/views/public/task-detail.html',
    lazyController('taskDetailController', '../controllers/task-detail.controller.js'),
    {
        loader: async (params, signal) => {
            const res = await fetch(`/api/tasks/${params.id}`, { signal });
            return res.json();
        },
    });
```

## Apply to Deskflow

> **Feature:** Tasks page shows a reactive title when the primary button is clicked.

If `make:view` already created `tasks.controller.js`, open it and flesh out `onMount`
using the scaffolded refs (`titleEl`, `summaryEl`, `primaryBtn` when present).

Or generate a standalone controller:

```bash
npm.cmd run make:controller -- tasks
```

Wire it in routes if needed (view generator usually does this).

## Verify

- [ ] Navigating away and back does not duplicate click handlers
- [ ] Missing `ref` fails loudly via `assertRefs` when you call it
- [ ] Factory returns `() => ctrl.destroy()`

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Forgetting cleanup return | Always return destroy |
| `trackEvents` as the only taught pattern | Prefer CoreController for new pages |
| Binding with CSS selectors as primary API | Use `ref` elements |

## Next

[Chapter 04 — Reactive state](./04-reactive-state.md)
