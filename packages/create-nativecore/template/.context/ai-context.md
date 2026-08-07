# NativeCore — AI Context

API and behavioral reference for agents working inside a scaffolded NativeCore app.
Also read `.context/architecture.md` and `.context/conventions.md`.

## What NativeCore is

Zero-dependency SPA framework:

- Native Web Components + Shadow DOM
- History API router (groups, middleware, cache, prefetch, loaders)
- Reactive signals (instance + global)
- Lazy controllers and lazy custom elements
- Single HTML shell
- Optional Puppeteer SSG for bots/SEO

Not React/Vue/JSX/VDOM.

Scaffold defaults:

- **Language:** JavaScript (`--ts` for TypeScript)
- **Home:** enterprise starter (not a component showcase)
- **Shell:** minimal (`#app.minimal-shell`) — chrome components exist for opt-in
- **Auth:** not included
- **Component Builder:** experimental, disabled by default (`COMPONENT_BUILDER_ENABLED = false`)

## Critical rules

1. No emojis in code, comments, logs, or docs
2. Always use `.js` extensions on imports (JS and TS)
3. Never top-level-import controllers into routes — use `createLazyController`
4. Prefer `CoreController` / `CoreComponent` for new code
5. Controllers must return a cleanup function
6. Use `this.on(target, type, handler)` — do not leak listeners
7. No `<style>` / `<script>` in view HTML files
8. Keep `app.*` boot-only; routes live in `src/routes/routes.*`
9. Do not invent JWT/login/dashboard unless the user asks
10. Do not casually edit `.nativecore/` (framework internals)
11. Prefer generators (`make:*` / `remove:*`) over hand-editing registries/routes
12. Inside `registerRoutes(r)`, call `r.register` (not `router.register`)

## Language modes

| Mode | How | Source ext | Config |
|------|-----|------------|--------|
| JavaScript (default) | `--defaults` / `--js` / no flag | `.js` | `useTypeScript: false` |
| TypeScript | `--ts` | `.ts` | `useTypeScript: true` |

Generators read `nativecore.config.json`. If the file is missing, treat the project as JS when using current templates.

## Path aliases

```
@core/         → .nativecore/core/
@core-utils/   → .nativecore/utils/
@core-types/   → .nativecore/types/
@dev/          → .nativecore/dev/          (localhost / excluded from prod)
@testing/      → .nativecore/testing/
@components/   → src/components/
@services/     → src/services/
@utils/        → src/utils/
@stores/       → src/stores/
@middleware/   → src/middleware/
@routes/       → src/routes/
@config/       → src/config/
@types/        → src/types/
@constants/    → src/constants/
```

Always append `.js` even with aliases (`@core/router.js`).

## CoreComponent

Canonical UI base class.

```js
import { CoreComponent, defineComponent } from '@core/component.js';
import { html, css } from '@core-utils/templates.js';

export class MyCard extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['title'];
    static styles = css`:host { display: block; }`;

    template() {
        return html`
            <h3 ref="titleEl"></h3>
            <button type="button" ref="actionBtn">Go</button>
            <slot></slot>
        `;
    }

    onMount() {
        this.titleState = this.state(this.getAttribute('title') ?? '');
        this.bind(this.titleState, this.titleEl);
        this.on(this.actionBtn, 'click', () => {
            this.emit('my-card-action', { title: this.titleState.value });
        });
    }

    onUnmount() {}
}

defineComponent('my-card', MyCard);
```

### API (instance)

| API | Purpose |
|-----|---------|
| `this.state(initial)` | Local reactive `{ value }` |
| `this.signal(initial)` | `[get, set]` tuple |
| `this.compute(fn)` / `this.memo(fn)` | Derived state |
| `this.effect(fn)` | Reactive side effect (auto-disposed) |
| `this.bind(state, el)` | textContent |
| `this.bind(state, el, 'attr')` | attribute |
| `this.bind(state, el, '?disabled')` | boolean attribute |
| `this.bind(state, el, '.class')` | class toggle |
| `this.on(target, type, handler)` | Listener with auto-cleanup |
| `this.emit(name, detail?)` | Composed CustomEvent |
| `this.$` / `this.$$` | Query inside shadow/light root |
| `ref="name"` in template | Becomes `this.name` after bootstrap |

`Component` (non-Core) is a deprecated compatibility path. Do not use it for new components.

Register UI tags in `appRegistry`; custom `nc-*` in `frameworkRegistry`.

