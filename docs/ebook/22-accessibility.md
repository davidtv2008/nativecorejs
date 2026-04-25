# Chapter 22 — Accessibility and ARIA

> **What you'll build in this chapter:** ARIA-annotate DevHub's `<post-card>` component, add an `aria-live` region to the notifications area, verify keyboard navigation across all interactive elements, and resolve every critical Axe DevTools violation on the home page.

Accessibility is not a feature you bolt on at the end of a project. It is a quality attribute — like performance or security — that shapes every component decision from the start. For Taskflow, that means structuring the DOM correctly, handling keyboards explicitly, managing focus, and verifying everything with real tools. Shadow DOM adds one layer of complexity, but ARIA support in modern browsers handles it gracefully.

---

## 21.1 Why Accessibility Matters

Beyond the moral argument, accessibility has practical stakes:

- **Legal requirements:** WCAG 2.1 AA compliance is mandatory in many jurisdictions (ADA in the US, EN 301 549 in the EU) for web applications used in public-facing or employment contexts.
- **User base:** Approximately 15% of the global population has some form of disability. Screen readers, keyboard-only users, and voice control users all depend on correct semantics.
- **Shadow DOM:** People worry that custom elements are inaccessible. The reality: ARIA attributes in shadow DOM ARE visible to screen readers via the **flat tree** — the browser's merged view of the light DOM and all shadow roots. Use `role`, `aria-label`, and `aria-describedby` inside `template()` exactly as you would in regular HTML.

---

## 21.2 ARIA Inside Shadow Roots

A `<task-card>` with `role="article"` inside its shadow template is fully announced by VoiceOver, NVDA, and JAWS. The flat tree flattens shadow roots so screen reader accessibility APIs see the composed output.

```javascript
template() {
    return `
      <style>
        :host { display: block; }
        :host(:focus-within) { outline: 2px solid var(--border-focus); outline-offset: 2px; border-radius: var(--radius-md); }
        .title  { color: var(--text-primary); font-weight: 600; }
        .status-badge { border-radius: var(--radius-sm); padding: var(--spacing-xs) var(--spacing-sm); font-size: 0.75rem; }
      </style>
      <article role="article" aria-label="" data-hook="article">
        <div class="title" data-hook="title"></div>
        <span class="status-badge" data-hook="status" aria-label=""></span>
      </article>
    `;
}
```

Update `attributeChangedCallback` to keep `aria-label` in sync:

```javascript
attributeChangedCallback(name, _old, value) {
    if (name === 'title') {
        this.titleState.value = value;
        this.$('[data-hook="article"]')?.setAttribute('aria-label', `Task: ${value}`);
    }
    if (name === 'status') {
        this.statusState.value = value;
        const badge = this.$('[data-hook="status"]');
        if (badge) {
            badge.textContent = value;
            badge.setAttribute('aria-label', `Status: ${value}`);
        }
    }
}
```

Status meaning must never be communicated by color alone — the `aria-label` on the badge ensures screen reader users hear "Status: in-progress" rather than just seeing a colored pill.

---

## 21.3 `aria-live` Regions

When Taskflow updates a task status without a full page reload, sighted users see the change immediately. Screen reader users only learn about it if you tell them via an `aria-live` region.

Add a live region to the tasks view HTML:

```html
<!-- src/views/protected/tasks.html -->
<div aria-live="polite" aria-atomic="true" data-hook="status-message" class="sr-only"></div>
```

```css
/* In src/styles/main.css */
.sr-only {
    position: absolute;
    width: 1px; height: 1px;
    padding: 0; margin: -1px;
    overflow: hidden;
    clip: rect(0,0,0,0);
    white-space: nowrap;
    border: 0;
}
```

In the tasks controller, update the live region when status changes:

```javascript
function announceStatusChange(title, status) {
    const region = document.querySelector('[data-hook="status-message"]');
    if (region) region.textContent = `"${title}" moved to ${status}.`;
}
```

Use `aria-live="polite"` for non-urgent updates (status changes, filter results). Use `aria-live="assertive"` only for errors that require immediate attention.

---

## 21.4 Keyboard Navigation

Custom elements receive no keyboard handling by default. If `<task-card>` responds to clicks it must also respond to `Enter` and `Space` — the standard keyboard equivalents for activation.

