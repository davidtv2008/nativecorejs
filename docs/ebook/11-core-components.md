# Chapter 11 — Core Components

> **What you'll build in this chapter:** Upgrade Taskflow's dashboard — replace the raw task list with `<nc-table>`, wrap priorities in `<nc-badge>`, organise sections with `<nc-tabs>`, and show a success `<nc-toast>` when a task is completed. This chapter is also the definitive reference for every `nc-*` built-in component.

NativeCoreJS ships a complete suite of `nc-*` custom elements that cover virtually every common UI need. They are registered globally when the framework boots via the builtin component registry, so you can drop any of them into any template without an import. This chapter is the definitive reference for every built-in component — attributes, events, methods, and usage examples from the Taskflow app.

Components are organized into functional categories. Use the table of contents below to jump directly to what you need.

---

## Table of Contents

- [Buttons and Actions](#buttons-and-actions)
- [Text and Form Inputs](#text-and-form-inputs)
- [Selection and Toggle Inputs](#selection-and-toggle-inputs)
- [Date, Time, and Numeric Inputs](#date-time-and-numeric-inputs)
- [Rich Inputs](#rich-inputs)
- [Form Containers](#form-containers)
- [Feedback and Status](#feedback-and-status)
- [Overlays and Floating UI](#overlays-and-floating-ui)
- [Navigation](#navigation)
- [Layout and Structure](#layout-and-structure)
- [Data Display](#data-display)
- [Canvas](#canvas)
- [Animation and Special Effects](#animation-and-special-effects)
- [Utility](#utility)
- [How Component Lazy Loading Works](#how-component-lazy-loading-works)

---

## Buttons and Actions

### `<nc-button>`

A fully accessible button with built-in loading state, icon support, and all standard variants.

| Attribute | Type | Description |
|---|---|---|
| `variant` | `primary` \| `secondary` \| `ghost` \| `danger` | Visual style (default: `secondary`) |
| `size` | `sm` \| `md` \| `lg` | Button size (default: `md`) |
| `loading` | boolean | Shows a spinner and disables interaction |
| `disabled` | boolean | Standard disabled state |
| `icon` | string | Icon name shown before the label |
| `icon-right` | string | Icon name shown after the label |
| `full-width` | boolean | Stretches to the container width |
| `type` | `button` \| `submit` \| `reset` | Maps to the native button type (default: `button`) |

```html
<nc-button variant="primary" icon="plus" id="btn-new-task">New Task</nc-button>
<nc-button variant="danger" loading id="btn-delete">Delete</nc-button>
<nc-button variant="ghost" full-width>Cancel</nc-button>
```

---

### `<nc-a>`

A SPA-aware anchor element. Fires a `nc-navigate` event before the router handles navigation so you can intercept or cancel it.

| Attribute | Type | Description |
|---|---|---|
| `href` | string | Navigation target (supports router paths and external URLs) |
| `variant` | `default` \| `primary` \| `muted` \| `danger` | Text colour style |
| `size` | `sm` \| `md` \| `lg` | Font size |
| `disabled` | boolean | Prevents navigation and applies disabled styles |
| `target` | string | Standard `<a>` target (`_blank`, etc.) |

**Event:** `nc-navigate: CustomEvent<{ href: string }>` — fires before navigation; call `e.preventDefault()` to cancel.

```html
<nc-a href="/projects/42" variant="primary">View Project</nc-a>
<nc-a href="https://example.com" target="_blank">External Link</nc-a>
```

---

### `<nc-copy-button>`

Copies a value to the clipboard and shows confirmation feedback automatically.

| Attribute | Type | Description |
|---|---|---|
| `value` | string | Text to copy |
| `label` | string | Button label (default: `Copy`) |
| `copied-label` | string | Label shown after successful copy (default: `Copied!`) |
| `variant` | string | Passed to inner `nc-button` |
| `size` | `sm` \| `md` \| `lg` | Size |
| `icon-only` | boolean | Show only the copy icon, no label |
| `timeout` | number | Ms before reverting to default label (default: 2000) |

```html
<nc-copy-button value="npm install nativecorejs" label="Copy"></nc-copy-button>
```

---

## Text and Form Inputs

### `<nc-input>`

The primary single-line text input. Covers all `<input>` types with label, validation, and clearable support.

| Attribute | Type | Description |
|---|---|---|
| `type` | string | Any standard HTML input type |
| `name` | string | Form field name |
| `value` | string | Current value |
| `label` | string | Visible label |
| `placeholder` | string | Placeholder text |
| `clearable` | boolean | Shows a clear button when there is content |
| `show-password-toggle` | boolean | Eye toggle for password fields |
| `error` | string | Error message; empty string clears error state |
| `hint` | string | Helper text shown when there is no error |
| `size` | `sm` \| `md` \| `lg` | Input size |
| `variant` | `default` \| `filled` \| `flushed` | Visual style |
| `disabled` \| `readonly` | boolean | Standard states |
| `maxlength` | number | Max character count |
| `prefix` | string | Static text prefix shown inside the field |
| `suffix` | string | Static text suffix shown inside the field |
| `icon` | string | Icon name shown inside the leading edge |

```html
<nc-input id="email" type="email" label="Email address" clearable
  hint="We will never share this."></nc-input>

<nc-input id="pwd" type="password" label="Password" show-password-toggle
  error="Must be at least 8 characters"></nc-input>
```

Access the value in a controller:

```javascript
const email = (document.querySelector('#email')).value;
```

---

### `<nc-textarea>`

A multi-line text input with optional auto-resize.

| Attribute | Type | Description |
|---|---|---|
| `name` | string | Form field name |
| `value` | string | Current value |
| `placeholder` | string | Placeholder text |
| `rows` | number | Visible row count (default: 3) |
| `disabled` \| `readonly` | boolean | Standard states |
| `maxlength` | number | Max character count |
| `autoresize` | boolean | Grow height to fit content automatically |
| `size` | `sm` \| `md` \| `lg` | Control size |
| `variant` | `default` \| `filled` \| `flushed` | Visual style |
| `label` | string | Visible label |
| `error` | string | Validation error text |
| `hint` | string | Helper text |

```html
<nc-textarea name="notes" label="Notes" rows="4" autoresize
  placeholder="Add any relevant notes…"></nc-textarea>
```

---

### `<nc-select>`

A styled, accessible select built on a native `<select>`.

| Attribute | Type | Description |
|---|---|---|
| `name` | string | Form field name |
| `label` | string | Visible label |
| `options` | JSON string | `[{ "label": "…", "value": "…", "disabled"?: true }]` |
| `value` | string | Currently selected value |
| `placeholder` | string | Shown when nothing is selected |
| `error` | string | Validation error text |
| `hint` | string | Helper text |
| `size` | `sm` \| `md` \| `lg` | Control size |
| `variant` | `default` \| `filled` \| `flushed` | Visual style |
| `disabled` | boolean | Disabled state |
| `multiple` | boolean | Multi-select mode |

```html
<nc-select id="priority" label="Priority"
  options='[{"label":"Low","value":"low"},{"label":"Medium","value":"medium"},{"label":"High","value":"high"}]'
  value="medium">
</nc-select>
```

---

### `<nc-autocomplete>`

A text input with a live-filtered suggestion dropdown.

| Attribute | Type | Description |
|---|---|---|
| `name` | string | Form field name |
| `value` | string | Current text value |
| `placeholder` | string | Placeholder text |
| `options` | JSON string | `[{ "label": "…", "value": "…" }]` — static list |
| `min-chars` | number | Min typed characters before dropdown opens (default: 1) |
| `max-results` | number | Cap on visible suggestions |
| `disabled` | boolean | Disabled state |
| `size` | `sm` \| `md` \| `lg` | Control size |
| `variant` | `default` \| `filled` \| `flushed` | Visual style |

For **dynamic options** (search-as-you-type), dispatch a `nc-autocomplete-options` event on the element:

```javascript
const ac = document.querySelector('#user-search');
ac.addEventListener('input', async (e) => {
    const results = await api.get(`/users?q=${e.detail.value}`);
    ac.dispatchEvent(new CustomEvent('nc-autocomplete-options', {
        detail: results.map((u) => ({ label, value)),
    }));
});
```

**Events:** `input: CustomEvent<{ value, name }>`, `select: CustomEvent<{ value, name }>`, `change: CustomEvent<{ value, name }>`

---

## Selection and Toggle Inputs

### `<nc-checkbox>`

| Attribute | Type | Description |
|---|---|---|
| `label` | string | Visible label text |
| `name` | string | Form field name |
| `value` | string | Value submitted with the form |
| `checked` | boolean | Checked state |
| `indeterminate` | boolean | Visual indeterminate state (used in select-all patterns) |
| `disabled` | boolean | Disabled state |
| `size` | `sm` \| `md` \| `lg` | Control size |
| `variant` | `default` \| `primary` \| `success` \| `danger` | Tick colour |

**Event:** fires native `change` on the underlying input.

```html
<nc-checkbox name="agree" label="I agree to the terms" value="yes"></nc-checkbox>
```

---

### `<nc-radio>`

| Attribute | Type | Description |
|---|---|---|
| `label` | string | Visible label text |
| `name` | string | Radio group name |
| `value` | string | This radio's value |
| `checked` | boolean | Selected state |
| `disabled` | boolean | Disabled state |
| `size` | `sm` \| `md` \| `lg` | Control size |
| `variant` | `default` \| `primary` | Dot colour |

Group multiple `<nc-radio>` elements with the same `name` to form a radio group.

```html
<nc-radio name="status" value="open"        label="Open"></nc-radio>
<nc-radio name="status" value="in-progress" label="In Progress" checked></nc-radio>
<nc-radio name="status" value="done"        label="Done"></nc-radio>
```

---

### `<nc-switch>`

A toggle switch for boolean settings.

| Attribute | Type | Description |
|---|---|---|
| `label` | string | Visible label |
| `label-position` | `left` \| `right` | Label placement (default: `right`) |
| `name` | string | Form field name |
| `value` | string | Value submitted when checked |
| `checked` | boolean | On/off state |
| `disabled` | boolean | Disabled state |
| `size` | `sm` \| `md` \| `lg` | Track size |
| `variant` | `default` \| `primary` \| `success` \| `danger` | Track colour when on |

```html
<nc-switch id="notif-switch" name="notifications" label="Email notifications" checked>
</nc-switch>
```

```javascript
const on = (document.querySelector('#notif-switch')).checked;
```

---

### `<nc-rating>`

A star rating input.

| Attribute | Type | Description |
|---|---|---|
| `name` | string | Form field name |
| `max` | number | Star count (default: 5) |
| `value` | number | Current rating (set on first render) |
| `readonly` | boolean | Display-only, no interaction |
| `disabled` | boolean | Disabled state |
| `allow-clear` | boolean | Clicking the active star sets rating to 0 |
| `size` | `sm` \| `md` \| `lg` | Star size |
| `variant` | `default` \| `primary` | Star fill colour |

**Event:** `change: CustomEvent<{ value: number; name: string }>`

```html
<nc-rating name="task-rating" max="5"></nc-rating>
```

---

### `<nc-slider>`

A range slider for numeric values.

| Attribute | Type | Description |
|---|---|---|
| `name` | string | Form field name |
| `value` | number | Current value |
| `min` | number | Minimum (default: 0) |
| `max` | number | Maximum (default: 100) |
| `step` | number | Step increment (default: 1) |
| `show-value` | boolean | Show the current value above the thumb |
| `disabled` | boolean | Disabled state |
| `size` | `sm` \| `md` \| `lg` | Track height |
| `variant` | `default` \| `primary` \| `success` \| `danger` | Track fill colour |

**Events:** `change: CustomEvent<{ value, name }>`, `input: CustomEvent<{ value, name }>`

```html
<nc-slider name="progress" value="40" min="0" max="100" show-value></nc-slider>
```

---

## Date, Time, and Numeric Inputs

### `<nc-date-picker>`

| Attribute | Type | Description |
|---|---|---|
| `name` | string | Form field name |
| `value` | string | ISO date string (`YYYY-MM-DD`) |
| `min` | string | Minimum selectable date |
| `max` | string | Maximum selectable date |
| `placeholder` | string | Placeholder text |
| `disabled` \| `readonly` | boolean | Standard states |
| `size` | `sm` \| `md` \| `lg` | Control size |
| `variant` | `default` \| `filled` \| `flushed` | Visual style |
| `first-day` | `0`–`6` | First day of week (0 = Sunday, 1 = Monday) |

**Event:** `change: CustomEvent<{ value: string; date: Date | null; name: string }>`

```html
<nc-date-picker name="due-date" label="Due date" min="2025-01-01"></nc-date-picker>
```

---

### `<nc-time-picker>`

| Attribute | Type | Description |
|---|---|---|
| `name` | string | Form field name |
| `value` | string | Time string (`HH:MM` or `HH:MM:SS`) |
| `format` | `12` \| `24` | Hour display format (default: `24`) |
| `show-seconds` | boolean | Include seconds picker |
| `min` \| `max` | string | Min/max time strings |
| `step` | number | Minute step increment |
| `placeholder` | string | Placeholder text |
| `disabled` \| `readonly` | boolean | Standard states |
| `size` | `sm` \| `md` \| `lg` | Control size |

**Event:** `change: CustomEvent<{ value: string; name: string }>`

```html
<nc-time-picker name="start-time" format="12" label="Start time"></nc-time-picker>
```

---

### `<nc-number-input>`

A numeric input with increment/decrement stepper buttons.

| Attribute | Type | Description |
|---|---|---|
| `name` | string | Form field name |
| `value` | number | Current value |
| `min` | number | Minimum allowed value |
| `max` | number | Maximum allowed value |
| `step` | number | Increment/decrement amount (default: 1) |
| `placeholder` | string | Placeholder text |
| `disabled` \| `readonly` | boolean | Standard states |
| `size` | `sm` \| `md` \| `lg` | Control size |
| `variant` | `default` \| `filled` \| `flushed` | Visual style |

```html
<nc-number-input name="quantity" value="1" min="1" max="99" step="1" label="Quantity">
</nc-number-input>
```

---

### `<nc-otp-input>`

A one-time password input with individual digit fields.

| Attribute | Type | Description |
|---|---|---|
| `length` | number | Number of digit fields (default: 6) |
| `disabled` | boolean | Disabled state |
| `masked` | boolean | Render as password dots |
| `error` | string | Validation error text |
| `type` | `numeric` \| `alphanumeric` | Input mode |
| `separator` | string | Character shown between groups of fields |
| `autofocus` | boolean | Focus the first field on mount |
| `label` | string | Accessible label |

**Property:** `el.value` — read or set the current OTP string.

**Events:** `change: CustomEvent<{ value: string; complete: boolean }>`, `complete: CustomEvent<{ value: string }>`

```html
<nc-otp-input id="otp" length="6" masked></nc-otp-input>
```

```javascript
document.querySelector('#otp').addEventListener('complete', (e) => {
    verifyCode(e.detail.value);
});
```

---

## Rich Inputs

### `<nc-rich-text>`

A full WYSIWYG editor with configurable toolbar and HTML output.

| Attribute | Type | Description |
|---|---|---|
| `name` | string | Form field name |
| `value` | string | HTML content |
| `placeholder` | string | Placeholder text |
| `disabled` \| `readonly` | boolean | Standard states |
| `toolbar` | JSON string | Array of tool names to include |
| `min-height` | string | CSS value (default: `150px`) |
| `max-height` | string | CSS value |

**Events:** `input: CustomEvent<{ value: string; name }>`, `change: CustomEvent<{ value: string; name }>`

```html
<nc-rich-text name="description" placeholder="Describe this task…"
  min-height="200px" max-height="500px"></nc-rich-text>
```

---

### `<nc-color-picker>`

A colour selector with a swatch palette and optional hex input.

| Attribute | Type | Description |
|---|---|---|
| `name` | string | Form field name |
| `value` | string | Current hex colour (default: `#10b981`) |
| `swatches` | JSON string | Array of hex strings for the palette |
| `show-input` | boolean | Show hex text input (default: `true`) |
| `disabled` | boolean | Disabled state |
| `size` | `sm` \| `md` \| `lg` | Swatch size |

**Events:** `change: CustomEvent<{ value, name }>`, `input: CustomEvent<{ value, name }>`

```html
<nc-color-picker name="label-color" value="#6366f1"
  swatches='["#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899"]'>
</nc-color-picker>
```

---

### `<nc-tag-input>`

A tag/chip input that manages a list of string tags.

| Attribute | Type | Description |
|---|---|---|
| `value` | JSON string | Initial tag array `["tag1","tag2"]` |
| `placeholder` | string | Placeholder in the text field |
| `max` | number | Maximum number of tags |
| `min-length` \| `max-length` | number | Per-tag character limits |
| `delimiter` | string | Character(s) that trigger tag creation (default: `,` and Enter) |
| `duplicate` | boolean | Allow duplicate tag values (default: false) |
| `disabled` \| `readonly` | boolean | Standard states |
| `error` | string | Validation error text |
| `label` \| `hint` | string | Label and helper text |

**Methods:** `el.getTags()`, `el.setTags(tags)`, `el.addTag(tag)`, `el.removeTag(index)`, `el.clear()`

**Events:** `change: CustomEvent<{ tags }>`, `add: CustomEvent<{ tag }>`, `remove: CustomEvent<{ tag, index }>`, `max-reached`

```html
<nc-tag-input id="labels" label="Labels" max="5" placeholder="Add a label…"></nc-tag-input>
```

---

### `<nc-file-upload>`

A drag-and-drop file picker with size validation and a file list.

| Attribute | Type | Description |
|---|---|---|
| `name` | string | Form field name |
| `accept` | string | MIME types or extensions (`image/*`, `.pdf`) |
| `multiple` | boolean | Allow multiple files |
| `disabled` | boolean | Disabled state |
| `max-size` | number | Max file size in MB |
| `variant` | `default` \| `compact` | Layout variant |

**Events:** `change: CustomEvent<{ files: File[]; name }>`, `error: CustomEvent<{ message: string; files: File[] }>`

```html
<nc-file-upload name="attachments" accept=".pdf,.docx,image/*" multiple max-size="10">
</nc-file-upload>
```

---

## Form Containers

### `<nc-form>` and `<nc-field>`

`<nc-form>` wraps form fields and provides integrated submission and validation.

**`<nc-form>` attributes:**

| Attribute | Type | Description |
|---|---|---|
| `novalidate` | boolean | Skip built-in HTML5 validation |

**`<nc-form>` methods:** `form.getValues()`, `form.validate()` → `boolean`, `form.reset()`

**`<nc-form>` events:** `submit: CustomEvent<{ values: Record<string, any> }>`, `invalid: CustomEvent<{ fields: string[] }>`

**`<nc-field>` attributes:**

| Attribute | Type | Description |
|---|---|---|
| `label` | string | Field label rendered above the input |
| `for` | string | ID of the labelled input |
| `required` | boolean | Marks the field as required |
| `hint` | string | Helper text |
| `error` | string | Validation error text |

```html
<nc-form id="create-task-form">
  <nc-field label="Task name" for="task-name" required>
    <nc-input id="task-name" name="name" placeholder="Enter task name"></nc-input>
  </nc-field>
  <nc-field label="Due date" for="due">
    <nc-date-picker id="due" name="dueDate"></nc-date-picker>
  </nc-field>
  <nc-button type="submit" variant="primary">Create Task</nc-button>
</nc-form>
```

```javascript
const form = document.querySelector('#create-task-form');
form.addEventListener('submit', (e) => {
    const { name, dueDate } = e.detail.values;
    api.post('/tasks', { name, dueDate });
});
```

---

## Feedback and Status

### `<nc-alert>`

An inline status banner for page-level feedback.

| Attribute | Type | Description |
|---|---|---|
| `type` | `info` \| `success` \| `warning` \| `error` | Icon and colour |
| `message` | string | Alert body text |
| `title` | string | Optional bold heading |
| `dismissible` | boolean | Shows a close button |

```html
<nc-alert type="error" message="Could not load projects." dismissible></nc-alert>
<nc-alert type="success" title="Saved" message="Your changes have been saved."></nc-alert>
```

---

### `<nc-snackbar>`

A transient notification that appears at the edge of the viewport. Unlike `nc-alert`, `nc-snackbar` is controlled entirely via JavaScript.

Add a single instance to your app shell:

```html
<!-- app.html -->
<nc-snackbar position="bottom-right"></nc-snackbar>
```

| Attribute | Type | Description |
|---|---|---|
| `position` | `top-left` \| `top-center` \| `top-right` \| `bottom-left` \| `bottom-center` \| `bottom-right` | Viewport placement (default: `bottom-right`) |
| `max` | number | Max visible snackbars at once |

Show snackbars from anywhere in a controller:

```javascript
// Option 1 — static method
NcSnackbar.show({ message: 'Task created!', variant: 'success' });

// Option 2 — global event
document.dispatchEvent(new CustomEvent('nc-toast', {
    detail: { message: 'Deleted.', variant: 'danger', duration: 3000 },
}));
```

**`show()` options:** `message`, `variant` (`default` | `success` | `warning` | `danger`), `duration` (ms, default 4000), `dismissible` (boolean), `icon` (string).

---

### `<nc-progress>`

A horizontal progress bar.

| Attribute | Type | Description |
|---|---|---|
| `value` | number | 0–100 |
| `indeterminate` | boolean | Animated loading bar when value is unknown |
| `striped` | boolean | Striped fill pattern |
| `animated` | boolean | Animate the stripes |
| `variant` | `default` \| `primary` \| `success` \| `warning` \| `danger` | Fill colour |
| `size` | `sm` \| `md` \| `lg` | Track height |
| `label` | string | Accessible screen-reader label |

```html
<nc-progress value="65" striped variant="success"></nc-progress>
<nc-progress indeterminate></nc-progress>
```

---

### `<nc-progress-circular>`

A circular progress ring — useful for dashboards and compact status indicators.

| Attribute | Type | Description |
|---|---|---|
| `value` | number | 0–`max` |
| `max` | number | Maximum value (default: 100) |
| `size` | number | Diameter in px (default: 64) |
| `thickness` | number | Ring stroke width (default: 6) |
| `variant` | `default` \| `primary` \| `success` \| `warning` \| `danger` | Ring colour |
| `show-value` | boolean | Display the percentage in the centre |
| `indeterminate` | boolean | Spinning animation |
| `label` | string | Accessible label |

```html
<nc-progress-circular value="72" show-value variant="primary" size="80">
</nc-progress-circular>
```

---

### `<nc-badge>`

Small counters and status indicators.

| Attribute | Type | Description |
|---|---|---|
| `count` | number | Numeric label; hidden when 0 unless `dot` |
| `dot` | boolean | Render a plain dot instead of a number |
| `variant` | `default` \| `primary` \| `success` \| `warning` \| `danger` \| `info` | Colour |
| `max` | number | Cap display value (shows `99+` at max 99) |
| `position` | `top-right` \| `top-left` \| `bottom-right` \| `bottom-left` | Absolute position when overlaid on another element |

```html
<!-- Standalone -->
<nc-badge count="12" variant="danger" max="99"></nc-badge>

<!-- Overlaid on a button -->
<div style="position:relative; display:inline-block;">
  <nc-button icon="bell">Notifications</nc-button>
  <nc-badge count="3" variant="danger" position="top-right"></nc-badge>
</div>
```

---

### `<nc-chip>`

A compact label or tag — used to display status, category, or filters.

| Attribute | Type | Description |
|---|---|---|
| `variant` | `default` \| `primary` \| `success` \| `warning` \| `danger` \| `info` | Colour |
| `size` | `sm` \| `md` \| `lg` | Chip size |
| `dismissible` | boolean | Shows an × button to remove the chip |
| `disabled` | boolean | Disabled state |
| `icon` | string | Icon name shown before the label |

**Event:** `dismiss` — fires when the × button is clicked.

```html
<nc-chip variant="success">Completed</nc-chip>
<nc-chip variant="warning" dismissible id="chip-filter">Priority: High</nc-chip>
```

---

### `<nc-skeleton>`

Placeholder loading shapes for content-before-data patterns.

| Attribute | Type | Description |
|---|---|---|
| `variant` | `text` \| `circle` \| `rect` | Shape (default: `text`) |
| `width` | string | CSS width (default: `100%`) |
| `height` | string | CSS height |
| `lines` | number | Number of text lines to show (text variant) |
| `animate` | boolean | Shimmer animation (default: `true`) |

```html
<nc-skeleton variant="circle" width="40px" height="40px"></nc-skeleton>
<nc-skeleton variant="text" lines="2"></nc-skeleton>
<nc-skeleton variant="rect" height="120px"></nc-skeleton>
```

---

### `<nc-empty-state>`

A no-data placeholder with optional icon and action slot.

| Attribute | Type | Description |
|---|---|---|
| `title` | string | Primary message |
| `description` | string | Secondary message |
| `icon` | string | Icon name |
| `size` | `sm` \| `md` \| `lg` | Overall size |
| `variant` | `default` \| `muted` | Visual style |

**Slots:** `icon`, `title`, `description`, `actions`

```html
<nc-empty-state
  icon="folder-open"
  title="No projects yet"
  description="Create your first project to get started.">
  <div slot="actions">
    <nc-button variant="primary" id="btn-create">New Project</nc-button>
  </div>
</nc-empty-state>
```

---

## Overlays and Floating UI

### `<nc-modal>`

A dialog overlay with focus trapping, Escape-to-close, and named slots.

| Attribute | Type | Description |
|---|---|---|
| `heading` | string | Title shown in the modal header |
| `size` | `sm` \| `md` \| `lg` \| `xl` \| `full` | Dialog width (default: `md`) |
| `persistent` | boolean | Prevents closing on backdrop click or Escape |
| `no-close-btn` | boolean | Hides the × button in the header |

**Slots:** `body`, `footer`

**Methods:** `.open()`, `.close()`, `.toggle()`

```html
<nc-modal id="confirm-delete" size="sm" heading="Delete project?">
  <div slot="body">
    <p>This action cannot be undone.</p>
  </div>
  <div slot="footer">
    <nc-button variant="ghost"  id="btn-cancel">Cancel</nc-button>
    <nc-button variant="danger" id="btn-confirm">Delete</nc-button>
  </div>
</nc-modal>
```

```javascript
(document.querySelector('#confirm-delete')).open();
```

---

### `<nc-drawer>`

A slide-in panel anchored to a viewport edge.

| Attribute | Type | Description |
|---|---|---|
| `open` | boolean | Visible state |
| `placement` | `left` \| `right` \| `top` \| `bottom` | Edge to slide from (default: `right`) |
| `size` | string | CSS panel width or height (default: `320px`) |
| `overlay` | boolean | Show a dimmed backdrop (default: `true`) |
| `close-on-overlay` | boolean | Close on backdrop click (default: `true`) |
| `no-close-btn` | boolean | Hide the built-in close button |

**Slots:** `header`, default, `footer`

**Events:** `open`, `close`

```html
<nc-drawer id="filter-drawer" placement="right" size="380px">
  <div slot="header">Filter Tasks</div>
  <div><!-- filter form --></div>
  <div slot="footer">
    <nc-button variant="primary" full-width>Apply Filters</nc-button>
  </div>
</nc-drawer>
```

```javascript
(document.querySelector('#filter-drawer')).open = true;
```

---

### `<nc-popover>`

A floating content panel anchored to a trigger element.

| Attribute | Type | Description |
|---|---|---|
| `open` | boolean | Visible state |
| `placement` | string | Floating-UI placement (e.g. `bottom-start`) |
| `trigger` | `click` \| `hover` \| `focus` | What opens the popover (default: `click`) |
| `offset` | number | Distance from trigger in px |
| `arrow` | boolean | Show a pointing arrow |
| `width` \| `max-width` | string | CSS dimensions |
| `close-on-outside` | boolean | Close on outside click (default: `true`) |
| `disabled` | boolean | Prevents opening |

**Methods:** `.show()`, `.hide()`, `.toggle()`

**Events:** `open`, `close`

```html
<nc-popover placement="bottom-start" arrow>
  <nc-button slot="trigger" icon="filter">Filter</nc-button>
  <div style="padding:1rem; width:240px;">
    <nc-select label="Status" options='[{"label":"Open","value":"open"}]'></nc-select>
  </div>
</nc-popover>
```

---

### `<nc-tooltip>`

A hover tooltip anchored to any child element.

| Attribute | Type | Description |
|---|---|---|
| `tip` | string | Tooltip text |
| `placement` | `top` \| `bottom` \| `left` \| `right` | Position (default: `top`) |
| `delay` | number | Hover delay in ms (default: 300) |
| `variant` | `default` \| `dark` \| `light` | Colour scheme |

```html
<nc-tooltip tip="Delete this task" placement="top">
  <nc-button variant="ghost" icon="trash"></nc-button>
</nc-tooltip>
```

---

### `<nc-dropdown>`

A floating dropdown menu that opens on click.

| Attribute | Type | Description |
|---|---|---|
| `open` | boolean | Visible state |
| `placement` | string | Floating-UI placement string |
| `close-on-select` | boolean | Close after an item is selected (default: `true`) |
| `disabled` | boolean | Prevents opening |
| `offset` | number | Distance from trigger in px |
| `width` | string | CSS width of the panel |

**Events:** `open`, `close`, `select: CustomEvent<{ value: string; label: string }>`

```html
<nc-dropdown>
  <nc-button slot="trigger" icon="more-vertical" variant="ghost"></nc-button>
  <nc-menu-item value="edit"   icon="edit">Edit</nc-menu-item>
  <nc-menu-item value="clone"  icon="copy">Duplicate</nc-menu-item>
  <nc-menu-item value="delete" icon="trash" danger>Delete</nc-menu-item>
</nc-dropdown>
```

---

## Navigation

### `<nc-tabs>`

Tab navigation that manages panel visibility automatically.

| Attribute | Type | Description |
|---|---|---|
| `tabs` | JSON string | `[{ "label": "…", "key": "…", "disabled"?: true }]` |
| `active` | string | Key of the currently active tab |
| `variant` | `default` \| `pills` \| `underline` | Visual style |
| `size` | `sm` \| `md` \| `lg` | Tab size |

**Event:** `nc-tab-change: CustomEvent<{ key: string; prev: string }>`

```html
<nc-tabs
  id="detail-tabs"
  tabs='[{"label":"Overview","key":"overview"},{"label":"Activity","key":"activity"},{"label":"Files","key":"files"}]'
  active="overview">
</nc-tabs>
```

```javascript
document.querySelector('#detail-tabs').addEventListener('nc-tab-change', (e) => {
    renderPanel(e.detail.key);
});
```

---

### `<nc-breadcrumb>`

A breadcrumb trail for hierarchical navigation. Populate with `<nc-a>` or plain `<a>` elements.

| Attribute | Type | Description |
|---|---|---|
| `separator` | string | Separator character or HTML (default: `/`) |

```html
<nc-breadcrumb separator="/">
  <nc-a href="/">Home</nc-a>
  <nc-a href="/projects">Projects</nc-a>
  <span>Taskflow Redesign</span>
</nc-breadcrumb>
```

---

### `<nc-nav-item>`

A sidebar navigation item with icon, label, badge, and active state.

| Attribute | Type | Description |
|---|---|---|
| `href` | string | Navigation target |
| `active` | boolean | Highlighted active state |
| `disabled` | boolean | Non-interactive state |
| `badge` | number | Badge count shown on the right |
| `badge-variant` | string | Badge colour variant |
| `icon` | string | Icon name |
| `label` | string | Item label |
| `indent` | number | Indent level for nested items |

**Event:** `nav-click: CustomEvent<{ href: string | null }>`

```html
<nc-nav-item href="/dashboard" icon="home"         label="Dashboard" active></nc-nav-item>
<nc-nav-item href="/projects"  icon="folder"        label="Projects" badge="3"></nc-nav-item>
<nc-nav-item href="/tasks"     icon="check-square"  label="My Tasks"></nc-nav-item>
```

---

### `<nc-bottom-nav>` and `<nc-bottom-nav-item>`

A mobile bottom tab bar.

**`<nc-bottom-nav>` attributes:**

| Attribute | Type | Description |
|---|---|---|
| `value` | string | Key of the active tab |
| `variant` | `default` \| `floating` | Visual style |
| `elevated` | boolean | Drop shadow |
| `bordered` | boolean | Top border |

**`<nc-bottom-nav-item>` attributes:** `value`, `label`, `icon`, `badge`, `active`, `disabled`

**Event on container:** `change: CustomEvent<{ value: string }>`

```html
<nc-bottom-nav id="mobile-nav" value="tasks">
  <nc-bottom-nav-item value="dashboard" icon="home"         label="Home"></nc-bottom-nav-item>
  <nc-bottom-nav-item value="tasks"     icon="check-square" label="Tasks"></nc-bottom-nav-item>
  <nc-bottom-nav-item value="profile"   icon="user"         label="Profile"></nc-bottom-nav-item>
</nc-bottom-nav>
```

---

### `<nc-pagination>`

Page number controls for paginated data.

| Attribute | Type | Description |
|---|---|---|
| `page` | number | Current page (1-based) |
| `total` | number | Total number of pages |
| `siblings` | number | Page buttons shown either side of current |
| `show-first-last` | boolean | Jump-to-first and jump-to-last buttons |
| `disabled` | boolean | Disabled state |
| `size` | `sm` \| `md` \| `lg` | Control size |
| `variant` | `default` \| `simple` | Visual style |

**Event:** `change: CustomEvent<{ page: number }>`

```html
<nc-pagination id="tasks-pagination" page="1" total="20" siblings="1" show-first-last>
</nc-pagination>
```

```javascript
document.querySelector('#tasks-pagination').addEventListener('change', (e) => {
    loadPage(e.detail.page);
});
```

---

### `<nc-stepper>` and `<nc-step>`

A multi-step wizard with sequential navigation and step status tracking.

**`<nc-stepper>` attributes:**

| Attribute | Type | Description |
|---|---|---|
| `step` | number | Active step index (0-based) |
| `orientation` | `horizontal` \| `vertical` | Layout direction |
| `variant` | `default` \| `simple` \| `arrows` | Visual style |
| `linear` | boolean | Prevent skipping ahead |

**`<nc-stepper>` methods:** `.next()`, `.prev()`, `.goTo(index: number)`

**`<nc-stepper>` event:** `change: CustomEvent<{ step: number; prev: number }>`

**`<nc-step>` attributes:** `label`, `description`, `status` (`pending` | `active` | `complete` | `error`)

```html
<nc-stepper id="onboard-stepper" step="0">
  <nc-step label="Account"  description="Basic details"></nc-step>
  <nc-step label="Profile"  description="Your information"></nc-step>
  <nc-step label="Confirm"  description="Review and submit"></nc-step>
</nc-stepper>
```

```javascript
const stepper = document.querySelector('#onboard-stepper');

document.querySelector('#btn-next').addEventListener('click', () => stepper.next());
document.querySelector('#btn-back').addEventListener('click', () => stepper.prev());

stepper.addEventListener('change', (e) => {
    renderStep(e.detail.step);
});
```

---

### `<nc-scroll-top>`

A back-to-top button that appears after the user scrolls down.

| Attribute | Type | Description |
|---|---|---|
| `threshold` | number | Scroll distance before appearing (default: 300) |
| `position` | `bottom-right` \| `bottom-left` | Viewport position |
| `smooth` | boolean | Smooth scroll (default: `true`) |
| `label` | string | Accessible label |
| `offset` | number | px from viewport edge |
| `target` | string | CSS selector for scrollable container (defaults to `window`) |

```html
<nc-scroll-top threshold="400" position="bottom-right"></nc-scroll-top>
```

---

## Layout and Structure

### `<nc-card>`

A content container with optional header, body, and footer areas.

| Attribute | Type | Description |
|---|---|---|
| `variant` | `default` \| `outlined` \| `filled` \| `elevated` | Visual style |
| `size` | `sm` \| `md` \| `lg` | Internal padding |
| `disabled` | boolean | Applies reduced opacity |

**Slots:** `header`, default (body), `footer`, `media` (image area above header)

```html
<nc-card variant="outlined">
  <div slot="header">
    <h3>Project Alpha</h3>
    <nc-badge count="4" variant="info"></nc-badge>
  </div>
  <p>This project covers the redesign of the onboarding flow.</p>
  <div slot="footer">
    <nc-button variant="ghost" size="sm">View Details</nc-button>
  </div>
</nc-card>
```

---

### `<nc-accordion>` and `<nc-accordion-item>`

An expandable panel group.

**`<nc-accordion>` attributes:**

| Attribute | Type | Description |
|---|---|---|
| `multiple` | boolean | Allow multiple items open simultaneously |
| `variant` | `default` \| `bordered` \| `flush` | Visual style |

**`<nc-accordion-item>` attributes:**

| Attribute | Type | Description |
|---|---|---|
| `header` | string | Panel header label |
| `open` | boolean | Initially expanded |
| `disabled` | boolean | Prevents expanding |

**Event on item:** `toggle: CustomEvent<{ open: boolean }>`

```html
<nc-accordion>
  <nc-accordion-item header="What is NativeCoreJS?" open>
    <p>A zero-dependency TypeScript SPA framework built on Web Components.</p>
  </nc-accordion-item>
  <nc-accordion-item header="Does it work without a build step?">
    <p>Yes, after compiling TypeScript once. No bundler required.</p>
  </nc-accordion-item>
</nc-accordion>
```

---

### `<nc-collapsible>`

A single expandable panel — like `<nc-accordion-item>` but standalone.

| Attribute | Type | Description |
|---|---|---|
| `open` | boolean | Expanded state |
| `disabled` | boolean | Prevents toggling |
| `duration` | number | Transition duration in ms (default: 300) |
| `icon` | string | Custom toggle icon |

**Events:** `open`, `close`, `toggle: CustomEvent<{ open: boolean }>`

```html
<nc-collapsible id="advanced-options">
  <span slot="trigger">Advanced options</span>
  <div><!-- content --></div>
</nc-collapsible>
```

---

### `<nc-divider>`

A horizontal or vertical separator line.

| Attribute | Type | Description |
|---|---|---|
| `orientation` | `horizontal` \| `vertical` | Default: `horizontal` |
| `variant` | `solid` \| `dashed` \| `dotted` | Line style |
| `label` | string | Text centred on the divider |
| `thickness` | string | CSS border width (default: `1px`) |
| `color` | string | CSS colour |
| `spacing` | string | CSS margin above and below |

```html
<nc-divider label="or sign in with"></nc-divider>
<nc-divider orientation="vertical" style="height: 32px;"></nc-divider>
```

---

### `<nc-div>`

A utility container with layout, spacing, and visibility helpers via attributes — useful for styled wrappers without custom CSS classes.

| Attribute | Type | Description |
|---|---|---|
| `flex` | boolean | `display: flex` |
| `grid` | boolean | `display: grid` |
| `gap` | string | CSS gap value |
| `padding` | string | CSS padding shorthand |
| `margin` | string | CSS margin shorthand |
| `align` | string | `align-items` value |
| `justify` | string | `justify-content` value |
| `wrap` | boolean | `flex-wrap: wrap` |
| `hidden` | boolean | `display: none` |

> For meaningful structural elements, prefer semantic HTML (`<section>`, `<article>`, `<div>`). Use `<nc-div>` only when you want framework CSS variables and shortcuts without a class.

---

## Data Display

### `<nc-table>`

A data table with column definitions, sorting, and row interaction.

| Attribute | Type | Description |
|---|---|---|
| `sortable` | boolean | Enable column-header sort arrows |
| `loading` | boolean | Overlay a spinner on the table body |
| `empty-message` | string | Text shown when `rows` is empty |
| `striped` | boolean | Alternating row background |
| `hoverable` | boolean | Hover highlight on rows |
| `size` | `sm` \| `md` \| `lg` | Row density |

**Properties (set via JS):**
- `el.columns = [{ key, label, sortable?, width?, align? }]`
- `el.rows = [...plainObjects]`

**Events:** `nc-row-click: CustomEvent<{ row, index }>`, `nc-sort: CustomEvent<{ key, direction }>`

```javascript
const table = document.querySelector('#tasks-table');

table.columns = [
    { key: 'name',     label: 'Task',     sortable: true },
    { key: 'priority', label: 'Priority', sortable: true, width: '100px' },
    { key: 'dueDate',  label: 'Due',      sortable: true, width: '120px' },
    { key: 'status',   label: 'Status',   width: '100px' },
];

table.rows = tasks;

table.addEventListener('nc-row-click', (e) => {
    router.navigate(`/tasks/${e.detail.row.id}`);
});
```

---

### `<nc-timeline>` and `<nc-timeline-item>`

An ordered sequence of events — ideal for task activity feeds and audit logs.

**`<nc-timeline-item>` attributes:**

| Attribute | Type | Description |
|---|---|---|
| `label` | string | Event description |
| `timestamp` | string | ISO date string — auto-formatted as relative time |
| `icon` | string | Icon name for the node |
| `variant` | `default` \| `success` \| `warning` \| `danger` \| `info` \| `primary` | Node colour |
| `color` | string | Custom CSS colour for the node |
| `status` | string | Status badge label |
| `active` | boolean | Highlight the current/latest item |
| `no-line` | boolean | Hide the connecting line (last item) |

```html
<nc-timeline>
  <nc-timeline-item
    label="Task created by Alice"
    timestamp="2025-06-01T09:00:00Z"
    icon="plus-circle"
    variant="info">
  </nc-timeline-item>
  <nc-timeline-item
    label="Moved to In Progress"
    timestamp="2025-06-02T14:30:00Z"
    icon="refresh"
    variant="primary"
    active>
  </nc-timeline-item>
</nc-timeline>
```

---

### `<nc-avatar>` and `<nc-avatar-group>`

User avatars with image, initials fallback, status indicator, and group stacking.

**`<nc-avatar>` attributes:**

| Attribute | Type | Description |
|---|---|---|
| `src` | string | Image URL |
| `alt` | string | Alt text / initials fallback |
| `size` | `xs` \| `sm` \| `md` \| `lg` \| `xl` | Avatar size |
| `shape` | `circle` \| `square` | Shape (default: `circle`) |
| `variant` | `default` \| `primary` \| `success` \| … | Background colour for initials |
| `status` | `online` \| `offline` \| `away` \| `busy` | Presence indicator dot |
| `status-position` | `top-right` \| `bottom-right` \| `bottom-left` | Indicator placement |

**`<nc-avatar-group>` attributes:** `overlap` (px), `size`, `max` (show +N overflow), `total`

```html
<nc-avatar src="/users/alice.jpg" alt="Alice" status="online"></nc-avatar>

<nc-avatar-group max="4" total="12" overlap="8">
  <nc-avatar src="/users/alice.jpg" alt="Alice"></nc-avatar>
  <nc-avatar src="/users/bob.jpg"   alt="Bob"></nc-avatar>
  <nc-avatar alt="Carol" variant="primary"></nc-avatar>
</nc-avatar-group>
```

---

### `<nc-image>`

A styled image wrapper with lazy loading, fallback, and aspect ratio control.

| Attribute | Type | Description |
|---|---|---|
| `src` | string | Image URL |
| `alt` | string | Alt text |
| `width` \| `height` | string | CSS dimensions |
| `fit` | `cover` \| `contain` \| `fill` \| `none` | `object-fit` value |
| `radius` | string | CSS border-radius |
| `aspect` | string | Aspect ratio (`16/9`, `4/3`, `1/1`) |
| `fallback` | string | URL shown if `src` fails |
| `position` | string | `object-position` value |
| `loading` | `lazy` \| `eager` | Native loading attribute |
| `placeholder` | string | Low-quality placeholder URL shown while loading |
| `caption` | string | Caption text below the image |

```html
<nc-image
  src="/assets/cover.jpg"
  alt="Project Alpha cover"
  aspect="16/9"
  fit="cover"
  radius="0.5rem"
  fallback="/assets/placeholder.jpg"
  loading="lazy">
</nc-image>
```

---

### `<nc-code>`

A syntax-highlighted code block with optional line numbers and copy button.

| Attribute | Type | Description |
|---|---|---|
| `language` | string | Syntax language (`typescript`, `html`, `json`, etc.) |
| `label` | string | Filename or label shown in the header bar |
| `no-copy` | boolean | Hide the copy button |
| `no-lines` | boolean | Hide line numbers |
| `max-height` | string | CSS max-height with overflow scroll |
| `highlight` | string | Comma-separated line numbers or ranges to highlight |
| `wrap` | boolean | Wrap long lines instead of horizontal scroll |

Set code content via the `code` property:

```javascript
const block = document.querySelector('nc-code');
block.language = 'typescript';
block.label    = 'task.controller.js';
block.code     = sourceCode;
```

Or inline:

```html
<nc-code language="json" label="response.json">{ "id": 42, "name": "Task Alpha" }</nc-code>
```

---

### `<nc-kbd>`

Renders keyboard shortcut labels.

| Attribute | Type | Description |
|---|---|---|
| `size` | `sm` \| `md` \| `lg` | Key cap size |

```html
Press <nc-kbd>Ctrl</nc-kbd> + <nc-kbd>K</nc-kbd> to open search.
```

---

### `<nc-menu>` and `<nc-menu-item>`

A vertical menu list — typically used inside `<nc-dropdown>` or `<nc-drawer>`.

**`<nc-menu>` attributes:**

| Attribute | Type | Description |
|---|---|---|
| `variant` | `default` \| `compact` | Item density |
| `searchable` | boolean | Show a filter input at the top |
| `label` | string | Accessible group label |
| `width` | string | CSS width |
| `auto-active` | boolean | Automatically mark the current-URL item as active |

**`<nc-menu>` event:** `nc-menu-select: CustomEvent<{ item: HTMLElement; label: string }>`

**`<nc-menu-item>` attributes:**

| Attribute | Type | Description |
|---|---|---|
| `icon` | string | Leading icon name |
| `disabled` | boolean | Disabled state |
| `active` | boolean | Highlighted as current |
| `danger` | boolean | Red destructive style |

```html
<nc-menu searchable>
  <nc-menu-item icon="edit">Edit</nc-menu-item>
  <nc-menu-item icon="copy">Duplicate</nc-menu-item>
  <nc-divider></nc-divider>
  <nc-menu-item icon="trash" danger>Delete</nc-menu-item>
</nc-menu>
```

---

## Canvas

### `<nc-canvas>`

A fully-featured, responsive canvas component that solves the most common canvas problems out of the box: HiDPI/Retina pixel scaling, container resize handling, cross-device input (mouse, touch, and stylus pressure), and a built-in toolbar with download support.

#### How it solves the common problems

**HiDPI scaling** — a plain `<canvas width="600" height="300">` renders blurry on Retina displays because `devicePixelRatio` is 2 or 3. `nc-canvas` multiplies the bitmap dimensions by `devicePixelRatio` and applies `ctx.scale(dpr, dpr)`. You work in logical CSS pixels; the bitmap is always crisp.

**Responsive resizing** — a `ResizeObserver` watches the wrapper element. When the container width changes (window resize, sidebar toggle, CSS grid reflow), the canvas re-synchronises automatically, saving a bitmap snapshot and restoring it after the resize.

**Touch and stylus** — mouse events, touch events, and the Pointer Events API are all handled. `touch-action: none` prevents scroll interference. Stylus `pressure` is read from `PointerEvent` and scales `lineWidth` proportionally.

#### Modes

| Mode | Built-in events | Toolbar | Use case |
|---|---|---|---|
| `draw` | Mouse + touch + stylus | Color, width, clear, download | Freehand drawing, annotation, whiteboard |
| `signature` | Mouse + touch + stylus | Clear + download | Legal signatures, forms |
| `static` | None | None | Charts, image manipulation, game canvas |

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `mode` | `draw` \| `signature` \| `static` | `draw` | Operating mode |
| `width` | number | container width | Logical CSS pixel width |
| `height` | number | `300` | Logical CSS pixel height |
| `stroke-color` | CSS color | `#000000` | Drawing color |
| `stroke-width` | number | `2` | Line width in logical px |
| `bg-color` | CSS color | `#ffffff` | Background fill on clear |
| `show-toolbar` | boolean | `true` for draw/signature | Show built-in toolbar |
| `download-label` | string | `Download` | Download button text |
| `download-filename` | string | `canvas` | Downloaded file name (no extension) |
| `download-format` | `png` \| `jpeg` \| `webp` | `png` | Download encoding |
| `placeholder` | string | — | Overlay text on empty signature canvas |
| `disabled` | boolean | — | Disable all drawing |

#### JavaScript API

| Method / Property | Returns | Description |
|---|---|---|
| `.getCanvas()` | `HTMLCanvasElement` | Raw canvas element |
| `.getContext()` | `CanvasRenderingContext2D` | 2D rendering context |
| `.clear()` | `void` | Fill bg and emit `canvas-clear` |
| `.download(filename?, format?)` | `void` | Trigger file download |
| `.toDataURL(format?, quality?)` | `string` | Base-64 data URL |
| `.toBlob(callback, format?, quality?)` | `void` | Blob via callback |
| `.isEmpty()` | `boolean` | `true` until first stroke |
| `.loadImage(src)` | `Promise` | Draw an image into the canvas |
| `.resize()` | `void` | Re-sync canvas size to container |
| `.strokeColor` | `string` get/set | Live color change |
| `.strokeWidth` | `number` get/set | Live width change |
| `.bgColor` | `string` get/set | Live background change |

#### Events

| Event | Detail | When |
|---|---|---|
| `canvas-ready` | `{ canvas, ctx }` | Canvas initialised and ready |
| `draw-start` | `{ x, y }` | Stroke begins |
| `draw-move` | `{ x, y }` | Each point of a stroke |
| `draw-end` | `{ dataURL }` | Stroke completes — includes full canvas snapshot |
| `canvas-clear` | — | After `.clear()` |

#### Freehand drawing board

```html
<nc-canvas mode="draw" height="500" stroke-color="#6366f1" stroke-width="3"
  bg-color="#f8fafc" download-filename="my-drawing"></nc-canvas>
```

The built-in toolbar provides a color picker, stroke width slider, clear button, and download button with no extra code required.

#### Signature capture

```html
<nc-canvas id="sig" mode="signature" height="180"
  placeholder="Draw your signature here"></nc-canvas>
```

```javascript
const sig = document.querySelector('#sig');

document.querySelector('#btn-submit').addEventListener('click', () => {
    if (sig.isEmpty()) {
        showError('Signature required.');
        return;
    }
    // Send
    sig.toBlob((blob) => {
        const form = new FormData();
        form.append('signature', blob, 'signature.png');
        api.post('/contracts/sign', form);
    }, 'image/png');
});
```

#### Chart surface (`static` mode)

In `static` mode, `nc-canvas` provides a correctly-sized HiDPI canvas with no built-in drawing events. You draw everything yourself via `getContext()`.

```html
<nc-canvas id="chart" mode="static" height="300"></nc-canvas>
```

```javascript
const nc = document.querySelector('#chart');

nc.addEventListener('canvas-ready', ({ detail }: CustomEvent) => {
    const ctx    = detail.ctx;
    const canvas = nc.getCanvas();

    // Coordinates are in logical CSS pixels — nc-canvas handles DPR internally
    ctx.fillStyle = '#10b981';
    ctx.fillRect(40, 40, 80, canvas.offsetHeight - 80);
});
```

When integrating an external charting library (Chart.js, uPlot, D3):

```javascript
nc.addEventListener('canvas-ready', ({ detail }: CustomEvent) => {
    new Chart(detail.canvas, { type: 'bar', data: { /* … */ } });
}, { once: true });
```

#### Undo / redo pattern

```javascript
const items = [];
const items = [];

nc.addEventListener('canvas-ready', () => undoStack.push(nc.toDataURL()), { once: true });

nc.addEventListener('draw-end', (e) => {
    undoStack.push(e.detail.dataURL);
    redoStack.length = 0;
});

btnUndo.addEventListener('click', async () => {
    if (undoStack.length < 2) return;
    redoStack.push(undoStack.pop()!);
    await nc.loadImage(undoStack[undoStack.length - 1]);
});

btnRedo.addEventListener('click', async () => {
    if (!redoStack.length) return;
    const next = redoStack.pop()!;
    undoStack.push(next);
    await nc.loadImage(next);
});
```

---

## Animation and Special Effects

### `<nc-transition>`

Applies a GPU-accelerated **enter animation** to its slotted content whenever that content changes. A `MutationObserver` watches the default slot, so swapping the slotted child re-triggers the animation automatically — useful for live-updating regions.

| Attribute | Type | Description |
|---|---|---|
| `enter` | `fade` \| `slide-up` \| `slide-down` \| `scale` | Enter animation preset (default: `fade`) |
| `duration` | number | Animation duration in ms (default: `300`) |

```html
<!-- Animate a list whenever its content is replaced by the controller -->
<nc-transition enter="slide-up" duration="400">
  <ul id="task-list"></ul>
</nc-transition>
```

When the controller replaces the `<ul>` innerHTML, the new content slides up into view. No manual animation code needed.

---

### `<nc-view-transition>`

Wraps the router outlet and plays a **leave animation** before navigation and an **enter animation** after the new page loads. Hooks into the router's navigation lifecycle events automatically.

| Attribute | Type | Description |
|---|---|---|
| `enter` | `fade` \| `slide-up` \| `slide-down` \| `scale` | Enter animation for arriving page (default: `slide-up`) |
| `leave` | `fade` \| `slide-up` \| `slide-down` \| `scale` | Leave animation for departing page (default: `fade`) |

```html
<!-- Wrap the router outlet in index.html -->
<nc-view-transition enter="slide-up" leave="fade">
  <main id="main-content"></main>
</nc-view-transition>
```

The component listens for `nc-route-start` (or `page-transition-exit`) to play the leave animation, and `pageloaded` to play the enter animation. All animations use the same GPU-accelerated primitives as `<nc-animation>`.

> **Tip:** For a snappy feel, keep `leave` fast (`fade` at ~200 ms) and `enter` slightly longer (`slide-up` at ~350 ms). Users perceive the enter transition as the main payload; the leave should get out of the way quickly.

---

### `<nc-animation>`

Wraps any element with declarative CSS/WAAPI animations triggered by mount, scroll intersection, or programmatic control.

| Attribute | Type | Description |
|---|---|---|
| `name` | string | Animation preset (`fade-in`, `slide-up`, `zoom-in`, `bounce`, `shake`, etc.) |
| `trigger` | `mount` \| `scroll` \| `manual` | When the animation starts (default: `mount`) |
| `duration` | number | Duration in ms (default: 400) |
| `delay` | number | Delay in ms |
| `easing` | string | CSS easing function |
| `iterations` | number \| `Infinity` | Repeat count (default: 1) |
| `distance` | string | Travel distance for slide animations |
| `threshold` | number | Intersection ratio for scroll trigger (0–1) |
| `fill` | `none` \| `forwards` \| `backwards` \| `both` | WAAPI fill mode |
| `reverse` | boolean | Play in reverse |
| `no-gpu-hint` | boolean | Disable `will-change: transform` hint |

**Methods:** `.play()`, `.pause()`, `.cancel()`

**Events:** `start`, `finish`, `cancel`

```html
<nc-animation name="fade-in" duration="600" trigger="scroll" threshold="0.3">
  <nc-card>This card fades in as it enters the viewport.</nc-card>
</nc-animation>
```

---

### `<nc-splash>`

A full-screen animated intro screen — typically shown at boot and dismissed when the app is ready.

| Attribute | Type | Description |
|---|---|---|
| `title` | string | Large heading text |
| `subtitle` | string | Subheading |
| `particles` | boolean | Animated particle effect |
| `duration` | number | Auto-dismiss after N ms (0 = manual dismiss) |
| `delay` | number | Delay before the animation starts |

```html
<nc-splash id="app-splash" title="Taskflow" subtitle="Loading your workspace…" particles>
</nc-splash>
```

```javascript
await loadInitialData();
(document.querySelector('#app-splash')).remove();
```

---

## Utility

### `<loading-spinner>`

A generic loading indicator used by the router during lazy-loaded navigation.

| Attribute | Type | Description |
|---|---|---|
| `size` | `small` \| `medium` \| `large` | Spinner diameter (default: `medium`) |
| `message` | string | Accessible label or visible loading text |

```html
<loading-spinner size="large" message="Loading projects…"></loading-spinner>
```

The framework automatically shows and removes a `<loading-spinner>` during route transitions. Use it directly in controller templates while awaiting API responses:

```javascript
document.querySelector('#content').innerHTML = `
    <loading-spinner size="large"></loading-spinner>
`;

const data = await api.get('/tasks');
renderTasks(data);
```

---

## How Component Lazy Loading Works

All `nc-*` components are lazy-loaded — the browser downloads a component's JavaScript only the first time that tag appears in the DOM. Your initial bundle is never bloated by components you have not used.

### The builtin registry

When the framework boots it calls `registerBuiltinComponents()`, which maps every built-in component tag to a module path:

```javascript
import { componentRegistry } from '@core/lazyComponents.js';

componentRegistry.register('nc-button',  './components/nc-button.js');
componentRegistry.register('nc-canvas',  './components/nc-canvas.js');
// … every other nc-* component
```

A `MutationObserver` watches the document. When a new element whose tag is in the registry enters the DOM, the framework dynamically imports the matching module. The custom element is defined in that module via `defineComponent()`, and from that point on the browser handles all future instances natively.

### Your own components

When you run `npm run make:component task-card`, the generator creates the component file **and** adds an entry to `src/components/appRegistry.js`:

```javascript
// src/components/appRegistry.js — auto-updated by the generator
import { componentRegistry } from '@core/lazyComponents.js';

componentRegistry.register('task-card', './ui/task-card.js');
```

Your component is available in every view without an import. You never call `customElements.define()` manually or import the component file in a controller.

> **Tip:** If a component must be available on first paint — before the `MutationObserver` fires — add it to `src/components/preloadRegistry.js`. That list is imported eagerly in `app.js`. Use this sparingly: typically only `<app-header>`, `<app-sidebar>`, and `<loading-spinner>` belong there.

### The `remove:component` generator

Remove a component cleanly — deleting the file and unregistering it from `appRegistry.js` — with:

```bash
npm run remove:component task-card
```

Never delete component files manually; the registry entry would remain and cause a failed dynamic import at runtime.

---

## Quick Reference \u2014 Core Components

> The following is a condensed attribute reference for quick lookup. The detailed documentation with full event listings, methods, and usage examples is in the sections above.

---

## `<nc-button>`

A fully accessible button element with built-in loading and icon support.

| Attribute | Type | Description |
|---|---|---|
| `variant` | `primary` \| `secondary` \| `ghost` \| `danger` | Visual style |
| `size` | `sm` \| `md` \| `lg` | Button size (default: `md`) |
| `loading` | boolean | Shows a spinner and disables interaction |
| `disabled` | boolean | Standard disabled state |
| `icon` | string | Icon name shown before the label |
| `full-width` | boolean | Stretches to the container width |

```html
<nc-button variant="primary" icon="plus" id="btn-new-task">New Task</nc-button>
```

---

## `<nc-badge>`

Small counters and status indicators \u2014 ideal for task counts in sidebar nav items.

| Attribute | Type | Description |
|---|---|---|
| `count` | number | Numeric label; hidden when `0` |
| `dot` | boolean | Render a plain dot instead of a number |
| `variant` | `default` \| `success` \| `warning` \| `danger` \| `info` | Colour |
| `max` | number | Cap display value (e.g., `99+`) |

```html
<nc-badge count="12" variant="danger" max="99"></nc-badge>
```

---

## `<nc-input>`

The primary text input. Covers plain text, email, password, search, and URL types.

| Attribute | Type | Description |
|---|---|---|
| `type` | string | Standard `<input>` type |
| `label` | string | Floating or static label |
| `placeholder` | string | Placeholder text |
| `clearable` | boolean | Shows a ✕ button when the field has content |
| `show-password-toggle` | boolean | Eye icon for password fields |
| `error` | string | Error text; empty string clears the error state |
| `hint` | string | Helper text shown when there is no error |
| `disabled` / `readonly` | boolean | Standard states |

```html
<nc-input id="email" type="email" label="Email" clearable error="Invalid address"></nc-input>
```

Access the current value in a controller:

```javascript
const value = (scope.$('#email')).value;
```

---

## `<nc-select>`

A styled, accessible drop-down built on top of a native `<select>`.

| Attribute | Type | Description |
|---|---|---|
| `label` | string | Label above the control |
| `options` | JSON string | `[{ "label": "…", "value": "…" }]` |
| `value` | string | Currently selected value |
| `placeholder` | string | Shown when nothing is selected |
| `error` | string | Validation error text |

```html
<nc-select id="status" label="Status"
  options='[{"label":"Open","value":"open"},{"label":"Done","value":"done"}]'>
</nc-select>
```

---

## `<nc-modal>`

A dialog overlay with focus trapping, Escape-to-close, and named slots.

| Attribute | Type | Description |
|---|---|---|
| `heading` | string | Title shown in the modal header |
| `size` | `sm` \| `md` \| `lg` \| `xl` \| `full` | Dialog width |
| `persistent` | boolean | Prevents closing on backdrop click |

**Slots:** `body`, `footer`

**Methods (via JS):** `.open()`, `.close()`, `.toggle()`

```html
<nc-modal id="confirm-delete" size="sm" heading="Delete project?">
  <div slot="body">This cannot be undone.</div>
  <div slot="footer">
    <nc-button variant="ghost"  id="btn-cancel">Cancel</nc-button>
    <nc-button variant="danger" id="btn-confirm">Delete</nc-button>
  </div>
</nc-modal>
```

```javascript
(scope.$('#confirm-delete')).open();
```

---

## `<nc-tabs>`

Tab navigation that manages panel visibility automatically.

| Attribute | Type | Description |
|---|---|---|
| `tabs` | JSON string | `[{ "label": "…", "key": "…" }]` |
| `active` | string | Key of the currently active tab |

```html
<nc-tabs
  id="detail-tabs"
  tabs='[{"label":"Overview","key":"overview"},{"label":"Activity","key":"activity"}]'
  active="overview"
></nc-tabs>
```

Listen for changes:

```javascript
on('nc-tab-change', '#detail-tabs', (e) => {
  console.log(e.detail.key); // 'overview' | 'activity'
});
```

---

## `<nc-progress>`

A progress bar for upload/download feedback or task completion percentages.

| Attribute | Type | Description |
|---|---|---|
| `value` | number | 0–100 |
| `indeterminate` | boolean | Animated stripe when value is unknown |
| `striped` | boolean | Striped fill |
| `variant` | `default` \| `success` \| `warning` \| `danger` | Colour |

```html
<nc-progress value="65" striped variant="success"></nc-progress>
```

---

## `<nc-toast>`

A transient notification that appears at the edge of the viewport.

| Attribute | Type | Description |
|---|---|---|
| `type` | `info` \| `success` \| `warning` \| `error` | Icon and colour |
| `message` | string | Notification text |
| `duration` | number | Auto-dismiss after N ms (default: 4000) |
| `position` | `top-right` \| `bottom-center` \| … | Placement |

Show a toast programmatically:

```javascript
const toast = document.querySelector('nc-toast');
toast.show({ type: 'success', message: 'Task created!' });
```

---

## `<nc-table>`

A data table with column definitions, sorting, and row click events.

| Property | Type | Description |
|---|---|---|
| `columns` | `Column[]` | `{ key, label, sortable? }` — set via JS |
| `rows` | `Row[]` | Array of plain objects — set via JS |
| `sortable` | boolean attr | Enables column-header sort arrows |
| `loading` | boolean attr | Overlays a spinner on the table body |

```javascript
const table = scope.$('#projects-table');
table.columns = [{ key: 'name', label: 'Project', sortable: true }];
table.rows    = projects;
```

Listen for row clicks:

```javascript
on('nc-row-click', '#projects-table', (e) => {
  router.navigate(`/projects/${e.detail.row.id}`);
});
```

---

## `<nc-alert>`

An inline status banner for page-level feedback (see login and projects chapters).

| Attribute | Type | Description |
|---|---|---|
| `type` | `info` \| `success` \| `warning` \| `error` | Icon and colour |
| `message` | string | Alert body text |
| `dismissible` | boolean | Shows a close button |

```html
<nc-alert type="error" message="Could not load projects." dismissible></nc-alert>
```

---

## `<nc-spinner>`

A loading indicator — used in `projectsController` while data is in flight.

| Attribute | Type | Description |
|---|---|---|
| `size` | `sm` \| `md` \| `lg` | Spinner diameter |
| `label` | string | Accessible screen-reader text |

```html
<nc-spinner size="lg" label="Loading projects…"></nc-spinner>
```

---

## `<nc-timeline>` and `<nc-timeline-item>`

An ordered list of events — useful for task activity feeds.

```html
<nc-timeline>
  <nc-timeline-item
    label="Created by Alice"
    timestamp="2025-06-01T09:00:00Z"
    icon="plus-circle"
  ></nc-timeline-item>
  <nc-timeline-item
    label="Status changed to In Progress"
    timestamp="2025-06-02T14:30:00Z"
    icon="refresh"
    variant="info"
  ></nc-timeline-item>
</nc-timeline>
```

`<nc-timeline-item>` key attributes: `label`, `timestamp` (ISO string — auto-formatted), `icon`, `variant` (`default` | `success` | `warning` | `danger` | `info`).

---

## Additional Components

| Component | One-liner |
|---|---|
| `<nc-switch>` | Toggle boolean settings (see Chapter 9) |
| `<nc-number-input>` | Numeric field with min/max/step and stepper buttons |
| `<nc-slider>` | Range selector for numeric values |
| `<nc-rating>` | Star rating input (0–5, supports half stars) |
| `<nc-autocomplete>` | Text input with a live-filtered suggestion dropdown |
| `<nc-popover>` | Floating contextual panel anchored to a trigger element |
| `<nc-tooltip>` | Hover tooltip — wraps any element via a `trigger` slot |
| `<nc-card>` | Simple content container with optional header/footer slots |
| `<nc-canvas>` | Responsive HiDPI canvas — drawing, signature capture, chart surface (see [Chapter 30](./30-nc-canvas.md)) |

---

## How Component Lazy Loading Works

All `nc-*` components are lazy-loaded — the browser only downloads a component's JavaScript the first time a tag appears in the DOM. Understanding this mechanism helps when you build your own components and want the same behaviour.

### The Registry

`src/components/frameworkRegistry.js` maps every `nc-*` tag name to a module path using `componentRegistry.register()`:

```javascript
import { componentRegistry } from '@core/lazyComponents.js';

componentRegistry.register('nc-button',  './core/nc-button.js');
componentRegistry.register('nc-badge',   './core/nc-badge.js');
componentRegistry.register('nc-modal',   './core/nc-modal.js');
// ... and all other nc-* components
```

A `MutationObserver` watches the entire document. When a new element is added whose tag name is in the registry, the framework dynamically imports the corresponding module, which defines and registers the custom element. From that point on the browser handles all future instances natively.

### Your Own Components

When you run `npm run make:component task-card`, the generator creates the component file **and** adds a `componentRegistry.register()` call to `src/components/appRegistry.js`:

```javascript
// src/components/appRegistry.js — auto-updated by the generator
import { componentRegistry } from '@core/lazyComponents.js';

componentRegistry.register('task-card', './ui/task-card.js');
```

This means your component is available in every view without an explicit import. You never need to call `customElements.define()` manually or import the component file in your controllers.

> **Tip:** If you ever need a component to be available *instantly* on first paint — before the MutationObserver fires — add it to `src/components/preloadRegistry.js`. The preload list is imported in `app.js` and downloads eagerly. Use this sparingly (typically just `<app-header>`, `<app-sidebar>`, and `<loading-spinner>`).

### The `remove:component` Generator

To remove a component cleanly — unregistering it from `appRegistry.js` and deleting its file — use the companion command rather than deleting files manually:

```bash
npm run remove:component task-card
```

---

## Done Criteria

- [ ] The dashboard task list uses `<nc-table>` with column definitions for title, priority, and due date.
- [ ] Task priority values are displayed with `<nc-badge>` using the correct variant per priority level.
- [ ] Dashboard sections are organized in `<nc-tabs>` with full keyboard navigation (arrow keys + Enter).
- [ ] An `<nc-toast variant="success">` appears after a task is marked complete.

---

**Back:** [Chapter 10 — Forms and Validation](./10-forms-and-validation.md)  
**Next:** [Chapter 12 — Advanced Patterns](./12-advanced-patterns.md)