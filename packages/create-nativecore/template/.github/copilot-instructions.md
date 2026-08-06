# GitHub Copilot Instructions - NativeCore Framework

For deeper detail see `.context/ai-context.md`, `.context/architecture.md`, and `.context/conventions.md`.
Also see `AGENTS.md`.

## CRITICAL: No Emojis

NEVER use emojis in code, console.logs, comments, or documentation. Plain text only.

## CRITICAL: Views Contain Markup Only

NEVER add `<style>` or `<script>` tags inside view HTML files (`src/views/**/*.html`).

- HTML views contain markup only
- CSS belongs in `src/styles/` (app-wide) or inside component `template()` / `static styles` (Shadow DOM)
- Logic belongs in the corresponding controller or component
- Use `ref="name"` for controller/component DOM bindings

## CRITICAL: lazyController Comes From createLazyController

In `src/routes/routes.*`:

```js
import { createLazyController } from '@core/lazyController.js';
const lazyController = createLazyController(import.meta.url);
```

Do NOT invent a local hand-rolled lazy loader, and do NOT top-level-import controllers into the route table.
Inside `registerRoutes(r)`, always call `r.register` (not `router.register`).

## Framework Context

NativeCore is a zero-dependency SPA framework:

- Web Components with Shadow DOM
- Lazy loading (controllers + components + HTML views)
- Reactive signals (instance `this.state` / global `@core/state.js`)
- Custom router with middleware groups, caching, prefetch, and route loaders
- Single HTML shell (`index.html`) with a minimal shell by default
- Bot-oriented SEO via Puppeteer (`npm run build:ssg`)
- GPU animation utilities, plugin hooks, built-in `nc-*` components
- Testing helpers via `@testing/index.js` (Vitest + happy-dom)

Language:

- **JavaScript is the default** scaffold language
- TypeScript when `nativecore.config.json` has `"useTypeScript": true`
- Always import with `.js` extensions in both modes

Not shipped by default:

- JWT / login / dashboard
- Capacitor (unless opted in at scaffold time)
- Enabled Component Builder UI (code may exist; runtime flag is off)

Auth is author-owned: `npm run make:middleware` + `createMiddleware` + `r.group({ middleware: ['…'] })`.

---

## Quick Reference

### Generator Commands

```bash
npm run make:component -- my-card --defaults
npm run make:component -- my-card --defaults --with-tests
npm run make:core-component -- widget --defaults
npm run make:controller -- user-profile
npm run make:store -- task
npm run make:view -- profile --defaults
npm run make:view -- settings --protected --defaults
npm run make:middleware -- verified
npm run make:page -- about --defaults

npm run remove:component -- my-card
npm run remove:core-component -- nc-widget
npm run remove:view -- profile --yes

npm run compile
npm run dev
npm run build
npm run build:ssg
npm run test
```

Interactive `make:view` still prompts: protected/public, route path, create controller?
Non-interactive flags: `--defaults`, `--protected` / `--public`, `--route`, `--controller` / `--no-controller`, `--yes`.

There are no `delete:*` scripts — use `remove:*`.

On Windows PowerShell, prefer `npm.cmd run … -- <args>` so flags after `--` are preserved.

### Naming

- Components: `kebab-case` with a hyphen (`my-card`)
- Core components: `nc-` + kebab (`nc-widget`)
- Controllers: factory export `camelCaseController`
- Views: nested kebab paths under `public/` or `protected/`
- Source extension: `.js` or `.ts` per project language mode

### Critical File Locations

| What | Where |
|------|--------|
| Entry point | `src/app.js` or `src/app.ts` — keep minimal |
| Routes | `src/routes/routes.js` or `routes.ts` |
| App component registry | `src/components/appRegistry.*` |
| Framework nc-* registry | `src/components/frameworkRegistry.*` |
| Preload registry | `src/components/preloadRegistry.*` |
| Controller exports | `src/controllers/index.*` |
| Views | `src/views/public/`, `src/views/protected/` |
| Middleware (user-owned) | `src/middleware/` |
| HTML shell | `index.html` (`#main-content`, often `#app.minimal-shell`) |
| Framework core | `.nativecore/core/` (do not casually modify) |
| Testing helpers | `.nativecore/testing/index.js` (`@testing/index.js`) |
| Dev tools | `.nativecore/dev/` (localhost only) |

### Path Aliases (always include `.js` extension)

```
@core/         → .nativecore/core/
@core-utils/   → .nativecore/utils/
@core-types/   → .nativecore/types/
@dev/          → .nativecore/dev/
@testing/      → .nativecore/testing/
@components/   → src/components/
@services/     → src/services/
@utils/        → src/utils/
@stores/       → src/stores/
@middleware/   → src/middleware/
@config/       → src/config/
@routes/       → src/routes/
@types/        → src/types/
@constants/    → src/constants/
```

---

## Code Generation Rules

### New Component

1. Prefer `npm run make:component -- <name> --defaults`
2. Hyphen required in tag name
3. Extend `CoreComponent` from `@core/component.js` (not the deprecated `Component` shim)
4. Set `static useShadowDOM = true` unless light DOM is required
5. Use `defineComponent('tag-name', Class)`
6. Generator registers in `appRegistry.*`
7. Listen with `this.on(target, type, handler)` — first arg is an EventTarget
8. Prefer instance `this.state` / `this.bind` / `this.effect` for local UI state

