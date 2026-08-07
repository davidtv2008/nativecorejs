# Chapter 13 — Slots and Composition

The `task-card` component you built in Chapter 05 has a default `<slot>`. That is a start, but it is not very flexible. If you want to put a due-date badge in the footer, an action button in the header, and some notes text in the body — all optionally — you need **named slots**.

This chapter teaches you how Shadow DOM slots work, extends `task-card` with a real three-zone layout, and shows how to style projected content from inside the component.

---

## Mental model

```
Light DOM (consumer)              Shadow DOM (component template)
─────────────────────────────     ────────────────────────────────
<task-card>
  <span slot="title">...</span>  → <slot name="title">  in template
  Some plain text...             → <slot>               (default)
  <span slot="meta">Due Fri</span>→ <slot name="meta"> in template
</task-card>
```

Content in light DOM is projected into the matching named slot at render time. The component's Shadow DOM controls the layout; the consumer controls the content. Neither side knows too much about the other.

Rules to remember:

- Content without a `slot="..."` attribute lands in the **default** slot (`<slot></slot>`).
- Content with `slot="name"` lands in `<slot name="name">`.
- If a slot has no matching content, the slot's fallback content (anything between the `<slot>` tags) renders instead.
- `::slotted(selector)` lets you style projected content from inside the shadow root.

---

## Extending `task-card` from Chapter 05

Open `src/components/ui/task-card.js`. You will replace the template from Chapter 05 with a three-zone layout: header (title), body (default notes slot), footer (meta).

