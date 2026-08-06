# Chapter 05 — First Component

Custom components are the main reason to pick NativeCoreJS. Views stay HTML.
Controllers stay thin. Reusable UI lives in **your** tags (`task-card`,
`status-pill`, …) built on `CoreComponent`.

This chapter is a lab. You will:

1. Generate a component with `npm run make:component`
2. Understand the files the generator creates
3. Rewrite the stub into a real `task-card`
4. Drop it in a view and listen for its events from a controller

Deskflow needs cards for each task. Build that card here; wire the full list in
[Chapter 07](./07-deskflow-tasks.md).

---

## Mental model (30 seconds)

```
View (HTML)          →  <task-card title="…"></task-card>
Component (Shadow)   →  paints UI, owns local state, emits events
Controller (page)    →  listens with this.on(…), updates app data
```

The browser already knows custom elements. NativeCoreJS adds:

- `CoreComponent` — template, refs, `state` / `bind` / `on` / `emit`
- Lazy registration via `appRegistry` (your tags) and `frameworkRegistry` (`nc-*`)
- Generators so you do not hand-wire registration

---

## Lab — Generate `task-card`

From your app root (the project `create-nativecore` made):

**Windows (PowerShell / cmd):**

```bash
npm.cmd run make:component -- task-card --defaults
```

**macOS / Linux:**

```bash
npm run make:component -- task-card --defaults
```

`--defaults` skips interactive prompts (prefetch = no). Optional tests:

```bash
npm.cmd run make:component -- task-card --defaults --with-tests
```

### What appeared on disk

| Path | Role |
|------|------|
| `src/components/ui/task-card.js` (or `.ts`) | Your component class |
| `src/components/appRegistry.js` (or `.ts`) | One new `register('task-card', …)` line |

Open `appRegistry` and confirm a line like:

```js
componentRegistry.register('task-card', './ui/task-card.js');
```

You do **not** import the component into the view. Use the tag; the registry
loads the module when the tag appears in the DOM.

### Challenge — Bronze

- [ ] Run the generator
- [ ] Find the new file under `src/components/ui/`
- [ ] Find the registry line
- [ ] Start `npm run dev` and keep it running for the rest of the chapter

---

## Anatomy of a `CoreComponent`

Open the generated stub, then replace it with this Deskflow-oriented version.