### New View + Controller + Route

1. Prefer `npm run make:view -- <name>`
2. Prompt (or flags) for protected vs public and whether to create a controller
3. Protected views go under `src/views/protected/` and into `// @group:protected`
4. Protected group starts as `middleware: []` until the author adds middleware tags
5. Generator updates `routes.*` with `r.register(...)`

### Adding Auth Around Protected Routes

1. `npm run make:middleware -- auth`
2. Implement the check in `src/middleware/auth.middleware.*`
3. Ensure `app.*` has `router.use(createMiddleware('auth', authMiddleware))`
4. Change the protected group to `middleware: ['auth']`
5. Do not invent JWT/session storage unless the user asks for a specific auth design

---

## CoreComponent Pattern

```js
import { CoreComponent, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';

export class MyWidget extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['title'];

    template() {
        return html`
            <style>
                :host { display: block; }
            </style>
            <h3 ref="titleEl"></h3>
            <button type="button" ref="actionBtn">Action</button>
            <slot></slot>
        `;
    }

    onMount() {
        this.titleState = this.state(this.getAttribute('title') ?? '');
        this.bind(this.titleState, this.titleEl);
        this.on(this.actionBtn, 'click', () => {
            this.emit('my-widget-action', { title: this.titleState.value });
        });
    }

    onUnmount() {}
}

defineComponent('my-widget', MyWidget);
```

---

## CoreController Pattern

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

    onUnmount() {}
}

export function profileController(_params, _state, _loaderData, rootElement) {
    const ctrl = new ProfileController(rootElement);
    return () => ctrl.destroy();
}
```

View markup:

```html
<div class="profile-page" data-view="profile">
    <h1 ref="titleEl">Profile</h1>
    <button type="button" ref="primaryBtn">Save</button>
</div>
```

---

## Routes Pattern

```js
import { createLazyController } from '@core/lazyController.js';

const lazyController = createLazyController(import.meta.url);

export function registerRoutes(r) {
    // @group:public
    r.group({}, (r) => {
        r.register('/', 'src/views/public/home.html',
            lazyController('homeController', '../controllers/home.controller.js'))
         .cache({ ttl: 300, revalidate: true });
    });

    // @group:protected
    r.group({ middleware: [] }, (r) => {
        // Protected routes inserted by make:view --protected
        // After make:middleware auth, use middleware: ['auth']
    });
}
```

Discover middleware-tagged paths at runtime with `router.getPathsForMiddleware('auth')` after registering that tag. Do not assume a built-in `protectedRoutes` export.

---

## Middleware Pattern

```js
import { createMiddleware } from '@core/createMiddleware.js';
import { authMiddleware } from '@middleware/auth.middleware.js';

// @middleware — register middleware here (auto-updated by make:middleware)
router.use(createMiddleware('auth', authMiddleware));
```

---

## State

| Scope | Prefer |
|-------|--------|
| One controller/component | `this.state` / `this.signal` / `this.compute` / `this.effect` |
| Shared app-wide | `@core/state.js` + `src/stores/*` (`make:store`) |

If you create global `computed(...)` from `@core/state.js`, dispose it in `onUnmount` when appropriate. Instance `this.compute` / `this.effect` clean up with the controller/component.

---

## Optional Wires

Generators use refs + `bind`. Attribute wires remain available:

```js
import {
    wireContents, wireInputs, wireAttributes,
    wireClasses, wireStyles, wireActions,
} from '@core-utils/wires.js';
```

---

## Testing

```js
import { mountComponent, waitFor, fireEvent } from '@testing/index.js';
```

Prefer `@testing/index.js` over `nativecorejs/testing` in scaffolded apps.

---

## Shell

Default: `#app.minimal-shell` with `#main-content` as the router outlet.
`app-header` / `app-sidebar` / `app-footer` exist under `src/components/core/` for opt-in; they are not mounted by default.

---

## Dev Tools

Localhost-only: HMR, component overlay/editor/outline/drawing, performance overlay.
Component Builder is disabled — do not tell users to click a Build button unless that flag is re-enabled.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `router.register` in `registerRoutes(r)` | `r.register` |
| Local hand-rolled `lazyController` | `createLazyController(import.meta.url)` |
| `this.on('click', fn)` | `this.on(el, 'click', fn)` |
| Extending deprecated `Component` | Extend `CoreComponent` |
| Inventing JWT/login by default | Only when requested |
| Dual `index.html` + `app.html` | Single `index.html` |
| `npm run build:bots` | `npm run build:ssg` |
| `delete:*` scripts | `remove:*` |
| Styles/scripts in view HTML | Controllers + `src/styles` + components |
| Assuming auth is built-in | Author middleware around protected group |

---

## DO / DON'T

**Do**

- Use generators for components, views, controllers, stores, middleware
- Keep `app.*` as boot-only
- Escape untrusted HTML
- Put business logic in controllers and services

**Don't**

- Modify `.nativecore/` casually
- Put logic in view HTML
- Assume TypeScript-only or JWT-auth scaffolding
- Enable/assume Component Builder
- Use emojis
