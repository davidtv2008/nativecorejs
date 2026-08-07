# Chapter 08 — Deskflow Tasks

This is the first “aha” chapter. You assemble views, controllers, state, and
`task-card` into a real feature.

## Mental model

```
View          → layout + refs (listEl, addBtn, countEl)
Controller    → owns the tasks array, listens for events
task-card     → paints one row, emits task-card-toggle
```

Data flows **down** through attributes (`title`, `done`, `data-id`).
Intent flows **up** through events (`task-card-toggle`).

Forms (ch. 11), stores (ch. 10), and APIs (ch. 09) will replace `prompt` and
the in-memory array later. The event bridge stays the same forever.

---

## Goal

On `/tasks`:

- Show a list of tasks using `<task-card>`
- Add a task from a button + `prompt` (forms chapter upgrades this)
- Keep an open-count in the header via `this.compute`

## Suggested files

| File | Role |
|------|------|
| `src/views/public/tasks.html` | Layout + refs |
| `src/controllers/tasks.controller.js` | State + events |
| `src/components/ui/task-card.js` | Presentation (from ch. 05) |

---

## Lab — View

```html
<div class="tasks-page" data-view="tasks">
    <header>
        <h1 ref="titleEl">Tasks</h1>
        <p><span ref="countEl">0</span> open</p>
        <nc-button ref="addBtn" variant="primary">Add task</nc-button>
    </header>
    <div ref="listEl" class="tasks-list"></div>
</div>
```

## Lab — Controller

```js
import { CoreController } from '@core/controller.js';

export class TasksController extends CoreController {
    onMount() {
        this.assertRefs('titleEl', 'countEl', 'addBtn', 'listEl');

        this.tasks = this.state([
            { id: '1', title: 'Scaffold Deskflow', done: true },
            { id: '2', title: 'Wire task-card', done: false },
        ]);

        this.openCount = this.compute(
            () => this.tasks.value.filter((t) => !t.done).length
        );

        this.bind(this.openCount, this.countEl);
        this.on(this.addBtn, 'click', () => this.addTask());
        this.on(this.listEl, 'task-card-toggle', (e) => this.onToggle(e));

        this.renderList();
        this.effect(() => {
            // Re-render when the array identity changes
            this.tasks.value;
            this.renderList();
        });
    }

    addTask() {
        const title = window.prompt('Task title');
        if (!title) return;
        this.tasks.value = [
            ...this.tasks.value,
            { id: String(Date.now()), title, done: false },
        ];
    }

    onToggle(e) {
        const card = e.target.closest('task-card');
        if (!card) return;
        const id = card.getAttribute('data-id');
        this.tasks.value = this.tasks.value.map((t) =>
            t.id === id ? { ...t, done: e.detail.done } : t
        );
    }

    renderList() {
        this.listEl.innerHTML = '';
        for (const t of this.tasks.value) {
            const el = document.createElement('task-card');
            el.setAttribute('title', t.title);
            el.setAttribute('data-id', t.id);
            if (t.done) el.setAttribute('done', '');
            this.listEl.appendChild(el);
        }
    }
}

export function tasksController(_p, _s, _l, root) {
    const ctrl = new TasksController(root);
    return () => ctrl.destroy();
}
```

Adapt attribute names to match your `task-card` from [Chapter 06](./06-first-component.md).

---

## Apply to Deskflow (step by step)

1. Ensure `/tasks` route + controller exist (`make:view` if needed).
2. Ensure `<task-card>` exists from Chapter 06.
3. Paste / adapt the view + controller above.
4. Confirm each card gets `data-id` so `onToggle` can find the task.
5. Keep `npm run dev` running and exercise Add + Toggle.

### How the event reaches the controller

```
User clicks Toggle inside task-card
  → component emit('task-card-toggle', { done, title })
  → event bubbles + crosses shadow (composed: true)
  → this.on(this.listEl, 'task-card-toggle', …) runs
  → you update this.tasks.value
  → effect re-renders the list
```

---

## Challenges

**Bronze** — Add + toggle work; open count updates.

**Silver** — Add a delete control (button in the card or a second emit like
`task-card-delete`) and remove the task from the array.

**Gold** — Persist `this.tasks.value` to `sessionStorage` on change and restore
it in `onMount` (preview of stores in Chapter 11).

## Verify

- [ ] Add task updates the list and open count
- [ ] Toggle updates count
- [ ] Navigate to `/` and back — no duplicate listeners

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Forgetting `data-id` on cards | `onToggle` cannot match the array item |
| Mutating `this.tasks.value` in place | Assign a **new** array so reactivity fires |
| Listening on each card instead of `listEl` | Prefer one delegated listener |
| Missing factory `return () => ctrl.destroy()` | Handlers stack on every visit |

## Checkpoint M2

Deskflow has a usable in-memory tasks UI. Next you will protect Settings and
talk to `api.service`.

## Next

[Chapter 09 — Middleware and protection](./09-middleware-and-protection.md)
