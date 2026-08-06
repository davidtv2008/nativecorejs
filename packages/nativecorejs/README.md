# nativecorejs

Publishable NativeCore runtime: router, state, component bases, utilities, and
built-in `nc-*` Web Components.

For scaffolding a full app, use **`create-nativecore`** instead — that CLI
vendors a `.nativecore/` copy into your project. This package is for library-style
imports:

```bash
npm install nativecorejs
```

```js
import { useState, effect, Router, defineComponent } from 'nativecorejs';
import { trapFocus, announce } from 'nativecorejs/a11y';
```

Current version: **`1.0.0-rc.16`**.

## Exports

| Entry | Contents |
|-------|----------|
| `nativecorejs` | Core runtime, helpers, plugins, `useForm`, i18n, ws/sse, http, … |
| `nativecorejs/components` | Built-in component registration surface |
| `nativecorejs/testing` | Test helpers (scaffold apps prefer `@testing/index.js`) |
| `nativecorejs/a11y` | `trapFocus`, `announce`, `roving` |
| `nativecorejs/styles/base.css` | Base framework CSS |

Primary teaching surface: **`CoreComponent`** / **`CoreController`**, router,
`useState` / `computed` / `effect` / `batch`, lazy component registry,
cache-busting helpers, and the reusable `nc-*` set. (`Component` remains a
compat shim.) Wires utils (`wireInputs`, `wireContents`, …) are **legacy** —
prefer `ref` + `this.bind` + `this.on`.

## Component events

Many scaffold/package components emit **short** event names (`open`, `close`,
`change`, `toggle`, …). Some use prefixed names (`nc-tab-change`,
`nc-menu-select`). Always confirm in the component source — do not assume a
universal `nc-{component}-{action}` pattern.

Form inputs (`nc-input`, `nc-select`, …) keep standard `input` / `change`.
`nc-button` uses the native `click` event.

See [docs/CHEATSHEET.md](../../docs/CHEATSHEET.md) for a verified table.

## Component binding

Prefer `CoreComponent` with:

```js
this.bind(state, element);           // textContent
this.bind(state, element, '?disabled');
this.bind(state, element, '.active');
this.on(element, 'click', handler);  // or legacy this.on('click', handler)
this.emit('my-event', { … });
```

There is no `bindAttr` / `bindClass` / `bindStyle` / `this.wires()` on the current
`CoreComponent` API. Do not teach `@core-utils/wires.js` — it is legacy.

## App shell components

`app-header`, `app-sidebar`, and `app-footer` ship with the **scaffold template**
(opt-in chrome), not as the primary npm surface of this package.

## Docs

- [Quick Start](../../docs/QUICK_START.md)
- [Cheat Sheet](../../docs/CHEATSHEET.md)
- [Ebook](../../docs/ebook/README.md)
- [npm publishing](../../docs/NPM_PUBLISHING.md)
