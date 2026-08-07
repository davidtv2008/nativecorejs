# Chapter 12 — Forms and nc-inputs

Deskflow's task creation has been a `window.prompt`. That was fine for smoke-testing. Now it is time to give users a real form — a modal overlay with a labeled text field, a priority selector, a save button, and validation feedback before anything hits the API.

This chapter builds that form using the scaffold's `nc-*` form controls and introduces the built-in validation helpers in `src/utils/validation.js`.

---

## Mental model

```
View HTML                    Controller
<nc-modal ref="modalEl">     this.on(openBtn, 'click', () => open the modal)
  <nc-input ref="titleInput"> this.on(saveBtn, 'click', () => validate + addTask)
  <nc-select ref="priSelect"> read .value from each input ref
  <nc-button ref="saveBtn">   close modal on success, show error on failure
</nc-modal>
```

NativeCoreJS does not ship a `useForm` hook or a central form manager. Each `nc-input` is an autonomous web component that exposes a `.value` property and fires `input` / `change` events. You validate and submit in the controller. This keeps the component library framework-agnostic and your validation logic fully visible.

---

## Available form controls

These are registered in `frameworkRegistry` and available in any view without an explicit import:

| Tag | What it does |
|-----|-------------|
| `nc-input` | Single-line text, email, password, number, search |
| `nc-textarea` | Multi-line text |
| `nc-select` | Dropdown with JSON options or `<option>` children |
| `nc-checkbox` | Boolean checkbox |
| `nc-switch` | Toggle switch (also boolean) |
| `nc-button` | Action button with variants and loading state |
| `nc-modal` | Dialog overlay with header, body, and footer slots |
| `nc-snackbar` | Global toast manager (attach once to the app shell) |

Confirm the exact API of any component by reading its source file in `src/components/core/` — that is always the authoritative reference.

---

## `nc-input` public API

From source (`nc-input.ts`):

```
Attributes:  name, value, type, placeholder, label, disabled, readonly,
             required, maxlength, minlength, pattern, error, hint, clearable
Events:      input, change, clear
Public API:  .value (get/set), .checkValidity(), .validate(),
             .reportValidity(), .clearValidationError()
```

Read the attribute with `.value`, not `.getAttribute('value')` — the getter always returns the current text field content.

---

## `nc-select` public API

Pass options as a JSON attribute:

```html
<nc-select
    ref="priSelect"
    name="priority"
    placeholder="Priority"
    options='[
        {"value":"low","label":"Low"},
        {"value":"medium","label":"Medium"},
        {"value":"high","label":"High"}
    ]'>
</nc-select>
```

Listen for the `change` event to react immediately:

```js
this.on(this.priSelect, 'change', (e) => {
    const { value, label } = e.detail;  // e.detail = { value, label, name }
});
```

Read the current value at submit time: `this.priSelect.getAttribute('value')` or check `e.detail.value` from a stored reference.

---

## `nc-modal` — open and close

The modal is controlled by the boolean `open` attribute:

```js
// Open
this.modalEl.setAttribute('open', '');

// Close
this.modalEl.removeAttribute('open');
```

It also has a static API if you give the element an `id`:

```js
NcModal.open('add-task-modal');
NcModal.close('add-task-modal');
```

Use whichever pattern you find clearer. The attribute approach pairs naturally with `ref` in a controller.

---

## Validation helpers

The scaffold ships `src/utils/validation.js` (or `.ts`). The functions you will use most:

```js
import { isRequired, minLength, maxLength, isValidEmail } from '@utils/validation.js';

isRequired('');           // false
isRequired('Buy milk');   // true
minLength(3)('Hi');       // false
minLength(3)('Hey');      // true
maxLength(100)('...');    // true
isValidEmail('x@y.com'); // true
```

Compose validators in your controller — no magic framework needed.

---

## Lab — Build the new-task modal

### Step 1 — Update the view

In `src/views/public/tasks.html` (or your tasks view):

```html
<div data-view="tasks">
    <header class="tasks-header">
        <h1>Deskflow</h1>
        <nc-button ref="openBtn" variant="primary">New task</nc-button>
    </header>

    <div ref="listEl" class="task-list"></div>

    <nc-modal ref="modalEl" size="md">
        <span slot="header">New task</span>

        <div class="form-body">
            <nc-input
                ref="titleInput"
                label="Title"
                placeholder="What needs doing?"
                required
                maxlength="120">
            </nc-input>

            <nc-select
                ref="priSelect"
                label="Priority"
                name="priority"
                placeholder="Select priority"
                options='[
                    {"value":"low","label":"Low"},
                    {"value":"medium","label":"Medium"},
                    {"value":"high","label":"High"}
                ]'>
            </nc-select>
        </div>

        <div slot="footer">
            <nc-button ref="cancelBtn" variant="ghost">Cancel</nc-button>
            <nc-button ref="saveBtn" variant="primary">Save task</nc-button>
        </div>
    </nc-modal>
</div>
```

