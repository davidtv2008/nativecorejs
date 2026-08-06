# NativeCore Framework — Agent Context

Read this before writing code. For full API and structure, also read:

- `.context/ai-context.md` — API reference and common mistakes
- `.context/architecture.md` — project structure and data flow
- `.context/conventions.md` — day-to-day coding rules

## What This Project Is

NativeCore is a zero-dependency SPA framework: native Web Components + Shadow DOM,
History API router (middleware, caching, prefetch, loaders), reactive signals,
lazy controllers/components, single HTML shell, optional Puppeteer SSG for SEO.
No JSX, no virtual DOM, no React, no Vue.

Language mode:

- **JavaScript is the default** when the app was scaffolded with `--defaults` / `--js`
- TypeScript when scaffolded with `--ts` (`nativecore.config.json` → `useTypeScript`)

This scaffold ships a calm enterprise starter home page (not a component showcase —
that lives on nativecorejs.com). The default shell is minimal (no header/footer/sidebar
in the DOM); chrome components still live under `src/components/core/` for opt-in.

It does **not** include login, JWT auth, or a dashboard. Auth is author-owned via
`make:middleware` + `router.group({ middleware: [...] })`.

## Critical Rules

1. NEVER use emojis in code, console.logs, comments, or documentation
2. ALWAYS add `.js` extension to imports (JS and TS)
3. NEVER import controllers at top level — use `createLazyController` in `src/routes/routes.*`
4. Prefer `CoreController` + factory export for pages; prefer `CoreComponent` for UI
5. ALWAYS return a cleanup function from controller factories (`() => ctrl.destroy()`)
6. Use `this.on(target, type, handler)` — never leak raw listeners
7. ALWAYS set `static useShadowDOM = true` on UI components unless light DOM is required
8. NEVER add business logic to `app.*` — routes go in `src/routes/routes.*`
9. NEVER put `<style>` or `<script>` tags in view HTML files — markup only
10. Do not hand-edit vendored `.nativecore/core|utils` — change `packages/nativecorejs`, then `npm run vendor-core` in create-nativecore
11. NEVER invent a JWT/session login flow unless the user explicitly asks
12. Inside `registerRoutes(r)`, use `r.register` (not `router.register`)
13. Prefer generators (`make:*` / `remove:*`) over hand-wiring registries and routes
14. Component Builder is experimental (disabled by default)

## Key File Locations

| What | Where |
|------|--------|
| App boot | `src/app.js` or `src/app.ts` |
| Route definitions | `src/routes/routes.js` or `routes.ts` |
| Component registries | `src/components/{registry,frameworkRegistry,appRegistry,preloadRegistry}.*` |
| Controllers | `src/controllers/` |
| Views | `src/views/public/`, `src/views/protected/` |
| CoreComponent / CoreController | `.nativecore/core/component.ts`, `controller.ts` |
| Lazy controller helper | `.nativecore/core/lazyController.ts` |
| Router | `.nativecore/core/router.ts` |
| Middleware helper | `.nativecore/core/createMiddleware.ts` |
| Global signals | `.nativecore/core/state.ts` |
| Testing helpers | `.nativecore/testing/index.js` (`@testing/index.js`) |
| Dev tools | `.nativecore/dev/` (localhost only) |
| Stores | `src/stores/` |
| API service | `src/services/api.service.*` |
| Middleware (user-owned) | `src/middleware/` via `npm run make:middleware` |

## Path Aliases

```
@core/         → .nativecore/core/
@core-utils/   → .nativecore/utils/
@core-types/   → .nativecore/types/
@dev/          → .nativecore/dev/       (dev only — excluded from prod)
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

Always include the `.js` extension when importing through aliases.

## Default Patterns (short)

**Controller**

```js
import { CoreController } from '@core/controller.js';

export class ProfileController extends CoreController {
    onMount() {
        this.assertRefs('titleEl');
        this.title = this.state('Profile');
        this.bind(this.title, this.titleEl);
    }
}

export function profileController(_params, _state, _loaderData, rootElement) {
    const ctrl = new ProfileController(rootElement);
    return () => ctrl.destroy();
}
```

**Component**

```js
import { CoreComponent, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';

export class MyCard extends CoreComponent {
    static useShadowDOM = true;
    template() {
        return html`<slot></slot>`;
    }
}

defineComponent('my-card', MyCard);
```

**Routes**

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
    r.group({ middleware: [] }, (r) => {});
}
```

## Generators

```bash
npm run make:component -- my-card --defaults
npm run make:view -- profile --defaults
npm run make:middleware -- verified
npm run remove:component -- my-card
npm run remove:view -- profile --yes
```

On Windows PowerShell, prefer `npm.cmd run … -- <args>` so flags after `--` are kept.

There are no `delete:*` scripts — use `remove:*`.

## Testing

```js
import { mountComponent, waitFor } from '@testing/index.js';
```

Vitest + happy-dom. See `.context/ai-context.md` for details.
