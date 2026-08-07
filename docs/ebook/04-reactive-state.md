# Chapter 04 — Reactive State

In this chapter you will make Deskflow's tasks page live. The open-task count in the
header will update automatically whenever you check off a task — no manual DOM
manipulation, no re-rendering the whole list. You will learn instance state (owned
by one controller), computed derivations, effects, and when to reach for module-level
shared state instead.

## Mental model

NativeCoreJS reactivity works like a spreadsheet. A **state** object is a cell with
a value. A **computed** is a formula that reads one or more cells and stays up to date
automatically. An **effect** is a cell that has a side effect — like updating the page
title whenever a value changes.

There are two scopes:

| Scope | When to use | API |
|-------|-------------|-----|
| One page or component | Default choice | `this.state()` `this.compute()` `this.effect()` `this.signal()` |
| Shared across multiple routes | When two pages need the same data | `useState` `computed` `effect` `batch` from `@core/state.js` |

Start with instance state. Reach for the module-level API only when you actually
need two different controllers to share a value.

> There is no `createStore`, `useSignal`, or `getStore` API in the scaffold.
> Those names do not exist — do not invent them.

## Instance state

Instance methods live on every `CoreController` and `CoreComponent`. They are
disposed automatically when `ctrl.destroy()` is called (navigating away) or when
a component disconnects.

### `this.state(initialValue)`

Returns a reactive box. Read `.value`, write `.value`.

```js
onMount() {
    this.count = this.state(0);
    console.log(this.count.value); // 0
    this.count.value = 1;          // triggers any watchers
}
```

### `this.compute(fn)`

Returns a read-only derived state. Re-runs whenever any state read inside `fn`
changes. You do **not** need to call `.dispose()` on the result — the controller
handles that.

```js
onMount() {
    this.tasks = this.state([]);
    this.openCount = this.compute(() =>
        this.tasks.value.filter(t => !t.done).length
    );
    console.log(this.openCount.value); // 0
}
```

### `this.bind(state, element)`

Keeps a DOM element's `textContent` in sync with a state value. You can also
bind to attributes, boolean attributes, and CSS classes:

```js
this.bind(this.openCount, this.countEl);            // textContent
this.bind(this.isLoading, this.btn, '?disabled');   // boolean attribute
this.bind(this.isActive, this.card, '.highlighted'); // CSS class toggle
this.bind(this.href, this.link, 'href');             // string attribute
```

### `this.on(target, type, handler)`

Attaches an event listener and registers cleanup automatically:

```js
this.on(this.addBtn, 'click', () => {
    this.tasks.value = [...this.tasks.value, { text: 'New task', done: false }];
});
```

Never use `addEventListener` directly on controller-managed elements — listeners
added that way will not be cleaned up when the route changes.

### `this.effect(fn)`

Runs immediately and re-runs whenever any state read inside it changes.
Use it for side effects that are not DOM bindings — like updating the document title
or logging:

```js
onMount() {
    this.openCount = this.compute(() =>
        this.tasks.value.filter(t => !t.done).length
    );
    this.effect(() => {
        document.title = `Deskflow (${this.openCount.value} open)`;
    });
}
```

### `this.signal(initialValue)`

A SolidJS-style tuple `[getter, setter]` for developers who prefer call syntax:

```js
const [count, setCount] = this.signal(0);
count();          // read — tracks as a dependency
setCount(1);      // write
setCount(n => n + 1); // updater function
```

`this.signal` wraps `this.state` under the hood but the APIs differ:
`this.signal` returns a `[get, set]` tuple; `this.state` returns `{ value }`.
Prefer `this.state` in this book for consistency.

## Module-level state (`@core/state.js`)

When two routes need to share a value — say, a task list loaded on the tasks page
and displayed in a nav badge — put that state in a store module under `src/stores/`.

Prefer `npm run make:store -- task` — it emits `src/stores/task.store.js` with
the `pausePageCleanupCollection` / `resumePageCleanupCollection` wrapper so
module-level signals survive navigation. A minimal hand-written shape:

```js
// src/stores/task.store.js
import { useState, computed, batch } from '@core/state.js';
import { pausePageCleanupCollection, resumePageCleanupCollection } from '@core/pageCleanupRegistry.js';

pausePageCleanupCollection();
export const taskItems = useState([]);
resumePageCleanupCollection();

export const openCount = computed(() =>
    taskItems.value.filter(t => !t.done).length
);

// Call this from your controller instead of loading inline:
export function loadTasks(items) {
    taskItems.value = items;
}
```

Then in any controller or component:

```js
import { taskItems, openCount, loadTasks } from '@stores/task.store.js';

onMount() {
    loadTasks([{ text: 'Build Deskflow', done: false }]);
    this.bind(openCount, this.countEl);
}
```

The `batch` helper defers notifications until the batch function returns — useful
when you update several state values at once and want only one re-render pass:

```js
import { batch } from '@core/state.js';

batch(() => {
    taskItems.value = fetchedItems;
    isLoading.value = false;
    errorMsg.value = null;
}); // subscribers are notified once, not three times
```