No `<style>` or `<script>` tags in view files — markup only.

### Step 2 — Wire the controller

In `src/controllers/tasks.controller.js`:

```js
import { CoreController } from '@core/controller.js';
import { addTask } from '@stores/task.store.js';
import { isRequired, maxLength } from '@utils/validation.js';
import { NcSnackbar } from '@components/core/nc-snackbar.js';

export class TasksController extends CoreController {
    onMount() {
        this.assertRefs(
            'listEl', 'openBtn', 'modalEl',
            'titleInput', 'priSelect', 'cancelBtn', 'saveBtn'
        );

        // Open
        this.on(this.openBtn, 'click', () => {
            this.titleInput.value = '';
            this.titleInput.clearValidationError?.();
            this.modalEl.setAttribute('open', '');
        });

        // Cancel
        this.on(this.cancelBtn, 'click', () => {
            this.modalEl.removeAttribute('open');
        });

        // Save
        this.on(this.saveBtn, 'click', () => this.handleSave());
    }

    async handleSave() {
        const title = (this.titleInput.value ?? '').trim();
        const priority = this.priSelect.getAttribute('value') ?? 'medium';

        // Validate
        if (!isRequired(title)) {
            this.titleInput.setAttribute('error', 'Title is required');
            return;
        }

        if (!maxLength(120)(title)) {
            this.titleInput.setAttribute('error', 'Title must be 120 characters or fewer');
            return;
        }

        // Persist
        await addTask({ id: String(Date.now()), title, priority, done: false });

        // Feedback
        NcSnackbar.show({ message: 'Task added', variant: 'success' });
        this.modalEl.removeAttribute('open');
    }
}

export function tasksController(_params, _state, _loaderData, rootElement) {
    const ctrl = new TasksController(rootElement);
    return () => ctrl.destroy();
}
```

Walk through the pattern:

| Line | Why |
|------|-----|
| `assertRefs(...)` | Fails fast with a clear error if a `ref="..."` is missing in the view |
| `this.on(target, event, fn)` | Listener registered through the controller — auto-cleaned on `destroy()` |
| `this.titleInput.value` | Public getter on `nc-input`, always current |
| `this.titleInput.setAttribute('error', '...')` | Shows the inline error state on the component |
| `NcSnackbar.show(...)` | Static method — fires a toast anywhere without a ref |

### Step 3 — Confirm `nc-snackbar` is in the app shell

`NcSnackbar.show` works by finding the first `<nc-snackbar>` element in the document. Add one to `index.html` (the app shell) if it is not already there:

```html
<!-- in index.html, outside #main-content -->
<nc-snackbar position="bottom-right"></nc-snackbar>
```

---

## Apply to Deskflow

> **Feature:** Replace `window.prompt` with a real modal form for adding tasks.

1. Update the tasks view with the modal markup above.
2. Wire `openBtn`, `cancelBtn`, and `saveBtn` in the controller.
3. Validate title before calling `addTask`.
4. Show a snackbar on success.
5. If you added the `error` attribute manually, clear it when the user starts typing again:

```js
this.on(this.titleInput, 'input', () => {
    this.titleInput.removeAttribute('error');
});
```

---

## Verify

- [ ] Empty title shows the error attribute on `nc-input` and does not add a task
- [ ] A title over 120 characters is rejected with a specific message
- [ ] Successful save closes the modal and shows a snackbar toast
- [ ] Canceling the modal does not add anything
- [ ] `nc-snackbar` is in the app shell and `NcSnackbar.show` works

---

## Challenges

**Bronze** — Add a `nc-textarea` for optional notes. Include the notes value in the task object passed to `addTask`.

**Silver** — Add a `nc-checkbox` labeled "High priority shortcut" that pre-sets the `nc-select` to `high` when checked. Listen to the `change` event on the checkbox and call `this.priSelect.setAttribute('value', 'high')`.

**Gold** — Extract the validation logic into a reusable `validateTaskForm(title, priority)` function in `src/utils/validation.js` that returns an array of error strings. Call it from the controller and display the first error. Write a unit test for it in `tests/unit/` using Vitest.

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Reading `nc-input` value with `.getAttribute('value')` | Use `.value` (the public getter) — the attribute does not update after user types |
| Using `nc-input`'s `input` event for submit | Listen for `saveBtn` click; `input` is for live feedback only |
| Forgetting `clearValidationError()` when re-opening the modal | Call it (or `removeAttribute('error')`) on open so stale errors do not show |
| `NcSnackbar.show` silently does nothing | Confirm `<nc-snackbar>` is in `index.html` — the static method looks for the element in the DOM |
| Putting `<style>` tags in the view HTML file | Styles go in `src/styles/main.css` or inside a `CoreComponent` template — never in view HTML |

---

## Next

[Chapter 13 — Core components](./13-core-components.md)