```js
import { CoreComponent, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';
// Built-ins are already registered via frameworkRegistry — importing is optional
// when you only need the tag in the template, but an import forces eager load:
import '@components/core/nc-button.js';

export class TaskCard extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['title', 'done'];

    template() {
        return html`
            <style>
                :host { display: block; font-family: var(--nc-font-family, system-ui); }
                .card {
                    display: flex; align-items: center; justify-content: space-between;
                    gap: 0.75rem; padding: 0.75rem 1rem;
                    border: 1px solid var(--nc-border, #e2e8f0);
                    border-radius: 0.5rem; background: var(--nc-bg, #fff);
                    color: var(--nc-text, #0f172a);
                }
                .done { opacity: 0.55; text-decoration: line-through; }
            </style>
            <article class="card">
                <h3 ref="titleEl"></h3>
                <nc-button ref="toggleBtn" variant="outline" size="sm">Toggle</nc-button>
                <slot></slot>
            </article>
        `;
    }

    onMount() {
        // Local reactive state (lives only inside this instance)
        this.titleState = this.state(this.getAttribute('title') ?? '');
        this.doneState = this.state(this.hasAttribute('done'));

        // Push state into the DOM
        this.bind(this.titleState, this.titleEl);          // textContent
        this.bind(this.doneState, this.titleEl, '.done');  // toggle class

        // Native click on nc-button (it does NOT emit nc-button-click)
        this.on(this.toggleBtn, 'click', () => {
            this.doneState.value = !this.doneState.value;
            // Keep the attribute in sync for CSS / outer HTML
            if (this.doneState.value) this.setAttribute('done', '');
            else this.removeAttribute('done');

            // Tell the page what happened
            this.emit('task-card-toggle', {
                done: this.doneState.value,
                title: this.titleState.value,
            });
        });
    }

    // Called when observed attributes change from outside
    _handleAttributeUpdate(name, val) {
        if (name === 'title' && this.titleState) {
            this.titleState.value = val ?? '';
        }
        if (name === 'done' && this.doneState) {
            this.doneState.value = val !== null;
        }
    }
}

defineComponent('task-card', TaskCard);
```

### Piece by piece

| Piece | Meaning |
|-------|---------|
| `static useShadowDOM = true` | Styles and markup are encapsulated |
| `static observedAttributes` | Attributes the browser will notify you about |
| `template()` | HTML string (use `html` + `ref="…"` for elements) |
| `onMount()` | Runs once after first connect + template render |
| `this.state` / `this.bind` | Local reactivity without a virtual DOM |
| `this.on(el, type, fn)` | Listener; cleaned up when the component unmounts |
| `this.emit(name, detail)` | `CustomEvent` with `bubbles: true` and `composed: true` |
| `_handleAttributeUpdate` | Parent changed an attribute on the tag |

### Lifecycle (when things run)

```
element appears in DOM
  → connectedCallback (framework)
  → template rendered, refs wired
  → onMount()          ← you write logic here
  → attribute changes  → _handleAttributeUpdate(name, value)
element removed
  → onUnmount()        ← optional cleanup (this.on already auto-cleans)
  → disconnectedCallback
```

You almost never override `connectedCallback` yourself. Prefer `onMount` /
`onUnmount` / `_handleAttributeUpdate`.

---

## Put it in a view

In `src/views/…/tasks.html` (or whatever view you use for this lab):

```html
<div data-view="tasks">
    <h1 ref="titleEl">Tasks</h1>

    <!-- Static smoke test — one hard-coded card -->
    <task-card ref="demoCard" title="Write ebook chapter"></task-card>

    <!-- Later (ch. 07): empty list the controller fills -->
    <div ref="listEl"></div>
</div>
```

Save. Visit `/tasks`. You should see the card and a Toggle button.

### Challenge — Silver

- [ ] Card shows the title from the attribute
- [ ] Clicking Toggle strikes through the title
- [ ] Toggle again restores it

---

## Events → controller (the important bridge)

Components must not own the app’s task list. They **emit**. Controllers **listen**.

In `tasks.controller.js`:

```js
import { CoreController } from '@core/controller.js';

export class TasksController extends CoreController {
    onMount() {
        this.assertRefs('demoCard'); // or 'listEl' when you build the list

        // Listen on the card itself
        this.on(this.demoCard, 'task-card-toggle', (e) => {
            // e.detail is whatever the component passed to emit()
            console.log('toggled', e.detail.done, e.detail.title);
        });

        // OR listen on a parent and let the event bubble (delegation):
        // this.on(this.listEl, 'task-card-toggle', (e) => { … });
    }
}

export function tasksController(_params, _state, _loaderData, rootElement) {
    const ctrl = new TasksController(rootElement);
    return () => ctrl.destroy(); // removes this.on listeners
}
```

### Why this works across Shadow DOM

`this.emit('task-card-toggle', detail)` dispatches a `CustomEvent` with
`composed: true`. That lets the event cross the shadow boundary into light DOM
where the controller’s `this.on` is attached.

### Event rules of thumb

| Do | Don’t |
|----|--------|
| Name events `tag-action` (`task-card-toggle`) | Emit vague names like `change` without a prefix |
| Put data in `e.detail` | Reach into the component’s private fields |
| Listen with `this.on` so cleanup is automatic | Use raw `addEventListener` without removing it |
| Use native `click` on `nc-button` | Wait for a fictional `nc-button-click` event |

### Creating cards from the controller

Static HTML is fine for one demo card. For a list:

```js
const card = document.createElement('task-card');
card.setAttribute('title', task.title);
if (task.done) card.setAttribute('done', '');
this.listEl.appendChild(card);

// No rebind needed for custom elements alone.
// Call this.rebind(this.listEl) only if you inject HTML that contains new ref="…"
// attributes the controller itself needs.
```

Delegation (one listener for many cards):

```js
this.on(this.listEl, 'task-card-toggle', (e) => {
    const card = e.target.closest('task-card');
    // update your tasks array using card / e.detail
});
```

### Challenge — Gold

Without looking at Chapter 07:

- [ ] Log `e.detail` in the controller when Toggle is clicked
- [ ] Create a second card with `document.createElement('task-card')` and append it to `listEl`
- [ ] Use **one** delegated listener on `listEl` that handles both cards

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Extending something other than `CoreComponent` | Always extend `CoreComponent` |
| Tag without a hyphen | Custom elements require `task-card`, not `taskcard` |
| Importing the component module into the HTML view | Register in `appRegistry`; use the tag |
| `this.on('click', fn)` | Signature is `this.on(target, type, fn)` |
| Expecting `nc-button` to emit `nc-button-click` | Use native `click` |
| Forgetting `composed` events | Use `this.emit` — it sets `composed: true` for you |
| Binding with a CSS selector string as the element | `this.bind(state, this.titleEl)` — pass the ref element |

---

## Verify

- [ ] `task-card` is registered in `appRegistry`
- [ ] Card renders on `/tasks`
- [ ] Toggle updates the card UI
- [ ] Controller receives `task-card-toggle` with `{ done, title }`

---

## What’s next

- [Chapter 06 — CLI generators](./06-cli-generators.md) — full `make:*` / `remove:*` map  
- [Chapter 07 — Deskflow tasks](./07-deskflow-tasks.md) — real list, add/delete, store the array  
- [Chapter 13 — Slots](./13-slots-and-composition.md) — compose content inside the card  

You now have the core loop: **generate → customize → emit → listen**. Everything
else in NativeCoreJS is variations on that loop.
