# Chapter 9 — Forms and Validation

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

A clean validation helper returns either an errors object or `null`:

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

Apply or clear per-field errors in one loop:

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
  const scope     = dom.data('tasks');
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

## What's Next

Chapter 10 takes a complete tour of every `nc-*` component — attributes, slots, and short usage examples — so you can make the most of the Taskflow UI.
