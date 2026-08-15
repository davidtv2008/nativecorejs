# nativecorejs

Publishable **NativeCoreJS** runtime: router, reactive state, `CoreController` /
`CoreComponent`, utilities, a11y helpers, and the built-in `nc-*` Web Components.

## When to use this package vs create-nativecore

| Need | Use |
|------|-----|
| Start a full SPA app | **[`create-nativecore`](https://www.npmjs.com/package/create-nativecore)** — vendors Core under `.nativecore/` |
| Import the runtime as a library | **`nativecorejs`** (this package) |

Most product apps should scaffold with `create-nativecore`. Install this package
when you want direct imports or to embed NativeCoreJS pieces in another setup.

```bash
npm install nativecorejs
```

```js
import {
  CoreController,
  CoreComponent,
  defineComponent,
  useState,
  effect,
  Router,
  createLazyController,
} from 'nativecorejs';
import { trapFocus, announce } from 'nativecorejs/a11y';
```

## Canonical API

- **DOM:** `ref="name"` → `this.name`; generated nodes via `dom` from `@core-utils/dom.js` (`create`, `query`, `setProps`, `removeAttrs`)
- **State:** `this.state` / `this.signal` / `this.compute` / `this.effect` (instance) or module `useState` / `computed` / `effect` / `batch`
- **Sync:** `this.bind(source, el[, binding])`
- **Events:** `this.on(target, type, handler)` + auto cleanup; components use `this.emit(...)`
- **Routes:** `Router`, `createLazyController`, `createMiddleware`
- **Components:** extend `CoreComponent`, register with `defineComponent`

There is no deprecated `Component` / `emitEvent` shim and no wires utils export.
Prefer `ref` + `bind` + `on` only.

## Exports

| Entry | Contents |
|-------|----------|
| `nativecorejs` | Core runtime, helpers, plugins, `useForm`, i18n, ws/sse, http, `nc-*` classes, … |
| `nativecorejs/components` | Built-in component registration surface |
| `nativecorejs/testing` | Test helpers (scaffold apps usually use `@testing/index.js`) |
| `nativecorejs/a11y` | `trapFocus`, `announce`, `roving` |
| `nativecorejs/styles/base.css` | Base framework CSS |

## Component events

Many components emit short names (`open`, `close`, `change`, `toggle`, …). Some
use prefixed names (`nc-tab-change`, `nc-menu-select`). Confirm in source —
there is no universal `nc-{component}-{action}` rule.

Form inputs keep standard `input` / `change`. `nc-button` uses native `click`.

## App shell note

`app-header`, `app-sidebar`, and `app-footer` live in the **create-nativecore**
template as opt-in chrome, not as the primary surface of this npm package.

## Docs

- [Quick Start](https://github.com/davidtv2008/nativecorejs/blob/main/docs/QUICK_START.md)
- [Cheat Sheet](https://github.com/davidtv2008/nativecorejs/blob/main/docs/CHEATSHEET.md)
- [Ebook](https://github.com/davidtv2008/nativecorejs/blob/main/docs/ebook/README.md)
- [npm publishing](https://github.com/davidtv2008/nativecorejs/blob/main/docs/NPM_PUBLISHING.md)
