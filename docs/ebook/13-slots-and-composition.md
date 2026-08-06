# Chapter 13 — Slots and Composition

Compose UI with light-DOM children and named slots.

## How slots work here

`CoreComponent` templates are ordinary Shadow DOM markup. Put `<slot>` /
`<slot name="…">` in the template; consumers pass children in light DOM.

Shipped example — `nc-modal` (from source):

- Default slot → body
- `slot="header"` → header
- `slot="footer"` → footer

Chapter 05’s `task-card` already has a default `<slot></slot>`. Extend it.

## Named slots on `task-card`

```js
template() {
    return html`
        <style>
            :host { display: block; }
            .meta { font-size: 0.85rem; opacity: 0.7; }
        </style>
        <article class="card">
            <header><slot name="title"></slot></header>
            <div class="body"><slot></slot></div>
            <footer class="meta"><slot name="meta"></slot></footer>
        </article>
    `;
}
```

Use in a view or when creating elements:

```html
<task-card data-id="1">
    <span slot="title">Ship Deskflow detail route</span>
    Notes for later…
    <span slot="meta">due Friday</span>
</task-card>
```

## Composition guidelines

1. Prefer slots for structure the parent owns (labels, actions, meta).
2. Prefer attributes/state for data the component owns (`done`, `title` if not slotted).
3. Style slotted content with `::slotted(...)` inside the component’s `<style>`.
4. Events still bubble/`composed` out of shadow roots when you `this.emit(...)`.

## Apply to Deskflow

> **Feature:** Cards show title + optional notes via slots.

1. Update `task-card` slots as above.
2. When rendering the list, set `slot="title"` / default content from each task.
3. Keep toggle behavior on the component (or move actions into a footer slot).

## Verify

- [ ] Named and default slot content appear in the right places
- [ ] Toggle / events still work after the template change

## Next

[Chapter 14 — Styling and tokens](./14-styling-and-tokens.md)