```js
import { CoreComponent, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';

export class TaskCard extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['title', 'done', 'priority'];

    template() {
        return html`
            <style>
                :host {
                    display: block;
                    font-family: var(--nc-font-family, system-ui);
                    border: 1px solid var(--nc-border, #e2e8f0);
                    border-radius: var(--nc-radius-md, 0.5rem);
                    background: var(--nc-bg, #fff);
                    overflow: hidden;
                    transition: box-shadow var(--nc-transition-fast, 150ms);
                }
                :host(:focus-within),
                :host(:hover) { box-shadow: var(--nc-shadow-md, 0 4px 6px rgba(0,0,0,.08)); }

                .header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem 0;
                }
                .body {
                    padding: 0.25rem 1rem 0;
                    min-height: 0;
                }
                .footer {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem 0.75rem;
                }

                /* Style text projected into the title slot */
                ::slotted([slot="title"]) {
                    font-size: var(--nc-font-size-base, 1rem);
                    font-weight: var(--nc-font-weight-medium, 500);
                    color: var(--nc-text, #0f172a);
                    margin: 0;
                }
                /* Dim title when done */
                :host([done]) ::slotted([slot="title"]) {
                    text-decoration: line-through;
                    opacity: 0.55;
                }

                /* Style projected meta content */
                ::slotted([slot="meta"]) {
                    font-size: var(--nc-font-size-sm, 0.875rem);
                    color: var(--nc-text-secondary, #64748b);
                }

                /* Notes body — any plain text */
                ::slotted(:not([slot])) {
                    font-size: var(--nc-font-size-sm, 0.875rem);
                    color: var(--nc-text-secondary, #64748b);
                    line-height: 1.5;
                }

                nc-button { flex-shrink: 0; }
            </style>

            <article class="card">
                <div class="header">
                    <slot name="title"></slot>
                    <nc-button ref="toggleBtn" variant="ghost" size="sm">
                        Done
                    </nc-button>
                </div>

                <div class="body">
                    <slot></slot>
                </div>

                <footer class="footer">
                    <slot name="meta"></slot>
                </footer>
            </article>
        `;
    }

    onMount() {
        this.doneState = this.state(this.hasAttribute('done'));

        // Keep host attribute in sync with state (for CSS :host([done]) selector)
        this.effect(() => {
            if (this.doneState.value) this.setAttribute('done', '');
            else this.removeAttribute('done');
        });

        this.on(this.toggleBtn, 'click', () => {
            this.doneState.value = !this.doneState.value;
            this.emit('task-card-toggle', {
                done: this.doneState.value,
            });
        });
    }

    _handleAttributeUpdate(name, val) {
        if (name === 'done' && this.doneState) {
            this.doneState.value = val !== null;
        }
    }
}

defineComponent('task-card', TaskCard);
```

The component no longer binds `titleState` to a ref — the title text lives in light DOM, projected through the named slot. `::slotted([slot="title"])` handles its styling.

---

## Using the new slots in a view

In your tasks view HTML:

```html
<task-card data-id="1">
    <span slot="title">Ship Deskflow detail route</span>
    Sometimes you just need to click the deploy button.
    <span slot="meta">Due Friday</span>
</task-card>
```

Creating cards dynamically from the controller:

```js
function buildCard(task) {
    const card = document.createElement('task-card');
    card.dataset.id = task.id;
    if (task.done) card.setAttribute('done', '');

    const titleEl = document.createElement('span');
    titleEl.slot = 'title';
    titleEl.textContent = task.title;
    card.appendChild(titleEl);

    if (task.notes) {
        const notes = document.createElement('p');
        notes.textContent = task.notes;
        card.appendChild(notes);
    }

    if (task.dueDate) {
        const meta = document.createElement('span');
        meta.slot = 'meta';
        meta.textContent = task.dueDate;
        card.appendChild(meta);
    }

    return card;
}
```

Delegation still works the same way:

```js
this.on(this.listEl, 'task-card-toggle', (e) => {
    const card = e.target.closest('task-card');
    const id = card?.dataset.id;
    // update store
});
```

---

## Fallback slot content

Put default markup between the slot tags and it renders when no matching light-DOM content is provided:

```html
<slot name="meta">
    <span class="no-meta">No due date</span>
</slot>
```

Fallback content is hidden the moment matching content is slotted in.

---

## Apply to Deskflow

> **Feature:** Task cards show title via a named slot, optional notes in the default slot, and an optional due-date badge in the footer slot.

1. Update `task-card.js` with the three-zone template above.
2. Update the controller's `buildCard` helper to set `slot="title"` on the title element.
3. Pass `task.notes` (if present) as a plain child element.
4. Confirm `::slotted([slot="title"])` styles are applied.
5. Confirm toggle still fires `task-card-toggle` and the controller handles it.

---

## Verify

- [ ] Named slot content (`slot="title"`, `slot="meta"`) appears in the correct zone
- [ ] The default slot renders body/notes content
- [ ] `::slotted([slot="title"])` style is applied (visible in DevTools Styles panel)
- [ ] Toggle event still works after the template change
- [ ] Strikethrough applies to the title when `done` attribute is set

---

## Challenges

**Bronze** — Add a `slot="actions"` in the card footer beside the existing meta slot. Pass an `nc-button` for delete into that slot from the controller.

**Silver** — Show a fallback `<span class="no-due-date">No due date set</span>` inside `<slot name="meta">` that disappears when real meta content is projected.

**Gold** — Add a `priority` observed attribute. Use `:host([priority="high"])` to draw a colored left border on the card without touching the slotted content. Test that setting `priority="high"` on the element applies the border.

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Styling slotted content with regular selectors inside shadow CSS | Use `::slotted(selector)` — normal selectors do not pierce the slot boundary |
| Expecting attributes on slotted children to be visible inside the component | Slotted content stays in light DOM — the component cannot read its attributes directly |
| Using `innerHTML` to build cards with `slot="..."` attributes | Create elements with `document.createElement` and set `.slot = 'name'` on the element |
| Forgetting `composed: true` on custom events inside shadow roots | Use `this.emit(name, detail)` — it sets `composed: true` for you so events bubble out |
| `::slotted` with a descendant selector like `::slotted(.card span)` | Only the top-level slotted element is selectable; descendant selectors inside `::slotted` are not supported |

---

## Next

[Chapter 14 — Styling and Tokens](./14-styling-and-tokens.md)