## CoreController

Canonical page controller.

```js
import { CoreController } from '@core/controller.js';

export class ProfileController extends CoreController {
    onMount() {
        this.assertRefs('titleEl', 'primaryBtn');
        this.title = this.state('Profile');
        this.bind(this.title, this.titleEl);
        this.on(this.primaryBtn, 'click', () => {
            this.title.value = 'Updated';
        });
    }
}

export function profileController(_params, _state, _loaderData, rootElement) {
    const ctrl = new ProfileController(rootElement);
    return () => ctrl.destroy();
}
```

### API (instance)

Same reactivity/bind/on helpers as CoreComponent, plus:

| API | Purpose |
|-----|---------|
| `this.el` | View root (`[data-view]` or passed root) |
| `this.assertRefs(...names)` | Throw if refs missing |
| `this.rebind(root?)` | Rescan `ref`s after dynamic HTML |
| `destroy()` | Run unsubs + `onUnmount` |

Factory is the recommended export. `createLazyController` also supports class exports.

## Global state (`@core/state.js`)

Use for shared app data (stores), not every local UI bit.

```js
import { useState, computed, effect, batch } from '@core/state.js';

export const count = useState(0);
export const double = computed(() => count.value * 2);

effect(() => {
    console.log(double.value);
});

batch(() => {
    count.value++;
});

// later
double.dispose();
```

App stores live under `src/stores/` (`appStore`, `uiStore`, `make:store`).

## Router

```js
import { createLazyController } from '@core/lazyController.js';
import type { Router } from '@core/router.js'; // TS only

const lazyController = createLazyController(import.meta.url);

export function registerRoutes(r /* : Router */) {
    // @group:public
    r.group({}, (r) => {
        r.register('/', 'src/views/public/home.html',
            lazyController('homeController', '../controllers/home.controller.js'))
         .cache({ ttl: 300, revalidate: true });
    });

    // @group:protected
    r.group({ middleware: [] }, (r) => {
        // make:view --protected inserts here
    });
}
```

Capabilities (high level):

- Path params, optional segments, wildcards
- Middleware tags on groups
- Per-route cache / revalidate / prefetch
- Route loaders with AbortController support
- Events such as `pageloaded` for shell sync

Frozen window helper (set in `app.*`):

```js
window.router.navigate(path)
window.router.replace(path)
window.router.back()
window.router.getCurrentRoute()
```

Protected path discovery after authoring middleware:

```js
router.getPathsForMiddleware('auth')
```

## Middleware

```js
// created by: npm run make:middleware verified
export async function verifiedMiddleware(route) {
    // return true to allow, false to block (redirect inside if needed)
    return true;
}
```

Wiring (done by the generator into `app.*`):

```js
import { createMiddleware } from '@core/createMiddleware.js';
import { verifiedMiddleware } from '@middleware/verified.middleware.js';

// @middleware
router.use(createMiddleware('verified', verifiedMiddleware));
```

## Wires utils (do not use)

Do not use wires utils (`@core-utils/wires.js`). Use `ref` + `this.bind` + `this.on`.

## Templates and DOM

```js
import { html, css, escapeHtml, trusted } from '@core-utils/templates.js';
import { dom } from '@core-utils/dom.js';
```

- Escape untrusted strings before injecting HTML
- Use `trusted(...)` only for known-safe HTML fragments
- App DOM helpers: `@core-utils/dom.js`

## Page cleanup

```js
import { pausePageCleanupCollection, resumePageCleanupCollection } from '@core/pageCleanupRegistry.js';

pausePageCleanupCollection();
router.start();
resumePageCleanupCollection();
```

Prevents bootstrap-time effects from being disposed on the first navigation.

## Component registries

```js
// src/components/registry.*
import { registerAppComponents } from './appRegistry.js';
import { registerFrameworkComponents } from './frameworkRegistry.js';

registerFrameworkComponents();
registerAppComponents();
```

| File | Role |
|------|------|
| `frameworkRegistry.*` | Built-in + generated `nc-*` |
| `appRegistry.*` | App UI + shell chrome tags |
| `preloadRegistry.*` | Eager imports for first paint |

## Generators

