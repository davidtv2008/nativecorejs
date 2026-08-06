# Chapter 05 — First Component

Reusable UI with `CoreComponent` and `make:component`.

## Generate

```bash
npm.cmd run make:component -- task-card --defaults
```

Creates:

- `src/components/ui/task-card.js` (or `.ts`)
- Registration in `src/components/appRegistry.*`

Optional tests:

```bash
npm.cmd run make:component -- task-card --defaults --with-tests
```

## What the generator creates

`make:component` scaffolds a `CoreComponent` with:

- `ref` wiring (`titleEl`, `descriptionEl`, `actionBtn`)
- `this.state` + `this.bind(state, element)` (not CSS-selector strings)
- `this.on(this.actionBtn, 'click', …)` — **native `click`** (nc-button does not emit `nc-button-click`)
- `this.emit('task-card-action', …)`

Rewrite the stub for Deskflow’s toggle behavior:

```js
import { CoreComponent, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';
import '@components/core/nc-button.js';

export class TaskCard extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['title', 'done'];

    template() {
        return html`
            <style>
                :host { display: block; }
                .done { opacity: 0.6; text-decoration: line-through; }
            </style>
            <article class="card">
                <h3 ref="titleEl"></h3>
                <nc-button ref="toggleBtn" variant="outline">Toggle</nc-button>
                <slot></slot>
            </article>
        `;
    }

    onMount() {
        this.titleState = this.state(this.getAttribute('title') ?? '');
        this.doneState = this.state(this.hasAttribute('done'));

        this.bind(this.titleState, this.titleEl);
        this.bind(this.doneState, this.titleEl, '.done');

        this.on(this.toggleBtn, 'click', () => {
            this.doneState.value = !this.doneState.value;
            this.emit('task-card-toggle', { done: this.doneState.value });
        });
    }

    _handleAttributeUpdate(name, val) {
        if (name === 'title' && this.titleState) this.titleState.value = val ?? '';
        if (name === 'done' && this.doneState) this.doneState.value = val !== null;
    }
}

defineComponent('task-card', TaskCard);
```

Notes:

- Prefer **`CoreComponent`**, not the deprecated `Component` shim, for new code.
- `this.bind(state, string)` sets an **instance property** — it is not a querySelector.
  Always bind to a ref element: `this.bind(state, this.titleEl)`.
- Prefer `this.emit` over deprecated `emitEvent`.
- Framework `nc-*` tags used inside your component still need to be registered
  (built-ins already are via `frameworkRegistry`).

## Use it in a view

```html
<task-card title="Write ebook chapter"></task-card>
```

Listen from a controller:

```js
this.on(this.el, 'task-card-toggle', (e) => {
    console.log(e.detail.done);
});
```

(`composed: true` custom events cross shadow boundaries.)

## Apply to Deskflow

> **Feature:** Render each task with `<task-card>`.

1. Generate `task-card`.
2. In `tasks.html`, add a container `ref="listEl"`.
3. In the controller, create cards (static HTML string or `document.createElement('task-card')`) and append to `listEl`.
4. Call `this.rebind(this.listEl)` if you inject markup that contains new `ref`s you need on the controller (usually not required for custom elements alone).

## Verify

- [ ] Tag appears in `appRegistry`
- [ ] Cards render under `/tasks`
- [ ] Toggle emits an event the controller can hear

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Extending deprecated `Component` for new UI | Use `CoreComponent` |
| Forgetting hyphen in tag name | Custom elements require a hyphen |
| Importing the component module into the view | Register + use the tag |

## Next

[Chapter 06 — CLI generators](./06-cli-generators.md)
