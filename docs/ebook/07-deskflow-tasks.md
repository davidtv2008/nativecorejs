# Chapter 07 — Deskflow Tasks

Assemble chapters 02–06 into a working tasks list.

## Goal

On `/tasks`:

- Show a list of tasks using `<task-card>`
- Add a task from a simple button + prompt (forms chapter upgrades this later)
- Keep an open-count in the header via `this.compute`

## Suggested files

| File | Role |
|------|------|
| `src/views/public/tasks.html` | Layout + refs |
| `src/controllers/tasks.controller.js` | State + events |
| `src/components/ui/task-card.js` | Presentation |

## View sketch

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

## Controller sketch

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
            // re-render when tasks change
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

Adapt attribute names to match your `task-card` implementation from Chapter 05.

## Apply to Deskflow (step by step)

1. Ensure `/tasks` route + controller exist (`make:view` if needed).
2. Ensure `<task-card>` exists from [Chapter 05](./05-first-component.md).
3. Paste / adapt the view + controller sketches above.
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

That is the whole app loop. Forms, stores, and APIs later replace `prompt` and
the in-memory array — the event bridge stays the same.

## Challenges

**Bronze** — Add + toggle work; open count updates.

**Silver** — Add a delete control (button in the card or a second emit like
`task-card-delete`) and remove the task from the array.

**Gold** — Persist `this.tasks.value` to `sessionStorage` on change and restore
it in `onMount` (preview of stores in Chapter 10).

## Verify

- [ ] Add task updates the list and open count
- [ ] Toggle updates count
- [ ] Navigate to `/` and back — no duplicate listeners

## Checkpoint M2

Deskflow has a usable in-memory tasks UI. Next you will protect Settings and
talk to `api.service`.

## Next

[Chapter 08 — Middleware and protection](./08-middleware-and-protection.md)
