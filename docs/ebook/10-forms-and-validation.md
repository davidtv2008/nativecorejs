# Chapter 10 — Forms and Validation

> **What you'll build in this chapter:** Build Taskflow's "Create Task" form inside an `<nc-modal>` with `<nc-input>` for the title, `<nc-select>` for priority, client-side validation, and a `api.post()` submit handler that closes the modal and shows a success toast on success.

Forms are the primary way users create and update data. NativeCoreJS's `nc-*` input components handle accessibility, styling, and interactive states out of the box, but you still need to wire up reading values, validating input, displaying errors, and calling the API. This chapter codifies that pattern and builds the Taskflow "create task" form inside an `<nc-modal>`.

---

## Input Components at a Glance

Every `nc-*` form element stores its current value in a `.value` property and mirrors it as a `value` attribute. Read them via `dom.$`:

```typescript
const input  = scope.$('#task-title') as any;
const value  = input.value;          // current string value
```

### `<nc-input>`

The general-purpose text field.

```html
<nc-input
  id="task-title"
  label="Task title"
  placeholder="e.g. Write release notes"
  clearable
  error="Title is required"
  hint="Keep it under 80 characters"
></nc-input>
```

Set `error` to a non-empty string to show the field in an error state with the message underneath. Clear it (`setAttribute('error', '')`) to reset. The `hint` attribute shows helper text when there is no error.

### `<nc-select>`

```html
<nc-select
  id="task-priority"
  label="Priority"
  options='[
    {"label":"Low",    "value":"low"},
    {"label":"Medium", "value":"medium"},
    {"label":"High",   "value":"high"}
  ]'
  value="medium"
></nc-select>
```

Read the selected value the same way: `(scope.$('#task-priority') as any).value`.

### `<nc-switch>`

A toggle for boolean fields:

```html
<nc-switch id="task-notify" label="Notify assignee"></nc-switch>
```

```typescript
const notify = (scope.$('#task-notify') as any).checked; // boolean
```

### `<nc-number-input>`

For numeric fields like estimated hours:

```html
<nc-number-input
  id="task-hours"
  label="Estimated hours"
  min="0"
  max="999"
  step="0.5"
></nc-number-input>
```

---

## Reading and Validating a Form

### Option A — `useForm()` Helper (Recommended)

`useForm()` is now exported directly from the `nativecorejs` package, alongside a set of composable validators (`required`, `minLength`, `maxLength`, `email`, `url`, `pattern`, `min`, `max`, `oneOf`, `compose`). It manages field state, dirty/touched tracking, computed validation, submit blocking, and a one-line `bindField()` helper for native and `<nc-*>` controls — all backed by the same reactive `useState`/`computed` primitives covered in earlier chapters.

The `create-nativecore` template re-exports the same helper from `src/utils/form.ts` so your existing imports continue to work:

```typescript
// Either of these works:
import { useForm, required, maxLength } from 'nativecorejs';
import { useForm } from '@utils/form.js';
import { required, maxLength } from '@utils/validation.js';

const form = useForm({
    initialValues: {
        title:     '',
        priority:  'medium',
        projectId: '',
        hours:     0,
    },
    rules: {
        title:     [required(), maxLength(80)],
        projectId: [required()],
    },
});
```

> Validators are factory functions — call them (`required()`, `maxLength(80)`) so you can pass custom messages: `required('Title is required')`.

`useForm()` returns:

| Property | Type | Purpose |
|---|---|---|
| `fields.title` | `State<string>` | Reactive field value |
| `touched.title` | `State<boolean>` | True after first blur |
| `dirty.title` | `State<boolean>` | True if value differs from initial |
| `errors` | `ComputedState<Record<string,string>>` | Validation errors map |
| `isValid` | `ComputedState<boolean>` | True when `errors` is empty |
| `isDirty` | `ComputedState<boolean>` | True when any field is dirty |
| `getValues()` | `() => T` | Snapshot of all field values |
| `reset(values?)` | `(partial?) => void` | Reset to initial or given values |
| `submit(handler)` | `(fn) => async fn` | Wraps submit: marks all touched, checks validity, calls handler |
| `bindField(name, target)` | `(key, el) => cleanup` | Two-way bind a field to a native `<input>`/`<select>` |