```javascript
onMount() {
    this.bind(this.titleState, '[data-hook="title"]');

    // Make the host element keyboard-focusable and activatable
    this.setAttribute('tabindex', '0');
    this.setAttribute('role', 'button');

    this.on('click', ':host', this.activate.bind(this));
    this.on('keydown', ':host', (e) => {
        const ke = e;
        if (ke.key === 'Enter' || ke.key === ' ') {
            ke.preventDefault();  // prevent page scroll on Space
            this.activate();
        }
    });
}

private activate() {
    this.dispatchEvent(new CustomEvent('task-selected', {
        detail: { taskId: this.getAttribute('task-id') ?? '' },
        bubbles: true,
        composed: true,
    }));
}
```

> **Warning:** Don't add `tabindex="0"` inside the shadow template on an inner `<div>`. Set it on `:host` (the custom element itself) so Tab stops land on the element the user clicked, which is the natural navigation target.

---

## 21.5 Focus Management

When `<nc-modal>` opens, keyboard focus must move inside the modal. When it closes, focus must return to the element that triggered it. The built-in `<nc-modal>` handles this internally, but for custom dialog patterns:

```javascript
private triggerElement: HTMLElement | null = null;

openDialog(trigger) {
    this.triggerElement = trigger;
    this.removeAttribute('hidden');
    // Focus the first interactive element inside the dialog
    const firstFocusable = this.$('input, button, [tabindex="0"]');
    firstFocusable?.focus();
}

closeDialog() {
    this.setAttribute('hidden', '');
    // Return focus to the element that opened the dialog
    this.triggerElement?.focus();
    this.triggerElement = null;
}
```

In `onUnmount()` (e.g., if the view navigates away while the dialog is open), always return focus:

```javascript
onUnmount() {
    this.triggerElement?.focus();
}
```

---

## 21.6 `<task-card>` Accessibility Audit

Applying all the above, here is the complete accessibility-ready `<task-card>` template:

```javascript
template() {
    return `
      <style>
        :host {
            display: block;
            border-radius: var(--radius-md);
            padding: var(--spacing-md);
            background: var(--background);
            border: 1px solid var(--border);
            cursor: pointer;
        }
        /* Visible focus ring — never use outline: none without a replacement */
        :host(:focus-visible) {
            outline: 3px solid var(--border-focus);
            outline-offset: 2px;
        }
        .title { font-weight: 600; color: var(--text-primary); }
        .status-badge {
            display: inline-block;
            padding: var(--spacing-xs) var(--spacing-sm);
            border-radius: var(--radius-sm);
            font-size: 0.75rem;
            color: var(--text-inverse);
            background: var(--primary);
        }
      </style>
      <div role="article" aria-label="" data-hook="article">
        <div class="title" data-hook="title"></div>
        <span class="status-badge" data-hook="status" aria-label=""></span>
      </div>
    `;
}
```

Key decisions:
- `:focus-visible` shows a focus ring only for keyboard navigation, not mouse clicks — reducing visual noise while preserving accessibility.
- `aria-label` on both the article wrapper and the status badge provides context without relying on colour.
- `cursor: pointer` signals interactivity to mouse users; `tabindex="0"` signals it to keyboard users.

---

## 21.7 Skip Navigation Link

Add a skip link at the very top of `index.html` so keyboard users can bypass the navigation bar:

```html
<!-- index.html -->
<body>
  <a href="#main-content" class="skip-link">Skip to content</a>
  <nav> … </nav>
  <main id="main-content" tabindex="-1">
    <div id="view-outlet"></div>
  </main>
</body>
```

```css
/* src/styles/main.css */
.skip-link {
    position: absolute;
    top: -100%;
    left: var(--spacing-sm);
    background: var(--primary);
    color: var(--text-inverse);
    padding: var(--spacing-xs) var(--spacing-md);
    border-radius: var(--radius-sm);
    z-index: 9999;
}
.skip-link:focus {
    top: var(--spacing-sm);
}
```

`tabindex="-1"` on the `<main>` allows focus to be programmatically moved to it (e.g., after a router navigation) without putting it in the natural Tab order.

---

## 21.8 Color Contrast

CSS custom properties make it easy to guarantee sufficient contrast ratios. The token system defined in Chapter 20 pairs `--text-primary` (`#111827`) against `--background` (`#ffffff`) for a contrast ratio of 16.75:1 — well above the WCAG AA minimum of 4.5:1.

Always check:

