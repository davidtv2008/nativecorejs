# Chapter 15 — Styling and Tokens

NativeCoreJS ships a layered CSS architecture: a framework token layer you do not touch, a project-owned theme layer you can swap, shell overrides, page-level rules, and Shadow DOM styles local to each component. Understanding which layer to use — and never mixing them up — is what keeps your app polished and maintainable.

---

## Mental model

```
index.html  (loads bundle.css, built in this order)
  │
  ├── core-variables.css   → --nc-* tokens        ← DO NOT EDIT
  ├── core.css             → framework shell      ← DO NOT EDIT
  ├── variables.css        → @imports your theme  ← swap themes here
  │     ├── tokens/base.css      → spacing, fonts, radius
  │     └── themes/default.css   → --color-*, --nc-theme-*
  ├── shell.css            → header/sidebar tweaks ← YOURS (optional)
  └── main.css             → page/layout rules    ← YOURS

Components (Shadow DOM)
  └── static styles / template <style>  → use var(--color-*), not raw hex
```

The `--nc-` prefix is reserved for the framework. Use `--color-*` semantic tokens in components and `main.css`. Keep brand primitives (`--brand-*` or your own prefix) inside theme files only.

---

## The style files

| File | Edit it? | Purpose |
|------|----------|---------|
| `src/styles/core-variables.css` | Never | Framework `--nc-*` tokens |
| `src/styles/core.css` | Never | Framework shell layout and defaults |
| `src/styles/variables.css` | Yes — theme selector | Thin `@import` entry; swap theme files here |
| `src/styles/tokens/base.css` | Rarely | Structural tokens (spacing, typography, radius) |
| `src/styles/themes/*.css` | Yes — your brand | Colors, gradients, `--nc-theme-*` bridge, `--shell-*` chrome |
| `src/styles/shell.css` | Yes — optional | Project overrides on framework shell chrome |
| `src/styles/main.css` | Yes — yours | Page classes, layout, global overrides |

---

## Swapping themes

`variables.css` is a thin loader:

```css
/* src/styles/variables.css */
@import './tokens/base.css';
@import './themes/default.css';
@import './themes/default.dark.css';
```

To use a different brand, create `themes/my-brand.css` and change the import:

```css
@import './themes/my-brand.css';
@import './themes/my-brand.dark.css';
```

The CSS bundler inlines `@import` statements automatically when you run `npm run compile` or `npm run bundle:css`.

---

## Theme file structure

Put brand primitives and semantic aliases in your theme file:

```css
/* src/styles/themes/default.css */
:root {
    /* Brand primitives — only defined here */
    --brand-primary: #10b981;
    --brand-secondary: #3b82f6;

    /* Semantic tokens — use these everywhere else */
    --color-primary: var(--brand-primary);
    --color-secondary: var(--brand-secondary);

    /* Framework bridge — nc-* components pick these up */
    --nc-theme-primary: var(--brand-primary);
    --nc-theme-secondary: var(--brand-secondary);

    /* Optional shell chrome (for shell.css) */
    --shell-header-bg: rgba(15, 23, 42, 0.92);
    --shell-sidebar-width: 250px;
}
```

In components and `main.css`, always consume semantics:

```css
.hero-title { color: var(--color-primary-deep); }
.cta-button { background: var(--color-secondary); }
```

Never reference `--brand-*` outside the theme file.

---

## Overriding framework colors

The framework reads `--nc-primary: var(--nc-theme-primary, #10b981)`. Set `--nc-theme-*` in your theme file (not in `core-variables.css`):

```css
:root {
    --nc-theme-primary:       #6366f1;
    --nc-theme-primary-light: #818cf8;
    --nc-theme-primary-dark:  #4f46e5;
}
```

---

## Shell chrome overrides

Framework `core.css` ships generic header/sidebar layout. Customize branding in `shell.css` using `--shell-*` tokens from your theme:

```css
/* src/styles/shell.css */
.app-header {
    background: var(--shell-header-bg);
    backdrop-filter: none;
}

#app {
    grid-template-columns: var(--shell-sidebar-width) 1fr;
}
```

Keep brand-specific shell rules out of `core.css` so framework updates never conflict with your theme.

---

## Theme toggle with `uiStore`

`uiStore.setTheme` stores the choice in `localStorage` and sets `data-theme` on `<html>`:

```js
import { uiStore } from '@stores/uiStore.js';

uiStore.setTheme('dark');
uiStore.setTheme('light');
```

Import `uiStore` early in `app.ts` / `app.js` so the persisted theme applies before first paint:

```js
import { uiStore } from '@stores/uiStore.js';

uiStore.setTheme(uiStore.theme.value);
```

Dark overrides belong in a separate theme file:

```css
/* src/styles/themes/default.dark.css */
[data-theme="dark"] {
    --color-bg: #0f172a;
    --color-text: #f1f5f9;
    --color-border: #334155;
}
```

---

## Adding app-specific tokens

Use your own prefix for app-only tokens (e.g. `--df-*` for Deskflow):

```css
/* src/styles/themes/default.css */
:root {
    --df-sidebar-width: 240px;
    --df-task-radius: 0.625rem;
    --df-priority-high: #ef4444;
}
```

Use them in `main.css` and component styles:

```css
.task-list {
    gap: var(--nc-spacing-sm, 0.5rem);
}
```

---

## Styling inside a `CoreComponent`

Component styles go in `static styles` or inside `template()`. They are scoped to the shadow root:

```js
static styles = css`
    :host {
        display: block;
        color: var(--color-text, #0f172a);
        background: var(--color-bg, #fff);
    }
    button {
        background: var(--color-primary);
        border-radius: var(--radius-md);
        color: var(--color-primary-white, #fff);
    }
`;
```

Always use `var(--token, fallback)` so components work before the stylesheet loads.

---

## Apply to Deskflow

> **Feature:** The settings page can toggle light / dark mode, and the preference survives a page reload.

1. Add an `<nc-switch ref="themeSwitch">` in settings view.
2. Wire `uiStore.setTheme` to the switch `change` event in the settings controller.
3. Add `[data-theme="dark"]` overrides to `themes/default.dark.css`.
4. Confirm `uiStore.setTheme(uiStore.theme.value)` runs in `app.*` on boot.

---

## Verify

- [ ] `variables.css` only contains `@import` lines (no raw token blocks)
- [ ] Brand primitives live in `themes/*.css`, not in components
- [ ] Components use `--color-*`, not `--brand-*` or `--nc-*`
- [ ] `core.css` and `core-variables.css` have no project-specific edits
- [ ] Toggling theme flips `data-theme` on `<html>` and persists on reload
- [ ] `npm run bundle:css` succeeds (imports are inlined)

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Putting all tokens in `variables.css` | Split into `tokens/` + `themes/`; keep `variables.css` as a loader |
| Editing `core-variables.css` or `core.css` | Override via theme files and `shell.css` |
| Using `--brand-*` in components | Use `--color-*` semantics; keep primitives in theme files only |
| Adding `--nc-` prefixed tokens to theme files | Use `--nc-theme-*` bridge vars only |
| Expecting `@import` to work in the browser without bundling | Run `npm run compile` — the bundler inlines imports into `bundle.css` |
| Putting global page styles inside a component template | Global layout goes in `main.css` |

---

## Next

[Chapter 16 — Dynamic Routes and Cache](./16-dynamic-routes-and-cache.md)
