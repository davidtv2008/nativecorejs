# NativeCoreJS Quick Start

Go from zero to a running app in a few commands.

---

## Prerequisites

- **Node.js 18+** (`node --version`)
- **npm 9+** (`npm --version`)

---

## Commands

```bash
# 1. Scaffold (JavaScript by default)
npx create-nativecore@latest my-app --defaults

# TypeScript instead:
# npx create-nativecore@latest my-app --ts --no-capacitor

# 2. Enter the project
cd my-app

# 3. Dev server (compile watch + HMR) → http://localhost:8000
npm run dev

# 4. First UI piece (Windows: use npm.cmd so flags after -- are kept)
npm.cmd run make:component -- task-card --defaults

# 5. First view + controller
npm.cmd run make:view -- tasks --defaults

# 6. Optional shared store
npm.cmd run make:store -- task

# 7. Tests
npm test

# 8. Production client build
npm run build

# 9. Optional SSG (public static routes → _deploy/)
npm run build:ssg
# or: npm run build:full

# 10. Preview static output (any static server)
npx --yes serve _deploy
```

On localhost, use the **DEV MODE** pill for the performance overlay. Component
Builder is disabled in current scaffolds.

---

## What you get

| Path | Purpose |
|------|---------|
| `src/app.js` | Boot only — router, middleware hooks, localhost dev tools (`app.ts` with `--ts`) |
| `src/routes/routes.js` | `registerRoutes` + `createLazyController` |
| `src/views/public\|protected/` | HTML views only (no `<script>` / `<style>`) |
| `src/controllers/` | `CoreController` class + factory export |
| `src/components/` | Registries + `core/` (`nc-*`) + `ui/` |
| `src/stores/` | `appStore`, `uiStore`, `make:store` output |
| `src/services/` | `api`, `storage`, `logger` (**no** auth service) |
| `src/middleware/` | Empty until `make:middleware` |
| `.nativecore/` | Vendored runtime, utils, generators, testing, dev tools |
| `server.js` | Dev server + HMR + mock `/api` |
| `nativecore.config.json` | `useTypeScript`, feature flags |

---

## Key mental models

**Components** are Web Components (`CoreComponent`).

```js
import { CoreComponent, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';

export class TaskCard extends CoreComponent {
    static useShadowDOM = true;
    template() {
        return html`<div ref="labelEl"></div>`;
    }
    onMount() {
        this.label = this.state(this.getAttribute('title') ?? '');
        this.bind(this.label, this.labelEl);
    }
}
defineComponent('task-card', TaskCard);
```

**State** is explicit (`useState` / `this.state`) — no virtual DOM.

**Controllers** are the generated factory + `CoreController` class (cleanup via
`destroy()`). Prefer that over hand-rolled async functions.

**Routing** is code-based:

```js
import { createLazyController } from '@core/lazyController.js';
const lazyController = createLazyController(import.meta.url);

export function registerRoutes(r) {
    r.group({}, (r) => {
        r.register('/tasks', 'src/views/public/tasks.html',
            lazyController('tasksController', '../controllers/tasks.controller.js'));
    });
    r.group({ middleware: [] }, (r) => {
        // make:view --protected inserts here; attach middleware tags yourself
    });
}
```

**Auth** is not included. Add guards with `make:middleware` +
`createMiddleware` + route group tags.

---

## Deploying

```bash
npm run build:full
# Upload _deploy/ to Cloudflare Pages, Netlify, S3+CloudFront, etc.
```

SSG pre-renders static public routes only (skips `:param` / `*` and any paths
listed in `export const protectedRoutes = […]` if you add that export).

---

## Next steps

- [ebook README](./ebook/README.md) — Deskflow curriculum (Ch. 00+)
- [Chapter 01 — Scaffold and tour](./ebook/01-scaffold-and-tour.md)
- [CHEATSHEET.md](./CHEATSHEET.md) — one-page API patterns
- [NPM_PUBLISHING.md](./NPM_PUBLISHING.md) — maintainers publishing packages