Module-level `computed()` returns a `ComputedState` object with a `.dispose()`
method. Unlike instance `this.compute()`, the framework does not auto-dispose it —
you call `.dispose()` if you need to tear it down explicitly, but store-level
computeds typically live for the lifetime of the app.

## Lab: live open-task counter in Deskflow

Open `src/controllers/tasks.controller.js` and replace the stub `onMount` with:

```js
import { CoreController } from '@core/controller.js';

export class TasksController extends CoreController {
    onMount() {
        this.assertRefs('countEl', 'listEl');

        // Start with a hard-coded demo list — you will load from the API later.
        this.tasks = this.state([
            { id: 1, text: 'Scaffold Deskflow',   done: true  },
            { id: 2, text: 'Add tasks route',      done: true  },
            { id: 3, text: 'Make counter reactive', done: false },
            { id: 4, text: 'Style task cards',     done: false },
        ]);

        this.openCount = this.compute(() =>
            this.tasks.value.filter(t => !t.done).length
        );

        // Bind the count to the badge in the header.
        this.bind(this.openCount, this.countEl);

        // Keep the document title in sync.
        this.effect(() => {
            document.title = `Deskflow — ${this.openCount.value} open`;
        });

        // Render the initial list.
        this._renderList();

        // Wire up a demo "add task" button if you have one.
        if (this.addBtn) {
            this.on(this.addBtn, 'click', () => this._addDemo());
        }
    }

    _renderList() {
        this.listEl.innerHTML = this.tasks.value
            .map(t => `<li class="${t.done ? 'done' : ''}">${t.text}</li>`)
            .join('');
    }

    _addDemo() {
        const next = { id: Date.now(), text: 'New task', done: false };
        this.tasks.value = [...this.tasks.value, next];
        this._renderList();
    }
}

export function tasksController(_params, _state, _loaderData, rootElement) {
    const ctrl = new TasksController(rootElement);
    return () => ctrl.destroy();
}
```

Now open `src/views/public/tasks.html` and add `ref="addBtn"` to a button:

```html
<div class="tasks-page" data-view="tasks">
    <header class="tasks-header">
        <h1>My Tasks</h1>
        <span ref="countEl" class="tasks-badge">0</span>
    </header>
    <ul ref="listEl" class="tasks-list"></ul>
    <button ref="addBtn" class="tasks-add-btn">Add task</button>
</div>
```

Visit `http://localhost:8000/tasks`. The badge should show `2` (two open tasks).
Click "Add task" — the badge increments to `3` and the page title updates.
Navigate away to `/` and back — the counter resets to its initial state (the
controller was destroyed and re-created). That is correct and intentional.

## Apply to Deskflow

Deskflow now has a live open-task counter. Each time `tasks.value` changes, the
computed `openCount` re-derives automatically and `this.bind` updates only the
badge element — nothing else in the DOM is touched.

When you later build the `task-card` component (Chapter 06) and the task store
(Chapter 11), you will move `taskItems` to a shared module so the nav badge and
the tasks page stay in sync across navigations.

## Verify

- [ ] Task badge shows correct open count on page load
- [ ] Clicking "Add task" increments the badge without a page reload
- [ ] Navigating away and back resets state (controller destroyed and re-created)
- [ ] Document title updates to `Deskflow — N open`
- [ ] No stray effects or intervals after navigation (open DevTools, watch console)

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Calling `this.openCount.dispose()` | Instance `this.compute()` cleans up automatically — no manual dispose |
| Using `useSignal` from `@core/state.js` | That function does not exist — use `useState` |
| Mutating array state: `this.tasks.value.push(item)` | Push does not trigger reactivity — replace: `this.tasks.value = [...this.tasks.value, item]` |
| Sharing instance state between two pages | Move it to a store in `src/stores/` using `useState` from `@core/state.js` |
| Calling `addEventListener` directly | Use `this.on(target, type, handler)` so cleanup is automatic |
| Module-level `computed()` never disposed | Store computeds live forever — that is usually fine; call `.dispose()` only if you need to tear it down |

## Challenges

**Bronze:** Add a "Clear completed" button. When clicked, filter out all tasks
where `done === true` and replace `this.tasks.value`. Confirm the badge decrements.

**Silver:** Make the task list items toggle `done` on click. Wire `this.on` to each
`<li>` using event delegation on `this.listEl`. When a task is marked done,
the open count badge should update without re-rendering the whole list. (Hint:
you will need to call `_renderList()` after toggling, unless you use `this.bind`
on individual items.)

**Gold:** Move `taskItems` and `openCount` to a new store file
`src/stores/task.store.js` (prefer `make:store -- task`) using `useState` and
`computed` from `@core/state.js`, wrapped in `pausePageCleanupCollection` /
`resumePageCleanupCollection`. Update `TasksController` to import from the
store. Then add a second computed that returns the `done` count, and bind it
to a new `ref="doneEl"` in the view. Confirm both counters update when tasks
are toggled.

## Next

[Chapter 05 — Native Web Components](./05-native-web-components.md)