| Script | Creates / updates |
|--------|-------------------|
| `make:component` | `src/components/ui/*` + `appRegistry` |
| `make:core-component` | `src/components/core/nc-*` + `frameworkRegistry` |
| `make:controller` | `src/controllers/*.controller.*` + index barrel |
| `make:store` | `src/stores/*.store.*` + index barrel |
| `make:view` / `make:page` | view HTML, optional controller, routes, viewsMap |
| `make:middleware` | middleware file + `app.*` import/`router.use` |
| `remove:component` | file, registry, optional tests |
| `remove:core-component` | file, preload, frameworkRegistry |
| `remove:view` | view, controller, route line |

Common flags: `--defaults`, `--yes`, `--protected` / `--public`, `--route`, `--controller` / `--no-controller`, `--prefetch` / `--no-prefetch`, `--with-tests`.

No `delete:*` scripts.

## Dev tools

Localhost-only dynamic imports from `app.*`:

1. `@dev/hmr.js` — hot module replacement
2. `@dev/denc-tools.js` — overlay, live editor, outline, drawing, DEV MODE pill
3. `@dev/devOverlay.js` — FPS/memory/DOM/route/net/error/SEO diagnostics

Component Builder (`component-builder*`) is experimental and disabled by default. Do not document it as a required feature until `COMPONENT_BUILDER_ENABLED` is flipped to `true`.

## Testing

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mountComponent, waitFor, fireEvent } from '@testing/index.js';

const { element, cleanup } = mountComponent('my-card', { title: 'Hi' });
await waitFor(() => element.shadowRoot !== null);
cleanup();
```

- Environment: happy-dom
- Alias: `@testing` → `.nativecore/testing`
- Prefer `@testing/index.js` over `nativecorejs/testing` in scaffolded apps

## Build / SEO scripts

| Script | Purpose |
|--------|---------|
| `compile` | Dev build |
| `dev` | compile + watch + server |
| `build` / `build:client` | Production client |
| `build:ssg` | Bot pre-render |
| `build:full` | build + SSG |
| `validate` | quality gate (includes `typecheck` in TS) |
| `test` | Vitest |

## Capacitor

Optional. Only when the project was created with `--capacitor` or the author adds it later. Default web apps do not include Capacitor config.

## Environment

Copy `.env.example` to `.env`. Public keys are injected into `index.html` as
`globalThis.__NC_PUBLIC_ENV__` (`npm run env:sync` / compile / build; the
dev server also reinjects on HTML responses).

```js
import { env } from '@config/env.js';

env.apiBaseUrl;   // from API_BASE_URL or NC_PUBLIC_API_BASE_URL
env.appName;
env.features.debugMode;
```

Do not hardcode backend URLs in services — read `env.apiBaseUrl`. Never put
secrets in public / `NC_PUBLIC_*` / `FEATURE_*` keys.

## Common mistakes

| Mistake | Fix |
|---------|-----|
| `router.register` inside `registerRoutes(r)` | Use `r.register` |
| Local hand-rolled `lazyController` | `createLazyController(import.meta.url)` |
| `this.on('click', fn)` | `this.on(el, 'click', fn)` |
| Extending deprecated `Component` for new UI | Extend `CoreComponent` |
| Adding JWT/login by default | Only when requested; use `make:middleware` |
| Importing controllers into `app.*` | Lazy via routes |
| Putting CSS/JS in view HTML | Controllers + `src/styles` + components |
| Assuming Component Builder is on | Experimental; disabled by default |
| `npm run make:view -- --defaults` under PowerShell | Use `npm.cmd run make:view -- profile --defaults` |
| Dual `index.html` + `app.html` shells | Single `index.html` only |
| Expecting `src/config/routes.ts` | Routes are `src/routes/routes.*` |
| Hardcoding `http://localhost:8000` in services | Use `env.apiBaseUrl` from `@config/env.js` + `.env` |

## Debugging checklist

1. Confirm language mode in `nativecore.config.json`
2. Confirm route appears under the correct `@group:*` marker
3. Confirm controller export name matches `lazyController('name', ...)`
4. Confirm view root has `data-view` and required `ref`s
5. Check browser console for `[NativeCore] Dev tools failed to load` on localhost
6. Run `npm run compile` (and `npm run typecheck` in TS) after generator use
7. For remove failures, ensure you used `remove:*` (not `delete:*`)

## Related files

| Doc | Use |
|-----|-----|
| `.context/conventions.md` | Day-to-day coding rules |
| `.context/architecture.md` | Structure and data flow |
| `AGENTS.md` | Short agent entrypoint — keep aligned with this file |