1. Open Chrome DevTools → **Elements** → select any element → **Accessibility** panel → **Computed Properties**.
2. Inspect the contrast ratio shown next to the colour swatch.
3. For text smaller than 18px (or 14px bold), you need at least 4.5:1. For large text, 3:1 is sufficient.

> **Tip:** The `.status-badge` uses `--text-inverse` (white) on `--primary` (#2563eb). Verify this pair in DevTools — it passes AA for normal-sized text at approximately 5.1:1.

---

## 21.9 Form Accessibility in NativeCoreJS

The built-in `<nc-input>` component exposes a `label` attribute that renders a visible `<label>` element associated with the input via `aria-labelledby`. Always use it:

```html
<!-- ✅ Correct -->
<nc-input label="Task title" name="title" type="text"></nc-input>

<!-- ❌ Wrong — placeholder is not a label substitute -->
<nc-input name="title" type="text" placeholder="Enter task title"></nc-input>
```

Placeholders disappear when the user starts typing. They also have insufficient contrast in most browsers by default and are not reliably announced by all screen readers.

---

## 21.10 Testing Accessibility

**axe DevTools** is the fastest way to catch accessibility violations in the running Taskflow app:

1. Install the [axe DevTools browser extension](https://www.deque.com/axe/devtools/).
2. Run `npm run dev` and open Taskflow in Chrome.
3. Open DevTools → **axe DevTools** tab → **Analyze Page**.
4. Fix all violations before committing.

The `.nativecore/` inspector (accessible at `/__nativecore__` in dev mode) also renders the component tree, which helps you verify that component hierarchy matches your intent.

---

## 21.11 Built-in Accessibility Utilities

NativeCoreJS exports three composable helpers from `nativecorejs/a11y` (or `nativecorejs` directly) that eliminate the boilerplate behind the most common interactive-component accessibility patterns.

### `trapFocus(container)`

Constrains keyboard focus within `container` while it is open (e.g. a modal, drawer, or custom dialog). Tab and Shift+Tab cycle through focusable descendants only — focus cannot leave the container. The first focusable child receives focus immediately. Returns a **disposer** that removes the trap and restores the previously focused element.

```javascript
import { trapFocus } from 'nativecorejs/a11y';

// When the modal opens:
const releaseFocus = trapFocus(modalElement);

// When the modal closes:
releaseFocus();
```

The built-in `<nc-modal>` and `<nc-drawer>` components call `trapFocus` automatically — you only need this utility for custom overlay patterns.

### `announce(message, politeness?)`

Posts a message to an ARIA live region so screen-reader users hear it without any visual change. Reuses a single hidden live region per politeness level so there is no DOM accumulation.

```javascript
import { announce } from 'nativecorejs/a11y';

// Polite — waits until the user is idle (default)
announce('Task moved to "In Progress".');

// Assertive — interrupts immediately, for critical errors
announce('Session expired. Please log in again.', 'assertive');
```

This replaces the manual `aria-live` region pattern shown in §21.3 — use `announce()` for programmatic notifications and keep the manual region only when you need explicit HTML control over the announcement container.

### `roving(container, selector)`

Implements the **roving tabindex** pattern for widget groups: menus, toolbars, listboxes, radio groups. Only the currently focused item carries `tabindex="0"`; all others are `tabindex="-1"`. Arrow keys, Home, and End move focus within the group.

```javascript
import { roving } from 'nativecorejs/a11y';

// In onMount() of a custom toolbar component
const stopRoving = roving(this, '[role="button"]');

// In onUnmount()
stopRoving();
```

The returned disposer removes the `keydown` listener and restores native tabindex values.

### When to use each utility

| Pattern | Utility |
|---|---|
| Modal / drawer that should trap focus | `trapFocus` |
| Toast, status update, form error announcement | `announce` |
| Toolbar, menu, listbox, radio group | `roving` |
| Standard form inputs | none — `<nc-input>` handles labels and ARIA natively |

---

## Done Criteria

- [ ] `<post-card>` has `role="article"` and `aria-label="Post: {title}"`.
- [ ] The notifications list has `aria-live="polite"` so new entries are announced to screen readers.
- [ ] Every interactive element is reachable by keyboard and has a visible focus ring.
- [ ] Axe DevTools reports zero critical accessibility violations on the DevHub home page.

---

**Back:** [Chapter 21 — TypeScript Patterns in NativeCoreJS](./21-typescript-patterns.md)  
**Next:** [Chapter 23 — Testing with Vitest](./23-testing.md)