**Using `submit()`** eliminates the boilerplate `e.preventDefault()` + validity check + error display pattern:

```typescript
const handleSubmit = form.submit(async (values) => {
    await api.post('/tasks', values);
    api.invalidateTags('tasks');
    modal.close();
    form.reset();
});

events.on(scope.$('#btn-create'), 'click', handleSubmit);
```

If `isValid` is `false` when `handleSubmit` fires, `submit()` marks all fields as touched (so errors appear) and returns `false` without calling the handler.

**Binding reactive errors to `nc-*` fields:**

```typescript
const stopErrorEffect = effect(() => {
    const errs = form.errors.value;
    for (const id of ['title', 'projectId', 'hours']) {
        scope.$(`#task-${id}`)?.setAttribute('error', errs[id] ?? '');
    }
});
disposers.push(stopErrorEffect);
```

**Cleanup** — `useForm()` creates internal `computed()` nodes (`errors`, `isValid`, `isDirty`). Dispose them when the controller cleans up:

```typescript
return () => {
    form.errors.dispose();
    form.isValid.dispose();
    form.isDirty.dispose();
    disposers.forEach(d => d());
    events.cleanup();
};
```

### Option B — Inline Validation Helper

For simpler forms you can write a plain validation function without `useForm()`:

```typescript
function validateTaskForm(scope: any) {
  const errors: Record<string, string> = {};

  const title    = (scope.$('#task-title') as any).value?.trim() ?? '';
  const priority = (scope.$('#task-priority') as any).value;
  const hours    = parseFloat((scope.$('#task-hours') as any).value);

  if (!title)              errors['task-title']    = 'Title is required.';
  if (title.length > 80)   errors['task-title']    = 'Title must be 80 characters or fewer.';
  if (!priority)           errors['task-priority'] = 'Please choose a priority.';
  if (isNaN(hours) || hours < 0) errors['task-hours'] = 'Enter a valid number of hours.';

  return Object.keys(errors).length ? errors : null;
}
```

### The `@utils/validation.js` Primitives

Whether you use `useForm()` or roll your own, the template's validators are composable building blocks:

```typescript
import {
    isRequired, minLength, maxLength,
    isValidEmail, isNumber, isInteger,
    isValidURL, matchesPattern,
    validateForm,
} from '@utils/validation.js';

// Use as validators in useForm rules:
rules: { email: [isRequired, isValidEmail] }

// Or call validateForm() directly with an ad-hoc rules map:
const errors = validateForm(
    { email: 'bad', age: 'abc' },
    { email: [isRequired, isValidEmail], age: [isNumber] }
);
// → { email: 'Validation failed for email', age: 'Validation failed for age' }
```

> **Rule of thumb:** Use `useForm()` for any form with three or more fields, or whenever you need dirty/touched tracking. Use the inline pattern for quick one-field confirmations (e.g. a "reason for deletion" text box).

Apply or clear per-field errors in one loop (used by both approaches):

```typescript
function applyErrors(scope: any, errors: Record<string, string> | null, fieldIds: string[]) {
  for (const id of fieldIds) {
    (scope.$(`#${id}`) as HTMLElement).setAttribute('error', errors?.[id] ?? '');
  }
}
```

---

## The `<nc-modal>` for the Create Task Form

`<nc-modal>` is the recommended container for focused operations like creating a task. It manages focus trapping and closing on Escape automatically.

```html
<!-- Inside tasks.html -->
<div data-view="tasks">

  <header class="page-header">
    <h1>Tasks</h1>
    <nc-button id="btn-open-create" variant="primary" icon="plus">
      New Task
    </nc-button>
  </header>

  <nc-modal id="modal-create-task" size="md" heading="Create Task">
    <div slot="body">
      <nc-input
        id="task-title"
        label="Task title"
        placeholder="e.g. Write release notes"
        clearable
      ></nc-input>

      <nc-select
        id="task-project"
        label="Project"
      ></nc-select>

      <nc-select
        id="task-priority"
        label="Priority"
        options='[
          {"label":"Low",    "value":"low"},
          {"label":"Medium", "value":"medium"},
          {"label":"High",   "value":"high"}
        ]'
        value="medium"
      ></nc-select>

      <nc-number-input
        id="task-hours"
        label="Estimated hours"
        min="0"
        step="0.5"
      ></nc-number-input>

      <nc-switch id="task-notify" label="Notify assignee on creation"></nc-switch>

      <nc-alert type="error" id="task-form-error" hidden></nc-alert>
    </div>

    <div slot="footer">
      <nc-button id="btn-cancel-task" variant="ghost">Cancel</nc-button>
      <nc-button id="btn-save-task"   variant="primary">Save task</nc-button>
    </div>
  </nc-modal>

