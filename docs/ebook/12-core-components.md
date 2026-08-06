# Chapter 12 — Core Components

Built-in `nc-*` tags are batteries for Deskflow polish. Your **app** components
(`task-card`, …) stay first-class; `nc-*` fill in buttons, overlays, and feedback
so you are not reinventing them.

Live catalog: [nativecorejs.com/components](https://nativecorejs.com/components)
(or `/components` on a local showcase). Source of truth in an app:

- `src/components/core/nc-*.js|ts`
- `src/components/frameworkRegistry.*`

---

## How to learn any `nc-*` (2 minutes)

1. Open the file for that tag
2. Read `observedAttributes` / `attributeOptions`
3. Search for `this.emit(` — those are the public events
4. Prefer **attributes + events** over poking internal DOM

`nc-button` is special: use the native **`click`** event (no `nc-button-click`).

---

## Recipe 1 — Primary actions with `nc-button`

```html
<nc-button ref="addBtn" variant="primary">Add task</nc-button>
<nc-button ref="cancelBtn" variant="ghost">Cancel</nc-button>
```

```js
this.on(this.addBtn, 'click', () => this.addTask());
```

Useful attributes: `variant`, `size`, `disabled`, `loading`.

---

## Recipe 2 — Toast feedback with `nc-snackbar`

In the view (once per page is enough):

```html
<nc-snackbar ref="snackEl"></nc-snackbar>
```

In the controller after create/delete:

```js
this.on(this.addBtn, 'click', () => {
    this.addTask();
    if (typeof this.snackEl.show === 'function') {
        this.snackEl.show('Task added');
    } else {
        this.snackEl.setAttribute('message', 'Task added');
        this.snackEl.setAttribute('open', '');
    }
});
```

Confirm the exact API in `nc-snackbar` source — some builds expose `.show()`,
others are attribute-driven. Both patterns are fine if they match your file.

---

## Recipe 3 — Open count badge

```html
<h1>
    Tasks
    <nc-badge ref="badgeEl">0</nc-badge>
</h1>
```

```js
this.openCount = this.compute(
    () => this.tasks.value.filter((t) => !t.done).length
);
this.bind(this.openCount, this.badgeEl);
```

---

## Recipe 4 — Confirm delete with `nc-modal`

```html
<nc-modal ref="confirmModal">
    <span slot="header">Delete task?</span>
    <p>This cannot be undone.</p>
    <div slot="footer">
        <nc-button ref="cancelDeleteBtn" variant="ghost">Cancel</nc-button>
        <nc-button ref="confirmDeleteBtn" variant="danger">Delete</nc-button>
    </div>
</nc-modal>
```

```js
this.on(this.cancelDeleteBtn, 'click', () => {
    this.confirmModal.removeAttribute('open');
});
this.on(this.confirmDeleteBtn, 'click', () => {
    this.deletePending();
    this.confirmModal.removeAttribute('open');
});

// Somewhere when user asks to delete:
this.pendingDeleteId = id;
this.confirmModal.setAttribute('open', '');
```

Modal / drawer set `open` as a boolean attribute. They emit `open` / `close`
if you need to react.

---

## Recipe 5 — Filters in a `nc-drawer`

```html
<nc-button ref="filterBtn" variant="outline">Filters</nc-button>
<nc-drawer ref="filterDrawer" placement="right" size="320px">
    <span slot="header">Filters</span>
    <label><input ref="showDoneEl" type="checkbox" checked /> Show done</label>
</nc-drawer>
```

```js
this.on(this.filterBtn, 'click', () => {
    this.filterDrawer.setAttribute('open', '');
});
```

---

## Categories cheat sheet

| Category | Examples |
|----------|----------|
| Inputs | `nc-input`, `nc-textarea`, `nc-select`, `nc-checkbox`, `nc-switch` |
| Actions | `nc-button`, `nc-copy-button` |
| Feedback | `nc-alert`, `nc-snackbar`, `nc-badge`, `nc-progress` |
| Overlays | `nc-modal`, `nc-drawer`, `nc-popover`, `nc-tooltip` |
| Navigation | `nc-tabs`, `nc-breadcrumb`, `nc-pagination` |
| Data | `nc-table`, `nc-timeline`, `nc-code` |

Shell chrome (opt-in): `app-header`, `app-sidebar`, `app-footer`.

Keep your own UI under `src/components/ui/` via `make:component`. Pull newer
framework tags into an existing app with `npm run sync:components` when available.

---

## Challenges

**Bronze** — Add `nc-snackbar` and toast when a task is added.

**Silver** — Show open count in `nc-badge`; keep it in sync when toggling done.

**Gold** — Confirm deletes with `nc-modal` before removing from the array.

---

## Verify

- [ ] No “unknown custom element” warnings for tags you use
- [ ] Tags resolve via `frameworkRegistry` (built-ins) or `appRegistry` (yours)
- [ ] You did not copy-paste APIs you did not confirm in source

## Next

[Chapter 13 — Slots and composition](./13-slots-and-composition.md)
