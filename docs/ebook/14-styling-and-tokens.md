# Chapter 14 — Styling and Tokens

Theme Deskflow with the scaffold’s CSS layers.

## Files (scaffold)

| File | Role |
|------|------|
| `src/styles/core-variables.css` | Framework `--nc-*` tokens — treat as reserved |
| `src/styles/variables.css` | **Your** tokens / `--nc-theme-*` overrides |
| `src/styles/core.css` | Framework base styles |
| `src/styles/main.css` | App styles |

Rule of thumb: do **not** edit `core-variables.css`. Override via `--nc-theme-*`
in `variables.css`, or add app tokens without the `--nc-` prefix.

## Theme toggle (uiStore)

`uiStore` already persists theme:

```js
import { uiStore } from '@stores/uiStore.js';

uiStore.setTheme('dark'); // also sets documentElement data-theme
uiStore.setTheme('light');
```

Wire a settings control:

```js
this.on(this.themeSwitch, 'change', () => {
    const next = uiStore.theme.value === 'dark' ? 'light' : 'dark';
    uiStore.setTheme(next);
});
```

Confirm the switch/component event name in its source before relying on `change`.

## Component styles

Inside `CoreComponent` templates:

```css
:host { display: block; color: var(--nc-text, #0f172a); }
button {
    background: var(--nc-primary);
    border-radius: var(--nc-radius-md);
}
```

Fallbacks (`var(--nc-text, #0f172a)`) keep components usable if a token is missing.

## Apply to Deskflow

> **Feature:** Settings can toggle light/dark; preference survives reload.

1. On `/settings`, bind a control to `uiStore.setTheme`.
2. Optionally style `.tasks-page` in `main.css` with your `--color-*` tokens.
3. Confirm `localStorage` key `theme` updates (see `uiStore` source).

## Verify

- [ ] Theme flips with `data-theme` on `<html>`
- [ ] Reload keeps the choice
- [ ] `nc-*` components still pick up `--nc-*` colors

## Next

[Chapter 15 — Dynamic routes and cache](./15-dynamic-routes-and-cache.md)
