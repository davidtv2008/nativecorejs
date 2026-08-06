# Chapter 11 — Forms and nc-inputs

Build the create-task form with scaffold `nc-*` controls.

## Accuracy note

Form helpers like package `useForm` / core validators are **not** vendored into
create-nativecore `.nativecore/core`. Use components + your own validation
(scaffold may include `src/utils/validation.js` — check your tree).

## Components you will use

Registered in `frameworkRegistry` (among others):

- `nc-input`, `nc-textarea`, `nc-select`, `nc-checkbox`, `nc-switch`
- `nc-button`, `nc-modal`, `nc-snackbar`

## Pattern

View:

```html
<nc-button ref="openBtn">New task</nc-button>

<nc-modal ref="modalEl">
    <h2 slot="header">New task</h2>
    <nc-input ref="titleInput" label="Title"></nc-input>
    <nc-button ref="saveBtn" variant="primary">Save</nc-button>
</nc-modal>
```

Controller sketch (`nc-input` exposes a `.value` getter/setter in scaffold
source; confirm `nc-modal` / `nc-snackbar` open/show APIs in their files before
shipping):

```js
import { addTask } from '@stores/task.store.js';
// Snackbar helper (class lives on the custom element):
// import … or call NcSnackbar.show after confirming the export in nc-snackbar.*

this.on(this.openBtn, 'click', () => this.modalEl.setAttribute('open', ''));
this.on(this.saveBtn, 'click', () => {
    const title = (this.titleInput.value ?? '').trim();
    if (!title) return;
    addTask({ id: String(Date.now()), title, done: false });
    this.modalEl.removeAttribute('open');
});
```

## Apply to Deskflow

> **Feature:** Replace `window.prompt` with a modal form.

1. Inspect `nc-modal` / `nc-input` sources for events and attributes.
2. Wire open/save/cancel in `tasks.controller.js`.
3. On success, invalidate API tags if you use `api.getCached`.

## Verify

- [ ] Empty title does not add a task
- [ ] Successful save updates the list and closes the modal

## Next

[Chapter 12 — Core components](./12-core-components.md)
