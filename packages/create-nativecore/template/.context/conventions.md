# NativeCore Conventions

Day-to-day rules for writing code in a NativeCore app. Prefer generators over hand-wiring.

## Language mode

- Scaffold default is **JavaScript** (`create-nativecore` / `--defaults` / `--js`).
- TypeScript is opt-in (`--ts`). Check `nativecore.config.json` → `useTypeScript`.
- Always import with a `.js` extension in both modes (ESM + TypeScript emit).
- Generators emit `.js` or `.ts` from that config. Do not mix extensions in app source.

## When not to create a component

Prefer plain HTML and CSS unless you need one of:

- Shadow DOM encapsulation
- Reuse across multiple views
- Observed attributes / slot composition
- Framework `nc-*` behavior

Do not wrap every button or paragraph in an `nc-*` component.

## File naming

| Kind | Pattern | Example |
|------|---------|---------|
| UI component | kebab-case with a hyphen | `user-card.js` / `user-card.ts` |
| Core component | `nc-` + kebab | `nc-widget.js` |
| Controller | `<name>.controller.*` | `profile.controller.js` |
| Store | `<name>.store.*` | `task.store.js` |
| Middleware | `<name>.middleware.*` | `verified.middleware.js` |
| View | nested kebab path under `public/` or `protected/` | `docs/getting-started.html` |

## Views (HTML)

- Markup only — no `<style>` or `<script>` in view files.
- Root element should include `data-view="<name>"`.
- Wire DOM for controllers with `ref="name"` (not `id` for controller bindings).
- Router injects views into `#main-content`.

```html
<div class="profile-page" data-view="profile">
    <h1 ref="titleEl">Profile</h1>
    <button type="button" ref="primaryBtn">Save</button>
</div>
```

## CoreController (default page pattern)

Prefer the generator output (`npm run make:view` / `make:controller`).

```js
import { CoreController } from '@core/controller.js';

export class ProfileController extends CoreController {
    onMount() {
        this.assertRefs('titleEl', 'primaryBtn');
        this.title = this.state('Profile');
        this.bind(this.title, this.titleEl);
        this.on(this.primaryBtn, 'click', () => {
            this.title.value = 'Saved';
        });
    }

    onUnmount() {
        // this.on() listeners auto-clean. Dispose extra resources here if needed.
    }
}

export function profileController(_params, _state, _loaderData, rootElement) {
    const ctrl = new ProfileController(rootElement);
    return () => ctrl.destroy();
}
```

Rules:

- Return a cleanup function from the factory (`() => ctrl.destroy()`).
- Use `this.on(target, type, handler)` — never raw `addEventListener` without cleanup.
- Prefer `this.state` / `this.signal` / `this.compute` / `this.effect` for page-local reactivity.
- Call `this.assertRefs(...)` early in `onMount` when refs are required.
- After injecting HTML that contains new `ref`s, call `this.rebind(container)`.

## CoreComponent (default UI pattern)

Prefer `npm run make:component`. Extend `CoreComponent`.

```js
import { CoreComponent, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';

export class UserCard extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['title'];

    template() {
        return html`
            <style>
                :host { display: block; }
            </style>
            <h3 ref="titleEl"></h3>
            <slot></slot>
        `;
    }

    onMount() {
        this.titleState = this.state(this.getAttribute('title') ?? '');
        this.bind(this.titleState, this.titleEl);
        this.on(this, 'click', () => this.emit('user-card-click'));
    }
}

defineComponent('user-card', UserCard);
```

Notes:

- `Component` in `@core/component.js` is a legacy shim — do not use it for new code.
- `this.on(target, type, handler)` requires an `EventTarget` first argument (`this`, a ref, etc.).
- Register UI components in `src/components/appRegistry.*` (generators do this).
- Register custom `nc-*` core components in `frameworkRegistry.*`.

## Imports

```js
import { CoreController } from '@core/controller.js';
import { CoreComponent, defineComponent } from '@core/component.js';
import { createLazyController } from '@core/lazyController.js';
import { createMiddleware } from '@core/createMiddleware.js';
import { useState, computed, effect } from '@core/state.js'; // global / shared signals
import { html, css } from '@core-utils/templates.js';
import { mountComponent, waitFor } from '@testing/index.js';
```

