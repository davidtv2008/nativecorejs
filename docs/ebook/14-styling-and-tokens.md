# Chapter 14 — Styling and Tokens

NativeCoreJS ships a layered CSS architecture: a framework token layer you do not touch, a theme override layer you own, an app styles layer for page-level rules, and Shadow DOM styles local to each component. Understanding which layer to use — and never mixing them up — is what keeps Deskflow looking polished and maintainable.

---

## Mental model

```
index.html  (loads stylesheets in order)
  │
  ├── core-variables.css   → --nc-* tokens     ← DO NOT EDIT
  ├── core.css             → framework resets   ← DO NOT EDIT
  ├── variables.css        → --color-*, --font-* overrides  ← YOURS
  └── main.css             → page/layout rules              ← YOURS

Components (Shadow DOM)
  └── <style> inside template()  → scoped to that tag only
```

The `--nc-` prefix is reserved for the framework. Every token you add in `variables.css` should use your own prefix (e.g. `--color-`, `--df-`, `--spacing-`) to avoid collisions with future framework updates.

---

## The four files

| File | Edit it? | Purpose |
|------|----------|---------|
| `src/styles/core-variables.css` | Never | Framework `--nc-*` tokens — treat as read-only |
| `src/styles/core.css` | Never | Framework base resets and defaults |
| `src/styles/variables.css` | Yes — yours | App tokens, `--nc-theme-*` overrides |
| `src/styles/main.css` | Yes — yours | Page classes, layout, global overrides |

---

## Overriding framework colors

To change the primary color that `nc-*` components use, set `--nc-theme-*` variables in `variables.css`:

```css
/* src/styles/variables.css */
:root {
    --nc-theme-primary:       #6366f1;   /* indigo */
    --nc-theme-primary-light: #818cf8;
    --nc-theme-primary-dark:  #4f46e5;
}
```

The framework reads `--nc-primary: var(--nc-theme-primary, #10b981)` — your override wins because it is set earlier in the cascade.

---

## Adding Deskflow brand tokens

Put your own tokens in `variables.css` without the `--nc-` prefix:

```css
/* src/styles/variables.css */
:root {
    --df-sidebar-width: 240px;
    --df-task-radius:   0.625rem;
    --df-priority-high: #ef4444;
    --df-priority-med:  #f59e0b;
    --df-priority-low:  #10b981;
}
```

Use them in `main.css` and in component `<style>` blocks:

```css
/* src/styles/main.css */
.tasks-page {
    max-width: 680px;
    margin: 0 auto;
    padding: var(--nc-spacing-lg, 1.5rem);
}

.task-list {
    display: flex;
    flex-direction: column;
    gap: var(--nc-spacing-sm, 0.5rem);
}
```

---

## Theme toggle with `uiStore`

`uiStore.setTheme` stores the choice in `localStorage` and sets `data-theme` on `<html>`. All your `[data-theme="dark"]` rules kick in immediately:

```js
import { uiStore } from '@stores/uiStore.js';

uiStore.setTheme('dark');   // → localStorage + data-theme="dark" on <html>
uiStore.setTheme('light');
```

To wire a toggle switch in the settings controller:

```js
import { CoreController } from '@core/controller.js';
import { uiStore } from '@stores/uiStore.js';

export class SettingsController extends CoreController {
    onMount() {
        this.assertRefs('themeSwitch');

        // Reflect current theme on mount
        this.themeSwitch.toggleAttribute(
            'checked', uiStore.theme.value === 'dark'
        );

        this.on(this.themeSwitch, 'change', () => {
            const next = uiStore.theme.value === 'dark' ? 'light' : 'dark';
            uiStore.setTheme(next);
        });
    }
}

export function settingsController(_params, _state, _loaderData, rootElement) {
    const ctrl = new SettingsController(rootElement);
    return () => ctrl.destroy();
}
```

In `src/views/protected/settings.html`:

```html
<div data-view="settings">
    <h1>Settings</h1>
    <label>
        Dark mode
        <nc-switch ref="themeSwitch"></nc-switch>
    </label>
</div>
```

Confirm the event name for `nc-switch` in its source file — `change` is the standard DOM event and is used by most scaffold controls, but always verify before relying on it.