</div>
```

### `tasksController.ts` — form handling excerpt

```typescript
import { dom }         from '@core-utils/dom.js';
import { api }         from '@services/api.service.js';
import { useState }    from '@core/state.js';
import { trackEvents } from '@core-utils/events.js';

export async function tasksController(): Promise<() => void> {
  const scope     = dom.view('tasks');
  const { on, dispose } = trackEvents();

  const modal      = scope.$('#modal-create-task') as any;
  const saveBtn    = scope.$('#btn-save-task')     as any;
  const fieldIds   = ['task-title', 'task-project', 'task-priority', 'task-hours'];

  const isSaving = useState(false);

  isSaving.subscribe(saving => {
    saveBtn.toggleAttribute('loading',  saving);
    saveBtn.toggleAttribute('disabled', saving);
  });

  // Open modal
  on('click', '#btn-open-create', async () => {
    await populateProjectSelect();
    clearForm();
    modal.open();
  });

  // Close modal
  on('click', '#btn-cancel-task', () => modal.close());

  // Submit
  on('click', '#btn-save-task', async () => {
    const errors = validateTaskForm(scope);
    applyErrors(scope, errors, fieldIds);
    if (errors) return;

    isSaving.value = true;

    try {
      const payload = {
        title:      (scope.$('#task-title')    as any).value.trim(),
        projectId:  (scope.$('#task-project')  as any).value,
        priority:   (scope.$('#task-priority') as any).value,
        hours:      parseFloat((scope.$('#task-hours') as any).value),
        notify:     (scope.$('#task-notify')   as any).checked,
      };

      const { error } = await api.post('/tasks', payload);

      if (error) {
        const alert = scope.$('#task-form-error') as HTMLElement;
        alert.setAttribute('message', error.message);
        alert.removeAttribute('hidden');
        return;
      }

      api.invalidateTags(['tasks']);
      modal.close();
      await loadTasks(); // refresh the list
    } catch {
      const alert = scope.$('#task-form-error') as HTMLElement;
      alert.setAttribute('message', 'Unexpected error. Please try again.');
      alert.removeAttribute('hidden');
    } finally {
      isSaving.value = false;
    }
  });

  async function populateProjectSelect() {
    const { data } = await api.getCached('/projects', { tags: ['projects'] });
    if (!data) return;
    const select = scope.$('#task-project') as any;
    select.options = (data as any[]).map(p => ({ label: p.name, value: String(p.id) }));
  }

  function clearForm() {
    for (const id of fieldIds) {
      (scope.$(`#${id}`) as HTMLElement).setAttribute('error', '');
    }
    (scope.$('#task-title') as any).value = '';
    (scope.$('#task-form-error') as HTMLElement).setAttribute('hidden', '');
  }

  // Initial load
  await loadTasks();

  async function loadTasks() { /* fetch and render tasks — see Chapter 8 */ }

  return dispose;
}
```

> **Tip:** Keep `clearForm()` separate from `applyErrors()`. Clearing resets values and removes error messages; `applyErrors` only sets them. Mixing the two makes it hard to re-apply errors after a server-side validation response.

---

## Done Criteria

- [ ] Clicking "New Task" opens an `<nc-modal>` with the create-task form.
- [ ] Submitting with an empty title shows an error state on the `<nc-input>` field.
- [ ] `<nc-select>` defaults to `"medium"` priority.
- [ ] Successful submission calls `api.post('/tasks')`, closes the modal, and shows a success toast.

---

**Back:** [Chapter 09 — APIs and Async](./09-apis-and-async.md)  
**Next:** [Chapter 11 — Core Components](./11-core-components.md)