- Never import controllers at the top of `app.*` or `routes.*` — use `lazyController(...)`.
- Never import UI component modules directly into views; register + lazy-load via registries.
- Do not edit `.nativecore/` unless you are intentionally changing framework internals.

## State

| Scope | Prefer |
|-------|--------|
| One controller or component | `this.state()` / `this.signal()` / `this.compute()` / `this.effect()` |
| Shared across the app | `@core/state.js` + `src/stores/*` (`make:store`) |

Dispose computed values created from `@core/state.js` (`computed.dispose()`) in `onUnmount` when you create them yourself. Instance `this.compute` / `this.effect` clean up in `destroy()` / disconnect.

## Routes and middleware

```js
import { createLazyController } from '@core/lazyController.js';

const lazyController = createLazyController(import.meta.url);

export function registerRoutes(r) {
    // @group:public
    r.group({}, (r) => {
        r.register('/', 'src/views/public/home.html',
            lazyController('homeController', '../controllers/home.controller.js'));
    });

    // @group:protected
    r.group({ middleware: [] }, (r) => {
        // After make:middleware auth, change to middleware: ['auth']
    });
}
```

- Use `r.register` inside `registerRoutes(r)` — the parameter is `r`, not the module router.
- Auth is **not** shipped. Add it with `npm run make:middleware` + `createMiddleware` in `app.*`.
- Discover protected paths with `router.getPathsForMiddleware('auth')` after you register that tag.
- Do not invent JWT / login / dashboard routes unless the user asks.

## Wires utils (do not use)

Do not use wires utils (`@core-utils/wires.js`). Use `ref` + `this.bind` + `this.on`.

## Generators

```bash
npm run make:component -- my-card --defaults
npm run make:component -- my-card --defaults --with-tests
npm run make:core-component -- widget --defaults
npm run make:controller -- user-profile
npm run make:store -- task
npm run make:view -- profile --defaults
npm run make:view -- settings --protected --defaults
npm run make:middleware -- verified
npm run make:page -- about --defaults          # alias of make:view

npm run remove:component -- my-card
npm run remove:core-component -- nc-widget
npm run remove:view -- profile --yes
```

Useful flags:

- `--defaults` / non-TTY: skip prompts with safe defaults
- `make:view`: `--public` \| `--protected`, `--route /path`, `--controller` \| `--no-controller`
- `make:component` / `make:core-component`: `--prefetch` \| `--no-prefetch`, `--with-tests`
- `remove:view`: `--yes`

There are no `delete:*` scripts — use `remove:*`.

On Windows PowerShell, prefer `npm.cmd run ... -- <args>` so flags after `--` are preserved.

## Shell chrome

Default shell is minimal (`#app.minimal-shell`). `app-header`, `app-sidebar`, and `app-footer` ship under `src/components/core/` but are not mounted. Opt in via `index.html` and switch `#app` off `minimal-shell` when you need sidebar sync.

## CSS in Shadow DOM

- Scope styles inside the component `template()` or `static styles`.
- Framework tokens use `--nc-*` variables.
- App layout styles live under `src/styles/`.

## Testing

- Runner: Vitest + happy-dom (`vitest.config.*`).
- Helpers: `import { mountComponent, mountController, navigateAndWait, waitFor, fireEvent } from '@testing/index.js'`.
- Generated component tests live in `src/components/ui/__tests__/`.

## DO / DON'T

**Do**

- Use generators for components, views, controllers, stores, middleware
- Keep `app.*` as boot-only (middleware registration + `registerRoutes` + start)
- Escape untrusted HTML (`escapeHtml` / trusted helpers)
- Use `dom.create` / `dom.query` / `dom.within` for generated DOM. Put HTML attributes in `attrs` and custom-element fields in `props`.
- Keep business logic in controllers and services

**Don't**

- Put logic in view HTML or `app.*` route tables
- Invent auth, Capacitor, or dual HTML shells by default
- Use `router.register` inside `registerRoutes(r)` (use `r.register`)
- Import from `nativecorejs/testing` when `@testing/index.js` is available
- Enable or assume the Component Builder (experimental; disabled by default)
- Use emojis in code, comments, or docs