---

## Dark-mode CSS

Add the dark token overrides to `variables.css`:

```css
[data-theme="dark"] {
    --nc-bg:           #0f172a;
    --nc-text:         #f1f5f9;
    --nc-border:       #334155;
    --nc-bg-secondary: #1e293b;

    /* Your app tokens in dark mode */
    --df-priority-high: #f87171;
    --df-priority-med:  #fbbf24;
}
```

Because `--nc-*` tokens are consumed by the framework's built-in components via CSS custom properties, overriding them in `[data-theme="dark"]` automatically re-themes every `nc-*` element on the page.

---

## Styling inside a `CoreComponent`

Component styles go inside the `template()` method's `<style>` block. They are scoped to the shadow root — no leaking, no globals:

```js
template() {
    return html`
        <style>
            :host {
                display: block;
                color: var(--nc-text, #0f172a);
                background: var(--nc-bg, #fff);
            }
            :host([priority="high"]) {
                border-left: 3px solid var(--df-priority-high, #ef4444);
            }
            button {
                background: var(--nc-primary);
                border-radius: var(--nc-radius-md);
                color: var(--nc-white);
                border: none;
                padding: 0.375rem 0.75rem;
                cursor: pointer;
            }
        </style>
        <!-- markup here -->
    `;
}
```

Always use `var(--token, fallback)`. The fallback keeps the component usable if the stylesheet has not loaded yet or if the component is used outside the scaffold.

---

## CSS layers (static styles)

For heavy component stylesheets you can use `static styles = css\`...\`` instead of putting CSS inside `template()`. This is slightly more efficient because the browser parses it once per class rather than once per instance. Check Chapter 12's examples of `nc-button` and `nc-snackbar` for the pattern.

---

## Apply to Deskflow

> **Feature:** The settings page can toggle light / dark mode, and the preference survives a page reload.

1. In `src/views/protected/settings.html`, add an `<nc-switch ref="themeSwitch">` label.
2. In the settings controller, wire `uiStore.setTheme` to the switch's `change` event.
3. On mount, set the initial `checked` state from `uiStore.theme.value`.
4. Add `[data-theme="dark"]` overrides to `variables.css`.
5. Reload the browser — the chosen theme should persist.

Optionally, style the tasks page layout in `main.css` using your `--df-*` tokens.

---

## Verify

- [ ] Toggling the switch flips `data-theme` on `<html>` (check DevTools Elements panel)
- [ ] Reloading the browser preserves the chosen theme
- [ ] `nc-*` components change appearance when theme flips
- [ ] You have not added any tokens with the `--nc-` prefix to `variables.css`
- [ ] `var(--token, fallback)` pattern is used inside all component styles

---

## Challenges

**Bronze** — Add a `--df-card-bg` token in `variables.css` and use it as `background: var(--df-card-bg, var(--nc-bg))` in `task-card.js`. Override it in `[data-theme="dark"]`.

**Silver** — Create a simple CSS animation in `main.css` that fades new task cards in when they are appended to the list. Apply the animation class from the `buildCard` helper.

**Gold** — Read `uiStore.theme` in `task-card.js` using `this.effect` (not CSS) and programmatically update an icon inside the card based on priority. Use `this.bind(priorityState, iconEl)` to keep it in sync. Confirm the icon updates immediately when priority changes without a page reload.

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Editing `core-variables.css` | Override via `--nc-theme-*` in `variables.css` instead |
| Adding `--nc-` prefixed tokens to `variables.css` | Use your own prefix to avoid collision with framework updates |
| Putting global page styles inside a `CoreComponent` template | Component styles are shadow-scoped; global layout goes in `main.css` |
| Expecting `data-theme` to be set before `uiStore` is imported | `uiStore` reads `localStorage` at import time and calls `setTheme` — import it early in `app.js` if you want the theme applied before first render |
| `::slotted` selectors in `main.css` (outside shadow root) | `::slotted` only works inside a shadow root's stylesheet — it has no effect in `main.css` |

---

## Next

[Chapter 15 — Dynamic Routes and Cache](./15-dynamic-routes-and-cache.md)
